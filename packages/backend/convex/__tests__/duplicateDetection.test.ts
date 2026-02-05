/**
 * Unit Tests: Duplicate Message Detection
 *
 * US-VN-003: Duplicate Message Detection
 */

import { describe, expect, it } from "vitest";
import type { RecentMessage } from "../lib/duplicateDetection";
import {
  checkDuplicate,
  DEFAULT_AUDIO_WINDOW_MS,
  DEFAULT_TEXT_WINDOW_MS,
} from "../lib/duplicateDetection";

// ============================================================
// CONSTANTS
// ============================================================

describe("duplicate detection constants", () => {
  it("should have 5 minute text window", () => {
    expect(DEFAULT_TEXT_WINDOW_MS).toBe(5 * 60 * 1000);
  });

  it("should have 2 minute audio window", () => {
    expect(DEFAULT_AUDIO_WINDOW_MS).toBe(2 * 60 * 1000);
  });
});

// ============================================================
// TEXT MESSAGE DUPLICATE DETECTION
// ============================================================

describe("checkDuplicate - text messages", () => {
  const now = Date.now();

  it("should return not duplicate when no recent messages", () => {
    const result = checkDuplicate({
      recentMessages: [],
      messageType: "text",
      body: "Hello world",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should detect exact text duplicate within window", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "John did well in training today",
        receivedAt: now - 60 * 1000, // 1 minute ago
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "John did well in training today",
      now,
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.originalMessageId).toBe("msg1");
    expect(result.timeSinceOriginal).toBe(60 * 1000);
  });

  it("should not flag different text as duplicate", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "John did well in training today",
        receivedAt: now - 60 * 1000,
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "Sean needs to improve his passing",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should not flag text outside the time window", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "John did well in training today",
        receivedAt: now - 6 * 60 * 1000, // 6 minutes ago (outside 5 min window)
        status: "completed",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "John did well in training today",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should detect duplicate at exactly the window boundary", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "Training was great",
        receivedAt: now - DEFAULT_TEXT_WINDOW_MS, // Exactly at boundary
        status: "completed",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "Training was great",
      now,
    });
    expect(result.isDuplicate).toBe(true);
  });

  it("should skip messages that are themselves duplicates", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "John did well in training today",
        receivedAt: now - 30 * 1000,
        status: "duplicate", // This is itself a duplicate, skip it
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "John did well in training today",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should handle undefined body gracefully", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: undefined,
        receivedAt: now - 30 * 1000,
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: undefined,
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });
});

// ============================================================
// AUDIO MESSAGE DUPLICATE DETECTION
// ============================================================

describe("checkDuplicate - audio messages", () => {
  const now = Date.now();

  it("should detect audio duplicate with same content type within window", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "audio",
        mediaContentType: "audio/ogg",
        receivedAt: now - 60 * 1000, // 1 minute ago
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "audio",
      mediaContentType: "audio/ogg",
      now,
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.originalMessageId).toBe("msg1");
  });

  it("should not flag audio outside the 2 minute window", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "audio",
        mediaContentType: "audio/ogg",
        receivedAt: now - 3 * 60 * 1000, // 3 minutes ago (outside 2 min window)
        status: "completed",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "audio",
      mediaContentType: "audio/ogg",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should not flag audio with different content type", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "audio",
        mediaContentType: "audio/ogg",
        receivedAt: now - 30 * 1000,
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "audio",
      mediaContentType: "audio/mpeg",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });
});

// ============================================================
// CROSS-TYPE DETECTION
// ============================================================

describe("checkDuplicate - cross-type", () => {
  const now = Date.now();

  it("should not flag text as duplicate of audio", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "audio",
        mediaContentType: "audio/ogg",
        receivedAt: now - 30 * 1000,
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "Some text message",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should not flag audio as duplicate of text", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "Some text message",
        receivedAt: now - 30 * 1000,
        status: "processing",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "audio",
      mediaContentType: "audio/ogg",
      now,
    });
    expect(result.isDuplicate).toBe(false);
  });
});

// ============================================================
// CONFIGURABLE WINDOWS
// ============================================================

describe("checkDuplicate - configurable windows", () => {
  const now = Date.now();

  it("should respect custom text window", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "text",
        body: "Hello",
        receivedAt: now - 30 * 1000, // 30 seconds ago
        status: "completed",
      },
    ];

    // With 10 second window, 30 seconds ago should NOT be duplicate
    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "Hello",
      now,
      textWindowMs: 10 * 1000, // 10 second window
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("should respect custom audio window", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg1",
        messageType: "audio",
        mediaContentType: "audio/ogg",
        receivedAt: now - 30 * 1000,
        status: "processing",
      },
    ];

    // With 10 second audio window, 30 seconds ago should NOT be duplicate
    const result = checkDuplicate({
      recentMessages,
      messageType: "audio",
      mediaContentType: "audio/ogg",
      now,
      audioWindowMs: 10 * 1000, // 10 second audio window
    });
    expect(result.isDuplicate).toBe(false);
  });
});

// ============================================================
// MULTIPLE RECENT MESSAGES
// ============================================================

describe("checkDuplicate - multiple messages", () => {
  const now = Date.now();

  it("should find the first matching duplicate", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg3",
        messageType: "text",
        body: "Hello world",
        receivedAt: now - 10 * 1000, // 10 seconds ago
        status: "processing",
      },
      {
        _id: "msg2",
        messageType: "text",
        body: "Different message",
        receivedAt: now - 60 * 1000,
        status: "completed",
      },
      {
        _id: "msg1",
        messageType: "text",
        body: "Hello world",
        receivedAt: now - 120 * 1000, // 2 minutes ago
        status: "completed",
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "Hello world",
      now,
    });
    expect(result.isDuplicate).toBe(true);
    // Should match the first one found (msg3, most recent)
    expect(result.originalMessageId).toBe("msg3");
  });

  it("should skip duplicate-status messages and find the original", () => {
    const recentMessages: RecentMessage[] = [
      {
        _id: "msg3",
        messageType: "text",
        body: "Hello world",
        receivedAt: now - 10 * 1000,
        status: "duplicate", // Skip this
      },
      {
        _id: "msg2",
        messageType: "text",
        body: "Hello world",
        receivedAt: now - 60 * 1000,
        status: "completed", // This is the real original
      },
    ];

    const result = checkDuplicate({
      recentMessages,
      messageType: "text",
      body: "Hello world",
      now,
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.originalMessageId).toBe("msg2");
  });
});
