# ADR-VN2-042: validateTextMessage Quality Gate Placement in createTypedNote

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7C
**Story**: US-VN-027

## Context

The PRD adds `validateTextMessage` as a quality gate in `createTypedNote` (mutation). The validation rejects text under 10 chars, under 3 words, gibberish, and spam.

Currently, `createTypedNote` creates the voiceNote record FIRST (line 566), then checks the v2 feature flag and creates artifacts. Adding validation BEFORE the insert means no orphaned records are created for invalid input.

However, there is a UX consideration: the same `createTypedNote` mutation is called for both in-app typed notes AND WhatsApp text notes (via `whatsapp.ts` -> `createTypedNote`). WhatsApp text messages already have `validateTextMessage` applied in the WhatsApp processing pipeline (`processTextMessage`). Adding it to `createTypedNote` means WhatsApp messages get validated TWICE.

## Decision

**Add validation to `createTypedNote` BEFORE the insert, accepting double-validation for WhatsApp.**

### Rationale

1. **Defense in depth** -- If the WhatsApp validation is bypassed or removed, the mutation still validates
2. **Consistent behavior** -- All code paths creating typed notes get the same quality check
3. **Performance impact is negligible** -- `validateTextMessage` is a sync function with ~5 string operations, sub-millisecond
4. **No false rejection risk** -- A message that passes WhatsApp validation will always pass mutation validation (same function)

### Placement

```typescript
export const createTypedNote = mutation({
  args: { orgId, coachId, noteText, noteType, source },
  handler: async (ctx, args) => {
    // Quality gate: reject gibberish/too-short text
    const validation = validateTextMessage(args.noteText);
    if (!validation.isValid) {
      throw new Error(validation.suggestion || 'Message too short or unclear');
    }

    const noteId = await ctx.db.insert("voiceNotes", { ... });
    // ... rest of handler
  }
});
```

## Frontend Error Handling

The mutation throws an `Error`. The existing `new-note-tab.tsx` component wraps the mutation call in a try/catch with toast notifications. When the mutation throws:

1. Convex propagates the error to the client
2. The frontend catch block shows `toast.error(error.message)`
3. The user sees the `suggestion` text from `validateTextMessage`

No frontend changes should be needed -- verify during testing.

## Consequences

- Short/gibberish typed notes are rejected before any database writes
- WhatsApp text messages are validated twice (harmless, sub-millisecond)
- Frontend shows user-friendly error messages from the validation
- No orphaned voiceNote records created for invalid input
