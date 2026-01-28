import { type FC, useState, useEffect } from "react"
import { StorageService } from "~services/storage"
// import { createNotionClient } from "~services/notion"  // Background経由に移行したため不要
import type { Language, Clipboard, ClipResult } from "~types"
import { TooltipIcon } from "~components/TooltipIcon"
import { MultiSelectTagDropdown } from "~components/MultiSelectTagDropdown"

interface HomeScreenProps {
  onClipPage?: () => void
  onClipNow?: () => void
  onDisconnect?: () => void
  onCreateClipboard?: (name: string) => Promise<void> | void
  isYouTubeTab?: boolean
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
  lastClipResult?: ClipResult | null
  onClearClipResult?: () => void
}

const translations: Record<Language, {
  saving: string
  memoLabel: string
  memoPlaceholder: string
  clipButton: string
  clipNowButton: string
  disconnect: string
  createButton: string
  createButtonLoading: string
  newDestinationOption: string
  checking: string
  connected: (name: string) => string
  destinationLabel: string
  destinationPlaceholder: string
  destinationNamePlaceholder: string
  tagLabel: string
  addedTagsLabel: string
  tagPlaceholder: string
  tagNewOption: string
  tagNamePlaceholder: string
  tagAddButton: string
  tooltipDestination: string
  tooltipWorkspace: string
  tooltipTag: string
  tooltipCreateButton: string
  oauthButtonIdle: string
  oauthButtonLoading: string
  successSaved: string
  uiSimplifyLabel: string
  tooltipUISimplify: string
  authGuideTitle: string
  authGuideStep1: string
  authGuideStep1Desc: string
  authGuideStep2: string
  authGuideStep2Desc: string
  authGuideNote: string
  clipSuccess: string
  clipFailed: string
  viewInNotion: string
}> = {
  ja: {
    saving: '',
    memoLabel: 'メモ（任意）',
    memoPlaceholder: 'ページについてのメモを入力できます',
    clipButton: 'このページを保存',
    clipNowButton: '再生時間情報も保存',
    disconnect: '連携解除',
    createButton: '作成',
    createButtonLoading: '作成中...',
    newDestinationOption: '新規保存先',
    checking: '接続状態を確認中...',
    connected: (name) => `接続中: ${name || 'Notionワークスペース'}`,
    destinationLabel: '保存先',
    destinationPlaceholder: '保存先を選択してください',
    destinationNamePlaceholder: '新規保存先を入力',
    tagLabel: 'タグ（任意）',
    addedTagsLabel: '付与タグ',
    tagPlaceholder: '付与するタグを選択してください',
    tagNewOption: '新規タグ',
    tagNamePlaceholder: '新規タグを入力',
    tagAddButton: '付与',
    tooltipDestination: 'ページの保存先となるNotionデータベースを選択します',
    tooltipWorkspace: 'Notion上のワークスペース（チームまたは個人アカウント）',
    tooltipTag: 'ページに追加するタグ。既存タグから選択、または新規作成できます',
    tooltipCreateButton: 'Notion上に新しい保存先を作成します',
    oauthButtonIdle: 'Notionで認証して接続',
    oauthButtonLoading: '処理中...',
    successSaved: '設定を保存しました',
    uiSimplifyLabel: 'Notion UI簡略化',
    tooltipUISimplify: 'Notion.so上でサイドバーやツールバーを非表示にし、シンプルな表示にします',
    authGuideTitle: '認証画面での操作手順',
    authGuideStep1: '1. 「ページを選択する」ボタンを押す',
    authGuideStep1Desc: '注意事項を読んでから「ページを選択する」ボタンをクリックしてください。',
    authGuideStep2: '2. 何も選択せず「アクセスを許可する」',
    authGuideStep2Desc: '公開/非公開ページともに、何も選択せずに「アクセスを許可する」ボタンを押せばOKです。',
    authGuideNote: '※ データベースへのアクセス権限は、保存先作成時に個別に付与されます。',
    clipSuccess: 'クリップ成功！',
    clipFailed: 'クリップ失敗',
    viewInNotion: 'Notionで確認する'
  },
  en: {
    saving: '',
    memoLabel: 'Memo (optional)',
    memoPlaceholder: 'Add a note about this page',
    clipButton: 'Save this page',
    clipNowButton: 'Save with\nplayback time',
    disconnect: 'Disconnect',
    createButton: 'Create',
    createButtonLoading: 'Creating...',
    newDestinationOption: 'New destination',
    checking: 'Checking connection...',
    connected: (name) => `Connected: ${name || 'Notion workspace'}`,
    destinationLabel: 'Destination',
    destinationPlaceholder: 'Select a destination',
    destinationNamePlaceholder: 'Enter new destination',
    tagLabel: 'Tags (optional)',
    addedTagsLabel: 'Tags to add',
    tagPlaceholder: 'Select tags to add',
    tagNewOption: 'New tag',
    tagNamePlaceholder: 'Enter new tag',
    tagAddButton: 'Add',
    tooltipDestination: 'Select a Notion database where pages will be saved',
    tooltipWorkspace: 'A workspace in Notion (team or personal account)',
    tooltipTag: 'Tags to add to the page. Choose from existing tags or create new ones',
    tooltipCreateButton: 'Create a new destination database in Notion',
    oauthButtonIdle: 'Connect with Notion',
    oauthButtonLoading: 'Processing...',
    successSaved: 'Settings saved',
    uiSimplifyLabel: 'Notion UI simplify',
    tooltipUISimplify: 'Hide sidebar and toolbar on Notion.so for a cleaner display',
    authGuideTitle: 'Steps on the auth screen',
    authGuideStep1: '1. Click "Select pages"',
    authGuideStep1Desc: 'Read the notice and then click the "Select pages" button.',
    authGuideStep2: '2. Click "Allow access" without selecting',
    authGuideStep2Desc: 'For both public and private pages, just click "Allow access" without selecting any pages.',
    authGuideNote: '* Database access permissions will be granted individually when creating a destination.',
    clipSuccess: 'Clipped successfully!',
    clipFailed: 'Clip failed',
    viewInNotion: 'View in Notion'
  }
}

const HomeScreen: FC<HomeScreenProps> = ({
  onClipPage,
  onClipNow,
  onDisconnect,
  onCreateClipboard,
  isYouTubeTab = false,
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
  lastClipResult,
  onClearClipResult
}) => {
  const t = translations[language]
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(true)
  const [uiSimplifyEnabled, setUiSimplifyEnabled] = useState<boolean | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false)
  const [hasLoadedLayout, setHasLoadedLayout] = useState<boolean>(false)
  const [newClipboardName, setNewClipboardName] = useState<string>('')
  const [isCreatingClipboard, setIsCreatingClipboard] = useState<boolean>(false)

  // 認証UI用のステート
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string>('')
  const [authSuccess, setAuthSuccess] = useState<string>('')
  const [oauthClientId, setOauthClientId] = useState<string>('')

  // 成功メッセージの自動非表示
  useEffect(() => {
    if (lastClipResult?.success && onClearClipResult) {
      const timer = setTimeout(() => {
        onClearClipResult()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [lastClipResult, onClearClipResult])

  useEffect(() => {
    const loadLayout = async () => {
      const config = await StorageService.getHomeLayoutConfig()
      setIsDetailsExpanded(config.headerExpanded) // 既存の設定を流用
      setHasLoadedLayout(true)
    }
    loadLayout()
  }, [])

  useEffect(() => {
    if (!hasLoadedLayout) {
      return
    }
    StorageService.saveHomeLayoutConfig({
      headerExpanded: isDetailsExpanded,
      footerExpanded: isDetailsExpanded,
      tagExpanded: isDetailsExpanded,
      memoExpanded: isDetailsExpanded
    })
  }, [
    hasLoadedLayout,
    isDetailsExpanded
  ])

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
    loadUISimplify()

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

  const loadUISimplify = async () => {
    const config = await StorageService.getUISimplifyConfig()
    setUiSimplifyEnabled(config.enabled)
  }

  const handleUISimplifyToggle = async (enabled: boolean) => {
    setUiSimplifyEnabled(enabled)
    await StorageService.saveUISimplifyConfig({ enabled })
  }

  const isNewSelection = selectedClipboardId === '__new__'

  const handleCreateNewClipboard = async () => {
    const name = newClipboardName.trim()
    if (!name || !onCreateClipboard || isCreatingClipboard) return
    setIsCreatingClipboard(true)
    try {
      await onCreateClipboard(name)
      setNewClipboardName('')
      onSelectClipboardId('')
    } catch (err) {
      console.error('Failed to create clipboard:', err)
    } finally {
      setIsCreatingClipboard(false)
    }
  }

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
        // 接続テスト（Background経由）
        const response = await chrome.runtime.sendMessage({
          type: 'test-notion-connection'
        })
        const connected = response?.success && response?.connected
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
      {/* ヘッダー: 常に表示 */}
      <div className="header" style={{ position: 'relative', marginBottom: '12px' }}>
        <h1 style={{ margin: 0 }}>Raku Raku Notion</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label className="toggle-switch" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!uiSimplifyEnabled}
                  onChange={(e) => handleUISimplifyToggle(e.target.checked)}
                  disabled={uiSimplifyEnabled === null}
                />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-thumb" />
                </span>
              </label>
              <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                {t.uiSimplifyLabel}
              </span>
              <TooltipIcon text={t.tooltipUISimplify} style={{ marginLeft: 0 }} />
            </div>
          )}
        </div>
      </div>

      {/* 接続状態ボックス */}
      {(isCheckingConnection || isConnected) && (
        <div style={{
          padding: '12px',
          backgroundColor: isConnected ? '#ffe6e6' : '#f5f5f5',
          borderRadius: '4px',
          border: `1px solid ${isConnected ? '#f5caca' : '#ddd'}`,
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isCheckingConnection ? (
              <span style={{ color: '#666' }}>{t.checking}</span>
            ) : (
              <span>{t.connected(workspaceName)}</span>
            )}
          </div>
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
      )}

      {/* クリップ成功/失敗メッセージ */}
      {lastClipResult && (
        <div style={{
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: lastClipResult.success ? '#e8f5e9' : '#ffebee',
          borderRadius: '4px',
          border: `1px solid ${lastClipResult.success ? '#c8e6c9' : '#ffcdd2'}`,
          position: 'relative'
        }}>
          <button
            onClick={onClearClipResult}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              width: '20px',
              height: '20px',
              lineHeight: '1'
            }}
            aria-label="閉じる"
          >
            ×
          </button>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: lastClipResult.success ? '#2e7d32' : '#c62828'
          }}>
            {lastClipResult.success ? (
              <>
                ✓ {t.clipSuccess}{' '}
                {lastClipResult.pageUrl && (
                  <a
                    href={lastClipResult.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1976d2',
                      textDecoration: 'none'
                    }}
                  >
                    {t.viewInNotion}
                  </a>
                )}
              </>
            ) : (
              `✗ ${t.clipFailed}`
            )}
          </div>
          {!lastClipResult.success && lastClipResult.error && (
            <div style={{
              fontSize: '12px',
              color: '#c62828',
              marginTop: '4px'
            }}>
              {lastClipResult.error}
            </div>
          )}
        </div>
      )}

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
          {/* 認証ガイド */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
              color: '#333'
            }}>
              {t.authGuideTitle}
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <p style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '4px',
                color: '#333'
              }}>
                {t.authGuideStep1}
              </p>
              <p style={{
                fontSize: '12px',
                color: '#666',
                margin: 0,
                lineHeight: '1.4'
              }}>
                {t.authGuideStep1Desc}
              </p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '4px',
                color: '#333'
              }}>
                {t.authGuideStep2}
              </p>
              <p style={{
                fontSize: '12px',
                color: '#666',
                margin: 0,
                lineHeight: '1.4'
              }}>
                {t.authGuideStep2Desc}
              </p>
            </div>
            <p style={{
              fontSize: '11px',
              color: '#888',
              margin: 0,
              fontStyle: 'italic'
            }}>
              {t.authGuideNote}
            </p>
          </div>

          <button
            onClick={handleOAuthLogin}
            disabled={isAuthLoading || !oauthClientId}
            className="button"
            style={{
              width: '100%',
              background: isAuthLoading || !oauthClientId ? undefined : '#e08080',
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
              {language === 'ja' ? 'OAuth設定が未構成です。開発者に連絡してください。' : 'OAuth is not configured. Please contact the developer.'}
            </div>
          )}
        </div>
      )}

      {/* 接続時のみ表示: 保存先（常時表示） */}
      {isConnected && (
        <div style={{ marginBottom: '10px', textAlign: 'left' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
            {t.destinationLabel}
            <TooltipIcon text={t.tooltipDestination} style={{ marginLeft: 0 }} />
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedClipboardId || '__new__'}
              onChange={(e) => onSelectClipboardId(e.target.value)}
              style={{
                flex: '0 1 42%',
                minWidth: 0,
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="__new__">{t.newDestinationOption}</option>
              {clipboards.map(cb => (
                <option key={cb.id} value={cb.notionPageId}>
                  {cb.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newClipboardName}
              onChange={(e) => setNewClipboardName(e.target.value)}
              placeholder={t.destinationNamePlaceholder}
              disabled={!isNewSelection}
              style={{
                flex: '1 1 44%',
                minWidth: 0,
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: !isNewSelection ? '#f5f5f5' : 'white',
                color: !isNewSelection ? '#999' : 'inherit',
                cursor: !isNewSelection ? 'not-allowed' : 'text'
              }}
            />
            <button
              className="button button-secondary"
              onClick={handleCreateNewClipboard}
              disabled={!onCreateClipboard || !isNewSelection || !newClipboardName.trim() || isCreatingClipboard}
              style={{
                width: '56px',
                padding: '8px 4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                backgroundColor: '#e08080',
                borderColor: '#e08080',
                color: 'white',
                opacity: !onCreateClipboard || !isNewSelection || !newClipboardName.trim() || isCreatingClipboard ? 0.6 : 1,
                cursor: !onCreateClipboard || !isNewSelection || !newClipboardName.trim() || isCreatingClipboard ? 'not-allowed' : 'pointer'
              }}
            >
              {isCreatingClipboard ? t.createButtonLoading : t.createButton}
            </button>
          </div>
        </div>
      )}

      {/* 接続時のみ表示: 詳細設定（タグ、メモ） */}
      {isConnected && (
        <div
          style={{
            marginBottom: '8px',
            textAlign: 'left',
            border: isDetailsExpanded ? '1px solid #e9e9e7' : 'none',
            borderRadius: '8px',
            padding: isDetailsExpanded ? '10px' : '0'
          }}
        >
          {!isDetailsExpanded && (
            <div style={{ marginBottom: '4px' }}>
              <button
                type="button"
                onClick={() => setIsDetailsExpanded(true)}
                className="accordion-toggle"
                aria-expanded={false}
              >
                <span className="accordion-icon">▶</span>
                <span>{language === 'ja' ? '詳細を表示' : 'Show details'}</span>
              </button>
            </div>
          )}

          {isDetailsExpanded && (
            <>
              {/* 折りたたみボタン */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsDetailsExpanded(false)}
                  className="accordion-toggle"
                  aria-expanded={true}
                >
                  <span className="accordion-icon">▼</span>
                  <span>{language === 'ja' ? '詳細を非表示' : 'Hide details'}</span>
                </button>
              </div>

              {/* タグ */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
                  {t.tagLabel}
                  <TooltipIcon text={t.tooltipTag} style={{ marginLeft: 0 }} />
                </label>
                {/* 付与予定のタグ表示 */}
                {selectedTags.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          marginRight: '4px',
                          marginBottom: '4px',
                          background: '#fbe3e3',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#6a4a4a'
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
                <MultiSelectTagDropdown
                  existingTags={existingTags}
                  selectedTags={selectedTags}
                  onToggleTag={(tag) => {
                    if (selectedTags.includes(tag)) {
                      onRemoveTag(tag)
                    } else {
                      onAddTag(tag)
                    }
                  }}
                  onAddNewTag={onAddTag}
                  language={language}
                />
              </div>

              {/* メモ */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#444', fontSize: '13px', fontWeight: 600 }}>
                  {t.memoLabel}
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => onMemoChange(e.target.value)}
                  placeholder={t.memoPlaceholder}
                  style={{
                    width: '100%',
                    minHeight: '64px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
      {/* 接続時のみ表示: 保存ボタン */}
      {isConnected && (
        <div style={{ textAlign: 'left' }}>
          {isYouTubeTab ? (
            <button
              className="button"
              onClick={onClipNow || onClipPage}
              disabled={!onClipNow || isNewSelection}
              style={{
                opacity: !onClipNow || isNewSelection ? 0.6 : 1,
                cursor: !onClipNow || isNewSelection ? 'not-allowed' : 'pointer'
              }}
              title="現在の再生位置で保存"
            >
              {t.clipButton}
            </button>
          ) : (
            <button
              className="button"
              onClick={onClipPage}
              disabled={isNewSelection}
              style={{
                opacity: isNewSelection ? 0.6 : 1,
                cursor: isNewSelection ? 'not-allowed' : 'pointer'
              }}
            >
              {t.clipButton}
            </button>
          )}

          {/* フッター: 常に表示 */}
          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e9e9e7'
          }}>
            <button
              onClick={onToggleLanguage}
              className="button button-secondary"
              style={{
                width: '100%',
                fontSize: '12px'
              }}
              title={language === 'ja' ? 'English display' : '日本語表示'}
            >
              {language === 'ja' ? 'English' : '日本語'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomeScreen
