/**
 * Unit Tests: WhatsApp Feedback Messages
 *
 * US-VN-004: Enhanced WhatsApp Feedback Messages
 */

import { describe, expect, it } from "vitest";
import {
  determineFeedbackCategory,
  generateConfirmationResponse,
  generateFeedbackMessage,
  generateInvalidResponsePrompt,
  parseConfirmationResponse,
} from "../lib/feedbackMessages";

// ============================================================
// DETERMINE FEEDBACK CATEGORY
// ============================================================

describe("determineFeedbackCategory", () => {
  it("should return transcription_failed when transcription fails", () => {
    const category = determineFeedbackCategory(
      { transcriptionStatus: "failed" },
      0
    );
    expect(category).toBe("transcription_failed");
  });

  it("should return transcript_quality_rejected for reject action", () => {
    const category = determineFeedbackCategory(
      {
        transcriptValidation: {
          suggestedAction: "reject",
          reason: "too_short",
        },
      },
      0
    );
    expect(category).toBe("transcript_quality_rejected");
  });

  it("should return needs_confirmation for ask_user action", () => {
    const category = determineFeedbackCategory(
      {
        transcriptValidation: {
          suggestedAction: "ask_user",
          reason: "partial_audio_quality",
        },
      },
      0
    );
    expect(category).toBe("needs_confirmation");
  });

  it("should return insights_failed when insights fail", () => {
    const category = determineFeedbackCategory({ insightsStatus: "failed" }, 0);
    expect(category).toBe("insights_failed");
  });

  it("should return still_processing when retrying", () => {
    const category = determineFeedbackCategory({}, 1);
    expect(category).toBe("still_processing");
  });

  it("should return null when no issue detected", () => {
    const category = determineFeedbackCategory({}, 0);
    expect(category).toBeNull();
  });

  it("should prioritize transcription failure over other checks", () => {
    const category = determineFeedbackCategory(
      {
        transcriptionStatus: "failed",
        insightsStatus: "failed",
        transcriptValidation: { suggestedAction: "reject" },
      },
      1
    );
    expect(category).toBe("transcription_failed");
  });
});

// ============================================================
// GENERATE FEEDBACK MESSAGE
// ============================================================

describe("generateFeedbackMessage", () => {
  it("should generate transcription failed message", () => {
    const message = generateFeedbackMessage("transcription_failed", {});
    expect(message).toContain("couldn't transcribe");
    expect(message).toContain("quiet space");
  });

  it("should generate rejection message with specific reason", () => {
    const message = generateFeedbackMessage("transcript_quality_rejected", {
      transcriptValidation: { reason: "empty_transcript" },
    });
    expect(message).toContain("no speech detected");
  });

  it("should generate rejection message with transcript snippet", () => {
    const message = generateFeedbackMessage("transcript_quality_rejected", {
      transcriptValidation: { reason: "too_short" },
      transcript: "Hello world this is a short transcript",
    });
    expect(message).toContain("too short");
    expect(message).toContain("Hello world");
  });

  it("should generate rejection message with fallback for unknown reason", () => {
    const message = generateFeedbackMessage("transcript_quality_rejected", {
      transcriptValidation: { reason: "unknown_new_reason" },
    });
    expect(message).toContain("audio quality was too poor");
  });

  it("should truncate long transcripts in rejection message", () => {
    const longTranscript = "A".repeat(200);
    const message = generateFeedbackMessage("transcript_quality_rejected", {
      transcriptValidation: { reason: "mostly_inaudible" },
      transcript: longTranscript,
    });
    expect(message).toContain("...");
    expect(message).not.toContain("A".repeat(200));
  });

  it("should generate needs_confirmation message with transcript", () => {
    const message = generateFeedbackMessage("needs_confirmation", {
      transcript: "John did well in training today",
    });
    expect(message).toContain("not confident");
    expect(message).toContain("John did well");
    expect(message).toContain("CONFIRM");
    expect(message).toContain("RETRY");
    expect(message).toContain("CANCEL");
  });

  it("should generate insights failed message with transcript", () => {
    const message = generateFeedbackMessage("insights_failed", {
      transcript: "The weather was nice today",
    });
    expect(message).toContain("couldn't extract insights");
    expect(message).toContain("weather was nice");
    expect(message).toContain("saved in the app");
  });

  it("should generate still_processing message", () => {
    const message = generateFeedbackMessage("still_processing", {});
    expect(message).toContain("taking longer");
    expect(message).toContain("Check the app");
  });
});

// ============================================================
// PARSE CONFIRMATION RESPONSE
// ============================================================

describe("parseConfirmationResponse", () => {
  it("should parse CONFIRM", () => {
    expect(parseConfirmationResponse("CONFIRM")).toBe("confirm");
    expect(parseConfirmationResponse("confirm")).toBe("confirm");
    expect(parseConfirmationResponse("  Confirm  ")).toBe("confirm");
  });

  it("should parse yes/y as confirm", () => {
    expect(parseConfirmationResponse("yes")).toBe("confirm");
    expect(parseConfirmationResponse("y")).toBe("confirm");
  });

  it("should parse RETRY", () => {
    expect(parseConfirmationResponse("RETRY")).toBe("retry");
    expect(parseConfirmationResponse("retry")).toBe("retry");
    expect(parseConfirmationResponse("redo")).toBe("retry");
  });

  it("should parse CANCEL", () => {
    expect(parseConfirmationResponse("CANCEL")).toBe("cancel");
    expect(parseConfirmationResponse("cancel")).toBe("cancel");
    expect(parseConfirmationResponse("no")).toBe("cancel");
    expect(parseConfirmationResponse("n")).toBe("cancel");
  });

  it("should return null for unrecognized responses", () => {
    expect(parseConfirmationResponse("hello")).toBeNull();
    expect(parseConfirmationResponse("maybe")).toBeNull();
    expect(parseConfirmationResponse("")).toBeNull();
  });
});

// ============================================================
// GENERATE CONFIRMATION RESPONSE
// ============================================================

describe("generateConfirmationResponse", () => {
  it("should generate confirm response", () => {
    const message = generateConfirmationResponse("confirm");
    expect(message).toContain("Processing your note");
  });

  it("should generate retry response", () => {
    const message = generateConfirmationResponse("retry");
    expect(message).toContain("Send your new voice note");
  });

  it("should generate cancel response", () => {
    const message = generateConfirmationResponse("cancel");
    expect(message).toContain("discarded");
  });
});

// ============================================================
// GENERATE INVALID RESPONSE PROMPT
// ============================================================

describe("generateInvalidResponsePrompt", () => {
  it("should include the user's response", () => {
    const message = generateInvalidResponsePrompt("hello");
    expect(message).toContain('"hello"');
    expect(message).toContain("CONFIRM");
    expect(message).toContain("RETRY");
    expect(message).toContain("CANCEL");
  });

  it("should truncate long responses", () => {
    const longResponse = "A".repeat(100);
    const message = generateInvalidResponsePrompt(longResponse);
    expect(message).toContain("...");
    expect(message).not.toContain("A".repeat(100));
  });
});
