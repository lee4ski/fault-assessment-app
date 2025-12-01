# MCP Deployment Checklist

デプロイ前に実行すべきMCP視覚テストのチェックリストです。

## 自動チェック（CI/CD）

以下のチェックは自動的に実行されます：

### ✅ サーバーアクセシビリティ
- [ ] サーバーが起動している
- [ ] ページが正常に読み込まれる
- [ ] HTTPステータスコード200を返す

### ✅ ページ構造
- [ ] 必要な要素が存在する
- [ ] タイトルが正しく表示される
- [ ] メインコンテンツが表示される

### ✅ 環境変数
- [ ] OPENAI_API_KEYが設定されている

## 手動MCPテスト（推奨）

以下のテストは、MCPブラウザーツールを使用して手動で実行してください：

### 1. リンク切れチェック

**実行方法**:
```javascript
// MCPブラウザーツールで実行
browser_navigate("http://localhost:3000")
browser_snapshot()

// すべてのボタンをクリックして動作確認
browser_click({element: "step 2 button"})
browser_wait_for({time: 1})
browser_snapshot()

browser_click({element: "step 3 button"})
browser_wait_for({time: 1})
browser_snapshot()

// ネットワークリクエストを確認
browser_network_requests()
```

**確認項目**:
- [ ] すべてのナビゲーションボタンが機能する
- [ ] ステップ間の移動が正常に動作する
- [ ] 404エラーがない
- [ ] ネットワークエラーがない

### 2. 視覚的なレイアウトチェック

**実行方法**:
```javascript
browser_navigate("http://localhost:3000")
browser_snapshot()
browser_take_screenshot({fullPage: true})
```

**確認項目**:
- [ ] 要素が重なっていない
- [ ] テキストが読みやすい
- [ ] ボタンが適切に配置されている
- [ ] レスポンシブレイアウトが正しい
- [ ] チャットウィンドウが正しく表示される

### 3. チャットエリアの検証

**実行方法**:
```javascript
// チャットウィンドウの表示確認
browser_snapshot()
// チャットヘッダーをクリックして折りたたみ
browser_click({element: "chat window header"})
browser_wait_for({time: 1})
browser_snapshot()
// 再度クリックして展開
browser_click({element: "chat window header"})
browser_wait_for({time: 1})
// メッセージを送信
browser_type({element: "chat input", text: "テストメッセージ"})
browser_click({element: "send button"})
browser_wait_for({time: 3})
browser_snapshot()
```

**確認項目**:
- [ ] チャットウィンドウが表示される
- [ ] 折りたたみ/展開が機能する
- [ ] 入力フィールドがアクセス可能
- [ ] メッセージ送信が機能する
- [ ] AI応答が表示される
- [ ] 視覚的な問題がない

### 4. インタラクティブ要素の検証

**実行方法**:
```javascript
// 検索機能
browser_type({element: "search input", text: "交差点"})
browser_wait_for({time: 2})
browser_snapshot()

// ステップ移動
browser_click({element: "step 1 button"})
browser_wait_for({time: 1})
browser_snapshot()
```

**確認項目**:
- [ ] すべてのボタンがクリック可能
- [ ] 入力フィールドが機能する
- [ ] 検索結果が表示される
- [ ] ステップ移動が機能する

### 5. コンソールエラーチェック

**実行方法**:
```javascript
browser_console_messages()
```

**確認項目**:
- [ ] 重大なエラーがない
- [ ] 警告のみ（React DevToolsなど）
- [ ] ネットワークエラーがない

## テスト実行コマンド

```bash
# 自動チェック（サーバーアクセシビリティなど）
npm run test:mcp:check

# 手動テストの説明を表示
npm run test:mcp

# すべてのテストを実行
npm run test:ci && npm run test:mcp:check
```

## デプロイ前の必須チェック

デプロイ前に以下を確認してください：

1. ✅ すべてのユニットテストが通過
2. ✅ サーバーが正常に起動
3. ✅ ページが正常に読み込まれる
4. ✅ チャット機能が動作する（手動確認推奨）
5. ✅ 視覚的な問題がない（スクリーンショット確認）

## トラブルシューティング

### サーバーが起動しない
```bash
# ポートが使用中か確認
lsof -ti:3000

# 開発サーバーを起動
npm run dev
```

### テストが失敗する
1. エラーメッセージを確認
2. ブラウザコンソールを確認
3. ネットワークタブでエラーを確認
4. サーバーログを確認

