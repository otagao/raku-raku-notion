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
     * データベースにギャラリービューを追加する
     */
    static async addGalleryView(rawDatabaseId: string): Promise<void> {
        const databaseId = formatUUID(rawDatabaseId)
        const viewId = generateUUID()

        // ギャラリービュー作成のトランザクション
        // reverse engineering of Notion's saveTransactions request when creating a gallery view
        const transaction: any = {
            id: generateUUID(),
            spaceId: "",
            operations: [
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
                                }
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
        }

        try {
            // spaceIdを取得するために一度loadUserContentを呼ぶ
            console.log("[InternalNotionService] Fetching user content to get spaceId...")
            const { spaces } = await this.loadUserContent()
            if (spaces.length > 0) {
                transaction.spaceId = spaces[0].id
            }
            console.log("[InternalNotionService] Using spaceId:", transaction.spaceId)
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
            console.error("[InternalNotionService] addGalleryView error:", error)
            throw error
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
