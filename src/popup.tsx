import { useEffect, useState } from "react"
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
import type { Screen, Form, Clipboard } from "~types"
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
          setClipProgress('完了');
        } else {
          setClipProgress('失敗');
        }

        setTimeout(() => {
          setIsClipping(false);
          window.close();
        }, 2000); // 2秒後に画面を閉じる
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
    await loadClipboards()
  }

  const loadForms = async () => {
    const loadedForms = await StorageService.getForms()
    setForms(loadedForms)
  }

  const loadClipboards = async () => {
    const loadedClipboards = await StorageService.getClipboards()
    setClipboards(loadedClipboards)
  }

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

    // Notionにデータベースを作成
    console.log('[handleCreateClipboard] Creating Notion client with databaseId:', config.databaseId)
    const notionClient = createNotionClient(config)
    const { id: databaseId, url: databaseUrl } = await notionClient.createDatabase(clipboardName)

    // クリップボードを保存
    await StorageService.addClipboard({
      name: clipboardName,
      notionDatabaseId: databaseId,
      notionDatabaseUrl: databaseUrl,
      createdByExtension: true
    })

    await loadClipboards()
  }

  const handleDeleteClipboard = async (clipboardId: string) => {
    await StorageService.deleteClipboard(clipboardId)
    await loadClipboards()
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
      await InternalNotionService.addGalleryView(testDatabaseId)
      setInternalTestResult(`成功: ギャラリービューを追加しました。\nDatabase ID: ${testDatabaseId}\nNotionで確認してください。`)
    } catch (error) {
      setInternalTestResult(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
      console.error('Add Gallery View Failed:', error)
    }
  }

  const handleClipPage = async () => {
    // クリップボードがない場合
    if (clipboards.length === 0) {
      alert('クリップボードを先に作成してください')
      handleNavigate('create-clipboard')
      return
    }

    // クリップボードが1つだけの場合は自動選択してメモダイアログを表示
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
    // 選択されたクリップボードの名前を取得
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
          />
        )
      case 'clipboard-list':
        return (
          <ClipboardListScreen
            clipboards={clipboards}
            onNavigate={handleNavigate}
            onDeleteClipboard={handleDeleteClipboard}
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
