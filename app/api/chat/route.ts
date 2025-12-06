import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";
import { searchCriteria } from "@/lib/calculator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

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

    // First, try to find matching cases if the message is substantial (> 5 chars)
    if (lastUserMessage.length > 5) {
      const results = searchCriteria(sampleCriteria, lastUserMessage);
      
      // If we found matches, return them as recommendations
      if (results.length > 0) {
        const topResults = results.slice(0, 3).map((result) => ({
          id: result.criteria.id,
          title: result.criteria.title,
          description: result.criteria.summary || result.criteria.description,
          baseFaultPercentage: result.criteria.baseFaultPercentage,
          confidence: Math.round(result.relevanceScore),
          matchType: result.matchType,
        }));

        return NextResponse.json({
          message: "以下の認定基準が見つかりました。該当するものを選択してください：",
          recommendations: topResults,
          type: "case_recommendation",
        });
      }
    }

    // Check if any message has an image
    const hasImage = messages.some((msg: any) => msg.image);
    
    // If no matches found or image is present, proceed with conversational AI
    let systemPrompt = stepPrompts[step as keyof typeof stepPrompts] || stepPrompts[1];
    
    if (hasImage) {
      systemPrompt += `
      
ユーザーから事故現場の画像が提供されました。あなたは事故調査員として、画像を分析し、質問を通じて事故の詳細を明らかにしてください。

**重要な指示:**
1. **画像は事故後の現場写真**です。信号の色、車両の位置、損傷などから推測できることを述べてください。
2. **一度に1つの質問をしてください**。まるで現場で調査員が聞くように、自然な対話を心がけてください。
3. 最低限確認すべき情報:
   - 事故の当事者数（車両数、歩行者の有無）
   - 各当事者の信号状態（事故発生時）
   - 速度や動き
   - その他の状況

4. **【事故分析完了】マーカーは使用しないでください**。十分な情報が集まったと思ったら、代わりに以下のように確認してください：
   
   「以下の理解で正しいでしょうか？
   - [当事者1の状況]
   - [当事者2の状況]
   - [その他の重要な情報]
   
   この内容で過失割合の分析を開始してもよろしいですか？
   ✅ はい、分析を開始
   ❌ いいえ、修正や追加情報があります」

5. ユーザーが「はい」「分析を開始」「OK」などと答えた場合のみ、次の形式で最終的な事故説明を提供してください：
【事故分析完了】
[詳細な事故の説明]
【分析終了】`;
    }

    // Use gpt-4o-mini for all requests (faster, cheaper, supports vision)
    const model = "gpt-4o-mini";

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

    const completion = await openai.chat.completions.create(
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages,
        ],
        temperature: 0.7,
        max_tokens: hasImage ? 500 : 800, // Reduce tokens for images to stay under 10s
      },
      { timeout: 18000 } // 18s timeout for Vercel compatibility
    );

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

