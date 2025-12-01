"use client";

import { useState, useEffect } from "react";
import { AccidentReportFull, ApprovalStatus } from "@/types";

interface Step5ReportEditorProps {
  reportData: AccidentReportFull | null;
  onUpdate: (report: AccidentReportFull) => void;
}

export default function Step5ReportEditor({
  reportData,
  onUpdate,
}: Step5ReportEditorProps) {
  const [reportText, setReportText] = useState("");
  const [status, setStatus] = useState<ApprovalStatus>("draft");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reportData) {
      setReportText(reportData.reportText || "");
      setStatus(reportData.status || "draft");
    } else {
      // Generate initial report text from previous steps
      const initialText = generateInitialReportText();
      setReportText(initialText);
    }
  }, [reportData]);

  const generateInitialReportText = (): string => {
    if (!reportData) return "";

    let text = "# 事故報告書\n\n";
    
    if (reportData.selectedCriteria) {
      text += `## 認定基準\n\n`;
      text += `**${reportData.selectedCriteria.title}**\n\n`;
      text += `${reportData.selectedCriteria.description}\n\n`;
      text += `基本過失割合: ${reportData.selectedCriteria.baseFaultPercentage}%\n\n`;
    }

    if (reportData.appliedModifications && reportData.appliedModifications.length > 0) {
      text += `## 適用された修正要素\n\n`;
      reportData.appliedModifications.forEach((mod) => {
        text += `- ${mod.factorDescription}: ${mod.adjustment > 0 ? "+" : ""}${mod.adjustment}%\n`;
      });
      text += `\n`;
    }

    if (reportData.finalFaultPercentage !== undefined) {
      text += `## 最終過失割合\n\n`;
      text += `**${reportData.finalFaultPercentage}%**\n\n`;
    }

    if (reportData.vehicles && reportData.vehicles.length > 0) {
      text += `## 関係車両\n\n`;
      reportData.vehicles.forEach((vehicle) => {
        text += `- ${vehicle.make} ${vehicle.model} (${vehicle.modelCode})\n`;
      });
      text += `\n`;
    }

    text += `## 報告書本文\n\n`;
    text += `ここに事故の詳細を記入してください。\n`;

    return text;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const updated: AccidentReportFull = {
        ...(reportData || {
          id: `report-${Date.now()}`,
          accidentType: "",
          description: "",
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
      alert("下書きを保存しました");
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
      alert("承認を依頼しました");
      setStatus("pending");
    } catch (error) {
      console.error("Failed to request approval:", error);
      alert("承認依頼に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    alert("PDFエクスポート機能は今後実装予定です");
  };

  return (
    <div className="h-full">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">ステップ5: 報告書編集</h2>
          <p className="text-gray-600">
            事故報告書を編集し、承認を依頼できます。
          </p>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
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
              ? "下書き"
              : status === "pending"
              ? "承認待ち"
              : status === "approved"
              ? "承認済み"
              : "却下"}
          </span>
        </div>

        {/* Report Summary */}
        {reportData && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">報告書サマリー</h3>
            <div className="text-sm text-gray-700 space-y-1">
              {reportData.selectedCriteria && (
                <p>
                  <span className="font-medium">認定基準:</span>{" "}
                  {reportData.selectedCriteria.title}
                </p>
              )}
              {reportData.finalFaultPercentage !== undefined && (
                <p>
                  <span className="font-medium">最終過失割合:</span>{" "}
                  {reportData.finalFaultPercentage}%
                </p>
              )}
              {reportData.vehicles && reportData.vehicles.length > 0 && (
                <p>
                  <span className="font-medium">関係車両:</span>{" "}
                  {reportData.vehicles.length}台
                </p>
              )}
            </div>
          </div>
        )}

        {/* Report Editor */}
        <div className="mb-4 flex-1 flex flex-col">
          <label
            htmlFor="report-text"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            報告書本文
          </label>
          <textarea
            id="report-text"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="事故の詳細を記入してください..."
            className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 bg-white"
            disabled={status === "approved"}
          />
        </div>

        {/* Attachments Section (Placeholder) */}
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">添付ファイル</h3>
          <p className="text-sm text-gray-600 mb-2">
            添付ファイル機能は今後実装予定です
          </p>
          {reportData?.attachments && reportData.attachments.length > 0 && (
            <div className="space-y-2">
              {reportData.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <span className="text-sm text-gray-700">{attachment.filename}</span>
                  <span className="text-xs text-gray-500">
                    {attachment.size} bytes
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval History */}
        {reportData?.approvalHistory && reportData.approvalHistory.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">承認履歴</h3>
            <div className="space-y-2">
              {reportData.approvalHistory.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                >
                  <div>
                    <span className="font-medium">{action.userName}</span>
                    <span className="text-gray-600 ml-2">
                      {action.action === "submit"
                        ? "承認依頼"
                        : action.action === "approve"
                        ? "承認"
                        : action.action === "reject"
                        ? "却下"
                        : "コメント"}
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
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || status === "approved"}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "保存中..." : "下書きを保存"}
          </button>
          <button
            onClick={handleRequestApproval}
            disabled={isSaving || status === "approved" || !reportText.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            承認を依頼
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
          >
            PDF出力
          </button>
        </div>
      </div>
    </div>
  );
}

