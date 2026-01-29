# Trust Gate Permissions: MVP vs Groups Approach
**Date:** January 27, 2026
**Author:** Claude Sonnet 4.5

---

## Quick Answer

**MVP Approach (Current): ✅ PERFECT**
- Blanket override (all coaches)
- Individual overrides (per coach)
- Simple, flexible, covers 90% of use cases

**Groups (Future Phase 2): 🟡 WAIT**
- Adds significant complexity
- Overlaps with existing role system
- Better to validate MVP first, then add if needed

---

## MVP Approach (Recommended for Week 1.5)

### What's Included

1. **Platform Staff Controls**
   - Master ON/OFF per org
   - Enable/disable admin delegation
   - Enable/disable coach override requests
   - **Overview dashboard** (NEW)

2. **Org Admin Controls**
   - Blanket override (turn gates OFF for all)
   - Individual overrides (grant specific coaches)
   - **Override status dashboard** (NEW)
   - Review coach override requests

3. **Coach Self-Service**
   - Request override from admin
   - View own override status

### Why This Works

**Covers all common scenarios:**

✅ **Small Club (8 coaches):** Admin uses blanket override → one click, all coaches get access

✅ **Medium Club (20 coaches, mixed experience):** Admin grants 5 experienced coaches individual overrides, keeps gates for newbies

✅ **Large Club (50+ coaches):** Keep gates ON, handle individual exceptions via request workflow

✅ **Coach-Initiated:** Experienced coach joins, requests early access, admin approves

### Strengths

1. **Simple mental model** - Only 2 levers (blanket + individual)
2. **Flexible** - Works for clubs of any size
3. **Audit-friendly** - Clear who granted what and why
4. **Quick to implement** - 2-3 days for Week 1.5
5. **No breaking changes** - Can add groups later

### Limitations

1. **Manual individual management** - Admin grants one-by-one (not a huge issue for <50 coaches)
2. **No policy-based automation** - Can't say "Auto-grant Level 1+ coaches" (but could add later)

---

## Groups Approach (Phase 2 - Post-P9)

### Concept

Create permission groups that coaches can be assigned to:

```
Group: "Senior Coaches"
└─ Members: Sarah, Mike, Emma, John
└─ Permissions: Trust Gate Bypass = YES

Group: "Probationary Coaches"
└─ Members: New hires
└─ Permissions: Trust Gate Bypass = NO (follow org default)

Group: "Youth Coaches"
└─ Members: U6-U12 coaches
└─ Permissions: Trust Gate Bypass = YES (need parent engagement)
```

### How It Would Work

**Admin workflow:**
1. Create group: "Experienced Coaches"
2. Set group permission: Trust Gate Bypass = YES
3. Add coaches to group
4. All group members automatically get override
5. Remove coach from group → override revoked

**Schema:**
```typescript
coachPermissionGroups: defineTable({
  organizationId: v.string(),
  name: v.string(), // "Senior Coaches", "Youth Team Leads"
  description: v.string(),

  // Permissions granted to this group
  trustGateBypass: v.boolean(),
  // Future: more granular permissions
  canExportData: v.optional(v.boolean()),
  canManageTemplates: v.optional(v.boolean()),

  createdBy: v.string(),
  createdAt: v.number(),
})

coachGroupMemberships: defineTable({
  coachId: v.string(),
  organizationId: v.string(),
  groupId: v.id("coachPermissionGroups"),

  addedBy: v.string(),
  addedAt: v.number(),
})
  .index("by_coach_org", ["coachId", "organizationId"])
  .index("by_group", ["groupId"])
```

### Advantages

1. **Scalability** - Easier to manage 50+ coaches
2. **Policy-based** - Clear rules ("All senior coaches bypass")
3. **Bulk operations** - Change group permission → affects all members
4. **Semantic clarity** - Groups have meaningful names
5. **Future-proof** - Can add more granular permissions per group

### Disadvantages

1. **Complexity** - More moving parts (groups, memberships, inheritance)
2. **UI overhead** - Need group management pages
3. **Conflicts** - What if coach in multiple groups with different permissions?
4. **Overlap with roles** - We already have functional roles (Coach, Admin, Parent)
5. **Learning curve** - Admins need to understand group concept

### Conflicts to Resolve

**Scenario:** Coach is in 2 groups:
- Group A: Trust Gate Bypass = YES
- Group B: Trust Gate Bypass = NO

**Resolution options:**
1. **Most permissive wins** - YES overrides NO (simpler)
2. **Most restrictive wins** - NO overrides YES (safer)
3. **First group wins** - Based on join order
4. **Admin must resolve** - Show warning, force choice

**Recommendation:** Most permissive wins (encourages granting access thoughtfully)

---

## Comparison: MVP vs Groups

| Feature | MVP (Individual) | Groups |
|---------|------------------|--------|
| **Setup Time** | 2-3 days | 1-2 weeks |
| **Complexity** | Low | Medium-High |
| **Scalability** | Good (<50 coaches) | Excellent (100+ coaches) |
| **Flexibility** | High (per-coach control) | Medium (policy-based) |
| **Audit Trail** | Clear (who granted what) | More complex (groups + members) |
| **Mental Model** | Simple (blanket + individual) | Requires understanding groups |
| **Conflicts** | None | Possible (multi-group membership) |
| **Role Overlap** | No overlap | Some (groups ≈ roles?) |

---

## Real-World Use Cases

### Use Case 1: Small Family Club (10 coaches)

**MVP Approach:**
- Admin uses blanket override
- Done in 5 seconds

**Groups Approach:**
- Create "All Coaches" group
- Add 10 coaches to group
- Set group permission
- Overhead: unnecessary complexity

**Winner:** MVP ✅

---

### Use Case 2: Large Youth Club (60 coaches, mixed experience)

**MVP Approach:**
- Keep gates ON
- 15 experienced coaches request override
- Admin reviews and grants individually
- Takes 30 minutes (2 minutes per coach)

**Groups Approach:**
- Create "Senior Coaches" group
- Add 15 coaches to group
- Set group permission
- Takes 10 minutes
- Future changes easier (add to group vs individual grant)

**Winner:** Groups 🏆 (but MVP still workable)

---

### Use Case 3: Professional Club (30 coaches, high turnover)

**MVP Approach:**
- Grant individual overrides as coaches join
- Revoke when coaches leave
- Manual tracking needed

**Groups Approach:**
- Create "Active Staff" group
- Add new hires to group automatically
- Remove on exit → permission revoked
- Better automation

**Winner:** Groups 🏆

---

## Recommendation: Phased Approach

### Phase 1 (Week 1.5 - MVP): Individual Overrides ✅

**Implement:**
1. Platform staff controls + overview
2. Admin blanket override
3. Admin individual overrides
4. Coach request workflow
5. Status dashboards

**Why:** Covers 90% of use cases, simple, fast to implement

**Time:** 2-3 days

---

### Phase 1.5 (Post-P8, Before P9): Gather Data 📊

**Monitor:**
- How many orgs use blanket vs individual overrides?
- What's the average number of individual overrides per org?
- Do admins request bulk management features?
- What are common override reasons? (Could become group names)

**Decision criteria:**
- If 5+ orgs have 20+ individual overrides → consider groups
- If admins report "too much manual work" → consider groups
- If most orgs have <10 overrides → stick with MVP

**Time:** 4-6 weeks of observation

---

### Phase 2 (Post-P9, If Needed): Add Groups 🚀

**Implement if:**
- Data shows need for bulk management
- 3+ orgs with 30+ coaches request feature
- Admin feedback: "Individual management is tedious"

**Design:**
1. Simple groups (no nesting)
2. Most permissive wins (conflict resolution)
3. Groups are additive (don't replace individual overrides)
4. Optional migration: "Convert your 15 overrides to 'Senior Coaches' group?"

**Time:** 1-2 weeks

---

## Alternative: Hybrid Approach (Best of Both)

### Concept

Support BOTH individual overrides AND groups in Phase 2:

```
Coach Permission Sources (in priority order):
1. Individual override (coach-specific)
2. Group membership (inherited from groups)
3. Org default (blanket setting)
```

**Example:**
- Org default: Gates ON
- Coach Sarah: In "Senior Coaches" group (bypass = YES)
- Coach John: Individual override (bypass = NO - blocked for policy violation)
- Coach Mike: No override, not in group (follows org default)

**Result:**
- Sarah: Access (group grants)
- John: Blocked (individual override supersedes everything)
- Mike: Restricted (follows org default)

### Why Hybrid Works

1. **Graceful evolution** - Start with individual, add groups later
2. **No breaking changes** - Existing individual overrides still work
3. **Maximum flexibility** - Use groups for bulk, individual for exceptions
4. **Admin choice** - Small clubs ignore groups, large clubs use them

### Migration Path

**Week 1.5 (MVP):**
- Individual overrides only

**Post-P9 (Add groups):**
- Groups become available
- Admin can create groups
- Individual overrides still work exactly as before
- Admin can optionally migrate: "Convert 15 individual overrides to 'Senior Coaches' group?"

**No disruption!**

---

## Overview Dashboard Design

### Platform Staff View

**Location:** `/platform-admin/feature-flags/overview`

```typescript
interface OrgTrustGateStatus {
  orgId: string;
  orgName: string;

  // Org settings
  gatesEnabled: boolean;
  adminCanManage: boolean;
  coachesCanRequest: boolean;

  // Current state
  adminBlanketOverride: boolean | null;
  individualOverridesCount: number;
  pendingRequestsCount: number;

  // Activity
  lastChangedBy: string;
  lastChangedAt: number;

  // Impact
  affectedCoachesCount: number; // How many coaches benefit from overrides
}

function TrustGateOverviewDashboard() {
  const orgs = useQuery(api.models.trustGatePermissions.getOverviewForPlatformStaff);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orgs?.length}</div>
            <p className="text-xs text-muted-foreground">Total orgs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gates Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orgs?.filter(o => !o.gatesEnabled || o.adminBlanketOverride).length}
            </div>
            <p className="text-xs text-muted-foreground">Orgs with full access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Individual Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orgs?.reduce((sum, o) => sum + o.individualOverridesCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total coaches with bypass</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orgs?.reduce((sum, o) => sum + o.pendingRequestsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting admin review</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overrides</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Last Changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs?.map(org => (
                <TableRow key={org.orgId}>
                  <TableCell>{org.orgName}</TableCell>
                  <TableCell>
                    {!org.gatesEnabled ? (
                      <Badge variant="secondary">Gates OFF (Platform)</Badge>
                    ) : org.adminBlanketOverride ? (
                      <Badge variant="warning">Gates OFF (Admin Override)</Badge>
                    ) : (
                      <Badge variant="default">Gates ON</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.individualOverridesCount > 0 ? (
                      <Badge variant="info">{org.individualOverridesCount} coaches</Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {org.pendingRequestsCount > 0 ? (
                      <Badge variant="outline">{org.pendingRequestsCount} pending</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {org.lastChangedBy}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(org.lastChangedAt, { addSuffix: true })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Org Admin View

**Location:** `/orgs/[orgId]/settings/features` (enhanced)

```typescript
function TrustGateStatusDashboard() {
  const overview = useQuery(
    api.models.trustGatePermissions.getOrgOverview,
    { orgId }
  );

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Trust Gate Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Current State</p>
              <p className="text-sm text-muted-foreground">
                {overview?.adminBlanketOverride
                  ? "Gates disabled - all coaches have access"
                  : "Gates enabled - Level 2+ required"}
              </p>
            </div>
            {overview?.adminBlanketOverride ? (
              <Badge variant="warning" className="text-lg px-4 py-2">
                DISABLED
              </Badge>
            ) : (
              <Badge variant="default" className="text-lg px-4 py-2">
                ENABLED
              </Badge>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{overview?.totalCoaches}</div>
              <p className="text-xs text-muted-foreground">Total Coaches</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{overview?.coachesWithAccess}</div>
              <p className="text-xs text-muted-foreground">With Access</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{overview?.individualOverrides}</div>
              <p className="text-xs text-muted-foreground">Individual Overrides</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Overrides List */}
      {overview?.overrides && overview.overrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Overrides ({overview.overrides.length})</CardTitle>
            <CardDescription>Coaches with individual bypass permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.overrides.map(override => (
                <div
                  key={override.coachId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {override.coachName[0]}
                    </Avatar>
                    <div>
                      <p className="font-medium">{override.coachName}</p>
                      <p className="text-xs text-muted-foreground">
                        Level {override.trustLevel} • Granted {formatDistanceToNow(override.grantedAt, { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        "{override.reason}"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">Active</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeOverride(override.coachId)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {overview?.pendingRequests && overview.pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Requests ({overview.pendingRequests.length})
            </CardTitle>
            <CardDescription>Coaches requesting bypass permission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.pendingRequests.map(request => (
                <div
                  key={request.requestId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{request.coachName}</p>
                    <p className="text-sm text-muted-foreground">
                      "{request.reason}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDistanceToNow(request.requestedAt, { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequest(request.requestId)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDenyRequest(request.requestId)}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Final Recommendation

### For Week 1.5 (MVP) ✅

**Implement:**
1. ✅ Individual overrides (blanket + per-coach)
2. ✅ Overview dashboards (platform staff + org admin)
3. ✅ Request/approval workflow
4. ✅ Status visibility at all levels

**Don't implement:**
- ❌ Groups (too complex for MVP)
- ❌ Policy-based automation
- ❌ Advanced analytics

**Rationale:**
- Covers 90% of use cases
- Simple, fast, reliable
- Easy to understand
- Room to add groups later

**Time:** 2-3 days

---

### For Phase 2 (Post-P9) 🔮

**Decision point:** After 4-6 weeks of MVP usage

**Add groups IF:**
1. 5+ orgs have 20+ individual overrides
2. Admins report manual work is tedious
3. Clear patterns emerge (e.g., "All senior coaches need bypass")

**Approach:**
- Hybrid model (groups + individual)
- Most permissive wins
- Optional migration tool
- No breaking changes

**Time:** 1-2 weeks when needed

---

## Conclusion

**MVP approach is perfect for Week 1.5.** It's simple, flexible, and covers the vast majority of use cases. The overview dashboards provide essential visibility.

Groups are a great **future enhancement** but add significant complexity. Better to validate the MVP first, gather real usage data, then add groups if there's demonstrated need.

**Next step:** Create Week 1.5 PRD with overview dashboards included.

