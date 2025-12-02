import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AssessmentCriteria } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { accidentText, criteria } = await request.json();

    if (!accidentText || !criteria || criteria.length === 0) {
      return NextResponse.json(
        { error: "事故報告と認定基準が必要です" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, falling back to keyword matching");
      return NextResponse.json(
        { recommendations: keywordBasedRecommendations(accidentText, criteria) },
        { status: 200 }
      );
    }

    // Prepare criteria information for AI
    const criteriaDescriptions = criteria.map((c: AssessmentCriteria, index: number) => 
      `[${index}] ${c.title}\n説明: ${c.description}\n章: ${c.chapterTitle}\n基本過失割合: ${c.baseFaultPercentage}%`
    ).join("\n\n");

    const systemPrompt = `あなたは交通事故の過失割合を判断する専門家です。
事故報告を分析し、最も適切な認定基準を推奨してください。

以下の認定基準から、事故報告に最も適した3つを選び、それぞれに適合度（0-100）と理由を付けてください。

認定基準リスト:
${criteriaDescriptions}

回答は以下のJSON形式で返してください（他のテキストは含めないでください）:
{
  "recommendations": [
    {
      "index": 0,
      "score": 95,
      "reason": "この基準が適切である理由を日本語で説明"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `事故報告:\n${accidentText}\n\n上記の事故に最も適した認定基準を3つ推奨してください。` 
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const aiResponse = JSON.parse(responseText);

    // Map AI recommendations to full criteria objects
    const recommendations = aiResponse.recommendations.map((rec: any) => ({
      criteria: criteria[rec.index],
      score: rec.score,
      reason: rec.reason,
    }));

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("AI recommendation error:", error);
    
    // Fallback to keyword matching if AI fails
    const { accidentText, criteria } = await request.json();
    return NextResponse.json({
      recommendations: keywordBasedRecommendations(accidentText, criteria),
      warning: "AI推奨に失敗したため、キーワードマッチングを使用しています"
    });
  }
}

// Fallback keyword-based matching (improved version)
function keywordBasedRecommendations(
  accidentText: string,
  criteria: AssessmentCriteria[]
): Array<{ criteria: AssessmentCriteria; score: number; reason: string }> {
  const text = accidentText.toLowerCase();
  
  const recommendations = criteria
    .map((c) => {
      let score = 0;
      const matchedTerms: string[] = [];

      // Check title
      if (text.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(text)) {
        score += 40;
        matchedTerms.push("タイトル");
      }

      // Check description
      const descWords = c.description.toLowerCase().split(/\s+/);
      const textWords = text.split(/\s+/);
      const descMatches = descWords.filter(word => word.length > 1 && textWords.some(tw => tw.includes(word) || word.includes(tw)));
      if (descMatches.length > 0) {
        score += Math.min(30, descMatches.length * 10);
        matchedTerms.push("説明");
      }

      // Check chapter
      if (text.includes(c.chapterTitle.toLowerCase()) || c.chapterTitle.toLowerCase().includes(text)) {
        score += 20;
        matchedTerms.push("章");
      }

      // Specific keyword matching for Japanese terms
      const keywords = [
        { term: "交差点", boost: 15, label: "交差点" },
        { term: "歩行者", boost: 15, label: "歩行者" },
        { term: "横断歩道", boost: 20, label: "横断歩道" },
        { term: "信号", boost: 10, label: "信号" },
        { term: "駐車場", boost: 15, label: "駐車場" },
        { term: "高速道路", boost: 15, label: "高速道路" },
        { term: "幼児", boost: 10, label: "幼児" },
        { term: "高齢者", boost: 10, label: "高齢者" },
        { term: "右折", boost: 10, label: "右折" },
        { term: "直進", boost: 10, label: "直進" },
      ];

      keywords.forEach(({ term, boost, label }) => {
        const criteriaText = (c.title + " " + c.description + " " + c.chapterTitle).toLowerCase();
        if (text.includes(term) && criteriaText.includes(term)) {
          score += boost;
          if (!matchedTerms.includes(label)) {
            matchedTerms.push(label);
          }
        }
      });

      const reason = matchedTerms.length > 0
        ? `マッチした要素: ${matchedTerms.join("、")}。この認定基準が関連している可能性があります。`
        : "事故報告の内容から、この認定基準が関連している可能性があります。";

      return { criteria: c, score, reason };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return recommendations;
}



