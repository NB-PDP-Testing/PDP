# Integration Summary: What's Missing from Main

**TL;DR**: ~90% of passport sharing is already in main. Only 3 minor enhancements are missing.

---

## Visual Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                   PASSPORT SHARING FEATURES                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Parent Sharing Wizard (complete)                        │
│  ✅ Receiving Organization Selection                        │
│  ✅ Multi-step Wizard (Child/Elements/Org/Duration)         │
│  ✅ Coach Acceptance/Decline Workflow                       │
│  ✅ Access Requests from Coaches                            │
│  ✅ Pending Requests for Parents                            │
│  ✅ Audit Logging System                                    │
│  ✅ Notification System (in-app + preferences)              │
│  ✅ Child Sharing Cards                                     │
│  ✅ Review & Success Steps                                  │
│  ✅ Shared Passport Viewing                                 │
│  ✅ Active/Pending/Browse Tabs                              │
│  ✅ Medical Profiles using playerIdentityId                 │
│  ✅ Consent Revocation                                      │
│  ✅ Access Audit Trail                                      │
│  ✅ Multi-Guardian Support                                  │
│                                                              │
│  ❌ Analytics: Consent Initiation Tracking (minor)          │
│  ❌ Enhanced User Menu Backend (separate feature #271)      │
│  ❌ Code Quality: Better Auth Helper Functions (minor)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Legend:
  ✅ = Already in main (complete)
  ❌ = Missing from main (in stash@{6})
```

---

## Missing Items (3 total)

### 1. ❌ User Preferences Table (Enhanced User Menu #271)

**File**: `schema.ts`
**Purpose**: Store user's preferred default organization and role
**Feature**: Enhanced User Menu
**Impact**: Medium (enables smart login defaults)
**Risk**: LOW (new table, no conflicts)

```typescript
userPreferences: defineTable({
  userId: v.string(),
  preferredDefaultOrg: v.optional(v.string()),
  preferredDefaultRole: v.optional(v.union(...)),
  orgAccessHistory: v.optional(v.array(...)), // Usage tracking
  suggestionDismissedAt: v.optional(v.number()),
  suggestionAcceptedAt: v.optional(v.number()),
  densityPreference: v.optional(v.union(...)),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

**Integration Time**: 15 minutes
**Breaking Changes**: None

---

### 2. ❌ Consent Initiation Tracking Fields

**File**: `schema.ts` in `passportShareConsents`
**Purpose**: Track HOW consent was created (parent-initiated vs coach-requested)
**Feature**: Analytics and insights
**Impact**: LOW (analytics only)
**Risk**: VERY LOW (optional fields)

```typescript
// Add to passportShareConsents:
initiationType: v.optional(
  v.union(
    v.literal("parent_initiated"),
    v.literal("coach_requested")
  )
),
sourceRequestId: v.optional(v.id("passportShareRequests")),
```

**Integration Time**: 10 minutes
**Breaking Changes**: None (optional fields)

---

### 3. ❌ Better Auth Helper Functions

**File**: `passportSharing.ts`
**Purpose**: DRY code - centralized org/user lookups
**Feature**: Code quality improvement
**Impact**: LOW (no new functionality)
**Risk**: NONE (helper functions only)

```typescript
async function lookupOrganization(ctx: any, orgId: string): Promise<OrgLookupResult>
async function lookupUser(ctx: any, userId: string): Promise<UserLookupResult>
```

**Integration Time**: 20 minutes
**Breaking Changes**: None

---

## What's ALREADY Complete (18 items)

### Backend ✅

- [x] passportShareConsents table (complete schema)
- [x] passportShareRequests table
- [x] passportShareAccessLogs table
- [x] passportShareNotifications table
- [x] parentNotificationPreferences table
- [x] Consent Gateway (validateShareAccess, getActiveConsentsForOrg, etc.)
- [x] All passport sharing mutations (create, update, revoke, accept, decline, etc.)
- [x] Request/approval workflow
- [x] Audit logging
- [x] Notification system
- [x] Multi-guardian notifications
- [x] Medical profiles schema update (playerIdentityId)

### Frontend ✅

- [x] Enable Sharing Wizard (all 5 steps complete)
- [x] Receiving organization selection
- [x] Source organization selection
- [x] Child Sharing Cards with all features
- [x] Pending Requests component
- [x] Access Audit Log component
- [x] Notification Preferences component
- [x] Quick Share component
- [x] Revoke Consent modal
- [x] Review & Success steps
- [x] Coach Shared Passports page (/coach/shared-passports)
- [x] Active/Pending/Browse tabs
- [x] Share Acceptance Modal
- [x] Request Access Modal
- [x] Shared Passport Viewing (/players/[id]/shared)
- [x] UX Mockups (Enhanced Profile Button Mockup 23)
- [x] Org-Role-Switcher enhancements
- [x] Smart Coach Dashboard

---

## Integration Options

### ⭐ Option 1: Minimal Integration (RECOMMENDED)

**Time**: 45 minutes
**Risk**: Very Low
**Files**: 2 files only

1. Add `userPreferences` table to `schema.ts`
2. Add `initiationType` + `sourceRequestId` to `passportShareConsents` in `schema.ts`
3. Add helper functions to `passportSharing.ts`

**Benefits**:
- Enables Enhanced User Menu feature
- Adds analytics tracking for consent patterns
- Improves code quality with helper functions
- Zero risk of breaking existing features

**Command**:
```bash
# Create feature branch
git checkout -b feature/integrate-stash6-enhancements

# Cherry-pick only the specific changes
# (Manual selective integration - see detailed guide below)
```

---

### Option 2: No Integration

**Time**: 0 minutes
**Risk**: None
**Tradeoff**: Miss out on analytics + Enhanced User Menu feature

All user-facing passport sharing features work perfectly without these enhancements.

---

### ❌ Option 3: Full Stash Integration (NOT RECOMMENDED)

**Time**: 4-6 hours
**Risk**: Medium (conflicts with recent changes)
**Reason to avoid**: 90% already in main, would create unnecessary merge conflicts

---

## Recommended Integration Steps

If you choose **Option 1** (Recommended):

### Step 1: Add userPreferences Table (15 min)

**File**: `packages/backend/convex/schema.ts`
**Action**: Add table after `userFlowProgress` (around line 1780)

```bash
# Extract just the userPreferences table from stash
git show stash@{6}:packages/backend/convex/schema.ts | sed -n '/userPreferences: defineTable/,/\.index("by_userId", \["userId"\])/p' > /tmp/userPreferences.txt

# Review the extracted table
cat /tmp/userPreferences.txt

# Manually add to schema.ts after line 1780
```

### Step 2: Add Consent Tracking Fields (10 min)

**File**: `packages/backend/convex/schema.ts`
**Action**: Add fields to `passportShareConsents` table (around line 2010)

```typescript
// Add after guardianIdentityId field:
// HOW sharing was initiated
initiationType: v.optional(
  v.union(
    v.literal("parent_initiated"), // Parent proactively shared via wizard
    v.literal("coach_requested") // Parent approved a coach access request
  )
),
sourceRequestId: v.optional(v.id("passportShareRequests")), // If coach_requested, link to original request
```

### Step 3: Add Helper Functions (20 min)

**File**: `packages/backend/convex/models/passportSharing.ts`
**Action**: Add helper functions after imports (around line 15)

```bash
# Extract helper functions from stash
git show stash@{6}:packages/backend/convex/models/passportSharing.ts | sed -n '/async function lookupOrganization/,/^}/p' > /tmp/helpers.txt

# Review and manually add to passportSharing.ts
```

### Step 4: Update Mutation Signature (5 min)

**File**: `packages/backend/convex/models/passportSharing.ts`
**Action**: Add optional args to `createPassportShareConsent` mutation

```typescript
// In mutation args:
initiationType: v.optional(
  v.union(v.literal("parent_initiated"), v.literal("coach_requested"))
),
sourceRequestId: v.optional(v.id("passportShareRequests")),

// In handler:
initiationType: args.initiationType || "parent_initiated",
sourceRequestId: args.sourceRequestId,
```

### Step 5: Test (10 min)

```bash
# TypeScript check
npm run check-types

# Convex codegen
npx -w packages/backend convex codegen

# Build
npm run build

# Manual testing:
# 1. Create a new consent → verify initiationType saved
# 2. Check schema in Convex dashboard
# 3. Verify no breaking changes to existing consents
```

### Step 6: Commit

```bash
git add packages/backend/convex/schema.ts
git add packages/backend/convex/models/passportSharing.ts
git commit -m "feat: Add consent tracking and user preferences (#271)

- Add userPreferences table for Enhanced User Menu feature
- Add initiationType and sourceRequestId tracking to consents
- Add Better Auth helper functions for org/user lookups
- Enable analytics for consent creation patterns

All fields are optional to maintain backward compatibility.

Related to #271, stash@{6} integration"

git push origin feature/integrate-stash6-enhancements
```

---

## Verification Checklist

After integration:

- [ ] `npm run check-types` passes
- [ ] `npx -w packages/backend convex codegen` succeeds
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Schema deploys to Convex without errors
- [ ] Existing passport sharing workflows still work
- [ ] New fields are optional (no breaking changes)
- [ ] userPreferences table exists in Convex dashboard

---

## Decision Required

**Which option do you choose?**

1. **Option 1** (Recommended): Minimal integration - 45 minutes, very low risk ⭐
2. **Option 2**: No integration - keep main as-is, all features work

Let me know and I'll help with the integration if you choose Option 1.
