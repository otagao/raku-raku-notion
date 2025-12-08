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
    const { code, state, extensionId } = body

    console.log('[Exchange] Request received:', {
      hasCode: !!code,
      hasState: !!state,
      extensionId: extensionId
    })

    // 1. 入力検証
    if (!code || !state || !extensionId) {
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

    // 2. Extension ID検証 (allow-list)
    const allowedIds = env.ALLOWED_EXTENSION_IDS?.split(',').map(id => id.trim()) || []
    if (!allowedIds.includes(extensionId)) {
      console.warn('[Exchange] Unauthorized extension ID:', extensionId)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized extension'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env)
          }
        }
      )
    }

    // 3. State検証 (extension ID抽出)
    let stateExtensionId: string
    try {
      // state形式: base64(extensionId:randomToken)
      const decoded = atob(state)
      const parts = decoded.split(':')

      if (parts.length !== 2) {
        throw new Error('Invalid state format')
      }

      stateExtensionId = parts[0]
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

    // 4. State内のExtension IDとリクエストのExtension IDが一致するか確認
    if (stateExtensionId !== extensionId) {
      console.warn('[Exchange] Extension ID mismatch:', {
        stateExtensionId,
        extensionId
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Extension ID verification failed'
        }),
        {
          status: 403,
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
