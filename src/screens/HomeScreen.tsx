import { type FC, useState, useEffect } from "react"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"
import type { Language, Clipboard } from "~types"

interface HomeScreenProps {
  onNavigate: (screen: string) => void
  onClipPage?: () => void
  language: Language
  onToggleLanguage: () => void
  memo: string
  onMemoChange: (value: string) => void
  onOpenTutorial: () => void
  clipboards: Clipboard[]
  selectedClipboardId?: string
  onSelectClipboardId: (id: string) => void
}

const translations: Record<Language, {
  saving: string
  tutorial: string
  memoLabel: string
  memoPlaceholder: string
  clipButton: string
  listButton: string
  createButton: string
  checking: string
  connected: (name: string) => string
  disconnected: string
  destinationLabel: string
  destinationPlaceholder: string
}> = {
  ja: {
    saving: 'ウェブページをNotionに簡単保存',
    tutorial: 'チュートリアル',
    memoLabel: 'メモ（任意）',
    memoPlaceholder: 'ページについてのメモを入力できます',
    clipButton: '📎 このページを保存',
    listButton: '保存先データベース一覧を見る',
    createButton: '+ 新しい保存先データベースを作成',
    checking: '接続状態を確認中...',
    connected: (name) => `接続中: ${name || 'Notionワークスペース'}`,
    disconnected: '設定からNotionに接続してください',
    destinationLabel: '保存先',
    destinationPlaceholder: '保存先を選択してください'
  },
  en: {
    saving: 'Save web pages to Notion easily',
    tutorial: 'Tutorial',
    memoLabel: 'Memo (optional)',
    memoPlaceholder: 'Add a note about this page',
    clipButton: '📎 Save this page',
    listButton: 'View destination databases',
    createButton: '+ Create a new destination database',
    checking: 'Checking connection...',
    connected: (name) => `Connected: ${name || 'Notion workspace'}`,
    disconnected: 'Connect to Notion in Settings',
    destinationLabel: 'Destination',
    destinationPlaceholder: 'Select a destination'
  }
}

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate, onClipPage, language, onToggleLanguage, memo, onMemoChange, onOpenTutorial, clipboards, selectedClipboardId, onSelectClipboardId }) => {
  const t = translations[language]
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true)

  useEffect(() => {
    checkConnection()

    // ストレージ変更を監視して、接続状態が変わったら再チェック
    const handleStorageChange = () => {
      checkConnection()
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const checkConnection = async () => {
    setIsCheckingConnection(true)
    try {
      const config = await StorageService.getNotionConfig()

      if (!config) {
        setIsConnected(false)
        setWorkspaceName('')
        return
      }

      // 保存されているワークスペース名を使用
      if (config.workspaceName) {
        setWorkspaceName(config.workspaceName)
      }

      // 認証情報が存在するかチェック
      const hasAuth = (config.authMethod === 'oauth' && config.accessToken) ||
                     (config.authMethod === 'manual' && config.apiKey)

      if (hasAuth) {
        // 接続テスト
        const client = createNotionClient(config)
        const connected = await client.testConnection()
        setIsConnected(connected)
      } else {
        setIsConnected(false)
        setWorkspaceName('')
      }
    } catch (err) {
      console.error('Connection check failed:', err)
      setIsConnected(false)
      setWorkspaceName('')
    } finally {
      setIsCheckingConnection(false)
    }
  }

  return (
    <div className="container">
      <div className="header" style={{ position: 'relative' }}>
        <h1>Raku Raku Notion</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenTutorial}
            style={{
              background: 'transparent',
              border: '1px solid #ddd',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              color: '#666'
            }}
          >
            {t.tutorial}
          </button>
          <button
            onClick={onToggleLanguage}
            style={{
              background: 'transparent',
              border: '1px solid #ddd',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              color: '#666'
            }}
            title={language === 'ja' ? '日本語表示中' : 'English display'}
          >
            {language === 'ja' ? '日本語' : 'English'}
          </button>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
            title="設定"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* 接続状態ボックス */}
      <div style={{
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: isConnected ? '#e8f4f8' : '#f5f5f5',
        borderRadius: '4px',
        border: `1px solid ${isConnected ? '#b3d9e8' : '#ddd'}`,
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center'
      }}>
        {isCheckingConnection ? (
          <span style={{ color: '#666' }}>{t.checking}</span>
        ) : isConnected ? (
          <span>{t.connected(workspaceName)}</span>
        ) : (
          <span style={{ color: '#666' }}>
            未接続 - <button
              onClick={() => onNavigate('settings')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0078d4',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                fontSize: 'inherit'
              }}
            >
              {t.disconnected}
            </button>
          </span>
        )}
      </div>

      {/* 保存先ドロップダウン（幅を半分にして右寄せ） */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '50%', minWidth: '220px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
            {t.destinationLabel}
          </label>
          <select
            value={selectedClipboardId || ''}
            onChange={(e) => onSelectClipboardId(e.target.value)}
            disabled={!isConnected || clipboards.length === 0}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: !isConnected || clipboards.length === 0 ? '#f5f5f5' : 'white',
              cursor: !isConnected || clipboards.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="" disabled>{t.destinationPlaceholder}</option>
            {clipboards.map(cb => (
              <option key={cb.id} value={cb.notionDatabaseId}>
                {cb.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="empty-state" style={{ alignItems: 'stretch' }}>
        <div className="empty-state-text" style={{ textAlign: 'left' }}>
          {t.saving}
        </div>

        <div style={{ marginTop: '12px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
            {t.memoLabel}
          </label>
          <textarea
            value={memo}
            onChange={(e) => onMemoChange(e.target.value)}
            placeholder={t.memoPlaceholder}
            style={{
              width: '100%',
              minHeight: '80px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          className="button"
          onClick={onClipPage}
          disabled={!isConnected}
          style={{
            marginTop: '12px',
            opacity: !isConnected ? 0.5 : 1,
            cursor: !isConnected ? 'not-allowed' : 'pointer'
          }}
          title={!isConnected ? 'Notionに接続してください' : ''}
        >
          {t.clipButton}
        </button>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e9e9e7'
        }}>
          <button
            className="button button-secondary"
            onClick={() => onNavigate('clipboard-list')}
            disabled={!isConnected}
            style={{
              opacity: !isConnected ? 0.5 : 1,
              cursor: !isConnected ? 'not-allowed' : 'pointer'
            }}
            title={!isConnected ? 'Notionに接続してください' : ''}
          >
            {t.listButton}
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigate('create-clipboard')}
            disabled={!isConnected}
            style={{
              marginTop: '12px',
              opacity: !isConnected ? 0.5 : 1,
              cursor: !isConnected ? 'not-allowed' : 'pointer'
            }}
            title={!isConnected ? 'Notionに接続してください' : ''}
          >
            {t.createButton}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
