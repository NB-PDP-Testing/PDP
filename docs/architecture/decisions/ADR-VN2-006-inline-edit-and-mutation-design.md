# ADR-VN2-006: Inline Edit and Public Mutation Design

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 2 - Coach Quick Review Microsite, Stories US-VN-009, US-VN-010

## Context and Problem Statement

The microsite allows coaches to edit insight content (title, description, category) before applying, and to perform several actions (apply, dismiss, log injury, add task, save team note, batch apply). All these mutations must work without authentication, using only the review code for authorization. How should these mutations be designed to ensure data integrity and proper audit trails?

## Decision Drivers

- **No-auth mutations**: all writes must validate the review code on every call
- **Scope control**: mutations must only affect insights belonging to voice notes in the validated link
- **Edit semantics**: when a coach edits an insight, the edit should modify the embedded insight in the voiceNotes array (not create a copy)
- **Audit trail**: track who edited what and when (the code identifies the coach)
- **Existing patterns**: reuse existing `updateInsightStatus` mutation logic where possible

## Considered Options

### Option 1: New Public Mutations in whatsappReviewLinks.ts (Recommended)

Create dedicated public mutations in the review links model file. Each validates the code, verifies the noteId is in the link's voiceNoteIds, then delegates to shared logic.

### Option 2: Modify Existing voiceNotes.ts Mutations

Add optional `code` parameter to existing mutations like `updateInsightStatus`.

**Rejected** because: mixing auth-gated and code-gated access in the same function creates confusion and potential security holes. Keep the public microsite functions in their own file.

## Decision Outcome

**Chosen option: Option 1 (New Public Mutations in whatsappReviewLinks.ts)**.

## Implementation Notes

### Mutation Catalog

All mutations in `packages/backend/convex/models/whatsappReviewLinks.ts`:

| Mutation | Args | Description |
|----------|------|-------------|
| `editInsightFromReview` | code, noteId, insightId, title?, description?, category? | Edit insight content before applying |
| `applyInsightFromReview` | code, noteId, insightId | Apply a single insight (delegates to existing routing logic) |
| `dismissInsightFromReview` | code, noteId, insightId | Dismiss a single insight |
| `batchApplyInsightsFromReview` | code, items: { noteId, insightId }[] | Batch apply multiple insights |
| `logInjuryFromReview` | code, noteId, insightId | Create playerInjuries record from injury insight |
| `addTodoFromReview` | code, noteId, insightId | Create coachTasks record from todo insight |
| `saveTeamNoteFromReview` | code, noteId, insightId | Save team observation |
| `assignPlayerFromReview` | code, noteId, insightId, playerIdentityId | Assign an unmatched insight to a player |
| `markLinkAccessed` | code, deviceFingerprint?, ip?, userAgent? | Log access metadata |

### Edit Semantics

Editing modifies the embedded insight object in the `voiceNotes.insights` array in-place:

```typescript
export const editInsightFromReview = mutation({
  args: {
    code: v.string(),
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) throw new Error("Invalid or expired link");
    if (!result.link.voiceNoteIds.includes(args.noteId)) throw new Error("Note not in link");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    const updatedInsights = note.insights.map(insight => {
      if (insight.id !== args.insightId) return insight;
      return {
        ...insight,
        ...(args.title !== undefined && { title: args.title }),
        ...(args.description !== undefined && { description: args.description }),
        ...(args.category !== undefined && { category: args.category }),
      };
    });

    await ctx.db.patch(args.noteId, { insights: updatedInsights });
  },
});
```

**Rationale for in-place edit**: The insight data lives in the embedded `voiceNotes.insights` array. Creating a copy would mean the "Apply" action needs to know which version to use. In-place editing is simpler: the coach edits, then applies, and the applied version reflects their edits.

### Audit Trail

Since the code maps to a `coachUserId`, all mutations can log:
- Who: `link.coachUserId`
- What: the mutation name and args
- When: `Date.now()`

For Phase 2, the audit trail is implicit (the coach identified by the link made the change). If explicit audit logging is needed, add an `insightEditLog` field to the insight object or a separate audit table in Phase 3+.

### Scope Validation Pattern

Every mutation follows this pattern:

```typescript
// 1. Validate code
const result = await validateReviewCode(ctx, args.code);
if (!result || result.isExpired) throw new Error("Invalid or expired link");

// 2. Verify noteId is in link's voiceNoteIds
if (!result.link.voiceNoteIds.includes(args.noteId)) {
  throw new Error("Note not in this review link");
}

// 3. Verify insight exists in the note
const note = await ctx.db.get(args.noteId);
const insight = note?.insights.find(i => i.id === args.insightId);
if (!insight) throw new Error("Insight not found");

// 4. Perform the action
```

### Shared Logic with Existing Mutations

The `logInjuryFromReview` and `addTodoFromReview` mutations need to create records in `playerInjuries` and `coachTasks` tables respectively. The logic for this already exists in `voiceNotes.ts` `updateInsightStatus`.

**Recommendation**: Extract the routing logic (injury creation, task creation, skill assessment creation) into shared utility functions in `convex/lib/insightRouting.ts` that both the existing `updateInsightStatus` and the new review mutations can call. This avoids duplicating the complex category-based routing logic.

## Consequences

**Positive:**
- Clean separation: microsite mutations in their own file
- Every mutation validates the code (security by design)
- Scope verification prevents accessing notes outside the link
- In-place edits are simple and consistent

**Negative:**
- More mutation functions to maintain
- Some logic duplication with existing `updateInsightStatus` (mitigated by extracting to shared utility)
- No explicit audit log table in Phase 2 (acceptable, implicit via code-to-coach mapping)

## References

- Existing `updateInsightStatus`: `packages/backend/convex/models/voiceNotes.ts` lines 643-900+
- Phase 2 PRD: US-VN-009 mutation requirements
- CLAUDE.md: Convex function syntax requirements
