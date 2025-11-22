import type { NotionConfig, NotionPageData } from "~types"

const NOTION_VERSION = "2022-06-28"
const NOTION_API_BASE = "https://api.notion.com/v1"

/**
 * Notion API service
 * Notion APIとの連携を実装するサービス層
 * OAuth認証と手動トークン入力の両方に対応
 */
export class NotionService {
  private apiKey: string | undefined
  private databaseId: string | undefined
  private authMethod: 'manual' | 'oauth'

  constructor(config: NotionConfig) {
    this.authMethod = config.authMethod || 'manual'
    // OAuth使用時はaccessTokenを、手動入力時はapiKeyを使用
    this.apiKey = config.authMethod === 'oauth' ? config.accessToken : config.apiKey
    this.databaseId = config.databaseId
  }

  /**
   * 認証トークンを取得（OAuth/手動トークンの抽象化）
   */
  private getAuthToken(): string {
    if (!this.apiKey) {
      throw new Error('Notion API key or access token is not configured')
    }
    return this.apiKey
  }

  /**
   * Notion APIへの接続をテストする
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${NOTION_API_BASE}/users/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION
        }
      })

      return response.ok
    } catch (error) {
      console.error('Notion API connection test failed:', error)
      return false
    }
  }

  /**
   * Notionデータベースにページを作成する
   */
  async createPage(data: NotionPageData): Promise<string> {
    if (!this.databaseId) {
      throw new Error('Notion database ID is not configured')
    }

    const { title, url, memo } = data

    try {
      const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parent: { database_id: this.databaseId },
          properties: {
            // Notion データベースのプロパティ名に合わせて調整が必要
            // デフォルトでは「名前」と「URL」を想定
            名前: {
              title: [{ text: { content: title } }]
            },
            URL: {
              url: url
            }
          },
          // メモがある場合、ページコンテンツとして追加
          children: memo
            ? [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [{ text: { content: memo } }]
                  }
                }
              ]
            : []
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Notion API error:', errorData)
        throw new Error(`Failed to create Notion page: ${errorData.message || response.statusText}`)
      }

      const result = await response.json()
      console.log('Notion page created successfully:', result)

      return result.id
    } catch (error) {
      console.error('Error creating Notion page:', error)
      throw error
    }
  }

  /**
   * データベースの構造を取得する
   */
  async getDatabaseSchema(): Promise<any> {
    if (!this.databaseId) {
      throw new Error('Notion database ID is not configured')
    }

    try {
      const response = await fetch(`${NOTION_API_BASE}/databases/${this.databaseId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get database schema: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting database schema:', error)
      throw error
    }
  }

  /**
   * ページコンテンツを取得する
   */
  async getPageContent(pageId: string): Promise<any> {
    try {
      const response = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get page content: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting page content:', error)
      throw error
    }
  }

  /**
   * 利用可能なデータベース一覧を取得する（OAuth時に有用）
   */
  async listDatabases(): Promise<any[]> {
    try {
      const response = await fetch(`${NOTION_API_BASE}/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filter: {
            value: "database",
            property: "object"
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to list databases: ${response.statusText}`)
      }

      const result = await response.json()
      return result.results || []
    } catch (error) {
      console.error('Error listing databases:', error)
      throw error
    }
  }
}

/**
 * Notion APIクライアントのインスタンスを作成する
 */
export const createNotionClient = (config: NotionConfig): NotionService => {
  return new NotionService(config)
}
