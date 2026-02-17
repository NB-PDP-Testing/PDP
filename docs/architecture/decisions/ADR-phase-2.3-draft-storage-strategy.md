# ADR: Phase 2.3 Draft Storage Strategy

**Status:** Accepted
**Date:** 2026-02-13
**Context:** Import Wizard Save & Resume

## Decision

Raw CSV data is NOT stored in the `importSessionDrafts` table. On resume, the user re-uploads the original file. The draft stores only lightweight metadata: step number, column headers, row count, confirmed mappings, player selections, benchmark settings, template ID, and source file name.

## Context

The import wizard processes CSV files that can contain hundreds or thousands of rows with dozens of columns. Storing the full parsed CSV data in each draft document would:

1. **Exceed Convex document size limits** -- Convex documents have a 1MB size limit. A 500-row CSV with 20 columns could easily produce 200KB+ of parsed JSON data, and larger imports would exceed the limit.
2. **Increase storage costs** -- Drafts are transient (7-day expiry) and most will never be resumed. Storing full CSV data would waste storage.
3. **Slow down save/load operations** -- Every auto-save (triggered on each step transition, debounced 500ms) would send the full dataset over the wire.

## Alternatives Considered

### A: Store raw CSV text in draft
- Pros: No re-upload needed on resume.
- Cons: 1MB limit hit for moderate CSVs (~5000 rows). Expensive saves on every step.
- **Rejected.**

### B: Store parsed data in a separate Convex table (chunked)
- Pros: No re-upload needed. Could chunk large datasets across multiple documents.
- Cons: Significant complexity for chunking/reassembly. Drafts become multi-document transactions.
- **Rejected** -- complexity not justified for a 7-day-expiry feature.

### C: Store CSV in external blob storage (S3/R2)
- Pros: No size limits. No re-upload needed.
- Cons: Adds external dependency. Requires signed URLs. Complicates cleanup (must delete from blob store too).
- **Rejected** -- over-engineered for the use case.

### D: Store only metadata, require file re-upload (CHOSEN)
- Pros: Simple. Draft documents stay small (~5-15KB). Fast auto-save. No external dependencies.
- Cons: User must re-upload the same file on resume. If file is lost, draft is useless.
- **Accepted.**

## Consequences

1. **Header matching is required** -- On resume, the wizard compares the re-uploaded file's column headers against the draft's `parsedHeaders`. An exact match auto-restores all settings. A mismatch prompts the user to choose between applying saved settings anyway or starting fresh.

2. **Draft document size is bounded** -- The largest field is `playerSelections`, which stores `{ rowIndex, selected }` objects for each selected row. For a 1000-row import with all rows selected, this is ~30KB -- well within the 1MB limit.

3. **One draft per user per org** -- The `saveDraft` mutation upserts by `userId + organizationId`, ensuring at most one active draft per user per org. This prevents orphaned drafts from accumulating.

4. **Cron cleanup handles expired drafts** -- A daily cron at 4:00 AM UTC deletes drafts where `expiresAt < Date.now()`, processing up to 100 per run.

## Schema

```
importSessionDrafts: defineTable({
  userId: v.string(),
  organizationId: v.string(),
  step: v.number(),
  parsedHeaders: v.optional(v.array(v.string())),
  parsedRowCount: v.optional(v.number()),
  mappings: v.optional(v.record(v.string(), v.string())),
  playerSelections: v.optional(v.array(v.object({...}))),
  benchmarkSettings: v.optional(v.object({...})),
  templateId: v.optional(v.id("importTemplates")),
  sourceFileName: v.optional(v.string()),
  expiresAt: v.number(),
  lastSavedAt: v.number(),
})
  .index("by_userId_and_orgId", ["userId", "organizationId"])
  .index("by_expiresAt", ["expiresAt"])
```

## Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_userId_and_orgId` | `[userId, organizationId]` | Fast lookup/upsert of user's draft in an org |
| `by_expiresAt` | `[expiresAt]` | Range scan for expired draft cleanup cron |
