import { type FC, useState, useEffect } from "react"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"
import type { Language } from "~types"

interface HomeScreenProps {
  onNavigate: (screen: string) => void
  onClipPage?: () => void
  language: Language
  onToggleLanguage: () => void
}

const translations: Record<Language, {
  saving: string
  clipButton: string
  listButton: string
  createButton: string
  checking: string
  connected: (name: string) => string
  disconnected: string
}> = {
  ja: {
    saving: 'ウェブページをNotionに簡単保存',
    clipButton: '📎 このページを保存',
    listButton: '保存先データベース一覧を見る',
    createButton: '+ 新しい保存先データベースを作成',
    checking: '接続状態を確認中...',
    connected: (name) => `接続中: ${name || 'Notionワークスペース'}`,
    disconnected: '設定からNotionに接続してください'
  },
  en: {
    saving: 'Save web pages to Notion easily',
    clipButton: '📎 Save this page',
    listButton: 'View destination databases',
    createButton: '+ Create a new destination database',
    checking: 'Checking connection...',
    connected: (name) => `Connected: ${name || 'Notion workspace'}`,
    disconnected: 'Connect to Notion in Settings'
  }
}

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate, onClipPage, language, onToggleLanguage }) => {
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
      <div className="header">
        <h1>Raku Raku Notion</h1>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
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

      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-text">
          {t.saving}
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
          <button
            className="button button-secondary"
            onClick={onToggleLanguage}
            style={{ marginTop: '12px' }}
          >
            {language === 'ja' ? 'English' : '日本語'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
