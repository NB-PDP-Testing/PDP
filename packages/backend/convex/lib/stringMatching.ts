/**
 * String matching utilities for fuzzy player name matching.
 * Uses Levenshtein distance for edit-distance-based similarity.
 *
 * US-VN-005: Levenshtein Fuzzy Matching Backend
 */

/**
 * Calculate Levenshtein (edit) distance between two strings.
 * Uses Wagner-Fischer DP algorithm with O(min(m,n)) space optimization.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of single-character edits (insertions, deletions, substitutions)
 */
export function levenshteinDistance(a: string, b: string): number {
  // Short-circuit for identical or empty strings
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  // Ensure shorter is the shorter string for space optimization
  let shorter = a;
  let longer = b;
  if (a.length > b.length) {
    shorter = b;
    longer = a;
  }

  const aLen = shorter.length;
  const bLen = longer.length;

  // Single row DP (O(min(m,n)) space)
  let prevRow = new Array<number>(aLen + 1);
  for (let i = 0; i <= aLen; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    const currRow = new Array<number>(aLen + 1);
    currRow[0] = j;

    for (let i = 1; i <= aLen; i++) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        currRow[i - 1] + 1, // insertion
        prevRow[i] + 1, // deletion
        prevRow[i - 1] + cost // substitution
      );
    }

    prevRow = currRow;
  }

  return prevRow[aLen];
}

/**
 * Calculate similarity between two strings using Levenshtein distance.
 * Returns a score between 0 (completely different) and 1 (identical).
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score 0-1
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

// Regex for diacritics removal after NFD decomposition (pre-compiled)
const NFD_DIACRITICS_REGEX = /[\u0300-\u036f]/g;

// Prefixes to remove for matching (Irish/Scottish names)
const NAME_PREFIX_REGEX = /^(?:o'|o\u2019|mc|mac)/i;

// Apostrophe/hyphen cleanup
const APOSTROPHE_HYPHEN_REGEX = /['\u2019`-]/g;

// Whitespace split regex
const WHITESPACE_REGEX = /\s+/;

/**
 * Normalize a string for fuzzy matching.
 * Lowercase, remove diacritics, remove O'/Mc/Mac prefixes, trim.
 *
 * @param str - Input string
 * @returns Normalized string
 */
export function normalizeForMatching(str: string): string {
  let normalized = str.trim().toLowerCase();

  // Remove diacritics using NFD decomposition
  normalized = normalized.normalize("NFD").replace(NFD_DIACRITICS_REGEX, "");

  // Remove O'/Mc/Mac prefixes
  normalized = normalized.replace(NAME_PREFIX_REGEX, "");

  // Remove remaining apostrophes and hyphens
  normalized = normalized.replace(APOSTROPHE_HYPHEN_REGEX, "");

  return normalized.trim();
}

/**
 * Calculate a comprehensive match score for player name matching.
 * Tries multiple matching strategies and returns the best score.
 *
 * @param searchName - The name to search for (from voice note)
 * @param candidateFirstName - Player's first name
 * @param candidateLastName - Player's last name
 * @returns Best similarity score 0-1
 */
export function calculateMatchScore(
  searchName: string,
  candidateFirstName: string,
  candidateLastName: string
): number {
  const normalizedSearch = normalizeForMatching(searchName);
  const normalizedFirst = normalizeForMatching(candidateFirstName);
  const normalizedLast = normalizeForMatching(candidateLastName);
  const normalizedFull = `${normalizedFirst} ${normalizedLast}`.trim();

  // Try multiple matching strategies, return best score
  const scores: number[] = [];

  // 1. Full name match
  scores.push(levenshteinSimilarity(normalizedSearch, normalizedFull));

  // 2. First name match
  scores.push(levenshteinSimilarity(normalizedSearch, normalizedFirst));

  // 3. Last name match
  scores.push(levenshteinSimilarity(normalizedSearch, normalizedLast));

  // 4. Reversed full name match (e.g. "Murphy John" vs "John Murphy")
  const normalizedFullReversed = `${normalizedLast} ${normalizedFirst}`.trim();
  scores.push(levenshteinSimilarity(normalizedSearch, normalizedFullReversed));

  // 5. If search is multi-word, try matching parts
  const searchParts = normalizedSearch.split(WHITESPACE_REGEX);
  if (searchParts.length > 1) {
    const lastPart = searchParts.at(-1) ?? "";

    // Match first search part to first name, second to last name
    const firstPartScore = levenshteinSimilarity(
      searchParts[0],
      normalizedFirst
    );
    const lastPartScore = levenshteinSimilarity(lastPart, normalizedLast);
    scores.push((firstPartScore + lastPartScore) / 2);

    // Also try reversed: first search part to last name, second to first name
    const revFirstScore = levenshteinSimilarity(searchParts[0], normalizedLast);
    const revLastScore = levenshteinSimilarity(lastPart, normalizedFirst);
    scores.push((revFirstScore + revLastScore) / 2);
  }

  return Math.max(...scores);
}
