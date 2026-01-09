/**
 * Content Script - ページコンテンツ抽出
 * 現在のページからテキスト、サムネイル、メタデータを抽出する
 */

import type { PlasmoCSConfig } from "plasmo"
import { extractYouTubeVideoId, getYouTubeThumb } from "~utils/youtube"
import { isIgnoredImage, extractTextFromElement } from "~utils/content-extraction"

// すべてのHTTPページで実行
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
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

function getYouTubeDescription(): string | undefined {
  const grabText = (el: Element | null) => el ? (el.textContent || '').trim() : ''

  const currentVideoId = getYouTubeCurrentVideoId()

  // window.ytInitialPlayerResponse の shortDescription を最優先（現在の動画IDと一致する場合のみ）
  try {
    const win = window as any
    const resp = win?.ytInitialPlayerResponse
    const videoId = resp?.videoDetails?.videoId
    const desc = resp?.videoDetails?.shortDescription
    if ((!currentVideoId || videoId === currentVideoId) && typeof desc === 'string' && desc.trim()) {
      return desc.trim()
    }
  } catch {
    // ignore
  }

  // Shortsのアクティブ要素内から説明を優先取得
  const activeShort = document.querySelector('ytd-reel-video-renderer[is-active]')
  if (activeShort) {
    const shortText = grabText(activeShort.querySelector('#description, #description-inline-expander, ytd-text-inline-expander'))
    if (shortText) return shortText
  }

  // DOM内の説明テキストを取得（SPA更新に追随しやすい要素から）
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

    if (candidate && isLargeEnough && !isIgnoredImage(candidate) && !urls.includes(candidate)) {
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
  const max = (hostname.includes('twitter.com') || hostname.includes('x.com')) ? 4 : 1
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

  const videos = Array.from(document.querySelectorAll('video'))
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
      urls.push({
        url: candidate,
        poster: video.getAttribute('poster') || youtubeThumb || ogPoster || undefined
      })
    }
  })

  // og:video があれば追加（YouTube等の埋め込みリンクにも対応しやすい）
  if (urls.length < max) {
    const ogVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content')
    if (ogVideo && !urls.find(v => v.url === ogVideo)) {
      const poster = youtubeThumb || ogPoster
      urls.push({ url: ogVideo, poster })
    }
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
export function extractContent(): ExtractedContent {
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
  const text = (() => {
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return getYouTubeDescription() || getPageText()
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
      const content = extractContent()
      sendResponse({ success: true, content })
    } catch (error) {
      console.error('[Content Script] Error extracting content:', error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      })
    }
    return true // 非同期レスポンスを示す
  }

  if (message.type === 'get-youtube-time') {
    try {
      const video = document.querySelector('video') as HTMLVideoElement | null
      const currentTime = video ? Math.floor(video.currentTime || 0) : 0
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
