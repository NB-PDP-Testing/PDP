# Phase 0.6: Address Collection Enhancement

**Timeline**: 1-2 days
**Status**: Ready for Implementation
**Dependencies**: Phase 0 (Onboarding Sync) - Complete
**Blocks**: None

---

## Executive Summary

This PRD extends the Phase 0 Profile Completion step to collect full address information during onboarding. Currently, only phone, postcode, and alternate email are collected. This enhancement adds structured address fields (Address Line 1, Address Line 2, Town/City, County, Country) to enable:

1. More accurate household matching for guardian-player linking
2. Richer user profiles for administrative purposes
3. Address data for future features (shipping, notifications, etc.)

**Design Principle**: Follow the same patterns as major e-commerce sites (Amazon, Shopify) for address collection. All fields remain optional to avoid blocking user onboarding.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Solution Design](#3-solution-design)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [County/Country Data](#7-countycountry-data)
8. [Testing Requirements](#8-testing-requirements)
9. [Definition of Done](#9-definition-of-done)

---

## 1. Problem Statement

### Current State

The Profile Completion step (Phase 0) collects:
- Phone number
- Postcode / Eircode
- Alternative email

**Missing**: Full address information that would:
- Improve household-level matching accuracy
- Provide complete user profiles for admin review
- Support future features requiring postal addresses

### User Table Fields (Current)

| Field | Status | Used In Matching |
|-------|--------|------------------|
| phone | ✅ Collected | ✅ Yes (30 pts) |
| altEmail | ✅ Collected | ✅ Yes (50 pts) |
| postcode | ✅ Collected | ✅ Yes (20-45 pts) |
| address | ✅ Schema exists | ❌ Not collected in UI |
| town | ✅ Schema exists | ✅ Yes (10-35 pts) |
| country | ✅ Schema exists | ❌ Not collected in UI |
| address2 | ❌ Missing | N/A |
| county | ❌ Missing | N/A |

---

## 2. Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **Complete Address Collection** | Gather full postal address during onboarding |
| **Follow E-Commerce Standards** | Use same form patterns as Amazon, Shopify |
| **Maintain UX Flow** | Keep all fields optional, don't block onboarding |
| **Admin Visibility** | Display full address in expanded user profile |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Address completion rate | >40% | Analytics |
| Form abandonment | No increase | Analytics |
| Admin satisfaction | Positive | Feedback |

---

## 3. Solution Design

### 3.1 Updated Profile Completion Form

Extend the existing ProfileCompletionStep to include address fields:

```
┌─────────────────────────────────────────────────────────────────┐
│  HELP US FIND YOUR CHILDREN                                      │
│                                                                  │
│  [Info box explaining why we ask for this]                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Phone Number                                            │   │
│  │  [+353 87 123 4567                    ]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alternative Email (optional)                            │   │
│  │  [another.email@example.com           ]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ── Address (Optional) ────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Street Address                                          │   │
│  │  [123 Main Street                     ]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Address Line 2 (apt, unit, etc.)                        │   │
│  │  [Apt 4B                              ]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────────┐      │
│  │  Town / City          │  │  Postcode / Eircode       │      │
│  │  [Dublin              ]  │  [D02 XY45               ]│      │
│  └───────────────────────┘  └───────────────────────────┘      │
│                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────────┐      │
│  │  County               │  │  Country                  │      │
│  │  [Dublin         ▼]   │  │  [Ireland            ▼]  │      │
│  └───────────────────────┘  └───────────────────────────┘      │
│                                                                  │
│                              [Skip for Now]  [Save & Continue]   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Field Behavior

| Field | Type | Behavior |
|-------|------|----------|
| Street Address | Text input | Free text, optional |
| Address Line 2 | Text input | Free text, optional |
| Town / City | Text input | Free text, optional |
| Postcode | Text input | Auto-uppercase, optional |
| County | Dynamic | Dropdown for IE (26 counties + Other), Free text for UK, Free text for others |
| Country | Dropdown | Top: Ireland, United Kingdom, United States; then alphabetical |

### 3.3 County Field Logic

```typescript
// Pseudo-code for county field behavior
if (country === "IE") {
  // Show dropdown with 26 Irish counties + "Other (enter manually)"
  showDropdown(IRISH_COUNTIES);
} else if (country === "GB") {
  // Show free text (GOV.UK guidance: county deprecated for UK)
  showTextInput();
} else if (country === "US") {
  // Show dropdown with 50 states + territories + "Other"
  showDropdown(US_STATES);
} else {
  // Show free text for state/province/region
  showTextInput();
}
```

### 3.4 Display in Manage Users

Address fields displayed in **expanded user profile only** (not on collapsed card):

```
┌─────────────────────────────────────────────────────────────────┐
│  [Collapsed Card - Unchanged]                                    │
│  John Smith · john@example.com · Coach, Parent                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [Expanded Profile]                                              │
│                                                                  │
│  Contact Information                                             │
│  ├── Email: john@example.com                                     │
│  ├── Phone: +353 87 123 4567                                     │
│  └── Alt Email: john.work@company.com                            │
│                                                                  │
│  Address                                                         │
│  ├── 123 Main Street, Apt 4B                                     │
│  ├── Dublin, D02 XY45                                            │
│  └── County Dublin, Ireland                                      │
│                                                                  │
│  Roles & Membership                                              │
│  └── ...                                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Changes

### 4.1 Add Fields to User Table

```typescript
// packages/backend/convex/betterAuth/schema.ts
// Add to customUserTable:

// NEW: Additional address fields
address2: v.optional(v.string()),  // Address line 2 (apt, unit, etc.)
county: v.optional(v.string()),    // County/State/Province
```

### 4.2 Full User Address Fields (After Change)

| Field | Type | Purpose |
|-------|------|---------|
| address | v.optional(v.string()) | Street address (line 1) |
| address2 | v.optional(v.string()) | **NEW** - Apt, unit, building |
| town | v.optional(v.string()) | Town or city |
| county | v.optional(v.string()) | **NEW** - County/state/province |
| postcode | v.optional(v.string()) | Postcode/Eircode/ZIP |
| country | v.optional(v.string()) | Country (ISO code: IE, GB, US) |

---

## 5. Backend Implementation

### 5.1 Update userProfiles.ts

**File**: `packages/backend/convex/models/userProfiles.ts`

**Changes**:

1. Add `address2` and `county` to `updateProfile` mutation args
2. Add `address2` and `county` to `getProfileStatus` query returns

```typescript
// updateProfile mutation - add to args:
export const updateProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    altEmail: v.optional(v.string()),
    postcode: v.optional(v.string()),
    address: v.optional(v.string()),
    address2: v.optional(v.string()),    // NEW
    town: v.optional(v.string()),
    county: v.optional(v.string()),      // NEW
    country: v.optional(v.string()),
  },
  // ... handler updates to pass new fields
});

// getProfileStatus query - add to returns:
export const getProfileStatus = query({
  // ... args unchanged
  returns: v.union(
    v.object({
      // ... existing fields
      address2: v.optional(v.string()),  // NEW
      county: v.optional(v.string()),    // NEW
    }),
    v.null()
  ),
  // ... handler updates to return new fields
});
```

### 5.2 Update Better Auth Component Function

**File**: `packages/backend/convex/betterAuth/userFunctions.ts`

**Changes**:

Update `updateProfileCompletion` to accept and save `address2` and `county`.

---

## 6. Frontend Implementation

### 6.1 Update ProfileCompletionStep

**File**: `apps/web/src/components/onboarding/profile-completion-step.tsx`

**Changes**:

1. Add state for new fields: `address`, `address2`, `town`, `county`, `country`
2. Add country dropdown with Ireland, United Kingdom, United States at top
3. Add dynamic county field (dropdown for IE/US, text for others)
4. Update form submission to include all address fields
5. Add collapsible "Address (Optional)" section to keep form clean

### 6.2 Update ProfileCompletionData Type

```typescript
export type ProfileCompletionData = {
  currentPhone?: string;
  currentPostcode?: string;
  currentAltEmail?: string;
  currentAddress?: string;      // NEW
  currentAddress2?: string;     // NEW
  currentTown?: string;         // NEW
  currentCounty?: string;       // NEW
  currentCountry?: string;      // NEW
  skipCount: number;
  canSkip: boolean;
  reason: string;
};
```

### 6.3 Create Country/County Constants

**File**: `apps/web/src/lib/constants/address-data.ts` (NEW)

```typescript
// Top countries for dropdown (ordered by relevance)
export const TOP_COUNTRIES = [
  { code: "IE", name: "Ireland" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

// Full country list (ISO 3166-1)
export const ALL_COUNTRIES = [
  // ... alphabetical list of all countries
];

// Irish counties (26 counties of Republic of Ireland)
export const IRISH_COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin",
  "Galway", "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim",
  "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan",
  "Offaly", "Roscommon", "Sligo", "Tipperary", "Waterford",
  "Westmeath", "Wexford", "Wicklow"
];

// US states and territories
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", /* ... all 50 states + DC + territories */
];
```

### 6.4 Update Manage Users Page

**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

**Changes**:

Add address display to expanded user profile section (NOT the collapsed card).

---

## 7. County/Country Data

### 7.1 Irish Counties (26)

Republic of Ireland has 26 counties:

| County | County | County | County |
|--------|--------|--------|--------|
| Carlow | Donegal | Laois | Offaly |
| Cavan | Dublin | Leitrim | Roscommon |
| Clare | Galway | Limerick | Sligo |
| Cork | Kerry | Longford | Tipperary |
| | Kildare | Louth | Waterford |
| | Kilkenny | Mayo | Westmeath |
| | | Meath | Wexford |
| | | Monaghan | Wicklow |

**Note**: Northern Ireland (6 counties: Antrim, Armagh, Down, Fermanagh, Londonderry, Tyrone) is part of the United Kingdom.

### 7.2 Country Handling

| Country Selected | County Field Behavior |
|------------------|----------------------|
| Ireland (IE) | Dropdown: 26 counties + "Other (enter manually)" |
| United Kingdom (GB) | Free text input (county deprecated per GOV.UK) |
| United States (US) | Dropdown: 50 states + DC + territories + "Other" |
| Other countries | Free text input for state/province/region |

### 7.3 Country Dropdown Order

1. Ireland
2. United Kingdom
3. United States
4. --- (separator)
5. Alphabetical list of all other countries

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Backend**:
- `updateProfile` accepts and saves `address2` and `county`
- `getProfileStatus` returns `address2` and `county`
- Existing phone/postcode normalization still works

**Frontend**:
- County dropdown shows correct options for IE
- County dropdown shows correct options for US
- County shows text input for GB and other countries
- Country change updates county field type
- Form submission includes all address fields

### 8.2 Integration Tests

1. **Full address flow**: User enters complete address → saved correctly → displayed in Manage Users
2. **Ireland address**: User selects Ireland → county dropdown appears with 26 options
3. **UK address**: User selects UK → county is free text
4. **Partial address**: User only enters town and postcode → saved correctly
5. **Skip with address**: User enters address then skips → address still saved

### 8.3 Manual UAT

1. Sign up new user → complete profile with full Irish address
2. Sign up new user → complete profile with full UK address
3. Sign up new user → complete profile with US address
4. Verify address displays correctly in expanded profile on Manage Users
5. Verify address does NOT appear on collapsed card
6. Verify existing postcode/phone matching still works

---

## 9. Definition of Done

### Code Complete
- [ ] `address2` and `county` fields added to user table schema
- [ ] `updateProfile` mutation updated with new fields
- [ ] `getProfileStatus` query updated with new fields
- [ ] `updateProfileCompletion` component function updated
- [ ] ProfileCompletionStep UI updated with address fields
- [ ] Country dropdown implemented with top countries
- [ ] County field implemented with dynamic behavior
- [ ] Address data constants file created
- [ ] Manage Users expanded profile shows address

### Testing Complete
- [ ] Unit tests for backend mutations/queries
- [ ] Unit tests for county field behavior
- [ ] Integration tests for address flow
- [ ] Manual UAT scenarios passed

### Quality Checks
- [ ] TypeScript: `npm run check-types` passes
- [ ] Linting: `npx ultracite fix` passes
- [ ] Convex codegen: `npx -w packages/backend convex codegen` passes

### Review
- [ ] Code review approved
- [ ] No regression in existing profile completion
- [ ] No regression in guardian matching

---

## Appendix A: Country List Source

Use ISO 3166-1 alpha-2 codes. Store the 2-letter code (IE, GB, US) in the database, display the full name in the UI.

## Appendix B: Form Layout Considerations

- Address fields should be in a collapsible section labeled "Address (Optional)"
- Default collapsed on mobile to reduce initial form length
- Default expanded on desktop where space permits
- Town and Postcode on same row (50/50 split)
- County and Country on same row (50/50 split)
- Address Line 1 and Address Line 2 full width

---

**Next**: After Phase 0.6 is complete, proceed to Phase 1: Foundation & Multi-Sport Support
