# Phase 0.7: User Profile Address Management & Data Sync

**Timeline**: 2-3 days
**Status**: Ready for Implementation
**Dependencies**: Phase 0.6 (Address Collection) - Complete
**Blocks**: None

---

## Executive Summary

Establish a **single source of truth** for user/guardian address data by:
1. Making the `user` table the authoritative source for address
2. Adding address editing to the existing Profile Settings dialog
3. Syncing address changes to `guardianIdentities` when user saves
4. Pre-populating user address from imported guardian data when claiming

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Solution Design](#3-solution-design)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Data Sync Rules](#7-data-sync-rules)
8. [Testing Requirements](#8-testing-requirements)
9. [Definition of Done](#9-definition-of-done)

---

## 1. Problem Statement

### Current State

Two tables store address data with **NO synchronization**:

| Table | Address Fields | Created When |
|-------|----------------|--------------|
| `user` (Better Auth) | address, address2, town, county, postcode, country (6 fields) | User self-registers |
| `guardianIdentities` | address, town, postcode, country (4 fields) | Import or manual creation |

### The Problems

1. **Data duplication**: Same person can have different addresses in different tables
2. **No sync on claim**: When user claims imported guardian identity, no data is copied
3. **No sync on edit**: When user edits profile, `guardianIdentities` is not updated
4. **Schema mismatch**: `guardianIdentities` is missing `address2` and `county` fields
5. **No edit UI for address**: Profile Settings dialog doesn't include address fields

### Real-World Scenarios

**Scenario 1: Imported parent logs in**
1. Club imports guardian with address: "123 Main St, Dublin, D02 XY45"
2. Parent creates account and claims the guardian identity
3. Current behavior: User's address fields are EMPTY
4. Expected behavior: User's address pre-populated from import

**Scenario 2: Parent updates their address**
1. Parent moves house
2. Parent updates address in Profile Settings
3. Current behavior: Only `user` table updated
4. Expected behavior: `guardianIdentities` also updated (for matching)

---

## 2. Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **Single Source of Truth** | `user` table is authoritative for address |
| **Address Editing** | Users can edit their full address in Profile Settings |
| **Auto-Sync** | Address changes sync to `guardianIdentities` automatically |
| **Pre-populate on Claim** | Imported address copies to user on claim |

### Success Metrics

| Metric | Target |
|--------|--------|
| Address edit completion | Users can save address without errors |
| Sync accuracy | 100% of edits reflected in both tables |
| No data loss | Existing addresses preserved |

---

## 3. Solution Design

### 3.1 Data Architecture

**Source of Truth**: `user` table

**Sync Direction**: `user` → `guardianIdentities` (one-way)

**Sync Triggers**:
1. User saves profile in Profile Settings
2. System operations that modify user address

### 3.2 Claim Behavior

When user claims an imported guardian identity:
1. Link `userId` to `guardianIdentities` record (existing behavior)
2. **NEW**: If user has no address, copy from guardian to user

### 3.3 Edit Flow

```
User opens Profile Settings
        ↓
User edits address fields
        ↓
User clicks Save
        ↓
Backend: Update user table
        ↓
Backend: Find linked guardianIdentity (by userId)
        ↓
Backend: Sync address to guardianIdentities
        ↓
Success toast shown
```

### 3.4 UI Location

**Existing**: Profile Settings Dialog (`apps/web/src/components/profile/profile-settings-dialog.tsx`)
- Accessed via: User Menu → Profile button
- Currently shows: Name, Phone, Email (read-only)
- **Add**: Address section with all 6 fields

---

## 4. Database Schema Changes

### 4.1 Add Fields to guardianIdentities

**File**: `packages/backend/convex/schema.ts`

Add after line 176 (after `country` field):

```typescript
// Address (optional)
address: v.optional(v.string()),
town: v.optional(v.string()),
postcode: v.optional(v.string()),
country: v.optional(v.string()),
address2: v.optional(v.string()),  // Phase 0.7: Address line 2
county: v.optional(v.string()),    // Phase 0.7: County/State/Province
```

### 4.2 Update guardianIdentityValidator

**File**: `packages/backend/convex/models/guardianIdentities.ts`

Update validator (lines 28-46) to include:

```typescript
address2: v.optional(v.string()),
county: v.optional(v.string()),
```

### 4.3 Update updateGuardianIdentity Mutation

**File**: `packages/backend/convex/models/guardianIdentities.ts`

Add `address2` and `county` to args (line 959+):

```typescript
address2: v.optional(v.string()),
county: v.optional(v.string()),
```

---

## 5. Backend Implementation

### 5.1 Create updateProfileWithSync Mutation

**File**: `packages/backend/convex/models/userProfiles.ts`

```typescript
/**
 * Update user profile with automatic sync to guardianIdentities.
 *
 * This mutation:
 * 1. Updates the user table with profile data
 * 2. Finds any linked guardianIdentity (by userId)
 * 3. Syncs address fields to guardianIdentities for matching consistency
 */
export const updateProfileWithSync = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    address2: v.optional(v.string()),
    town: v.optional(v.string()),
    county: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // 2. Update user table
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.phone !== undefined) updates.phone = normalizePhone(args.phone);
    if (args.address !== undefined) updates.address = args.address;
    if (args.address2 !== undefined) updates.address2 = args.address2;
    if (args.town !== undefined) updates.town = args.town;
    if (args.county !== undefined) updates.county = args.county;
    if (args.postcode !== undefined) updates.postcode = normalizePostcode(args.postcode);
    if (args.country !== undefined) updates.country = args.country;

    await ctx.db.patch(user._id, updates);

    // 3. Find linked guardianIdentity
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    // 4. Sync to guardianIdentities if linked
    if (guardianIdentity) {
      const guardianUpdates: Record<string, unknown> = {
        updatedAt: Date.now(),
      };

      // Sync name fields
      if (args.firstName !== undefined) guardianUpdates.firstName = args.firstName;
      if (args.lastName !== undefined) guardianUpdates.lastName = args.lastName;
      if (args.phone !== undefined) guardianUpdates.phone = normalizePhone(args.phone);

      // Sync address fields
      if (args.address !== undefined) guardianUpdates.address = args.address;
      if (args.address2 !== undefined) guardianUpdates.address2 = args.address2;
      if (args.town !== undefined) guardianUpdates.town = args.town;
      if (args.county !== undefined) guardianUpdates.county = args.county;
      if (args.postcode !== undefined) guardianUpdates.postcode = normalizePostcode(args.postcode);
      if (args.country !== undefined) guardianUpdates.country = args.country;

      await ctx.db.patch(guardianIdentity._id, guardianUpdates);
    }

    return { success: true };
  },
});
```

### 5.2 Update linkGuardianToUser Mutation

**File**: `packages/backend/convex/models/guardianIdentities.ts`

Modify `linkGuardianToUser` (around line 1036) to copy address:

```typescript
export const linkGuardianToUser = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.guardianIdentityId);
    if (!existing) {
      throw new Error("Guardian identity not found");
    }

    // Check if this userId is already linked to another guardian
    const existingUserLink = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUserLink && existingUserLink._id !== args.guardianIdentityId) {
      throw new Error(
        "This user is already linked to another guardian identity"
      );
    }

    // Link the guardian identity to the user
    await ctx.db.patch(args.guardianIdentityId, {
      userId: args.userId,
      verificationStatus:
        existing.verificationStatus === "unverified"
          ? "email_verified"
          : existing.verificationStatus,
      updatedAt: Date.now(),
    });

    // NEW: Copy guardian address to user if user has no address
    // This pre-populates the user's profile with imported data
    const userIdAsId = args.userId as Id<"user">;
    const userRecord = await ctx.db.get(userIdAsId);

    if (userRecord && !userRecord.address && existing.address) {
      await ctx.db.patch(userIdAsId, {
        address: existing.address,
        address2: existing.address2,
        town: existing.town,
        county: existing.county,
        postcode: existing.postcode,
        country: existing.country,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
```

---

## 6. Frontend Implementation

### 6.1 Expand ProfileSettingsDialog

**File**: `apps/web/src/components/profile/profile-settings-dialog.tsx`

**Changes**:

1. Import address data constants:
```typescript
import {
  TOP_COUNTRIES,
  ALL_COUNTRIES,
  IRISH_COUNTIES,
  US_STATES,
  getCountyOptions,
  getCountryName,
} from "@/lib/constants/address-data";
```

2. Add address state variables:
```typescript
const [address, setAddress] = useState(user?.address || "");
const [address2, setAddress2] = useState(user?.address2 || "");
const [town, setTown] = useState(user?.town || "");
const [county, setCounty] = useState(user?.county || "");
const [postcode, setPostcode] = useState(user?.postcode || "");
const [country, setCountry] = useState(user?.country || "");
```

3. Add new "Address" card section after "Personal Information":
```typescript
{/* Address Section */}
<Card>
  <CardHeader>
    <CardTitle>Address</CardTitle>
    <CardDescription>
      Your home address (optional but helps with matching)
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Street Address */}
    <div className="space-y-2">
      <Label htmlFor="address">Street Address</Label>
      <Input
        id="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="123 Main Street"
      />
    </div>

    {/* Address Line 2 */}
    <div className="space-y-2">
      <Label htmlFor="address2">Address Line 2</Label>
      <Input
        id="address2"
        value={address2}
        onChange={(e) => setAddress2(e.target.value)}
        placeholder="Apartment, suite, unit, etc. (optional)"
      />
    </div>

    {/* Town and Postcode - same row */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="town">Town / City</Label>
        <Input
          id="town"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          placeholder="Dublin"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="postcode">Postcode / Eircode</Label>
        <Input
          id="postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          placeholder="D02 XY45"
        />
      </div>
    </div>

    {/* County and Country - same row */}
    <div className="grid grid-cols-2 gap-4">
      {/* County - dynamic field */}
      <div className="space-y-2">
        <Label htmlFor="county">County / State</Label>
        {/* Dropdown for IE or US, text input otherwise */}
        {/* Reuse pattern from ProfileCompletionStep */}
      </div>

      {/* Country - dropdown */}
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {TOP_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            {ALL_COUNTRIES.filter(
              (c) => !TOP_COUNTRIES.some((t) => t.code === c.code)
            ).map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </CardContent>
</Card>
```

4. Update save handler to use new mutation:
```typescript
const updateProfileWithSync = useMutation(
  api.models.userProfiles.updateProfileWithSync
);

const handleSave = async () => {
  // ... validation ...

  await updateProfileWithSync({
    firstName: canEditName ? firstName : undefined,
    lastName: canEditName ? lastName : undefined,
    phone,
    address,
    address2,
    town,
    county,
    postcode,
    country,
  });

  toast.success("Profile updated successfully");
};
```

### 6.2 Update Guardian Settings Display

**File**: `apps/web/src/app/orgs/[orgId]/parents/components/guardian-settings.tsx`

**Changes**:

1. Update prop types to include address:
```typescript
type GuardianSettingsProps = {
  guardianIdentity: {
    _id: Id<"guardianIdentities">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    address2?: string;
    town?: string;
    county?: string;
    postcode?: string;
    country?: string;
    verificationStatus?: string;
  } | null;
};
```

2. Add address display in "Your Profile" card:
```typescript
{/* Address - if any field has data */}
{(guardianIdentity.address ||
  guardianIdentity.town ||
  guardianIdentity.postcode) && (
  <>
    <Separator className="my-2" />
    <div className="space-y-2 text-sm">
      <span className="text-muted-foreground">Address:</span>
      {guardianIdentity.address && (
        <p className="font-medium">
          {guardianIdentity.address}
          {guardianIdentity.address2 && `, ${guardianIdentity.address2}`}
        </p>
      )}
      {(guardianIdentity.town || guardianIdentity.postcode) && (
        <p className="font-medium">
          {guardianIdentity.town}
          {guardianIdentity.town && guardianIdentity.postcode && ", "}
          {guardianIdentity.postcode}
        </p>
      )}
      {(guardianIdentity.county || guardianIdentity.country) && (
        <p className="font-medium">
          {guardianIdentity.county}
          {guardianIdentity.county && guardianIdentity.country && ", "}
          {guardianIdentity.country && getCountryName(guardianIdentity.country)}
        </p>
      )}
    </div>
  </>
)}
```

3. Add "Edit Profile" button at bottom of profile card:
```typescript
<Button
  variant="outline"
  size="sm"
  className="mt-4 w-full"
  onClick={() => {
    setShowSettingsDialog(false);
    // Trigger profile settings dialog
    // This requires lifting state or using a global state manager
  }}
>
  Edit Profile
</Button>
```

---

## 7. Data Sync Rules

### 7.1 When User Saves Profile

| Field | user Table | guardianIdentities | Behavior |
|-------|------------|-------------------|----------|
| firstName | Updated | Synced | Always sync |
| lastName | Updated | Synced | Always sync |
| phone | Updated | Synced | Always sync |
| address | Updated | Synced | Always sync |
| address2 | Updated | Synced | Always sync |
| town | Updated | Synced | Always sync |
| county | Updated | Synced | Always sync |
| postcode | Updated | Synced | Always sync |
| country | Updated | Synced | Always sync |

### 7.2 When User Claims Guardian Identity

| Field | Source | Destination | Condition |
|-------|--------|-------------|-----------|
| address | guardianIdentities | user | Only if user.address is empty |
| address2 | guardianIdentities | user | Only if user.address is empty |
| town | guardianIdentities | user | Only if user.address is empty |
| county | guardianIdentities | user | Only if user.address is empty |
| postcode | guardianIdentities | user | Only if user.address is empty |
| country | guardianIdentities | user | Only if user.address is empty |

**Note**: All address fields copied together or not at all (no partial copy).

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Backend**:
- `updateProfileWithSync` saves all fields to user table
- `updateProfileWithSync` syncs to guardianIdentities if linked
- `updateProfileWithSync` does NOT error if no guardianIdentity linked
- `linkGuardianToUser` copies address when user has none
- `linkGuardianToUser` does NOT overwrite existing user address

**Frontend**:
- ProfileSettingsDialog renders all address fields
- County dropdown shows for IE and US
- County text input shows for other countries
- Save button calls mutation with all fields

### 8.2 Integration Tests

1. **Self-registered user edits address**:
   - User with no guardianIdentity edits address
   - Address saved to user table
   - No errors

2. **Linked user edits address**:
   - User with guardianIdentity edits address
   - Address saved to user table
   - Address synced to guardianIdentities

3. **User claims guardian with address**:
   - User has no address
   - Claims guardian with address
   - User's address populated from guardian

4. **User claims guardian but has address**:
   - User already has address
   - Claims guardian with different address
   - User's address NOT overwritten

### 8.3 Manual UAT

1. Create new user, fill profile with address, verify saved
2. Import guardian with address, claim as user, verify pre-populated
3. Edit address in Profile Settings, verify Guardian Settings shows update
4. Verify Manage Users page shows correct address

---

## 9. Definition of Done

### Code Complete
- [ ] `address2` and `county` fields added to guardianIdentities schema
- [ ] `guardianIdentityValidator` updated with new fields
- [ ] `updateGuardianIdentity` mutation accepts new fields
- [ ] `updateProfileWithSync` mutation created with sync logic
- [ ] `linkGuardianToUser` copies address on claim
- [ ] ProfileSettingsDialog includes address fields
- [ ] Guardian Settings displays address (read-only)

### Testing Complete
- [ ] Unit tests for backend mutations
- [ ] Integration tests for sync behavior
- [ ] Manual UAT scenarios passed

### Quality Checks
- [ ] TypeScript: `npm run check-types` passes
- [ ] Linting: `npx ultracite fix` passes
- [ ] Convex codegen: `npx -w packages/backend convex codegen` passes

### Review
- [ ] No regression in guardian matching
- [ ] No regression in profile completion
- [ ] Data sync works correctly in all scenarios
