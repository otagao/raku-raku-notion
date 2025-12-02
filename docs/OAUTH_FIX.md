# OAuth認証の修正履歴（アーカイブ）

> ⚠️ **このドキュメントは歴史的資料です**
>
> この文書は、localhost + oauth-server.js を使用していた旧実装の修正履歴です。
> 現在の実装では**静的サイトホスティング（Cloudflare Pages等）**を使用しており、
> この問題は発生しません。
>
> 現在のOAuth認証ガイドは [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md) を参照してください。

---

## 旧実装の問題（解決済み）

### 問題
OAuthコールバックページで「拡張機能IDが見つかりません」エラーが発生していました。

### 原因
localhostのHTMLページから拡張機能にメッセージを送る際、`chrome.runtime.sendMessage(extensionId, message)`の形式で拡張機能IDを明示的に指定する必要がありましたが、IDの受け渡し方法が正しく実装されていませんでした。

### 旧実装の解決方法

#### 1. OAuthサーバーにAPIエンドポイントを追加

**oauth-server.js** に以下のエンドポイントを追加:

- `GET /api/extension-id` - 保存された拡張機能IDを返す
- `GET /api/set-extension-id?id=XXX` - 拡張機能IDを保存

#### 2. 設定画面でOAuth開始前に拡張機能IDを送信

**src/screens/SettingsScreen.tsx** の `handleOAuthLogin` で:

```typescript
// 拡張機能IDをOAuthサーバーに送信
const extensionId = chrome.runtime.id
await fetch(`http://localhost:3000/api/set-extension-id?id=${extensionId}`)
```

#### 3. OAuthコールバックページでAPIから拡張機能IDを取得

**oauth-server.js** のJavaScript部分:

```javascript
// サーバーから拡張機能IDを取得
const response = await fetch('http://localhost:3000/api/extension-id');
const data = await response.json();
const extensionId = data.extensionId;
```

### 旧実装の流れ

1. **ユーザーが「Notionで認証」ボタンをクリック**
   - 拡張機能が `http://localhost:3000/api/set-extension-id?id=<EXTENSION_ID>` にリクエスト
   - OAuthサーバーがIDを変数に保存

2. **Notionの認証画面で「許可する」をクリック**
   - `http://localhost:3000/oauth/callback?code=XXX&state=YYY` にリダイレクト

3. **OAuthコールバックページで**
   - JavaScriptが `http://localhost:3000/api/extension-id` からIDを取得
   - `chrome.runtime.sendMessage(extensionId, {...})` で拡張機能にメッセージ送信

4. **拡張機能の背景スクリプトで**
   - `chrome.runtime.onMessageExternal` でメッセージを受信
   - `complete-oauth` メッセージを処理してトークン交換

---

## 現在の実装（v1.5.0以降）

### 改善点

旧実装の複雑さを解消するため、以下の変更を行いました：

1. **oauth-server.js を削除** - ローカルHTTPサーバー不要
2. **静的サイトホスティングを使用** - Cloudflare Pages/Netlify/GitHub Pages
3. **stateパラメータに拡張機能IDを埋め込み** - サーバー不要でIDを受け渡し

### 新しいフロー

```
1. [拡張機能] OAuth開始
   ↓ state = base64(extensionId:randomToken)

2. [Notion] ユーザーが「許可する」をクリック
   ↓ redirect: https://your-domain.com/callback.html?code=xxx&state=xxx

3. [callback.html] stateから拡張機能IDを抽出
   ↓ decoded = atob(state) → extensionId:randomToken

4. [callback.html] 拡張機能にリダイレクト
   ↓ chrome-extension://{extensionId}/oauth-callback.html?code=xxx&state=xxx

5. [拡張機能] トークン交換 & 認証完了
```

### メリット

- ✅ ローカルサーバー不要
- ✅ シンプルな実装
- ✅ 拡張機能IDのハードコーディング不要
- ✅ セキュリティ向上（CSRF対策 + extension ID検証）
- ✅ 本番環境でも動作（固定URL）

---

## 参考情報

- 現在のOAuth設定ガイド: [OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md)
- 静的サイトデプロイ手順: [../oauth-static/README.md](../oauth-static/README.md)
- プロジェクト開発履歴: [../CLAUDE.md](../CLAUDE.md)

---

**作成日**: 2025-11-xx（旧実装時）
**更新日**: 2025-12-02（アーカイブ化）
**ステータス**: 🗄️ アーカイブ（歴史的資料）
