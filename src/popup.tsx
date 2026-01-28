import { useCallback, useEffect, useState } from "react"
import HomeScreen from "~screens/HomeScreen"
import ClippingProgressScreen from "~screens/ClippingProgressScreen"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"

import type { Screen, Clipboard, Language, ClipResult } from "~types"
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

  const [language, setLanguage] = useState<Language>('ja')
  const [creationCountdown, setCreationCountdown] = useState(0)
  const [creationStatus, setCreationStatus] = useState<string>("")
  const [memoDraft, setMemoDraft] = useState<string>("")
  const [lastClipResult, setLastClipResult] = useState<ClipResult | null>(null)

  useEffect(() => {
    migrateStorageIfNeeded()
    initializeAndLoadData()

    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'CLIP_PROGRESS') {
        setClipProgress(message.status);
      } else if (message.type === 'CLIP_COMPLETE') {
        const clipResult: ClipResult = {
          success: message.success,
          pageId: message.pageId,
          pageUrl: message.pageUrl,
          databaseId: message.databaseId,
          error: message.error,
          timestamp: Date.now()
        };

        if (message.success) {
          setClipProgress('✓ クリップ完了！');
          setMemoDraft("");
          setLastClipResult(clipResult);

          // 成功時は1秒後にホーム画面へ戻る（UIは閉じない）
          setTimeout(() => {
            setIsClipping(false);
            setCurrentScreen('home');
          }, 1000);
        } else {
          setClipProgress(`✗ クリップ失敗: ${message.error || '不明なエラー'}`);
          setLastClipResult(clipResult);

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

  const migrateStorageIfNeeded = async () => {
    const MIGRATION_KEY = 'raku-migration-v2-done'

    const result = await chrome.storage.local.get(MIGRATION_KEY)
    if (result[MIGRATION_KEY]) {
      return
    }

    // 旧データを削除
    await chrome.storage.local.remove('raku-clipboards')

    // マイグレーション完了フラグを保存
    await chrome.storage.local.set({ [MIGRATION_KEY]: true })

    console.log('[Migration] Storage migrated to v2 (clipboard list removed)')
  }

  const initializeAndLoadData = async () => {
    await loadContainerPages()
    await loadLanguage()
    await loadCurrentTab()
  }

  // クリップボードリストが変わったときに選択状態を同期
  useEffect(() => {
    if (clipboards.length === 0) {
      setSelectedClipboardId('__new__')
      return
    }
    if (selectedClipboardId === '__new__') {
      return
    }
    if (!selectedClipboardId || !clipboards.find(cb => cb.notionPageId === selectedClipboardId)) {
      setSelectedClipboardId(clipboards[0].notionPageId)
    }
  }, [clipboards, selectedClipboardId])

  const loadContainerPages = async () => {
    const config = await StorageService.getNotionConfig()
    if (!config.accessToken && !config.apiKey) {
      setClipboards([])
      return
    }

    try {
      const notionClient = createNotionClient(config)
      const pages = await notionClient.listPagesUnderContainer()

      // ContainerPage を Clipboard 型に変換（互換性のため）
      const clipboards: Clipboard[] = pages.map(page => ({
        id: page.id,
        name: page.title,
        createdAt: page.createdTime || new Date().toISOString(),
        notionPageId: page.id,  // フルページデータベースのID（ページIDとデータベースIDは同一）
        notionPageUrl: page.url
      }))

      setClipboards(clipboards)

      // 選択状態の復元
      if (clipboards.length > 0) {
        const storedId = await StorageService.getSelectedClipboardId()
        const fallbackId = clipboards[0].notionPageId
        setSelectedClipboardId(
          storedId && clipboards.find(cb => cb.notionPageId === storedId)
            ? storedId
            : fallbackId
        )
      } else {
        setSelectedClipboardId(undefined)
      }
    } catch (error) {
      console.error('Failed to load container pages:', error)
      setClipboards([])
    }
  }

  // 選択中DBのタグを取得
  useEffect(() => {
    const fetchTags = async () => {
      if (!selectedClipboardId || selectedClipboardId === '__new__') {
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

    // 作成後に保存先リストを再取得
    await loadContainerPages()
    console.log('[handleCreateClipboard] 保存先データベース created:', clipboardName)
  }




  const handleClipPage = async () => {
    if (selectedClipboardId === '__new__') {
      alert(language === 'ja'
        ? '保存先を作成してから保存してください'
        : 'Please create a destination before saving')
      return
    }

    const targetId = selectedClipboardId || clipboards[0]?.notionPageId
    if (!targetId) {
      alert(language === 'ja'
        ? '保存先が見つかりません'
        : 'No destination found')
      return
    }

    await performClip(targetId, memoDraft || undefined)
  }

  const handleSelectClipboard = async (databaseId: string) => {
    await performClip(databaseId, memoDraft || undefined)
  }

  // 選択した保存先を保存（ポップアップ再オープン時に復元）
  useEffect(() => {
    if (selectedClipboardId && selectedClipboardId !== '__new__') {
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

      // ストレージから選択状態とタグキャッシュを削除
      await chrome.storage.local.remove([
        'raku-selected-clipboard-id',
        'raku-tag-options-map'
      ])

      // ローカル状態をクリア
      setClipboards([])
      setSelectedClipboardId(undefined)
      setSelectedTags([])
      setTagOptions([])
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert('連携解除に失敗しました')
    }
  }

  const handleClipNow = async () => {
    if (selectedClipboardId === '__new__') {
      alert(language === 'ja'
        ? '保存先を作成してから保存してください'
        : 'Please create a destination before saving')
      return
    }

    const tabInfo = await StorageService.getCurrentTabInfo()
    if (!tabInfo) {
      alert(language === 'ja'
        ? 'ページ情報を取得できませんでした'
        : 'Failed to get page information')
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

    const targetId = selectedClipboardId || clipboards[0]?.notionPageId
    if (!targetId) {
      alert(language === 'ja'
        ? '保存先が見つかりません'
        : 'No destination found')
      return
    }

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
        onDisconnect={handleDisconnect}
        onCreateClipboard={handleCreateClipboard}
        lastClipResult={lastClipResult}
        onClearClipResult={() => setLastClipResult(null)}
      />
    )
  }

  return (
    <div style={{ minHeight: 'fit-content' }}>
      {isClipping ? (
        <ClippingProgressScreen progressMessage={clipProgress} />
      ) : (
        renderScreen()
      )}
    </div>
  )
}

export default IndexPopup
