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
import { generateOAuthUrl, generateState } from "~utils/oauth"
import type { NotionPageData, NotionOAuthConfig, WebClipData } from "~types"

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type, 'from:', sender.url || sender.id);

  // 非同期処理のため、trueを返す
  handleMessage(message, sender, sendResponse).catch(error => {
    console.error('[Background] Message handler error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  });

  return true; // 非同期レスポンスを保持
})

// External messages listener (for OAuth callback from static site)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received external message:', message.type, 'from:', sender.url);

  // 非同期処理のため、trueを返す
  handleMessage(message, sender, sendResponse).catch(error => {
    console.error('[Background] External message handler error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  });

  return true; // 非同期レスポンスを保持
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

      case "start-oauth":
        await handleStartOAuth(message.data, sendResponse)
        break

      case "complete-oauth":
        await handleCompleteOAuth(message.data, sendResponse)
        break

      case "clip-page":
        await handleClipPage(message.data, sender, sendResponse)
        break

      case "create-database":
        await handleCreateDatabase(message.data, sendResponse)
        break

      case "add-gallery-view-via-content":
        await handleAddGalleryViewViaContent(message.data, sendResponse)
        break

      case "get-database-views-via-content":
        await handleGetDatabaseViewsViaContent(message.data, sendResponse)
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

/**
 * OAuth認証フローを開始
 */
async function handleStartOAuth(
  oauthConfig: NotionOAuthConfig & { extensionId?: string },
  sendResponse: (response?: any) => void
) {
  try {
    // Extension IDを含むstateを生成（CSRF対策 + 静的サイトでのリダイレクト用）
    const extensionId = chrome.runtime.id
    const randomToken = generateState()
    const state = btoa(`${extensionId}:${randomToken}`)

    // stateを一時保存（検証用）
    await chrome.storage.local.set({
      'raku-oauth-state': state,
      'raku-oauth-pending': true  // OAuth処理中フラグ
    })

    console.log('[Background] OAuth started with extension ID in state')

    // OAuth認証URLを生成
    const authUrl = generateOAuthUrl(oauthConfig, state)

    // 新しいタブでOAuth認証画面を開く
    chrome.tabs.create({ url: authUrl })

    // レスポンスを送信（ポップアップがキャッシュされる前に）
    try {
      sendResponse({ success: true })
    } catch (err) {
      // ポップアップが既に閉じられている場合は無視
      console.log('[Background] Could not send response (popup may be cached):', err)
    }
  } catch (error) {
    console.error("Failed to start OAuth:", error)
    try {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start OAuth"
      })
    } catch (err) {
      console.error('[Background] Could not send error response:', err)
    }
  }
}

/**
 * OAuth認証を完了（トークン交換済みデータを保存）
 */
async function handleCompleteOAuth(
  data: {
    tokenResponse: {
      access_token: string
      bot_id: string
      workspace_id: string
      workspace_name?: string
      workspace_icon?: string
    }
  },
  sendResponse: (response?: any) => void
) {
  try {
    console.log('[Background] Starting OAuth completion...');

    const { tokenResponse } = data

    if (!tokenResponse || !tokenResponse.access_token) {
      throw new Error('Invalid token response')
    }

    console.log('[Background] Token response received');

    // Notion設定を更新
    const config = await StorageService.getNotionConfig()
    const updatedConfig = {
      ...config,
      authMethod: 'oauth' as const,
      accessToken: tokenResponse.access_token,
      workspaceId: tokenResponse.workspace_id,
      workspaceName: tokenResponse.workspace_name,
      botId: tokenResponse.bot_id
    }

    await StorageService.saveNotionConfig(updatedConfig)
    console.log('[Background] Config saved successfully');

    // OAuth完了フラグを削除
    await chrome.storage.local.remove(['raku-oauth-state', 'raku-oauth-pending'])

    const response = {
      success: true,
      workspace: {
        id: tokenResponse.workspace_id,
        name: tokenResponse.workspace_name
      }
    }

    console.log('[Background] Sending success response:', response)
    sendResponse(response)
  } catch (error) {
    console.error("[Background] Failed to complete OAuth:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete OAuth"
    })
  }
}

/**
 * Webページをクリップ（データベースにページを追加）
 */
async function handleClipPage(
  data: { title: string; url: string; databaseId: string; tabId?: number; content?: string; thumbnail?: string; memo?: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  const sendProgress = (status: string) => {
    // Popupウィンドウに進行状況を送信
    chrome.runtime.sendMessage({
      type: 'CLIP_PROGRESS',
      status,
    }).catch(() => {
      // Popupが閉じられている場合は無視
    });
  };

  const sendCompletion = (success: boolean, error?: string) => {
    // Popupウィンドウに完了通知を送信
    chrome.runtime.sendMessage({
      type: 'CLIP_COMPLETE',
      success,
      databaseId: data.databaseId,
      error
    }).catch(() => {
      // Popupが閉じられている場合は無視
    });
  };

  try {
    const config = await StorageService.getNotionConfig()

    if (!config.apiKey && !config.accessToken) {
      const errorMsg = "Notion API key or access token is not configured"
      sendCompletion(false, errorMsg);
      sendResponse({
        success: false,
        error: errorMsg
      })
      return
    }

    // Content Scriptからコンテンツを抽出（tabIdが指定されている場合）
    let extractedContent: { text?: string; thumbnail?: string; icon?: string } = {}
    if (data.tabId) {
      try {
        console.log('[Background] Extracting content from tab:', data.tabId)
        sendProgress('ページの情報を取得中...');
        const response = await chrome.tabs.sendMessage(data.tabId, { type: 'extract-content' })

        if (response?.success && response.content) {
          extractedContent = {
            text: response.content.text,
            thumbnail: response.content.thumbnail,
            icon: response.content.icon
          }
          console.log('[Background] Content extracted successfully')
        } else {
          console.warn('[Background] Failed to extract content:', response?.error)
        }
      } catch (error) {
        // Content Scriptが読み込まれていない場合など
        console.warn('[Background] Could not extract content from page:', error)
      }
    }

    const notionClient = createNotionClient(config)

    const webClipData: WebClipData = {
      title: data.title,
      url: data.url,
      databaseId: data.databaseId,
      // Content Scriptから取得したコンテンツを優先、なければdata引数を使用
      content: extractedContent.text || data.content,
      thumbnail: extractedContent.thumbnail || data.thumbnail,
      icon: extractedContent.icon,
      memo: data.memo
    }

    sendProgress('Notionにクリップ中...');
    const pageId = await notionClient.createWebClip(webClipData)

    sendCompletion(true);
    sendResponse({
      success: true,
      pageId
    })
  } catch (error) {
    console.error("Failed to clip page:", error)
    const errorMsg = error instanceof Error ? error.message : "Failed to clip page"
    sendCompletion(false, errorMsg);
    sendResponse({
      success: false,
      error: errorMsg
    })
  }
}

/**
 * Notionデータベースを作成
 */
async function handleCreateDatabase(
  data: { name: string },
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

    const notionClient = createNotionClient(config)
    const result = await notionClient.createDatabase(data.name)

    sendResponse({
      success: true,
      database: result
    })
  } catch (error) {
    console.error("Failed to create database:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create database"
    })
  }
}

/**
 * タブにContent Scriptを注入する（既に注入されている場合はスキップ）
 */
async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    // Content Scriptが既に読み込まれているかチェック（pingメッセージを送信）
    await chrome.tabs.sendMessage(tabId, { type: 'ping' })
    console.log('[Background] Content script already loaded in tab:', tabId)
  } catch (error) {
    // Content Scriptが読み込まれていない場合、動的に注入
    console.log('[Background] Injecting content script into tab:', tabId)

    // manifest.jsonからNotion用のContent Scriptファイル名を取得
    const manifest = chrome.runtime.getManifest()
    const notionContentScript = manifest.content_scripts?.find(cs =>
      cs.matches?.includes("https://www.notion.so/*")
    )

    if (!notionContentScript || !notionContentScript.js || notionContentScript.js.length === 0) {
      throw new Error('Notion content script not found in manifest')
    }

    const scriptFile = notionContentScript.js[0]
    console.log('[Background] Injecting content script file:', scriptFile)

    await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptFile]
    })
    // 注入後、初期化を待つ
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

/**
 * Content Script経由でギャラリービューを追加
 * Notion.so上のContent Scriptを使用してCookie認証で内部APIを呼び出す
 */
async function handleAddGalleryViewViaContent(
  data: {
    databaseId: string
    workspaceId: string
    visibleProperties?: string[]
    existingViewId?: string
  },
  sendResponse: (response?: any) => void
) {
  try {
    console.log('[Background] Adding gallery view via content script:', data.databaseId)

    // Notion.soのタブを探す
    const notionTabs = await chrome.tabs.query({ url: "https://www.notion.so/*" })

    if (notionTabs.length === 0) {
      // Notion.soのタブがない場合、新しいタブを開く
      console.log('[Background] No Notion.so tab found, creating new tab')
      const tab = await chrome.tabs.create({
        url: "https://www.notion.so",
        active: false // バックグラウンドで開く
      })

      // タブの読み込み完了を待つ
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener)
            resolve()
          }
        }
        chrome.tabs.onUpdated.addListener(listener)
      })

      // Content Scriptの自動注入を待つ
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Content Scriptにメッセージを送信
      const response = await chrome.tabs.sendMessage(tab.id!, {
        type: 'add-gallery-view',
        databaseId: data.databaseId,
        workspaceId: data.workspaceId,
        visibleProperties: data.visibleProperties || [],
        existingViewId: data.existingViewId
      })

      // タブを閉じる
      await chrome.tabs.remove(tab.id!)

      sendResponse(response)
    } else {
      // 既存のNotion.soタブを使用
      console.log('[Background] Using existing Notion.so tab:', notionTabs[0].id)

      // Content Scriptが注入されているか確認し、なければ注入
      await ensureContentScriptInjected(notionTabs[0].id!)

      const response = await chrome.tabs.sendMessage(notionTabs[0].id!, {
        type: 'add-gallery-view',
        databaseId: data.databaseId,
        workspaceId: data.workspaceId,
        visibleProperties: data.visibleProperties || [],
        existingViewId: data.existingViewId
      })

      sendResponse(response)
    }
  } catch (error) {
    console.error('[Background] Failed to add gallery view via content:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add gallery view'
    })
  }
}

/**
 * Content Script経由でデータベースのビュー一覧を取得
 */
async function handleGetDatabaseViewsViaContent(
  data: { databaseId: string },
  sendResponse: (response?: any) => void
) {
  try {
    console.log('[Background] Getting database views via content script:', data.databaseId)

    // Notion.soのタブを探す
    const notionTabs = await chrome.tabs.query({ url: "https://www.notion.so/*" })

    if (notionTabs.length === 0) {
      // Notion.soのタブがない場合、新しいタブを開く
      const tab = await chrome.tabs.create({
        url: "https://www.notion.so",
        active: false
      })

      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener)
            resolve()
          }
        }
        chrome.tabs.onUpdated.addListener(listener)
      })

      await new Promise(resolve => setTimeout(resolve, 1000))

      const response = await chrome.tabs.sendMessage(tab.id!, {
        type: 'get-database-views',
        databaseId: data.databaseId
      })

      await chrome.tabs.remove(tab.id!)

      sendResponse(response)
    } else {
      // Content Scriptが注入されているか確認し、なければ注入
      await ensureContentScriptInjected(notionTabs[0].id!)

      const response = await chrome.tabs.sendMessage(notionTabs[0].id!, {
        type: 'get-database-views',
        databaseId: data.databaseId
      })

      sendResponse(response)
    }
  } catch (error) {
    console.error('[Background] Failed to get database views via content:', error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get database views'
    })
  }
}

console.log("Raku Raku Notion background service worker loaded")
