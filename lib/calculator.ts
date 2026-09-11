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

    // Check title first (highest priority) — also try the English
    // translation (when one exists) so an English keyword still finds
    // criteria whose canonical text is Japanese.
    if (isPrefixMatch(item.title, searchTerm) || (item.titleEn && isPrefixMatch(item.titleEn, searchTerm))) {
      matchType = "prefix";
      matchField = "title";
      score = 100; // Highest score for prefix match in title
    } else if (isPartialMatch(item.title, searchTerm) || (item.titleEn && isPartialMatch(item.titleEn, searchTerm))) {
      if (!matchType) {
        matchType = "partial";
        matchField = "title";
        score = 50; // Partial match in title
      }
    } else if (isSuffixMatch(item.title, searchTerm) || (item.titleEn && isSuffixMatch(item.titleEn, searchTerm))) {
      if (!matchType) {
        matchType = "suffix";
        matchField = "title";
        score = 30; // Suffix match in title
      }
    }

    // Check description if no title match
    if (!matchType) {
      if (isPrefixMatch(item.description, searchTerm) || (item.descriptionEn && isPrefixMatch(item.descriptionEn, searchTerm))) {
        matchType = "prefix";
        matchField = "description";
        score = 80; // Prefix match in description
      } else if (isPartialMatch(item.description, searchTerm) || (item.descriptionEn && isPartialMatch(item.descriptionEn, searchTerm))) {
        matchType = "partial";
        matchField = "description";
        score = 40; // Partial match in description
      } else if (isSuffixMatch(item.description, searchTerm) || (item.descriptionEn && isSuffixMatch(item.descriptionEn, searchTerm))) {
        matchType = "suffix";
        matchField = "description";
        score = 20; // Suffix match in description
      }
    }

    // Check chapter title if no other match
    if (!matchType) {
      if (isPrefixMatch(item.chapterTitle, searchTerm) || (item.chapterTitleEn && isPrefixMatch(item.chapterTitleEn, searchTerm))) {
        matchType = "prefix";
        matchField = "chapterTitle";
        score = 60; // Prefix match in chapter title
      } else if (isPartialMatch(item.chapterTitle, searchTerm) || (item.chapterTitleEn && isPartialMatch(item.chapterTitleEn, searchTerm))) {
        matchType = "partial";
        matchField = "chapterTitle";
        score = 30; // Partial match in chapter title
      } else if (isSuffixMatch(item.chapterTitle, searchTerm) || (item.chapterTitleEn && isSuffixMatch(item.chapterTitleEn, searchTerm))) {
        matchType = "suffix";
        matchField = "chapterTitle";
        score = 15; // Suffix match in chapter title
      }
    }

    // Advanced Fallback: Particle-based Split Match (Smart Search)
    // If strict match failed, try splitting by common particles and whitespace
    if (!matchType && searchTerm.length > 2) {
      // Split by common particles, conjunctions, and whitespace
      // て、した、する、た are verb endings that connect clauses
      const parts = searchTerm
        .split(/(?:における|での|して|した|する|が|は|の|で|に|を|と|た|て|\s|・)+/)
        .filter(p => p.trim().length > 0); // Keep all non-empty parts including single characters (important for Japanese kanji like 青, 赤)
      
      if (parts.length >= 2) {
        // Count how many parts match (more flexible than requiring ALL)
        const matchingParts = parts.filter(part => hasAnyText(item, [part]));
        const matchRatio = matchingParts.length / parts.length;
        
        // Require at least 60% of parts to match (or at least 3 parts for longer queries)
        const threshold = parts.length >= 4 ? 0.6 : 0.75;
        
        if (matchRatio >= threshold && matchingParts.length >= 2) {
          matchType = "partial";
          matchField = "title"; // Assume relevant if keywords match
          score = Math.round(20 + matchRatio * 10); // Score 20-30 based on match ratio
        }
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

// Helper to check if text contains any of the terms
const hasAnyText = (item: AssessmentCriteria, terms: string[]) => {
  const normalizedTitle = normalizeForSearch(item.title);
  const normalizedDesc = normalizeForSearch(item.description);
  const normalizedChapter = normalizeForSearch(item.chapterTitle);
  // English translations (when present) so an English keyword search still
  // matches criteria that only have their canonical Japanese text indexed.
  const normalizedTitleEn = normalizeForSearch(item.titleEn || "");
  const normalizedDescEn = normalizeForSearch(item.descriptionEn || "");
  const normalizedChapterEn = normalizeForSearch(item.chapterTitleEn || "");

  // Also check modification factors
  const normalizedMods = (item.modificationFactors || [])
    .map(m => normalizeForSearch(m.description))
    .join(" ");
  const normalizedModsEn = (item.modificationFactors || [])
    .map(m => normalizeForSearch(m.descriptionEn || ""))
    .join(" ");

  return terms.some(term => {
    const normalizedTerm = normalizeForSearch(term);
    return normalizedTitle.includes(normalizedTerm) ||
           normalizedDesc.includes(normalizedTerm) ||
           normalizedChapter.includes(normalizedTerm) ||
           normalizedMods.includes(normalizedTerm) ||
           normalizedTitleEn.includes(normalizedTerm) ||
           normalizedDescEn.includes(normalizedTerm) ||
           normalizedChapterEn.includes(normalizedTerm) ||
           normalizedModsEn.includes(normalizedTerm);
  });
};

// Helper to check signal match for a specific party type
const checkSignalMatch = (item: AssessmentCriteria, partyType: string, signalState: string): boolean => {
  // Map signal states to keywords
  const signalKeywords: Record<string, string[]> = {
    "signal_green": ["青", "青信号", "🟢"],
    "signal_yellow": ["黄", "黄信号", "🟡"],
    "signal_red": ["赤", "赤信号", "🔴", "信号無視"],
    "signal_right": ["右折信号", "右折矢印", "右折時"],
    "signal_none": ["信号機のない", "信号のない", "信号なし"],
    "signal_blinking": ["点滅"],
  };

  const keywords = signalKeywords[signalState] || [];
  if (keywords.length === 0) return true;

  // If signal is "None", it applies to the whole situation usually
  if (signalState === "signal_none") {
    return hasAnyText(item, keywords);
  }

  // For other signals, we need to check if the signal is associated with the party
  // Simple logic: Check if the text contains BOTH the party name AND the signal keyword
  // Ideally in the same sentence/block, but for now checking generic co-occurrence in title/desc
  
  // Map party types to keywords
  let partyKeywords: string[] = [];
  if (partyType === "歩行者") partyKeywords = ["歩行者", "人"];
  else if (partyType === "四輪車") partyKeywords = ["四輪", "車", "自動車", "車両", "直進車", "右折車", "左折車"];
  else if (partyType === "二輪車") partyKeywords = ["二輪", "バイク", "単車", "車両"];
  else if (partyType === "自転車") partyKeywords = ["自転車", "車両"];
  else partyKeywords = [partyType]; // Fallback

  // Check if item matches Party keywords AND Signal keywords
  // We use a stricter check: Title often says "歩行者：青" or "車両：赤"
  // So we look for patterns like "Party: Color" or just existence of both if precise pattern fails
  
  // 1. Check for precise patterns (Best for Hanrei Times titles)
  // e.g. "歩行者：青"
  const specificPatterns = [];
  for (const pk of partyKeywords) {
    for (const sk of keywords) {
      specificPatterns.push(`${pk}：${sk}`);
      specificPatterns.push(`${pk}:${sk}`);
      specificPatterns.push(`${pk}は${sk}`);
      specificPatterns.push(`${pk}が${sk}`);
    }
  }
  if (hasAnyText(item, specificPatterns)) return true;

  // 2. Fallback: Check if item mentions Party AND Signal keywords separately
  // This is riskier but needed if title format varies
  // However, we must be careful not to match "Pedestrian Green" when searching for "Car Green" if text says "Pedestrian Green / Car Red"
  // So we trust the "Pattern" matching more.
  
  // RELAXED CHECK: If specific patterns fail, check if BOTH keywords exist in the text.
  // This is necessary because "Vehicle: Red" might not be caught if we search for "Car" (四輪車)
  // and the text only says "Vehicle" (車両), even if we mapped it.
  if (hasAnyText(item, partyKeywords) && hasAnyText(item, keywords)) {
      // To reduce false positives (e.g. matching "Car Red" in a "Car Green" case),
      // we can add a simple safeguard: if we find the OPPOSITE signal for this party, be careful.
      // But for now, let's return TRUE to find the case. The user can filter manually.
      return true;
  }
  
  // Special case: If searching for "Car Red", and title is "[1] Ped Green / Car Red",
  // "Car Red" pattern will match "Car: Red".
  
  // If we return false here, we might miss cases where wording is "Green Light Pedestrian".
  // Let's try one more pattern set: "Color + Party"
  const reversePatterns = [];
  for (const pk of partyKeywords) {
    for (const sk of keywords) {
      reversePatterns.push(`${sk}の${pk}`); // e.g. 赤信号の車
      reversePatterns.push(`${sk}で${pk}`); // e.g. 赤信号で進入
    }
  }
  if (hasAnyText(item, reversePatterns)) return true;
  
  // If User selected "Violation", checking "Signal Ignore" is generic enough
  if (signalState === "signal_red" && hasAnyText(item, ["信号無視"])) {
    // Check if it applies to this party?
    // "Vehicle Signal Violation" -> "車両が信号無視"
    const violationPatterns = partyKeywords.map(pk => `${pk}が信号無視`);
    if (hasAnyText(item, violationPatterns)) return true;
    // Also match generic "Signal Violation" if Party is Car (usually cars violate)
    if ((partyType === "四輪車" || partyType === "二輪車") && hasAnyText(item, ["信号無視"])) return true;
  }

  return false;
};

// Helper to check action match for a specific party type
const checkActionMatch = (item: AssessmentCriteria, partyType: string, actionState: string): boolean => {
  // Map action states to keywords
  const actionKeywords: Record<string, string[]> = {
    "action_straight": ["直進", "進入"], // Added "進入" (Entering) as it implies straight/entry in signal cases
    "action_turning_right": ["右折"],
    "action_turning_left": ["左折"],
    "action_crossing": ["横断"],
    "action_stopping": ["停止", "駐車", "停車"],
    "action_backing": ["後退", "バック", "出庫"],
    "action_u_turn": ["転回", "Uターン"],
    "action_lane_change": ["進路変更", "車線変更"],
  };

  const keywords = actionKeywords[actionState] || [];
  if (keywords.length === 0) return true;

  // Map party types to keywords
  let partyKeywords: string[] = [];
  if (partyType === "歩行者") partyKeywords = ["歩行者", "人"];
  else if (partyType === "四輪車") partyKeywords = ["四輪", "車", "自動車", "車両"];
  else if (partyType === "二輪車") partyKeywords = ["二輪", "バイク", "単車", "車両"];
  else if (partyType === "自転車") partyKeywords = ["自転車", "車両"];
  else partyKeywords = [partyType];

  // Check for specific compound patterns first (e.g. "右折車")
  const compoundPatterns = [];
  for (const sk of keywords) {
    // If searching for "Right Turn" + "Car" -> "右折車"
    if (actionState === "action_turning_right" && ["四輪車", "二輪車", "自転車"].includes(partyType)) {
       compoundPatterns.push(`${sk}車`); 
    }
    // If searching for "Straight" + "Car" -> "直進車"
    if (actionState === "action_straight" && ["四輪車", "二輪車", "自転車"].includes(partyType)) {
       compoundPatterns.push(`${sk}車`); 
    }
  }
  if (hasAnyText(item, compoundPatterns)) return true;

  // Check for patterns like "Party: Action" or "Action Party"
  const patterns = [];
  for (const pk of partyKeywords) {
    for (const sk of keywords) {
      patterns.push(`${pk}${sk}`); // e.g. 歩行者横断
      patterns.push(`${pk}の${sk}`); // e.g. 車の右折
      patterns.push(`${sk}する${pk}`); // e.g. 右折する車
      patterns.push(`${sk}中の${pk}`); // e.g. 横断中の歩行者
      // Contextual match: "Party... Action" (simplified check)
    }
  }
  if (hasAnyText(item, patterns)) return true;

  // Fallback: Check if both exist separately? 
  // Risk: "Right Turn vs Straight" contains both "Right Turn" and "Straight".
  // We must ensure the action applies to the correct party.
  // Titles often follow: "Action Party vs Action Party" -> "右折車と直進車"
  // So "Right Turn" is next to "Car".
  
  // RELAXED CHECK: If specific patterns fail, check if BOTH keywords exist in the text.
  if (hasAnyText(item, partyKeywords) && hasAnyText(item, keywords)) {
      return true;
  }
  
  // If we are searching for "Straight Car", and text is "Right Turn Car vs Straight Car".
  // We found "Straight Car" pattern above.
  
  return false;
};

/**
 * Search criteria by structured accident attributes
 */
export function searchByAttributes(
  criteria: AssessmentCriteria[],
  attributes: AccidentAttributes,
  keyword?: string
): SearchResult[] {
  let results = criteria;

  // Filter by accident type (Smart logic)
  if (attributes.accidentType) {
    results = results.filter((item) => {
      // Map accident types to required combinations of keywords
      // "歩行者×四輪" -> Needs (Pedestrian OR Person) AND (Car OR Automobile)
      if (attributes.accidentType === "歩行者×四輪") {
        return hasAnyText(item, ["歩行者", "人"]) && 
               hasAnyText(item, ["四輪", "車", "自動車"]);
      }
      if (attributes.accidentType === "歩行者×二輪") {
        return hasAnyText(item, ["歩行者", "人"]) && 
               hasAnyText(item, ["二輪", "バイク", "単車"]);
      }
      if (attributes.accidentType === "四輪×二輪") {
        return hasAnyText(item, ["四輪", "車", "自動車"]) && 
               hasAnyText(item, ["二輪", "バイク", "単車"]);
      }
      if (attributes.accidentType === "四輪×四輪") {
        // "Doushi" (each other) or "Tsuitotsu" (rear-end) often implies car-on-car
        return (hasAnyText(item, ["四輪", "車", "自動車"]) && hasAnyText(item, ["同士"])) ||
               hasAnyText(item, ["追突"]); 
      }
      if (attributes.accidentType === "自転車×四輪") {
        return hasAnyText(item, ["自転車"]) && 
               hasAnyText(item, ["四輪", "車", "自動車"]);
      }
      
      // Fallback: check if the type string itself or parts of it exist
      return hasAnyText(item, [attributes.accidentType!]);
    });
  }

  // Filter by location
  if (attributes.location) {
    results = results.filter((item) => hasAnyText(item, [attributes.location!]));
  }

  // Filter by party types (OR logic mostly, but ensures at least one matches)
  if (attributes.partyTypes && attributes.partyTypes.length > 0) {
    results = results.filter((item) => {
      return attributes.partyTypes!.some((partyType) => {
        if (partyType === "四輪車") return hasAnyText(item, ["四輪", "車", "自動車", "直進車", "右折車", "左折車"]);
        if (partyType === "二輪車") return hasAnyText(item, ["二輪", "バイク", "単車"]);
        if (partyType === "歩行者") return hasAnyText(item, ["歩行者", "人"]);
        if (partyType === "自転車") return hasAnyText(item, ["自転車"]);
        return hasAnyText(item, [partyType]);
      });
    });
  }

  // Filter by Action (A & B)
  if (attributes.actionA || attributes.actionB) {
    results = results.filter((item) => {
      if (attributes.actionA && attributes.partyTypes?.[0]) {
         if (!checkActionMatch(item, attributes.partyTypes[0], attributes.actionA)) return false;
      }
      if (attributes.actionB && attributes.partyTypes?.[1]) {
         if (!checkActionMatch(item, attributes.partyTypes[1], attributes.actionB)) return false;
      }
      return true;
    });
  }

  // Filter by signal presence/attribute (A & B)
  if (attributes.signalA || attributes.signalB || attributes.signalAttribute || attributes.hasSignal !== undefined) {
    results = results.filter((item) => {
      // 1. Check detailed Signal A
      if (attributes.signalA && attributes.partyTypes?.[0]) {
         const matchA = checkSignalMatch(item, attributes.partyTypes[0], attributes.signalA);
         if (!matchA) return false;
      }

      // 2. Check detailed Signal B
      if (attributes.signalB && attributes.partyTypes?.[1]) {
         const matchB = checkSignalMatch(item, attributes.partyTypes[1], attributes.signalB);
         if (!matchB) return false;
      }

      // 3. Legacy/Global signal check (if A/B not used)
      if (!attributes.signalA && !attributes.signalB) {
          if (attributes.signalAttribute) {
            switch (attributes.signalAttribute) {
              case "signal_none":
                return hasAnyText(item, ["信号機のない", "信号のない", "信号の規制のない", "信号なし"]);
              case "signal_ped_green":
                return hasAnyText(item, ["歩行者：青", "歩行者:青", "🟢", "青信号で横断"]);
              case "signal_ped_yellow":
                return hasAnyText(item, ["歩行者：黄", "歩行者:黄", "🟡", "黄信号で横断"]);
              case "signal_ped_red":
                return hasAnyText(item, ["歩行者：赤", "歩行者:赤", "🔴", "赤信号で横断"]);
              case "signal_car_red":
                return hasAnyText(item, ["車両：赤", "赤信号で進入", "双方赤", "赤信号無視", "信号無視"]);
              case "signal_right":
                return hasAnyText(item, ["右折信号", "右折矢印", "右折時"]);
              default:
                return true;
            }
          }
          
          if (attributes.hasSignal !== undefined) {
             if (attributes.hasSignal) return hasAnyText(item, ["信号", "青", "赤", "黄"]) || (item.chapter === 1 && !hasAnyText(item, ["信号機のない"]));
             else return hasAnyText(item, ["信号機のない", "信号のない"]);
          }
      }
      
      return true;
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

