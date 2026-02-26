# Player Matching System — Manual Test Plan

**Purpose:** Verify the unified matching system detects duplicates at every entry point
before a new player record is created.

**System under test:** `findPlayerMatchCandidates` / `findBestPlayerMatch` in
`packages/backend/convex/models/playerMatching.ts`

---

## Prerequisites

Complete **Phase 0: Seed Base Players** before running any other tests.
Every test in later phases depends on these records already existing.

---

## Phase 0: Seed Base Players

Add the following four players manually via **Admin → Players → Add Player**.
These are the records the matching system will detect in subsequent tests.

> Note: Use your own org's Age Groups and Sports as they appear in your dropdowns.
> The key fields for matching are Name, Date of Birth, Gender, and (optionally) Address/Phone.

| Ref | First Name | Last Name | Date of Birth | Gender | Age Group | Sport | Notes |
|-----|-----------|-----------|---------------|--------|-----------|-------|-------|
| P1 | Ciarán | Murphy | 2014-03-15 | Male | U12 | GAA | Youth — exact match base |
| P2 | Mary | O'Brien | 1990-07-22 | Female | Senior | Football | Adult — adult-to-adult base |
| P3 | Niamh | Walsh | 2015-09-05 | Female | U11 | Soccer | Youth — Irish alias base |
| P4 | Seán | Brennan | 2006-04-18 | Male | U18 | Rugby | Youth aged 18+ — graduation base |

**Verify:** All four appear in the player list before proceeding.

---

## Entry Point 1: Admin Manually Adds a Player

**Location:** Admin → Players → "+ Add Player" button

### TC1.1 — HIGH confidence: Exact name + DOB (youth)

| Field | Value |
|-------|-------|
| First Name | Ciarán |
| Last Name | Murphy |
| Date of Birth | 2014-03-15 |
| Gender | Male |

**Expected:** A blocking dialog titled **"Existing Player Record Found"** appears before the
record is saved. Dialog shows Ciarán Murphy's DOB and `youth` player type.
Two buttons: **"Link to Existing Record"** and **"Create New Profile"**.

**Pass criteria:** Dialog appears. Clicking "Link to Existing Record" enrolls the
existing record (no new playerIdentity created). Clicking "Create New Profile"
creates a second separate record.

---

### TC1.2 — HIGH confidence: Exact name + DOB (adult-to-adult)

| Field | Value |
|-------|-------|
| First Name | Mary |
| Last Name | O'Brien |
| Date of Birth | 1990-07-22 |
| Gender | Female |

**Expected:** Same blocking dialog. Candidate shown as `adult` player type.
"Link to Existing Record" enrolls the existing adult record (no type transition).

**Pass criteria:** Dialog appears, playerType shows "adult".

---

### TC1.3 — MEDIUM confidence: Fuzzy name (missing fada), exact DOB

| Field | Value |
|-------|-------|
| First Name | Ciaran *(no fada)* |
| Last Name | Murphy |
| Date of Birth | 2014-03-15 |
| Gender | Male |

**Expected:** An amber non-blocking warning banner appears inside the Add Player
form saying an existing player may match. Text shows "Ciaran Murphy" or similar.
The form does NOT block — clicking **"Add Player" again** proceeds to create.

**Pass criteria:** Amber banner appears. Re-submitting creates the record
(or admin can navigate to review the existing record via the "View Match" link).

---

### TC1.4 — HIGH confidence: Irish phonetic alias (Niamh → Neeve), exact DOB

| Field | Value |
|-------|-------|
| First Name | Neeve *(Irish phonetic of Niamh)* |
| Last Name | Walsh |
| Date of Birth | 2015-09-05 |
| Gender | Female |

**Expected:** Blocking dialog appears, matching to Niamh Walsh.

**Pass criteria:** Dialog appears despite spelling difference in first name.

---

### TC1.5 — No match: Brand new player

| Field | Value |
|-------|-------|
| First Name | Patrick |
| Last Name | Kelly |
| Date of Birth | 2013-06-10 |
| Gender | Male |

**Expected:** No dialog, no banner. Player created immediately.

**Pass criteria:** Player is created without any matching UI appearing.

---

### TC1.6 — HIGH confidence: Exact name + DOB (youth aged 18+)

| Field | Value |
|-------|-------|
| First Name | Seán |
| Last Name | Brennan |
| Date of Birth | 2006-04-18 |
| Gender | Male |

**Expected:** Blocking dialog. Candidate shown as `youth` player type.
"Link to Existing Record" triggers `transitionToAdult` + enroll.

**Pass criteria:** Dialog appears. Linking transitions the youth record to adult.

---

## Entry Point 2: Admin Invites a User (Email Invite with Player Role)

**Location:** Admin → Users → "+ Invite Member" → toggle **Player** role

The invite dialog shows a player fields section (First Name, Last Name, Date of Birth)
when the Player role is selected. A match banner appears as you type.

### TC2.1 — HIGH confidence match shown in invite dialog

| Field | Value |
|-------|-------|
| Email | any email you control |
| Role | Player |
| First Name | Ciarán |
| Last Name | Murphy |
| Date of Birth | 2014-03-15 |

**Expected:** An orange info banner appears below the DOB field:
> "An existing youth player record may match this person. They'll be linked to their
> existing history when they accept the invite."

**Pass criteria:** Banner appears with `youth` playerType before the invite is sent.

---

### TC2.2 — No match in invite dialog

| Field | Value |
|-------|-------|
| Role | Player |
| First Name | Patrick |
| Last Name | Kelly |
| Date of Birth | 2013-06-10 |

**Expected:** No banner appears.

**Pass criteria:** No match banner shown.

---

## Entry Point 3: CSV Bulk Import

**Location:** Admin → Player Import

Use the CSV below — it contains rows that test all match scenarios.
Paste the entire block into the CSV input area and click **Parse**.

### Test CSV

```csv
FirstName,LastName,DateOfBirth,Gender,AgeGroup,Sport,Season,ParentFirstName,ParentLastName,ParentEmail,ParentPhone,Address,Town,Postcode,Country
Ciarán,Murphy,2014-03-15,Male,u12,GAA,2025,,,,,,,,
Ciaran,Murphy,2014-03-15,Male,u12,GAA,2025,,,,,,,,
Mary,O'Brien,1990-07-22,Female,senior,Football,2025,,,,,,,,
Niamh,Walsh,2015-09-05,Female,u11,Soccer,2025,,,,,,,,
Neeve,Walsh,2015-09-05,Female,u11,Soccer,2025,,,,,,,,
Seán,Brennan,2006-04-18,Male,u18,Rugby,2025,,,,,,,,
Patrick,Kelly,2013-06-10,Male,u13,GAA,2025,,,,,,,,
```

The CSV file is also saved at: `docs/testing/test-import-matching.csv`

### Expected results after parsing:

| Row | Player | Expected Match | Default Decision |
|-----|--------|---------------|-----------------|
| 1 | Ciarán Murphy 2014-03-15 | HIGH — matches P1 | accept (link) |
| 2 | Ciaran Murphy 2014-03-15 | MEDIUM — fuzzy match P1 | skip |
| 3 | Mary O'Brien 1990-07-22 | HIGH — matches P2 | accept (link) |
| 4 | Niamh Walsh 2015-09-05 | HIGH — matches P3 (exact) | accept (link) |
| 5 | Neeve Walsh 2015-09-05 | HIGH — matches P3 (alias) | accept (link) |
| 6 | Seán Brennan 2006-04-18 | HIGH — matches P4 | accept (link) |
| 7 | Patrick Kelly 2013-06-10 | None | create new |

**Pass criteria:** Rows 1, 3, 4, 5, 6 show HIGH match (green). Row 2 shows MEDIUM (amber).
Row 7 shows no match. The default decisions match the table above.

---

## Entry Point 4: Self-Registration / Join Request

**Location:** Organisation join page (the public join URL for your org)

This tests the backend `findBestPlayerMatchInternal` call inside `createJoinRequest`.
The match is stored on the join request and shown to the admin on the approval screen.

### Setup
Create a new test user account (or use an existing non-member account). Navigate to
your org's join URL and submit a join request with the **Player** role.

### TC4.1 — Match stored on join request (player role)

| Field | Value |
|-------|-------|
| Requested Role | Player |
| Date of Birth | 2014-03-15 |

The join request form will prompt for a DOB when Player is selected.

**Expected:** After submitting the join request, go to **Admin → Users → Pending Requests**.
Find the request. The approval card should show:
> "Matched player: Ciarán Murphy (high confidence)"

**Pass criteria:** `matchedYouthIdentityId` is populated on the join request record.
The admin approval screen shows the matched player name and confidence.

---

### TC4.2 — No match on join request

| Field | Value |
|-------|-------|
| Requested Role | Player |
| Date of Birth | 2000-01-01 *(no player with this DOB)* |

**Expected:** No match shown on the approval card.

**Pass criteria:** Approval screen shows no matched player.

---

## Entry Point 5: Admin Users — Link to Player (Existing User)

**Location:** Admin → Users → click **Edit** on a member with Player role but no linked
player record → Player Record section

This flow uses `findMatchingUnlinkedPlayers` (a pre-existing query on `orgPlayerEnrollments`)
which matches by name and email. It is separate from the new unified matching system.

### TC5.1 — Auto-match on user with matching name

When an admin opens the edit panel for a user whose display name matches an existing
unlinked player in the org:

**Expected:** The "Player Record" section shows an auto-match candidate with
"Strong match" or "Possible match" badge. Buttons: **"Link"** and **"Not this player"**.

**Pass criteria:** Match candidate shown. Clicking "Link" assigns the existing
`playerIdentityId` to the user without creating a new record.

---

## Entry Point 6: Graduation Claim (autoClaimByEmail)

**Location:** Triggered automatically when an adult user logs in and there is an
unaccepted graduation invite for their email address.

This calls `findBestPlayerMatchInternal` is **not** called here — instead, the graduation
flow matches via the graduation token (email-based). The duplicate check does not run
on graduation claims because the token already identifies the specific record.

**Status:** Not applicable for duplicate testing. The graduation flow is token-scoped
by design.

---

## What to Record

For each test case, note:
- ✅ Pass — matching UI appeared as expected
- ❌ Fail — no matching UI, or wrong behaviour
- ⚠️ Partial — some matching UI appeared but with wrong data

If a test fails, check the browser console for errors and the Convex dashboard logs
for any `ReturnsValidationError` or query failures.

---

## Known Limitations

1. **Phone/postcode/address matching** boosts the score but does not change confidence
   level on its own — these signals only matter when combined with a name/DOB base match.
   The current admin "Add Player" form does not collect phone/postcode at add time,
   so these signals are only active during CSV import (which has those columns) and
   the invite dialog (if email is provided).

2. **CSV import matching** now runs for ALL rows (not just adults). The default decision
   for HIGH is "accept" and for MEDIUM is "skip" — these can be overridden in the
   import preview UI before committing.

3. **Guardian/parent matching** is handled by a separate system (`getSmartMatchesForGuardian`)
   and is out of scope for this test plan.
