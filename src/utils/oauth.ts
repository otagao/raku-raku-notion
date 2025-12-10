/**
 * OAuth認証ユーティリティ
 * Notion OAuth認証フローの実装
 */

import type { NotionOAuthConfig, NotionOAuthResponse } from "~types"

// Notion OAuth エンドポイント
const NOTION_OAUTH_URL = "https://api.notion.com/v1/oauth/authorize"

/**
 * OAuth認証URLを生成
 */
export function generateOAuthUrl(config: NotionOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    owner: 'user',
    state: state
  })

  return `${NOTION_OAUTH_URL}?${params.toString()}`
}

/**
 * ランダムなstate文字列を生成（CSRF対策）
 * base64エンコードして一定の長さを保証
 */
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const randomHex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  // base64エンコードして形式を統一
  return btoa(randomHex)
}

/**
 * リダイレクトURIからコードとstateを抽出
 */
export function parseOAuthRedirect(url: string): { code: string; state: string } | null {
  try {
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')
    const state = urlObj.searchParams.get('state')
    const error = urlObj.searchParams.get('error')

    if (error) {
      throw new Error(`OAuth error: ${error}`)
    }

    if (!code || !state) {
      return null
    }

    return { code, state }
  } catch (error) {
    console.error('Failed to parse OAuth redirect:', error)
    return null
  }
}
