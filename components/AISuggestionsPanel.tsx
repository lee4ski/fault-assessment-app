"use client";

import { useState, useEffect } from "react";
import { Lightbulb, X, ArrowRight } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

interface AISuggestionsPanelProps {
  suggestions: string[];
  isVisible: boolean;
  onClose: () => void;
}

export default function AISuggestionsPanel({
  suggestions,
  isVisible,
  onClose,
}: AISuggestionsPanelProps) {
  const { t } = useLocale();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start max-w-sm">
      {isExpanded ? (
        <div className="bg-white rounded-lg shadow-xl border border-blue-100 overflow-hidden animate-slide-up">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              <span className="font-semibold text-sm">{t("aiSuggestionsPanel.heading")}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsExpanded(false)}
                className="hover:bg-white/20 rounded p-1 transition-colors"
              >
                <span className="text-xs">{t("aiSuggestionsPanel.minimizeLabel")}</span>
              </button>
              <button 
                onClick={onClose}
                className="hover:bg-white/20 rounded p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4 bg-blue-50/50">
            <ul className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex gap-2 text-sm text-gray-700">
                  <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105 flex items-center gap-2"
        >
          <Lightbulb className="w-5 h-5" />
          <span className="font-bold text-xs bg-red-500 rounded-full px-1.5 py-0.5 absolute -top-1 -right-1">
            {suggestions.length}
          </span>
        </button>
      )}
    </div>
  );
}




