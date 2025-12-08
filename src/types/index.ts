export type Screen = 'home' | 'create-clipboard' | 'clipboard-list' | 'select-clipboard' | 'demo' | 'settings'

// クリップボード: Notionのデータベースに紐づく
export interface Clipboard {
  id: string                    // ローカルのユニークID
  name: string                  // クリップボード名
  createdAt: Date | string     // 作成日時（ストレージでは文字列）
  lastClippedAt?: Date | string // 最終クリップ日時
  notionDatabaseId: string     // NotionのデータベースID
  notionDatabaseUrl?: string   // NotionデータベースのURL
  createdByExtension: boolean  // この拡張機能で作成されたか
}

// 後方互換性のため残す（削除予定）
export interface Form {
  id: string
  name: string
  createdAt: Date
  targetUrl?: string
  isMock?: boolean
  fields?: FormField[]
}

export interface FormField {
  id: string
  name: string
  type: 'text' | 'textarea' | 'select' | 'checkbox'
  required: boolean
}

export interface NavigationState {
  screen: Screen
  selectedFormId?: string
  selectedClipboardId?: string
}

export type AuthMethod = 'manual' | 'oauth'

export interface NotionConfig {
  authMethod: AuthMethod
  apiKey?: string
  // OAuth用フィールド
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: number
  workspaceId?: string
  workspaceName?: string
  botId?: string
}

// Notion OAuth設定（クライアントサイド用 - CLIENT_SECRET削除）
export interface NotionOAuthConfig {
  clientId: string
  redirectUri: string
}

// OAuth認証レスポンス
export interface NotionOAuthResponse {
  access_token: string
  token_type: string
  bot_id: string
  workspace_id: string
  workspace_name?: string
  workspace_icon?: string
  owner?: {
    type: string
    user?: any
  }
  duplicated_template_id?: string
}

// OAuth トークンリフレッシュレスポンス
export interface NotionTokenRefreshResponse {
  access_token: string
  token_type: string
}

export interface NotionPageData {
  title: string
  url: string
  memo?: string
}

// Webクリップデータ
export interface WebClipData {
  title: string
  url: string
  content?: string       // ページ本文（テキスト）
  thumbnail?: string     // サムネイル画像URL
  icon?: string          // ページアイコン（favicon）URL
  memo?: string          // ユーザーメモ
  databaseId: string     // 保存先データベースID
}

export interface CurrentTabInfo {
  title: string
  url: string
  tabId: number
}
