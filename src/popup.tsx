import { useCallback, useEffect, useState } from "react"
import HomeScreen from "~screens/HomeScreen"
import CreateFormScreen from "~screens/CreateFormScreen"
import FormListScreen from "~screens/FormListScreen"
import CreateClipboardScreen from "~screens/CreateClipboardScreen"
import ClipboardListScreen from "~screens/ClipboardListScreen"
import SelectClipboardScreen from "~screens/SelectClipboardScreen"
import DemoScreen from "~screens/DemoScreen"
import { SettingsScreen } from "~screens/SettingsScreen"
import ClippingProgressScreen from "~screens/ClippingProgressScreen"
import MemoDialog from "~components/MemoDialog"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"
import { InternalNotionService } from "~services/internal-notion"
import type { Screen, Form, Clipboard, NotionDatabaseSummary } from "~types"
import "~styles/global.css"

function IndexPopup() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [forms, setForms] = useState<Form[]>([])
  const [clipboards, setClipboards] = useState<Clipboard[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>()
  const [selectedClipboardId, setSelectedClipboardId] = useState<string | undefined>()
  const [showMemoDialog, setShowMemoDialog] = useState(false)
  const [pendingClipDatabaseId, setPendingClipDatabaseId] = useState<string | undefined>()
  const [pendingClipboardName, setPendingClipboardName] = useState<string | undefined>()
  const [isClipping, setIsClipping] = useState(false)
  const [clipProgress, setClipProgress] = useState("")
  const [internalTestResult, setInternalTestResult] = useState<string>("")
  const [testDatabaseId, setTestDatabaseId] = useState<string>("")
  const [availableDatabases, setAvailableDatabases] = useState<NotionDatabaseSummary[]>([])
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [creationCountdown, setCreationCountdown] = useState(0)

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
    await StorageService.initializeMockData()
    await loadForms()
    // 保存済み保存先データベースをロード
    await loadClipboards()
    await refreshAvailableDatabases({ silent: true })
  }

  const loadForms = async () => {
    const loadedForms = await StorageService.getForms()
    setForms(loadedForms)
  }

  const loadClipboards = async () => {
    const loadedClipboards = await StorageService.getClipboards()
    setClipboards(loadedClipboards)
  }

  const refreshAvailableDatabases = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setDatabaseError(null)
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
      const existingIds = new Set(storedClipboards.map(cb => cb.notionDatabaseId))
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
      if (screen === 'demo') {
        setSelectedFormId(idParam)
      } else {
        setSelectedClipboardId(idParam)
      }
    }
  }

  const handleCreateForm = async (formName: string) => {
    await StorageService.addForm({ name: formName })
    await loadForms()
  }

  const handleCreateClipboard = async (clipboardName: string) => {
    // Notion認証チェック
    const config = await StorageService.getNotionConfig()
    console.log('[handleCreateClipboard] Loaded config:', JSON.stringify(config, null, 2))

    if (!config.accessToken && !config.apiKey) {
      alert('Notion連携が必要です。設定画面でNotionアカウントを連携してください。')
      handleNavigate('settings')
      throw new Error('Notion連携が必要です')
    }

    // Notionに保存先データベースを作成
    console.log('[handleCreateClipboard] Creating Notion client with databaseId:', config.databaseId)
    const notionClient = createNotionClient(config)
    const { id: databaseId, url: databaseUrl, properties, defaultViewId } = await notionClient.createDatabase(clipboardName)

    // Internal APIを使用してギャラリービューを追加（自動実行）
    try {
      console.log('[handleCreateClipboard] Default view ID from URL:', defaultViewId)

      let viewIdToRemove = defaultViewId

      // データベース作成直後は内部APIへの反映に時間がかかるため待機（ポーリング方式）
      console.log('[handleCreateClipboard] Waiting for database permissions to sync (Polling)...')

      let viewsResponse: any = null
      const MAX_RETRIES = 30

      for (let i = 0; i < MAX_RETRIES; i++) {
        setCreationCountdown(MAX_RETRIES - i)

        // Internal APIでビュー一覧取得を試行
        viewsResponse = await chrome.runtime.sendMessage({
          type: 'get-database-views-via-content',
          data: { databaseId }
        })

        // ビュー取得に成功したらループを抜ける
        if (viewsResponse && viewsResponse.success && viewsResponse.viewIds && viewsResponse.viewIds.length > 0) {
          console.log(`[handleCreateClipboard] Database synced successfully after ${i + 1} seconds`)
          break
        }

        // 失敗した場合は1秒待機して再試行
        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      setCreationCountdown(0)

      console.log('[handleCreateClipboard] Views response from content script:', viewsResponse)

      // URLからビューIDが取得できなかった場合、内部APIで取得を試みる
      if (!viewIdToRemove) {
        console.log('[handleCreateClipboard] No view ID in URL. Using view from internal API...')
        if (viewsResponse.success && viewsResponse.viewIds && viewsResponse.viewIds.length > 0) {
          viewIdToRemove = viewsResponse.viewIds[0]
          console.log('[handleCreateClipboard] Using first view as default view:', viewIdToRemove)
        } else {
          console.warn('[handleCreateClipboard] Could not find any views via internal API:', viewsResponse.error)
        }
      }

      // spaceIdを内部APIから取得（workspaceIdの代わりに使用）
      let spaceIdToUse = config.workspaceId
      if (viewsResponse.success && viewsResponse.spaceId) {
        spaceIdToUse = viewsResponse.spaceId
        console.log('[handleCreateClipboard] Using spaceId from internal API:', spaceIdToUse)
      } else {
        console.warn('[handleCreateClipboard] Could not get spaceId from internal API. Falling back to workspaceId:', spaceIdToUse)
      }

      if (!spaceIdToUse) {
        throw new Error('Space ID not found. Please re-authenticate with Notion.')
      }

      // 表示したいプロパティ（URLとメモ）のIDを取得
      const visiblePropIds: string[] = []
      if (properties["URL"]) visiblePropIds.push(properties["URL"])
      if (properties["メモ"]) visiblePropIds.push(properties["メモ"])

      console.log('[handleCreateClipboard] Adding gallery view with properties:', visiblePropIds)
      console.log('[handleCreateClipboard] View to remove:', viewIdToRemove)
      console.log('[handleCreateClipboard] Using space ID:', spaceIdToUse)

      // Background Script経由でContent Scriptを使用してギャラリービューを追加
      const galleryResponse = await chrome.runtime.sendMessage({
        type: 'add-gallery-view-via-content',
        data: {
          databaseId,
          workspaceId: spaceIdToUse,  // 実際はspaceIdとして使用される
          visibleProperties: visiblePropIds,
          existingViewId: viewIdToRemove
        }
      })

      console.log('[handleCreateClipboard] Gallery view response from content script:', galleryResponse)

      if (!galleryResponse.success) {
        throw new Error(galleryResponse.error || 'Failed to add gallery view')
      }

      console.log('[handleCreateClipboard] Gallery view added and default view removed successfully')
    } catch (error) {
      console.warn('Failed to add gallery view via internal API:', error)
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


  const handleTestInternalApi = async () => {
    setInternalTestResult("接続テスト中...")
    try {
      const { user, spaces } = await InternalNotionService.loadUserContent()
      const spaceNames = spaces.map(s => s.name).join(", ")
      const resultMsg = user
        ? `成功: ${user.email} (${user.given_name || ''})\nスペース: ${spaceNames}`
        : "成功: ユーザー情報なし"
      setInternalTestResult(resultMsg)
      console.log('Internal API Test Success:', { user, spaces })
    } catch (error) {
      setInternalTestResult(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
      console.error('Internal API Test Failed:', error)
    }
  }


  const handleAddGalleryView = async () => {
    if (!testDatabaseId) {
      setInternalTestResult("エラー: データベースIDを入力してください")
      return
    }
    setInternalTestResult("ギャラリービュー追加中...")
    try {
      // Notion設定からworkspaceIdを取得
      const config = await StorageService.getNotionConfig()
      if (!config.workspaceId) {
        setInternalTestResult("エラー: Workspace IDが見つかりません。Notionと再認証してください。")
        return
      }

      // Background Script経由でContent Scriptを使用してギャラリービューを追加
      const response = await chrome.runtime.sendMessage({
        type: 'add-gallery-view-via-content',
        data: {
          databaseId: testDatabaseId,
          workspaceId: config.workspaceId
        }
      })

      if (response.success) {
        setInternalTestResult(`成功: ギャラリービューを追加しました。\nDatabase ID: ${testDatabaseId}\nNotionで確認してください。`)
      } else {
        setInternalTestResult(`エラー: ${response.error || '不明なエラー'}`)
      }
    } catch (error) {
      setInternalTestResult(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
      console.error('Add Gallery View Failed:', error)
    }
  }

  const handleClipPage = async () => {
    // 保存先データベースがない場合
    if (clipboards.length === 0) {
      alert('保存先データベースを先に作成してください')
      handleNavigate('create-clipboard')
      return
    }

    // 保存先データベースが1つだけの場合は自動選択してメモダイアログを表示
    if (clipboards.length === 1) {
      setPendingClipDatabaseId(clipboards[0].notionDatabaseId)
      setPendingClipboardName(clipboards[0].name)
      setShowMemoDialog(true)
      return
    }

    // 複数ある場合は選択UIを表示
    handleNavigate('select-clipboard')
  }

  const handleSelectClipboard = async (databaseId: string) => {
    // 選択された保存先データベースの名前を取得
    const selectedClipboard = clipboards.find(cb => cb.notionDatabaseId === databaseId)

    // メモダイアログを表示
    setPendingClipDatabaseId(databaseId)
    setPendingClipboardName(selectedClipboard?.name)
    setShowMemoDialog(true)
  }

  const handleMemoConfirm = async (memo: string) => {
    setShowMemoDialog(false)
    if (pendingClipDatabaseId) {
      await performClip(pendingClipDatabaseId, memo)
      setPendingClipDatabaseId(undefined)
      setPendingClipboardName(undefined)
    }
  }

  const handleMemoCancel = () => {
    setShowMemoDialog(false)
    setPendingClipDatabaseId(undefined)
    setPendingClipboardName(undefined)
  }

  const performClip = (databaseId: string, memo?: string) => {
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
          url: tabInfo.url,
          databaseId,
          tabId: tabInfo.tabId, // Content Scriptからコンテンツを抽出するためのタブID
          memo: memo || undefined // メモがあれば含める
        }
      });
    }).catch(error => {
      console.error('Clip error:', error);
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsClipping(false);
    });
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} onClipPage={handleClipPage} />
      case 'create-form':
        return (
          <CreateFormScreen
            onNavigate={handleNavigate}
            onCreateForm={handleCreateForm}
          />
        )
      case 'form-list':
        return <FormListScreen forms={forms} onNavigate={handleNavigate} allForms={forms} />
      case 'create-clipboard':
        return (
          <CreateClipboardScreen
            onNavigate={handleNavigate}
            onCreateClipboard={handleCreateClipboard}
            countdown={creationCountdown}
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
          />
        )
      case 'select-clipboard':
        return (
          <SelectClipboardScreen
            clipboards={clipboards}
            onNavigate={handleNavigate}
            onSelectClipboard={handleSelectClipboard}
          />
        )
      case 'demo':
        return <DemoScreen formId={selectedFormId} onNavigate={handleNavigate} />
      case 'settings':
        return (
          <>
            <SettingsScreen onBack={() => handleNavigate('home')} />
            <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
              <h3>内部APIテスト</h3>
              <button
                onClick={handleTestInternalApi}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                接続テスト実行 (Read-Only)
              </button>

              <div style={{ marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                  Target Database ID (Test):
                </label>
                <input
                  type="text"
                  value={testDatabaseId}
                  onChange={(e) => setTestDatabaseId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-..."
                  style={{ width: '100%', padding: '5px', marginBottom: '5px' }}
                />
                <button
                  onClick={handleAddGalleryView}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#d9534f', // Danger color for write action
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  ギャラリービュー追加 (Write)
                </button>
              </div>

              {internalTestResult && (
                <pre style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  fontSize: '12px',
                  overflow: 'auto',
                  border: '1px solid #ddd'
                }}>
                  {internalTestResult}
                </pre>
              )}
            </div>
          </>
        )
      default:
        return <HomeScreen onNavigate={handleNavigate} onClipPage={handleClipPage} />
    }
  }

  return (
    <>
      {isClipping ? (
        <ClippingProgressScreen progressMessage={clipProgress} />
      ) : (
        <>
          {renderScreen()}
          {showMemoDialog && (
            <MemoDialog
              onConfirm={handleMemoConfirm}
              onCancel={handleMemoCancel}
              clipboardName={pendingClipboardName}
            />
          )}
        </>
      )}
    </>
  )
}

export default IndexPopup
