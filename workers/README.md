# Raku Raku Notion - OAuth Worker

CloudflareWorkersを使用したOAuth認証バックエンドプロキシ。

## 概要

このWorkerは、Raku Raku Notion拡張機能のOAuth認証フローにおいて、セキュアなトークン交換を提供します。CLIENT_SECRETをサーバーサイドで管理することで、クライアントサイドへの露出を防ぎます。

## セットアップ

### 1. 依存関係のインストール

```bash
cd workers
npm install
```

### 2. 環境変数の設定

Cloudflare Workers Secretsとして以下を設定：

```bash
wrangler secret put NOTION_CLIENT_ID
# Notion Client IDを入力

wrangler secret put NOTION_CLIENT_SECRET
# Notion Client Secretを入力

wrangler secret put ALLOWED_EXTENSION_IDS
# 許可する拡張機能ID（カンマ区切り）を入力
# 例: chrome-ext-id-1,chrome-ext-id-2

wrangler secret put ALLOWED_ORIGINS
# CORS用の許可Origin（カンマ区切り）を入力
# 例: chrome-extension://your-extension-id
```

### 3. ローカル開発

```bash
npm run dev
# http://localhost:8787 で起動
```

### 4. デプロイ

```bash
npm run deploy
```

## エンドポイント

### `POST /api/oauth/exchange`

OAuth認証コードをアクセストークンに交換します。

**リクエスト:**
```json
{
  "code": "notion-auth-code",
  "state": "base64-encoded-state",
  "extensionId": "chrome-extension-id"
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "access_token": "notion-access-token",
  "bot_id": "bot-id",
  "workspace_id": "workspace-id",
  "workspace_name": "Workspace Name"
}
```

**セキュリティ:**
- Extension ID検証（Allow-list）
- State検証（CSRF対策）
- CORS制限

### `GET /health`

ヘルスチェックエンドポイント。

**レスポンス:**
```json
{
  "status": "ok",
  "service": "raku-raku-notion-oauth",
  "timestamp": "2025-12-02T..."
}
```

## ログ確認

```bash
npm run tail
# リアルタイムでログを表示
```

## トラブルシューティング

### Extension ID検証エラー

`ALLOWED_EXTENSION_IDS`に拡張機能IDが登録されていることを確認してください。

```bash
wrangler secret put ALLOWED_EXTENSION_IDS
# 開発版と本番版のIDを両方登録
```

### CORS エラー

`ALLOWED_ORIGINS`が正しく設定されていることを確認してください。

```bash
wrangler secret put ALLOWED_ORIGINS
# chrome-extension://your-extension-id
```

## セキュリティ考慮事項

- CLIENT_SECRETはCloudflare Workers Secretsで暗号化保存
- Extension ID二段階検証（Allow-list + State内ID）
- CSRF対策（State検証）
- CORS制限

## コスト

Cloudflare Workers Free Tier:
- 100,000リクエスト/日
- OAuth認証は低頻度なため、無料枠内で運用可能
