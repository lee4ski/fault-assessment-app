# 環境変数の設定

## OpenAI API キーの設定

OpenAI API キーは `.env.local` ファイルに設定されています。

### ファイルの場所
```
.env.local
```

### 設定内容
```env
OPENAI_API_KEY=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
```

## セキュリティ

✅ `.env.local` は `.gitignore` に含まれているため、Gitにコミットされません
✅ 本番環境では、ホスティングプラットフォームの環境変数設定を使用してください

## 使用方法

### ローカル開発
`.env.local` ファイルが存在すれば、自動的に読み込まれます。

```bash
# 開発サーバーを起動
npm run dev
```

### 本番環境（Vercel）
1. Vercelダッシュボードにログイン
2. プロジェクトの Settings → Environment Variables
3. 以下を追加：
   - Key: `OPENAI_API_KEY`
   - Value: `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`

### 本番環境（その他）
環境変数として設定：
```bash
export OPENAI_API_KEY=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
```

## 動作確認

APIキーが正しく設定されているか確認：

1. 開発サーバーを起動: `npm run dev`
2. アプリケーションを開く: `http://localhost:3000`
3. 任意のステップでチャットウィンドウを開く
4. メッセージを送信して、AIアシスタントが応答するか確認

## トラブルシューティング

### APIキーが認識されない
- `.env.local` ファイルがプロジェクトルートにあるか確認
- ファイル名が正確か確認（`.env.local`）
- 開発サーバーを再起動

### APIエラーが発生する
- APIキーが有効か確認
- APIキーの使用制限を確認
- ネットワーク接続を確認

