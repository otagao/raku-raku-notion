# OAuth認証の修正

## 問題
OAuthコールバックページで「拡張機能IDが見つかりません」エラーが発生していました。

## 原因
localhostのHTMLページから拡張機能にメッセージを送る際、`chrome.runtime.sendMessage(extensionId, message)`の形式で拡張機能IDを明示的に指定する必要がありますが、IDの受け渡し方法が正しく実装されていませんでした。

## 解決方法

### 1. OAuthサーバーにAPIエンドポイントを追加

**oauth-server.js** に以下のエンドポイントを追加:

- `GET /api/extension-id` - 保存された拡張機能IDを返す
- `GET /api/set-extension-id?id=XXX` - 拡張機能IDを保存

### 2. 設定画面でOAuth開始前に拡張機能IDを送信

**src/screens/SettingsScreen.tsx** の `handleOAuthLogin` で:

```typescript
// 拡張機能IDをOAuthサーバーに送信
const extensionId = chrome.runtime.id
await fetch(`http://localhost:3000/api/set-extension-id?id=${extensionId}`)
```

### 3. OAuthコールバックページでAPIから拡張機能IDを取得

**oauth-server.js** のJavaScript部分を修正:

```javascript
// サーバーから拡張機能IDを取得
const response = await fetch('http://localhost:3000/api/extension-id');
const data = await response.json();
const extensionId = data.extensionId;
```

## 実装の流れ

1. **ユーザーが「Notionで認証」ボタンをクリック**
   - 拡張機能が `http://localhost:3000/api/set-extension-id?id=<EXTENSION_ID>` にリクエスト
   - OAuthサーバーがIDを変数に保存

2. **Notionの認証画面で「許可する」をクリック**
   - `http://localhost:3000/oauth/callback?code=XXX&state=YYY` にリダイレクト

3. **OAuthコールバックページで**
   - JavaScriptが `http://localhost:3000/api/extension-id` からIDを取得
   - `chrome.runtime.sendMessage(extensionId, {...})` で拡張機能にメッセージ送信

4. **拡張機能のバックグラウンドスクリプトが**
   - 認証コードをトークンに交換
   - NotionConfigを更新

## 使い方

### OAuth サーバーの起動

```bash
npm run oauth-server
```

### テスト手順

1. OAuthサーバーを起動
2. 拡張機能の設定画面を開く
3. 「OAuth認証」を選択
4. 「Notionで認証」をクリック
5. Notionで「許可する」をクリック
6. 自動的に認証が完了する

## エラーハンドリング

- **「OAuthサーバーが起動していません」** → `npm run oauth-server` を実行
- **「拡張機能IDが見つかりません」** → 設定画面から認証を再度開始
- **「拡張機能との通信に失敗しました」** → manifest.jsonの `externally_connectable` 設定を確認

## 注意事項

- OAuthサーバーは開発用です。本番環境では使用しないでください
- 拡張機能IDはOAuthサーバーのメモリに保存されます（サーバー再起動で消えます）
- 複数の拡張機能で同時にテストする場合、最後に認証を開始したもののIDが使用されます
