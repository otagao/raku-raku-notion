# 開発ガイド

このドキュメントでは、コーディング規約、よくある開発タスク、貢献方法について説明します。

## コーディング規約

### TypeScript

- Strict mode 有効
- 明示的な型定義を推奨
- `any` の使用を避ける
- Optional chaining (`?.`) を積極的に使用

例：
```typescript
// Good
const config: NotionConfig = await StorageService.getNotionConfig()
const token = config?.accessToken

// Bad
const config: any = await StorageService.getNotionConfig()
const token = config.accessToken
```

### React

- 関数コンポーネント + Hooks
- Props の interface を明示的に定義
- `FC<Props>` 型を使用

例：
```typescript
interface MyScreenProps {
  onNavigate: (screen: string) => void
  data: SomeData
}

const MyScreen: FC<MyScreenProps> = ({ onNavigate, data }) => {
  // ...
}
```

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

**注意**: 現在の実装では、画面はHomeScreen中心に統合されています。新しい独立した画面を追加する前に、HomeScreen内で機能を実装できないか検討してください。

新しい画面を追加する場合の手順:

1. `src/screens/NewScreen.tsx` を作成

```typescript
import type { FC } from "react"

interface NewScreenProps {
  onNavigate: (screen: string) => void
}

const NewScreen: FC<NewScreenProps> = ({ onNavigate }) => {
  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h1>新しい画面</h1>
      </div>
      {/* コンテンツ */}
    </div>
  )
}

export default NewScreen
```

2. `src/types/index.ts` の Screen 型を確認（現在は 'home' のみ）

```typescript
export type Screen = 'home' // 必要に応じて追加
```

3. `src/popup.tsx` で画面を表示するロジックを追加（現在はHomeScreenのみをレンダリング）

### ストレージキーを追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加

```typescript
const STORAGE_KEYS = {
  CLIPBOARDS: 'raku-clipboards',
  NOTION_CONFIG: 'raku-notion-config',
  UI_SIMPLIFY_CONFIG: 'raku-ui-simplify-config',
  LANGUAGE_CONFIG: 'raku-language-config',
  SELECTED_CLIPBOARD_ID: 'raku-selected-clipboard-id',
  TAG_OPTIONS_MAP: 'raku-tag-options-map',
  NEW_DATA: 'raku-new-data', // 追加例
}
```

2. 対応する getter/setter メソッドを追加

```typescript
export class StorageService {
  // ...
  static async getNewData(): Promise<NewData[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.NEW_DATA)
      return result[STORAGE_KEYS.NEW_DATA] || []
    } catch (error) {
      console.error('Failed to get new data:', error)
      return []
    }
  }

  static async saveNewData(data: NewData[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.NEW_DATA]: data })
    } catch (error) {
      console.error('Failed to save new data:', error)
      throw error
    }
  }
}
```

3. 型定義を `src/types/index.ts` に追加

```typescript
export interface NewData {
  id: string
  name: string
  createdAt: Date | string
}
```

### ユーティリティ関数を追加

共通のヘルパー関数は `src/utils/` 配下に配置し、DRY原則に従って重複を避けます。

1. 新しいユーティリティファイルを作成（例: `src/utils/validation.ts`）

```typescript
/**
 * 検証ユーティリティ
 */

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

2. 必要な箇所でimport

```typescript
import { isValidUrl, isValidEmail } from "~utils/validation"

// 使用例
if (isValidUrl(inputUrl)) {
  // 処理
}
```

**既存のユーティリティ:**
- `oauth.ts`: OAuth認証関連
- `youtube.ts`: YouTube URL/サムネイル処理
- `uuid.ts`: UUID生成・変換
- `content-extraction.ts`: ページコンテンツ抽出

### Background Service Workerにメッセージハンドラを追加

1. `src/background/index.ts` にハンドラを追加

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'new-action') {
    handleNewAction(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true // 非同期レスポンス
  }
})

async function handleNewAction(data: any) {
  // 処理
  return result
}
```

2. フロントエンドから呼び出し

```typescript
const response = await chrome.runtime.sendMessage({
  type: 'new-action',
  data: { /* データ */ }
})
```

## デバッグ方法

### コンソールログ

```typescript
console.log('[ComponentName] Message:', data)
console.error('[ComponentName] Error:', error)
```

プレフィックスを付けることで、ログの出所が明確になります。

### Chrome拡張機能のデバッグ

**Popup/Content Script**:
- ポップアップで右クリック → 検証
- Console タブでログを確認

**Background Service Worker**:
- chrome://extensions/ を開く
- 拡張機能の「詳細」→「Service Worker」のリンクをクリック
- DevTools が開き、ログを確認できます

### ストレージの確認

```javascript
// すべてのストレージ内容を表示
chrome.storage.local.get(null, (data) => {
  console.log('Storage contents:', data)
})

// 特定のキーを確認
chrome.storage.local.get('raku-clipboards', (data) => {
  console.log('Clipboards:', data['raku-clipboards'])
})
```

## テスト

現在、自動テストは実装されていません。手動テストを実施してください。

### 手動テストチェックリスト

- [ ] クリップボード作成
- [ ] Webページクリップ（1つのクリップボード）
- [ ] Webページクリップ（複数のクリップボード選択）
- [ ] クリップボード削除
- [ ] Notion OAuth認証
- [ ] 手動トークン認証
- [ ] 設定の保存・読み込み
- [ ] エラーハンドリング

## パフォーマンス最適化

### ストレージアクセスの最小化

```typescript
// Bad: 複数回アクセス
const clipboards = await StorageService.getClipboards()
const config = await StorageService.getNotionConfig()

// Good: 1回でまとめて取得
const [clipboards, config] = await Promise.all([
  StorageService.getClipboards(),
  StorageService.getNotionConfig()
])
```

### 不要な再レンダリングを避ける

```typescript
// useMemo, useCallback を活用
const sortedClipboards = useMemo(() =>
  clipboards.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ),
  [clipboards]
)
```

## Git ワークフロー

### ブランチ戦略

- `main`: 安定版
- `feature/xxx`: 新機能開発
- `fix/xxx`: バグ修正

### コミットメッセージ規約

```
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更（機能に影響なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド、設定ファイルの変更

例：
```
feat: タグ機能の追加

- HomeScreenにタグ入力UIを追加
- 既存タグの選択と新規タグ作成に対応
- タグ候補のキャッシュ機能を実装

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 貢献方法

### プルリクエストの流れ

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### プルリクエスト前のチェックリスト

- [ ] コードがコーディング規約に従っている
- [ ] 型エラーがない (`npx tsc --noEmit`)
- [ ] 手動テストを実施済み
- [ ] ドキュメントを更新済み（必要な場合）
- [ ] コミットメッセージが規約に従っている

## 参考資料

- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)
- [React公式ドキュメント](https://react.dev/)

## トラブルシューティング

### ビルドエラー

```bash
# クリーンビルド
rm -rf node_modules .plasmo build
npm install
npm run dev
```

### 型エラー

```bash
# 型チェック
npx tsc --noEmit

# エラー箇所を確認して修正
```

### Hot Reload が効かない

1. `npm run dev` を再起動
2. ブラウザで拡張機能を更新
3. それでも直らない場合はクリーンビルド

## 次のステップ

- [プロジェクト構造](ARCHITECTURE.md) - コードベースの詳細な構造
- [ロードマップ](../README.md#ロードマップ) - 今後の開発計画
