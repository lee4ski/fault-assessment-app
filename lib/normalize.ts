/**
 * Japanese text normalization utilities
 * Handles full-width/half-width and hiragana/katakana normalization
 */

/**
 * Convert full-width characters to half-width
 */
function toHalfWidth(str: string): string {
  return str.replace(/[\uFF00-\uFFEF]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0xFF01 && code <= 0xFF5E) {
      // Full-width ASCII
      return String.fromCharCode(code - 0xFEE0);
    } else if (code === 0xFF65) {
      // Full-width middle dot
      return "\u30FB";
    } else if (code === 0xFF66) {
      // Half-width katakana wo
      return "\u30F2";
    } else if (code >= 0xFF67 && code <= 0xFF6F) {
      // Half-width katakana small letters
      return String.fromCharCode(code - 0xFED0);
    } else if (code >= 0xFF70) {
      // Half-width katakana
      return String.fromCharCode(code - 0xFEE0);
    }
    return char;
  });
}

/**
 * Convert half-width characters to full-width
 */
function toFullWidth(str: string): string {
  return str.replace(/[\u0020-\u007E]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code === 0x0020) {
      // Space
      return "\u3000";
    } else if (code >= 0x0021 && code <= 0x007E) {
      // ASCII printable characters
      return String.fromCharCode(code + 0xFEE0);
    }
    return char;
  });
}

/**
 * Convert katakana to hiragana
 */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) - 0x60);
  });
}

/**
 * Convert hiragana to katakana
 */
function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });
}

/**
 * Normalize Japanese text for search
 * - Converts to lowercase
 * - Normalizes full-width/half-width
 * - Normalizes hiragana/katakana (to hiragana for consistency)
 * - Removes extra whitespace
 */
export function normalizeForSearch(text: string): string {
  if (!text) return "";
  
  let normalized = text;
  
  // Convert to lowercase (handles English characters)
  normalized = normalized.toLowerCase();
  
  // Normalize full-width to half-width (for alphanumeric)
  normalized = toHalfWidth(normalized);
  
  // Normalize katakana to hiragana (for Japanese)
  normalized = katakanaToHiragana(normalized);
  
  // Remove extra whitespace
  normalized = normalized.trim().replace(/\s+/g, " ");
  
  return normalized;
}

/**
 * Check if a string starts with the search term (prefix match)
 */
export function isPrefixMatch(text: string, searchTerm: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const normalizedSearch = normalizeForSearch(searchTerm);
  return normalizedText.startsWith(normalizedSearch);
}

/**
 * Check if a string contains the search term (partial match)
 */
export function isPartialMatch(text: string, searchTerm: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const normalizedSearch = normalizeForSearch(searchTerm);
  return normalizedText.includes(normalizedSearch);
}

/**
 * Check if a string ends with the search term (suffix match)
 */
export function isSuffixMatch(text: string, searchTerm: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const normalizedSearch = normalizeForSearch(searchTerm);
  return normalizedText.endsWith(normalizedSearch);
}

