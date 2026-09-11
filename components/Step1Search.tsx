"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AssessmentCriteria, SearchResult, ChapterHitCount, AccidentAttributes } from "@/types";
import { searchCriteria, calculateChapterHitCounts, searchByAttributes } from "@/lib/calculator";
import AccidentAttributesForm from "./AccidentAttributesForm";
import { useLocale } from "@/components/LocaleProvider";
import { localize } from "@/lib/i18n-simple";

export interface Step1SearchState {
  searchTerm: string;
  attributes: AccidentAttributes;
  useStructuredSearch: boolean;
  displayedResults: SearchResult[];
  hasSearched: boolean;
  aiCandidates: Array<{ id: string; title: string; probability: number }>;
}

interface Step1SearchProps {
  criteria: AssessmentCriteria[];
  onSelect: (criteria: AssessmentCriteria) => void;
  selectedCriteria?: AssessmentCriteria;
  autoFilledAttributes?: AccidentAttributes;
  missingFields?: string[];
  aiRecommendation?: { id: string; confidence: number } | null;
  preservedState?: Step1SearchState | null;
  onStateChange?: (state: Step1SearchState) => void;
}

export default function Step1Search({
  criteria,
  onSelect,
  selectedCriteria,
  autoFilledAttributes,
  missingFields = [],
  aiRecommendation,
  preservedState,
  onStateChange,
}: Step1SearchProps) {
  const router = useRouter();
  const { t, locale } = useLocale();

  // Use preserved state if available, otherwise initialize with defaults
  const [searchTerm, setSearchTerm] = useState(preservedState?.searchTerm || "");
  const [attributes, setAttributes] = useState<AccidentAttributes>(
    preservedState?.attributes || autoFilledAttributes || {}
  );
  const [useStructuredSearch, setUseStructuredSearch] = useState(preservedState?.useStructuredSearch || false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [displayedResults, setDisplayedResults] = useState<SearchResult[]>(preservedState?.displayedResults || []);
  const [hasSearched, setHasSearched] = useState(preservedState?.hasSearched || false);
  const [aiCandidates, setAiCandidates] = useState<Array<{
    id: string;
    title: string;
    probability: number;
  }>>(preservedState?.aiCandidates || []);

  // Notify parent component of state changes for preservation
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        searchTerm,
        attributes,
        useStructuredSearch,
        displayedResults,
        hasSearched,
        aiCandidates,
      });
    }
  }, [searchTerm, attributes, useStructuredSearch, displayedResults, hasSearched, aiCandidates, onStateChange]);

  // Auto-fill attributes from AI
  useEffect(() => {
    if (autoFilledAttributes && Object.keys(autoFilledAttributes).length > 0) {
      setAttributes(autoFilledAttributes);
      setUseStructuredSearch(true);
      setSearchTerm("");
      // Note: We don't auto-search here unless we want to. 
      // But usually auto-fill implies "here are the settings, please check and search".
      // If we want auto-search on AI fill, we can call handleAttributesSearch here.
      
      // Let's trigger search automatically if AI provided attributes, for better UX
      const results = searchByAttributes(criteria, autoFilledAttributes);
      setDisplayedResults(results);
      setHasSearched(true);
    }
  }, [autoFilledAttributes, criteria]);

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  // Calculate hit counts based on CURRENT displayed results (ignoring chapter filter for the count itself?)
  // Actually hit counts usually show distribution of *potential* results or *current* results.
  // Let's base it on displayedResults.
  const chapterHitCounts = useMemo(() => {
    return calculateChapterHitCounts(displayedResults);
  }, [displayedResults]);

  // Filter displayed results by chapter
  const filteredResults = useMemo(() => {
    let results = displayedResults;

    if (selectedChapter !== null) {
      results = results.filter((result) => result.criteria.chapter === selectedChapter);
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
  }, [displayedResults, selectedChapter, aiRecommendation]);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setUseStructuredSearch(false);
    // Do NOT update results here (manual search)
  }, []);

  const handleKeywordSearchClick = () => {
    if (!searchTerm.trim()) {
      setDisplayedResults(criteria.map((item) => ({
        criteria: item,
        relevanceScore: 0,
        matchType: "partial" as const,
        matchField: "title" as const,
      })));
    } else {
      const results = searchCriteria(criteria, searchTerm);
      setDisplayedResults(results);
    }
    setHasSearched(true);
    setSelectedChapter(null);
  };

  // This is called by AccidentAttributesForm on submit
  const handleAttributesSearch = useCallback((attrs: AccidentAttributes) => {
    setAttributes(attrs);
    setUseStructuredSearch(true);
    
    const results = searchByAttributes(criteria, attrs, searchTerm);
    setDisplayedResults(results);
    setHasSearched(true);
    setSelectedChapter(null);
  }, [criteria, searchTerm]);

  const handleAiSearch = async () => {
    console.log("[AI Search] Starting...");
    if (!searchTerm.trim() || isAiSearching) return;
    
    setIsAiSearching(true);
    setAiCandidates([]); // Clear previous candidates
    try {
      const response = await fetch("/api/ai-analyze-accident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accidentDescription: searchTerm, locale }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        console.log("[AI Search] Response:", result);
        
        // Store candidates with probabilities
        if (result.candidates && result.candidates.length > 0) {
          setAiCandidates(result.candidates);
        }
        
        if (result.attributes) {
          // Set attributes for structured search, but stay on keyword search tab
          setAttributes(result.attributes);
          // Don't switch to structured search tab - stay on keyword search
          // setUseStructuredSearch(true); // Removed - stay on keyword search tab
          
          // Trigger search with new attributes, but also show AI candidates
          const searchRes = searchByAttributes(criteria, result.attributes);
          
          // If structured search returns results, enhance them with AI probability scores
          if (searchRes.length > 0) {
            const enhancedResults = searchRes.map(sr => {
              const aiCandidate = result.candidates?.find((c: any) => c.id === sr.criteria.id);
              return {
                ...sr,
                aiProbability: aiCandidate?.probability,
              };
            });
            
            setDisplayedResults(enhancedResults);
            setHasSearched(true);
          } else if (result.candidates && result.candidates.length > 0) {
            // If structured search returns no results but we have AI candidates, show candidates instead
            const candidateResults: SearchResult[] = result.candidates.map((cand: any) => {
              const crit = criteria.find(c => c.id === cand.id);
              if (!crit) return null;
              return {
                criteria: crit,
                relevanceScore: cand.probability / 100, // Convert to 0-1 scale
                matchType: "partial" as const,
                matchField: "title" as const,
                aiProbability: cand.probability,
              };
            }).filter((r: SearchResult | null): r is SearchResult => r !== null);
            
            setDisplayedResults(candidateResults);
            setHasSearched(true);
          } else {
            // No results from either method
            setDisplayedResults([]);
            setHasSearched(true);
            alert(t("step1Search.alerts.aiNoResults"));
          }
        } else if (result.candidates && result.candidates.length > 0) {
          // If no attributes but we have candidates, show them directly
          const candidateResults: SearchResult[] = result.candidates.map((cand: any) => {
            const crit = criteria.find(c => c.id === cand.id);
            if (!crit) return null;
            return {
              criteria: crit,
              relevanceScore: cand.probability / 100, // Convert to 0-1 scale
                          matchType: "partial" as const,
              matchField: "title" as const,
              aiProbability: cand.probability,
            };
          }).filter((r: SearchResult | null): r is SearchResult => r !== null);
          
          setDisplayedResults(candidateResults);
          setHasSearched(true);
        } else {
          // No results found - show message
          console.warn("[AI Search] No candidates or attributes returned");
          setDisplayedResults([]);
          setHasSearched(true);
          alert(t("step1Search.alerts.aiNoResults"));
        }
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[AI Search] Error:", response.status, errorData);
        alert(t("step1Search.alerts.aiSearchFailed", { error: errorData.error || t("step1Search.alerts.genericError") }));
      }
    } catch (error) {
      console.error(error);
      alert(t("step1Search.alerts.genericError"));
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleSelect = useCallback(
    (criteria: AssessmentCriteria) => {
      // Logic to infer attributes from selection...
      // (simplified for brevity, using existing logic if possible, or just selecting)
      onSelect(criteria);
      
      // Log selection
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          selectedCriteria: criteria,
        }),
      }).catch(console.error);
    },
    [onSelect]
  );

  const renderConfidenceBar = (confidence: number) => {
    let colorClass = "bg-red-500";
    if (confidence >= 80) colorClass = "bg-green-500";
    else if (confidence >= 50) colorClass = "bg-yellow-500";

    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="text-xs font-medium text-gray-600">{t("step1Search.result.aiConfidence", { confidence })}</div>
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
          <h2 className="text-2xl font-bold mb-2">{t("step1Search.heading")}</h2>
          <p className="text-gray-600">
            {t("step1Search.description")}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => {
              // When switching to keyword search, don't clear attributes
              // They should be preserved for when user switches back to structured search
              setUseStructuredSearch(false);
              // Don't clear attributes - preserve them for structured search
              // setAttributes({}); // Removed - preserve attributes
            }}
            className={`px-4 py-2 font-medium transition-colors ${!useStructuredSearch
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {t("step1Search.tabs.keyword")}
          </button>
          <button
            type="button"
            onClick={() => {
              // When switching to structured search, inherit the attributes that were set
              // (e.g., from AI search in keyword search)
              setUseStructuredSearch(true);
            }}
            className={`px-4 py-2 font-medium transition-colors ${useStructuredSearch
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {t("step1Search.tabs.structured")}
          </button>
        </div>

        {useStructuredSearch ? (
          <div className="mb-4">
            <AccidentAttributesForm
              onSearch={handleAttributesSearch}
              initialAttributes={attributes}
              missingFields={missingFields}
              onAiSearch={async (attrs: AccidentAttributes) => {
                // Handle AI search from structured form using the structured attributes
                setIsAiSearching(true);
                setAiCandidates([]);
                
                // Build a natural language description from structured attributes for AI
                const descriptionParts: string[] = [];
                
                if (attrs.location) {
                  descriptionParts.push(`${attrs.location}で`);
                }
                
                if (attrs.partyTypes && attrs.partyTypes.length >= 1) {
                  const signalLabels: Record<string, string> = {
                    "signal_green": "青信号",
                    "signal_yellow": "黄信号",
                    "signal_red": "赤信号",
                    "signal_right": "右折信号",
                    "signal_none": "信号なし",
                    "signal_blinking": "点滅信号",
                  };
                  
                  const actionLabels: Record<string, string> = {
                    "action_straight": "直進",
                    "action_turning_right": "右折",
                    "action_turning_left": "左折",
                    "action_crossing": "横断",
                    "action_stopping": "停止",
                    "action_backing": "後退",
                    "action_u_turn": "転回",
                    "action_lane_change": "進路変更",
                  };
                  
                  const partyA = attrs.partyTypes[0];
                  const signalA = attrs.signalA ? signalLabels[attrs.signalA] || attrs.signalA : '';
                  const actionA = attrs.actionA ? actionLabels[attrs.actionA] || attrs.actionA : '';
                  
                  let partyADesc = partyA;
                  if (signalA) partyADesc += `が${signalA}`;
                  if (actionA) partyADesc += `で${actionA}`;
                  
                  descriptionParts.push(partyADesc);
                  
                  if (attrs.partyTypes.length >= 2) {
                    const partyB = attrs.partyTypes[1];
                    const signalB = attrs.signalB ? signalLabels[attrs.signalB] || attrs.signalB : '';
                    const actionB = attrs.actionB ? actionLabels[attrs.actionB] || attrs.actionB : '';
                    
                    let partyBDesc = partyB;
                    if (signalB) partyBDesc += `が${signalB}`;
                    if (actionB) partyBDesc += `で${actionB}`;
                    
                    descriptionParts.push(partyBDesc);
                  }
                }
                
                const description = descriptionParts.length > 0 
                  ? descriptionParts.join('、') + 'の事故'
                  : '交通事故';
                
                try {
                  const response = await fetch("/api/ai-analyze-accident", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accidentDescription: description, locale }),
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    
                    // Store candidates with probabilities
                    if (result.candidates && result.candidates.length > 0) {
                      setAiCandidates(result.candidates);
                    }
                    
                    // Use the structured attributes we already have, not the ones from AI
                    // (since user has already set them)
                    const searchRes = searchByAttributes(criteria, attrs);
                    
                    // Enhance search results with AI probability scores
                    const enhancedResults = searchRes.map(sr => {
                      const aiCandidate = result.candidates?.find((c: any) => c.id === sr.criteria.id);
                      return {
                        ...sr,
                        aiProbability: aiCandidate?.probability,
                      };
                    });
                    
                    // If we have candidates from AI that aren't in the structured search results,
                    // add them too
                    if (result.candidates) {
                      result.candidates.forEach((cand: any) => {
                        const exists = enhancedResults.some(r => r.criteria.id === cand.id);
                        if (!exists) {
                          const crit = criteria.find(c => c.id === cand.id);
                          if (crit) {
                            enhancedResults.push({
                              criteria: crit,
                              relevanceScore: cand.probability / 100,
                              matchType: "partial" as const,
                              matchField: "title" as const,
                              aiProbability: cand.probability,
                            });
                          }
                        }
                      });
                    }
                    
                    // Sort by AI probability if available, then by relevance score
                    enhancedResults.sort((a, b) => {
                      if (a.aiProbability !== undefined && b.aiProbability !== undefined) {
                        return b.aiProbability - a.aiProbability;
                      }
                      if (a.aiProbability !== undefined) return -1;
                      if (b.aiProbability !== undefined) return 1;
                      return b.relevanceScore - a.relevanceScore;
                    });
                    
                    setDisplayedResults(enhancedResults);
                    setHasSearched(true);
                  } else {
                    alert(t("step1Search.alerts.aiSearchFailedGeneric"));
                  }
                } catch (error) {
                  console.error(error);
                  alert(t("step1Search.alerts.genericError"));
                } finally {
                  setIsAiSearching(false);
                }
              }}
            />
          </div>
        ) : (
          <div className="mb-4">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("step1Search.keywordSearch.label")}
            </label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t("step1Search.keywordSearch.placeholder")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  // Removed onKeyDown - search now only triggers on button click
                />
              </div>

              <button
                onClick={handleKeywordSearchClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {t("step1Search.keywordSearch.searchButton")}
              </button>

              <button
                onClick={handleAiSearch}
                disabled={isAiSearching || searchTerm.trim().length < 10}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
                title={t("step1Search.keywordSearch.aiButtonTitle")}
              >
                {isAiSearching ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                )}
                {t("step1Search.keywordSearch.aiButton")}
              </button>

              <button
                onClick={() => router.push('/search-comparison')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                title={t("step1Search.keywordSearch.compareButtonTitle")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                {t("step1Search.keywordSearch.compareButton")}
              </button>
            </div>
          </div>
        )}

        {/* Chapter hit count badges */}
        {(chapterHitCounts.length > 0) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">{t("step1Search.chapterFilter.label")}</span>
              <button
                type="button"
                onClick={() => setSelectedChapter(null)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${selectedChapter === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {t("step1Search.chapterFilter.all")}
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
                  {t("step1Search.chapterFilter.hitCount", { chapterTitle: hit.chapterTitle, count: hit.count })}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
          {!hasSearched && !useStructuredSearch ? (
             <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">{t("step1Search.emptyState.promptSearch")}</p>
             </div>
          ) : filteredResults.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">{t("step1Search.emptyState.noResults")}</p>
                <div className="flex flex-col gap-4 items-center">
                   {!useStructuredSearch && searchTerm.length > 2 && (
                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-md w-full">
                        <p className="text-sm text-blue-800 mb-2 font-bold">
                          {t("step1Search.emptyState.aiSuggestTitle")}
                        </p>
                        <p className="text-xs text-blue-600 mb-3">
                          {t("step1Search.emptyState.aiSuggestDescription")}
                        </p>
                        <button
                          onClick={handleAiSearch}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                           {t("step1Search.emptyState.aiSuggestButton")}
                        </button>
                     </div>
                   )}
                  <div className="flex flex-col gap-2 items-center mt-2">
                    <p className="text-sm text-gray-600 mb-2">{t("step1Search.emptyState.tryInstead")}</p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedChapter(null);
                        setUseStructuredSearch(false);
                        setAttributes({});
                        setDisplayedResults([]);
                        setHasSearched(false);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      {t("step1Search.emptyState.resetButton")}
                    </button>
                  </div>
                </div>
              </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredResults.slice(0, 10).map((result) => {
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
                              {localize(locale, item.title, item.titleEn)}
                              {aiRecommendation?.id === item.id && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                  {t("step1Search.result.aiRecommended")}
                                </span>
                              )}
                              {result.aiProbability !== undefined && (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                  result.aiProbability >= 80
                                    ? "bg-green-100 text-green-700 border-green-300"
                                    : result.aiProbability >= 50
                                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                    : "bg-orange-100 text-orange-700 border-orange-300"
                                }`}>
                                  {t("step1Search.result.aiMatchScore", { probability: result.aiProbability })}
                                </span>
                              )}
                            </h3>
                            {aiRecommendation?.id === item.id && renderConfidenceBar(aiRecommendation.confidence)}
                            {result.aiProbability !== undefined && (
                              <div className="mt-1">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-medium text-gray-600">{t("step1Search.result.vectorSimilarity")}</div>
                                  <div className="flex-1 max-w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        result.aiProbability >= 80 
                                          ? "bg-green-500" 
                                          : result.aiProbability >= 50
                                          ? "bg-yellow-500"
                                          : "bg-orange-500"
                                      }`}
                                      style={{ width: `${result.aiProbability}%` }}
                                    />
                                  </div>
                                  <div className="text-xs font-semibold text-gray-700">{result.aiProbability}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                          {(item.sourceBook || item.pageNumber) && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-gray-500 font-medium">
                                {t("step1Search.result.source")}
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
                          <p className="text-sm text-gray-600 mt-1">{localize(locale, item.description, item.descriptionEn)}</p>
                        )}
                      </div>
                      {searchTerm.trim() && (
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${result.matchType === "prefix"
                            ? "bg-green-100 text-green-800"
                            : result.matchType === "partial"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                          title={t("step1Search.result.matchTypeTitle", {
                            matchType: t(`step1Search.result.matchType.${result.matchType}`),
                            matchField: t(`step1Search.result.matchField.${result.matchField === "title" ? "title" : result.matchField === "description" ? "description" : "chapter"}`),
                          })}
                        >
                          {t(`step1Search.result.matchTypeShort.${result.matchType}`)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {localize(locale, item.chapterTitle, item.chapterTitleEn)}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {t("step1Search.result.baseFaultPercentage", { percentage: item.baseFaultPercentage })}
                      </span>
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
