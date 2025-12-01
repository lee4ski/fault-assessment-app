import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface StepValidation {
  stepNumber: number;
  status: "complete" | "incomplete" | "valid-empty";
  color: "green" | "red" | "yellow";
  missingItems: string[];
  reason: string;
}

export interface AIAnalysisResult {
  // Step 1: Criteria recommendation
  step1: {
    recommendedCriteriaId: string | null;
    confidence: number;
    reasoning: string;
    validation: StepValidation;
  };
  // Step 2: Modifications
  step2: {
    recommendedModifications: string[];
    reasoning: string;
    validation: StepValidation;
  };
  // Step 3: Vehicles
  step3: {
    extractedVehicles: Array<{
      make?: string;
      model?: string;
      year?: string;
      modelCode?: string;
      partial: boolean;
    }>;
    reasoning: string;
    validation: StepValidation;
  };
  // Overall summary
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { accidentDescription } = await request.json();

    if (!accidentDescription || accidentDescription.trim().length < 10) {
      return NextResponse.json(
        { error: "事故の説明が短すぎます。詳細を入力してください。" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Build the analysis prompt
    const systemPrompt = `あなたは交通事故の専門家です。事故の説明文を分析し、以下の情報を抽出してください：

1. **認定基準**: どの認定基準が最も適切か
2. **修正要素**: どのような修正要素が適用されるべきか（幼児、高齢者、信号無視など）
3. **車両情報**: 関係する車両の情報（メーカー、車種、年式など）
4. **不足情報**: 何が不明または不足しているか

特に、信号に関するケースでは次の点に注意してください：
- 歩行者が**青信号**で横断開始し、車両が**赤信号**で進入した場合（信号変更なし）は、
  - criteriaId: "intersection-pedestrian-signal-no-change" を選択し、
  - このケースでは修正要素は存在しないため、\"modifications\": [] かつ \"missingInfo.modifications\": [] としてください。
- 歩行者が**黄信号**で横断開始し、車両が**赤信号**で進入した場合は、
  - criteriaId: "intersection-pedestrian-yellow-red" を選択し、
  - この基準に定義された修正要素（幼児等・高齢者、集団横断、歩行者の著しい過失など）だけを候補として検討してください。

利用可能な認定基準（簡略表現）:
${JSON.stringify(
  sampleCriteria.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    baseFaultPercentage: c.baseFaultPercentage,
    // 修正要素は「IDと説明」をセットで渡す
    modificationFactors: (c.modificationFactors || []).map((m: any) => ({
      id: m.id,
      description: m.description,
    })),
  })),
  null,
  2
)}

回答は以下のJSON形式で返してください：
{
  "criteriaId": "最も適切な認定基準のID",
  "criteriaConfidence": 0-100の数値,
  "criteriaReasoning": "なぜこの基準を選んだか",
  "modifications": ["適用すべき修正要素のIDリスト（上記 modificationFactors の id を使用、他は使わない）"],
  "modificationsReasoning": "修正要素の選択理由",
  "vehicles": [
    {
      "make": "メーカー名（不明な場合は空文字）",
      "model": "車種名（不明な場合は空文字）",
      "year": "年式（不明な場合は空文字）",
      "partial": true/false（情報が不完全な場合true）
    }
  ],
  "vehiclesReasoning": "車両情報の抽出理由",
  "missingInfo": {
    "criteria": ["認定基準に関して不足している情報"],
    "modifications": ["修正要素に関して不足している情報（青/赤信号ケースなど修正要素が存在しない場合は空配列にする）"],
    "vehicles": ["車両に関して不足している情報"]
  },
  "summary": "全体の分析サマリー"
}`;

    const userPrompt = `以下の事故説明を分析してください：\n\n${accidentDescription}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");

    // --- Post-process modifications based on the selected criteria definition ---
    const criteria =
      aiResponse.criteriaId &&
      sampleCriteria.find((c) => c.id === aiResponse.criteriaId);

    let normalizedMods: string[] = Array.isArray(aiResponse.modifications)
      ? aiResponse.modifications
      : [];

    if (criteria) {
      const allowedIds = new Set(
        (criteria.modificationFactors || []).map((m: any) => m.id)
      );

      if (allowedIds.size === 0) {
        // この認定基準には修正要素そのものが存在しないケース（例: 青信号歩行者 / 赤信号車両）
        normalizedMods = [];
        aiResponse.missingInfo = aiResponse.missingInfo || {};
        aiResponse.missingInfo.modifications = [];
      } else {
        // 安全のため、定義されているID以外は無視する
        normalizedMods = normalizedMods.filter((id) => allowedIds.has(id));
      }
    }

    // Build the structured response
    const result: AIAnalysisResult = {
      step1: {
        recommendedCriteriaId: aiResponse.criteriaId || null,
        confidence: aiResponse.criteriaConfidence || 0,
        reasoning: aiResponse.criteriaReasoning || "",
        validation: {
          stepNumber: 1,
          status: aiResponse.criteriaId ? "complete" : "incomplete",
          color: aiResponse.criteriaId ? "green" : "red",
          missingItems: aiResponse.missingInfo?.criteria || [],
          reason: aiResponse.criteriaId 
            ? "認定基準が特定されました" 
            : "認定基準を特定できませんでした。追加情報が必要です。",
        },
      },
      step2: {
        // 上で正規化した修正要素IDを使用
        recommendedModifications: normalizedMods,
        reasoning: aiResponse.modificationsReasoning || "",
        validation: {
          stepNumber: 2,
          status: determineStep2Status(aiResponse),
          color: determineStep2Color(aiResponse),
          missingItems: aiResponse.missingInfo?.modifications || [],
          reason: determineStep2Reason(aiResponse),
        },
      },
      step3: {
        extractedVehicles: aiResponse.vehicles || [],
        reasoning: aiResponse.vehiclesReasoning || "",
        validation: {
          stepNumber: 3,
          status: determineStep3Status(aiResponse.vehicles),
          color: determineStep3Color(aiResponse.vehicles),
          missingItems: aiResponse.missingInfo?.vehicles || [],
          reason: determineStep3Reason(aiResponse.vehicles),
        },
      },
      summary: aiResponse.summary || "事故情報を分析しました。",
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: error.message || "分析中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

function determineStep2Status(aiResponse: any): "complete" | "incomplete" | "valid-empty" {
  const mods = aiResponse.modifications || [];
  const missing = aiResponse.missingInfo?.modifications || [];
  
  // If no modifications AND no missing info, it's valid-empty (like green light pedestrian)
  if (mods.length === 0 && missing.length === 0) {
    return "valid-empty";
  }
  
  // If has modifications, it's complete
  if (mods.length > 0) {
    return "complete";
  }
  
  // If missing info, it's incomplete
  if (missing.length > 0) {
    return "incomplete";
  }
  
  return "valid-empty";
}

function determineStep2Color(aiResponse: any): "green" | "red" | "yellow" {
  const status = determineStep2Status(aiResponse);
  if (status === "complete" || status === "valid-empty") return "green";
  return "red";
}

function determineStep2Reason(aiResponse: any): string {
  const mods = aiResponse.modifications || [];
  const missing = aiResponse.missingInfo?.modifications || [];
  
  if (mods.length === 0 && missing.length === 0) {
    return "修正要素は不要です（標準的なケース）";
  }
  
  if (mods.length > 0) {
    return `${mods.length}個の修正要素が適用されます`;
  }
  
  if (missing.length > 0) {
    return `修正要素の判断に追加情報が必要です: ${missing.join(", ")}`;
  }
  
  return "修正要素の評価が必要です";
}

function determineStep3Status(vehicles: any[]): "complete" | "incomplete" | "valid-empty" {
  if (!vehicles || vehicles.length === 0) {
    return "incomplete";
  }
  
  const hasPartial = vehicles.some((v: any) => v.partial === true);
  
  if (hasPartial) {
    return "incomplete";
  }
  
  return "complete";
}

function determineStep3Color(vehicles: any[]): "green" | "red" | "yellow" {
  const status = determineStep3Status(vehicles);
  if (status === "complete") return "green";
  if (status === "incomplete") return "red";
  return "yellow";
}

function determineStep3Reason(vehicles: any[]): string {
  if (!vehicles || vehicles.length === 0) {
    return "車両情報が不足しています";
  }
  
  const hasPartial = vehicles.some((v: any) => v.partial === true);
  
  if (hasPartial) {
    const partialVehicles = vehicles.filter((v: any) => v.partial);
    return `${partialVehicles.length}台の車両情報が不完全です（型式等の詳細が不足）`;
  }
  
  return `${vehicles.length}台の車両情報が確認されました`;
}

