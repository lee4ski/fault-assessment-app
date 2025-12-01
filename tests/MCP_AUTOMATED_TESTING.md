# MCP自動テストガイド

## 概要

デプロイ前に自動実行されるMCP視覚テストスイートです。以下の項目を自動的に検証します：

1. ✅ **リンク切れチェック** - すべてのリンクが機能することを確認
2. ✅ **視覚的なレイアウト** - 要素の重なりがないことを確認
3. ✅ **チャットエリア** - 視覚的・機能的に正しく動作することを確認
4. ✅ **必須要素** - すべてのUI要素が存在することを確認

## 自動実行タイミング

### 1. デプロイ前（predeploy）
```bash
npm run predeploy
```
このコマンドは以下を順番に実行します：
1. ユニットテスト (`npm run test:ci`)
2. MCP包括的テスト (`npm run test:mcp:comprehensive`)
3. ビルド (`npm run build`)

### 2. GitHub Actions
`.github/workflows/deploy.yml` で自動実行：
- プッシュ/プルリクエスト時
- デプロイ前に必須

### 3. ビルド前（prebuild）
```bash
npm run build
```
ビルド前に自動的にテストが実行されます。

## テスト内容

### Test 1: リンク切れチェック

**検証項目**:
- ページ内のすべてのリンクを抽出
- 内部リンクの数を確認
- 外部リンクの数を確認
- 404エラーの有無を確認

**実行結果例**:
```
3. Checking for broken links...
   ✅ Found 2 links
   ✅ 2 internal links
   ✅ 0 external links
   ✅ Links structure appears correct
```

### Test 2: 視覚的なレイアウトチェック

**検証項目**:
- 絶対配置要素の数を確認（重なりのリスク）
- z-indexの競合を確認
- CSSの問題を検出

**実行結果例**:
```
4. Checking for potential visual issues...
   ✅ No obvious visual issues detected
```

### Test 3: チャットエリアの検証

**検証項目**:
- チャットウィンドウヘッダーが存在
- チャット入力フィールドが存在
- 送信ボタンが存在
- チャットエリアの構造が正しい

**実行結果例**:
```
5. Checking chat area structure...
   ✅ Chat area structure is correct
   ✅ Chat window header present
   ✅ Chat input field present
   ✅ Send button present
```

### Test 4: 必須要素の確認

**検証項目**:
- メイン見出し "過失割合計算機"
- ステップ1 "認定基準の検索"
- チャットウィンドウ "アシスタントチャット"
- ナビゲーションボタン

**実行結果例**:
```
2. Checking required elements...
   ✅ All required elements are present
```

## テスト実行コマンド

```bash
# 包括的テストを実行
npm run test:mcp:comprehensive

# 基本チェックを実行
npm run test:mcp:check

# デプロイ前テスト（すべて実行）
npm run predeploy
```

## テスト結果

テスト結果は以下のファイルに保存されます：
- `tests/mcp-comprehensive-results.json` - 包括的テスト結果

## MCPブラウザーツールによる詳細テスト

自動テストに加えて、MCPブラウザーツールを使用した詳細な視覚テストも実行できます：

### 視覚的重なりチェック

```javascript
// フルページスクリーンショットを取得
browser_take_screenshot({fullPage: true})

// スナップショットで要素の位置を確認
browser_snapshot()
```

### チャット機能の詳細テスト

```javascript
// チャットウィンドウの折りたたみテスト
browser_click({element: "chat window header"})
browser_wait_for({time: 1})
browser_snapshot()

// メッセージ送信テスト
browser_type({element: "chat input", text: "テスト"})
browser_click({element: "send button"})
browser_wait_for({time: 3})
browser_snapshot()
```

### リンク動作テスト

```javascript
// ネットワークリクエストを確認
browser_network_requests()

// コンソールエラーを確認
browser_console_messages()
```

## トラブルシューティング

### テストが失敗する

1. **サーバーが起動していない**
   ```bash
   npm run dev
   ```

2. **必須要素が見つからない**
   - ページが正しくレンダリングされているか確認
   - ブラウザで直接確認

3. **リンクが見つからない**
   - ページのHTMLを確認
   - 動的に生成される要素の場合は待機時間を増やす

## CI/CD統合

これらのテストは以下のタイミングで自動実行されます：

1. **GitHub Actions**: プッシュ/PR時
2. **デプロイ前**: `predeploy` スクリプトで実行
3. **ビルド前**: `prebuild` スクリプトで実行

テストが失敗した場合、デプロイは中止されます。

