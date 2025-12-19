import { type FC, useState, useEffect } from "react"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"

interface HomeScreenProps {
  onNavigate: (screen: string) => void
  onClipPage?: () => void
}

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate, onClipPage }) => {
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
          <span style={{ color: '#666' }}>接続状態を確認中...</span>
        ) : isConnected ? (
          <span>
            <strong>接続中:</strong> {workspaceName || 'Notionワークスペース'}
          </span>
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
              設定からNotionに接続してください
            </button>
          </span>
        )}
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-text">
          ウェブページをNotionに簡単保存
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
          📎 このページを保存
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
            保存先データベース一覧を見る
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
            + 新しい保存先データベースを作成
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
