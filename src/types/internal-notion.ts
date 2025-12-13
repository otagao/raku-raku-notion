/**
 * Notionの内部API (v3) の型定義
 */

export interface NotionUser {
    id: string
    email: string
    given_name?: string
    family_name?: string
    profile_photo?: string
}

export interface NotionSpace {
    id: string
    name: string
    icon?: string
}

export interface LoadUserContentResponse {
    recordMap: {
        notion_user: {
            [key: string]: {
                role: string
                value: NotionUser
            }
        }
        space: {
            [key: string]: {
                role: string
                value: NotionSpace
            }
        }
        // 他にも block, collection などが含まれるが、ここでは認証確認用のみ定義
    }
}

export interface Operation {
    id: string
    table: string
    path: string[]
    command: string
    args: any
}

export interface Transaction {
    id: string
    spaceId: string
    operations: Operation[]
}

export interface SaveTransactionsRequest {
    requestId: string
    transactions: Transaction[]
}
