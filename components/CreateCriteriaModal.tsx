
"use client";

import { useState, useEffect } from "react";
import { AssessmentCriteria, AccidentAttributes } from "@/types";

interface CreateCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (criteria: AssessmentCriteria) => void;
  initialAttributes?: AccidentAttributes;
  description?: string; // The accident description to base the new criteria on
}

export default function CreateCriteriaModal({
  isOpen,
  onClose,
  onSave,
  initialAttributes,
  description,
}: CreateCriteriaModalProps) {
  const [title, setTitle] = useState("");
  const [baseFault, setBaseFault] = useState<number>(50);
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-generate draft if description provided
  useEffect(() => {
    if (isOpen && description && !title) {
      generateDraft();
    }
  }, [isOpen, description]);

  const generateDraft = async () => {
    if (!description) return;
    
    setIsGenerating(true);
    try {
      // We can reuse the analyze endpoint or a new one. 
      // For simplicity, let's assume we ask the AI to format it as a criteria title/summary
      // Or simply infer from attributes
      
      // Simple inference for now to avoid another API call unless requested
      // Actually, let's use a simple heuristic or placeholder
      // If we wanted real AI generation, we'd hit an endpoint.
      
      // Let's just set a placeholder title based on attributes if available
      if (initialAttributes) {
        const partyA = initialAttributes.partyTypes?.[0] || "A";
        const partyB = initialAttributes.partyTypes?.[1] || "B";
        const loc = initialAttributes.location || "場所不明";
        setTitle(`${loc}での${partyA}と${partyB}の事故`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const newCriteria: AssessmentCriteria = {
      id: `custom-${Date.now()}`,
      title,
      chapter: 99, // Custom chapter
      chapterTitle: "カスタム認定基準",
      description: summary || title,
      summary,
      baseFaultPercentage: baseFault,
      modificationFactors: [], // Start empty
      sourceBook: "ユーザー作成",
    };
    onSave(newCriteria);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">新規認定基準の作成</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例: 交差点での右折車と直進車の事故"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              基本過失割合 (Aの過失)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={baseFault}
                onChange={(e) => setBaseFault(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-bold w-12 text-right">{baseFault}%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              概要・説明
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="基準の詳細説明..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!title}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            作成して適用
          </button>
        </div>
      </div>
    </div>
  );
}

