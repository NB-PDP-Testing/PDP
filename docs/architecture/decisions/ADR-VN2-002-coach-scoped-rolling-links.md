# ADR-VN2-002: Coach-Scoped Rolling Links (One Link Per Coach)

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 2 - Coach Quick Review Microsite, Stories US-VN-007, US-VN-011, US-VN-012

## Context and Problem Statement

When a coach sends multiple voice notes via WhatsApp, the system needs to generate review links. The question is: should each voice note get its own link, or should there be one rolling link per coach that aggregates all pending items?

## Decision Drivers

- **Cognitive load**: coaches should not have to track multiple links
- **WhatsApp UX**: each WhatsApp reply includes a link; if the link changes, coaches may tap stale links
- **Aggregation value**: a single view of ALL pending items across all notes is more efficient than note-by-note review
- **Link lifecycle**: must handle expiry cleanly (48h window)
- **Scale**: a coach may send 5-10 notes in a day; the aggregated view must remain performant

## Considered Options

### Option 1: One Rolling Link Per Coach (Reuse Active Link)

Each coach has at most one active link at a time. When a new voice note is processed, the system checks for an existing active (non-expired) link for that coach. If found, it adds the new voiceNoteId to the link's `voiceNoteIds` array. If not found, it creates a new link.

**Schema:**
```
whatsappReviewLinks: {
  code: string (8 chars),
  organizationId: string,
  coachUserId: string,
  voiceNoteIds: Id<"voiceNotes">[] (grows as notes are added),
  status: "active" | "expired" | "used",
  createdAt: number,
  expiresAt: number (48h from creation),
  lastNoteAddedAt: number,
  ...security fields
}
```

**Pros:**
- Single link to remember -- consistent URL in every WhatsApp reply
- Aggregated queue shows ALL pending items in one place
- Reduces total number of link records in the database
- Natural inbox-zero experience

**Cons:**
- `voiceNoteIds` array grows unbounded during the 48h window
- Single query must aggregate across all voice notes (complex but doable with batch fetch)
- If the link expires mid-review, all items become inaccessible until a new note triggers a fresh link

### Option 2: Per-Note Links

Each voice note gets its own link. WhatsApp reply includes a link specific to that note.

**Pros:**
- Simpler schema (one link, one note)
- Simpler aggregation query (just one note's insights)

**Cons:**
- Coach accumulates multiple links, may tap stale ones
- No unified view of all pending items
- More database records
- No inbox-zero experience

### Option 3: Dashboard Link (Fixed Per Coach, No Expiry)

A permanent link per coach that always shows current pending items.

**Pros:**
- Simplest -- one link, always works
- No expiry management

**Cons:**
- No natural expiry = permanent security exposure
- Violates the capability URL security model
- No lifecycle management

## Decision Outcome

**Chosen option: Option 1 (One Rolling Link Per Coach)**, because:

1. It provides the best UX: one consistent link in every WhatsApp message
2. It enables the aggregated queue (inbox-zero pattern)
3. The voiceNoteIds array is bounded in practice (a coach sends maybe 5-20 notes in a 48h window)
4. The 48h expiry creates a natural lifecycle boundary

## Implementation Notes

### voiceNoteIds Array Scale

In a 48h window, a prolific coach might send 20 voice notes. Each with 3-5 insights = 60-100 insights max. This is well within Convex document size limits and query performance bounds.

**Recommended cap:** 50 voice note IDs per link. If exceeded, create a new link (unlikely in practice).

### Link Reuse Logic

```
generateReviewLink(voiceNoteId, organizationId, coachUserId):
  1. Query by_coachUserId_and_status for active link
  2. If found AND expiresAt > Date.now():
     - Append voiceNoteId to voiceNoteIds (avoid duplicates)
     - Update lastNoteAddedAt
     - Return { code: existing.code, isReused: true }
  3. Else:
     - Generate new 8-char code
     - Create new link record
     - Return { code: newCode, isReused: false }
```

### Indexes Required

- `by_code`: for code lookup (microsite access)
- `by_coachUserId_and_status`: for reuse check (one active link per coach)
- `by_expiresAt_and_status`: for cron cleanup

### Expiry Edge Case

If a coach sends a note at hour 0 and another at hour 47, the link expires at hour 48. The second note's insights only have 1 hour of review time. This is acceptable because:
- The "OK" WhatsApp quick-reply allows instant batch apply without the microsite
- Sending yet another note after expiry will generate a fresh link with all still-pending items carried over (via the aggregation query)

## Consequences

**Positive:**
- Clean inbox-zero UX for coaches
- Consistent link across all WhatsApp replies
- Simple lifecycle: create -> reuse -> expire -> cleanup

**Negative:**
- Aggregation query is more complex (must batch-fetch across N voice notes)
- Must handle the array append correctly (no duplicates, check for existing voiceNoteId)
- Expiry applies to the link, not individual notes -- some items may have short review windows

## References

- Phase 2 PRD: US-VN-007 acceptance criteria
- Context guide: `scripts/ralph/prds/voice-gateways-v2/context/PHASE2_MOBILE_REVIEW.md` section 3
