import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = stepPrompts[step as keyof typeof stepPrompts] || stepPrompts[1];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content || "申し訳ございません。回答を生成できませんでした。",
    });
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: error.message || "チャットの処理中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

