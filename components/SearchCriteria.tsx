"use client";

import { useState } from "react";
import { AssessmentCriteria } from "@/types";
import { searchCriteria } from "@/lib/calculator";

interface SearchCriteriaProps {
  criteria: AssessmentCriteria[];
  onSelect: (criteria: AssessmentCriteria) => void;
  selectedCriteria?: AssessmentCriteria;
}

export default function SearchCriteria({
  criteria,
  onSelect,
  selectedCriteria,
}: SearchCriteriaProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<AssessmentCriteria[]>(criteria);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      const searchResults = searchCriteria(criteria, term);
      setResults(searchResults.map((r) => r.criteria));
    } else {
      setResults(criteria);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label
          htmlFor="search"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          認定基準を検索
        </label>
        <input
          type="text"
          id="search"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="事故の種類や状況を入力してください（例: 交差点、歩行者）"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
        />
      </div>

      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        {results.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            検索結果が見つかりませんでした
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {results.map((item) => (
              <li
                key={item.id}
                onClick={() => onSelect(item)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedCriteria?.id === item.id
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.description}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {item.chapterTitle}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        基本過失割合: {item.baseFaultPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

