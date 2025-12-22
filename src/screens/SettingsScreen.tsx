import React, { useState, useEffect } from 'react'
import type { NotionConfig, NotionOAuthConfig, UISimplifyConfig, Language } from '~types'
import { StorageService } from '~services/storage'
import { createNotionClient } from '~services/notion'

interface SettingsScreenProps {
  onBack: () => void
  language: Language
}

const translations: Record<Language, {
  back: string
  title: string
  checking: string
  connected: (name?: string) => string
  disconnected: string
  disconnect: string
  uiTitle: string
  uiDesc: string
  uiDisable: string
  uiEnable: string
  uiNote: string
  uiEnabledMsg: string
  uiDisabledMsg: string
  authMethod: string
  oauthLabel: string
  manualLabel: string
  authChangeNote: string
  oauthDesc: string
  oauthButtonIdle: string
  oauthButtonLoading: string
  oauthMissingWarning: string
  oauthMissingDetail: string
  manualTokenLabel: string
  manualPlaceholder: string
  manualNote: string
  manualButtonIdle: string
  manualButtonLoading: string
  successOAuthComplete: string
  successOAuthOpened: string
  successSaved: string
  successDisconnected: string
  errorOAuth: string
  errorSave: string
  errorDisconnect: string
  errorLoad: string
  errorMissingApiKey: string
  errorConnectFailed: string
}> = {
  ja: {
    back: '← 戻る',
    title: 'Notion設定',
    checking: '接続状態を確認中...',
    connected: (name) => `接続中: ${name || 'Notionワークスペース'}`,
    disconnected: '未接続',
    disconnect: '連携解除',
    uiTitle: 'Notion UI簡略化',
    uiDesc: 'Notionのサイドバーやツールバーの一部を非表示にします',
    uiDisable: '無効',
    uiEnable: '有効',
    uiNote: '※ 変更は即座に反映されます（ページの再読み込みは不要）',
    uiEnabledMsg: 'UI簡略化を有効にしました',
    uiDisabledMsg: 'UI簡略化を無効にしました',
    authMethod: '認証方法',
    oauthLabel: 'OAuth認証（推奨）',
    manualLabel: '手動トークン入力',
    authChangeNote: '※ 認証方法を変更すると、現在の接続が解除されます',
    oauthDesc: 'NotionのOAuth認証を使用してアクセス許可を付与します。\n保存先データベース作成時に自動的にデータベースを作成します。',
    oauthButtonIdle: 'Notionで認証して接続',
    oauthButtonLoading: '処理中...',
    oauthMissingWarning: '⚠️ OAuth設定が未構成です。開発者に連絡してください。',
    oauthMissingDetail: '（CLIENT_IDが設定されていません）',
    manualTokenLabel: 'Notion Integration Token *',
    manualPlaceholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    manualNote: 'Notion Integrationから作成できます。保存先データベース作成時に自動的にデータベースを作成します。',
    manualButtonIdle: 'トークンを保存して接続',
    manualButtonLoading: '接続テスト中...',
    successOAuthComplete: 'Notion認証が完了しました！',
    successOAuthOpened: 'Notion認証画面を開きました。認証を完了してください。',
    successSaved: '設定を保存しました',
    successDisconnected: 'Notion連携を解除しました',
    errorOAuth: 'OAuth認証に失敗しました',
    errorSave: '設定の保存に失敗しました',
    errorDisconnect: '連携解除に失敗しました',
    errorLoad: '設定の読み込みに失敗しました',
    errorMissingApiKey: 'APIキーを入力してください',
    errorConnectFailed: 'Notion APIへの接続に失敗しました。APIキーを確認してください。'
  },
  en: {
    back: '← Back',
    title: 'Notion Settings',
    checking: 'Checking connection...',
    connected: (name) => `Connected: ${name || 'Notion workspace'}`,
    disconnected: 'Disconnected',
    disconnect: 'Disconnect',
    uiTitle: 'Notion UI simplify',
    uiDesc: 'Hide parts of the Notion sidebar and toolbar.',
    uiDisable: 'Off',
    uiEnable: 'On',
    uiNote: 'Changes apply immediately (no reload needed).',
    uiEnabledMsg: 'UI simplify enabled',
    uiDisabledMsg: 'UI simplify disabled',
    authMethod: 'Authentication method',
    oauthLabel: 'OAuth (recommended)',
    manualLabel: 'Manual token input',
    authChangeNote: 'Changing the method will disconnect the current session.',
    oauthDesc: 'Use Notion OAuth to grant access.\nA destination database is created automatically when needed.',
    oauthButtonIdle: 'Connect with Notion',
    oauthButtonLoading: 'Processing...',
    oauthMissingWarning: '⚠️ OAuth is not configured. Please contact the developer.',
    oauthMissingDetail: '(CLIENT_ID is missing)',
    manualTokenLabel: 'Notion Integration Token *',
    manualPlaceholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    manualNote: 'Create it from Notion Integration. A database will be created automatically when needed.',
    manualButtonIdle: 'Save token and connect',
    manualButtonLoading: 'Testing connection...',
    successOAuthComplete: 'Notion authentication completed!',
    successOAuthOpened: 'Opened Notion auth window. Please finish authentication.',
    successSaved: 'Settings saved',
    successDisconnected: 'Disconnected from Notion',
    errorOAuth: 'OAuth authentication failed',
    errorSave: 'Failed to save settings',
    errorDisconnect: 'Failed to disconnect',
    errorLoad: 'Failed to load settings',
    errorMissingApiKey: 'Please enter your API key',
    errorConnectFailed: 'Failed to connect to Notion API. Please check your API key.'
  }
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, language }) => {
  const t = translations[language]
  const [authMethod, setAuthMethod] = useState<'manual' | 'oauth'>('oauth')
  const [apiKey, setApiKey] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [oauthConfig, setOauthConfig] = useState<NotionOAuthConfig>({
    clientId: '',
    redirectUri: 'https://raku-raku-notion.pages.dev/callback.html'
  })
  const [uiSimplifyEnabled, setUiSimplifyEnabled] = useState<boolean | null>(null)

  // OAuth設定を初期化
  useEffect(() => {
    const initOAuthConfig = async () => {
      const config: NotionOAuthConfig = {
        clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
        redirectUri: process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'
      }
      setOauthConfig(config)
    }
    initOAuthConfig()
  }, [])

  // 初期化: 既存の設定を読み込む
  useEffect(() => {
    loadConfig()

    const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['raku-oauth-pending'] && changes['raku-oauth-pending'].oldValue && !changes['raku-oauth-pending'].newValue) {
        setTimeout(async () => {
          const config = await StorageService.getNotionConfig()
          if (config.authMethod === 'oauth' && config.accessToken) {
            loadConfig()
            setSuccessMessage(t.successOAuthComplete)
          } else {
            loadConfig()
          }
        }, 500)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // 認証方式が変更された場合、接続状態をリセット
  useEffect(() => {
    const resetConnectionState = async () => {
      const config = await StorageService.getNotionConfig()
      if (config && config.authMethod !== authMethod) {
        setIsConnected(false)
        setApiKey('')
        setWorkspaceName('')
        setError('')
        setSuccessMessage('')
        await StorageService.saveNotionConfig({
          authMethod: authMethod,
          apiKey: undefined,
          accessToken: undefined,
          workspaceId: undefined,
          workspaceName: undefined,
          botId: undefined
        })
      }
    }
    resetConnectionState()
  }, [authMethod])

  const loadConfig = async () => {
    try {
      const storage = await chrome.storage.local.get(['raku-oauth-pending', 'raku-notion-config'])
      if (storage['raku-oauth-pending']) {
        await chrome.storage.local.remove('raku-oauth-pending')
      }

      const config = await StorageService.getNotionConfig()
      if (config) {
        setAuthMethod(config.authMethod || 'oauth')
        setApiKey(config.apiKey || '')
        setWorkspaceName(config.workspaceName || '')

        if ((config.authMethod === 'oauth' && config.accessToken) ||
          (config.authMethod === 'manual' && config.apiKey)) {
          await checkConnection(config)
        } else {
          setIsCheckingConnection(false)
        }
      } else {
        setIsCheckingConnection(false)
      }

      const uiSimplifyConfig = await StorageService.getUISimplifyConfig()
      setUiSimplifyEnabled(uiSimplifyConfig.enabled)
    } catch (err) {
      console.error('Failed to load config:', err)
      setError(t.errorLoad)
      setIsCheckingConnection(false)
    }
  }

  const checkConnection = async (config?: NotionConfig) => {
    try {
      setIsCheckingConnection(true)
      const currentConfig = config || await StorageService.getNotionConfig()
      const client = createNotionClient(currentConfig)
      const connected = await client.testConnection()
      setIsConnected(connected)
    } catch (err) {
      setIsConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const handleOAuthLogin = async () => {
    setError('')
    setSuccessMessage('')

    try {
      if (!oauthConfig.clientId) {
        throw new Error('Notion Client ID is missing')
      }

      setIsLoading(true)
      chrome.runtime.sendMessage(
        {
          type: 'start-oauth',
          data: oauthConfig
        },
        (response) => {
          console.log('[Settings] OAuth start response:', response)
        }
      )

      setTimeout(() => {
        setIsLoading(false)
        setSuccessMessage(t.successOAuthOpened)
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorOAuth)
      setIsLoading(false)
    }
  }

  const handleManualSave = async () => {
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      if (!apiKey.trim()) {
        throw new Error(t.errorMissingApiKey)
      }

      const config: NotionConfig = {
        authMethod: 'manual',
        apiKey: apiKey.trim()
      }

      const client = createNotionClient(config)
      const connected = await client.testConnection()

      if (!connected) {
        throw new Error(t.errorConnectFailed)
      }

      await StorageService.saveNotionConfig(config)
      setIsConnected(true)
      setSuccessMessage(t.successSaved)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorSave)
    } finally {
      setIsLoading(false)
    }
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
      setIsConnected(false)
      setApiKey('')
      setWorkspaceName('')
      setSuccessMessage(t.successDisconnected)
    } catch (err) {
      setError(t.errorDisconnect)
    }
  }

  const handleUISimplifyToggle = async (enabled: boolean) => {
    try {
      setUiSimplifyEnabled(enabled)
      await StorageService.saveUISimplifyConfig({ enabled })
      setSuccessMessage(enabled ? t.uiEnabledMsg : t.uiDisabledMsg)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(t.errorSave)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button onClick={onBack} className="back-button">
          {t.back}
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{t.title}</h2>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#efe',
          color: '#0a0',
          borderRadius: '4px'
        }}>
          {successMessage}
        </div>
      )}

      <div style={{
        padding: '12px',
        marginBottom: '16px',
        backgroundColor: isConnected ? '#e8f4f8' : '#f5f5f5',
        borderRadius: '4px',
        border: `1px solid ${isConnected ? '#b3d9e8' : '#ddd'}`,
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          {isCheckingConnection ? (
            <span style={{ color: '#666' }}>{t.checking}</span>
          ) : isConnected && workspaceName ? (
            <span>{t.connected(workspaceName)}</span>
          ) : isConnected ? (
            <span>{t.connected()}</span>
          ) : (
            <span style={{ color: '#666' }}>{t.disconnected}</span>
          )}
        </div>
        {isConnected && !isCheckingConnection && (
          <button
            onClick={handleDisconnect}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {t.disconnect}
          </button>
        )}
      </div>

      <div style={{ marginBottom: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
          {t.uiTitle}
        </h3>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          {t.uiDesc}
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={uiSimplifyEnabled === false}
              onChange={() => handleUISimplifyToggle(false)}
              disabled={uiSimplifyEnabled === null}
            />
            {t.uiDisable}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={uiSimplifyEnabled === true}
              onChange={() => handleUISimplifyToggle(true)}
              disabled={uiSimplifyEnabled === null}
            />
            {t.uiEnable}
          </label>
        </div>

        <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
          {t.uiNote}
        </small>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          {t.authMethod}
        </label>
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              value="oauth"
              checked={authMethod === 'oauth'}
              onChange={(e) => setAuthMethod(e.target.value as 'oauth')}
            />
            {t.oauthLabel}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              value="manual"
              checked={authMethod === 'manual'}
              onChange={(e) => setAuthMethod(e.target.value as 'manual')}
            />
            {t.manualLabel}
          </label>
        </div>
        {isConnected && (
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            {t.authChangeNote}
          </small>
        )}
      </div>

      {authMethod === 'oauth' ? (
        <div>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {t.oauthDesc.split('\n').map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                {idx === 0 && <br />}
              </React.Fragment>
            ))}
          </p>
          {!isConnected && (
            <>
              <button
                onClick={() => {
                  console.log('[Settings] OAuth button clicked:', {
                    isLoading,
                    hasClientId: !!oauthConfig.clientId,
                    clientId: oauthConfig.clientId ? `${oauthConfig.clientId.substring(0, 8)}...` : 'MISSING'
                  })
                  handleOAuthLogin()
                }}
                disabled={isLoading || !oauthConfig.clientId}
                className="button"
                style={{
                  width: '100%',
                  background: isLoading || !oauthConfig.clientId ? undefined : '#0078d4',
                  fontSize: '15px',
                  fontWeight: '600',
                  padding: '14px 16px'
                }}
              >
                {isLoading ? t.oauthButtonLoading : t.oauthButtonIdle}
              </button>
              {(!oauthConfig.clientId) && (
                <div style={{
                  padding: '12px',
                  marginTop: '12px',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  {t.oauthMissingWarning}<br />
                  <small>{t.oauthMissingDetail}</small>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {t.manualTokenLabel}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.manualPlaceholder}
              disabled={isLoading || isConnected}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <small style={{ color: '#666' }}>
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
              >
                Notion Integration
              </a>
              {language === 'ja'
                ? ' から作成できます。保存先データベース作成時に自動的にデータベースを作成します。'
                : ' provides the token. A database is created automatically when saving.'}
            </small>
          </div>

          {!isConnected && (
            <button
              onClick={handleManualSave}
              disabled={isLoading || !apiKey.trim()}
              className="button"
              style={{
                width: '100%',
                background: isLoading || !apiKey.trim() ? undefined : '#0078d4',
                fontSize: '15px',
                fontWeight: '600',
                padding: '14px 16px'
              }}
            >
              {isLoading ? t.manualButtonLoading : t.manualButtonIdle}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
