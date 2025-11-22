import type { Form, NotionConfig, CurrentTabInfo } from "~types"

const STORAGE_KEYS = {
  FORMS: 'raku-forms',
  NOTION_CONFIG: 'raku-notion-config',
  INITIALIZED: 'raku-initialized'
} as const

const MOCK_FORMS: Form[] = [
  {
    id: 'mock-1',
    name: 'モックフォーム - Notion公式サイト',
    createdAt: new Date('2024-01-01'),
    targetUrl: 'https://www.notion.so',
    isMock: true
  }
]

export class StorageService {
  static async getForms(): Promise<Form[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.FORMS)
      return result[STORAGE_KEYS.FORMS] || []
    } catch (error) {
      console.error('Failed to get forms:', error)
      return []
    }
  }

  static async initializeMockData(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.INITIALIZED)
      if (!result[STORAGE_KEYS.INITIALIZED]) {
        await this.saveForms(MOCK_FORMS)
        await chrome.storage.local.set({ [STORAGE_KEYS.INITIALIZED]: true })
      }
    } catch (error) {
      console.error('Failed to initialize mock data:', error)
    }
  }

  static async saveForms(forms: Form[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.FORMS]: forms })
    } catch (error) {
      console.error('Failed to save forms:', error)
      throw error
    }
  }

  static async addForm(form: Omit<Form, 'id' | 'createdAt'>): Promise<Form> {
    const forms = await this.getForms()
    const newForm: Form = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date()
    }
    forms.push(newForm)
    await this.saveForms(forms)
    return newForm
  }

  static async deleteForm(formId: string): Promise<void> {
    const forms = await this.getForms()
    const filteredForms = forms.filter(form => form.id !== formId)
    await this.saveForms(filteredForms)
  }

  static async getNotionConfig(): Promise<NotionConfig> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.NOTION_CONFIG)
      return result[STORAGE_KEYS.NOTION_CONFIG] || {}
    } catch (error) {
      console.error('Failed to get Notion config:', error)
      return {}
    }
  }

  static async saveNotionConfig(config: NotionConfig): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.NOTION_CONFIG]: config })
    } catch (error) {
      console.error('Failed to save Notion config:', error)
      throw error
    }
  }

  /**
   * 開発用: ストレージをクリアしてモックデータを再初期化
   * 本番環境では使用しないこと
   */
  static async resetStorage(): Promise<void> {
    try {
      await chrome.storage.local.clear()
      console.log('Storage cleared. Reinitializing mock data...')
      await this.initializeMockData()
      console.log('Mock data reinitialized successfully')
    } catch (error) {
      console.error('Failed to reset storage:', error)
      throw error
    }
  }

  /**
   * 開発用: 現在のストレージ内容を確認
   */
  static async debugStorage(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get(null)
      console.log('=== Current Storage Contents ===')
      console.log(allData)
      console.log('================================')
    } catch (error) {
      console.error('Failed to debug storage:', error)
    }
  }

  /**
   * 現在アクティブなタブの情報を取得する
   */
  static async getCurrentTabInfo(): Promise<CurrentTabInfo | null> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab || !tab.title || !tab.url) {
        return null
      }
      return {
        title: tab.title,
        url: tab.url
      }
    } catch (error) {
      console.error('Failed to get current tab info:', error)
      return null
    }
  }
}
