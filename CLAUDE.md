# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

詳細は [README.md](README.md) および [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

## 開発コマンド

### 拡張機能

```bash
# 開発サーバー起動（OAuth関連ファイルを自動コピー）
npm run dev

# 本番ビルド（環境変数チェック + ビルド + ファイルコピー）
npm run build

# OAuth関連ファイルのコピーのみ（通常は不要）
npm run dev:prepare

# クリーンビルド（ビルドエラー時）
rm -rf node_modules .plasmo build
npm install
npm run build
```

### Cloudflare Workers（OAuth バックエンド）

```bash
# Workers開発サーバー起動
cd workers
npm run dev

# Workersデプロイ
npm run deploy

# Workersログ確認
npm run tail
```

**ビルド出力**:
- 開発: `build/chrome-mv3-dev/`
- 本番: `build/chrome-mv3-prod/`

**デバッグ**:
```javascript
// ストレージ内容の確認（開発者ツールのコンソールで実行）
chrome.storage.local.get(null, (data) => console.log(data))

// ストレージのリセット
chrome.storage.local.clear()
```

## プロジェクト構造

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

```
src/
├── popup.tsx              # メインエントリーポイント
├── screens/               # 画面コンポーネント（HomeScreen, SettingsScreenなど）
├── components/            # 再利用可能コンポーネント
├── contents/              # Content Scripts
│   ├── extract-content.ts # ページコンテンツ抽出
│   ├── notion-api-helper.ts # Notion内部API呼び出し（Notion.so上で実行）
│   └── notion-simplify.ts # Notion UI簡略化（www.notion.soでのみ動作）
├── services/              # ビジネスロジック層
│   ├── storage.ts         # Chrome Storage API ラッパー
│   ├── notion.ts          # Notion 公式API (v1) クライアント
│   └── internal-notion.ts # Notion 内部API (v3) クライアント（非推奨・参考用）
├── background/            # Service Worker（OAuth + API呼び出し + Content Script管理）
├── utils/                 # ユーティリティ（oauth.ts）
├── styles/                # スタイルシート
│   ├── global.css         # グローバルスタイル
│   └── notion-custom.css  # Notion UI簡略化用CSS
└── types/                 # TypeScript型定義

assets/
├── oauth-callback.html    # 拡張機能内OAuthコールバックページ
├── oauth-callback.js      # コールバック処理スクリプト
└── icon*.png              # 拡張機能アイコン

oauth-static/              # 静的サイト用OAuthコールバックページ
                          # （Cloudflare Pages等にデプロイ）

workers/                   # Cloudflare Workers OAuth バックエンド
├── src/
│   ├── index.ts           # メインエントリーポイント
│   ├── handlers/          # リクエストハンドラ
│   │   ├── exchange.ts    # トークン交換処理
│   │   └── health.ts      # ヘルスチェック
│   ├── middleware/        # ミドルウェア
│   └── types.ts           # 型定義
└── wrangler.toml          # Workers設定
```

## 重要な設計決定

### 1. ストレージ構造

詳細は [src/services/storage.ts](src/services/storage.ts) を参照。

```typescript
// Chrome Storage Local
{
  'raku-clipboards': Clipboard[],           // クリップボードリスト
  'raku-notion-config': NotionConfig,       // Notion設定
  'raku-initialized': boolean,              // 初期化フラグ
  'raku-ui-simplify-config': UISimplifyConfig // UI簡略化設定
}
```

### 2. 型定義

詳細は [src/types/index.ts](src/types/index.ts) を参照。

主要な型:
- `Clipboard`: クリップボード定義
- `NotionConfig`: Notion認証設定 (OAuth/手動トークン両対応)
- `WebClipData`: Webクリップデータ
- `NotionDatabaseSummary`: 既存データベースの要約情報（タイトル、URL、アイコンなど）
- `UISimplifyConfig`: UI簡略化設定（有効/無効フラグ）

### 3. 画面遷移フロー

```
HomeScreen
  ├─> 📎 このページをクリップ
  │     ├─> (クリップボードが0個) → CreateClipboardScreen
  │     ├─> (クリップボードが1個) → MemoDialog → ClippingProgressScreen → 完了
  │     └─> (クリップボードが複数) → SelectClipboardScreen → MemoDialog → ClippingProgressScreen → 完了
  ├─> ClipboardListScreen (クリップボード一覧を見る)
  │     ├─> 登録済みクリップボード一覧表示
  │     └─> Notionの既存データベース一覧表示（未登録のもののみ）
  │           └─> クリップボードに追加可能
  └─> SettingsScreen (⚙️設定アイコン)
        ├─> Notion UI簡略化（有効/無効切り替え）
        ├─> OAuth認証フロー
        └─> 手動トークン入力
```

**クリップ実行フロー**:
1. ユーザーがクリップボードを選択（または自動選択）
2. MemoDialogでメモを入力（省略可能）
3. ClippingProgressScreenで進行状況を表示
   - 「クリップの準備をしています...」
   - 「ページの情報を取得中...」
   - 「Notionにクリップ中...」
   - 「✓ クリップ完了！」または「✗ クリップ失敗: エラーメッセージ」
4. 成功時は1.5秒後に自動的に閉じる、失敗時は3秒後にホーム画面に戻る

### 4. OAuth認証フロー

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) および [docs/WORKERS_SETUP_GUIDE.md](docs/WORKERS_SETUP_GUIDE.md) を参照。

**重要な設計ポイント**:
- **Cloudflare Workers**を使用したセキュアなトークン交換（CLIENT_SECRETをサーバーサイドで管理）
- stateパラメータに拡張機能IDを埋め込み（Base64: `extensionId:randomToken`）
- CSRF対策: stateパラメータ検証
- CSP対応: インラインスクリプトを外部ファイル（`oauth-callback.js`）に分離
- 環境変数の扱い: OAuth設定はbackgroundで環境変数から直接取得

**認証フロー**:
1. SettingsScreen → `start-oauth` メッセージ → backgroundがOAuth URL生成、`raku-oauth-pending: true`を保存
2. Notion認証画面 → 拡張機能の`oauth-callback.html`にリダイレクト
3. `oauth-callback.js` → Cloudflare Workersにトークン交換リクエスト（code, state, extensionId）
4. Workers → Notionにトークン交換リクエスト（CLIENT_SECRETを使用）、アクセストークンを返却
5. `oauth-callback.js` → backgroundに`complete-oauth`メッセージ（tokenResponseのみ）
6. backgroundが設定保存、`raku-oauth-pending`削除
7. SettingsScreenが`chrome.storage.onChanged`で完了を検出、成功メッセージ表示

### 5. 既存データベース取り込み機能

**機能概要**:
- Notion APIを使用して、ワークスペース内の既存データベース一覧を取得
- まだクリップボードとして登録されていないデータベースのみを表示
- ワンクリックでクリップボードに追加可能

**実装詳細**:
- `NotionService.listDatabases()`: 既存データベース一覧を`NotionDatabaseSummary`型で取得
- `ClipboardListScreen`: 登録済みクリップボードと未登録の既存データベースを分けて表示
- 自動更新: データベース作成/削除時に既存データベースリストを自動更新（`refreshAvailableDatabases`）

### 6. ギャラリービュー自動設定機能

**機能概要**:
- クリップボード（データベース）作成時に、Notion内部API (v3) を使用してギャラリービューを自動追加
- デフォルトのテーブルビューを自動削除し、ギャラリービューのみを表示

**実装詳細**:
- **Content Script経由で内部APIを呼び出し**: Notion.soページ上でCookie認証を利用
- フロー: `Popup → Background → Content Script (notion.so) → Notion Internal API`
- `src/contents/notion-api-helper.ts`: Notion.so上で実行されるContent Script
  - `addGalleryView()`: ギャラリービュー追加＋デフォルトビュー削除
  - `getDatabaseViews()`: ビュー一覧取得
- `src/background/index.ts`: Content Scriptとの仲介
  - `handleAddGalleryViewViaContent()`: ギャラリービュー追加ハンドラ
  - `handleGetDatabaseViewsViaContent()`: ビュー取得ハンドラ
  - `ensureContentScriptInjected()`: Content Scriptの動的注入
- URLから取得したビューIDを使用してデフォルトビューを特定
- URLにビューIDがない場合は、内部APIで取得（10秒待機後）
- 表示プロパティ: URL、メモ
- 内部API失敗時も警告のみで、クリップボード作成は成功とする

**技術的詳細**:
- Popup内のfetchではCookieが送信されないため、Content Script経由で実行
- Notion.soタブがない場合は自動的にバックグラウンドで開いて処理
- 既存タブには動的にContent Scriptを注入（`chrome.scripting.executeScript`）
- manifest.jsonから実際のビルド済みファイル名を取得して注入
- ユーザーID取得: `loadPageChunk`レスポンスからデータベースの親ページの権限情報を解析
- 権限エラー対策: データベース作成直後にビュー操作を実行（権限が正しく設定された状態を利用）

### 7. Notion UI簡略化機能

**機能概要**:
- www.notion.soでのみ動作するContent Scriptを使用してNotionのUIを簡略化
- 設定画面でトグルスイッチによるON/OFF切り替えが可能
- リアルタイム反映（ページ再読み込み不要）

**実装詳細**:
- `src/contents/notion-simplify.ts`: Content Script実装（`document_start`で実行）
- `src/styles/notion-custom.css`: CSS定義（サイドバー・ツールバーの非表示ルール）
- `StorageService.getUISimplifyConfig()` / `saveUISimplifyConfig()`: 設定の読み書き
- `chrome.storage.onChanged`でリアルタイム反映

**非表示にするUI要素**:
- サイドバー: ホーム、検索、設定、ゴミ箱、テンプレート、受信トレイアイコン
- トップバー: 共有、お気に入り、その他ボタン
- AIボタン、サイドバー切り替えボタン、自動化ビューなど

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

詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) を参照してください。

### 新しい画面を追加

1. `src/screens/NewScreen.tsx` を作成
2. `src/types/index.ts` の Screen 型に追加
3. `src/popup.tsx` のルーティングに追加

### 新しいストレージキーを追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加
2. 対応する getter/setter メソッドを追加
3. 型定義を `src/types/index.ts` に追加

### OAuth認証のデバッグ

**デバッグログ確認箇所**:
- **Service Worker**: chrome://extensions/ → 拡張機能の詳細 → Service Worker → `[Background]` プレフィックス付きログ
- **コールバックページ**: OAuth認証後の`oauth-callback.html`でF12 → `[OAuth Callback]` プレフィックス付きログ
- **設定画面**: 拡張機能ポップアップでF12 → `[Settings]` プレフィックス付きログ
- **Cloudflare Workers**: `cd workers && npm run tail` → リアルタイムログ確認

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) および [docs/WORKERS_SETUP_GUIDE.md](docs/WORKERS_SETUP_GUIDE.md) のトラブルシューティングセクションを参照。

### Cloudflare Workersのデプロイ

OAuth認証を本番環境で使用する場合は、Cloudflare Workersのデプロイが必要です。

1. `cd workers && npm install`
2. `wrangler login` （Cloudflareアカウントでログイン）
3. Secretsの設定:
   ```bash
   wrangler secret put NOTION_CLIENT_ID
   wrangler secret put NOTION_CLIENT_SECRET
   # 本番環境のみ: wrangler secret put ALLOWED_ORIGINS
   ```
4. デプロイ: `npm run deploy`
5. 表示されたWorkers URLを[assets/oauth-callback.js](assets/oauth-callback.js)に設定

詳細は [docs/WORKERS_SETUP_GUIDE.md](docs/WORKERS_SETUP_GUIDE.md) を参照。

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
   - **Cloudflare Workers**を使用したセキュアなトークン交換
   - CLIENT_SECRETはWorkers Secretsで暗号化保存（クライアントサイドへの露出なし）
   - 環境変数設定: `.env`ファイルにClient ID/Redirect URIを記述
   - redirect_uriは**完全一致**が必須（Notion Integration設定、`.env`ファイル）
   - 詳細: [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md)、[docs/WORKERS_SETUP_GUIDE.md](docs/WORKERS_SETUP_GUIDE.md)

2. **手動トークン入力** (開発・テスト推奨)
   - Internal Integrationを使用
   - セットアップが簡単（5分で完了）
   - 詳細: [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md)

#### API呼び出し方法

```typescript
// Background経由（推奨）
chrome.runtime.sendMessage({
  type: 'clip-page',
  data: { title, url, databaseId }
})

// 直接呼び出し（popup内、必要な場合のみ）
import { createNotionClient } from '~services/notion'
const config = await StorageService.getNotionConfig()
const client = createNotionClient(config)
await client.createWebClip({ title, url, databaseId })
```

## 参考資料

- [README.md](README.md) - プロジェクト説明と使い方
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - アーキテクチャの詳細
- [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) - OAuth設定ガイド
- [docs/WORKERS_SETUP_GUIDE.md](docs/WORKERS_SETUP_GUIDE.md) - Cloudflare Workersセットアップガイド
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - 開発ガイド
- [workers/README.md](workers/README.md) - Workers API仕様
- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)

---

**バージョン**: 1.0.4
**最終更新**: 2025-12-19
