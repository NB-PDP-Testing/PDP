# Phase 8 & 9 Comprehensive Refactoring Plan
**Date:** January 27, 2026
**Status:** Draft for Review
**Author:** Claude Sonnet 4.5

---

## Executive Summary

This document provides a comprehensive refactoring plan for Phase 8 (Coach Impact Visibility) and Phase 9 (Team Collaboration Hub) based on the trust gate feature flag architecture discussion.

**Key Findings:**
1. **P8 Week 1 already implemented** - US-P8-002 REMOVED trust gates entirely (needs reverting)
2. **Trust gates need 3-tier permission system** - Platform → Org Admin → Coach
3. **P8 has 20 stories**, P9 has 30 stories - several need permission considerations
4. **Opportunity for unified permission framework** across features

---

## Part 1: Trust Gate Feature Flag System

### Architecture Overview

**3-Tier Permission Hierarchy:**
```
Platform Staff (global)
    ↓ delegates to
Org Admins (per org)
    ↓ grants to
Individual Coaches (per coach, per org)
```

### Schema Changes Required

#### 1. Organization Table Extension
```typescript
// packages/backend/convex/betterAuth/schema.ts
const customOrganizationTable = defineTable({
  // ... existing fields ...

  // Feature Flags (P8)
  voiceNotesTrustGatesEnabled: v.optional(v.boolean()), // default: true
  allowTrustGateAdminDelegation: v.optional(v.boolean()), // Can admins manage gates? default: false
  allowCoachGateOverrides: v.optional(v.boolean()), // Can admins grant coach overrides? default: false

  // Future Feature Flags (P9+)
  collaborationFeaturesEnabled: v.optional(v.boolean()), // Comments, reactions, etc.
  sessionTemplatesEnabled: v.optional(v.boolean()),
})
```

#### 2. New Table: orgAdminPermissions
```typescript
// packages/backend/convex/schema.ts
orgAdminPermissions: defineTable({
  adminUserId: v.string(), // Better Auth user ID
  organizationId: v.string(),

  // Trust Gate Management
  canManageTrustGates: v.optional(v.boolean()), // Can toggle org-level gates
  canGrantCoachOverrides: v.optional(v.boolean()), // Can grant individual coach overrides

  // Future Permissions (P9)
  canManageCollaboration: v.optional(v.boolean()),
  canManageTemplates: v.optional(v.boolean()),

  // Audit
  grantedBy: v.string(), // Platform staff user ID
  grantedAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_admin_org", ["adminUserId", "organizationId"])
  .index("by_org", ["organizationId"])
```

#### 3. Coach Preferences Extension
```typescript
// Extend existing coachOrgPreferences table
coachOrgPreferences: defineTable({
  // ... existing fields ...

  // Trust Gate Override
  trustGateOverride: v.optional(
    v.union(
      v.literal("follow_org"),     // Use org setting (default)
      v.literal("always_disabled") // Full access granted by admin
    )
  ),
  overrideGrantedBy: v.optional(v.string()), // Admin user ID
  overrideGrantedAt: v.optional(v.number()),
  overrideReason: v.optional(v.string()), // Why override was granted
})
```

### Backend Queries Required

#### Check Trust Gate Status
```typescript
// packages/backend/convex/models/trustGatePermissions.ts (NEW FILE)

export const areTrustGatesActive = query({
  args: {
    coachId: v.string(),
    organizationId: v.string()
  },
  returns: v.object({
    gatesActive: v.boolean(),
    reason: v.string(), // "org_default" | "coach_override" | "feature_disabled"
    canRequestOverride: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // 1. Check coach override (highest priority)
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    if (coachPrefs?.trustGateOverride === "always_disabled") {
      return {
        gatesActive: false,
        reason: "coach_override",
        canRequestOverride: false, // Already has override
      };
    }

    // 2. Check org-level setting
    const org = await ctx.db.get(args.organizationId);
    const gatesEnabled = org?.voiceNotesTrustGatesEnabled ?? true; // default: true

    // 3. Check if coach can request override
    const canRequestOverride = org?.allowCoachGateOverrides ?? false;

    return {
      gatesActive: gatesEnabled,
      reason: "org_default",
      canRequestOverride,
    };
  }
});

export const requestCoachOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
  },
  returns: v.string(), // Request ID
  handler: async (ctx, args) => {
    // Create override request for admin review
    const requestId = await ctx.db.insert("overrideRequests", {
      coachId: args.coachId,
      organizationId: args.organizationId,
      featureType: "trust_gates",
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    // TODO: Notify org admins with canGrantCoachOverrides permission

    return requestId;
  }
});
```

### Migration Strategy

**For EXISTING organizations (conservative):**
```sql
-- All existing orgs default to gates ENABLED (preserves current behavior)
UPDATE organization
SET voiceNotesTrustGatesEnabled = true,
    allowTrustGateAdminDelegation = false,
    allowCoachGateOverrides = false
WHERE voiceNotesTrustGatesEnabled IS NULL;
```

**For NEW organizations:**
- Default: `voiceNotesTrustGatesEnabled = true` (gates active by default)
- Platform staff can customize per-org during onboarding

---

## Part 2: Phase 8 Impact Analysis

### Stories Requiring Changes

#### 🔴 US-P8-002: Remove Trust Level Gate → REPLACE WITH FEATURE FLAG CHECK

**Current Status:** ✅ COMPLETED (Ralph already removed gate entirely)

**Problem:** Gate was completely removed - ALL coaches can now see "Sent to Parents" tab regardless of org settings.

**Required Changes:**
1. **Revert commit f4190553** (or modify the change)
2. **Replace with feature flag check:**

```typescript
// BEFORE (current - P8 Week 1 completed):
baseTabs.push({
  id: "auto-sent",
  label: "Sent to Parents",
  icon: Send,
});

// AFTER (with feature flags):
const gateStatus = useQuery(
  api.models.trustGatePermissions.areTrustGatesActive,
  { coachId, organizationId: orgId }
);

const shouldShowSentToParents =
  !gateStatus?.gatesActive || // Gates disabled
  trustLevel?.currentLevel >= 2; // Or level 2+

if (shouldShowSentToParents) {
  baseTabs.push({
    id: "auto-sent",
    label: "Sent to Parents",
    icon: Send,
  });
}

// Add info tooltip if hidden
{!shouldShowSentToParents && (
  <Tooltip content="Available at Trust Level 2, or ask your admin for access">
    <Button variant="ghost" disabled>
      <Lock className="h-4 w-4 mr-2" />
      Sent to Parents
    </Button>
  </Tooltip>
)}
```

**New Priority:** URGENT (Week 1.5 - fix before Week 2 starts)

---

#### 🟡 US-P8-004: My Impact Tab Navigation → ADD ROLE-BASED VISIBILITY

**Current:** Tab visible to ALL coaches + platform staff

**Enhancement:** Consider org-level flag for My Impact dashboard

```typescript
// Org setting (optional enhancement):
organization: {
  coachImpactDashboardEnabled: v.optional(v.boolean()), // default: true
}

// Component check:
const hasCoachRole = member?.functionalRoles?.includes("Coach");
const isPlatformStaff = user?.isPlatformStaff;
const impactDashboardEnabled = org?.coachImpactDashboardEnabled ?? true;

const canSeeMy Impact = (hasCoachRole || isPlatformStaff) && impactDashboardEnabled;
```

**Priority:** OPTIONAL (future enhancement, not critical for Week 1-3)

---

#### 🟡 US-P8-018: Export Impact Report → ADD ORG-LEVEL CONTROL

**Enhancement:** Allow orgs to disable export features

```typescript
organization: {
  allowDataExports: v.optional(v.boolean()), // default: true
}

// In My Impact tab:
{org?.allowDataExports !== false && (
  <Button onClick={handleExport}>Export Report</Button>
)}
```

**Priority:** OPTIONAL (nice-to-have for data-sensitive orgs)

---

### New Stories Required for P8

#### US-P8-021: Backend Trust Gate Permission System

**As a** backend developer
**I want to** implement the trust gate permission checking system
**So that** orgs can control feature visibility via feature flags

**Acceptance Criteria:**
- [ ] Create `packages/backend/convex/models/trustGatePermissions.ts`
- [ ] Implement `areTrustGatesActive` query
- [ ] Implement `requestCoachOverride` mutation
- [ ] Extend organization schema with feature flags
- [ ] Extend coachOrgPreferences with override fields
- [ ] Create orgAdminPermissions table
- [ ] Add migration for existing orgs (set gates = true)
- [ ] Type check passes
- [ ] Test queries in Convex dashboard

**Priority:** 1 (CRITICAL - blocks all other trust gate work)
**Week:** 1.5 (insert between Week 1 and Week 2)

---

#### US-P8-022: Platform Staff Feature Flags Admin UI

**As a** platform staff member
**I want to** manage org-level feature flags
**So that** I can enable/disable trust gates per organization

**Acceptance Criteria:**
- [ ] Create `/platform-admin/feature-flags` page
- [ ] Page lists all organizations
- [ ] Each org row shows:
  - Org name and logo
  - Toggle: Trust Gates Enabled (✅/❌)
  - Toggle: Allow Admin Delegation (✅/❌)
  - Toggle: Allow Coach Overrides (✅/❌)
- [ ] Toggles save immediately with optimistic updates
- [ ] Search/filter orgs by name
- [ ] Bulk actions: "Enable for all", "Disable for all"
- [ ] Audit log showing who changed what and when
- [ ] Type check passes
- [ ] Visual verification: Toggles work, changes persist

**Files to Create:**
- `apps/web/src/app/platform-admin/feature-flags/page.tsx`
- `apps/web/src/app/platform-admin/feature-flags/components/org-feature-list.tsx`

**Priority:** 2 (HIGH - enables platform staff control)
**Week:** 1.5 or 2

---

#### US-P8-023: Org Admin Feature Flags Settings Page

**As an** org admin
**I want to** toggle trust gates for my organization
**So that** I can customize coach access (if platform staff delegated permission)

**Acceptance Criteria:**
- [ ] Add "Feature Flags" section to `/orgs/[orgId]/settings`
- [ ] Section only visible if `allowTrustGateAdminDelegation = true`
- [ ] Section shows:
  - Toggle: Trust Gates Enabled
  - Info text: "Controls whether coaches need Level 2+ for certain features"
  - Preview: List of affected features
- [ ] If admin doesn't have `canManageTrustGates` permission:
  - Show disabled toggle with message: "Contact platform staff to manage this"
- [ ] Toggle saves immediately
- [ ] Show success toast
- [ ] Type check passes
- [ ] Visual verification: Toggle works, saves correctly

**Priority:** 3 (MEDIUM - org admin self-service)
**Week:** 2 or 3

---

#### US-P8-024: Coach Override Request UI

**As a** coach
**I want to** request an override to access gated features
**So that** I don't need to wait for Level 2+ if my admin approves

**Acceptance Criteria:**
- [ ] When trust gate hides a feature, show info card
- [ ] Info card shows:
  - Lock icon
  - Message: "This feature is available at Trust Level 2+"
  - Button: "Request Access" (if `allowCoachGateOverrides = true`)
- [ ] Clicking "Request Access" opens modal
- [ ] Modal has:
  - Text area: "Why do you need access?"
  - Submit button: "Send Request to Admin"
- [ ] Submitting creates override request
- [ ] Show success toast: "Request sent - your admin will review"
- [ ] After request submitted, button changes to: "Request Pending"
- [ ] Type check passes
- [ ] Visual verification: Modal works, request submitted

**Priority:** 4 (MEDIUM - coach self-service)
**Week:** 3

---

#### US-P8-025: Admin Override Management UI

**As an** org admin
**I want to** review and approve coach override requests
**So that** I can grant access to trusted coaches

**Acceptance Criteria:**
- [ ] Add "Override Requests" page: `/orgs/[orgId]/admin/override-requests`
- [ ] Page lists pending requests
- [ ] Each request shows:
  - Coach name and avatar
  - Feature requested: "Trust Gate Bypass"
  - Reason provided by coach
  - Request date
  - Actions: Approve | Deny
- [ ] Approving:
  - Updates coach preferences: `trustGateOverride = "always_disabled"`
  - Records who approved and when
  - Sends notification to coach (toast or email)
- [ ] Denying:
  - Marks request as denied
  - Optional: Text area for denial reason
- [ ] Show approved/denied history
- [ ] Type check passes
- [ ] Visual verification: Approve/deny works, coach sees changes

**Priority:** 5 (MEDIUM - admin workflow)
**Week:** 3

---

## Part 3: Phase 9 Impact Analysis

### Stories Requiring Permission Considerations

#### 🟡 US-P9-007: InsightComments UI → ADD PERMISSION CHECK

**Enhancement:** Control who can comment on insights

**Org-level flag:**
```typescript
organization: {
  collaborationFeaturesEnabled: v.optional(v.boolean()), // default: true
  whoCanComment: v.optional(
    v.union(
      v.literal("all_coaches"), // Any coach in org
      v.literal("team_coaches"), // Only coaches assigned to this team
      v.literal("disabled") // Comments disabled
    )
  ),
}
```

**Component change:**
```typescript
const canComment =
  org?.collaborationFeaturesEnabled !== false &&
  (org?.whoCanComment === "all_coaches" || isTeamCoach);

{canComment ? (
  <CommentForm insightId={insightId} />
) : (
  <p className="text-sm text-muted-foreground">
    Comments disabled by your organization
  </p>
)}
```

**Priority:** OPTIONAL (P9 Week 1 or Week 2 enhancement)

---

#### 🟡 US-P9-009: InsightReactions → ADD PERMISSION CHECK

**Similar to comments:** Control who can react

```typescript
const canReact =
  org?.collaborationFeaturesEnabled !== false &&
  isTeamCoach;

{canReact && <InsightReactions insightId={insightId} />}
```

**Priority:** OPTIONAL (same as comments)

---

#### 🟡 US-P9-020: Session Templates → ADD ORG-LEVEL CONTROL

**Enhancement:** Allow orgs to disable or customize templates

```typescript
organization: {
  sessionTemplatesEnabled: v.optional(v.boolean()), // default: true
  customTemplates: v.optional(v.array(v.any())), // Org-specific templates
}

// In component:
const templates = org?.customTemplates ?? DEFAULT_TEMPLATES;
const templatesEnabled = org?.sessionTemplatesEnabled ?? true;

{templatesEnabled && (
  <SessionTemplates templates={templates} />
)}
```

**Priority:** OPTIONAL (P9 Week 3 or 4 enhancement)

---

### New Stories for P9 (Optional Enhancements)

#### US-P9-031: Collaboration Feature Flags Backend

**As a** backend developer
**I want to** implement permission checks for collaboration features
**So that** orgs can control comments, reactions, and activity feed visibility

**Acceptance Criteria:**
- [ ] Extend organization schema with collaboration flags
- [ ] Create `getCollaborationPermissions` query
- [ ] Query returns: `canComment`, `canReact`, `canViewActivity`
- [ ] Permissions based on: org settings + user role + team assignment
- [ ] Type check passes

**Priority:** OPTIONAL (P9 enhancement)
**Week:** P9 Week 2 or post-P9

---

#### US-P9-032: Platform Staff Collaboration Controls

**As a** platform staff member
**I want to** enable/disable collaboration features per org
**So that** we can roll out features gradually

**Acceptance Criteria:**
- [ ] Add toggles to feature flags admin page
- [ ] Toggles: Collaboration Enabled, Session Templates Enabled
- [ ] Bulk enable/disable
- [ ] Audit log

**Priority:** OPTIONAL (P9 enhancement)
**Week:** P9 Week 2 or post-P9

---

## Part 4: Unified Permission Framework

### Concept: Hierarchical Feature Flags

**Vision:** Create a scalable permission system that works for all features

```typescript
// Unified schema approach
featurePermissions: defineTable({
  organizationId: v.string(),
  featureName: v.string(), // "trust_gates", "collaboration", "exports", etc.
  enabled: v.boolean(),

  // Delegation
  allowAdminControl: v.boolean(),
  allowCoachOverrides: v.boolean(),

  // Granular controls
  settings: v.any(), // Feature-specific settings JSON

  updatedBy: v.string(),
  updatedAt: v.number(),
})
  .index("by_org_feature", ["organizationId", "featureName"])
```

**Benefits:**
1. Single source of truth for all feature flags
2. Consistent permission checking logic
3. Easy to add new features
4. Audit trail built-in
5. Admin UI reusable across features

**Implementation Timeline:**
- Post-P9 (architectural refactor)
- Would require migrating existing flags to new schema
- Worth considering if we add 3+ more feature flag types

---

## Part 5: Implementation Roadmap

### Phase 8 Week 1.5: Trust Gate Fix (URGENT)

**Duration:** 2-3 days
**Priority:** CRITICAL

**Stories:**
1. US-P8-021: Backend permission system
2. Modify US-P8-002: Replace removed gate with feature flag check
3. US-P8-022: Platform staff admin UI (basic version)

**Testing:**
- Verify existing orgs have gates enabled by default
- Verify Level 0-1 coaches no longer see "Sent to Parents" tab (unless org disabled gates)
- Verify platform staff can toggle gates per org
- Verify Level 2+ coaches still see tab regardless of gates

**Migration Steps:**
1. Deploy backend schema changes + migration
2. Deploy platform staff admin UI
3. Announce to users: "Trust gate behavior restored - contact platform staff if your org needs custom settings"

---

### Phase 8 Week 2-3: Continue as Planned

**No major changes required** for Week 2-3 stories (dashboard components, navigation)

**Optional additions:**
- US-P8-023: Org admin settings (if time permits)
- US-P8-024 & US-P8-025: Coach override workflow (nice-to-have)

---

### Phase 9: Add Collaboration Permissions (Optional)

**If implementing:**
- US-P9-031 during P9 Week 1 (alongside comment/reaction backend)
- US-P9-032 during P9 Week 2 (admin UI)

**If NOT implementing:**
- Proceed with P9 as written - all features available to all coaches
- Document as future enhancement

---

## Part 6: User Communication Plan

### For Coaches

**Email subject:** "Voice Notes Feature Update - Trust Level Access Restored"

**Body:**
> Hi [Coach Name],
>
> We recently updated the Voice Notes system to give all coaches access to the "Sent to Parents" tab, regardless of trust level. After reviewing with our team, we're reverting to the trust level system to ensure data quality and safety.
>
> **What this means for you:**
> - Level 2+ coaches: No changes - you'll continue to have full access
> - Level 0-1 coaches: The "Sent to Parents" tab will require Level 2+ access (same as before)
> - **NEW**: Your organization admin can now grant you access if needed
>
> **Why we made this change:**
> The trust level system helps ensure data quality and safety. As you approve more summaries, you'll automatically progress to Level 2+.
>
> **Need access sooner?**
> Contact your organization admin - they can grant you early access if you have a specific need.
>
> Questions? Reply to this email or contact support.

### For Platform Staff

**Internal memo:**
> **Trust Gate Feature Flags - Implementation Complete**
>
> We've implemented a 3-tier permission system for trust gates:
> 1. Platform Staff → can enable/disable per org
> 2. Org Admins → can manage if delegated permission
> 3. Coaches → can request overrides if org allows
>
> **New Admin UI:** `/platform-admin/feature-flags`
>
> **Default settings:**
> - All existing orgs: Gates ENABLED (preserves current behavior)
> - New orgs: Gates ENABLED (can be changed during onboarding)
>
> **When to disable gates for an org:**
> - Small, trusted coaching staff (5-10 coaches max)
> - Private/family clubs where coaches know all families
> - Request from org owner with valid justification
>
> **When to keep gates enabled:**
> - Large organizations (50+ coaches)
> - Youth sports orgs with parent data privacy concerns
> - New organizations (until we assess coaching staff quality)

---

## Part 7: Testing Strategy

### Trust Gate Feature Flag Testing

#### Test Matrix

| Org Setting | Coach Level | Admin Delegated? | Coach Override? | Expected Result |
|-------------|-------------|------------------|-----------------|-----------------|
| Gates ON | Level 0 | No | No | Tab HIDDEN |
| Gates ON | Level 0 | No | Yes (granted) | Tab VISIBLE |
| Gates ON | Level 2 | - | - | Tab VISIBLE |
| Gates OFF | Level 0 | - | - | Tab VISIBLE |
| Gates OFF | Level 2 | - | - | Tab VISIBLE |

#### Test Scenarios

**Scenario 1: Default Behavior (Gates ON)**
1. Create new org → verify gates enabled by default
2. Add Level 0 coach → verify "Sent to Parents" tab hidden
3. Coach progresses to Level 2 → verify tab appears

**Scenario 2: Platform Staff Disables Gates**
1. Platform staff toggles off gates for org
2. Level 0 coach logs in → verify tab visible
3. Platform staff toggles on gates → verify tab hidden again

**Scenario 3: Coach Override Request**
1. Org has `allowCoachGateOverrides = true`
2. Level 0 coach sees "Request Access" button
3. Coach submits request with reason
4. Admin approves request
5. Coach refreshes → tab visible
6. Verify override persists across sessions

**Scenario 4: Migration**
1. Run migration on existing orgs
2. Verify all orgs have `voiceNotesTrustGatesEnabled = true`
3. Verify existing Level 2+ coaches still see tabs
4. Verify existing Level 0-1 coaches tab behavior unchanged

---

## Part 8: Risk Assessment

### Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing coach workflows | HIGH | MEDIUM | Thorough testing, staged rollout |
| Admin confusion about flags | MEDIUM | HIGH | Clear documentation, training materials |
| Permission drift (inconsistent states) | MEDIUM | LOW | Audit logging, regular reviews |
| Performance impact (extra queries) | LOW | LOW | Cache permission checks, optimize indexes |
| Coaches frustrated by hidden features | MEDIUM | MEDIUM | Clear messaging, easy override request process |

### Mitigation Details

**Breaking workflows:**
- Keep migration conservative (gates ON by default)
- Announce change 1 week before deployment
- Provide rollback plan (disable gates for all orgs if critical issues)

**Admin confusion:**
- Create video tutorial showing feature flag UI
- Add in-app tooltips explaining each setting
- Provide support scripts for common questions

**Permission drift:**
- Add audit log to feature flags page
- Weekly report: "Orgs with gates disabled"
- Quarterly review with platform staff

---

## Part 9: Future Enhancements

### Post-P9 Feature Flag Improvements

1. **Role-Based Feature Access**
   - Define features per role (coach, parent, admin)
   - Example: "Exports" feature only for owner/admin roles

2. **Time-Boxed Overrides**
   - Coach override expires after 30 days
   - Must re-request if still needed
   - Prevents "forgot to revoke" issues

3. **Feature Usage Analytics**
   - Track which features are used most per org
   - Identify orgs with disabled features but usage attempts (show demand)
   - Help platform staff advise orgs on optimal settings

4. **Gradual Rollout System**
   - Enable features for X% of orgs automatically
   - A/B test new features before full launch
   - Rollback if issues detected

5. **Organization Templates**
   - "Youth Sports Template": strict gates, limited exports
   - "Professional Club Template": relaxed gates, full features
   - "Family Club Template": all features enabled, minimal restrictions

6. **Coach Self-Certification**
   - Coach completes training module → bypass Level 0-1 gates
   - Alternative path to Level 2 without waiting for approvals
   - Reduces admin overhead

---

## Part 10: Recommendations

### Immediate Actions (Week 1.5)

1. **✅ Implement US-P8-021 (Backend)**
   - Priority: CRITICAL
   - Time estimate: 1 day
   - Risk: Low (well-defined schema changes)

2. **✅ Modify US-P8-002 (Frontend Fix)**
   - Priority: CRITICAL
   - Time estimate: 2-3 hours
   - Risk: Low (targeted change)

3. **✅ Implement US-P8-022 (Platform Staff UI - MVP)**
   - Priority: HIGH
   - Time estimate: 1 day
   - Risk: Medium (new UI, needs testing)

**Total Week 1.5 Time:** 2-3 days

### Short-Term (P8 Week 2-3)

1. **Optional: US-P8-023 (Org Admin UI)**
   - If time permits after Week 2 dashboard work
   - Lower priority - platform staff can manage manually

2. **Optional: US-P8-024 & US-P8-025 (Coach Override Flow)**
   - Nice-to-have for coach self-service
   - Can be post-P8 enhancement

### Medium-Term (P9)

1. **Decide: Collaboration Feature Flags?**
   - If YES: Add US-P9-031 & US-P9-032
   - If NO: Document as post-P9 enhancement

2. **Monitor: Coach Feedback on Trust Gates**
   - Collect data: How many orgs request disabling gates?
   - Iterate on permissions based on actual usage

### Long-Term (Post-P9)

1. **Unified Permission Framework**
   - Evaluate after 3+ feature flag types exist
   - Design comprehensive system
   - Plan migration from current approach

2. **Advanced Features**
   - Time-boxed overrides
   - Usage analytics
   - Self-certification pathway

---

## Conclusion

The trust gate feature flag system provides a flexible, scalable foundation for managing feature access across organizations. By implementing a 3-tier permission hierarchy (Platform → Admin → Coach), we give platform staff ultimate control while allowing delegation to trusted org admins and individual coach overrides.

**Key Takeaways:**
1. **P8 Week 1 needs urgent fix** - US-P8-002 removed gates entirely
2. **3-tier system balances control and flexibility**
3. **Conservative migration** (gates ON) preserves current behavior
4. **P9 impact minimal** - can add collaboration permissions later
5. **Foundation for future features** - reusable permission framework

**Next Steps:**
1. Review and approve this refactoring plan
2. Create Week 1.5 JSON PRD for Ralph (3 stories)
3. Deploy backend + migration
4. Deploy platform staff admin UI
5. Communicate changes to users
6. Monitor for issues and iterate

---

**Document Status:** Ready for Review
**Estimated Implementation:** 2-3 days (Week 1.5) + ongoing enhancements
**Risk Level:** MEDIUM (well-scoped changes, conservative migration)

