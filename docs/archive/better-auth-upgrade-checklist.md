# Better Auth Upgrade Execution Checklist
**v1.3.34 → v1.4.5**

**Date Started:** _____________
**Executed By:** _____________
**Estimated Time:** 2-4 hours

---

## Pre-Migration Checklist

### Environment Preparation

- [ ] Backup verification - Confirm Convex backups are current
- [ ] Staging environment ready and accessible
- [ ] UAT test suite verified working on current version
- [ ] Team notified of upgrade schedule
- [ ] Rollback plan reviewed and understood
- [ ] Monitoring dashboards prepared (error logs, auth metrics)

### Code Status

- [ ] Git status clean - no uncommitted changes
- [ ] Latest code from main branch pulled
- [ ] Current dependencies installed and working
- [ ] UAT tests passing on current version (baseline)

### Access & Credentials

- [ ] Microsoft App credentials verified and available
- [ ] Google OAuth credentials verified and available
- [ ] Test accounts ready for all auth providers
  - [ ] Microsoft test account
  - [ ] Google test account
  - [ ] Email/password test account
- [ ] Platform staff test account ready
- [ ] Multiple test organizations available

---

## Migration Execution

### Phase 1: Update Dependencies (10 minutes)

**Start Time:** _____________

#### Update Packages

- [ ] Update Better Auth in web app
  ```bash
  npm install better-auth@1.4.5 -w apps/web
  ```

- [ ] Update Better Auth in backend
  ```bash
  npm install better-auth@1.4.5 -w packages/backend
  ```

- [ ] Update Convex Better Auth integration (web)
  ```bash
  npm install @convex-dev/better-auth@latest -w apps/web
  ```

- [ ] Update Convex Better Auth integration (backend)
  ```bash
  npm install @convex-dev/better-auth@latest -w packages/backend
  ```

- [ ] Verify installations completed without errors

**Phase 1 Complete Time:** _____________

---

### Phase 2: Schema & Type Check (10 minutes)

**Start Time:** _____________

#### Regenerate Schema

- [ ] Run schema generation
  ```bash
  npm run generate-better-auth-schema -w packages/backend
  ```

- [ ] Review generated schema file
  ```
  packages/backend/convex/betterAuth/generatedSchema.ts
  ```

- [ ] Check for any warning messages

- [ ] Verify no unexpected schema changes

#### Type Checking

- [ ] Run TypeScript type check
  ```bash
  npm run check-types
  ```

- [ ] Fix any type errors (if any)

- [ ] Run linting and formatting
  ```bash
  npx ultracite fix
  ```

- [ ] Verify no errors or warnings

**Phase 2 Complete Time:** _____________

---

### Phase 3: Local Testing (30-60 minutes)

**Start Time:** _____________

#### Start Dev Environment

- [ ] Start Convex dev server
  ```bash
  npx convex dev
  ```

- [ ] Verify Convex started without errors

- [ ] Start Next.js dev server (if not already running)
  ```bash
  npm run dev -w apps/web
  ```

- [ ] Verify Next.js started without errors

- [ ] Check browser console for startup errors

#### Critical Auth Tests

**Microsoft OAuth (CRITICAL)** 🔴
- [ ] Navigate to `/sign-in`
- [ ] Click "Sign in with Microsoft"
- [ ] Complete Microsoft authentication
- [ ] Verify successful redirect
- [ ] Verify session created
- [ ] Verify user profile loaded
- [ ] Check console for errors
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Google OAuth (HIGH)** 🟡
- [ ] Navigate to `/sign-in`
- [ ] Click "Sign in with Google"
- [ ] Complete Google authentication
- [ ] Verify successful redirect
- [ ] Verify session created
- [ ] Check console for errors
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Email/Password Auth (HIGH)** 🟡
- [ ] Sign up with new email/password
- [ ] Verify account created
- [ ] Sign out
- [ ] Sign in with same credentials
- [ ] Verify successful login
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

#### Organization Tests (CRITICAL)

**Create Organization** 🔴
- [ ] Sign in as platform staff
- [ ] Create new test organization
- [ ] Verify org created
- [ ] Verify custom fields (colors, social links, website)
- [ ] Check console logs for hook execution
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Add Member** 🔴
- [ ] Add member to organization
- [ ] Verify `beforeAddMember` hook logged
- [ ] Verify `afterAddMember` hook logged
- [ ] Verify functional roles assigned (admin/owner → admin)
- [ ] Check member appears in list
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Update Member Role** 🟡
- [ ] Update member role (e.g., member → admin)
- [ ] Verify role updated in database
- [ ] Verify functional roles updated
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Remove Member** 🟡
- [ ] Remove member from organization
- [ ] Verify member removed
- [ ] Verify no errors
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

#### Invitation Tests

**Send Invitation** 🟡
- [ ] Invite member via email
- [ ] Verify invitation created
- [ ] Check invitation appears in list
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Accept Invitation** 🔴
- [ ] Open invitation link (incognito/different browser)
- [ ] Accept invitation
- [ ] Verify `afterAcceptInvitation` hook logged
- [ ] Verify functional roles synced
- [ ] Verify member added to org
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Cancel Invitation** 🟡
- [ ] Send test invitation
- [ ] Cancel invitation
- [ ] Verify invitation cancelled
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

#### Team Tests

**Create Team** 🟡
- [ ] Create team with custom fields (sport, ageGroup, gender, season)
- [ ] Verify team created successfully
- [ ] Verify custom fields saved
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Update Team** 🟡
- [ ] Update team details
- [ ] Verify changes saved
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**List Teams** 🟡
- [ ] Navigate to teams list
- [ ] Verify teams display
- [ ] Verify filtering works
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Delete Team** 🟡
- [ ] Delete test team
- [ ] Verify team deleted
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

#### Session Management Tests

**Multi-Device Sessions** 🟢
- [ ] Sign in on first browser
- [ ] Sign in on second browser/device
- [ ] Verify both sessions active
- [ ] Sign out on first browser
- [ ] Verify second session still active
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Organization Context Switch** 🟡
- [ ] User with multiple orgs
- [ ] Switch active organization
- [ ] Verify `activeOrganizationId` updates
- [ ] Verify UI reflects new org
- [ ] Verify org theming applies
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Session Refresh** 🟢
- [ ] Sign in and wait
- [ ] Trigger session refresh (tab focus)
- [ ] Verify session refreshes without error
- [ ] **Result:** ✅ Pass / ❌ Fail
- [ ] **Notes:** _________________________________

**Phase 3 Complete Time:** _____________

**Phase 3 Summary:**
- Total Tests: _____
- Passed: _____
- Failed: _____
- Issues Found: _________________________________

---

### Phase 4: Deploy to Staging (30 minutes)

**Start Time:** _____________

#### Deployment

- [ ] Commit changes
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: Upgrade Better Auth to v1.4.5"
  ```

- [ ] Push to staging branch (if separate)
  ```bash
  git push origin staging
  ```

- [ ] Deploy to staging environment

- [ ] Wait for deployment to complete

- [ ] Verify staging deployment successful

#### Staging Verification

- [ ] Open staging environment in browser

- [ ] Check browser console for errors

- [ ] Test Microsoft OAuth on staging 🔴
  - [ ] **Result:** ✅ Pass / ❌ Fail

- [ ] Test Google OAuth on staging 🟡
  - [ ] **Result:** ✅ Pass / ❌ Fail

- [ ] Test organization operations on staging 🔴
  - [ ] Create org
  - [ ] Add member
  - [ ] Verify functional roles
  - [ ] **Result:** ✅ Pass / ❌ Fail

- [ ] Monitor staging logs for 10 minutes

- [ ] Check for any error spikes

- [ ] **Staging Sign-Off:** ✅ Ready for production / ❌ Issues found

**Phase 4 Complete Time:** _____________

**Phase 4 Notes:** _________________________________

---

### Phase 5: Deploy to Production (30 minutes)

**Start Time:** _____________

#### Pre-Production

- [ ] Verify staging fully tested and approved

- [ ] Notify team of production deployment

- [ ] Prepare rollback command (just in case)

- [ ] Open monitoring dashboards

#### Production Deployment

- [ ] Merge to main branch (if using staging branch)
  ```bash
  git checkout main
  git merge staging
  git push origin main
  ```

- [ ] Trigger production deployment

- [ ] Wait for deployment to complete

- [ ] Verify production deployment successful

#### Production Verification (First 15 Minutes - CRITICAL)

**Immediate Smoke Tests:**

- [ ] Open production site in browser

- [ ] Check browser console for errors

- [ ] Test Microsoft OAuth 🔴
  - [ ] **Result:** ✅ Pass / ❌ Fail
  - [ ] **Time:** _____________

- [ ] Test Google OAuth 🟡
  - [ ] **Result:** ✅ Pass / ❌ Fail
  - [ ] **Time:** _____________

- [ ] Test email/password sign-in 🟡
  - [ ] **Result:** ✅ Pass / ❌ Fail
  - [ ] **Time:** _____________

- [ ] Test organization operations 🔴
  - [ ] Navigate to org dashboard
  - [ ] Verify org loads
  - [ ] Check member list
  - [ ] **Result:** ✅ Pass / ❌ Fail
  - [ ] **Time:** _____________

**Error Log Monitoring:**

- [ ] Check error logs at 5 minutes
  - [ ] Auth-related errors: _____
  - [ ] Other errors: _____

- [ ] Check error logs at 10 minutes
  - [ ] Auth-related errors: _____
  - [ ] Other errors: _____

- [ ] Check error logs at 15 minutes
  - [ ] Auth-related errors: _____
  - [ ] Other errors: _____

**Metrics Check:**

- [ ] Sign-in success rate (should be 95%+): _____%

- [ ] Average response time: _____ ms

- [ ] Error rate: _____%

- [ ] **Production Status:** ✅ Stable / ⚠️ Monitoring / ❌ Issues

**Phase 5 Complete Time:** _____________

**Phase 5 Notes:** _________________________________

---

### Phase 6: Post-Deployment Monitoring (1 hour)

**Start Time:** _____________

#### Monitoring Checklist

**30 Minutes Post-Deploy:**
- [ ] Check error logs
  - [ ] Auth errors: _____
  - [ ] Other errors: _____
- [ ] Review sign-in success rate: _____%
- [ ] Check user-reported issues: _____
- [ ] Verify no CORS errors
- [ ] Verify no cookie size errors
- [ ] **Status:** ✅ Stable / ⚠️ Investigating / ❌ Rolling back

**1 Hour Post-Deploy:**
- [ ] Check error logs
  - [ ] Auth errors: _____
  - [ ] Other errors: _____
- [ ] Review sign-in success rate: _____%
- [ ] Check user-reported issues: _____
- [ ] Performance metrics stable: ✅ Yes / ❌ No
- [ ] **Status:** ✅ Stable / ⚠️ Investigating / ❌ Rolling back

**2 Hours Post-Deploy:**
- [ ] Check error logs
  - [ ] Auth errors: _____
  - [ ] Other errors: _____
- [ ] Review sign-in success rate: _____%
- [ ] Check user-reported issues: _____
- [ ] **Status:** ✅ Stable / ⚠️ Investigating / ❌ Rolling back

**End of Day:**
- [ ] Final error log review
- [ ] Final metrics check
- [ ] Team notification of completion
- [ ] **Overall Status:** ✅ Success / ⚠️ Monitoring / ❌ Issues

**Phase 6 Complete Time:** _____________

---

## Post-Migration Tasks

### Documentation

- [ ] Update `CLAUDE.md` with new Better Auth version

- [ ] Update migration status in this document

- [ ] Document actual time spent: _____ hours

- [ ] Document any issues encountered:
  ```
  Issue 1: _________________________________
  Resolution: _________________________________

  Issue 2: _________________________________
  Resolution: _________________________________
  ```

- [ ] Note performance improvements (if database joins enabled):
  ```
  Endpoint 1: _____ ms → _____ ms (___% improvement)
  Endpoint 2: _____ ms → _____ ms (___% improvement)
  ```

### Knowledge Sharing

- [ ] Brief team on migration results

- [ ] Share lessons learned

- [ ] Update upgrade procedures based on experience

- [ ] Archive this checklist with notes

### Optional: Enable Database Joins

- [ ] Review baseline performance metrics

- [ ] Add `experimental: { joins: true }` to auth config

- [ ] Deploy to staging first

- [ ] Measure performance improvements

- [ ] Test all organization/team operations

- [ ] Deploy to production if stable

- [ ] Monitor for any join-related issues

- [ ] Document performance gains:
  ```
  Before: _____ ms average
  After: _____ ms average
  Improvement: _____%
  ```

---

## Rollback Procedure

**If critical issues occur, execute immediately:**

### Quick Rollback (5 minutes)

- [ ] Revert package.json changes
  ```bash
  git checkout HEAD~1 -- apps/web/package.json packages/backend/package.json
  ```

- [ ] Reinstall dependencies
  ```bash
  npm install
  ```

- [ ] Regenerate schema with old version
  ```bash
  npm run generate-better-auth-schema -w packages/backend
  ```

- [ ] Verify dev server starts
  ```bash
  npx convex dev
  ```

- [ ] Commit rollback
  ```bash
  git add package.json package-lock.json
  git commit -m "Rollback: Revert Better Auth upgrade due to [ISSUE]"
  ```

- [ ] Push to production
  ```bash
  git push origin main
  ```

- [ ] Verify production stable

- [ ] **Rollback Complete Time:** _____________

### Rollback Notes

**Reason for rollback:** _________________________________

**Issues encountered:** _________________________________

**Next steps:** _________________________________

---

## Success Criteria

The migration is successful when:

- [x] All Phase 3 tests pass (local)
- [x] All Phase 4 tests pass (staging)
- [x] All Phase 5 smoke tests pass (production)
- [x] No increase in error rates
- [x] Sign-in success rate 95%+ maintained
- [x] No user-reported auth issues in first 24 hours
- [x] Performance same or better than before
- [x] Team confident in stability

---

## Final Status

**Migration Status:** ⬜ Not Started / ⬜ In Progress / ⬜ Completed / ⬜ Rolled Back

**Start Date/Time:** _____________
**Completion Date/Time:** _____________
**Total Time Spent:** _____ hours

**Overall Result:** ⬜ Success / ⬜ Partial Success / ⬜ Failed / ⬜ Rolled Back

**Key Metrics:**
- Tests Passed: _____ / _____
- Critical Issues: _____
- Minor Issues: _____
- Performance Impact: _________________________________

**Recommendation for Future Upgrades:**
```
_________________________________
_________________________________
_________________________________
```

**Sign-Off:**
- **Executed By:** _____________
- **Reviewed By:** _____________
- **Date:** _____________

---

## Notes & Observations

**What went well:**
```
_________________________________
_________________________________
```

**What could be improved:**
```
_________________________________
_________________________________
```

**Unexpected discoveries:**
```
_________________________________
_________________________________
```

**Follow-up tasks:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-14
