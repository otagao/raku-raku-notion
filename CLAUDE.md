# CLAUDE.md - AI開発コンテキスト

このドキュメントは、Claude CodeやGitHub Copilotなどの AI開発アシスタントがプロジェクトのコンテキストを理解するためのものです。

## 応答・コーディングに関する重要事項

- ユーザーに対しては日本語で応答し、コミットメッセージも日本語で記述してください。
- ユーザーは慣れない開発言語を用いることが想定されるため、指示に対して技術的に実装不可能な点や矛盾した点を見つけた場合はなるべく早く指摘してください。
- 人間の可読性を重視し、可能な限りモジュール化して開発を進めてください。
- CLAUDE.mdには細かな手順や更新履歴を追記しないでください。本当に重要なフローのみを追加するようにし、そのほかはdocs/以下のドキュメントに記述・適宜参照してください。
- バージョニングは勝手に切らないでください。また、バージョンを更新する際はpackage-lock.jsonなどの記述も正しく反映させてください。

## プロジェクト概要

**Raku Raku Notion** は、Notionのウェブクリップ機能を簡略化したブラウザ拡張機能です。

### 技術スタック

- **フレームワーク**: Plasmo v0.90.5 (ブラウザ拡張機能フレームワーク)
- **UI**: React 18.3.1 + TypeScript 5.9.3
- **ターゲット**: Chrome/Edge (Manifest V3)
- **ストレージ**: Chrome Storage API
- **API連携**: Notion API (OAuth 2.0 + 手動トークン対応)

### 開発状況

**現在のフェーズ**: Phase 3 完了 - Webクリップ機能拡張完了

詳細な機能一覧と使い方は [README.md](README.md) を参照してください。

## プロジェクト構造

```
raku-raku-notion/
├── src/
│   ├── popup.tsx              # メインエントリーポイント
│   ├── screens/               # 画面コンポーネント
│   ├── components/            # 再利用可能コンポーネント
│   ├── contents/              # Content Scripts (コンテンツ抽出)
│   ├── services/              # ビジネスロジック (storage, notion)
│   ├── background/            # Service Worker (OAuth + API)
│   ├── utils/                 # ユーティリティ (oauth.ts)
│   ├── types/                 # TypeScript型定義
│   └── styles/                # グローバルCSS
├── assets/
│   ├── oauth-callback.html    # 拡張機能内OAuthコールバックページ
│   ├── oauth-callback.js      # コールバックページのスクリプト
│   └── icon*.png              # 拡張機能アイコン
├── oauth-static/              # 静的サイト用OAuthコールバックページ
├── docs/                      # ドキュメント
│   ├── OAUTH_SETUP_GUIDE.md  # OAuth設定ガイド
│   └── OAUTH_FIX.md          # OAuth修正履歴（アーカイブ）
├── package.json               # マニフェスト設定
└── .env                       # 環境変数（OAuth設定）
```

## 重要な設計決定

### 1. ストレージ構造

詳細は [src/services/storage.ts](src/services/storage.ts) を参照。

```typescript
// Chrome Storage Local
{
  'raku-clipboards': Clipboard[],     // クリップボードリスト
  'raku-notion-config': NotionConfig, // Notion設定
  'raku-initialized': boolean         // 初期化フラグ
}
```

### 2. 型定義

詳細は [src/types/index.ts](src/types/index.ts) を参照。

主要な型:
- `Clipboard`: クリップボード定義
- `NotionConfig`: Notion認証設定 (OAuth/手動トークン両対応)
- `WebClipData`: Webクリップデータ

### 3. 画面遷移フロー

```
HomeScreen
  ├─> 📎 このページをクリップ
  │     ├─> (クリップボードが0個) → CreateClipboardScreen
  │     ├─> (クリップボードが1個) → 自動クリップ → 完了
  │     └─> (クリップボードが複数) → SelectClipboardScreen → クリップ → 完了
  ├─> ClipboardListScreen (クリップボード一覧を見る)
  └─> SettingsScreen (⚙️設定アイコン)
        ├─> OAuth認証フロー
        └─> 手動トークン入力
```

### 4. OAuth認証フロー

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) を参照。

**重要な設計ポイント**:
- 静的サイトホスティング（Cloudflare Pages等）を使用
- stateパラメータに拡張機能IDを埋め込み（CSRF対策）
- ローカルサーバー不要（旧実装のoauth-server.jsは削除済み）

**認証フロー**:
1. SettingsScreen → `start-oauth` メッセージ → backgroundがOAuth URL生成
2. Notion認証画面 → 静的サイトの`callback.html` → 拡張機能の`oauth-callback.html`
3. backgroundが`complete-oauth`でトークン交換 → 設定画面に「接続済み」表示

## コーディング規約

### TypeScript

- Strict mode 有効
- 明示的な型定義を推奨
- `any` の使用を避ける
- Optional chaining (`?.`) を積極的に使用

### React

- 関数コンポーネント + Hooks
- Props の interface を明示的に定義

### ファイル命名

- コンポーネント: PascalCase (例: `HomeScreen.tsx`)
- ユーティリティ: camelCase (例: `storage.ts`)

### CSS

- グローバルスタイル: `global.css`
- クラス名: kebab-case

## よくある開発タスク

### 新しい画面を追加

1. `src/screens/NewScreen.tsx` を作成
2. `src/types/index.ts` の Screen 型に追加
3. `src/popup.tsx` のルーティングに追加

### 新しいストレージキーを追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加
2. 対応する getter/setter メソッドを追加
3. 型定義を `src/types/index.ts` に追加

## デバッグ方法

### ストレージ操作

```javascript
// ストレージ内容の確認
chrome.storage.local.get(null, (data) => console.log(data))

// ストレージのリセット
chrome.storage.local.clear()

// またはリセット関数使用
import('./services/storage').then(({ StorageService }) => {
  StorageService.resetStorage()
})
```

### OAuth認証のデバッグ

```bash
npm run dev  # 拡張機能開発サーバー起動
```

**デバッグログ確認**:
- **静的コールバックページ**: ブラウザのコンソールで `[OAuth Callback]` プレフィックス付きログ
- **背景スクリプト**: chrome://extensions/ → 拡張機能の詳細 → Service Worker → `[Background]` プレフィックス付きログ

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) のトラブルシューティングセクションを参照。

### ビルドエラー時

```bash
# クリーンビルド
rm -rf node_modules .plasmo build
npm install
npm run build  # 本番ビルド
# または
npm run dev  # 開発モード（自動的にOAuthファイルをコピー）
```

## 既知の問題と解決履歴

### 主要な解決済み問題

- ✅ OAuth chrome-extension:// スキーム制限 → 静的サイトホスティングで解決
- ✅ OAuth redirect URI不一致 → 環境変数に統一して解決
- ✅ ローカルサーバー依存 → oauth-server.js削除、静的サイトに統一
- ✅ 認証方式切り替え時のUI不具合 → 自動リセット処理追加で解決
- ✅ OAuth認証時の無限ローディング（初回） → CSP違反解消で解決
- ✅ 環境変数未読み込みエラー → 環境変数から直接取得に変更
- ✅ 本番ビルドコールバック404エラー → web_accessible_resourcesにJS追加で解決
- ✅ OAuth認証開始時の無限ローディング（再発） → ローディング状態管理改善で解決
- ✅ Windowsビルドでのファイルコピー失敗 → クロスプラットフォーム対応スクリプトで解決

詳細は [docs/OAUTH_FIX.md](docs/OAUTH_FIX.md)（アーカイブ）を参照。

## 開発者向けメモ

### Plasmo特有の仕様

- `~` エイリアスは `src/` ディレクトリを指す
- マニフェスト設定は `package.json` の `manifest` フィールドに記述
- ビルド出力: `build/chrome-mv3-dev/` (開発) / `build/chrome-mv3-prod/` (本番)

### Chrome Storage API

- 容量制限: 5MB (local), 100KB (sync)
- 非同期APIなので async/await を使用
- Date オブジェクトは文字列として保存される

### Notion API統合

本プロジェクトは2つの認証方式に対応:

1. **OAuth認証** (本番環境推奨)
   - `NotionConfig.authMethod = 'oauth'`
   - 静的サイトホスティング（Cloudflare Pages等）が必要
   - 詳細: [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md)

2. **手動トークン入力** (開発・テスト推奨)
   - `NotionConfig.authMethod = 'manual'`
   - Internal Integrationを使用

#### API呼び出し方法

```typescript
// 方法1: 直接呼び出し (popup内)
import { createNotionClient } from '~services/notion'
const config = await StorageService.getNotionConfig()
const client = createNotionClient(config)
await client.createWebClip({ title, url, databaseId })

// 方法2: Background経由 (推奨)
chrome.runtime.sendMessage({
  type: 'clip-page',
  data: { title, url, databaseId }
})
```

#### OAuth設定の概要

```bash
# 1. oauth-static/を静的サイトにデプロイ
# 2. .envファイルを作成
cp .env.example .env

# 3. 環境変数を設定
PLASMO_PUBLIC_NOTION_CLIENT_ID=your_client_id
PLASMO_PUBLIC_NOTION_CLIENT_SECRET=your_client_secret
PLASMO_PUBLIC_OAUTH_REDIRECT_URI=https://your-domain.com/callback.html

# 4. ビルド
npm run build
```

**重要**: redirect_uriは以下の3箇所で**完全一致**が必要:
- Notion Integration設定
- `.env`ファイル
- 静的サイトのファイル名

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) を参照。

## 参考資料

- [README.md](README.md) - プロジェクト説明と使い方
- [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) - OAuth設定ガイド
- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)

## OAuth認証の実装詳細

### コールバックフロー

1. **ユーザーが認証開始**
   - SettingsScreen → `start-oauth` メッセージ
   - Background: OAuth URLを生成し、Notion認証ページを開く
   - `raku-oauth-pending: true` をストレージに保存

2. **Notion認証完了**
   - Notion → 静的サイトの `callback.html`
   - `callback.html`: stateからextension IDを抽出
   - リダイレクト: `chrome-extension://{extensionId}/oauth-callback.html`

3. **拡張機能でトークン交換**
   - `oauth-callback.js`: `complete-oauth` メッセージを送信（codeとstateのみ）
   - Background: 環境変数からOAuth設定を取得
   - Background: トークン交換、設定保存、`raku-oauth-pending` 削除

4. **設定画面で完了検出**
   - SettingsScreen: `chrome.storage.onChanged` で `raku-oauth-pending` 削除を検出
   - 自動的に設定をリロード
   - 成功メッセージを表示

### 重要な設計判断

- **CSP対応**: インラインスクリプトを外部ファイル（`oauth-callback.js`）に分離
- **環境変数の扱い**: oauthConfigはbackgroundで環境変数から直接取得（コールバックから送信しない）
- **ビルドプロセス**: `assets/oauth-callback.*` を `build/` に手動コピー（Plasmoの制限回避）

---

**最終更新**: 2025-12-02
**バージョン**: 1.0.2
**メンテナー**: Claude Code
