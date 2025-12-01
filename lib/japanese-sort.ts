/**
 * Japanese text sorting utilities
 * Implements 50-sound order (五十音順) sorting for Japanese text
 */

// 五十音順のマッピング（ひらがな・カタカナ対応）
const GOJUON_ORDER: Record<string, number> = {
  // あ行
  "あ": 1, "い": 2, "う": 3, "え": 4, "お": 5,
  "ア": 1, "イ": 2, "ウ": 3, "エ": 4, "オ": 5,
  // か行
  "か": 6, "き": 7, "く": 8, "け": 9, "こ": 10,
  "カ": 6, "キ": 7, "ク": 8, "ケ": 9, "コ": 10,
  "が": 11, "ぎ": 12, "ぐ": 13, "げ": 14, "ご": 15,
  "ガ": 11, "ギ": 12, "グ": 13, "ゲ": 14, "ゴ": 15,
  // さ行
  "さ": 16, "し": 17, "す": 18, "せ": 19, "そ": 20,
  "サ": 16, "シ": 17, "ス": 18, "セ": 19, "ソ": 20,
  "ざ": 21, "じ": 22, "ず": 23, "ぜ": 24, "ぞ": 25,
  "ザ": 21, "ジ": 22, "ズ": 23, "ゼ": 24, "ゾ": 25,
  // た行
  "た": 26, "ち": 27, "つ": 28, "て": 29, "と": 30,
  "タ": 26, "チ": 27, "ツ": 28, "テ": 29, "ト": 30,
  "だ": 31, "ぢ": 32, "づ": 33, "で": 34, "ど": 35,
  "ダ": 31, "ヂ": 32, "ヅ": 33, "デ": 34, "ド": 35,
  // な行
  "な": 36, "に": 37, "ぬ": 38, "ね": 39, "の": 40,
  "ナ": 36, "ニ": 37, "ヌ": 38, "ネ": 39, "ノ": 40,
  // は行
  "は": 41, "ひ": 42, "ふ": 43, "へ": 44, "ほ": 45,
  "ハ": 41, "ヒ": 42, "フ": 43, "ヘ": 44, "ホ": 45,
  "ば": 46, "び": 47, "ぶ": 48, "べ": 49, "ぼ": 50,
  "バ": 46, "ビ": 47, "ブ": 48, "ベ": 49, "ボ": 50,
  "ぱ": 51, "ぴ": 52, "ぷ": 53, "ぺ": 54, "ぽ": 55,
  "パ": 51, "ピ": 52, "プ": 53, "ペ": 54, "ポ": 55,
  // ま行
  "ま": 56, "み": 57, "む": 58, "め": 59, "も": 60,
  "マ": 56, "ミ": 57, "ム": 58, "メ": 59, "モ": 60,
  // や行
  "や": 61, "ゆ": 62, "よ": 63,
  "ヤ": 61, "ユ": 62, "ヨ": 63,
  // ら行
  "ら": 64, "り": 65, "る": 66, "れ": 67, "ろ": 68,
  "ラ": 64, "リ": 65, "ル": 66, "レ": 67, "ロ": 68,
  // わ行
  "わ": 69, "を": 70, "ん": 71,
  "ワ": 69, "ヲ": 70, "ン": 71,
};

/**
 * Get the 50-sound order value for a character
 */
function getGojuonOrder(char: string): number {
  return GOJUON_ORDER[char] || 999; // Unknown characters go to the end
}

/**
 * Compare two Japanese strings in 50-sound order
 */
export function compareJapanese(a: string, b: string): number {
  const aNormalized = a.trim();
  const bNormalized = b.trim();

  // Compare character by character
  const minLength = Math.min(aNormalized.length, bNormalized.length);
  
  for (let i = 0; i < minLength; i++) {
    const aChar = aNormalized[i];
    const bChar = bNormalized[i];
    
    const aOrder = getGojuonOrder(aChar);
    const bOrder = getGojuonOrder(bChar);
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
  }
  
  // If all characters match up to minLength, shorter string comes first
  return aNormalized.length - bNormalized.length;
}

/**
 * Sort array of strings in 50-sound order
 */
export function sortJapanese<T>(items: T[], getText: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareJapanese(getText(a), getText(b)));
}

/**
 * Check if a string contains Japanese characters
 */
export function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

