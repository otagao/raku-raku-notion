/**
 * OAuth認証ユーティリティ
 * Notion OAuth認証フローの実装
 */

import type { NotionOAuthConfig, NotionOAuthResponse } from "~types"

// Notion OAuth エンドポイント
const NOTION_OAUTH_URL = "https://api.notion.com/v1/oauth/authorize"
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"

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
 */
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Extension IDを含むstate文字列を生成
 * 形式: base64(extensionId:randomToken)
 */
export function generateStateWithExtensionId(extensionId: string): string {
  const randomToken = generateState()
  const stateData = `${extensionId}:${randomToken}`
  return btoa(stateData)
}

/**
 * stateからExtension IDとCSRFトークンを抽出
 */
export function parseState(state: string): { extensionId: string; csrfToken: string } | null {
  try {
    const decoded = atob(state)
    const parts = decoded.split(':')

    if (parts.length !== 2) {
      console.error('[OAuth] Invalid state format')
      return null
    }

    return {
      extensionId: parts[0],
      csrfToken: parts[1]
    }
  } catch (error) {
    console.error('[OAuth] Failed to parse state:', error)
    return null
  }
}

/**
 * 認証コードをアクセストークンに交換
 */
export async function exchangeCodeForToken(
  code: string,
  config: NotionOAuthConfig
): Promise<NotionOAuthResponse> {
  const encoded = btoa(`${config.clientId}:${config.clientSecret}`)

  const response = await fetch(NOTION_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri,
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`OAuth token exchange failed: ${errorData.error || response.statusText}`)
  }

  return await response.json()
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
