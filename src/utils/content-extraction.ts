/**
 * ページコンテンツ抽出ユーティリティ
 */

/**
 * 無視すべき画像URLかどうかを判定
 * 絵文字、Twitter/YouTubeのプレースホルダーなどを除外
 * @param url - 画像URL
 * @returns 無視すべき場合true
 */
export function isIgnoredImage(url?: string | null): boolean {
  if (!url) return false
  const emoji = url.includes('/emoji/') ||
                url.includes('twemoji') ||
                url.includes('twimg.com/emoji') ||
                url.includes('abs-0.twimg.com/emoji') ||
                url.includes('abs.twimg.com/emoji') ||
                (url.endsWith('.svg') && url.includes('emoji'))
  const twitterOgPlaceholder = url.includes('abs.twimg.com/rweb/ssr/default/v2/og/image.png')
  const youtubePlaceholder = url.includes('youtube.com/img/desktop/yt_1200.png')
  return emoji || twitterOgPlaceholder || youtubePlaceholder
}

/**
 * HTML要素からテキストを抽出（スクリプト・スタイルタグを除外）
 * @param element - 抽出対象のHTML要素
 * @returns 抽出されたテキスト（最大5000文字）
 */
export function extractTextFromElement(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script, style, noscript').forEach(el => el.remove())
  const text = clone.textContent || ''
  return text.replace(/\s+/g, ' ').trim().substring(0, 5000)
}

/**
 * Document内の画像URLを収集
 * OGP/Twitter画像、imgタグ、picture/source、CSS背景画像を含む
 * @param doc - Document オブジェクト
 * @returns 画像URL配列（最大20件）
 */
export function collectImagesFromDoc(doc: Document): string[] | undefined {
  const urls: string[] = []
  let hostname = ''
  try {
    hostname = new URL(doc.URL).hostname
  } catch {
    hostname = ''
  }
  const isTwitter = hostname.includes('twitter.com') || hostname.includes('x.com')

  // og/twitter
  const og = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (og && !isIgnoredImage(og)) urls.push(og)
  const tw = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  if (tw && !isIgnoredImage(tw) && !urls.includes(tw)) urls.push(tw)

  // Twitter/XはOGPのみ返し、本文内からは拾わない（返信や関連投稿を避けるため）
  if (isTwitter) {
    return urls.length > 0 ? urls : undefined
  }

  // imgタグ
  const imgs = Array.from(doc.querySelectorAll('img'))
  imgs.forEach(img => {
    if (urls.length >= 20) return
    const width = parseInt(img.getAttribute('width') || '0', 10) || img.naturalWidth
    const height = parseInt(img.getAttribute('height') || '0', 10) || img.naturalHeight
    const isLargeEnough = (width || 0) >= 50 && (height || 0) >= 50
    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
    let candidate = img.getAttribute('src') || ''
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

  // picture/source
  const sources = Array.from(doc.querySelectorAll('picture source'))
  sources.forEach(src => {
    if (urls.length >= 20) return
    const srcset = src.getAttribute('srcset') || ''
    const first = srcset.split(',')[0]?.trim().split(' ')[0]
    if (first && !isIgnoredImage(first) && !urls.includes(first)) {
      urls.push(first)
    }
  })

  // CSS背景
  const elemsWithBg = Array.from(doc.querySelectorAll('*'))
  elemsWithBg.forEach(el => {
    if (urls.length >= 20) return
    const style = (el as HTMLElement).getAttribute('style') || ''
    let bg = ''
    if (style.includes('background')) {
      bg = style
    } else {
      const computed = (el as HTMLElement).style.backgroundImage
      bg = computed || ''
    }
    if (bg && bg.includes('url(')) {
      const match = bg.match(/url\(["']?(.*?)["']?\)/)
      const url = match?.[1]
      if (url && !isIgnoredImage(url) && !urls.includes(url) && url !== 'about:blank') {
        urls.push(url)
      }
    }
  })

  return urls.length > 0 ? urls.slice(0, 20) : undefined
}

/**
 * Document内の動画URLとポスター画像を収集
 * @param doc - Document オブジェクト
 * @returns 動画データ配列（URL + ポスター）
 */
export function collectVideosFromDoc(doc: Document): { url: string; poster?: string }[] | undefined {
  const urls: { url: string; poster?: string }[] = []
  let hostname = ''
  try {
    hostname = new URL(doc.URL).hostname
  } catch {
    hostname = ''
  }
  const max = (hostname.includes('twitter.com') || hostname.includes('x.com')) ? 4 : 1

  const videos = Array.from(doc.querySelectorAll('video'))
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
    const isAdLike = candidate.includes('ads') ||
                     candidate.includes('imasdk') ||
                     candidate.includes('ad-delivery') ||
                     candidate.includes('doubleclick')
    if (candidate && !isAdLike) {
      urls.push({
        url: candidate,
        poster: video.getAttribute('poster') || undefined
      })
    }
  })

  return urls.length > 0 ? urls : undefined
}
