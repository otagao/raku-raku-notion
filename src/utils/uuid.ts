/**
 * UUID生成・変換ユーティリティ
 */

/**
 * 簡易UUID生成
 * crypto.randomUUID()の代替（ブラウザ互換性のため）
 * @returns UUID v4形式の文字列
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 32桁のIDをハイフン付きUUID形式に変換
 * @param id - 32桁のID文字列
 * @returns UUID形式の文字列（既にハイフンが含まれている場合はそのまま返す）
 */
export function formatUUID(id: string): string {
  if (id.includes('-')) return id
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}
