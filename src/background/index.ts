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
import { generateOAuthUrl, generateStateWithExtensionId, parseState, exchangeCodeForToken } from "~utils/oauth"
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

      case "get-oauth-config":
        await handleGetOAuthConfig(sendResponse)
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
    // Extension IDを含むstateを生成（CSRF対策 + 拡張機能ID埋め込み）
    const extensionId = chrome.runtime.id
    const state = generateStateWithExtensionId(extensionId)

    // stateを一時保存（検証用）
    await chrome.storage.local.set({
      'raku-oauth-state': state,
      'raku-oauth-pending': true  // OAuth処理中フラグ
    })

    console.log('[Background] OAuth started with extension ID:', extensionId)

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
 * OAuth認証を完了（コードをトークンに交換）
 */
async function handleCompleteOAuth(
  data: { code: string; state: string },
  sendResponse: (response?: any) => void
) {
  try {
    console.log('[Background] Starting OAuth completion...');
    console.log('[Background] Received code:', data.code?.substring(0, 10) + '...');
    console.log('[Background] Received state:', data.state?.substring(0, 10) + '...');

    // 保存されたstateを取得
    const storage = await chrome.storage.local.get('raku-oauth-state')
    const savedState = storage['raku-oauth-state'] as string | undefined
    console.log('[Background] Saved state:', savedState ? savedState.substring(0, 10) + '...' : 'none');

    // state検証（CSRF対策）
    if (!savedState || savedState !== data.state) {
      throw new Error('Invalid OAuth state parameter')
    }

    // stateからextension IDとCSRFトークンを抽出
    const parsedState = parseState(data.state)
    if (!parsedState) {
      throw new Error('Failed to parse OAuth state parameter')
    }

    console.log('[Background] Extracted extension ID from state:', parsedState.extensionId)
    console.log('[Background] Current extension ID:', chrome.runtime.id)

    // Extension ID検証（オプション - セキュリティ強化）
    if (parsedState.extensionId !== chrome.runtime.id) {
      console.warn('[Background] Extension ID mismatch - state may be from different installation')
      // 警告のみで続行（開発版→本番版の移行を考慮）
    }

    // OAuth設定を環境変数から取得
    const oauthConfig: NotionOAuthConfig = {
      clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
      clientSecret: process.env.PLASMO_PUBLIC_NOTION_CLIENT_SECRET || '',
      redirectUri: process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'
    }

    console.log('[Background] OAuth config - Client ID:', oauthConfig.clientId ? 'present' : 'missing');
    console.log('[Background] OAuth config - Client Secret:', oauthConfig.clientSecret ? 'present' : 'missing');

    if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
      throw new Error('Notion Client ID or Client Secret is not configured')
    }

    // 認証コードをアクセストークンに交換
    console.log('[Background] Exchanging code for token...');
    const tokenResponse = await exchangeCodeForToken(data.code, oauthConfig)
    console.log('[Background] Token exchange successful');

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

    // 一時保存したstateを削除
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
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'CLIP_PROGRESS',
        status,
      });
    }
  };

  const sendCompletion = (success: boolean) => {
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'CLIP_COMPLETE',
        success,
        databaseId: data.databaseId,
      });
    }
  };

  try {
    const config = await StorageService.getNotionConfig()

    if (!config.apiKey && !config.accessToken) {
      sendCompletion(false);
      sendResponse({
        success: false,
        error: "Notion API key or access token is not configured"
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
    sendCompletion(false);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to clip page"
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
 * OAuth設定を取得（環境変数から）
 */
async function handleGetOAuthConfig(sendResponse: (response?: any) => void) {
  try {
    const config: NotionOAuthConfig = {
      clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
      clientSecret: process.env.PLASMO_PUBLIC_NOTION_CLIENT_SECRET || '',
      redirectUri: process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'
    }

    console.log('[Background] OAuth config requested:', {
      clientId: config.clientId ? 'present' : 'missing',
      clientSecret: config.clientSecret ? 'present' : 'missing',
      redirectUri: config.redirectUri
    })

    sendResponse({
      success: true,
      config: config
    })
  } catch (error) {
    console.error("Failed to get OAuth config:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get OAuth config"
    })
  }
}

console.log("Raku Raku Notion background service worker loaded")
