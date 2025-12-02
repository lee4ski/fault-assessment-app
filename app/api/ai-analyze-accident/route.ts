import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
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
  // Extracted structured attributes (NEW)
  attributes?: {
    accidentType?: string;
    location?: string;
    partyTypes?: string[];
    hasSignal?: boolean;
    signalA?: string;
    signalB?: string;
    actionA?: string;
    actionB?: string;
  };
  missingStructuredFields?: string[];
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

    if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
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
4. **構造化属性**: 事故の基本属性（事故類型、場所、当事者、信号有無）
5. **不足情報**: 何が不明または不足しているか

特に、構造化属性の抽出では以下のフィールドを特定してください：
- **当事者A/B**: それぞれの当事者種別（歩行者、四輪車、二輪車、自転車）
- **信号A/B**: それぞれの当事者の信号色（青、黄、赤、右折、なし）
- **行動A/B**: それぞれの当事者の行動（直進、右折、左折、横断、停止、後退、転回、進路変更）

利用可能な属性値の定義:
- accidentType: "歩行者×四輪", "歩行者×二輪", "四輪×四輪", "四輪×二輪", "二輪×二輪", "その他"
- location: "交差点", "駐車場", "高速道路", "一般道路", "横断歩道", "その他"
- partyTypes: ["歩行者", "四輪車", "二輪車", "自転車", "その他"]
- signal states: "signal_green" (青), "signal_yellow" (黄), "signal_red" (赤), "signal_right" (右折), "signal_none" (なし)
- actions: "action_straight" (直進), "action_turning_right" (右折), "action_turning_left" (左折), "action_crossing" (横断), "action_stopping" (停止), "action_backing" (後退)

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
  "modifications": ["適用すべき修正要素のIDリスト"],
  "modificationsReasoning": "修正要素の選択理由",
  "vehicles": [
    {
      "make": "メーカー名",
      "model": "車種名",
      "year": "年式",
      "partial": true/false
    }
  ],
  "vehiclesReasoning": "車両情報の抽出理由",
  "attributes": {
    "accidentType": "事故類型",
    "location": "場所",
    "partyTypes": ["当事者A種別", "当事者B種別"],
    "signalA": "当事者Aの信号ID (例: signal_green)",
    "signalB": "当事者Bの信号ID (例: signal_red)",
    "actionA": "当事者Aの行動ID (例: action_crossing)",
    "actionB": "当事者Bの行動ID (例: action_straight)",
    "hasSignal": true/false
  },
  "missingInfo": {
    "criteria": ["不足情報"],
    "modifications": ["不足情報"],
    "vehicles": ["不足情報"],
    "structuredFields": ["不足フィールド"]
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
      attributes: aiResponse.attributes || {},
      missingStructuredFields: aiResponse.missingInfo?.structuredFields || [],
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

