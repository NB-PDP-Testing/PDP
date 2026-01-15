# Better Auth Upgrade Analysis: v1.3.34 → v1.4.5

**Analysis Date:** 2026-01-14
**Current Version:** 1.3.34
**Target Version:** 1.4.5
**Project:** PlayerARC/PDP

---

## Executive Summary

This document provides a comprehensive analysis of Better Auth changes between versions 1.3.34 and 1.4.5, identifying breaking changes, new features, bug fixes, and migration requirements for the PlayerARC/PDP project.

### Key Findings

- **Major Version Jump:** v1.4.0 introduces significant breaking changes including ESM-only support
- **Critical Breaking Changes:** 7 major breaking changes requiring code updates
- **Organization Plugin:** No breaking changes to organization plugin API
- **Migration Complexity:** Medium - requires code updates and careful testing
- **Recommendation:** Upgrade in phases, testing thoroughly after v1.4.0 migration

---

## Version Timeline

| Version | Release Date | Type | Summary |
|---------|-------------|------|---------|
| v1.3.34 | Oct 29, 2024 | Current | Bug fix: Type annotation issue |
| v1.4.0 | Nov 8, 2024 | Major | ESM-only, stateless sessions, 250+ bug fixes |
| v1.4.1 | Nov 22, 2024 | Minor | API-key secondary storage, passkey fixes |
| v1.4.2 | Nov 25, 2024 | Minor | GitHub PKCE, CLI improvements |
| v1.4.3 | Nov 27, 2024 | Minor | Vercel OAuth, proxy header support |
| v1.4.4 | Nov 30, 2024 | Minor | SCIM, cookie chunking, rate limit fixes |
| v1.4.5 | Dec 3, 2024 | Patch | Prisma array field fix (breaking change) |

---

## Breaking Changes

### 1. ESM-Only Architecture (v1.4.0) ⚠️ CRITICAL

**Impact:** HIGH
**Status:** ⚠️ REQUIRES ATTENTION

Better Auth is now 100% ESM. CommonJS is no longer supported.

**Our Project Impact:**
- Next.js App Router already uses ESM - ✅ No impact
- Convex backend uses ESM - ✅ No impact
- All imports use ES modules - ✅ No impact

**Migration Required:** None for our project

---

### 2. Auth Flow API Changes (v1.4.0) ⚠️ CRITICAL

**Impact:** HIGH
**Status:** ⚠️ REQUIRES CODE UPDATES

**Changes:**

#### Forgot Password Rename
```typescript
// OLD (v1.3.34)
authClient.forgotPassword({ email })

// NEW (v1.4.0+)
authClient.requestPasswordReset({ email })
```

**Our Project Impact:**
- Need to search for `forgotPassword` usage across codebase
- Update all client-side auth calls
- Test password reset flow end-to-end

**Action Required:**
```bash
# Search for usage
grep -r "forgotPassword" apps/web/src
```

---

#### Account Info Endpoint Change
```typescript
// OLD (v1.3.34) - POST with body
POST /account-info
{ userId: "123" }

// NEW (v1.4.0+) - GET with query params
GET /account-info?userId=123
```

**Our Project Impact:**
- If using `auth.api.getAccountInfo()` directly - need to verify
- Better Auth client SDK should handle this automatically
- Custom API calls need to be updated

---

#### Change Email Flow
```typescript
// OLD (v1.3.34)
auth.changeEmail({
  sendChangeEmailVerification: true
})

// NEW (v1.4.0+)
// Use emailVerification.sendVerificationEmail instead
```

**Our Project Impact:**
- LOW - We don't currently implement email change functionality
- Document for future implementation

---

### 3. Configuration Changes (v1.4.0) ⚠️ MEDIUM

**Impact:** MEDIUM
**Status:** ⚠️ VERIFY CONFIGURATION

#### Database generateId
```typescript
// OLD (v1.3.34) - REMOVED
advanced: {
  generateId: () => customId()
}

// NEW (v1.4.0+)
advanced: {
  database: {
    generateId: () => customId()
  }
}
```

**Our Project Impact:**
- Need to check `packages/backend/convex/betterAuth/auth.ts`
- Verify we're not using deprecated config

---

#### Number ID Configuration
```typescript
// OLD (v1.3.34)
advanced: {
  database: {
    useNumberId: true
  }
}

// NEW (v1.4.0+)
advanced: {
  database: {
    generateId: "serial"
  }
}
```

**Our Project Impact:**
- We use string IDs (Convex default) - ✅ No impact

---

### 4. Plugin Changes (v1.4.0) ⚠️ HIGH

**Impact:** HIGH
**Status:** ⚠️ REQUIRES VERIFICATION

#### OIDC Plugin - Schema Migration Required
```typescript
// OLD (v1.3.34)
redirectURLs: string[]  // Field name

// NEW (v1.4.0+)
redirectUrls: string[]  // Field name changed
```

**Our Project Impact:**
- We use Microsoft Azure Entra ID (OIDC)
- **CRITICAL:** Database migration required
- Need to verify schema in `packages/backend/convex/betterAuth/generatedSchema.ts`

**Action Required:**
1. Check current schema field name
2. Run Better Auth CLI schema generation
3. Verify Microsoft auth still works
4. Test login flow

---

#### Callback Function Signature
```typescript
// OLD (v1.3.34)
hooks: {
  onSignIn: async (request, user) => {
    // request parameter
  }
}

// NEW (v1.4.0+)
hooks: {
  onSignIn: async (ctx, user) => {
    // ctx.request instead
    const request = ctx.request
  }
}
```

**Our Project Impact:**
- Check all hooks in `packages/backend/convex/betterAuth/auth.ts`
- Organization plugin hooks
- Custom auth hooks

**Action Required:**
```bash
# Search for hook usage
grep -r "onSignIn\|onCreate\|onUpdate" packages/backend/convex/betterAuth/
```

---

#### TanStack Start Plugin Rename
```typescript
// OLD (v1.3.34)
import { reactStartCookies } from "better-auth/plugins"

// NEW (v1.4.0+)
import { tanstackStartCookies } from "better-auth/plugins"
```

**Our Project Impact:**
- ✅ We use Next.js, not TanStack Start - No impact

---

### 5. API Key Plugin (v1.4.0) ⚠️ LOW

**Impact:** LOW
**Status:** ✅ NO IMPACT

Mock-sessions by api-keys are now disabled by default.

**Our Project Impact:**
- ✅ We don't use API Key plugin - No impact

---

### 6. User-Agent Header Issue (v1.4.0 - Fixed in v1.4.0 patch) ⚠️ LOW

**Impact:** LOW (already fixed)
**Status:** ✅ RESOLVED

v1.4.0 initially added automatic `User-Agent: better-auth` header causing Safari CORS issues.

**Resolution:** Fixed in v1.4.0 patch (PR #6417) - user-agent header no longer added by default

**Our Project Impact:**
- ✅ Already fixed in later v1.4.0 release - No action required

---

### 7. Prisma Array Field Serialization (v1.4.5) ⚠️ CRITICAL FOR PRISMA

**Impact:** CRITICAL for Prisma users
**Status:** ✅ NO IMPACT (We use Convex)

v1.4.5 introduced a bug with `string[]` additional fields in Prisma schemas.

**Our Project Impact:**
- ✅ We use Convex, not Prisma - No impact
- Fixed in v1.4.5 patch (PR #6601)

---

## New Features

### v1.4.0 Major Features

#### 1. Stateless Authentication
- Session management without database
- Useful for serverless/edge deployments
- **Our Use:** Not needed (we use database sessions)

#### 2. SCIM Provisioning (v1.4.0 & v1.4.4)
- Standardized identity management protocol
- Multi-domain user provisioning
- **Our Use:** Future consideration for enterprise clients

#### 3. Database Joins (Experimental)
```typescript
experimental: {
  joins: true
}
```
- 2-3x latency reduction on 50+ endpoints
- **Our Use:** HIGHLY RECOMMENDED - Could improve performance
- **Action:** Test enabling in dev environment

#### 4. Cookie Chunking (v1.4.4)
- Handles account data exceeding cookie size limits
- Automatic cookie splitting
- **Our Use:** Beneficial for org theming data

#### 5. JWE Cookie Cache
- Enhanced security for cookie storage
- Enabled by default
- **Our Use:** Automatic security improvement

#### 6. Device Authorization (OAuth 2.0 RFC 8628)
- Device flow for limited input devices
- **Our Use:** Future mobile app consideration

#### 7. JWT Key Rotation
- Enhanced security for token management
- **Our Use:** Future enterprise feature

#### 8. SSO Domain Verification
- Automatic domain ownership validation
- **Our Use:** Useful when adding new SSO providers

#### 9. Custom OAuth State
```typescript
authClient.signIn.social({
  provider: "google",
  additionalData: { orgId: "123" }
})
```
- Pass data through OAuth flows
- **Our Use:** Could simplify org-scoped OAuth

#### 10. Bundle Size Optimization
```typescript
import { betterAuth } from "better-auth/minimal"
```
- Smaller bundle for client-side
- **Our Use:** Consider for frontend optimization

### v1.4.1 Features

#### API-Key Secondary Storage
- Faster key lookups with secondary storage
- **Our Use:** Not using API keys currently

### v1.4.2 Features

#### GitHub PKCE Support
- Enhanced OAuth security for GitHub
- **Our Use:** We use Google/Microsoft - indirect benefit

#### Custom JWKS Endpoint
```typescript
jwt: {
  allowCustomJwksEndpoint: true
}
```
- Greater flexibility in token validation
- **Our Use:** Future enterprise feature

### v1.4.3 Features

#### Vercel OAuth Provider
- New built-in OAuth provider
- **Our Use:** Not needed currently

#### Proxy Header Support
- Better handling of reverse proxy deployments
- **Our Use:** Useful for Vercel deployment

---

## Bug Fixes Summary

### v1.4.0 (250+ bug fixes)
- Constant-time comparison for OTP validation (security)
- User enumeration prevention in email OTP (security)
- Enhanced CSRF protection with state validation (security)
- Cookie size limit handling improved
- Session refresh synchronization issues resolved
- Email verification callback encoding corrected
- Account deletion triggers database hooks
- Fixed nullable foreign key handling
- MongoDB ObjectId vs string ID resolution

### v1.4.1
- Custom function field defaults properly evaluated
- JWT key retrieval fixed
- Passkey authentication endpoint changed (POST → GET)

### v1.4.2
- SignIn/signUp API returns additional user fields
- CLI Kysely migration chaining issues fixed
- Duplicate index creation prevented in Prisma
- Client duplicate get-session triggers eliminated
- Email-OTP sign-in with capitalized emails fixed
- OIDC Provider session requirement removed
- Organization deleteOrganization uses adapter.deleteMany

### v1.4.3
- TanStack/SolidStart plugin compatibility fixed
- OpenAPI schema null type correction
- Two-factor authentication blocking logic removed

### v1.4.4
- Rate limit optional field customization
- Cookie chunking for oversized account data
- User-agent application removed from default
- Session creation default values applied
- Early null return for undefined user ID
- Logger priority levels corrected
- MCP authorization server origin URLs fixed
- Multi-session invalid signature handling
- OIDC provider getSignedCookie return type fixed

---

## Organization Plugin Analysis

### Schema Changes
✅ **NO BREAKING CHANGES** to organization plugin schema or API

### API Stability
All organization plugin methods remain stable:
- `authClient.organization.create()`
- `authClient.organization.list()`
- `authClient.organization.update()`
- `authClient.organization.delete()`
- `authClient.organization.setActive()`
- `authClient.organization.addMember()`
- `authClient.organization.removeMember()`
- `authClient.organization.updateMemberRole()`
- `authClient.organization.inviteMember()`
- `authClient.organization.acceptInvitation()`
- All other organization methods

### Relevant Improvements
- `deleteOrganization` now uses `adapter.deleteMany` (v1.4.2) - More efficient
- Organization slug support for member listing (v1.4.0)
- Better error handling for organization operations

### Our Extensions
Our custom schema extensions remain compatible:
```typescript
// In convex/betterAuth/auth.ts
schema: {
  organization: {
    fields: {
      colors: z.array(z.string()).optional(),
      socialLinks: /* ... */,
      website: z.string().optional()
    }
  },
  member: {
    fields: {
      functionalRoles: z.array(z.string()).optional(),
      activeFunctionalRole: z.string().optional()
    }
  },
  team: {
    fields: {
      sport: z.string(),
      ageGroup: z.string(),
      gender: z.string().optional(),
      season: z.string().optional(),
      trainingSchedule: z.array(z.any()).optional(),
      homeVenue: z.string().optional()
    }
  }
}
```

**Action Required:** None - all extensions compatible

---

## Migration Checklist

### Phase 1: Pre-Migration Analysis ✅

- [x] Review all breaking changes
- [x] Identify affected code areas
- [x] Check organization plugin compatibility
- [x] Review new features for adoption
- [ ] **Search codebase for deprecated API usage**
- [ ] **Review auth configuration file**
- [ ] **Check all auth hooks for old signature**

### Phase 2: Code Updates Required ⚠️

#### High Priority
- [ ] Search and replace `forgotPassword` → `requestPasswordReset`
- [ ] Verify OIDC `redirectURLs` → `redirectUrls` in schema
- [ ] Check all auth hooks use `ctx` instead of `request` parameter
- [ ] Review `advanced.generateId` configuration
- [ ] Test Microsoft Azure Entra ID login flow

#### Medium Priority
- [ ] Review custom auth API calls using `account-info` endpoint
- [ ] Check if using any deprecated configuration options
- [ ] Verify email change flow (if implemented)

#### Low Priority
- [ ] Document change-email flow for future implementation
- [ ] Consider enabling experimental database joins
- [ ] Consider using custom OAuth state for org-scoped flows

### Phase 3: Schema & Database ⚠️

- [ ] Run Better Auth CLI schema generation
  ```bash
  npm run generate-better-auth-schema -w packages/backend
  ```
- [ ] Review generated schema for OIDC field name changes
- [ ] Verify all custom schema extensions still work
- [ ] Check for any schema migration warnings

### Phase 4: Testing 🧪

#### Authentication Flows
- [ ] Email/password sign-in
- [ ] Email/password sign-up
- [ ] Google OAuth
- [ ] Microsoft Azure Entra ID (OIDC)
- [ ] Password reset flow
- [ ] Email verification

#### Organization Features
- [ ] Create organization
- [ ] List organizations
- [ ] Update organization (including custom fields: colors, social links)
- [ ] Delete organization
- [ ] Set active organization
- [ ] Add member to organization
- [ ] Remove member from organization
- [ ] Update member role
- [ ] Invite member
- [ ] Accept invitation
- [ ] Reject invitation
- [ ] List organization members

#### Team Features
- [ ] Create team
- [ ] List teams
- [ ] Update team (including custom fields: sport, ageGroup, etc.)
- [ ] Delete team
- [ ] Team member assignments

#### Session Management
- [ ] Session refresh
- [ ] Multi-device sessions
- [ ] Session expiration
- [ ] Active organization persistence

#### Edge Cases
- [ ] Capitalized email addresses (fixed in v1.4.2)
- [ ] Cookie size limits (improved in v1.4.4)
- [ ] Concurrent session operations

### Phase 5: Performance Testing 🚀

- [ ] Consider enabling experimental database joins
  ```typescript
  experimental: {
    joins: true
  }
  ```
- [ ] Measure query performance before/after
- [ ] Test with realistic data volumes
- [ ] Monitor Convex function execution times

### Phase 6: Deployment 🚢

- [ ] Update package.json versions
  ```bash
  npm install better-auth@1.4.5 -w apps/web
  npm install better-auth@1.4.5 -w packages/backend
  ```
- [ ] Run linting and type checking
  ```bash
  npm run check-types
  npm run check
  ```
- [ ] Deploy to staging environment
- [ ] Run full UAT test suite
- [ ] Monitor error logs
- [ ] Deploy to production
- [ ] Monitor authentication metrics

---

## Risk Assessment

### High Risk Areas

1. **OIDC Schema Migration** ⚠️
   - Field name change requires verification
   - Microsoft auth could break if not handled
   - **Mitigation:** Test thoroughly in dev before production

2. **Hook Signature Changes** ⚠️
   - All hooks need `ctx` instead of `request`
   - Could cause runtime errors if missed
   - **Mitigation:** Comprehensive code search

3. **Password Reset Flow** ⚠️
   - Method rename could break existing functionality
   - **Mitigation:** Search and replace all occurrences

### Medium Risk Areas

1. **Account Info API Changes**
   - GET instead of POST could affect custom integrations
   - **Mitigation:** Better Auth SDK should handle automatically

2. **Configuration Changes**
   - Deprecated options could cause startup errors
   - **Mitigation:** Review auth config file carefully

### Low Risk Areas

1. **Organization Plugin** ✅
   - No breaking changes to org plugin
   - All existing code should work as-is

2. **ESM Migration** ✅
   - Already using ESM throughout
   - No changes needed

3. **Prisma Issues** ✅
   - Using Convex, not Prisma
   - Not affected

---

## Performance Improvements

### Expected Benefits

1. **Database Joins (Experimental)**
   - 2-3x latency reduction on 50+ endpoints
   - Could significantly improve dashboard load times
   - **Recommendation:** Test in development first

2. **Cookie Chunking**
   - Prevents cookie size errors
   - Better handling of org theming data
   - **Benefit:** Automatic, no changes needed

3. **JWE Cookie Cache**
   - Enhanced security
   - Better session performance
   - **Benefit:** Enabled by default

4. **250+ Bug Fixes**
   - General stability improvements
   - Better error handling
   - Fewer edge case issues

---

## Recommended Upgrade Path

### Option 1: Direct Upgrade (Recommended)
1. Upgrade directly to v1.4.5
2. Make all necessary code changes
3. Test thoroughly
4. Deploy

**Pros:**
- Single migration effort
- Get all improvements at once
- Less deployment risk

**Cons:**
- More changes at once
- Longer testing phase

### Option 2: Staged Upgrade
1. Upgrade to v1.4.0 first
2. Test and fix breaking changes
3. Upgrade to v1.4.5
4. Test again

**Pros:**
- Smaller change batches
- Easier to isolate issues

**Cons:**
- Two migration efforts
- More deployment cycles

**Recommendation:** Option 1 (Direct Upgrade)
- Breaking changes are well-documented
- Most changes are in v1.4.0
- v1.4.1-v1.4.5 are mostly bug fixes
- Single migration is more efficient

---

## Specific Actions for PDP Codebase

### Files to Review

1. **Auth Configuration**
   ```
   packages/backend/convex/betterAuth/auth.ts
   ```
   - [ ] Check for deprecated config options
   - [ ] Verify hook signatures use `ctx`
   - [ ] Review OIDC configuration

2. **Generated Schema**
   ```
   packages/backend/convex/betterAuth/generatedSchema.ts
   ```
   - [ ] Regenerate with new CLI
   - [ ] Verify OIDC field names
   - [ ] Check custom extensions

3. **Auth Client Usage**
   ```
   apps/web/src/lib/auth-client.ts
   apps/web/src/app/**/page.tsx
   apps/web/src/components/**/*.tsx
   ```
   - [ ] Search for `forgotPassword`
   - [ ] Search for custom `account-info` calls
   - [ ] Verify organization API usage

4. **Authentication Pages**
   ```
   apps/web/src/app/(auth)/**/page.tsx
   ```
   - [ ] Test all auth flows
   - [ ] Verify error handling
   - [ ] Check redirect logic

### Commands to Run

```bash
# 1. Search for deprecated API usage
grep -r "forgotPassword" apps/web/src
grep -r "advanced.generateId" packages/backend/convex/betterAuth/
grep -r "useNumberId" packages/backend/convex/betterAuth/
grep -r "redirectURLs" packages/backend/convex/betterAuth/

# 2. Check hook signatures
grep -r "onSignIn\|onCreate\|onUpdate\|before\|after" packages/backend/convex/betterAuth/auth.ts

# 3. Regenerate schema
npm run generate-better-auth-schema -w packages/backend

# 4. Update packages
npm install better-auth@1.4.5 -w apps/web
npm install better-auth@1.4.5 -w packages/backend
npm install @convex-dev/better-auth@latest -w apps/web
npm install @convex-dev/better-auth@latest -w packages/backend

# 5. Type check
npm run check-types

# 6. Run tests
npm run test -w apps/web
```

---

## New Features to Consider Adopting

### High Priority

1. **Database Joins (Experimental)** 🚀
   - Could significantly improve performance
   - 2-3x faster on many endpoints
   - Test in development first

   ```typescript
   // Add to auth.ts
   experimental: {
     joins: true
   }
   ```

### Medium Priority

2. **Custom OAuth State**
   - Could simplify org-scoped OAuth flows
   - Pass orgId through OAuth redirect

   ```typescript
   authClient.signIn.social({
     provider: "google",
     additionalData: { orgId: currentOrgId }
   })
   ```

3. **Bundle Size Optimization**
   - Reduce client bundle size

   ```typescript
   // In apps/web/src/lib/auth-client.ts
   import { createAuthClient } from "better-auth/minimal"
   ```

### Future Consideration

4. **SCIM Provisioning**
   - For enterprise clients
   - Standardized user provisioning

5. **Device Authorization**
   - For future mobile app
   - Limited input device support

6. **JWT Key Rotation**
   - Enhanced security
   - Enterprise feature

---

## Documentation Updates Needed

After migration, update these docs:

1. **`docs/setup/microsoft-auth.md`**
   - Note OIDC `redirectUrls` field name
   - Update any schema examples

2. **`CLAUDE.md`**
   - Update Better Auth version reference
   - Note new features available
   - Update auth patterns if needed

3. **`docs/architecture/system-overview.md`**
   - Update auth version
   - Note new features adopted

4. **This document**
   - Add migration completion date
   - Note any issues encountered
   - Document actual vs expected impact

---

## Support Resources

### Official Documentation
- [Better Auth v1.4 Release Blog](https://www.better-auth.com/blog/1-4)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Organization Plugin Docs](https://www.better-auth.com/docs/plugins/organization)
- [GitHub Releases](https://github.com/better-auth/better-auth/releases)

### Known Issues
- [v1.4.0 User-Agent CORS Issue #6358](https://github.com/better-auth/better-auth/issues/6358) - Fixed
- [v1.4.5 Prisma Array Breaking Change #6552](https://github.com/better-auth/better-auth/issues/6552) - Fixed
- [v1.4.x Iteration Plan #4758](https://github.com/better-auth/better-auth/issues/4758) - Roadmap

### Getting Help
- GitHub Discussions: https://github.com/better-auth/better-auth/discussions
- Discord: https://discord.gg/better-auth (check official docs for link)

---

## Conclusion

### Summary

The upgrade from Better Auth v1.3.34 to v1.4.5 introduces several breaking changes but offers significant improvements in performance, security, and functionality. The migration is **medium complexity** with most changes concentrated in v1.4.0.

### Key Takeaways

1. **Organization Plugin** - ✅ No breaking changes, all existing code compatible
2. **ESM Migration** - ✅ No impact, already using ESM
3. **Auth Flow Changes** - ⚠️ Requires code updates for password reset
4. **OIDC Schema** - ⚠️ Requires verification for Microsoft auth
5. **Hook Signatures** - ⚠️ Need to check all hooks for `ctx` vs `request`
6. **Performance** - 🚀 Significant improvements available (database joins)

### Recommendation

**Proceed with upgrade using direct path to v1.4.5**

**Estimated Effort:** 4-8 hours
- 1-2 hours: Code updates
- 1-2 hours: Schema verification
- 2-4 hours: Testing all auth flows
- 1 hour: Deployment and monitoring

**Risk Level:** Medium
- High-risk items identified and mitigated
- Most changes are well-documented
- Better Auth SDK handles many changes automatically
- Organization plugin (our most complex feature) is fully compatible

---

## Migration Status

- [ ] Migration started
- [ ] Code updates completed
- [ ] Schema regenerated and verified
- [ ] Testing completed
- [ ] Deployed to staging
- [ ] Deployed to production
- [ ] Documentation updated

**Migration Date:** _Not yet started_
**Completed By:** _N/A_
**Issues Encountered:** _None yet_
**Actual vs Expected:** _TBD_

---

## Appendix: Version Comparison

### v1.3.34 (Current)
- Stable version from October 2024
- No known critical issues
- All features working as expected
- Good starting point for migration

### v1.4.5 (Target)
- Latest stable version
- 250+ bug fixes since v1.3.34
- Significant performance improvements
- Enhanced security features
- Better error handling
- More stable OAuth flows
- Improved session management

### Benefits of Upgrading
1. **Security:** Constant-time OTP, better CSRF protection, JWE cookies
2. **Performance:** Database joins, better session handling, lazy loading
3. **Stability:** 250+ bug fixes, better error handling
4. **Features:** SCIM, device auth, JWT rotation, proxy support
5. **Developer Experience:** Better CLI, improved error messages
6. **Future-Proof:** Active development, ongoing improvements

### Cost of Not Upgrading
1. Missing security improvements
2. No access to performance optimizations
3. Potential issues with future dependencies
4. Missing bug fixes that could affect stability
5. Harder to upgrade later (more versions to jump)

**Recommendation:** Upgrade as soon as feasible, preferably within next sprint.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-14
**Next Review:** After migration completion
