/**
 * Background Service Worker
 * Plasmo フレームワーク用のバックグラウンドスクリプト
 *
 * 主な役割:
 * - Notion API呼び出しのプロキシ（将来のOAuth実装時に使用）
 * - 長時間実行されるタスクの処理
 */

import { createNotionClient } from "~services/notion"
import { StorageService } from "~services/storage"
import type { NotionPageData } from "~types"

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 非同期処理のため、trueを返す
  handleMessage(message, sender, sendResponse)
  return true
})

/**
 * メッセージハンドラ
 */
async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    switch (message.type) {
      case "send-to-notion":
        await handleSendToNotion(message.data, sendResponse)
        break

      case "test-notion-connection":
        await handleTestConnection(sendResponse)
        break

      case "list-databases":
        await handleListDatabases(sendResponse)
        break

      default:
        sendResponse({ success: false, error: "Unknown message type" })
    }
  } catch (error) {
    console.error("Background message handler error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * Notionにページを送信
 */
async function handleSendToNotion(
  data: NotionPageData,
  sendResponse: (response?: any) => void
) {
  try {
    const config = await StorageService.getNotionConfig()

    if (!config.apiKey && !config.accessToken) {
      sendResponse({
        success: false,
        error: "Notion API key or access token is not configured"
      })
      return
    }

    if (!config.databaseId) {
      sendResponse({
        success: false,
        error: "Notion database ID is not configured"
      })
      return
    }

    const notionClient = createNotionClient(config)
    const pageId = await notionClient.createPage(data)

    sendResponse({
      success: true,
      pageId
    })
  } catch (error) {
    console.error("Failed to send to Notion:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page"
    })
  }
}

/**
 * Notion API接続テスト
 */
async function handleTestConnection(sendResponse: (response?: any) => void) {
  try {
    const config = await StorageService.getNotionConfig()
    const notionClient = createNotionClient(config)
    const isConnected = await notionClient.testConnection()

    sendResponse({
      success: true,
      connected: isConnected
    })
  } catch (error) {
    console.error("Connection test failed:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed"
    })
  }
}

/**
 * データベース一覧取得
 */
async function handleListDatabases(sendResponse: (response?: any) => void) {
  try {
    const config = await StorageService.getNotionConfig()
    const notionClient = createNotionClient(config)
    const databases = await notionClient.listDatabases()

    sendResponse({
      success: true,
      databases
    })
  } catch (error) {
    console.error("Failed to list databases:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list databases"
    })
  }
}

console.log("Raku Raku Notion background service worker loaded")
