# 自動テスト設定

このプロジェクトは、デプロイ前に自動的にテストを実行するように設定されています。

## 自動テストの実行タイミング

### 1. ビルド時
```bash
npm run build
```
ビルドコマンドを実行すると、自動的に以下が実行されます：
1. `prebuild` スクリプト: テストを実行
2. テストが成功した場合のみビルドを続行
3. テストが失敗した場合、ビルドは中止されます

### 2. GitHub Actions (CI/CD)

#### プッシュ/プルリクエスト時
- `.github/workflows/ci.yml` が自動実行
- テスト、リント、ビルドを実行
- すべて成功した場合のみマージ可能

#### デプロイ時
- `.github/workflows/deploy.yml` が自動実行
- テストが成功した場合のみデプロイ
- テストが失敗した場合、デプロイは中止されます

### 3. Pre-commit フック (オプション)

Huskyを使用して、コミット前にテストを実行：

```bash
# Huskyを初期化
npx husky install

# これで、git commit 時に自動的にテストが実行されます
```

## テストコマンド

```bash
# 開発中（ウォッチモード）
npm run test

# CI用（一度だけ実行）
npm run test:ci

# カバレッジ付き
npm run test:coverage
```

## 設定ファイル

### package.json
- `prebuild`: ビルド前にテストを実行
- `build`: テスト成功後にビルド
- `predeploy`: デプロイ前にテストとビルドを実行

### GitHub Actions
- `.github/workflows/ci.yml`: 継続的インテグレーション
- `.github/workflows/deploy.yml`: デプロイパイプライン
- `.github/workflows/pre-commit.yml`: プルリクエスト検証

### Vercel
- `vercel.json`: ビルドコマンドにテストを含める

## テストが失敗した場合

1. **ローカルで確認**:
   ```bash
   npm run test:ci
   ```

2. **エラーを修正**:
   - テストファイルを確認
   - コンポーネントの変更を確認
   - 型エラーを確認

3. **再テスト**:
   ```bash
   npm run test:ci
   ```

4. **ビルドを再試行**:
   ```bash
   npm run build
   ```

## デプロイプラットフォーム別の設定

### Vercel
- `vercel.json` でビルドコマンドを設定
- 環境変数を設定: `OPENAI_API_KEY`

### その他のプラットフォーム
- ビルドコマンド: `npm run build` (テストが含まれます)
- 環境変数を設定してください

## トラブルシューティング

### テストがCIで失敗するが、ローカルでは成功する
- Node.jsのバージョンを確認（20+が必要）
- 依存関係を再インストール: `npm ci`
- 環境変数を確認

### ビルドがテストで止まる
- テストのエラーメッセージを確認
- ローカルで `npm run test:ci` を実行
- すべてのテストが通過することを確認

### Pre-commitフックが動作しない
```bash
npx husky install
chmod +x .husky/pre-commit
```

## まとめ

✅ **ビルド前に自動テスト**: `npm run build` で自動実行
✅ **GitHub Actions**: プッシュ/PR時に自動実行
✅ **デプロイ前にテスト**: デプロイパイプラインで必須
✅ **Pre-commitフック**: オプションでコミット前に実行

すべてのデプロイは、テストが成功した場合のみ実行されます。

