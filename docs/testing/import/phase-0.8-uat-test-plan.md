# Phase 0.x Comprehensive UAT Test Plan

**Version**: 3.0
**Date**: February 5, 2026
**Scope**: Phase 0, 0.5, 0.6, 0.7, **0.8** - Onboarding Sync, Address Management & Flow Differentiation
**Status**: Ready for Testing

---

## Progress Summary

| Phase | Tests | Completed |
|-------|-------|-----------|
| Phase 0: Profile Completion | 17 | ☐ |
| Phase 0: Guardian Matching (Invited Users) | 8 | ☐ |
| Phase 0.5: Player Postcode | 3 | ☐ |
| Phase 0.6: Address Collection | 21 | ☐ |
| Phase 0.7: Profile Address Sync | 20 | ☐ |
| **Phase 0.8: Flow Differentiation** | **24** | ☐ |
| Regression | 12 | ☐ |
| Database Verification | 12 | ☐ |
| **TOTAL** | **117** | |

---

## ⚠️ IMPORTANT: Phase 0.8 Behavior Changes

Phase 0.8 introduced significant changes to the onboarding flow:

1. **Invited vs Self-Registered Users**: The system now explicitly tracks whether a user was invited
2. **Self-Registered Users Skip Guardian Matching**: They no longer see `guardian_claim` or `no_children_found` during onboarding
3. **Profile Completion Messaging**: Changed from "Help Us Find Your Children" to "Additional Information"
4. **Admin Approval Creates Links**: Guardian/child linking for self-registered users happens at admin approval time
5. **`no_children_found` Removed**: This step no longer exists in the onboarding flow

---

## 1. Test Environment Setup

### 1.1 Prerequisites

- [ ] Dev server running on localhost:3000
- [ ] Convex backend configured and running
- [ ] Test organization: Demo Club (`jh7dq789ettp8gns6esw188q8h7zxq5r`)
- [ ] Admin account access
- [ ] Fresh test data imported (see 1.2)

### 1.2 Test Data Import

- [ ] Import CSV via GAA Import: `/orgs/jh7dq789ettp8gns6esw188q8h7zxq5r/admin/gaa-import`
- [ ] CSV file: `scripts/ralph/test-data/phase-0.7-uat-gaa-import.csv`
- [ ] Verify 8 youth players imported
- [ ] Verify 7 guardian identities created

### 1.3 Test Accounts Required

| Email | Name | Purpose | Type |
|-------|------|---------|------|
| `sarah.murphy.uat@example.com` | Sarah Murphy | Invited parent - claim child | Invited |
| `patrick.oconnor.uat@example.com` | Patrick O'Connor | Invited parent - no address | Invited |
| `mary.kelly.uat@example.com` | Mary Kelly | Invited parent - multi-child | Invited |
| `fiona.walsh.uat@example.com` | Fiona Walsh | Edit address & sync | Invited |
| `selfreg.parent@example.com` | Self-Reg Parent | Self-registered parent flow | Self-Registered |
| `selfreg.coach@example.com` | Self-Reg Coach | Self-registered coach flow | Self-Registered |
| `invited.coach@example.com` | Invited Coach | Invited coach flow | Invited |

---

## 2. Phase 0.8: Flow Differentiation Tests

### 2.1 wasInvited Flag - Schema & Setting

- [ ] **P08-001**: Query user table schema → `wasInvited` field exists as optional boolean
- [ ] **P08-002**: New user signs up (no invitation) → `wasInvited` is undefined/null
- [ ] **P08-003**: Create invitation for new user, user accepts → Query user record → `wasInvited = true`
- [ ] **P08-004**: Existing user accepts NEW invitation to another org → `wasInvited` remains true (or is set true)

### 2.2 Self-Registered User Flow (No Invitation)

- [ ] **P08-005**: Sign up new account `selfreg.parent@example.com` (no invitation) → GDPR consent shown first
- [ ] **P08-006**: Accept GDPR → Profile completion modal appears with title **"Additional Information"** (NOT "Help Us Find Your Children")
- [ ] **P08-007**: Profile completion modal → Subtitle says "Please provide additional information to complete your profile"
- [ ] **P08-008**: Profile completion modal → NO mention of "children", "matching", or "finding your children"
- [ ] **P08-009**: Fill in phone, postcode, address, click Save → Profile saved, modal closes
- [ ] **P08-010**: After profile completion → **NO `guardian_claim` modal appears** (even if data matches a guardian)
- [ ] **P08-011**: After profile completion → **NO `no_children_found` modal appears**
- [ ] **P08-012**: After onboarding completes → User redirected to `/orgs/join` or dashboard (no welcome message blocking)
- [ ] **P08-013**: Query user record → `wasInvited` is undefined/false

### 2.3 Invited User Flow (Admin-Initiated)

- [ ] **P08-014**: Admin creates invitation for `invited.coach@example.com` as Coach
- [ ] **P08-015**: User signs up with invited email → GDPR consent shown first
- [ ] **P08-016**: Accept GDPR → **Invitation acceptance step shown** (before profile completion)
- [ ] **P08-017**: Accept invitation → User added to org as Coach
- [ ] **P08-018**: Query user record → `wasInvited = true`

### 2.4 Invited Parent Flow (With Assigned Child)

- [ ] **P08-019**: Admin invites `sarah.murphy.uat@example.com` as Parent with Emma Murphy assigned
- [ ] **P08-020**: Parent signs up → GDPR → Invitation step shows org name, role, and "Children Assigned to You" section
- [ ] **P08-021**: Parent sees Emma Murphy listed → Can click "Yes, this is mine" or "No, not mine"
- [ ] **P08-022**: Parent confirms child, accepts invitation → `guardianPlayerLink` created with `acknowledgedByParentAt` set
- [ ] **P08-023**: Parent lands on Parent Dashboard → Emma Murphy visible as linked child
- [ ] **P08-024**: Query user record → `wasInvited = true`

### 2.5 Admin Approval Creates Proper Links

- [ ] **P08-025**: Self-registered user `selfreg.parent@example.com` requests to join org as Parent
- [ ] **P08-026**: Admin views join request → Sees user info (name, email, phone, address)
- [ ] **P08-027**: Admin views join request → Sees "Suggested Children" section with smart matches
- [ ] **P08-028**: Admin selects a child (e.g., from test data) and clicks Approve
- [ ] **P08-029**: On approval → Query `guardianIdentities` → New record created for user with correct `userId`
- [ ] **P08-030**: On approval → Query `guardianPlayerLinks` → Link created with `relationship: "parent"` and `acknowledgedByParentAt` timestamp
- [ ] **P08-031**: User can now access org as Parent → Child appears on Parent Dashboard

---

## 3. Phase 0: Profile Completion Tests

### 3.1 Profile Completion Step Display

- [ ] **P0-001**: Sign up new account (self-registered), complete GDPR → Profile completion modal appears with title **"Additional Information"**
- [ ] **P0-002**: On profile completion modal → Info text explains why data is helpful (no child-specific language)
- [ ] **P0-003**: On profile completion modal → Phone field visible with placeholder "+353 87 123 4567"
- [ ] **P0-004**: On profile completion modal → Postcode field visible with placeholder "BT61 7QR or D02 AF30"
- [ ] **P0-005**: On profile completion modal → Alternative email field visible, labeled as optional
- [ ] **P0-006**: On profile completion modal → "Skip for Now (3 left)" button visible
- [ ] **P0-007**: On profile completion modal → "Save & Continue" button visible

### 3.2 Skip Functionality

- [ ] **P0-008**: Click "Skip for Now (3 left)" → Toast message, modal closes
- [ ] **P0-009**: Log out, log back in → Skip button shows "(2 left)"
- [ ] **P0-010**: Click "Skip for Now (2 left)" → Toast message, modal closes
- [ ] **P0-011**: Log out, log back in, click "Skip for Now (1 left)" → Toast: "This is your last skip."
- [ ] **P0-012**: Log out, log back in after 3 skips → Skip button NOT visible, must complete form

### 3.3 Form Validation

- [ ] **P0-013**: Leave all fields empty, click Save → Error toast: "Please provide at least one piece of information"
- [ ] **P0-014**: Enter invalid email "notanemail" in alt email field, click Save → Error toast
- [ ] **P0-015**: Type "bt61 7qr" in postcode field → Text automatically converts to "BT61 7QR"

### 3.4 Loading States

- [ ] **P0-016**: Fill form, click Save → Button shows spinner with "Saving...", button disabled
- [ ] **P0-017**: While save in progress → Skip button also disabled

---

## 4. Phase 0: Guardian Matching Tests (Invited Users Only)

> **Note**: These tests apply ONLY to invited users. Self-registered users skip guardian matching during onboarding.

### 4.1 Email Match (Invited Parent)

- [ ] **P0-018**: Admin invites `sarah.murphy.uat@example.com` as Parent with Emma assigned → On acceptance, parent sees child to confirm
- [ ] **P0-019**: Invited user confirms "Yes, this is mine" for Emma → `guardianPlayerLink` created

### 4.2 Multi-Signal Match (Invited Parent)

- [ ] **P0-020**: Admin invites parent with multiple children assigned → Parent sees all children to confirm
- [ ] **P0-021**: Parent can confirm some and decline others → Links created only for confirmed children

### 4.3 No Children Assigned (Invited Parent)

- [ ] **P0-022**: Admin invites parent WITHOUT assigning children → Parent joins org with Parent role, no children linked
- [ ] **P0-023**: Parent can later have children linked via admin action

---

## 5. Phase 0.5: Player Postcode Matching Tests

- [ ] **P05-001**: Guardian linked to player with postcode BT61 7PQ, admin sees smart match with postcode bonus
- [ ] **P05-002**: Compare confidence with/without player postcode match → Score includes PLAYER_POSTCODE_BONUS (10 pts)
- [ ] **P05-003**: Guardian with postcode A linked to player with postcode B, user registers with postcode A → No "Postcode matches linked player" reason

---

## 6. Phase 0.6: Address Collection Tests

### 6.1 Address Fields in Profile Completion

- [ ] **P06-001**: Open profile completion modal → "Address (Optional)" collapsible section visible
- [ ] **P06-002**: Expand address section → Street Address field visible
- [ ] **P06-003**: Expand address section → Address Line 2 field visible with "(apt, unit, etc.)" hint
- [ ] **P06-004**: Expand address section → Town/City field visible
- [ ] **P06-005**: Expand address section → Postcode/Eircode field visible
- [ ] **P06-006**: Expand address section → County field visible
- [ ] **P06-007**: Expand address section → Country dropdown visible with Ireland, UK, US at top

### 6.2 Country-Dependent County Field

- [ ] **P06-008**: Select "Ireland" as country → County field becomes dropdown with 26 Irish counties + "Other"
- [ ] **P06-009**: Select Ireland, open county dropdown → All 26 counties listed
- [ ] **P06-010**: Select "United States" as country → County field becomes dropdown with 50 states + DC + territories
- [ ] **P06-011**: Select "United Kingdom" as country → County field becomes free text input
- [ ] **P06-012**: Select any other country → County field is free text input
- [ ] **P06-013**: Select Ireland, select "Dublin", change country to UK → County field cleared and changes to text input

### 6.3 Address Saves Correctly

- [ ] **P06-014**: Enter complete Irish address with county from dropdown, save → All fields saved to user table
- [ ] **P06-015**: Enter UK address with free text county, save → All fields saved correctly
- [ ] **P06-016**: Enter US address with state from dropdown, save → All fields saved correctly
- [ ] **P06-017**: Enter only town and postcode, save → Only provided fields saved, no errors

### 6.4 Address Display in Manage Users

- [ ] **P06-018**: View user in Manage Users (collapsed) → Address NOT visible on collapsed card
- [ ] **P06-019**: Expand user in Manage Users → Full address displayed in formatted layout
- [ ] **P06-020**: User has country "IE" → Displays "Ireland" not "IE"
- [ ] **P06-021**: User has only town and postcode → Shows only town and postcode, no empty fields

---

## 7. Phase 0.7: Profile Address Sync Tests

### 7.1 Schema Changes

- [ ] **P07-001**: Query guardianIdentities table → address2 field exists and accepts values
- [ ] **P07-002**: Query guardianIdentities table → county field exists and accepts values

### 7.2 Profile Settings Dialog

- [ ] **P07-003**: User Menu → Profile → Profile Settings → "Address" card section visible
- [ ] **P07-004**: View Address section → Street Address, Address Line 2, Town, Postcode, County, Country fields visible
- [ ] **P07-005**: User has address saved → Fields populated with user's current address
- [ ] **P07-006**: Select Ireland as country → County shows dropdown with 26 counties
- [ ] **P07-007**: Select United States as country → County shows dropdown with states
- [ ] **P07-008**: Type lowercase postcode → Automatically converted to uppercase

### 7.3 Address Save and Sync

- [ ] **P07-009**: Edit address in Profile Settings, Save → User table updated with new address
- [ ] **P07-010**: User has linked guardianIdentity, edit address, Save → guardianIdentities record updated with same address
- [ ] **P07-011**: User has NO linked guardianIdentity, edit address, Save → Address saved to user table, no errors
- [ ] **P07-012**: Update all 6 address fields, save → All 6 fields synced to guardianIdentities

### 7.4 Address Copy on Guardian Claim

- [ ] **P07-013**: Invited user claims guardian with address, user has no address → User's address populated from guardian
- [ ] **P07-014**: Claim guardian with full address → address, address2, town, county, postcode, country all copied
- [ ] **P07-015**: User has address, claims guardian with different address → User's original address preserved
- [ ] **P07-016**: Guardian has only address, town, postcode → Only those fields copied to user

### 7.5 Guardian Settings Display

- [ ] **P07-017**: Parent Dashboard → Guardian Settings → Address displayed in "Your Profile" section
- [ ] **P07-018**: View address in Guardian Settings → Format: Address line 1, line 2 / Town, postcode / County, Country
- [ ] **P07-019**: Guardian has country "IE" → Displays "Ireland"
- [ ] **P07-020**: Edit address in Profile Settings, return to Guardian Settings → Updated address displayed

---

## 8. Scenario-Based End-to-End Tests

### 8.1 Scenario A: Self-Registered User → Join Request → Admin Approval

- [ ] **E2E-A01**: Sign up new user `selfreg.parent@example.com` (no invitation)
- [ ] **E2E-A02**: Complete GDPR consent
- [ ] **E2E-A03**: See profile completion with "Additional Information" title
- [ ] **E2E-A04**: Fill phone `+447700100001`, postcode `BT61 7PQ`, save
- [ ] **E2E-A05**: Verify NO guardian_claim modal appears
- [ ] **E2E-A06**: Verify NO no_children_found modal appears
- [ ] **E2E-A07**: Navigate to `/orgs/join`
- [ ] **E2E-A08**: Find Demo Club, request to join as Parent
- [ ] **E2E-A09**: Admin logs in, views join request
- [ ] **E2E-A10**: Admin sees "Suggested Children" with Emma Murphy (matches phone/postcode)
- [ ] **E2E-A11**: Admin selects Emma Murphy, clicks Approve
- [ ] **E2E-A12**: Query `guardianIdentities` → Record exists for `selfreg.parent@example.com` with `userId` set
- [ ] **E2E-A13**: Query `guardianPlayerLinks` → Link exists with Emma Murphy, `relationship: "parent"`, `acknowledgedByParentAt` set
- [ ] **E2E-A14**: Self-reg user logs in, accesses Demo Club as Parent
- [ ] **E2E-A15**: Parent Dashboard shows Emma Murphy as linked child

### 8.2 Scenario B: Invited Parent with Assigned Child

- [ ] **E2E-B01**: Admin creates invitation for `sarah.murphy.uat@example.com` as Parent with Emma Murphy assigned
- [ ] **E2E-B02**: Sarah signs up with invited email
- [ ] **E2E-B03**: Complete GDPR consent
- [ ] **E2E-B04**: Invitation step shows: "Demo Club", "Role: Parent", "Children Assigned: Emma Murphy"
- [ ] **E2E-B05**: Sarah clicks "Yes, this is mine" for Emma
- [ ] **E2E-B06**: Sarah clicks Accept
- [ ] **E2E-B07**: Query user record → `wasInvited = true`
- [ ] **E2E-B08**: Query `guardianPlayerLinks` → Link exists with `acknowledgedByParentAt` set
- [ ] **E2E-B09**: Sarah lands on Parent Dashboard → Emma Murphy visible
- [ ] **E2E-B10**: Go to Profile Settings → Address pre-populated from guardian record

### 8.3 Scenario C: Invited Coach (No Children)

- [ ] **E2E-C01**: Admin creates invitation for `invited.coach@example.com` as Coach
- [ ] **E2E-C02**: Coach signs up with invited email
- [ ] **E2E-C03**: Complete GDPR consent
- [ ] **E2E-C04**: Invitation step shows: "Demo Club", "Role: Coach"
- [ ] **E2E-C05**: No children section shown (coach invitation)
- [ ] **E2E-C06**: Coach clicks Accept
- [ ] **E2E-C07**: Query user record → `wasInvited = true`
- [ ] **E2E-C08**: Coach lands on Coach Dashboard

### 8.4 Scenario D: Self-Registered Coach → Join Request

- [ ] **E2E-D01**: Sign up new user `selfreg.coach@example.com` (no invitation)
- [ ] **E2E-D02**: Complete GDPR → Profile completion ("Additional Information")
- [ ] **E2E-D03**: Skip or complete profile
- [ ] **E2E-D04**: Navigate to `/orgs/join`
- [ ] **E2E-D05**: Request to join Demo Club as Coach
- [ ] **E2E-D06**: Admin approves join request (no child linking for coach)
- [ ] **E2E-D07**: Self-reg coach can access Demo Club as Coach

### 8.5 Scenario E: Multi-Child Guardian (Mary Kelly)

- [ ] **E2E-E01**: Admin invites `mary.kelly.uat@example.com` as Parent with Aoife AND Cian Kelly assigned
- [ ] **E2E-E02**: Mary signs up, completes GDPR
- [ ] **E2E-E03**: Invitation shows BOTH children listed
- [ ] **E2E-E04**: Mary confirms both children, accepts
- [ ] **E2E-E05**: Query `guardianPlayerLinks` → TWO links created (one per child)
- [ ] **E2E-E06**: Parent Dashboard shows BOTH Aoife and Cian

---

## 9. Regression Tests

### 9.1 GDPR Consent

- [ ] **REG-001**: Sign up new user → GDPR consent modal appears FIRST (before anything else)
- [ ] **REG-002**: On GDPR modal → No skip option available, must accept

### 9.2 Invitation Flow

- [ ] **REG-003**: Invited user logs in → Invitation acceptance step appears (after GDPR, before profile completion)
- [ ] **REG-004**: Invited parent with children → Can confirm/decline each child individually

### 9.3 Guardian Claiming (Invited Users)

- [ ] **REG-005**: Invited parent confirms children → `guardianPlayerLinks` created correctly
- [ ] **REG-006**: Guardian has multiple children in invitation → All confirmed children get links

### 9.4 Self-Registered Flow

- [ ] **REG-007**: Self-registered user → NO guardian_claim step shown
- [ ] **REG-008**: Self-registered user → NO no_children_found step shown
- [ ] **REG-009**: Self-registered user → Profile completion has neutral messaging

### 9.5 Admin Approval

- [ ] **REG-010**: Admin approves parent with child selection → `guardianIdentity` created
- [ ] **REG-011**: Admin approves parent with child selection → `guardianPlayerLinks` created (NOT old `players` table patched)
- [ ] **REG-012**: Admin approves without child selection → User joins org, no child links created

---

## 10. Database Verification Tests

### 10.1 User Table Fields

- [ ] **DB-001**: Save phone "+353 87 123 4567" → Stored as normalized value
- [ ] **DB-002**: Save postcode "d02 af30" → Stored as "D02 AF30"
- [ ] **DB-003**: Save alt email "Test@EXAMPLE.com" → Stored as "test@example.com"
- [ ] **DB-004**: Complete profile → profileCompletionStatus = "completed"
- [ ] **DB-005**: Complete profile → profileCompletedAt timestamp present
- [ ] **DB-006**: Skip profile 2 times → profileSkipCount = 2
- [ ] **DB-007**: User accepts invitation → `wasInvited = true`
- [ ] **DB-008**: Self-registered user → `wasInvited` is undefined/null/false

### 10.2 guardianIdentities Fields

- [ ] **DB-009**: Query schema → `address2: v.optional(v.string())` present
- [ ] **DB-010**: Query schema → `county: v.optional(v.string())` present
- [ ] **DB-011**: User edits address, save → guardianIdentities has matching values
- [ ] **DB-012**: Admin approves join request with child → guardianIdentity created with correct `userId`

---

## Test Completion Sign-Off

**Tester**: ___________________________ **Date**: _______________

**All tests passed**: ☐ Yes ☐ No

**Issues found**:
1.
2.
3.

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

## Appendix D: Phase 0.8 Key Changes Summary

| Area | Before Phase 0.8 | After Phase 0.8 |
|------|------------------|-----------------|
| User tracking | No explicit invited flag | `wasInvited` flag on user record |
| Self-reg onboarding | Guardian matching during onboarding | No guardian matching - straight to /orgs/join |
| Profile completion title | "Help Us Find Your Children" | "Additional Information" |
| no_children_found step | Shown when no matches | Removed entirely |
| Admin approval linking | Patched old `players` table (broken) | Creates `guardianIdentity` + `guardianPlayerLinks` |
| Invited parent flow | Same | Same (still shows children to confirm) |
