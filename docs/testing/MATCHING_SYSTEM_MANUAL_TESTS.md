# Player Matching System — Manual Test Plan

**Purpose:** Verify the unified matching system detects duplicates at every entry point
before a new player record is created.

**System under test:**
- `findPlayerMatchCandidates` / `findBestPlayerMatch` — `packages/backend/convex/models/playerMatching.ts`
- `findPotentialDuplicatesForOrg` / `getMergePreview` / `mergePlayerIdentities` — `packages/backend/convex/models/playerIdentities.ts`

**Last updated:** Post-merge (`Adult-Player-Phase5a-MainMerge` branch)

---

## Matching Priority Order

The system checks signals in this order — a higher-priority hit short-circuits lower tiers:

| Priority | Tier | Signal | Confidence |
|----------|------|--------|-----------|
| -1 | Federation ID | FAI / IRFU / GAA / Other number exact match | HIGH (definitive) |
| 0 | Exact name + DOB | `by_name_dob` index (case-sensitive) | HIGH |
| 0.5 | Normalized name + DOB | `by_normalized_name_dob` index — strips fada, O'/Mc/Mac prefix, hyphens | HIGH |
| 1 | Fuzzy name + DOB | Levenshtein + Irish alias phonetics, org-scoped | HIGH / MEDIUM / LOW |

Signal boosts applied on top of any tier: **Email +25**, **Phone +20**, **Postcode +15**, **Address +10**.

---

## Test Files

Two CSV files live in `docs/testing/`:

| File | Purpose | When to use |
|------|---------|------------|
| `seed-players.csv` | Creates the 5 base players that all tests match against | **Phase 0 only** — import once before starting any tests |
| `test-import-matching.csv` | 9 rows designed to trigger every confidence tier | **Entry Point 3 only** — import in preview mode, observe results, do **not** commit |

---

## Test Order

Run the phases in this sequence. Skipping Phase 0 will cause all subsequent tests to fail.

```
Phase 0  →  EP1  →  EP2  →  EP3  →  EP4  →  EP5  →  Phase 6
(seed)      (add)   (invite) (CSV)  (join)  (users) (dedup)
```

Phase 6 (Dedup Panel) depends on a deliberate duplicate created during EP1 — see its Setup section.

---

## Prerequisites

Complete **Phase 0: Seed Base Players** before running any other tests.
Every test in later phases depends on these records already existing.

---

## Phase 0: Seed Base Players

### Step 1 — Import the seed CSV

1. Go to **Admin → Player Import**
2. Click **Download Template** to confirm your org's Age Group and Sport labels, then close
3. Open `docs/testing/seed-players.csv` in a text editor and update the `AgeGroup` and
   `Sport` columns to match your org exactly (e.g. `U12` → `U-12`, `GAA Football` → `GAA`)
4. Upload the edited file and click **Parse**
5. Review the preview — all 5 rows should parse without errors (red rows indicate a bad
   Age Group or Sport value — fix the CSV and re-upload)
6. Click **Import** to commit

> **Note on P2 (Mary O'Brien, born 1990):** She is an adult player. If your import rejects
> adult DOBs or shows a warning, add her manually via **Admin → Players → "+ Add Player"**
> instead, using the values in the table below.

| Ref | First Name | Last Name | DOB | Gender | Age Group | Sport | Postcode | Federation |
|-----|-----------|-----------|-----|--------|-----------|-------|----------|-----------|
| P1 | Ciarán | Murphy | 2014-03-15 | Male | U12 | GAA Football | D01 A001 | — |
| P2 | Mary | O'Brien | 1990-07-22 | Female | Senior | Soccer | D02 A002 | — |
| P3 | Niamh | Walsh | 2015-09-05 | Female | U11 | Soccer | D03 A003 | — |
| P4 | Seán | Brennan | 2006-04-18 | Male | U18 | Rugby | D04 A004 | — |
| P5 | Jack | Walsh | 2009-03-10 | Male | U16 | GAA Football | D05 A005 | GAA: GAA-99001 |

**Verify:** All five names appear in the player list before moving to Step 2.

---

### Step 2 — Add email and phone to each player (manual)

The CSV importer does not support player email or player phone — only parent contact
fields. These signals are required for the phone boost tests (TC1.7, TC4.1, TC4.2), so
add them now via each player's edit form.

1. In **Admin → Players**, open each player and click **Edit**
2. Fill in the Email and Phone fields from the table below and save

| Ref | Player | Email | Phone |
|-----|--------|-------|-------|
| P1 | Ciarán Murphy | ciaran.murphy@test.ie | +353871234001 |
| P2 | Mary O'Brien | mary.obrien@test.ie | +353871234002 |
| P3 | Niamh Walsh | niamh.walsh@test.ie | +353871234003 |
| P4 | Seán Brennan | sean.brennan@test.ie | +353871234004 |
| P5 | Jack Walsh | jack.walsh@test.ie | +353871234005 |

**Verify:** Open P3 (Niamh Walsh) and confirm both email and phone are saved before proceeding.

---

## Entry Point 1: Admin Manually Adds a Player

**Location:** Admin → Players → "+ Add Player" button

The form collects **Email** (required), **Phone** (optional), **Sport** (optional), and
**Postcode** (optional, in the address section) — all passed to `findPlayerMatchCandidates`.

### Two matching mechanisms work together in EP1

The Add Player form runs **two parallel matching systems**:

| # | Mechanism | When it fires | UI shown | Action |
|---|-----------|--------------|----------|--------|
| 1 | **Live inline panel** (`findPotentialMatches`) | As you type — once firstName ≥ 2 chars, lastName ≥ 2 chars, and DOB are filled | Amber panel with match cards and **"Use This Player"** button | Click "Use This Player" → green banner → submit enrolls existing player |
| 2 | **Blocking submit dialog** (`findPlayerMatchCandidates`) | When you click "Add Player" (submit) and no existing player was selected | Dialog: **"Existing Player Record Found"** | "Link to Existing Record" or "Create New Profile" |

The inline panel is the **primary path** — most users will click "Use This Player" before reaching submit.
The blocking dialog is the **safety net** — it catches cases where the user ignores the inline panel.

---

### TC1.1 — HIGH confidence: Exact name + DOB (youth)

| Field | Value |
|-------|-------|
| First Name | Ciarán |
| Last Name | Murphy |
| Date of Birth | 2014-03-15 |
| Gender | Male |
| Email | test1@test.ie |

**Path A — inline panel (primary):**
Fill in First Name, Last Name, and DOB. Before you reach the Email field, an amber
**"Existing players found"** panel appears with a Ciarán Murphy card showing
`high (100)` confidence and a **"Use This Player"** button.
Click it → the panel is replaced by a green **"Using existing player identity"** banner.
Fill in the remaining required fields and click **"Add Player"** → the existing record is
enrolled in the org (no new `playerIdentity` created).

**Path B — blocking dialog (safety net):**
Fill in all fields (including Email) and click **"Add Player"** without clicking "Use This Player".
A modal dialog titled **"Existing Player Record Found"** appears. Shows Ciarán Murphy's
DOB and `youth` player type. Two buttons: **"Link to Existing Record"** and **"Create New Profile"**.

**Pass criteria:**
- Path A: inline amber panel appears after name + DOB are typed. "Use This Player" works.
- Path B: blocking dialog appears on submit. "Link to Existing Record" enrolls existing record (no new playerIdentity). "Create New Profile" creates a separate record.

---

### TC1.2 — HIGH confidence: Exact name + DOB (adult-to-adult)

| Field | Value |
|-------|-------|
| First Name | Mary |
| Last Name | O'Brien |
| Date of Birth | 1990-07-22 |
| Gender | Female |
| Email | test2@test.ie |

**Expected:** Same blocking dialog. Candidate shown as `adult` player type.
"Link to Existing Record" enrolls the existing adult record (no type transition).

**Pass criteria:** Dialog appears, playerType shows "adult".

---

### TC1.3 — HIGH confidence: Diacritic variant (Ciaran = Ciarán via normalized index)

> **Behaviour change from pre-merge:** Previously this showed MEDIUM confidence (Levenshtein
> edit distance). Now the `by_normalized_name_dob` index (Priority 0.5) normalises both
> "Ciaran" and "Ciarán" to "ciaran", so they are an exact match at the DB level — **HIGH**.
> This correctly reflects that removing a fada is a common data-entry error, not a different person.

| Field | Value |
|-------|-------|
| First Name | Ciaran *(no fada)* |
| Last Name | Murphy |
| Date of Birth | 2014-03-15 |
| Gender | Male |
| Email | test3@test.ie |

**Expected:** Blocking dialog appears (HIGH confidence), matching to Ciarán Murphy.

**Pass criteria:** Dialog appears (not just an amber banner). Confidence is HIGH.

---

### TC1.4 — HIGH confidence: Irish phonetic alias (Niamh → Neeve), exact DOB

| Field | Value |
|-------|-------|
| First Name | Neeve *(Irish phonetic of Niamh)* |
| Last Name | Walsh |
| Date of Birth | 2015-09-05 |
| Gender | Female |
| Email | test4@test.ie |

**Expected:** Blocking dialog appears, matching to Niamh Walsh. Caught by Irish alias
phonetics in the fuzzy tier (Priority 1).

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

**Pass criteria:** Player created without any matching UI appearing.

---

### TC1.7 — Fuzzy first name + exact last name + DOB = HIGH

**Setup:** Seed player P3 (Niamh Walsh) was created with phone `+353871234003`.

> **Scoring note:** DOB + exact last name meets the tier-1 HIGH threshold in both the inline
> panel and the blocking dialog — the phone boost adds to the score but is not required to
> reach HIGH here. The phone signal would be needed to upgrade a case where both first AND
> last name are fuzzy.

| Field | Value |
|-------|-------|
| First Name | Niave *(different spelling)* |
| Last Name | Walsh |
| Date of Birth | 2015-09-05 |
| Gender | Female |
| Email | different@test.ie |
| Phone | +353871234003 *(P3's phone)* |

**Expected:**
- Inline panel shows Niamh Walsh card with **high** confidence badge (not medium).
- Clicking "Add Player" triggers the blocking HIGH confidence dialog.

**Pass criteria:** Both the inline panel badge AND the blocking dialog show HIGH.

---

### TC1.8 — HIGH confidence: Exact name + DOB (youth aged 18+)

| Field | Value |
|-------|-------|
| First Name | Seán |
| Last Name | Brennan |
| Date of Birth | 2006-04-18 |
| Gender | Male |
| Email | test8@test.ie |

**Expected:** Blocking dialog. Candidate shown as `youth` player type.
"Link to Existing Record" triggers `transitionToAdult` + enroll.

**Pass criteria:** Dialog appears. Linking transitions the youth record to adult.

---

### TC1.9 — DEFINITIVE HIGH: Federation ID exact match (Priority -1)

**Setup:** Seed player P5 (Jack Walsh) was created with GAA Number `GAA-99001`.

| Field | Value |
|-------|-------|
| First Name | Seán *(completely different name)* |
| Last Name | Walsh |
| Date of Birth | 2009-03-10 |
| Gender | Male |
| Email | test9@test.ie |
| Federation → GAA | GAA-99001 *(P5's GAA number)* |

> Expand the **"Federation Numbers"** collapsible at the bottom of the form and enter the GAA number.

> **Important — two separate systems, two separate observations:**
>
> The **inline panel** (reactive, appears while typing) uses `findPotentialMatches` which does
> **not accept federation IDs**. It will always show **0.9** for Jack Walsh based on DOB + last
> name, regardless of whether you enter the GAA number. This is expected and correct.
>
> The **blocking dialog** (fires when you click "Add Player") uses `findPlayerMatchCandidates`
> which does receive the GAA number. _Without_ the GAA number it shows score ~80 (DOB + last
> name). _With_ `GAA-99001` it shows score **100** with matched field `federationId:gaa` — this
> is what the test is verifying.
>
> **To observe the federation ID effect: you must click "Add Player"** and look at the blocking
> dialog's score and matched fields, not the inline panel badge.

**Expected (with GAA number entered):** Blocking dialog appears at HIGH confidence (score: 100)
showing Jack Walsh. The matched field reads `federationId:gaa`.

**Pass criteria:** Score is 100 and matched field is `federationId:gaa` — NOT `dateOfBirth, lastName`.
This demonstrates Priority -1 short-circuiting all other tiers.

---

### TC1.10 — Server-side safety net (findOrCreatePlayer)

> This test verifies that the **server-side** `findOrCreatePlayer` mutation (from main's
> PR 572) acts as a data integrity net — even if someone bypasses the client-side dialog.

**Setup:** After TC1.1's HIGH dialog appeared and you dismissed without linking, attempt
to call `findOrCreatePlayer` directly via the Convex dashboard with P1's details:

```json
{
  "firstName": "Ciarán",
  "lastName": "Murphy",
  "dateOfBirth": "2014-03-15",
  "gender": "male",
  "organizationId": "<your-org-id>",
  "createdFrom": "manual_admin"
}
```

**Expected:** The mutation returns `{ playerIdentityId: <P1's ID>, wasCreated: false }`.
No new record is created. The server found P1 via its own 3-tier check.

**Pass criteria:** `wasCreated` is `false`. P1's existing `_id` is returned.

---

## Entry Point 2: Admin Invites a User (Email Invite with Player Role)

**Location:** Admin → Users → "+ Invite Member" → toggle **Player** role

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

> ⚠️ **Do not commit this import.** This test is purely observational — you are checking
> the confidence levels and default decisions shown in the preview screen. Committing would
> create extra records and links that interfere with subsequent tests. Stop at the preview.
> If you accidentally commit, re-seed from `seed-players.csv` before continuing.

### Steps

1. Go to **Admin → Player Import**
2. Upload `docs/testing/test-import-matching.csv` and click **Parse**
3. The preview table will show 9 rows — check each row against the Expected Results table below
4. **Do not click Import** — close or navigate away when done

### What the CSV tests

The file covers every matching confidence tier in a single import:

| Column used | Signal |
|-------------|--------|
| FirstName + LastName + DateOfBirth | Name/DOB — all tiers |
| Postcode | Address boost (+15 score) |
| GAANumber | Federation ID Priority -1 (definitive HIGH) |

> Player Email and Phone are not CSV columns — email boost does not apply here.
> The matching signals available for CSV are: name/DOB, postcode, and federation IDs.

### Expected Results

| Row | Player in CSV | Tier hit | Expected confidence | Expected default |
|-----|--------------|----------|---------------------|-----------------|
| 1 | Ciarán Murphy 2014-03-15, Postcode D01 A001 | Priority 0 (exact) + postcode boost | HIGH (score ~105) | accept — link to P1 |
| 2 | Ciaran Murphy 2014-03-15 | Priority 0.5 (normalised index) | **HIGH** *(was MEDIUM pre-merge)* | accept — link to P1 |
| 3 | Mary O'Brien 1990-07-22, Postcode D02 A002 | Priority 0 (exact) + postcode boost | HIGH (score ~105) | accept — link to P2 |
| 4 | Niamh Walsh 2015-09-05 | Priority 0 (exact) | HIGH | accept — link to P3 |
| 5 | Neeve Walsh 2015-09-05 | Priority 1 (Irish alias) | HIGH | accept — link to P3 |
| 6 | Seán Brennan 2006-04-18 | Priority 0 (exact) | HIGH | accept — link to P4 |
| 7 | Patrick Kelly 2013-06-10 | None | None | create new |
| 8 | Seán Walsh 2009-03-10 + GAANumber GAA-99001 | **Priority -1** (federation ID) | HIGH (score 100) | accept — link to P5 |
| 9 | Seán Walsh 2009-03-10, no GAA number | Priority 1 (lastName + DOB fuzzy) | MEDIUM | skip |

**Pass criteria:**
- Rows 1, 2, 3, 4, 5, 6, 8 show HIGH (green badge).
- Row 9 shows MEDIUM (amber) — Row 8 vs Row 9 side-by-side shows exactly what the GAA number adds.
- Row 7 shows no match.
- Default decisions match the table above.

> **Row 2:** "Ciaran" (no fada) was MEDIUM before the merge. The normalised name index now
> stores "ciaran" for both spellings — correctly HIGH. This is a deliberate improvement.

---

## Entry Point 4: Self-Registration / Join Request

**Location:** Organisation join page (the public join URL for your org)

Tests the backend `findBestPlayerMatchInternal` call inside `createJoinRequest`.
The match is stored on the join request and shown to the admin on the approval screen.

The join form shows optional **Phone** (PhoneInput) and **Postcode** fields when Player
role is selected. These are passed to the matching engine as boost signals.

### TC4.1 — Match stored on join request (player role)

| Field | Value |
|-------|-------|
| Requested Role | Player |
| Date of Birth | 2014-03-15 |

**Expected:** After submitting, go to **Admin → Users → Pending Requests**.
The approval card shows:
> "Matched player: Ciarán Murphy (high confidence)"

**Pass criteria:** `matchedYouthIdentityId` is populated. Admin approval screen shows
matched player name and confidence.

---

### TC4.2 — Phone boost on join request

Use a test user account with a **different name** from P1 but supply P1's phone number.

| Field | Value |
|-------|-------|
| Requested Role | Player |
| Date of Birth | 2014-03-15 |
| Phone | +353871234001 *(P1's phone)* |

**Expected:** Approval card shows Ciarán Murphy as a high-confidence match.
Phone signal boosted what would have been a lower match (different name, same DOB).

**Pass criteria:** `matchedYouthIdentityId` is populated.

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

**Location:** Admin → Users → Edit member with Player role → Player Record section

### TC5.1 — Auto-match on user with matching name

Open the edit panel for a user whose display name matches an existing unlinked player.

**Expected:** "Player Record" section shows an auto-match candidate with "Strong match"
or "Possible match" badge. Buttons: **"Link"** and **"Not this player"**.

**Pass criteria:** Candidate shown. "Link" assigns the existing playerIdentityId without
creating a new record.

---

### TC5.2 — HIGH match warning on "Create New Player Record"

**Setup:** Create a test user with display name **"Ciarán Murphy"**. Open Admin → Users →
Edit for that user. Select Player role. Click **"Can't find the record — create a new one"**.

| Step | Action |
|------|--------|
| 1 | Enter DOB `2014-03-15` in the Date of Birth field |
| 2 | Click **"✓ Confirm — create this record"** |

**Expected:** An amber warning box appears:
> "Possible existing player record(s) found: Ciarán Murphy — DOB 2014-03-15 (high match)"

Two buttons: **"Create anyway"** and **"Cancel"**.

**Pass criteria:** Warning appears before record is created. "Cancel" dismisses.
"Create anyway" proceeds without a second prompt.

---

### TC5.3 — No warning when user has no match

**Setup:** User with display name **"Patrick Kelly"**. Click "Can't find the record — create a new one".

| Field | Value |
|-------|-------|
| Date of Birth | 2013-06-10 |

Click **"✓ Confirm — create this record"**.

**Expected:** No warning. Step transitions directly to "confirmed" and saving creates the record.

**Pass criteria:** No amber warning shown. Record created successfully.

---

## Phase 6: Admin Dedup Panel & Merge Dialog

**Location:** Admin → Players — stat card area at the top of the page

This feature (from main's PR 573) surfaces potential duplicate player identities within
the org and lets an admin merge them in a side-by-side dialog.

### Setup

To get the dedup panel to show data, first create a deliberate duplicate:
1. Go to Admin → Players → "+ Add Player"
2. Enter a player with slightly different spelling but same DOB as an existing seed player
   (e.g. "Ciara" Murphy, 2014-03-15). The HIGH dialog will appear — click **"Create New Profile"**
   to force-create the duplicate.
3. You should now have two records: Ciarán Murphy and Ciara Murphy with the same DOB.

---

### TC6.1 — Dedup stat card shows potential duplicates

**Expected:** An amber **"Potential Duplicates"** stat card appears at the top of the
Players page showing a non-zero count (e.g. "2 potential duplicate pairs").

**Pass criteria:** Stat card is visible and shows at least the Murphy pair.

---

### TC6.2 — Expand a duplicate group

Click the **"Potential Duplicates"** stat card to open the review panel.

**Expected:** The panel expands below the stat cards. Shows one or more groups, each
listing player names, DOBs, and a **"Review / Merge"** button.

**Pass criteria:** Murphy group is visible. Each row shows name, DOB, and player type.

---

### TC6.3 — Merge dialog: side-by-side view

Click **"Review / Merge"** on the Murphy duplicate pair.

**Expected:** A dialog opens with:
- **Left card** (keep): Original Ciarán Murphy — `_id`, DOB, playerType, creation date
- **Right card** (remove): New Ciara Murphy — same fields
- An **"↔ Swap"** button to flip which is kept and which is removed
- A count of **affected records** that will be reassigned (enrollments, health checks, etc.)
- A **"Confirm Merge"** button

**Pass criteria:** Side-by-side layout renders. Swap button works (left/right switch).
Affected record count is shown.

---

### TC6.4 — Confirm merge

Click **"Confirm Merge"** in the dialog.

**Expected:**
- Dialog closes
- Duplicate group disappears from the dedup panel (or count decreases)
- In the player list, only one "Murphy" record remains
- The removed record has `mergedInto` set in the Convex dashboard (`playerIdentities` table)

**Pass criteria:**
- Only one Murphy in the player list
- Convex dashboard shows `mergedInto` on the removed identity
- No enrollment records lost — all previously on the removed identity are now on the kept identity

---

### TC6.5 — Audit trail in playerIdentityMerges table

After TC6.4, check the Convex dashboard:
1. Open the `playerIdentityMerges` table
2. Find the most recent entry

**Expected:** A record showing `keptId`, `removedId`, `mergedBy`, `mergedAt`, and the list
of affected tables/counts.

**Pass criteria:** Audit record exists and contains accurate data.

---

## Entry Point 6: Graduation Claim (autoClaimByEmail)

**Location:** Triggered automatically when an adult user logs in with a graduation invite.

The graduation flow is token-scoped (matched via the graduation invite email) — the
general player matching system does not run here. The token already identifies the
specific record.

**Status:** Not applicable for duplicate matching testing. Covered in the Phase 4/5
adult player lifecycle test plan.

---

## What to Record

For each test case, note:
- ✅ Pass — matching UI appeared as expected
- ❌ Fail — no matching UI, or wrong behaviour
- ⚠️ Partial — matching UI appeared but with wrong data

If a test fails, check the browser console for errors and the Convex dashboard logs
for any `ReturnsValidationError` or query failures.

---

## Known Limitations

1. **Boost signals do not trigger matches on their own.** Phone, postcode, and address only
   modify the score/confidence of a name+DOB base match — they don't surface a match if
   name/DOB doesn't meet the minimum threshold. Email is a stronger signal and can elevate
   a LOW match to HIGH.

2. **Diacritic removal is now HIGH confidence.** Since the merge, "Ciaran" and "Ciarán"
   both normalise to "ciaran" at the DB index level and are treated as a HIGH match
   (Priority 0.5). Previously this was MEDIUM via Levenshtein. This change is intentional.

3. **CSV import does not support player Email or player Phone.** Only `ParentEmail` and
   `ParentPhone` are parsed. The matching signals for CSV rows are: Name+DOB, Postcode,
   and Federation IDs (GAANumber, IRFUNumber, FAINumber).

4. **Signal coverage by entry point:**

   | Field | Add Player | Create New | Join Request | CSV Import | Email Invite |
   |-------|-----------|------------|--------------|------------|-------------|
   | Email | Required | Auto (BA user) | Auto (user) | — | Entered |
   | Phone | Optional | Optional | Optional | — | — |
   | Postcode | Optional | Optional | Optional | Column | — |
   | GAA Number | Federation field | — | — | GAANumber column | — |
   | IRFU Number | Federation field | — | — | IRFUNumber column | — |
   | FAI Number | Federation field | — | — | FAINumber column | — |

5. **Guardian/parent matching** is handled by `getSmartMatchesForGuardian` and is out of
   scope for this test plan.

6. **Two-layer architecture.** The client-side `findPlayerMatchCandidates` provides UX
   transparency (the dialog/banner). The server-side `findOrCreatePlayer` is a data integrity
   safety net that also catches duplicates even if the UI dialog is bypassed.
