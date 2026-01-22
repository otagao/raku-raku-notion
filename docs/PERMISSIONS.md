# 権限とプライバシーについて

Raku Raku Notionは**最小権限の原則（Principle of Least Privilege）**に基づいて設計されています。このドキュメントでは、拡張機能が要求する権限とその使用目的、プライバシー保護の取り組みについて説明します。

## 拡張機能が要求する権限

### 1. Notionへのアクセス (`https://*.notion.so/*`)

- **目的**: Notionのギャラリービュー自動作成、UI簡略化機能の提供
- **使用箇所**:
  - `src/contents/notion-simplify.ts`: Notion UIの簡略化（サイドバー・ツールバー非表示）
  - `src/contents/notion-api-helper.ts`: Notion内部API呼び出し（ギャラリービュー作成）
- **データの扱い**: Notionページ上でCookie認証を利用し、内部APIを呼び出すのみ。第三者への送信はありません。

### 2. activeTab

- **目的**: ユーザーが明示的にアクションを起こしたタブのみにアクセス
- **使用箇所**:
  - `src/contents/extract-content.ts`: ページコンテンツ抽出（動的注入）
  - `src/contents/iframe-ui.ts`: iframeベースのUI表示（動的注入）
- **動作タイミング**: ショートカット（Ctrl+Shift+Y）、コンテキストメニュー、拡張機能アイコンクリック時のみ
- **データの扱い**: ユーザーがクリップを実行したページのテキスト、画像、動画、メタデータを抽出し、Notionにのみ送信します。

### 3. storage

- **目的**: 拡張機能の設定をローカルに保存
- **使用箇所**: `src/services/storage.ts`
- **保存内容**:
  - Notion認証情報（OAuth アクセストークンまたは手動入力トークン）
  - クリップボード設定（データベースID、名前、アイコン）
  - UI簡略化設定、言語設定
- **データの扱い**: すべてのデータはChrome Storage API（`chrome.storage.local`）でローカルに保存され、クラウド同期はされません。

### 4. identity

- **目的**: OAuth 2.0認証フローの実装
- **使用箇所**: `src/background/index.ts`（`handleStartOAuth`, `handleCompleteOAuth`）
- **データの扱い**: Notion OAuth認証時に、認証コードをトークンに交換するために使用します。CLIENT_SECRETはCloudflare Workers上で管理され、クライアントサイドには露出しません。

### 5. tabs

- **目的**: アクティブタブの情報取得、メッセージ送信
- **使用箇所**: `src/background/index.ts`
- **データの扱い**: タブのURL、タイトルを取得し、Notionクリップ作成時に使用します。すべてのタブを監視するわけではなく、ユーザーがアクションを起こしたタブのみ対象です。

### 6. scripting

- **目的**: Content Scriptsの動的注入
- **使用箇所**: `src/background/index.ts`（`injectContentScripts`関数）
- **データの扱い**: ユーザーがアクションを起こした際に、対象タブへContent Scriptsを動的に注入します。自動的にすべてのページへスクリプトを注入することはありません。

### 7. contextMenus

- **目的**: 右クリックメニューに「Raku Raku Notion を開く」を追加
- **使用箇所**: `src/background/index.ts`
- **データの扱い**: コンテキストメニュークリック時に拡張機能UIを開くためのトリガーとして使用します。

### 8. optional_host_permissions (`https://*/*`, `http://*/*`)

- **目的**: パワーユーザー向けのオプション権限（デフォルトでは付与されません）
- **使用タイミング**: 将来の機能拡張時に、ユーザーが明示的に許可した場合のみ使用
- **現在の実装**: 未使用（Phase 5実装時に使用予定）

## データの扱い

### データ送信先

- **Notionのみ**: すべてのクリップデータ（テキスト、画像URL、動画URL、メタデータ）はNotionにのみ送信されます。
- **第三者への送信なし**: Google Analytics等の追跡ツール、広告ネットワーク、その他の第三者サーバーへのデータ送信は一切行いません。

### ローカルストレージ

- **Chrome Storage API**: すべての設定はChrome Storage API（`chrome.storage.local`）でローカルに保存されます。
- **クラウド同期なし**: `chrome.storage.sync`は使用していないため、設定がGoogleアカウントを通じて同期されることはありません。

### Cookieの扱い

- **Notion.so上でのみ使用**: Notion内部API呼び出し時に、Notion.soのCookieを使用してユーザー認証を行います。
- **Cookie送信先**: Notion.so（`https://www.notion.so/api/v3`）のみ
- **Cookie取得**: Content Script（`src/contents/notion-api-helper.ts`）がNotion.so上で実行されるため、ブラウザのCookie送信機能を利用します。拡張機能が独自にCookieを保存・送信することはありません。

## セキュリティ対策

### OAuth認証のセキュリティ

- **CLIENT_SECRETの保護**: Notion OAuth認証のCLIENT_SECRETは、Cloudflare Workers（`workers/src/handlers/exchange.ts`）上で管理され、クライアントサイド（拡張機能）には露出しません。
- **CSRF対策**: OAuth認証時にstateパラメータ（Base64エンコードされた拡張機能ID + ランダムトークン）を使用し、CSRF攻撃を防止します。
- **トークン保存**: 取得したアクセストークンはChrome Storage API（`chrome.storage.local`）にのみ保存され、ネットワーク経由で送信されることはありません（Notion APIリクエスト時を除く）。

### Content Script注入の制限

- **動的注入のみ**: Content Scriptsは自動的にすべてのページへ注入されません。ユーザーがショートカット、コンテキストメニュー、拡張機能アイコンをクリックした際に、対象タブにのみ動的に注入されます。
- **制限ページの保護**: `chrome://`, `edge://`, `about:`, Chrome Web Store等の制限ページへはContent Scriptsを注入せず、フォールバックとしてポップアップを表示します。
- **ping/pongパターン**: Content Scriptsが既に注入されているかを確認するため、`ping-iframe-ui`メッセージを送信して注入状態をチェックします。重複注入を防止します。

### CSP（Content Security Policy）対応

- **インラインスクリプトなし**: OAuth認証コールバックページ（`assets/oauth-callback.html`）では、インラインスクリプトを使用せず、外部ファイル（`assets/oauth-callback.js`）に分離しています。
- **`web_accessible_resources`の制限**: OAuth関連ファイル（`oauth-callback.html`, `oauth-callback.js`）は、Notion.so とコールバックページ（`raku-raku-notion.pages.dev`）からのみアクセス可能です。

## ソースコードの透明性

- **GitHubで全コード公開**: [https://github.com/otagao/raku-raku-notion](https://github.com/otagao/raku-raku-notion)
- **監査歓迎**: セキュリティ研究者による監査を歓迎します。問題が見つかった場合は、GitHubのIssuesまたはセキュリティアドバイザリ機能を通じて報告してください。
- **ライセンス**: ISCライセンスで公開しています。

## プライバシーポリシー

1. **個人情報の収集**: この拡張機能は、ユーザーの氏名、メールアドレス、IPアドレス等の個人情報を収集しません。
2. **追跡・分析**: Google Analytics、Sentry等の追跡・分析ツールは使用していません。
3. **広告なし**: 広告ネットワークとの連携は一切行っていません。
4. **データ保持期間**: ユーザーが拡張機能をアンインストールすると、Chrome Storage APIに保存されたすべてのデータが削除されます。

## よくある質問（FAQ）

### Q1: 「全ページへのアクセス」権限を要求されませんか？

**A**: 要求されません。この拡張機能は、`host_permissions: ["https://*.notion.so/*"]` のみを要求します。任意のページへのアクセスは、`activeTab`権限を使用してユーザーがアクションを起こした際にのみ行われます。

### Q2: クリップしたデータはどこに保存されますか？

**A**: クリップしたデータはNotionのデータベースに保存されます。拡張機能自体はデータを保存せず、Notionへの送信のみを行います。

### Q3: OAuth認証とトークン手動入力、どちらが安全ですか？

**A**: 両方とも安全です。OAuth認証は、CLIENT_SECRETをCloudflare Workers上で管理するため、クライアントサイドへの露出がありません。トークン手動入力は、Internal IntegrationのAPIキーを使用するため、アクセス範囲が限定されます。

### Q4: Notion以外のサービスにもデータが送信されますか？

**A**: いいえ。すべてのクリップデータはNotionにのみ送信されます。第三者サーバーへのデータ送信は一切行いません。

### Q5: 拡張機能をアンインストールした後もデータは残りますか？

**A**: Chrome Storage APIに保存された設定データ（認証情報、クリップボード設定など）は、アンインストール時に自動的に削除されます。ただし、Notionに保存されたクリップデータは削除されませんので、必要に応じてNotion上で削除してください。

---

**最終更新**: 2026-01-22
**バージョン**: 1.0.7
**問い合わせ先**: [GitHub Issues](https://github.com/otagao/raku-raku-notion/issues)
