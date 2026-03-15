
## QA Verification - Issue #573 Player Identity Deduplication - 2026-02-26

### Summary

- **Issue:** #573 - Player Identity Deduplication (3-phase feature)
- **Branch:** hotfix/player-management-570
- **Acceptance Criteria:** 12/15 passed | 2 FAIL | 1 PARTIAL
- **Overall:** PARTIAL

---

### Acceptance Criteria Results

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Schema: `normalizedFirstName`, `normalizedLastName`, `mergedInto` on `playerIdentities` | PASS | schema.ts:294-298 |
| 2 | Schema: `by_normalized_name_dob` index on `playerIdentities` | PASS | schema.ts:306-310 |
| 3 | Schema: `playerIdentityMerges` table with `by_org` and `by_removeId` indexes | PASS | schema.ts:322-338 |
| 4 | `createPlayerIdentity` computes and stores normalized names | PASS | playerIdentities.ts:562-563 |
| 5 | `updatePlayerIdentity` recomputes normalized names on name change | PASS | playerIdentities.ts:608-614 |
| 6 | `findOrCreatePlayer` uses 3-tier matching (exact → normalized → Irish alias) | PASS | playerIdentities.ts:683-728 |
| 7 | `findPotentialMatches` query exists and returns matches with scores | PASS | playerIdentities.ts:994-1145 |
| 8 | `findPotentialDuplicatesForOrg` is admin/owner-only and returns groups | PASS | playerIdentities.ts:1169-1289 |
| 9 | `getMergePreview` shows affected records and conflicts | PASS | playerIdentities.ts:1301-1558 |
| 10 | `mergePlayerIdentities` handles records across tables | PARTIAL | See issue #1 below |
| 11 | Frontend: Match panel in Add Player dialog fires on first+last+DOB | PASS | page.tsx:267-283, 1605-1658 |
| 12 | Frontend: "Use This Player" button skips creation | PASS | page.tsx:460-475 |
| 13 | Frontend: Duplicate badge with amber styling | PASS | page.tsx:923-942 |
| 14 | Frontend: Merge dialog with side-by-side cards, swap, affected records, conflicts | PASS | page.tsx:2226-2390 |
| 15 | `mergePlayerIdentities` auth check is role-restricted | FAIL | See issue #2 below |

---

### Integration Issues Found

**CRITICAL:**

**Issue #1: `playerIdentityValidator` return type is missing new schema fields**

The `playerIdentityValidator` (line 30-49 in `playerIdentities.ts`) is used as the `returns` validator for `getPlayerById`, `getPlayerIdentity`, `findPlayerByNameAndDob`, `findPlayerByUserId`, `findPlayerByEmail`, `getPlayerForCurrentUser`, `searchPlayersByName`, and `checkForDuplicatePlayer`.

The validator does NOT include:
- `normalizedFirstName: v.optional(v.string())`
- `normalizedLastName: v.optional(v.string())`
- `mergedInto: v.optional(v.id("playerIdentities"))`
- `isActive: v.optional(v.boolean())`
- `claimedAt: v.optional(v.number())`
- `claimInvitedBy: v.optional(v.string())`
- `importSessionId: v.optional(v.id("importSessions"))`
- `externalIds: v.optional(v.record(v.string(), v.string()))`
- `lastSyncedAt: v.optional(v.number())`
- `lastSyncedData: v.optional(v.any())`
- `playerType: playerTypeValidator` — this IS included, but the schema marks it as required with no `v.optional()` wrapper, while older records may not have it

Convex enforces return validators strictly. If any record has a field that is in the DB but not in the validator, Convex will strip it (which is acceptable behavior for extra fields). However, more critically: if `isActive` or `mergedInto` fields are present on a stored record but absent from the validator, Convex will strip them from query results. This means `findPlayerByNameAndDob`, `getPlayerById`, etc. will silently drop `mergedInto` from responses.

This is a **type-correctness** issue: `findOrCreatePlayer` correctly checks `normalizedMatch.mergedInto === undefined` in the backend handler where it has direct DB access. But any frontend query result for `playerIdentityValidator`-returning functions would strip these fields.

**File:** `packages/backend/convex/models/playerIdentities.ts`, lines 30-49

**Issue #2: `mergePlayerIdentities` mutation has no role check**

`mergePlayerIdentities` calls `requireAuthAndOrg(ctx, args.organizationId)` (line 1575) which only verifies the caller is a member of the org — it does NOT restrict to admin/owner.

By contrast, `findPotentialDuplicatesForOrg` correctly checks:
```typescript
if (role !== "admin" && role !== "owner") {
  throw new Error("Only admins/owners can view duplicate detection");
}
```

The merge mutation (which is a destructive operation reassigning records across 14 tables and cannot be undone) should apply the same guard. A Coach or Member role could currently call this mutation directly.

**File:** `packages/backend/convex/models/playerIdentities.ts`, lines 1574-1576

**WARNING:**

**Issue #3: `playerAccessLogs` uses a compound index with single-field equality in merge**

The merge mutation queries `playerAccessLogs` using:
```typescript
.withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
```

The schema defines this index as:
```typescript
.index("by_player", ["playerIdentityId", "timestamp"])
```

Convex allows prefix queries on compound indexes (equating only the first field), so this will work correctly at runtime. However, it is worth noting this is a compound index, not a simple `by_playerIdentityId`. This is technically correct but a minor observation.

**File:** `packages/backend/convex/models/playerIdentities.ts`, line 1793 | `packages/backend/convex/schema.ts`, line 3120

**Issue #4: `getMergePreview` auth check does not enforce admin/owner role**

`getMergePreview` calls `requireAuthAndOrg` (line 1328) but does not check the returned role. Any org member (including a Coach) can call this query. Since it exposes information about player identities, this should restrict to admin/owner for consistency with `findPotentialDuplicatesForOrg`.

**File:** `packages/backend/convex/models/playerIdentities.ts`, line 1328

**Issue #5: N+1 pattern in `findPotentialDuplicatesForOrg`**

The batch fetch of player identities (lines 1198-1203) is a sequential loop over `playerIds.map(async id => ctx.db.get(id))` — but it is NOT using `Promise.all`. It uses a sequential `for` loop:
```typescript
for (const id of playerIds) {
  const player = await ctx.db.get(id);  // sequential awaits
```

While each individual `ctx.db.get()` is an indexed point lookup, sequential awaits for a large org could introduce latency. A `Promise.all(playerIds.map(...))` would be faster. This is a performance concern, not a correctness issue.

**File:** `packages/backend/convex/models/playerIdentities.ts`, lines 1198-1203

**Issue #6: `searchDiscoverablePlayers` uses `.take()` with `.filter()` pattern (pre-existing)**

At line 416, `searchDiscoverablePlayers` does `ctx.db.query("playerIdentities").take(limit * 10)` followed by `.filter()` in JavaScript. This is a pre-existing issue unrelated to Issue #573 but worth noting.

**Issue #7: Migration is an `internalMutation` — not directly runnable via `convex run`**

The `backfillNormalizedNames` mutation at `packages/backend/convex/migrations/backfillNormalizedNames.ts` is exported as `internalMutation`. The comment at the top says:
```
RUN: npx convex run migrations/backfillNormalizedNames:backfillNormalizedNames
```

`internalMutation` functions cannot be called via `npx convex run` from the CLI — only `mutation` and `action` functions can. This means the migration cannot be triggered as documented. It would need to be an `action` that calls an internal mutation, or changed to a public `mutation` with auth guards.

**File:** `packages/backend/convex/migrations/backfillNormalizedNames.ts`, line 20

**INFO:**

**Issue #8: `getTeamPlayersWithCrossOrgPassports` has N+1 queries (pre-existing)**

The function at line 249 uses `Promise.all(playerIdentityIds.map(async id => ...))` with nested queries inside the map. This is a pre-existing N+1 pattern unrelated to Issue #573.

---

### Table Coverage in `mergePlayerIdentities`

The mutation handles 14 tables. Verification against schema:

| # | Table | Index Used | Index Exists | Notes |
|---|-------|------------|--------------|-------|
| 1 | `orgPlayerEnrollments` | `by_playerIdentityId` | YES (schema:500) | Correct |
| 2 | `guardianPlayerLinks` | `by_player` | YES (schema:117) | Correct |
| 3 | `sportPassports` | `by_playerIdentityId` | YES (schema:605) | Correct |
| 4 | `skillAssessments` | `by_playerIdentityId` | YES (schema:696) | Correct |
| 5 | `teamPlayerIdentities` | `by_playerIdentityId` | YES (schema:806) | Correct |
| 6 | `passportGoals` | `by_playerIdentityId` | YES (schema:771) | Correct |
| 7 | `playerInjuries` | `by_playerIdentityId` | YES (schema:978) | Correct |
| 8 | `playerGraduations` | `by_player` | YES (schema:367) | Correct |
| 9 | `playerAccountLinks` | `by_playerIdentityId` | YES (schema:3088) | Correct |
| 10 | `playerAccessGrants` | `by_player` | YES (schema:3064) | Correct |
| 11 | `playerAccessLogs` | `by_player` (compound) | YES (schema:3120) | Prefix query, works |
| 12 | `passportShareConsents` | `by_player_and_status` | YES (schema:3642) | Correct |
| 13 | `passportShareRequests` | `by_player` | YES (schema:3719) | Correct |
| 14 | `playerEmergencyContacts` | `by_player` | YES (schema:541) | Correct |

All 14 table indexes are correctly named and exist in the schema.

---

### API Export Verification

The `_generated/api.d.ts` exports `"models/playerIdentities": typeof models_playerIdentities` (line 395), which means all named exports from `playerIdentities.ts` are accessible as `api.models.playerIdentities.*`. All new functions are properly exported:

- `api.models.playerIdentities.findPotentialMatches` - EXPORTED
- `api.models.playerIdentities.findPotentialDuplicatesForOrg` - EXPORTED
- `api.models.playerIdentities.getMergePreview` - EXPORTED
- `api.models.playerIdentities.mergePlayerIdentities` - EXPORTED

---

### Frontend Integration Verification

All frontend connections in `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx` are correctly wired:

- `useQuery(api.models.playerIdentities.findPotentialMatches, ...)` - line 273, uses "skip" guard correctly
- `useQuery(api.models.playerIdentities.findPotentialDuplicatesForOrg, ...)` - line 286, always-on query
- `useQuery(api.models.playerIdentities.getMergePreview, ...)` - line 292, uses "skip" guard correctly
- `useMutation(api.models.playerIdentities.mergePlayerIdentities)` - line 217

The match panel correctly fires when `firstName.length >= 2 && lastName.length >= 2 && !!dateOfBirth` (line 269-271), matching the spec.

The "Use This Player" button correctly sets `selectedExistingPlayer` (line 1646) and the `createPlayer` function correctly branches on it (line 460-475).

The merge dialog correctly shows side-by-side cards, swap button, affected records, conflicts, and blocking reason.

---

### Recommended Fixes (Priority Order)

**Fix 1 (CRITICAL): Add role check to `mergePlayerIdentities`**

In `packages/backend/convex/models/playerIdentities.ts` at line 1575, change:
```typescript
const { userId } = await requireAuthAndOrg(ctx, args.organizationId);
```
to:
```typescript
const { userId, role } = await requireAuthAndOrg(ctx, args.organizationId);
if (role !== "admin" && role !== "owner") {
  throw new Error("Only admins/owners can merge player identities");
}
```

**Fix 2 (WARNING): Fix migration to be callable from CLI**

Change `internalMutation` to `mutation` with an auth guard in `packages/backend/convex/migrations/backfillNormalizedNames.ts`, or wrap it in an action. Without this, the backfill cannot be run against existing data, so existing `playerIdentities` records will have no `normalizedFirstName`/`normalizedLastName`, breaking the normalized matching tier for all pre-existing players until the migration runs.

**Fix 3 (WARNING): Add role check to `getMergePreview`**

Same pattern as Fix 1 — add `if (role !== "admin" && role !== "owner")` check.

**Fix 4 (INFO): Add missing fields to `playerIdentityValidator` or use `v.any()`**

To avoid potential issues with Convex's strict return validation, add the new fields as optional to the validator, or accept that the validator acts as a projection (Convex strips unknown fields from stored records rather than throwing).

**Fix 5 (INFO): Use `Promise.all` in `findPotentialDuplicatesForOrg` batch fetch**

Replace the sequential `for` loop fetching players with `await Promise.all(playerIds.map(id => ctx.db.get(id)))` for better performance on large orgs.

---

### Visual Verification

Not performed — no dev browser session active. The frontend wiring is confirmed by static code analysis.

---
*QA Verification completed 2026-02-26*

## Auto Quality Check - 2026-02-26 15:53:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 15:53:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 15:53:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 15:53:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 15:53:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 15:53:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 15:54:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 15:54:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 15:54:15
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 15:54:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 15:54:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 15:54:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 15:55:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/backfillNormalizedNames.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-26 15:55:22
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/backfillNormalizedNames.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-26 15:55:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 15:55:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 15:55:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 15:56:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 15:56:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 15:56:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 16:07:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 16:07:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 16:07:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 19:29:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/backfillNormalizedNames.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-26 19:29:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/backfillNormalizedNames.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-26 19:39:15
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 19:39:15
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 19:39:15
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 19:41:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 19:41:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 19:41:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 19:49:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 19:49:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 19:49:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-26 19:50:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-26 19:50:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-26 19:50:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:20:41
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:20:41
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:20:41
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:22:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:22:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:22:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:22:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:22:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:22:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:22:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:22:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:22:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:23:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:23:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:23:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:24:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:24:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:24:43
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:24:43
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:26:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:26:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:26:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:26:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:26:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:26:55
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:27:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:27:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:27:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:28:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:28:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:28:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:28:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:28:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:28:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/backfillNormalizedNames.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:29:27
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:29:27
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:29:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:29:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:30:32
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:30:32
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:30:33
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:30:33
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:30:55
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:30:55
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:30:55
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:31:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:31:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:31:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:35:12
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:35:12
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:35:12
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:35:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:35:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:35:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:36:06
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:36:06
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:36:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:36:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:37:03
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:37:03
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:37:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:37:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:37:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:37:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:42:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:42:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:42:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:42:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:42:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:43:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:43:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:43:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:44:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:44:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:44:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:49:10
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:49:10
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:49:10
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:49:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:49:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:49:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:49:52
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 08:49:52
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:49:52
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 08:51:06
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:51:06
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 08:51:23
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 08:51:23
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 09:17:13
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 09:17:13
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 09:17:26
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 09:17:26
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/matching/guardianMatcher.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 09:17:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 09:17:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 09:17:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 11:00:55
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 13:53:18
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 13:56:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 14:07:41
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 14:08:10
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 14:08:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 14:29:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:29:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:30:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:30:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:31:16
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:31:16
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:31:44
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:31:44
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:32:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:32:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:35:16
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:35:16
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:35:43
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:35:43
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:35:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:35:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:36:25
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:36:25
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 14:45:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 14:45:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:46:25
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 14:46:25
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:46:56
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 14:46:56
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:47:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 14:47:11
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 14:48:17
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 14:48:17
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 15:27:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 15:28:28
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 15:43:04
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 15:51:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 15:51:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 15:51:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 16:01:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:14:25
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:14:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:15:04
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:15:28
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:15:51
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:30:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:32:34
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:34:10
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 16:34:35
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 17:06:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 17:16:20
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 17:22:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 17:22:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 17:23:23
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 18:36:13
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 18:39:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 18:39:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 18:39:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-27 18:40:55
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 18:47:07
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 18:47:07
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 18:47:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/betterAuth/userFunctions.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 18:47:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/betterAuth/userFunctions.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 18:48:09
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 18:48:46
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 18:49:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 18:49:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:01:34
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:02:04
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:04:25
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:27:04
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:29:13
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/backfillNormalizedNames.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 20:29:41
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 20:29:41
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 20:35:38
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:36:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:36:15
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:36:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:37:15
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:37:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 20:39:19
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 20:39:19
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 20:42:00
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/migrations/verifyExistingUsers.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-27 20:44:32
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 20:44:32
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 20:45:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 20:45:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 20:45:20
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 20:45:20
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 21:13:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 21:14:17
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-27 21:17:12
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 21:17:12
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 21:17:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 21:17:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 21:17:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 21:17:48
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 21:18:32
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 21:18:32
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-27 21:22:00
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-27 21:22:00
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:29:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-02-28 09:30:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 09:30:40
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:30:57
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/invitations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:30:57
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/invitations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 09:31:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:31:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 09:31:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 09:31:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:31:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 09:34:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:34:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 09:59:36
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:59:36
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 09:59:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:59:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 09:59:56
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 09:59:56
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:00:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:00:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:00:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:00:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:01:28
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:01:28
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:01:28
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:01:52
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:01:52
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:01:52
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:02:23
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:02:24
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:02:24
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:02:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:02:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:02:49
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:03:09
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:03:09
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:03:09
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:03:39
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:03:39
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:03:39
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:03:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:03:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:03:54
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:04:57
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:04:57
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:04:57
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:04:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:04:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:04:58
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:04:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:04:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:04:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:07:34
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:07:34
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:07:34
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:07:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:07:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:07:47
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-28 10:08:03
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-28 10:08:03
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-28 10:08:03
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-01 21:25:29
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-01 21:29:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-01 21:29:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-01 21:30:20
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-01 21:30:20
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-01 21:30:20
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-02 10:31:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/onboarding.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-02 10:31:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/onboarding.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-02 10:31:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/onboarding.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-02 10:32:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-02 10:32:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-02 10:33:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-02 10:33:14
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/users.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 08:39:03
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/emergencyContacts.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 08:52:40
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 08:52:40
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 08:52:40
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:37:52
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:37:52
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:37:52
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:38:26
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:38:26
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:38:26
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:38:35
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:38:35
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:38:35
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:42:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:42:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:42:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:42:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:42:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:42:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:47:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:47:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:47:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 12:48:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 12:48:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 12:48:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-06 13:16:02
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 13:16:02
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 13:16:02
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-06 13:16:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-06 13:16:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-06 13:16:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-08 19:35:30
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-08 19:35:30
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-08 19:36:00
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-08 19:36:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-08 19:36:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-08 19:36:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-08 19:37:04
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-08 19:37:04
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-08 19:39:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-08 19:39:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-08 19:39:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-08 19:39:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-09 20:58:52
### File: /Users/jkobrien/code/PDP/packages/backend/convex/scripts/seedDemoClub.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:00:41
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:00:48
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:10:58
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:11:14
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:11:24
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:18:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 21:18:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:18:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 21:18:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:19:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 21:19:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 21:19:27
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-09 21:42:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 22:06:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 22:06:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 22:06:52
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 22:06:52
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 22:37:41
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 22:44:17
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 23:04:31
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 23:19:36
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 23:19:36
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-09 23:19:50
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-09 23:19:50
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 10:32:42
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachTrustLevels.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 10:32:57
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachTrustLevels.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:16:43
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:16:43
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:19:09
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:19:09
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:33:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:33:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:33:41
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:33:41
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/sportPassports.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:35:57
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:35:57
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:39:24
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerImport.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:39:24
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerImport.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:39:24
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerImport.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 11:42:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:42:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:46:22
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:46:22
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:53:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:53:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:56:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:56:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:56:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:56:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:57:40
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:57:40
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:57:48
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:57:48
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:57:55
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:57:55
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 11:58:17
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 11:58:17
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:04:00
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:04:00
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:04:00
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:04:58
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:04:58
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:04:58
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:06:47
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:06:47
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:06:47
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:07:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:07:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:07:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:07:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:07:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:07:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:07:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:07:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:07:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:10:12
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:10:12
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:10:12
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:10:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:10:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:10:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:13:47
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:13:47
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:13:47
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:14:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:14:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:14:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:16:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:16:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:16:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:16:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:16:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:16:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportSharing.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:26:01
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/adultPlayers.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:26:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/adultPlayers.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:26:43
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:26:43
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:26:44
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:26:44
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:26:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:26:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerMatching.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:28:37
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:28:37
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:28:38
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:28:38
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:28:38
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:28:39
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerMatching.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:29:07
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 12:29:07
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:29:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:29:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-10 12:29:18
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 12:29:23
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerMatching.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 13:04:12
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/passportGoals.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 13:45:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 13:45:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 13:45:21
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-10 13:45:21
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-10 13:45:21
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`



## Auto Quality Check - 2026-03-11 21:06:25
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`

## Auto Quality Check - 2026-03-11 21:06:25
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`



## Auto Quality Check - 2026-03-11 21:06:25
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`

## Auto Quality Check - 2026-03-11 21:06:25
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:06:25
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:06:37
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`



## Auto Quality Check - 2026-03-11 21:06:37
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`

## Auto Quality Check - 2026-03-11 21:06:37
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`



## Auto Quality Check - 2026-03-11 21:06:37
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup

## Auto Quality Check - 2026-03-11 21:06:37
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:06:55
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:06:55
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:06:56
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:07:25
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:07:25
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:07:25
### File: /home/user/PDP/packages/backend/convex/models/players.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:07:26
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:07:26
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:07:53
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:07:53
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:07:53
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:07:54
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:07:54
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:07:54
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:07:58
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:07:58
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:08:22
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:08:22
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:08:39
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:08:40
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:09:46
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:09:56
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:09:56
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:09:56
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:10:26
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:10:33
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:10:41
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:10:51
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:08
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:08
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:15
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:15
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:15
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:15
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:16
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:16
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:19
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:19
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:19
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:19
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:20
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:20
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:24
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:24
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:30
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:30
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:30
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:30
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:21:31
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:21:31
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:22:45
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:22:45
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:22:59
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:22:59
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:07
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:08
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:08
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:10
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:10
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:10
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:10
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:11
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:11
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:11
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:11
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:12
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:12
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:20
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:29
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:29
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:38
### File: /home/user/PDP/packages/backend/convex/models/playerEmergencyContacts.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-11 21:23:38
### File: /home/user/PDP/packages/backend/convex/models/medicalProfiles.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:38
### File: /home/user/PDP/packages/backend/convex/models/medicalProfiles.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:23:39
### File: /home/user/PDP/packages/backend/convex/models/skillAssessments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:48
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:48
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:53
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:23:53
### File: /home/user/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:58
### File: /home/user/PDP/packages/backend/convex/models/notifications.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:58
### File: /home/user/PDP/packages/backend/convex/models/invitations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:23:58
### File: /home/user/PDP/packages/backend/convex/models/invitations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:24:08
### File: /home/user/PDP/packages/backend/convex/models/childDataErasureRequests.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:08
### File: /home/user/PDP/packages/backend/convex/models/childDataErasureRequests.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:24:20
### File: /home/user/PDP/packages/backend/convex/models/coachParentMessages.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:24:20
### File: /home/user/PDP/packages/backend/convex/models/coachParentMessages.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:24:20
### File: /home/user/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:24:20
### File: /home/user/PDP/packages/backend/convex/models/coachParentSummaries.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:24:26
### File: /home/user/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:26
### File: /home/user/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:24:26
### File: /home/user/PDP/packages/backend/convex/models/teams.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:26
### File: /home/user/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:24:27
### File: /home/user/PDP/packages/backend/convex/models/teams.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-11 21:24:27
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:27
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:24:27
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:24:37
### File: /home/user/PDP/packages/backend/convex/models/childDataErasureRequests.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:37
### File: /home/user/PDP/packages/backend/convex/models/childDataErasureRequests.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:24:42
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:42
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:24:58
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:24:58
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:08
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:09
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:09
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:17
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:22
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:22
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:31
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:31
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:31
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:25:31
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:31
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:32
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:25:34
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:41
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:43
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:43
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:43
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:25:43
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:44
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:25:45
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:53
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:53
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:25:53
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:25:53
### File: /home/user/PDP/packages/backend/convex/models/playerIdentities.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:26:06
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:26:06
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:26:09
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:26:09
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:26:09
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:26:13
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:26:13
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:26:13
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:26:41
### File: /home/user/PDP/packages/backend/convex/models/invitations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:26:41
### File: /home/user/PDP/packages/backend/convex/models/invitations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-11 21:26:52
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:26:52
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:27:19
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:27:33
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:27:46
### File: /home/user/PDP/packages/backend/convex/models/guardianManagement.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:28:46
### File: /home/user/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:28:46
### File: /home/user/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:29:23
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:29:23
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:31:31
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:31:31
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:32:28
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-11 21:32:28
### File: /home/user/PDP/packages/backend/convex/models/orgPlayerEnrollments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:32:33
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-11 21:35:23
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 19:49:12
### File: /home/user/PDP/packages/backend/convex/models/skillBenchmarks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 19:49:12
### File: /home/user/PDP/packages/backend/convex/models/skillBenchmarks.ts
## Auto Quality Check - 2026-03-12 07:41:57
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 07:42:03
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 07:42:51
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 07:42:58
### File: /home/user/PDP/packages/backend/convex/README.md

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 19:49:12
### File: /home/user/PDP/packages/backend/convex/models/skillAssessments.ts
## Auto Quality Check - 2026-03-12 07:43:56
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 07:57:57
### File: /home/user/PDP/packages/backend/convex/scripts/seed/orchestrator.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 19:49:17
### File: /home/user/PDP/packages/backend/convex/lib/import/benchmarkApplicator.ts
## Auto Quality Check - 2026-03-12 07:58:00
### File: /home/user/PDP/packages/backend/convex/scripts/seed/passports.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 19:49:38
## Auto Quality Check - 2026-03-12 07:58:01
### File: /home/user/PDP/packages/backend/convex/scripts/fullReset.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-12 07:58:01
### File: /home/user/PDP/packages/backend/convex/scripts/fullReset.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 07:58:06
### File: /home/user/PDP/packages/backend/convex/scripts/fullResetOptimized.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-12 07:58:06
### File: /home/user/PDP/packages/backend/convex/scripts/fullResetOptimized.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 07:58:06
### File: /home/user/PDP/packages/backend/convex/scripts/stagedReset.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 07:58:06
### File: /home/user/PDP/packages/backend/convex/scripts/deleteAllPlayers.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-12 07:58:07
### File: /home/user/PDP/packages/backend/convex/scripts/deleteAllPlayers.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 07:58:07
### File: /home/user/PDP/packages/backend/convex/scripts/deleteUser.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-12 07:58:07
### File: /home/user/PDP/packages/backend/convex/scripts/deleteUser.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 07:58:07
### File: /home/user/PDP/packages/backend/convex/scripts/deleteUser.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 07:58:07
### File: /home/user/PDP/packages/backend/convex/scripts/deleteUser.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 07:58:12
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 07:58:26
### File: /home/user/PDP/packages/backend/convex/migrations/importBenchmarksCLI.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 19:49:47
### File: /home/user/PDP/packages/backend/convex/models/referenceData.ts
## Auto Quality Check - 2026-03-12 08:07:21
### File: /home/user/PDP/packages/backend/convex/seed/defaultRateLimits.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 08:07:21
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 08:07:55
### File: /home/user/PDP/packages/backend/convex/models/aiServiceHealth.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 08:08:06
### File: /home/user/PDP/packages/backend/convex/models/voicePipelineMetrics.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 08:08:06
### File: /home/user/PDP/packages/backend/convex/models/voicePipelineAlerts.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 08:09:48
### File: /home/user/PDP/packages/backend/convex/seed/defaultRateLimits.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-03-12 08:09:49
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 08:09:58
### File: /home/user/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Auto Quality Check - 2026-03-12 08:10:14
### File: /home/user/PDP/packages/backend/convex/models/voicePipelineMetrics.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 08:10:14
### File: /home/user/PDP/packages/backend/convex/models/voicePipelineEvents.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-12 08:10:15
### File: /home/user/PDP/packages/backend/convex/models/voicePipelineAlerts.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 08:58:24
### File: /home/user/PDP/packages/backend/convex/models/parentChildAuthorizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 08:58:43
### File: /home/user/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 08:58:43
### File: /home/user/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 08:58:44
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 08:58:44
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 08:58:44
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 08:58:48
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 08:58:48
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 08:58:48
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 09:00:31
### File: /home/user/PDP/packages/backend/convex/models/guardianIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:31
### File: /home/user/PDP/packages/backend/convex/models/guardianIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:32
### File: /home/user/PDP/packages/backend/convex/models/guardianPlayerLinks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:37
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:37
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:37
### File: /home/user/PDP/packages/backend/convex/models/members.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 09:00:42
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:42
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:42
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 09:00:47
### File: /home/user/PDP/packages/backend/convex/models/organizationScraper.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:48
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:48
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:48
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 09:00:58
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:58
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:58
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 09:00:59
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:59
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:59
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-03-15 09:00:59
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-03-15 09:00:59
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-03-15 09:00:59
### File: /home/user/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup

