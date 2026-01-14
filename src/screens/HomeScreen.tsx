import { type FC, useState, useEffect } from "react"
import { StorageService } from "~services/storage"
import { createNotionClient } from "~services/notion"
import type { Language, Clipboard } from "~types"
import { TooltipIcon } from "~components/TooltipIcon"

interface HomeScreenProps {
  onNavigate: (screen: string) => void
  onClipPage?: () => void
  onDisconnect?: () => void
  language: Language
  onToggleLanguage: () => void
  memo: string
  onMemoChange: (value: string) => void
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
  memoLabel: string
  memoPlaceholder: string
  clipButton: string
  disconnect: string
  listButton: string
  createButton: string
  checking: string
  connected: (name: string) => string
  disconnected: string
  destinationLabel: string
  destinationPlaceholder: string
  tagLabel: string
  addedTagsLabel: string
  tooltipDestination: string
  tooltipWorkspace: string
  tooltipTag: string
  tooltipListButton: string
  tooltipCreateButton: string
  oauthButtonIdle: string
  oauthButtonLoading: string
  successSaved: string
}> = {
  ja: {
    saving: '',
    memoLabel: 'メモ（任意）',
    memoPlaceholder: 'ページについてのメモを入力できます',
    clipButton: 'このページを保存',
    disconnect: '連携解除',
    listButton: '保存先一覧',
    createButton: '保存先を作成',
    checking: '接続状態を確認中...',
    connected: (name) => `接続中: ${name || 'Notionワークスペース'}`,
    disconnected: '設定からNotionに接続してください',
    destinationLabel: '保存先',
    destinationPlaceholder: '保存先を選択してください',
    tagLabel: 'タグ付与',
    addedTagsLabel: '付与タグ',
    tooltipDestination: 'ページの保存先となるNotionデータベースを選択します',
    tooltipWorkspace: 'Notion上のワークスペース（チームまたは個人アカウント）',
    tooltipTag: 'ページに追加するタグ。既存タグから選択、または新規作成できます',
    tooltipListButton: '登録済みの保存先一覧を表示します',
    tooltipCreateButton: 'Notion上に新しい保存先を作成します',
    oauthButtonIdle: 'Notionで認証して接続',
    oauthButtonLoading: '処理中...',
    successSaved: '設定を保存しました'
  },
  en: {
    saving: '',
    memoLabel: 'Memo (optional)',
    memoPlaceholder: 'Add a note about this page',
    clipButton: 'Save this page',
    disconnect: 'Disconnect',
    listButton: 'Destinations',
    createButton: 'Create destination',
    checking: 'Checking connection...',
    connected: (name) => `Connected: ${name || 'Notion workspace'}`,
    disconnected: 'Connect to Notion in Settings',
    destinationLabel: 'Destination',
    destinationPlaceholder: 'Select a destination',
    tagLabel: 'Add tags',
    addedTagsLabel: 'Tags to add',
    tooltipDestination: 'Select a Notion database where pages will be saved',
    tooltipWorkspace: 'A workspace in Notion (team or personal account)',
    tooltipTag: 'Tags to add to the page. Choose from existing tags or create new ones',
    tooltipListButton: 'View and manage your registered databases',
    tooltipCreateButton: 'Create a new destination database in Notion',
    oauthButtonIdle: 'Connect with Notion',
    oauthButtonLoading: 'Processing...',
    successSaved: 'Settings saved'
  }
}

const HomeScreen: FC<HomeScreenProps> = ({
  onNavigate,
  onClipPage,
  onDisconnect,
  language,
  onToggleLanguage,
  memo,
  onMemoChange,
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

  // 認証UI用のステート
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string>('')
  const [authSuccess, setAuthSuccess] = useState<string>('')
  const [oauthClientId, setOauthClientId] = useState<string>('')

  // OAuth設定を初期化
  useEffect(() => {
    const initOAuthConfig = async () => {
      const clientId = process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || ''
      setOauthClientId(clientId)
    }
    initOAuthConfig()
  }, [])

  useEffect(() => {
    checkConnection()

    // ストレージ変更を監視して、接続状態が変わったら再チェック
    const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      // OAuth完了を検出
      if (changes['raku-oauth-pending'] && changes['raku-oauth-pending'].oldValue && !changes['raku-oauth-pending'].newValue) {
        setTimeout(async () => {
          const config = await StorageService.getNotionConfig()
          if (config.authMethod === 'oauth' && config.accessToken) {
            checkConnection()
            setAuthSuccess(t.successSaved)
            setTimeout(() => setAuthSuccess(''), 3000)
          } else {
            checkConnection()
          }
        }, 500)
      } else {
        checkConnection()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [t])

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
      const hasAuth = config.authMethod === 'oauth' && config.accessToken

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

  const handleOAuthLogin = async () => {
    setAuthError('')
    setAuthSuccess('')

    try {
      if (!oauthClientId) {
        throw new Error('Notion Client ID is missing')
      }

      setIsAuthLoading(true)
      const redirectUri = process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'

      chrome.runtime.sendMessage(
        {
          type: 'start-oauth',
          data: {
            clientId: oauthClientId,
            redirectUri: redirectUri
          }
        },
        (response) => {
          console.log('[HomeScreen] OAuth start response:', response)
        }
      )

      setTimeout(() => {
        setIsAuthLoading(false)
      }, 100)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'OAuth認証に失敗しました')
      setIsAuthLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="header" style={{ position: 'relative', marginBottom: '8px', paddingBottom: '8px' }}>
        <h1 style={{ margin: 0 }}>Raku Raku Notion</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        marginBottom: '10px',
        backgroundColor: isConnected ? '#e8f4f8' : '#f5f5f5',
        borderRadius: '4px',
        border: `1px solid ${isConnected ? '#b3d9e8' : '#ddd'}`,
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {isCheckingConnection ? (
          <span style={{ color: '#666' }}>{t.checking}</span>
        ) : isConnected ? (
          <span>{t.connected(workspaceName)}</span>
        ) : (
          <span style={{ color: '#666' }}>{t.disconnected}</span>
        )}
        {isConnected && !isCheckingConnection && onDisconnect && (
          <button
            onClick={onDisconnect}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {t.disconnect}
          </button>
        )}
      </div>

      {/* 認証エラー・成功メッセージ */}
      {authError && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: '4px'
        }}>
          {authError}
        </div>
      )}

      {authSuccess && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#efe',
          color: '#0a0',
          borderRadius: '4px'
        }}>
          {authSuccess}
        </div>
      )}

      {/* 未接続時: 認証UI */}
      {!isConnected && !isCheckingConnection && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleOAuthLogin}
            disabled={isAuthLoading || !oauthClientId}
            className="button"
            style={{
              width: '100%',
              background: isAuthLoading || !oauthClientId ? undefined : '#0078d4',
              fontSize: '15px',
              fontWeight: '600',
              padding: '14px 16px'
            }}
          >
            {isAuthLoading ? t.oauthButtonLoading : t.oauthButtonIdle}
          </button>
          {!oauthClientId && (
            <div style={{
              padding: '12px',
              marginTop: '12px',
              backgroundColor: '#fff3cd',
              color: '#856404',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              ⚠️ {language === 'ja' ? 'OAuth設定が未構成です。開発者に連絡してください。' : 'OAuth is not configured. Please contact the developer.'}
            </div>
          )}
        </div>
      )}

      {/* 接続時のみ表示: 保存先ドロップダウン */}
      {isConnected && (
        <div style={{ marginBottom: '10px', textAlign: 'left' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
            {t.destinationLabel}
            <TooltipIcon text={t.tooltipDestination} style={{ marginLeft: 0 }} />
          </label>
          <select
            value={selectedClipboardId || ''}
            onChange={(e) => onSelectClipboardId(e.target.value)}
            disabled={clipboards.length === 0}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: clipboards.length === 0 ? '#f5f5f5' : 'white',
              cursor: clipboards.length === 0 ? 'not-allowed' : 'pointer'
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
      )}

      {/* 接続時のみ表示: タグ付与UI */}
      {isConnected && (
        <>
          <div style={{ marginBottom: '10px', textAlign: 'left' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
              {t.tagLabel}
              <TooltipIcon text={t.tooltipTag} style={{ marginLeft: 0 }} />
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
                  width: '120px',
                  padding: '6px',
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
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="タグ名を入力"
                disabled={pendingTag !== 'new'}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: pendingTag !== 'new' ? '#f5f5f5' : 'white',
                  color: pendingTag !== 'new' ? '#999' : 'inherit',
                  cursor: pendingTag !== 'new' ? 'not-allowed' : 'text'
                }}
              />
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
                    setPendingTag('')
                  }
                }}
                disabled={
                  pendingTag === '' ||
                  (pendingTag === 'new' && newTagName.trim().length === 0)
                }
                style={{
                  width: '54px',
                  padding: '8px 4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  backgroundColor: '#1976d2',
                  borderColor: '#1976d2',
                  color: 'white',
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
            <div style={{ marginBottom: '8px', textAlign: 'left' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#444' }}>{t.addedTagsLabel}:</span>{' '}
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
        </>
      )}
      {/* 接続時のみ表示: メモ入力と保存ボタン */}
      {isConnected && (
        <div style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '10px' }}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="button"
                onClick={onClipPage}
                style={{ flex: 1 }}
              >
                {t.clipButton}
              </button>
              <button
                className="button button-secondary"
                onClick={onClipNow}
                disabled={!onClipNow}
                style={{
                  flex: 1,
                  opacity: !onClipNow ? 0.6 : 1,
                  cursor: !onClipNow ? 'not-allowed' : 'pointer'
                }}
                title="現在の再生位置で保存"
              >
                今保存
              </button>
            </div>
          ) : (
            <button
              className="button"
              onClick={onClipPage}
            >
              {t.clipButton}
            </button>
          )}

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e9e9e7',
            display: 'flex',
            gap: '12px'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                className="button button-secondary"
                onClick={() => onNavigate('clipboard-list')}
                style={{ width: '100%' }}
              >
                {t.listButton}
              </button>
              <TooltipIcon
                text={t.tooltipListButton}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1
                }}
              />
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                className="button button-secondary"
                onClick={() => onNavigate('create-clipboard')}
                style={{ width: '100%' }}
              >
                {t.createButton}
              </button>
              <TooltipIcon
                text={t.tooltipCreateButton}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomeScreen
