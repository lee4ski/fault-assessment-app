"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AssessmentCriteria, SearchResult, ChapterHitCount, AccidentAttributes } from "@/types";
import { searchCriteria, calculateChapterHitCounts, searchByAttributes } from "@/lib/calculator";
import AccidentAttributesForm from "./AccidentAttributesForm";

interface Step1SearchProps {
  criteria: AssessmentCriteria[];
  onSelect: (criteria: AssessmentCriteria) => void;
  selectedCriteria?: AssessmentCriteria;
}

// Debounce delay: 150ms to meet P95 ≤ 150ms requirement
const DEBOUNCE_DELAY = 150;

export default function Step1Search({
  criteria,
  onSelect,
  selectedCriteria,
}: Step1SearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [attributes, setAttributes] = useState<AccidentAttributes>({});
  const [useStructuredSearch, setUseStructuredSearch] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoized search results before facet filtering (for hit count badges)
  const searchResultsBeforeFacet = useMemo(() => {
    if (useStructuredSearch) {
      return searchByAttributes(criteria, attributes, debouncedSearchTerm || undefined);
    }
    if (!debouncedSearchTerm.trim()) {
      // Show all criteria when no search term
      return criteria.map((item) => ({
        criteria: item,
        relevanceScore: 0,
        matchType: "partial" as const,
        matchField: "title" as const,
      }));
    }
    return searchCriteria(criteria, debouncedSearchTerm);
  }, [criteria, debouncedSearchTerm, attributes, useStructuredSearch]);

  // Memoized chapter hit counts (based on search results before facet filtering)
  const chapterHitCounts = useMemo(() => {
    return calculateChapterHitCounts(searchResultsBeforeFacet);
  }, [searchResultsBeforeFacet]);

  // Memoized search results for performance (after facet filtering)
  const searchResults = useMemo(() => {
    // Apply chapter facet filter if selected
    if (selectedChapter !== null) {
      return searchResultsBeforeFacet.filter((result) => result.criteria.chapter === selectedChapter);
    }

    return searchResultsBeforeFacet;
  }, [searchResultsBeforeFacet, selectedChapter]);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setUseStructuredSearch(false);

    // Generate AI keyword suggestions
    if (term.trim().length > 1) {
      const suggestions = generateAISuggestions(term);
      setAiSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setAiSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleAttributesSearch = useCallback((attrs: AccidentAttributes, keyword?: string) => {
    setAttributes(attrs);
    setSearchTerm(keyword || "");
    setUseStructuredSearch(true);
    setShowSuggestions(false);
  }, []);

  // AI keyword suggestion generator
  const generateAISuggestions = (input: string): string[] => {
    const lowerInput = input.toLowerCase();
    const suggestionMap: Record<string, string[]> = {
      "交差": ["交差点", "交差点付近", "交差点進入", "信号機のある交差点"],
      "歩行": ["歩行者", "横断歩道", "歩行者横断中", "歩行者優先"],
      "駐車": ["駐車場", "駐車中", "駐車場内事故", "路上駐車"],
      "高速": ["高速道路", "高速道路追突", "高速道路合流", "高速道路車線変更"],
      "追突": ["追突事故", "後方追突", "停車中追突", "渋滞中追突"],
      "右折": ["右折車", "右折時", "右折待ち", "対向右折"],
      "左折": ["左折車", "左折時", "左折巻き込み"],
      "車線": ["車線変更", "車線変更時", "進路変更"],
      "バイク": ["バイク", "二輪車", "オートバイ", "原付"],
      "自転車": ["自転車", "自転車横断", "自転車通行"],
    };

    const suggestions: string[] = [];
    for (const [key, values] of Object.entries(suggestionMap)) {
      if (lowerInput.includes(key) || key.includes(lowerInput)) {
        suggestions.push(...values.filter(v => !v.toLowerCase().includes(lowerInput)));
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  };

  // Log search action
  useEffect(() => {
    if (searchResults.length > 0 && (debouncedSearchTerm.trim() || useStructuredSearch)) {
      const logSearch = async () => {
        try {
          await fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "search",
              inputConditions: useStructuredSearch
                ? attributes
                : debouncedSearchTerm,
              searchResults: searchResults.slice(0, 10),
            }),
          });
        } catch (error) {
          console.error("Failed to log search:", error);
        }
      };
      logSearch();
    }
  }, [searchResults, debouncedSearchTerm, useStructuredSearch, attributes]);

  // Log selection action
  const handleSelect = useCallback(
    (criteria: AssessmentCriteria) => {
      onSelect(criteria);
      const logSelection = async () => {
        try {
          await fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "select",
              selectedCriteria: criteria,
            }),
          });
        } catch (error) {
          console.error("Failed to log selection:", error);
        }
      };
      logSelection();
    },
    [onSelect]
  );



  return (
    <div className="h-[calc(100vh-300px)]">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2">ステップ1: 認定基準の検索</h2>
          <p className="text-gray-600">
            事故の種類や状況を入力して、適切な認定基準を検索してください。
          </p>
        </div>

        {/* Tabs for search mode */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => {
              setUseStructuredSearch(false);
              setAttributes({});
            }}
            className={`px-4 py-2 font-medium transition-colors ${!useStructuredSearch
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            キーワード検索
          </button>
          <button
            type="button"
            onClick={() => setUseStructuredSearch(true)}
            className={`px-4 py-2 font-medium transition-colors ${useStructuredSearch
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            構造化検索
          </button>
        </div>

        {useStructuredSearch ? (
          <div className="mb-4">
            <AccidentAttributesForm
              onSearch={handleAttributesSearch}
              initialAttributes={attributes}
            />
          </div>
        ) : (
          <div className="mb-4">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              認定基準を検索
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="例: 交差点、歩行者、駐車場など（日本語/英数字対応）"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* AI Keyword Suggestions */}
              {showSuggestions && aiSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded-lg shadow-lg">
                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-700">AI キーワード提案</span>
                  </div>
                  <div className="py-1">
                    {aiSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchTerm(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a 1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chapter hit count badges with facet filtering */}
        {(chapterHitCounts.length > 0 || debouncedSearchTerm.trim()) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">章で絞り込み:</span>
              <button
                type="button"
                onClick={() => setSelectedChapter(null)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${selectedChapter === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                すべて
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {chapterHitCounts.map((hit) => (
                <button
                  key={hit.chapter}
                  type="button"
                  onClick={() => setSelectedChapter(hit.chapter)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedChapter === hit.chapter
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    }`}
                >
                  {hit.chapterTitle}: {hit.count}件
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
          {searchResults.length === 0 ? (
            debouncedSearchTerm.trim() ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">検索結果が見つかりませんでした</p>
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-sm text-gray-600 mb-2">次を試してください：</p>
                  <button
                    onClick={() => {
                      handleSearchChange("");
                      setSelectedChapter(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    フィルタを解除
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    別のキーワードで検索してみてください
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">検索キーワードを入力してください</p>
              </div>
            )
          ) : (
            <ul className="divide-y divide-gray-200">
              {searchResults.slice(0, 10).map((result) => {
                const item = result.criteria;
                return (
                  <li
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedCriteria?.id === item.id
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : ""
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{item.title}</h3>
                          {/* Origin/Source information - prominently displayed */}
                          {(item.sourceBook || item.pageNumber) && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-gray-500 font-medium">
                                出典
                              </div>
                              <div className="text-xs text-gray-700 font-semibold">
                                {item.sourceBook && (
                                  <span>{item.sourceBook}</span>
                                )}
                                {item.sourceEdition && (
                                  <span> {item.sourceEdition}</span>
                                )}
                                {item.pageNumber && (
                                  <span className="ml-1">p.{item.pageNumber}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {item.summary ? (
                          <p className="text-sm text-gray-600 mt-1">{item.summary}</p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                      {debouncedSearchTerm.trim() && (
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${result.matchType === "prefix"
                            ? "bg-green-100 text-green-800"
                            : result.matchType === "partial"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                          title={`${result.matchType === "prefix" ? "前方一致" : result.matchType === "partial" ? "部分一致" : "後方一致"} (${result.matchField === "title" ? "タイトル" : result.matchField === "description" ? "説明" : "章"})`}
                        >
                          {result.matchType === "prefix"
                            ? "前方"
                            : result.matchType === "partial"
                              ? "部分"
                              : "後方"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {item.chapterTitle}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        基本過失割合: {item.baseFaultPercentage}%
                      </span>
                      {/* Additional source info badge if not shown in header */}
                      {item.sourceBook && item.pageNumber && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {item.sourceBook}
                          {item.sourceEdition && ` ${item.sourceEdition}`}
                          {item.pageNumber && ` p.${item.pageNumber}`}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

