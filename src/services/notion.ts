import type { NotionConfig, NotionDatabaseSummary, NotionPageData, WebClipData } from "~types"

const NOTION_VERSION = "2022-06-28"
const NOTION_API_BASE = "https://api.notion.com/v1"

/**
 * NotionのデータベースURLからビューIDを抽出する
 * @param url - https://www.notion.so/xxx?v={view_id} 形式のURL
 * @returns view_id または undefined
 */
function extractViewIdFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('v') || undefined
  } catch {
    return undefined
  }
}

function extractYouTubeIdFromUrl(url: string): string | undefined {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/shorts/')[1]?.split(/[?/]/)[0] || undefined
      }
      return u.searchParams.get('v') || undefined
    }
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '') || undefined
    }
  } catch {
    return undefined
  }
  return undefined
}

function parseYouTubeStartSeconds(url: string): number | undefined {
  try {
    const u = new URL(url)
    const t = u.searchParams.get('t') || u.searchParams.get('start')
    if (!t) return undefined
    if (/^\d+$/.test(t)) return parseInt(t, 10)
    let total = 0
    const re = /(\d+)(h|m|s)/g
    let match: RegExpExecArray | null
    while ((match = re.exec(t)) !== null) {
      const value = parseInt(match[1], 10)
      const unit = match[2]
      if (unit === 'h') total += value * 3600
      if (unit === 'm') total += value * 60
      if (unit === 's') total += value
    }
    return total > 0 ? total : undefined
  } catch {
    return undefined
  }
}

function buildYouTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  const base = `https://www.youtube.com/embed/${videoId}`
  if (startSeconds && startSeconds > 0) {
    return `${base}?start=${startSeconds}`
  }
  return base
}

/**
 * Notion API service
 * Notion APIとの連携を実装するサービス層
 * OAuth認証と手動トークン入力の両方に対応
 */
export class NotionService {
  private apiKey: string | undefined
  private authMethod: 'manual' | 'oauth'

  constructor(config: NotionConfig) {
    this.authMethod = config.authMethod || 'manual'
    // OAuth使用時はaccessTokenを、手動入力時はapiKeyを使用
    this.apiKey = config.authMethod === 'oauth' ? config.accessToken : config.apiKey
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

  // テストコメント
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
   * @deprecated クリップボード機能ではcreateWebClipを使用してください
   */
  async createPage(data: NotionPageData & { databaseId: string }): Promise<string> {
    const { title, url, memo, databaseId } = data

    if (!databaseId) {
      throw new Error('Notion database ID is required')
    }

    try {
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
  async getDatabaseSchema(databaseId: string): Promise<any> {
    try {
      const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
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
  async listDatabases(): Promise<NotionDatabaseSummary[]> {
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
      const databases = result.results || []

      return databases
        .filter((item: any) => item.object === "database" && !item.archived)
        .map((db: any): NotionDatabaseSummary => ({
          id: db.id,
          title: this.getPlainText(db.title) || '無題のデータベース',
          url: db.url,
          description: this.getPlainText(db.description),
          iconEmoji: db.icon?.type === "emoji" ? db.icon.emoji : undefined,
          lastEditedTime: db.last_edited_time,
          createdTime: db.created_time
        }))
    } catch (error) {
      console.error('Error listing databases:', error)
      throw error
    }
  }

  private getPlainText(richText?: Array<{ plain_text?: string; text?: { content?: string } }>): string {
    if (!richText || richText.length === 0) {
      return ""
    }
    return richText
      .map(block => block?.plain_text || block?.text?.content || "")
      .join("")
      .trim()
  }

  private getTitlePropertyName(properties?: Record<string, any>): string | undefined {
    if (!properties) return undefined
    const entry = Object.entries(properties).find(([, value]) => value?.type === "title")
    return entry?.[0]
  }

  private getPageTitleFromProperties(properties?: Record<string, any>, titlePropName?: string): string {
    if (!properties) return ""
    const name = titlePropName || this.getTitlePropertyName(properties)
    if (!name) return ""
    const prop = properties[name]
    if (!prop || prop.type !== "title") return ""
    return this.getPlainText(prop.title)
  }

  /**
   * ワークスペース直下に新しいページを作成する
   */
  private async createWorkspacePage(title: string): Promise<string> {
    const response = await fetch(`${NOTION_API_BASE}/pages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getAuthToken()}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: {
          type: "workspace",
          workspace: true
        },
        properties: {
          title: {
            title: [
              {
                type: "text",
                text: {
                  content: title
                }
              }
            ]
          }
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[NotionService.createWorkspacePage] Error:', errorData)
      throw new Error(`ワークスペースページの作成に失敗しました: ${errorData.message || response.statusText}`)
    }

    const result = await response.json()
    console.log('[NotionService.createWorkspacePage] Page created:', result.id)
    return result.id
  }

  private async findDatabaseIdByTitle(title: string, parentPageId?: string): Promise<string | undefined> {
    const response = await fetch(`${NOTION_API_BASE}/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getAuthToken()}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: title,
        filter: { property: "object", value: "database" },
        page_size: 20
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[NotionService.findDatabaseIdByTitle] Error:', errorData)
      return undefined
    }

    const result = await response.json()
    const databases = Array.isArray(result.results) ? result.results : []
    const matched = databases.find((db: any) => {
      const dbTitle = this.getPlainText(db?.title)
      if (dbTitle !== title) return false
      if (!parentPageId) return true
      return db?.parent?.type === "page_id" && db?.parent?.page_id === parentPageId
    })
    return matched?.id
  }

  private async getOrCreateTagDatabaseId(parentPageId: string): Promise<string> {
    const tagDbTitle = "タグ保存用ページ"
    const existingId = await this.findDatabaseIdByTitle(tagDbTitle, parentPageId)
    if (existingId) return existingId

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
              content: tagDbTitle
            }
          }
        ],
        properties: {
          "名前": {
            title: {}
          },
          "作成日時": {
            created_time: {}
          }
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[NotionService.createTagDatabase] Error:', errorData)
      throw new Error(`タグDBの作成に失敗しました: ${errorData.message || response.statusText}`)
    }

    const result = await response.json()
    return result.id
  }

  private async fetchDatabase(databaseId: string): Promise<any> {
    const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.getAuthToken()}`,
        "Notion-Version": NOTION_VERSION
      }
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || response.statusText)
    }
    return response.json()
  }

  /**
   * タイトル一致のページを検索してIDを返す
   */
  private async findPageIdByTitle(title: string): Promise<string | undefined> {
    const response = await fetch(`${NOTION_API_BASE}/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getAuthToken()}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: title,
        filter: { property: "object", value: "page" },
        page_size: 20
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[NotionService.findPageIdByTitle] Error:', errorData)
      return undefined
    }

    const result = await response.json()
    const pages = Array.isArray(result.results) ? result.results : []
    const matched = pages.find((page: any) => {
      const pageTitle = this.getPlainText(page?.properties?.title?.title)
      return pageTitle === title
    })
    return matched?.id
  }

  /**
   * 既存のコンテナページがあれば再利用、なければ作成
   */
  private async getOrCreateContainerPageId(title: string): Promise<string> {
    const existingId = await this.findPageIdByTitle(title)
    if (existingId) return existingId
    return this.createWorkspacePage(title)
  }

  /**
   * 新しいフルページデータベースを作成する（クリップボード用）
   * 共有コンテナページの下にデータベースを配置
   */
  async createDatabase(name: string): Promise<{
    id: string
    url: string
    properties: Record<string, string>  // エンコード済み（公式API用）
    propertiesDecoded: Record<string, string>  // デコード済み（内部API用）
    defaultViewId?: string
  }> {
    try {
      console.log('[NotionService.createDatabase] Creating database:', name)

      const containerTitle = 'Raku Raku Notion - コンテナ'
      console.log('[NotionService.createDatabase] Resolving shared container page...')
      const parentPageId = await this.getOrCreateContainerPageId(containerTitle)
      console.log('[NotionService.createDatabase] Container page id:', parentPageId)
      const tagDatabaseId = await this.getOrCreateTagDatabaseId(parentPageId)

      // データベースを作成
      console.log('[NotionService.createDatabase] Creating database under page:', parentPageId)
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
            "メモ": {
              rich_text: {}
            },
            "タグ": {
              relation: {
                database_id: tagDatabaseId,
                single_property: {}
              }
            },
            "作成日時": {
              created_time: {}
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[NotionService.createDatabase] Error:', errorData)
        throw new Error(`データベースの作成に失敗しました: ${errorData.message || response.statusText}`)
      }

      const result = await response.json()
      console.log('[NotionService.createDatabase] Database created successfully:', result)
      console.log('[NotionService.createDatabase] Database URL:', result.url)

      // プロパティIDを両形式で抽出（エンコード済み + デコード済み）
      const propertyIds: Record<string, string> = {}
      const propertyIdsDecoded: Record<string, string> = {}

      if (result.properties) {
        Object.keys(result.properties).forEach(key => {
          if (result.properties[key] && result.properties[key].id) {
            const encodedId = result.properties[key].id
            propertyIds[key] = encodedId  // エンコード済み（公式API用）
            propertyIdsDecoded[key] = decodeURIComponent(encodedId)  // デコード済み（内部API用）
          }
        })
      }

      console.log('[NotionService.createDatabase] Property IDs (encoded):', propertyIds)
      console.log('[NotionService.createDatabase] Property IDs (decoded):', propertyIdsDecoded)

      // URLからデフォルトビューIDを抽出
      const defaultViewId = extractViewIdFromUrl(result.url)
      console.log('[NotionService.createDatabase] Extracted default view ID from URL:', defaultViewId)

      // URLにビューIDが含まれていない場合、データベース作成後に内部APIで取得する必要がある
      if (!defaultViewId) {
        console.warn('[NotionService.createDatabase] No view ID found in URL. Will need to fetch from internal API.')
      }

      return {
        id: result.id,
        url: result.url,
        properties: propertyIds,
        propertiesDecoded: propertyIdsDecoded,
        defaultViewId
      }
    } catch (error) {
      console.error('[NotionService.createDatabase] Error creating database:', error)
      throw error
    }
  }

  /**
   * Webクリップをデータベースに追加する
   */
  async createWebClip(data: WebClipData): Promise<string> {
    const { title, url, content, thumbnail, images, videos, icon, memo, tags, databaseId } = data

    try {
      const children: any[] = []

      const youtubeVideoId = extractYouTubeIdFromUrl(url)
      const youtubeStart = parseYouTubeStartSeconds(url)
      const youtubeEmbedUrl = youtubeVideoId ? buildYouTubeEmbedUrl(youtubeVideoId, youtubeStart) : undefined

      const normalizedVideos = videos?.map(v => {
        const isBlob = v.url.startsWith('blob:')
        const isYouTubeUrl = v.url.includes('youtube.com') || v.url.includes('youtu.be')
        if (youtubeEmbedUrl && (isBlob || isYouTubeUrl)) {
          return { ...v, url: youtubeEmbedUrl }
        }
        return { ...v, url: isBlob ? url : v.url }
      })

      const imageUrls = images && images.length > 0 ? images : (thumbnail ? [thumbnail] : [])
      const bodyImages = imageUrls ? imageUrls.slice(0, 10) : []
      const coverUrl = normalizedVideos?.[0]?.poster || imageUrls?.[0] || thumbnail
      let hostname = ''
      try {
        hostname = new URL(url).hostname
      } catch {
        hostname = ''
      }
      const isTwitter = hostname.includes('twitter.com') || hostname.includes('x.com')

      // X/Twitterの場合は埋め込みカードのみを置く（画像ブロックは追加しない）
      if (isTwitter) {
        children.length = 0
        children.push({
          object: "block",
          type: "embed",
          embed: {
            url
          }
        })
      } else {
        // 動画ブロックを追加（最大3件程度）
        if (normalizedVideos && normalizedVideos.length > 0) {
          normalizedVideos.slice(0, 3).forEach(video => {
            children.push({
              object: "block",
              type: "video",
              video: {
                type: "external",
                external: {
                  url: video.url
                }
              }
            })
          })
        }

        // 本文用に画像ブロックを追加（カバーも含めて最大5件）
        if (bodyImages.length > 0) {
          bodyImages.forEach(imgUrl => {
            children.push({
              object: "block",
              type: "image",
              image: {
                type: "external",
                external: {
                  url: imgUrl
                }
              }
            })
          })
        }
      }

      // 本文がある場合は段落ブロックとして追加
      if (content && !isTwitter) {
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

      // Notion APIの上限（children <= 100）に合わせて切り詰める
      if (children.length > 100) {
        children.splice(100)
      }

      // ページオブジェクトの構築
      const pageData: any = {
        parent: { database_id: databaseId },
        properties: {
          "名前": {
            title: [{ text: { content: title } }]
          },
          "URL": {
            url: url
          }
        },
        // 画像やテキストはページコンテンツ（children）として保存
        children: children.length > 0 ? children : undefined
      }

      // メモがある場合はプロパティに追加
      if (memo) {
        pageData.properties["メモ"] = {
          rich_text: [
            {
              type: "text",
              text: {
                content: memo
              }
            }
          ]
        }
      }

      // タグ付与（マルチセレクト / リレーション）
      if (tags && tags.length > 0) {
        try {
          const db = await this.fetchDatabase(databaseId)
          const tagProp = db.properties?.["タグ"]
          if (tagProp?.type === "multi_select") {
            const multiSelectValue = tags.map(name => ({ name }))
            pageData.properties["タグ"] = { multi_select: multiSelectValue }
          } else if (tagProp?.type === "relation" && tagProp.relation?.database_id) {
            const tagDbId = tagProp.relation.database_id
            const tagDb = await this.fetchDatabase(tagDbId)
            const titlePropName = this.getTitlePropertyName(tagDb?.properties)

            const response = await fetch(`${NOTION_API_BASE}/databases/${tagDbId}/query`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${this.getAuthToken()}`,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ page_size: 100 })
            })
            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || response.statusText)
            }
            const data = await response.json()
            const pages = Array.isArray(data.results) ? data.results : []
            const existingByName = new Map<string, string>()
            pages.forEach((page: any) => {
              const name = this.getPageTitleFromProperties(page?.properties, titlePropName).trim()
              if (name) existingByName.set(name, page.id)
            })

            const relationIds: { id: string }[] = []
            for (const raw of tags) {
              const name = raw.trim()
              if (!name) continue
              const existingId = existingByName.get(name)
              if (existingId) {
                relationIds.push({ id: existingId })
                continue
              }
              const createRes = await fetch(`${NOTION_API_BASE}/pages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${this.getAuthToken()}`,
                  "Notion-Version": NOTION_VERSION,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  parent: { database_id: tagDbId },
                  properties: {
                    [titlePropName || "名前"]: {
                      title: [{ text: { content: name } }]
                    }
                  }
                })
              })
              if (!createRes.ok) {
                const errorData = await createRes.json()
                throw new Error(errorData.message || createRes.statusText)
              }
              const created = await createRes.json()
              relationIds.push({ id: created.id })
              existingByName.set(name, created.id)
            }

            if (relationIds.length > 0) {
              pageData.properties["タグ"] = { relation: relationIds }
            }
          }
        } catch (error) {
          console.warn('Failed to set tag relation:', error)
        }
      }

      // アイコンがある場合はページアイコンとして設定
      if (icon) {
        pageData.icon = {
          type: "external",
          external: {
            url: icon
          }
        }
      }

      // カバーに先頭画像を設定（あれば）
      if (coverUrl) {
        pageData.cover = {
          type: "external",
          external: {
            url: coverUrl
          }
        }
      }

      const response = await fetch(`${NOTION_API_BASE}/pages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getAuthToken()}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(pageData)
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

  /**
   * 指定したデータベースの「タグ」プロパティから選択肢を取得
   * マルチセレクト/リレーション両対応
   */
  async getTagOptions(databaseId: string): Promise<string[]> {
    try {
      const result = await this.fetchDatabase(databaseId)
      const tagProp = result.properties?.["タグ"]
      if (tagProp?.type === "multi_select" && Array.isArray(tagProp.multi_select?.options)) {
        return tagProp.multi_select.options
          .map((opt: any) => opt?.name)
          .filter((name: any): name is string => typeof name === 'string' && name.trim().length > 0)
      }
      if (tagProp?.type === "relation" && tagProp.relation?.database_id) {
        const tagDbId = tagProp.relation.database_id
        const tagDb = await this.fetchDatabase(tagDbId)
        const titlePropName = this.getTitlePropertyName(tagDb?.properties)
        const response = await fetch(`${NOTION_API_BASE}/databases/${tagDbId}/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.getAuthToken()}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ page_size: 100 })
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || response.statusText)
        }
        const data = await response.json()
        const pages = Array.isArray(data.results) ? data.results : []
        return pages
          .map((page: any) => this.getPageTitleFromProperties(page?.properties, titlePropName))
          .filter((name: any): name is string => typeof name === "string" && name.trim().length > 0)
      }
      return []
    } catch (error) {
      console.error('Failed to fetch tag options:', error)
      return []
    }
  }
}

/**
 * Notion APIクライアントのインスタンスを作成する
 */
export const createNotionClient = (config: NotionConfig): NotionService => {
  return new NotionService(config)
}
