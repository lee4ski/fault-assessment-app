import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";
import { AssessmentCriteria } from "@/types";
import { localize } from "@/lib/i18n-simple";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

// --- Vector DB Utilities ---
// Using pre-generated embeddings for semantic search

interface CaseEmbedding {
  id: string;
  embedding: number[];
  metadata: {
    title: string;
    description: string;
    chapterTitle: string;
    baseFaultPercentage: number;
  };
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding error:", error);
    return new Array(1536).fill(0);
  }
}

// Cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Load vector index from file (cached in memory)
let vectorIndexCache: CaseEmbedding[] | null = null;

function loadVectorIndex(): CaseEmbedding[] {
  if (vectorIndexCache) return vectorIndexCache;
  
  try {
    const indexPath = path.join(process.cwd(), 'data', 'vectorIndex.json');
    const indexData = fs.readFileSync(indexPath, 'utf-8');
    vectorIndexCache = JSON.parse(indexData);
    console.log(`✅ Loaded vector index with ${vectorIndexCache?.length || 0} cases`);
    return vectorIndexCache || [];
  } catch (error) {
    console.error("Error loading vector index:", error);
    return [];
  }
}

// Retrieval Function using Vector Embeddings
async function retrieveRelevantCases(query: string, topK: number = 5): Promise<{ criteria: AssessmentCriteria; similarity: number }[]> {
  // 1. Load pre-generated embeddings
  const vectorIndex = loadVectorIndex();
  
  if (vectorIndex.length === 0) {
    console.warn("Vector index is empty, falling back to keyword search");
    // Fallback to keyword search
    const scores = sampleCriteria.map(c => {
      let score = 0;
      const text = `${c.title} ${c.description} ${c.summary} ${c.chapterTitle}`;
      const queryTerms = query.toLowerCase().split(/\s+/);
      
      queryTerms.forEach(term => {
        if (term.length < 2) return;
        if (text.toLowerCase().includes(term)) score += 1;
        if (c.title.includes(term)) score += 2;
      });
      
      return { id: c.id, score };
    });
    
    scores.sort((a, b) => b.score - a.score);
    const topIds = scores.slice(0, topK).map(s => s.id);
    return sampleCriteria
      .filter(c => topIds.includes(c.id))
      .map(c => ({ criteria: c, similarity: 0.5 }));
  }
  
  // 2. Generate embedding for the query
  const queryEmbedding = await getEmbedding(query);
  
  // 3. Calculate cosine similarity for all cases
  const similarities = vectorIndex.map(item => {
    const similarity = cosineSimilarity(queryEmbedding, item.embedding);
    return { id: item.id, similarity };
  });
  
  // 4. Sort by similarity and get top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  const topIds = similarities.slice(0, topK);
  
  // 5. Map back to full criteria objects with similarity scores
  const results = topIds.map(({ id, similarity }) => {
    const criteria = sampleCriteria.find(c => c.id === id);
    if (!criteria) return null;
    return { criteria, similarity };
  }).filter((r): r is { criteria: AssessmentCriteria; similarity: number } => r !== null);
  
  return results;
}

// --- End Vector DB Simulation ---

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
  // Candidates with probabilities (NEW)
  candidates?: Array<{
    id: string;
    title: string;
    probability: number;
  }>;
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

type AnalyzeLocale = "ja" | "en";

const STRINGS: Record<AnalyzeLocale, {
  tooShort: string;
  tooLong: string;
  criteriaSpecified: string;
  criteriaNotSpecified: string;
  noModificationsNeeded: (count: number) => string;
  modificationsApplied: (count: number) => string;
  modificationsNeedInfo: (missing: string) => string;
  modificationsNeedEvaluation: string;
  vehicleInfoMissing: string;
  vehiclePartial: (count: number) => string;
  vehiclesConfirmed: (count: number) => string;
  defaultSummary: string;
  analysisError: string;
  languageInstruction: string;
}> = {
  ja: {
    tooShort: "事故の説明が短すぎます。詳細を入力してください。",
    tooLong: "事故の説明が長すぎます。要約して入力してください（最大1000文字）。",
    criteriaSpecified: "認定基準が特定されました",
    criteriaNotSpecified: "認定基準を特定できませんでした。追加情報が必要です。",
    noModificationsNeeded: () => "修正要素は不要です（標準的なケース）",
    modificationsApplied: (count) => `${count}個の修正要素が適用されます`,
    modificationsNeedInfo: (missing) => `修正要素の判断に追加情報が必要です: ${missing}`,
    modificationsNeedEvaluation: "修正要素の評価が必要です",
    vehicleInfoMissing: "車両情報が不足しています",
    vehiclePartial: (count) => `${count}台の車両情報が不完全です（型式等の詳細が不足）`,
    vehiclesConfirmed: (count) => `${count}台の車両情報が確認されました`,
    defaultSummary: "事故情報を分析しました。",
    analysisError: "分析中にエラーが発生しました。",
    languageInstruction: "自由記述のフィールド（reasoning、summary、reasonなど）は日本語で書いてください。",
  },
  en: {
    tooShort: "The accident description is too short. Please provide more detail.",
    tooLong: "The accident description is too long. Please summarize it (1000 characters max).",
    criteriaSpecified: "An assessment criterion has been identified",
    criteriaNotSpecified: "An assessment criterion could not be identified. More information is needed.",
    noModificationsNeeded: () => "No modification factors are needed (a standard case)",
    modificationsApplied: (count) => `${count} modification factor(s) will be applied`,
    modificationsNeedInfo: (missing) => `More information is needed to determine modification factors: ${missing}`,
    modificationsNeedEvaluation: "Modification factors still need to be evaluated",
    vehicleInfoMissing: "Vehicle information is missing",
    vehiclePartial: (count) => `${count} vehicle(s) have incomplete information (details such as model are missing)`,
    vehiclesConfirmed: (count) => `${count} vehicle(s) confirmed`,
    defaultSummary: "The accident information has been analyzed.",
    analysisError: "An error occurred during analysis.",
    languageInstruction: "Write all free-text fields (reasoning, summary, reason, etc.) in English.",
  },
};

export async function POST(request: NextRequest) {
  let locale: AnalyzeLocale = "ja";
  try {
    const { accidentDescription, locale: rawLocale } = await request.json();
    locale = rawLocale === "en" ? "en" : "ja";

    if (!accidentDescription || accidentDescription.trim().length < 10) {
      return NextResponse.json(
        { error: STRINGS[locale].tooShort },
        { status: 400 }
      );
    }

    // Check for overly long descriptions to prevent Vercel request size limits
    if (accidentDescription.length > 1000) {
      return NextResponse.json(
        { error: STRINGS[locale].tooLong },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // --- RAG Step 1: Retrieve Relevant Context using Vector Search ---
    // Instead of sending ALL cases, we fetch only the most relevant ones using semantic similarity.
    // This enables scaling to 1000s of cases stored in a DB.
    const relevantCriteriaWithScores = await retrieveRelevantCases(accidentDescription, 5);
    const relevantCriteria = relevantCriteriaWithScores.map(r => r.criteria);
    
    // Store similarity scores for later use (we'll pass them to LLM as initial probabilities)
    const similarityScores = new Map(
      relevantCriteriaWithScores.map(r => [r.criteria.id, Math.round(r.similarity * 100)])
    );
    
    // --- RAG Step 2: Generate Analysis with Retrieved Context ---
    
    // Build the analysis prompt with ONLY the retrieved context
    const systemPrompt = `あなたは交通事故の専門家です。事故の説明文を分析し、以下の情報を抽出してください：
    
1. **認定基準**: 検索された候補の中から、最も適切な認定基準を選んでください。また、各候補に対して「適合確率（0-100%）」を推定してください。
   ベクトル検索による類似度も参考にしてください（各候補に「similarity」スコアが付与されています）。
2. **修正要素**: どのような修正要素が適用されるべきか（幼児、高齢者、信号無視など）
3. **車両情報**: 関係する車両の情報（メーカー、車種、年式など）
4. **構造化属性**: 事故の基本属性（事故類型、場所、当事者、信号有無）
5. **不足情報**: 何が不明または不足しているか

特に、構造化属性の抽出では以下のフィールドを特定してください：
- **当事者A/B**: それぞれの当事者種別（歩行者、四輪車、二輪車、自転車）
- **信号A/B**: それぞれの当事者の信号色（青、黄、赤、右折、なし）
- **行動A/B**: それぞれの当事者の行動（直進、右折、左折、横断、停止、後退、転回、進路変更）

利用可能な属性値の定義（重要: "attributes" フィールドの値は、回答全体の言語設定に関わらず、必ず下記の日本語の語彙をそのまま使用してください。これはアプリ内部でこの語彙をキーとして検索・照合するためです）:
- accidentType: "歩行者×四輪", "歩行者×二輪", "四輪×四輪", "四輪×二輪", "二輪×二輪", "その他"
- location: "交差点", "駐車場", "高速道路", "一般道路", "横断歩道", "その他"
- partyTypes: ["歩行者", "四輪車", "二輪車", "自転車", "その他"]
- signal states: "signal_green" (青), "signal_yellow" (黄), "signal_red" (赤), "signal_right" (右折), "signal_none" (なし)
- actions: "action_straight" (直進), "action_turning_right" (右折), "action_turning_left" (左折), "action_crossing" (横断), "action_stopping" (停止), "action_backing" (後退)

${STRINGS[locale].languageInstruction}

【検索された認定基準候補】(ベクトル検索による類似度スコア付き。これらの中から最適なものを選択し、確率を付与してください):
${JSON.stringify(
  relevantCriteriaWithScores.map((r) => {
    const c = r.criteria;
    return {
      id: c.id,
      title: localize(locale, c.title, c.titleEn),
      description: localize(locale, c.description, c.descriptionEn),
      baseFaultPercentage: c.baseFaultPercentage,
      similarity: Math.round(r.similarity * 100), // Vector similarity score (0-100)
      // 修正要素は「IDと説明」をセットで渡す
      modificationFactors: (c.modificationFactors || []).map((m: any) => ({
        id: m.id,
        description: localize(locale, m.description, m.descriptionEn),
      })),
    };
  }),
  null,
  2
)}

回答は以下のJSON形式で返してください：
{
  "criteriaId": "最も適切な認定基準のID",
  "criteriaConfidence": 0-100の数値,
  "criteriaReasoning": "なぜこの基準を選んだか",
  "candidates": [
    { "id": "基準ID", "probability": 0-100の数値, "reason": "簡単な理由" }
  ],
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

    const userPrompt =
      locale === "en"
        ? `Please analyze the following accident description:\n\n${accidentDescription}`
        : `以下の事故説明を分析してください：\n\n${accidentDescription}`;

    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini", // Faster model for Vercel production
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500, // Reduced for faster response
      },
      { timeout: 18000 } // 18s timeout for Vercel compatibility
    );

    const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");

    // --- Post-process modifications based on the selected criteria definition ---
    // IMPORTANT: We must look up the full criteria object again because we passed only a subset
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

    // Enhance candidates with titles and include similarity scores
    // If AI didn't return candidates, use vector similarity scores as fallback
    let candidates: Array<{ id: string; title: string; probability: number }> = [];
    
    if (aiResponse.candidates && aiResponse.candidates.length > 0) {
      // Use AI-provided candidates with probabilities
      candidates = aiResponse.candidates.map((cand: any) => {
        const c = sampleCriteria.find(s => s.id === cand.id);
        return {
          id: cand.id,
          title: c ? localize(locale, c.title, c.titleEn) : cand.id,
          probability: cand.probability || similarityScores.get(cand.id) || 0
        };
      });
    } else {
      // Fallback: Use vector similarity scores for all retrieved cases
      candidates = relevantCriteriaWithScores.map((r) => ({
        id: r.criteria.id,
        title: localize(locale, r.criteria.title, r.criteria.titleEn),
        probability: Math.round(r.similarity * 100)
      }));
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
            ? STRINGS[locale].criteriaSpecified
            : STRINGS[locale].criteriaNotSpecified,
        },
      },
      candidates: candidates, // Return candidates with probability
      step2: {
        // 上で正規化した修正要素IDを使用
        recommendedModifications: normalizedMods,
        reasoning: aiResponse.modificationsReasoning || "",
        validation: {
          stepNumber: 2,
          status: determineStep2Status(aiResponse),
          color: determineStep2Color(aiResponse),
          missingItems: aiResponse.missingInfo?.modifications || [],
          reason: determineStep2Reason(aiResponse, locale),
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
          reason: determineStep3Reason(aiResponse.vehicles, locale),
        },
      },
      attributes: aiResponse.attributes || {},
      missingStructuredFields: aiResponse.missingInfo?.structuredFields || [],
      summary: aiResponse.summary || STRINGS[locale].defaultSummary,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: error.message || STRINGS[locale].analysisError },
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

function determineStep2Reason(aiResponse: any, locale: AnalyzeLocale = "ja"): string {
  const mods = aiResponse.modifications || [];
  const missing = aiResponse.missingInfo?.modifications || [];

  if (mods.length === 0 && missing.length === 0) {
    return STRINGS[locale].noModificationsNeeded(0);
  }

  if (mods.length > 0) {
    return STRINGS[locale].modificationsApplied(mods.length);
  }

  if (missing.length > 0) {
    return STRINGS[locale].modificationsNeedInfo(missing.join(", "));
  }

  return STRINGS[locale].modificationsNeedEvaluation;
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

function determineStep3Reason(vehicles: any[], locale: AnalyzeLocale = "ja"): string {
  if (!vehicles || vehicles.length === 0) {
    return STRINGS[locale].vehicleInfoMissing;
  }

  const hasPartial = vehicles.some((v: any) => v.partial === true);

  if (hasPartial) {
    const partialVehicles = vehicles.filter((v: any) => v.partial);
    return STRINGS[locale].vehiclePartial(partialVehicles.length);
  }

  return STRINGS[locale].vehiclesConfirmed(vehicles.length);
}
