import { AssessmentCriteria, AccidentReport, AppliedModification, SearchResult, ChapterHitCount, AccidentAttributes } from "@/types";
import { isPrefixMatch, isPartialMatch, isSuffixMatch, normalizeForSearch } from "./normalize";
import { sortJapanese, containsJapanese } from "./japanese-sort";

/**
 * Calculate final fault percentage based on base percentage and modifications
 */
export function calculateFaultPercentage(
  basePercentage: number,
  modifications: AppliedModification[]
): number {
  let finalPercentage = basePercentage;

  for (const mod of modifications) {
    finalPercentage += mod.adjustment;
  }

  // Ensure percentage stays within 0-100 range
  return Math.max(0, Math.min(100, finalPercentage));
}

/**
 * Search assessment criteria by keyword with proper ordering:
 * prefix match → partial match → suffix match
 */
export function searchCriteria(
  criteria: AssessmentCriteria[],
  searchTerm: string
): SearchResult[] {
  if (!searchTerm.trim()) {
    return criteria.map((item) => ({
      criteria: item,
      relevanceScore: 0,
      matchType: "partial" as const,
      matchField: "title" as const,
    }));
  }

  const results: SearchResult[] = [];

  for (const item of criteria) {
    let matchType: "prefix" | "partial" | "suffix" | null = null;
    let matchField: "title" | "description" | "chapterTitle" = "title";
    let score = 0;

    // Check title first (highest priority)
    if (isPrefixMatch(item.title, searchTerm)) {
      matchType = "prefix";
      matchField = "title";
      score = 100; // Highest score for prefix match in title
    } else if (isPartialMatch(item.title, searchTerm)) {
      if (!matchType) {
        matchType = "partial";
        matchField = "title";
        score = 50; // Partial match in title
      }
    } else if (isSuffixMatch(item.title, searchTerm)) {
      if (!matchType) {
        matchType = "suffix";
        matchField = "title";
        score = 30; // Suffix match in title
      }
    }

    // Check description if no title match
    if (!matchType) {
      if (isPrefixMatch(item.description, searchTerm)) {
        matchType = "prefix";
        matchField = "description";
        score = 80; // Prefix match in description
      } else if (isPartialMatch(item.description, searchTerm)) {
        matchType = "partial";
        matchField = "description";
        score = 40; // Partial match in description
      } else if (isSuffixMatch(item.description, searchTerm)) {
        matchType = "suffix";
        matchField = "description";
        score = 20; // Suffix match in description
      }
    }

    // Check chapter title if no other match
    if (!matchType) {
      if (isPrefixMatch(item.chapterTitle, searchTerm)) {
        matchType = "prefix";
        matchField = "chapterTitle";
        score = 60; // Prefix match in chapter title
      } else if (isPartialMatch(item.chapterTitle, searchTerm)) {
        matchType = "partial";
        matchField = "chapterTitle";
        score = 30; // Partial match in chapter title
      } else if (isSuffixMatch(item.chapterTitle, searchTerm)) {
        matchType = "suffix";
        matchField = "chapterTitle";
        score = 15; // Suffix match in chapter title
      }
    }

    if (matchType) {
      results.push({
        criteria: item,
        relevanceScore: score,
        matchType,
        matchField,
      });
    }
  }

  // Sort by: match type priority (prefix > partial > suffix), then by score
  const typePriority = { prefix: 3, partial: 2, suffix: 1 };
  results.sort((a, b) => {
    const typeDiff = typePriority[b.matchType] - typePriority[a.matchType];
    if (typeDiff !== 0) return typeDiff;
    return b.relevanceScore - a.relevanceScore;
  });

  // Apply 50-sound order sorting for Japanese text
  // If the search term contains Japanese, sort results by 50-sound order
  if (containsJapanese(searchTerm)) {
    return sortJapanese(results, (r) => r.criteria.title);
  }

  return results;
}

/**
 * Calculate hit counts per chapter/section
 */
export function calculateChapterHitCounts(results: SearchResult[]): ChapterHitCount[] {
  const chapterMap = new Map<number, { chapterTitle: string; count: number }>();

  for (const result of results) {
    const chapter = result.criteria.chapter;
    const existing = chapterMap.get(chapter);
    
    if (existing) {
      existing.count++;
    } else {
      chapterMap.set(chapter, {
        chapterTitle: result.criteria.chapterTitle,
        count: 1,
      });
    }
  }

  // Convert to array and sort by chapter number
  return Array.from(chapterMap.entries())
    .map(([chapter, data]) => ({
      chapter,
      chapterTitle: data.chapterTitle,
      count: data.count,
    }))
    .sort((a, b) => a.chapter - b.chapter);
}

/**
 * Search criteria by structured accident attributes
 */
export function searchByAttributes(
  criteria: AssessmentCriteria[],
  attributes: AccidentAttributes,
  keyword?: string
): SearchResult[] {
  let results = criteria;

  // Filter by accident type
  if (attributes.accidentType) {
    const normalizedType = normalizeForSearch(attributes.accidentType);
    results = results.filter((item) => {
      const normalizedTitle = normalizeForSearch(item.title);
      const normalizedDesc = normalizeForSearch(item.description);
      return (
        normalizedTitle.includes(normalizedType) ||
        normalizedDesc.includes(normalizedType)
      );
    });
  }

  // Filter by location
  if (attributes.location) {
    const normalizedLocation = normalizeForSearch(attributes.location);
    results = results.filter((item) => {
      const normalizedTitle = normalizeForSearch(item.title);
      const normalizedDesc = normalizeForSearch(item.description);
      const normalizedChapter = normalizeForSearch(item.chapterTitle);
      return (
        normalizedTitle.includes(normalizedLocation) ||
        normalizedDesc.includes(normalizedLocation) ||
        normalizedChapter.includes(normalizedLocation)
      );
    });
  }

  // Filter by party types
  if (attributes.partyTypes && attributes.partyTypes.length > 0) {
    results = results.filter((item) => {
      const normalizedTitle = normalizeForSearch(item.title);
      const normalizedDesc = normalizeForSearch(item.description);
      return attributes.partyTypes!.some((partyType) => {
        const normalizedParty = normalizeForSearch(partyType);
        return (
          normalizedTitle.includes(normalizedParty) ||
          normalizedDesc.includes(normalizedParty)
        );
      });
    });
  }

  // Filter by signal presence
  if (attributes.hasSignal !== undefined) {
    const signalKeyword = attributes.hasSignal ? "信号" : "信号なし";
    const normalizedSignal = normalizeForSearch(signalKeyword);
    results = results.filter((item) => {
      const normalizedTitle = normalizeForSearch(item.title);
      const normalizedDesc = normalizeForSearch(item.description);
      return (
        normalizedTitle.includes(normalizedSignal) ||
        normalizedDesc.includes(normalizedSignal)
      );
    });
  }

  // Apply keyword search if provided
  if (keyword && keyword.trim()) {
    const keywordResults = searchCriteria(results, keyword);
    return keywordResults;
  }

  // Return all matching results with default scores
  return results.map((item) => ({
    criteria: item,
    relevanceScore: 0,
    matchType: "partial" as const,
    matchField: "title" as const,
  }));
}

