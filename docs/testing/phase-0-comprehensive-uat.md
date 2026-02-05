# Phase 0.x Comprehensive UAT Test Plan

**Version**: 2.0
**Date**: February 5, 2026
**Scope**: Phase 0, 0.5, 0.6, 0.7 - Onboarding Sync & Address Management
**Status**: Ready for Testing

---

## Progress Summary

| Phase | Tests | Completed |
|-------|-------|-----------|
| Phase 0: Profile Completion | 17 | ☐ |
| Phase 0: Guardian Matching | 12 | ☐ |
| Phase 0.5: Player Postcode | 3 | ☐ |
| Phase 0.6: Address Collection | 21 | ☐ |
| Phase 0.7: Profile Address Sync | 20 | ☐ |
| Regression | 9 | ☐ |
| Database Verification | 9 | ☐ |
| **TOTAL** | **91** | |

---

## 1. Test Environment Setup

### 1.1 Prerequisites

- [ ] Dev server running on localhost:3000
- [ ] Convex backend configured and running
- [ ] Test organization: Demo Club (`jh7dq789ettp8gns6esw188q8h7zxq5r`)
- [ ] Admin account access

### 1.2 Test Data Import

- [ ] Import CSV via GAA Import: `/orgs/jh7dq789ettp8gns6esw188q8h7zxq5r/admin/gaa-import`
- [ ] CSV file: `scripts/ralph/test-data/phase-0.7-uat-gaa-import.csv`
- [ ] Verify 8 youth players imported
- [ ] Verify 7 guardian identities created

### 1.3 Test Accounts Created

| Email | Name | Purpose | Created |
|-------|------|---------|---------|
| `sarah.murphy.uat@example.com` | Sarah Murphy | Claim WITH address | ☐ |
| `patrick.oconnor.uat@example.com` | Patrick O'Connor | Claim WITHOUT address | ☐ |
| `mary.kelly.uat@example.com` | Mary Kelly | Multi-child guardian | ☐ |
| `fiona.walsh.uat@example.com` | Fiona Walsh | Edit address & sync | ☐ |

---

## 2. Phase 0: Profile Completion Tests

### 2.1 Profile Completion Step Display

- [ ] **P0-001**: Sign up new account with email not matching any guardian, complete GDPR consent → Profile completion modal appears with title "Help Us Find Your Children"
- [ ] **P0-002**: On profile completion modal → Info box explains why data is requested
- [ ] **P0-003**: On profile completion modal → Phone field visible with placeholder "+353 87 123 4567"
- [ ] **P0-004**: On profile completion modal → Postcode field visible with placeholder "BT61 7QR or D02 AF30"
- [ ] **P0-005**: On profile completion modal → Alternative email field visible, labeled as optional
- [ ] **P0-006**: On profile completion modal → "Skip for Now (3 left)" button visible
- [ ] **P0-007**: On profile completion modal → "Save & Continue" button visible

### 2.2 Skip Functionality

- [ ] **P0-008**: Click "Skip for Now (3 left)" → Toast: "Skipped for now. You can complete this 2 more times." Modal closes
- [ ] **P0-009**: Log out, log back in → Skip button shows "(2 left)"
- [ ] **P0-010**: Click "Skip for Now (2 left)" → Toast message, modal closes
- [ ] **P0-011**: Log out, log back in, click "Skip for Now (1 left)" → Toast: "This is your last skip."
- [ ] **P0-012**: Log out, log back in after 3 skips → Skip button NOT visible, must complete form

### 2.3 Form Validation

- [ ] **P0-013**: Leave all fields empty, click Save → Error toast: "Please provide at least one piece of information"
- [ ] **P0-014**: Enter invalid email "notanemail" in alt email field, click Save → Error toast: "Please enter a valid email address"
- [ ] **P0-015**: Type "bt61 7qr" in postcode field → Text automatically converts to "BT61 7QR"

### 2.4 Loading States

- [ ] **P0-016**: Fill form, click Save → Button shows spinner with "Saving...", button disabled
- [ ] **P0-017**: While save in progress → Skip button also disabled

---

## 3. Phase 0: Guardian Matching Tests

### 3.1 Email Match

- [ ] **P0-018**: Sign up with sarah.murphy.uat@example.com (Guardian's email) → Guardian claiming modal shows Sarah Murphy and Emma Murphy
- [ ] **P0-019**: Sign up with new email, provide sarah.murphy.uat@example.com as alt email → Guardian claiming modal shows Sarah Murphy

### 3.2 Phone Match

- [ ] **P0-020**: Sign up with new email, enter phone +447700100001 (Sarah Murphy's phone), Save → Guardian claiming modal shows Sarah Murphy
- [ ] **P0-021**: Enter phone as "07700100001" (no country code) → Still matches

### 3.3 Postcode + Surname Match

- [ ] **P0-022**: Sign up as "Sarah Murphy" with new email, enter postcode BT61 7PQ, Save → Guardian claiming modal shows Sarah Murphy

### 3.4 No Match Found

- [ ] **P0-023**: Sign up with completely new email, enter non-matching phone and postcode, Save → "No Children Found" modal appears
- [ ] **P0-024**: On No Children Found modal → Shows email, phone, postcode that were searched
- [ ] **P0-025**: On No Children Found modal → Shows bullet list of possible reasons
- [ ] **P0-026**: On No Children Found modal, click "Try Different Details" → Collapsible retry form appears with phone, alt email, postcode fields
- [ ] **P0-027**: On No Children Found modal → "Contact Club" button visible and functional
- [ ] **P0-028**: Click "Continue Without Linking" → Modal closes, user proceeds to app
- [ ] **P0-029**: Click "Try Different Details", enter matching phone, click "Search Again" → Guardian claiming modal appears if match found

---

## 4. Phase 0.5: Player Postcode Matching Tests

### 4.1 Player Postcode Bonus

- [ ] **P05-001**: Guardian linked to player with postcode BT61 7PQ, user registers with postcode BT61 7PQ → Match includes reason "Postcode matches linked player(s)"
- [ ] **P05-002**: Compare confidence with/without player postcode match → Score includes PLAYER_POSTCODE_BONUS (10 pts)
- [ ] **P05-003**: Guardian with postcode A linked to player with postcode B, user registers with postcode A → No "Postcode matches linked player" reason shown

---

## 5. Phase 0.6: Address Collection Tests

### 5.1 Address Fields in Profile Completion

- [ ] **P06-001**: Open profile completion modal → "Address (Optional)" collapsible section visible
- [ ] **P06-002**: Expand address section → Street Address field visible
- [ ] **P06-003**: Expand address section → Address Line 2 field visible with "(apt, unit, etc.)" hint
- [ ] **P06-004**: Expand address section → Town/City field visible
- [ ] **P06-005**: Expand address section → Postcode/Eircode field visible
- [ ] **P06-006**: Expand address section → County field visible
- [ ] **P06-007**: Expand address section → Country dropdown visible with Ireland, UK, US at top

### 5.2 Country-Dependent County Field

- [ ] **P06-008**: Select "Ireland" as country → County field becomes dropdown with 26 Irish counties + "Other"
- [ ] **P06-009**: Select Ireland, open county dropdown → All 26 counties listed (Dublin, Cork, Galway, etc.)
- [ ] **P06-010**: Select "United States" as country → County field becomes dropdown with 50 states + DC + territories
- [ ] **P06-011**: Select "United Kingdom" as country → County field becomes free text input
- [ ] **P06-012**: Select any other country → County field is free text input
- [ ] **P06-013**: Select Ireland, select "Dublin", change country to UK → County field cleared and changes to text input

### 5.3 Address Saves Correctly

- [ ] **P06-014**: Enter complete Irish address with county from dropdown, save → All fields saved to user table
- [ ] **P06-015**: Enter UK address with free text county, save → All fields saved correctly
- [ ] **P06-016**: Enter US address with state from dropdown, save → All fields saved correctly
- [ ] **P06-017**: Enter only town and postcode, save → Only provided fields saved, no errors

### 5.4 Address Display in Manage Users

- [ ] **P06-018**: View user in Manage Users (collapsed) → Address NOT visible on collapsed card
- [ ] **P06-019**: Expand user in Manage Users → Full address displayed in formatted layout
- [ ] **P06-020**: User has country "IE" → Displays "Ireland" not "IE"
- [ ] **P06-021**: User has only town and postcode → Shows only town and postcode, no empty fields

---

## 6. Phase 0.7: Profile Address Sync Tests

### 6.1 Schema Changes

- [ ] **P07-001**: Query guardianIdentities table → address2 field exists and accepts values
- [ ] **P07-002**: Query guardianIdentities table → county field exists and accepts values

### 6.2 Profile Settings Dialog

- [ ] **P07-003**: User Menu → Profile → Profile Settings → "Address" card section visible
- [ ] **P07-004**: View Address section → Street Address, Address Line 2, Town, Postcode, County, Country fields visible
- [ ] **P07-005**: User has address saved → Fields populated with user's current address
- [ ] **P07-006**: Select Ireland as country → County shows dropdown with 26 counties
- [ ] **P07-007**: Select United States as country → County shows dropdown with states
- [ ] **P07-008**: Type lowercase postcode → Automatically converted to uppercase

### 6.3 Address Save and Sync

- [ ] **P07-009**: Edit address in Profile Settings, Save → User table updated with new address
- [ ] **P07-010**: User has linked guardianIdentity, edit address, Save → guardianIdentities record updated with same address
- [ ] **P07-011**: User has NO linked guardianIdentity, edit address, Save → Address saved to user table, no errors
- [ ] **P07-012**: Update all 6 address fields, save → All 6 fields synced to guardianIdentities

### 6.4 Address Copy on Guardian Claim

- [ ] **P07-013**: User has no address, claims guardian with address → User's address populated from guardian
- [ ] **P07-014**: Claim guardian with full address → address, address2, town, county, postcode, country all copied
- [ ] **P07-015**: User has address, claims guardian with different address → User's original address preserved
- [ ] **P07-016**: Guardian has only address, town, postcode → Only those fields copied to user

### 6.5 Guardian Settings Display

- [ ] **P07-017**: Parent Dashboard → Guardian Settings → Address displayed in "Your Profile" section
- [ ] **P07-018**: View address in Guardian Settings → Format: Address line 1, line 2 / Town, postcode / County, Country
- [ ] **P07-019**: Guardian has country "IE" → Displays "Ireland"
- [ ] **P07-020**: Edit address in Profile Settings, return to Guardian Settings → Updated address displayed

---

## 7. Scenario-Based End-to-End Tests

### 7.1 Scenario 1: Claim Guardian WITH Address (Sarah Murphy)

- [ ] **E2E-001**: Sign in as `sarah.murphy.uat@example.com`
- [ ] **E2E-002**: Complete onboarding → System finds child Emma Murphy
- [ ] **E2E-003**: Claim guardian identity → Success
- [ ] **E2E-004**: Go to Profile Settings → Address pre-populated: "42 Oak Street, Armagh, BT61 7PQ"

### 7.2 Scenario 2: Claim Guardian WITHOUT Address (Patrick O'Connor)

- [ ] **E2E-005**: Sign in as `patrick.oconnor.uat@example.com`
- [ ] **E2E-006**: Complete onboarding → System finds child Liam O'Connor
- [ ] **E2E-007**: Claim guardian identity → Success
- [ ] **E2E-008**: Go to Profile Settings → Address fields are empty
- [ ] **E2E-009**: Enter address "10 Test Street, Belfast, BT1 1AA", save
- [ ] **E2E-010**: Verify address saved to user table
- [ ] **E2E-011**: Verify address synced to guardianIdentities

### 7.3 Scenario 3: Multi-Child Guardian (Mary Kelly)

- [ ] **E2E-012**: Sign in as `mary.kelly.uat@example.com`
- [ ] **E2E-013**: Complete onboarding → System finds BOTH children (Aoife AND Cian Kelly)
- [ ] **E2E-014**: Claim guardian identity → Success
- [ ] **E2E-015**: Go to Parent Dashboard → Both children visible
- [ ] **E2E-016**: Verify only ONE guardianIdentity exists (not two)

### 7.4 Scenario 4: Edit Profile & Verify Sync (Fiona Walsh)

- [ ] **E2E-017**: Sign in as `fiona.walsh.uat@example.com`
- [ ] **E2E-018**: Complete onboarding, claim guardian identity
- [ ] **E2E-019**: Verify initial address: "8 Mill Lane, Portadown, BT62 3CD"
- [ ] **E2E-020**: Go to Profile Settings, change address to: "100 New Address, Belfast, BT1 1AA"
- [ ] **E2E-021**: Save changes
- [ ] **E2E-022**: Go to Parent Dashboard → Guardian Settings
- [ ] **E2E-023**: Verify Guardian Settings shows NEW address "100 New Address, Belfast, BT1 1AA"

---

## 8. Regression Tests

### 8.1 GDPR Consent

- [ ] **REG-001**: Sign up new user → GDPR consent modal appears before profile completion
- [ ] **REG-002**: On GDPR modal → No skip option available

### 8.2 Invitation Flow

- [ ] **REG-003**: User has pending invite, logs in → Invitation acceptance step appears before profile completion

### 8.3 Guardian Claiming

- [ ] **REG-004**: Complete profile with matching signals → Guardian claiming dialog appears and works
- [ ] **REG-005**: Guardian has multiple children → Can accept/decline each child individually
- [ ] **REG-006**: Claim guardian and accept children → User granted Parent role in organization

### 8.4 Guardian Matching Scoring

- [ ] **REG-007**: Match via exact email → Score includes 50 points for email
- [ ] **REG-008**: Match via phone only → Score includes 30 points for phone
- [ ] **REG-009**: Match via surname and postcode → Score includes 45 points

---

## 9. Database Verification Tests

### 9.1 User Table Fields

- [ ] **DB-001**: Save phone "+353 87 123 4567" → Stored as normalized value
- [ ] **DB-002**: Save postcode "d02 af30" → Stored as "D02 AF30"
- [ ] **DB-003**: Save alt email "Test@EXAMPLE.com" → Stored as "test@example.com"
- [ ] **DB-004**: Complete profile → profileCompletionStatus = "completed"
- [ ] **DB-005**: Complete profile → profileCompletedAt timestamp present
- [ ] **DB-006**: Skip profile 2 times → profileSkipCount = 2

### 9.2 guardianIdentities Fields

- [ ] **DB-007**: Query guardianIdentities schema → address2: v.optional(v.string()) present
- [ ] **DB-008**: Query guardianIdentities schema → county: v.optional(v.string()) present
- [ ] **DB-009**: User edits address, save → guardianIdentities has matching values

---

## Test Completion Sign-Off

**Tester**: ___________________________ **Date**: _______________

**All tests passed**: ☐ Yes ☐ No

**Issues found**:
-
-
-

**Notes**:



---

## Appendix A: Test Data Reference

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

### Guardians (7)

| Name | Email | Phone | Address |
|------|-------|-------|---------|
| Sarah Murphy | sarah.murphy.uat@example.com | +447700100001 | 42 Oak Street, Armagh, BT61 7PQ |
| Patrick O'Connor | patrick.oconnor.uat@example.com | +447700100002 | *(none)* |
| Mary Kelly | mary.kelly.uat@example.com | +447700100003 | 15 Church Road, Dungannon, BT70 1AB |
| Fiona Walsh | fiona.walsh.uat@example.com | +447700100004 | 8 Mill Lane, Portadown, BT62 3CD |
| Margaret Byrne | margaret.byrne.uat@example.com | +447700100005 | 23 Main Street, Lurgan |
| Michael Doyle | michael.doyle.uat@example.com | +447700100006 | 101 Station Road, Newry, BT35 6EF |
| Louise Ryan | louise.ryan.uat@example.com | +447700100007 | 7 Park View, Craigavon, BT65 5GH |

## Appendix B: Matching Score Reference

| Signal | Points |
|--------|--------|
| Email exact match | 50 |
| Surname + Postcode | 45 |
| Surname + Town | 35 |
| Phone match | 30 |
| Postcode only | 20 |
| Player postcode bonus | 10 |
| Town only | 10 |
| House number | 5 |

**Confidence Thresholds:**
- High (auto-link): >= 60 points
- Medium (suggest): >= 40 points
- Low (show as possible): >= 20 points

## Appendix C: Irish Counties List

Carlow, Cavan, Clare, Cork, Donegal, Dublin, Galway, Kerry, Kildare, Kilkenny, Laois, Leitrim, Limerick, Longford, Louth, Mayo, Meath, Monaghan, Offaly, Roscommon, Sligo, Tipperary, Waterford, Westmeath, Wexford, Wicklow
