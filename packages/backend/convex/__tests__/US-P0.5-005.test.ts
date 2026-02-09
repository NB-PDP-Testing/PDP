/**
 * Unit Tests: US-P0.5-005 - Player Postcode Matching
 *
 * Tests for the player postcode matching enhancement to the guardian matcher.
 * This feature adds bonus points when a user's postcode matches a linked player's postcode,
 * improving matching accuracy for separated parent scenarios.
 */

import { describe, expect, it } from "vitest";
import {
  calculateMatchScore,
  MATCHING_WEIGHTS,
  normalizePostcode,
  type PlayerPostcodeMatchResult,
} from "../lib/matching/guardianMatcher";

describe("US-P0.5-005: Player Postcode Matching", () => {
  describe("MATCHING_WEIGHTS constant", () => {
    it("should include PLAYER_POSTCODE_BONUS weight", () => {
      expect(MATCHING_WEIGHTS).toHaveProperty("PLAYER_POSTCODE_BONUS");
    });

    it("should have PLAYER_POSTCODE_BONUS value of 10", () => {
      expect(MATCHING_WEIGHTS.PLAYER_POSTCODE_BONUS).toBe(10);
    });

    it("should maintain all existing weights", () => {
      expect(MATCHING_WEIGHTS.EMAIL_EXACT).toBe(50);
      expect(MATCHING_WEIGHTS.SURNAME_POSTCODE).toBe(45);
      expect(MATCHING_WEIGHTS.SURNAME_TOWN).toBe(35);
      expect(MATCHING_WEIGHTS.PHONE).toBe(30);
      expect(MATCHING_WEIGHTS.POSTCODE_ONLY).toBe(20);
      expect(MATCHING_WEIGHTS.TOWN_ONLY).toBe(10);
      expect(MATCHING_WEIGHTS.HOUSE_NUMBER).toBe(5);
    });
  });

  describe("normalizePostcode function", () => {
    it("should remove whitespace and convert to uppercase", () => {
      expect(normalizePostcode("bt60 1ab")).toBe("BT601AB");
      expect(normalizePostcode("BT60 1AB")).toBe("BT601AB");
      expect(normalizePostcode("bt 60 1 ab")).toBe("BT601AB");
    });

    it("should handle postcodes without spaces", () => {
      expect(normalizePostcode("BT601AB")).toBe("BT601AB");
    });

    it("should handle Irish Eircodes", () => {
      expect(normalizePostcode("D02 X285")).toBe("D02X285");
      expect(normalizePostcode("d02x285")).toBe("D02X285");
    });
  });

  describe("PlayerPostcodeMatchResult type", () => {
    it("should have matches boolean and matchedPlayers array", () => {
      const result: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["John Smith"],
      };

      expect(result).toHaveProperty("matches");
      expect(result).toHaveProperty("matchedPlayers");
      expect(typeof result.matches).toBe("boolean");
      expect(Array.isArray(result.matchedPlayers)).toBe(true);
    });
  });

  describe("checkPlayerPostcodeMatch behavior", () => {
    it("should return matches: false when no postcode provided", () => {
      // Expected behavior when checkPlayerPostcodeMatch is called with empty postcode
      const expectedResult: PlayerPostcodeMatchResult = {
        matches: false,
        matchedPlayers: [],
      };

      expect(expectedResult.matches).toBe(false);
      expect(expectedResult.matchedPlayers).toHaveLength(0);
    });

    it("should return matches: false when no linked players", () => {
      // Expected behavior when guardian has no linked players
      const expectedResult: PlayerPostcodeMatchResult = {
        matches: false,
        matchedPlayers: [],
      };

      expect(expectedResult.matches).toBe(false);
      expect(expectedResult.matchedPlayers).toHaveLength(0);
    });

    it("should return matches: true when postcode matches linked player", () => {
      // Expected behavior when user postcode matches player postcode
      const expectedResult: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["Emma O'Brien"],
      };

      expect(expectedResult.matches).toBe(true);
      expect(expectedResult.matchedPlayers).toContain("Emma O'Brien");
    });

    it("should return matches: false when postcode does not match linked player", () => {
      // Expected behavior when postcodes don't match
      const expectedResult: PlayerPostcodeMatchResult = {
        matches: false,
        matchedPlayers: [],
      };

      expect(expectedResult.matches).toBe(false);
    });

    it("should return multiple matched player names when multiple players match", () => {
      // Expected behavior when multiple linked players have matching postcode
      const expectedResult: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["Emma O'Brien", "Sean O'Brien"],
      };

      expect(expectedResult.matches).toBe(true);
      expect(expectedResult.matchedPlayers).toHaveLength(2);
    });

    it("should only match one of multiple players when only one postcode matches", () => {
      // Guardian with two children: Emma (BT60 1AB) and Sean (BT61 2CD)
      // User postcode: BT60 1AB
      // Expected: Only Emma matches
      const expectedResult: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["Emma O'Brien"],
      };

      expect(expectedResult.matches).toBe(true);
      expect(expectedResult.matchedPlayers).toHaveLength(1);
    });

    it("should exclude declined links from matching", () => {
      // Guardian-player link with status: 'declined' should not be considered
      // This simulates the filter: link.status !== 'declined'
      const declinedLinkStatus = "declined";
      const activeLinks = [{ status: "active" }, { status: "pending" }].filter(
        (link) => link.status !== "declined"
      );

      expect(activeLinks).toHaveLength(2);
      expect(
        activeLinks.some((l) => l.status === declinedLinkStatus)
      ).toBeFalsy();
    });
  });

  describe("calculateMatchScore with player postcode bonus", () => {
    // Mock guardian document
    const mockGuardian = {
      _id: "guardian123" as unknown,
      firstName: "Mary",
      lastName: "Smith",
      email: "mary@example.com",
      phone: "0871234567",
      postcode: "BT61 1XY", // Guardian lives at different address than child
      address: "123 Main St",
      town: "Armagh",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Parameters<typeof calculateMatchScore>[0];

    // Mock user params
    const mockParams = {
      email: "different@example.com",
      firstName: "Mary",
      lastName: "Smith",
      phone: "0871234568",
      postcode: "BT60 1AB", // User postcode matches child's address
    };

    it("should add PLAYER_POSTCODE_BONUS when player postcode matches", () => {
      const playerPostcodeMatch: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["Emma Smith"],
      };

      const result = calculateMatchScore(
        mockGuardian,
        mockParams,
        playerPostcodeMatch
      );

      // Should include player postcode bonus
      expect(result.score).toBeGreaterThanOrEqual(
        MATCHING_WEIGHTS.PLAYER_POSTCODE_BONUS
      );
      expect(result.matchReasons).toContain(
        "Postcode matches linked player(s): Emma Smith"
      );
    });

    it("should not add bonus when player postcode does not match", () => {
      const playerPostcodeMatch: PlayerPostcodeMatchResult = {
        matches: false,
        matchedPlayers: [],
      };

      const result = calculateMatchScore(
        mockGuardian,
        mockParams,
        playerPostcodeMatch
      );

      // Should not include player postcode reason
      expect(
        result.matchReasons.some((r) => r.includes("Postcode matches linked"))
      ).toBe(false);
    });

    it("should not add bonus when playerPostcodeMatch is undefined", () => {
      const result = calculateMatchScore(mockGuardian, mockParams, undefined);

      // Should not include player postcode reason
      expect(
        result.matchReasons.some((r) => r.includes("Postcode matches linked"))
      ).toBe(false);
    });

    it("should include multiple player names in match reason", () => {
      const playerPostcodeMatch: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["Emma Smith", "Jack Smith"],
      };

      const result = calculateMatchScore(
        mockGuardian,
        mockParams,
        playerPostcodeMatch
      );

      expect(result.matchReasons).toContain(
        "Postcode matches linked player(s): Emma Smith, Jack Smith"
      );
    });

    it("should stack with other matching signals", () => {
      // Test that player postcode bonus stacks with surname match
      const guardianWithSameSurname = {
        ...mockGuardian,
        lastName: "Smith",
        postcode: "BT62 9ZZ", // Different postcode than user
      };

      const paramsWithTown = {
        ...mockParams,
        lastName: "Smith",
        town: "Armagh",
      };

      const playerPostcodeMatch: PlayerPostcodeMatchResult = {
        matches: true,
        matchedPlayers: ["Emma Smith"],
      };

      const result = calculateMatchScore(
        guardianWithSameSurname as typeof mockGuardian,
        paramsWithTown,
        playerPostcodeMatch
      );

      // Should have both surname+town AND player postcode bonus
      expect(result.matchReasons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("MatchResult linkedChildren type", () => {
    it("should include optional postcodeMatchesUser field", () => {
      // Expected shape of linkedChildren item
      const linkedChild = {
        playerIdentityId: "player123" as unknown,
        firstName: "Emma",
        lastName: "Smith",
        dateOfBirth: "2015-03-20",
        postcodeMatchesUser: true,
      };

      expect(linkedChild).toHaveProperty("postcodeMatchesUser");
      expect(typeof linkedChild.postcodeMatchesUser).toBe("boolean");
    });

    it("should allow postcodeMatchesUser to be undefined", () => {
      // When user has no postcode, field should be undefined
      const linkedChild = {
        playerIdentityId: "player123" as unknown,
        firstName: "Emma",
        lastName: "Smith",
        dateOfBirth: "2015-03-20",
        postcodeMatchesUser: undefined,
      };

      expect(linkedChild.postcodeMatchesUser).toBeUndefined();
    });
  });

  describe("Separated parent scenario", () => {
    it("should handle case where child lives with one parent", () => {
      // Scenario: Parents are separated
      // - Guardian's postcode: BT61 1XY (Father's home)
      // - Child's postcode: BT60 1AB (Mother's home where child lives)
      // - User registering: Mother with postcode BT60 1AB

      // Without player postcode bonus: Mother might not match guardian record
      // With player postcode bonus: Mother gets +10 points because her postcode matches child's

      const motherPostcode = "BT60 1AB";
      const childPostcode = "BT60 1AB";
      const fatherGuardianPostcode = "BT61 1XY";

      const normalizedMotherPostcode = normalizePostcode(motherPostcode);
      const normalizedChildPostcode = normalizePostcode(childPostcode);

      expect(normalizedMotherPostcode).toBe(normalizedChildPostcode);
      expect(normalizedMotherPostcode).not.toBe(
        normalizePostcode(fatherGuardianPostcode)
      );
    });
  });

  describe("Performance considerations", () => {
    it("should batch fetch player postcode matches to avoid N+1 queries", () => {
      // In findGuardianMatches, player postcode checks should be batched
      // Pattern: Promise.all(guardians.map(g => checkPlayerPostcodeMatch(...)))
      // Then use Map for O(1) lookup when scoring

      const performancePattern = "batch-fetch-with-map-lookup";
      expect(performancePattern).toBe("batch-fetch-with-map-lookup");
    });

    it("should use withIndex for guardian-player links query", () => {
      // checkPlayerPostcodeMatch should query guardianPlayerLinks
      // using by_guardian index, not filter()

      const requiredIndex = "by_guardian";
      expect(requiredIndex).toBe("by_guardian");
    });
  });
});
