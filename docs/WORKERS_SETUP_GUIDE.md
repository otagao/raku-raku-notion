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

#### 4.1 Notion Client ID（必須）

```bash
wrangler secret put NOTION_CLIENT_ID
```

プロンプトが表示されたら、Notion IntegrationのClient IDを入力してください。

#### 4.2 Notion Client Secret（必須）

```bash
wrangler secret put NOTION_CLIENT_SECRET
```

プロンプトが表示されたら、Notion IntegrationのClient Secretを入力してください。

⚠️ **重要**: このSecretは暗号化されて保存され、コードやログに表示されません。

#### 4.3 許可するOrigin（本番環境のみ推奨）

```bash
wrangler secret put ALLOWED_ORIGINS
```

プロンプトが表示されたら、許可するOriginを入力してください。

**開発中の注意:**
- 開発中は拡張機能IDが頻繁に変わるため、`ALLOWED_ORIGINS`を**未設定**にすることを推奨します
- 未設定の場合、全てのOriginからのリクエストを許可します（CORS: `*`）
- 本番環境では必ず設定してください

**本番環境の例:**
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

### State検証エラー

**症状:** `State parameter mismatch. Possible CSRF attack.`エラー

**解決策:**
1. OAuth認証開始から完了までブラウザを閉じない
2. Chrome Storageをリセット: chrome://extensions/ → 拡張機能の詳細 → ストレージをクリア
3. 再度OAuth認証を試行

### トークン交換失敗

**症状:** `Token exchange failed`エラー

**解決策:**
1. Notion Client IDとSecretが正しいか確認
2. redirect_uriがNotionの設定と一致しているか確認
3. Workersログを確認: `npm run tail`

### CORS エラー

**症状:** ブラウザコンソールでCORSエラー

**解決策:**
- **開発中**: `ALLOWED_ORIGINS`を未設定のままにする（自動的に`*`が設定される）
- **本番環境**: 以下を実行
  ```bash
  wrangler secret put ALLOWED_ORIGINS
  # chrome-extension://your-extension-id を入力
  ```

## セキュリティのベストプラクティス

1. **CLIENT_SECRETの保護**
   - 絶対にコードにハードコードしない
   - Wrangler Secretsのみで管理

2. **State パラメータによるCSRF対策**
   - 拡張機能側でランダムなstateトークンを生成
   - Chrome Storageに保存して検証
   - リクエストごとに新しいstateを生成

3. **本番環境でのCORS制限**
   - 開発中は`ALLOWED_ORIGINS`未設定でOK
   - 本番デプロイ時は必ず設定して特定のOriginのみ許可

4. **定期的なログ確認**
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
