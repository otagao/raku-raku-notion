# Notion OAuth セットアップガイド

このガイドでは、Raku Raku NotionのNotion OAuth認証を設定する方法を説明します。

## 問題: localhostへの接続が拒否される

Notionの「Public Integration」でOAuth認証を使用する場合、開発環境（localhost）では以下の制約があります:

1. **リダイレクトURIは`https://`から始まる必要がある**（一部例外あり）
2. **ページ指定のアクセス許可がlocalhostで機能しない場合がある**

## 解決策

### オプション1: Internal Integration（開発・テスト用、推奨）

開発・テスト段階では、OAuth認証ではなく**Internal Integration**の使用を推奨します。

#### セットアップ手順

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下を入力:
   - **Name**: Raku Raku Notion Dev
   - **Type**: **Internal integration** を選択
   - **Associated workspace**: 使用するワークスペース
4. 「Capabilities」で以下を有効化:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. 「Submit」をクリック
6. **Internal Integration Token** (秘密キー) をコピー

#### 拡張機能での設定

1. 拡張機能を開く
2. ⚙️（設定）アイコンをクリック
3. 「認証方法」で **「手動トークン入力」** を選択
4. 「Notion Integration Token」フィールドにトークンを貼り付け
5. 「保存して接続」をクリック

#### データベースへのアクセス許可

Internal Integrationを使用する場合、使用するNotionデータベースに手動でアクセス許可を付与する必要があります:

1. Notionでデータベースページを開く
2. 右上の「...」メニューをクリック
3. 「接続」→「Raku Raku Notion Dev」を選択
4. これでIntegrationがそのデータベースにアクセスできるようになります

---

### オプション2: Public Integration + ngrok（本番環境向け）

本番環境やPublic Integrationを使用したい場合は、ngrokなどのトンネリングサービスを使用します。

#### 必要なツール

- [ngrok](https://ngrok.com/) - ローカルサーバーをHTTPSで公開

#### セットアップ手順

##### 1. ngrokのインストール

```bash
# Homebrewを使用（macOS）
brew install ngrok

# または公式サイトからダウンロード
# https://ngrok.com/download
```

##### 2. ngrokでローカルサーバーを公開

```bash
# ターミナル1: OAuthサーバー起動
npm run oauth-server

# ターミナル2: ngrokでトンネル作成
ngrok http 3000
```

ngrokが起動すると、以下のような出力が表示されます:

```
Forwarding  https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
```

##### 3. Notion Integrationの設定

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下を入力:
   - **Name**: Raku Raku Notion
   - **Type**: **Public integration** を選択
   - **Associated workspace**: 使用するワークスペース
4. 「Capabilities」で以下を有効化:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. 「OAuth Domain & URIs」で以下を設定:
   - **Redirect URIs**: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/oauth/callback`
   - （ngrokで表示されたURLを使用）
6. 「Submit」をクリック
7. **Client ID** と **Client Secret** をコピー

##### 4. 拡張機能の設定更新

[src/screens/SettingsScreen.tsx](src/screens/SettingsScreen.tsx) の `redirectUri` を更新:

```typescript
const oauthConfig: NotionOAuthConfig = {
  clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
  clientSecret: process.env.PLASMO_PUBLIC_NOTION_CLIENT_SECRET || '',
  redirectUri: 'https://xxxx-xx-xx-xx-xx.ngrok-free.app/oauth/callback' // ngrokのURL
}
```

##### 5. OAuth-serverの更新

[oauth-server.js](oauth-server.js) でngrokのURLからのリクエストを許可:

```javascript
// CORSヘッダーを追加
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

---

### オプション3: Cloudflare Tunnel（無料、安定）

ngrokの無料版は一時的なURLを生成しますが、Cloudflare Tunnelは無料で安定したURLを提供します。

#### セットアップ手順

```bash
# 1. cloudflaredのインストール
brew install cloudflare/cloudflare/cloudflared

# 2. トンネル作成
cloudflared tunnel --url http://localhost:3000
```

表示されたHTTPS URLをNotionのRedirect URIに設定します。

---

## 推奨アプローチまとめ

| 環境 | 推奨方法 | 理由 |
|------|---------|------|
| **開発・テスト** | Internal Integration（手動トークン） | セットアップが簡単、すぐに使える |
| **本番リリース前** | Public Integration + ngrok/Cloudflare | OAuth認証フローのテスト |
| **本番環境** | Public Integration + 専用ドメイン | 安定した認証フロー |

---

## トラブルシューティング

### 「接続が拒否されました」エラー

**原因**: OAuthサーバーが起動していない

**解決策**:
```bash
# サーバーが起動しているか確認
lsof -i :3000

# 起動していない場合
npm run oauth-server
```

### 「拡張機能IDが見つかりません」エラー

**原因**: ローカルストレージに拡張機能IDが保存されていない

**解決策**:
1. 拡張機能の設定画面を開く
2. 「Notionで認証」ボタンをもう一度クリック

### データベースが表示されない

**原因**: Integrationにデータベースへのアクセス権限がない

**解決策**:
- Internal Integration: データベースページで「接続」からIntegrationを追加
- Public Integration: OAuth認証時にアクセス許可を付与

---

## 参考リンク

- [Notion API Documentation](https://developers.notion.com/)
- [Notion OAuth Authorization](https://developers.notion.com/docs/authorization)
- [ngrok Documentation](https://ngrok.com/docs)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
