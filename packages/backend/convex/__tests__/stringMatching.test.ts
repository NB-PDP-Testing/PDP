/**
 * Unit Tests: String Matching Utilities
 *
 * US-VN-005: Levenshtein Fuzzy Matching Backend
 */

import { describe, expect, it } from "vitest";
import {
  calculateMatchScore,
  levenshteinDistance,
  levenshteinSimilarity,
  normalizeForMatching,
} from "../lib/stringMatching";

// ============================================================
// LEVENSHTEIN DISTANCE
// ============================================================

describe("levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("kitten", "kitten")).toBe(0);
  });

  it("should return length for empty vs non-empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("should return 0 for two empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("should handle classic kitten/sitting example", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("should handle single character difference", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("should handle insertion", () => {
    expect(levenshteinDistance("abc", "abcd")).toBe(1);
  });

  it("should handle deletion", () => {
    expect(levenshteinDistance("abcd", "abc")).toBe(1);
  });

  it("should handle completely different strings", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });

  it("should be symmetric", () => {
    expect(levenshteinDistance("abc", "def")).toBe(
      levenshteinDistance("def", "abc")
    );
  });
});

// ============================================================
// LEVENSHTEIN SIMILARITY
// ============================================================

describe("levenshteinSimilarity", () => {
  it("should return 1 for identical strings", () => {
    expect(levenshteinSimilarity("hello", "hello")).toBe(1);
  });

  it("should return 1 for two empty strings", () => {
    expect(levenshteinSimilarity("", "")).toBe(1);
  });

  it("should return 0 for completely different single chars", () => {
    expect(levenshteinSimilarity("a", "b")).toBe(0);
  });

  it("should return ~0.57 for kitten/sitting", () => {
    const sim = levenshteinSimilarity("kitten", "sitting");
    // distance=3, maxLen=7, similarity = 1 - 3/7 ≈ 0.571
    expect(sim).toBeCloseTo(0.571, 2);
  });

  it("should handle Sean/Shawn with reasonable similarity", () => {
    const sim = levenshteinSimilarity("sean", "shawn");
    expect(sim).toBeGreaterThanOrEqual(0.4);
  });

  it("should handle O'Brien/O'Bryan with high similarity", () => {
    const sim = levenshteinSimilarity("obrien", "obryan");
    expect(sim).toBeGreaterThanOrEqual(0.6);
  });
});

// ============================================================
// NORMALIZE FOR MATCHING
// ============================================================

describe("normalizeForMatching", () => {
  it("should lowercase", () => {
    expect(normalizeForMatching("JOHN")).toBe("john");
  });

  it("should trim whitespace", () => {
    expect(normalizeForMatching("  John  ")).toBe("john");
  });

  it("should remove diacritics from Seán", () => {
    const result = normalizeForMatching("Seán");
    expect(result).toBe("sean");
  });

  it("should remove diacritics from Pádraig", () => {
    const result = normalizeForMatching("Pádraig");
    expect(result).toBe("padraig");
  });

  it("should remove O' prefix", () => {
    expect(normalizeForMatching("O'Brien")).toBe("brien");
  });

  it("should remove Mc prefix", () => {
    expect(normalizeForMatching("McDonald")).toBe("donald");
  });

  it("should remove Mac prefix", () => {
    expect(normalizeForMatching("MacLeod")).toBe("leod");
  });

  it("should handle Niamh (no diacritics to remove)", () => {
    expect(normalizeForMatching("Niamh")).toBe("niamh");
  });

  it("should remove hyphens", () => {
    expect(normalizeForMatching("Mary-Jane")).toBe("maryjane");
  });

  it("should handle empty string", () => {
    expect(normalizeForMatching("")).toBe("");
  });
});

// ============================================================
// CALCULATE MATCH SCORE
// ============================================================

describe("calculateMatchScore", () => {
  it("should return 1.0 for exact match", () => {
    expect(calculateMatchScore("John Murphy", "John", "Murphy")).toBe(1);
  });

  it("should return high score for first name only match", () => {
    const score = calculateMatchScore("John", "John", "Murphy");
    expect(score).toBe(1);
  });

  it("should return high score for last name only match", () => {
    const score = calculateMatchScore("Murphy", "John", "Murphy");
    expect(score).toBe(1);
  });

  it("should handle typo in first name", () => {
    // "jhon" vs "john" = distance 2 (swap), maxLen 4 => similarity 0.5
    const score = calculateMatchScore("Jhon", "John", "Murphy");
    expect(score).toBeGreaterThanOrEqual(0.5);
  });

  it("should handle Irish name Seán vs Sean", () => {
    const score = calculateMatchScore("Sean", "Seán", "Murphy");
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it("should handle O'Brien matching", () => {
    const score = calculateMatchScore("O'Brien", "Patrick", "O'Brien");
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it("should handle Niamh vs Neeve with Irish alias boost", () => {
    // With Irish aliases, "Neeve" and "Niamh" both map to "niamh" canonical form
    // calculateMatchScore checks alias equivalence and boosts to 0.9
    const score = calculateMatchScore("Neeve", "Niamh", "O'Sullivan");
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it("should handle Pádraig vs Paddy", () => {
    const score = calculateMatchScore("Paddy", "Pádraig", "Kelly");
    expect(score).toBeGreaterThanOrEqual(0.4);
  });

  it("should return low score for completely unrelated names", () => {
    const score = calculateMatchScore("abc123", "John", "Murphy");
    expect(score).toBeLessThan(0.5);
  });

  it("should handle reversed name order", () => {
    // "Murphy John" matches reversed full name "murphy john" with 1.0
    const score = calculateMatchScore("Murphy John", "John", "Murphy");
    expect(score).toBeGreaterThanOrEqual(0.9);
  });
});

// ============================================================
// IRISH NAME ALIAS MATCHING (Expanded 2026-02-09)
// ============================================================

describe("Irish name aliases", () => {
  describe("Girls' names", () => {
    it("should match Niamh variations", () => {
      expect(
        calculateMatchScore("Neeve", "Niamh", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Neve", "Niamh", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Nieve", "Niamh", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Siobhán variations", () => {
      expect(
        calculateMatchScore("Shivawn", "Siobhan", "Murphy")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Chevonne", "Siobhan", "Murphy")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Aoife variations", () => {
      expect(
        calculateMatchScore("Eefa", "Aoife", "O'Brien")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Caoimhe variations", () => {
      expect(
        calculateMatchScore("Keeva", "Caoimhe", "Ryan")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Queeva", "Caoimhe", "Ryan")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Saoirse variations", () => {
      expect(
        calculateMatchScore("Seersha", "Saoirse", "Walsh")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Sorsha", "Saoirse", "Walsh")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Clodagh variations (CRITICAL FIX)", () => {
      expect(
        calculateMatchScore("Cloda", "Clodagh", "Byrne")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Kloda", "Clodagh", "Byrne")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Chlodagh", "Clodagh", "Byrne")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Róisín variations", () => {
      expect(
        calculateMatchScore("Rosheen", "Roisin", "Doyle")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Gráinne variations", () => {
      expect(
        calculateMatchScore("Granya", "Grainne", "McCarthy")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Áine variations", () => {
      expect(
        calculateMatchScore("Anya", "Aine", "Quinn")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Máire variations", () => {
      expect(
        calculateMatchScore("Maura", "Maire", "Kennedy")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Moira", "Maire", "Kennedy")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Ciara variations", () => {
      expect(
        calculateMatchScore("Kiera", "Ciara", "Daly")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Kiara", "Ciara", "Daly")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Aisling variations", () => {
      expect(
        calculateMatchScore("Ashling", "Aisling", "Brennan")
      ).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("Boys' names", () => {
    it("should match Seán variations (CRITICAL FIX)", () => {
      expect(
        calculateMatchScore("Shawn", "Sean", "Murphy")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Shaun", "Sean", "Murphy")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Eoin/Eoghan variations", () => {
      expect(
        calculateMatchScore("Owen", "Eoin", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Owen", "Eoghan", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Oisín variations", () => {
      expect(
        calculateMatchScore("Osheen", "Oisin", "Ryan")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Usheen", "Oisin", "Ryan")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Ciarán variations", () => {
      expect(
        calculateMatchScore("Kieran", "Ciaran", "O'Neill")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Keiran", "Ciaran", "O'Neill")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Tadhg variations", () => {
      expect(
        calculateMatchScore("Tige", "Tadhg", "Walsh")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Teague", "Tadhg", "Walsh")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Cian variations", () => {
      expect(
        calculateMatchScore("Kian", "Cian", "Byrne")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Conor variations", () => {
      expect(
        calculateMatchScore("Connor", "Conor", "Doyle")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Darragh variations", () => {
      expect(
        calculateMatchScore("Dara", "Darragh", "Lynch")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Ruairí variations", () => {
      expect(
        calculateMatchScore("Rory", "Ruairi", "Carroll")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Fionn variations", () => {
      expect(
        calculateMatchScore("Finn", "Fionn", "Moran")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Pádraig variations", () => {
      expect(
        calculateMatchScore("Patrick", "Padraig", "Hayes")
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        calculateMatchScore("Paddy", "Padraig", "Hayes")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Diarmuid variations", () => {
      expect(
        calculateMatchScore("Dermot", "Diarmuid", "Gallagher")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Niall variations", () => {
      expect(
        calculateMatchScore("Neil", "Niall", "Burke")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match Cathal variations", () => {
      expect(
        calculateMatchScore("Cahal", "Cathal", "Healy")
      ).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("Bidirectional matching", () => {
    it("should match in both directions (database → voice)", () => {
      // Database has "Niamh", voice note says "Neeve"
      expect(
        calculateMatchScore("Neeve", "Niamh", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should match in both directions (voice → database)", () => {
      // Database has "Neeve" (anglicized), voice note says "Niamh" (Irish)
      expect(
        calculateMatchScore("Niamh", "Neeve", "Kelly")
      ).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("Edge cases", () => {
    it("should not match unrelated names", () => {
      expect(calculateMatchScore("John", "Niamh", "Kelly")).toBeLessThan(0.9);
    });

    it("should handle case insensitivity", () => {
      expect(
        calculateMatchScore("SHAWN", "sean", "Murphy")
      ).toBeGreaterThanOrEqual(0.9);
    });

    it("should handle diacritics", () => {
      expect(
        calculateMatchScore("Seán", "Shawn", "Murphy")
      ).toBeGreaterThanOrEqual(0.9);
    });
  });
});

// ============================================================
// PERFORMANCE TEST
// ============================================================

describe("performance", () => {
  it("should calculate 1000 similarities in under 100ms", () => {
    const names = Array.from({ length: 1000 }, (_, i) => `Player${i}`);
    const searchName = "Player500";

    const start = performance.now();
    for (const name of names) {
      levenshteinSimilarity(searchName, name);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
