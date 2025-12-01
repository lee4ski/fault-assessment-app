# MCP Visual Verification Tests

## 自動実行されるテスト

デプロイ前に以下のテストが自動的に実行されます：

### 1. リンク切れチェック ✅

**検証内容**:
- すべての内部リンクが機能する
- ナビゲーションボタンが正常に動作する
- 404エラーがない

**実行方法**:
```bash
npm run test:mcp:comprehensive
```

**検証項目**:
- [x] ページ内のすべてのリンクを抽出
- [x] 内部リンクの数を確認
- [x] 外部リンクの数を確認
- [x] 404エラーがないことを確認

### 2. 視覚的なレイアウトチェック ✅

**検証内容**:
- 要素が重なっていない
- 適切な間隔が保たれている
- CSSの問題がない

**実行方法**:
```bash
npm run test:mcp:comprehensive
```

**検証項目**:
- [x] 絶対配置要素の数を確認（重なりのリスク）
- [x] z-indexの競合を確認
- [x] 視覚的な問題の兆候を検出

### 3. チャットエリアの検証 ✅

**検証内容**:
- チャットウィンドウの構造が正しい
- 必要な要素がすべて存在する
- 機能的な問題がない

**実行方法**:
```bash
npm run test:mcp:comprehensive
```

**検証項目**:
- [x] チャットウィンドウヘッダーが存在
- [x] チャット入力フィールドが存在
- [x] 送信ボタンが存在
- [x] チャットエリアの構造が正しい

### 4. 必須要素の確認 ✅

**検証内容**:
- すべての必須UI要素が存在する
- テキストが正しく表示される

**検証項目**:
- [x] メイン見出し "過失割合計算機"
- [x] ステップ1 "認定基準の検索"
- [x] チャットウィンドウ "アシスタントチャット"
- [x] ナビゲーションボタン

## MCPブラウザーツールによる詳細テスト

自動テストに加えて、MCPブラウザーツールを使用した詳細な視覚テストも実行できます：

### 視覚的重なりチェック

```javascript
// MCPブラウザーツールで実行
browser_navigate("http://localhost:3000")
browser_snapshot()
browser_take_screenshot({fullPage: true})

// 要素の位置を確認
// 重なっている要素がないか視覚的に確認
```

### チャット機能の詳細テスト

```javascript
// チャットウィンドウの折りたたみテスト
browser_click({element: "chat window header"})
browser_wait_for({time: 1})
browser_snapshot() // 折りたたまれた状態を確認

// チャットメッセージ送信テスト
browser_type({element: "chat input", text: "テスト"})
browser_click({element: "send button"})
browser_wait_for({time: 3})
browser_snapshot() // AI応答を確認
```

### リンク動作テスト

```javascript
// すべてのボタンをクリックして動作確認
browser_click({element: "step 2 button"})
browser_wait_for({time: 1})
browser_network_requests() // エラーを確認

browser_click({element: "step 3 button"})
browser_wait_for({time: 1})
browser_network_requests() // エラーを確認
```

## テスト結果

テスト結果は以下のファイルに保存されます：
- `tests/mcp-comprehensive-results.json` - 包括的テスト結果
- `tests/mcp-test-results.json` - 詳細テスト結果

## CI/CD統合

これらのテストは以下のタイミングで自動実行されます：

1. **GitHub Actions CI**: プッシュ/PR時
2. **デプロイ前**: `predeploy` スクリプトで実行
3. **ビルド前**: `prebuild` スクリプトで実行

テストが失敗した場合、デプロイは中止されます。

