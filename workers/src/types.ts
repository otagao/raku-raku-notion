/**
 * 型定義
 */

export interface Env {
  NOTION_CLIENT_ID: string
  NOTION_CLIENT_SECRET: string
  ALLOWED_EXTENSION_IDS: string  // カンマ区切り
  ALLOWED_ORIGINS: string        // カンマ区切り (CORS用)
}

export interface ExchangeRequest {
  code: string
  state: string
  extensionId: string
}

export interface NotionTokenResponse {
  access_token: string
  token_type: string
  bot_id: string
  workspace_id: string
  workspace_name?: string
  workspace_icon?: string
  owner?: any
}
