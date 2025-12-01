# Changelog

## 2025-11-22 - Notion API統合

### 追加された機能

#### Notion APIクライアント実装
- 実際のNotion APIとの連携機能を実装
- ページ作成、接続テスト、データベース一覧取得など
- OAuth認証と手動トークン入力の両方に対応

#### Background Service Worker
- メッセージベースのAPI呼び出しハンドラ
- `send-to-notion`: Notionページ作成
- `test-notion-connection`: API接続テスト
- `list-databases`: データベース一覧取得

#### タブ情報取得ユーティリティ
- 現在アクティブなタブのタイトルとURLを取得する機能
- フォームへの自動入力に対応

### 技術的な変更

#### 型定義の拡張 ([types/index.ts](src/types/index.ts))
```typescript
// OAuth/手動トークン両対応
export type AuthMethod = 'manual' | 'oauth'

export interface NotionConfig {
  authMethod: AuthMethod
  apiKey?: string         // 手動入力トークン
  databaseId?: string
  accessToken?: string    // OAuth用トークン
  workspaceId?: string    // OAuth用
  botId?: string          // OAuth用
}

export interface NotionPageData {
  title: string
  url: string
  memo?: string
}

export interface CurrentTabInfo {
  title: string
  url: string
}
```

#### Notion APIサービス ([services/notion.ts](src/services/notion.ts))
実装されたメソッド:
- `testConnection()`: Notion API接続テスト
- `createPage(data)`: ページ作成（タイトル、URL、メモ対応）
- `getDatabaseSchema()`: データベース構造取得
- `getPageContent(pageId)`: ページコンテンツ取得
- `listDatabases()`: データベース一覧取得（OAuth時に有用）

#### ストレージサービスの拡張 ([services/storage.ts](src/services/storage.ts))
- `getCurrentTabInfo()`: 現在のタブ情報取得メソッド追加

#### Background Service Worker ([background/index.ts](src/background/index.ts))
- メッセージハンドラの実装
- Notion API呼び出しのプロキシ機能
- エラーハンドリング

### OAuth拡張性の確保
将来的なOAuth実装のための設計:
- `authMethod`フィールドで認証方法を切り替え
- `getAuthToken()`メソッドで手動/OAuth両対応
- `listDatabases()`でOAuth認証後のDB選択をサポート

### ファイル変更一覧
- `src/types/index.ts` - OAuth対応の型定義を追加
- `src/services/notion.ts` - 実際のAPI呼び出しロジックを実装
- `src/services/storage.ts` - タブ情報取得ユーティリティを追加
- `src/background/index.ts` - 新規作成（Service Worker）
- `CLAUDE.md` - 実装済み機能とプロジェクト構造を更新

### 統合元
- tempfileディレクトリのNotion APIモック実装を統合
- vanilla JSからPlasmo + TypeScript形式に移植

---

## 2024-11-21 - モック機能の追加

### 追加された機能

#### モックフォームの初期データ
- 初回起動時に2つのモックフォームを自動的に配置
  - モックフォーム 1: Notion公式サイトへのリンク
  - モックフォーム 2: Plasmo公式ドキュメントへのリンク
- モックフォームには「DEMO」バッジを表示

#### URL遷移機能
- `targetUrl`を持つフォームをクリックすると、新しいタブで指定URLを開く
- ポップアップは自動的に閉じる
- `targetUrl`がない通常のフォームは従来通りデモページに遷移

#### UI改善
- ホーム画面に「フォーム一覧を見る」ボタンを追加
- フォーム一覧で、モックフォームにDEMOバッジを表示
- フォーム一覧で、対象URLを表示

### 技術的な変更

#### 型定義の拡張 ([types/index.ts](src/types/index.ts))
```typescript
export interface Form {
  id: string
  name: string
  createdAt: Date
  targetUrl?: string      // 新規追加: フォームが開くURL
  isMock?: boolean        // 新規追加: モックフォームフラグ
  fields?: FormField[]
}
```

#### ストレージサービスの拡張 ([services/storage.ts](src/services/storage.ts))
- `MOCK_FORMS`: 初期モックデータの定義
- `initializeMockData()`: 初回起動時のモックデータ初期化メソッド
- `INITIALIZED`キーで初期化済みかを管理

#### コンポーネントの更新

**HomeScreen.tsx**
- 「フォーム一覧を見る」ボタンを追加
- 「新しいフォームを作成」ボタンをセカンダリスタイルに変更

**FormListScreen.tsx**
- モックフォームに「DEMO」バッジを表示
- `targetUrl`がある場合は新しいタブで開く処理を追加
- フォーム一覧に対象URLを表示

**popup.tsx**
- 初期化時に`initializeMockData()`を呼び出し

### ファイル変更一覧

- `src/types/index.ts` - Form型にtargetUrlとisMockを追加
- `src/services/storage.ts` - モックデータと初期化ロジックを追加
- `src/screens/HomeScreen.tsx` - UIを更新
- `src/screens/FormListScreen.tsx` - URL遷移とバッジ表示を追加
- `src/popup.tsx` - 初期化処理を追加
- `QUICKSTART.md` - 新機能の説明を追加

---

## 2024-11-21 - 初期リリース

### 実装された機能

- Plasmoフレームワークを使用したブラウザ拡張機能の基本構造
- ホーム画面、フォーム作成画面、フォーム一覧画面、デモページの実装
- Chrome Storage APIによるデータ永続化
- 画面遷移システム
- Notion APIサービス層の準備（将来実装用）
