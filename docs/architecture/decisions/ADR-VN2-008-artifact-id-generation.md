# ADR-VN2-008: Artifact ID Generation Strategy

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 3 - v2 Artifacts Foundation, Story US-VN-013

## Context and Problem Statement

Each `voiceNoteArtifact` needs a unique `artifactId` string that serves as a stable, external-facing identifier. This ID is used:
1. As a correlation key across the v2 pipeline (artifact -> transcript -> claims -> resolutions)
2. In logs and debugging
3. Potentially in URLs or API responses in future phases

The Convex `_id` field is auto-generated and opaque. We need a separate `artifactId` for domain-level correlation.

## Decision Drivers

- **Uniqueness**: Must be globally unique across all artifacts
- **Availability**: Must be generatable in a Convex action context (actions run in Node.js)
- **Performance**: ID generation must not be a bottleneck
- **No external dependencies**: Avoid adding new packages if a built-in solution works
- **Debuggability**: Ideally human-distinguishable (not just a random string)

## Considered Options

### Option 1: `crypto.randomUUID()` (Recommended)

Use the built-in Node.js `crypto.randomUUID()` to generate a UUID v4.

**Pros:**
- Built into Node.js (no package dependency)
- Available in Convex action runtime
- Standard format (36 chars, e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Globally unique with negligible collision probability
- Widely recognized format for debugging

**Cons:**
- 36 characters (longer than nanoid)
- No semantic meaning (purely random)

### Option 2: nanoid

Use the `nanoid` package for shorter, URL-safe IDs.

**Rejected because:**
- Requires adding `nanoid` as a dependency
- Shorter IDs (21 chars default) provide marginal benefit since artifactId is a database field, not a URL slug
- `nanoid` is not in the current dependency tree

### Option 3: Convex `_id` as artifactId

Use the auto-generated Convex `_id` directly.

**Rejected because:**
- The `_id` is only available AFTER insertion, but `artifactId` needs to be known BEFORE insertion (so it can be passed through the pipeline)
- `_id` format is Convex-specific and may change
- Cannot correlate across systems that don't have Convex SDK

### Option 4: Prefixed UUID (`art_<uuid>`)

Use `crypto.randomUUID()` with a prefix for human readability.

**Considered but deferred:**
- Adds slight complexity
- No current need for prefix-based routing
- Can be added later if multiple ID types need disambiguation

## Decision Outcome

**Chosen option: Option 1 (`crypto.randomUUID()`)**

Simple, built-in, globally unique, no dependencies. The UUID v4 format is standard and well-understood.

### Usage Pattern

```typescript
// In whatsapp.ts processAudioMessage (action context)
const artifactId = crypto.randomUUID();

// Pass to createArtifact mutation
await ctx.runMutation(internal.models.voiceNoteArtifacts.createArtifact, {
  artifactId,
  sourceChannel: "whatsapp_audio",
  senderUserId: coachId,
  orgContextCandidates: [{ organizationId, confidence: 1.0 }],
  rawMediaStorageId: storageId,
});
```

### Index Design

The `by_artifactId` index on `voiceNoteArtifacts` enables O(1) lookup by artifactId:
```typescript
.index("by_artifactId", ["artifactId"])
```

Since `artifactId` is unique, this index will always return 0 or 1 results.

## Implementation Notes

- Generate `artifactId` in the action (whatsapp.ts), NOT in the mutation. This allows the ID to be known before any database write.
- Pass `artifactId` through the entire pipeline as a correlation key.
- The `voiceNoteTranscripts` table references `artifactId` as `v.id("voiceNoteArtifacts")` (the Convex `_id`), NOT the string `artifactId`. This is correct for foreign key integrity within Convex.

## Consequences

### Positive
- Zero dependencies
- Globally unique
- Standard format recognized by all debugging tools

### Negative
- 36 chars is slightly verbose (acceptable for a database field)
- No semantic prefix (acceptable; can be added later if needed)
