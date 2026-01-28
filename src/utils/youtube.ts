/**
 * YouTube関連ユーティリティ
 */

/**
 * YouTube URLからVideo IDを抽出
 * @param urlStr - YouTube URL
 * @returns Video ID（見つからない場合はundefined）
 */
export function extractYouTubeVideoId(urlStr: string): string | undefined {
  try {
    const u = new URL(urlStr)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/shorts/')[1]?.split(/[?/]/)[0]
        return id || undefined
      }
      return u.searchParams.get('v') || undefined
    }
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '') || undefined
    }
  } catch {
    return undefined
  }
}

/**
 * YouTubeサムネイル画像URLを取得
 * @param videoId - YouTube Video ID
 * @returns サムネイル画像URL（Video IDがない場合はundefined）
 */
export function getYouTubeThumb(videoId?: string | null): string | undefined {
  if (!videoId) return undefined
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * YouTube URLをタイムスタンプ付き埋め込みURLに変換
 * Notion Video Blockでタイムスタンプから再生開始するために使用
 * @param urlStr - YouTube URL（タイムスタンプパラメータを含む可能性あり）
 * @returns 埋め込みURL（変換できない場合は元のURLを返す）
 */
export function convertToYouTubeEmbedUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr)

    // YouTubeでない場合は元のURLをそのまま返す
    if (!u.hostname.includes('youtube.com') && !u.hostname.includes('youtu.be')) {
      return urlStr
    }

    // Video IDを取得
    const videoId = extractYouTubeVideoId(urlStr)
    if (!videoId) return urlStr

    // タイムスタンプを取得（秒数に変換）
    let startSeconds: number | undefined

    // ?t=123s または &t=123s 形式
    const tParam = u.searchParams.get('t')
    if (tParam) {
      // "123s" → 123, "123" → 123
      const match = tParam.match(/^(\d+)s?$/)
      if (match) {
        startSeconds = parseInt(match[1], 10)
      }
    }

    // 埋め込みURLを構築
    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`)
    if (startSeconds !== undefined && startSeconds > 0) {
      embedUrl.searchParams.set('start', startSeconds.toString())
    }

    return embedUrl.toString()
  } catch {
    return urlStr
  }
}
