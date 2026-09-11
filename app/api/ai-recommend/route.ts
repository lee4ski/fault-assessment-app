import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AssessmentCriteria } from "@/types";
import { localize } from "@/lib/i18n-simple";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "missing-openai-api-key",
  // A real empty string makes the SDK throw at module load (during `next build`
  // page-data collection, or if OPENAI_API_KEY is unset/misconfigured at runtime),
  // crashing the whole build/route instead of the graceful "not configured" JSON
  // error each handler below already returns. This placeholder just avoids that;
  // the actual env var (not this client) is what every handler checks.
});

type RecommendLocale = "ja" | "en";

export async function POST(request: NextRequest) {
  // Parse the body once and reuse it, including in the catch block below
  // (calling request.json() a second time on error throws, since the
  // request stream can only be read once).
  let accidentText: string | undefined;
  let criteria: AssessmentCriteria[] | undefined;
  let locale: RecommendLocale = "ja";

  try {
    const body = await request.json();
    accidentText = body.accidentText;
    criteria = body.criteria;
    locale = body.locale === "en" ? "en" : "ja";

    if (!accidentText || !criteria || criteria.length === 0) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "An accident report and assessment criteria are required"
              : "事故報告と認定基準が必要です",
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, falling back to keyword matching");
      return NextResponse.json(
        { recommendations: keywordBasedRecommendations(accidentText, criteria, locale) },
        { status: 200 }
      );
    }

    // Prepare criteria information for AI
    const criteriaDescriptions = criteria
      .map(
        (c: AssessmentCriteria, index: number) =>
          `[${index}] ${localize(locale, c.title, c.titleEn)}\n${locale === "en" ? "Description" : "説明"}: ${localize(locale, c.description, c.descriptionEn)}\n${locale === "en" ? "Chapter" : "章"}: ${localize(locale, c.chapterTitle, c.chapterTitleEn)}\n${locale === "en" ? "Base fault percentage" : "基本過失割合"}: ${c.baseFaultPercentage}%`
      )
      .join("\n\n");

    const systemPrompt =
      locale === "en"
        ? `You are an expert in determining fault percentages for traffic accidents.
Analyze the accident report and recommend the most appropriate assessment criteria.

From the assessment criteria below, choose the 3 that best fit the accident report, and give each one a match score (0-100) and a reason.

Assessment criteria list:
${criteriaDescriptions}

Reply in exactly this JSON format (include no other text):
{
  "recommendations": [
    {
      "index": 0,
      "score": 95,
      "reason": "Explain in English why this criterion is appropriate"
    }
  ]
}`
        : `あなたは交通事故の過失割合を判断する専門家です。
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

    const userPrompt =
      locale === "en"
        ? `Accident report:\n${accidentText}\n\nRecommend the 3 assessment criteria that best fit the accident above.`
        : `事故報告:\n${accidentText}\n\n上記の事故に最も適した認定基準を3つ推奨してください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const aiResponse = JSON.parse(responseText);

    // Map AI recommendations to full criteria objects
    const recommendations = aiResponse.recommendations.map((rec: any) => ({
      criteria: criteria![rec.index],
      score: rec.score,
      reason: rec.reason,
    }));

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("AI recommendation error:", error);

    // Fallback to keyword matching if AI fails, using the body we already parsed
    if (!accidentText || !criteria) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "An accident report and assessment criteria are required"
              : "事故報告と認定基準が必要です",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      recommendations: keywordBasedRecommendations(accidentText, criteria, locale),
      warning:
        locale === "en"
          ? "AI recommendation failed, so keyword matching was used instead"
          : "AI推奨に失敗したため、キーワードマッチングを使用しています",
    });
  }
}

// Fallback keyword-based matching (improved version)
function keywordBasedRecommendations(
  accidentText: string,
  criteria: AssessmentCriteria[],
  locale: RecommendLocale = "ja"
): Array<{ criteria: AssessmentCriteria; score: number; reason: string }> {
  const text = accidentText.toLowerCase();

  const labels = {
    title: locale === "en" ? "title" : "タイトル",
    description: locale === "en" ? "description" : "説明",
    chapter: locale === "en" ? "chapter" : "章",
  };

  // Bilingual keyword list: each entry matches either the Japanese term or
  // its English translation appearing in the accident text, boosting the
  // score if the criteria's (possibly-translated) text also contains it.
  const keywords: Array<{ terms: string[]; boost: number; label: string }> = [
    { terms: ["交差点", "intersection"], boost: 15, label: locale === "en" ? "intersection" : "交差点" },
    { terms: ["歩行者", "pedestrian"], boost: 15, label: locale === "en" ? "pedestrian" : "歩行者" },
    { terms: ["横断歩道", "crosswalk"], boost: 20, label: locale === "en" ? "crosswalk" : "横断歩道" },
    { terms: ["信号", "signal", "traffic light"], boost: 10, label: locale === "en" ? "signal" : "信号" },
    { terms: ["駐車場", "parking lot"], boost: 15, label: locale === "en" ? "parking lot" : "駐車場" },
    { terms: ["高速道路", "highway", "expressway"], boost: 15, label: locale === "en" ? "highway" : "高速道路" },
    { terms: ["幼児", "young child"], boost: 10, label: locale === "en" ? "young child" : "幼児" },
    { terms: ["高齢者", "elderly"], boost: 10, label: locale === "en" ? "elderly person" : "高齢者" },
    { terms: ["右折", "right turn"], boost: 10, label: locale === "en" ? "right turn" : "右折" },
    { terms: ["直進", "going straight"], boost: 10, label: locale === "en" ? "going straight" : "直進" },
  ];

  const recommendations = criteria
    .map((c) => {
      let score = 0;
      const matchedTerms: string[] = [];

      const title = localize(locale, c.title, c.titleEn);
      const description = localize(locale, c.description, c.descriptionEn);
      const chapterTitle = localize(locale, c.chapterTitle, c.chapterTitleEn);

      // Check title
      if (text.includes(title.toLowerCase()) || title.toLowerCase().includes(text)) {
        score += 40;
        matchedTerms.push(labels.title);
      }

      // Check description
      const descWords = description.toLowerCase().split(/\s+/);
      const textWords = text.split(/\s+/);
      const descMatches = descWords.filter(word => word.length > 1 && textWords.some(tw => tw.includes(word) || word.includes(tw)));
      if (descMatches.length > 0) {
        score += Math.min(30, descMatches.length * 10);
        matchedTerms.push(labels.description);
      }

      // Check chapter
      if (text.includes(chapterTitle.toLowerCase()) || chapterTitle.toLowerCase().includes(text)) {
        score += 20;
        matchedTerms.push(labels.chapter);
      }

      // Specific keyword matching (Japanese and English terms)
      keywords.forEach(({ terms, boost, label }) => {
        const criteriaText = (title + " " + description + " " + chapterTitle).toLowerCase();
        const textHasTerm = terms.some(term => text.includes(term));
        const criteriaHasTerm = terms.some(term => criteriaText.includes(term));
        if (textHasTerm && criteriaHasTerm && !matchedTerms.includes(label)) {
          score += boost;
          matchedTerms.push(label);
        }
      });

      const reason =
        matchedTerms.length > 0
          ? locale === "en"
            ? `Matched elements: ${matchedTerms.join(", ")}. This assessment criterion may be relevant.`
            : `マッチした要素: ${matchedTerms.join("、")}。この認定基準が関連している可能性があります。`
          : locale === "en"
            ? "Based on the content of the accident report, this assessment criterion may be relevant."
            : "事故報告の内容から、この認定基準が関連している可能性があります。";

      return { criteria: c, score, reason };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return recommendations;
}
