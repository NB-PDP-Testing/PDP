/**
 * Unit Tests: Player Name Matching via Fuzzy Search
 *
 * US-VN-006: Find Similar Players Query
 *
 * Tests the player matching logic used by findSimilarPlayers.
 * Since the Convex query requires a database context, we test the
 * matching/scoring/filtering/sorting logic directly using calculateMatchScore.
 */

import { describe, expect, it } from "vitest";
import { calculateMatchScore } from "../lib/stringMatching";

// Simulated player roster for testing
interface TestPlayer {
  firstName: string;
  lastName: string;
}

const ROSTER: TestPlayer[] = [
  { firstName: "Sean", lastName: "Murphy" },
  { firstName: "Niamh", lastName: "O'Sullivan" },
  { firstName: "Patrick", lastName: "O'Brien" },
  { firstName: "Cian", lastName: "McCarthy" },
  { firstName: "Aoife", lastName: "Kelly" },
  { firstName: "John", lastName: "Smith" },
  { firstName: "Mary", lastName: "Walsh" },
  { firstName: "Padraig", lastName: "Flynn" },
];

const SIMILARITY_THRESHOLD = 0.5;

/**
 * Simulate the findSimilarPlayers logic locally.
 */
function findMatches(
  searchName: string,
  roster: TestPlayer[] = ROSTER,
  threshold: number = SIMILARITY_THRESHOLD,
  limit = 5
) {
  const scored = roster
    .map((player) => ({
      ...player,
      fullName: `${player.firstName} ${player.lastName}`,
      similarity: calculateMatchScore(
        searchName,
        player.firstName,
        player.lastName
      ),
    }))
    .filter((p) => p.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  return scored;
}

// ============================================================
// EXACT NAME MATCHES
// ============================================================

describe("findSimilarPlayers - exact matches", () => {
  it("should find exact first name match", () => {
    const results = findMatches("Sean");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].firstName).toBe("Sean");
    expect(results[0].similarity).toBe(1);
  });

  it("should find exact last name match", () => {
    const results = findMatches("Murphy");
    expect(results.length).toBeGreaterThanOrEqual(1);
    const murphyMatch = results.find((r) => r.lastName === "Murphy");
    expect(murphyMatch).toBeDefined();
    expect(murphyMatch?.similarity).toBe(1);
  });

  it("should find exact full name match", () => {
    const results = findMatches("Sean Murphy");
    expect(results[0].firstName).toBe("Sean");
    expect(results[0].lastName).toBe("Murphy");
    expect(results[0].similarity).toBe(1);
  });
});

// ============================================================
// FUZZY NAME MATCHES (IRISH NAMES)
// ============================================================

describe("findSimilarPlayers - fuzzy Irish name matches", () => {
  it("should find Sean when searching Shawn", () => {
    const results = findMatches("Shawn");
    const seanMatch = results.find((r) => r.firstName === "Sean");
    expect(seanMatch).toBeDefined();
    expect(seanMatch?.similarity).toBeGreaterThanOrEqual(0.5);
  });

  it("should find O'Brien when searching O'Brian", () => {
    const results = findMatches("O'Brian");
    const obrienMatch = results.find((r) => r.lastName === "O'Brien");
    expect(obrienMatch).toBeDefined();
    expect(obrienMatch?.similarity).toBeGreaterThanOrEqual(0.5);
  });

  it("should find Padraig when searching Paddy with lower threshold", () => {
    // Paddy is a nickname for Padraig - Levenshtein gives ~0.43
    // Nickname resolution requires a lower threshold than typo correction
    const results = findMatches("Paddy", ROSTER, 0.4);
    const padraigMatch = results.find((r) => r.firstName === "Padraig");
    expect(padraigMatch).toBeDefined();
    expect(padraigMatch?.similarity).toBeGreaterThanOrEqual(0.4);
  });
});

// ============================================================
// NO MATCH / GIBBERISH
// ============================================================

describe("findSimilarPlayers - no matches", () => {
  it("should return empty for gibberish", () => {
    const results = findMatches("abc123xyz");
    expect(results.length).toBe(0);
  });

  it("should return empty for completely unrelated name", () => {
    const results = findMatches("Bartholomew Thunderstrike");
    expect(results.length).toBe(0);
  });
});

// ============================================================
// SORTING AND LIMITING
// ============================================================

describe("findSimilarPlayers - sorting and limiting", () => {
  it("should sort by similarity descending", () => {
    const results = findMatches("Sean");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(
        results[i].similarity
      );
    }
  });

  it("should respect limit parameter", () => {
    const results = findMatches("a", ROSTER, 0.1, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("should use default limit of 5", () => {
    // With threshold 0 all players match
    const results = findMatches("a", ROSTER, 0);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================
// THRESHOLD BEHAVIOR
// ============================================================

describe("findSimilarPlayers - threshold", () => {
  it("should filter out below-threshold results", () => {
    const results = findMatches("Sean", ROSTER, 0.9);
    for (const result of results) {
      expect(result.similarity).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("should include more results with lower threshold", () => {
    const highThreshold = findMatches("Sean", ROSTER, 0.8);
    const lowThreshold = findMatches("Sean", ROSTER, 0.3);
    expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
  });
});

// ============================================================
// REVERSED NAME ORDER
// ============================================================

describe("findSimilarPlayers - reversed names", () => {
  it("should find player when name is reversed", () => {
    const results = findMatches("Murphy Sean");
    expect(results[0].firstName).toBe("Sean");
    expect(results[0].lastName).toBe("Murphy");
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.9);
  });
});
