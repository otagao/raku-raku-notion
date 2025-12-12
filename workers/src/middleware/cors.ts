import type { Env } from '../types'

/**
 * CORS headers
 * ALLOWED_ORIGINS未設定時は'*'を許可（開発用）
 * 本番環境では必ずALLOWED_ORIGINSを設定すること
 */
export function corsHeaders(env: Env): Record<string, string> {
  // 許可するoriginを環境変数から取得（未設定時は全て許可）
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []
  const origin = allowedOrigins.length > 0 ? allowedOrigins[0] : '*'

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24時間
  }
}
