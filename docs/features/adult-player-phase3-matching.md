# Adult Player Lifecycle — Phase 3: Adult Import & Youth Record Matching

> Auto-generated documentation - Last updated: 2026-02-25 19:22

## Status

- **Branch**: `ralph/adult-player-phase3-matching`
- **Progress**: 7 / 7 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P3-001: Backend: findMatchingYouthProfile Query

As a backend developer, I need a reusable query that checks if an adult being added matches an existing youth playerIdentity, so that all entry points can use the same matching logic.

**Acceptance Criteria:**
- Add findMatchingYouthProfile query to packages/backend/convex/models/playerImport.ts (or a new file packages/backend/convex/models/playerMatching.ts if cleaner)
- Args: organizationId (string), firstName (string), lastName (string), dateOfBirth (string), email (optional string)
- Query only playerIdentities where playerType === 'youth' using .withIndex() — never .filter()
- DO NOT implement a new name normalisation function. IMPORT the existing utilities: import { normalizeForMatching, levenshteinSimilarity, calculateMatchScore } from '../lib/stringMatching'. These already handle: fadas (Séan→sean, Pádraig→padraig), O'/Mc/Mac prefixes, apostrophes/hyphens, Levenshtein fuzzy matching, and 45+ Irish phonetic aliases (Niamh/Neeve, Tadhg/Teague, Siobhán/Shivawn, etc.).
- Matching algorithm using imported utilities — PRIORITY 0 (exact index): query playerIdentities by_name_dob index with exact firstName/lastName/dateOfBirth. If a youth record matches, return HIGH confidence immediately. PRIORITY 1 (fuzzy): fetch youth candidates for the org via .withIndex(); for each, apply normalizeForMatching() to both candidate and stored first/last names; score: DOB matches AND levenshteinSimilarity(normalizedCandidateSurname, normalizedStoredSurname) >= 0.85 → HIGH; DOB + firstName similarity >= 0.85 → MEDIUM; surname similarity >= 0.85 without DOB → LOW. Also call calculateMatchScore to catch Irish phonetic alias matches (e.g. Niamh/Neeve same DOB = HIGH). Email match (exact lowercased) boosts by one level. OPPORTUNISTIC (after scoring): if args.gaaNumber OR storedRecord.externalIds?.foireann exists, call ctx.runQuery(internal.lib.import.deduplicator.checkGAAMembershipNumber, { membershipNumber }) — agreement boosts to HIGH; disagreement adds a warningFlag field to the return. Absence of Foireann number: proceed normally.
- If email provided and matches playerIdentity email: boost confidence by one level (LOW→MEDIUM, MEDIUM→HIGH)
- Return type: { confidence: 'high' | 'medium' | 'low' | 'none', match: playerIdentity object or null, matchedFields: string[] }
- Include returns validator with the full return shape
- Query does NOT iterate over all org players in a loop — it fetches candidates via index then scores in-memory
- npm run check-types passes
- npx -w packages/backend convex codegen passes

### US-P3-002: Youth Record Matching on Manual Add Player Form

As an admin adding an adult player manually, I want the system to suggest if this adult matches an existing youth record, so that I don't create duplicate profiles and lose their history.

**Acceptance Criteria:**
- EXTEND apps/web/src/app/orgs/[orgId]/admin/players/page.tsx — do NOT replace or duplicate the existing Add Player form
- When admin submits form for a player with calculated age >= 18: run findMatchingYouthProfile in parallel with the existing duplicate check
- HIGH confidence match: show blocking dialog 'A youth profile matching this player exists — [Name], born [DOB]. Link to existing history or create new?'
- HIGH confidence dialog: 'Link to Existing History' button calls transitionToAdult(existingPlayerIdentityId) — does NOT create new playerIdentity
- HIGH confidence dialog: 'Create New Profile' button proceeds with existing creation flow unchanged
- MEDIUM confidence match: show non-blocking amber warning banner above form 'A youth profile may match this player. Review before proceeding.' with 'View Match' link
- LOW confidence or no match: proceed with existing flow completely unchanged
- Existing exact duplicate detection (same name + DOB + gender) remains unchanged and runs first — youth matching is additive for adults only
- Mobile responsive: dialog works at 375px width
- npm run check-types passes

### US-P3-003: Youth Record Matching on CSV Import

As an admin running a player import, I want adult players in the CSV to be flagged against existing youth records, so that imported data enriches existing profiles rather than duplicating them.

**Acceptance Criteria:**
- EXTEND the existing import flow at apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx — do NOT create a new import pipeline
- In the import preview/review table, add a 'Youth Match' column that appears only for adult rows (age >= 18)
- For each adult row: run findMatchingYouthProfile and show a confidence badge: 'High' (red/amber colour), 'Medium' (yellow), or '-' (no match)
- Admin can choose per matched row via dropdown or inline buttons: 'Accept Match' (merge — uses transitionToAdult on existing record), 'Skip Match' (create new profile), 'Review Later' (creates new + adds a note to the profile)
- Default selection for HIGH confidence rows: 'Accept Match'. Default for MEDIUM: 'Skip Match'
- Import continues via the existing batchImportMutation with admin's per-row decisions — no new import pipeline
- Youth player rows (age < 18) and no-match adult rows proceed exactly as before
- Show import summary before final confirmation: 'X adult rows will be merged with existing profiles, Y will create new profiles'
- npm run check-types passes

### US-P3-004: Player Self-Registration via Join Request with Youth Matching

As an adult player who has never received an invite, I want to register myself and join an organisation, so that my existing history is preserved when linked to my youth profile.

**Acceptance Criteria:**
- EXTEND the existing org join request form — add 'I'm a player' option alongside existing coach/parent role options
- When 'player' role is selected: show a required DOB field (used for youth record matching)
- On join request submission with player role: backend runs findMatchingYouthProfile with the provided name + DOB, stores result (confidence + matched playerIdentityId) with the join request record
- In the admin's pending requests review UI (existing UI): flag requests where a HIGH youth match was found — show 'May match [Name], born [DOB]. Link or create new?'
- Admin approval options for player requests with HIGH match: 'Approve & Link to Existing History' or 'Approve & Create New Profile'
- 'Approve & Link': calls claimYouthProfile(existingPlayerIdentityId, userId) — links user to existing record and transitions to adult if age >= 18
- 'Approve & Create New': existing approval flow, creates new playerIdentity
- On approval (either path): send player confirmation email — add sendPlayerJoinApprovalEmail() to packages/backend/convex/utils/email.ts following existing pattern
- Email content: 'Your request to join [Org] has been approved. You now have access to your player portal.' with link to org
- npm run check-types passes

### US-P3-005: Youth Record Matching on Email Invite

As an admin inviting an adult player by email, I want the system to detect if a youth record exists for this person, so that their history is linked when they accept.

**Acceptance Criteria:**
- EXTEND the existing invite dialog — add optional DOB field for player role invites (if not already present)
- When DOB is entered alongside email in the invite dialog: backend checks findMatchingYouthProfile
- If HIGH or MEDIUM match found: show informational note inline in the dialog: 'A youth profile may exist for this person. They'll be linked to their existing history when they accept the invite.'
- If no match: proceed with invite as normal, no UI change
- Store the matched playerIdentityId in the invitation metadata when a match is found
- On invitation acceptance (existing flow via accept-invitation page + onboarding orchestrator): if invitation metadata contains a matchedPlayerIdentityId AND player age >= 18, automatically call transitionToAdult(matchedPlayerIdentityId, userId) after claimPlayerAccount
- The auto-transition on acceptance must be non-breaking for existing invites that have no matchedPlayerIdentityId in metadata
- The inline note is informational only — admin does not need to confirm, just sees the note
- npm run check-types passes

### US-P3-006: Federation Number as Identity Anchor

As an admin or player, I want to record national federation registration numbers (FAI, IRFU, GAA, etc.) on player profiles so that exact federation ID matches provide a definitive high-confidence signal during youth-to-adult identity matching.

**Acceptance Criteria:**
- SCHEMA — extend playerIdentities in packages/backend/convex/schema.ts: add federationIds (v.optional(v.object({ fai: v.optional(v.string()), irfu: v.optional(v.string()), gaa: v.optional(v.string()), other: v.optional(v.string()) }))). Note: the existing externalIds.foireann field on playerIdentities is the legacy GAA Foireann path — do NOT rename or remove it. federationIds is an additional field that accepts structured IDs for multiple governing bodies. Read schema.ts carefully before adding to confirm the exact existing shape.
- MATCHING UPDATE — extend findMatchingYouthProfile in packages/backend/convex/models/playerMatching.ts (or playerImport.ts):
-   Add optional arg: federationIds (same shape as schema field above).
-   PRIORITY -1 (before all existing checks): if args.federationIds is provided AND any stored playerIdentity has a matching non-null federation ID for the same body (e.g. args.federationIds.fai === stored.federationIds?.fai), return HIGH confidence immediately with matchedFields including the federation body name. One exact federation ID match = definitive HIGH confidence.
-   Existing PRIORITY 0 (exact name+DOB) and PRIORITY 1 (fuzzy) continue unchanged after this new check.
-   Also check legacy externalIds.foireann: if args.federationIds?.gaa matches stored externalIds.foireann (or stored federationIds.gaa), treat as HIGH confidence federation match.
- ADMIN UI — extend the Add Player form (apps/web/src/app/orgs/[orgId]/admin/players/page.tsx):
-   Add an optional 'Federation Numbers' collapsible section below the existing fields.
-   Fields: FAI Registration Number (text input), IRFU Registration Number (text input), GAA Registration Number (text input), Other (text input with label). All optional.
-   On submit: include federationIds in the createPlayer or equivalent mutation args.
-   Show populated federation numbers on the player detail/edit view. Admin can update them at any time.
- CSV IMPORT — extend the CSV import preview (apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx):
-   Accept optional columns: fai_number, irfu_number, gaa_number in the CSV template.
-   Map these columns to federationIds on import. Pass to findMatchingYouthProfile during the matching step.
-   Document the new optional columns in the CSV template download (find the template generation and add the new headers as optional columns with a comment row).
- SELF-REGISTRATION — extend the player join request form (from US-P3-004):
-   Add an optional 'My registration number' text field with label: 'Federation number (FAI, IRFU, GAA, etc.) — helps us link you to your existing profile'.
-   Store as federationIds.other if no specific governing body can be inferred, or route to the correct field if the org is sport-specific (future enhancement — for now, store in other).
- Run npx -w packages/backend convex codegen — all types pass.
- npm run check-types passes.

### US-P3-UAT: Phase 3 Adult Import Matching E2E Tests

As a developer, I want Playwright E2E tests for all Phase 3 matching scenarios, so that adult import matching is reliable and regression-free.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/adult-import-matching-phase3.spec.ts
- Test: manually adding adult player with HIGH confidence match shows blocking dialog
- Test: manually adding adult player with no match proceeds directly to creation (no dialog)
- Test: manually adding adult player with surname 'O\'Brien' matches existing youth record with surname 'OBrien' at HIGH confidence
- Test: manually adding adult player with first name 'Séan' matches existing youth record with first name 'Sean' (same DOB) at HIGH confidence
- Test: 'Link to Existing History' in dialog does not create a new playerIdentity
- Test: import CSV with adult row matching existing youth player shows 'High' badge in review table
- Test: join request form shows DOB field when 'player' role selected
- Test: admin review screen shows match flag for player join request with matching youth record
- Manual test 1: Create youth player (DOB = 18 years ago). Manually add same person as adult → confirm HIGH match dialog appears
- Manual test 2: Choose 'Link to Existing' → confirm no new playerIdentity created, existing record now adult
- Manual test 3: Choose 'Create New' → confirm two records now exist (acceptable edge case)
- Manual test 4: Upload CSV with adult row matching youth player by name+DOB → confirm 'High' badge in import preview
- Manual test 5: Accept match during import → verify no duplicate record, existing enrollment updated
- Manual test 6: Submit self-registration as player with DOB matching youth record → log in as admin → confirm match flag in pending requests
- Manual test 7: Invite player by email + DOB matching youth record → confirm informational note in invite dialog
- Manual test 8: Create youth player named 'Séan O\'Brien'. Manually add adult with name 'Sean OBrien' (same DOB) → confirm HIGH match dialog appears (names normalise to same value)
- Manual test 9: Create youth player named 'MacCarthy'. Manually add adult with surname 'McCarthy' (same DOB) → confirm HIGH match dialog appears


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- playerIdentities has NO organizationId - must query orgPlayerEnrollments first then batch-fetch
- Biome lint requires block statements even for single-line if bodies
- GenericQueryCtx<DataModel> is the correct type for shared query handler functions
- Biome useBlockStatements rule: `if (x) continue;` must be `if (x) { continue; }`
---

**Gotchas encountered:**
- Biome useBlockStatements rule: `if (x) continue;` must be `if (x) { continue; }`
---

### Files Changed

- packages/backend/convex/models/playerMatching.ts (+352, new file)
- Type check: passed (only pre-existing error in diagnoseSafeGetAuthUser.ts)
- Linting: passed (fixed useBlockStatements violations)
- Convex codegen: passed
- Browser verification: not applicable (backend only)
- playerIdentities has NO organizationId - must query orgPlayerEnrollments first then batch-fetch
- Biome lint requires block statements even for single-line if bodies
- GenericQueryCtx<DataModel> is the correct type for shared query handler functions
- Biome useBlockStatements rule: `if (x) continue;` must be `if (x) { continue; }`
---
--
- `packages/backend/convex/schema.ts` (+6)
- `packages/backend/convex/models/orgJoinRequests.ts` (+80)
- `packages/backend/convex/models/adultPlayers.ts` (+85)
- `packages/backend/convex/utils/email.ts` (+141)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
