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

export interface NotionConfig {
  apiKey?: string
  databaseId?: string
}
