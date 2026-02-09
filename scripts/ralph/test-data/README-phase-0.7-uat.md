# Phase 0.7 UAT Test Data

## Files

| File | Format | Purpose |
|------|--------|---------|
| `phase-0.7-uat-gaa-import.csv` | CSV | GAA Foireann-style import for Demo Club |
| `phase-0.7-uat-import.json` | JSON | Reference documentation with test scenarios |

## Quick Start

### Step 1: Import the CSV

1. Navigate to: `/orgs/jh7dq789ettp8gns6esw188q8h7zxq5r/admin/gaa-import`
2. Paste the contents of `phase-0.7-uat-gaa-import.csv`
3. Select appropriate team(s) or create new ones
4. Click Import

### Step 2: Create Test User Accounts

Create these accounts to test claiming guardian identities:

| Email | Password | Purpose |
|-------|----------|---------|
| `sarah.murphy.uat@example.com` | `TestPass123!` | Claim guardian WITH full address |
| `patrick.oconnor.uat@example.com` | `TestPass123!` | Claim guardian WITHOUT address |
| `mary.kelly.uat@example.com` | `TestPass123!` | Multi-child guardian |
| `fiona.walsh.uat@example.com` | `TestPass123!` | Edit address & verify sync |

## Test Scenarios

### Scenario 1: Claim Guardian WITH Address
**User:** Sarah Murphy (`sarah.murphy.uat@example.com`)
**Expected:** When she claims her guardian identity, the address "42 Oak Street, Armagh, BT61 7PQ" should copy to her user profile.

**Steps:**
1. Sign up/sign in as Sarah Murphy
2. Complete onboarding - system should find her child (Emma Murphy)
3. After claiming, go to Profile Settings
4. **Verify:** Address fields are pre-populated with imported address

### Scenario 2: Claim Guardian WITHOUT Address
**User:** Patrick O'Connor (`patrick.oconnor.uat@example.com`)
**Expected:** When he claims his guardian identity, no address should copy (because none was imported).

**Steps:**
1. Sign up/sign in as Patrick O'Connor
2. Complete onboarding - system should find his child (Liam O'Connor)
3. After claiming, go to Profile Settings
4. **Verify:** Address fields are empty
5. Enter an address manually
6. **Verify:** Address saves to both user table AND guardianIdentities

### Scenario 3: Multi-Child Guardian
**User:** Mary Kelly (`mary.kelly.uat@example.com`)
**Expected:** She should see both children (Aoife and Cian) linked to a single guardian identity.

**Steps:**
1. Sign up/sign in as Mary Kelly
2. Complete onboarding
3. **Verify:** Both children appear in her Parent Dashboard
4. **Verify:** Only ONE guardian identity was created (not two)

### Scenario 4: Edit Profile & Verify Sync
**User:** Fiona Walsh (`fiona.walsh.uat@example.com`)
**Expected:** Editing address in Profile Settings should sync to guardianIdentities.

**Steps:**
1. Sign up/sign in as Fiona Walsh
2. Claim guardian identity
3. Go to Profile Settings (user menu → Profile)
4. Change address to: "100 New Address, Belfast, BT1 1AA"
5. Save
6. Go to Parent Dashboard → Settings
7. **Verify:** Guardian Settings shows the NEW address

## Test Data Summary

### Youth Players (8)

| Name | DOB | Guardian | Address |
|------|-----|----------|---------|
| Emma Murphy | 2014-03-15 | Sarah Murphy | 42 Oak Street, Armagh, BT61 7PQ |
| Liam O'Connor | 2013-07-22 | Patrick O'Connor | *(none)* |
| Aoife Kelly | 2012-01-10 | Mary Kelly | 15 Church Road, Dungannon, BT70 1AB |
| Cian Kelly | 2015-09-05 | Mary Kelly | 15 Church Road, Dungannon, BT70 1AB |
| Noah Walsh | 2014-11-30 | Fiona Walsh | 8 Mill Lane, Portadown, BT62 3CD |
| Saoirse Byrne | 2016-04-18 | Margaret Byrne | 23 Main Street, Lurgan *(no postcode)* |
| Oscar Doyle | 2011-08-25 | Michael Doyle | 101 Station Road, Newry, BT35 6EF |
| Niamh Ryan | 2013-12-03 | Louise Ryan | 7 Park View, Craigavon, BT65 5GH |

### Adult Members / Guardians (7)

| Name | DOB | Email | Address |
|------|-----|-------|---------|
| Sarah Murphy | 1985-04-20 | sarah.murphy.uat@example.com | 42 Oak Street, Armagh |
| Patrick O'Connor | 1982-06-15 | patrick.oconnor.uat@example.com | *(none)* |
| Mary Kelly | 1980-02-28 | mary.kelly.uat@example.com | 15 Church Road, Dungannon |
| Fiona Walsh | 1983-09-10 | fiona.walsh.uat@example.com | 8 Mill Lane, Portadown |
| Margaret Byrne | 1955-11-05 | margaret.byrne.uat@example.com | 23 Main Street, Lurgan |
| Michael Doyle | 1978-07-12 | michael.doyle.uat@example.com | 101 Station Road, Newry |
| Louise Ryan | 1981-03-22 | louise.ryan.uat@example.com | 7 Park View, Craigavon |

## Expected Import Results

- **Total rows:** 15
- **Youth players:** 8
- **Adult members:** 7
- **Unique guardians created:** 7
- **Guardians with full address:** 5
- **Guardians with partial address:** 1 (Lurgan, no postcode)
- **Guardians with no address:** 1 (Patrick O'Connor)

## Cleanup

After testing, you can delete:
1. Test user accounts (via Manage Users)
2. Imported players (via Admin Players page)
3. Guardian identities are automatically cleaned up when no longer referenced
