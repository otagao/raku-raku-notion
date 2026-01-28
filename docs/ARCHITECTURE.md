# プロジェクト構造

このドキュメントでは、Raku Raku Notionのコードベース構造と設計思想について説明します。

## ディレクトリ構造

```
raku-raku-notion/
├── src/
│   ├── popup.tsx              # メインエントリーポイント
│   ├── screens/               # 画面コンポーネント
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── ClipboardListScreen.tsx
│   │   └── ClippingProgressScreen.tsx
│   ├── contents/              # Content Scripts
│   │   ├── extract-content.ts # ページコンテンツ抽出
│   │   ├── notion-api-helper.ts # Notion内部API呼び出し（Notion.so上でCookie認証を利用）
│   │   └── notion-simplify.ts # Notion UI簡略化（www.notion.soでのみ動作）
│   ├── services/              # ビジネスロジック層
│   │   ├── storage.ts         # Chrome Storage API ラッパー
│   │   ├── notion.ts          # Notion 公式API (v1) クライアント
│   │   └── internal-notion.ts # Notion 内部API (v3) クライアント（参考用）
│   ├── background/            # バックグラウンドスクリプト
│   │   └── index.ts           # OAuth + API呼び出し + Content Script管理
│   ├── utils/                 # ユーティリティ関数
│   │   ├── oauth.ts           # OAuth認証ヘルパー
│   │   ├── youtube.ts         # YouTube関連ヘルパー
│   │   ├── uuid.ts            # UUID生成・変換ヘルパー
│   │   └── content-extraction.ts # コンテンツ抽出ヘルパー
│   ├── types/                 # TypeScript型定義
│   │   ├── index.ts           # メイン型定義
│   │   └── internal-notion.ts # 内部API型定義
│   ├── styles/                # スタイルシート
│   │   ├── global.css         # グローバルスタイル
│   │   └── notion-custom.css  # Notion UI簡略化用CSS
│   └── components/            # 再利用可能コンポーネント
├── assets/
│   ├── icon.png
│   └── ICON_SETUP.md
├── docs/                      # ドキュメント
│   ├── SETUP.md
│   ├── NOTION_AUTH.md
│   ├── USAGE.md
│   ├── DEVELOPMENT.md
│   └── ARCHITECTURE.md (このファイル)
├── oauth-server.js            # OAuth開発サーバー
├── build/                     # ビルド出力 (gitignore)
├── .plasmo/                   # Plasmo内部ファイル (gitignore)
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── OAUTH_SETUP_GUIDE.md
└── CLAUDE.md
```

## レイヤー構成

### 1. プレゼンテーション層 (Screens)

**責務**: ユーザーインターフェースの表示とユーザー入力の処理

**ファイル**: `src/screens/*.tsx`

各画面は独立したReactコンポーネントとして実装されています：

- **LoginScreen**: ログイン画面（未認証時に表示）、OAuth/手動トークン認証
- **HomeScreen**: メイン画面（認証済み時）、クリップボタン・メモ・タグ入力、保存先選択・作成がすべてこの画面内で完結
- **ClipboardListScreen**: クリップボード一覧表示＋既存データベース取り込み
- **ClippingProgressScreen**: クリップ実行中の進行状況表示

画面遷移は基本的にHomeScreenとClippingProgressScreen間のみで行われます。LoginScreenは認証状態に応じて特別に表示されます。

```typescript
export type Screen = 'home'
```

### 2. ビジネスロジック層 (Services)

**責務**: データの取得・保存、外部APIとの通信

**ファイル**: `src/services/*.ts`

#### StorageService (`storage.ts`)

Chrome Storage APIのラッパーとして機能：

```typescript
export class StorageService {
  // クリップボード操作
  static getClipboards(): Promise<Clipboard[]>
  static addClipboard(data: Partial<Clipboard>): Promise<void>
  static deleteClipboard(id: string): Promise<void>
  static getClipboardByDatabaseId(databaseId: string): Promise<Clipboard | undefined>
  static updateClipboardLastClipped(clipboardId: string): Promise<void>

  // Notion設定
  static getNotionConfig(): Promise<NotionConfig>
  static saveNotionConfig(config: NotionConfig): Promise<void>

  // UI簡略化設定
  static getUISimplifyConfig(): Promise<UISimplifyConfig>
  static saveUISimplifyConfig(config: UISimplifyConfig): Promise<void>

  // 言語設定
  static getLanguageConfig(): Promise<LanguageConfig>
  static saveLanguageConfig(config: LanguageConfig): Promise<void>

  // ユーティリティ
  static getCurrentTabInfo(): Promise<CurrentTabInfo>
}
```

#### NotionService (`notion.ts`)

Notion 公式API (v1) クライアント：

```typescript
class NotionService {
  // 認証
  testConnection(): Promise<boolean>
  validateToken(): Promise<{valid: boolean; error?: string}>

  // データベース操作
  createDatabase(name: string): Promise<{id: string; url: string; properties: Record<string, string>; defaultViewId?: string}>
  listDatabases(): Promise<NotionDatabaseSummary[]>
  getDatabaseSchema(databaseId: string): Promise<any>

  // ページ操作
  createWebClip(data: WebClipData): Promise<string>
  createPage(data: NotionPageData): Promise<string>
}
```

#### InternalNotionService (`internal-notion.ts`)

Notion 内部API (v3) クライアント - ギャラリービュー操作用：

```typescript
class InternalNotionService {
  // ビュー操作
  static addGalleryView(
    databaseId: string,
    visibleProperties: string[],
    existingViewId?: string
  ): Promise<void>

  static getDatabaseViews(databaseId: string): Promise<string[]>

  // 認証
  static loadUserContent(): Promise<{user?: NotionUser; spaces: NotionSpace[]}>
  static checkConnection(): Promise<boolean>
}
```

**重要**: 内部APIはNotionのブラウザセッション（Cookie）を利用するため、Content Script経由で実行する必要があります。主な用途：

- 新規データベースにギャラリービューを追加
- デフォルトビューの削除
- ビュー情報の取得（`loadPageChunk`エンドポイント使用）

**実装方法**:
- `src/contents/notion-api-helper.ts`: Notion.so上で実行されるContent Script
- Popup/Background内のfetchではCookieが送信されないため、メッセージパッシングでContent Scriptに処理を委譲
- ユーザーID取得: `loadPageChunk`レスポンスから親ページの権限情報（`user_permission`）を解析
- 権限エラー対策: データベース作成直後に操作を実行（権限が確実に設定されている状態を利用）

### 3. バックグラウンド層 (Background)

**責務**: バックグラウンドで動作するService Worker、長時間処理やAPIコール

**ファイル**: `src/background/index.ts`

メッセージベースのアーキテクチャ：

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'clip-page':
      // ページをクリップ（進行状況メッセージを送信）
      // CLIP_PROGRESS: 進行状況更新
      // CLIP_COMPLETE: 完了通知
    case 'create-database':
      // データベース作成
    case 'add-gallery-view-via-content':
      // Content Script経由でギャラリービューを追加
      // Notion.soタブを探すか新規作成し、Content Scriptに処理を委譲
    case 'get-database-views-via-content':
      // Content Script経由でデータベースのビュー一覧を取得
    case 'start-oauth':
      // OAuth認証開始
    case 'complete-oauth':
      // OAuth認証完了
  }
})
```

### 4. ユーティリティ層 (Utils)

**責務**: 共通の補助機能

**ファイル**: `src/utils/*.ts`

- **oauth.ts**: OAuth認証のヘルパー関数

## データフロー

### クリップボード作成フロー

```
User Input (HomeScreen - 新規保存先を選択して名前入力)
  ↓
popup.tsx (handleCreateClipboard)
  ↓
NotionService.createDatabase() ← Notion API
  ↓
popup.tsx (add-gallery-view-via-content message)
  ↓
Background Service Worker (add-gallery-view-via-content message)
  ↓
Content Script (notion-api-helper.ts on Notion.so)
  - Notion.soタブを探すか新規作成
  - Content Scriptが既に注入されているか確認（pingメッセージ）
  - 未注入の場合、chrome.scripting.executeScriptで動的注入
  ↓
Notion Internal API (v3) ← Cookie認証で呼び出し
  - loadPageChunkでユーザーID取得（親ページの権限情報から）
  - ギャラリービュー追加（saveTransactions）
  - デフォルトビュー削除（viewIdが指定されている場合）
  ↓
Background Service Worker ← 成功/失敗を返却
  ↓
popup.tsx ← レスポンス受信
  ↓
loadContainerPages() (保存先一覧を再取得)
  ↓
HomeScreen (作成した保存先が自動選択される)
```

### Webクリップフロー

```
User Click (HomeScreen - 保存先選択済み、メモ・タグ入力済み)
  ↓
popup.tsx (handleClipPage)
  ↓
popup.tsx (performClip)
  ↓
ClippingProgressScreen (進行状況表示開始)
  ↓
Background Service Worker (clip-page message)
  - CLIP_PROGRESS: "クリップの準備をしています..."
  - CLIP_PROGRESS: "ページの情報を取得中..."
  ↓
Content Script (extract-content message) ← タブから本文・画像抽出
  ↓
Background Service Worker
  - CLIP_PROGRESS: "Notionにクリップ中..."
  ↓
NotionService.createWebClip() ← Notion API
  ↓
Background Service Worker
  - CLIP_COMPLETE: { success: true }
  ↓
popup.tsx (メッセージ受信)
  ↓
ClippingProgressScreen: "✓ クリップ完了！"
  ↓
1秒後に自動的にHomeScreenへ戻る（ポップアップは閉じない）
```

### 保存先一覧取得フロー

```
popup.tsx初期化 / HomeScreen表示時
  ↓
popup.tsx (loadContainerPages)
  ↓
NotionService.listPagesUnderContainer() ← Notion API
  - コンテナページ配下のページ・データベースを取得
  - 「タグ保存用ページ」は自動除外
  ↓
ContainerPage[] を Clipboard[] 型に変換
  ↓
新規作成時のリトライロジック（expectedNewIdが指定されている場合）
  - 最大10回（約10秒間）リトライ
  - 新規IDがリストに反映されるまで待機
  ↓
保存先リストをステートに保存
  ↓
HomeScreen (ドロップダウンで表示、作成した保存先は自動選択)
```

### OAuth認証フロー

```
User Click (SettingsScreen)
  ↓
Background (start-oauth message)
  ↓
OAuth URL生成 → 新しいタブで開く
  ↓
Notion認証画面 → ユーザーが許可
  ↓
localhost:3000/oauth/callback
  ↓
oauth-callback.html (URLパラメータ取得)
  ↓
Background (complete-oauth message)
  ↓
トークン交換 ← Notion OAuth API
  ↓
NotionConfig保存 → Chrome Storage
  ↓
SettingsScreen (接続済み表示)
```

## ストレージ構造

### Chrome Storage Local

```typescript
{
  'raku-clipboards': Clipboard[],              // クリップボードリスト
  'raku-notion-config': NotionConfig,          // Notion設定
  'raku-ui-simplify-config': UISimplifyConfig, // UI簡略化設定
  'raku-language-config': LanguageConfig,      // 言語設定（ja/en）
  'raku-selected-clipboard-id': string,        // 選択中クリップボードID
  'raku-tag-options-map': Record<string, string[]> // DBごとのタグ候補キャッシュ
}
```

### データ型

```typescript
interface Clipboard {
  id: string                    // UUID
  name: string                  // クリップボード名
  createdAt: Date | string     // 作成日時
  lastClippedAt?: Date | string // 最終クリップ日時
  notionDatabaseId: string     // NotionデータベースID
  notionDatabaseUrl?: string   // NotionデータベースURL
  createdByExtension: boolean  // 拡張機能で作成したか
}

interface NotionConfig {
  authMethod: 'manual' | 'oauth'
  apiKey?: string              // 手動トークン
  accessToken?: string         // OAuthトークン
  refreshToken?: string
  tokenExpiresAt?: number
  workspaceId?: string
  workspaceName?: string
  botId?: string
}

interface NotionDatabaseSummary {
  id: string                   // データベースID
  title: string                // データベース名
  url?: string                 // データベースURL
  description?: string         // 説明
  iconEmoji?: string           // アイコン絵文字
  lastEditedTime?: string      // 最終更新日時
  createdTime?: string         // 作成日時
}
```

## 画面遷移

```
LoginScreen（未認証時のみ）
  └─> OAuth認証 / 手動トークン → HomeScreen

HomeScreen（認証済み時）
  ├─> 📎 このページをクリップ → ClippingProgressScreen → HomeScreen（1秒後）
  ├─> 新規保存先作成（HomeScreen内で完結）
  ├─> ClipboardListScreen
  │     └─> Notionデータベースを開く
  └─> 連携解除 → LoginScreen
```

## Notion API連携

### データベース作成

クリップボード作成時に、以下の構造でデータベースを作成します：

```
Notionワークスペース
  └─ {クリップボード名} - コンテナ (Page)
       └─ {クリップボード名} (Database)
            ├─ 名前 (Title)
            ├─ URL (URL)
            └─ 作成日時 (Created Time)
```

### Webクリップ作成

```typescript
{
  parent: { database_id: databaseId },
  properties: {
    "名前": { title: [{ text: { content: title } }] },
    "URL": { url: url }
  },
  children: [
    // サムネイル (Image Block)
    // 本文 (Paragraph Blocks)
  ]
}
```

## セキュリティ考慮事項

### トークン管理

- トークンは `chrome.storage.local` に保存（暗号化なし）
- 本番環境では `chrome.storage.sync` の使用を検討
- トークンの有効期限チェック機能を実装済み

### CSRF対策

- OAuth認証時に `state` パラメータを使用
- ランダムな文字列を生成してストレージに保存
- コールバック時に検証

### XSS対策

- Reactの自動エスケープに依存
- ユーザー入力を直接 `dangerouslySetInnerHTML` に渡さない

## パフォーマンス最適化

### ストレージアクセスの最適化

- 不要な読み書きを避ける
- `Promise.all` で並列取得

### レンダリング最適化

- `useMemo` / `useCallback` でメモ化
- 不要な再レンダリングを避ける

### ビルドサイズ最適化

- Tree shaking（Plasmoが自動で実施）
- 不要な依存関係を削除

## 拡張性

### 新しい画面の追加

1. `src/screens/` に新しいコンポーネントを作成
2. `src/types/index.ts` の `Screen` 型に追加
3. `src/popup.tsx` のルーティングに追加

### 新しいストレージキーの追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加
2. getter/setter メソッドを追加
3. 型定義を `src/types/index.ts` に追加

### 新しいNotionプロパティの追加

1. `NotionService.createDatabase()` のプロパティ定義を変更
2. `NotionService.createWebClip()` のプロパティマッピングを変更

## 今後の改善案

- [ ] 自動テストの導入（Jest, React Testing Library）
- [ ] エラーバウンダリの実装
- [ ] ローディング状態の統一管理
- [ ] トースト通知システムの導入
- [ ] オフライン対応
- [ ] リトライロジックの実装

## 参考資料

- [Plasmo Architecture](https://docs.plasmo.com/framework)
- [Chrome Extension Architecture](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)
- [Notion API Guides](https://developers.notion.com/docs/getting-started)
