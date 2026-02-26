# Adult Player Lifecycle — Phase 5: Full Player Portal Remaining Sections

> Auto-generated documentation - Last updated: 2026-02-26 01:04

## Status

- **Branch**: `ralph/adult-player-phase5-portal-sections`
- **Progress**: 7 / 7 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P5-001: My Progress — Player View of Sport Passports

As an adult player, I want to see my sport passport ratings and assessment history, so that I can track my own development.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/player/progress/page.tsx
- Fetch own passports using the appropriate existing query (find in sportPassports.ts — likely getPassportsForPlayer or similar scoped to a playerIdentityId)
- If multiple sports: tab or pill switcher at top to select between sports
- Display skill ratings (technical, tactical, physical, mental) in read-only format — same visual as coach view but with NO edit controls
- Show trend arrows (↑ ↓ =) next to each rating based on most recent vs previous assessment value
- Assessment history timeline below ratings: list of assessment dates with summary score for each, newest first
- Player CANNOT edit their own ratings — no edit buttons or inputs. Show label: 'Ratings are set by your coach'
- Player CAN add their own notes: 'My Notes' textarea section that saves via existing player notes mutation on the passport record — find the existing player notes pattern
- Empty state: 'No passport assessments yet. Your coach will complete your first assessment.' if no passports exist
- Mobile responsive at 375px minimum
- npm run check-types passes

### US-P5-002: My Passport Sharing Management (Player Controls Own Sharing)

As an adult player, I want to control who can see my sports passport, so that I can share my data with other clubs when I choose.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/player/sharing/page.tsx
- Mirror the existing parent sharing UI at apps/web/src/app/orgs/[orgId]/parents/sharing/page.tsx — same controls, same patterns, same backend queries
- Player can enable/disable passport sharing via toggle — same backend mutations as parent sharing
- Player can approve or deny sharing enquiries from other orgs
- Sharing ownership transfer: when claimPlayerAccount succeeds (Phase 2, US-P2-003), update passportSharing records for this playerIdentityId to transfer ownership to the player's userId, revoking guardian access
- If ownership transfer is not already in Phase 2: add a mutation transferPassportSharingOwnership(playerIdentityId, newUserId) and call it as part of the claim flow or as a post-claim step
- If guardian had previously enabled sharing: player sees it is currently shared and can choose to disable
- Empty state: 'No sharing requests yet. Enable sharing to let other clubs view your passport.'
- Mobile responsive at 375px minimum
- npm run check-types passes

### US-P5-003: My Injuries — Player Self-View and Self-Report

As an adult player, I want to view and self-report my own injuries, so that I can track my recovery and keep my club informed.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/player/injuries/page.tsx
- Fetch own injury history using existing injury query scoped to this playerIdentityId (find in playerInjuries.ts)
- Show injury list: body part, injury type, severity, date occurred, current status (active/recovering/cleared/healed)
- Coach-reported injuries: display read-only with 'Reported by coach' badge
- Player-reported injuries: display with 'You reported this' badge
- Active injury (if any): show prominently at top with status, expected return date, recovery milestones if available
- 'Report New Injury' button opens a dialog form with fields: body part (dropdown using existing body part options), injury type (dropdown or text input), severity (minor/moderate/severe radio), date occurred (date picker), occurred during (training/match/other radio), notes (optional textarea)
- On submit: create injury record with reportedByRole set to 'player' — verify this field exists in playerInjuries schema; if not, add it to schema.ts first
- Player-reported injury appears in coach injury view for that player with 'Player-reported' badge — verify coach view shows reportedByRole
- Empty state: 'No injuries on record. Stay healthy!' when no injuries exist
- Mobile responsive at 375px minimum
- npm run check-types passes

### US-P5-004: My Coach Feedback & AI Summaries (Player View)

As an adult player, I want to see the feedback and AI summaries my coaches have chosen to share with me so that I can understand my development from my coach's perspective.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/player/feedback/page.tsx
- Read coachParentSummaries.ts FULLY before implementing — understand the privateInsight vs publicSummary split
- Backend: add a new query getCoachFeedbackForPlayer(playerIdentityId) to coachParentSummaries.ts that returns ONLY publicSummary fields for records where status is one of: approved, auto_approved, delivered, viewed. The query MUST NOT return privateInsight or any of its nested fields.
- Frontend: display results as a chronological feed, newest first
- Each feedback card shows: coach name, date, AI summary text (publicSummary.text), sensitivity badge (normal=grey / injury=amber / behavior=blue)
- Player can acknowledge a feedback item (calls existing acknowledge mutation, sets acknowledgedAt timestamp). Show 'Acknowledged ✓' state after.
- Unacknowledged items shown with a subtle highlight or 'New' badge
- The raw privateInsight text MUST NEVER appear anywhere on this page — verify this by inspecting what the query returns
- All three sensitivity categories (normal, injury, behavior) are shown without restriction — this is the player's own development data
- Empty state: 'Your coaches haven't shared any feedback with you yet. Feedback shared by your coach will appear here.'
- Mobile-first: 375px minimum width
- npm run check-types passes

### US-P5-005: Player Data Export (GDPR Article 20 — Right to Data Portability)

As an adult player, I want to download a complete machine-readable export of all personal data PlayerARC holds about me so that I can exercise my GDPR right to data portability and take my data to another platform.

**Acceptance Criteria:**
- Add a 'Download My Data' button to the player settings page (/orgs/[orgId]/player/settings)
- Button is placed in a clearly labelled 'Privacy & Data' section with explanatory text: 'Under GDPR Article 20, you have the right to receive all data we hold about you in a portable format. Your export will be ready instantly.'
- On click: show a confirmation dialog listing what will be included in the export. Two buttons: 'Download JSON' and 'Download CSV'. Player chooses format.
- Backend: add a Convex action exportPlayerData(playerIdentityId, organizationId, format: 'json' | 'csv') that assembles and returns all player data. Action must include ALL of the following data domains:
-   (1) Profile: firstName, lastName, dateOfBirth, gender, email, phone, address, town, postcode, country
-   (2) Emergency contacts: all records (name, phone, relationship)
-   (3) Sport passport ratings: all assessments with dates, dimension scores, player notes
-   (4) Wellness history: all dailyPlayerHealthChecks records (dimension values, dates, aggregate score, source channel). NOTE: cyclePhase field is ONLY included if the player has active cycle tracking consent (check playerHealthConsents). If no consent or withdrawnAt is set: omit cyclePhase from ALL records.
-   (5) Injury records: all playerInjuries (body part, type, severity, date, status, reportedByRole)
-   (6) Coach feedback: publicSummary text and metadata from all coachParentSummaries where status is approved/auto_approved/delivered/viewed — acknowledgedAt timestamp included. privateInsight is NEVER included in the export.
-   (7) Passport sharing: all passportSharing records (org name, enabled status, approvedAt/revokedAt)
-   (8) Consent records: all playerHealthConsents records (consentType, givenAt, withdrawnAt)
-   (9) Wellness coach access: all wellnessCoachAccess records (coachName, status, requestedAt, approvedAt, revokedAt)
- JSON format: a single JSON object with one key per domain (profile, emergencyContacts, passportRatings, wellnessHistory, injuries, coachFeedback, sharingRecords, consentRecords, wellnessCoachAccess). Include a metadata object at the top: { exportedAt: ISO timestamp, playerName, organizationName, gdprBasis: 'Article 20 — Right to Data Portability' }.
- CSV format: a ZIP file containing one CSV per domain (profile.csv, wellness_history.csv, injuries.csv, etc.). Each CSV has a header row. Return as a Blob download.
- Rate limiting: a player can generate a maximum of 1 export per 24 hours. If requested again within 24h: show 'You already downloaded your data today. You can request another export tomorrow.'
- Frontend: use a browser download (anchor tag with blob URL or data URI) to trigger the file download without navigating away from the page. File named: playerarc-data-[playerFirstName]-[YYYY-MM-DD].json (or .zip for CSV).
- The action must complete within 10 seconds for a player with up to 2 years of wellness data (365 records × 2 = 730 rows). If it takes longer, return a progress indicator.
- IMPORTANT — privateInsight is NEVER exported. The export query for coachParentSummaries must select only publicSummary fields. Verify this by inspecting the returned data before implementing the download.
- Mobile responsive: download button works on mobile browsers (Safari iOS, Chrome Android).
- npm run check-types passes

### US-P5-006: Radar Chart — Visual Progress Profile

As a player, I want to see my passport assessment ratings displayed as a radar/spider chart alongside the existing list view, so that I can understand my overall profile shape and relative strengths at a glance.

**Acceptance Criteria:**
- EXTEND apps/web/src/app/orgs/[orgId]/player/progress/page.tsx (created in US-P5-001) — do NOT create a new page.
- Add a view toggle above the ratings section: two pills/tabs — 'Chart' and 'List'. Default view: 'Chart'. Persist selection in localStorage key 'playerProgressView' so the player's preference is remembered.
- CHART VIEW — render a Recharts RadarChart using the player's most recent assessment for the currently selected sport:
-   Import from recharts: RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip.
-   Axes: one axis per assessed dimension (technical, tactical, physical, mental — or whatever dimensions the passport uses; read sportPassports.ts to confirm the exact dimension keys before implementing).
-   Values: the player's most recent score per dimension (0–10 scale or whatever the passport uses — confirm from schema).
-   Radar fill: use CSS var --org-primary with 30% opacity for fill, --org-primary at full opacity for stroke.
-   PolarRadiusAxis: domain [0, 10] (or the actual max score). Show tick at 0, 5, 10.
-   Tooltip: on hover over each axis point, show dimension name + score (e.g. 'Technical: 7.5').
-   Chart is responsive: wrapped in ResponsiveContainer with width='100%' height={300}.
-   Below the chart: show the assessment date this chart is based on: 'Based on assessment: [date]'.
-   If only one assessment exists: show the chart for that assessment. If multiple assessments: show 'Compare' option (see below).
- COMPARISON (if multiple assessments available):
-   Show a secondary ghost radar (unfilled, dashed stroke, 40% opacity) for the previous assessment overlaid on the current one.
-   Legend: '● Current ([date])  ○ Previous ([date])'.
-   Do not build a full multi-assessment comparison timeline — just current vs immediately previous.
- LIST VIEW — the existing list with trend arrows from US-P5-001 remains unchanged. No modifications to list view.
- EMPTY STATE: if no assessments exist, show the empty state message from US-P5-001 — do not show an empty radar chart.
- ACCESSIBILITY: the RadarChart visual is supplementary. The list view (accessible by default) must always be available as the alternative. Add aria-label='Progress radar chart showing skill ratings across [N] dimensions' to the ResponsiveContainer wrapper div.
- Mobile: at 375px width, the chart must remain readable. ResponsiveContainer handles this — verify at 375px that axis labels are not clipped. If dimension labels are too long, truncate to the first word.
- npm run check-types passes.

### US-P5-UAT: Phase 5 Player Portal Sections E2E Tests

As a developer, I want Playwright E2E tests for the full player portal sections so that progress, sharing, injury, and coach feedback features work end-to-end.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/player-portal-phase5.spec.ts
- Test: My Progress page loads and shows sport passport ratings in read-only format
- Test: My Progress — no edit buttons present on skill rating fields
- Test: My Progress — player notes textarea is present and saves successfully
- Test: My Passport Sharing — sharing toggle changes state and persists in DB
- Test: My Injuries — page loads and shows existing injury list
- Test: My Injuries — 'Report New Injury' form opens, submits, creates injury with reportedByRole 'player'
- Test: My Feedback — page loads and shows approved coachParentSummaries records
- Test: My Feedback — privateInsight text does NOT appear anywhere on the page
- Test: My Feedback — acknowledge button sets acknowledgedAt on the record
- Manual test 1: Log in as adult player with sport passport → navigate to My Progress → confirm ratings visible with sport tabs
- Manual test 2: Confirm player CANNOT edit skill ratings (no edit controls present)
- Manual test 3: Confirm player CAN add a personal note to passport notes section, saves successfully
- Manual test 4: Navigate to My Passport Sharing → toggle sharing on → confirm sharing enabled in DB
- Manual test 5: Navigate to My Injuries → confirm existing injuries shown with correct badges
- Manual test 6: Click 'Report New Injury' → fill all fields → submit → confirm injury record created with reportedByRole 'player'
- Manual test 7: New injury appears in list with 'You reported this' badge
- Manual test 8: Log in as coach → confirm player-reported injury appears in coach injury view with 'Player-reported' badge
- Manual test 9: As coach, approve a coachParentSummary for a player → log in as that player → navigate to Coach Feedback → confirm the publicSummary text appears
- Manual test 10: Confirm the coach's privateInsight text does NOT appear anywhere on the feedback page
- Manual test 11: Acknowledge a feedback item → confirm acknowledgedAt is set in DB and the card shows acknowledged state
- Manual test 12: Confirm all three sensitivity categories (normal, injury, behavior) are visible in the player's feedback feed
- Test: 'Download My Data' button is present in player settings Privacy & Data section
- Test: clicking 'Download JSON' triggers a file download with .json extension
- Test: exported JSON contains all 9 data domains (profile, emergencyContacts, passportRatings, wellnessHistory, injuries, coachFeedback, sharingRecords, consentRecords, wellnessCoachAccess)
- Test: exported JSON does NOT contain privateInsight field anywhere in the payload
- Test: second download request within 24h shows rate-limit message
- Manual test 13: As adult player with wellness history → download JSON export → open file → confirm wellness records present. If player has NOT consented to cycle tracking → confirm cyclePhase field is absent from all wellness records.
- Manual test 14: Inspect exported JSON → confirm no privateInsight field anywhere in the coachFeedback array


## Implementation Notes

### Key Patterns & Learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
