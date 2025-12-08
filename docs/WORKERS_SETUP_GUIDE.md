# Cloudflare Workers セットアップガイド

このガイドでは、Raku Raku NotionのOAuth認証バックエンドをCloudflare Workersにデプロイする方法を説明します。

## 前提条件

- Cloudflareアカウント（無料）
- Node.js 18以上
- wrangler CLI

## セットアップ手順

### ステップ1: wranglerのインストール

```bash
npm install -g wrangler
```

### ステップ2: Cloudflareにログイン

```bash
wrangler login
```

ブラウザが開き、Cloudflareアカウントでの認証が求められます。

### ステップ3: Workersプロジェクトの準備

```bash
cd workers
npm install
```

### ステップ4: 環境変数（Secrets）の設定

#### 4.1 Notion Client ID

```bash
wrangler secret put NOTION_CLIENT_ID
```

プロンプトが表示されたら、Notion IntegrationのClient IDを入力してください。

#### 4.2 Notion Client Secret

```bash
wrangler secret put NOTION_CLIENT_SECRET
```

プロンプトが表示されたら、Notion IntegrationのClient Secretを入力してください。

⚠️ **重要**: このSecretは暗号化されて保存され、コードやログに表示されません。

#### 4.3 許可する拡張機能ID

```bash
wrangler secret put ALLOWED_EXTENSION_IDS
```

プロンプトが表示されたら、許可する拡張機能IDをカンマ区切りで入力してください。

**例:**
```
development-ext-id,production-ext-id
```

**拡張機能IDの確認方法:**
1. Chrome拡張機能管理画面（`chrome://extensions/`）を開く
2. 開発者モードをONにする
3. 拡張機能のIDをコピー

#### 4.4 許可するOrigin（CORS用）

```bash
wrangler secret put ALLOWED_ORIGINS
```

プロンプトが表示されたら、許可するOriginを入力してください。

**例:**
```
chrome-extension://your-extension-id
```

### ステップ5: ローカルテスト

```bash
npm run dev
```

`http://localhost:8787`でローカルサーバーが起動します。

**ヘルスチェックテスト:**
```bash
curl http://localhost:8787/health
```

### ステップ6: 本番デプロイ

```bash
npm run deploy
```

デプロイが完了すると、WorkersのURLが表示されます：
```
https://raku-raku-notion-oauth.your-account.workers.dev
```

このURLを控えておいてください。拡張機能の設定で使用します。

### ステップ7: 拡張機能側の設定

デプロイしたWorkers URLを拡張機能のコードに設定します。

[assets/oauth-callback.js](../assets/oauth-callback.js) の26行目を編集：

```javascript
const workerUrl = 'https://raku-raku-notion-oauth.YOUR-ACCOUNT.workers.dev'
```

### ステップ8: 動作確認

1. 拡張機能をビルド: `npm run build`
2. Chrome拡張機能管理画面で拡張機能を再読み込み
3. OAuth認証をテスト
4. Workersのログを確認: `npm run tail`

## トラブルシューティング

### Extension ID検証エラー

**症状:** `Unauthorized extension`エラー

**解決策:**
```bash
# 現在の拡張機能IDを確認
# chrome://extensions/ で確認

# Secretsを更新
wrangler secret put ALLOWED_EXTENSION_IDS
# 正しいIDを入力（カンマ区切りで複数可）
```

### トークン交換失敗

**症状:** `Token exchange failed`エラー

**解決策:**
1. Notion Client IDとSecretが正しいか確認
2. redirect_uriがNotionの設定と一致しているか確認
3. Workersログを確認: `npm run tail`

### CORS エラー

**症状:** ブラウザコンソールでCORSエラー

**解決策:**
```bash
wrangler secret put ALLOWED_ORIGINS
# chrome-extension://your-extension-id を入力
```

## セキュリティのベストプラクティス

1. **CLIENT_SECRETの保護**
   - 絶対にコードにハードコードしない
   - Wrangler Secretsのみで管理

2. **Extension IDの厳格な管理**
   - 本番環境では本番IDのみを許可
   - 開発環境と本番環境で異なるWorkers環境を使用することを推奨

3. **定期的なログ確認**
   ```bash
   npm run tail
   ```
   異常なリクエストパターンを監視

## コスト管理

Cloudflare Workers Free Tier:
- **リクエスト**: 100,000/日
- **CPU時間**: 10ms/リクエスト

OAuth認証は低頻度（ユーザーあたり初回1回）なため、無料枠内で十分運用可能です。

## 次のステップ

Workersのデプロイが完了したら、[CLAUDE.md](../CLAUDE.md)を参照して拡張機能の開発を続けてください。
