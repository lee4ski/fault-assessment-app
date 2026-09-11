import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";
import { searchCriteria } from "@/lib/calculator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

type ChatLocale = "ja" | "en";

const stepPrompts: Record<ChatLocale, Record<number, string>> = {
  ja: {
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
  },
  en: {
    1: `You are the assistant for a fault-percentage assessment system. The user is on the "Search Assessment Criteria" step.
In this step, the user searches for the appropriate assessment criteria based on the type and circumstances of the accident.
Please help with:
- How to enter the type of accident (intersection, parking lot, highway, etc.)
- How to choose good search keywords
- How to find the right assessment criteria
- Understanding the base fault percentage
Reply helpfully in English.`,
    2: `You are the assistant for a fault-percentage assessment system. The user is on the "Apply Modification Factors and Calculate" step.
In this step, modification factors are applied to the base fault percentage to calculate the final fault percentage.
Please help with:
- How to choose modification factors (young children, elderly persons, speeding violations, etc.)
- How to apply modification factors
- How the final fault percentage is calculated
- The rationale behind modification factors
Reply helpfully in English.`,
    3: `You are the assistant for a fault-percentage assessment system. The user is on the "Vehicle Information Search" step.
In this step, the user searches for and selects information about the vehicles involved in the accident.
Please help with:
- How to search for vehicle information
- Selecting the correct vehicle
- How to verify vehicle data
Reply helpfully in English.`,
    4: `You are the assistant for a fault-percentage assessment system. The user is on the "AI Report Creation" step.
In this step, the AI automatically generates a professional accident report that the user can edit and approve.
Please help with:
- How to use the AI report generation feature
- How to edit the report
- The difference between saving a draft and requesting approval
- The PDF export feature
- What to check for when reviewing the report content
Reply helpfully in English.`,
  },
};

const imageAnalysisInstructions: Record<ChatLocale, string> = {
  ja: `

ユーザーから事故現場の画像が提供されました。あなたは事故調査員として、画像を分析し、質問を通じて事故の詳細を明らかにしてください。

**重要な指示:**
1. **画像は事故後の現場写真**です。信号の色、車両の位置、損傷などから推測できることを述べてください。
2. **一度に1つの質問をしてください**。まるで現場で調査員が聞くように、自然な対話を心がけてください。
3. 最低限確認すべき情報:
   - 事故の当事者数（車両数、歩行者の有無）
   - 各当事者の信号状態（事故発生時）
   - 速度や動き
   - その他の状況

4. **[ANALYSIS_COMPLETE] のようなマーカーは、十分な情報が集まったと確認が取れるまでは使用しないでください**。十分な情報が集まったと思ったら、代わりに以下のように確認してください：

   「以下の理解で正しいでしょうか？
   - [当事者1の状況]
   - [当事者2の状況]
   - [その他の重要な情報]

   この内容で過失割合の分析を開始してもよろしいですか？
   ✅ はい、分析を開始
   ❌ いいえ、修正や追加情報があります」

5. ユーザーが「はい」「分析を開始」「OK」などと答えた場合のみ、次の形式で最終的な事故説明を提供してください（マーカーは必ず半角英数字のまま、翻訳せずに出力してください）：
[ANALYSIS_COMPLETE]
[詳細な事故の説明（日本語）]
[ANALYSIS_END]`,
  en: `

The user has provided a photo of the accident scene. Act as an accident investigator: analyze the image and uncover the details of the accident by asking questions.

**Important instructions:**
1. **The image is a photo of the scene taken after the accident.** Note what can be inferred from signal colors, vehicle positions, damage, etc.
2. **Ask only one question at a time**, the way an investigator would at the scene — keep it a natural conversation.
3. At minimum, confirm:
   - The number of parties involved (number of vehicles, presence of pedestrians)
   - Each party's signal state at the time of the accident
   - Speed and movement
   - Any other relevant circumstances

4. **Do not output a marker like [ANALYSIS_COMPLETE] until you have confirmed enough information has been gathered.** Once you believe you have enough, instead confirm with the user like this:

   "Does the following match your understanding?
   - [Party 1's situation]
   - [Party 2's situation]
   - [Other key information]

   Should I start the fault-percentage analysis based on this?
   ✅ Yes, start the analysis
   ❌ No, I have corrections or more information"

5. Only when the user replies "yes", "start the analysis", "OK", etc., provide the final accident description in exactly this format (keep the markers in plain ASCII exactly as shown, do not translate them):
[ANALYSIS_COMPLETE]
[Detailed description of the accident, in English]
[ANALYSIS_END]`,
};

const chatErrorMessages: Record<ChatLocale, { keyMissing: string; generic: string }> = {
  ja: {
    keyMissing: "OpenAI API key is not configured",
    generic: "チャットの処理中にエラーが発生しました。",
  },
  en: {
    keyMissing: "OpenAI API key is not configured",
    generic: "An error occurred while processing the chat.",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { messages, step, locale: rawLocale } = await request.json();
    const locale: ChatLocale = rawLocale === "en" ? "en" : "ja";

    if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
      return NextResponse.json(
        { error: chatErrorMessages[locale].keyMissing },
        { status: 500 }
      );
    }

    // Check if any message has an image
    const hasImage = messages.some((msg: any) => msg.image);

    // If no matches found or image is present, proceed with conversational AI
    let systemPrompt =
      stepPrompts[locale][step as keyof typeof stepPrompts.ja] || stepPrompts[locale][1];

    if (hasImage) {
      systemPrompt += imageAnalysisInstructions[locale];
    }

    // Use gpt-4o for images (better vision), gpt-4o-mini for text
    const model = hasImage ? "gpt-4o" : "gpt-4o-mini";

    const formattedMessages = messages.map((msg: any) => {
      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content || (locale === "en" ? "(An image was attached)" : "（画像が添付されました）") },
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
      message:
        completion.choices[0]?.message?.content ||
        (locale === "en"
          ? "Sorry, we couldn't generate a response."
          : "申し訳ございません。回答を生成できませんでした。"),
      type: "text",
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    const locale: ChatLocale = "ja"; // locale may not have been parsed successfully; fall back safely
    return NextResponse.json(
      { error: error.message || chatErrorMessages[locale].generic },
      { status: 500 }
    );
  }
}
