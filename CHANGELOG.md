# Changelog

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
