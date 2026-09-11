import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AccidentReportFull } from "@/types";
import { localize } from "@/lib/i18n-simple";
import { getMakeLabel, getModelLabel } from "@/lib/vehicleData";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

type ReportLocale = "ja" | "en";

export async function POST(request: NextRequest) {
  // Parse the body once and reuse it, including in the catch block below
  // (the original code called request.json() a second time on error, which
  // throws because the request stream can only be read once).
  let reportData: AccidentReportFull | undefined;
  let locale: ReportLocale = "ja";

  try {
    const body = await request.json();
    reportData = body.reportData;
    locale = body.locale === "en" ? "en" : "ja";

    if (!reportData) {
      return NextResponse.json(
        { error: locale === "en" ? "Report data is required" : "報告書データが必要です" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, generating template report");
      return NextResponse.json(
        { reportText: generateTemplateReport(reportData, locale) },
        { status: 200 }
      );
    }

    // Generate AI-powered report
    const systemPrompt =
      locale === "en"
        ? `You are an expert who prepares traffic accident reports.
Based on the accident information provided, write a detailed, professional accident report in English.

The report should include:
1. Overview of the accident
2. Explanation of the assessment criteria
3. Modification factors applied
4. The final fault percentage and its rationale
5. Information about the vehicles involved
6. Conclusion

Format the report in Markdown, using ## for headings.
Use precise, professional language and state the legal basis clearly.`
        : `あなたは交通事故報告書を作成する専門家です。
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

    const userPrompt = buildPromptFromReportData(reportData, locale);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reportText = completion.choices[0]?.message?.content || generateTemplateReport(reportData, locale);

    return NextResponse.json({ reportText });
  } catch (error: any) {
    console.error("Report generation error:", error);

    // Fallback to template using the reportData/locale we already parsed above
    if (!reportData) {
      return NextResponse.json(
        { error: locale === "en" ? "Report data is required" : "報告書データが必要です" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      reportText: generateTemplateReport(reportData, locale),
      warning:
        locale === "en"
          ? "AI generation failed, so a template was used instead"
          : "AI生成に失敗したため、テンプレートを使用しています",
    });
  }
}

function buildPromptFromReportData(reportData: AccidentReportFull, locale: ReportLocale = "ja"): string {
  if (locale === "en") {
    let prompt = "Please prepare a detailed traffic accident report based on the following information:\n\n";

    if (reportData.selectedCriteria) {
      const c = reportData.selectedCriteria;
      prompt += `### Assessment Criteria\n`;
      prompt += `Title: ${localize(locale, c.title, c.titleEn)}\n`;
      prompt += `Description: ${localize(locale, c.description, c.descriptionEn)}\n`;
      prompt += `Base fault percentage: ${c.baseFaultPercentage}%\n`;
      prompt += `Source: ${c.sourceBook} ${c.sourceEdition}\n\n`;
    }

    if (reportData.appliedModifications && reportData.appliedModifications.length > 0) {
      prompt += `### Modification Factors Applied\n`;
      reportData.appliedModifications.forEach((mod) => {
        prompt += `- ${mod.factorDescription}: ${mod.adjustment > 0 ? "+" : ""}${mod.adjustment}%\n`;
      });
      prompt += `\n`;
    }

    if (reportData.finalFaultPercentage !== undefined) {
      prompt += `### Final Fault Percentage\n`;
      prompt += `${reportData.finalFaultPercentage}%\n\n`;
    }

    if (reportData.vehicles && reportData.vehicles.length > 0) {
      prompt += `### Vehicles Involved\n`;
      reportData.vehicles.forEach((vehicle, index) => {
        prompt += `Vehicle ${index + 1}: ${getMakeLabel(vehicle.make, locale)} ${getModelLabel(vehicle.model, locale)} (model year ${vehicle.year})\n`;
        prompt += `Model code: ${vehicle.modelCode}\n`;
        prompt += `\n`;
      });
    }

    return prompt;
  }

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

function generateTemplateReport(reportData: AccidentReportFull, locale: ReportLocale = "ja"): string {
  if (locale === "en") {
    let text = "## Traffic Accident Report\n\n";
    text += `**Date prepared**: ${new Date().toLocaleDateString("en-US")}\n\n`;

    const missingInfo: string[] = [];
    if (!reportData.selectedCriteria) missingInfo.push("assessment criteria");
    if (!reportData.vehicles || reportData.vehicles.length === 0) missingInfo.push("vehicle information");
    if (!reportData.finalFaultPercentage && reportData.finalFaultPercentage !== 0) missingInfo.push("final fault percentage");

    if (missingInfo.length > 0) {
      text += `> ⚠️ **Missing information**: ${missingInfo.join(", ")} ${missingInfo.length > 1 ? "are" : "is"} missing. Please provide additional information.\n\n`;
    }

    text += "---\n\n";

    text += "## 1. Overview of the Accident\n\n";
    text += "This report concerns the determination of the fault percentage for a traffic accident.\n\n";

    if (reportData.selectedCriteria) {
      const c = reportData.selectedCriteria;
      text += "## 2. Assessment Criteria\n\n";
      text += `**Criteria name**: ${localize(locale, c.title, c.titleEn)}\n\n`;
      text += `**Description**: ${localize(locale, c.description, c.descriptionEn)}\n\n`;
      text += `**Base fault percentage**: ${c.baseFaultPercentage}%\n\n`;
      text += `**Source**: ${c.sourceBook} ${c.sourceEdition} (p.${c.pageNumber})\n\n`;
    } else {
      text += "## 2. Assessment Criteria\n\n";
      text += `> ⚠️ **No assessment criteria selected**. Please select an appropriate assessment criterion in Step 1.\n\n`;
    }

    if (reportData.appliedModifications && reportData.appliedModifications.length > 0) {
      text += "## 3. Modification Factors Applied\n\n";
      text += "The following modification factors were applied to the base fault percentage:\n\n";
      reportData.appliedModifications.forEach((mod, index) => {
        text += `${index + 1}. **${mod.factorDescription}**: ${mod.adjustment > 0 ? "+" : ""}${mod.adjustment}%\n`;
      });
      text += `\n`;
    }

    if (reportData.finalFaultPercentage !== undefined) {
      text += "## 4. Final Fault Percentage\n\n";
      const basePercentage = reportData.selectedCriteria?.baseFaultPercentage || 0;
      const totalAdjustment = reportData.appliedModifications?.reduce((sum, mod) => sum + mod.adjustment, 0) || 0;

      text += `**Base fault percentage**: ${basePercentage}%\n\n`;
      if (totalAdjustment !== 0) {
        text += `**Total modification**: ${totalAdjustment > 0 ? "+" : ""}${totalAdjustment}%\n\n`;
      }
      text += `**Final fault percentage**: **${reportData.finalFaultPercentage}%**\n\n`;
      text += `Taking the above assessment criteria and modification factors into account, the fault percentage for this accident is determined to be ${reportData.finalFaultPercentage}%.\n\n`;
    }

    if (reportData.vehicles && reportData.vehicles.length > 0) {
      text += "## 5. Vehicle Information\n\n";
      reportData.vehicles.forEach((vehicle, index) => {
        text += `### Vehicle ${index + 1}\n\n`;

        const isPartial = !vehicle.make || !vehicle.model || !vehicle.modelCode;
        if (isPartial) {
          text += `> ⚠️ **This vehicle's information is incomplete**. Please add further details.\n\n`;
        }

        text += `- **Make**: ${vehicle.make ? getMakeLabel(vehicle.make, locale) : "❌ *Not entered*"}\n`;
        text += `- **Model**: ${vehicle.model ? getModelLabel(vehicle.model, locale) : "❌ *Not entered*"}\n`;
        text += `- **Model year**: ${vehicle.year ? `${vehicle.year}` : "❌ *Not entered*"}\n`;
        text += `- **Model code**: ${vehicle.modelCode || "❌ *Not entered*"}\n`;
        text += `\n`;
      });
    } else {
      text += "## 5. Vehicle Information\n\n";
      text += `> ⚠️ **No vehicle information has been registered**. Please add vehicle information in Step 3.\n\n`;
    }

    text += "## 6. Conclusion\n\n";
    text += "Having comprehensively considered the assessment criteria, modification factors, and information about the vehicles involved, ";
    text += `it is concluded that a fault percentage of ${reportData.finalFaultPercentage}% is appropriate for this accident.\n\n`;
    text += "---\n\n";
    text += `**Prepared by**: Automatically generated by the system\n`;
    text += `**Date/time prepared**: ${new Date().toLocaleString("en-US")}\n`;

    return text;
  }

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
