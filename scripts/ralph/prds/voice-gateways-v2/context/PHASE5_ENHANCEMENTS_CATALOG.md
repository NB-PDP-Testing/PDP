# Phase 5 Enhancement Catalog

**Created**: 2026-02-07
**Status**: Assessed — 6 items integrated into Phase 5, remainder documented for future consideration
**Source**: Cross-cutting analysis of Phases 1-4 infrastructure

---

## Decision Summary

| # | Enhancement | Tier | Decision | Phase |
|---|-------------|------|----------|-------|
| 1 | Trust-Adaptive Auto-Resolve Threshold | Tier 1 | **INCLUDED in Phase 5** | 5 |
| 2 | Feature Flag Gating | Tier 1 | **INCLUDED in Phase 5** | 5 |
| 3 | Disambiguation Analytics Events | Tier 1 | **INCLUDED in Phase 5** | 5 |
| 4 | Rich matchReason on Candidates | Tier 1 | **INCLUDED in Phase 5** | 5 |
| 5 | Coach Alias Learning | Tier 2 | **INCLUDED in Phase 5** | 5 |
| 6 | Batch Same-Name Resolution | Tier 2 | **INCLUDED in Phase 5** | 5 |
| 7 | WhatsApp Disambiguation Notification | Tier 2 | Deferred — Phase 5.5 candidate | 5.5 |
| 8 | WhatsApp Inline Disambiguation | Tier 3 | Deferred — Phase 5.5 candidate | 5.5 |
| 9 | Snooze for Disambiguation | Tier 3 | Deferred — Phase 5.5 candidate | 5.5 |
| 10 | Review Microsite Integration | Tier 3 | Deferred — Phase 5.5 candidate | 5.5 |
| 11 | Mention Frequency Tracking | Tier 4 | Deferred — Phase 6+ | 6+ |
| 12 | Category-Aware Auto-Resolve Rules | Tier 4 | Deferred — Phase 6+ | 6+ |

---

## Tier 1: Included in Phase 5 (Low Effort, High Value)

### Enhancement 1: Trust-Adaptive Auto-Resolve Threshold

**Problem**: Phase 5 PRD hardcodes 0.9 as the auto-resolve threshold. All coaches get the same bar regardless of their history.

**Solution**: Use the coach's personalized `insightConfidenceThreshold` from their trust level record. A Level 3 "Expert" coach who rarely overrides AI suggestions would auto-resolve at ~0.85, while a new Level 0 coach stays at 0.9+.

**Existing Infrastructure**:
- `coachTrustLevels.ts` → `getCoachTrustLevelInternal` returns `insightConfidenceThreshold` (personalized, adjusted weekly by cron)
- `trustLevelCalculator.ts` → Level 0-3 definitions with threshold ranges
- `adjustPersonalizedThresholds` (weekly cron, Sunday 2 AM) already tunes thresholds based on coach override patterns + review analytics agreement rate

**Implementation**:
```typescript
// In entityResolution.ts resolveEntities action:
// NOTE: getCoachTrustLevelInternal takes { coachId } — NOT { coachUserId, organizationId }
const trustData = await ctx.runQuery(
  internal.models.coachTrustLevels.getCoachTrustLevelInternal,
  { coachId: coachUserId }
);
const autoResolveThreshold = trustData?.insightConfidenceThreshold ?? 0.9;
// Use autoResolveThreshold instead of hardcoded 0.9
```

**Effort**: ~1 hour
**Risk**: Low — reading an existing field, fallback to 0.9 if no trust data

---

### Enhancement 2: Feature Flag Gating

**Problem**: Entity resolution would run for ALL v2-enabled coaches with no way to disable it independently of the v2 pipeline.

**Solution**: Add `entity_resolution_v2` feature flag using the established cascade pattern (env var → platform → org → user → default false).

**Existing Infrastructure**:
- `featureFlags.ts` → `shouldUseEntityResolution` (cascade evaluation, returns boolean), `setFeatureFlag` (upsert at any scope)
- `shouldUseV2Pipeline` as reference implementation
- Feature flags admin UI at `/platform/feature-flags` already manages flags

**Implementation**:
```typescript
// In claimsExtraction.ts, before scheduling entity resolution:
// NOTE: Use shouldUseEntityResolution (cascade, returns boolean) — NOT getFeatureFlag (single-scope, returns record)
const entityResolutionEnabled = await ctx.runQuery(
  internal.lib.featureFlags.shouldUseEntityResolution,
  { organizationId, userId: coachUserId }
);
if (entityResolutionEnabled) {
  await ctx.scheduler.runAfter(0, internal.actions.entityResolution.resolveEntities, { artifactId });
}
```

**Effort**: ~30 minutes
**Risk**: None — established pattern, fail-safe default (disabled)

---

### Enhancement 3: Disambiguation Analytics Events

**Problem**: No visibility into how coaches interact with disambiguation, no data to improve auto-resolve accuracy over time.

**Solution**: Log disambiguation actions through the existing `logReviewEvent` function with new event types. These automatically feed into the weekly `adjustPersonalizedThresholds` cron.

**Existing Infrastructure**:
- `reviewAnalytics.ts` → `logReviewEvent` (internalMutation) — logs events with `confidenceScore`, `category`, `wasAutoApplyCandidate`
- `getCoachDecisionPatterns` → Returns `agreementRate`, `categoryBreakdown`
- `adjustPersonalizedThresholds` (weekly cron) already consumes analytics to tune thresholds

**New Event Types**:
| Event Type | When | Data |
|------------|------|------|
| `disambiguate_accept` | Coach selects a candidate | confidenceScore = selected candidate's similarity score |
| `disambiguate_reject_all` | Coach clicks "None of these" | confidenceScore = top candidate's score (to learn threshold) |
| `disambiguate_skip` | Coach skips/defers a resolution | confidenceScore = top candidate's score |

**Implementation**:
```typescript
// In resolveEntity mutation (after successful resolution):
// NOTE: coachUserId comes from ctx.auth.getUserIdentity().subject, NOT resolution.organizationId
// NOTE: Do NOT pass linkCode: null — Convex v.optional(v.string()) rejects null. Omit the field entirely.
await ctx.scheduler.runAfter(0, internal.models.reviewAnalytics.logReviewEvent, {
  coachUserId: identity.subject,
  organizationId: resolution.organizationId,
  eventType: "disambiguate_accept",
  confidenceScore: selectedCandidate.score,
  category: claim.topic,
});
```

**Effort**: ~1 hour (3 event calls in mutation/UI handlers)
**Risk**: Low — fire-and-forget via scheduler, won't block disambiguation flow

**Feedback Loop**: Over time, if a coach consistently accepts the top candidate at 0.85 similarity, the weekly cron raises their threshold → fewer disambiguation prompts → less coach workload.

---

### Enhancement 4: Rich matchReason on Candidates

**Problem**: The disambiguation UI would show a percentage but no explanation of WHY a candidate matched. "Sean Murphy — 90%" is less useful than "Sean Murphy — 90% (Irish name alias: Shawn = Sean)".

**Solution**: Surface the specific match strategy from `calculateMatchScore` in the `matchReason` field on each candidate.

**Existing Infrastructure**:
- `stringMatching.ts` → `calculateMatchScore` (lines 161-214) tries 6 strategies in order:
  1. Irish alias match (returns 0.9)
  2. Full name match (Levenshtein on "firstName lastName")
  3. First name only match
  4. Last name only match
  5. Reversed full name match
  6. Multi-word part matching
- `IRISH_NAME_ALIASES` — 19 alias groups for Irish names

**Match Reason Values**:
| Reason | Description | Example |
|--------|-------------|---------|
| `irish_alias` | Irish name phonetic alias | "Shawn" → "Sean" via alias group |
| `exact_first_name` | Exact first name match | "Sean" → "Sean Murphy" |
| `fuzzy_full_name` | Levenshtein distance on full name | "Sean Murfy" → "Sean Murphy" |
| `fuzzy_first_name` | Levenshtein on first name only | "Seen" → "Sean" |
| `last_name_match` | Last name match | "Murphy" → "Sean Murphy" |
| `reversed_name` | Name order swapped | "Murphy Sean" → "Sean Murphy" |
| `partial_match` | Multi-word part matching | "young Murphy" → "Sean Murphy" |
| `team_context_bonus` | Player on coach's team (bonus applied) | Appended to primary reason |

**Implementation**: Modify `findSimilarPlayersLogic` to return `matchReason` alongside `similarity`. Or compute it in `entityResolution.ts` after getting results, by calling `calculateMatchScore` with each strategy individually.

**Effort**: ~1 hour
**Risk**: Low — additive field, doesn't change matching logic

---

## Tier 2: Included in Phase 5 (Medium Effort, High Value)

### Enhancement 5: Coach Alias Learning ("Teach Once, Learn Forever")

**Problem**: Every time a coach says "Shawn", the system has to fuzzy-match again. If the coach resolved "Shawn" → "Sean O'Brien" last week, the system should remember this.

**Solution**: New `coachPlayerAliases` table that stores resolved disambiguation decisions. Before running fuzzy matching, check if this coach has previously resolved this raw text.

**Schema**:
```typescript
coachPlayerAliases: defineTable({
  coachUserId: v.string(),
  organizationId: v.string(),
  rawText: v.string(),              // Normalized lowercase: "shawn"
  resolvedEntityId: v.string(),     // playerIdentityId
  resolvedEntityName: v.string(),   // "Sean O'Brien"
  useCount: v.number(),             // How many times this alias was used
  lastUsedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_coach_org_rawText", ["coachUserId", "organizationId", "rawText"])
  .index("by_coach_org", ["coachUserId", "organizationId"]),
```

**Flow**:
```
1. Entity mention "Shawn" arrives
2. CHECK: coachPlayerAliases for this coach + org + "shawn"
   → HIT: Auto-resolve immediately (status = "auto_resolved", matchReason = "coach_alias")
   → MISS: Proceed to fuzzy matching as normal
3. When coach manually resolves disambiguation:
   → INSERT or UPDATE coachPlayerAliases with the resolution
   → Increment useCount, update lastUsedAt
```

**Functions**:
- `lookupAlias` (internalQuery): Check for existing alias
- `storeAlias` (internalMutation): Create/update alias after disambiguation
- `getCoachAliases` (query, public with auth): List coach's aliases (optional admin view)

**Why This Matters**: Coaches develop consistent nicknames for players. "Tommy" is always "Thomas Murphy" for Coach Neil. After one disambiguation, it should never ask again.

**Effort**: ~3 hours (new table, 3 functions, integration into resolveEntities + resolveEntity mutation)
**Risk**: Low — lookup is additive, falls through to fuzzy matching on miss

---

### Enhancement 6: Batch Same-Name Resolution

**Problem**: If a coach mentions "Tommy" 5 times in one voice note, Phase 5 would create 5 separate disambiguation prompts for the same name. The coach has to click through all 5.

**Solution**: When processing an artifact, group entity mentions by normalized rawText. When one is resolved, apply the same resolution to all other mentions of the same name within that artifact.

**Implementation**:
```typescript
// In resolveEntities action:
// Group mentions by normalized rawText
const mentionGroups = new Map<string, Array<{ claimId, mentionIndex }>>();
for (const claim of unresolvedClaims) {
  for (const [idx, mention] of claim.entityMentions.entries()) {
    const key = mention.rawText.toLowerCase().trim();
    if (!mentionGroups.has(key)) mentionGroups.set(key, []);
    mentionGroups.get(key)!.push({ claimId: claim._id, mentionIndex: idx });
  }
}

// For each unique name, create ONE resolution record as "primary"
// Other mentions of same name get status "auto_resolved" with note "batch_same_name"
```

**In the disambiguation UI**:
```
"Tommy" appears in 5 claims. Resolving this will update all 5.
  ○ Thomas Murphy (U14 Hurling) — 87%
  ○ Tommy O'Brien (U12 Football) — 82%
  [Confirm]
```

**In the resolveEntity mutation**: When a coach resolves one mention, find all other resolution records in the same artifact with the same rawText and auto-resolve them too. Also store as coach alias (Enhancement 5).

**Effort**: ~2 hours (grouping logic in action + propagation in mutation)
**Risk**: Low — worst case, coach resolves mentions individually (current behavior)

---

## Tier 2: Deferred — Phase 5.5 Candidates

### Enhancement 7: WhatsApp Disambiguation Notification

**Problem**: Coaches won't know disambiguation is needed unless they happen to check the web UI. Voice notes come in via WhatsApp, so coaches expect feedback there.

**Solution**: After entity resolution finds `needs_disambiguation` records, send a WhatsApp message to the coach with a count and link to the disambiguation page.

**Existing Infrastructure**:
- `formatResultsMessage` in whatsapp.ts already sends processing results
- Review link system generates URLs for coach review
- Trust-adaptive formatting (TL0-3) controls message verbosity

**Proposed Message Format**:
```
TL0-1: "I found 3 player mentions I'm not sure about:
- 'Tommy' in 'Tommy did well today' (2 possible matches)
- 'Sarah' in 'Sarah missed training' (3 possible matches)
Tap to help me identify them: [link]"

TL2-3: "3 players need identification → [link]"
```

**Implementation Notes**:
- Entity resolution action would need to send a WhatsApp message after processing
- Could piggyback on the existing review link URL or create a disambiguation-specific URL
- Need access to WhatsApp send infrastructure (currently in whatsapp.ts action)

**Effort**: ~4 hours (message formatting, WhatsApp integration, trust-adaptive variants)
**Risk**: Medium — adds WhatsApp message volume, could annoy coaches if too frequent
**Consideration**: Should batch with the main results message rather than sending separately

---

### Enhancement 8: WhatsApp Inline Disambiguation

**Problem**: Coaches are already in WhatsApp. Switching to a web UI for disambiguation adds friction.

**Solution**: Present entity candidates as a numbered list in WhatsApp, parse the numbered reply.

**Existing Infrastructure**:
- `whatsappMessages.ts` multi-org disambiguation already sends numbered lists and parses "1", "2" replies
- `parseConfirmationResponse` pattern in feedbackMessages.ts
- Pending message system with 24h expiry

**Proposed Flow**:
```
System: "Who is 'Tommy'?
1. Thomas Murphy (U14 Hurling) — 87% match
2. Tommy O'Brien (U12 Football) — 82% match
3. Someone else
Reply 1, 2, or 3"

Coach: "1"

System: "Got it — Tommy = Thomas Murphy.
2 more players to identify. Reply D to continue."
```

**Implementation Notes**:
- New `D` command in the priority chain (after OK, R, SNOOZE)
- New pending state type for disambiguation (extends existing multi-org pending system)
- Would need to handle batch resolution (same name across claims)
- Complex state management if coach has multiple pending disambiguations

**Effort**: ~8 hours (new command handler, state management, message formatting)
**Risk**: Medium-High — complex state management, could conflict with other pending states
**Consideration**: May overlap with Phase 6's WhatsApp confirmation workflow. Could defer to Phase 6 and implement both command systems together.

---

### Enhancement 9: Snooze for Disambiguation

**Problem**: A coach might not know which "Sean" was mentioned. They need to check at the next training session.

**Solution**: Allow snooping disambiguation items with the same delay options (1h, 2h, tomorrow 9am) and reminder system.

**Existing Infrastructure**:
- `performSnooze` helper in whatsappReviewLinks.ts (validates count, calculates timestamp, logs analytics)
- `processSnoozedReminders` cron (every 15 min)
- SnoozeBar UI component with delay buttons
- Constants: MAX_SNOOZE_COUNT=3, MIN/MAX delay bounds

**Implementation Options**:

Option A: Add snooze fields to `voiceNoteEntityResolutions` table
- `snoozeCount`, `snoozeRemindAt` fields
- Extend existing cron to also check entity resolutions
- Pro: Clean separation. Con: Duplicates snooze logic.

Option B: Surface disambiguation items in review microsite pending items
- Add `needsDisambiguation` category to `getCoachPendingItems`
- Inherit existing snooze infrastructure automatically
- Pro: No new snooze code. Con: Couples disambiguation to review system.

**Effort**: ~3 hours (Option A) or ~4 hours (Option B)
**Risk**: Low — reuses proven patterns
**Consideration**: Option B is more aligned with Enhancement 10 (review microsite integration)

---

### Enhancement 10: Review Microsite Integration

**Problem**: Phase 5 creates a separate disambiguation page at `/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]`. Coaches already use the `/r/[code]` review microsite for all pending actions.

**Solution**: Add disambiguation as a new category in the review microsite's pending items, alongside injuries, unmatched, needs review, etc.

**Existing Infrastructure**:
- `getCoachPendingItems` categorizes insights into 7 categories with priority ordering
- `ReviewQueue` component renders category sections with cards
- `UnmatchedPlayerCard` already has fuzzy matching UI (radio selection, similarity %)

**Proposed Integration**:
```
Review Queue Sections (priority order):
1. Injuries (red) — existing
2. Needs Identification (amber) — NEW: disambiguation items
3. Unmatched Players (amber) — existing
4. Needs Review (yellow) — existing
5. Todos (blue) — existing
6. Team Notes (green) — existing
7. Auto-Applied (gray) — existing
```

**Implementation Notes**:
- New `getDisambiguationItemsForCoach` query joins entity resolutions with claims
- New `DisambiguationCard` component (similar to UnmatchedPlayerCard but shows candidates from entity resolution)
- `getCoachPendingItems` would need to also return disambiguation counts
- The review link's voiceNoteIds would need to map to artifactIds to find relevant entity resolutions

**Effort**: ~6 hours (query, component, integration into review queue)
**Risk**: Medium — increases complexity of the already-complex review queue
**Consideration**: This is the "right" long-term home for disambiguation. The standalone page (US-VN-018) could be a stepping stone, with microsite integration following in Phase 5.5.

---

## Tier 4: Deferred — Phase 6+

### Enhancement 11: Mention Frequency Tracking

**Problem**: When a coach mentions "Tommy" ambiguously, we don't know if they mean the Tommy they talk about every session or the Tommy they've never mentioned.

**Solution**: Track mention frequency per coach per player. Boost candidates that the coach mentions frequently.

**Schema** (new table):
```typescript
coachMentionFrequency: defineTable({
  coachUserId: v.string(),
  organizationId: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  mentionCount: v.number(),
  lastMentionedAt: v.number(),
  firstMentionedAt: v.number(),
})
  .index("by_coach_org_player", ["coachUserId", "organizationId", "playerIdentityId"])
  .index("by_coach_org_count", ["coachUserId", "organizationId", "mentionCount"]),
```

**Implementation Notes**:
- Increment after every successful entity resolution (auto or manual)
- Apply frequency bonus in candidate ranking (similar to team context bonus)
- Need to handle roster changes (player leaves team, new player joins)
- Decay factor: recent mentions weighted higher than old ones

**Effort**: ~6 hours (new table, accumulation logic, ranking integration)
**Risk**: Medium — frequency can be misleading (backup goalkeeper rarely mentioned but still valid)
**Phase**: 6+ (requires data accumulation period to be useful)

---

### Enhancement 12: Category-Aware Auto-Resolve Rules

**Problem**: Misattributing an injury claim to the wrong player is much worse than misattributing an attendance claim.

**Solution**: Apply stricter auto-resolve rules for high-risk topic categories, mirroring the existing `decideAutoApproval` logic that never auto-approves injury/behavior topics.

**Existing Infrastructure**:
- `autoApprovalDecision.ts` → `NEVER_AUTO_APPROVE_CATEGORIES`: injury, behavior, wellbeing
- Category-specific thresholds already defined for auto-approval

**Proposed Rules**:
| Topic Category | Auto-Resolve Behavior |
|---------------|-----------------------|
| `injury`, `wellbeing` | Never auto-resolve — always require coach disambiguation |
| `behavior`, `parent_communication` | Require 0.95+ similarity (higher bar) |
| `performance`, `skill_rating`, etc. | Use coach's personalized threshold |
| `todo`, `session_plan`, `team_culture` | Use coach's personalized threshold (player less critical) |

**Effort**: ~2 hours (category lookup, conditional threshold)
**Risk**: Low — additive rules, falls through to coach disambiguation
**Phase**: 6+ (should observe actual disambiguation patterns first to tune rules)

---

## Cross-Enhancement Dependencies

```
Enhancement 5 (Aliases) ←── Enhancement 6 (Batch Resolution)
  ↑                            │
  │ Alias stored after         │ Batch resolution triggers
  │ disambiguation             │ alias creation
  └────────────────────────────┘

Enhancement 1 (Trust Threshold) ←── Enhancement 3 (Analytics)
  ↑                                    │
  │ Threshold adjusted by              │ Analytics events feed
  │ weekly cron                        │ into threshold adjustment
  └────────────────────────────────────┘

Enhancement 7 (WhatsApp Notify) ──→ Enhancement 8 (WhatsApp Inline)
  │                                    │
  │ Notification drives              Inline disambiguation
  │ coach to web UI                  replaces web UI need
  └────────────────────────────────────┘
```

---

## Estimated Phase 5 Timeline with Enhancements

| Day | Work |
|-----|------|
| Day 1 | US-VN-017: Schema + model functions + feature flag gating |
| Day 2 | US-VN-017: resolveEntities action with trust threshold, aliases, batch resolution, analytics |
| Day 3 | US-VN-017: Integration hook + US-VN-018: Disambiguation UI with rich matchReason |
| Day 4 | US-VN-018: Batch UI, alias storage on resolve, analytics logging, mobile polish |

Total additional effort for 6 enhancements: ~8.5 hours (spread across 4 days)
