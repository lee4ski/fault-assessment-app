"use client";

import { useState, useEffect } from "react";
import { AccidentReportFull, ApprovalStatus } from "@/types";

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
  const [reportText, setReportText] = useState("");
  const [status, setStatus] = useState<ApprovalStatus>("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    if (reportData) {
      setReportText(reportData.reportText || "");
      setStatus(reportData.status || "draft");

      // Auto-generate report if text is empty and data is available
      if (!reportData.reportText && !isGenerating && !reportText) {
        handleGenerateReport();
      }
    }
  }, [reportData]);

  const handleGenerateReport = async () => {
    if (!reportData) {
      alert("報告書を生成するには、まず認定基準と過失割合を設定してください");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData }),
      });

      if (!response.ok) {
        throw new Error("報告書の生成に失敗しました");
      }

      const data = await response.json();
      
      if (data.warning) {
        console.warn(data.warning);
      }

      setReportText(data.reportText);
      alert("✨ AI報告書を生成しました！内容を確認・編集してください。");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("報告書の生成中にエラーが発生しました。もう一度お試しください。");
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
      alert("💾 下書きを保存しました");
    } catch (error) {
      console.error("Failed to save draft:", error);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!reportText.trim()) {
      alert("報告書本文を入力してください");
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
            userName: "現在のユーザー",
            action: "submit",
            timestamp: new Date(),
          },
        ],
        updatedAt: new Date(),
      };
      onUpdate(updated);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert("✅ 承認を依頼しました");
      setStatus("pending");
    } catch (error) {
      console.error("Failed to request approval:", error);
      alert("承認依頼に失敗しました");
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
    
    alert("📄 報告書をエクスポートしました\n（PDF機能は今後実装予定です。現在はテキストファイルとして保存されます）");
  };

  return (
    <div className="h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">ステップ4: AI報告書作成・編集</h2>
          <p className="text-gray-600">
            AIが報告書を生成します。内容を確認・編集して、承認を依頼できます。
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
              ? "📝 下書き"
              : status === "pending"
              ? "⏳ 承認待ち"
              : status === "approved"
              ? "✅ 承認済み"
              : "❌ 却下"}
          </span>

          {!reportText && (
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || !reportData}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
            >
              {isGenerating ? "🤖 AI生成中..." : "✨ AI報告書を生成"}
            </button>
          )}
        </div>

        {/* Report Summary */}
        {reportData && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-lg">📊</span>
              報告書サマリー
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              {reportData.selectedCriteria && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">認定基準:</span>
                  <span className="flex-1">{reportData.selectedCriteria.title}</span>
                </div>
              )}
              {reportData.finalFaultPercentage !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">最終過失割合:</span>
                  <span className="text-lg font-bold text-blue-900">{reportData.finalFaultPercentage}%</span>
                </div>
              )}
              {reportData.appliedModifications && reportData.appliedModifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">修正要素:</span>
                  <span>{reportData.appliedModifications.length}件適用</span>
                </div>
              )}
              {reportData.vehicles && reportData.vehicles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-700 min-w-[100px]">関係車両:</span>
                  <span>{reportData.vehicles.length}台</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Generation Prompt */}
        {!reportText && reportData && (
          <div className="mb-4 p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-dashed border-purple-300 rounded-xl text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              AIが専門的な報告書を自動生成します
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              認定基準、修正要素、車両情報から、詳細で正確な事故報告書を作成します
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg text-lg"
            >
              {isGenerating ? "🤖 生成中..." : "✨ AI報告書を生成する"}
            </button>
          </div>
        )}

        {/* Report Viewer/Editor */}
        {reportText && (
          <div className="mb-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700">
                  📄 報告書本文
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
                    👁️ プレビュー
                  </button>
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === "edit"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    ✏️ 編集
                  </button>
                </div>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
              >
                {isGenerating ? "再生成中..." : "🔄 AIで再生成"}
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
                placeholder="AIが報告書を生成するか、ここに直接入力してください..."
                className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white leading-relaxed font-mono"
                style={{ minHeight: "400px" }}
                disabled={status === "approved"}
              />
            )}
            <p className="text-xs text-gray-500 mt-2">
              {viewMode === "preview" ? (
                <span>👁️ プレビューモード - 編集するには「✏️ 編集」をクリック</span>
              ) : (
                <span>💡 ヒント: Markdown形式で記述できます。プレビューで確認できます。</span>
              )}
            </p>
          </div>
        )}

        {/* Approval History */}
        {reportData?.approvalHistory && reportData.approvalHistory.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📋</span>
              承認履歴
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
                        ? "✉️ 承認依頼"
                        : action.action === "approve"
                        ? "✅ 承認"
                        : action.action === "reject"
                        ? "❌ 却下"
                        : "💬 コメント"}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {action.timestamp.toLocaleString("ja-JP")}
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
            {isSaving ? "💾 保存中..." : "💾 下書きを保存"}
          </button>
          <button
            onClick={handleRequestApproval}
            disabled={isSaving || status === "approved" || !reportText.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            ✅ 承認を依頼
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!reportText}
            className="px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            📄 PDF出力
          </button>
        </div>
      </div>
    </div>
  );
}

