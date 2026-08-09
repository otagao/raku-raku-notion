/**
 * Content Script - ページコンテンツ抽出
 * 現在のページからテキスト、サムネイル、メタデータを抽出する
 */

import type { PlasmoCSConfig } from "plasmo"
import { extractYouTubeVideoId, getYouTubeThumb } from "~utils/youtube"
import { isIgnoredImage, extractTextFromElement, collectImagesFromDoc, collectVideosFromDoc } from "~utils/content-extraction"

// このContent Scriptは動的注入専用です
// マッチパターンを実際にはマッチしないURLに設定することで、自動注入を防ぎます
export const config: PlasmoCSConfig = {
  matches: ["https://plasmo-dynamic-inject-never-match.invalid/*"],
  all_frames: false
}

export interface ExtractedContent {
  text: string
  thumbnail?: string
  images?: string[]
  videos?: { url: string; poster?: string }[]
  icon?: string
  title: string
  url: string
}

async function fetchContentFallback(url: string): Promise<{ text?: string; images?: string[]; videos?: { url: string; poster?: string }[]; thumbnail?: string }> {
  const resp = await fetch(url, { method: 'GET' })
  if (!resp.ok) {
    throw new Error(`Fallback fetch failed: ${resp.status}`)
  }
  const html = await resp.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const candidates = [
    doc.querySelector('article'),
    doc.querySelector('main'),
    doc.querySelector('[role="main"]'),
    doc.body
  ].filter(Boolean) as Element[]

  const text = candidates.length > 0 ? extractTextFromElement(candidates[0]) : undefined
  let images = collectImagesFromDoc(doc) || []
  let videos = collectVideosFromDoc(doc) || []

  const ogPoster = (() => {
    const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    if (og && !isIgnoredImage(og)) return og
    const tw = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    if (tw && !isIgnoredImage(tw)) return tw
    return undefined
  })()

  const youtubeVideoId = extractYouTubeVideoId(url)
  if (youtubeVideoId) {
    const youtubeThumb = getYouTubeThumb(youtubeVideoId)
    if (youtubeThumb) {
      if (!images.includes(youtubeThumb)) {
        images = [youtubeThumb, ...images].slice(0, 20)
      }
      videos = videos.map(v => v.poster ? v : { ...v, poster: youtubeThumb })
      if (videos.length === 0) {
        videos.push({ url, poster: youtubeThumb })
      }
    }
  } else if (ogPoster) {
    videos = videos.map(v => v.poster ? v : { ...v, poster: ogPoster })
    if (videos.length === 0) {
      videos.push({ url, poster: ogPoster })
    }
  }

  const thumbnail = videos && videos.length > 0 && videos[0].poster
    ? videos[0].poster
    : (images && images.length > 0 ? images[0] : undefined)

  return {
    text,
    images: images.length > 0 ? images : undefined,
    videos: videos.length > 0 ? videos : undefined,
    thumbnail
  }
}

/**
 * ページのアイコン（favicon）を取得
 */
function getIcon(): string | undefined {
  // <link rel="icon"> または <link rel="shortcut icon">
  const iconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')
  if (iconLink) {
    const href = iconLink.getAttribute('href')
    if (href) {
      // 相対URLの場合は絶対URLに変換
      return new URL(href, window.location.href).href
    }
  }

  // Apple Touch Icon
  const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]')
  if (appleTouchIcon) {
    const href = appleTouchIcon.getAttribute('href')
    if (href) {
      return new URL(href, window.location.href).href
    }
  }

  // デフォルトの /favicon.ico
  try {
    return new URL('/favicon.ico', window.location.origin).href
  } catch {
    return undefined
  }
}

function getThumbnail(): string | undefined {
  // OG:image を優先
  const ogImage = document.querySelector('meta[property="og:image"]')
  if (ogImage) {
    const content = ogImage.getAttribute('content')
    if (content && !isIgnoredImage(content)) return content
  }

  // Twitter:image を次に試す
  const twitterImage = document.querySelector('meta[name="twitter:image"]')
  if (twitterImage) {
    const content = twitterImage.getAttribute('content')
    if (content && !isIgnoredImage(content)) return content
  }

  // 記事内の最初の大きな画像を取得
  const images = Array.from(document.querySelectorAll('img'))
  const largeImage = images.find(img => {
    return img.naturalWidth >= 200 && img.naturalHeight >= 200
  })
  if (largeImage?.src) {
    return largeImage.src
  }

  return undefined
}

function getYouTubeCurrentVideoId(): string | undefined {
  try {
    const url = new URL(window.location.href)
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/shorts/')[1]?.split(/[?/]/)[0]
        return id || undefined
      }
      return url.searchParams.get('v') || undefined
    }
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '') || undefined
    }
  } catch {
    // ignore
  }

  const activeShort = document.querySelector('ytd-reel-video-renderer[is-active]')
  const domId = activeShort?.getAttribute('video-id') || (activeShort as any)?.dataset?.videoId
  return domId || undefined
}

async function getYouTubeDescription(): Promise<string | undefined> {
  const grabText = (el: Element | null) => el ? (el.textContent || '').trim() : ''

  const currentVideoId = getYouTubeCurrentVideoId()

  // Shortsページかどうかを判定
  const isShorts = (() => {
    try {
      return new URL(window.location.href).pathname.startsWith('/shorts/')
    } catch {
      return false
    }
  })()

  // Shortsの場合: DOM要素を最優先（[is-active]属性は確実に現在のShortsを示す）
  if (isShorts) {
    const activeShort = document.querySelector('ytd-reel-video-renderer[is-active]')
    if (activeShort) {
      const shortText = grabText(activeShort.querySelector('#description, #description-inline-expander, ytd-text-inline-expander'))
      if (shortText) return shortText
    }
  }

  // window.ytInitialPlayerResponse の shortDescription（現在の動画IDと一致する場合のみ）
  try {
    const win = window as any
    const resp = win?.ytInitialPlayerResponse
    const videoId = resp?.videoDetails?.videoId
    const desc = resp?.videoDetails?.shortDescription
    // 動画ID検証を厳格化: currentVideoIdが存在する場合は必ず一致を確認
    if (currentVideoId && videoId !== currentVideoId) {
      // ID不一致の場合はスキップ（古いデータの可能性）
    } else if (typeof desc === 'string' && desc.trim()) {
      return desc.trim()
    }
  } catch {
    // ignore
  }

  // 通常の動画の場合: Shortsのアクティブ要素をチェック（念のため）
  if (!isShorts) {
    const activeShort = document.querySelector('ytd-reel-video-renderer[is-active]')
    if (activeShort) {
      const shortText = grabText(activeShort.querySelector('#description, #description-inline-expander, ytd-text-inline-expander'))
      if (shortText) return shortText
    }
  }

  const readDomDescription = () => {
    const selectors = [
      'ytd-watch-metadata #description',
      'ytd-watch-metadata #description-inline-expander',
      '#description',
      '#description-inline-expander',
      'ytd-text-inline-expander'
    ]
    for (const sel of selectors) {
      const text = grabText(document.querySelector(sel))
      if (text) return text
    }
    return ''
  }

  let domText = readDomDescription()

  const needsExpand = domText.includes('…もっと見る') || domText.includes('...more') || domText.includes('もっと見る')
  if (needsExpand) {
    const expandSelectors = [
      'ytd-text-inline-expander #expand',
      'ytd-text-inline-expander button#expand',
      'tp-yt-paper-button#expand',
      'button[aria-label*="もっと見る"]',
      'button[aria-label*="Show more"]',
      'tp-yt-paper-button[aria-label*="もっと見る"]',
      'tp-yt-paper-button[aria-label*="Show more"]'
    ]
    for (const sel of expandSelectors) {
      const btn = document.querySelector<HTMLElement>(sel)
      if (btn) {
        btn.click()
        await new Promise(resolve => setTimeout(resolve, 120))
        break
      }
    }
    domText = readDomDescription()
  }

  if (domText) return domText

  // 最後の保険: meta description（古い可能性がある）
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')
  if (metaDesc && metaDesc.trim()) return metaDesc.trim()

  return undefined
}


/**
 * 複数画像を収集（OGP/Twitterを優先し、ページ内の大きめ画像を最大5件）
 */
function getImages(): string[] | undefined {
  const urls: string[] = []

  const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (og) urls.push(og)
  const tw = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  if (tw && !urls.includes(tw)) urls.push(tw)

  // YouTube専用: 現在の動画IDを取得（再生リスト・Shortsでの不要なサムネイル除外用）
  let currentYouTubeVideoId: string | undefined
  try {
    const hostname = new URL(window.location.href).hostname
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      currentYouTubeVideoId = getYouTubeCurrentVideoId()
    }
  } catch {
    // ignore
  }

  const images = Array.from(document.querySelectorAll('img'))
  images.forEach(img => {
    if (urls.length >= 20) return
    const width = img.naturalWidth || parseInt(img.getAttribute('width') || '0', 10)
    const height = img.naturalHeight || parseInt(img.getAttribute('height') || '0', 10)
    const isLargeEnough = width >= 120 && height >= 120

    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
    let candidate = img.src
    if (!candidate && srcset) {
      const first = srcset.split(',')[0]?.trim().split(' ')[0]
      if (first) candidate = first
    }
    if (!candidate) {
      candidate = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy') || ''
    }

    // YouTube専用フィルタリング: 現在の動画IDと一致するサムネイルのみ許可
    if (currentYouTubeVideoId && candidate.includes('ytimg.com')) {
      // YouTubeサムネイルの場合、現在の動画IDを含むもののみ許可
      if (!candidate.includes(`/vi/${currentYouTubeVideoId}/`)) {
        return // 他の動画のサムネイルはスキップ
      }
    }

    // 広告関連の画像を除外
    const isAdLike = candidate.includes('ads') ||
                     candidate.includes('doubleclick') ||
                     candidate.includes('ad-delivery') ||
                     candidate.includes('imasdk')

    if (candidate && isLargeEnough && !isIgnoredImage(candidate) && !isAdLike && !urls.includes(candidate)) {
      urls.push(candidate)
    }
  })

  // <source>タグのsrcsetも拾う
  const sources = Array.from(document.querySelectorAll('picture source'))
  sources.forEach(src => {
    if (urls.length >= 20) return
    const srcset = src.getAttribute('srcset') || ''
    const first = srcset.split(',')[0]?.trim().split(' ')[0]
    if (first && !urls.includes(first)) {
      urls.push(first)
    }
  })

  // CSS背景画像も拾う
  const elemsWithBg = Array.from(document.querySelectorAll('*'))
  elemsWithBg.forEach(el => {
    if (urls.length >= 20) return
    const bg = (el as HTMLElement).style.backgroundImage || getComputedStyle(el).backgroundImage
    if (bg && bg.includes('url(')) {
      const match = bg.match(/url\\(["']?(.*?)["']?\\)/)
      const url = match?.[1]
      if (url && !urls.includes(url) && url !== 'about:blank') {
        urls.push(url)
      }
    }
  })

  return urls.length > 0 ? urls.slice(0, 20) : undefined
}

function getVideos(): { url: string; poster?: string }[] | undefined {
  const urls: { url: string; poster?: string }[] = []
  let hostname = ''
  try {
    hostname = new URL(window.location.href).hostname
  } catch {
    hostname = ''
  }
  const isTwitter = hostname.includes('twitter.com') || hostname.includes('x.com')
  const max = isTwitter ? 4 : 1
  const mainTweet = isTwitter ? getMainTweetElement() : null
  const mainTweetFirstImage = (() => {
    if (!mainTweet) return undefined
    const img = mainTweet.querySelector('img') as HTMLImageElement | null
    return img?.currentSrc || img?.src || undefined
  })()
  const mainTweetVideoPoster = (() => {
    if (!mainTweet) return undefined
    const v = mainTweet.querySelector('video') as HTMLVideoElement | null
    return v?.getAttribute('poster') || undefined
  })()
  let youtubeVideoId: string | undefined
  try {
    const u = new URL(window.location.href)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        youtubeVideoId = u.pathname.split('/shorts/')[1]?.split(/[?/]/)[0] || undefined
      } else {
        youtubeVideoId = u.searchParams.get('v') || undefined
      }
    } else if (u.hostname.includes('youtu.be')) {
      youtubeVideoId = u.pathname.replace('/', '') || undefined
    }
  } catch {
    youtubeVideoId = undefined
  }
  const youtubeThumb = getYouTubeThumb(youtubeVideoId)
  const ogPoster = (() => {
    const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
    if (og && !isIgnoredImage(og)) return og
    const tw = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    if (tw && !isIgnoredImage(tw)) return tw
    return undefined
  })()

  const videos = isTwitter && mainTweet ? Array.from(mainTweet.querySelectorAll('video')) : Array.from(document.querySelectorAll('video'))
  videos.forEach(video => {
    if (urls.length >= max) return
    const sources = Array.from(video.querySelectorAll('source'))
    let candidate = video.getAttribute('src') || ''
    if (!candidate && sources.length > 0) {
      candidate = sources[0]?.getAttribute('src') || ''
    }
    if (candidate && candidate.startsWith('blob:')) {
      candidate = ''
    }
    const isAdLike = candidate.includes('ads') || candidate.includes('imasdk') || candidate.includes('ad-delivery') || candidate.includes('doubleclick')
    if (candidate && !isAdLike) {
      const poster = isTwitter
        ? (video.getAttribute('poster') || mainTweetVideoPoster || mainTweetFirstImage || ogPoster)
        : (video.getAttribute('poster') || youtubeThumb || ogPoster)
      urls.push({
        url: candidate,
        poster: poster || undefined
      })
    }
  })

  // og:video があれば追加（YouTube等の埋め込みリンクにも対応しやすい）
  if (urls.length < max) {
    const ogVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content')
    if (ogVideo && !urls.find(v => v.url === ogVideo)) {
      const poster = isTwitter ? (mainTweetVideoPoster || mainTweetFirstImage || ogPoster) : (youtubeThumb || ogPoster)
      urls.push({ url: ogVideo, poster })
    }
  }

  // X/Twitterで動画があるがURLが取れない場合のフォールバック
  if (isTwitter && urls.length === 0 && (mainTweetVideoPoster || ogPoster)) {
    urls.push({
      url: window.location.href,
      poster: mainTweetVideoPoster || ogPoster
    })
  }

  // ページ自体がYouTube等の場合、ページURLを動画URLとして扱う
  if (urls.length === 0 && (hostname.includes('youtube.com') || hostname.includes('youtu.be'))) {
    const poster = youtubeThumb || ogPoster
    urls.push({ url: window.location.href, poster })
  }

  return urls.length > 0 ? urls : undefined
}

/**
 * ページのメインテキストを抽出
 * article要素、main要素、またはbody要素から抽出
 */
function getPageText(): string {
  // まずarticle要素を探す
  const article = document.querySelector('article')
  if (article) {
    return extractTextFromElement(article)
  }

  // 次にmain要素を探す
  const main = document.querySelector('main')
  if (main) {
    return extractTextFromElement(main)
  }

  // role="main"を持つ要素を探す
  const roleMain = document.querySelector('[role="main"]')
  if (roleMain) {
    return extractTextFromElement(roleMain)
  }

  // 最後にbody全体から抽出（ただしヘッダー・フッター・ナビを除外）
  const body = document.body.cloneNode(true) as HTMLElement

  // 不要な要素を削除
  const selectorsToRemove = [
    'header',
    'footer',
    'nav',
    'aside',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    'script',
    'style',
    'noscript'
  ]

  selectorsToRemove.forEach(selector => {
    body.querySelectorAll(selector).forEach(el => el.remove())
  })

  return extractTextFromElement(body)
}

/**
 * ページタイトルを取得
 */
function getPageTitle(): string {
  // OG:title を優先
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) {
    const content = ogTitle.getAttribute('content')
    if (content) return content
  }

  // 通常のtitleタグ
  return document.title || 'Untitled'
}

/**
 * ページからコンテンツを抽出
 */
export async function extractContent(): Promise<ExtractedContent> {
  const images = getImages()
  const videos = getVideos()
  const hostname = (() => {
    try {
      return new URL(window.location.href).hostname
    } catch {
      return ''
    }
  })()
  let youtubeVideoId: string | undefined
  try {
    const u = new URL(window.location.href)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        youtubeVideoId = u.pathname.split('/shorts/')[1]?.split(/[?/]/)[0] || undefined
      } else {
        youtubeVideoId = u.searchParams.get('v') || undefined
      }
    } else if (u.hostname.includes('youtu.be')) {
      youtubeVideoId = u.pathname.replace('/', '') || undefined
    }
  } catch {
    youtubeVideoId = undefined
  }

  // YouTubeのサムネイルをカバー候補に追加
  const imagesWithYouTube = (() => {
    if (youtubeVideoId) {
      const ytThumb = getYouTubeThumb(youtubeVideoId)
      if (ytThumb) {
        return images ? [ytThumb, ...images] : [ytThumb]
      }
    }
    return images
  })()

  // X/Twitterの場合は1枚目を破棄する（プレースホルダを避けるため）
  const filteredImages = (() => {
    if (!imagesWithYouTube || imagesWithYouTube.length === 0) return imagesWithYouTube
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return imagesWithYouTube.slice(1)
    }
    return imagesWithYouTube
  })()

  const firstImage = filteredImages?.[0]
  const firstVideoPoster = videos && videos.length > 0 ? videos[0].poster : undefined
  const isTwitter = hostname.includes('twitter.com') || hostname.includes('x.com')
  const text = await (async () => {
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return ''
    }
    return getPageText()
  })()
  const thumbnail = (() => {
    const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be')
    const currentVideoId = isYouTube ? getYouTubeCurrentVideoId() : undefined
    const youtubeThumb = currentVideoId ? getYouTubeThumb(currentVideoId) : undefined
    if (isYouTube && youtubeThumb) {
      return youtubeThumb
    }
    if (isTwitter && !firstVideoPoster && !firstImage) {
      return undefined
    }
    return firstVideoPoster || firstImage || getThumbnail()
  })()
  return {
    title: getPageTitle(),
    url: window.location.href,
    text,
    thumbnail,
    images: filteredImages,
    videos,
    icon: getIcon()
  }
}

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'extract-content') {
    try {
      Promise.resolve(extractContent())
        .then(content => sendResponse({ success: true, content }))
        .catch(error => {
          console.error('[Content Script] Error extracting content:', error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラー'
          })
        })
    } catch (error) {
      console.error('[Content Script] Error extracting content:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      })
    }
    return true // 非同期レスポンスを示す
  }

  if (message.type === 'ping-extract-content') {
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'fetch-content-fallback') {
    try {
      Promise.resolve(fetchContentFallback(message.url || window.location.href))
        .then(content => sendResponse({ success: true, content }))
        .catch(error => {
          console.error('[Content Script] Fallback fetch failed:', error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラー'
          })
        })
    } catch (error) {
      console.error('[Content Script] Fallback fetch failed:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      })
    }
    return true
  }

  if (message.type === 'get-youtube-time') {
    try {
      const videos = Array.from(document.querySelectorAll('video'))
      const activeVideo = videos.find(video => Number.isFinite(video.currentTime)) || videos[0]
      const currentTime = activeVideo ? Math.floor(activeVideo.currentTime || 0) : 0
      sendResponse({ success: true, currentTime })
    } catch (error) {
      console.error('[Content Script] Error getting YouTube time:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      })
    }
    return true
  }
})

console.log('[Content Script] Loaded: extract-content.ts')
