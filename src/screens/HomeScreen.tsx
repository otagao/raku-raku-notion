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
  selectedTags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  existingTags?: string[]
  isYouTubeTab?: boolean
  onClipNow?: () => void
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
    listButton: '保存先一覧',
    createButton: '保存先を作成',
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
    listButton: 'Destinations',
    createButton: 'Create destination',
    checking: 'Checking connection...',
    connected: (name) => `Connected: ${name || 'Notion workspace'}`,
    disconnected: 'Connect to Notion in Settings',
    destinationLabel: 'Destination',
    destinationPlaceholder: 'Select a destination'
  }
}

const HomeScreen: FC<HomeScreenProps> = ({
  onNavigate,
  onClipPage,
  language,
  onToggleLanguage,
  memo,
  onMemoChange,
  onOpenTutorial,
  clipboards,
  selectedClipboardId,
  onSelectClipboardId,
  selectedTags,
  onAddTag,
  onRemoveTag,
  existingTags = [],
  isYouTubeTab = false,
  onClipNow
}) => {
  const t = translations[language]
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true)
  const [pendingTag, setPendingTag] = useState<string>('') // 未選択スタート
  const [newTagName, setNewTagName] = useState<string>('') // 新規タグ名

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

      {/* 保存先ドロップダウン */}
      <div style={{ marginBottom: '12px', textAlign: 'left' }}>
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

      {/* タグ付与UI */}
      <div style={{ marginBottom: '2px', textAlign: 'left' }}>
        <label style={{ display: 'block', marginBottom: '6px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
          タグ付与
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={pendingTag}
            onChange={(e) => {
              setPendingTag(e.target.value)
              if (e.target.value !== 'new') {
                setNewTagName('')
              }
            }}
            style={{
              width: '40%',
              minWidth: '100px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">（選択なし）</option>
            <option value="new">新規タグ</option>
            {existingTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          {pendingTag === 'new' && (
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="タグ名を入力"
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          )}
          <button
            className="button button-secondary"
            onClick={() => {
              if (pendingTag === 'new') {
                const trimmed = newTagName.trim()
                if (trimmed) {
                  onAddTag(trimmed)
                  setNewTagName('')
                  setPendingTag('')
                }
              } else if (pendingTag !== '') {
                onAddTag(pendingTag)
              }
            }}
            disabled={
              pendingTag === '' ||
              (pendingTag === 'new' && newTagName.trim().length === 0)
            }
            style={{
              padding: '8px 12px',
              whiteSpace: 'nowrap',
              opacity:
                pendingTag === '' ||
                (pendingTag === 'new' && newTagName.trim().length === 0)
                  ? 0.6
                  : 1,
              cursor:
                pendingTag === '' ||
                (pendingTag === 'new' && newTagName.trim().length === 0)
                  ? 'not-allowed'
                  : 'pointer'
            }}
          >
            付与
          </button>
        </div>
      </div>

      {/* 付与予定のタグ表示 */}
      {selectedTags.length > 0 && (
        <div style={{ marginBottom: '4px', textAlign: 'left' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#444' }}>付与タグ:</span>{' '}
          {selectedTags.map((tag, idx) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                marginLeft: idx === 0 ? 8 : 4,
                background: '#eef4ff',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#334'
              }}
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#556',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '12px',
                  lineHeight: 1
                }}
                aria-label={`${tag} を除外`}
                title="削除"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="empty-state" style={{ alignItems: 'stretch' }}>
        <div style={{ marginTop: selectedTags.length > 0 ? '4px' : '0px', textAlign: 'left' }}>
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

        {isYouTubeTab ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              className="button"
              onClick={onClipPage}
              disabled={!isConnected}
              style={{
                flex: 1,
                opacity: !isConnected ? 0.5 : 1,
                cursor: !isConnected ? 'not-allowed' : 'pointer'
              }}
              title={!isConnected ? 'Notionに接続してください' : ''}
            >
              {t.clipButton}
            </button>
            <button
              className="button button-secondary"
              onClick={onClipNow}
              disabled={!isConnected || !onClipNow}
              style={{
                flex: 1,
                opacity: !isConnected || !onClipNow ? 0.6 : 1,
                cursor: !isConnected || !onClipNow ? 'not-allowed' : 'pointer'
              }}
              title={!isConnected ? 'Notionに接続してください' : '現在の再生位置で保存'}
            >
              今保存
            </button>
          </div>
        ) : (
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
        )}

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e9e9e7'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button button-secondary"
              onClick={() => onNavigate('clipboard-list')}
              disabled={!isConnected}
              style={{
                flex: 1,
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
                flex: 1,
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
    </div>
  )
}

export default HomeScreen
