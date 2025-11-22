# CLAUDE.md - AI開発コンテキスト

このドキュメントは、Claude CodeやGitHub Copilotなどの AI開発アシスタントがプロジェクトのコンテキストを理解するためのものです。

## プロジェクト概要

**Raku Raku Notion** は、Notionのウェブクリップ機能を簡略化したブラウザ拡張機能です。ユーザーがウェブページの情報を素早くNotionに保存できるように設計されています。

### 技術スタック

- **フレームワーク**: Plasmo v0.90.5 (ブラウザ拡張機能フレームワーク)
- **UI**: React 18.3.1 + TypeScript 5.9.3
- **ターゲット**: Chrome/Edge (Manifest V3)
- **ストレージ**: Chrome Storage API
- **将来実装**: Notion API連携

### 開発状況

**現在のフェーズ**: MVP (最小実行可能製品) - モック実装完了

#### 実装済み機能 ✅

1. **基本UI構造**
   - ホーム画面 ([HomeScreen.tsx](src/screens/HomeScreen.tsx))
   - フォーム作成画面 ([CreateFormScreen.tsx](src/screens/CreateFormScreen.tsx))
   - フォーム一覧画面 ([FormListScreen.tsx](src/screens/FormListScreen.tsx))
   - デモページ ([DemoScreen.tsx](src/screens/DemoScreen.tsx))

2. **データ永続化**
   - Chrome Storage API統合 ([storage.ts](src/services/storage.ts))
   - フォームの作成・保存・取得
   - モックデータの初期化システム
   - タブ情報取得ユーティリティ (`getCurrentTabInfo()`)

3. **Notion API統合** 🆕
   - Notion API クライアント実装 ([notion.ts](src/services/notion.ts))
   - ページ作成API (`createPage()`)
   - 接続テスト (`testConnection()`)
   - データベース一覧取得 (`listDatabases()`)
   - データベーススキーマ取得 (`getDatabaseSchema()`)
   - OAuth認証と手動トークン入力の両対応

4. **Background Service Worker** 🆕
   - メッセージベースのAPI呼び出しハンドラ ([background/index.ts](src/background/index.ts))
   - `send-to-notion`: Notionページ作成
   - `test-notion-connection`: 接続テスト
   - `list-databases`: データベース一覧取得

5. **モック機能**
   - 初回起動時に2つのデモフォームを自動配置
   - targetURLを持つフォームは新しいタブでURLを開く
   - DEMOバッジでモックフォームを視覚的に識別

6. **開発ツール**
   - `resetStorage()`: ストレージをクリアして再初期化
   - `debugStorage()`: ストレージ内容をコンソールに出力

#### 未実装機能 🚧

1. **Notion API UI統合** (優先度: 高)
   - APIキー/トークン設定画面
   - データベース選択UI
   - フォームからのNotion送信機能
   - OAuth認証フロー（将来実装）

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
│   │   └── DemoScreen.tsx    # プレースホルダー画面
│   ├── services/              # ビジネスロジック層
│   │   ├── storage.ts        # Chrome Storage API ラッパー + タブ情報取得
│   │   └── notion.ts         # Notion API クライアント (実装済み)
│   ├── background/            # バックグラウンドスクリプト
│   │   └── index.ts          # Service Worker (メッセージハンドラ)
│   ├── types/                 # TypeScript型定義
│   │   └── index.ts          # Form, NotionConfig, NotionPageData など
│   ├── styles/                # グローバルCSS
│   │   └── global.css        # Notionスタイルを参考にしたデザイン
│   ├── components/            # 再利用可能コンポーネント (未使用)
│   └── utils/                 # ユーティリティ関数 (未使用)
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
  workspaceId?: string    // OAuth用
  botId?: string          // OAuth用
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
  └─> CreateFormScreen (新規作成)
        └─> FormListScreen (作成後)
```

### 4. モックデータ初期化ロジック

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

### ビルドエラー時

```bash
# クリーンビルド
rm -rf node_modules .plasmo build
npm install
npm run dev
```

## 次のステップ (優先順位順)

### Phase 1: Notion API UI統合
1. Notion API キー/トークン設定画面の実装
2. データベース選択UIの実装
3. フォームからのNotion送信機能
4. エラーハンドリングとユーザーフィードバック

### Phase 2: フォームカスタマイズ
1. フィールド追加UI
2. フィールド型選択 (text, textarea, select, checkbox)
3. 必須項目設定

### Phase 3: コンテンツスクリプト
1. 選択テキストの取得
2. ページメタデータの抽出
3. フォーム自動入力
4. スクリーンショット機能

### Phase 4: OAuth認証 (将来実装)
1. Notion OAuth フロー実装
2. トークンリフレッシュ機能
3. 複数ワークスペース対応

### Phase 5: UX改善
1. エラーハンドリングの強化
2. ローディング状態の表示
3. トースト通知の実装

## 既知の問題

### 開発環境

- ✅ WebSocket エラー: `npm run dev` で解決
- ✅ モックデータ更新: `chrome.storage.local.clear()` で解決
- ⚠️ TypeScript エラー: `@types/chrome` で型定義は追加済み

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
1. **手動トークン入力** (現在の推奨方法)
   - Notion Integration Tokenを手動で入力
   - `NotionConfig.authMethod = 'manual'`
   - `NotionConfig.apiKey` にトークンを格納

2. **OAuth認証** (将来実装予定)
   - Notion OAuth フローによる認証
   - `NotionConfig.authMethod = 'oauth'`
   - `NotionConfig.accessToken` にOAuthトークンを格納
   - トークンリフレッシュ機能も実装予定

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

---

**最終更新**: 2025-11-22
**バージョン**: 1.1.0 (Notion API統合)
**メンテナー**: Claude Code
