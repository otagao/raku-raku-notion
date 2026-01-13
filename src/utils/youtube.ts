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
