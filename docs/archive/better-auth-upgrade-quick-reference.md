# Better Auth Upgrade Quick Reference
**v1.3.34 → v1.4.5**

## TL;DR

**Status:** Safe to upgrade with code changes required
**Effort:** 4-8 hours
**Risk:** Medium
**Org Plugin:** ✅ No breaking changes

---

## Breaking Changes Checklist

### 1. Forgot Password API ⚠️ REQUIRED
```typescript
// SEARCH AND REPLACE
authClient.forgotPassword       → authClient.requestPasswordReset
```

### 2. OIDC Schema Field ⚠️ REQUIRED
```typescript
// Check schema - field renamed
redirectURLs  → redirectUrls
```

### 3. Hook Signatures ⚠️ REQUIRED
```typescript
// OLD
hooks: {
  onSignIn: async (request, user) => { }
}

// NEW
hooks: {
  onSignIn: async (ctx, user) => {
    const request = ctx.request
  }
}
```

### 4. Account Info Endpoint
```typescript
// Changed from POST to GET
// Better Auth SDK handles automatically
// Only affects direct API calls
```

---

## Quick Migration Steps

### Step 1: Search Codebase (5 min)
```bash
# Find deprecated usage
grep -r "forgotPassword" apps/web/src
grep -r "advanced.generateId" packages/backend/convex/betterAuth/
grep -r "redirectURLs" packages/backend/convex/betterAuth/
grep -r "onSignIn\|onCreate\|onUpdate" packages/backend/convex/betterAuth/auth.ts
```

### Step 2: Update Code (30-60 min)
- Replace `forgotPassword` with `requestPasswordReset`
- Update hook signatures from `(request, user)` to `(ctx, user)`
- Remove any deprecated config options

### Step 3: Regenerate Schema (5 min)
```bash
npm run generate-better-auth-schema -w packages/backend
```

### Step 4: Update Dependencies (5 min)
```bash
npm install better-auth@1.4.5 -w apps/web
npm install better-auth@1.4.5 -w packages/backend
npm install @convex-dev/better-auth@latest -w apps/web
npm install @convex-dev/better-auth@latest -w packages/backend
```

### Step 5: Type Check (5 min)
```bash
npm run check-types
npx ultracite fix
```

### Step 6: Test Auth Flows (2-3 hours)
- [ ] Email/password sign in/up
- [ ] Google OAuth
- [ ] Microsoft OAuth (CRITICAL - OIDC field change)
- [ ] Password reset
- [ ] Organization features
- [ ] Team features

### Step 7: Deploy (30 min)
- Deploy to staging
- Run UAT tests
- Monitor for errors
- Deploy to production

---

## Files to Review

### Critical
```
packages/backend/convex/betterAuth/auth.ts          # Config & hooks
packages/backend/convex/betterAuth/generatedSchema.ts  # OIDC field
```

### Review
```
apps/web/src/lib/auth-client.ts                     # Client usage
apps/web/src/app/(auth)/**/page.tsx                 # Auth pages
```

---

## New Features to Consider

### High Priority
**Database Joins** - 2-3x performance improvement
```typescript
experimental: { joins: true }
```

### Medium Priority
**Custom OAuth State** - Pass data through OAuth
```typescript
authClient.signIn.social({
  provider: "google",
  additionalData: { orgId }
})
```

**Bundle Optimization** - Smaller client bundle
```typescript
import { createAuthClient } from "better-auth/minimal"
```

---

## Testing Priority

### Critical (Must Test)
1. Microsoft Azure Entra ID login (OIDC schema change)
2. Password reset flow (API rename)
3. Organization operations (most used feature)

### High Priority
4. Google OAuth
5. Email/password auth
6. Session management
7. Team operations

### Medium Priority
8. Multi-device sessions
9. Organization invitations
10. Member management

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OIDC breaks | Test Microsoft auth thoroughly in dev |
| Hook errors | Search all hooks, test in dev first |
| Password reset breaks | Search codebase, update all occurrences |
| Cookie size issues | v1.4.4 adds automatic chunking |
| Performance regression | Monitor after deployment |

---

## Rollback Plan

If issues occur:
1. Revert package.json changes
2. Run `npm install`
3. Redeploy previous version
4. Investigate in development

---

## Support

- Full analysis: `docs/archive/better-auth-upgrade-analysis-1.3.34-to-1.4.5.md`
- Official docs: https://www.better-auth.com/blog/1-4
- GitHub issues: https://github.com/better-auth/better-auth/issues

---

## What's Safe

✅ Organization plugin - no breaking changes
✅ ESM support - already using ESM
✅ Schema extensions - all compatible
✅ Most API methods - SDK handles changes
✅ Cookie handling - improved automatically
✅ Security - enhanced by default

---

## What Needs Attention

⚠️ Password reset method name
⚠️ OIDC redirectURLs field name
⚠️ Hook function signatures
⚠️ Any custom auth API calls
⚠️ Configuration options review

---

**Ready to upgrade?** Start with Step 1 search, then review full analysis document.
