# UAT Test: US-P8-021 - Backend Trust Gate Permission System

> Auto-generated: 2026-01-27 20:35
> Status: ⏳ Pending Execution

## Story
As a backend developer, I need to create the complete permission system for trust gate feature flags so all three control tiers (Platform → Admin → Coach) can manage access.

## Acceptance Criteria Checklist

- [ ] Extend organization table with feature flag fields:
- [ ] voiceNotesTrustGatesEnabled: v.optional(v.boolean()) - Master switch, default true
- [ ] allowAdminDelegation: v.optional(v.boolean()) - Can admins manage gates?
- [ ] allowCoachOverrides: v.optional(v.boolean()) - Can coaches request bypass?
- [ ] adminOverrideTrustGates: v.optional(v.boolean()) - Admin blanket override
- [ ] adminOverrideSetBy: v.optional(v.string()) - Who set admin override
- [ ] adminOverrideSetAt: v.optional(v.number()) - When admin override was set
- [ ] Extend coachOrgPreferences table with override fields:
- [ ] trustGateOverride: v.optional(v.boolean()) - Individual coach bypass
- [ ] overrideGrantedBy: v.optional(v.string()) - Admin who granted
- [ ] overrideGrantedAt: v.optional(v.number()) - When granted
- [ ] overrideReason: v.optional(v.string()) - Why granted
- [ ] overrideExpiresAt: v.optional(v.number()) - Optional time-boxing
- [ ] Create NEW orgAdminPermissions table:
- [ ] organizationId: v.string()
- [ ] memberId: v.string() - Admin member ID
- [ ] canManageFeatureFlags: v.boolean()
- [ ] canManageCoachOverrides: v.boolean()
- [ ] grantedBy: v.string() - Platform staff who granted
- [ ] grantedAt: v.number()
- [ ] Index: by_org_member
- [ ] Create NEW coachOverrideRequests table:
- [ ] coachId: v.string()
- [ ] organizationId: v.string()
- [ ] featureType: v.string() - 'trust_gates' for now
- [ ] reason: v.string() - Coach's justification
- [ ] status: v.union(v.literal('pending'), v.literal('approved'), v.literal('denied'), v.literal('expired'))
- [ ] requestedAt: v.number()
- [ ] reviewedBy: v.optional(v.string()) - Admin who reviewed
- [ ] reviewedAt: v.optional(v.number())
- [ ] reviewNotes: v.optional(v.string()) - Admin's notes
- [ ] Index: by_coach_org, by_org_status
- [ ] Create packages/backend/convex/models/trustGatePermissions.ts with queries:
- [ ] 1. areTrustGatesActive query:
- [ ] Args: { coachId: v.string(), organizationId: v.string() }
- [ ] Returns: v.object({ gatesActive: v.boolean(), source: v.string(), reason: v.optional(v.string()) })
- [ ] Logic:
- [ ] - Check coachOrgPreferences.trustGateOverride === true → return { gatesActive: false, source: 'coach_override' }
- [ ] - Check org.adminOverrideTrustGates !== undefined → return { gatesActive: !org.adminOverrideTrustGates, source: 'admin_blanket' }
- [ ] - Return { gatesActive: org.voiceNotesTrustGatesEnabled ?? true, source: 'org_default' }
- [ ] 2. getOrgFeatureFlagStatus query:
- [ ] Args: { organizationId: v.string() }
- [ ] Returns: v.object({ org level fields, totalCoaches, coachesWithAccess, activeOverrides: v.array(...) })
- [ ] Aggregates: Count coaches with overrides, list all active overrides
- [ ] 3. getCoachOverrideRequests query:
- [ ] Args: { organizationId: v.string(), status: v.optional(v.string()) }
- [ ] Returns: v.array(v.object({ request fields, coachName, coachTrustLevel }))
- [ ] Use index: by_org_status (query by organizationId, filter by status in query if provided)
- [ ] 4. getAllOrgsFeatureFlagStatus query (platform staff):
- [ ] Args: {}
- [ ] Returns: v.array(v.object({ orgId, orgName, gatesEnabled, adminOverride, overridesCount, pendingRequestsCount, lastChangedBy, lastChangedAt }))
- [ ] Aggregates across all organizations
- [ ] Create packages/backend/convex/models/trustGatePermissions.ts with mutations:
- [ ] 1. setPlatformFeatureFlags mutation:
- [ ] Args: { organizationId: v.string(), allowAdminDelegation: v.optional(v.boolean()), allowCoachOverrides: v.optional(v.boolean()) }
- [ ] Auth: Requires isPlatformStaff === true
- [ ] Action: Update organization fields (only updates fields provided in args)
- [ ] 2. setOrgTrustGatesEnabled mutation:
- [ ] Args: { organizationId: v.string(), enabled: v.boolean() }
- [ ] Auth: Platform staff only
- [ ] Action: Update org.voiceNotesTrustGatesEnabled
- [ ] 3. setAdminBlanketOverride mutation:
- [ ] Args: { organizationId: v.string(), override: v.boolean() }
- [ ] Auth: Admin with org role + org.allowAdminDelegation === true
- [ ] Action: Update org.adminOverrideTrustGates, adminOverrideSetBy, adminOverrideSetAt
- [ ] 4. grantCoachOverride mutation:
- [ ] Args: { coachId: v.string(), organizationId: v.string(), reason: v.string(), expiresAt: v.optional(v.number()) }
- [ ] Auth: Admin with org role + org.allowCoachOverrides === true
- [ ] Action: Update coachOrgPreferences with override fields
- [ ] 5. revokeCoachOverride mutation:
- [ ] Args: { coachId: v.string(), organizationId: v.string() }
- [ ] Auth: Admin with org role
- [ ] Action: Set coachOrgPreferences.trustGateOverride = false
- [ ] 6. requestCoachOverride mutation:
- [ ] Args: { coachId: v.string(), organizationId: v.string(), reason: v.string() }
- [ ] Auth: Coach with org role + org.allowCoachOverrides === true
- [ ] Action: Create coachOverrideRequests record with status: 'pending'
- [ ] 7. reviewCoachOverrideRequest mutation:
- [ ] Args: { requestId: v.id('coachOverrideRequests'), approved: v.boolean(), reviewNotes: v.optional(v.string()) }
- [ ] Auth: Admin with org role
- [ ] Action: Update request status, if approved call grantCoachOverride
- [ ] All mutations include proper error handling and return typed results
- [ ] Type check passes: npm run check-types
- [ ] Run codegen: npx -w packages/backend convex codegen

## Test Scenarios

### Happy Path
1. Navigate to the feature
2. Perform the primary action described in the story
3. Verify all acceptance criteria are met
4. **Expected:** Feature works as described

### Edge Cases
1. Test with empty/null values
2. Test with boundary values
3. Test rapid repeated actions
4. **Expected:** Graceful handling, no errors

### Error Handling
1. Test with invalid inputs
2. Test without proper permissions
3. Test with network issues (if applicable)
4. **Expected:** Clear error messages, no crashes

## Visual Verification
- [ ] UI matches design expectations
- [ ] Responsive on mobile (if applicable)
- [ ] Loading states are appropriate
- [ ] Error states are user-friendly

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
