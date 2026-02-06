## Architecture Review - Phase 2: Coach Quick Review Microsite - 2026-02-06

**Reviewer:** Architecture Agent (Claude Opus 4.6)
**Phase:** Voice Gateways v2, Phase 2
**Stories:** US-VN-007 through US-VN-012
**ADRs Generated:** 6 (see `docs/architecture/decisions/ADR-VN2-*.md`)

---

### Architectural Decisions Required

Six ADRs have been written covering the major architectural decisions for Phase 2. These are ACCEPTED and should be followed during implementation.

| ADR | Decision | File |
|-----|----------|------|
| ADR-VN2-001 | Capability URL auth (code = token, no login) | `docs/architecture/decisions/ADR-VN2-001-capability-url-auth.md` |
| ADR-VN2-002 | Coach-scoped rolling links (one link per coach, reuse active) | `docs/architecture/decisions/ADR-VN2-002-coach-scoped-rolling-links.md` |
| ADR-VN2-003 | Public queries with per-call code validation | `docs/architecture/decisions/ADR-VN2-003-public-queries-code-validation.md` |
| ADR-VN2-004 | Aggregated pending items query (single query, batch fetch) | `docs/architecture/decisions/ADR-VN2-004-aggregated-pending-items-query.md` |
| ADR-VN2-005 | WhatsApp command interceptors (exact match, priority chain) | `docs/architecture/decisions/ADR-VN2-005-whatsapp-command-interceptors.md` |
| ADR-VN2-006 | Inline edit + public mutation design | `docs/architecture/decisions/ADR-VN2-006-inline-edit-and-mutation-design.md` |

---

### Implementation Guidelines

#### 1. Data Model (US-VN-007)

**New table: `whatsappReviewLinks`**

```typescript
whatsappReviewLinks: defineTable({
  code: v.string(),
  organizationId: v.string(),
  coachUserId: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  accessedAt: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("expired"), v.literal("used")),
  voiceNoteIds: v.array(v.id("voiceNotes")),
  lastNoteAddedAt: v.number(),
  deviceFingerprint: v.optional(v.string()),
  accessLog: v.optional(v.array(v.object({
    at: v.number(),
    ip: v.optional(v.string()),
    ua: v.optional(v.string()),
  }))),
  accessCount: v.number(),
})
  .index("by_code", ["code"])
  .index("by_coachUserId_and_status", ["coachUserId", "status"])
  .index("by_expiresAt_and_status", ["expiresAt", "status"])
```

**Key conventions to follow:**
- `coachUserId` and `organizationId` are `v.string()` (Better Auth IDs, NOT `v.id()`)
- `voiceNoteIds` uses `v.id("voiceNotes")` because these are Convex table references
- `accessCount` defaults to `0` on creation
- `expiresAt` = `Date.now() + 48 * 60 * 60 * 1000` (48h)
- Code generation: 8 chars from charset `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789` (58 chars, excludes 0OIl)

#### 2. New Model File (US-VN-007)

**Create: `packages/backend/convex/models/whatsappReviewLinks.ts`**

This file contains ALL microsite-facing functions:

**Internal mutations:**
- `generateReviewLink` - creates or reuses active link

**Public queries (code-validated):**
- `getReviewLinkByCode` - validates and returns link data
- `getCoachPendingItems` - aggregated pending items across all voice notes
- `findSimilarPlayersForReview` - wrapper for fuzzy matching (US-VN-010)

**Public mutations (code-validated):**
- `markLinkAccessed` - access logging and device fingerprint
- `applyInsightFromReview` - apply single insight
- `dismissInsightFromReview` - dismiss single insight
- `editInsightFromReview` - edit title/description/category before applying
- `batchApplyInsightsFromReview` - batch apply multiple insights
- `logInjuryFromReview` - create playerInjuries record
- `addTodoFromReview` - create coachTasks record
- `saveTeamNoteFromReview` - save team observation
- `assignPlayerFromReview` - assign unmatched insight to player (US-VN-010)

**Internal mutations (cron-called):**
- `expireActiveLinks` - mark expired links
- `cleanupExpiredLinks` - delete old expired links

#### 3. Shared Validation Helper

Every public query/mutation must start with this pattern:

```typescript
async function validateReviewCode(
  ctx: QueryCtx | MutationCtx,
  code: string
): Promise<{
  link: Doc<"whatsappReviewLinks">;
  isExpired: boolean;
} | null> {
  const link = await ctx.db
    .query("whatsappReviewLinks")
    .withIndex("by_code", q => q.eq("code", code))
    .unique();
  if (!link) return null;
  const isExpired = link.status !== "active" || Date.now() > link.expiresAt;
  return { link, isExpired };
}
```

#### 4. findSimilarPlayers Refactoring (BLOCKING for US-VN-010)

**Problem:** `findSimilarPlayers` in `orgPlayerEnrollments.ts` is an `internalQuery`. Public queries cannot call internal queries via `ctx.runQuery(internal.xxx)`.

**Solution:** Extract the matching logic into a shared utility:

1. Create `packages/backend/convex/lib/playerMatchingLogic.ts`
2. Move the database query + scoring + filtering + sorting logic there
3. Both `findSimilarPlayers` (internal) and `findSimilarPlayersForReview` (public) call the shared function
4. This is NOT a breaking change -- the internal query's signature stays the same

**This refactoring should happen in US-VN-007 to unblock US-VN-010.**

#### 5. Integration Point: checkAndAutoApply (US-VN-007)

After insights are processed in `checkAndAutoApply` (`actions/whatsapp.ts` line 786), add:

```typescript
// After processing insights and before sending WhatsApp reply:
const linkResult = await ctx.runMutation(
  internal.models.whatsappReviewLinks.generateReviewLink,
  {
    voiceNoteId: args.voiceNoteId,
    organizationId: args.organizationId,
    coachUserId: args.coachId,
  }
);

// Update formatResultsMessage to include the link URL
const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const reviewUrl = `${siteUrl}/r/${linkResult.code}`;
```

#### 6. WhatsApp Handler Priority Chain (US-VN-011)

In `processIncomingMessage`, BEFORE the existing CONFIRM/RETRY/CANCEL check:

```
1. Exact match /^(ok|yes|apply|go)$/i  AND  coach has active link with pending matched  ->  batch apply
2. Exact match /^r$/i  AND  coach has active link  ->  resend link
3. CONFIRM/RETRY/CANCEL (existing Phase 1)
4. Pending org selection response (existing)
5. Normal text/audio processing (existing)
```

**CRITICAL:** Use exact match only. "ok" should trigger, but "ok thanks" must NOT trigger.

#### 7. Frontend Route Structure (US-VN-008)

```
apps/web/src/app/r/[code]/
  page.tsx                    (client component, entry point)
  components/
    quick-review-layout.tsx   (max-w-lg container)
    quick-review-header.tsx   (fixed top bar + progress)
    invalid-link-view.tsx     (error state)
    expired-link-view.tsx     (error state)
    loading-skeleton.tsx      (pulse skeletons)
    injury-alert-section.tsx  (US-VN-009)
    needs-review-section.tsx  (US-VN-009)
    todos-section.tsx         (US-VN-009)
    team-notes-section.tsx    (US-VN-009)
    auto-applied-section.tsx  (US-VN-009)
    all-caught-up.tsx         (US-VN-009)
    insight-card.tsx          (shared card component)
    inline-edit-form.tsx      (edit mode overlay)
    progress-bar.tsx          (thin bar below header)
    unmatched-section.tsx     (US-VN-010)
    unmatched-player-card.tsx (US-VN-010)
```

**IMPORTANT:** This route is NOT under `/orgs/[orgId]/` -- it is a standalone public route. The `page.tsx` must be a client component (uses `useQuery` for real-time subscriptions). No auth provider wrapping needed.

#### 8. Cron Jobs (US-VN-012)

Add two entries to `packages/backend/convex/crons.ts`:

```typescript
// Phase 2: Expire active review links (runs daily at 2:30 AM UTC)
crons.daily(
  "expire-review-links",
  { hourUTC: 2, minuteUTC: 30 },
  internal.models.whatsappReviewLinks.expireActiveLinks,
  {}
);

// Phase 2: Cleanup expired review links > 7 days old (runs daily at 3:15 AM UTC)
crons.daily(
  "cleanup-expired-review-links",
  { hourUTC: 3, minuteUTC: 15 },
  internal.models.whatsappReviewLinks.cleanupExpiredLinks,
  {}
);
```

Note: 3 AM UTC is already used by `archive-old-invitations`. Use 3:15 AM to avoid collision.

---

### Risks and Mitigations

#### RISK 1: findSimilarPlayers is internalQuery (BLOCKING)

- **Severity:** BLOCKING for US-VN-010
- **Problem:** Public queries cannot call internal queries. The microsite's `findSimilarPlayersForReview` needs the fuzzy matching logic but cannot call `internal.models.orgPlayerEnrollments.findSimilarPlayers`.
- **Mitigation:** Extract matching logic into `convex/lib/playerMatchingLogic.ts` as a pure function that takes `QueryCtx`. Do this in US-VN-007 to unblock US-VN-010.

#### RISK 2: Existing code uses .filter() in voiceNotes.ts

- **Severity:** WARNING
- **Location:** `packages/backend/convex/models/voiceNotes.ts` line 470
- **Problem:** Violates CLAUDE.md mandatory pattern. New code must not copy this.
- **Mitigation:** All new queries must use `.withIndex()`.

#### RISK 3: Better Auth User Field Confusion

- **Severity:** WARNING
- **Location:** `packages/backend/convex/models/voiceNotes.ts` lines 345-354
- **Problem:** Uses `coach.firstName`/`coach.lastName` which do not exist. Must use `coach.name`.
- **Mitigation:** Phase 2 code must use `user.name` only.

#### RISK 4: accessLog Array Unbounded Growth

- **Severity:** LOW
- **Mitigation:** Cap at 100 entries (newest wins). `accessCount` provides true total.

#### RISK 5: Cron Job Time Collision

- **Severity:** LOW
- **Mitigation:** Schedule cleanup at 3:15 AM UTC instead of 3:00 AM.

#### RISK 6: WhatsApp "OK" False Positive

- **Severity:** LOW (mitigated by exact match + pending check)
- **Mitigation:** Exact match only; fall through if no pending matched insights.

---

### Pre-Implementation Checklist

Before starting US-VN-007, verify:

- [ ] Read all 6 ADRs in `docs/architecture/decisions/ADR-VN2-*.md`
- [ ] Read Phase 2 context: `scripts/ralph/prds/voice-gateways-v2/context/PHASE2_MOBILE_REVIEW.md`
- [ ] Read CLAUDE.md Performance & Query Optimization section
- [ ] Verify `findSimilarPlayers` is in `packages/backend/convex/models/orgPlayerEnrollments.ts` (internalQuery)
- [ ] Plan the `playerMatchingLogic.ts` extraction before starting US-VN-010
- [ ] Verify `checkAndAutoApply` location in `packages/backend/convex/actions/whatsapp.ts` (line 786)
- [ ] Verify `formatResultsMessage` location in same file (line 1079)
- [ ] Verify `process.env.SITE_URL` usage pattern (already used in whatsapp.ts line 1152)
- [ ] Confirm no existing `whatsappReviewLinks` table or `/r/[code]` route exists
- [ ] Review crons.ts for scheduling conflicts

Before starting each story, verify:
- [ ] All `v.string()` for Better Auth IDs (not `v.id()`)
- [ ] All queries use `.withIndex()` (never `.filter()`)
- [ ] All batch fetches use Map lookup (never N+1)
- [ ] All public functions validate the review code
- [ ] All mutations verify noteId is in link.voiceNoteIds
- [ ] Touch targets >= 44px on all interactive elements
- [ ] Run `npm run check-types` after each story

---

### Story Execution Notes

**US-VN-007 (1.5 days):** Backend first. Create schema, model file, all internal + public functions. Integrate with `checkAndAutoApply`. Extract `playerMatchingLogic.ts`. Write unit tests.

**US-VN-008 (1 day):** Frontend shell. Create `/r/[code]/page.tsx` as client component. Wire up `getReviewLinkByCode` and `markLinkAccessed`. Create error states. Mobile-first styling.

**US-VN-009 (2.5 days):** Heaviest story. All section components, all new mutations. Use `getCoachPendingItems` for data. Progress bar + "All caught up" state. Inline edit on all card types.

**US-VN-010 (1.5 days):** Depends on `playerMatchingLogic.ts` extraction from US-VN-007. Create `findSimilarPlayersForReview` public wrapper. Unmatched cards with radio suggestions + text reply.

**US-VN-011 (1 day, parallel with US-VN-009):** WhatsApp-only. Update `formatResultsMessage`. Add OK/R handlers with exact match. Running totals.

**US-VN-012 (0.5 day, parallel with US-VN-009):** Cron jobs + ExpiredLinkView polish.

---
