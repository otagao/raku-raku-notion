# CLAUDE.md - AI開発コンテキスト

このドキュメントは、Claude CodeやGitHub Copilotなどの AI開発アシスタントがプロジェクトのコンテキストを理解するためのものです。

## 応答・コーディングに関する重要事項

- ユーザーに対しては日本語で応答し、コミットメッセージも日本語で記述してください。
- ユーザーは慣れない開発言語を用いることが想定されるため、指示に対して技術的に実装不可能な点や矛盾した点を見つけた場合はなるべく早く指摘してください。
- 人間の可読性を重視し、可能な限りモジュール化して開発を進めてください。

## プロジェクト概要

**Raku Raku Notion** は、Notionのウェブクリップ機能を簡略化したブラウザ拡張機能です。ユーザーがウェブページの情報を素早くNotionに保存できるように設計されています。

### 技術スタック

- **フレームワーク**: Plasmo v0.90.5 (ブラウザ拡張機能フレームワーク)
- **UI**: React 18.3.1 + TypeScript 5.9.3
- **ターゲット**: Chrome/Edge (Manifest V3)
- **ストレージ**: Chrome Storage API
- **将来実装**: Notion API連携

### 開発状況

**現在のフェーズ**: Phase 2 完了 - Notion API統合 (OAuth認証完全対応)

#### 実装済み機能 ✅

1. **基本UI構造**
   - ホーム画面 ([HomeScreen.tsx](src/screens/HomeScreen.tsx)) - 設定画面へのアクセス追加
   - フォーム作成画面 ([CreateFormScreen.tsx](src/screens/CreateFormScreen.tsx))
   - フォーム一覧画面 ([FormListScreen.tsx](src/screens/FormListScreen.tsx))
   - デモページ ([DemoScreen.tsx](src/screens/DemoScreen.tsx))
   - 設定画面 ([SettingsScreen.tsx](src/screens/SettingsScreen.tsx)) - 固定幅400px対応 🆕

2. **データ永続化**
   - Chrome Storage API統合 ([storage.ts](src/services/storage.ts))
   - フォームの作成・保存・取得
   - モックデータの初期化システム
   - タブ情報取得ユーティリティ (`getCurrentTabInfo()`)

3. **Notion OAuth認証** 🆕 (完全動作確認済み)
   - OAuth 2.0認証フロー実装 ([oauth.ts](src/utils/oauth.ts))
   - 認証URL生成、stateパラメータ生成（CSRF対策）
   - 認証コードのトークン交換
   - localhostサーバー経由のOAuthコールバック ([oauth-server.js](oauth-server.js))
   - 拡張機能ID管理システム (外部ページ→拡張機能通信対応)
   - chrome.runtime.onMessageExternal リスナー実装
   - トークン有効性チェック機能

4. **OAuth開発サーバー** 🆕
   - Node.js HTTP サーバー ([oauth-server.js](oauth-server.js))
   - ポート: 3000
   - エンドポイント:
     - `/oauth/callback` - Notion OAuth リダイレクト先
     - `/api/set-extension-id` - 拡張機能ID保存
     - `/api/extension-id` - 拡張機能ID取得
   - deprecation警告修正 (url.parse → URL constructor)

5. **Notion API統合** 🆕
   - Notion API クライアント実装 ([notion.ts](src/services/notion.ts))
   - ページ作成API (`createPage()`)
   - 接続テスト (`testConnection()`)
   - トークン検証 (`validateToken()`)
   - データベース一覧取得 (`listDatabases()`)
   - データベーススキーマ取得 (`getDatabaseSchema()`)
   - OAuth認証と手動トークン入力の両対応

6. **設定UI** 🆕
   - OAuth/手動トークン選択
   - Notion認証ボタン (OAuthサーバー起動確認付き)
   - データベース一覧表示・選択
   - 接続状態表示
   - 連携解除機能
   - レスポンシブデザイン (固定幅400px)

7. **Background Service Worker** 🆕
   - メッセージベースのAPI呼び出しハンドラ ([background/index.ts](src/background/index.ts))
   - 内部メッセージリスナー (`chrome.runtime.onMessage`)
   - 外部メッセージリスナー (`chrome.runtime.onMessageExternal`) - localhost通信対応
   - `send-to-notion`: Notionページ作成
   - `test-notion-connection`: 接続テスト
   - `list-databases`: データベース一覧取得
   - `start-oauth`: OAuth認証開始
   - `complete-oauth`: OAuth認証完了・トークン交換
   - 詳細なデバッグログ実装

8. **モック機能**
   - 初回起動時に2つのデモフォームを自動配置
   - targetURLを持つフォームは新しいタブでURLを開く
   - DEMOバッジでモックフォームを視覚的に識別

9. **開発ツール**
   - `resetStorage()`: ストレージをクリアして再初期化
   - `debugStorage()`: ストレージ内容をコンソールに出力
   - 環境変数サポート (.env)
   - OAuth開発サーバー (`npm run oauth-server`)
   - 統合開発環境 (`npm run dev:full` - 拡張機能 + OAuthサーバー同時起動)

#### 未実装機能 🚧

1. **フォームからのNotion送信** (優先度: 高)
   - フォーム入力画面の実装
   - Notion送信ボタンとロジック
   - 送信成功/失敗のフィードバック

2. **フォームフィールドのカスタマイズ** (優先度: 高)
   - テキスト、テキストエリア、選択肢、チェックボックス
   - 必須項目の設定
   - 型定義は準備済み (FormField interface)

3. **コンテンツスクリプト機能** (優先度: 中)
   - 選択テキストの取得
   - スクリーンショット機能
   - ページメタデータの自動抽出

4. **高度な機能** (優先度: 低)
   - タグ・カテゴリ管理
   - ショートカットキー対応
   - フォームのエクスポート/インポート

## プロジェクト構造

```
raku-raku-notion/
├── src/
│   ├── popup.tsx              # メインエントリーポイント (画面ルーティング)
│   ├── screens/               # 画面コンポーネント
│   │   ├── HomeScreen.tsx    # 初期画面 (フォーム一覧/作成への導線)
│   │   ├── CreateFormScreen.tsx  # フォーム作成フォーム
│   │   ├── FormListScreen.tsx    # フォーム一覧 + URL遷移ロジック
│   │   ├── SettingsScreen.tsx    # Notion設定画面 (OAuth/手動トークン)
│   │   └── DemoScreen.tsx    # プレースホルダー画面
│   ├── services/              # ビジネスロジック層
│   │   ├── storage.ts        # Chrome Storage API ラッパー + タブ情報取得
│   │   └── notion.ts         # Notion API クライアント (OAuth対応)
│   ├── background/            # バックグラウンドスクリプト
│   │   └── index.ts          # Service Worker (OAuth + API呼び出し)
│   ├── utils/                 # ユーティリティ関数
│   │   └── oauth.ts          # OAuth認証ヘルパー関数
│   ├── types/                 # TypeScript型定義
│   │   └── index.ts          # Form, NotionConfig, NotionOAuthConfig など
│   ├── styles/                # グローバルCSS
│   │   └── global.css        # Notionスタイルを参考にしたデザイン
│   └── components/            # 再利用可能コンポーネント (未使用)
├── assets/
│   ├── icon.png              # 拡張機能アイコン (512x512)
│   └── ICON_SETUP.md         # アイコン作成ガイド
├── build/                     # ビルド出力 (gitignore)
│   └── chrome-mv3-dev/       # 開発版拡張機能
├── .plasmo/                   # Plasmo内部ファイル (gitignore)
├── node_modules/              # 依存関係 (gitignore)
├── package.json               # 依存関係とマニフェスト設定
├── tsconfig.json              # TypeScript設定
├── README.md                  # プロジェクト説明
├── QUICKSTART.md              # セットアップ・使い方ガイド
├── CHANGELOG.md               # 変更履歴
└── CLAUDE.md                  # このファイル
```

## 重要な設計決定

### 1. ストレージ構造

```typescript
// Chrome Storage Local
{
  'raku-forms': Form[],           // フォームリスト
  'raku-notion-config': NotionConfig, // Notion設定
  'raku-initialized': boolean     // 初期化フラグ
}
```

### 2. 型定義

```typescript
// フォーム定義
interface Form {
  id: string              // UUID
  name: string            // フォーム名
  createdAt: Date         // 作成日時
  targetUrl?: string      // モック用: 遷移先URL
  isMock?: boolean        // モックフラグ
  fields?: FormField[]    // フォームフィールド (未実装)
}

// Notion設定 (OAuth/手動トークン両対応)
interface NotionConfig {
  authMethod: 'manual' | 'oauth'
  apiKey?: string         // 手動入力のトークン
  databaseId?: string
  accessToken?: string    // OAuth用トークン
  refreshToken?: string   // OAuth用リフレッシュトークン
  tokenExpiresAt?: number // トークン有効期限
  workspaceId?: string    // OAuth用ワークスペースID
  workspaceName?: string  // OAuth用ワークスペース名
  botId?: string          // OAuth用ボットID
}

// Notion OAuth設定
interface NotionOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// Notionページデータ
interface NotionPageData {
  title: string
  url: string
  memo?: string
}
```

### 3. 画面遷移フロー

```
HomeScreen
  ├─> FormListScreen (フォーム一覧を見る)
  │     ├─> 新しいタブで URL を開く (targetUrl あり)
  │     └─> DemoScreen (targetUrl なし)
  ├─> CreateFormScreen (新規作成)
  │     └─> FormListScreen (作成後)
  └─> SettingsScreen (⚙️設定アイコン)
        ├─> OAuth認証フロー
        │     └─> Notion認証画面 → OAuthコールバック
        └─> 手動トークン入力
```

### 4. OAuth認証フロー

1. **認証開始** (SettingsScreen)
   - `start-oauth` メッセージをbackgroundに送信
   - backgroundがOAuth URLを生成し、新しいタブで開く
   - stateパラメータをストレージに保存（CSRF対策）

2. **Notion認証**
   - ユーザーがNotionで「許可する」をクリック
   - `chrome-extension://<ID>/oauth-callback.html` にリダイレクト

3. **トークン交換** (oauth-callback.html)
   - URLからcode・stateを取得
   - `complete-oauth` メッセージをbackgroundに送信
   - backgroundがstate検証後、codeをトークンに交換
   - NotionConfigを更新

4. **認証完了**
   - 設定画面に「接続済み」と表示
   - データベース一覧を取得・表示

### 5. モックデータ初期化ロジック

- `initializeMockData()` は初回起動時のみ実行
- `INITIALIZED` フラグで二重初期化を防止
- 開発時は `resetStorage()` でリセット可能

## コーディング規約

### TypeScript

- Strict mode 有効
- 明示的な型定義を推奨
- `any` の使用を避ける
- Optional chaining (`?.`) を積極的に使用

### React

- 関数コンポーネント + Hooks
- Props の interface を明示的に定義
- `FC<Props>` 型を使用

### ファイル命名

- コンポーネント: PascalCase (例: `HomeScreen.tsx`)
- ユーティリティ: camelCase (例: `storage.ts`)
- 型定義: `index.ts` または `types.ts`

### CSS

- グローバルスタイル: `global.css`
- クラス名: kebab-case (例: `.list-item`)
- インラインスタイルは最小限に (例外: 動的スタイル)

## よくある開発タスク

### 新しい画面を追加

1. `src/screens/NewScreen.tsx` を作成
2. `src/types/index.ts` の Screen 型に追加
3. `src/popup.tsx` のルーティングに追加

### 新しいストレージキーを追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加
2. 対応する getter/setter メソッドを追加
3. 型定義を `src/types/index.ts` に追加

### モックデータを更新

1. `src/services/storage.ts` の `MOCK_FORMS` を編集
2. 開発者ツールで `chrome.storage.local.clear()` を実行
3. 拡張機能を更新

## デバッグ方法

### ストレージ内容の確認

```javascript
// Consoleで実行
chrome.storage.local.get(null, (data) => console.log(data))

// または
import('./services/storage').then(({ StorageService }) => {
  StorageService.debugStorage()
})
```

### ストレージのリセット

```javascript
// 方法1: シンプル
chrome.storage.local.clear()

// 方法2: リセット関数使用
import('./services/storage').then(({ StorageService }) => {
  StorageService.resetStorage()
})
```

### OAuth認証のデバッグ

```bash
# ターミナル1: 拡張機能開発サーバー
npm run dev

# ターミナル2: OAuthコールバックサーバー
npm run oauth-server

# または一括起動
npm run dev:full
```

**デバッグログ確認**:
- **コールバックページ**: コンソールで `[OAuth]` プレフィックス付きログを確認
- **背景スクリプト**: chrome://extensions/ → 拡張機能の詳細 → Service Worker → `[Background]` プレフィックス付きログを確認

### ビルドエラー時

```bash
# クリーンビルド
rm -rf node_modules .plasmo build
npm install
npm run dev
```

## 次のステップ (優先順位順)

### Phase 3: フォームからのNotion送信 (次のフェーズ)
1. フォーム入力画面の実装
2. Notion送信ボタンとロジック
3. 送信成功/失敗のフィードバック
4. エラーハンドリングの強化

### Phase 4: フォームカスタマイズ
1. フィールド追加UI
2. フィールド型選択 (text, textarea, select, checkbox)
3. 必須項目設定
4. フィールドの並び替え

### Phase 5: コンテンツスクリプト
1. 選択テキストの取得
2. ページメタデータの抽出
3. フォーム自動入力
4. スクリーンショット機能

### Phase 6: UX改善
1. ローディング状態の表示
2. トースト通知の実装
3. 複数ワークスペース対応

## 既知の問題と解決履歴

### 開発環境

- ✅ WebSocket エラー: `npm run dev` で解決
- ✅ モックデータ更新: `chrome.storage.local.clear()` で解決
- ✅ TypeScript エラー: `@types/chrome` で型定義追加済み
- ✅ OAuth chrome-extension:// スキーム制限: localhost HTTPサーバー経由で解決
- ✅ 外部ページ→拡張機能通信: `chrome.runtime.onMessageExternal`リスナー追加で解決
- ✅ Node.js url.parse() deprecation警告: URL constructorに変更して解決
- ✅ OAuth無限ローディング: 拡張機能ID管理システム実装で解決

### 本番環境

- なし (まだ本番デプロイなし)

## 参考資料

- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)
- [React公式ドキュメント](https://react.dev/)

## 開発者向けメモ

### Plasmo特有の仕様

- `~` エイリアスは `src/` ディレクトリを指す
- マニフェスト設定は `package.json` の `manifest` フィールドに記述
- アイコンは `assets/` に配置すると自動リサイズ
- ビルド出力は `build/chrome-mv3-dev/` (開発) または `build/chrome-mv3-prod/` (本番)

### Chrome Storage API

- 容量制限: 5MB (local), 100KB (sync)
- 非同期APIなので async/await を使用
- JSON シリアライズ可能な値のみ保存可能
- Date オブジェクトは文字列として保存される

### セキュリティ考慮事項

- Notion APIキーは chrome.storage.local に保存 (暗号化なし)
- 本番環境では chrome.storage.sync の使用を検討
- XSS対策: React の自動エスケープに依存
- CSRF対策: Notion API はトークンベース認証

### Notion API統合について

#### 認証方式
本プロジェクトは2つの認証方式に対応:

1. **OAuth認証** (本番環境推奨) 🆕
   - Notion OAuth 2.0フローによる認証
   - `NotionConfig.authMethod = 'oauth'`
   - `NotionConfig.accessToken` にOAuthトークンを格納
   - 環境変数で Client ID/Secret を設定
   - CSRF対策のためのstate検証
   - トークン有効性チェック機能
   - **重要**: 開発環境では localhost HTTPサーバー (port 3000) が必要
   - 外部ページ→拡張機能通信に `chrome.runtime.onMessageExternal` を使用

2. **手動トークン入力** (開発・テスト推奨)
   - Notion Integration Tokenを手動で入力
   - `NotionConfig.authMethod = 'manual'`
   - `NotionConfig.apiKey` にトークンを格納
   - 開発・テスト用途に最適（簡単・高速）
   - Internal Integrationを使用

#### API呼び出し方法
```typescript
// 方法1: 直接呼び出し (popup内)
import { createNotionClient } from '~services/notion'
const config = await StorageService.getNotionConfig()
const client = createNotionClient(config)
await client.createPage({ title, url, memo })

// 方法2: Background経由 (推奨)
chrome.runtime.sendMessage({
  type: 'send-to-notion',
  data: { title, url, memo }
})
```

#### OAuth設定方法
```bash
# 1. .envファイルを作成
cp .env.example .env

# 2. Notion Developersで作成したClient ID/Secretを設定
# .env
PLASMO_PUBLIC_NOTION_CLIENT_ID=your_client_id
PLASMO_PUBLIC_NOTION_CLIENT_SECRET=your_client_secret

# 3. OAuthサーバーと開発サーバーを起動
npm run dev:full

# または個別に起動
npm run dev        # ターミナル1
npm run oauth-server  # ターミナル2
```

**重要**: NotionのOAuth認証では`chrome-extension://`スキームが使用できないため、
ローカルHTTPサーバー(`http://localhost:3000`)を使用します。

Notion Integrationの設定:
- Redirect URI: `http://localhost:3000/oauth/callback`

詳細は [README.md](README.md#notion-oauth認証の設定) を参照。

---

**最終更新**: 2025-11-30
**バージョン**: 1.2.0 (Notion OAuth認証実装)
**メンテナー**: Claude Code
