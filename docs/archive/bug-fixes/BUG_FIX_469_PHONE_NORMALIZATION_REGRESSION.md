# Bug Fix #469: Phone Number Normalization Regression

**Issue:** https://github.com/NB-PDP-Testing/PDP/issues/469
**Date:** 2026-02-19
**Severity:** HIGH - Data corruption in production database

---

## Problem Summary

Between 10:35 AM - 11:10 AM on February 18, 2026, all phone numbers in the Better Auth user table lost their '+' country code prefix.

**Example:**
- Before: `+447123456789` (UK number)
- After: `447123456789` (broken format)
- Before: `+353871234567` (Irish number)
- After: `353871234567` (broken format)

This broke WhatsApp message routing because the system expects phone numbers in E.164 format (with '+' prefix).

**User Impact:**
- Daire Malin sent a WhatsApp message that may have triggered profile updates
- All affected users' phone numbers became invalid for WhatsApp matching
- Required manual database fixes in production

---

## Root Cause Analysis

### The Core Issue: Duplicate Normalization Functions

The codebase has **TWO DIFFERENT** phone normalization functions with different behaviors:

#### 1. `normalizePhoneNumber()` (CORRECT)
**Location:** `packages/backend/convex/lib/phoneUtils.ts`

```typescript
export function normalizePhoneNumber(
  phone: string,
  countryCode: "IE" | "GB" | "US" = "IE"
): string {
  // Uses libphonenumber-js
  // Returns: E.164 format WITH '+' prefix
  // Example: "0879..." → "+353879..."
}
```

**Behavior:**
- Uses industry-standard `libphonenumber-js` library
- Returns E.164 international format (e.g., `+353871234567`)
- Preserves '+' prefix (REQUIRED for WhatsApp, SMS, international calling)
- Handles multiple input formats correctly

#### 2. `normalizePhone()` (INCORRECT for user.phone field)
**Location:** `packages/backend/convex/lib/matching/guardianMatcher.ts` (lines 105-132)

```typescript
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(NON_DIGIT_REGEX, "");

  // Handle Irish mobile starting with 08 (10 digits total)
  if (digits.startsWith("08") && digits.length === 10) {
    digits = `353${digits.substring(1)}`;
  }

  // Returns: DIGITS ONLY (NO '+' prefix)
  // Example: "+447..." → "447..."
}
```

**Behavior:**
- Strips ALL non-digits (including '+')
- Returns digits-only format (e.g., `447123456789`)
- **INTENTIONALLY DESIGNED** for guardian matching comparisons (phone-to-phone matching where format consistency matters more than E.164 compliance)
- **NOT SAFE** for storing in user.phone field

---

## The Bug: Wrong Function Used in Profile Updates

### Affected Code
**File:** `packages/backend/convex/models/userProfiles.ts`

**Line 121:**
```typescript
const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;
```

**Line 149:**
```typescript
if (normalizedPhone !== undefined) {
  userUpdates.phone = normalizedPhone; // ← Stores digits-only format!
}
```

**Line 202:**
```typescript
if (normalizedPhone !== undefined) {
  guardianUpdates.phone = normalizedPhone; // ← Also breaks guardianIdentities
}
```

### What Happened

When `updateProfileWithSync` is called (from onboarding, profile settings, or any profile update flow):

1. User provides phone: `+353871234567` or `0879...`
2. Code calls `normalizePhone()` (WRONG function)
3. Function strips '+' and returns: `353871234567`
4. **Database updated with broken format**
5. WhatsApp matching fails (expects `+353871234567`)

---

## Why This Went Undetected

### Previous Fix (February 4, 2026)
**Reference:** `docs/archive/bug-fixes/BUG_FIX_434_PHONE_NUMBER_FORMAT.md`

The team **already fixed** a similar issue in `userFunctions.ts`:

```typescript
// userFunctions.ts Line 92 (CORRECT)
if (args.phone !== undefined) {
  updates.phone = normalizePhoneNumber(args.phone); // ✅ Uses correct function
}
```

**But** the `userProfiles.ts` file has a SEPARATE mutation (`updateProfileWithSync`) that was **not fixed** and still uses the wrong function.

### Code Duplication Problem
There are **multiple places** that update user.phone:

| File | Function | Phone Normalization | Status |
|------|----------|---------------------|--------|
| `betterAuth/userFunctions.ts` | `updateUserProfile` | `normalizePhoneNumber()` | ✅ CORRECT |
| `models/userProfiles.ts` | `updateProfile` | `normalizePhone()` | ❌ WRONG |
| `models/userProfiles.ts` | `updateProfileWithSync` | `normalizePhone()` | ❌ WRONG |

---

## Trigger Path: How WhatsApp Messages Caused It

### Timeline Reconstruction

**10:35 AM - 11:10 AM on Feb 18:**
1. Daire Malin sent WhatsApp message
2. WhatsApp webhook triggered `receiveMessage` action
3. System matched coach by phone number (lookup works because it normalizes on READ)
4. **Somewhere in the flow** - profile update triggered (TBD)
5. Profile update used `updateProfileWithSync` (wrong function)
6. **All phone numbers corrupted**

### Possible Trigger Points

**Need to verify which of these triggered the update:**

1. **Onboarding flow** - If Daire was completing onboarding while sending message
2. **Profile sync** - Auto-sync from guardianIdentities to user table
3. **WhatsApp number update** - If system tried to "verify" or "normalize" phone numbers after matching
4. **Mass migration** - Admin action or cron job that updated all profiles

**Next Step:** Search Convex logs for `updateProfileWithSync` calls between 10:35-11:10 AM on Feb 18

---

## The Fix

### Strategy

1. **Replace `normalizePhone` with `normalizePhoneNumber`** in user profile update functions
2. **Preserve `normalizePhone`** for guardian matching (it's correct for that use case)
3. **Add clear documentation** explaining when to use each function
4. **Add tests** to prevent regression

### Code Changes Required

#### File 1: `packages/backend/convex/models/userProfiles.ts`

**Change Line 19:**
```typescript
// BEFORE
import {
  normalizePhone,
  normalizePostcode,
} from "../lib/matching/guardianMatcher";

// AFTER
import { normalizePhoneNumber } from "../lib/phoneUtils";
import { normalizePostcode } from "../lib/matching/guardianMatcher";
```

**Change Line 56 (`updateProfile` mutation):**
```typescript
// BEFORE
const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;

// AFTER
const normalizedPhone = args.phone ? normalizePhoneNumber(args.phone) : undefined;
```

**Change Line 121 (`updateProfileWithSync` mutation):**
```typescript
// BEFORE
const normalizedPhone = args.phone ? normalizePhone(args.phone) : undefined;

// AFTER
const normalizedPhone = args.phone ? normalizePhoneNumber(args.phone) : undefined;
```

---

## Verification Steps

### 1. Test the Fix

```typescript
// Test case: Irish number
const input = "0879123456";
const result = normalizePhoneNumber(input, "IE");
console.log(result); // Should be: "+353879123456" (WITH '+')

// Test case: UK number
const input2 = "07912345678";
const result2 = normalizePhoneNumber(input2, "GB");
console.log(result2); // Should be: "+447912345678" (WITH '+')
```

### 2. Database Cleanup (Production)

**Query to find broken numbers:**
```javascript
// In Convex dashboard
const users = await ctx.db.query("user").collect();
const broken = users.filter(u => {
  return u.phone && !u.phone.startsWith('+') && /^\d+$/.test(u.phone);
});
console.log(`Found ${broken.length} broken phone numbers`);
```

**Fix script:**
```javascript
// Manual fix for each broken user
const user = await ctx.db.get(userId);
if (user.phone && !user.phone.startsWith('+')) {
  await ctx.db.patch(userId, {
    phone: `+${user.phone}`, // Add '+' back
    updatedAt: Date.now()
  });
}
```

### 3. Check guardianIdentities Table

**Same issue might affect guardianIdentities:**
```javascript
const guardians = await ctx.db.query("guardianIdentities").collect();
const brokenGuardians = guardians.filter(g => {
  return g.phone && !g.phone.startsWith('+') && /^\d+$/.test(g.phone);
});
console.log(`Found ${brokenGuardians.length} broken guardian phone numbers`);
```

---

## Prevention Measures

### 1. Add JSDoc Comments to Both Functions

**In `phoneUtils.ts`:**
```typescript
/**
 * Normalize phone number to E.164 international format.
 *
 * **USE THIS** for storing phone numbers in:
 * - user.phone
 * - guardianIdentities.phone
 * - Any field used for WhatsApp, SMS, or international calling
 *
 * Returns format: "+353871234567" (WITH '+' prefix)
 * Uses libphonenumber-js for standard compliance.
 *
 * @param phone - Raw phone number (any format)
 * @param countryCode - Default country code (IE, GB, US)
 * @returns E.164 format with '+' prefix
 */
export function normalizePhoneNumber(...)
```

**In `guardianMatcher.ts`:**
```typescript
/**
 * Normalize phone number for MATCHING COMPARISONS ONLY.
 *
 * **DO NOT USE** for storing phone numbers in database!
 * This function strips '+' for consistent comparison.
 *
 * Use `normalizePhoneNumber()` from phoneUtils.ts instead
 * for storing phone numbers.
 *
 * Returns format: "353871234567" (NO '+' prefix)
 *
 * @param phone - Raw phone number (any format)
 * @returns Digits-only format for comparison
 */
export function normalizePhone(phone: string): string {
```

### 2. Rename the Guardian Matcher Function

To avoid confusion, consider renaming:
```typescript
// BEFORE
export function normalizePhone(phone: string): string

// AFTER
export function normalizePhoneForMatching(phone: string): string
```

Then update all references in `guardianMatcher.ts` and `onboarding.ts`.

### 3. Add Quality Check Hook

Add to `.claude/hooks/post-tool-use/quality-check.sh`:

```bash
# Check for incorrect phone normalization
if grep -r "normalizePhone(" packages/backend/convex/models/userProfiles.ts packages/backend/convex/betterAuth/userFunctions.ts 2>/dev/null; then
  echo "❌ QUALITY CHECK FAILED: Found normalizePhone() in profile update code"
  echo "   Use normalizePhoneNumber() from phoneUtils.ts instead"
  exit 1
fi
```

### 4. Add Unit Tests

```typescript
// tests/phone-normalization.test.ts
describe("Phone normalization for user.phone field", () => {
  test("should preserve '+' prefix", () => {
    const result = normalizePhoneNumber("0879123456", "IE");
    expect(result).toBe("+353879123456");
    expect(result.startsWith("+")).toBe(true);
  });

  test("should handle UK numbers", () => {
    const result = normalizePhoneNumber("07912345678", "GB");
    expect(result).toBe("+447912345678");
  });

  test("should handle already-normalized numbers", () => {
    const result = normalizePhoneNumber("+353871234567", "IE");
    expect(result).toBe("+353871234567");
  });
});
```

---

## Related Issues

- **#434** - Original phone normalization fix (Feb 4, 2026)
- **#469** - Regression (Feb 18, 2026) - this issue

---

## Deployment Checklist

- [ ] Apply code changes to `userProfiles.ts`
- [ ] Run TypeScript check: `npm run check-types`
- [ ] Test with manual phone number updates
- [ ] Deploy to production
- [ ] Run database cleanup script for broken phone numbers
- [ ] Verify WhatsApp message routing works again
- [ ] Add quality check hook to prevent future regressions
- [ ] Consider renaming `normalizePhone` to `normalizePhoneForMatching`

---

## Lessons Learned

1. **Code duplication is dangerous** - Having multiple places that update user.phone created a maintenance burden
2. **Function naming matters** - `normalizePhone` vs `normalizePhoneNumber` are too similar
3. **Previous fixes need full coverage** - The Feb 4 fix only addressed one of three update paths
4. **Testing is critical** - This would have been caught by unit tests comparing input/output formats
5. **Data validation needed** - Database schema should enforce E.164 format (starts with '+')

---

**Status:** ROOT CAUSE IDENTIFIED - Ready for fix implementation

**Next Actions:**
1. Apply the fix to `userProfiles.ts`
2. Test with sample phone numbers
3. Deploy and verify WhatsApp routing
4. Run production database cleanup
