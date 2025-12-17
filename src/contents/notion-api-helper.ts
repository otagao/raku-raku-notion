import type { PlasmoCSConfig } from "plasmo"

/**
 * Notion.so上で実行されるContent Script
 * ブラウザのCookieを使用してNotion内部API (v3) を呼び出す
 */

export const config: PlasmoCSConfig = {
  matches: ["https://www.notion.so/*"],
  run_at: "document_idle",
  all_frames: false // メインフレームのみで実行
}

// 簡易UUID生成
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 32桁のIDをハイフン付きUUID形式に変換
function formatUUID(id: string): string {
  if (id.includes("-")) return id
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}

const NOTION_API_V3_BASE = "https://www.notion.so/api/v3"

/**
 * ギャラリービューを追加し、既存ビューを削除する
 */
async function addGalleryView(
  rawDatabaseId: string,
  workspaceId: string,
  visibleProperties: string[] = [],
  existingViewId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const databaseId = formatUUID(rawDatabaseId)
    const viewId = generateUUID()

    console.log("[NotionAPIHelper] Adding gallery view to database:", databaseId)
    console.log("[NotionAPIHelper] Using workspace ID:", workspaceId)
    console.log("[NotionAPIHelper] Visible properties:", visibleProperties)
    console.log("[NotionAPIHelper] Existing view to remove:", existingViewId)

    const galleryProperties = visibleProperties.map(propId => ({
      property: propId,
      visible: true
    }))

    const operations: any[] = []

    // 既存ビューの削除
    if (existingViewId) {
      operations.push({
        id: databaseId,
        table: "block",
        path: ["view_ids"],
        command: "listRemove",
        args: { id: existingViewId }
      })

      operations.push({
        id: existingViewId,
        table: "collection_view",
        path: [],
        command: "update",
        args: { alive: false }
      })
    }

    // ギャラリービュー作成
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
            gallery_cover_aspect: "contain"
          },
          parent_id: databaseId,
          parent_table: "block",
          alive: true
        }
      },
      {
        id: databaseId,
        table: "block",
        path: ["view_ids"],
        command: "listAfter",
        args: { id: viewId }
      }
    )

    const transaction = {
      id: generateUUID(),
      spaceId: formatUUID(workspaceId),
      operations: operations
    }

    console.log("[NotionAPIHelper] Transaction payload:", JSON.stringify(transaction, null, 2))

    // Cookie確認（デバッグ用）
    const cookies = document.cookie
    console.log("[NotionAPIHelper] Current domain:", window.location.hostname)
    console.log("[NotionAPIHelper] Has cookies:", cookies.length > 0)
    if (cookies.length === 0) {
      console.warn("[NotionAPIHelper] WARNING: No cookies found! This may cause authentication failure.")
    }

    const response = await fetch(`${NOTION_API_V3_BASE}/saveTransactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // Cookieを含める
      body: JSON.stringify({
        requestId: generateUUID(),
        transactions: [transaction]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[NotionAPIHelper] API Error Response (full):", errorText)
      console.error("[NotionAPIHelper] Request details - databaseId:", databaseId, "workspaceId:", workspaceId)
      console.error("[NotionAPIHelper] Transaction payload was:", JSON.stringify(transaction, null, 2))

      // JSONパースを試みて、詳細なエラーメッセージを抽出
      let errorDetail = errorText
      let errorType = 'Unknown'
      try {
        const errorJson = JSON.parse(errorText)
        errorDetail = errorJson.debugMessage || errorJson.message || errorText
        errorType = errorJson.name || 'Unknown'

        // 権限エラーの場合、より詳細な情報を提供
        if (errorDetail.includes('edit access') || errorDetail.includes('permission')) {
          console.error("[NotionAPIHelper] Permission error detected. This may be caused by:")
          console.error("  1. Database not synced to internal API yet (try waiting longer)")
          console.error("  2. Incorrect spaceId (should use database's spaceId, not workspace_id)")
          console.error("  3. User not logged in to Notion.so in this browser")
        }
      } catch (e) {
        // JSONパースに失敗した場合はそのまま使用
      }

      return {
        success: false,
        error: `API returned ${response.status} (${errorType}): ${errorDetail}`
      }
    }

    console.log("[NotionAPIHelper] Gallery view added successfully")
    return { success: true }

  } catch (error) {
    console.error("[NotionAPIHelper] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * データベースのビュー情報とspaceIdを取得する
 */
async function getDatabaseViews(rawDatabaseId: string): Promise<{ success: boolean; viewIds?: string[]; spaceId?: string; error?: string }> {
  try {
    const databaseId = formatUUID(rawDatabaseId)

    const response = await fetch(`${NOTION_API_V3_BASE}/loadPageChunk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        pageId: databaseId,
        limit: 10,
        cursor: { stack: [] },
        chunkNumber: 0,
        verticalColumns: false
      })
    })

    if (!response.ok) {
      return {
        success: false,
        error: `API returned ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()
    console.log("[NotionAPIHelper] loadPageChunk response:", JSON.stringify(data, null, 2))

    // spaceIdを取得
    let spaceId: string | undefined
    if (data.recordMap?.block?.[databaseId]?.value?.space_id) {
      spaceId = data.recordMap.block[databaseId].value.space_id
      console.log("[NotionAPIHelper] Found spaceId from block metadata:", spaceId)
    }

    // collection_view からビューIDを取得
    if (data.recordMap?.collection_view) {
      const viewIds = Object.keys(data.recordMap.collection_view)
      console.log("[NotionAPIHelper] Found view IDs:", viewIds)
      return { success: true, viewIds, spaceId }
    }

    return { success: true, viewIds: [], spaceId }

  } catch (error) {
    console.error("[NotionAPIHelper] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Background Scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[NotionAPIHelper] ========== MESSAGE RECEIVED ==========")
  console.log("[NotionAPIHelper] Message type:", request.type)
  console.log("[NotionAPIHelper] Full request:", request)
  console.log("[NotionAPIHelper] Sender:", sender)

  // Content Script読み込み確認用のping
  if (request.type === 'ping') {
    console.log("[NotionAPIHelper] Responding to ping")
    sendResponse({ success: true })
    return false
  }

  if (request.type === 'add-gallery-view') {
    console.log("[NotionAPIHelper] Processing add-gallery-view request")
    addGalleryView(
      request.databaseId,
      request.workspaceId,
      request.visibleProperties || [],
      request.existingViewId
    ).then(result => {
      console.log("[NotionAPIHelper] add-gallery-view completed:", result)
      sendResponse(result)
    })
    return true // 非同期レスポンス
  }

  if (request.type === 'get-database-views') {
    console.log("[NotionAPIHelper] Processing get-database-views request")
    getDatabaseViews(request.databaseId).then(result => {
      console.log("[NotionAPIHelper] get-database-views completed:", result)
      sendResponse(result)
    })
    return true // 非同期レスポンス
  }

  console.log("[NotionAPIHelper] Unknown message type, ignoring")
  return false
})

const loadId = Math.random().toString(36).substring(7)
console.log("[NotionAPIHelper] ========================================")
console.log("[NotionAPIHelper] Content script loaded on Notion.so")
console.log("[NotionAPIHelper] Load ID:", loadId)
console.log("[NotionAPIHelper] Current URL:", window.location.href)
console.log("[NotionAPIHelper] Extension ID:", chrome.runtime.id)
console.log("[NotionAPIHelper] Waiting for messages...")
console.log("[NotionAPIHelper] ========================================")
