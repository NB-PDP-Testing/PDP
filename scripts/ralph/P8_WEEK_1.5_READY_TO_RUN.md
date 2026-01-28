# P8 Week 1.5 - Trust Gate Feature Flags - ✅ COMPLETE

**Status**: ✅ **COMPLETE** - Jan 28, 2026
**Date**: 27 January 2026 (started), 28 January 2026 (completed)
**Branch**: `ralph/coach-impact-visibility-p8-week1` (continuing from Week 1)
**Ralph Version**: Claude Sonnet 4.5
**Urgency**: ✅ RESOLVED - Comprehensive self-service access control implemented

**Completion Summary**:
- ✅ 9 stories delivered (5 planned + 4 enhancements)
- ✅ Backend: 6 queries, 8 mutations, 8-priority access logic
- ✅ Frontend: Coach self-service toggle, admin bulk controls, comprehensive status UI
- ✅ Testing: 40 test cases + quick test guide
- ✅ Documentation: Checkpoint, Ralph context, Better Auth patterns

See `scripts/ralph/P8_CHECKPOINT_JAN28.md` for full completion details.

---

## ✅ Pre-Flight Checklist

### Documentation Ready
- [x] Week 1.5 PRD created: `scripts/ralph/prds/Coaches Voice Insights/p8-week1.5-trust-gate-fix.prd.json`
- [x] Active PRD updated: `scripts/ralph/prd.json` copied from Week 1.5
- [x] Architecture documented: `scripts/ralph/TRUST_GATE_ARCHITECTURE_V2.md` (complete design)
- [x] MVP vs Groups analysis: `scripts/ralph/TRUST_GATE_MVP_VS_GROUPS.md`
- [x] Impact analysis: `scripts/ralph/P8_P9_COMPREHENSIVE_REFACTORING_PLAN.md` (100+ pages)
- [x] Progress log updated: `scripts/ralph/progress.txt` (Week 1 summary + Week 1.5 context)
- [x] Ralph context updated: `scripts/ralph/P8_RALPH_CONTEXT.md` (trust gate section added)
- [x] Week 1 PRD archived: `scripts/ralph/archive/p8-week1-foundation-completed-20260127.prd.json`

### Agents Running
- [x] quality-monitor.sh (PID: 10162) - Running since Mon11a.m.
- [x] prd-auditor.sh (PID: 10244) - Running since Mon11a.m.
- [x] test-runner.sh (PID: 10500) - Running since Mon11a.m.

### Git State
- [x] Branch exists: `ralph/coach-impact-visibility-p8-week1`
- [x] Week 1 commits present (US-P8-001, US-P8-002, US-P8-003, US-P8-004)
- [x] Working directory clean (all Week 1 work committed)

### Prerequisites
- [x] P8 Week 1 complete (US-P8-001, US-P8-003, US-P8-004 working)
- [x] US-P8-002 identified as needing fix (removed gates entirely)
- [x] Trust level system functional (P5-P7)
- [x] Admin UI patterns established (platform-admin pages)
- [x] All required tables exist (organization, member, coachOrgPreferences)

---

## 🎯 Week 1.5 Objectives

### Primary Goal
Fix US-P8-002 by implementing flexible 3-tier trust gate permission system while preserving trust level system functionality.

### Critical Issue
**US-P8-002 removed trust gates entirely:**
```typescript
// BEFORE (Week 1 - had trust gate)
if (currentLevel >= 2) {
  baseTabs.push({ id: "auto-sent", label: "Sent to Parents", icon: Send });
}

// AFTER Ralph's change (Week 1 - no gate at all)
baseTabs.push({ id: "auto-sent", label: "Sent to Parents", icon: Send });
```

**Impact**: ALL coaches (including Level 0-1) can see sent summaries, defeating trust system.

### Solution Architecture
Implement 3-tier permission hierarchy:
```
PLATFORM STAFF → Enable delegation capabilities
       ↓
ORG ADMINS → Set blanket override OR grant individual overrides
       ↓
COACHES → Request overrides if enabled
```

---

## 📋 Week 1.5 Stories (5 Stories)

### Story Breakdown

| ID | Title | Priority | Estimated Effort | Dependencies |
|----|-------|----------|------------------|--------------|
| US-P8-021 | Backend Trust Gate Permission System | 1 | 4-6 hours | None |
| US-P8-002-FIX | Fix Trust Gate Check in Dashboard | 2 | 1-2 hours | US-P8-021 |
| US-P8-022 | Platform Staff Feature Flags Admin UI | 3 | 3-4 hours | US-P8-021 |
| US-P8-022B | Platform Staff Overview Dashboard | 4 | 2-3 hours | US-P8-022 |
| US-P8-023 | Org Admin Trust Gate Status Dashboard | 5 | 3-4 hours | US-P8-021 |

**Total Estimated Time**: 13-19 hours (3-4 days for Ralph)

---

## 🏗️ Technical Overview

### Schema Changes

#### Extend `organization` Table
```typescript
// Master control
voiceNotesTrustGatesEnabled: v.optional(v.boolean()), // default: true

// Delegation controls
allowAdminDelegation: v.optional(v.boolean()),
allowCoachOverrides: v.optional(v.boolean()),

// Admin blanket override
adminOverrideTrustGates: v.optional(v.boolean()),
adminOverrideSetBy: v.optional(v.string()),
adminOverrideSetAt: v.optional(v.number()),
```

#### Extend `coachOrgPreferences` Table
```typescript
// Individual coach overrides
trustGateOverride: v.optional(v.boolean()),
overrideGrantedBy: v.optional(v.string()),
overrideGrantedAt: v.optional(v.number()),
overrideReason: v.optional(v.string()),
overrideExpiresAt: v.optional(v.number()),
```

#### NEW Tables
1. **orgAdminPermissions** - Track admin permissions
2. **coachOverrideRequests** - Override request workflow

### Key Queries
1. `areTrustGatesActive` - Core permission check (3-priority hierarchy)
2. `getOrgFeatureFlagStatus` - Org admin dashboard data
3. `getAllOrgsFeatureFlagStatus` - Platform staff overview
4. `getCoachOverrideRequests` - Pending requests list

### Key Mutations
1. `setPlatformFeatureFlags` - Platform staff control
2. `setAdminBlanketOverride` - Admin blanket toggle
3. `grantCoachOverride` - Individual coach override
4. `revokeCoachOverride` - Remove individual override
5. `requestCoachOverride` - Coach request workflow
6. `reviewCoachOverrideRequest` - Admin review

---

## 🎨 UI Components

### Platform Staff UI
- **Location**: `apps/web/src/app/platform-admin/feature-flags/page.tsx`
- **Features**:
  - Overview cards (4 metrics)
  - Organization table with toggle controls
  - Search and filter
  - Bulk actions
  - Real-time updates

### Org Admin UI
- **Location**: `apps/web/src/app/orgs/[orgId]/settings/features/page.tsx`
- **Features**:
  - Current status card
  - Admin blanket override toggle (if delegation enabled)
  - Overview stats (coaches, access, overrides)
  - Individual coach overrides table
  - Pending override requests section
  - Approve/deny workflow

### Voice Notes Dashboard Fix
- **Location**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`
- **Changes**:
  - Add `areTrustGatesActive` query call
  - Calculate `shouldShowSentToParents` with feature flags + trust level
  - Add locked button with tooltip when hidden
  - Preserve all existing functionality

---

## 🔍 Testing Strategy

### Backend Testing (US-P8-021)

**Permission Priority Tests** (run in Convex dashboard):
1. Individual override TRUE → gatesActive: false ✓
2. Admin blanket override TRUE → gatesActive: false ✓
3. Admin blanket override FALSE → gatesActive: true ✓
4. Org default TRUE → gatesActive: true ✓
5. Org default FALSE → gatesActive: false ✓

**Auth Tests**:
- Platform staff can set platform flags ✓
- Non-platform staff get error ✓
- Admin can set blanket override (if delegation enabled) ✓
- Non-admin gets error ✓
- Coach can request override (if overrides enabled) ✓

### Frontend Testing (US-P8-002-FIX)

**Tab Visibility Tests**:
1. Level 0 coach + gates ON → Tab hidden, locked button shows ✓
2. Level 0 coach + individual override → Tab visible ✓
3. Level 0 coach + admin blanket → Tab visible ✓
4. Level 2 coach + gates ON → Tab visible ✓
5. Tooltip shows correct message based on `gateStatus.source` ✓

### UI Testing (US-P8-022, US-P8-022B, US-P8-023)

**Platform Staff UI**:
- Overview cards show correct counts ✓
- Search filter works ✓
- Toggle admin delegation succeeds ✓
- Toggle coach overrides succeeds ✓
- Real-time updates work (two browser windows) ✓

**Org Admin UI**:
- Status card shows correct state ✓
- Blanket override hidden if delegation disabled ✓
- Blanket override works if delegation enabled ✓
- Individual overrides table displays correctly ✓
- Grant override button works ✓
- Revoke override button works ✓
- Approve request button works ✓
- Deny request button works ✓

---

## 🚨 Critical Patterns for Ralph

### 1. Index Usage (NEVER use .filter())
```typescript
// ✅ CORRECT
const prefs = await ctx.db
  .query("coachOrgPreferences")
  .withIndex("by_coach_org", q =>
    q.eq("coachId", coachId).eq("organizationId", orgId)
  )
  .first();

// ❌ WRONG - Never do this
const prefs = await ctx.db
  .query("coachOrgPreferences")
  .filter(q => q.eq(q.field("coachId"), coachId))
  .first();
```

### 2. Permission Priority (Individual > Blanket > Default)
```typescript
// Check in this order:
// 1. Individual coach override (highest priority)
if (coachPrefs?.trustGateOverride === true) {
  return { gatesActive: false, source: "coach_override" };
}

// 2. Admin blanket override
if (org?.adminOverrideTrustGates !== undefined) {
  return { gatesActive: !org.adminOverrideTrustGates, source: "admin_blanket" };
}

// 3. Org default (lowest priority)
return { gatesActive: org?.voiceNotesTrustGatesEnabled ?? true, source: "org_default" };
```

### 3. Auth Checks (Always verify permissions)
```typescript
// Platform staff check
const identity = await ctx.auth.getUserIdentity();
if (!identity?.isPlatformStaff) {
  throw new Error("Platform staff only");
}

// Admin check
const member = await ctx.db
  .query("member")
  .withIndex("by_org_user", q =>
    q.eq("organizationId", orgId).eq("userId", identity.subject)
  )
  .first();
if (!member || !["admin", "owner"].includes(member.role)) {
  throw new Error("Not authorized");
}

// Check delegation flag
const org = await ctx.db.get(orgId);
if (!org?.allowAdminDelegation) {
  throw new Error("Admin delegation not enabled");
}
```

### 4. Optional Fields (Support existing data)
```typescript
// Always use .optional() for new fields
voiceNotesTrustGatesEnabled: v.optional(v.boolean()),

// Provide defaults in query logic
const gatesEnabled = org?.voiceNotesTrustGatesEnabled ?? true;
```

### 5. Toast Notifications (Always show feedback)
```typescript
try {
  await mutation({ ... });
  toast.success("Action completed successfully");
} catch (error) {
  toast.error(`Failed: ${error.message}`);
}
```

---

## 📊 Migration Strategy

### Conservative Approach (Default: Gates ON)

**Philosophy**: Preserve existing behavior unless explicitly changed.

**Defaults**:
- `voiceNotesTrustGatesEnabled: undefined` → treated as `true` (gates ON)
- `allowAdminDelegation: undefined` → treated as `false` (delegation OFF)
- `allowCoachOverrides: undefined` → treated as `false` (overrides OFF)
- `adminOverrideTrustGates: undefined` → no blanket override
- `trustGateOverride: undefined` → no individual override

**Why Conservative**:
- Existing orgs maintain trust level system
- No surprise access changes
- Platform staff must explicitly enable features
- Admins must explicitly grant overrides

**Rollout Steps**:
1. Deploy schema changes (all optional)
2. Deploy backend queries/mutations
3. Deploy frontend UI
4. Platform staff enables delegation per org
5. Admins manage overrides within org

---

## 📝 Ralph Execution Plan

### Day 1: Backend Foundation (US-P8-021)
**Focus**: Schema + Queries + Mutations
- Extend organization and coachOrgPreferences schemas
- Create orgAdminPermissions and coachOverrideRequests tables
- Implement areTrustGatesActive query (core permission check)
- Implement platform/admin/coach mutations
- Test all queries in Convex dashboard
- Run codegen: `npx -w packages/backend convex codegen`

### Day 2: Dashboard Fix + Platform UI (US-P8-002-FIX, US-P8-022)
**Focus**: Fix removed gate + Platform staff UI
- Fix voice-notes-dashboard.tsx with feature flag check
- Create /platform-admin/feature-flags page
- Implement organization table with toggles
- Add search and filter
- Visual verification as platform staff

### Day 3: Platform Overview + Admin UI (US-P8-022B, US-P8-023)
**Focus**: Dashboards and admin controls
- Add overview cards to platform staff page
- Create /orgs/[orgId]/settings/features page
- Implement admin blanket override toggle
- Implement individual override management
- Implement override request review workflow
- Visual verification as org admin

### Day 4: Testing + Cleanup
**Focus**: End-to-end verification
- Complete all testing scenarios
- Verify permission priority works correctly
- Test override request workflow
- Run npm run check-types
- Run npx ultracite fix
- Update progress.txt with learnings
- Visual verification with multiple user types

---

## 🎓 Key Learnings from Week 1

### What Went Well
1. ✅ getCoachImpactSummary query works perfectly (6-table aggregation)
2. ✅ My Impact tab structure clean and extensible
3. ✅ Navigation integration smooth
4. ✅ Real-time updates work as expected

### What Needs Fixing
1. ⚠️ US-P8-002 removed gates entirely (Ralph interpreted "Remove" literally)
2. ⚠️ PRD story titles must be explicit about intent
3. ⚠️ Feature flag system should be designed BEFORE removing gates

### Pattern Improvements
1. 📚 Multi-table aggregation works well with proper index usage
2. 📚 Date range filtering in JS after fetch is performant
3. 📚 Loading/empty/error states are critical for UX
4. 📚 Always check `data === undefined` for loading state

---

## 🔗 Essential References

### Primary Architecture Documents
1. **`scripts/ralph/TRUST_GATE_ARCHITECTURE_V2.md`** - Complete design (schemas, queries, mutations, UI)
2. **`scripts/ralph/TRUST_GATE_MVP_VS_GROUPS.md`** - MVP approach rationale
3. **`scripts/ralph/P8_P9_COMPREHENSIVE_REFACTORING_PLAN.md`** - Full impact analysis

### Context Documents
4. **`scripts/ralph/P8_RALPH_CONTEXT.md`** - P1-P7 learnings + P8 patterns + Week 1.5 trust gate section
5. **`scripts/ralph/progress.txt`** - Week 1 summary + Week 1.5 context + codebase patterns
6. **`scripts/ralph/prd.json`** - Active Week 1.5 PRD

### Code References
7. `packages/backend/convex/models/coachTrustLevels.ts` - Trust level patterns
8. `packages/backend/convex/models/coachParentSummaries.ts` - Aggregation patterns
9. `apps/web/src/app/platform-admin/` - Platform staff UI patterns

---

## ✅ Success Criteria

### Backend (US-P8-021)
- [ ] Schema extensions deployed (all optional fields)
- [ ] areTrustGatesActive query returns correct results
- [ ] Permission priority works: Individual > Blanket > Default
- [ ] All mutations have proper auth checks
- [ ] Platform staff mutations work
- [ ] Admin mutations work (with delegation check)
- [ ] Coach mutations work (with overrides check)
- [ ] Codegen successful: `npx -w packages/backend convex codegen`

### Frontend (US-P8-002-FIX)
- [ ] Feature flag check added to dashboard
- [ ] Tab visibility respects gates + trust level
- [ ] Locked button shows when tab hidden
- [ ] Tooltip displays correct message
- [ ] All existing functionality preserved
- [ ] Type check passes: `npm run check-types`

### Platform Staff UI (US-P8-022, US-P8-022B)
- [ ] Feature flags page created
- [ ] Overview cards display correct metrics
- [ ] Organization table shows all orgs
- [ ] Toggle controls work (admin delegation, coach overrides)
- [ ] Search filter works
- [ ] Quick filters work (all, issues, recent)
- [ ] Real-time updates work
- [ ] Navigation link added to platform-admin layout

### Org Admin UI (US-P8-023)
- [ ] Features page created under org settings
- [ ] Status card shows current gate state
- [ ] Blanket override toggle visible (if delegation enabled)
- [ ] Blanket override toggle works
- [ ] Overview stats display correctly
- [ ] Individual overrides table displays
- [ ] Grant/revoke override buttons work
- [ ] Pending requests section displays
- [ ] Approve/deny request workflow works
- [ ] Navigation link added to org settings layout

### Quality Checks
- [ ] All type checks pass: `npm run check-types`
- [ ] All lint checks pass: `npx ultracite fix`
- [ ] Visual verification complete (platform staff, org admin, coaches)
- [ ] Permission priority tested in Convex dashboard
- [ ] Auth checks verified (unauthorized users get errors)
- [ ] Migration tested (existing orgs have gates ON by default)
- [ ] progress.txt updated with Week 1.5 learnings

---

## 🚀 Ralph Start Command

When ready to start Ralph:

```bash
cd /Users/neil/Documents/GitHub/PDP/scripts/ralph
./start-ralph.sh
```

Ralph will:
1. Read `prd.json` (Week 1.5 PRD)
2. Read `progress.txt` (Week 1 summary + Week 1.5 context)
3. Read `P8_RALPH_CONTEXT.md` (trust gate architecture)
4. Execute stories US-P8-021 through US-P8-023
5. Update progress.txt with learnings
6. Create commits with descriptive messages

---

## 📞 Monitoring Ralph

### Watch Progress
```bash
tail -f scripts/ralph/progress.txt
```

### Check Agent Feedback
```bash
tail -f scripts/ralph/agents/output/feedback.md
```

### View Git Activity
```bash
git log --oneline -10
```

### Monitor Quality
```bash
# Quality monitor output
cat scripts/ralph/agents/output/quality-monitor.log

# PRD auditor output
cat scripts/ralph/agents/output/prd-auditor.log

# Test runner output
cat scripts/ralph/agents/output/test-runner.log
```

---

## ⏱️ Estimated Timeline

**Start**: Day 1, Morning (After this checklist confirmed)
**End**: Day 4, Evening

### Daily Milestones
- **Day 1**: Backend complete (US-P8-021)
- **Day 2**: Dashboard fix + Platform UI (US-P8-002-FIX, US-P8-022)
- **Day 3**: Dashboards complete (US-P8-022B, US-P8-023)
- **Day 4**: Testing, cleanup, verification

**Total**: 3-4 days for Ralph execution

---

## 🎯 Next Steps After Week 1.5

Once Week 1.5 is complete:

1. **Verify Fix**: Confirm US-P8-002 fix works correctly
   - Test with Level 0/1/2+ coaches
   - Verify permission priority
   - Test override workflows

2. **User Communication**: Notify admins about new feature flag system
   - Platform staff can enable delegation
   - Admins can manage overrides
   - Coaches can request access

3. **Continue P8 Week 2**: My Impact Dashboard Components
   - US-P8-005: Summary cards
   - US-P8-006: Sent summaries section
   - US-P8-007: Applied insights section
   - US-P8-008: Team observations
   - US-P8-009 to US-P8-011: Additional features

4. **Monitor Usage**: Track adoption after 4-6 weeks
   - How many orgs enable delegation?
   - How many admins set overrides?
   - How many coaches request overrides?
   - Consider groups feature for Phase 2 (Post-P9) if data shows need

---

## ✅ READY TO RUN

All prerequisites complete. Ralph is ready to execute P8 Week 1.5.

**Status**: 🟢 READY
**Priority**: 🔴 HIGH (US-P8-002 fix critical)
**Confidence**: ✅ 100% (comprehensive documentation + learnings from Week 1)

---

**Created**: 27 January 2026
**By**: Claude Sonnet 4.5
**For**: Ralph (P8 Week 1.5 - Trust Gate Feature Flags)
