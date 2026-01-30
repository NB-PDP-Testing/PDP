# Issue #324 & #330 Coordination Plan

**Date:** 2026-01-29
**Issue #324:** userId Legacy Field Cleanup
**Issue #330:** Convex Performance Crisis (Better Auth)
**Status:** Coordination plan documented, fixes pending

---

## EXECUTIVE SUMMARY

Issues #324 and #330 share the same root cause (`userId` field confusion in Better Auth schema) but represent different severity levels and must be fixed in a coordinated sequence to avoid conflicts and ensure platform stability.

**Key Decision:** Keep issues SEPARATE but coordinate fixes with clear sequencing.

---

## ISSUE COMPARISON

| Aspect | Issue #324 | Issue #330 |
|--------|-----------|-----------|
| **Title** | userId used in User Table (BetterAuth) | Convex Performance Crisis - Platform Down |
| **Created** | Earlier (legacy cleanup) | January 29, 2026 (emergency) |
| **Priority** | LOW - Code quality | CRITICAL - Production outage |
| **Severity** | Minor (works but suboptimal) | Critical (platform disabled) |
| **Impact** | 13 functions with fallback pattern | 1.88M Better Auth calls (59% of traffic) |
| **Files** | 2 files | 21+ files |
| **Urgency** | Can wait weeks | Must fix immediately |
| **Risk Level** | LOW for code, MEDIUM for schema | HIGH (emergency fix needed) |
| **Dependencies** | None (standalone) | Blocks platform operation |

---

## ROOT CAUSE ANALYSIS

Both issues stem from confusion about the `userId` field in the Better Auth user table schema.

### Better Auth User Table Schema

**Current State (Custom Schema):**
```typescript
// packages/backend/convex/betterAuth/schema.ts
const customUserTable = defineTable({
  // Better Auth base fields
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),

  userId: v.optional(v.union(v.null(), v.string())), // ❌ Line 17 - LEGACY FIELD

  // Custom profile fields
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  // ...
})
  .index("userId", ["userId"]); // ❌ Line 40 - UNUSED INDEX
```

**Better Auth Documentation:**
- Primary key: `id` (Convex maps to `_id`)
- Does NOT require `userId` field
- User table should use `_id` for all queries
- `userId` was manually added as custom/legacy field

### The Confusion

**Three different identifiers exist:**
1. **`_id`** - Convex internal ID, Better Auth primary key ✅ CORRECT
2. **`userId`** - Custom field added to schema (always null) ❌ LEGACY
3. **`user.userId`** - Referenced in code but undefined ❌ WRONG

This created two distinct problems documented in separate issues.

---

## ISSUE #324: userId Fallback Pattern

### Problem Description

**Pattern Found in 13 Functions:**
```typescript
// coachParentSummaries.ts:297, coachTrustLevels.ts:272
const userId = user.userId || user._id; // ❌ Unnecessary fallback
```

### Why It Exists

Defensive coding pattern assuming `userId` might be populated, but:
- `user.userId` is ALWAYS null/undefined in production
- Fallback to `user._id` always executes
- Pattern works but adds unnecessary code complexity

### Files Affected

**`coachTrustLevels.ts`** (3 functions):
- Line 272: `setCoachPreferredLevel`
- Line 320: `setParentSummariesEnabled`
- Line 360: `setSkipSensitiveInsights`

**`coachParentSummaries.ts`** (10 functions):
- Line 287: `approveSummary`
- Line 386: `approveInjurySummary`
- Line 470: `suppressSummary`
- Line 660: `revokeSummary`
- Line 721: `editSummaryContent`
- Line 820: `getCoachPendingSummaries`
- Line 1174: `getAutoApprovedSummaries`
- Line 1248: `markSummaryViewed`
- Line 1313: `trackShareEvent`
- Line 1378: `acknowledgeParentSummary`

### Impact

- **Functional:** LOW - Code works correctly (always uses `_id`)
- **Performance:** NONE - No performance impact
- **Maintainability:** MEDIUM - Confusing pattern, misleading to developers
- **Type Safety:** LOW - `userId` field shows in types but is unused

### Fix Complexity

**Simple - 13 line changes:**
```typescript
// BEFORE
const userId = user.userId || user._id;

// AFTER
const userId = user._id;
```

**Estimated Effort:** 2 hours (includes testing)

---

## ISSUE #330: Better Auth Query Pattern Errors

### Problem Description

**Anti-Pattern #3 - Wrong Field Name (voiceNotes.ts:452):**
```typescript
// ❌ WRONG: Querying by "userId" field doesn't work
const coachResult = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  {
    model: "user",
    where: [
      { field: "userId", value: note.coachId, operator: "eq" } // ❌ BREAKS QUERY
    ],
  }
);
// Result: coachResult is ALWAYS null
```

**Why It Fails:**
- Better Auth adapter queries need valid indexed fields
- `userId` field exists but is null for all users
- Query searches for `userId === "some-id"` but all records have `userId === null`
- Returns null, causing missing coach names in voice notes

### Files Affected (Broader Scope)

**Critical Performance Issues:**
- `members.ts` - N+1 patterns (77K + 77K calls)
- `voiceNotes.ts` - Wrong field name + N+1 (10K calls, broken coach names)
- `users.ts` - Empty WHERE clauses (132K calls)
- `coachParentSummaries.ts` - Nested N+1 patterns (50+ queries per parent)
- 17+ other files with Better Auth anti-patterns

### Impact

- **Functional:** HIGH - Coach names missing in voice notes
- **Performance:** CRITICAL - 1.88M adapter calls (59% of 3.2M total)
- **Platform:** DOWN - Convex instance disabled due to overages
- **Cost:** $25-65/month required to restore service

### Fix Complexity

**Complex - Multiple phases:**
- Phase 1: Fix 5 critical N+1 patterns (6 hours)
- Phase 2: Update Better Auth packages (1 hour)
- Phase 3-6: Type safety, consistency, optimization (2-3 weeks)

**Estimated Total Effort:** 1-2 weeks

---

## TECHNICAL OVERLAP

### Same Files, Different Issues

Both issues affect the same two files but for different reasons:

**`coachParentSummaries.ts`:**
- **#324 Problem:** 10 functions use `user.userId || user._id` fallback
- **#330 Problem:** Massive N+1 query patterns causing 77K adapter calls

**`coachTrustLevels.ts`:**
- **#324 Problem:** 3 functions use `user.userId || user._id` fallback
- **#330 Problem:** Part of broader Better Auth anti-pattern audit

### Example: Same Function, Two Issues

**`coachParentSummaries.ts` - `approveSummary` function:**

```typescript
export const approveSummary = mutation({
  args: { summaryId: v.id("coachParentSummaries") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    // ❌ ISSUE #324: Unnecessary fallback pattern
    const userId = user.userId || user._id;

    const summary = await ctx.db.get(args.summaryId);

    // ❌ ISSUE #330: If this function were in N+1 loop, would multiply calls
    if (summary.coachId !== userId) {
      throw new Error("Not authorized");
    }

    // ... rest of function
  },
});
```

**Both fixes needed, but in sequence:**
1. First: Fix #330's N+1 patterns (if any in parent functions)
2. Then: Fix #324's userId fallback

---

## WHY KEEP ISSUES SEPARATE

### Reason 1: Different Urgency Levels

**#330 is a production emergency:**
- Platform DOWN
- Users cannot access system
- Revenue impact
- Must fix immediately (hours, not days)

**#324 is technical debt:**
- Code works correctly
- No user impact
- No performance penalty
- Can wait for proper planning

**Merging would:**
- Dilute urgency of #330
- Delay emergency fixes with non-critical cleanup
- Confuse priority for developers

---

### Reason 2: Different Fix Scopes

**#330 requires comprehensive changes:**
- 21+ files
- 272 Better Auth adapter calls
- Package updates
- Schema index optimization
- Type safety restoration (50+ `as any` removals)
- 6-phase remediation plan

**#324 is surgical:**
- 2 files
- 13 functions
- Simple pattern replacement
- Optional schema cleanup

**Merging would:**
- Make issue too large to track effectively
- Mix emergency fixes with cleanup tasks
- Complicate testing and deployment

---

### Reason 3: Different Risk Profiles

**#330 fixes are HIGH RISK:**
- Touch performance-critical code
- Affect Better Auth integration
- Platform-wide impact
- Must be deployed incrementally with monitoring

**#324 fixes are LOW RISK:**
- Simple pattern replacement
- No performance impact
- Isolated to specific functions
- Can be deployed in single PR

**Merging would:**
- Increase risk of deployment errors
- Make rollback more difficult
- Complicate root cause analysis if issues arise

---

### Reason 4: Different Timelines

**#330 timeline:**
- Week 1: Emergency fixes (Phase 1-2)
- Week 2: Type safety and consistency (Phase 3-4)
- Week 3-4: Final optimizations (Phase 5-6)

**#324 timeline:**
- After #330 Phase 2 completes
- 2-hour fix + testing
- Single deployment

**Merging would:**
- Force #324 to wait until #330 fully complete
- Prevent parallel work streams if needed
- Delay simple cleanup unnecessarily

---

## COORDINATION PLAN

### Phase-by-Phase Coordination

#### PHASE 1: Emergency Fix (#330 Only)
**Timeline:** Immediate (6 hours)
**Status:** #324 ON HOLD

**#330 Tasks:**
1. Fix `getMembersForAllOrganizations` N+1 (77K → 7.7K calls)
2. Fix `getPendingInvitationsByEmail` N+1 (77K → 2K calls)
3. Fix `voiceNotes.ts:452` field name error (fixes coach names)
4. Fix `getUserDeletionPreview` empty filters
5. Add critical composite indexes

**#324 Tasks:**
- None (wait for #330 Phase 1 to deploy)

**Success Criteria:**
- Platform back online
- Convex calls drop from 3.2M → ~2.8M
- Coach names display correctly in voice notes

---

#### PHASE 2: Package Updates (#330 Only)
**Timeline:** Week 1 (1 hour + 24hr testing)
**Status:** #324 STILL ON HOLD

**#330 Tasks:**
1. Backup package files
2. Update `better-auth@1.3.34` → `1.4.18`
3. Update `@convex-dev/better-auth@0.9.11` → `0.10.10`
4. Test auth flows thoroughly
5. Deploy to staging
6. Monitor for 24 hours
7. Deploy to production

**#324 Tasks:**
- None (wait for package updates to stabilize)

**Success Criteria:**
- Better Auth packages updated
- Adapter performance improved 10-20%
- No auth flow regressions
- Convex calls drop to ~2.4M

---

#### PHASE 3: Code Cleanup (#324 BEGINS)
**Timeline:** Week 2 (2 hours)
**Status:** #330 continues in parallel, #324 ACTIVE

**#330 Tasks (Parallel):**
1. Type safety restoration (remove `as any`)
2. Add return validators
3. Document access patterns

**#324 Tasks (Now Safe to Start):**
1. **Run production audit script** (verify userId field is null for all users)
2. **Review audit results**:
   ```bash
   npx convex run scripts:auditSummaryReport
   ```
3. **If audit passes**, proceed with code fix:
   - Update `coachParentSummaries.ts` (10 functions)
   - Update `coachTrustLevels.ts` (3 functions)
   - Replace all `user.userId || user._id` with `user._id`
4. **Test affected features**:
   - Coach voice notes approval flow
   - Trust level management
   - Parent summaries
   - Coach settings
5. **Deploy to staging**
6. **Test for 24 hours**
7. **Deploy to production**

**Why Now is Safe:**
- #330 Phase 1-2 have standardized on `user._id` pattern
- Better Auth packages updated
- Platform stable
- Pattern is now consistent across all code

**Success Criteria (#324):**
- All 13 functions use `user._id` directly
- No functional regressions
- Tests pass
- Cleaner, more consistent code

---

#### PHASE 4: Schema Cleanup (OPTIONAL - #324)
**Timeline:** Week 3-4 (evaluate risk first)
**Status:** DECISION PENDING

**Risk Assessment Required:**

**HIGH RISK - Better Auth CLI Regeneration:**
```bash
# This command might reintroduce userId field:
npx @better-auth/cli generate --output ./convex/betterAuth/generatedSchema.ts -y
```

**MEDIUM RISK - Production Data Loss:**
- If ANY user has `userId` populated with different value than `_id`
- Data would be lost on schema field removal
- Audit script verifies this won't happen

**DECISION TREE:**

```
IF audit shows userId is null for all users:
  AND Better Auth CLI won't regenerate field:
    → PROCEED with schema cleanup
  ELSE:
    → SKIP schema cleanup, document as deprecated

IF any user has userId populated:
  → DO NOT remove field
  → Investigate why it's populated
  → Fix data inconsistency first
```

**If Proceeding with Schema Cleanup:**

**Files to Modify:**
1. `packages/backend/convex/betterAuth/schema.ts`:
   - Remove line 17: `userId: v.optional(v.union(v.null(), v.string())),`
   - Remove line 40: `.index("userId", ["userId"])`

2. `packages/backend/convex/betterAuth/generatedSchema.ts`:
   - Remove corresponding userId field and index
   - OR: Regenerate with Better Auth CLI (if safe)

**Deployment Steps:**
1. Deploy to staging first
2. Run Convex schema migration
3. Verify no schema errors
4. Test all Better Auth operations
5. Monitor for 48 hours
6. Deploy to production

**Rollback Plan:**
- Keep backup of schema files
- Be prepared to restore userId field if issues arise
- Monitor Convex error logs closely

**Success Criteria:**
- Schema cleaned up
- No Better Auth errors
- No data loss
- Cleaner schema definition

**Alternative (Lower Risk):**
- Keep field in schema
- Add deprecation comment:
  ```typescript
  // DEPRECATED: Legacy field, always null. Remove in future version.
  userId: v.optional(v.union(v.null(), v.string())),
  ```
- Defer removal until major version bump

---

## TESTING STRATEGY

### #330 Testing (Per Phase)

**Phase 1 Testing:**
- [ ] Platform comes back online
- [ ] getMembersForAllOrganizations returns correct data
- [ ] User with 10 orgs sees all orgs correctly
- [ ] Pending invitations load with full details
- [ ] Coach names display in voice notes
- [ ] Convex function call metrics drop significantly

**Phase 2 Testing:**
- [ ] Login/logout works
- [ ] Google OAuth works
- [ ] Microsoft Azure OAuth works
- [ ] Organization switching works
- [ ] User profile loads correctly
- [ ] Better Auth adapter queries succeed
- [ ] No adapter errors in logs

**Phase 3-6 Testing:**
- [ ] Type checking passes (`npm run check-types`)
- [ ] No `as any` warnings
- [ ] Validator errors caught at runtime
- [ ] Access patterns consistent
- [ ] Code review checklist passes

---

### #324 Testing

**Production Audit (Before Code Changes):**
```bash
# Deploy audit script
npx convex deploy

# Run audit queries
npx convex run scripts:auditSummaryReport

# Expected result:
{
  "recommendation": "SAFE - All checks passed, fix can be implemented",
  "safeToRemoveUserIdFallback": true,
  "details": {
    "userTableStatus": "All users have userId as null/undefined (expected)",
    "coachIdFormatConsistent": true,
    "orphanedRecordsExist": false
  }
}
```

**Functional Testing (After Code Changes):**

**Test Case 1: Coach Voice Notes Approval**
1. Login as coach
2. Record voice note
3. Generate parent summary
4. Approve summary
5. Verify approval saves correctly
6. Check coachId matches user._id

**Test Case 2: Trust Level Management**
1. Login as coach
2. Navigate to settings
3. Set preferred trust level
4. Save settings
5. Verify trust level persists
6. Check trust record uses user._id

**Test Case 3: Parent Summary Viewing**
1. Login as parent
2. View child summaries
3. Mark summary as viewed
4. Acknowledge summary
5. Verify events tracked correctly
6. Check all records use user._id

**Test Case 4: Multi-Organization Coach**
1. Login as coach in multiple orgs
2. Switch between organizations
3. Perform trust level operations in each org
4. Verify isolation and correct user ID usage

**Regression Testing:**
- [ ] All 13 functions execute without errors
- [ ] No null pointer exceptions
- [ ] Authorization checks still work
- [ ] Performance unchanged (should be identical)

---

## ROLLBACK PLANS

### #330 Rollback Strategy

**If Phase 1 Causes Issues:**
```bash
# Revert to previous deployment
git revert <commit-hash>
npx convex deploy

# Or: Disable new query functions
# Keep old functions in place until fix verified
```

**If Phase 2 (Package Update) Causes Issues:**
```bash
# Revert package.json and package-lock.json
git checkout HEAD~1 package.json package-lock.json
npm install
npx convex deploy

# Downgrade to known working versions:
npm install better-auth@1.3.34 @convex-dev/better-auth@0.9.11
```

**Rollback Decision Criteria:**
- Auth flows broken (can't login)
- Adapter errors in production logs
- Performance worse than before
- User complaints about missing data
- Convex error rate spikes

---

### #324 Rollback Strategy

**If Code Changes Cause Issues:**
```bash
# Revert the single commit
git revert <commit-hash>
npx convex deploy

# Code change was minimal, easy to undo
```

**Rollback Decision Criteria:**
- Authorization failures
- Coach operations fail
- Parent summaries not working
- Trust level settings not saving
- Null pointer errors in logs

---

## SUCCESS METRICS

### #330 Success Metrics

**Performance:**
- Convex function calls: 3.2M → 1.0M/day (68% reduction)
- Better Auth adapter calls: 1.88M → 500K/day (73% reduction)
- Database bandwidth: 2.49 GB → <1 GB/day (60% reduction)
- Page load time: 50% faster for affected queries

**Cost:**
- Potential downgrade from Professional ($65/mo) to Starter ($25/mo)
- Or return to free tier (1M calls/day limit)
- Savings: $40-65/month

**Code Quality:**
- 50+ `as any` instances removed
- All queries have validators
- Consistent access patterns documented
- Better Auth best practices checklist followed

---

### #324 Success Metrics

**Code Quality:**
- 13 functions simplified (remove fallback pattern)
- Consistent `user._id` usage throughout
- No misleading `userId` references
- Cleaner, more maintainable code

**Schema (If Cleanup Performed):**
- Unused `userId` field removed
- Unused index removed
- Schema matches actual usage
- Better Auth schema aligned with docs

**Functional:**
- Zero regressions
- All coach operations work
- All parent operations work
- Trust level management works

---

## COMMUNICATION PLAN

### Stakeholder Updates

**During #330 Emergency (Phase 1-2):**
- Hourly updates on fix progress
- Post-deployment validation results
- Performance metrics before/after
- Clear timeline for full resolution

**During #324 Cleanup (Phase 3):**
- Pre-deployment notification
- Testing results
- Deployment window
- Validation confirmation

### GitHub Issue Updates

**Issue #330:**
- Update after each phase completes
- Post performance metrics
- Document any issues encountered
- Mark tasks complete in checklist

**Issue #324:**
- Update when #330 Phase 2 completes (clear to proceed)
- Post audit script results
- Update after code deployment
- Document schema cleanup decision

---

## DEPENDENCIES & BLOCKERS

### #330 Dependencies

**External:**
- Convex platform stability
- Better Auth package availability
- Paid plan activation (to restore service)

**Internal:**
- Developer availability for emergency fixes
- Testing environment access
- Staging deployment pipeline

**Blockers:**
- None (emergency priority)

---

### #324 Dependencies

**External:**
- None (all dependencies internal)

**Internal:**
- **#330 Phase 1 MUST complete first** (emergency fixes)
- **#330 Phase 2 MUST complete first** (package updates)
- Production audit script results must pass
- Testing environment access

**Blockers:**
- #330 Phase 1-2 not complete → BLOCKS #324 start
- Audit script fails → BLOCKS code changes
- Better Auth CLI regeneration risk → BLOCKS schema cleanup

---

## LESSONS LEARNED (TO BE UPDATED POST-FIX)

### What Went Wrong

1. **userId Field Confusion:**
   - Custom field added without clear documentation
   - Not aligned with Better Auth standard patterns
   - Created two separate issues from same root cause

2. **Performance Monitoring Gap:**
   - N+1 patterns not caught in code review
   - No alerts before hitting Convex limits
   - Production testing insufficient

3. **Better Auth Integration:**
   - Documentation not fully understood
   - Field naming not validated against docs
   - Package updates deferred

### Process Improvements

**Code Review Checklist:**
- [ ] Verify field names match Better Auth docs
- [ ] Check for N+1 query patterns
- [ ] Validate Better Auth adapter usage
- [ ] Test with realistic data volumes

**Monitoring:**
- Set up Convex alerts at 500K, 750K, 900K calls
- Dashboard for Better Auth adapter call volume
- Performance testing for new features

**Documentation:**
- Document all custom schema fields
- Clear naming conventions (avoid confusion with standard fields)
- Better Auth access patterns guide

---

## REFERENCES

### Documentation Created

- [ISSUE_330_UPDATED_COMPLETE_ANALYSIS.md](./ISSUE_330_UPDATED_COMPLETE_ANALYSIS.md)
- [BETTER_AUTH_COMPREHENSIVE_AUDIT_AND_REMEDIATION.md](../auth/BETTER_AUTH_COMPREHENSIVE_AUDIT_AND_REMEDIATION.md)
- This coordination document

### Better Auth Official Docs

- [Convex Integration](https://better-auth.com/docs/integrations/convex)
- [Organization Plugin](https://better-auth.com/docs/plugins/organization)
- [Database Schema](https://www.better-auth.com/docs/concepts/database)

### Related Issues

- [Issue #324](https://github.com/NB-PDP-Testing/PDP/issues/324) - userId field cleanup
- [Issue #330](https://github.com/NB-PDP-Testing/PDP/issues/330) - Convex performance crisis

---

## APPENDIX: TIMELINE VISUALIZATION

```
WEEK 1 (Emergency)
Day 1-2: #330 Phase 1 (Critical N+1 fixes)        ⚠️ EMERGENCY
         ├─ Fix getMembersForAllOrganizations
         ├─ Fix getPendingInvitationsByEmail
         ├─ Fix voiceNotes field name error
         └─ Add composite indexes
         #324: ON HOLD ⏸

Day 3-4: #330 Phase 2 (Package updates)           🔄 HIGH PRIORITY
         ├─ Update better-auth packages
         ├─ Test auth flows
         └─ Monitor for 24 hours
         #324: STILL ON HOLD ⏸

WEEK 2 (Cleanup & Quality)
Day 5-6: #330 Phase 3 (Type safety)               🔧 PARALLEL WORK
         ├─ Remove `as any` casting
         ├─ Add validators
         └─ Document patterns

         #324 BEGIN ✅
         ├─ Run production audit
         ├─ Fix 13 functions
         ├─ Test thoroughly
         └─ Deploy

Day 7-8: #330 Phase 4 (Validators)                🔧 CONTINUE
         #324: Code fix complete, monitoring

WEEK 3-4 (Optimization)
Day 9+:  #330 Phase 5-6 (Final optimization)      🎯 LOW PRIORITY
         #324: Schema cleanup evaluation          ⚠️ EVALUATE RISK
```

---

## STATUS TRACKING

| Phase | Issue | Status | Started | Completed | Notes |
|-------|-------|--------|---------|-----------|-------|
| 1: Emergency N+1 Fixes | #330 | 🟡 PENDING | - | - | Waiting for approval |
| 2: Package Updates | #330 | 🟡 PENDING | - | - | After Phase 1 |
| 3: Type Safety | #330 | 🟡 PENDING | - | - | Parallel with #324 |
| 3: Code Cleanup | #324 | 🟡 PENDING | - | - | After #330 Phase 2 |
| 4: Validators | #330 | 🟡 PENDING | - | - | Week 2 |
| 4: Schema Cleanup | #324 | 🟡 EVAL | - | - | Risk assessment needed |
| 5-6: Final Optimization | #330 | 🟡 PENDING | - | - | Week 3-4 |

**Legend:**
- 🟡 PENDING - Not started, waiting for dependencies
- 🔵 IN PROGRESS - Currently being worked on
- 🟢 COMPLETE - Finished and verified
- 🟠 EVAL - Needs evaluation/decision
- 🔴 BLOCKED - Cannot proceed

---

## APPROVAL & SIGN-OFF

**Coordination Plan Status:** ✅ DOCUMENTED
**Next Action:** Await user approval to begin #330 Phase 1
**Document Owner:** Development Team
**Last Updated:** 2026-01-29

---

**END OF COORDINATION PLAN**
