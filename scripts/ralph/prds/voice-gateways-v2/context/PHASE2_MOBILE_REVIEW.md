# Phase 2: Coach Quick Review Microsite - Implementation Guide

**Duration**: 7-9 days
**Dependencies**: Phase 1 complete (quality gates + fuzzy matching + integration gaps fixed)
**Revision**: v2 — aggregated no-auth microsite (replaces original per-note auth'd review page)

---

## Overview

Phase 2 implements a **no-auth mobile microsite** for coach voice note review. The key insight: coaches send voice notes via WhatsApp (zero friction), so the review experience must match that frictionlessness. No login, no redirect, no app — just tap the link, action your items, done.

**Core Design Principles:**
1. **Zero friction** — the 8-char code IS the authentication (magic link pattern)
2. **Aggregated queue** — one rolling link per coach, ALL pending items across all voice notes
3. **Priority ordering** — injuries first, then unmatched, pending, todos, team notes
4. **Batch operations** — "Apply All", "Save All Team Notes", "Add All to Tasks"
5. **WhatsApp-native shortcuts** — reply "OK" to apply all matched without leaving WhatsApp

**Research basis:**
- Superhuman: inbox zero triage, flow-through pattern, completion celebration
- Magic links: 28% higher conversion, 2.4x mobile engagement vs passwords
- Progressive disclosure (NN/g): urgent items surface first, details on demand
- Tinder: binary decisions at speed (swipe gestures deferred to Phase 3)

---

## Architecture (Revised)

```
Coach sends voice note via WhatsApp
         ↓
Pipeline: transcribe → quality gate → extract insights → auto-apply
         ↓
Generate/reuse coach review link (ONE link per coach, reused if active)
         ↓
WhatsApp reply: "3 insights applied, 2 need review"
  + "Reply OK to apply all matched"
  + "Or review: playerarc.com/r/Ab3xK9mN (48h)"
         ↓
Coach replies "OK" → batch-apply all matched (stays in WhatsApp)
  OR
Coach taps link → /r/[code] renders microsite directly (NO auth, NO redirect)
         ↓
Aggregated Quick Review Queue:
  🚨 Injuries (always first, safety-critical)
  ❓ Unmatched Players (fuzzy suggestions from Phase 1)
  ⚠️  Needs Review (matched but below auto-apply threshold)
  ☑️  Actions/TODOs (contact parent, order bibs, etc.)
  🏟️  Team Notes (tactical, fitness observations)
  ✅ Auto-Applied (collapsed, informational only)
         ↓
Progress: "5 of 8 reviewed" → "All caught up!"
```

### Key Difference from Original Design

| Aspect | Original (v1) | Revised (v2) |
|--------|--------------|--------------|
| Auth | Full login required | No auth — code = token |
| Scope | Per voice note | Per coach (aggregated) |
| Route | `/r/[code]` → redirect → `/orgs/.../review/[code]` | `/r/[code]` renders directly |
| Link lifecycle | New link per note | Reuse active link, one per coach |
| WhatsApp | Per-note summary only | Running totals + "OK" quick-reply |
| Ordering | By note (chronological) | By priority (injuries first) |
| Batch ops | None | Apply All, Save All, Add All |
| Completion | None | Progress bar + "All caught up" |

---

## User Stories (Phase 2)

| Story | Title | Effort |
|-------|-------|--------|
| US-VN-007 | Review Links Backend (Coach-Scoped) | 1.5 days |
| US-VN-008 | Quick Review Microsite | 1 day |
| US-VN-009 | Review Queue Sections & Batch Actions | 2.5 days |
| US-VN-010 | Unmatched Player Cards + Text Reply | 1.5 days |
| US-VN-011 | Trust-Adaptive Messages + WhatsApp Quick Actions | 1 day |
| US-VN-012 | Link Expiry & Cleanup | 0.5 day |

**Execution order**: US-VN-007 → US-VN-008 → US-VN-009 → US-VN-010 (sequential)
**Parallel after 007**: US-VN-011 (depends on 007 only)
**Parallel after 008**: US-VN-012 (depends on 008 only)

---

## Critical Implementation Notes

### 1. No-Auth Public Queries
All queries accessed from the microsite must be **public** (not internal, not auth-gated).
They validate the review code instead of session:

```typescript
// Public query pattern for microsite
export const getCoachPendingItems = query({
  args: { code: v.string() },
  returns: v.union(/* ... */, v.null()),
  handler: async (ctx, args) => {
    // Validate code first
    const link = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_code", q => q.eq("code", args.code))
      .unique();
    if (!link || link.status !== "active" || Date.now() > link.expiresAt) {
      return null;
    }
    // Now safe to query coach's data
    // ...
  },
});
```

### 2. findSimilarPlayers Wrapper
Phase 1's `findSimilarPlayers` is an `internalQuery`. The microsite needs a public wrapper:

```typescript
// In whatsappReviewLinks.ts
export const findSimilarPlayersForReview = query({
  args: { code: v.string(), searchName: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Validate code, extract orgId + coachId
    // Call internal findSimilarPlayers logic
  },
});
```

### 3. Coach-Scoped Link Reuse
```
Coach sends note A → generateReviewLink → creates code "Ab3xK9mN" (voiceNoteIds: [A])
Coach sends note B → generateReviewLink → finds active "Ab3xK9mN" → adds B (voiceNoteIds: [A, B])
Coach sends note C → generateReviewLink → finds active "Ab3xK9mN" → adds C (voiceNoteIds: [A, B, C])

All 3 WhatsApp replies include: "Review: playerarc.com/r/Ab3xK9mN"
The microsite at /r/Ab3xK9mN shows ALL pending items from notes A, B, C
```

### 4. WhatsApp "OK" Handler Priority
The processMessage handler now has multiple interceptors. Order matters:

```
1. Check for "OK"/"yes"/"apply" → batch-apply matched insights
2. Check for "R" → resend review link
3. Check for CONFIRM/RETRY/CANCEL (Phase 1 quality gate flow)
4. Check for pending confirmation (awaiting_confirmation state)
5. Normal text/audio processing
```

### 5. Batch Fetch Pattern (MANDATORY)
The `getCoachPendingItems` query must aggregate across multiple voice notes.
Use batch fetch + Map lookup:

```typescript
// 1. Get all voiceNoteIds from the link
// 2. Batch fetch all voice notes
// 3. Batch fetch all insights from those notes
// 4. Build Map for O(1) lookup
// 5. Categorize into: injuries, unmatched, needsReview, todos, teamNotes, autoApplied
// 6. Sort by priority
```

---

## Mobile Design Requirements

- **Container**: `max-w-lg mx-auto` (512px max, centred on tablet)
- **Padding**: `p-4` (16px), `pb-[env(safe-area-inset-bottom)]`
- **Touch targets**: >= 44px on ALL interactive elements
- **Font size**: >= 16px body (prevents iOS zoom on input focus)
- **No horizontal scroll** (test at 320px width minimum)
- **Section cards**: rounded corners, colored left border by type
- **Batch buttons**: full-width, prominent, at section top (not bottom)
- **Progress bar**: thin bar below header, fills as items are actioned

---

## Phase 3 Candidates (Documented, Not Implemented)

These features were identified through research but deferred to keep Phase 2 focused:

1. **Swipe gestures** — Tinder/Superhuman pattern, button fallbacks for accessibility
2. **End-of-day digest** — Configurable daily summary WhatsApp message
3. **Snooze action** — "Review later" with resurface on next voice note
4. **Offline resilience** — Queue actions locally, sync when online (PWA)
5. **Voice reply** — Record voice from microsite to resolve unmatched players
6. **Flow-through mode** — Single-card view with auto-advance

---

## Performance Considerations

- Aggregated query fetches all data in ONE query (batch fetch + Map)
- No N+1: never query inside a loop
- Use `.withIndex()` for all queries, never `.filter()`
- Real-time updates via `useQuery` (Convex subscription)
- Progress counter computed client-side from query data (no extra query)

---

## Testing Strategy

**Unit tests**: whatsappReviewLinks.test.ts, whatsappFeedback.test.ts
**Manual UAT** (dev-browser at 375px viewport):
- QR-001: Valid link → shows aggregated queue
- QR-002: Multiple notes → all items shown in one queue
- QR-003: Expired link → shows ExpiredLinkView
- QR-004: Invalid code → shows InvalidLinkView
- QR-005: All items actioned → shows "All caught up!"
- QR-006: Batch "Apply All" → applies all matched
- QR-007: Unmatched → shows fuzzy suggestions
- QR-008: Text reply for unmatched → re-searches
- QR-009: WhatsApp "OK" → batch applies matched
- QR-010: WhatsApp "R" → resends link + summary
- QR-011: Second note reuses link → same code in both WhatsApp replies
- QR-012: Injury card → always top, cannot collapse

---

## Common Pitfalls

- **DON'T** recreate fuzzy matching — reuse Phase 1's `findSimilarPlayers`
- **DON'T** require authentication on the `/r/[code]` route
- **DON'T** create per-note links — one link per coach, reuse if active
- **DON'T** use `.filter()` — always `.withIndex()`
- **DON'T** forget touch target minimum (44px)
- **DO** validate code on EVERY query (expiry + status check)
- **DO** use batch fetch + Map for aggregation queries
- **DO** test at 375px width (iPhone SE)
- **DO** handle "no items" gracefully (show "All caught up!" not empty screen)
