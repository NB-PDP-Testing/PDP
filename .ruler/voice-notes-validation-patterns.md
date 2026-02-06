# Voice Notes Validation Patterns

**Project**: Voice Gateways v2
**Purpose**: Mandatory patterns for quality gates, fuzzy matching, and v2 pipeline
**Status**: Active (Phase 1+)

---

## Core Principles

1. **Validate Early, Reject Fast** - Check quality at entry points before expensive operations
2. **Specific Feedback** - Never send generic errors; always explain what went wrong and how to fix it
3. **Fuzzy Always** - Never use exact string matching for player names
4. **Test Everything** - 100% unit test coverage for all validation logic
5. **Performance First** - Use indexes, batch fetches, early returns

---

## Pattern 1: Message Quality Validation

### ✅ DO: Validate Before Processing

```typescript
// GOOD: Check quality before creating voice note
const qualityCheck = validateTextMessage(messageBody);
if (!qualityCheck.isValid) {
  await sendWhatsAppMessage(phoneNumber, qualityCheck.suggestion);
  return { success: false, error: qualityCheck.reason };
}
// Continue with processing...
```

### ❌ DON'T: Process First, Validate Later

```typescript
// BAD: Creates voice note, wastes API call, then fails
const noteId = await createVoiceNote(messageBody);
const insights = await extractInsights(noteId);  // Expensive!
if (insights.length === 0) {
  return "No insights found";  // Too late, already wasted money
}
```

---

## Pattern 2: Specific Error Messages

### ✅ DO: Explain the Problem + Solution

```typescript
// GOOD: Specific, actionable feedback
return {
  isValid: false,
  reason: "too_short",
  suggestion: "Your message is very short. Please provide more detail about the player or team."
};
```

### ❌ DON'T: Generic Messages

```typescript
// BAD: Doesn't help user understand or fix the problem
return {
  isValid: false,
  reason: "error",
  suggestion: "Something went wrong. Please try again."
};
```

---

## Pattern 3: Transcript Quality Checks

### ✅ DO: Multi-Layered Validation

```typescript
// GOOD: Multiple checks with different thresholds
function validateTranscriptQuality(transcript: string, duration?: number): TranscriptQualityResult {
  // 1. Empty check → Reject
  if (transcript.trim().length === 0) {
    return { isValid: false, confidence: 0, suggestedAction: "reject" };
  }

  // 2. Uncertainty markers → Reject or ask confirmation
  const uncertaintyRatio = countUncertaintyMarkers(transcript) / wordCount;
  if (uncertaintyRatio > 0.5) {
    return { isValid: false, confidence: 0.2, suggestedAction: "reject" };
  }
  if (uncertaintyRatio > 0.2) {
    return { isValid: true, confidence: 0.5, suggestedAction: "ask_user" };
  }

  // 3. Sports context → Boost confidence
  const hasSportsContext = detectSportsKeywords(transcript);
  return {
    isValid: true,
    confidence: hasSportsContext ? 0.9 : 0.6,
    suggestedAction: hasSportsContext ? "process" : "ask_user"
  };
}
```

### ❌ DON'T: Single Pass/Fail

```typescript
// BAD: No nuance, loses good transcripts
function validateTranscript(transcript: string): boolean {
  return transcript.length > 10;  // Too simplistic!
}
```

---

## Pattern 4: Fuzzy Player Matching

### ✅ DO: Always Use Levenshtein

```typescript
// GOOD: Fuzzy matching with normalization
async function findPlayer(searchName: string, players: Player[]) {
  const normalized = normalizeForMatching(searchName);  // "Seán" → "sean"

  const withScores = players.map(player => {
    const firstNameSim = levenshteinSimilarity(normalized, normalize(player.firstName));
    const lastNameSim = levenshteinSimilarity(normalized, normalize(player.lastName));
    const fullNameSim = levenshteinSimilarity(normalized, normalize(player.fullName));

    return {
      ...player,
      similarity: Math.max(firstNameSim, lastNameSim, fullNameSim)
    };
  });

  return withScores
    .filter(p => p.similarity > 0.5)  // Threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);  // Top 5
}
```

### ❌ DON'T: Exact Matching

```typescript
// BAD: Misses typos, Irish names, phonetic variations
async function findPlayer(searchName: string, players: Player[]) {
  return players.filter(p =>
    p.firstName.toLowerCase() === searchName.toLowerCase() ||
    p.lastName.toLowerCase() === searchName.toLowerCase()
  );  // "Shawn" won't find "Seán"
}
```

---

## Pattern 5: String Normalization

### ✅ DO: Comprehensive Normalization

```typescript
// GOOD: Handles diacritics, prefixes, case
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")  // Decompose accents: é → e + ´
    .replace(/[\u0300-\u036f]/g, "")  // Remove diacritics
    .replace(/^(o'|mc|mac)/i, "")  // Remove Irish/Scottish prefixes
    .replace(/[^a-z0-9\s]/g, "");  // Remove special chars
}

// Examples:
normalizeForMatching("Seán") === "sean"
normalizeForMatching("O'Brien") === "brien"
normalizeForMatching("Niamh") === "niamh"
```

### ❌ DON'T: Naive Lowercase Only

```typescript
// BAD: Doesn't handle accents or prefixes
function normalize(str: string): string {
  return str.toLowerCase();  // "Seán" stays "seán" (doesn't match "sean")
}
```

---

## Pattern 6: Duplicate Detection

### ✅ DO: Time-Window with Content Check

```typescript
// GOOD: Checks recent messages within time window
async function checkForDuplicate(
  phoneNumber: string,
  body: string,
  withinMinutes = 5
): Promise<boolean> {
  const cutoff = Date.now() - (withinMinutes * 60 * 1000);

  const recentMessages = await ctx.db
    .query("whatsappMessages")
    .withIndex("by_fromNumber_and_receivedAt", q =>
      q.eq("fromNumber", phoneNumber).gt("receivedAt", cutoff)
    )
    .collect();

  return recentMessages.some(msg => msg.body === body);
}
```

### ❌ DON'T: No Time Limit or Only ID Check

```typescript
// BAD: Checks ALL messages (slow) or only exact duplicates (misses retries)
async function checkForDuplicate(body: string): Promise<boolean> {
  const allMessages = await ctx.db.query("whatsappMessages").collect();  // Slow!
  return allMessages.some(msg => msg.body === body);
}
```

---

## Pattern 7: Early Return for Rejections

### ✅ DO: Validate → Reject → Process

```typescript
// GOOD: Early return saves processing
export const processMessage = internalAction({
  handler: async (ctx, args) => {
    // 1. Validate quality
    const qualityCheck = validateTextMessage(args.body);
    if (!qualityCheck.isValid) {
      await sendFeedback(args.phoneNumber, qualityCheck.suggestion);
      return { success: false, error: qualityCheck.reason };  // EARLY EXIT
    }

    // 2. Check duplicate
    const isDuplicate = await checkForDuplicate(args.phoneNumber, args.body);
    if (isDuplicate) {
      await sendFeedback(args.phoneNumber, "Similar message received recently");
      return { success: false, error: "duplicate" };  // EARLY EXIT
    }

    // 3. Process (only if passed all checks)
    const result = await processVoiceNote(args);
    return { success: true, result };
  }
});
```

### ❌ DON'T: Nested Conditions

```typescript
// BAD: Deep nesting, harder to follow
export const processMessage = internalAction({
  handler: async (ctx, args) => {
    const qualityCheck = validateTextMessage(args.body);
    if (qualityCheck.isValid) {
      const isDuplicate = await checkForDuplicate(args.phoneNumber, args.body);
      if (!isDuplicate) {
        const result = await processVoiceNote(args);
        if (result.success) {
          return { success: true, result };
        } else {
          return { success: false, error: "processing_failed" };
        }
      } else {
        return { success: false, error: "duplicate" };
      }
    } else {
      return { success: false, error: qualityCheck.reason };
    }
  }
});
```

---

## Pattern 8: Batch Fetch for Fuzzy Matching

### ✅ DO: Fetch Once, Calculate Many

```typescript
// GOOD: Batch fetch all players, then calculate similarity
export const findSimilarPlayers = query({
  handler: async (ctx, args) => {
    // 1. Batch fetch players (one query)
    const players = await ctx.db
      .query("playerIdentities")
      .withIndex("by_org", q => q.eq("organizationId", args.orgId))
      .collect();

    // 2. Calculate similarity in memory (fast)
    const withScores = players.map(player => ({
      ...player,
      similarity: calculateSimilarity(args.searchName, player)
    }));

    // 3. Filter and sort (in memory)
    return withScores
      .filter(p => p.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }
});
```

### ❌ DON'T: Query Per Player

```typescript
// BAD: N+1 queries, very slow
export const findSimilarPlayers = query({
  handler: async (ctx, args) => {
    const players = await ctx.db.query("playerIdentities").collect();

    // Anti-pattern: Query inside map
    const withScores = await Promise.all(
      players.map(async (player) => {
        const details = await ctx.db.get(player._id);  // EXTRA QUERY!
        return {
          ...details,
          similarity: calculateSimilarity(args.searchName, player)
        };
      })
    );

    return withScores.slice(0, 5);
  }
});
```

---

## Pattern 9: Unit Test Coverage

### ✅ DO: Test All Paths and Edge Cases

```typescript
// GOOD: Comprehensive test coverage
describe("validateTextMessage", () => {
  // Happy path
  it("should accept valid message", () => {
    expect(validateTextMessage("John did well today").isValid).toBe(true);
  });

  // Edge cases
  it("should reject empty string", () => {
    expect(validateTextMessage("").isValid).toBe(false);
  });

  it("should reject whitespace only", () => {
    expect(validateTextMessage("   ").isValid).toBe(false);
  });

  // Boundary conditions
  it("should reject 9-char message", () => {
    expect(validateTextMessage("123456789").isValid).toBe(false);
  });

  it("should accept 10-char message", () => {
    expect(validateTextMessage("1234567890").isValid).toBe(true);
  });

  // Real-world scenarios
  it("should accept Irish names", () => {
    expect(validateTextMessage("Seán and Niamh practiced").isValid).toBe(true);
  });

  it("should accept numbers", () => {
    expect(validateTextMessage("Player #10 scored 3 goals").isValid).toBe(true);
  });
});
```

### ❌ DON'T: Only Happy Path

```typescript
// BAD: Incomplete testing
describe("validateTextMessage", () => {
  it("works", () => {
    expect(validateTextMessage("test").isValid).toBe(true);  // Doesn't test rejections!
  });
});
```

---

## Pattern 10: Performance Optimization

### ✅ DO: Use Indexes and Short-Circuit

```typescript
// GOOD: Index lookup + early exit
export const checkForDuplicate = query({
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (5 * 60 * 1000);

    // Use composite index for fast lookup
    const recentMessages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_phone_and_time", q =>
        q.eq("fromNumber", args.phoneNumber).gt("receivedAt", cutoff)
      )
      .collect();

    // Short-circuit on first match
    for (const msg of recentMessages) {
      if (msg.body === args.body) {
        return true;  // Exit immediately
      }
    }

    return false;
  }
});
```

### ❌ DON'T: Filter After Query or Scan All

```typescript
// BAD: Fetches all, then filters (slow)
export const checkForDuplicate = query({
  handler: async (ctx, args) => {
    const allMessages = await ctx.db
      .query("whatsappMessages")
      .collect();  // Fetches EVERYTHING!

    return allMessages
      .filter(m => m.fromNumber === args.phoneNumber)  // Filter in memory
      .some(m => m.body === args.body);
  }
});
```

---

## Validation Checklist

Before committing validation code, verify:

- [ ] ✅ Early validation at entry points (WhatsApp webhook, API)
- [ ] ✅ Specific error messages with suggestions
- [ ] ✅ Multi-layered checks (empty, length, pattern, context)
- [ ] ✅ Fuzzy matching with Levenshtein (never exact)
- [ ] ✅ String normalization (lowercase, diacritics, prefixes)
- [ ] ✅ Time-window for duplicates (not unlimited scan)
- [ ] ✅ Early return on rejection (don't continue processing)
- [ ] ✅ Batch fetch + in-memory calculation (no N+1)
- [ ] ✅ Unit tests for all paths (100% coverage)
- [ ] ✅ Performance: Indexes, short-circuit, < 100ms

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Pattern |
|----------------|-------------------|
| Process first, validate later | Validate early, reject fast |
| Generic "something went wrong" | Specific reason + solution |
| Exact string matching | Levenshtein fuzzy matching |
| Naive lowercase only | Full normalization (diacritics, prefixes) |
| No time window for duplicates | 5-minute sliding window |
| Nested conditionals | Early return pattern |
| Query per item in loop | Batch fetch + Map lookup |
| Only happy path tests | All paths + edge cases |
| `.filter()` after `.withIndex()` | Use composite index |
| No performance targets | < 100ms for 1000 players |

---

## References

- **Issue #423**: WhatsApp gibberish detection
- **Analysis**: `docs/archive/bug-fixes/ISSUE_423_WHATSAPP_QUALITY_GATES_ANALYSIS.md`
- **PRD**: `scripts/ralph/prds/voice-gateways-v2/PRD.json`
- **Phase 1 Context**: `scripts/ralph/prds/voice-gateways-v2/context/PHASE1_QUALITY_GATES.md`
- **Performance Guide**: `CLAUDE.md` (Performance & Query Optimization section)
