import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sampleCriteria } from "@/data/sampleCriteria";
import { AssessmentCriteria } from "@/types";
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

// Configure timeout for Vercel (max 60 seconds for Hobby plan)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("[ai-analyze-accident] Starting analysis request");
  
  try {
    const { accidentDescription } = await request.json();
    console.log("[ai-analyze-accident] Received description length:", accidentDescription?.length || 0);

    if (!accidentDescription || accidentDescription.trim().length < 10) {
      return NextResponse.json(
        { error: "事故の説明が短すぎます。詳細を入力してください。" },
        { status: 400 }
      );
    }

    // Check for overly long descriptions to prevent Vercel request size limits
    if (accidentDescription.length > 1000) {
      return NextResponse.json(
        { error: "事故の説明が長すぎます。要約して入力してください（最大1000文字）。" },
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
   **重要**: 説明文に「トヨタ プリウス」「ホンダ シビック」などの車両情報が含まれている場合、必ず抽出してください。
   メーカー名と車種名を正確に分離してください（例: "トヨタ" = make, "プリウス" = model）。
   年式が明記されていない場合は、説明文から推測できる範囲で年式を推定してください。
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

【検索された認定基準候補】(ベクトル検索による類似度スコア付き。これらの中から最適なものを選択し、確率を付与してください):
${JSON.stringify(
  relevantCriteriaWithScores.map((r) => {
    const c = r.criteria;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      baseFaultPercentage: c.baseFaultPercentage,
      similarity: Math.round(r.similarity * 100), // Vector similarity score (0-100)
      // 修正要素は「IDと説明」をセットで渡す
      modificationFactors: (c.modificationFactors || []).map((m: any) => ({
        id: m.id,
        description: m.description,
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

    const userPrompt = `以下の事故説明を分析してください：\n\n${accidentDescription}`;

    console.log("[ai-analyze-accident] Calling OpenAI API...");
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
      { timeout: 25000 } // 25s timeout (increased from 18s)
    );
    console.log("[ai-analyze-accident] OpenAI API response received");

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
          title: c?.title || cand.id,
          probability: cand.probability || similarityScores.get(cand.id) || 0
        };
      });
    } else {
      // Fallback: Use vector similarity scores for all retrieved cases
      candidates = relevantCriteriaWithScores.map((r) => ({
        id: r.criteria.id,
        title: r.criteria.title,
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
            ? "認定基準が特定されました" 
            : "認定基準を特定できませんでした。追加情報が必要です。",
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

    const elapsed = Date.now() - startTime;
    console.log(`[ai-analyze-accident] Analysis completed in ${elapsed}ms`);
    return NextResponse.json(result);
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[ai-analyze-accident] Error after ${elapsed}ms:`, error);
    console.error("[ai-analyze-accident] Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    
    // Return more detailed error information
    const errorMessage = error?.message || "分析中にエラーが発生しました。";
    const isTimeout = error?.name === 'AbortError' || errorMessage.includes('timeout') || elapsed > 25000;
    
    return NextResponse.json(
      { 
        error: isTimeout 
          ? "タイムアウト: 分析に時間がかかりすぎています。もう一度お試しください。" 
          : errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: isTimeout ? 408 : 500 }
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
