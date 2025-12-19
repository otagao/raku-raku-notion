import type { LoadUserContentResponse, NotionUser, NotionSpace } from "~types/internal-notion"

// 型定義は types/internal-notion.ts にあるが、uuidが必要
// 拡張機能内で 'uuid' パッケージが使えるか確認が必要だが、なければ簡易実装する
// ここでは簡易的なUUID生成関数を使用（依存関係を増やさないため）
// 32桁のIDをハイフン付きUUID形式に変換する
function formatUUID(id: string): string {
    if (id.includes("-")) return id
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const NOTION_API_V3_BASE = "https://www.notion.so/api/v3"

/**
 * Notionの非公式内部API (v3) を利用するサービス
 * ユーザーのブラウザセッション（Cookie）を利用して認証を行う
 */
export class InternalNotionService {
    /**
     * データベースにギャラリービューを追加し、既存のデフォルトビュー（テーブル）を削除する
     * @param rawDatabaseId - データベースID
     * @param workspaceId - ワークスペースID (NotionConfigから取得)
     * @param visibleProperties - ギャラリービューで表示するプロパティIDのリスト
     * @param existingViewId - 削除する既存のビューID（オプション）
     */
    static async addGalleryView(
        rawDatabaseId: string,
        workspaceId: string,
        visibleProperties: string[] = [],
        existingViewId?: string
    ): Promise<void> {
        const databaseId = formatUUID(rawDatabaseId)
        const viewId = generateUUID()

        console.log("[InternalNotionService] Adding gallery view to database:", databaseId)
        console.log("[InternalNotionService] Using workspace ID:", workspaceId)
        if (existingViewId) {
            console.log("[InternalNotionService] Will remove existing view:", existingViewId)
        } else {
            console.log("[InternalNotionService] No existing view ID provided, will only add gallery view")
        }

        // ギャラリーのプロパティ設定を構築
        const galleryProperties = visibleProperties.map(propId => ({
            property: propId,
            visible: true
        }))

        // デフォルトでカバー画像を表示しない設定がある場合、それを維持しつつ新しいプロパティを追加
        // ここでは、指定されたプロパティを表示し、カバー画像は「ページコンテンツ」にする設定

        const operations: any[] = []

        // 既存のビューを削除する操作を先に追加（existingViewIdが提供されている場合のみ）
        if (existingViewId) {
            console.log(`[InternalNotionService] Preparing to remove existing view: ${existingViewId}`)

            // view_idsリストから削除
            operations.push({
                id: databaseId,
                table: "block",
                path: ["view_ids"],
                command: "listRemove",
                args: {
                    id: existingViewId
                }
            })

            // ビュー自体を削除（aliveフラグをfalseにする）
            operations.push({
                id: existingViewId,
                table: "collection_view",
                path: [],
                command: "update",
                args: {
                    alive: false
                }
            })
        }

        // ギャラリービュー作成の操作
        operations.push(
            {
                id: viewId,
                table: "collection_view",
                path: [],
                command: "set",
                args: {
                    id: viewId,
                    version: 0,
                    type: "gallery",
                    name: "Gallery View (Extension)",
                    format: {
                        gallery_properties: [
                            {
                                property: "cover",
                                visible: false
                            },
                            ...galleryProperties
                        ],
                        gallery_cover: {
                            type: "page_content"
                        },
                        gallery_cover_aspect: "contain" // 画像全体を表示
                    },
                    parent_id: databaseId,
                    parent_table: "block",
                    alive: true
                }
            },
            // 親ブロック（データベース）のview_idsリストに新しいビューを追加
            {
                id: databaseId,
                table: "block",
                path: ["view_ids"],
                command: "listAfter",
                args: {
                    id: viewId
                }
            }
        )

        const transaction = {
            id: generateUUID(),
            spaceId: formatUUID(workspaceId),
            operations: operations
        }

        try {
            console.log("[InternalNotionService] Transaction payload:", JSON.stringify(transaction, null, 2))

            const response = await fetch(`${NOTION_API_V3_BASE}/saveTransactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    requestId: generateUUID(),
                    transactions: [transaction]
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("[InternalNotionService] API Error Response:", errorText)
                throw new Error(`API returned ${response.status}: ${response.statusText || 'Bad Request'} - ${errorText.slice(0, 100)}`)
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * ブロック（データベースなど）の情報を取得する
     */
    static async getBlock(blockId: string): Promise<any> {
        try {
            const response = await fetch(`${NOTION_API_V3_BASE}/getRecordValues`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    requests: [
                        {
                            table: "block",
                            id: formatUUID(blockId)
                        }
                    ]
                })
            })

            if (!response.ok) {
                console.warn("[InternalNotionService] getBlock failed:", response.statusText)
                return null
            }

            const data = await response.json()
            if (data.results && data.results.length > 0) {
                return data.results[0]
            }
            return null
        } catch (error) {
            console.error("[InternalNotionService] getBlock error:", error)
            return null
        }
    }

    /**
     * データベースのビュー情報を取得する（loadPageChunkを使用）
     */
    static async getDatabaseViews(databaseId: string): Promise<string[]> {
        try {
            const formattedId = formatUUID(databaseId)

            // loadPageChunkを使ってデータベースページ全体の情報を取得
            const response = await fetch(`${NOTION_API_V3_BASE}/loadPageChunk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    pageId: formattedId,
                    limit: 10,
                    cursor: { stack: [] },
                    chunkNumber: 0,
                    verticalColumns: false
                })
            })

            if (!response.ok) {
                console.warn("[InternalNotionService] getDatabaseViews (loadPageChunk) failed:", response.statusText)
                return []
            }

            const data = await response.json()
            console.log("[InternalNotionService] loadPageChunk response:", JSON.stringify(data, null, 2))

            // recordMap.collection から view_ids を取得
            if (data.recordMap?.collection?.[formattedId]?.value?.view_ids) {
                const viewIds = data.recordMap.collection[formattedId].value.view_ids
                console.log("[InternalNotionService] Found view IDs from loadPageChunk:", viewIds)
                return viewIds
            }

            // recordMap.collection_view からビューIDを直接取得
            if (data.recordMap?.collection_view) {
                const viewIds = Object.keys(data.recordMap.collection_view)
                if (viewIds.length > 0) {
                    console.log("[InternalNotionService] Found view IDs from collection_view:", viewIds)
                    return viewIds
                }
            }

            console.warn("[InternalNotionService] No view_ids found in loadPageChunk response")
            return []
        } catch (error) {
            console.error("[InternalNotionService] getDatabaseViews error:", error)
            return []
        }
    }

    /**
     * ユーザー情報と参加しているスペース一覧を取得する
     * これが成功すれば、Cookie認証が通っていると判断できる
     */
    static async loadUserContent(): Promise<{ user?: NotionUser; spaces: NotionSpace[] }> {
        try {
            const response = await fetch(`${NOTION_API_V3_BASE}/loadUserContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // ブラウザ拡張機能から実行する場合、Cookieは自動的に送信されるはずだが
                    // credentials: 'include' を明示しておく
                },
                credentials: "include",
                body: JSON.stringify({})
            })

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`)
            }

            const data: LoadUserContentResponse = await response.json()

            // レスポンスからユーザー情報を抽出
            const users = Object.values(data.recordMap.notion_user || {}).map(u => u.value)
            const currentUser = users[0] // 通常は自分の情報のみ返ってくる

            // スペース情報を抽出
            const spaces = Object.values(data.recordMap.space || {}).map(s => s.value)

            return {
                user: currentUser,
                spaces: spaces
            }
        } catch (error) {
            console.error("[InternalNotionService] loadUserContent error:", error)
            throw error
        }
    }

    /**
     * 認証チェック（簡易版）
     */
    static async checkConnection(): Promise<boolean> {
        try {
            const { user } = await this.loadUserContent()
            return !!user
        } catch {
            return false
        }
    }
}
