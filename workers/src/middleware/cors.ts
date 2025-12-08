import type { Env } from '../types'

/**
 * CORS headers
 */
export function corsHeaders(env: Env): Record<string, string> {
  // 許可するoriginを環境変数から取得
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []

  return {
    'Access-Control-Allow-Origin': allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24時間
  }
}
