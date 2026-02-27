## QA Verification — Phase 5 Player Portal Remaining Sections — 2026-02-26

### Summary

- **Branch:** `ralph/adult-player-phase5-portal-sections`
- **Stories:** US-P5-001 through US-P5-006 + US-P5-UAT
- **Overall:** PARTIAL — 4 CRITICALs, 8 WARNINGs
- **Type check (new errors introduced by Phase 5):** PASS — pre-existing errors only in `coachParentSummaries.ts` and `diagnoseSafeGetAuthUser.ts`

---

### Acceptance Criteria Results

| Story | Criterion (abbreviated) | Status |
|-------|------------------------|--------|
| US-P5-001 | Progress page created at correct path | PASS |
| US-P5-001 | Fetches passports via `getPassportsForPlayer` | PASS |
| US-P5-001 | Sport tab/pill switcher for multiple sports | PASS |
| US-P5-001 | Read-only skill ratings display | PASS |
| US-P5-001 | Trend arrows (up/down/same) per skill | PASS |
| US-P5-001 | Assessment history timeline, newest first | PASS |
| US-P5-001 | No edit buttons or inputs | PASS |
| US-P5-001 | "Ratings are set by your coach" label | PASS |
| US-P5-001 | Player can add and save own notes | PASS |
| US-P5-001 | Empty state message | PASS |
| US-P5-001 | Mobile responsive | PASS |
| US-P5-002 | Sharing page created at correct path | PASS |
| US-P5-002 | Player can enable/disable sharing toggle | PARTIAL — no proactive "enable" toggle |
| US-P5-002 | Player can approve/deny sharing enquiries | PASS |
| US-P5-002 | Sharing ownership transfer on claimPlayerAccount | FAIL — CRITICAL #1 |
| US-P5-002 | Guardian-enabled sharing visible to player | PASS |
| US-P5-002 | Empty state message | PASS |
| US-P5-003 | Injuries page created at correct path | PASS |
| US-P5-003 | Fetches injuries via `getInjuriesForPlayer` | PASS |
| US-P5-003 | Shows body part, type, severity, date, status | PASS |
| US-P5-003 | "Reported by coach" badge | PASS |
| US-P5-003 | "You reported this" badge in player view | PASS |
| US-P5-003 | Active injury shown prominently at top | PASS |
| US-P5-003 | Report New Injury dialog with all fields | PASS |
| US-P5-003 | Injury created with `reportedByRole: 'player'` | PASS |
| US-P5-003 | `reportedByRole` field exists in schema | PASS |
| US-P5-003 | Player-reported injury in coach view with badge | FAIL — CRITICAL #2 |
| US-P5-003 | Empty state | PASS |
| US-P5-004 | Feedback page created at correct path | PASS |
| US-P5-004 | New `getCoachFeedbackForPlayer` query added | PASS |
| US-P5-004 | Returns ONLY publicSummary, never privateInsight | PASS |
| US-P5-004 | Filtered to approved/auto_approved/delivered/viewed statuses | PASS |
| US-P5-004 | Chronological feed, newest first | PASS |
| US-P5-004 | Coach name, date, summary text, sensitivity badge | PASS |
| US-P5-004 | Player can acknowledge feedback | PASS |
| US-P5-004 | Unacknowledged items shown with "New" badge | PASS |
| US-P5-004 | privateInsight never appears on page | PASS |
| US-P5-004 | All sensitivity categories (normal/injury/behavior) visible | PASS |
| US-P5-004 | Empty state message | PASS |
| US-P5-005 | "Download My Data" button in player settings | PASS |
| US-P5-005 | Section clearly labelled "Privacy & Data" with PRD text | PARTIAL — title is "Your Data" |
| US-P5-005 | Confirmation dialog with "Download JSON" + "Download CSV" | FAIL — CRITICAL #3 |
| US-P5-005 | Backend exports all 9 data domains | PASS |
| US-P5-005 | cyclePhase gated by active cycle tracking consent | PASS |
| US-P5-005 | privateInsight NEVER included in export | PASS |
| US-P5-005 | Sharing records include org name (not just ID) | FAIL — CRITICAL #4 |
| US-P5-005 | Metadata includes organizationName | FAIL — CRITICAL #4 |
| US-P5-005 | Rate limiting: max 1 export per 24h | PARTIAL — localStorage only, bypassable |
| US-P5-005 | Browser download without navigating away | PASS |
| US-P5-005 | Mobile download works | PASS |
| US-P5-006 | Radar chart EXTENDS progress page (not new page) | PASS |
| US-P5-006 | Chart/List toggle with localStorage persistence | PASS |
| US-P5-006 | Default view: Chart | PASS |
| US-P5-006 | PolarGrid imported and rendered | FAIL — WARNING #4 |
| US-P5-006 | Axes per dimension, values from most recent assessment | PASS |
| US-P5-006 | Fill --org-primary at 30% opacity | PASS |
| US-P5-006 | PolarRadiusAxis domain [0,10] | PASS |
| US-P5-006 | Tooltip showing dimension + score | PASS |
| US-P5-006 | ResponsiveContainer width=100% height=300 | PASS |
| US-P5-006 | Assessment date label below chart | PASS |
| US-P5-006 | Ghost radar for previous assessment comparison | PASS |
| US-P5-006 | Legend showing current/previous dates | PASS |
| US-P5-006 | Empty state shown instead of empty chart | PASS |
| US-P5-006 | aria-label on chart wrapper | PASS |
| US-P5-UAT | Test file created | PASS |
| US-P5-UAT | Tests for all four portal sections | PASS |
| US-P5-UAT | Test: no edit inputs (range sliders) on progress page | PASS |
| US-P5-UAT | Test: player notes textarea present | PASS |
| US-P5-UAT | Test: Download My Data button present in settings | PASS |
| US-P5-UAT | Test: exported JSON does not contain privateInsight | PASS |
| US-P5-UAT | Test: second download within 24h shows rate-limit message | MISSING |

---

### CRITICAL Issues (Broken/Missing Functionality)

---

**CRITICAL #1 — Sharing ownership transfer not implemented in `claimPlayerAccount`**

File: `packages/backend/convex/models/playerGraduations.ts:546`

The PRD (US-P5-002 AC) requires: "when claimPlayerAccount succeeds, update passportSharing records for this playerIdentityId to transfer ownership to the player's userId, revoking guardian access." The PRD also says: "If ownership transfer is not already in Phase 2: add a mutation `transferPassportSharingOwnership(playerIdentityId, newUserId)` and call it as part of the claim flow."

`claimPlayerAccount` (lines 546-699) patches `playerIdentity`, graduation record, and verificationPin, then sends notifications. There is no passport sharing transfer. A global grep for `transferPassportSharingOwnership` across all backend files returns zero results — this function was never created.

Fix: Add `export const transferPassportSharingOwnership = mutation({...})` in `packages/backend/convex/models/passportSharing.ts` that updates any `passportShareConsents` records for the given `playerIdentityId` to set `ownedByUserId` (or equivalent ownership field) to the player's new userId. Then call it inside `claimPlayerAccount` in `playerGraduations.ts`.

---

**CRITICAL #2 — Coach injury view does NOT show "Player-reported" badge**

File: `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx`

The PRD (US-P5-003 AC) requires: "Player-reported injury appears in coach injury view for that player with 'Player-reported' badge."

The injury card renders severity and status badges only (lines 624-633 and 790-799). The field `reportedByRole` is accessed nowhere in this file except at line 309 where the coach hardcodes their own role on submission. A coach cannot distinguish player self-reported injuries from coach-entered injuries.

The `injuryValidator` in `playerInjuries.ts:129` already includes `reportedByRole: v.optional(reportedByRoleValidator)` — no backend change is needed.

Fix: In `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx`, add a conditional badge in the injury card (both the summary list view around line 510 and the detail view around line 624):
```tsx
{injury.reportedByRole === "player" && (
  <Badge variant="outline" className="text-xs">Player-reported</Badge>
)}
```

---

**CRITICAL #3 — No confirmation dialog; "Download CSV" format missing entirely**

File: `apps/web/src/app/orgs/[orgId]/player/settings/page.tsx`

The PRD (US-P5-005 AC) requires: "On click: show a confirmation dialog listing what will be included in the export. Two buttons: 'Download JSON' and 'Download CSV'. Player chooses format."

The current implementation has a single "Download" button (line 572-589) that immediately triggers a JSON download. There is no confirmation dialog and no CSV option.

The CSV backend format: "a ZIP file containing one CSV per domain" is also entirely absent from `packages/backend/convex/models/playerDataExport.ts` — the backend only returns JSON.

UAT test PP5-022 checks for a "Download" button, not a two-button dialog, so the test would pass even though the feature is incomplete.

The PRD states this is a legal requirement under GDPR Article 20.

Fix:
1. Add an `AlertDialog` in `settings/page.tsx` that opens on first click, lists the included data domains, and offers "Download JSON" and "Download CSV" buttons.
2. Add CSV+ZIP export capability to `playerDataExport.ts` (or a new Convex action).

---

**CRITICAL #4 — Export uses `organizationId` (internal ID) instead of `organizationName`; sharingRecords omit org name**

File: `packages/backend/convex/models/playerDataExport.ts`

The PRD (US-P5-005 AC) specifies:
- Metadata: `{ exportedAt: ISO timestamp, playerName, organizationName, gdprBasis }` — note `organizationName` not `organizationId`
- Sharing domain: "org name, enabled status, approvedAt/revokedAt"

Current implementation:
- Line 229: `organizationId: args.organizationId` — internal Better Auth ID, not human-readable
- Lines 182-188: `sharingRecords` maps to `{ receivingOrgId, status, consentedAt, expiresAt, revokedAt }` — uses org ID, not name

Fix in `packages/backend/convex/models/playerDataExport.ts`:
1. After fetching `playerIdentity`, look up the organization name:
   ```typescript
   const orgResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
     model: "organization",
     paginationOpts: { cursor: null, numItems: 1 },
     where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
   });
   const organizationName = orgResult.page[0]?.name ?? args.organizationId;
   ```
2. Use `organizationName` in metadata instead of `organizationId`.
3. For each sharing consent, look up the receiving org name and replace `receivingOrgId` with `receivingOrgName` in the export.

---

### WARNING Issues (Quality/Pattern Problems)

---

**WARNING #1 — Sharing page may be missing a proactive "enable sharing" toggle**

File: `apps/web/src/app/orgs/[orgId]/player/sharing/page.tsx`

The PRD says to "mirror the existing parent sharing UI." The page handles approving/declining incoming requests and revoking active consents, but there is no control to proactively enable sharing visibility.

Action: Compare against `apps/web/src/app/orgs/[orgId]/parents/sharing/page.tsx` to determine if a global enable toggle exists there. If it does, the player sharing page is missing this control.

---

**WARNING #2 — Section heading and explanatory text differ from PRD**

File: `apps/web/src/app/orgs/[orgId]/player/settings/page.tsx:552-570`

Card title is "Your Data" (not "Privacy & Data"). Explanatory text does not match PRD: "Under GDPR Article 20, you have the right to receive all data we hold about you in a portable format. Your export will be ready instantly."

UAT test PP5-023 matches `privacy.*data|data.*privacy` — neither "Your Data" nor "Download My Data" will match, causing a false pass or false fail depending on regex engine.

---

**WARNING #3 — Rate limiting is localStorage-only and bypassable**

File: `apps/web/src/app/orgs/[orgId]/player/settings/page.tsx:54-62`

The 24-hour export rate limit is enforced only in the browser via `localStorage.getItem("gdpr_export_${playerId}")`. Bypassed by: clearing localStorage, incognito mode, or calling the Convex query directly. For a GDPR data assembly that could fetch hundreds of records, server-side enforcement is recommended.

Also: the UAT test for "second download within 24h shows rate-limit message" (PRD US-P5-UAT AC) is NOT implemented in `player-portal-phase5.spec.ts`.

---

**WARNING #4 — `PolarGrid` not imported or rendered in radar chart**

File: `apps/web/src/app/orgs/[orgId]/player/progress/page.tsx:17-24`

The PRD (US-P5-006 AC) explicitly lists `PolarGrid` as a required recharts import. It is absent from the import statement and not rendered as a `<PolarGrid />` child of `<RadarChart>`. The chart renders without background grid lines, making it harder to read axis values.

Fix: Add `PolarGrid` to the recharts import list and add `<PolarGrid />` inside the `<RadarChart>` element.

---

**WARNING #5 — Missing UAT test for rate-limit second download**

File: `apps/web/uat/tests/player-portal-phase5.spec.ts`

The PRD (US-P5-UAT AC) lists: "Test: second download request within 24h shows rate-limit message." This test does not exist in the spec file. Since rate limiting is localStorage-based, the test is straightforward: set `localStorage.setItem("gdpr_export_${id}", (Date.now() - 1000).toString())` before clicking, then verify the toast message.

---

**WARNING #6 — N+1 sequential coach name lookups in `getCoachFeedbackForPlayer`**

File: `packages/backend/convex/models/coachParentSummaries.ts:1951-1966`

Coach names are fetched in a `for` loop with sequential `await`:
```typescript
for (const coachId of coachIds) {
  const userResult = await ctx.runQuery(components.betterAuth.adapter.findOne, ...);
```

While coach IDs are de-duplicated first, sequential awaits violate the "batch fetch, never N+1" pattern. Fix with `Promise.all`:
```typescript
const coachResults = await Promise.all(
  coachIds.map((id) =>
    ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: id, operator: "eq" }],
    })
  )
);
```

---

**WARNING #7 — `updateNotes` mutation has no auth or ownership check**

File: `packages/backend/convex/models/sportPassports.ts:363-394`

`updateNotes` does not authenticate the caller or verify they own the passport. Any Convex-authenticated user who knows a `passportId` can modify `coachNotes`, `parentNotes`, or `playerNotes` on any passport. This pre-existed Phase 5 but Phase 5 exposes it more widely via the player portal.

---

**WARNING #8 — Informational: GDPR export uses a `query` (cached/reactive) instead of an `action` (one-shot)**

File: `packages/backend/convex/models/playerDataExport.ts:14`

`assemblePlayerDataExport` is a `query`. The frontend uses a `triggered` flag pattern with `useQuery` to fire it on demand. This is functional but unconventional — if the component unmounts mid-fetch, the download will silently not happen. Consider converting to a `mutation` or `action` returning the data in a future iteration.

---

### Integration Verification — All PASS

- `player/progress/page.tsx` — linked in sidebar as "My Progress"
- `player/injuries/page.tsx` — linked in sidebar as "My Injuries"
- `player/feedback/page.tsx` — linked in sidebar as "Coach Feedback"
- `player/sharing/page.tsx` — linked in sidebar as "Passport Sharing"
- `player/settings/page.tsx` — linked in sidebar as "Settings"
- All new backend functions confirmed in `packages/backend/convex/_generated/api.d.ts`
- `reportedByRole` confirmed in `schema.ts:947` with correct values including "player"
- `createdAt` confirmed on `coachParentSummaries` table in `schema.ts:2362`
- Pre-existing type errors in `coachParentSummaries.ts:787,798` and `diagnoseSafeGetAuthUser.ts:29` confirmed on `main` — NOT introduced by Phase 5

---

### Fix Priority Order

1. **CRITICAL #2** — `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx` — add "Player-reported" badge (2-line fix, high visibility)
2. **CRITICAL #1** — `packages/backend/convex/models/passportSharing.ts` + `playerGraduations.ts` — sharing ownership transfer on account claim
3. **CRITICAL #3** — `settings/page.tsx` + `playerDataExport.ts` — confirmation dialog and CSV format
4. **CRITICAL #4** — `packages/backend/convex/models/playerDataExport.ts` — org name lookup in metadata and sharingRecords
5. **WARNING #4** — `apps/web/src/app/orgs/[orgId]/player/progress/page.tsx` — add `PolarGrid` to recharts import
6. **WARNING #1** — Compare player sharing page against parent sharing page for missing toggle
7. **WARNING #6** — `coachParentSummaries.ts:1951-1966` — parallelize coach name lookups
8. **WARNING #2** — Update section title and explanatory text in settings
9. **WARNING #3 + #5** — Rate limiting hardening + missing UAT rate-limit test
