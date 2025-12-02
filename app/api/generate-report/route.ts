import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AccidentReportFull } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { reportData } = await request.json();

    if (!reportData) {
      return NextResponse.json(
        { error: "報告書データが必要です" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, generating template report");
      return NextResponse.json(
        { reportText: generateTemplateReport(reportData) },
        { status: 200 }
      );
    }

    // Generate AI-powered report
    const systemPrompt = `あなたは交通事故報告書を作成する専門家です。
提供された事故情報に基づいて、詳細で専門的な事故報告書を日本語で作成してください。

報告書には以下を含めてください：
1. 事故の概要
2. 認定基準の説明
3. 適用された修正要素
4. 最終過失割合とその根拠
5. 関係車両の情報
6. 結論

フォーマットはMarkdown形式で、見出しは ## を使用してください。
専門的で正確な表現を使用し、法的根拠を明確にしてください。`;

    const userPrompt = buildPromptFromReportData(reportData);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reportText = completion.choices[0]?.message?.content || generateTemplateReport(reportData);

    return NextResponse.json({ reportText });
  } catch (error: any) {
    console.error("Report generation error:", error);
    
    // Fallback to template
    const { reportData } = await request.json();
    return NextResponse.json({
      reportText: generateTemplateReport(reportData),
      warning: "AI生成に失敗したため、テンプレートを使用しています"
    });
  }
}

function buildPromptFromReportData(reportData: AccidentReportFull): string {
  let prompt = "以下の情報に基づいて、詳細な交通事故報告書を作成してください:\n\n";

  if (reportData.selectedCriteria) {
    prompt += `### 認定基準\n`;
    prompt += `タイトル: ${reportData.selectedCriteria.title}\n`;
    prompt += `説明: ${reportData.selectedCriteria.description}\n`;
    prompt += `基本過失割合: ${reportData.selectedCriteria.baseFaultPercentage}%\n`;
    prompt += `出典: ${reportData.selectedCriteria.sourceBook} ${reportData.selectedCriteria.sourceEdition}\n\n`;
  }

  if (reportData.appliedModifications && reportData.appliedModifications.length > 0) {
    prompt += `### 適用された修正要素\n`;
    reportData.appliedModifications.forEach((mod) => {
      prompt += `- ${mod.factorDescription}: ${mod.adjustment > 0 ? "+" : ""}${mod.adjustment}%\n`;
    });
    prompt += `\n`;
  }

  if (reportData.finalFaultPercentage !== undefined) {
    prompt += `### 最終過失割合\n`;
    prompt += `${reportData.finalFaultPercentage}%\n\n`;
  }

  if (reportData.vehicles && reportData.vehicles.length > 0) {
    prompt += `### 関係車両\n`;
    reportData.vehicles.forEach((vehicle, index) => {
      prompt += `車両${index + 1}: ${vehicle.make} ${vehicle.model} (${vehicle.year}年式)\n`;
      prompt += `型式: ${vehicle.modelCode}\n`;
      prompt += `\n`;
    });
  }

  return prompt;
}

function generateTemplateReport(reportData: AccidentReportFull): string {
  let text = "## 交通事故報告書\n\n";
  text += `**作成日**: ${new Date().toLocaleDateString("ja-JP")}\n\n`;
  
  // Add missing information warnings
  const missingInfo: string[] = [];
  if (!reportData.selectedCriteria) missingInfo.push("認定基準");
  if (!reportData.vehicles || reportData.vehicles.length === 0) missingInfo.push("車両情報");
  if (!reportData.finalFaultPercentage && reportData.finalFaultPercentage !== 0) missingInfo.push("最終過失割合");
  
  if (missingInfo.length > 0) {
    text += `> ⚠️ **不足情報**: ${missingInfo.join("、")}が不足しています。追加情報を入力してください。\n\n`;
  }
  
  text += "---\n\n";

  text += "## 1. 事故の概要\n\n";
  text += "本件は交通事故に関する過失割合の認定を行うものです。\n\n";

  if (reportData.selectedCriteria) {
    text += "## 2. 認定基準\n\n";
    text += `**基準名称**: ${reportData.selectedCriteria.title}\n\n`;
    text += `**説明**: ${reportData.selectedCriteria.description}\n\n`;
    text += `**基本過失割合**: ${reportData.selectedCriteria.baseFaultPercentage}%\n\n`;
    text += `**出典**: ${reportData.selectedCriteria.sourceBook} ${reportData.selectedCriteria.sourceEdition} (p.${reportData.selectedCriteria.pageNumber})\n\n`;
  } else {
    text += "## 2. 認定基準\n\n";
    text += `> ⚠️ **認定基準が選択されていません**。ステップ1で適切な認定基準を選択してください。\n\n`;
  }

  if (reportData.appliedModifications && reportData.appliedModifications.length > 0) {
    text += "## 3. 適用された修正要素\n\n";
    text += "以下の修正要素が基本過失割合に適用されました:\n\n";
    reportData.appliedModifications.forEach((mod, index) => {
      text += `${index + 1}. **${mod.factorDescription}**: ${mod.adjustment > 0 ? "+" : ""}${mod.adjustment}%\n`;
    });
    text += `\n`;
  }

  if (reportData.finalFaultPercentage !== undefined) {
    text += "## 4. 最終過失割合\n\n";
    const basePercentage = reportData.selectedCriteria?.baseFaultPercentage || 0;
    const totalAdjustment = reportData.appliedModifications?.reduce((sum, mod) => sum + mod.adjustment, 0) || 0;
    
    text += `**基本過失割合**: ${basePercentage}%\n\n`;
    if (totalAdjustment !== 0) {
      text += `**修正要素合計**: ${totalAdjustment > 0 ? "+" : ""}${totalAdjustment}%\n\n`;
    }
    text += `**最終過失割合**: **${reportData.finalFaultPercentage}%**\n\n`;
    text += `上記の認定基準および修正要素を総合的に勘案した結果、本件事故における過失割合は ${reportData.finalFaultPercentage}% と認定されます。\n\n`;
  }

  if (reportData.vehicles && reportData.vehicles.length > 0) {
    text += "## 5. 関係車両情報\n\n";
    reportData.vehicles.forEach((vehicle, index) => {
      text += `### 車両 ${index + 1}\n\n`;
      
      const isPartial = !vehicle.make || !vehicle.model || !vehicle.modelCode;
      if (isPartial) {
        text += `> ⚠️ **この車両の情報は不完全です**。詳細を追加してください。\n\n`;
      }
      
      text += `- **メーカー**: ${vehicle.make || "❌ *未入力*"}\n`;
      text += `- **車種**: ${vehicle.model || "❌ *未入力*"}\n`;
      text += `- **年式**: ${vehicle.year ? `${vehicle.year}年` : "❌ *未入力*"}\n`;
      text += `- **型式**: ${vehicle.modelCode || "❌ *未入力*"}\n`;
      text += `\n`;
    });
  } else {
    text += "## 5. 関係車両情報\n\n";
    text += `> ⚠️ **車両情報が登録されていません**。ステップ3で車両情報を追加してください。\n\n`;
  }

  text += "## 6. 結論\n\n";
  text += "以上の認定基準、修正要素、および関係車両の情報を総合的に検討した結果、";
  text += `本件事故における過失割合は ${reportData.finalFaultPercentage}% と認定するのが相当であると考えます。\n\n`;
  text += "---\n\n";
  text += `**報告書作成者**: システム自動生成\n`;
  text += `**作成日時**: ${new Date().toLocaleString("ja-JP")}\n`;

  return text;
}

