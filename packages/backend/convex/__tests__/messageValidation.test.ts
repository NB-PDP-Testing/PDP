/**
 * Unit Tests: Message Quality Validation
 *
 * US-VN-001: Text Message Quality Gate
 * US-VN-002: Transcript Quality Validation
 */

import { describe, expect, it } from "vitest";
import {
  validateTextMessage,
  validateTranscriptQuality,
} from "../lib/messageValidation";

// ============================================================
// US-VN-001: TEXT MESSAGE VALIDATION
// ============================================================

describe("validateTextMessage", () => {
  it("should reject empty message", () => {
    const result = validateTextMessage("");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("empty");
    expect(result.suggestion).toContain("content");
  });

  it("should reject whitespace-only message", () => {
    const result = validateTextMessage("   \t\n  ");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("empty");
  });

  it("should reject very short message (< 10 chars)", () => {
    const result = validateTextMessage("hi");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
    expect(result.suggestion).toContain("more detail");
  });

  it("should reject message with too few words (< 3 words)", () => {
    const result = validateTextMessage("hello world");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
    expect(result.suggestion).toContain("3 words");
  });

  it("should reject gibberish with very long words", () => {
    const result = validateTextMessage(
      "asdfjklqwertyuiopzxcvbnm mnbvcxzlkjhgfdsapoiuytrewq qazwsxedcrfvtgbyhnujmik"
    );
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("gibberish");
    expect(result.suggestion).toContain("understand");
  });

  it("should reject gibberish with very short words", () => {
    const result = validateTextMessage("a b c d e f g h i");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("gibberish");
  });

  it("should reject spam with repeated characters", () => {
    const result = validateTextMessage("aaaaaaa test message here");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("spam");
    expect(result.suggestion).toContain("test message");
  });

  it("should reject spam with other repeated chars", () => {
    // "zzzzzzz" has 7 consecutive 'z' chars, triggering the /(.)\\1{5,}/ regex
    const result = validateTextMessage("zzzzzzz testing this message");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("spam");
  });

  it("should accept alternating characters (not repeated)", () => {
    // "hahahahahahaha" alternates h/a - not same char repeated
    const result = validateTextMessage("hahahahahahaha this is fun");
    expect(result.isValid).toBe(true);
  });

  it("should accept valid message about player performance", () => {
    const result = validateTextMessage("John did well in training today");
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.suggestion).toBeUndefined();
  });

  it("should accept message with numbers", () => {
    const result = validateTextMessage("Player #10 scored 3 goals");
    expect(result.isValid).toBe(true);
  });

  it("should accept message with Irish names", () => {
    const result = validateTextMessage(
      "Seán and Niamh practiced passing drills"
    );
    expect(result.isValid).toBe(true);
  });

  it("should accept message at exactly 10 chars with 3 words", () => {
    const result = validateTextMessage("She did it");
    expect(result.isValid).toBe(true);
  });

  it("should reject message at 9 chars", () => {
    const result = validateTextMessage("She did i");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
  });
});

// ============================================================
// US-VN-002: TRANSCRIPT QUALITY VALIDATION
// ============================================================

describe("validateTranscriptQuality", () => {
  it("should reject empty transcript", () => {
    const result = validateTranscriptQuality("");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("empty_transcript");
    expect(result.suggestedAction).toBe("reject");
    expect(result.confidence).toBe(0);
  });

  it("should reject short audio with short transcript", () => {
    const result = validateTranscriptQuality("Um... hi", 2);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
    expect(result.suggestedAction).toBe("reject");
  });

  it("should not reject short audio with long transcript", () => {
    const result = validateTranscriptQuality(
      "John did very well in the training session today and his passing improved",
      2
    );
    expect(result.isValid).toBe(true);
  });

  it("should reject mostly inaudible transcript (>50% markers)", () => {
    // 5 markers out of 7 words = ~71% uncertainty ratio (> 0.5 threshold)
    const transcript =
      "[inaudible] [music] [noise] [inaudible] [music] maybe word";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("mostly_inaudible");
    expect(result.suggestedAction).toBe("reject");
  });

  it("should ask confirmation for partially inaudible (>20% markers)", () => {
    // 2 markers out of 7 words = ~29% uncertainty ratio (> 0.2, < 0.5 threshold)
    // Avoids sports keywords to prevent sports context boost
    const transcript =
      "The man did [inaudible] and then [noise] happened later";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeLessThanOrEqual(0.5);
    expect(result.suggestedAction).toBe("ask_user");
  });

  it("should reject transcript with too few words", () => {
    const result = validateTranscriptQuality("Hi there friend");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_few_words");
    expect(result.suggestedAction).toBe("reject");
  });

  it("should accept sports context with high confidence", () => {
    const transcript =
      "John did well in training today, his passing has improved significantly";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.suggestedAction).toBe("process");
  });

  it("should accept non-sports context with lower confidence", () => {
    const transcript =
      "The weather was nice and everyone showed up on time today";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.suggestedAction).toBe("ask_user");
  });

  it("should detect various sports keywords", () => {
    const sportTerms = ["player", "match", "drill", "hurling", "rugby"];
    for (const term of sportTerms) {
      const result = validateTranscriptQuality(
        `We had a great session today with the ${term} and everything went well`
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.suggestedAction).toBe("process");
    }
  });

  it("should handle whitespace-only transcript as empty", () => {
    const result = validateTranscriptQuality("   \n\t  ");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("empty_transcript");
  });

  it("should handle case-insensitive uncertainty markers", () => {
    // 5 markers out of 7 words = ~71% (> 0.5 threshold)
    const transcript =
      "[INAUDIBLE] [Music] [NOISE] [INAUDIBLE] [Music] some word";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("mostly_inaudible");
  });
});
