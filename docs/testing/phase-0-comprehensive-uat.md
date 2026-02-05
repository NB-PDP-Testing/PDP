# Phase 0.x Comprehensive UAT Test Plan

**Version**: 1.0
**Date**: February 5, 2026
**Scope**: Phase 0, 0.5, 0.6, 0.7 - Onboarding Sync & Address Management
**Status**: Ready for Testing

---

## Executive Summary

This document provides comprehensive UAT test cases for all Phase 0.x features:

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Profile Completion & Multi-Signal Guardian Matching | Complete |
| 0.5 | Player Postcode Matching Enhancement | Complete |
| 0.6 | Address Collection Enhancement | Complete |
| 0.7 | Profile Address Management & Data Sync | Ready for Implementation |

**Total Test Cases**: 62 tests across 8 categories

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Phase 0: Profile Completion Tests](#2-phase-0-profile-completion-tests)
3. [Phase 0: Guardian Matching Tests](#3-phase-0-guardian-matching-tests)
4. [Phase 0.5: Player Postcode Matching Tests](#4-phase-05-player-postcode-matching-tests)
5. [Phase 0.6: Address Collection Tests](#5-phase-06-address-collection-tests)
6. [Phase 0.7: Profile Address Sync Tests](#6-phase-07-profile-address-sync-tests)
7. [Regression Tests](#7-regression-tests)
8. [Database Verification Tests](#8-database-verification-tests)

---

## 1. Test Environment Setup

### 1.1 Prerequisites

- [ ] Dev server running on localhost:3000
- [ ] Convex backend configured and running
- [ ] Test organization created
- [ ] Admin account access

### 1.2 Test Data Setup

Create the following guardian records via import or manual creation:

#### Guardian A - Email Match Test
| Field | Value |
|-------|-------|
| First Name | Sarah |
| Last Name | Connor |
| Email | sarah.connor@testmail.com |
| Phone | +353 87 123 4567 |
| Postcode | D02 AF30 |
| Address | 10 Oak Lane |
| Town | Dublin |
| County | Dublin |
| Country | IE |
| Linked Child | John Connor (DOB: 2015-03-15) |

#### Guardian B - Phone Match Test
| Field | Value |
|-------|-------|
| First Name | Mary |
| Last Name | Smith |
| Email | mary.oldwork@company.com |
| Phone | +353 86 555 1234 |
| Postcode | BT61 7QR |
| Address | 5 High Street |
| Town | Portadown |
| County | Armagh |
| Country | GB |
| Linked Child | Tommy Smith (DOB: 2014-08-22) |

#### Guardian C - Postcode + Surname Match Test
| Field | Value |
|-------|-------|
| First Name | James |
| Last Name | Wilson |
| Email | james.w@oldprovider.ie |
| Phone | +44 7700 900123 |
| Postcode | BT48 6NN |
| Address | 12 River Road |
| Town | Derry |
| County | - |
| Country | GB |
| Linked Child | Emma Wilson (DOB: 2016-01-10, Postcode: BT48 6NN) |

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

## 2. Phase 0: Profile Completion Tests

### 2.1 Profile Completion Step Display

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-001 | Profile completion modal appears | 1. Sign up new account with email not matching any guardian 2. Complete GDPR consent | Profile completion modal appears with title "Help Us Find Your Children" | |
| P0-002 | Modal displays explanation | On profile completion modal | Info box explains why data is requested | |
| P0-003 | Phone field displayed | On profile completion modal | Phone field visible with placeholder "+353 87 123 4567" | |
| P0-004 | Postcode field displayed | On profile completion modal | Postcode field visible with placeholder "BT61 7QR or D02 AF30" | |
| P0-005 | Alt email field displayed | On profile completion modal | Alternative email field visible, labeled as optional | |
| P0-006 | Skip button visible | On profile completion modal | "Skip for Now (3 left)" button visible | |
| P0-007 | Save button visible | On profile completion modal | "Save & Continue" button visible | |

### 2.2 Skip Functionality

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-008 | First skip works | Click "Skip for Now (3 left)" | Toast: "Skipped for now. You can complete this 2 more times." Modal closes | |
| P0-009 | Skip count decrements | Log out, log back in | Skip button shows "(2 left)" | |
| P0-010 | Second skip works | Click "Skip for Now (2 left)" | Toast message, modal closes | |
| P0-011 | Third skip works | Log out, log back in, click "Skip for Now (1 left)" | Toast: "This is your last skip." | |
| P0-012 | Skip disabled after 3 | Log out, log back in after 3 skips | Skip button NOT visible, must complete form | |

### 2.3 Form Validation

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-013 | Empty form validation | Leave all fields empty, click Save | Error toast: "Please provide at least one piece of information" | |
| P0-014 | Invalid email validation | Enter invalid email "notanemail" in alt email field, click Save | Error toast: "Please enter a valid email address" | |
| P0-015 | Postcode auto-uppercase | Type "bt61 7qr" in postcode field | Text automatically converts to "BT61 7QR" | |

### 2.4 Loading States

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-016 | Save button loading state | Fill form, click Save | Button shows spinner with "Saving...", button disabled | |
| P0-017 | Skip button disabled during save | While save in progress | Skip button also disabled | |

---

## 3. Phase 0: Guardian Matching Tests

### 3.1 Email Match

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-018 | Direct email match | Sign up with sarah.connor@testmail.com (Guardian A's email) | Guardian claiming modal shows Sarah Connor and John Connor | |
| P0-019 | Alt email match | Sign up with new email, provide sarah.connor@testmail.com as alt email | Guardian claiming modal shows Sarah Connor | |

### 3.2 Phone Match

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-020 | Phone match | 1. Sign up with mary.newpersonal@gmail.com 2. Enter phone +353 86 555 1234 (Guardian B) 3. Save | Guardian claiming modal shows Mary Smith | |
| P0-021 | Phone format normalized | Enter phone as "086 555 1234" (no country code) | Still matches Guardian B | |

### 3.3 Postcode + Surname Match

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-022 | Postcode + surname match | 1. Sign up as "James Wilson" with new email 2. Enter postcode BT48 6NN 3. Save | Guardian claiming modal shows James Wilson | |

### 3.4 No Match Found

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P0-023 | No children found modal | 1. Sign up with completely new email 2. Enter non-matching phone and postcode 3. Save | "No Children Found" modal appears | |
| P0-024 | Search signals displayed | On No Children Found modal | Shows email, phone, postcode that were searched | |
| P0-025 | Possible reasons displayed | On No Children Found modal | Shows bullet list of possible reasons | |
| P0-026 | Try Different Details button | On No Children Found modal | Collapsible retry form appears with phone, alt email, postcode fields | |
| P0-027 | Contact Club button | On No Children Found modal | Button visible and functional | |
| P0-028 | Continue Without Linking | Click "Continue Without Linking" | Modal closes, user proceeds to app | |
| P0-029 | Retry search works | 1. Click "Try Different Details" 2. Enter matching phone 3. Click "Search Again" | Guardian claiming modal appears if match found | |

---

## 4. Phase 0.5: Player Postcode Matching Tests

### 4.1 Player Postcode Bonus

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P05-001 | Player postcode match adds bonus | 1. Guardian C linked to Emma Wilson (postcode BT48 6NN) 2. User registers with postcode BT48 6NN | Match includes reason "Postcode matches linked player(s): Emma Wilson" | |
| P05-002 | Higher confidence with player match | Compare confidence with/without player postcode match | Score includes PLAYER_POSTCODE_BONUS (10 pts) | |
| P05-003 | No bonus when postcodes differ | 1. Guardian with postcode A linked to player with postcode B 2. User registers with postcode A | No "Postcode matches linked player" reason shown | |

---

## 5. Phase 0.6: Address Collection Tests

### 5.1 Address Fields in Profile Completion

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P06-001 | Address section visible | Open profile completion modal | "Address (Optional)" collapsible section visible | |
| P06-002 | Street Address field | Expand address section | Street Address field visible | |
| P06-003 | Address Line 2 field | Expand address section | Address Line 2 field visible with "(apt, unit, etc.)" hint | |
| P06-004 | Town/City field | Expand address section | Town/City field visible | |
| P06-005 | Postcode field | Expand address section | Postcode/Eircode field visible | |
| P06-006 | County field | Expand address section | County field visible | |
| P06-007 | Country dropdown | Expand address section | Country dropdown visible with Ireland, UK, US at top | |

### 5.2 Country-Dependent County Field

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P06-008 | Ireland shows county dropdown | Select "Ireland" as country | County field becomes dropdown with 26 Irish counties + "Other" | |
| P06-009 | Irish counties list correct | Select Ireland, open county dropdown | All 26 counties listed (Dublin, Cork, Galway, etc.) | |
| P06-010 | US shows state dropdown | Select "United States" as country | County field becomes dropdown with 50 states + DC + territories | |
| P06-011 | UK shows text input | Select "United Kingdom" as country | County field becomes free text input | |
| P06-012 | Other countries show text input | Select any other country | County field is free text input | |
| P06-013 | County resets on country change | 1. Select Ireland 2. Select "Dublin" 3. Change country to UK | County field cleared and changes to text input | |

### 5.3 Address Saves Correctly

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P06-014 | Full Irish address saves | Enter complete Irish address with county from dropdown, save | All fields saved to user table | |
| P06-015 | UK address saves | Enter UK address with free text county, save | All fields saved correctly | |
| P06-016 | US address saves | Enter US address with state from dropdown, save | All fields saved correctly | |
| P06-017 | Partial address saves | Enter only town and postcode, save | Only provided fields saved, no errors | |

### 5.4 Address Display in Manage Users

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P06-018 | Address NOT on collapsed card | View user in Manage Users (collapsed) | Address NOT visible on collapsed card | |
| P06-019 | Address in expanded profile | Expand user in Manage Users | Full address displayed in formatted layout | |
| P06-020 | Country code displayed as name | User has country "IE" | Displays "Ireland" not "IE" | |
| P06-021 | Partial address displayed | User has only town and postcode | Shows only town and postcode, no empty fields | |

---

## 6. Phase 0.7: Profile Address Sync Tests

### 6.1 Schema Changes

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P07-001 | guardianIdentities has address2 | Query guardianIdentities table | address2 field exists and accepts values | |
| P07-002 | guardianIdentities has county | Query guardianIdentities table | county field exists and accepts values | |

### 6.2 Profile Settings Dialog

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P07-003 | Profile Settings has Address section | User Menu → Profile → Profile Settings | "Address" card section visible | |
| P07-004 | All address fields in Profile Settings | View Address section | Street Address, Address Line 2, Town, Postcode, County, Country fields visible | |
| P07-005 | Existing address pre-populated | User has address saved | Fields populated with user's current address | |
| P07-006 | County dropdown for Ireland | Select Ireland as country | County shows dropdown with 26 counties | |
| P07-007 | County dropdown for US | Select United States as country | County shows dropdown with states | |
| P07-008 | Postcode auto-uppercase | Type lowercase postcode | Automatically converted to uppercase | |

### 6.3 Address Save and Sync

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P07-009 | Save updates user table | 1. Edit address in Profile Settings 2. Save | User table updated with new address | |
| P07-010 | Save syncs to guardianIdentities | 1. User has linked guardianIdentity 2. Edit address 3. Save | guardianIdentities record updated with same address | |
| P07-011 | Save works without guardianIdentity | 1. User has NO linked guardianIdentity 2. Edit address 3. Save | Address saved to user table, no errors | |
| P07-012 | All fields sync correctly | Update all 6 address fields, save | All 6 fields synced to guardianIdentities | |

### 6.4 Address Copy on Guardian Claim

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P07-013 | Address copied when user has none | 1. User has no address 2. Claims guardian with address | User's address populated from guardian | |
| P07-014 | All fields copied | Claim guardian with full address | address, address2, town, county, postcode, country all copied | |
| P07-015 | Address NOT overwritten if exists | 1. User has address 2. Claims guardian with different address | User's original address preserved | |
| P07-016 | Partial address copied | Guardian has only address, town, postcode | Only those fields copied to user | |

### 6.5 Guardian Settings Display

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| P07-017 | Guardian Settings shows address | Parent Dashboard → Guardian Settings | Address displayed in "Your Profile" section | |
| P07-018 | Address format correct | View address in Guardian Settings | Format: Address line 1, line 2 / Town, postcode / County, Country | |
| P07-019 | Country shown as full name | Guardian has country "IE" | Displays "Ireland" | |
| P07-020 | Address updates after profile edit | 1. Edit address in Profile Settings 2. Return to Guardian Settings | Updated address displayed | |

---

## 7. Regression Tests

### 7.1 GDPR Consent

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| REG-001 | GDPR consent appears first | Sign up new user | GDPR consent modal appears before profile completion | |
| REG-002 | Cannot skip GDPR | On GDPR modal | No skip option available | |

### 7.2 Invitation Flow

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| REG-003 | Pending invitations shown | User has pending invite, logs in | Invitation acceptance step appears before profile completion | |

### 7.3 Guardian Claiming

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| REG-004 | Guardian claiming still works | Complete profile with matching signals | Guardian claiming dialog appears and works | |
| REG-005 | Accept/decline per child works | Guardian has multiple children | Can accept/decline each child individually | |
| REG-006 | Parent role assigned | Claim guardian and accept children | User granted Parent role in organization | |

### 7.4 Guardian Matching Scoring

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| REG-007 | Email match still 50 pts | Match via exact email | Score includes 50 points for email | |
| REG-008 | Phone match still 30 pts | Match via phone only | Score includes 30 points for phone | |
| REG-009 | Surname + postcode still 45 pts | Match via surname and postcode | Score includes 45 points | |

---

## 8. Database Verification Tests

### 8.1 User Table Fields

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| DB-001 | Phone normalized | Save phone "+353 87 123 4567" | Stored as normalized value | |
| DB-002 | Postcode uppercased | Save postcode "d02 af30" | Stored as "D02 AF30" | |
| DB-003 | Alt email lowercased | Save alt email "Test@EXAMPLE.com" | Stored as "test@example.com" | |
| DB-004 | profileCompletionStatus set | Complete profile | Field = "completed" | |
| DB-005 | profileCompletedAt set | Complete profile | Timestamp value present | |
| DB-006 | profileSkipCount tracked | Skip profile 2 times | Field = 2 | |

### 8.2 guardianIdentities Fields

| ID | Test | Steps | Expected Result | Pass/Fail |
|----|------|-------|-----------------|-----------|
| DB-007 | address2 field exists | Query guardianIdentities schema | address2: v.optional(v.string()) present | |
| DB-008 | county field exists | Query guardianIdentities schema | county: v.optional(v.string()) present | |
| DB-009 | Sync updates all fields | User edits address, save | guardianIdentities has matching values | |

---

## Test Completion Summary

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Phase 0: Profile Completion | 17 | | | |
| Phase 0: Guardian Matching | 12 | | | |
| Phase 0.5: Player Postcode | 3 | | | |
| Phase 0.6: Address Collection | 21 | | | |
| Phase 0.7: Profile Address Sync | 20 | | | |
| Regression | 9 | | | |
| Database Verification | 9 | | | |
| **TOTAL** | **62** | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Appendix A: Phone Normalization Test Cases

| Input | Expected Normalized Output |
|-------|---------------------------|
| +353 87 123 4567 | +353871234567 |
| 087 123 4567 | 0871234567 |
| +44 7700 900123 | +447700900123 |
| (087) 123-4567 | 0871234567 |
| 087-123-4567 | 0871234567 |

## Appendix B: Irish Counties List

Carlow, Cavan, Clare, Cork, Donegal, Dublin, Galway, Kerry, Kildare, Kilkenny, Laois, Leitrim, Limerick, Longford, Louth, Mayo, Meath, Monaghan, Offaly, Roscommon, Sligo, Tipperary, Waterford, Westmeath, Wexford, Wicklow

## Appendix C: Matching Score Reference

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
