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
> The key fields for matching are Name, Date of Birth, Gender, Email, Phone, and Postcode.

| Ref | First Name | Last Name | Date of Birth | Gender | Age Group | Sport | Email | Phone | Postcode | Notes |
|-----|-----------|-----------|---------------|--------|-----------|-------|-------|-------|----------|-------|
| P1 | Ciarán | Murphy | 2014-03-15 | Male | U12 | GAA | ciaran.murphy@test.ie | +353871234001 | D01 A001 | Youth — exact match base |
| P2 | Mary | O'Brien | 1990-07-22 | Female | Senior | Football | mary.obrien@test.ie | +353871234002 | D02 A002 | Adult — adult-to-adult base |
| P3 | Niamh | Walsh | 2015-09-05 | Female | U11 | Soccer | niamh.walsh@test.ie | +353871234003 | D03 A003 | Youth — Irish alias base |
| P4 | Seán | Brennan | 2006-04-18 | Male | U18 | Rugby | sean.brennan@test.ie | +353871234004 | D04 A004 | Youth aged 18+ — graduation base |

**Verify:** All four appear in the player list before proceeding.

---

## Entry Point 1: Admin Manually Adds a Player

**Location:** Admin → Players → "+ Add Player" button

The form now collects **Email** (required), **Phone** (optional, PhoneInput), and
**Postcode** (optional) in addition to name, DOB, and gender. All three are passed to
`findPlayerMatchCandidates` as boost signals.

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

### TC1.5 — Email required validation

Leave **Email** blank and attempt to submit the form with all other fields filled.

**Expected:** A red inline error appears below the Email field: *"Email is required"*.
The form does not submit.

**Pass criteria:** Validation fires, no duplicate check or record creation occurs.

---

### TC1.6 — No match: Brand new player

| Field | Value |
|-------|-------|
| First Name | Patrick |
| Last Name | Kelly |
| Date of Birth | 2013-06-10 |
| Gender | Male |
| Email | patrick.kelly@test.ie |

**Expected:** No dialog, no banner. Player created immediately.

**Pass criteria:** Player is created without any matching UI appearing.

---

### TC1.7 — Phone boost: fuzzy name + matching phone upgrades to HIGH

**Setup:** Seed player P3 (Niamh Walsh) was created with phone `+353871234003`.

| Field | Value |
|-------|-------|
| First Name | Niave *(different spelling)* |
| Last Name | Walsh |
| Date of Birth | 2015-09-05 |
| Gender | Female |
| Email | different@test.ie |
| Phone | +353871234003 *(P3's phone)* |

**Expected:** Phone match boosts the score — blocking HIGH confidence dialog appears
showing Niamh Walsh as the candidate.

**Pass criteria:** Dialog appears (would have been MEDIUM or LOW on name alone).

---

### TC1.8 — HIGH confidence: Exact name + DOB (youth aged 18+)

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

The player role section of the join form now shows optional **Phone** (PhoneInput) and
**Postcode** fields. These are stored on the join request record and passed to the
matching engine as boost signals.

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

### TC4.2 — Phone boost on join request

Use a test user account with a **different name** from seed player P1 but supply the
matching phone number.

| Field | Value |
|-------|-------|
| Requested Role | Player |
| Date of Birth | 2014-03-15 |
| Phone | +353871234001 *(P1's phone)* |

**Expected:** Approval card shows a matched player (Ciarán Murphy) at high confidence
because phone boosted the score.

**Pass criteria:** `matchedYouthIdentityId` is populated on the join request record.

---

### TC4.3 — No match on join request

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

This flow has two sub-flows:
- **Auto-match panel** uses `findMatchingUnlinkedPlayers` (name + email, pre-existing) to
  suggest existing unlinked records.
- **"Create New" step** — clicking **"✓ Confirm — create this record"** first runs
  `findPlayerMatchCandidates` (with email from the user's BA account, plus the optional
  **Phone** and **Postcode** fields now visible in the create form) and shows an amber
  warning if HIGH or MEDIUM candidates are found. The admin must click **"Create anyway"**
  or **"Cancel"** before the record is created.

### TC5.1 — Auto-match on user with matching name

When an admin opens the edit panel for a user whose display name matches an existing
unlinked player in the org:

**Expected:** The "Player Record" section shows an auto-match candidate with
"Strong match" or "Possible match" badge. Buttons: **"Link"** and **"Not this player"**.

**Pass criteria:** Match candidate shown. Clicking "Link" assigns the existing
`playerIdentityId` to the user without creating a new record.

---

### TC5.2 — HIGH match warning on "Create New Player Record"

**Setup:** Create a test user account whose **display name is "Ciarán Murphy"** (matching
seed player P1). Open Admin → Users → Edit for that user. Select Player role. When no
auto-match is found (or dismiss it), click **"Can't find the record — create a new one"**.

| Step | Action |
|------|--------|
| 1 | Enter DOB `2014-03-15` in the Date of Birth field |
| 2 | Click **"✓ Confirm — create this record"** |

**Expected:** An amber warning box appears below the DOB field:
> "Possible existing player record(s) found: Ciarán Murphy — DOB 2014-03-15 (high match)"

Two buttons shown: **"Create anyway"** and **"Cancel"**.

**Pass criteria:**
- Warning box appears before any record is created.
- Clicking "Cancel" dismisses the warning and keeps the form open.
- Clicking "Create anyway" proceeds to create the record (no second prompt).

---

### TC5.3 — No warning when user has no match

**Setup:** Open Admin → Users → Edit for a user whose display name is **"Patrick Kelly"**.
Click "Can't find the record — create a new one".

| Field | Value |
|-------|-------|
| Date of Birth | 2013-06-10 |

Click **"✓ Confirm — create this record"**.

**Expected:** No warning box. Step transitions directly to "confirmed" and saving creates
the record.

**Pass criteria:** No amber warning shown. Record created successfully.

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

1. **Phone/postcode boost signals** only change confidence when combined with a name/DOB
   base match — they do not trigger a match on their own. Email is a stronger signal and
   can independently elevate a LOW to HIGH when it matches exactly.

2. **Signal coverage by entry point** (as of this implementation):
   | Field    | Add Player | Create New | Join Request | CSV Import | Email Invite |
   |----------|-----------|------------|--------------|------------|-------------|
   | Email    | Required  | Auto (BA)  | Auto (user)  | Column     | Entered      |
   | Phone    | Optional  | Optional   | Optional     | Column     | —            |
   | Postcode | Optional  | Optional   | Optional     | Column     | —            |

3. **CSV import matching** runs for ALL rows (not just adults). The default decision
   for HIGH is "accept" and for MEDIUM is "skip" — these can be overridden in the
   import preview UI before committing.

4. **Guardian/parent matching** is handled by a separate system (`getSmartMatchesForGuardian`)
   and is out of scope for this test plan.

5. **Admin Users → "Create New Player Record"** — gap closed. The "Confirm — create this
   record" button now runs `findPlayerMatchCandidates` before proceeding. HIGH and MEDIUM
   candidates surface an amber warning with "Create anyway" / "Cancel" options (TC5.2–5.3).
