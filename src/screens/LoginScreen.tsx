import React, { useState, useEffect } from 'react'
import type { NotionConfig, NotionOAuthConfig, Language } from '~types'
import { StorageService } from '~services/storage'
import { createNotionClient } from '~services/notion'

interface LoginScreenProps {
    onLoginSuccess: () => void
    language: Language
}

const translations: Record<Language, {
    title: string
    subtitle: string
    authMethod: string
    oauthLabel: string
    manualLabel: string
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
    errorOAuth: string
    errorSave: string
    errorMissingApiKey: string
    errorConnectFailed: string
    successOAuthOpened: string
}> = {
    ja: {
        title: 'Raku Raku Notion',
        subtitle: 'Notionと連携して、Webページを簡単に保存しましょう',
        authMethod: '認証方法',
        oauthLabel: 'OAuth認証（推奨）',
        manualLabel: '手動トークン入力',
        oauthDesc: 'NotionのOAuth認証を使用してアクセス許可を付与します。',
        oauthButtonIdle: 'Notionで認証して開始する',
        oauthButtonLoading: '処理中...',
        oauthMissingWarning: '⚠️ OAuth設定が未構成です。',
        oauthMissingDetail: '（CLIENT_IDが設定されていません）',
        manualTokenLabel: 'Notion Integration Token *',
        manualPlaceholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        manualNote: 'Notion Integrationから作成できます。',
        manualButtonIdle: 'トークンを保存して開始',
        manualButtonLoading: '接続テスト中...',
        errorOAuth: 'OAuth認証に失敗しました',
        errorSave: '設定の保存に失敗しました',
        errorMissingApiKey: 'APIキーを入力してください',
        errorConnectFailed: 'Notion APIへの接続に失敗しました。APIキーを確認してください。',
        successOAuthOpened: 'Notion認証画面を開きました。認証を完了してください。'
    },
    en: {
        title: 'Raku Raku Notion',
        subtitle: 'Connect with Notion to save web pages easily',
        authMethod: 'Authentication Method',
        oauthLabel: 'OAuth (Recommended)',
        manualLabel: 'Manual Token',
        oauthDesc: 'Use Notion OAuth to grant access.',
        oauthButtonIdle: 'Connect with Notion',
        oauthButtonLoading: 'Processing...',
        oauthMissingWarning: '⚠️ OAuth is not configured.',
        oauthMissingDetail: '(CLIENT_ID is missing)',
        manualTokenLabel: 'Notion Integration Token *',
        manualPlaceholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        manualNote: 'Create it from Notion Integration.',
        manualButtonIdle: 'Save and Connect',
        manualButtonLoading: 'Testing connection...',
        errorOAuth: 'OAuth authentication failed',
        errorSave: 'Failed to save settings',
        errorMissingApiKey: 'Please enter your API key',
        errorConnectFailed: 'Failed to connect to Notion API. Please check your API key.',
        successOAuthOpened: 'Opened Notion auth window. Please finish authentication.'
    }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, language }) => {
    const t = translations[language]
    const [authMethod, setAuthMethod] = useState<'oauth' | 'manual'>('oauth')
    const [apiKey, setApiKey] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [oauthConfig, setOauthConfig] = useState<NotionOAuthConfig>({
        clientId: '',
        redirectUri: ''
    })

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

    // OAuth完了監視
    useEffect(() => {
        const handleStorageChange = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes['raku-oauth-pending'] && changes['raku-oauth-pending'].oldValue && !changes['raku-oauth-pending'].newValue) {
                // OAuth完了シグナル検知
                setTimeout(async () => {
                    const config = await StorageService.getNotionConfig()
                    if (config.authMethod === 'oauth' && config.accessToken) {
                        onLoginSuccess()
                    }
                }, 500)
            }
        }
        chrome.storage.onChanged.addListener(handleStorageChange)
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange)
        }
    }, [onLoginSuccess])

    const handleOAuthLogin = async () => {
        setError('')
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
                () => {
                    // Callback opened
                }
            )
            // ローディング状態は少し維持するが、実際は別ウィンドウでの操作になる
            setTimeout(() => setIsLoading(false), 100)
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errorOAuth)
            setIsLoading(false)
        }
    }

    const handleManualLogin = async () => {
        setIsLoading(true)
        setError('')
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
            onLoginSuccess()
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errorSave)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh', // ポップアップの高さいっぱい
            padding: '24px',
            boxSizing: 'border-box',
            textAlign: 'center',
            justifyContent: 'center'
        }}>
            <h1 style={{ marginBottom: '8px', fontSize: '24px', color: '#333' }}>
                {t.title}
            </h1>
            <p style={{ marginBottom: '32px', color: '#666', fontSize: '14px' }}>
                {t.subtitle}
            </p>

            {error && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#fee',
                    color: '#c00',
                    borderRadius: '4px',
                    fontSize: '13px',
                    textAlign: 'left'
                }}>
                    {error}
                </div>
            )}

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            checked={authMethod === 'oauth'}
                            onChange={() => setAuthMethod('oauth')}
                        />
                        <span style={{ fontSize: '14px', fontWeight: authMethod === 'oauth' ? 'bold' : 'normal' }}>
                            {t.oauthLabel}
                        </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            checked={authMethod === 'manual'}
                            onChange={() => setAuthMethod('manual')}
                        />
                        <span style={{ fontSize: '14px', fontWeight: authMethod === 'manual' ? 'bold' : 'normal' }}>
                            {t.manualLabel}
                        </span>
                    </label>
                </div>

                {authMethod === 'oauth' ? (
                    <div>
                        <button
                            onClick={handleOAuthLogin}
                            disabled={isLoading || !oauthConfig.clientId}
                            className="button"
                            style={{
                                width: '100%',
                                backgroundColor: isLoading || !oauthConfig.clientId ? '#ccc' : '#f2a8a8',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                padding: '12px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isLoading || !oauthConfig.clientId ? 'not-allowed' : 'pointer',
                                marginBottom: '12px'
                            }}
                        >
                            {isLoading ? t.oauthButtonLoading : t.oauthButtonIdle}
                        </button>
                        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                            {t.oauthDesc}
                        </p>
                        {!oauthConfig.clientId && (
                            <p style={{ fontSize: '12px', color: '#d9534f', textAlign: 'center', marginTop: '8px' }}>
                                {t.oauthMissingWarning} {t.oauthMissingDetail}
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={t.manualPlaceholder}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                marginBottom: '12px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            onClick={handleManualLogin}
                            disabled={isLoading || !apiKey.trim()}
                            className="button"
                            style={{
                                width: '100%',
                                backgroundColor: isLoading || !apiKey.trim() ? '#ccc' : '#f2a8a8',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                padding: '12px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isLoading || !apiKey.trim() ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? t.manualButtonLoading : t.manualButtonIdle}
                        </button>
                        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '12px' }}>
                            {t.manualNote}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
