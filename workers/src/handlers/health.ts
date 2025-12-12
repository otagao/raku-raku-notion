/**
 * ヘルスチェックエンドポイント
 */
export function handleHealth(): Response {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'raku-raku-notion-oauth',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
