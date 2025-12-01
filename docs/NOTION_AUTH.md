# Notion認証設定ガイド

拡張機能を使用する前に、Notionとの連携設定が必要です。

## 認証方法の選択

**2つの認証方法**:
1. **手動トークン入力**（推奨 - 開発・テスト用）- シンプルで即座に使える
2. **OAuth認証**（本番環境用）- ユーザーフレンドリーだが設定が複雑

## 手動トークン入力（推奨）

最も簡単な方法は、Internal Integrationを使用した手動トークン入力です。

### セットアップ手順

1. [Notion Developers](https://www.notion.so/my-integrations) で「New integration」作成
   - Type: **Internal integration**
   - Capabilities: Read, Update, Insert content を有効化
2. **Internal Integration Token**（秘密キー）をコピー
3. 拡張機能の設定画面（⚙️）を開く
4. 「手動トークン入力」を選択してトークンを貼り付け
5. 「保存して接続」をクリック
6. クリップボード作成時に自動的にデータベースが作成されます

### トークンの更新

トークンが無効になった場合：
1. [Notion Developers](https://www.notion.so/my-integrations) で新しいトークンを生成
2. 設定画面で「連携解除」をクリック
3. 新しいトークンを入力して再接続

## OAuth認証（上級者向け）

**重要**: NotionのOAuth認証では`chrome-extension://`スキームが使用できません。開発環境ではlocalhostサーバーが必要です。

### 1. Notion Integrationの作成

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下の情報を入力:
   - **Name**: Raku Raku Notion（任意の名前）
   - **Type**: Public integration を選択
   - **Associated workspace**: 使用するワークスペースを選択
4. 「Capabilities」で以下を有効化:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. 「OAuth Domain & URIs」で以下を設定:
   - **Redirect URIs**: `http://localhost:3000/oauth/callback`
6. 「Submit」をクリックして保存
7. **Client ID** と **Client Secret** をコピー

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成:

```bash
# .env.example をコピー
cp .env.example .env

# エディタで編集
code .env
```

`.env` ファイルに以下を追加:

```env
PLASMO_PUBLIC_NOTION_CLIENT_ID=your_client_id_here
PLASMO_PUBLIC_NOTION_CLIENT_SECRET=your_client_secret_here
```

### 3. 開発サーバーとOAuthサーバーの起動

OAuth認証を使用するには、2つのサーバーを同時に起動する必要があります:

```bash
# 方法1: 一括起動（推奨）
npm run dev:full

# 方法2: 個別起動
# ターミナル1
npm run dev

# ターミナル2
npm run oauth-server
```

OAuthサーバーが起動すると、以下のメッセージが表示されます:
```
🚀 Raku Raku Notion - OAuth Callback Server
✓ Server running at http://localhost:3000
✓ Callback URL: http://localhost:3000/oauth/callback
```

### 4. OAuth認証の実行

1. 拡張機能を開く
2. 右上の ⚙️（設定）アイコンをクリック
3. 「認証方法」で「OAuth認証（推奨）」を選択
4. 「Notionで認証」ボタンをクリック
5. Notionの認証画面で「許可する」をクリック
6. `http://localhost:3000`にリダイレクトされ、自動的に認証が完了します
7. 設定画面に戻り、接続状態が「接続済み」になります

### OAuth認証のトラブルシューティング

詳細なトラブルシューティングは [OAUTH_SETUP_GUIDE.md](../OAUTH_SETUP_GUIDE.md) を参照してください。

## 認証後の確認

認証が成功すると、設定画面に以下が表示されます：
- **接続状態**: 緑色のインジケータと「接続済み」
- **ワークスペース名**（OAuth認証の場合）

## 次のステップ

- [使い方ガイド](USAGE.md) - クリップボードの作成とWebクリップの方法
