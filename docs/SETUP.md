# セットアップガイド

このドキュメントでは、ほぼバニラのGitとVSCodeしか導入されていない環境でも開発を始められるように、詳細な手順を説明します。

## 前提条件

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

## インストール手順

### 1. リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/otagao/raku-raku-notion.git

# またはSSHでクローン
git clone git@github.com:otagao/raku-raku-notion.git

# ディレクトリに移動
cd raku-raku-notion
```

### 2. 依存関係のインストール

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

### 3. 開発サーバーの起動

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

### 4. ブラウザへの拡張機能の読み込み

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

### 5. 動作確認

1. ツールバーの「RR」アイコンをクリック
2. ホーム画面が表示されることを確認
3. 設定アイコン（⚙️）をクリックしてNotion連携設定を行う

## トラブルシューティング

### Q: `npm install` が失敗する

**A**: Node.jsのバージョンを確認してください
```bash
node --version  # v18以上が必要
```

古いバージョンの場合は、[Node.js公式サイト](https://nodejs.org/)から最新のLTS版をインストールしてください。

### Q: `npm run dev` でエラーが出る

**A**: node_modulesを削除して再インストール
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Q: 拡張機能が表示されない

**A**: 以下を確認してください
1. `build/chrome-mv3-dev` ディレクトリが存在するか
2. `npm run dev` が実行中か
3. ChromeのデベロッパーモードがONか
4. 拡張機能の「更新」ボタンをクリック

### Q: WebSocketエラーが出る

**A**: 開発サーバーが停止しています
```bash
# ターミナルで Ctrl+C を押して停止
# 再度起動
npm run dev
```

## 開発コマンド

```bash
# 開発サーバー起動 (ホットリロード有効)
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npx tsc --noEmit

# OAuth開発サーバー起動
npm run oauth-server

# 統合開発環境（拡張機能 + OAuthサーバー）
npm run dev:full
```

## 次のステップ

- [Notion認証の設定](NOTION_AUTH.md) - Notion連携の設定方法
- [使い方ガイド](USAGE.md) - 基本的な使い方
- [開発ガイド](DEVELOPMENT.md) - コーディング規約や開発タスク
