import type { NotionConfig, NotionPageData, WebClipData } from "~types"

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
   * アクセストークンの有効性をチェック
   * 401エラーが返された場合、トークンが無効または期限切れ
   */
  async validateToken(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(`${NOTION_API_BASE}/users/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION
        }
      })

      if (response.status === 401) {
        return {
          valid: false,
          error: 'トークンが無効または期限切れです。再認証が必要です。'
        }
      }

      if (!response.ok) {
        return {
          valid: false,
          error: `API接続エラー: ${response.statusText}`
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      }
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

  /**
   * 新しいフルページデータベースを作成する（クリップボード用）
   */
  async createDatabase(name: string): Promise<{ id: string; url: string }> {
    try {
      let parentPageId: string | null = null

      console.log('[NotionService.createDatabase] Creating database:', name)
      console.log('[NotionService.createDatabase] this.databaseId:', this.databaseId)

      // 設定でデータベースが選択されている場合、その親ページを取得
      if (this.databaseId) {
        console.log('[NotionService.createDatabase] Fetching parent from database:', this.databaseId)
        try {
          const dbResponse = await fetch(`${NOTION_API_BASE}/databases/${this.databaseId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${this.getAuthToken()}`,
              "Notion-Version": NOTION_VERSION
            }
          })

          console.log('[NotionService.createDatabase] Database fetch response status:', dbResponse.status)

          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            console.log('[NotionService.createDatabase] Database parent:', dbData.parent)

            // 親ページのIDを取得
            if (dbData.parent?.type === 'page_id') {
              parentPageId = dbData.parent.page_id
              console.log('[NotionService.createDatabase] Using parent page:', parentPageId)
            } else if (dbData.parent?.type === 'workspace') {
              // ワークスペース直下の場合はnullのまま
              parentPageId = null
              console.log('[NotionService.createDatabase] Database is at workspace root')
            }
          }
        } catch (error) {
          console.warn('[NotionService.createDatabase] Failed to get parent from selected database:', error)
        }
      } else {
        console.log('[NotionService.createDatabase] No databaseId in config')
      }

      // 親ページが見つからない場合、ワークスペース内のページを検索
      if (!parentPageId) {
        const searchResponse = await fetch(`${NOTION_API_BASE}/search`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.getAuthToken()}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            filter: {
              value: "page",
              property: "object"
            },
            page_size: 1
          })
        })

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json()
          const page = searchResult.results?.[0]
          if (page) {
            parentPageId = page.id
          }
        }
      }

      if (!parentPageId) {
        throw new Error('親ページが見つかりません。Notionワークスペースにページまたはデータベースを作成してください。')
      }

      // データベースを作成
      const response = await fetch(`${NOTION_API_BASE}/databases`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parent: {
            type: "page_id",
            page_id: parentPageId
          },
          title: [
            {
              type: "text",
              text: {
                content: name
              }
            }
          ],
          properties: {
            "名前": {
              title: {}
            },
            "URL": {
              url: {}
            },
            "作成日時": {
              created_time: {}
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Notion API error:', errorData)
        throw new Error(`データベースの作成に失敗しました: ${errorData.message || response.statusText}`)
      }

      const result = await response.json()
      console.log('Notion database created successfully:', result)

      return {
        id: result.id,
        url: result.url
      }
    } catch (error) {
      console.error('Error creating Notion database:', error)
      throw error
    }
  }

  /**
   * Webクリップをデータベースに追加する
   */
  async createWebClip(data: WebClipData): Promise<string> {
    const { title, url, content, thumbnail, databaseId } = data

    try {
      const children: any[] = []

      // サムネイルがある場合は画像ブロックとして追加
      if (thumbnail) {
        children.push({
          object: "block",
          type: "image",
          image: {
            type: "external",
            external: {
              url: thumbnail
            }
          }
        })
      }

      // 本文がある場合は段落ブロックとして追加
      if (content) {
        // 長いテキストは2000文字ごとに分割（Notion APIの制限）
        const chunks = content.match(/.{1,2000}/g) || []
        chunks.forEach(chunk => {
          children.push({
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ text: { content: chunk } }]
            }
          })
        })
      }

      const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            "名前": {
              title: [{ text: { content: title } }]
            },
            "URL": {
              url: url
            }
          },
          children: children.length > 0 ? children : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Notion API error:', errorData)
        throw new Error(`Webクリップの作成に失敗しました: ${errorData.message || response.statusText}`)
      }

      const result = await response.json()
      console.log('Web clip created successfully:', result)

      return result.id
    } catch (error) {
      console.error('Error creating web clip:', error)
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
