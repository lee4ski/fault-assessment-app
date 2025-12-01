# 過失割合計算機 (Fault Assessment Calculator)

交通事故の過失割合を効率的に計算するためのWebアプリケーションです。

## 機能

### 3ステップワークフロー（MVP）

1. **ステップ1: 認定基準の検索 (A-1)**
   - 事故の種類や状況から認定基準を検索
   - キーワード検索による迅速な検索
   - 各ステップにAIアシスタントチャット機能付き

2. **ステップ2: 修正要素の適用と計算 (B-1)**
   - 基本過失割合の表示
   - 修正要素の選択と適用
   - リアルタイムで最終過失割合を計算

3. **ステップ3: AI推奨基準の確認 (C-1)**
   - 事故報告テキストからAIが推奨基準を提示
   - Top-3の候補を適合スコア付きで表示
   - 手動検索への切り替えも可能

### 主な機能
- **ワークフロー型UI**: 3ステップの明確なプロセス
- **ステップ間の移動**: 前のステップに戻ることが可能
- **AIアシスタント**: 各ステップにOpenAI API連携のチャット機能
- **リアルタイム計算**: 修正要素の適用時に即座に結果を表示

## 技術スタック

- **Next.js 16** - React フレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **React 19** - UI ライブラリ
- **OpenAI API** - AIアシスタントチャット機能

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
# .env.local ファイルを作成し、OpenAI API キーを設定してください
echo "OPENAI_API_KEY=your_api_key_here" > .env.local

# 開発サーバーの起動
npm run dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

### 環境変数

- `OPENAI_API_KEY`: OpenAI API キー（チャット機能に必要）
  - ✅ 既に `.env.local` ファイルに設定済み
  - 本番環境では、ホスティングプラットフォームの環境変数設定を使用してください
  - 詳細は [ENV_SETUP.md](./ENV_SETUP.md) を参照

## プロジェクト構造

```
app/
├── app/              # Next.js App Router
│   ├── page.tsx      # メインページ
│   ├── layout.tsx    # レイアウト
│   └── globals.css   # グローバルスタイル
├── components/       # React コンポーネント
│   ├── WorkflowStepper.tsx    # ワークフローステッパー
│   ├── Step1Search.tsx        # ステップ1: 検索
│   ├── Step2Calculate.tsx     # ステップ2: 計算
│   ├── Step3AIRecommend.tsx   # ステップ3: AI推奨
│   └── ChatWindow.tsx         # チャットウィンドウ
├── app/
│   └── api/
│       └── chat/
│           └── route.ts       # OpenAI API ルート
├── lib/              # ユーティリティ関数
│   └── calculator.ts    # 計算ロジック
├── types/            # TypeScript 型定義
│   └── index.ts
└── data/             # サンプルデータ
    └── sampleCriteria.ts
```

## テスト

プロジェクトには包括的なテストスイートが含まれています。

```bash
# テストを実行
npm run test

# CI用テスト（自動実行）
npm run test:ci

# ウォッチモードでテストを実行
npm run test -- --watch

# テストカバレッジを確認
npm run test:coverage
```

### 自動テスト

**デプロイ前に自動的にテストが実行されます：**

1. **ビルド時**: `npm run build` を実行すると自動的にテストが実行されます
2. **GitHub Actions**: プッシュやプルリクエスト時に自動的にテストが実行されます
3. **デプロイ前**: 本番環境へのデプロイ前に必ずテストが実行されます

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### テストカバレッジ

#### ユニットテスト
- **ChatWindow**: チャット機能のテスト（折りたたみ、メッセージ送信、エラーハンドリング）
- **WorkflowStepper**: ワークフローステッパーのテスト（ステップ移動、状態管理）
- **Step1Search**: 検索機能のテスト（フィルタリング、選択）
- **Step2Calculate**: 計算機能のテスト（修正要素の適用、計算ロジック）
- **calculator**: ユーティリティ関数のテスト（過失割合計算、検索ロジック）

#### MCP視覚テスト
- **視覚的検証**: MCPブラウザーツールを使用した視覚的テスト
- **機能テスト**: 実際のブラウザ環境での動作確認
- **詳細**: [tests/mcp-test-runner.md](./tests/mcp-test-runner.md) を参照

```bash
# MCPテストの説明を表示
npm run test:mcp
```

## 今後の拡張予定

- Epic 2: AI支援による事故状況の自動分類
- より多くの認定基準データの追加（300+件）
- データベース連携
- ユーザー認証と保存機能
- PDFエクスポート機能

## ライセンス

ISC

