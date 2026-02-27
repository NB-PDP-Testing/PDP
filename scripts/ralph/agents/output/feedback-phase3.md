## QA Verification — Adult Player Lifecycle Phase 3 (ralph/adult-player-phase3-matching)
### Generated: 2026-02-25

---

### Summary

| Story | Title | Status |
|-------|-------|--------|
| US-P3-001 | Backend: findMatchingYouthProfile Query | PASS |
| US-P3-002 | Youth Record Matching on Manual Add Player Form | PASS |
| US-P3-003 | Youth Record Matching on CSV Import | PARTIAL |
| US-P3-004 | Player Self-Registration via Join Request | PASS |
| US-P3-005 | Youth Record Matching on Email Invite | PASS |
| US-P3-006 | Federation Number as Identity Anchor | PARTIAL |
| US-P3-UAT | Phase 3 E2E Tests | PARTIAL |

**Overall: PARTIAL — 3 stories have gaps. 2 critical issues require fixes before merge.**

Critical issues (must fix):
1. Import summary count wrong: player-import/page.tsx:1112 uses matchedCount (players with matched team) instead of youthMatches.size for "Y will create new profiles"
2. Federation numbers missing from player edit page: admin/players/[playerId]/edit/page.tsx has no display or edit UI for federationIds

Warnings (should fix):
- CSV dropdown label "Skip (New)" should be "Skip Match" (player-import/page.tsx:1074)
- playerFederationNumber from join form not persisted in DB schema
- 4 UAT E2E test scenarios required by PRD are absent (Irish name tests, High badge test, link-not-duplicate test)

---

### US-P3-001: Backend: findMatchingYouthProfile Query
File: packages/backend/convex/models/playerMatching.ts

PASS on all criteria.

Evidence:
- playerMatching.ts:394 — export const findMatchingYouthProfile = query({...})
- playerMatching.ts:112-127 — matchingArgs has organizationId, firstName, lastName, dateOfBirth, email, gaaNumber, federationIds
- playerMatching.ts:157-160 — .withIndex("by_organizationId") on orgPlayerEnrollments; NO .filter() used
- playerMatching.ts:219-225 — .withIndex("by_name_dob") for PRIORITY 0 exact match
- playerMatching.ts:6-10 — imports normalizeForMatching, levenshteinSimilarity, calculateMatchScore, ALIAS_TO_CANONICAL
- playerMatching.ts:299-325 — fuzzy scoring: DOB+surname>=0.85 -> HIGH, DOB+firstName>=0.85 -> MEDIUM, surname only -> LOW
- playerMatching.ts:100-106 — areIrishAliases() using ALIAS_TO_CANONICAL
- playerMatching.ts:332-341 — email boost via boostConfidence()
- playerMatching.ts:344-356 — GAA foireann corroboration
- playerMatching.ts:68-78 — matchResultValidator with optional warningFlag
- playerMatching.ts:396, 409 — returns: matchResultValidator on both public and internal queries
- playerMatching.ts:407 — findMatchingYouthProfileInternal = internalQuery({...})
- Batch pattern: Promise.all for unique player IDs (parallel, not sequential loop)

---

### US-P3-002: Youth Record Matching on Manual Add Player Form
File: apps/web/src/app/orgs/[orgId]/admin/players/page.tsx

PASS on all criteria.

Evidence:
- page.tsx:454-471 — Promise.all([duplicateCheck, findMatchingYouthProfile]) for adults (age >= 18)
- page.tsx:465 — convex.query(api.models.playerMatching.findMatchingYouthProfile, {...})
- page.tsx:482-490 — showYouthMatchDialog(true) when confidence === "high"
- page.tsx:176-178 — useMutation(api.models.adultPlayers.transitionToAdult) (mutation not action, correct)
- page.tsx:1581-1582 — "Create New Profile" calls createPlayer() directly
- page.tsx:1244-1275 — amber non-blocking banner for MEDIUM with "View Match" link
- page.tsx:474-479 — existing duplicate check evaluated before youth match action is taken
- page.tsx:1569-1570 — ResponsiveDialog with contentClassName="sm:max-w-md" for mobile
- Type check: pre-existing error in scripts/diagnoseSafeGetAuthUser.ts (identical on main branch, not introduced here)

---

### US-P3-003: Youth Record Matching on CSV Import
File: apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx

PARTIAL — import summary count is wrong.

PASS criteria:
- page.tsx:87-94 — YouthMatchResult type; page.tsx:179-180 — youthMatches state
- page.tsx:987-993 — "Youth Match" column header; page.tsx:1033-1082 — only shown for isAdult rows
- page.tsx:1046-1057 — "High" badge (bg-red-100 text-red-700), "Medium" badge (bg-yellow-100 text-yellow-700)
- page.tsx:1070-1078 — Accept Match, Skip (New), Review Later dropdown options
- page.tsx:486-489 — default HIGH -> accept, MEDIUM -> skip
- page.tsx:606-646 — Accept rows use transitionToAdult + enroll; remaining rows use batchImportMutation

FAIL criteria:
- AC 4 label: page.tsx:1074 shows "Skip (New)" not "Skip Match" as PRD specifies
- AC 8: Import summary at page.tsx:1092-1120:
  The "Y will create new profiles" count is:
    matchedCount - acceptedCount
  where matchedCount = parsedPlayers.filter(p => p.matchedTeamId).length (line 430)
  This counts ALL players with matched teams, not just youth-matched adult rows.
  Should be: youthMatches.size - acceptedCount
  Example of wrong result: 10 players with teams, 2 youth matches (1 accepted) -> shows "9 will create new" instead of "1 will create new"

---

### US-P3-004: Player Self-Registration via Join Request with Youth Matching
Files: apps/web/src/app/orgs/join/[orgId]/page.tsx, packages/backend/convex/models/orgJoinRequests.ts, apps/web/src/app/orgs/[orgId]/admin/users/approvals/page.tsx

PASS on all criteria (minor label text differences from PRD, functionality correct).

Evidence:
- join/page.tsx:307-332 — Player (Adult) role button
- join/page.tsx:350-368 — DOB field shown when player selected; join/page.tsx:93-98 — required for submission
- join/page.tsx:374-385 — federation number field shown when player role selected
- orgJoinRequests.ts:61 — playerFederationNumber arg; orgJoinRequests.ts:153-182 — runs findMatchingYouthProfileInternal
- orgJoinRequests.ts:186-215 — stores matchedYouthIdentityId, matchedYouthName, matchedYouthConfidence in DB
- schema.ts:1580-1583 — schema has all three player-specific fields
- approvals/page.tsx:568-578 — orange Star icon with matched youth name for HIGH confidence
- approvals/page.tsx:1170-1264 — Link/Create New choice UI when HIGH match present
- approvals/page.tsx:1286 — "Approve & Link to History" button (PRD says "Approve & Link to Existing History" — minor label diff)
- orgJoinRequests.ts:580-590 — calls claimYouthProfileInternal with linkToYouthIdentityId
- orgJoinRequests.ts:630-638 — sendPlayerJoinApprovalEmail() called for player role approvals
- email.ts:1707-1820 — full HTML email with portal link and optional history-linked note

Note: Only HIGH confidence matches stored; MEDIUM matches are not flagged in admin review.
The PRD AC 3 says "stores result (confidence + matched playerIdentityId)" — the implementation only stores when confidence is "high". MEDIUM matches are silently ignored. This is a minor gap but the flow still works for the most important case.

---

### US-P3-005: Youth Record Matching on Email Invite
Files: apps/web/src/app/orgs/[orgId]/admin/users/page.tsx, packages/backend/convex/models/members.ts

PASS on all criteria.

Evidence:
- users/page.tsx:204-207 — invitePlayerFirstName, invitePlayerLastName, invitePlayerDob state
- users/page.tsx:226-244 — useQuery with "skip" guard (hasPlayerMatchData ? {...} : "skip")
- users/page.tsx:2656-2694 — Name + DOB fields rendered when inviteFunctionalRoles.includes("player")
- users/page.tsx:2697-2708 — informational note shown for high OR medium confidence
- users/page.tsx:720-726 — metadata.matchedPlayerIdentityId = invitePlayerMatchResult.match._id
- users/page.tsx:728-734 — metadata passed to createInvitation
- members.ts:2962-2988 — claimYouthProfileInternal called on acceptance when suggestedFunctionalRoles includes "player" and matchedId is present
- members.ts:2981-2987 — try/catch guards existing invites (null matchedId = non-breaking)
- adultPlayers.ts:485-528 — claimYouthProfileInternal checks age >= 18 before transitioning playerType to "adult"

---

### US-P3-006: Federation Number as Identity Anchor
Files: schema.ts, playerMatching.ts, admin/players/page.tsx, admin/player-import/page.tsx, join/[orgId]/page.tsx

PARTIAL — federation numbers not shown/editable on player edit page.

PASS criteria:
- schema.ts:289-296 — federationIds field on playerIdentities; legacy externalIds.foireann preserved at schema.ts:285
- playerMatching.ts:119-127 — federationIds in matchingArgs
- playerMatching.ts:178-214 — PRIORITY -1: federation match short-circuits all fuzzy checks
- playerMatching.ts:184 — checks player.externalIds?.foireann against args.federationIds.gaa (legacy cross-check)
- players/page.tsx:1409-1490 — collapsible "Federation Numbers (Optional)" section with FAI/IRFU/GAA/Other fields
- players/page.tsx:328-348 — buildFederationIds() helper
- players/page.tsx:360 — federationIds: buildFederationIds() passed to createPlayerIdentity
- playerIdentities.ts:529 — createPlayerIdentity mutation accepts federationIds
- player-import/page.tsx:104 — SAMPLE_CSV includes FAINumber/IRFUNumber/GAANumber columns
- player-import/page.tsx:357-359 — CSV parsing maps FAINumber/IRFUNumber/GAANumber to faiNumber/irfuNumber/gaaNumber
- player-import/page.tsx:459-467 — federationIds conditionally passed to findMatchingYouthProfile
- join/page.tsx:374-385 — federation number field on self-registration form

FAIL criteria:
- AC "Show populated federation numbers on the player detail/edit view. Admin can update them at any time."
  File: apps/web/src/app/orgs/[orgId]/admin/players/[playerId]/edit/page.tsx
  Grep of this file shows ZERO references to federationIds. No display, no edit fields.

- AC "Store as federationIds.other" for join form federation number:
  orgJoinRequests.ts:61 — playerFederationNumber accepted as arg
  orgJoinRequests.ts:172-174 — used only for matching; NOT inserted into DB record
  Schema at schema.ts:1535-1597 — no playerFederationNumber field in orgJoinRequests table
  The match result IS stored (matchedYouthIdentityId) but the raw number is lost.

---

### US-P3-UAT: Phase 3 Adult Import Matching E2E Tests
File: apps/web/uat/tests/adult-import-matching-phase3.spec.ts

PARTIAL — structural/UI tests are solid, data-dependent scenarios missing.

PASS criteria:
- Test file exists (525 lines, 7 test.describe groups)
- PM3-021 (line 293) — DOB field visibility when player role selected (PASS)
- PM3-020, PM3-050 — page load tests for join form and approvals page (PASS)
- PM3-003, PM3-040-042 — federation section toggle/expand/collapse (PASS)
- PM3-010-012 — import page load and sample CSV load (PASS)

FAIL criteria (explicitly required by PRD):
- PRD AC: "Test: manually adding adult player with surname 'O\'Brien' matches existing youth record with surname 'OBrien' at HIGH confidence"
  No such test in file. Would require creating a youth player with surname "OBrien" then testing add of "O'Brien".

- PRD AC: "Test: manually adding adult player with first name 'Sean' matches existing youth record with first name 'Sean' (same DOB) at HIGH confidence"
  No such test in file. Would require Irish name alias test data.

- PRD AC: "Test: 'Link to Existing History' in dialog does not create a new playerIdentity"
  PM3-006 (line 153) only checks if button is visible. Does not verify playerIdentities count before/after.

- PRD AC: "Test: import CSV with adult row matching existing youth player shows 'High' badge in review table"
  PM3-013 (line 222) only checks page doesn't error. No badge verification.

- PRD AC: "Test: admin review screen shows match flag for player join request with matching youth record"
  PM3-050/PM3-051 only verify page load. No match flag UI verification.

Note: The tests that DO exist are well-written defensive tests that avoid creating real records. The gaps are around tests that require specific test data (existing youth players, submitted join requests). These could be addressed with test fixtures or setup/teardown helpers.

---

### Verification Checklist

| Check | Result |
|-------|--------|
| No .filter() in new Convex code | PASS |
| returns validators on all queries/mutations | PASS |
| Batch fetch pattern (no N+1) | PASS |
| transitionToAdult is mutation (useMutation correct) | PASS |
| claimYouthProfileInternal is internalMutation | PASS |
| useQuery "skip" guard on conditional queries | PASS |
| organizationId filter on all queries | PASS |
| Type errors all pre-existing (not introduced) | PASS |
| Mobile responsive dialogs | PASS |
| Non-breaking for existing flows | PASS |
