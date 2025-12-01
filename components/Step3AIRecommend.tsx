"use client";

import { useState } from "react";
import { AssessmentCriteria, AccidentReport } from "@/types";

interface Step3AIRecommendProps {
  report?: AccidentReport;
  criteria: AssessmentCriteria[];
  onSelectCriteria: (criteria: AssessmentCriteria) => void;
}

export default function Step3AIRecommend({
  report,
  criteria,
  onSelectCriteria,
}: Step3AIRecommendProps) {
  const [accidentText, setAccidentText] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<
    Array<{ criteria: AssessmentCriteria; score: number; reason: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate AI recommendations (in real implementation, this would call an AI API)
  const handleGetRecommendations = async () => {
    if (!accidentText.trim()) {
      alert("事故報告を入力してください");
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Simple keyword matching for demo
      const keywords = accidentText.toLowerCase();
      const recommendations = criteria
        .map((c) => {
          let score = 0;
          if (c.title.toLowerCase().includes(keywords) || keywords.includes(c.title.toLowerCase())) {
            score += 80;
          }
          if (c.description.toLowerCase().includes(keywords)) {
            score += 50;
          }
          if (c.chapterTitle.toLowerCase().includes(keywords)) {
            score += 30;
          }
          return {
            criteria: c,
            score,
            reason: `事故報告の内容から、この認定基準が関連している可能性があります。`,
          };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setAiRecommendations(recommendations);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="h-[calc(100vh-300px)]">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">ステップ3: AI推奨基準の確認</h2>
          <p className="text-gray-600">
            事故報告を入力すると、AIが適切な認定基準を推奨します。
          </p>
        </div>

        {report && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold mb-2">
              計算が完了しました
            </p>
            <p className="text-sm text-gray-700">
              最終過失割合: <span className="font-bold">{report.finalFaultPercentage}%</span>
            </p>
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="accident-report"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            事故報告を入力
          </label>
          <textarea
            id="accident-report"
            value={accidentText}
            onChange={(e) => setAccidentText(e.target.value)}
            placeholder="例: 交差点で歩行者と車が衝突。信号は青だった。歩行者は幼児だった。"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleGetRecommendations}
          disabled={isLoading || !accidentText.trim()}
          className="mb-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "AI推奨を生成中..." : "AI推奨基準を取得"}
        </button>

        {aiRecommendations.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">AI推奨基準 (Top 3)</h3>
            <div className="space-y-4 mb-6">
              {aiRecommendations.map((rec, index) => (
                <div
                  key={rec.criteria.id}
                  className={`p-4 border-2 rounded-lg transition-colors cursor-pointer ${report?.selectedCriteria?.id === rec.criteria.id
                      ? "border-green-500 bg-green-50"
                      : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                    }`}
                  onClick={() => onSelectCriteria(rec.criteria)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                      推奨 {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-blue-700">
                      適合スコア: {rec.score}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {rec.criteria.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {rec.criteria.description}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{rec.reason}</p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {rec.criteria.chapterTitle}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      基本過失割合: {rec.criteria.baseFaultPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Story C-2: Feedback Loop */}
            {report?.selectedCriteria &&
              aiRecommendations.length > 0 &&
              report.selectedCriteria.id !== aiRecommendations[0].criteria.id && (
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    AI推奨と異なる基準が選択されています
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    品質改善のため、AI推奨（推奨1）を選択しなかった理由を教えてください。
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="例: 事故状況の特殊性により、こちらの基準の方が適切と判断したため"
                      className="flex-1 px-3 py-2 border border-yellow-300 rounded text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const input = e.currentTarget;
                          const reason = input.value;
                          if (!reason.trim()) return;

                          try {
                            await fetch("/api/audit", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "ai_feedback",
                                selectedCriteria: report.selectedCriteria,
                                aiRecommendations: aiRecommendations.map((r) => ({
                                  criteriaId: r.criteria.id,
                                  score: r.score,
                                })),
                                overrideReason: reason,
                              }),
                            });
                            alert("フィードバックを送信しました。ご協力ありがとうございます。");
                            input.value = "";
                          } catch (error) {
                            console.error("Failed to send feedback:", error);
                          }
                        }
                      }}
                    />
                    <button
                      onClick={async (e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        const reason = input.value;
                        if (!reason.trim()) return;

                        try {
                          await fetch("/api/audit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "ai_feedback",
                              selectedCriteria: report.selectedCriteria,
                              aiRecommendations: aiRecommendations.map((r) => ({
                                criteriaId: r.criteria.id,
                                score: r.score,
                              })),
                              overrideReason: reason,
                            }),
                          });
                          alert("フィードバックを送信しました。ご協力ありがとうございます。");
                          input.value = "";
                        } catch (error) {
                          console.error("Failed to send feedback:", error);
                        }
                      }}
                      className="px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded hover:bg-yellow-700 transition-colors"
                    >
                      送信
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}

        {aiRecommendations.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>事故報告を入力してAI推奨を取得してください</p>
          </div>
        )}
      </div>
    </div>
  );
}

