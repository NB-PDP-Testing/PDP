# Phase 1: Quality Gates & Fuzzy Matching - Implementation Guide

**Duration**: 2.5 days (parallel streams)
**Stories**: US-VN-001 through US-VN-006
**Goal**: Prevent gibberish processing + Enable fuzzy player matching

---

## Phase 1 Architecture

### Parallel Execution Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     DAY 1-2 (PARALLEL)                      │
├──────────────────────────────┬──────────────────────────────┤
│      STREAM A                │       STREAM B               │
│   Quality Gates              │    Fuzzy Matching            │
│                              │                              │
│  US-VN-001: Text Validation  │  US-VN-005: Levenshtein     │
│  US-VN-002: Transcript Val   │  US-VN-006: Find Similar    │
│  US-VN-003: Duplicate Detect │                              │
│  US-VN-004: Enhanced Feedback│                              │
└──────────────────────────────┴──────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   DAY 3 (MERGE)  │
                    │   - Integration  │
                    │   - Testing      │
                    │   - Documentation│
                    └──────────────────┘
```

---

## Stream A: Quality Gates

### US-VN-001: Text Message Quality Gate

#### File Structure
```
packages/backend/convex/
├── lib/
│   └── messageValidation.ts          [NEW]
├── __tests__/
│   └── messageValidation.test.ts     [NEW]
├── actions/
│   └── whatsapp.ts                   [MODIFY]
└── schema.ts                          [MODIFY]
```

#### Implementation Steps

**Step 1: Create Validation Module (1h)**

```typescript
// packages/backend/convex/lib/messageValidation.ts

/**
 * Message quality validation for WhatsApp voice notes
 * Prevents processing of gibberish, empty, or spam messages
 */

export interface MessageQualityCheck {
  isValid: boolean;
  reason?: "empty" | "too_short" | "gibberish" | "spam";
  suggestion?: string;
}

/**
 * Validate text message quality before processing
 * @param text - Raw message text from WhatsApp
 * @returns Quality check result with rejection reason and suggestion
 */
export function validateTextMessage(text: string): MessageQualityCheck {
  const trimmed = text.trim();

  // Check 1: Empty message
  if (trimmed.length === 0) {
    return {
      isValid: false,
      reason: "empty",
      suggestion: "Please send a message with content."
    };
  }

  // Check 2: Minimum length (10 characters)
  if (trimmed.length < 10) {
    return {
      isValid: false,
      reason: "too_short",
      suggestion: "Your message is very short. Please provide more detail about the player or team."
    };
  }

  // Check 3: Word count (at least 3 words)
  const words = trimmed.split(/\s+/);
  if (words.length < 3) {
    return {
      isValid: false,
      reason: "too_short",
      suggestion: "Please use at least 3 words to describe what happened."
    };
  }

  // Check 4: Gibberish detection (average word length)
  const avgWordLength = trimmed.replace(/\s/g, "").length / words.length;
  if (avgWordLength > 20 || avgWordLength < 2) {
    return {
      isValid: false,
      reason: "gibberish",
      suggestion: "I couldn't understand that message. Could you rephrase?"
    };
  }

  // Check 5: Spam detection (repeated characters)
  // Pattern: Same character repeated 6+ times (e.g., "aaaaaaa")
  if (/(.)\1{5,}/.test(trimmed)) {
    return {
      isValid: false,
      reason: "spam",
      suggestion: "That looks like a test message. Please send your actual note."
    };
  }

  // All checks passed
  return { isValid: true };
}
```

**Step 2: Update Schema (0.5h)**

```typescript
// packages/backend/convex/schema.ts

// Add to whatsappMessages table:
whatsappMessages: defineTable({
  // ... existing fields ...

  // NEW: Quality check results
  messageQualityCheck: v.optional(v.object({
    isValid: v.boolean(),
    reason: v.optional(v.string()),
    checkedAt: v.number()
  })),
})
  .index("by_phone", ["fromNumber"])
  .index("by_status", ["status"])
  .index("by_quality", ["messageQualityCheck.isValid"]), // NEW: For analytics
```

**Step 3: Integrate into WhatsApp Flow (1h)**

```typescript
// packages/backend/convex/actions/whatsapp.ts

import { validateTextMessage } from "../lib/messageValidation";

export const processIncomingMessage = internalAction({
  // ... existing args ...
  handler: async (ctx, args) => {
    // ... existing phone number extraction ...

    // NEW: Quality gate for text messages
    if (messageType === "text" && args.body) {
      const qualityCheck = validateTextMessage(args.body);

      if (!qualityCheck.isValid) {
        // Store rejected message
        const messageId = await ctx.runMutation(
          internal.models.whatsappMessages.createMessage,
          {
            // ... existing fields ...
            messageQualityCheck: {
              isValid: false,
              reason: qualityCheck.reason,
              checkedAt: Date.now()
            }
          }
        );

        // Update status
        await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
          messageId,
          status: "rejected",
          errorMessage: `Quality check failed: ${qualityCheck.reason}`
        });

        // Send helpful feedback to user
        await sendWhatsAppMessage(phoneNumber, qualityCheck.suggestion!);

        return { success: false, messageId, error: qualityCheck.reason };
      }
    }

    // Continue with normal processing...
  }
});
```

**Step 4: Write Unit Tests (2h)**

```typescript
// packages/backend/convex/__tests__/messageValidation.test.ts

import { describe, it, expect } from "@jest/globals";
import { validateTextMessage } from "../lib/messageValidation";

describe("validateTextMessage", () => {
  it("should reject empty message", () => {
    const result = validateTextMessage("");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("empty");
    expect(result.suggestion).toContain("content");
  });

  it("should reject very short message", () => {
    const result = validateTextMessage("hi");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
    expect(result.suggestion).toContain("more detail");
  });

  it("should reject message with too few words", () => {
    const result = validateTextMessage("hello world");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
    expect(result.suggestion).toContain("3 words");
  });

  it("should reject gibberish (long words)", () => {
    const result = validateTextMessage("asdfjkl;qwertyuiop zxcvbnm,");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("gibberish");
    expect(result.suggestion).toContain("understand");
  });

  it("should reject gibberish (very short words)", () => {
    const result = validateTextMessage("a b c d e f g h i");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("gibberish");
  });

  it("should reject spam (repeated characters)", () => {
    const result = validateTextMessage("aaaaaaa test message");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("spam");
    expect(result.suggestion).toContain("test message");
  });

  it("should accept valid message", () => {
    const result = validateTextMessage("John did well in training today");
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should accept message with numbers", () => {
    const result = validateTextMessage("Player #10 scored 3 goals");
    expect(result.isValid).toBe(true);
  });

  it("should accept message with Irish names", () => {
    const result = validateTextMessage("Seán and Niamh practiced passing");
    expect(result.isValid).toBe(true);
  });
});
```

**Step 5: Manual Testing (0.5h)**

Test via WhatsApp:
1. Send empty message → Should receive rejection
2. Send "hi" → Should receive "too short" message
3. Send "asdfjkl;" → Should receive "couldn't understand"
4. Send "aaaaaaaa" → Should receive "test message" message
5. Send "John did well today" → Should process normally

---

### US-VN-002: Transcript Quality Validation

#### Implementation Steps

**Step 1: Add Transcript Validation to Module (2h)**

```typescript
// packages/backend/convex/lib/messageValidation.ts

export interface TranscriptQualityResult {
  isValid: boolean;
  confidence: number;
  reason?: string;
  suggestedAction: "process" | "ask_user" | "reject";
}

/**
 * Validate transcript quality after Whisper transcription
 * Detects inaudible audio, gibberish, or poor quality recordings
 */
export function validateTranscriptQuality(
  transcript: string,
  audioDuration?: number
): TranscriptQualityResult {
  const trimmed = transcript.trim();

  // Check 1: Empty transcript
  if (trimmed.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      reason: "empty_transcript",
      suggestedAction: "reject"
    };
  }

  // Check 2: Too short audio with short transcript
  if (audioDuration && audioDuration < 3 && trimmed.length < 20) {
    return {
      isValid: false,
      confidence: 0.1,
      reason: "too_short",
      suggestedAction: "reject"
    };
  }

  // Check 3: Whisper uncertainty markers
  const uncertaintyMarkers = [
    "[inaudible]", "[music]", "[noise]", "[?]",
    "(inaudible)", "(music)", "(background noise)"
  ];

  const words = trimmed.split(/\s+/);
  const uncertaintyCount = uncertaintyMarkers.reduce((count, marker) => {
    const regex = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return count + (transcript.match(regex)?.length || 0);
  }, 0);

  const uncertaintyRatio = uncertaintyCount / words.length;

  if (uncertaintyRatio > 0.5) {
    return {
      isValid: false,
      confidence: 0.2,
      reason: "mostly_inaudible",
      suggestedAction: "reject"
    };
  }

  if (uncertaintyRatio > 0.2) {
    return {
      isValid: true,
      confidence: 0.5,
      reason: "partial_audio_quality",
      suggestedAction: "ask_user"
    };
  }

  // Check 4: Word count
  if (words.length < 5) {
    return {
      isValid: false,
      confidence: 0.3,
      reason: "too_few_words",
      suggestedAction: "reject"
    };
  }

  // Check 5: Average word length (gibberish detection)
  const avgWordLength = trimmed.replace(/\s/g, "").length / words.length;
  if (avgWordLength < 2 || avgWordLength > 15) {
    return {
      isValid: false,
      confidence: 0.2,
      reason: "suspicious_word_pattern",
      suggestedAction: "ask_user"
    };
  }

  // Check 6: Sports context detection (confidence booster)
  const sportKeywords = [
    "player", "team", "training", "match", "game", "injury", "session",
    "practice", "coach", "midfielder", "striker", "defender", "goalkeeper",
    "pass", "tackle", "shot", "goal", "warm-up", "drill", "fitness",
    "hurling", "football", "gaelic", "rugby", "soccer"
  ];

  const hasSportsContext = sportKeywords.some(keyword =>
    transcript.toLowerCase().includes(keyword)
  );

  return {
    isValid: true,
    confidence: hasSportsContext ? 0.9 : 0.6,
    reason: hasSportsContext ? "good_quality" : "unclear_context",
    suggestedAction: hasSportsContext ? "process" : "ask_user"
  };
}
```

**Step 2: Update Schema for Voice Notes (0.5h)**

```typescript
// packages/backend/convex/schema.ts

// Add to voiceNotes table:
voiceNotes: defineTable({
  // ... existing fields ...

  // NEW: Transcript quality tracking
  transcriptQuality: v.optional(v.number()), // 0-1 confidence score
  transcriptValidation: v.optional(v.object({
    isValid: v.boolean(),
    reason: v.optional(v.string()),
    suggestedAction: v.union(
      v.literal("process"),
      v.literal("ask_user"),
      v.literal("reject")
    )
  })),
})
  .index("by_quality", ["transcriptQuality"]), // NEW: For analytics
```

**Step 3: Hook into Transcription Flow (1.5h)**

```typescript
// packages/backend/convex/models/voiceNotes.ts

import { validateTranscriptQuality } from "../lib/messageValidation";

/**
 * Called after Whisper transcription completes
 * Validates transcript quality and decides whether to proceed
 */
export const onTranscriptionComplete = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    transcript: v.string(),
    duration: v.optional(v.number())
  },
  returns: v.object({
    shouldProcessInsights: v.boolean(),
    needsConfirmation: v.optional(v.boolean()),
    reason: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    // Validate transcript quality
    const qualityResult = validateTranscriptQuality(args.transcript, args.duration);

    // Update voice note with quality data
    await ctx.db.patch(args.noteId, {
      transcript: args.transcript,
      transcriptionStatus: "completed",
      transcriptQuality: qualityResult.confidence,
      transcriptValidation: {
        isValid: qualityResult.isValid,
        reason: qualityResult.reason,
        suggestedAction: qualityResult.suggestedAction
      }
    });

    // Decide next step based on quality
    if (qualityResult.suggestedAction === "reject") {
      // Mark as failed, don't process insights
      await ctx.db.patch(args.noteId, {
        insightsStatus: "failed",
        insightsError: `Transcript quality too low: ${qualityResult.reason}`
      });
      return { shouldProcessInsights: false, reason: qualityResult.reason };
    }

    if (qualityResult.suggestedAction === "ask_user") {
      // Need confirmation before processing
      await ctx.db.patch(args.noteId, {
        insightsStatus: "awaiting_confirmation"
      });
      return { shouldProcessInsights: false, needsConfirmation: true };
    }

    // Good quality - proceed with insights
    return { shouldProcessInsights: true };
  }
});
```

**Step 4: Add Unit Tests (2h)**

```typescript
// packages/backend/convex/__tests__/messageValidation.test.ts

describe("validateTranscriptQuality", () => {
  it("should reject empty transcript", () => {
    const result = validateTranscriptQuality("");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("empty_transcript");
    expect(result.suggestedAction).toBe("reject");
  });

  it("should reject short audio with short transcript", () => {
    const result = validateTranscriptQuality("Um... hi", 2);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_short");
    expect(result.suggestedAction).toBe("reject");
  });

  it("should reject mostly inaudible transcript", () => {
    const transcript = "[inaudible] [music] [noise] maybe two words";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("mostly_inaudible");
    expect(result.suggestedAction).toBe("reject");
  });

  it("should ask confirmation for partial inaudible", () => {
    const transcript = "John did well [inaudible] training today [background noise]";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.suggestedAction).toBe("ask_user");
  });

  it("should reject too few words", () => {
    const result = validateTranscriptQuality("Hi there");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("too_few_words");
  });

  it("should accept sports context with high confidence", () => {
    const transcript = "John did well in training today, his passing improved";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.suggestedAction).toBe("process");
  });

  it("should accept non-sports context with lower confidence", () => {
    const transcript = "The weather was nice and everyone showed up on time";
    const result = validateTranscriptQuality(transcript);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.suggestedAction).toBe("ask_user");
  });
});
```

**Continuation in next message due to length...**

**Step 5: Manual Testing (1h)**

Test via WhatsApp audio messages:
1. Upload clear audio → Should process with high confidence (>0.8)
2. Upload audio with heavy background noise → Should receive quality warning
3. Upload very short audio (1 second) → Should receive rejection
4. Upload audio with music → Should receive inaudible rejection
5. Upload sports-related audio → Should process with sports context boost

Check database:
- Verify transcriptQuality field populated (0-1 range)
- Verify transcriptValidation stored correctly
- Verify insightsStatus set based on suggestedAction

---

### US-VN-003: Duplicate Message Detection

#### Implementation Steps

**Step 1: Create Duplicate Detection Query (2h)**

```typescript
// packages/backend/convex/models/whatsappMessages.ts

import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

/**
 * Check if an incoming message is a duplicate of a recent message
 * Prevents processing of accidental resends or network retries
 */
export const checkForDuplicateMessage = internalQuery({
  args: {
    phoneNumber: v.string(),
    body: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
    withinMinutes: v.optional(v.number())
  },
  returns: v.union(
    v.object({
      isDuplicate: v.boolean(),
      originalMessageId: v.id("whatsappMessages"),
      timeSinceOriginal: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const timeWindow = args.withinMinutes || 5; // Default 5 minutes
    const cutoffTime = Date.now() - (timeWindow * 60 * 1000);

    // Get recent messages from same phone number
    const recentMessages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_fromNumber_and_receivedAt", q =>
        q.eq("fromNumber", args.phoneNumber)
         .gte("receivedAt", cutoffTime)
      )
      .order("desc")
      .collect();

    // Check for duplicates
    for (const msg of recentMessages) {
      // Text message duplicate check (exact match)
      if (args.body && msg.body) {
        if (args.body.trim() === msg.body.trim()) {
          return {
            isDuplicate: true,
            originalMessageId: msg._id,
            timeSinceOriginal: Date.now() - msg.timestamp
          };
        }
      }

      // Audio duplicate check (same media type within 2 minutes)
      if (args.mediaContentType && msg.mediaContentType) {
        const timeDiff = Date.now() - msg.timestamp;
        if (
          args.mediaContentType === msg.mediaContentType &&
          timeDiff < 2 * 60 * 1000 // 2 minutes for network retries
        ) {
          return {
            isDuplicate: true,
            originalMessageId: msg._id,
            timeSinceOriginal: timeDiff
          };
        }
      }
    }

    return null; // Not a duplicate
  }
});

/**
 * Public query for checking duplicate status
 * Used for analytics and debugging
 */
export const getDuplicateInfo = query({
  args: { messageId: v.id("whatsappMessages") },
  returns: v.union(
    v.object({
      isDuplicate: v.boolean(),
      originalMessageId: v.optional(v.id("whatsappMessages")),
      duplicateCount: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    if (!message.isDuplicate) {
      return { isDuplicate: false, duplicateCount: 0 };
    }

    // Count duplicates of original message
    const duplicates = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_duplicate_of", q =>
        q.eq("duplicateOfMessageId", message.duplicateOfMessageId!)
      )
      .collect();

    return {
      isDuplicate: true,
      originalMessageId: message.duplicateOfMessageId,
      duplicateCount: duplicates.length
    };
  }
});
```

**Step 2: Update Schema (0.5h)**

```typescript
// packages/backend/convex/schema.ts

// Add to whatsappMessages table:
whatsappMessages: defineTable({
  // ... existing fields ...

  // NEW: Duplicate detection
  isDuplicate: v.optional(v.boolean()),
  duplicateOfMessageId: v.optional(v.id("whatsappMessages")),
})
  // EXISTING indexes: by_messageSid, by_fromNumber, by_coachId, by_organizationId, by_status, by_receivedAt
  .index("by_fromNumber_and_receivedAt", ["fromNumber", "receivedAt"]) // NEW - for duplicate detection
  .index("by_duplicate_of", ["duplicateOfMessageId"]), // NEW
```

**Step 3: Integrate into WhatsApp Flow (1h)**

```typescript
// packages/backend/convex/actions/whatsapp.ts

import { internal } from "../_generated/api";

export const processIncomingMessage = internalAction({
  handler: async (ctx, args) => {
    const { phoneNumber, body, mediaContentType } = args;

    // STEP 1: Check for duplicate BEFORE storing message
    const duplicateCheck = await ctx.runQuery(
      internal.models.whatsappMessages.checkForDuplicateMessage,
      {
        phoneNumber,
        body,
        mediaContentType,
        withinMinutes: 5
      }
    );

    if (duplicateCheck?.isDuplicate) {
      // Store duplicate message with reference to original
      const messageId = await ctx.runMutation(
        internal.models.whatsappMessages.createMessage,
        {
          fromNumber: phoneNumber,
          body,
          mediaContentType,
          timestamp: Date.now(),
          status: "duplicate",
          isDuplicate: true,
          duplicateOfMessageId: duplicateCheck.originalMessageId
        }
      );

      // Send helpful feedback
      const seconds = Math.floor(duplicateCheck.timeSinceOriginal / 1000);
      const timeAgo = seconds < 60
        ? `${seconds} seconds ago`
        : `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) > 1 ? 's' : ''} ago`;

      await sendWhatsAppMessage(
        phoneNumber,
        `⚠️ I just received a similar message ${timeAgo}.\n\n` +
        `If this is a new note about a different player or situation, please add more details ` +
        `so I can tell them apart.\n\n` +
        `Otherwise, I'll continue processing your original message.`
      );

      return { success: false, messageId, error: "duplicate" };
    }

    // STEP 2: Quality gate for text messages
    if (body) {
      const qualityCheck = validateTextMessage(body);
      // ... rest of quality validation ...
    }

    // Continue normal processing...
  }
});
```

**Step 4: Write Unit Tests (2h)**

```typescript
// packages/backend/convex/__tests__/duplicateDetection.test.ts

import { describe, it, expect, beforeEach } from "@jest/globals";
import { ConvexTestingHelper } from "convex-helpers/testing";
import { internal } from "../_generated/api";

describe("Duplicate Message Detection", () => {
  let t: ConvexTestingHelper;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
  });

  it("should detect duplicate text message within 5 minutes", async () => {
    const phoneNumber = "+353851234567";
    const messageBody = "John did well in training today";

    // Create first message
    const msg1 = await t.mutation(internal.models.whatsappMessages.createMessage, {
      fromNumber: phoneNumber,
      body: messageBody,
      timestamp: Date.now()
    });

    // Check for duplicate (should find it)
    const result = await t.query(internal.models.whatsappMessages.checkForDuplicateMessage, {
      phoneNumber,
      body: messageBody,
      withinMinutes: 5
    });

    expect(result).not.toBeNull();
    expect(result?.isDuplicate).toBe(true);
    expect(result?.originalMessageId).toBe(msg1);
    expect(result?.timeSinceOriginal).toBeLessThan(1000); // Less than 1 second ago
  });

  it("should not detect duplicate after time window expires", async () => {
    const phoneNumber = "+353851234567";
    const messageBody = "John did well in training today";

    // Create old message (7 minutes ago)
    await t.mutation(internal.models.whatsappMessages.createMessage, {
      fromNumber: phoneNumber,
      body: messageBody,
      timestamp: Date.now() - (7 * 60 * 1000)
    });

    // Check for duplicate with 5-minute window
    const result = await t.query(internal.models.whatsappMessages.checkForDuplicateMessage, {
      phoneNumber,
      body: messageBody,
      withinMinutes: 5
    });

    expect(result).toBeNull(); // Should not find duplicate
  });

  it("should not detect duplicate for different text", async () => {
    const phoneNumber = "+353851234567";

    await t.mutation(internal.models.whatsappMessages.createMessage, {
      fromNumber: phoneNumber,
      body: "John did well today",
      timestamp: Date.now()
    });

    const result = await t.query(internal.models.whatsappMessages.checkForDuplicateMessage, {
      phoneNumber,
      body: "Sarah needs more practice",
      withinMinutes: 5
    });

    expect(result).toBeNull();
  });

  it("should detect audio duplicate within 2 minutes", async () => {
    const phoneNumber = "+353851234567";
    const mediaType = "audio/ogg";

    await t.mutation(internal.models.whatsappMessages.createMessage, {
      fromNumber: phoneNumber,
      mediaContentType: mediaType,
      timestamp: Date.now()
    });

    const result = await t.query(internal.models.whatsappMessages.checkForDuplicateMessage, {
      phoneNumber,
      mediaContentType: mediaType,
      withinMinutes: 5
    });

    expect(result).not.toBeNull();
    expect(result?.isDuplicate).toBe(true);
  });

  it("should not detect audio duplicate after 2 minutes", async () => {
    const phoneNumber = "+353851234567";
    const mediaType = "audio/ogg";

    // Create message 3 minutes ago
    await t.mutation(internal.models.whatsappMessages.createMessage, {
      fromNumber: phoneNumber,
      mediaContentType: mediaType,
      timestamp: Date.now() - (3 * 60 * 1000)
    });

    const result = await t.query(internal.models.whatsappMessages.checkForDuplicateMessage, {
      phoneNumber,
      mediaContentType: mediaType,
      withinMinutes: 5
    });

    expect(result).toBeNull(); // Beyond 2-minute audio window
  });

  it("should count total duplicates correctly", async () => {
    const phoneNumber = "+353851234567";
    const body = "Test message";

    // Create original
    const original = await t.mutation(internal.models.whatsappMessages.createMessage, {
      fromNumber: phoneNumber,
      body,
      timestamp: Date.now()
    });

    // Create 3 duplicates
    for (let i = 0; i < 3; i++) {
      await t.mutation(internal.models.whatsappMessages.createMessage, {
        fromNumber: phoneNumber,
        body,
        timestamp: Date.now(),
        isDuplicate: true,
        duplicateOfMessageId: original
      });
    }

    const info = await t.query(internal.models.whatsappMessages.getDuplicateInfo, {
      messageId: original
    });

    expect(info?.duplicateCount).toBe(3);
  });
});
```

**Step 5: Manual Testing (0.5h)**

Test via WhatsApp:
1. Send same text message twice quickly → Second should be rejected with time info
2. Wait 6 minutes, send same message → Should process normally
3. Send audio, immediately resend same audio → Second rejected
4. Send audio, wait 3 minutes, resend → Should process normally
5. Send different messages quickly → Both should process

---

### US-VN-004: Enhanced WhatsApp Feedback Messages

#### Implementation Steps

**Step 1: Create Feedback Message Templates (2h)**

```typescript
// packages/backend/convex/actions/whatsapp.ts

/**
 * Send detailed, contextual feedback to WhatsApp users
 * Replaces generic error messages with specific guidance
 */
async function sendDetailedFeedback(
  phoneNumber: string,
  voiceNote: any,
  retryCount: number = 0
): Promise<void> {
  const { transcriptionStatus, transcriptValidation, insightsStatus, transcript } = voiceNote;

  // Category 1: Transcription Failed
  if (transcriptionStatus === "failed") {
    await sendWhatsAppMessage(
      phoneNumber,
      `❌ I couldn't transcribe your audio. This might be because:\n\n` +
      `• Audio was too short (needs 3+ seconds)\n` +
      `• Background noise was too loud\n` +
      `• File format issue\n\n` +
      `Please try recording again in a quiet space.`
    );
    return;
  }

  // Category 2: Transcript Quality Rejected
  if (transcriptValidation?.suggestedAction === "reject") {
    const reasonMessages = {
      empty_transcript: "The audio had no speech detected.",
      too_short: "The message was too short to analyze.",
      mostly_inaudible: "Most of the audio was inaudible or noisy.",
      too_few_words: "I only caught a few words.",
      suspicious_word_pattern: "The transcription doesn't look like natural speech."
    };

    const reason = reasonMessages[transcriptValidation.reason as keyof typeof reasonMessages]
      || "The audio quality was too poor.";

    const transcriptSnippet = transcript
      ? `\n\n📝 Transcript: "${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}"`
      : "";

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ ${reason}${transcriptSnippet}\n\n` +
      `Please try again:\n` +
      `• Record in a quiet place\n` +
      `• Speak clearly for at least 5 seconds\n` +
      `• Mention player names and what happened`
    );
    return;
  }

  // Category 3: Needs Confirmation (Uncertain Quality)
  if (transcriptValidation?.suggestedAction === "ask_user") {
    const transcriptSnippet = transcript.substring(0, 150);
    const hasMore = transcript.length > 150;

    await sendWhatsAppMessage(
      phoneNumber,
      `⚠️ I transcribed your audio, but I'm not confident about the quality.\n\n` +
      `📝 I heard: "${transcriptSnippet}${hasMore ? '...' : ''}"\n\n` +
      `Reply:\n` +
      `• *CONFIRM* to analyze it anyway\n` +
      `• *RETRY* to record again\n` +
      `• *CANCEL* to discard`
    );
    return;
  }

  // Category 4: Insights Extraction Failed
  if (insightsStatus === "failed") {
    const transcriptSnippet = transcript.substring(0, 100);

    await sendWhatsAppMessage(
      phoneNumber,
      `❌ I transcribed your note but couldn't extract insights.\n\n` +
      `📝 Transcript: "${transcriptSnippet}${transcript.length > 100 ? '...' : ''}"\n\n` +
      `This might be because:\n` +
      `• No player names were mentioned\n` +
      `• The message wasn't about player development\n\n` +
      `Your note is saved in the app. You can add details manually.`
    );
    return;
  }

  // Category 5: Generic Fallback (Still Processing)
  if (retryCount > 0) {
    await sendWhatsAppMessage(
      phoneNumber,
      `⏳ Your note is taking longer than usual to process.\n\n` +
      `You can:\n` +
      `• Check the app for updates\n` +
      `• Wait for processing to complete (may take 1-2 minutes)\n\n` +
      `If this keeps happening, please report it.`
    );
    return;
  }
}

/**
 * Handle confirmation responses (CONFIRM/RETRY/CANCEL)
 */
export const handleConfirmationResponse = internalAction({
  args: {
    phoneNumber: v.string(),
    response: v.string(),
    voiceNoteId: v.id("voiceNotes")
  },
  handler: async (ctx, args) => {
    const normalized = args.response.trim().toLowerCase();

    if (normalized === "confirm") {
      // User confirms - proceed with insights extraction
      await ctx.runMutation(internal.models.voiceNotes.updateStatus, {
        noteId: args.voiceNoteId,
        insightsStatus: "pending"
      });

      // Trigger insights processing
      await ctx.scheduler.runAfter(0, internal.actions.insights.extractInsights, {
        voiceNoteId: args.voiceNoteId
      });

      await sendWhatsAppMessage(
        args.phoneNumber,
        `✅ Got it! Processing your note now...`
      );
      return { action: "confirmed" };
    }

    if (normalized === "retry") {
      // User wants to retry - mark as cancelled, ready for new message
      await ctx.runMutation(internal.models.voiceNotes.updateStatus, {
        noteId: args.voiceNoteId,
        insightsStatus: "cancelled"
      });

      await sendWhatsAppMessage(
        args.phoneNumber,
        `🔄 No problem. Send your new voice note whenever you're ready.`
      );
      return { action: "retry" };
    }

    if (normalized === "cancel") {
      // User cancels - mark as cancelled
      await ctx.runMutation(internal.models.voiceNotes.updateStatus, {
        noteId: args.voiceNoteId,
        insightsStatus: "cancelled"
      });

      await sendWhatsAppMessage(
        args.phoneNumber,
        `❌ Note discarded. Feel free to send a new one anytime.`
      );
      return { action: "cancelled" };
    }

    // Invalid response
    await sendWhatsAppMessage(
      args.phoneNumber,
      `I didn't understand "${args.response}".\n\n` +
      `Please reply with:\n` +
      `• CONFIRM (to analyze the note)\n` +
      `• RETRY (to record again)\n` +
      `• CANCEL (to discard)`
    );
    return { action: "invalid" };
  }
});
```

**Step 2: Update checkAndAutoApply to Use New Feedback (1.5h)**

```typescript
// packages/backend/convex/actions/whatsapp.ts

export const checkAndAutoApply = internalAction({
  handler: async (ctx, args) => {
    const voiceNote = await ctx.runQuery(internal.models.voiceNotes.get, {
      noteId: args.noteId
    });

    if (!voiceNote) return;

    const coachPhone = voiceNote.coachPhoneNumber;
    if (!coachPhone) return;

    // Replace all generic error messages with sendDetailedFeedback
    if (voiceNote.transcriptionStatus === "failed" ||
        voiceNote.insightsStatus === "failed" ||
        voiceNote.transcriptValidation?.suggestedAction === "reject" ||
        voiceNote.transcriptValidation?.suggestedAction === "ask_user") {

      await sendDetailedFeedback(coachPhone, voiceNote, args.retryCount || 0);
      return;
    }

    // ... rest of auto-apply logic ...
  }
});
```

**Step 3: Update Incoming Message Handler for Confirmation Workflow (1h)**

```typescript
// packages/backend/convex/actions/whatsapp.ts

export const processIncomingMessage = internalAction({
  handler: async (ctx, args) => {
    // ... existing duplicate check, quality gate ...

    // NEW: Check if this is a response to a confirmation request
    if (args.body) {
      const recentAwaitingNote = await ctx.runQuery(
        internal.models.voiceNotes.getRecentAwaitingConfirmation,
        {
          phoneNumber: args.phoneNumber,
          withinMinutes: 10
        }
      );

      if (recentAwaitingNote) {
        // This is a CONFIRM/RETRY/CANCEL response
        await ctx.runAction(internal.actions.whatsapp.handleConfirmationResponse, {
          phoneNumber: args.phoneNumber,
          response: args.body,
          voiceNoteId: recentAwaitingNote._id
        });
        return { success: true, type: "confirmation_response" };
      }
    }

    // Continue with normal message processing...
  }
});
```

**Step 4: Add Helper Query for Recent Awaiting Notes (0.5h)**

```typescript
// packages/backend/convex/models/voiceNotes.ts

export const getRecentAwaitingConfirmation = internalQuery({
  args: {
    phoneNumber: v.string(),
    withinMinutes: v.number()
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNotes"),
      transcript: v.string(),
      transcriptValidation: v.optional(v.object({
        isValid: v.boolean(),
        reason: v.optional(v.string()),
        suggestedAction: v.union(
          v.literal("process"),
          v.literal("ask_user"),
          v.literal("reject")
        )
      }))
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.withinMinutes * 60 * 1000);

    const note = await ctx.db
      .query("voiceNotes")
      .withIndex("by_coach_phone", q => q.eq("coachPhoneNumber", args.phoneNumber))
      .filter(q =>
        q.and(
          q.eq(q.field("insightsStatus"), "awaiting_confirmation"),
          q.gte(q.field("_creationTime"), cutoff)
        )
      )
      .first();

    return note || null;
  }
});
```

**Step 5: Write Unit Tests (1.5h)**

```typescript
// packages/backend/convex/__tests__/whatsappFeedback.test.ts

import { describe, it, expect } from "@jest/globals";

describe("Enhanced WhatsApp Feedback", () => {
  it("should send correct rejection message for empty transcript", async () => {
    const feedback = await getFeedbackMessage({
      transcriptionStatus: "completed",
      transcript: "",
      transcriptValidation: {
        isValid: false,
        reason: "empty_transcript",
        suggestedAction: "reject"
      }
    });

    expect(feedback).toContain("❌");
    expect(feedback).toContain("no speech detected");
    expect(feedback).toContain("quiet place");
  });

  it("should send correct rejection message for mostly inaudible", async () => {
    const feedback = await getFeedbackMessage({
      transcriptionStatus: "completed",
      transcript: "[inaudible] [music] test",
      transcriptValidation: {
        isValid: false,
        reason: "mostly_inaudible",
        suggestedAction: "reject"
      }
    });

    expect(feedback).toContain("❌");
    expect(feedback).toContain("inaudible or noisy");
    expect(feedback).toContain("Transcript:");
  });

  it("should send confirmation request for uncertain quality", async () => {
    const feedback = await getFeedbackMessage({
      transcriptionStatus: "completed",
      transcript: "John did well [background noise] training",
      transcriptValidation: {
        isValid: true,
        reason: "partial_audio_quality",
        suggestedAction: "ask_user"
      }
    });

    expect(feedback).toContain("⚠️");
    expect(feedback).toContain("CONFIRM");
    expect(feedback).toContain("RETRY");
    expect(feedback).toContain("CANCEL");
    expect(feedback).toContain("I heard:");
  });

  it("should send insights failed message when no players found", async () => {
    const feedback = await getFeedbackMessage({
      transcriptionStatus: "completed",
      transcript: "The weather was nice today and everyone showed up",
      transcriptValidation: {
        isValid: true,
        suggestedAction: "process"
      },
      insightsStatus: "failed"
    });

    expect(feedback).toContain("❌");
    expect(feedback).toContain("couldn't extract insights");
    expect(feedback).toContain("No player names");
  });

  it("should handle CONFIRM response correctly", async () => {
    const result = await handleConfirmationResponse({
      phoneNumber: "+353851234567",
      response: "CONFIRM",
      voiceNoteId: testNoteId
    });

    expect(result.action).toBe("confirmed");
    // Verify insights extraction was triggered
    // Verify status updated to pending
  });

  it("should handle RETRY response correctly", async () => {
    const result = await handleConfirmationResponse({
      phoneNumber: "+353851234567",
      response: "RETRY",
      voiceNoteId: testNoteId
    });

    expect(result.action).toBe("retry");
    // Verify note marked as cancelled
  });

  it("should handle invalid confirmation response", async () => {
    const result = await handleConfirmationResponse({
      phoneNumber: "+353851234567",
      response: "YES",
      voiceNoteId: testNoteId
    });

    expect(result.action).toBe("invalid");
    // Verify help message sent
  });
});
```

**Step 6: Manual Testing (0.5h)**

Test each feedback category via WhatsApp:

1. **Empty transcript**: Upload silent audio → Verify rejection message mentions "no speech"
2. **Mostly inaudible**: Upload noisy audio → Verify rejection shows partial transcript
3. **Needs confirmation**: Upload unclear audio → Verify CONFIRM/RETRY/CANCEL options shown
4. **No players found**: Say "The weather is nice" → Verify insights failed message
5. **Still processing**: Check long-running note → Verify patience message

Test confirmation workflow:
1. Get awaiting_confirmation message → Reply "CONFIRM" → Verify processing starts
2. Get awaiting_confirmation message → Reply "RETRY" → Verify note cancelled
3. Get awaiting_confirmation message → Reply "CANCEL" → Verify note discarded
4. Reply "YES" to confirmation → Verify help message explaining valid options

---

## Stream B: Fuzzy Matching

### US-VN-005: Levenshtein Fuzzy Matching Backend

#### File Structure
```
packages/backend/convex/
├── lib/
│   └── stringMatching.ts                [NEW]
└── __tests__/
    └── stringMatching.test.ts          [NEW]
```

#### Implementation Steps

**Step 1: Create Levenshtein Algorithm (3h)**

See implementation in file creation below.

**Step 2: Write Comprehensive Unit Tests (3h)**

See test file creation below.

**Step 3: Performance Optimization (1h)**

If performance tests fail, optimize with threshold-based early exit.

---
### US-VN-006: Find Similar Players Query

#### Implementation Steps

Due to length constraints, the full implementation code for US-VN-005 (stringMatching.ts) and US-VN-006 (findSimilarPlayers) is detailed in the PRD.json acceptance criteria. Key points:

**US-VN-005 Implementation**:
- Create `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/stringMatching.ts`
- Implement `levenshteinDistance()` using Wagner-Fischer algorithm
- Implement `levenshteinSimilarity()` returning 0-1 score
- Implement `normalizeForMatching()` to handle diacritics, prefixes
- Add `phoneticVariations` map for Irish names
- Performance target: < 100ms for 1000 comparisons

**US-VN-006 Implementation**:
- Add `findSimilarPlayers` query to `orgPlayerEnrollments.ts`
- Batch fetch players from coach's teams (avoid N+1)
- Calculate similarity scores using `calculateMatchScore()`
- Filter by threshold (> 0.5)
- Sort by similarity descending
- Limit to 5 (max 20)
- Include team context (teamName, ageGroup)
- Optional: Context weighting (+0.1 for recent mentions, +0.15 for team match)

---

## Integration & Testing

### Merge Stream A and Stream B (Day 3)

**Step 1: Verify All Files Created (0.5h)**

```bash
# Check Stream A files
ls packages/backend/convex/lib/messageValidation.ts
ls packages/backend/convex/__tests__/messageValidation.test.ts
ls packages/backend/convex/__tests__/duplicateDetection.test.ts
ls packages/backend/convex/__tests__/whatsappFeedback.test.ts

# Check Stream B files
ls packages/backend/convex/lib/stringMatching.ts
ls packages/backend/convex/__tests__/stringMatching.test.ts
ls packages/backend/convex/__tests__/playerMatching.test.ts

# Check schema modifications
grep "messageQualityCheck" packages/backend/convex/schema.ts
grep "transcriptQuality" packages/backend/convex/schema.ts
grep "isDuplicate" packages/backend/convex/schema.ts
```

**Step 2: Run Full Type Check (0.5h)**

```bash
# Run TypeScript type check
npm run check-types

# Expected: 0 errors

# Run Convex codegen
npx -w packages/backend convex codegen

# Verify no schema errors
```

**Step 3: Run All Unit Tests (1h)**

```bash
# Run all tests
npm test

# Or run specific test files
npm test messageValidation
npm test duplicateDetection
npm test whatsappFeedback
npm test stringMatching
npm test playerMatching

# Expected: 100% passing
```

**Step 4: Manual UAT Testing (2h)**

#### Quality Gates Test Cases (QG-001 to QG-008)

**QG-001: Empty text message rejection**
- Send: "" (empty string)
- Expected: Rejection message "Please send a message with content."

**QG-002: Too short text message**
- Send: "hi"
- Expected: Rejection message "Please provide more detail"

**QG-003: Gibberish detection**
- Send: "asdfjkl;qwertyuiop"
- Expected: Rejection message "I couldn't understand that message"

**QG-004: Empty transcript**
- Upload: Silent audio file
- Expected: Rejection message "no speech detected"

**QG-005: Mostly inaudible transcript**
- Upload: Audio with heavy background noise
- Expected: Rejection with partial transcript shown

**QG-006: Sports context detection**
- Upload: "John did well in training today"
- Expected: High confidence (>0.8), processed normally

**QG-007: Duplicate message detection**
- Send: "Test message" twice within 1 minute
- Expected: Second rejected with "similar message X seconds ago"

**QG-008: Duplicate expiry**
- Send: "Test message"
- Wait: 6 minutes
- Send: "Test message" again
- Expected: Second message processed normally

#### Feedback Messages Test Cases (FB-001 to FB-005)

**FB-001: Transcription failed feedback**
- Upload: Corrupted audio file
- Expected: "I couldn't transcribe your audio" with tips

**FB-002: Quality rejected feedback**
- Upload: Very short audio (1 second)
- Expected: "too short to analyze" with transcript snippet

**FB-003: Confirmation request**
- Upload: Audio with some background noise
- Expected: "I'm not confident" with CONFIRM/RETRY/CANCEL options

**FB-004: CONFIRM workflow**
- Get confirmation request → Reply "CONFIRM"
- Expected: "Got it! Processing your note now..."

**FB-005: RETRY workflow**
- Get confirmation request → Reply "RETRY"
- Expected: "Send your new voice note whenever you're ready"

#### Fuzzy Matching Test Cases (FM-001 to FM-005)

**FM-001: Exact match**
- Query: findSimilarPlayers with searchName "John Murphy"
- Expected: John Murphy with similarity 1.0

**FM-002: Typo handling**
- Query: findSimilarPlayers with searchName "Jhon Murfy"
- Expected: John Murphy with similarity > 0.8

**FM-003: Irish name variations**
- Query: findSimilarPlayers with searchName "Shawn"
- Expected: Seán [LastName] with similarity > 0.7

**FM-004: O' prefix matching**
- Query: findSimilarPlayers with searchName "Brien"
- Expected: [FirstName] O'Brien with similarity > 0.9

**FM-005: Limit parameter**
- Query: findSimilarPlayers with limit=3
- Expected: Max 3 results returned

---

## Phase 1 Completion Checklist

### Stream A: Quality Gates
- [ ] US-VN-001: Text Message Quality Gate
  - [ ] Created `lib/messageValidation.ts`
  - [ ] Implemented `validateTextMessage()` function
  - [ ] Added `messageQualityCheck` field to schema
  - [ ] Integrated into `processIncomingMessage`
  - [ ] Wrote unit tests (8 test cases)
  - [ ] Manual WhatsApp testing passed

- [ ] US-VN-002: Transcript Quality Validation
  - [ ] Added `validateTranscriptQuality()` to messageValidation
  - [ ] Added `transcriptQuality` fields to schema
  - [ ] Created `onTranscriptionComplete` hook
  - [ ] Wrote unit tests (7 test cases)
  - [ ] Manual audio testing passed

- [ ] US-VN-003: Duplicate Message Detection
  - [ ] Created `checkForDuplicateMessage` query
  - [ ] Added `isDuplicate` fields to schema
  - [ ] Integrated into `processIncomingMessage`
  - [ ] Wrote unit tests (6 test cases)
  - [ ] Manual duplicate testing passed

- [ ] US-VN-004: Enhanced WhatsApp Feedback
  - [ ] Created `sendDetailedFeedback()` function
  - [ ] Added all 5 feedback message templates
  - [ ] Implemented CONFIRM/RETRY/CANCEL workflow
  - [ ] Updated `checkAndAutoApply` to use new feedback
  - [ ] Wrote unit tests (7 test cases)
  - [ ] Manual testing for all feedback types passed

### Stream B: Fuzzy Matching
- [ ] US-VN-005: Levenshtein Fuzzy Matching
  - [ ] Created `lib/stringMatching.ts`
  - [ ] Implemented `levenshteinDistance()` algorithm
  - [ ] Implemented `levenshteinSimilarity()` function
  - [ ] Added `normalizeForMatching()` helper
  - [ ] Added phonetic variations map
  - [ ] Wrote unit tests (20+ test cases)
  - [ ] Performance test passed (<100ms for 1000 names)

- [ ] US-VN-006: Find Similar Players Query
  - [ ] Added `findSimilarPlayers` query
  - [ ] Implemented batch fetch optimization
  - [ ] Added context weighting (optional)
  - [ ] Wrote unit tests (10+ test cases)
  - [ ] Manual query testing passed

### Integration & Quality Assurance
- [ ] Merged Stream A and Stream B code
- [ ] Type check passes (`npm run check-types` → 0 errors)
- [ ] All unit tests passing (100% pass rate)
- [ ] Manual UAT completed:
  - [ ] QG-001 through QG-008 (Quality Gates)
  - [ ] FB-001 through FB-005 (Feedback Messages)
  - [ ] FM-001 through FM-005 (Fuzzy Matching)
- [ ] Performance verified:
  - [ ] String matching < 100ms for 1000 players
  - [ ] No N+1 queries in findSimilarPlayers
- [ ] Documentation updated:
  - [ ] `.ruler/voice-notes-validation-patterns.md` created
  - [ ] PRD.json updated with completion status
  - [ ] PHASE1_QUALITY_GATES.md marked complete

### Production Readiness
- [ ] No regressions: Existing voice notes flow still works
- [ ] WhatsApp webhook receives quality gate rejections correctly
- [ ] Database indexes created for new queries
- [ ] Error logging added for analytics
- [ ] Feature flags configured (if applicable)

### Commit & Documentation
- [ ] Git commit: `feat(voice-notes): Phase 1 - Quality Gates & Fuzzy Matching`
- [ ] Commit message includes:
  - Summary of changes
  - List of user stories completed (US-VN-001 to US-VN-006)
  - Test coverage summary
  - Breaking changes (if any)
- [ ] Branch pushed to remote
- [ ] PR created (if applicable)

---

## Success Criteria Summary

Phase 1 is considered **complete and production-ready** when:

1. **Quality Gates Functional**:
   - Text messages: Empty, too short, and gibberish are rejected
   - Transcripts: Inaudible, too short, and poor quality are rejected
   - Duplicate messages: Detected and rejected within 5-minute window
   - Feedback messages: Specific, actionable guidance sent to WhatsApp

2. **Fuzzy Matching Operational**:
   - Levenshtein algorithm: Correctly calculates edit distance
   - Irish names: Handled correctly (Seán, Niamh, O'Brien, Pádraig)
   - findSimilarPlayers: Returns top candidates with similarity > 0.5
   - Performance: Sub-100ms for 1000 player comparisons

3. **Testing Complete**:
   - All unit tests passing (100%)
   - All manual UAT cases passing (18 test cases)
   - Type check clean (0 TypeScript errors)
   - No performance regressions

4. **Documentation Updated**:
   - Implementation patterns documented in `.ruler/`
   - PRD.json marked with completion status
   - Code comments explain validation logic

5. **Production Safe**:
   - No breaking changes to existing voice notes flow
   - Error handling robust (no uncaught exceptions)
   - Logging in place for debugging and analytics
   - Feature flags ready (if phased rollout planned)

---

## Next Steps

After Phase 1 completion, proceed to **Phase 2: Mobile Quick Review UI** (see `PHASE2_MOBILE_REVIEW.md` for detailed implementation guide).

**Phase 2 Overview**:
- Mobile-optimized review interface
- Quick-accept/quick-reject gestures
- Player disambiguation UI
- Real-time preview of changes
- Batch review capabilities

**Estimated Duration**: 5-7 days
**Dependencies**: Phase 1 complete (fuzzy matching powers player suggestions)

---

## Ralph Quick Reference

### File Locations
```
Stream A Files:
  packages/backend/convex/lib/messageValidation.ts
  packages/backend/convex/__tests__/messageValidation.test.ts
  packages/backend/convex/__tests__/duplicateDetection.test.ts
  packages/backend/convex/__tests__/whatsappFeedback.test.ts

Stream B Files:
  packages/backend/convex/lib/stringMatching.ts
  packages/backend/convex/__tests__/stringMatching.test.ts
  packages/backend/convex/__tests__/playerMatching.test.ts

Modified Files:
  packages/backend/convex/schema.ts (3 tables updated)
  packages/backend/convex/actions/whatsapp.ts (quality gates + feedback)
  packages/backend/convex/models/voiceNotes.ts (quality hooks)
  packages/backend/convex/models/whatsappMessages.ts (duplicate detection)
  packages/backend/convex/models/orgPlayerEnrollments.ts (fuzzy matching)
```

### Testing Commands
```bash
# Type check
npm run check-types

# Codegen
npx -w packages/backend convex codegen

# Unit tests
npm test messageValidation
npm test duplicateDetection
npm test whatsappFeedback
npm test stringMatching
npm test playerMatching

# All tests
npm test
```

### Manual Test Sequence
1. WhatsApp quality gates (QG-001 to QG-008)
2. Feedback messages (FB-001 to FB-005)
3. Fuzzy matching queries (FM-001 to FM-005)
4. Confirmation workflow (CONFIRM/RETRY/CANCEL)
5. Performance check (< 100ms for 1000 names)

### Key Metrics
- Unit test coverage: 100%
- UAT test cases: 18 total
- Performance target: < 100ms
- Similarity threshold: > 0.5
- Duplicate window: 5 minutes (text), 2 minutes (audio)
- Min message length: 10 chars, 3 words
- Min transcript length: 5 words

---

**END OF PHASE 1 QUALITY GATES GUIDE**
