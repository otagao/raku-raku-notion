import React, { useState, useEffect } from 'react'
import type { NotionConfig, NotionOAuthConfig } from '~types'
import { StorageService } from '~services/storage'
import { createNotionClient } from '~services/notion'

interface SettingsScreenProps {
  onBack: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [authMethod, setAuthMethod] = useState<'manual' | 'oauth'>('oauth')
  const [apiKey, setApiKey] = useState('')
  const [databaseId, setDatabaseId] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [databases, setDatabases] = useState<any[]>([])

  // OAuth設定（localhost:3000を使用）
  const oauthConfig: NotionOAuthConfig = {
    clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
    clientSecret: process.env.PLASMO_PUBLIC_NOTION_CLIENT_SECRET || '',
    redirectUri: 'http://localhost:3000/oauth/callback'
  }

  // 初期化: 既存の設定を読み込む
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const config = await StorageService.getNotionConfig()
      if (config) {
        setAuthMethod(config.authMethod || 'oauth')
        setApiKey(config.apiKey || '')
        setDatabaseId(config.databaseId || '')
        setWorkspaceName(config.workspaceName || '')

        // 接続状態を確認
        if ((config.authMethod === 'oauth' && config.accessToken) ||
            (config.authMethod === 'manual' && config.apiKey)) {
          await checkConnection(config)
        }
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  const checkConnection = async (config?: NotionConfig) => {
    try {
      const currentConfig = config || await StorageService.getNotionConfig()
      const client = createNotionClient(currentConfig)
      const connected = await client.testConnection()
      setIsConnected(connected)

      if (connected && authMethod === 'oauth') {
        // データベース一覧を取得
        const dbs = await client.listDatabases()
        setDatabases(dbs)
      }
    } catch (err) {
      setIsConnected(false)
    }
  }

  const handleOAuthLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      if (!oauthConfig.clientId) {
        throw new Error('Notion Client IDが設定されていません')
      }

      // 拡張機能IDをOAuthサーバーに送信
      const extensionId = chrome.runtime.id
      await fetch(`http://localhost:3000/api/set-extension-id?id=${extensionId}`)
        .catch(err => {
          console.warn('Failed to set extension ID on server:', err)
          throw new Error('OAuthサーバーが起動していません。npm run oauth-server を実行してください。')
        })

      // バックグラウンドスクリプトにOAuth開始を依頼
      chrome.runtime.sendMessage(
        {
          type: 'start-oauth',
          data: oauthConfig
        },
        (response) => {
          if (response?.success) {
            setSuccessMessage('Notion認証画面を開きました。認証を完了してください。')
          } else {
            setError(response?.error || 'OAuth認証の開始に失敗しました')
          }
          setIsLoading(false)
        }
      )
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
        apiKey: apiKey.trim(),
        databaseId: databaseId.trim() || undefined
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

      // データベース一覧を取得（オプション）
      if (databaseId.trim()) {
        try {
          const dbs = await client.listDatabases()
          setDatabases(dbs)
        } catch (err) {
          console.warn('Failed to load databases:', err)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDatabaseSelect = async (dbId: string) => {
    try {
      const config = await StorageService.getNotionConfig()
      await StorageService.saveNotionConfig({
        ...config,
        databaseId: dbId
      })
      setDatabaseId(dbId)
      setSuccessMessage('データベースを選択しました')
    } catch (err) {
      setError('データベースの選択に失敗しました')
    }
  }

  const handleDisconnect = async () => {
    try {
      await StorageService.saveNotionConfig({
        authMethod: 'oauth',
        apiKey: undefined,
        accessToken: undefined,
        databaseId: undefined,
        workspaceId: undefined,
        workspaceName: undefined,
        botId: undefined
      })
      setIsConnected(false)
      setApiKey('')
      setDatabaseId('')
      setWorkspaceName('')
      setDatabases([])
      setSuccessMessage('Notion連携を解除しました')
    } catch (err) {
      setError('連携解除に失敗しました')
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

      {isConnected && workspaceName && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#e8f4f8',
          borderRadius: '4px'
        }}>
          <strong>接続中:</strong> {workspaceName}
          <button
            onClick={handleDisconnect}
            style={{ marginLeft: '12px', fontSize: '12px' }}
          >
            連携解除
          </button>
        </div>
      )}

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
              disabled={isConnected}
            />
            OAuth認証（推奨）
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              value="manual"
              checked={authMethod === 'manual'}
              onChange={(e) => setAuthMethod(e.target.value as 'manual')}
              disabled={isConnected}
            />
            手動トークン入力
          </label>
        </div>
      </div>

      {authMethod === 'oauth' ? (
        <div>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            NotionのOAuth認証を使用してアクセス許可を付与します。<br />
            データベースへのアクセス権限を自動的に取得できます。
          </p>
          {!isConnected ? (
            <button
              onClick={handleOAuthLogin}
              disabled={isLoading || !oauthConfig.clientId}
              className="primary-button"
              style={{ width: '100%' }}
            >
              {isLoading ? '処理中...' : 'Notionで認証'}
            </button>
          ) : (
            <div>
              <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>データベース選択</h3>
              {databases.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {databases.map((db) => (
                    <div
                      key={db.id}
                      onClick={() => handleDatabaseSelect(db.id)}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        border: databaseId === db.id ? '2px solid #0078d4' : '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: databaseId === db.id ? '#f0f8ff' : '#fff'
                      }}
                    >
                      <strong>
                        {db.title?.[0]?.plain_text || 'Untitled'}
                      </strong>
                      {databaseId === db.id && (
                        <span style={{ marginLeft: '8px', color: '#0078d4' }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666' }}>データベースが見つかりませんでした</p>
              )}
            </div>
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
              から作成できます
            </small>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Database ID（オプション）
            </label>
            <input
              type="text"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              disabled={isLoading || isConnected}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <small style={{ color: '#666' }}>
              NotionデータベースのURLから取得できます
            </small>
          </div>

          {!isConnected && (
            <button
              onClick={handleManualSave}
              disabled={isLoading || !apiKey.trim()}
              className="primary-button"
              style={{ width: '100%' }}
            >
              {isLoading ? '接続テスト中...' : '保存して接続'}
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
