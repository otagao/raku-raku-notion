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
- 🔐 **Notion OAuth認証**: 静的サイトホスティング対応の安全な認証フロー（手動トークンにも対応）
- 🎨 **シンプルなUI**: Notionスタイルを参考にした直感的なデザイン
- ⚡ **自動データベース作成**: クリップボード作成時に自動でNotionデータベースを生成
- 🖼️ **ギャラリービュー自動設定**: 新規データベースをギャラリー形式で表示（デフォルトビューを自動削除）
- 📄 **自動コンテンツ抽出**: ページ本文、サムネイル、アイコンを自動取得
- 📝 **メモ機能**: クリップ時にメモを追加可能（IME対応）

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

### ✅ Phase 1-4: 完了

- [x] 基本UI構造
- [x] Notion OAuth認証（静的サイトホスティング対応）
- [x] Webクリップ機能
- [x] 複数クリップボード選択
- [x] ページ本文の自動抽出（Content Script）
- [x] サムネイル画像・アイコンの自動取得（OGP対応）
- [x] メモ機能（IME対応）
- [x] stateパラメータから拡張機能IDを自動抽出

### 🔜 Phase 5: カスタマイズ機能

**目標**: ユーザーごとのニーズに対応

- [ ] フォームフィールドのカスタマイズ
- [ ] タグ・カテゴリ管理
- [ ] ショートカットキー対応
- [ ] クリップボードのエクスポート/インポート

### 🔮 Phase 6: Chrome Web Store公開

**目標**: 一般ユーザーが利用可能に

- [ ] 本番環境用ビルド最適化
- [ ] プライバシーポリシー・利用規約の準備（完了）
- [ ] Chrome Web Storeへの申請
- [ ] ユーザーサポート体制の構築

詳細なロードマップは [docs/CHANGELOG.md](docs/CHANGELOG.md) を参照してください。

## 📁 プロジェクト構造

```
raku-raku-notion/
├── src/
│   ├── popup.tsx              # メインエントリーポイント
│   ├── screens/               # 画面コンポーネント
│   ├── components/            # 再利用可能コンポーネント
│   ├── contents/              # Content Scripts（ページコンテンツ抽出）
│   ├── services/              # ビジネスロジック層
│   ├── background/            # Service Worker
│   ├── utils/                 # ユーティリティ
│   └── types/                 # TypeScript型定義
├── oauth-static/              # OAuth認証用静的サイト
│   ├── callback.html          # OAuth認証コールバック
│   ├── error.html             # エラーページ
│   ├── privacy.html           # プライバシーポリシー
│   ├── terms.html             # 利用規約
│   └── README.md              # デプロイ手順
├── docs/                      # ドキュメント
├── assets/                    # アイコンなど
└── build/                     # ビルド出力
```

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

## 🛠️ 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# ストレージのリセット（開発者ツールのコンソールで実行）
chrome.storage.local.clear()
```

**注意**: OAuth認証のテストには、`oauth-static/`を静的サイトホスティング（Cloudflare Pages等）にデプロイする必要があります。
詳細は [oauth-static/README.md](oauth-static/README.md) を参照してください。

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

## 🔧 トラブルシューティング

### OAuth認証ボタンが押せない（グレーアウトしている）

**症状**：設定画面でOAuth認証ボタンが無効化されていて押せない

**原因**：
- 環境変数が正しくビルドに埋め込まれていない
- OAuth処理中フラグがスタック状態になっている

**対処方法**：

1. **開発者ツールでログを確認**
   - F12キーを押して開発者ツールを開く
   - コンソールタブで `[Settings] OAuth Config Debug:` を探す
   - `clientId: 'MISSING'` と表示されている場合は、開発者に連絡してください

2. **ストレージをリセット**（一時的な問題の場合）
   - F12キーを押して開発者ツールを開く
   - コンソールで以下を実行：
   ```javascript
   chrome.storage.local.clear()
   ```
   - 拡張機能を再読み込み

3. **拡張機能を再インストール**
   - 拡張機能をアンインストール
   - 最新版を再インストール

詳細は [docs/OAUTH_BUTTON_FIX.md](docs/OAUTH_BUTTON_FIX.md) を参照してください。

### その他の問題

その他の問題については、[docs/](docs/)ディレクトリ内の関連ドキュメントを参照してください：
- [OAuth設定ガイド](docs/OAUTH_SETUP_GUIDE.md)
- [Notion認証について](docs/NOTION_AUTH.md)

## 📚 参考資料

- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)
- [React公式ドキュメント](https://react.dev/)

## 📞 お問い合わせ

質問やフィードバックは、GitHubのIssueでお願いします。

---

**バージョン**: 1.0.3 (OAuth認証デバッグ機能強化)
**最終更新**: 2025-12-02
