# Raku Raku Notion

> Notionのウェブクリップ機能を簡略化したブラウザ拡張機能

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Plasmo](https://img.shields.io/badge/Plasmo-0.90-blueviolet.svg)](https://www.plasmo.com/)

フォームを作成して、ウェブページの情報を簡単にNotionに保存できるブラウザ拡張機能です。
Notionの公式ウェブクリッパーよりもシンプルで、カスタマイズ可能な設計を目指しています。

## 📖 目次

- [機能](#機能)
- [スクリーンショット](#スクリーンショット)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [使い方](#使い方)
- [プロジェクト構造](#プロジェクト構造)
- [開発ガイド](#開発ガイド)
- [ロードマップ](#ロードマップ)
- [貢献](#貢献)
- [ライセンス](#ライセンス)

## ✨ 機能

### 現在実装済み

- ✅ **フォーム管理**: 複数のカスタムフォームを作成・保存
- ✅ **データ永続化**: Chrome Storage APIによるローカル保存
- ✅ **モック機能**: 開発・デモ用の初期フォーム
- ✅ **シンプルなUI**: Notionスタイルを参考にした直感的なデザイン
- ✅ **開発ツール**: ストレージリセット・デバッグ機能

### 今後実装予定

- 🚧 **Notion API連携**: 実際にNotionへデータを保存
- 🚧 **フォームカスタマイズ**: フィールドの追加・編集
- 🚧 **コンテンツスクリプト**: 現在のページ情報を自動取得
- 🚧 **高度な機能**: タグ管理、ショートカットキー

詳細は[ロードマップ](#ロードマップ)を参照してください。

## 📸 スクリーンショット

### ホーム画面
拡張機能を開くと、シンプルな導線が表示されます。

### フォーム一覧
作成したフォームとモックフォーム（DEMOバッジ付き）が一覧表示されます。

### フォーム作成
新しいフォームを簡単に作成できます。

## 🚀 開発環境のセットアップ

このセクションでは、ほぼバニラのGitとVSCodeしか導入されていない環境でも開発を始められるように、詳細な手順を説明します。

### 前提条件

以下のツールがインストールされている必要があります：

1. **Git** (バージョン管理)
   - インストール確認: `git --version`
   - インストール方法: [Git公式サイト](https://git-scm.com/)

2. **Node.js** (18以上推奨)
   - インストール確認: `node --version`
   - インストール方法: [Node.js公式サイト](https://nodejs.org/)
   - **重要**: Node.jsをインストールすると、npmも一緒にインストールされます

3. **VSCode** (推奨エディタ)
   - ダウンロード: [VSCode公式サイト](https://code.visualstudio.com/)

4. **Chrome または Edge** (対象ブラウザ)
   - Chrome: [ダウンロード](https://www.google.com/chrome/)
   - Edge: [ダウンロード](https://www.microsoft.com/edge)

### インストール手順

#### 1. リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/otagao/raku-raku-notion.git

# またはSSHでクローン
git clone git@github.com:otagao/raku-raku-notion.git

# ディレクトリに移動
cd raku-raku-notion
```

#### 2. 依存関係のインストール

```bash
# npm を使用（Node.jsに付属）
npm install
```

このコマンドで以下がインストールされます：
- Plasmo (ブラウザ拡張機能フレームワーク)
- React & React DOM
- TypeScript
- 型定義ファイル (@types/chrome, @types/react, etc.)

**所要時間**: 初回は5-10分程度（ネットワーク速度に依存）

#### 3. 開発サーバーの起動

```bash
npm run dev
```

成功すると以下のメッセージが表示されます：
```
🟣 Plasmo v0.90.5
🔴 The Browser Extension Framework
🟢 DONE | Extension re-packaged in XXXms! 🚀
```

**重要**: このコマンドはバックグラウンドで実行し続けます。
ソースコードを変更すると自動的に再ビルドされます。

#### 4. ブラウザへの拡張機能の読み込み

**Chrome の場合:**

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの `build/chrome-mv3-dev` フォルダを選択
5. 拡張機能が読み込まれ、ツールバーに「RR」アイコンが表示されます

**Edge の場合:**

1. Edgeで `edge://extensions` を開く
2. 左側の「開発者モード」をONにする
3. 「展開して読み込み」をクリック
4. プロジェクトの `build/chrome-mv3-dev` フォルダを選択
5. 拡張機能が読み込まれます

#### 5. 動作確認

1. ツールバーの「RR」アイコンをクリック
2. 「フォーム一覧を見る」をクリック
3. 2つのモックフォーム（DEMOバッジ付き）が表示されることを確認
4. モックフォームをクリックすると、新しいタブでURLが開きます

### トラブルシューティング

#### Q: `npm install` が失敗する

**A**: Node.jsのバージョンを確認してください
```bash
node --version  # v18以上が必要
```

古いバージョンの場合は、[Node.js公式サイト](https://nodejs.org/)から最新のLTS版をインストールしてください。

#### Q: `npm run dev` でエラーが出る

**A**: node_modulesを削除して再インストール
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Q: 拡張機能が表示されない

**A**: 以下を確認してください
1. `build/chrome-mv3-dev` ディレクトリが存在するか
2. `npm run dev` が実行中か
3. ChromeのデベロッパーモードがONか
4. 拡張機能の「更新」ボタンをクリック

#### Q: WebSocketエラーが出る

**A**: 開発サーバーが停止しています
```bash
# ターミナルで Ctrl+C を押して停止
# 再度起動
npm run dev
```

## 📖 使い方

### 基本的な使い方

1. **拡張機能を開く**: ツールバーのアイコンをクリック
2. **フォーム一覧を見る**: 作成済みフォームを確認
3. **モックフォームを試す**: DEMOバッジ付きフォームをクリック
4. **新しいフォームを作成**: 「+ 新しいフォームを作成」から追加

### 開発者向け機能

#### ストレージのデバッグ

拡張機能のポップアップで右クリック → 「検証」→ Consoleタブ

```javascript
// ストレージ内容を確認
chrome.storage.local.get(null, (data) => console.log(data))

// ストレージをクリア
chrome.storage.local.clear()

// リセット関数を使用
import('./services/storage').then(({ StorageService }) => {
  StorageService.resetStorage()
})
```

詳細は [QUICKSTART.md](QUICKSTART.md) を参照してください。

## 📁 プロジェクト構造

```
raku-raku-notion/
├── src/
│   ├── popup.tsx              # メインエントリーポイント
│   ├── screens/               # 画面コンポーネント
│   │   ├── HomeScreen.tsx    # ホーム画面
│   │   ├── CreateFormScreen.tsx  # フォーム作成画面
│   │   ├── FormListScreen.tsx    # フォーム一覧画面
│   │   └── DemoScreen.tsx    # デモページ
│   ├── services/              # ビジネスロジック層
│   │   ├── storage.ts        # Chrome Storage API
│   │   └── notion.ts         # Notion API (将来実装)
│   ├── types/                 # TypeScript型定義
│   │   └── index.ts
│   ├── styles/                # スタイル
│   │   └── global.css
│   ├── components/            # 再利用可能コンポーネント
│   └── utils/                 # ユーティリティ関数
├── assets/
│   ├── icon.png              # 拡張機能アイコン
│   └── ICON_SETUP.md         # アイコン作成ガイド
├── build/                     # ビルド出力 (gitignore)
├── .plasmo/                   # Plasmo内部ファイル (gitignore)
├── package.json               # 依存関係とマニフェスト
├── tsconfig.json              # TypeScript設定
├── README.md                  # このファイル
├── QUICKSTART.md              # クイックスタートガイド
├── CHANGELOG.md               # 変更履歴
└── CLAUDE.md                  # AI開発コンテキスト
```

## 🛠️ 開発ガイド

### 開発コマンド

```bash
# 開発サーバー起動 (ホットリロード有効)
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npx tsc --noEmit
```

### コーディング規約

#### TypeScript

- Strict mode 有効
- 明示的な型定義を推奨
- `any` の使用を避ける
- Optional chaining (`?.`) を積極的に使用

#### React

- 関数コンポーネント + Hooks
- Props の interface を明示的に定義
- `FC<Props>` 型を使用

#### CSS

- グローバルスタイル: `global.css`
- クラス名: kebab-case (例: `.list-item`)
- Notionスタイルを参考にしたデザイン

### よくある開発タスク

#### 新しい画面を追加

1. `src/screens/NewScreen.tsx` を作成
2. `src/types/index.ts` の Screen 型に追加
3. `src/popup.tsx` のルーティングに追加

#### ストレージキーを追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加
2. 対応する getter/setter メソッドを追加
3. 型定義を `src/types/index.ts` に追加

#### モックデータを更新

1. `src/services/storage.ts` の `MOCK_FORMS` を編集
2. 開発者ツールで `chrome.storage.local.clear()` を実行
3. 拡張機能を更新

詳細は [CLAUDE.md](CLAUDE.md) を参照してください。

## 🗓️ ロードマップ

### Phase 1: MVP (完了) ✅

- [x] 基本UI構造
- [x] Chrome Storage API統合
- [x] フォームの作成・保存・取得
- [x] モック機能
- [x] 開発ツール

### Phase 2: Notion API統合 (進行中) 🚧

**目標**: 実際にNotionへデータを保存できるようにする

- [ ] Notion API キー設定UI
- [ ] データベース一覧取得
- [ ] データベース選択機能
- [ ] 簡単なページ作成機能
- [ ] エラーハンドリング

**優先度**: 高
**予定工数**: 2-3週間

### Phase 3: フォームカスタマイズ 🔜

**目標**: ユーザーが自由にフォームフィールドを設定できるようにする

- [ ] フィールド追加UI
- [ ] フィールド型選択 (text, textarea, select, checkbox)
- [ ] 必須項目設定
- [ ] フィールドの並び替え
- [ ] デフォルト値の設定

**優先度**: 高
**予定工数**: 2-3週間

### Phase 4: コンテンツスクリプト機能 🔜

**目標**: ウェブページから自動的に情報を取得

- [ ] 現在のページ情報取得 (タイトル、URL)
- [ ] 選択テキストの取得
- [ ] メタデータ取得 (OGP情報など)
- [ ] スクリーンショット機能
- [ ] フォーム自動入力

**優先度**: 中
**予定工数**: 3-4週間

### Phase 5: UX改善 & 高度な機能 🔮

**目標**: より使いやすく、パワフルに

- [ ] タグ・カテゴリ管理
- [ ] フォームテンプレート
- [ ] ショートカットキー対応
- [ ] 複数Notionワークスペース対応
- [ ] フォームのエクスポート/インポート
- [ ] ダークモード
- [ ] 多言語対応

**優先度**: 低
**予定工数**: TBD

## 🤝 貢献

プルリクエストを歓迎します！

### 貢献の流れ

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発前に

- [CLAUDE.md](CLAUDE.md) でプロジェクトのコンテキストを確認
- [QUICKSTART.md](QUICKSTART.md) でセットアップ手順を確認
- 既存のissueを確認し、重複を避ける

### コミットメッセージ規約

```
<type>: <subject>

<body>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更（機能に影響なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド、設定ファイルの変更

## 📄 ライセンス

ISC License

## 📚 参考資料

- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)
- [React公式ドキュメント](https://react.dev/)

## 📞 お問い合わせ

質問やフィードバックは、GitHubのIssueでお願いします。

---

**バージョン**: 1.0.0 (MVP)
**最終更新**: 2024-11-21
