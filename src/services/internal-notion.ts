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
     */
    static async addGalleryView(rawDatabaseId: string, visibleProperties: string[] = []): Promise<void> {
        const databaseId = formatUUID(rawDatabaseId)
        const viewId = generateUUID()

        // 既存のビューを取得するためにブロック情報を取得
        console.log("[InternalNotionService] Fetching database block info to find default views...")
        const dbBlock = await this.getBlock(databaseId)
        const existingViewIds: string[] = dbBlock?.value?.view_ids || []

        console.log("[InternalNotionService] Existing views to remove:", existingViewIds)

        // ギャラリーのプロパティ設定を構築
        const galleryProperties = visibleProperties.map(propId => ({
            property: propId,
            visible: true
        }))

        // デフォルトでカバー画像を表示しない設定がある場合、それを維持しつつ新しいプロパティを追加
        // ここでは、指定されたプロパティを表示し、カバー画像は「ページコンテンツ」にする設定

        // ギャラリービュー作成の操作
        const operations: any[] = [
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
        ]

        // 既存のビューを削除する操作を追加
        existingViewIds.forEach(oldViewId => {
            // view_idsリストから削除
            operations.push({
                id: databaseId,
                table: "block",
                path: ["view_ids"],
                command: "listRemove",
                args: {
                    id: oldViewId
                }
            })
            // ビュー自体のaliveフラグをfalseにする（完全に削除）
            operations.push({
                id: oldViewId,
                table: "collection_view",
                path: [],
                command: "set",
                args: {
                    alive: false
                }
            })
        })

        const transaction = {
            id: generateUUID(),
            spaceId: "",
            operations: operations
        }

        try {
            // spaceIdを取得するために一度loadUserContentを呼ぶ
            // (getBlockでspaceIdが取れている可能性もあるが、確実なloadUserContentを使う)
            if (!transaction.spaceId) {
                const { spaces } = await this.loadUserContent()
                if (spaces.length > 0) {
                    transaction.spaceId = spaces[0].id
                }
            }

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
