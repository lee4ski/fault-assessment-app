# Quick Setup: Enable AI Recommendations

## Step 1: Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)

## Step 2: Create Environment File

In your terminal, run:

```bash
cd /Users/lee4ski/Documents/Guidewire/app
echo "OPENAI_API_KEY=your-key-here" > .env.local
```

Or manually create `.env.local` in the project root with:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

## Step 3: Restart the Server

```bash
# Press Ctrl+C to stop the current server
# Then run:
npm run dev
```

## Step 4: Test It!

1. Open http://localhost:3000
2. Navigate to Step 4
3. Enter an accident description (in Japanese or English)
4. Click "AI推奨基準を取得"
5. See intelligent recommendations! 🎉

## Without API Key

The system will still work using enhanced keyword matching, but AI provides much better results for complex scenarios.

## Security Note

⚠️ **IMPORTANT**: Never commit `.env.local` to git. It's already in `.gitignore` for your safety.

## Cost

- Each recommendation costs ~$0.0001 (1/100th of a cent)
- 10,000 recommendations = ~$1.00
- Extremely affordable for production use

## Need Help?

See `STEP4_AI_RECOMMENDATIONS.md` for complete documentation.



