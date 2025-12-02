# Notion OAuth セットアップガイド

このガイドでは、Raku Raku NotionのNotion OAuth認証を設定する方法を説明します。

## 認証方式の選択

Raku Raku Notionは2つの認証方式に対応しています：

### 🔧 Internal Integration（開発・テスト用、推奨）

**メリット**:
- ✅ セットアップが簡単（5分で完了）
- ✅ 追加のサーバー不要
- ✅ 開発環境で即座に使用可能

**デメリット**:
- ❌ 各データベースに手動でアクセス許可が必要
- ❌ 他のユーザーと共有できない

### 🌐 Public OAuth Integration（本番環境向け）

**メリット**:
- ✅ ユーザーがワンクリックで認証
- ✅ データベースへのアクセス許可が自動
- ✅ Chrome Web Storeで公開可能

**デメリット**:
- ❌ 静的サイトホスティングが必要
- ❌ 初期セットアップがやや複雑

---

## オプション1: Internal Integration（推奨）

### セットアップ手順

#### 1. Notion Integrationの作成

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下を入力:
   - **Name**: `Raku Raku Notion Dev`
   - **Type**: **Internal integration** を選択
   - **Associated workspace**: 使用するワークスペース
4. 「Capabilities」で以下を有効化:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. 「Submit」をクリック
6. **Internal Integration Token** (秘密キー) をコピー

#### 2. 拡張機能での設定

1. 拡張機能を開く（ブラウザのツールバーからアイコンをクリック）
2. ⚙️（設定）アイコンをクリック
3. 「認証方法」で **「手動トークン入力」** を選択
4. 「Notion Integration Token」フィールドにトークンを貼り付け
5. 「保存して接続」をクリック
6. 「接続済み」と表示されれば成功！

#### 3. データベースへのアクセス許可

クリップボードを作成する前に、Notionワークスペースにアクセス許可を付与します：

1. Notionのホームページを開く
2. 右上の「...」メニュー → 「接続」→「Raku Raku Notion Dev」を選択
3. これでIntegrationがワークスペース全体にアクセスできるようになります

または、個別のページ/データベースのみ許可する場合：
1. 特定のページ/データベースを開く
2. 右上の「...」メニュー → 「接続」→「Raku Raku Notion Dev」を選択

---

## オプション2: Public OAuth Integration

### 前提条件

- 静的サイトホスティングサービス（Cloudflare Pages、Netlify、GitHub Pagesなど）
- デプロイ済みのOAuth認証ページ（`oauth-static/`ディレクトリ）

### セットアップ手順

#### 1. 静的サイトのデプロイ

`oauth-static/`ディレクトリを静的サイトホスティングにデプロイします。
詳細は [oauth-static/README.md](../oauth-static/README.md) を参照。

**推奨サービス**:
- **Cloudflare Pages** - 高速、無料、CDN付き
- **Netlify** - 簡単デプロイ、自動HTTPS
- **GitHub Pages** - GitHubリポジトリから直接デプロイ

デプロイ後のURL例:
```
https://raku-raku-notion.pages.dev/callback.html
```

#### 2. 拡張機能IDの設定

1. Chromeで `chrome://extensions/` を開く
2. **開発者モード** を有効化
3. Raku Raku Notionの**ID**をコピー（例: `abcdefghijklmnopqrstuvwxyz012345`）

**注意**: 拡張機能IDは`callback.html`や`error.html`にハードコーディングする必要が**なくなりました**。
stateパラメータから自動的に抽出されます。

#### 3. Notion Public Integrationの作成

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下を入力:
   - **Name**: `Raku Raku Notion`
   - **Type**: **Public integration** を選択
   - **Associated workspace**: 使用するワークスペース
4. 「Capabilities」で以下を有効化:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. 「OAuth Domain & URIs」セクション:
   - **Redirect URIs**: デプロイした`callback.html`の完全なURL
     ```
     https://raku-raku-notion.pages.dev/callback.html
     ```
   - **⚠️ 重要**: 末尾スラッシュなし、完全一致が必要
6. 「Submit」をクリック
7. **OAuth client ID** と **OAuth client secret** をコピー

#### 4. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成（または`.env.example`をコピー）：

```bash
# Notion OAuth設定
PLASMO_PUBLIC_NOTION_CLIENT_ID=your_client_id_here
PLASMO_PUBLIC_NOTION_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URI（デプロイしたURL）
PLASMO_PUBLIC_OAUTH_REDIRECT_URI=https://raku-raku-notion.pages.dev/callback.html
```

**セキュリティ注意**: `.env`ファイルは`.gitignore`に含まれており、Gitにコミットされません。

#### 5. 拡張機能のビルド

```bash
npm run build
```

#### 6. 拡張機能での認証

1. ビルドした拡張機能をChromeに読み込む（`build/chrome-mv3-prod/`）
2. 拡張機能を開く
3. ⚙️（設定）アイコンをクリック
4. 「認証方法」で **「OAuth認証」** を選択
5. 「Notionと連携」ボタンをクリック
6. Notionの認証画面で「許可する」をクリック
7. 自動的に拡張機能に戻り、「接続済み」と表示されれば成功！

---

## OAuth認証フローの仕組み

### 従来の実装（localhost + ngrok）

❌ **問題点**:
- ローカルHTTPサーバーが必要
- ngrokなどのトンネリングサービスが必要
- URLが毎回変わるため、Notion Integration設定を頻繁に更新

### 現在の実装（静的サイトホスティング）

✅ **改善点**:
- 静的HTMLのみ（サーバー不要）
- 固定URLで安定動作
- CDN経由で高速
- stateパラメータから拡張機能IDを自動抽出

### フロー図

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

---

## トラブルシューティング

### OAuth認証が失敗する

**原因1: Redirect URIの不一致**

以下の3箇所でredirect URIが**完全一致**している必要があります：
- ✅ Notion Integration設定
- ✅ `.env`の`PLASMO_PUBLIC_OAUTH_REDIRECT_URI`
- ✅ `SettingsScreen.tsx`の`oauthConfig.redirectUri`（環境変数から自動取得）

**解決策**:
```bash
# .envファイルを確認
cat .env

# Notion Integration設定を確認
# https://www.notion.so/my-integrations
```

**原因2: 拡張機能IDが古い**

開発版から本番版に切り替えた場合、拡張機能IDが変わります。

**解決策**:
- stateパラメータから自動抽出されるため、手動設定は不要
- ビルドし直して再度認証

**原因3: Client IDまたはClient Secretが間違っている**

**解決策**:
```bash
# .envファイルのClient ID/Secretを確認
# Notion Developersページで再確認
```

### callback.htmlにリダイレクトされるが拡張機能に戻らない

**原因**: `chrome-extension://`スキームがブロックされている

**解決策**:
1. ブラウザのコンソールを開く（F12）
2. エラーメッセージを確認
3. 拡張機能が正しくインストールされているか確認

### 「Invalid OAuth state parameter」エラー

**原因**: stateパラメータの検証失敗（CSRF対策）

**解決策**:
- ブラウザのキャッシュをクリア
- 拡張機能のストレージをクリア:
  ```javascript
  // 開発者ツールのコンソールで実行
  chrome.storage.local.remove('raku-oauth-state')
  ```
- もう一度OAuth認証をやり直す

---

## 開発者向け情報

### stateパラメータの構造

```typescript
// state生成（src/utils/oauth.ts）
const randomToken = generateState() // 64文字のランダムHEX
const stateData = `${extensionId}:${randomToken}`
const state = btoa(stateData) // Base64エンコード

// state解析（callback.html）
const decoded = atob(state)
const [extensionId, csrfToken] = decoded.split(':')
```

### redirect URIの設定場所

| ファイル | 用途 |
|---------|------|
| `.env` | 環境変数（ビルド時に埋め込まれる） |
| `SettingsScreen.tsx` | OAuth認証開始時のURI |
| `background/index.ts` | トークン交換時のURI |

**全て同じ値を使用**する必要があります（環境変数から自動取得）。

---

## 参考リンク

- [Notion OAuth Documentation](https://developers.notion.com/docs/authorization)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Chrome Extension OAuth](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/)

---

**最終更新**: 2025-12-02
**バージョン**: 2.0 - 静的サイトホスティング対応
