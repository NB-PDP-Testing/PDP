# Merge Plan: `main` → `ralph/adult-player-phase5-portal-sections`

**Date:** 2026-02-27
**Branch:** `ralph/adult-player-phase5-portal-sections`
**Status:** Planning — not yet executed

---

## Context

Two parallel development streams created overlapping work that must be carefully merged:

### Our Branch
5 phases of the Adult Player Lifecycle (Phases 1–5), including:
- Full player portal (Today, Profile, Passports, Goals, Progress, Health Check, Settings, etc.)
- Graduation flow (guardian → invite → player claim → onboarding)
- Phase 3 matching orchestrator: a brand-new **unified matching orchestrator** (`playerMatching.ts`) covering **all 5 player entry points** with multi-signal scoring (name/DOB/email/phone/postcode/federation IDs, Irish alias phonetics, confidence tiers HIGH/MEDIUM/LOW)
- Phase 4 wellness system (daily health checks, wellness trend charts, AI insights)
- Phase 5 portal sections (My Goals, My Passports, GDPR export, radar chart)

### Main Branch (PRs 572, 573, 575, 576)
- **PR 572:** Auth hardening (`authHelpers.ts`), cascade unenrollment cleanup, Add Player form improvements (sport selection, guardian linking)
- **PR 573:** Full player identity **deduplication system** — stored `normalizedFirstName`/`normalizedLastName` fields, `by_normalized_name_dob` index, `findPotentialDuplicatesForOrg`, `getMergePreview`, `mergePlayerIdentities`, `playerIdentityMerges` audit table, full admin dedup UI (stat card + merge dialog)
- **PR 575:** `findOrCreatePlayer` server-side 3-tier dedup as a safety net on Add Player
- **PR 576:** `guardianMatcher.ts` improvements

**Problem:** Main's matching only covers the Add Player form. Our branch covers all 5 entry points but lacks the stored normalization index (O(n) scan), the admin dedup/merge UI, and the auth helpers.

---

## What Each Branch Contributes (Best of Both)

### Keep from Main

| Item | File | Reason |
|------|------|--------|
| `normalizedFirstName`/`normalizedLastName` stored fields | `schema.ts`, `playerIdentities.ts` | DB-level index lookup vs O(n) runtime scan |
| `by_normalized_name_dob` index | `schema.ts` | O(1) normalized + Irish alias lookup at DB level |
| `search_name` full-text index | `schema.ts` | Powers `searchPlayersByName` without table scan |
| `findOrCreatePlayer` mutation | `playerIdentities.ts` | Server-side safety net — catches duplicates even if client dialog bypassed |
| `checkForDuplicatePlayer` query | `playerIdentities.ts` | Backwards-compat / admin tool |
| `findPotentialMatches` query | `playerIdentities.ts` | Admin-facing fuzzy ranking |
| `findPotentialDuplicatesForOrg` query | `playerIdentities.ts` | Powers admin dedup stat card |
| `getMergePreview` query | `playerIdentities.ts` | Pre-merge validation/conflict detection |
| `mergePlayerIdentities` mutation | `playerIdentities.ts` | 14-table reassignment with audit trail |
| `playerIdentityMerges` audit table | `schema.ts` | Tracks merge history |
| Admin dedup UI | `admin/players/page.tsx` | Stat card + side-by-side merge dialog |
| `authHelpers.ts` | `convex/lib/authHelpers.ts` | `requireAuth`, `requireOrgMembership`, `requireAuthAndOrg` |
| `guardianMatcher.ts` updates | `convex/lib/matching/guardianMatcher.ts` | Improved guardian matching |
| `backfillNormalizedNames` migration | `convex/migrations/` | Backfill existing records with normalized names |

### Keep from Our Branch

| Item | File | Reason |
|------|------|--------|
| `findPlayerMatchCandidates` | `playerMatching.ts` | Unified multi-signal ranking for all human-reviewed flows |
| `findBestPlayerMatch` / `findBestPlayerMatchInternal` | `playerMatching.ts` | Single-result automation (join requests, graduation) |
| Multi-signal scoring | `playerMatching.ts` | Email +25, phone +20, postcode +15, address +10 boosts; federation ID priority; GAA mismatch warning |
| Irish alias phonetics (45+ pairs) | `lib/stringMatching.ts` | Superior phonetic name matching |
| 5-entry-point coverage | Multiple files | All entry points use unified matching |
| Phase 1–5 player portal | 40+ files | Complete adult lifecycle feature |
| Wellness system (Phase 4) | `playerHealthChecks.ts`, etc. | Entirely new — not in main |
| Graduation flow (Phase 2) | `playerGraduations.ts`, etc. | Entirely new — not in main |
| `orgJoinRequests` matching fields | `schema.ts`, `orgJoinRequests.ts` | playerPhone, playerPostcode, matchedYouthIdentityId, etc. |

### How `findOrCreatePlayer` and `findPlayerMatchCandidates` Work Together

These two systems are **complementary, not redundant**:

```
User fills Add Player form
         ↓
[CLIENT] findPlayerMatchCandidates (query)
   → HIGH confidence → blocking modal → user decides
   → MEDIUM confidence → amber banner → user acknowledges
   → none → proceed
         ↓
User clicks "Add Player" / "Create New Profile"
         ↓
[SERVER] findOrCreatePlayer (mutation — safety net)
   → Tier 1: Exact name+DOB → returns existing if found
   → Tier 2: normalizedFirstName+DOB → returns existing if found
   → Tier 3: Irish alias → returns existing if found
   → No match → creates new record
         ↓
Returns { playerIdentityId, wasCreated }
Toast: "Player added" vs "Existing player enrolled"
```

The client dialog provides UX transparency; the server mutation ensures data integrity regardless of client-side state.

---

## Confirmed Decisions

| Decision | Choice |
|----------|--------|
| `findOrCreatePlayer` safety net | **Keep both** — client dialog (UX layer) + server mutation (safety net) work together |
| Admin Dedup UI | **Full UI + backend** — bring in stat card, merge dialog, and `playerIdentityMerges` audit table |
| Normalized names | **Adopt stored fields** — copy fields + index + migration; run backfill on dev after merge |
| Auth hardening | **Apply across all mutations** — copy `authHelpers.ts`, apply `requireAuthAndOrg` to all Phase 1–5 mutations |

---

## Conflict Map (File by File)

### CRITICAL — Requires manual resolution

| File | Conflict Description | Resolution |
|------|---------------------|-----------|
| `packages/backend/convex/schema.ts` | Main adds `playerIdentityMerges`, `normalizedFirstName/LastName` fields, `by_normalized_name_dob` index, `search_name` index. Our branch adds wellness tables, federationIds, join request matching fields, optional ageGroup/season. | Merge all additive additions. No field name collisions confirmed. |
| `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx` | Main adds sport selection, guardian linking, auth improvements, dedup stat card, merge dialog. Our branch adds matching dialog, email/phone/postcode form fields, HIGH/MEDIUM modal UX. | Full manual merge — take ALL additions from both. |

### ADDITIVE — Mostly safe, careful review

| File | Notes |
|------|-------|
| `packages/backend/convex/models/playerIdentities.ts` | Main adds 6 new functions + normalized fields. Our branch adds wellness queries. No function name collisions. |
| `packages/backend/convex/models/orgPlayerEnrollments.ts` | Our branch makes `ageGroup`/`season` optional. Verify main's mutations handle null safely. |
| `packages/backend/convex/models/orgJoinRequests.ts` | Our branch adds player matching fields + handler logic. Main has minor edits. Additive. |
| `packages/backend/convex/lib/authHelpers.ts` | New file from main — add to our branch as-is. |
| `packages/backend/convex/lib/matching/guardianMatcher.ts` | New file from main — add to our branch as-is. |

---

## Implementation Phases

### Phase 1: Git Merge + Conflict Inventory
```bash
git merge main
# Note all conflict markers
# Resolve schema.ts first (foundation for all other files)
```

### Phase 2: Schema Reconciliation (`schema.ts`)
Add to our branch's schema from main:
- `normalizedFirstName: v.optional(v.string())` on `playerIdentities`
- `normalizedLastName: v.optional(v.string())` on `playerIdentities`
- `.index("by_normalized_name_dob", ["normalizedLastName", "normalizedFirstName", "dateOfBirth"])`
- `.searchIndex("search_name", { searchField: "firstName", filterFields: [] })`
- `playerIdentityMerges` table (full definition from main)

Keep our additions: wellness tables, federationIds fields, join request fields, optional ageGroup/season.

### Phase 3: Backend — Bring in Main's Functions (`playerIdentities.ts`)
Add main's 6 functions (no conflicts with our existing functions):
- `findOrCreatePlayer` (mutation) — server-side safety net
- `checkForDuplicatePlayer` (query) — admin/backwards compat
- `findPotentialMatches` (query) — admin UI
- `findPotentialDuplicatesForOrg` (query) — dedup stat card
- `getMergePreview` (query) — merge dialog pre-validation
- `mergePlayerIdentities` (mutation) — 14-table reassignment

Also: set `normalizedFirstName`/`normalizedLastName` in `createPlayerIdentity` and `updatePlayerIdentity` (copy from main's versions).

### Phase 4: Enhance Our Matching Orchestrator (`playerMatching.ts`)
Update `findPlayerMatchesHandler` (Priority 1 fuzzy tier) to query via `by_normalized_name_dob` index instead of pure Levenshtein full scan:
- Currently: loads all org enrollments → Levenshtein O(n)
- After: queries `by_normalized_name_dob` index → O(log n) candidates → then applies multi-signal boosts

Multi-signal scoring (email/phone/postcode/address boosts, federation ID priority) is **retained unchanged** — this is our unique contribution.

### Phase 5: Auth Hardening
- Copy `authHelpers.ts` from main to `convex/lib/`
- Copy `guardianMatcher.ts` updates from main to `convex/lib/matching/`
- Apply `requireAuthAndOrg` to mutations in our Phase 1–5 additions:
  - `playerMatching.ts`
  - `playerGraduations.ts`
  - `playerHealthChecks.ts`
  - Any other Phase 1–5 mutations lacking auth checks

### Phase 6: Merge `players/page.tsx` (Hardest File)
Manual merge of the Add Player form — take ALL of:

**From main:**
- Sport selection dropdown
- Guardian linking with fuzzy match
- Auth checks on submissions
- `findOrCreatePlayer` call on create
- Contextual toast ("Player added" vs "Existing player enrolled")
- Dedup stat card (Potential Duplicates)
- Side-by-side merge dialog

**From our branch:**
- Email field (required)
- Phone field (PhoneInput, E.164)
- Postcode field
- Federation ID fields (FAI, IRFU, GAA)
- HIGH confidence blocking modal
- MEDIUM amber banner with re-submit to confirm
- `findPlayerMatchCandidates` call driving the dialog

### Phase 7: Update Join Request Approvals Page
Verify `admin/users/approvals/page.tsx` shows matched player name + confidence from our `matchedYouthIdentityId` / `matchedYouthName` / `matchedYouthConfidence` fields on join requests.

### Phase 8: Build Validation
```bash
npx -w packages/backend convex codegen
npm run check-types
npx ultracite fix && npm run check
npm run build
```

### Phase 9: Backfill Migration (dev)
```bash
# Run until hasMore: false
npx convex run migrations/backfillNormalizedNames:backfillNormalizedNames
```

### Phase 10: Manual UAT
1. Run full `docs/testing/MATCHING_SYSTEM_MANUAL_TESTS.md` (all 5 entry points)
2. Verify admin dedup stat card shows on players page
3. Verify merge dialog: side-by-side, swap Keep/Remove, affected records preview
4. Verify auth helpers block unauthenticated mutation calls
5. Verify join request approval screen shows matched player confidence

---

## Entry Point Coverage (Post-Merge Target)

| Entry Point | Location | Matching System | Auth Check |
|-------------|----------|-----------------|-----------|
| Add Player form | `admin/players/page.tsx` | `findPlayerMatchCandidates` (client) + `findOrCreatePlayer` (server safety net) | ✅ |
| Invite User (player role) | `admin/users/page.tsx` | `findPlayerMatchCandidates` | ✅ |
| CSV Bulk Import | `admin/player-import/page.tsx` | `findPlayerMatchCandidates` | ✅ |
| Join Request | `join/[orgId]/page.tsx` + `orgJoinRequests.ts` | `findBestPlayerMatchInternal` (server-side, auto) | ✅ |
| Admin Users → Create New | `admin/users/page.tsx` | `findPlayerMatchCandidates` | ✅ |

---

## Key Files

| File | Role in Merge |
|------|--------------|
| `packages/backend/convex/schema.ts` | Add main's fields/tables; keep our additions |
| `packages/backend/convex/models/playerMatching.ts` | Our unified orchestrator — keep, enhance with normalized index |
| `packages/backend/convex/models/playerIdentities.ts` | Add main's 6 functions + normalized field writes |
| `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx` | Full manual merge — both branches made major changes |
| `packages/backend/convex/lib/authHelpers.ts` | Copy from main |
| `packages/backend/convex/migrations/backfillNormalizedNames.ts` | Copy from main |
| `packages/backend/convex/lib/matching/guardianMatcher.ts` | Copy from main |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| `players/page.tsx` merge is complex (~1500 lines, both branches heavily modified) | Work section by section; form state → form UI → submit handlers → dialogs |
| `by_normalized_name_dob` index requires schema push before `findOrCreatePlayer` works | Schema changes deployed before any query/mutation changes |
| `ageGroup`/`season` optional change may break main's mutations | Audit all `orgPlayerEnrollments` consumers for null-safety |
| Auth helpers applied broadly may surface latent auth issues in dev | Test each entry point manually after applying |
