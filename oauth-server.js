/**
 * OAuth コールバック用ローカルサーバー
 * NotionのOAuth認証後のリダイレクト先として使用
 */

const http = require('http');

const PORT = 3000;
const CALLBACK_PATH = '/oauth/callback';
const EXTENSION_ID_PATH = '/api/extension-id';
const SET_EXTENSION_ID_PATH = '/api/set-extension-id';

// 拡張機能IDを保存する変数
let extensionId = null;

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const parsedUrl = {
    pathname: reqUrl.pathname,
    query: Object.fromEntries(reqUrl.searchParams)
  };

  // 拡張機能ID設定エンドポイント
  if (parsedUrl.pathname === SET_EXTENSION_ID_PATH) {
    const { id } = parsedUrl.query;
    if (id) {
      extensionId = id;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, extensionId }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Extension ID is required' }));
    }
    return;
  }

  // 拡張機能ID取得エンドポイント
  if (parsedUrl.pathname === EXTENSION_ID_PATH) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ extensionId }));
    return;
  }

  // OAuth コールバックの処理
  if (parsedUrl.pathname === CALLBACK_PATH) {
    const { code, state, error } = parsedUrl.query;

    // HTMLレスポンス
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    if (error) {
      res.end(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OAuth認証エラー - Raku Raku Notion</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f7f6f3;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            .error {
              color: #c00;
              font-size: 48px;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 20px;
              margin-bottom: 12px;
              color: #333;
            }
            p {
              color: #666;
              margin-bottom: 20px;
            }
            .close-btn {
              background: #0078d4;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✗</div>
            <h1>認証エラー</h1>
            <p>OAuth認証中にエラーが発生しました: ${error}</p>
            <button class="close-btn" onclick="window.close()">閉じる</button>
          </div>
        </body>
        </html>
      `);
      return;
    }

    if (!code || !state) {
      res.end(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>OAuth認証エラー</title>
        </head>
        <body>
          <h1>エラー</h1>
          <p>認証コードまたはstateパラメータが見つかりません</p>
        </body>
        </html>
      `);
      return;
    }

    // 成功時のHTML（拡張機能にメッセージを送る）
    res.end(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OAuth認証完了 - Raku Raku Notion</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f7f6f3;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            max-width: 400px;
          }
          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0078d4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .success {
            color: #0a0;
            font-size: 48px;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 20px;
            margin-bottom: 12px;
            color: #333;
          }
          p {
            color: #666;
            margin-bottom: 0;
          }
          .close-btn {
            background: #0078d4;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner" id="spinner"></div>
          <div id="success" style="display: none;">
            <div class="success">✓</div>
            <h1>認証が完了しました</h1>
            <p>このタブを閉じて、拡張機能の設定画面に戻ってください</p>
            <button class="close-btn" onclick="window.close()">閉じる</button>
          </div>
          <div id="error" style="display: none;">
            <div style="color: #c00; font-size: 48px; margin-bottom: 16px;">✗</div>
            <h1>認証処理でエラーが発生しました</h1>
            <p id="error-message"></p>
            <button class="close-btn" onclick="window.close()">閉じる</button>
          </div>
        </div>

        <script>
          (async function() {
            try {
              console.log('[OAuth] Starting OAuth callback process...');
              const code = "${code}";
              const state = "${state}";
              console.log('[OAuth] Code:', code.substring(0, 10) + '...');
              console.log('[OAuth] State:', state.substring(0, 10) + '...');

              // Chrome APIが利用可能か確認
              if (typeof chrome === 'undefined' || !chrome.runtime) {
                throw new Error('Chrome拡張機能APIが利用できません。Chromeブラウザで開いてください。');
              }

              // 拡張機能のIDを取得
              console.log('[OAuth] Fetching extension ID from server...');
              const response = await fetch('http://localhost:3000/api/extension-id');
              const data = await response.json();
              const extensionId = data.extensionId;
              console.log('[OAuth] Extension ID:', extensionId);

              if (!extensionId) {
                throw new Error('拡張機能IDが見つかりません。設定画面からOAuth認証を再度開始してください。');
              }

              // Chrome拡張機能にメッセージを送信
              console.log('[OAuth] Sending message to extension...');
              chrome.runtime.sendMessage(
                extensionId,
                {
                  type: 'complete-oauth',
                  data: { code, state }
                },
                (response) => {
                  console.log('[OAuth] Response from extension:', response);

                  if (chrome.runtime.lastError) {
                    console.error('[OAuth] chrome.runtime.lastError:', chrome.runtime.lastError);
                    throw new Error('拡張機能との通信に失敗しました: ' + chrome.runtime.lastError.message);
                  }

                  if (response?.success) {
                    console.log('[OAuth] Authentication successful!');
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('success').style.display = 'block';
                  } else {
                    throw new Error(response?.error || '認証の完了に失敗しました');
                  }
                }
              );
            } catch (err) {
              console.error('[OAuth] Error:', err);
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error-message').textContent = err.message || '不明なエラー';
            }
          })();
        </script>
      </body>
      </html>
    `);
    return;
  }

  // ルートパス
  if (parsedUrl.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>Raku Raku Notion - OAuth Server</title>
      </head>
      <body>
        <h1>Raku Raku Notion OAuth Server</h1>
        <p>このサーバーはNotionのOAuth認証のために稼働しています。</p>
        <p>Port: ${PORT}</p>
        <p>Callback URL: http://localhost:${PORT}${CALLBACK_PATH}</p>
      </body>
      </html>
    `);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Raku Raku Notion - OAuth Callback Server');
  console.log('='.repeat(60));
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Callback URL: http://localhost:${PORT}${CALLBACK_PATH}`);
  console.log('');
  console.log('📝 Notion Integration設定:');
  console.log(`   Redirect URI: http://localhost:${PORT}${CALLBACK_PATH}`);
  console.log('');
  console.log('⚠️  このサーバーは開発用です。本番環境では使用しないでください。');
  console.log('='.repeat(60));
});

// エラーハンドリング
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the other application or change the port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down OAuth server...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});
