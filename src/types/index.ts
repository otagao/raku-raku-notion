export type Screen = 'home' | 'create-form' | 'form-list' | 'demo' | 'settings'

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
}

export type AuthMethod = 'manual' | 'oauth'

export interface NotionConfig {
  authMethod: AuthMethod
  apiKey?: string
  databaseId?: string
  // OAuth用フィールド
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: number
  workspaceId?: string
  workspaceName?: string
  botId?: string
}

// Notion OAuth設定
export interface NotionOAuthConfig {
  clientId: string
  clientSecret: string
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

export interface CurrentTabInfo {
  title: string
  url: string
}
