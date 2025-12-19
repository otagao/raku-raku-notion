import React, { useState, useEffect } from 'react'
import type { NotionConfig, NotionOAuthConfig, UISimplifyConfig } from '~types'
import { StorageService } from '~services/storage'
import { createNotionClient } from '~services/notion'

interface SettingsScreenProps {
  onBack: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
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
      // 環境変数から取得
      const config: NotionOAuthConfig = {
        clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
        redirectUri: process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'
      }

      console.log('[Settings] OAuth Config Debug:', {
        clientId: config.clientId ? `${config.clientId.substring(0, 8)}...` : 'MISSING',
        redirectUri: config.redirectUri
      })

      setOauthConfig(config)
    }

    initOAuthConfig()
  }, [])

  // 初期化: 既存の設定を読み込む
  useEffect(() => {
    loadConfig()

    // OAuth完了を監視（storage変更イベント）
    const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      // OAuth完了フラグが削除された場合、認証が完了した可能性がある
      if (changes['raku-oauth-pending'] && changes['raku-oauth-pending'].oldValue && !changes['raku-oauth-pending'].newValue) {
        console.log('[Settings] OAuth pending flag removed, checking if successful...')

        // 設定を再読み込みして、accessTokenが設定されているか確認
        setTimeout(async () => {
          const config = await StorageService.getNotionConfig()

          if (config.authMethod === 'oauth' && config.accessToken) {
            console.log('[Settings] OAuth completed successfully!')
            loadConfig()
            setSuccessMessage('Notion認証が完了しました！')
          } else {
            console.log('[Settings] OAuth pending removed but no token found (may have failed)')
            loadConfig()
          }
        }, 500)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // 認証方式が変更された場合、接続状態をリセット
  useEffect(() => {
    const resetConnectionState = async () => {
      const config = await StorageService.getNotionConfig()

      // 保存されている認証方式と現在選択されている認証方式が異なる場合、リセット
      if (config && config.authMethod !== authMethod) {
        setIsConnected(false)
        setApiKey('')
        setWorkspaceName('')
        setError('')
        setSuccessMessage('')

        // ストレージの設定もリセット（新しい認証方式に切り替え）
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
      // デバッグ: ストレージの状態を確認
      const storage = await chrome.storage.local.get(['raku-oauth-pending', 'raku-notion-config'])
      console.log('[Settings] Storage Debug:', {
        oauthPending: storage['raku-oauth-pending'],
        configExists: !!storage['raku-notion-config']
      })

      // OAuth処理中フラグが残っている場合は削除
      if (storage['raku-oauth-pending']) {
        console.log('[Settings] WARNING: OAuth pending flag is stuck. Clearing it...')
        await chrome.storage.local.remove('raku-oauth-pending')
      }

      const config = await StorageService.getNotionConfig()
      if (config) {
        setAuthMethod(config.authMethod || 'oauth')
        setApiKey(config.apiKey || '')
        setWorkspaceName(config.workspaceName || '')

        // 接続状態を確認
        if ((config.authMethod === 'oauth' && config.accessToken) ||
          (config.authMethod === 'manual' && config.apiKey)) {
          await checkConnection(config)
        } else {
          // 認証情報がない場合は確認完了状態にする
          setIsCheckingConnection(false)
        }
      } else {
        // 設定がない場合も確認完了状態にする
        setIsCheckingConnection(false)
      }

      // UI簡略化設定の読み込み
      const uiSimplifyConfig = await StorageService.getUISimplifyConfig()
      setUiSimplifyEnabled(uiSimplifyConfig.enabled)
    } catch (err) {
      console.error('Failed to load config:', err)
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
        throw new Error('Notion Client IDが設定されていません')
      }

      // OAuth処理中フラグをセット（バックグラウンドでも設定されるが、UIの即座の反映のため）
      setIsLoading(true)

      // バックグラウンドスクリプトにOAuth開始を依頼
      // ポップアップが閉じられる可能性があるため、即座にローディングを解除
      chrome.runtime.sendMessage(
        {
          type: 'start-oauth',
          data: oauthConfig
        },
        (response) => {
          // レスポンスが届かない可能性があるため、ここでは何もしない
          console.log('[Settings] OAuth start response:', response)
        }
      )

      // OAuth認証画面が開くため、即座にローディングを解除し、メッセージを表示
      setTimeout(() => {
        setIsLoading(false)
        setSuccessMessage('Notion認証画面を開きました。認証を完了してください。')
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth認証に失敗しました')
      setIsLoading(false)
    }
  }

  const handleManualSave = async () => {
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      if (!apiKey.trim()) {
        throw new Error('APIキーを入力してください')
      }

      const config: NotionConfig = {
        authMethod: 'manual',
        apiKey: apiKey.trim()
      }

      // 接続テスト
      const client = createNotionClient(config)
      const connected = await client.testConnection()

      if (!connected) {
        throw new Error('Notion APIへの接続に失敗しました。APIキーを確認してください。')
      }

      // 設定を保存
      await StorageService.saveNotionConfig(config)
      setIsConnected(true)
      setSuccessMessage('設定を保存しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました')
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
      setSuccessMessage('Notion連携を解除しました')
    } catch (err) {
      setError('連携解除に失敗しました')
    }
  }

  const handleUISimplifyToggle = async (enabled: boolean) => {
    try {
      setUiSimplifyEnabled(enabled)
      await StorageService.saveUISimplifyConfig({ enabled })
      setSuccessMessage(enabled ? 'UI簡略化を有効にしました' : 'UI簡略化を無効にしました')

      // 3秒後にメッセージをクリア
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError('設定の保存に失敗しました')
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button onClick={onBack} className="back-button">
          ← 戻る
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Notion設定</h2>
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

      {/* 接続状態ボックス（常に表示） */}
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
            <span style={{ color: '#666' }}>接続状態を確認中...</span>
          ) : isConnected && workspaceName ? (
            <span>
              <strong>接続中:</strong> {workspaceName}
            </span>
          ) : isConnected ? (
            <span>
              <strong>接続中:</strong> Notionワークスペース
            </span>
          ) : (
            <span style={{ color: '#666' }}>未接続</span>
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
            連携解除
          </button>
        )}
      </div>

      {/* UI簡略化設定 */}
      <div style={{ marginBottom: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
          Notion UI簡略化
        </h3>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Notionのサイドバーやツールバーの一部を非表示にします
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={uiSimplifyEnabled === false}
              onChange={() => handleUISimplifyToggle(false)}
              disabled={uiSimplifyEnabled === null}
            />
            無効
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={uiSimplifyEnabled === true}
              onChange={() => handleUISimplifyToggle(true)}
              disabled={uiSimplifyEnabled === null}
            />
            有効
          </label>
        </div>

        <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
          ※ 変更は即座に反映されます（ページの再読み込みは不要）
        </small>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          認証方法
        </label>
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              value="oauth"
              checked={authMethod === 'oauth'}
              onChange={(e) => setAuthMethod(e.target.value as 'oauth')}
            />
            OAuth認証（推奨）
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              value="manual"
              checked={authMethod === 'manual'}
              onChange={(e) => setAuthMethod(e.target.value as 'manual')}
            />
            手動トークン入力
          </label>
        </div>
        {isConnected && (
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            ※ 認証方法を変更すると、現在の接続が解除されます
          </small>
        )}
      </div>

      {authMethod === 'oauth' ? (
        <div>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            NotionのOAuth認証を使用してアクセス許可を付与します。<br />
            保存先データベース作成時に自動的にデータベースを作成します。
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
                {isLoading ? '処理中...' : 'Notionで認証して接続'}
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
                  ⚠️ OAuth設定が未構成です。開発者に連絡してください。<br />
                  <small>（CLIENT_IDが設定されていません）</small>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Notion Integration Token *
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
              から作成できます。保存先データベース作成時に自動的にデータベースを作成します。
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
              {isLoading ? '接続テスト中...' : 'トークンを保存して接続'}
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '12px' }}>接続状態</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#0a0' : '#ccc'
            }}
          />
          <span>{isConnected ? '接続済み' : '未接続'}</span>
        </div>
      </div>
    </div>
  )
}
