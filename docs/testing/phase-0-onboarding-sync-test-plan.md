# Phase 0: Onboarding Sync - End-to-End Test Plan

## Overview

This test plan verifies that the Phase 0: Onboarding Sync feature is working correctly. The feature enables self-registered users to be matched with imported guardian records using multiple signals (phone, postcode, alternate email) beyond just the primary email.

**Test Environment:** Development deployment
**Estimated Time:** 45-60 minutes
**Tester Requirements:** Access to admin account, ability to create test users

---

## Prerequisites

### 1. Database Setup

Before testing, ensure you have:

- [ ] A test organization created (e.g., "Test Club FC")
- [ ] Access to an admin account for that organization
- [ ] Ability to import player data or manually create guardian/player records

### 2. Test Data Preparation

Create the following test guardian records in the database (via import or manual creation):

#### Guardian A - Email Match Test
| Field | Value |
|-------|-------|
| First Name | Sarah |
| Last Name | Connor |
| Email | sarah.connor@testmail.com |
| Phone | +353 87 123 4567 |
| Postcode | D02 AF30 |
| Linked Child | John Connor (DOB: 2015-03-15) |

#### Guardian B - Phone Match Test (Different Email)
| Field | Value |
|-------|-------|
| First Name | Mary |
| Last Name | Smith |
| Email | mary.oldwork@company.com |
| Phone | +353 86 555 1234 |
| Postcode | BT61 7QR |
| Linked Child | Tommy Smith (DOB: 2014-08-22) |

#### Guardian C - Postcode + Surname Match Test
| Field | Value |
|-------|-------|
| First Name | James |
| Last Name | Wilson |
| Email | james.w@oldprovider.ie |
| Phone | +44 7700 900123 |
| Postcode | BT48 6NN |
| Town | Derry |
| Linked Child | Emma Wilson (DOB: 2016-01-10) |

#### Guardian D - No Match Test
| Field | Value |
|-------|-------|
| First Name | Robert |
| Last Name | Brown |
| Email | robert.brown@nowhere.com |
| Phone | +353 89 999 8888 |
| Postcode | T12 XY45 |
| Linked Child | Sophie Brown (DOB: 2013-11-30) |

---

## Test Scenarios

### Scenario 1: Profile Completion Step Appears for New User

**Objective:** Verify that the profile completion step appears in the onboarding flow for new users.

**Steps:**

1. Open the application in an incognito/private browser window
2. Click "Sign Up" to create a new account
3. Register with a NEW email that doesn't match any imported records:
   - Email: `newuser.test@gmail.com`
   - Name: `Test User`
   - Password: `TestPassword123!`
4. Complete email verification if required
5. Accept GDPR consent when prompted

**Expected Results:**

- [ ] After GDPR consent, the "Help Us Find Your Children" modal appears
- [ ] Modal displays explanation: "To help connect you with your children's club records..."
- [ ] Modal shows info box explaining why the data is requested
- [ ] Three input fields are visible:
  - [ ] Phone Number (placeholder: "+353 87 123 4567")
  - [ ] Postcode / Eircode (placeholder: "BT61 7QR or D02 AF30")
  - [ ] Alternate Email (labeled as optional)
- [ ] "Skip for Now (3 left)" button is visible
- [ ] "Save & Continue" button is visible

**Screenshot checkpoint:** Take screenshot of profile completion modal

---

### Scenario 2: Skip Functionality (First Skip)

**Objective:** Verify skip functionality works and tracks skip count.

**Precondition:** Continue from Scenario 1

**Steps:**

1. On the profile completion modal, click "Skip for Now (3 left)"
2. Wait for the toast notification

**Expected Results:**

- [ ] Toast message appears: "Skipped for now. You can complete this 2 more times."
- [ ] Modal closes and proceeds to next onboarding step (or completes if no other steps)
- [ ] User is able to continue using the application

---

### Scenario 3: Skip Functionality (Second and Third Skip)

**Objective:** Verify skip count decrements correctly and skip is disabled after 3 skips.

**Steps:**

1. Log out of the application
2. Log back in with the same test account from Scenario 1
3. The profile completion modal should appear again
4. Verify the skip button shows "(2 left)"
5. Click "Skip for Now"
6. Log out and log back in again
7. Verify skip button shows "(1 left)"
8. Click "Skip for Now"
9. Log out and log back in one more time

**Expected Results:**

- [ ] After first login: Skip button shows "Skip for Now (2 left)"
- [ ] After second login: Skip button shows "Skip for Now (1 left)"
- [ ] After third login: Skip button should NOT be visible (user has used all 3 skips)
- [ ] Toast after final skip: "This is your last skip. You'll need to complete this step next time."

---

### Scenario 4: Profile Completion with Phone Match

**Objective:** Verify that providing a matching phone number enables guardian matching.

**Steps:**

1. Sign up with a NEW account:
   - Email: `mary.newpersonal@gmail.com` (different from Guardian B's email)
   - Name: `Mary Smith`
2. Accept GDPR consent
3. On the profile completion modal, enter:
   - Phone: `+353 86 555 1234` (matches Guardian B)
   - Leave postcode empty
   - Leave alternate email empty
4. Click "Save & Continue"

**Expected Results:**

- [ ] Toast: "Profile updated successfully"
- [ ] System finds Guardian B via phone match
- [ ] Guardian claiming modal appears showing:
  - [ ] Guardian name: "Mary Smith"
  - [ ] Linked child: "Tommy Smith"
  - [ ] Organization name visible
- [ ] Confidence indicator shows match was found via phone

---

### Scenario 5: Profile Completion with Postcode + Surname Match

**Objective:** Verify postcode + surname matching works correctly.

**Steps:**

1. Sign up with a NEW account:
   - Email: `james.wilson.new@outlook.com` (different from Guardian C's email)
   - Name: `James Wilson`
2. Accept GDPR consent
3. On the profile completion modal, enter:
   - Phone: (leave empty or enter different number)
   - Postcode: `BT48 6NN` (matches Guardian C)
   - Leave alternate email empty
4. Click "Save & Continue"

**Expected Results:**

- [ ] Toast: "Profile updated successfully"
- [ ] System finds Guardian C via postcode + surname match
- [ ] Guardian claiming modal appears showing:
  - [ ] Guardian name: "James Wilson"
  - [ ] Linked child: "Emma Wilson"
- [ ] Match reasons include postcode match

---

### Scenario 6: Profile Completion with Alternate Email Match

**Objective:** Verify alternate email matching works.

**Steps:**

1. Sign up with a NEW account:
   - Email: `sarah.personal@yahoo.com` (different from Guardian A's email)
   - Name: `Sarah Connor`
2. Accept GDPR consent
3. On the profile completion modal, enter:
   - Phone: (leave empty)
   - Postcode: (leave empty)
   - Alternate Email: `sarah.connor@testmail.com` (matches Guardian A's email)
4. Click "Save & Continue"

**Expected Results:**

- [ ] Toast: "Profile updated successfully"
- [ ] System finds Guardian A via alternate email (exact match = 50 points)
- [ ] Guardian claiming modal appears showing:
  - [ ] Guardian name: "Sarah Connor"
  - [ ] Linked child: "John Connor"

---

### Scenario 7: No Match Found - NoChildrenFoundStep Appears

**Objective:** Verify the fallback UI appears when no matches are found.

**Steps:**

1. Sign up with a NEW account:
   - Email: `completely.new@random.com`
   - Name: `Unknown Person`
2. Accept GDPR consent
3. On the profile completion modal, enter:
   - Phone: `+353 81 000 0001` (doesn't match any guardian)
   - Postcode: `X99 Y88` (doesn't match any guardian)
   - Leave alternate email empty
4. Click "Save & Continue"

**Expected Results:**

- [ ] "No Children Found" modal appears with:
  - [ ] Amber warning icon
  - [ ] Title: "No Children Found"
  - [ ] "We searched using:" section showing:
    - [ ] Email: completely.new@random.com
    - [ ] Phone: +353 81 000 0001
    - [ ] Postcode: X99 Y88
  - [ ] "Possible reasons:" section with bullet points
  - [ ] "Try Different Details" collapsible button
  - [ ] "Contact Club" button
  - [ ] "Continue Without Linking" button

**Screenshot checkpoint:** Take screenshot of NoChildrenFoundStep

---

### Scenario 8: NoChildrenFoundStep - Retry with Different Details

**Objective:** Verify the retry functionality in NoChildrenFoundStep works.

**Precondition:** Continue from Scenario 7

**Steps:**

1. Click "Try Different Details" to expand the retry form
2. Verify form fields appear (Phone, Alternate Email, Postcode)
3. Enter Guardian D's phone number: `+353 89 999 8888`
4. Click "Search Again"

**Expected Results:**

- [ ] Loading spinner appears with "Searching..."
- [ ] If match found: Guardian claiming modal appears
- [ ] If no match (different surname): Remains on NoChildrenFoundStep with updated search signals

---

### Scenario 9: NoChildrenFoundStep - Continue Without Linking

**Objective:** Verify user can proceed without linking to any children.

**Steps:**

1. On the NoChildrenFoundStep modal, click "Continue Without Linking"

**Expected Results:**

- [ ] Modal closes
- [ ] User proceeds to the main application
- [ ] User can access basic features without linked children
- [ ] Analytics event tracked for "continue_without_linking"

---

### Scenario 10: Direct Email Match (Backward Compatibility)

**Objective:** Verify that users signing up with matching email still work (no profile completion needed for immediate match).

**Steps:**

1. Sign up with Guardian A's exact email:
   - Email: `sarah.connor@testmail.com`
   - Name: `Sarah Connor`
2. Accept GDPR consent

**Expected Results:**

- [ ] Profile completion step may still appear (to collect additional signals)
- [ ] OR Guardian claiming modal appears immediately showing Sarah Connor's children
- [ ] Original email-based matching continues to work

---

### Scenario 11: Postcode Auto-Uppercase

**Objective:** Verify postcode input auto-uppercases as user types.

**Steps:**

1. On any profile completion modal, type a lowercase postcode: `bt61 7qr`

**Expected Results:**

- [ ] As user types, text automatically converts to uppercase: `BT61 7QR`
- [ ] No manual conversion needed

---

### Scenario 12: Input Validation

**Objective:** Verify form validation works correctly.

**Steps:**

1. On profile completion modal, leave all fields empty
2. Click "Save & Continue"

**Expected Results:**

- [ ] Error toast: "Please provide at least one piece of information"
- [ ] Form does not submit

**Steps (continued):**

3. Enter invalid email in Alternate Email field: `notanemail`
4. Click "Save & Continue"

**Expected Results:**

- [ ] Error toast: "Please enter a valid email address"
- [ ] Form does not submit

---

### Scenario 13: Loading States

**Objective:** Verify loading states display correctly during async operations.

**Steps:**

1. Fill in profile completion form with valid data
2. Click "Save & Continue" and observe the button

**Expected Results:**

- [ ] Button shows loading spinner with "Saving..."
- [ ] Button is disabled during submission
- [ ] Skip button is also disabled during submission

---

## Database Verification Tests

### DB-1: Profile Data Saved Correctly

**Steps:**

1. Complete profile completion for a test user with:
   - Phone: `+353 87 111 2222`
   - Postcode: `D04 V2P8`
   - Alt Email: `alt@test.com`
2. Query the user record in Convex dashboard

**Expected Results:**

- [ ] `phone` field contains normalized value: `+353871112222`
- [ ] `postcode` field contains: `D04 V2P8` (uppercased, whitespace preserved)
- [ ] `altEmail` field contains: `alt@test.com` (lowercased)
- [ ] `profileCompletionStatus` = `completed`
- [ ] `profileCompletedAt` has timestamp value

---

### DB-2: Skip Count Persisted

**Steps:**

1. Skip profile completion for a user
2. Query the user record

**Expected Results:**

- [ ] `profileSkipCount` = 1 (or appropriate count)
- [ ] `profileCompletionStatus` = `skipped`

---

### DB-3: Skip Count Caps at 3

**Steps:**

1. After 3 skips, query the user record

**Expected Results:**

- [ ] `profileSkipCount` = 3
- [ ] On next login, skip button should not appear (verified via UI)

---

## Edge Cases

### Edge-1: Phone Number Normalization

Test various phone formats and verify they normalize correctly:

| Input | Expected Normalized |
|-------|---------------------|
| `+353 87 123 4567` | `+353871234567` |
| `087 123 4567` | `0871234567` |
| `+44 7700 900123` | `+447700900123` |
| `(087) 123-4567` | `0871234567` |

---

### Edge-2: User Already Has Claimed Guardian

**Steps:**

1. Sign up with an email that matches an already-claimed guardian (userId is set)

**Expected Results:**

- [ ] Profile completion step still appears
- [ ] After completing profile, no duplicate claiming prompt
- [ ] System recognizes guardian is already claimed

---

### Edge-3: Multiple Guardian Matches

**Steps:**

1. Create two guardians with same phone number but different emails
2. Sign up with a new email and provide that phone number

**Expected Results:**

- [ ] System should show matches sorted by confidence
- [ ] Higher confidence matches appear first
- [ ] User can claim the correct guardian identity

---

## Regression Tests

### Reg-1: GDPR Consent Still Works

- [ ] GDPR consent modal appears before profile completion
- [ ] Cannot skip GDPR consent
- [ ] GDPR version tracked correctly

### Reg-2: Invitation Acceptance Still Works

- [ ] Users with pending invitations see invitation step
- [ ] Invitation step appears before profile completion (priority 1 vs 1.5)

### Reg-3: Guardian Claiming Still Works

- [ ] After profile completion, guardian claiming works normally
- [ ] Accept/decline per-child functionality works
- [ ] Parent role assigned correctly after claiming

### Reg-4: Child Linking Still Works

- [ ] Child linking step appears after guardian claiming if needed
- [ ] Acknowledge children functionality works

---

## Test Completion Checklist

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Scenario 1: Profile Completion Appears | | | |
| Scenario 2: First Skip | | | |
| Scenario 3: Multiple Skips | | | |
| Scenario 4: Phone Match | | | |
| Scenario 5: Postcode + Surname Match | | | |
| Scenario 6: Alternate Email Match | | | |
| Scenario 7: NoChildrenFoundStep | | | |
| Scenario 8: Retry Search | | | |
| Scenario 9: Continue Without Linking | | | |
| Scenario 10: Direct Email Match | | | |
| Scenario 11: Postcode Auto-Uppercase | | | |
| Scenario 12: Input Validation | | | |
| Scenario 13: Loading States | | | |
| DB-1: Profile Data Saved | | | |
| DB-2: Skip Count Persisted | | | |
| DB-3: Skip Count Caps | | | |
| Edge Cases | | | |
| Regression Tests | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Appendix: Convex Dashboard Queries

### Query to Check User Profile Fields

```javascript
// In Convex Dashboard > Data > user table
// Look for these fields on user records:
// - phone
// - altEmail
// - postcode
// - profileCompletionStatus
// - profileCompletedAt
// - profileSkipCount
```

### Query to Check Guardian Identities

```javascript
// In Convex Dashboard > Data > guardianIdentities table
// Verify test guardians exist with:
// - email (normalized lowercase)
// - phone (normalized)
// - postcode
// - userId (null for unclaimed, set for claimed)
```

### Run Enhanced Matching Function

```javascript
// In Convex Dashboard > Functions
// Run: models/guardianIdentities:checkForClaimableIdentityEnhanced
// Args:
{
  "email": "test@example.com",
  "name": "Test User",
  "phone": "+353871234567",
  "postcode": "D02AF30"
}
```
