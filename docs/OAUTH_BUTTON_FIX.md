# OAuth認証ボタングレーアウト問題の修正

## 問題の概要

一部のテスターから、拡張機能導入後にOAuth認証ボタンが最初からグレーアウトしていて押下できないとの報告を受けました。

## 原因分析

ボタンが無効化される条件：
```typescript
disabled={isLoading || !oauthConfig.clientId}
```

考えられる原因：
1. **環境変数の未埋め込み**：ビルド時に`.env`ファイルが読み込まれず、CLIENT_IDが空になっている
2. **OAuth処理中フラグのスタック**：前回のOAuth認証が途中で失敗し、`raku-oauth-pending`フラグが残っている
3. **ローディング状態の不整合**：何らかの理由で`isLoading`がtrueのままになっている

## 実装した修正

### 1. デバッグログの追加

**目的**：問題発生時に開発者ツールで原因を特定できるようにする

**場所**：[src/screens/SettingsScreen.tsx](../src/screens/SettingsScreen.tsx)

```typescript
// OAuth設定の読み込み状態をログ出力
console.log('[Settings] OAuth Config Debug:', {
  clientId: oauthConfig.clientId ? `${oauthConfig.clientId.substring(0, 8)}...` : 'MISSING',
  clientSecret: oauthConfig.clientSecret ? 'present' : 'MISSING',
  redirectUri: oauthConfig.redirectUri
})

// ストレージの状態をログ出力
console.log('[Settings] Storage Debug:', {
  oauthPending: storage['raku-oauth-pending'],
  configExists: !!storage['raku-notion-config']
})
```

### 2. OAuth処理中フラグの自動クリーンアップ

**目的**：スタック状態を自動的に解消し、ボタンを押せるようにする

**場所**：[src/screens/SettingsScreen.tsx](../src/screens/SettingsScreen.tsx)

```typescript
// OAuth処理中フラグが残っている場合は削除
if (storage['raku-oauth-pending']) {
  console.log('[Settings] WARNING: OAuth pending flag is stuck. Clearing it...')
  await chrome.storage.local.remove('raku-oauth-pending')
}
```

### 3. 環境変数のフォールバック処理

**目的**：popupで環境変数が取得できない場合、backgroundから取得する

**場所**：
- [src/screens/SettingsScreen.tsx](../src/screens/SettingsScreen.tsx)
- [src/background/index.ts](../src/background/index.ts)

**Settings側（リクエスト）**：
```typescript
// まず環境変数から取得
let config: NotionOAuthConfig = {
  clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
  clientSecret: process.env.PLASMO_PUBLIC_NOTION_CLIENT_SECRET || '',
  redirectUri: process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'
}

// 環境変数が空の場合、backgroundから取得を試みる
if (!config.clientId) {
  console.log('[Settings] OAuth config not found in environment, requesting from background...')
  const response = await chrome.runtime.sendMessage({ type: 'get-oauth-config' })
  if (response?.success && response.config) {
    config = response.config
  }
}
```

**Background側（レスポンス）**：
```typescript
case "get-oauth-config":
  await handleGetOAuthConfig(sendResponse)
  break

// ハンドラ実装
async function handleGetOAuthConfig(sendResponse: (response?: any) => void) {
  const config: NotionOAuthConfig = {
    clientId: process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID || '',
    clientSecret: process.env.PLASMO_PUBLIC_NOTION_CLIENT_SECRET || '',
    redirectUri: process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI || 'https://raku-raku-notion.pages.dev/callback.html'
  }

  sendResponse({ success: true, config })
}
```

### 4. ユーザー向けエラーメッセージ

**目的**：CLIENT_IDが未設定の場合、明確なエラーメッセージを表示する

**場所**：[src/screens/SettingsScreen.tsx](../src/screens/SettingsScreen.tsx)

```typescript
{(!oauthConfig.clientId) && (
  <div style={{
    padding: '12px',
    marginTop: '12px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
    fontSize: '14px'
  }}>
    ⚠️ OAuth設定が未構成です。開発者に連絡してください。<br />
    <small>（CLIENT_IDが設定されていません）</small>
  </div>
)}
```

## テスト方法

### 1. 正常なビルドの確認

```bash
# ビルド実行
npm run build

# 環境変数が埋め込まれているか確認
grep -o "2bbd872b-594c-8029-8417-0037f4018351" build/chrome-mv3-prod/popup.*.js
# → CLIENT_IDが表示されればOK

grep -o "2bbd872b-594c-8029-8417-0037f4018351" build/chrome-mv3-prod/static/background/*.js
# → CLIENT_IDが表示されればOK
```

### 2. デバッグログの確認

1. 拡張機能をインストール
2. 設定画面を開く
3. F12で開発者ツールを開く
4. コンソールで以下のログを確認：
   - `[Settings] OAuth Config Debug:` - OAuth設定の状態
   - `[Settings] Storage Debug:` - ストレージの状態

### 3. 問題再現時の確認手順

ボタンがグレーアウトしている場合：

1. **開発者ツールのコンソールを確認**
   - `clientId: 'MISSING'` → 環境変数の問題
   - `oauthPending: true` → 処理中フラグのスタック（自動クリーンアップされるはず）

2. **ストレージを手動確認**
   ```javascript
   chrome.storage.local.get(null, (data) => console.log(data))
   ```

3. **ストレージを手動リセット**（最終手段）
   ```javascript
   chrome.storage.local.clear()
   ```

## ビルド時の注意事項

### 必ず`.env`ファイルが存在することを確認

```bash
# .envファイルの存在確認
ls -la .env

# 内容確認（CLIENT_IDが設定されているか）
cat .env | grep PLASMO_PUBLIC_NOTION_CLIENT_ID
```

### ビルドログで環境変数の読み込みを確認

```bash
npm run build
# ログに以下が表示されることを確認：
# 🔵 INFO   | Loaded environment variables from: [ '.env' ]
```

### 配布前のチェックリスト

- [ ] `.env`ファイルが存在する
- [ ] ビルドログで環境変数の読み込みが確認できる
- [ ] ビルド済みファイルにCLIENT_IDが埋め込まれている（上記コマンドで確認）
- [ ] 設定画面でOAuth認証ボタンが有効になっている
- [ ] コンソールログで`clientId: 'present'`または`clientId: '2bbd872b...'`が表示される

## 今後の改善案

### オプション1: ビルド時の環境変数チェック

`package.json`のビルドスクリプトに環境変数チェックを追加：

```json
{
  "scripts": {
    "prebuild": "node scripts/check-env.js",
    "build": "plasmo build && node scripts/copy-oauth-files.js"
  }
}
```

`scripts/check-env.js`:
```javascript
if (!process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID) {
  console.error('ERROR: PLASMO_PUBLIC_NOTION_CLIENT_ID is not set in .env file')
  process.exit(1)
}
```

### オプション2: ランタイムでの環境変数取得

環境変数をビルド時に埋め込むのではなく、ランタイムで外部ファイル（`config.json`など）から読み込む方式。ただし、CLIENT_SECRETの露出に注意が必要。

## 関連ドキュメント

- [OAuth設定ガイド](OAUTH_SETUP_GUIDE.md)
- [OAuth修正履歴（アーカイブ）](OAUTH_FIX.md)
- [プロジェクト概要](../CLAUDE.md)

---

**修正日**: 2025-12-02
**バージョン**: 1.0.2+
**対応者**: Claude Code
