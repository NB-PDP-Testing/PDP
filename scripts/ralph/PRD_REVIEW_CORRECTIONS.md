# PRD Review & Corrections - P8 Week 1.5
**Date**: January 27, 2026
**Reviewer**: Claude Sonnet 4.5
**Files Reviewed**: Week 1.5 PRD + Master P8 PRD

---

## Summary

✅ **Both PRDs are now correct and consistent**

Reviewed and corrected:
1. Week 1.5 PRD (`scripts/ralph/prd.json` and source file)
2. Master P8 PRD (`scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md`)

---

## Issues Found & Fixed in Week 1.5 PRD

### Issue 1: Incorrect Index Strategy (Line 118)
**Problem**: Query documentation said to use `by_coach_org` index when status not provided.

**Original**:
```
"Use index: by_org_status if status provided, else by_coach_org"
```

**Corrected**:
```
"Use index: by_org_status (query by organizationId, filter by status in query if provided)"
```

**Why**: The query `getCoachOverrideRequests` takes `organizationId` as primary arg, so it should ALWAYS use the `by_org_status` index. The `by_coach_org` index is for querying a specific coach's requests, not org-wide requests.

---

### Issue 2: Required Args Should Be Optional (Line 128)
**Problem**: `setPlatformFeatureFlags` mutation required both boolean args, forcing platform staff to specify both flags even when toggling just one.

**Original**:
```json
"Args: { organizationId: v.string(), allowAdminDelegation: v.boolean(), allowCoachOverrides: v.boolean() }"
```

**Corrected**:
```json
"Args: { organizationId: v.string(), allowAdminDelegation: v.optional(v.boolean()), allowCoachOverrides: v.optional(v.boolean()) }"
```

**Why**: Platform staff should be able to toggle admin delegation OR coach overrides independently without having to specify both values every time. The mutation should only update fields provided in args.

---

### Issue 3: Impossible Tooltip Condition (Line 234)
**Problem**: Tooltip showed message for `coach_override` source, but this condition can never be reached.

**Original**:
```tsx
{gateStatus?.source === 'org_default' && 'Available at Trust Level 2+'}
{gateStatus?.source === 'admin_blanket' && 'Contact your administrator for access'}
{gateStatus?.source === 'coach_override' && 'Calculating...'}
```

**Corrected**:
```tsx
{gateStatus?.source === 'org_default' && 'Available at Trust Level 2+'}
{gateStatus?.source === 'admin_blanket' && 'Contact your administrator for access'}
```

**Why**: The locked button (with tooltip) only shows when `shouldShowSentToParents` is `false`. This happens when:
- `gateStatus.gatesActive === true` AND `trustLevel < 2`

If `gateStatus.source === 'coach_override'`, that means the coach HAS an individual override, which makes `gatesActive = false`, which makes `shouldShowSentToParents = true`, so the locked button never shows. The third condition is unreachable dead code.

---

### Issue 4: Confusing Toggle Handler Description (Lines 300-303)
**Problem**: Arrow notation was ambiguous - unclear if it meant "call A then B" or "call A or B".

**Original**:
```
"- Gates Enabled: Call setPlatformFeatureFlags → setOrgTrustGatesEnabled"
"- Admin Delegation: Call setPlatformFeatureFlags with allowAdminDelegation"
"- Coach Overrides: Call setPlatformFeatureFlags with allowCoachOverrides"
```

**Corrected**:
```
"- Gates Enabled toggle: Call setOrgTrustGatesEnabled mutation"
"- Admin Delegation toggle: Call setPlatformFeatureFlags mutation with { allowAdminDelegation }"
"- Coach Overrides toggle: Call setPlatformFeatureFlags mutation with { allowCoachOverrides }"
```

**Why**: Clearer wording removes ambiguity. Each toggle calls ONE specific mutation with specific args.

---

## Master P8 PRD Updates

### Update 1: Week 1 Status Reflected
**Added**: Week 1 completion status with individual story results

**Changes**:
```markdown
### Week 1: Foundation (COMPLETED - Jan 27, 2026)
- ✅ Create `getCoachImpactSummary` backend query (US-P8-001)
- ⚠️ Remove trust level gate from "Sent to Parents" tab (US-P8-002 - removed entirely, needs Week 1.5 fix)
- ✅ Add basic "My Impact" tab structure with date filtering (US-P8-003)
- ✅ Add My Impact tab to navigation (US-P8-004)

**Week 1 Issue Discovered:**
US-P8-002 removed trust gates entirely instead of making them controllable. All coaches now see sent summaries regardless of trust level. Week 1.5 will fix this with a proper feature flag system.
```

**Why**: Provides transparency about what was completed and what issue was discovered.

---

### Update 2: Week 1.5 Section Added
**Added**: Complete Week 1.5 section with architecture overview

**Changes**:
```markdown
### Week 1.5: Trust Gate Feature Flags (IN PROGRESS - Critical Fix)
**Purpose:** Fix US-P8-002 by implementing flexible 3-tier permission system

**Architecture:**
- Platform Staff → Enable delegation capabilities
- Org Admins → Set blanket overrides (all coaches) OR grant individual overrides
- Coaches → Request overrides if enabled

**Stories (5):**
- US-P8-021: Backend trust gate permission system (schema + queries + mutations)
- US-P8-002-FIX: Fix dashboard gate check with feature flags + trust level logic
- US-P8-022: Platform staff feature flags admin UI
- US-P8-022B: Platform staff overview dashboard
- US-P8-023: Org admin trust gate status dashboard

**Reference:** See `scripts/ralph/prds/Coaches Voice Insights/p8-week1.5-trust-gate-fix.prd.json`
```

**Why**: Master PRD now reflects the actual work sequence (Week 1 → Week 1.5 → Week 2 → Week 3).

---

### Update 3: Header Status Updated
**Changed**: Branch name, status, estimated time, last updated date

**Changes**:
```markdown
**Branch:** `ralph/coach-impact-visibility-p8-week1` (active)
**Status:** Week 1 Complete, Week 1.5 In Progress (Trust Gate Fix)
**Estimated Time:** 3.5 weeks (Week 1 done, Week 1.5 in progress, Week 2-3 remaining)
**Last Updated:** January 27, 2026 - Added Week 1.5 trust gate feature flags
```

**Why**: Keeps master PRD current with latest status.

---

## Verification Checklist

### Week 1.5 PRD (prd.json)
- ✅ All story IDs correct (US-P8-021, US-P8-002-FIX, US-P8-022, US-P8-022B, US-P8-023)
- ✅ Schema changes correct (organization, coachOrgPreferences, new tables)
- ✅ Query args and returns correct
- ✅ Mutation args correct (optional flags where needed)
- ✅ Index strategy correct (by_org_status for org-level queries)
- ✅ Frontend patterns correct (conditional rendering based on feature flags)
- ✅ File paths correct (platform-admin/feature-flags, orgs/[orgId]/settings/features)
- ✅ Testing strategy comprehensive
- ✅ Quality checks defined
- ✅ Success criteria clear

### Master P8 PRD (P8_COACH_IMPACT_VISIBILITY.md)
- ✅ Header status current (Week 1 complete, Week 1.5 in progress)
- ✅ Branch name updated to active branch
- ✅ Week 1 section reflects completion status
- ✅ Week 1.5 section added with full context
- ✅ Week 2 and Week 3 sections unchanged (still valid)
- ✅ Executive summary still accurate
- ✅ Context and architecture sections still accurate

---

## Ralph Readiness

**Both PRDs are now ready for Ralph execution:**

1. ✅ Week 1.5 PRD (`scripts/ralph/prd.json`) is correct and comprehensive
2. ✅ Master P8 PRD reflects current status and remaining work
3. ✅ All technical details verified against architecture docs
4. ✅ No inconsistencies between documents
5. ✅ Clear success criteria for each story
6. ✅ Proper testing strategy defined

**Ralph can start Week 1.5 work immediately.**

---

## Key Patterns Verified

### Permission Priority (Correct)
```
Individual Coach Override (highest)
  ↓ (if not set)
Admin Blanket Override
  ↓ (if not set)
Org Default (lowest)
```

### Schema Extensions (Correct)
- All new fields use `.optional()` to support existing data
- Migration strategy is conservative (gates ON by default)
- Index names match query patterns

### Frontend Logic (Correct)
```typescript
const shouldShowSentToParents = useMemo(() => {
  if (gateStatus === undefined) return false; // Loading
  if (!gateStatus.gatesActive) return true;   // Gates disabled
  return trustLevel?.currentLevel >= 2;       // Trust level check
}, [gateStatus, trustLevel]);
```

### Mutation Auth Patterns (Correct)
- Platform staff: Check `isPlatformStaff === true`
- Org admins: Check `member.role` includes "admin" or "owner"
- Delegation checks: Verify `allowAdminDelegation` or `allowCoachOverrides` flags

---

## Conclusion

✅ **All PRD issues resolved**
✅ **Both PRDs consistent and accurate**
✅ **Ralph has complete, correct guidance**

Ready to proceed with Week 1.5 execution.

---

**Reviewed By**: Claude Sonnet 4.5
**Date**: January 27, 2026
**Status**: APPROVED ✅
