"use client";

import { useState, useEffect } from "react";
import { AccidentReportFull, ApprovalStatus } from "@/types";
import { useLocale } from "@/components/LocaleProvider";
import { localize } from "@/lib/i18n-simple";
import { getMakeLabel, getModelLabel } from "@/lib/vehicleData";

// Simple Markdown to HTML converter
function renderMarkdown(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b-2 border-blue-200">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 list-disc text-gray-700">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2 list-decimal text-gray-700">$1</li>')
    // Horizontal rule
    .replace(/^---$/gim, '<hr class="my-6 border-gray-300" />')
    // Paragraphs (lines with content)
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '<br />';
      if (line.startsWith('<h') || line.startsWith('<li') || line.startsWith('<hr') || line.startsWith('<strong')) {
        return line;
      }
      return `<p class="text-gray-700 leading-relaxed mb-3">${line}</p>`;
    })
    .join('\n');
}

interface Step4AIReportEditorProps {
  reportData: AccidentReportFull | null;
  onUpdate: (report: AccidentReportFull) => void;
}

export default function Step4AIReportEditor({
  reportData,
  onUpdate,
}: Step4AIReportEditorProps) {
  const { t, locale } = useLocale();
  const [reportText, setReportText] = useState("");
  const [status, setStatus] = useState<ApprovalStatus>("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    if (reportData) {
      setReportText(reportData.reportText || "");
      setStatus(reportData.status || "draft");

      // Do NOT auto-generate report - show keyword structure instead
      // Removed: if (!reportData.reportText && !isGenerating && !reportText) {
      //   handleGenerateReport();
      // }
    }
  }, [reportData]);

  const handleGenerateReport = async () => {
    if (!reportData) {
      alert(t("step4AIReportEditor.alerts.needCriteria"));
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData, locale }),
      });

      if (!response.ok) {
        throw new Error("報告書の生成に失敗しました");
      }

      const data = await response.json();

      if (data.warning) {
        console.warn(data.warning);
      }

      setReportText(data.reportText);
      alert(t("step4AIReportEditor.alerts.generateSuccess"));
    } catch (error) {
      console.error("Error generating report:", error);
      alert(t("step4AIReportEditor.alerts.generateError"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const updated: AccidentReportFull = {
        ...(reportData || {
          id: `report-${Date.now()}`,
          accidentType: "",
          description: "",
          appliedModifications: [],
          vehicles: [],
          attachments: [],
          approvalHistory: [],
          version: 1,
          createdAt: new Date(),
        }),
        reportText,
        status: "draft",
        updatedAt: new Date(),
      };
      onUpdate(updated);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert(t("step4AIReportEditor.alerts.draftSaved"));
    } catch (error) {
      console.error("Failed to save draft:", error);
      alert(t("step4AIReportEditor.alerts.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!reportText.trim()) {
      alert(t("step4AIReportEditor.alerts.needReportText"));
      return;
    }

    setIsSaving(true);
    try {
      const updated: AccidentReportFull = {
        ...(reportData || {
          id: `report-${Date.now()}`,
          accidentType: "",
          description: "",
          appliedModifications: [],
          vehicles: [],
          attachments: [],
          approvalHistory: [],
          version: 1,
          createdAt: new Date(),
        }),
        reportText,
        status: "pending",
        approvalHistory: [
          ...(reportData?.approvalHistory || []),
          {
            id: `action-${Date.now()}`,
            userId: "current-user",
            userName: t("step4AIReportEditor.approvalHistory.currentUser"),
            action: "submit",
            timestamp: new Date(),
          },
        ],
        updatedAt: new Date(),
      };
      onUpdate(updated);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert(t("step4AIReportEditor.alerts.approvalRequested"));
      setStatus("pending");
    } catch (error) {
      console.error("Failed to request approval:", error);
      alert(t("step4AIReportEditor.alerts.approvalFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    // Simple PDF export simulation
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accident-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(t("step4AIReportEditor.alerts.exportedPDF"));
  };

  return (
    <div className="h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">{t("step4AIReportEditor.header.title")}</h2>
          <p className="text-gray-600">
            {t("step4AIReportEditor.header.description")}
          </p>
        </div>

        {/* Status Badge */}
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              status === "draft"
                ? "bg-gray-200 text-gray-800"
                : status === "pending"
                ? "bg-yellow-200 text-yellow-800"
                : status === "approved"
                ? "bg-green-200 text-green-800"
                : "bg-red-200 text-red-800"
            }`}
          >
            {status === "draft"
              ? t("step4AIReportEditor.status.draft")
              : status === "pending"
              ? t("step4AIReportEditor.status.pending")
              : status === "approved"
              ? t("step4AIReportEditor.status.approved")
              : t("step4AIReportEditor.status.rejected")}
          </span>

          {/* AI generation button removed - now shown in keyword structure section */}
        </div>

        {/* Report Summary */}
        {reportData && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-lg">📊</span>
              {t("step4AIReportEditor.summary.title")}
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              {reportData.selectedCriteria && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">{t("step4AIReportEditor.summary.criteriaLabel")}</span>
                  <span className="flex-1">{localize(locale, reportData.selectedCriteria.title, reportData.selectedCriteria.titleEn)}</span>
                </div>
              )}
              {reportData.finalFaultPercentage !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">{t("step4AIReportEditor.summary.finalPercentageLabel")}</span>
                  <span className="text-lg font-bold text-blue-900">{reportData.finalFaultPercentage}%</span>
                </div>
              )}
              {reportData.appliedModifications && reportData.appliedModifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">{t("step4AIReportEditor.summary.modificationsLabel")}</span>
                  <span>{t("step4AIReportEditor.summary.modificationsApplied", { count: reportData.appliedModifications.length })}</span>
                </div>
              )}
              {reportData.vehicles && reportData.vehicles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">{t("step4AIReportEditor.summary.vehiclesLabel")}</span>
                  <span>{t("step4AIReportEditor.summary.vehiclesCount", { count: reportData.vehicles.length })}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keyword Document Structure */}
        {!reportText && reportData && !isGenerating && (
          <div className="mb-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📋</span>
                {t("step4AIReportEditor.structure.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t("step4AIReportEditor.structure.description")}
              </p>

              <div className="space-y-3">
                {/* Section 1 */}
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <h4 className="font-semibold text-blue-900 mb-2">{t("step4AIReportEditor.structure.section1.title")}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{t("step4AIReportEditor.structure.section1.tagDateTime")}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{t("step4AIReportEditor.structure.section1.tagLocation")}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{t("step4AIReportEditor.structure.section1.tagType")}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{t("step4AIReportEditor.structure.section1.tagParties")}</span>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <h4 className="font-semibold text-green-900 mb-2">{t("step4AIReportEditor.structure.section2.title")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {reportData.selectedCriteria ? (
                      <>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{localize(locale, reportData.selectedCriteria.title, reportData.selectedCriteria.titleEn)}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{t("step4AIReportEditor.structure.section2.basePercentage", { percentage: reportData.selectedCriteria.baseFaultPercentage })}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{t("step4AIReportEditor.structure.section2.source", { source: reportData.selectedCriteria.sourceBook || t("step4AIReportEditor.structure.section2.defaultSource") })}</span>
                      </>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">{t("step4AIReportEditor.structure.section2.notSelected")}</span>
                    )}
                  </div>
                </div>

                {/* Section 3 */}
                {reportData.appliedModifications && reportData.appliedModifications.length > 0 && (
                  <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">{t("step4AIReportEditor.structure.section3.title")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {reportData.appliedModifications.map((mod, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {mod.factorDescription} ({mod.adjustment > 0 ? "+" : ""}{mod.adjustment}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4 */}
                {reportData.finalFaultPercentage !== undefined && (
                  <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <h4 className="font-semibold text-orange-900 mb-2">{t("step4AIReportEditor.structure.section4.title")}</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded font-bold">
                        {t("step4AIReportEditor.structure.section4.finalPercentage", { percentage: reportData.finalFaultPercentage })}
                      </span>
                      {reportData.selectedCriteria && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                          {t("step4AIReportEditor.structure.section4.base", { percentage: reportData.selectedCriteria.baseFaultPercentage })}
                        </span>
                      )}
                      {reportData.appliedModifications && reportData.appliedModifications.length > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                          {t("step4AIReportEditor.structure.section4.modification")}{reportData.appliedModifications.reduce((sum, m) => sum + m.adjustment, 0) > 0 ? "+" : ""}
                          {reportData.appliedModifications.reduce((sum, m) => sum + m.adjustment, 0)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 5 */}
                {reportData.vehicles && reportData.vehicles.length > 0 && (
                  <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded">
                    <h4 className="font-semibold text-indigo-900 mb-2">{t("step4AIReportEditor.structure.section5.title")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {reportData.vehicles.map((vehicle, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">
                          {t("step4AIReportEditor.structure.section5.vehicleFormat", {
                            make: vehicle.make
                              ? getMakeLabel(vehicle.make, locale)
                              : t("step4AIReportEditor.structure.section5.notEntered"),
                            model: vehicle.model ? getModelLabel(vehicle.model, locale) : "",
                            year: vehicle.year || "?",
                          })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 6 */}
                <div className="p-4 bg-gray-50 border-l-4 border-gray-500 rounded">
                  <h4 className="font-semibold text-gray-900 mb-2">{t("step4AIReportEditor.structure.section6.title")}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">{t("step4AIReportEditor.structure.section6.tagEvaluation")}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">{t("step4AIReportEditor.structure.section6.tagLegalBasis")}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">{t("step4AIReportEditor.structure.section6.tagReason")}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                >
                  {isGenerating ? t("step4AIReportEditor.generateButton.generating") : t("step4AIReportEditor.generateButton.generate")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Generation Loading State */}
        {!reportText && reportData && isGenerating && (
          <div className="mb-4 p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-dashed border-purple-300 rounded-xl text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t("step4AIReportEditor.loading.title")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("step4AIReportEditor.loading.description")}
            </p>
            <div className="flex justify-center">
              <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        )}

        {/* Report Viewer/Editor */}
        {reportText && (
          <div className="mb-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t("step4AIReportEditor.editor.label")}
                </label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === "preview"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {t("step4AIReportEditor.editor.previewTab")}
                  </button>
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === "edit"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {t("step4AIReportEditor.editor.editTab")}
                  </button>
                </div>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
              >
                {isGenerating ? t("step4AIReportEditor.editor.regenerating") : t("step4AIReportEditor.editor.regenerate")}
              </button>
            </div>

            {/* Preview Mode */}
            {viewMode === "preview" ? (
              <div
                className="flex-1 w-full px-6 py-5 border border-gray-200 rounded-lg bg-white shadow-sm overflow-y-auto"
                style={{ minHeight: "400px" }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(reportText) }}
              />
            ) : (
              /* Edit Mode */
              <textarea
                id="report-text"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={t("step4AIReportEditor.editor.placeholder")}
                className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white leading-relaxed font-mono"
                style={{ minHeight: "400px" }}
                disabled={status === "approved"}
              />
            )}
            <p className="text-xs text-gray-500 mt-2">
              {viewMode === "preview" ? (
                <span>{t("step4AIReportEditor.editor.previewHint")}</span>
              ) : (
                <span>{t("step4AIReportEditor.editor.editHint")}</span>
              )}
            </p>
          </div>
        )}

        {/* Approval History */}
        {reportData?.approvalHistory && reportData.approvalHistory.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📋</span>
              {t("step4AIReportEditor.approvalHistory.title")}
            </h3>
            <div className="space-y-2">
              {reportData.approvalHistory.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 bg-white rounded border text-sm hover:shadow-sm transition-shadow"
                >
                  <div>
                    <span className="font-medium">{action.userName}</span>
                    <span className="text-gray-600 ml-2">
                      {action.action === "submit"
                        ? t("step4AIReportEditor.approvalHistory.actionSubmit")
                        : action.action === "approve"
                        ? t("step4AIReportEditor.approvalHistory.actionApprove")
                        : action.action === "reject"
                        ? t("step4AIReportEditor.approvalHistory.actionReject")
                        : t("step4AIReportEditor.approvalHistory.actionComment")}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {action.timestamp.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-auto pt-4 border-t">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || status === "approved" || !reportText}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSaving ? t("step4AIReportEditor.actions.saving") : t("step4AIReportEditor.actions.saveDraft")}
          </button>
          <button
            onClick={handleRequestApproval}
            disabled={isSaving || status === "approved" || !reportText.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {t("step4AIReportEditor.actions.requestApproval")}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!reportText}
            className="px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {t("step4AIReportEditor.actions.exportPDF")}
          </button>
        </div>
      </div>
    </div>
  );
}

