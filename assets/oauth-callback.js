/**
 * OAuth Callback Handler
 * 拡張機能のoauth-callback.htmlで実行されるスクリプト
 */

(async function() {
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

    // バックグラウンドスクリプトにOAuth完了を通知
    // oauthConfigは送信せず、backgroundで環境変数から取得
    const response = await chrome.runtime.sendMessage({
      type: 'complete-oauth',
      data: {
        code,
        state
      }
    })

    console.log('[OAuth Callback] Response received:', response)

    if (response?.success) {
      // 成功表示
      const spinner = document.getElementById('spinner')
      const success = document.getElementById('success')

      if (spinner) spinner.style.display = 'none'
      if (success) success.style.display = 'block'

      console.log('[OAuth Callback] Success! Closing in 2 seconds...')

      // 2秒後にタブを閉じる
      setTimeout(() => {
        window.close()
      }, 2000)
    } else {
      throw new Error(response?.error || '認証の完了に失敗しました')
    }
  } catch (err) {
    console.error('[OAuth Callback] Error:', err)

    // エラー表示
    const spinner = document.getElementById('spinner')
    const errorDiv = document.getElementById('error')
    const errorMessage = document.getElementById('error-message')

    if (spinner) spinner.style.display = 'none'
    if (errorDiv) errorDiv.style.display = 'block'
    if (errorMessage) {
      errorMessage.textContent = err instanceof Error ? err.message : '不明なエラー'
    }
  }
})()
