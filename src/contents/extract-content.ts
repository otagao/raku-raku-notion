/**
 * Content Script - ページコンテンツ抽出
 * 現在のページからテキスト、サムネイル、メタデータを抽出する
 */

import type { PlasmoCSConfig } from "plasmo"

// すべてのHTTPページで実行
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export interface ExtractedContent {
  text: string
  thumbnail?: string
  images?: string[]
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

/**
 * OGP画像またはfaviconを取得
 */
function getThumbnail(): string | undefined {
  // OG:image を優先
  const ogImage = document.querySelector('meta[property="og:image"]')
  if (ogImage) {
    const content = ogImage.getAttribute('content')
    if (content) return content
  }

  // Twitter:image を次に試す
  const twitterImage = document.querySelector('meta[name="twitter:image"]')
  if (twitterImage) {
    const content = twitterImage.getAttribute('content')
    if (content) return content
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
    const isLargeEnough = width >= 50 && height >= 50

    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
    let candidate = img.src
    if (!candidate && srcset) {
      const first = srcset.split(',')[0]?.trim().split(' ')[0]
      if (first) candidate = first
    }
    if (!candidate) {
      candidate = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy') || ''
    }

    if (candidate && isLargeEnough && !urls.includes(candidate)) {
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
 * HTML要素からテキストを抽出（スクリプト・スタイルタグを除外）
 */
function extractTextFromElement(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement

  // スクリプトとスタイルを削除
  clone.querySelectorAll('script, style, noscript').forEach(el => el.remove())

  // テキストを取得して整形
  const text = clone.textContent || ''

  // 連続する空白・改行を整理
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000) // 最大5000文字（Notion APIの制限を考慮）
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
  const firstImage = images?.[0]
  return {
    title: getPageTitle(),
    url: window.location.href,
    text: getPageText(),
    thumbnail: firstImage || getThumbnail(),
    images,
    icon: getIcon()
  }
}

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'extract-content') {
    ;(async () => {
      try {
        // 自動スクロールで遅延ロードを促す
        await autoScrollForImages()
        const content = extractContent()
        sendResponse({ success: true, content })
      } catch (error) {
        console.error('[Content Script] Error extracting content:', error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー'
        })
      }
    })()
    return true // 非同期レスポンスを示す
  }
})

async function autoScrollForImages() {
  const step = Math.max(200, window.innerHeight * 0.6)
  const totalHeight = document.body.scrollHeight
  let scrolled = 0
  while (scrolled < totalHeight) {
    window.scrollBy(0, step)
    scrolled += step
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  // 最下部で少し待つ
  await new Promise(resolve => setTimeout(resolve, 800))
  // 元の位置に戻す
  window.scrollTo({ top: 0, behavior: 'instant' as any })
}

console.log('[Content Script] Loaded: extract-content.ts')
