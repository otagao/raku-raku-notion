import { useCallback, useEffect, useState } from "react"
import HomeScreen from "~screens/HomeScreen"
import CreateClipboardScreen from "~screens/CreateClipboardScreen"
import ClipboardListScreen from "~screens/ClipboardListScreen"
import SelectClipboardScreen from "~screens/SelectClipboardScreen"
import ClippingProgressScreen from "~screens/ClippingProgressScreen"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"

import type { Screen, Clipboard, NotionDatabaseSummary, Language } from "~types"
import "~styles/global.css"

function IndexPopup() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [clipboards, setClipboards] = useState<Clipboard[]>([])
  const [selectedClipboardId, setSelectedClipboardId] = useState<string | undefined>()
  const [tagOptions, setTagOptions] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isYouTubeTab, setIsYouTubeTab] = useState(false)
  const tagFetchSeq = useState({ current: 0 })[0] // フェッチの競合防止用
  const [isClipping, setIsClipping] = useState(false)
  const [clipProgress, setClipProgress] = useState("")

  const [availableDatabases, setAvailableDatabases] = useState<NotionDatabaseSummary[]>([])
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [databaseInfoMessage, setDatabaseInfoMessage] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('ja')
  const [creationCountdown, setCreationCountdown] = useState(0)
  const [creationStatus, setCreationStatus] = useState<string>("")
  const [memoDraft, setMemoDraft] = useState<string>("")

  useEffect(() => {
    initializeAndLoadData()

    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'CLIP_PROGRESS') {
        setClipProgress(message.status);
      } else if (message.type === 'CLIP_COMPLETE') {
        if (message.success) {
          if (message.databaseId) {
            StorageService.getClipboardByDatabaseId(message.databaseId).then(clipboard => {
              if (clipboard) {
                StorageService.updateClipboardLastClipped(clipboard.id);
              }
            });
          }
          setClipProgress('✓ クリップ完了！');
          setMemoDraft("");

          // 成功時は1.5秒後に自動的に閉じる
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          setClipProgress(`✗ クリップ失敗: ${message.error || '不明なエラー'}`);

          // 失敗時は3秒後に閉じる（エラーメッセージを読む時間を確保）
          setTimeout(() => {
            setIsClipping(false);
            setCurrentScreen('home');
          }, 3000);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [])

  const initializeAndLoadData = async () => {
    await loadClipboards()
    await refreshAvailableDatabases({ silent: true })
    await loadLanguage()
    await loadCurrentTab()
  }

  // クリップボードリストが変わったときに選択状態を同期
  useEffect(() => {
    if (clipboards.length === 0) {
      setSelectedClipboardId(undefined)
      return
    }
    if (!selectedClipboardId || !clipboards.find(cb => cb.notionDatabaseId === selectedClipboardId)) {
      setSelectedClipboardId(clipboards[0].notionDatabaseId)
    }
  }, [clipboards, selectedClipboardId])

  const loadClipboards = async () => {
    const loadedClipboards = await StorageService.getClipboards()
    setClipboards(loadedClipboards)
    if (loadedClipboards.length > 0) {
      const storedId = await StorageService.getSelectedClipboardId()
      const fallbackId = loadedClipboards[0].notionDatabaseId
      setSelectedClipboardId(
        storedId && loadedClipboards.find(cb => cb.notionDatabaseId === storedId)
          ? storedId
          : fallbackId
      )
    } else {
      setSelectedClipboardId(undefined)
    }
  }

  // 選択中DBのタグを取得
  useEffect(() => {
    const fetchTags = async () => {
      if (!selectedClipboardId) {
        setTagOptions([])
        return
      }
      const seq = ++tagFetchSeq.current

      // 1) まずローカルキャッシュを表示
      const cached = await StorageService.getTagOptionsForDatabase(selectedClipboardId)
      if (cached) {
        setTagOptions(cached)
      } else {
        setTagOptions([])
      }

      // 2) その後APIで最新取得（成功時のみ上書き＋キャッシュ保存）
      const config = await StorageService.getNotionConfig()
      if (!config.accessToken && !config.apiKey) {
        setTagOptions(cached || [])
        return
      }
      try {
        const notionClient = createNotionClient(config)
        const attemptFetch = async (retries = 1): Promise<string[]> => {
          try {
            return await notionClient.getTagOptions(selectedClipboardId)
          } catch (err) {
            if (retries > 0) {
              await new Promise(res => setTimeout(res, 500))
              return attemptFetch(retries - 1)
            }
            throw err
          }
        }
        const tags = await attemptFetch(1)
        // 最新リクエストのみ反映
        if (seq === tagFetchSeq.current) {
          setTagOptions(tags)
          await StorageService.saveTagOptionsForDatabase(selectedClipboardId, tags)
        }
      } catch (err) {
        console.warn('Failed to load tag options:', err)
        if (seq === tagFetchSeq.current) {
          setTagOptions(cached || [])
        }
      }
    }
    fetchTags()
  }, [selectedClipboardId])

  const loadLanguage = async () => {
    const config = await StorageService.getLanguageConfig()
    setLanguage(config.language || 'ja')
  }

  const loadCurrentTab = async () => {
    const tabInfo = await StorageService.getCurrentTabInfo()
    if (!tabInfo?.url) {
      setIsYouTubeTab(false)
      return
    }
    setIsYouTubeTab(isYouTubeUrl(tabInfo.url))
  }

  const isYouTubeUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      return parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')
    } catch {
      return false
    }
  }

  const toggleLanguage = async () => {
    const next = language === 'ja' ? 'en' : 'ja'
    setLanguage(next)
    await StorageService.saveLanguageConfig({ language: next })
  }

  const refreshAvailableDatabases = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setDatabaseError(null)
      setDatabaseInfoMessage(null)
    }
    setIsLoadingDatabases(true)
    try {
      const config = await StorageService.getNotionConfig()

      if (!config.accessToken && !config.apiKey) {
        setAvailableDatabases([])
        if (!silent) {
          setDatabaseError('Notionアカウントとの連携が必要です')
        }
        return
      }

      const notionClient = createNotionClient(config)
      const [databases, storedClipboards] = await Promise.all([
        notionClient.listDatabases(),
        StorageService.getClipboards()
      ])

      // 削除済みデータベースの検知
      const remoteDatabaseIds = new Set(databases.map(db => db.id))
      const deletedClipboards = storedClipboards.filter(
        cb => !remoteDatabaseIds.has(cb.notionDatabaseId)
      )

      // 削除後のクリップボードリストを保持（未削除の場合は元のリストを使用）
      let currentClipboards = storedClipboards

      if (deletedClipboards.length > 0 && !silent) {
        // 確認ダイアログを表示
        const confirmed = window.confirm(
          `${deletedClipboards.length}件の削除済みデータベースが見つかりました。一覧から削除しますか?`
        )

        if (confirmed) {
          // ユーザーが削除を承認した場合、一括削除
          for (const clipboard of deletedClipboards) {
            await StorageService.deleteClipboard(clipboard.id)
          }

          // クリップボードリストを再取得（削除後の最新状態）
          currentClipboards = await StorageService.getClipboards()
          setClipboards(currentClipboards)

          // 情報メッセージを表示
          setDatabaseInfoMessage(
            `${deletedClipboards.length}件の削除済みデータベースを一覧から削除しました`
          )
        }
      }

      // 未登録のデータベースをフィルタリング（既存機能）
      // 削除実行後は currentClipboards を使用して正確に計算
      const existingIds = new Set(currentClipboards.map(cb => cb.notionDatabaseId))
      const filtered = databases.filter(db => !existingIds.has(db.id))
      setAvailableDatabases(filtered)
    } catch (error) {
      console.error('Failed to refresh available databases:', error)
      if (!silent) {
        setDatabaseError(error instanceof Error ? error.message : 'データベースの取得に失敗しました')
      }
    } finally {
      setIsLoadingDatabases(false)
    }
  }, [])

  const handleNavigate = (screen: string, idParam?: string) => {
    setCurrentScreen(screen as Screen)
    if (idParam) {
      setSelectedClipboardId(idParam)
    }
  }

  const handleCreateClipboard = async (clipboardName: string) => {
    // Notion認証チェック
    const config = await StorageService.getNotionConfig()
    console.log('[handleCreateClipboard] Loaded config:', JSON.stringify(config, null, 2))

    if (!config.accessToken && !config.apiKey) {
      alert('Notion連携が必要です。ホーム画面でNotionアカウントを連携してください。')
      throw new Error('Notion連携が必要です')
    }

    // Notionに保存先データベースを作成
    console.log('[handleCreateClipboard] Creating Notion client with databaseId:', config.databaseId)
    const notionClient = createNotionClient(config)
    let {
      id: databaseId,
      url: databaseUrl,
      properties,  // エンコード済み（公式API用）
      propertiesDecoded  // デコード済み（内部API用）
    } = await notionClient.createDatabase(clipboardName)

    // Internal APIを使用してギャラリービューを追加（自動実行）
    try {
      // データベース作成直後は内部APIへの反映に時間がかかるため待機（ポーリング方式）
      console.log('[handleCreateClipboard] Waiting for database permissions to sync (Polling)...')

      let viewsResponse: any = null
      const MAX_RETRIES = 60  // 30秒 → 60秒に延長

      for (let i = 0; i < MAX_RETRIES; i++) {
        setCreationCountdown(MAX_RETRIES - i)

        // 進行状況に応じたステータスメッセージを表示
        setCreationStatus(
          i < 10 ? "データベースを同期中..." :
          i < 30 ? "権限を確認中..." :
          i < 50 ? "もう少しお待ちください..." :
          "最終確認中..."
        )

        // Internal APIでビュー一覧取得を試行
        viewsResponse = await chrome.runtime.sendMessage({
          type: 'get-database-views-via-content',
          data: { databaseId }
        })

        console.log(`[handleCreateClipboard] Polling attempt ${i + 1}/${MAX_RETRIES}:`, {
          success: viewsResponse?.success,
          hasSpaceId: !!viewsResponse?.spaceId,
          viewCount: viewsResponse?.viewIds?.length || 0,
          error: viewsResponse?.error
        })

        // ビュー取得に成功 + spaceIdも取得できたらループを抜ける
        // spaceId取得成功は権限反映の確実な指標
        if (viewsResponse &&
            viewsResponse.success &&
            viewsResponse.spaceId &&  // spaceId取得を必須条件に追加
            viewsResponse.viewIds &&
            viewsResponse.viewIds.length > 0) {
          console.log(`[handleCreateClipboard] Database synced successfully after ${i + 1} attempts`)
          break
        }

        // 失敗した場合は指数バックオフで待機して再試行
        if (i < MAX_RETRIES - 1) {
          // 指数バックオフ: 初期10秒は500ms、10-30秒は1s、30秒以降は2s
          const waitTime = i < 10 ? 500 : i < 30 ? 1000 : 2000
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      setCreationCountdown(0)
      setCreationStatus("")

      console.log('[handleCreateClipboard] Polling completed. Final response:', viewsResponse)

      // ポーリングが失敗した場合の詳細なエラーログ
      if (!viewsResponse || !viewsResponse.success) {
        console.error('[handleCreateClipboard] ❌ Polling failed - viewsResponse is invalid:', viewsResponse)
        throw new Error(`Database views polling failed: ${viewsResponse?.error || 'Unknown error'}`)
      }

      if (!viewsResponse.spaceId) {
        console.error('[handleCreateClipboard] ❌ Polling failed - spaceId not found')
        throw new Error('Space ID not found in polling response')
      }

      if (!viewsResponse.viewIds || viewsResponse.viewIds.length === 0) {
        console.error('[handleCreateClipboard] ❌ Polling failed - no views found')
        throw new Error('No views found in database')
      }

      // spaceIdを内部APIから取得（workspaceIdの代わりに使用）
      const spaceIdToUse = viewsResponse.spaceId
      console.log('[handleCreateClipboard] ✓ Using spaceId from internal API:', spaceIdToUse)

      // 表示したいプロパティのIDを取得（デコード済みIDを直接使用）
      const visiblePropIds: string[] = []

      // タイトルプロパティ（名前）を最優先で追加（必須）
      if (propertiesDecoded["名前"]) visiblePropIds.push(propertiesDecoded["名前"])

      // その他の表示したいプロパティ
      if (propertiesDecoded["URL"]) visiblePropIds.push(propertiesDecoded["URL"])
      if (propertiesDecoded["メモ"]) visiblePropIds.push(propertiesDecoded["メモ"])
      if (propertiesDecoded["タグ"]) visiblePropIds.push(propertiesDecoded["タグ"])

      // 全プロパティIDを取得（ギャラリービューの可視性制御用）
      const allPropertyIds: string[] = Object.values(propertiesDecoded)

      console.log('[handleCreateClipboard] Properties object (encoded):', properties)
      console.log('[handleCreateClipboard] Properties object (decoded):', propertiesDecoded)
      console.log('[handleCreateClipboard] Properties keys:', Object.keys(propertiesDecoded))
      console.log('[handleCreateClipboard] Visible properties:', visiblePropIds)
      console.log('[handleCreateClipboard] All properties:', allPropertyIds)
      console.log('[handleCreateClipboard] Using space ID:', spaceIdToUse)

      // デフォルトビューIDを取得（通常は最初のビュー）
      const defaultViewId = viewsResponse.viewIds && viewsResponse.viewIds.length > 0
        ? viewsResponse.viewIds[0]
        : undefined
      console.log('[handleCreateClipboard] Default view ID to delete:', defaultViewId)

      // Background Script経由でContent Scriptを使用してギャラリービューを追加
      // タグ設定を含む全てのプロパティ表示設定が完了してから、デフォルトビューを削除
      const galleryResponse = await chrome.runtime.sendMessage({
        type: 'add-gallery-view-via-content',
        data: {
          databaseId,
          workspaceId: spaceIdToUse,  // 実際はspaceIdとして使用される
          visibleProperties: visiblePropIds,  // デコード済みのIDを直接使用
          allProperties: allPropertyIds,  // デコード済みの全プロパティを使用
          defaultViewId  // デフォルトビューを削除するために渡す
        }
      })

      console.log('[handleCreateClipboard] Gallery view response from content script:', galleryResponse)

      if (!galleryResponse.success) {
        throw new Error(galleryResponse.error || 'Failed to add gallery view')
      }

      // ギャラリービュー作成成功時、URLにビューIDを付加
      if (galleryResponse.galleryViewId) {
        const url = new URL(databaseUrl)
        // NotionのURL形式に合わせてハイフンを除去
        url.searchParams.set('v', galleryResponse.galleryViewId.replace(/-/g, ''))
        databaseUrl = url.toString()
        console.log('[handleCreateClipboard] Updated database URL with gallery view:', databaseUrl)
      }

      console.log('[handleCreateClipboard] Gallery view added successfully and default view removed')
    } catch (error) {
      console.warn('Failed to add gallery view via internal API:', error)

      // エラー種別に応じた詳細なメッセージを表示
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage.includes('permission') || errorMessage.includes('edit access')) {
        console.warn('[handleCreateClipboard] Permission error: 権限の反映に時間がかかっています')
        // 内部APIは失敗しても保存先データベース作成は成功とする（警告のみ）
        // ユーザーには「データベースは作成されましたが、ビュー設定に失敗しました」と表示される
      } else if (errorMessage.includes('timeout')) {
        console.warn('[handleCreateClipboard] Timeout error: タイムアウトが発生しました')
      } else if (errorMessage.includes('Cookie') || errorMessage.includes('token_v2')) {
        console.warn('[handleCreateClipboard] Cookie error: 認証Cookieが見つかりません')
      } else {
        console.warn('[handleCreateClipboard] Unknown error:', errorMessage)
      }

      // 内部APIは失敗しても保存先データベース作成は成功とする（警告のみ）
    }

    // 保存先データベースを保存
    await StorageService.addClipboard({
      name: clipboardName,
      notionDatabaseId: databaseId,
      notionDatabaseUrl: databaseUrl,
      createdByExtension: true
    })

    await loadClipboards()
    await refreshAvailableDatabases({ silent: true })
    console.log('[handleCreateClipboard] 保存先データベース created:', clipboardName)
  }

  const handleDeleteClipboard = async (clipboardId: string) => {
    await StorageService.deleteClipboard(clipboardId)
    await loadClipboards()
    await refreshAvailableDatabases({ silent: true })
  }

  const handleRegisterExistingDatabase = async (database: NotionDatabaseSummary) => {
    await StorageService.addClipboard({
      name: database.title || '無題のデータベース',
      notionDatabaseId: database.id,
      notionDatabaseUrl: database.url,
      createdByExtension: false
    })
    await loadClipboards()
    await refreshAvailableDatabases({ silent: true })
  }







  const handleClipPage = async () => {
    // 保存先データベースがない場合
    if (clipboards.length === 0) {
      alert('保存先データベースを先に作成してください')
      handleNavigate('create-clipboard')
      return
    }

    const targetId = selectedClipboardId || clipboards[0].notionDatabaseId
    await performClip(targetId, memoDraft || undefined)
  }

  const handleSelectClipboard = async (databaseId: string) => {
    await performClip(databaseId, memoDraft || undefined)
  }

  // 選択した保存先を保存（ポップアップ再オープン時に復元）
  useEffect(() => {
    if (selectedClipboardId) {
      StorageService.saveSelectedClipboardId(selectedClipboardId)
    }
  }, [selectedClipboardId])

  const performClip = (databaseId: string, memo?: string, overrideUrl?: string) => {
    setIsClipping(true);
    setClipProgress('クリップの準備をしています...');

    StorageService.getCurrentTabInfo().then(tabInfo => {
      if (!tabInfo) {
        alert('ページ情報を取得できませんでした');
        setIsClipping(false);
        return;
      }

      // Backgroundにメッセージを送信してクリップを実行（tabIdとmemoを含む）
      chrome.runtime.sendMessage({
        type: 'clip-page',
        data: {
          title: tabInfo.title,
          url: overrideUrl || tabInfo.url,
          databaseId,
          tabId: tabInfo.tabId, // Content Scriptからコンテンツを抽出するためのタブID
          memo: memo || undefined, // メモがあれば含める
          tags: selectedTags.length > 0 ? selectedTags : undefined
        }
      });
    }).catch(error => {
      console.error('Clip error:', error);
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsClipping(false);
    });
  }

  const handleDisconnect = async () => {
    try {
      await StorageService.saveNotionConfig({
        authMethod: 'oauth',
        apiKey: undefined,
        accessToken: undefined,
        workspaceId: undefined,
        workspaceName: undefined,
        botId: undefined
      })

      await StorageService.saveClipboards([])
      setClipboards([])
      setSelectedClipboardId(undefined)
      setSelectedTags([])
      setTagOptions([])
      setAvailableDatabases([])
      setDatabaseError(null)
      setDatabaseInfoMessage(null)
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert('連携解除に失敗しました')
    }
  }

  const handleClipNow = async () => {
    if (clipboards.length === 0) {
      alert('保存先データベースを先に作成してください')
      handleNavigate('create-clipboard')
      return
    }
    const tabInfo = await StorageService.getCurrentTabInfo()
    if (!tabInfo) {
      alert('ページ情報を取得できませんでした')
      return
    }

    let urlToSave = tabInfo.url
    try {
      const response = await chrome.tabs.sendMessage(tabInfo.tabId, { type: 'get-youtube-time' })
      if (response?.success && typeof response.currentTime === 'number' && response.currentTime > 0) {
        const u = new URL(tabInfo.url)
        u.searchParams.set('t', `${response.currentTime}s`)
        urlToSave = u.toString()
      }
    } catch (error) {
      console.warn('[handleClipNow] Failed to get YouTube time:', error)
    }

    const targetId = selectedClipboardId || clipboards[0].notionDatabaseId
    await performClip(targetId, memoDraft || undefined, urlToSave)
  }

  const addTagAndPersist = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    setSelectedTags(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setTagOptions(prev => {
      if (prev.includes(trimmed)) return prev
      const merged = [...prev, trimmed]
      if (selectedClipboardId) {
        StorageService.saveTagOptionsForDatabase(selectedClipboardId, merged).catch(() => { })
      }
      return merged
    })
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            onNavigate={handleNavigate}
            onClipPage={handleClipPage}
            onClipNow={handleClipNow}
            isYouTubeTab={isYouTubeTab}
            language={language}
            onToggleLanguage={toggleLanguage}
            memo={memoDraft}
            onMemoChange={setMemoDraft}
            clipboards={clipboards}
            selectedClipboardId={selectedClipboardId}
            onSelectClipboardId={setSelectedClipboardId}
            selectedTags={selectedTags}
            onAddTag={addTagAndPersist}
            onRemoveTag={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
            existingTags={tagOptions}
            isYouTubeTab={isYouTubeTab}
            onClipNow={handleClipNow}
            onDisconnect={handleDisconnect}
          />
        )
      case 'create-clipboard':
        return (
          <CreateClipboardScreen
            onNavigate={handleNavigate}
            onCreateClipboard={handleCreateClipboard}
            language={language}
            countdown={creationCountdown}
            status={creationStatus}
          />
        )
      case 'clipboard-list':
        return (
          <ClipboardListScreen
            clipboards={clipboards}
            onNavigate={handleNavigate}
            onDeleteClipboard={handleDeleteClipboard}
            availableDatabases={availableDatabases}
            onImportDatabase={handleRegisterExistingDatabase}
            onRefreshDatabases={refreshAvailableDatabases}
            isLoadingDatabases={isLoadingDatabases}
            databaseError={databaseError}
            databaseInfoMessage={databaseInfoMessage}
            language={language}
          />
        )
      case 'select-clipboard':
        return (
          <SelectClipboardScreen
            clipboards={clipboards}
            onNavigate={handleNavigate}
            onSelectClipboard={handleSelectClipboard}
            language={language}
          />
        )
      default:
        return (
          <HomeScreen
            onNavigate={handleNavigate}
            onClipPage={handleClipPage}
            language={language}
            onToggleLanguage={toggleLanguage}
            memo={memoDraft}
            onMemoChange={setMemoDraft}
            clipboards={clipboards}
            selectedClipboardId={selectedClipboardId}
            onSelectClipboardId={setSelectedClipboardId}
            selectedTags={selectedTags}
            onAddTag={addTagAndPersist}
            onRemoveTag={(tag) => setSelectedTags(prev => prev.filter(t => t !== tag))}
            existingTags={tagOptions}
            isYouTubeTab={isYouTubeTab}
            onClipNow={handleClipNow}
            onDisconnect={handleDisconnect}
          />
        )
    }
  }

  return (
    <>
      {isClipping ? (
        <ClippingProgressScreen progressMessage={clipProgress} />
      ) : (
        renderScreen()
      )}
    </>
  )
}

export default IndexPopup
