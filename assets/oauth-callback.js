/**
 * OAuth Callback Handler
 * 拡張機能のoauth-callback.htmlで実行されるスクリプト
 */

(async function () {
  try {
    console.log('[OAuth Callback] Starting...')

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      throw new Error(`OAuth error: ${error}`)
    }

    if (!code || !state) {
      throw new Error('認証コードまたはstate パラメータが見つかりません')
    }

    console.log('[OAuth Callback] Code and state received')

    // State検証（CSRF対策）
    const storage = await chrome.storage.local.get(['raku-oauth-state'])
    const savedState = storage['raku-oauth-state']

    if (!savedState || savedState !== state) {
      throw new Error('State parameter mismatch. Possible CSRF attack.')
    }

    console.log('[OAuth Callback] State verification passed')

    // Cloudflare Workersでトークン交換
    // 開発中: http://localhost:8787
    // 本番: https://raku-raku-notion-oauth.smprmailer.workers.dev
    const workerUrl = 'https://raku-raku-notion-oauth.smprmailer.workers.dev'

    console.log('[OAuth Callback] Exchanging token via Workers...', workerUrl)

    const exchangeResponse = await fetch(`${workerUrl}/api/oauth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        state: state
      })
    })

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.json()
      throw new Error(errorData.error || 'トークン交換に失敗しました')
    }

    const tokenData = await exchangeResponse.json()

    if (!tokenData.success) {
      throw new Error(tokenData.error || 'トークン交換に失敗しました')
    }

    console.log('[OAuth Callback] Token exchange successful')

    // バックグラウンドスクリプトに完了通知（トークン交換済みデータ）
    const response = await chrome.runtime.sendMessage({
      type: 'complete-oauth',
      data: {
        tokenResponse: {
          access_token: tokenData.access_token,
          bot_id: tokenData.bot_id,
          workspace_id: tokenData.workspace_id,
          workspace_name: tokenData.workspace_name,
          workspace_icon: tokenData.workspace_icon
        }
      }
    })

    console.log('[OAuth Callback] Response received:', response)

    if (response?.success) {
      // 成功表示
      const spinnerView = document.getElementById('spinner-view')
      const successOverlay = document.getElementById('success-overlay')
      const closeBtn = document.getElementById('close-btn')

      if (spinnerView) spinnerView.style.display = 'none'
      if (successOverlay) successOverlay.style.display = 'flex'

      console.log('[OAuth Callback] Success! Waiting for user to close...')

      // 閉じるボタンのイベントリスナー
      if (closeBtn) {
        closeBtn.onclick = () => {
          window.close();
        };
      }

    } else {
      throw new Error(response?.error || '認証の完了に失敗しました')
    }
  } catch (err) {
    console.error('[OAuth Callback] Error:', err)

    // エラー表示
    const spinnerView = document.getElementById('spinner-view')
    const errorView = document.getElementById('error-view')
    const errorMessage = document.getElementById('error-message')

    if (spinnerView) spinnerView.style.display = 'none'
    if (errorView) errorView.style.display = 'block'
    if (errorMessage) {
      errorMessage.textContent = err instanceof Error ? err.message : '不明なエラー'
    }
  }
})()
