# Raku Raku Notion - OAuth認証静的サイト

このディレクトリには、Raku Raku NotionのOAuth認証フローで使用する静的HTMLページが含まれています。

## 📁 ファイル構成

```
oauth-static/
├── callback.html    # OAuth認証コールバックページ（メイン）
├── error.html       # 認証エラー時のフォールバックページ
├── privacy.html     # プライバシーポリシー
├── terms.html       # 利用規約
└── README.md        # このファイル
```

## 🎯 各ページの役割

### 1. callback.html（メインページ）
- **役割**: NotionのOAuth認証後にリダイレクトされるページ
- **機能**:
  - URLパラメータから `code` と `state` を取得
  - Chrome拡張機能にリダイレクト（`chrome-extension://<ID>/oauth-callback.html`）
  - エラーハンドリングとユーザーへのフィードバック

### 2. error.html（エラーページ）
- **役割**: 認証失敗時に表示するページ
- **機能**:
  - エラー理由の表示
  - トラブルシューティングガイド
  - 再試行ボタン

### 3. privacy.html（プライバシーポリシー）
- **役割**: 拡張機能のプライバシー保護方針を説明
- **内容**:
  - 収集する情報と使用目的
  - 第三者（Notion）への情報提供
  - セキュリティ対策
  - ユーザーの権利

### 4. terms.html（利用規約）
- **役割**: 拡張機能の利用条件を定義
- **内容**:
  - 利用条件と禁止事項
  - 免責事項
  - 知的財産権
  - 準拠法

## 🚀 デプロイ手順

### 推奨ホスティングサービス

以下のいずれかの無料静的サイトホスティングサービスを推奨します：

1. **GitHub Pages**（推奨）
2. **Vercel**
3. **Netlify**
4. **Cloudflare Pages**

---

## 📦 デプロイ方法

### Option 1: GitHub Pages（推奨）

#### ステップ1: リポジトリ設定
```bash
# 1. GitHubリポジトリを作成（まだの場合）
# 2. oauth-staticディレクトリをpush
git add oauth-static/
git commit -m "add: OAuth認証用静的サイト"
git push origin main
```

#### ステップ2: GitHub Pages有効化
1. GitHubリポジトリページにアクセス
2. **Settings** → **Pages** に移動
3. **Source** を `Deploy from a branch` に設定
4. **Branch** を `main` / `/ (root)` に設定
5. **Save** をクリック

#### ステップ3: カスタムパス設定（オプション）
GitHub Pagesはルートから配信されるため、以下のように設定：
- デプロイURL: `https://<username>.github.io/<repo-name>/oauth-static/callback.html`

または、oauth-staticを別ブランチに分離：
```bash
git checkout -b gh-pages
git filter-branch --subdirectory-filter oauth-static HEAD
git push origin gh-pages
```
→ デプロイURL: `https://<username>.github.io/<repo-name>/callback.html`

---

### Option 2: Vercel

#### ステップ1: Vercelプロジェクト作成
```bash
# Vercel CLIインストール
npm install -g vercel

# oauth-staticディレクトリに移動
cd oauth-static

# デプロイ
vercel
```

#### ステップ2: 設定
- **Project Name**: `raku-raku-notion-oauth`
- **Framework Preset**: `Other`
- **Root Directory**: `./`（oauth-staticディレクトリから実行した場合）

デプロイURL: `https://raku-raku-notion-oauth.vercel.app/callback.html`

---

### Option 3: Netlify

#### ステップ1: Netlifyダッシュボードでデプロイ
1. [Netlify](https://app.netlify.com/) にログイン
2. **Add new site** → **Import an existing project**
3. GitHubリポジトリを選択
4. **Base directory**: `oauth-static`
5. **Deploy** をクリック

デプロイURL: `https://<site-name>.netlify.app/callback.html`

---

### Option 4: Cloudflare Pages

#### ステップ1: Cloudflare Pagesプロジェクト作成
1. [Cloudflare Pages](https://pages.cloudflare.com/) にログイン
2. **Create a project** をクリック
3. GitHubリポジトリを接続
4. **Build settings**:
   - **Build command**: (空欄)
   - **Build output directory**: `oauth-static`
5. **Save and Deploy**

デプロイURL: `https://<project-name>.pages.dev/callback.html`

---

## ⚙️ デプロイ後の設定

### 1. 拡張機能IDの更新

デプロイ後、以下のファイルの `YOUR_EXTENSION_ID` を実際の拡張機能IDに置き換えてください：

#### callback.html（45行目付近）
```javascript
const extensionUrl = `chrome-extension://YOUR_EXTENSION_ID/oauth-callback.html?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
```

#### error.html（94, 102行目付近）
```javascript
const extensionUrl = 'chrome-extension://YOUR_EXTENSION_ID/popup.html#settings';
```

### 拡張機能IDの確認方法
1. Chromeで `chrome://extensions/` を開く
2. **開発者モード** を有効化
3. Raku Raku Notion拡張機能の「ID」をコピー
   - 例: `abcdefghijklmnopqrstuvwxyz012345`

### 2. Notion Integration設定

デプロイしたURLをNotion Integrationに設定：

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 作成したIntegrationを選択
3. **OAuth Domain & URIs** セクション:
   - **Redirect URIs**: デプロイしたcallback.htmlのURL
     ```
     例: https://yourusername.github.io/raku-raku-notion/oauth-static/callback.html
     ```

4. **Save changes**

### 3. 拡張機能の環境変数更新

プロジェクトルートの `.env` ファイルを更新：

```bash
# Notion OAuth設定
PLASMO_PUBLIC_NOTION_CLIENT_ID=your_client_id_here
PLASMO_PUBLIC_NOTION_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URI（デプロイしたURL）
PLASMO_PUBLIC_OAUTH_REDIRECT_URI=https://yourusername.github.io/raku-raku-notion/oauth-static/callback.html
```

### 4. ソースコード更新

[src/utils/oauth.ts](../src/utils/oauth.ts) の `generateAuthUrl()` を確認：

```typescript
export function generateAuthUrl(state: string): string {
  const clientId = process.env.PLASMO_PUBLIC_NOTION_CLIENT_ID
  const redirectUri = process.env.PLASMO_PUBLIC_OAUTH_REDIRECT_URI ||
                      'https://yourusername.github.io/raku-raku-notion/oauth-static/callback.html'

  // ...
}
```

---

## 🔒 セキュリティチェックリスト

デプロイ前に以下を確認してください：

- [ ] `.env` ファイルに Client Secret が含まれていないこと（サーバーサイドのみで使用）
- [ ] `callback.html` で state パラメータを検証していること
- [ ] HTTPS通信が有効になっていること（無料ホスティングは全て対応）
- [ ] エラーメッセージに機密情報が含まれていないこと
- [ ] プライバシーポリシーと利用規約が最新であること

---

## 🧪 テスト手順

デプロイ後、以下の手順で動作確認：

### 1. 手動テスト
1. Chrome拡張機能を開く
2. 設定画面 → **Notionと連携** をクリック
3. Notion認証画面で **許可する** をクリック
4. デプロイした `callback.html` にリダイレクトされることを確認
5. 拡張機能に自動的に戻り、認証完了メッセージが表示されることを確認

### 2. エラーケーステスト
```
# エラーパラメータ付きでアクセス
https://your-domain.com/oauth-static/callback.html?error=access_denied

# パラメータなしでアクセス
https://your-domain.com/oauth-static/callback.html

→ error.html にリダイレクトされることを確認
```

### 3. ブラウザコンソールチェック
- `[OAuth Callback]` プレフィックス付きログを確認
- JavaScriptエラーがないことを確認

---

## 🐛 トラブルシューティング

### 問題: callback.htmlから拡張機能にリダイレクトされない

**原因**: 拡張機能IDが正しく設定されていない

**解決策**:
1. `callback.html` の `YOUR_EXTENSION_ID` を実際のIDに置き換え
2. 再デプロイ

### 問題: "Invalid redirect URI" エラー

**原因**: Notion IntegrationのRedirect URIが一致していない

**解決策**:
1. Notion Developersページでコールバックパラメータと正確に一致させる
2. 末尾のスラッシュ `/` の有無に注意

### 問題: CORSエラーが発生する

**原因**: HTTPSではなくHTTPでアクセスしている

**解決策**:
- 全ての無料ホスティングサービスはHTTPSを自動提供
- ローカルテストの場合は `http://localhost` を使用

---

## 📝 カスタマイズ

### デザイン変更
各HTMLファイルの `<style>` タグ内でCSSをカスタマイズできます。

### GitHubリポジトリリンク変更
以下のファイルの `https://github.com/otagao/raku-raku-notion` を実際のURLに変更：
- `error.html`
- `privacy.html`
- `terms.html`

---

## 📚 参考リンク

- [Notion OAuth Documentation](https://developers.notion.com/docs/authorization)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

---

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

**最終更新**: 2025年12月2日
