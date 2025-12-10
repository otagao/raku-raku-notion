/**
 * 型定義
 */

export interface Env {
  NOTION_CLIENT_ID: string
  NOTION_CLIENT_SECRET: string
  ALLOWED_ORIGINS?: string        // カンマ区切り (CORS用、開発時は未設定可)
}

export interface ExchangeRequest {
  code: string
  state: string
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
