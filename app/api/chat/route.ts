import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";
import { searchCriteria } from "@/lib/calculator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

// Vector search helper - uses keyword matching as fallback
async function retrieveRelevantCases(accidentDescription: string, topK: number = 3) {
  try {
    // Use keyword-based search as a fast alternative
    const queryTerms = accidentDescription.toLowerCase().split(/\s+/);
    
    const scoredCriteria = sampleCriteria.map((criterion) => {
      let score = 0;
      const text = `${criterion.title} ${criterion.description} ${criterion.summary || ''} ${criterion.chapterTitle}`.toLowerCase();
      
      queryTerms.forEach(term => {
        if (term.length < 2) return;
        if (text.includes(term)) score += 1;
        if (criterion.title.toLowerCase().includes(term)) score += 3; // Title matches weighted more
        if (criterion.chapterTitle.toLowerCase().includes(term)) score += 2;
      });
      
      return { criterion, score };
    });

    // Sort by score and return top K
    const topResults = scoredCriteria
      .filter(r => r.score > 0) // Only return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[chat-vector] Top ${topK} relevant cases found (keyword search):`, 
      topResults.map(r => ({ id: r.criterion.id, score: r.score }))
    );

    return topResults;
  } catch (error) {
    console.error("[chat-vector] Error in retrieveRelevantCases:", error);
    return [];
  }
}

const stepPrompts = {
  1: `あなたは過失割合計算システムのアシスタントです。ユーザーは「認定基準の検索」ステップにいます。
このステップでは、事故の種類や状況から適切な認定基準を検索します。
以下の点をサポートしてください：
- 事故の種類（交差点、駐車場、高速道路など）の入力方法
- 検索キーワードの選び方
- 認定基準の見つけ方
- 基本過失割合の理解
日本語で親切に回答してください。`,
  2: `あなたは過失割合計算システムのアシスタントです。ユーザーは「修正要素の適用と計算」ステップにいます。
このステップでは、基本過失割合に対して修正要素を適用して最終過失割合を計算します。
以下の点をサポートしてください：
- 修正要素の選び方（幼児、高齢者、速度違反など）
- 修正要素の適用方法
- 最終過失割合の計算方法
- 修正要素の根拠
日本語で親切に回答してください。`,
  3: `あなたは過失割合計算システムのアシスタントです。ユーザーは「車両情報検索」ステップにいます。
このステップでは、事故に関係する車両の情報を検索・選択します。
以下の点をサポートしてください：
- 車両情報の検索方法
- 適切な車両の選択
- 車両データの確認方法
日本語で親切に回答してください。`,
  4: `あなたは過失割合計算システムのアシスタントです。ユーザーは「AI報告書作成」ステップにいます。
このステップでは、AIが自動的に専門的な事故報告書を生成し、ユーザーが編集・承認できます。
以下の点をサポートしてください：
- AI報告書生成機能の使い方
- 報告書の編集方法
- 下書き保存と承認依頼の違い
- PDF出力機能
- 報告書の内容確認ポイント
日本語で親切に回答してください。`,
};

export async function POST(request: NextRequest) {
  try {
    const { messages, step } = await request.json();

    if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // Check if any message has an image
    const hasImage = messages.some((msg: any) => msg.image);
    
    // If no matches found or image is present, proceed with conversational AI
    let systemPrompt = stepPrompts[step as keyof typeof stepPrompts] || stepPrompts[1];
    
    // Extract accident context from conversation for vector search
    let accidentContext = "";
    if (hasImage && messages.length > 1) {
      // Combine all messages to form accident context
      accidentContext = messages
        .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
        .map((msg: any) => msg.content)
        .filter((content: string) => content && content.length > 10)
        .join(" ");
    }
    
    // Perform vector search if we have accident context (for images)
    let relevantCasesContext = "";
    if (hasImage && accidentContext.length > 30) {
      console.log("[chat-vector] Performing vector search for image-based conversation...");
      const startTime = Date.now();
      const relevantCases = await retrieveRelevantCases(accidentContext, 2); // Reduced from 3 for speed
      const searchTime = Date.now() - startTime;
      console.log(`[chat-vector] Vector search completed in ${searchTime}ms`);
      
      if (relevantCases.length > 0) {
        relevantCasesContext = `

**関連する認定基準（ベクトル検索結果）:**

以下は、ユーザーの事故説明に最も関連性の高い認定基準です。これらを参考にしながら質問を進めてください：

${relevantCases.map((result, idx) => {
  const { criterion, score } = result;
  return `${idx + 1}. **${criterion.title}** (関連性スコア: ${score})
   - ID: ${criterion.id}
   - 基本過失割合: ${criterion.baseFaultPercentage}
   - 説明: ${criterion.description}`;
}).join('\n\n')}

これらの基準を念頭に置いて、事故の状況を確認してください。`;
      }
    }
    
    if (hasImage) {
      systemPrompt += `
      
ユーザーから事故現場の画像が提供されました。あなたは事故調査員として、画像を分析し、質問を通じて事故の詳細を明らかにしてください。

${relevantCasesContext}

**重要な指示:**
1. **画像は事故後の現場写真**です。信号の色、車両の位置、損傷などから推測できることを述べてください。
2. **車両情報の抽出**: 画像から車両のメーカー（例: トヨタ、ホンダ、日産など）と車種（例: プリウス、シビック、セレナなど）を可能な限り特定してください。車両のエンブレム、バッジ、特徴的なデザインから判断してください。
3. **一度に1つの質問をしてください**。まるで現場で調査員が聞くように、自然な対話を心がけてください。
4. 最低限確認すべき情報:
   - 事故の当事者数（車両数、歩行者の有無）
   - **各車両のメーカーと車種（画像から判別可能な場合）**
   - 各当事者の信号状態（事故発生時）
   - 速度や動き
   - その他の状況

5. **【事故分析完了】マーカーは使用しないでください**。十分な情報が集まったと思ったら、代わりに以下のように確認してください：
   
   「以下の理解で正しいでしょうか？
   - [当事者1の状況]（車両の場合はメーカー・車種も含む）
   - [当事者2の状況]（車両の場合はメーカー・車種も含む）
   - [その他の重要な情報]
   
   この内容で過失割合の分析を開始してもよろしいですか？
   ✅ はい、分析を開始
   ❌ いいえ、修正や追加情報があります」

6. ユーザーが「はい」「分析を開始」「OK」などと答えた場合のみ、次の形式で最終的な事故説明を提供してください。**必ず車両情報（メーカー・車種）を含めてください**：
【事故分析完了】
[詳細な事故の説明。車両が含まれる場合は「トヨタ プリウス」「ホンダ シビック」などの形式で明記]
【分析終了】`;
    }

    // Use gpt-4o for images (better vision), gpt-4o-mini for text
    const model = hasImage ? "gpt-4o" : "gpt-4o-mini";

    const formattedMessages = messages.map((msg: any) => {
      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content || "（画像が添付されました）" },
            { type: "image_url", image_url: { url: msg.image } }
          ]
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });

    // Use models with automatic prompt caching support
    // gpt-4o-mini supports vision and is 15x cheaper + faster than gpt-4o!
    const cachedModel = "gpt-4o-mini-2024-07-18"; // Use mini for both text and images
    
    const apiStartTime = Date.now();
    console.log(`[chat] Starting OpenAI API call with model: ${cachedModel} (hasImage: ${hasImage}, vectorSearch: ${!!relevantCasesContext})`);
    
    const completion = await openai.chat.completions.create(
      {
        model: hasImage ? "gpt-4o" : cachedModel, // Use gpt-4o for images (better vision)
        messages: [
          { 
            role: "system", 
            content: systemPrompt // Automatically cached by OpenAI if >1024 tokens
          },
          ...formattedMessages,
        ],
        temperature: 0.3,
        max_tokens: hasImage ? 600 : 500, // More tokens for image analysis
      },
      { timeout: hasImage ? 30000 : 15000 } // 30s for images, 15s for text
    );
    
    const apiDuration = Date.now() - apiStartTime;
    console.log(`[chat] ✅ OpenAI API completed in ${apiDuration}ms`);
    
    // Log cache performance
    const usage = completion.usage;
    if (usage) {
      const cachedTokens = (usage as any).prompt_tokens_details?.cached_tokens || 0;
      if (cachedTokens > 0) {
        const cachePercentage = ((cachedTokens / usage.prompt_tokens) * 100).toFixed(1);
        console.log(`[chat] 💰 Cache hit! ${cachedTokens} tokens cached (${cachePercentage}% of prompt) - Saved ~${(cachedTokens * 0.5 / 1000000).toFixed(4)}¢`);
      }
      console.log(`[chat] Token usage: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`);
      
      if (hasImage) {
        console.log(`[chat] 🖼️ Image processing completed with vector RAG optimization`);
      }
    }

    return NextResponse.json({
      message: completion.choices[0]?.message?.content || "申し訳ございません。回答を生成できませんでした。",
      type: "text",
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: error.message || "チャットの処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

