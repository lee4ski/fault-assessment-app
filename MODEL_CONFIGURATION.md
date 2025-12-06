# Model Configuration Summary

## Current Setup

### Main AI Models (gpt-4o)
Used for critical reasoning tasks that require high accuracy:

1. **AI Accident Analysis** (`/api/ai-analyze-accident`)
   - Model: `gpt-4o`
   - Purpose: Analyze accident descriptions, extract attributes, recommend criteria with probabilities
   - Why: Requires complex reasoning for legal accuracy

2. **Case Recommendations** (`/api/ai-recommend`)
   - Model: `gpt-4o`
   - Purpose: Match accident descriptions to appropriate legal criteria
   - Why: Requires understanding of legal nuances

3. **Report Generation** (`/api/generate-report`)
   - Model: `gpt-4o`
   - Purpose: Generate professional accident reports
   - Why: Requires high-quality, accurate legal documentation

### Lightweight Models (gpt-4o-mini)
Used for simpler conversational tasks:

1. **Chat Assistant** (`/api/chat`)
   - Model: `gpt-4o-mini`
   - Purpose: Provide conversational help and guidance
   - Why: Cost-effective for simple Q&A interactions

### Embeddings (text-embedding-3-small)
Used for vector search and retrieval:

1. **Vector Database Search**
   - Model: `text-embedding-3-small`
   - Purpose: Generate embeddings for case similarity search
   - Why: Best cost/quality ratio, fast, handles Japanese text well

## Configuration Files

- `app/api/ai-analyze-accident/route.ts` - ✅ Updated to `gpt-4o`
- `app/api/ai-recommend/route.ts` - ✅ Updated to `gpt-4o`
- `app/api/generate-report/route.ts` - ✅ Updated to `gpt-4o`
- `app/api/chat/route.ts` - ✅ Kept as `gpt-4o-mini` (cost-effective)
- Embeddings - ✅ Already using `text-embedding-3-small`

## Notes

- All models use the OpenAI API key from environment variables
- The embedding model (`text-embedding-3-small`) is 1536-dimensional
- This setup balances cost and quality for production use



