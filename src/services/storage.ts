import type { Form, NotionConfig, CurrentTabInfo, Clipboard } from "~types"

const STORAGE_KEYS = {
  FORMS: 'raku-forms',
  CLIPBOARDS: 'raku-clipboards',
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

  // ========== クリップボード管理 ==========

  /**
   * クリップボード一覧を取得
   */
  static async getClipboards(): Promise<Clipboard[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CLIPBOARDS)
      const clipboards = result[STORAGE_KEYS.CLIPBOARDS] || []

      // 文字列からDateオブジェクトに変換
      return clipboards.map((cb: any) => ({
        ...cb,
        createdAt: cb.createdAt ? new Date(cb.createdAt) : new Date(),
        lastClippedAt: cb.lastClippedAt ? new Date(cb.lastClippedAt) : undefined
      }))
    } catch (error) {
      console.error('Failed to get clipboards:', error)
      return []
    }
  }

  /**
   * クリップボード一覧を保存
   */
  static async saveClipboards(clipboards: Clipboard[]): Promise<void> {
    try {
      // DateオブジェクトをISO文字列に変換
      const serialized = clipboards.map(cb => ({
        ...cb,
        createdAt: cb.createdAt instanceof Date ? cb.createdAt.toISOString() : cb.createdAt,
        lastClippedAt: cb.lastClippedAt instanceof Date ? cb.lastClippedAt.toISOString() : cb.lastClippedAt
      }))
      await chrome.storage.local.set({ [STORAGE_KEYS.CLIPBOARDS]: serialized })
    } catch (error) {
      console.error('Failed to save clipboards:', error)
      throw error
    }
  }

  /**
   * クリップボードを追加
   */
  static async addClipboard(clipboard: Omit<Clipboard, 'id' | 'createdAt'>): Promise<Clipboard> {
    const clipboards = await this.getClipboards()
    const newClipboard: Clipboard = {
      ...clipboard,
      id: crypto.randomUUID(),
      createdAt: new Date()
    }
    clipboards.push(newClipboard)
    await this.saveClipboards(clipboards)
    return newClipboard
  }

  /**
   * クリップボードを削除
   */
  static async deleteClipboard(clipboardId: string): Promise<void> {
    const clipboards = await this.getClipboards()
    const filteredClipboards = clipboards.filter(cb => cb.id !== clipboardId)
    await this.saveClipboards(filteredClipboards)
  }

  /**
   * IDでクリップボードを取得
   */
  static async getClipboardById(clipboardId: string): Promise<Clipboard | null> {
    const clipboards = await this.getClipboards()
    return clipboards.find(cb => cb.id === clipboardId) || null
  }

  /**
   * クリップボードの最終クリップ日時を更新
   */
  static async updateClipboardLastClipped(clipboardId: string): Promise<void> {
    const clipboards = await this.getClipboards()
    const index = clipboards.findIndex(cb => cb.id === clipboardId)

    if (index !== -1) {
      clipboards[index].lastClippedAt = new Date()
      await this.saveClipboards(clipboards)
    }
  }

  /**
   * NotionデータベースIDからクリップボードを取得
   */
  static async getClipboardByDatabaseId(databaseId: string): Promise<Clipboard | null> {
    const clipboards = await this.getClipboards()
    return clipboards.find(cb => cb.notionDatabaseId === databaseId) || null
  }
}
