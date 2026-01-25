# Bug Fix: Issue #43 - Error in Sports Management Editing

**Issue:** [#43 - Error in sports management editing](https://github.com/NB-PDP-Testing/PDP/issues/43)

**Date Fixed:** 2026-01-25

**Branch:** `fix/43-sport-age-group-config-return-validator`

---

## Root Cause

The Convex return validators for sport age group configuration queries were missing the `_creationTime` field. Convex automatically adds `_creationTime` to all documents stored in the database, but the return validators did not include this field.

When the queries returned raw documents from the database, Convex's return validation failed because the returned objects contained a field (`_creationTime`) that wasn't declared in the validator.

**Error message:**
```
ReturnsValidationError: Object contains extra field `_creationTime` that is not in the validator.
```

**Affected queries in `packages/backend/convex/models/sportAgeGroupConfig.ts`:**
1. `getSportAgeGroupConfig` (line 17) - Returns array of sport age group configs
2. `getSportEligibilityRules` (line 50) - Returns array of eligibility rules
3. `getSportEligibilityRule` (line 84) - Returns single eligibility rule or null

---

## Suggested Fix

Add `_creationTime: v.number()` to the return validator object for each affected query. This aligns the validator with what Convex actually returns from the database.

---

## Code Changes

**File:** `packages/backend/convex/models/sportAgeGroupConfig.ts`

### Change 1: `getSportAgeGroupConfig` return validator (line 23)

```diff
  returns: v.array(
    v.object({
      _id: v.id("sportAgeGroupConfig"),
+     _creationTime: v.number(),
      sportCode: v.string(),
      ageGroupCode: v.string(),
      ...
    })
  ),
```

### Change 2: `getSportEligibilityRules` return validator (line 56)

```diff
  returns: v.array(
    v.object({
      _id: v.id("sportAgeGroupEligibilityRules"),
+     _creationTime: v.number(),
      sportCode: v.string(),
      fromAgeGroupCode: v.string(),
      ...
    })
  ),
```

### Change 3: `getSportEligibilityRule` return validator (line 93)

```diff
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sportAgeGroupEligibilityRules"),
+     _creationTime: v.number(),
      sportCode: v.string(),
      fromAgeGroupCode: v.string(),
      ...
    })
  ),
```

---

## How to Test

1. Navigate to Platform > Sports Management
2. Select a sport (e.g., Soccer)
3. View age group configurations
4. Verify no error appears and data loads correctly
5. Edit an age group configuration and save
6. Verify the changes persist without errors

---

## Related Issues

- Issue #44 appears to be a duplicate of this issue (per comment from @CAMMGael)

---

## Files Changed

- `packages/backend/convex/models/sportAgeGroupConfig.ts`
