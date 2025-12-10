import type { Env, ExchangeRequest, NotionTokenResponse } from '../types'
import { corsHeaders } from '../middleware/cors'

const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'

/**
 * トークン交換エンドポイント
 * OAuth認証コードをアクセストークンに交換
 */
export async function handleExchange(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // リクエストボディを解析
    const body: ExchangeRequest = await request.json()
    const { code, state } = body

    console.log('[Exchange] Request received:', {
      hasCode: !!code,
      hasState: !!state
    })

    // 1. 入力検証
    if (!code || !state) {
      console.warn('[Exchange] Missing required parameters')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env)
          }
        }
      )
    }

    // 2. State検証（Chrome storageに保存されたstateと一致するかは拡張機能側で検証済み）
    // ここではstateの形式のみ検証
    try {
      const decoded = atob(state)
      if (!decoded || decoded.length < 10) {
        throw new Error('Invalid state format')
      }
    } catch (error) {
      console.error('[Exchange] Failed to parse state:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid state parameter'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env)
          }
        }
      )
    }

    console.log('[Exchange] Validation passed, exchanging token...')

    // 5. Notion APIへトークン交換リクエスト
    const credentials = btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`)

    const notionResponse = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://raku-raku-notion.pages.dev/callback.html'
      })
    })

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json()
      console.error('[Exchange] Notion token exchange failed:', errorData)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token exchange failed'
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env)
          }
        }
      )
    }

    const tokenData: NotionTokenResponse = await notionResponse.json()

    console.log('[Exchange] Token exchange successful')

    // 6. 成功レスポンスを返す
    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        bot_id: tokenData.bot_id,
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(env)
        }
      }
    )
  } catch (error) {
    console.error('[Exchange] Handler error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(env)
        }
      }
    )
  }
}
