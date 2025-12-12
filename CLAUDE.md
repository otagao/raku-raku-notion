# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

このドキュメントは、Claude CodeやGitHub Copilotなどの AI開発アシスタントがプロジェクトのコンテキストを理解するためのものです。

## 応答・コーディングに関する重要事項

- ユーザーに対しては日本語で応答し、コミットメッセージも日本語で記述してください。
- ユーザーは慣れない開発言語を用いることが想定されるため、指示に対して技術的に実装不可能な点や矛盾した点を見つけた場合はなるべく早く指摘してください。
- 人間の可読性を重視し、可能な限りモジュール化して開発を進めてください。
- CLAUDE.mdには細かな手順や更新履歴を追記しないでください。本当に重要なフローのみを追加するようにし、そのほかはdocs/以下のドキュメントに記述・適宜参照してください。
- バージョニングは勝手に切らないでください。また、バージョンを更新する際はpackage-lock.jsonなどの記述も正しく反映させてください。

## プロジェクト概要

**Raku Raku Notion** は、Notionのウェブクリップ機能を簡略化したブラウザ拡張機能です。

### 技術スタック

- **フレームワーク**: Plasmo v0.90.5 (ブラウザ拡張機能フレームワーク)
- **UI**: React 18.3.1 + TypeScript 5.9.3
- **ターゲット**: Chrome/Edge (Manifest V3)
- **ストレージ**: Chrome Storage API
- **API連携**: Notion API (OAuth 2.0 + 手動トークン対応)

詳細は [README.md](README.md) および [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

## 開発コマンド

```bash
# 開発サーバー起動（OAuth関連ファイルを自動コピー）
npm run dev

# 本番ビルド（環境変数チェック + ビルド + ファイルコピー）
npm run build

# OAuth関連ファイルのコピーのみ（通常は不要）
npm run dev:prepare

# クリーンビルド（ビルドエラー時）
rm -rf node_modules .plasmo build
npm install
npm run build
```

**ビルド出力**:
- 開発: `build/chrome-mv3-dev/`
- 本番: `build/chrome-mv3-prod/`

**デバッグ**:
```javascript
// ストレージ内容の確認（開発者ツールのコンソールで実行）
chrome.storage.local.get(null, (data) => console.log(data))

// ストレージのリセット
chrome.storage.local.clear()
```

## プロジェクト構造

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

```
src/
├── popup.tsx              # メインエントリーポイント
├── screens/               # 画面コンポーネント（HomeScreen, SettingsScreenなど）
├── components/            # 再利用可能コンポーネント
├── contents/              # Content Scripts（ページコンテンツ抽出）
├── services/              # ビジネスロジック層
│   ├── storage.ts         # Chrome Storage API ラッパー
│   └── notion.ts          # Notion API クライアント
├── background/            # Service Worker（OAuth + API呼び出し）
├── utils/                 # ユーティリティ（oauth.ts）
└── types/                 # TypeScript型定義

assets/
├── oauth-callback.html    # 拡張機能内OAuthコールバックページ
├── oauth-callback.js      # コールバック処理スクリプト
└── icon*.png              # 拡張機能アイコン

oauth-static/              # 静的サイト用OAuthコールバックページ
                          # （Cloudflare Pages等にデプロイ）
```

## 重要な設計決定

### 1. ストレージ構造

詳細は [src/services/storage.ts](src/services/storage.ts) を参照。

```typescript
// Chrome Storage Local
{
  'raku-clipboards': Clipboard[],     // クリップボードリスト
  'raku-notion-config': NotionConfig, // Notion設定
  'raku-initialized': boolean         // 初期化フラグ
}
```

### 2. 型定義

詳細は [src/types/index.ts](src/types/index.ts) を参照。

主要な型:
- `Clipboard`: クリップボード定義
- `NotionConfig`: Notion認証設定 (OAuth/手動トークン両対応)
- `WebClipData`: Webクリップデータ

### 3. 画面遷移フロー

```
HomeScreen
  ├─> 📎 このページをクリップ
  │     ├─> (クリップボードが0個) → CreateClipboardScreen
  │     ├─> (クリップボードが1個) → 自動クリップ → 完了
  │     └─> (クリップボードが複数) → SelectClipboardScreen → クリップ → 完了
  ├─> ClipboardListScreen (クリップボード一覧を見る)
  └─> SettingsScreen (⚙️設定アイコン)
        ├─> OAuth認証フロー
        └─> 手動トークン入力
```

### 4. OAuth認証フロー

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) を参照。

**重要な設計ポイント**:
- 静的サイトホスティング（Cloudflare Pages等）を使用
- stateパラメータに拡張機能IDを埋め込み（Base64: `extensionId:randomToken`）
- CSRF対策: stateパラメータ検証
- CSP対応: インラインスクリプトを外部ファイル（`oauth-callback.js`）に分離
- 環境変数の扱い: OAuth設定はbackgroundで環境変数から直接取得

**認証フロー**:
1. SettingsScreen → `start-oauth` メッセージ → backgroundがOAuth URL生成、`raku-oauth-pending: true`を保存
2. Notion認証画面 → 静的サイトの`callback.html`（stateから拡張機能IDを抽出）
3. 拡張機能の`oauth-callback.html`にリダイレクト → `complete-oauth`メッセージ（codeとstateのみ）
4. backgroundがトークン交換、設定保存、`raku-oauth-pending`削除
5. SettingsScreenが`chrome.storage.onChanged`で完了を検出、成功メッセージ表示

## コーディング規約

### TypeScript

- Strict mode 有効
- 明示的な型定義を推奨
- `any` の使用を避ける
- Optional chaining (`?.`) を積極的に使用

### React

- 関数コンポーネント + Hooks
- Props の interface を明示的に定義

### ファイル命名

- コンポーネント: PascalCase (例: `HomeScreen.tsx`)
- ユーティリティ: camelCase (例: `storage.ts`)

### CSS

- グローバルスタイル: `global.css`
- クラス名: kebab-case

## よくある開発タスク

詳細は [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) を参照してください。

### 新しい画面を追加

1. `src/screens/NewScreen.tsx` を作成
2. `src/types/index.ts` の Screen 型に追加
3. `src/popup.tsx` のルーティングに追加

### 新しいストレージキーを追加

1. `src/services/storage.ts` の `STORAGE_KEYS` に追加
2. 対応する getter/setter メソッドを追加
3. 型定義を `src/types/index.ts` に追加

### OAuth認証のデバッグ

**デバッグログ確認箇所**:
- **Service Worker**: chrome://extensions/ → 拡張機能の詳細 → Service Worker → `[Background]` プレフィックス付きログ
- **コールバックページ**: OAuth認証後の`oauth-callback.html`でF12 → `[OAuth Callback]` プレフィックス付きログ
- **設定画面**: 拡張機能ポップアップでF12 → `[Settings]` プレフィックス付きログ

詳細は [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) のトラブルシューティングセクションを参照。

## 開発者向けメモ

### Plasmo特有の仕様

- `~` エイリアスは `src/` ディレクトリを指す
- マニフェスト設定は `package.json` の `manifest` フィールドに記述
- ビルド出力: `build/chrome-mv3-dev/` (開発) / `build/chrome-mv3-prod/` (本番)

### Chrome Storage API

- 容量制限: 5MB (local), 100KB (sync)
- 非同期APIなので async/await を使用
- Date オブジェクトは文字列として保存される

### Notion API統合

本プロジェクトは2つの認証方式に対応:

1. **OAuth認証** (本番環境推奨)
   - 静的サイトホスティング（Cloudflare Pages等）が必要
   - 環境変数設定: `.env`ファイルにClient ID/Secret/Redirect URIを記述
   - redirect_uriは**完全一致**が必須（Notion Integration設定、`.env`ファイル、静的サイトのファイル名）
   - 詳細: [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md)

2. **手動トークン入力** (開発・テスト推奨)
   - Internal Integrationを使用
   - セットアップが簡単（5分で完了）
   - 詳細: [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md)

#### API呼び出し方法

```typescript
// Background経由（推奨）
chrome.runtime.sendMessage({
  type: 'clip-page',
  data: { title, url, databaseId }
})

// 直接呼び出し（popup内、必要な場合のみ）
import { createNotionClient } from '~services/notion'
const config = await StorageService.getNotionConfig()
const client = createNotionClient(config)
await client.createWebClip({ title, url, databaseId })
```

## 参考資料

- [README.md](README.md) - プロジェクト説明と使い方
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - アーキテクチャの詳細
- [docs/OAUTH_SETUP_GUIDE.md](docs/OAUTH_SETUP_GUIDE.md) - OAuth設定ガイド
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - 開発ガイド
- [Plasmo公式ドキュメント](https://docs.plasmo.com)
- [Chrome拡張機能ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Notion API リファレンス](https://developers.notion.com/)

---

**バージョン**: 1.0.3
**最終更新**: 2025-12-12
