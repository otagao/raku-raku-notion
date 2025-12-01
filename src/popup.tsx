import { useEffect, useState } from "react"
import HomeScreen from "~screens/HomeScreen"
import CreateFormScreen from "~screens/CreateFormScreen"
import FormListScreen from "~screens/FormListScreen"
import CreateClipboardScreen from "~screens/CreateClipboardScreen"
import ClipboardListScreen from "~screens/ClipboardListScreen"
import SelectClipboardScreen from "~screens/SelectClipboardScreen"
import DemoScreen from "~screens/DemoScreen"
import { SettingsScreen } from "~screens/SettingsScreen"
import MemoDialog from "~components/MemoDialog"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"
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

  useEffect(() => {
    initializeAndLoadData()
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
      setShowMemoDialog(true)
      return
    }

    // 複数ある場合は選択UIを表示
    handleNavigate('select-clipboard')
  }

  const handleSelectClipboard = async (databaseId: string) => {
    // メモダイアログを表示
    setPendingClipDatabaseId(databaseId)
    setShowMemoDialog(true)
  }

  const handleMemoConfirm = async (memo: string) => {
    setShowMemoDialog(false)
    if (pendingClipDatabaseId) {
      await performClip(pendingClipDatabaseId, memo)
      setPendingClipDatabaseId(undefined)
    }
  }

  const handleMemoCancel = () => {
    setShowMemoDialog(false)
    setPendingClipDatabaseId(undefined)
  }

  const performClip = async (databaseId: string, memo?: string) => {
    try {
      const tabInfo = await StorageService.getCurrentTabInfo()
      if (!tabInfo) {
        alert('ページ情報を取得できませんでした')
        return
      }

      // Backgroundにメッセージを送信してクリップを実行（tabIdとmemoを含む）
      const response = await chrome.runtime.sendMessage({
        type: 'clip-page',
        data: {
          title: tabInfo.title,
          url: tabInfo.url,
          databaseId,
          tabId: tabInfo.tabId, // Content Scriptからコンテンツを抽出するためのタブID
          memo: memo || undefined // メモがあれば含める
        }
      })

      if (response.success) {
        // 最終クリップ日時を更新
        const clipboard = await StorageService.getClipboardByDatabaseId(databaseId)
        if (clipboard) {
          await StorageService.updateClipboardLastClipped(clipboard.id)
        }

        alert('クリップしました！')
        window.close()
      } else {
        alert(`クリップに失敗しました: ${response.error}`)
      }
    } catch (error) {
      console.error('Clip error:', error)
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
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
        return <SettingsScreen onBack={() => handleNavigate('home')} />
      default:
        return <HomeScreen onNavigate={handleNavigate} onClipPage={handleClipPage} />
    }
  }

  return (
    <>
      {renderScreen()}
      {showMemoDialog && (
        <MemoDialog
          onConfirm={handleMemoConfirm}
          onCancel={handleMemoCancel}
        />
      )}
    </>
  )
}

export default IndexPopup
