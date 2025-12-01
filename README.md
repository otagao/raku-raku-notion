# Raku Raku Notion

> Notionのウェブクリップ機能を簡略化したブラウザ拡張機能

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Plasmo](https://img.shields.io/badge/Plasmo-0.90-blueviolet.svg)](https://www.plasmo.com/)

ウェブページの情報を簡単にNotionに保存できるブラウザ拡張機能です。
Notionの公式ウェブクリッパーよりもシンプルで、カスタマイズ可能な設計を目指しています。

## ✨ 主な機能

- 📎 **ワンクリックWebクリップ**: 現在のページをNotionに即座に保存
- 📋 **クリップボード管理**: 複数のクリップボードで情報を整理
- 🔐 **Notion OAuth認証**: 安全な認証フロー（手動トークンにも対応）
- 🎨 **シンプルなUI**: Notionスタイルを参考にした直感的なデザイン
- ⚡ **自動データベース作成**: クリップボード作成時に自動でNotionデータベースを生成

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

## 🚀 クイックスタート

### 1. インストール

```bash
git clone https://github.com/otagao/raku-raku-notion.git
cd raku-raku-notion
npm install
npm run dev
```

### 2. ブラウザに読み込み

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `build/chrome-mv3-dev` フォルダを選択

### 3. Notion連携

1. 拡張機能の設定（⚙️）を開く
2. 「手動トークン入力」を選択
3. [Notion Integration](https://www.notion.so/my-integrations) でトークンを作成
4. トークンを貼り付けて「保存して接続」

詳細は [docs/SETUP.md](docs/SETUP.md) と [docs/NOTION_AUTH.md](docs/NOTION_AUTH.md) を参照してください。

## 📖 ドキュメント

- [セットアップガイド](docs/SETUP.md) - 開発環境の構築
- [Notion認証設定](docs/NOTION_AUTH.md) - 認証方法の詳細
- [使い方ガイド](docs/USAGE.md) - 基本的な使い方
- [開発ガイド](docs/DEVELOPMENT.md) - コーディング規約と開発タスク
- [プロジェクト構造](docs/ARCHITECTURE.md) - アーキテクチャの詳細
- [変更履歴](docs/CHANGELOG.md) - リリースノート
- [OAuth設定ガイド](docs/OAUTH_SETUP_GUIDE.md) - OAuth認証の詳細設定

## 🗓️ ロードマップ

### ✅ Phase 1-3: 完了

- [x] 基本UI構造
- [x] Notion OAuth認証
- [x] Webクリップ機能
- [x] 複数クリップボード選択

### 🔜 Phase 4: コンテンツ強化

**目標**: より豊富な情報をクリップ

- [ ] ページ本文の自動抽出（Content Script）
- [ ] サムネイル画像の取得（OGP対応）
- [ ] メタデータの自動抽出

### 🔮 Phase 5: カスタマイズ機能

**目標**: ユーザーごとのニーズに対応

- [ ] フォームフィールドのカスタマイズ
- [ ] タグ・カテゴリ管理
- [ ] ショートカットキー対応

詳細なロードマップは [docs/CHANGELOG.md](docs/CHANGELOG.md) を参照してください。

## 📁 プロジェクト構造

```
raku-raku-notion/
├── src/
│   ├── popup.tsx              # メインエントリーポイント
│   ├── screens/               # 画面コンポーネント
│   ├── services/              # ビジネスロジック層
│   ├── background/            # Service Worker
│   ├── utils/                 # ユーティリティ
│   └── types/                 # TypeScript型定義
├── docs/                      # ドキュメント
├── assets/                    # アイコンなど
├── oauth-server.js            # OAuth開発サーバー
└── build/                     # ビルド出力
```

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

## 🛠️ 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# OAuth開発サーバー起動
npm run oauth-server

# 統合開発環境（拡張機能 + OAuthサーバー）
npm run dev:full
```

## 🤝 貢献

プルリクエストを歓迎します！

### 貢献の流れ

1. リポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) を参照してください。

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

**バージョン**: 1.3.0 (Webクリップ機能完成)
**最終更新**: 2025-12-01
