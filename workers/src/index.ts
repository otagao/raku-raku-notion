import { handleExchange } from './handlers/exchange'
import { handleHealth } from './handlers/health'
import { corsHeaders } from './middleware/cors'
import type { Env } from './types'

/**
 * Cloudflare Workers エントリーポイント
 * OAuth認証のバックエンドプロキシ
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)

    console.log('[Worker] Request:', {
      method: request.method,
      path: url.pathname
    })

    // CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(env)
      })
    }

    try {
      // ルーティング
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(
          JSON.stringify({
            service: 'Raku Raku Notion OAuth Worker',
            version: '1.0.0',
            endpoints: {
              health: 'GET /health',
              exchange: 'POST /api/oauth/exchange'
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return handleHealth()
      }

      if (url.pathname === '/api/oauth/exchange' && request.method === 'POST') {
        return handleExchange(request, env)
      }

      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    } catch (error) {
      console.error('[Worker] Error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal Server Error'
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
}
