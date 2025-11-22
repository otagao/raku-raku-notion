export type Screen = 'home' | 'create-form' | 'form-list' | 'demo'

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
  // OAuth用フィールド (将来実装)
  accessToken?: string
  workspaceId?: string
  botId?: string
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
