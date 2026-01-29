# Sign-Up Enhancement Design Document

**Related Issue:** https://github.com/NB-PDP-Testing/PDP/issues/375
**Status:** Design Review
**Author:** Claude Code
**Date:** January 29, 2026

---

## Overview

This document outlines enhancements to the user sign-up process to improve parent-child matching. By collecting additional information during and immediately after registration, we can leverage the existing multi-signal matching algorithm to automatically connect parents with their children's records.

---

## Problem Statement

### Current State
- Sign-up collects only: Full Name, Email, Password
- Parent-child matching uses email-only lookup (50 points max)
- Many parents fail to be matched to their children's records due to:
  - Different email addresses between import and sign-up
  - No fallback matching signals available

### Desired State
- Sign-up collects additional optional fields for matching
- Post-registration step collects children's information
- Matching uses full multi-signal algorithm (up to 170 points)
- More parents automatically connected to their children

---

## Current Sign-Up Form

```
┌─────────────────────────────────────────┐
│           Create Account                │
├─────────────────────────────────────────┤
│ Full Name *          [_______________]  │
│ Email *              [_______________]  │
│ Password *           [_______________]  │
│                                         │
│         [Create Account]                │
└─────────────────────────────────────────┘
```

**File:** `apps/web/src/components/sign-up-form.tsx`

---

## Proposed Sign-Up Form

```
┌─────────────────────────────────────────┐
│           Create Account                │
├─────────────────────────────────────────┤
│ First Name *         [_______________]  │
│ Last Name *          [_______________]  │
│ Email *              [_______________]  │
│ Password *           [_______________]  │
│                                         │
│ ─── Help us find your records ───       │
│     (Optional)                          │
│                                         │
│ Phone Number         [_______________]  │
│   Helps connect you to club records     │
│                                         │
│ Postcode/Eircode     [_______________]  │
│   Used for household matching           │
│                                         │
│         [Create Account]                │
└─────────────────────────────────────────┘
```

### Changes from Current

| Field | Current | Proposed | Required |
|-------|---------|----------|----------|
| Name | Single "Full Name" | Split into First + Last | Yes |
| Phone | Not collected | New field | No |
| Postcode | Not collected | New field | No |

---

## Post-Registration Step: Children Information

After successful sign-up, before showing matched children, add a new step:

### Step 1: Children Inquiry

```
┌─────────────────────────────────────────┐
│    Do you have children at a club?      │
├─────────────────────────────────────────┤
│ This helps us connect you to their      │
│ records automatically.                  │
│                                         │
│ ○ Yes, I have children at a sports club │
│ ○ No, I'm joining as a coach/other      │
│                                         │
│ [Continue]                              │
└─────────────────────────────────────────┘
```

### Step 2: Children Details (if "Yes")

```
┌─────────────────────────────────────────┐
│      Tell us about your children        │
├─────────────────────────────────────────┤
│ This information is used only to match  │
│ you with existing club records.         │
│                                         │
│ Child 1                                 │
│   First Name    [_______________]       │
│   Date of Birth [____/____/______]      │
│                                         │
│ [+ Add another child]                   │
│                                         │
│ [Continue]  [Skip - I'll do this later] │
└─────────────────────────────────────────┘
```

---

## Matching Points Breakdown

The existing `getSmartMatchesForGuardian` function uses multi-signal scoring:

| Signal | Points | Source |
|--------|--------|--------|
| Email match | 50 | Sign-up form (email) |
| Surname match | 25 | Sign-up form (last name) |
| Child name exact (first + last) | 40 | Children info step |
| Age confirmation (±1 year) | +20 | Children info step (DOB) |
| Phone match | 15 | Sign-up form (optional) |
| Postcode match | 20 | Sign-up form (optional) |
| **Total Potential** | **170** | |

### Confidence Thresholds

| Score | Confidence | Action |
|-------|------------|--------|
| 60+ | High | Auto-show in claim modal |
| 30-59 | Medium | Show with lower prominence |
| 10-29 | Low | Show as "possible match" |
| <10 | None | Don't show |

---

## Technical Implementation

### 1. Schema Changes

**File:** `packages/backend/convex/schema.ts`

Add to user table in Better Auth extensions:
```typescript
// User table extensions (in betterAuth configuration)
phone: v.optional(v.string()),
postcode: v.optional(v.string()),
```

### 2. Sign-Up Form Updates

**File:** `apps/web/src/components/sign-up-form.tsx`

```typescript
// Update form default values
defaultValues: {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",      // NEW - optional
  postcode: "",   // NEW - optional
},

// Update validation schema
validators: {
  onSubmit: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: z.string().optional(),
    postcode: z.string().optional(),
  }),
},

// Update authClient.signUp.email call
await authClient.signUp.email({
  email: value.email,
  password: value.password,
  name: `${value.firstName} ${value.lastName}`,
  // Additional fields stored in user record
});
```

### 3. Auth Configuration

**File:** `packages/backend/convex/auth.ts`

Ensure phone and postcode are stored when user is created:
```typescript
// In user creation callback or Better Auth configuration
// Store additional fields from sign-up form
```

### 4. Onboarding Orchestrator

**File:** `apps/web/src/components/onboarding/onboarding-orchestrator.tsx`

Add new step for children information collection:
```typescript
// New state for children info
const [childrenInfo, setChildrenInfo] = useState<{
  hasChildren: boolean | null;
  children: Array<{ firstName: string; dateOfBirth: string }>;
}>({ hasChildren: null, children: [] });

// New step component: ChildrenInfoStep
// - Asks if user has children at a club
// - If yes, collects names and DOBs
// - Passes info to matching function
```

### 5. Enhanced Matching

**File:** `packages/backend/convex/models/guardianIdentities.ts`

Update `checkForClaimableIdentity` to use full matching:
```typescript
export const checkForClaimableIdentity = query({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),      // NEW
    postcode: v.optional(v.string()),   // NEW
    children: v.optional(v.string()),   // NEW - JSON array
  },
  handler: async (ctx, args) => {
    // Use getSmartMatchesForGuardian instead of email-only lookup
    // Pass all available signals for scoring
  },
});
```

---

## Files to Modify

| File | Purpose |
|------|---------|
| `packages/backend/convex/schema.ts` | Add phone, postcode to user schema |
| `apps/web/src/components/sign-up-form.tsx` | Update form fields and validation |
| `packages/backend/convex/auth.ts` | Store additional fields on user creation |
| `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` | Add children info step |
| `packages/backend/convex/models/guardianIdentities.ts` | Enhance matching to use all signals |

---

## OAuth Considerations

For Google and Microsoft OAuth sign-ups:
- Name is provided by OAuth provider (may need to prompt for split)
- Email is provided by OAuth provider
- Phone and Postcode must be collected post-registration
- Children info collected in same post-registration step

**Flow:**
```
OAuth Sign-Up → "Complete Your Profile" step → Children Info step → Matching
```

---

## Verification Checklist

### Sign-Up Form
- [ ] First Name and Last Name fields appear
- [ ] Phone and Postcode fields appear (optional)
- [ ] Form validates correctly
- [ ] User record stores all fields

### Children Info Step
- [ ] Step appears after sign-up
- [ ] "Yes/No" selection works
- [ ] Children details form appears if "Yes"
- [ ] Can add multiple children
- [ ] Skip option works

### Matching
- [ ] Email match scores 50 points
- [ ] Surname match scores 25 points
- [ ] Phone match scores 15 points
- [ ] Postcode match scores 20 points
- [ ] Child name match scores 40 points
- [ ] Age confirmation adds 20 bonus points

### Edge Cases
- [ ] OAuth sign-up prompts for additional info
- [ ] Partial info (only some optional fields) still works
- [ ] No matches found continues to normal flow
- [ ] Duplicate child entries are handled

---

## Timeline Estimate

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Schema & Form | Update schema, modify sign-up form | 1-2 days |
| Children Step | Create new onboarding step | 1-2 days |
| Matching | Enhance checkForClaimableIdentity | 1 day |
| Testing | End-to-end verification | 1 day |
| **Total** | | **4-6 days** |

---

## Future Enhancements

These are NOT part of this design but could be added later:

1. **Address auto-complete** - Use postcode lookup to fill town/address
2. **Phone validation** - Verify phone format (Irish mobile, etc.)
3. **Club search** - "Which club are your children at?" dropdown
4. **Sibling detection** - If one child matched, suggest siblings

---

## Approval

- [ ] Product Owner
- [ ] Technical Lead
- [ ] UX Review
