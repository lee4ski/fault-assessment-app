"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AssessmentCriteria, SearchResult, ChapterHitCount, AccidentAttributes } from "@/types";
import { searchCriteria, calculateChapterHitCounts, searchByAttributes } from "@/lib/calculator";
import AccidentAttributesForm from "./AccidentAttributesForm";
import CreateCriteriaModal from "./CreateCriteriaModal";

interface Step1SearchProps {
  criteria: AssessmentCriteria[];
  onSelect: (criteria: AssessmentCriteria) => void;
  selectedCriteria?: AssessmentCriteria;
  autoFilledAttributes?: AccidentAttributes;
  missingFields?: string[];
  aiRecommendation?: { id: string; confidence: number } | null;
}

// Debounce delay: 150ms to meet P95 ≤ 150ms requirement
const DEBOUNCE_DELAY = 150;

export default function Step1Search({
  criteria,
  onSelect,
  selectedCriteria,
  autoFilledAttributes,
  missingFields = [],
  aiRecommendation,
}: Step1SearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [attributes, setAttributes] = useState<AccidentAttributes>(
    autoFilledAttributes || {}
  );
  const [useStructuredSearch, setUseStructuredSearch] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Auto-fill attributes from AI
  useEffect(() => {
    if (autoFilledAttributes && Object.keys(autoFilledAttributes).length > 0) {
      setAttributes(autoFilledAttributes);
      setUseStructuredSearch(true);
      // Clear text search when switching to structured
      setSearchTerm("");
    }
  }, [autoFilledAttributes]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateCriteria = (newCriteria: AssessmentCriteria) => {
    onSelect(newCriteria);
  };

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
    let results = searchResultsBeforeFacet;

    // Apply chapter facet filter if selected
    if (selectedChapter !== null) {
      results = searchResultsBeforeFacet.filter((result) => result.criteria.chapter === selectedChapter);
    }

    // Sort to put AI recommendation at the top
    if (aiRecommendation) {
      results = [...results].sort((a, b) => {
        if (a.criteria.id === aiRecommendation.id) return -1;
        if (b.criteria.id === aiRecommendation.id) return 1;
        return 0;
      });
    }

    return results;
  }, [searchResultsBeforeFacet, selectedChapter, aiRecommendation]);

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

  const handleAiSearch = async () => {
    console.log("[AI Search] Button clicked. searchTerm:", searchTerm, "length:", searchTerm.length, "isAiSearching:", isAiSearching);
    
    if (!searchTerm.trim() || isAiSearching) {
      console.log("[AI Search] Returning early. searchTerm.trim():", searchTerm.trim(), "isAiSearching:", isAiSearching);
      return;
    }
    
    console.log("[AI Search] Starting AI analysis...");
    setIsAiSearching(true);
    try {
      const response = await fetch("/api/ai-analyze-accident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accidentDescription: searchTerm }),
      });
      
      console.log("[AI Search] API response status:", response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log("[AI Search] API result:", result);
        
        if (result.attributes) {
          setAttributes(result.attributes);
          setUseStructuredSearch(true);
          setSearchTerm(""); // Clear text input as we moved to structured
          console.log("[AI Search] Attributes set, switched to structured search");
        } else {
          console.warn("[AI Search] No attributes in result");
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("AI Search API error:", response.status, errorData);
        
        if (response.status === 400) {
          alert(`入力が短すぎます。事故の詳細を10文字以上で入力してください。\n\n現在の入力: ${searchTerm.length}文字`);
        } else {
          alert(`AI検索に失敗しました: ${errorData.error || response.statusText}`);
        }
      }
    } catch (error) {
      console.error("AI Search failed:", error);
      alert(`AI検索中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAiSearching(false);
      console.log("[AI Search] Finished");
    }
  };

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

  // Helper to extract attributes from a criteria item
  const extractAttributesFromCriteria = (criteria: AssessmentCriteria): AccidentAttributes => {
    // Start with existing attributes or empty
    const extracted: AccidentAttributes = { ...attributes };
    
    // Infer location from title or chapter title
    const locationKeywords = [
      { key: "交差点", value: "交差点" },
      { key: "駐車場", value: "駐車場" },
      { key: "高速道路", value: "高速道路" },
      { key: "一般道路", value: "一般道路" },
      { key: "横断歩道", value: "横断歩道" },
    ];
    
    for (const { key, value } of locationKeywords) {
      if (criteria.title.includes(key) || criteria.chapterTitle.includes(key)) {
        extracted.location = value;
        break;
      }
    }

    // Infer party types
    const parties: string[] = [];
    if (criteria.title.includes("歩行者") || criteria.chapterTitle.includes("歩行者")) {
      parties.push("歩行者");
    }
    if (criteria.title.includes("四輪") || criteria.chapterTitle.includes("四輪") || criteria.title.includes("車")) {
      parties.push("四輪車");
    }
    if (criteria.title.includes("二輪") || criteria.chapterTitle.includes("単車") || criteria.title.includes("バイク")) {
      parties.push("二輪車");
    }
    if (criteria.title.includes("自転車") || criteria.chapterTitle.includes("自転車")) {
      parties.push("自転車");
    }
    
    if (parties.length > 0) {
      extracted.partyTypes = parties;
    }

    // Infer accident type (simplified logic)
    if (parties.includes("歩行者") && parties.includes("四輪車")) {
      extracted.accidentType = "歩行者×四輪";
    } else if (parties.includes("歩行者") && parties.includes("二輪車")) {
      extracted.accidentType = "歩行者×二輪";
    } else if (parties.includes("四輪車") && parties.includes("二輪車")) {
      extracted.accidentType = "四輪×二輪";
    } else if (parties.filter(p => p === "四輪車").length >= 1 && criteria.title.includes("同士")) {
      extracted.accidentType = "四輪×四輪";
    }

    // Infer signal
    if (criteria.title.includes("信号") || criteria.description.includes("信号")) {
        if (criteria.title.includes("信号機のない")) {
            extracted.hasSignal = false;
        } else {
            extracted.hasSignal = true;
        }
    }

    return extracted;
  };

  // Log selection action
  const handleSelect = useCallback(
    (criteria: AssessmentCriteria) => {
      // Update attributes based on selection to sync structured search
      const extracted = extractAttributesFromCriteria(criteria);
      setAttributes(extracted);
      
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

  const renderConfidenceBar = (confidence: number) => {
    let colorClass = "bg-red-500";
    if (confidence >= 80) colorClass = "bg-green-500";
    else if (confidence >= 50) colorClass = "bg-yellow-500";

    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="text-xs font-medium text-gray-600">AI信頼度: {confidence}%</div>
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} transition-all duration-500`} 
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[500px]">
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
              missingFields={missingFields}
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
            <div className="relative flex gap-2">
              <div className="relative flex-1">
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
                    {/* ... existing suggestion UI ... */}
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
              
              <button
                onClick={handleAiSearch}
                disabled={isAiSearching || searchTerm.trim().length < 10}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
                title="文章から条件を自動抽出します（10文字以上必要）"
              >
                {isAiSearching ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                )}
                AI検索
              </button>
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
            (debouncedSearchTerm.trim() || useStructuredSearch) ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">一致する認定基準が見つかりませんでした</p>
                <div className="flex flex-col gap-4 items-center">
                   {!useStructuredSearch && debouncedSearchTerm.length > 2 && (
                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-md w-full">
                        <p className="text-sm text-blue-800 mb-2 font-bold">
                          💡 AIを使って詳細な条件で検索しますか？
                        </p>
                        <p className="text-xs text-blue-600 mb-3">
                          入力された文章から、「場所」「当事者」「信号」などの条件を自動で設定して検索します。
                        </p>
                        <button 
                          onClick={handleAiSearch}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                           AI検索で構造化検索へ移動
                        </button>
                     </div>
                   )}
                  <div className="flex flex-col gap-2 items-center mt-2">
                    <p className="text-sm text-gray-600 mb-2">または次を試してください：</p>
                    <button
                      onClick={() => {
                        handleSearchChange("");
                        setSelectedChapter(null);
                        setUseStructuredSearch(false);
                        setAttributes({});
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      条件をリセット
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      条件を緩和するか、別のキーワードで検索してみてください
                    </p>
                  </div>
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
                          <div className="flex flex-col">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {item.title}
                              {aiRecommendation?.id === item.id && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                  AI推奨
                                </span>
                              )}
                            </h3>
                            {aiRecommendation?.id === item.id && renderConfidenceBar(aiRecommendation.confidence)}
                          </div>
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

