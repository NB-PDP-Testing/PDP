# Better Auth Upgrade: PDP-Specific Migration Plan
**v1.3.34 → v1.4.5**

**Analysis Date:** 2026-01-14
**Codebase Analyzed:** PlayerARC/PDP @ main branch

---

## Executive Summary

After analyzing the PDP codebase, the upgrade from Better Auth v1.3.34 to v1.4.5 is **LOW RISK** with **MINIMAL CODE CHANGES** required.

### Key Findings from Codebase Analysis

✅ **GOOD NEWS:**
- No usage of `forgotPassword` found in codebase
- No usage of deprecated `advanced.generateId` config
- Hooks already use correct parameter destructuring
- No direct OIDC `redirectURLs` field usage (handled by Better Auth)
- Organization plugin extensively used but no breaking changes
- All code uses ESM already

⚠️ **MINOR VERIFICATION NEEDED:**
- Regenerate Better Auth schema to ensure OIDC field compatibility
- Test Microsoft OAuth flow after upgrade
- Verify hook signatures compatible with v1.4.0+ (looks good already)

---

## Actual Code Impact Analysis

### 1. Auth Configuration (`packages/backend/convex/auth.ts`)

**Status:** ✅ COMPATIBLE

**Current Implementation:**
```typescript
// Organization hooks already use correct signature
beforeAddMember: async ({ member, user, organization }) => {
  // Already destructuring from object - compatible with v1.4.0+
}

afterAddMember: async ({ member, user, organization }) => {
  // Already destructuring from object - compatible with v1.4.0+
}

afterAcceptInvitation: async ({ invitation, member, user, organization }) => {
  // Already destructuring from object - compatible with v1.4.0+
}
```

**Required Changes:** ✅ NONE - Already compatible

---

### 2. Password Reset Flow

**Status:** ✅ NOT IMPLEMENTED

**Search Results:**
```bash
grep -r "forgotPassword\|requestPasswordReset" apps/web/src
# No results found
```

**Required Changes:** ✅ NONE - Feature not yet implemented

**Future Note:** When implementing password reset, use `authClient.requestPasswordReset()` (not `forgotPassword`)

---

### 3. Microsoft OAuth (OIDC)

**Status:** ⚠️ VERIFY AFTER SCHEMA REGENERATION

**Current Configuration:**
```typescript
socialProviders: {
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID as string,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
    tenantId: "common",
    authority: "https://login.microsoftonline.com",
    prompt: "select_account",
  },
}
```

**Potential Impact:**
- Better Auth v1.4.0 renames OIDC schema field: `redirectURLs` → `redirectUrls`
- This is internal to Better Auth, but schema regeneration required
- Our code doesn't directly reference this field

**Required Actions:**
1. Regenerate schema: `npm run generate-better-auth-schema -w packages/backend`
2. Test Microsoft login flow thoroughly
3. Verify no schema errors on startup

---

### 4. Organization Schema Extensions

**Status:** ✅ FULLY COMPATIBLE

**Current Custom Fields:**
```typescript
schema: {
  organization: {
    additionalFields: {
      colors: { type: "string[]", input: true, required: false },
      socialFacebook: { type: "string", input: true, required: false },
      socialTwitter: { type: "string", input: true, required: false },
      socialInstagram: { type: "string", input: true, required: false },
      socialLinkedin: { type: "string", input: true, required: false },
      website: { type: "string", input: true, required: false },
    },
  },
  member: {
    additionalFields: {
      functionalRoles: { type: "string[]", input: true, required: false },
      activeFunctionalRole: { type: "string", input: true, required: false },
      pendingFunctionalRoleRequests: { type: "string", input: true, required: false },
    },
  },
}
```

**Impact:** ✅ NONE - No breaking changes to organization plugin schema extensions

**Note on v1.4.5 Prisma Issue:**
- v1.4.5 had a bug with `string[]` fields in **Prisma only**
- We use **Convex**, not Prisma
- Issue does not affect us

---

### 5. Advanced Configuration

**Status:** ✅ NO DEPRECATED CONFIG USED

**Search Results:**
```bash
grep -n "advanced\." packages/backend/convex/auth.ts
# No results found
```

**Current Status:**
- Not using `advanced.generateId` (deprecated)
- Not using `advanced.database.useNumberId` (deprecated)
- Using default Convex ID generation (string IDs)

**Required Changes:** ✅ NONE

---

## Migration Steps (Simplified for PDP)

### Step 1: Update Dependencies (5 minutes)

```bash
# Update Better Auth packages
npm install better-auth@1.4.5 -w apps/web
npm install better-auth@1.4.5 -w packages/backend

# Update Convex Better Auth integration
npm install @convex-dev/better-auth@latest -w apps/web
npm install @convex-dev/better-auth@latest -w packages/backend
```

### Step 2: Regenerate Schema (5 minutes)

```bash
# Regenerate Better Auth schema with new version
npm run generate-better-auth-schema -w packages/backend

# Check for any schema warnings
npx convex dev --until-success
```

### Step 3: Type Check (5 minutes)

```bash
# Verify no TypeScript errors
npm run check-types

# Fix any linting issues
npx ultracite fix
```

### Step 4: Test Authentication (30-60 minutes)

See detailed test plan below.

### Step 5: Deploy (30 minutes)

- Deploy to staging
- Run UAT tests
- Deploy to production

**Total Estimated Time:** 2-3 hours (mostly testing)

---

## Detailed Test Plan

### Critical Tests (Must Pass)

#### 1. Microsoft OAuth Flow
**Priority:** CRITICAL (OIDC schema change)

- [ ] Navigate to `/sign-in`
- [ ] Click "Sign in with Microsoft"
- [ ] Complete Microsoft authentication
- [ ] Verify successful redirect and session creation
- [ ] Check no console errors
- [ ] Verify user profile data loaded

**Why Critical:** OIDC schema field renamed in v1.4.0

---

#### 2. Google OAuth Flow
**Priority:** HIGH

- [ ] Navigate to `/sign-in`
- [ ] Click "Sign in with Google"
- [ ] Complete Google authentication
- [ ] Verify successful redirect and session creation
- [ ] Check no console errors

---

#### 3. Email/Password Authentication
**Priority:** HIGH

- [ ] Sign up with new email/password
- [ ] Verify account created
- [ ] Sign out
- [ ] Sign in with same credentials
- [ ] Verify successful login

---

#### 4. Organization Operations
**Priority:** CRITICAL (Most used feature)

**Create Organization:**
- [ ] Sign in as platform staff
- [ ] Create new organization
- [ ] Verify org created with custom fields (colors, social links, website)

**Organization Members:**
- [ ] Add member to organization
- [ ] Verify `beforeAddMember` hook executes (check logs)
- [ ] Verify `afterAddMember` hook executes (check logs)
- [ ] Verify functional roles assigned correctly (admin/owner → admin)
- [ ] Update member role
- [ ] Remove member

**Organization Invitations:**
- [ ] Invite member with email
- [ ] Accept invitation (different browser/incognito)
- [ ] Verify `afterAcceptInvitation` hook executes (check logs)
- [ ] Verify functional roles synced
- [ ] Cancel pending invitation

---

#### 5. Team Operations
**Priority:** HIGH

- [ ] Create team with custom fields (sport, ageGroup, gender, season)
- [ ] Verify team created successfully
- [ ] Update team
- [ ] List teams
- [ ] Delete team

---

#### 6. Session Management
**Priority:** MEDIUM

- [ ] Sign in on one device/browser
- [ ] Open second browser/device
- [ ] Sign in on second device
- [ ] Verify both sessions active
- [ ] Sign out on one device
- [ ] Verify other session still active

---

#### 7. Organization Context Switch
**Priority:** HIGH

- [ ] User with multiple orgs
- [ ] Switch active organization
- [ ] Verify `activeOrganizationId` updates in session
- [ ] Verify UI reflects new org context
- [ ] Verify org theming (colors) applies correctly

---

### Performance Tests (Optional but Recommended)

#### Consider Enabling Database Joins

**Before Enabling:**
1. Measure baseline performance on key endpoints:
   - Organization member list load time
   - Team list load time
   - Player dashboard load time
   - Coach dashboard multi-team view

**Enable Joins:**
```typescript
// Add to packages/backend/convex/auth.ts
export function createAuth(...) {
  return betterAuth({
    // ... existing config ...
    experimental: {
      joins: true
    }
  });
}
```

**After Enabling:**
2. Measure performance again
3. Compare before/after (expect 2-3x improvement)
4. Monitor error logs for any join-related issues

---

## Risk Assessment for PDP

### Very Low Risk Items ✅

1. **ESM Migration** - Already using ESM throughout
2. **Password Reset API** - Not yet implemented
3. **Advanced Config** - Not using deprecated options
4. **Organization Plugin** - No breaking changes
5. **Hook Signatures** - Already compatible
6. **Schema Extensions** - All compatible
7. **Prisma Issues** - Using Convex, not affected

### Low Risk Items ⚠️

1. **Microsoft OAuth** - Schema field renamed but Better Auth handles internally
   - **Mitigation:** Test thoroughly after schema regeneration

2. **Schema Regeneration** - Should be automatic and clean
   - **Mitigation:** Review generated schema for unexpected changes

### Medium Risk Items (None Identified)

No medium risk items for this upgrade.

### High Risk Items (None Identified)

No high risk items for this upgrade.

---

## New Features to Adopt

### Recommended: Database Joins

**Benefit:** 2-3x performance improvement on 50+ endpoints

**Implementation:**
```typescript
// packages/backend/convex/auth.ts
experimental: {
  joins: true
}
```

**Test Plan:**
1. Enable in development first
2. Measure performance improvements
3. Test all organization/team operations
4. Deploy to staging
5. Monitor for issues
6. Deploy to production if stable

---

### Consider: Custom OAuth State

**Use Case:** Pass organization context through OAuth flow

**Current Flow:**
1. User clicks "Sign in with Google"
2. Redirected to Google
3. Returns to app
4. Must select organization after login

**With Custom OAuth State:**
1. User clicks "Sign in with Google" from org-specific page
2. Pass `orgId` in OAuth state
3. Returns to app
4. Automatically set active organization

**Implementation:**
```typescript
// In sign-in page
authClient.signIn.social({
  provider: "google",
  additionalData: { orgId: currentOrgId }
})

// In callback handler
// Access orgId from OAuth state and auto-set active org
```

**Priority:** Medium - Nice to have but not critical

---

### Future: SCIM Provisioning

**Use Case:** Enterprise clients who want automated user provisioning

**When to Implement:**
- When targeting enterprise clients
- When clients request SSO + automated user management
- When scaling to larger organizations (100+ members)

**Priority:** Low - Future consideration

---

## Rollback Plan

If critical issues occur after upgrade:

### Quick Rollback (5 minutes)

```bash
# 1. Revert package.json
git checkout HEAD -- apps/web/package.json packages/backend/package.json

# 2. Reinstall previous versions
npm install

# 3. Regenerate schema with old version
npm run generate-better-auth-schema -w packages/backend

# 4. Verify Convex dev server starts
npx convex dev

# 5. Redeploy previous version
git push origin main
```

### Partial Rollback (Frontend Only)

If backend works but frontend has issues:

```bash
# Rollback frontend only
npm install better-auth@1.3.34 -w apps/web
npm install @convex-dev/better-auth@<previous-version> -w apps/web
```

---

## Monitoring Checklist

After deployment to production:

### Day 1 (First 24 Hours)

- [ ] Monitor error logs for auth-related errors
- [ ] Check sign-in success rate (should be 95%+)
- [ ] Monitor Microsoft OAuth specifically
- [ ] Check organization creation/operations
- [ ] Verify no cookie size errors (v1.4.4 adds chunking)
- [ ] Check session refresh operations

### Week 1

- [ ] Review user-reported issues
- [ ] Check performance metrics (if joins enabled)
- [ ] Monitor session expiration/refresh patterns
- [ ] Verify multi-device sessions working
- [ ] Check invitation flow completion rates

### Month 1

- [ ] Evaluate performance improvements
- [ ] Consider enabling additional features (joins, custom OAuth state)
- [ ] Update documentation with learnings
- [ ] Plan for future Better Auth updates

---

## Pre-Migration Checklist

Before starting the upgrade:

### Environment Preparation

- [ ] **Backup current production database** (Convex automatic, but verify)
- [ ] **Staging environment ready** for testing
- [ ] **UAT test suite ready** (we have comprehensive tests in `apps/web/uat/`)
- [ ] **Team notified** of upgrade window
- [ ] **Rollback plan reviewed** and tested

### Code Review

- [ ] **Git status clean** - no uncommitted changes
- [ ] **Latest from main** - pull recent changes
- [ ] **Dependencies up to date** - except Better Auth (about to upgrade)
- [ ] **Tests passing** - run UAT tests before upgrade

### Access Verification

- [ ] **Microsoft App credentials** available and valid
- [ ] **Google OAuth credentials** available and valid
- [ ] **Test accounts** ready for all providers
- [ ] **Platform staff account** ready for org operations
- [ ] **Multiple test orgs** available for testing

---

## Post-Migration Checklist

After successful upgrade:

### Documentation Updates

- [ ] Update `CLAUDE.md` with new Better Auth version
- [ ] Add completion date to this document
- [ ] Document any issues encountered
- [ ] Note performance improvements observed
- [ ] Update `docs/setup/microsoft-auth.md` if OIDC changes found

### Code Cleanup

- [ ] Remove any temporary debugging logs
- [ ] Commit updated `package.json` and `package-lock.json`
- [ ] Commit regenerated schema if changed
- [ ] Push to main branch
- [ ] Tag release (e.g., `v1.4.5-better-auth-upgrade`)

### Knowledge Transfer

- [ ] Document learnings for future upgrades
- [ ] Update upgrade procedures based on experience
- [ ] Share performance metrics if joins enabled
- [ ] Note any Breaking Auth changes for team

---

## Estimated Timeline

### Optimistic (Everything Goes Smoothly)

- **Preparation:** 30 minutes
- **Upgrade & Schema:** 15 minutes
- **Testing:** 1 hour
- **Deployment:** 30 minutes
- **Monitoring:** 30 minutes
- **Total:** ~2.5 hours

### Realistic (Minor Issues to Debug)

- **Preparation:** 30 minutes
- **Upgrade & Schema:** 15 minutes
- **Testing:** 2 hours (some debugging)
- **Deployment:** 45 minutes
- **Monitoring:** 1 hour
- **Total:** ~4.5 hours

### Pessimistic (Significant Issues)

- **Preparation:** 30 minutes
- **Upgrade & Schema:** 30 minutes
- **Testing & Debugging:** 4 hours
- **Deployment:** 1 hour
- **Rollback & Investigation:** 2 hours
- **Total:** ~8 hours

**Recommended Schedule:** Block 4 hours, expect to use 3

---

## Recommendation

### Should We Upgrade?

**YES - Upgrade to v1.4.5**

**Confidence Level:** HIGH (90%)

**Reasons:**

1. **Low Risk:** Codebase analysis shows excellent compatibility
2. **No Breaking Changes Impact Us:** All breaking changes are in features we don't use or are already compatible
3. **Security Improvements:** 250+ bug fixes including security enhancements
4. **Performance Gains:** Database joins could significantly improve dashboard performance
5. **Future-Proof:** Staying current makes future upgrades easier
6. **Clean Migration Path:** Clear, documented steps with low impact

**Timing Recommendation:**

- **Best Time:** During next sprint planning (low-traffic window)
- **Avoid:** During high-usage periods or right before major releases
- **Ideal:** Thursday morning (allows monitoring through Friday, minimal weekend impact)

---

## Migration Execution Plan

### Pre-Migration (Day Before)

1. **Communication:**
   - Notify team of upgrade schedule
   - Prepare rollback contacts (who to call if issues)
   - Set up monitoring dashboards

2. **Environment Verification:**
   - Verify staging environment matches production
   - Run full UAT test suite on current version (establish baseline)
   - Document current performance metrics

3. **Preparation:**
   - Review this migration plan
   - Prepare test accounts
   - Clear any pending deployments

### Migration Day

**Phase 1: Staging (Morning - 2 hours)**
1. Deploy to staging
2. Regenerate schema
3. Run full test suite
4. Verify Microsoft OAuth
5. Check organization operations
6. Get team sign-off

**Phase 2: Production (Afternoon - 2 hours)**
1. Deploy to production
2. Monitor error logs (first 15 minutes critical)
3. Run smoke tests
4. Verify key flows
5. Monitor for 1 hour

**Phase 3: Post-Deploy (Rest of Day)**
1. Continue monitoring
2. Respond to any user reports
3. Check performance metrics
4. Update documentation

### Post-Migration (Next 3 Days)

- Daily check of error logs
- Monitor auth success rates
- Review performance improvements
- Document learnings

---

## Success Criteria

The upgrade is successful when:

- [ ] All UAT tests pass
- [ ] Microsoft OAuth works without errors
- [ ] Google OAuth works without errors
- [ ] Email/password auth works
- [ ] Organization operations function correctly
- [ ] No increase in error rates
- [ ] No user-reported auth issues
- [ ] Performance same or better than before
- [ ] No cookie size errors
- [ ] Session management works correctly

---

## Contact & Support

### Internal

- **Primary:** Development team lead
- **Secondary:** DevOps/Infrastructure
- **Escalation:** CTO

### External

- **Better Auth GitHub:** https://github.com/better-auth/better-auth/issues
- **Better Auth Docs:** https://www.better-auth.com/docs
- **Convex Support:** https://discord.gg/convex (if Convex integration issues)

---

## Conclusion

This upgrade is **low-risk and highly recommended** for the PDP project. The codebase analysis shows excellent compatibility with Better Auth v1.4.5, and the upgrade path is straightforward with minimal code changes required.

**Key Points:**

1. ✅ No deprecated API usage found
2. ✅ Hook signatures already compatible
3. ✅ Organization plugin fully compatible
4. ✅ All schema extensions supported
5. ⚠️ Only verification needed is Microsoft OAuth after schema regeneration
6. 🚀 Significant performance improvements available with database joins

**Go/No-Go Decision: GO**

Proceed with upgrade at next available low-traffic window.

---

**Migration Status:** Not Started

**Planned Start Date:** _TBD_

**Completed Date:** _TBD_

**Completed By:** _TBD_

**Actual Issues Encountered:** _None yet_

**Actual Time Spent:** _TBD_

**Performance Impact:** _TBD_

**Recommendation for Future Upgrades:** _TBD_
