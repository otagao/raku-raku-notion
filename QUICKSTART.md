# クイックスタート

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

このコマンドを実行すると、`build/chrome-mv3-dev` ディレクトリに拡張機能がビルドされます。

### 3. Chromeへの拡張機能の読み込み

1. Chrome/Edgeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `build/chrome-mv3-dev` フォルダを選択

### 4. 拡張機能の使用

1. ブラウザのツールバーに「RR」アイコンが表示されます
2. アイコンをクリックしてポップアップを開く
3. 「フォーム一覧を見る」をクリック
4. 初回起動時は2つのモックフォームが表示されます（DEMOバッジ付き）
5. モックフォームをクリックすると、指定されたURLが新しいタブで開きます
6. 「+ 新しいフォームを作成」から独自のフォームを追加できます

## 画面遷移フロー

```
ホーム画面 (HomeScreen)
    ↓ [フォーム一覧を見る]
フォーム一覧画面 (FormListScreen)
    ↓ [モックフォームを選択]
    → 指定URLを新しいタブで開く

または

    ↓ [+ 新しいフォームを作成]
フォーム作成画面 (CreateFormScreen)
    ↓ [フォームを作成]
フォーム一覧画面に戻る
```

## ファイル構造

```
src/
├── popup.tsx                 # メインエントリーポイント
├── screens/                  # 各画面コンポーネント
│   ├── HomeScreen.tsx       # 初期画面
│   ├── CreateFormScreen.tsx # フォーム作成画面
│   ├── FormListScreen.tsx   # フォーム一覧画面
│   └── DemoScreen.tsx       # デモページ
├── services/                 # ビジネスロジック
│   ├── storage.ts           # Chrome Storage API
│   └── notion.ts            # Notion API (将来実装)
├── types/                    # TypeScript型定義
│   └── index.ts
└── styles/                   # スタイル
    └── global.css
```

## 主な機能

### 現在実装済み
- ✅ フォームの作成
- ✅ フォーム一覧の表示
- ✅ Chrome Storage APIでのデータ永続化
- ✅ 画面遷移システム
- ✅ モックフォーム機能（初期データとして2つのデモフォーム）
- ✅ 指定URLを新しいタブで開く機能

### 今後実装予定
- ⏳ Notion API連携
- ⏳ フォームフィールドのカスタマイズ
- ⏳ 現在のページ情報の取得
- ⏳ Notionへのデータ保存

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### アイコンが表示されない場合

`assets/icon.png` ファイルが存在することを確認してください。存在しない場合は、512x512pxのPNG画像を配置してください。

### 拡張機能が読み込めない場合

1. `build/chrome-mv3-dev` ディレクトリが存在することを確認
2. `npm run dev` を再実行
3. Chrome拡張機能ページで「更新」ボタンをクリック

## 開発のヒント

### ホットリロード
`npm run dev` で開発サーバーを起動すると、ソースコードの変更が自動的に検知されてリビルドされます。ブラウザで拡張機能の「更新」ボタンをクリックして変更を反映してください。

### デバッグ
1. 拡張機能のポップアップを開く
2. ポップアップ内で右クリック → 「検証」を選択
3. DevToolsが開きます

### ストレージの確認
Chrome DevTools → Application タブ → Storage → Local Storage で拡張機能のストレージを確認できます。

### モックデータの更新が反映されない場合

`storage.ts`のモックデータを編集しても、初回起動後は更新が反映されません。以下の方法でストレージをリセットしてください。

**方法1: DevToolsでリセット（推奨）**
1. 拡張機能のポップアップを開く
2. ポップアップ内で右クリック → 「検証」
3. Consoleタブで以下を実行:
```javascript
chrome.storage.local.clear()
```
4. ポップアップを閉じて再度開く

**方法2: リセット関数を使用**
1. 拡張機能のポップアップを開く
2. ポップアップ内で右クリック → 「検証」
3. Consoleタブで以下を実行:
```javascript
// StorageServiceをインポートして使用
import('./services/storage').then(({ StorageService }) => {
  StorageService.resetStorage()
})
```

**方法3: 拡張機能を再インストール**
1. `chrome://extensions` を開く
2. 拡張機能を削除
3. 再度「パッケージ化されていない拡張機能を読み込む」で追加

## 次のステップ

1. [README.md](README.md) で詳細な機能説明を確認
2. Notion API統合の準備 (APIキーの取得など)
3. フォームフィールドのカスタマイズ機能の実装
