# Trust Gate Permission Architecture v2.0
**Date:** January 27, 2026
**Status:** Final Design
**Author:** Claude Sonnet 4.5

---

## Overview

3-tier permission system with dual admin controls (blanket + individual).

```
Platform Staff
    ↓ enables
Org Admins (if delegated)
    ├─→ Blanket: Gates ON/OFF for entire org
    └─→ Individual: Grant specific coaches bypass
        ↓
    Coaches (request individual bypass if enabled)
```

---

## Schema Design

### 1. Organization Settings (Platform Staff Control)

```typescript
// packages/backend/convex/betterAuth/schema.ts
const customOrganizationTable = defineTable({
  // ... existing fields ...

  // Trust Gate Feature Flag
  voiceNotesTrustGatesEnabled: v.optional(v.boolean()), // default: true

  // Delegation Controls
  allowAdminDelegation: v.optional(v.boolean()), // Can admins manage gates? default: false
  allowCoachOverrides: v.optional(v.boolean()), // Can coaches request bypass? default: false

  // Admin Override (Blanket Setting)
  // If admin is delegated, they can override org-wide setting
  adminOverrideTrustGates: v.optional(v.boolean()), // Overrides voiceNotesTrustGatesEnabled
  adminOverrideSetBy: v.optional(v.string()), // Admin user ID who set blanket override
  adminOverrideSetAt: v.optional(v.number()),
})
```

### 2. Individual Coach Overrides

```typescript
// Extend existing coachOrgPreferences table
coachOrgPreferences: defineTable({
  coachId: v.string(),
  organizationId: v.string(),

  // ... existing fields ...

  // Individual Coach Override
  trustGateOverride: v.optional(v.boolean()), // true = bypass gates, false/null = follow org
  overrideGrantedBy: v.optional(v.string()), // Admin or platform staff user ID
  overrideGrantedAt: v.optional(v.number()),
  overrideReason: v.optional(v.string()), // Why this coach got bypass
  overrideExpiresAt: v.optional(v.number()), // Optional: time-boxed access
})
```

### 3. Override Requests (Coach → Admin workflow)

```typescript
// New table for override request workflow
coachOverrideRequests: defineTable({
  coachId: v.string(),
  organizationId: v.string(),
  featureType: v.string(), // "trust_gates", future: "exports", "collaboration"

  reason: v.string(), // Coach's explanation
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("denied"),
    v.literal("expired")
  ),

  // Request details
  requestedAt: v.number(),

  // Admin response
  reviewedBy: v.optional(v.string()), // Admin user ID
  reviewedAt: v.optional(v.number()),
  adminNotes: v.optional(v.string()), // Admin's comment on approval/denial

  // If approved
  expiresAt: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_coach_org", ["coachId", "organizationId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_coach", ["coachId"])
```

---

## Permission Calculation Logic

### Decision Tree

```typescript
export const areTrustGatesActive = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    gatesActive: v.boolean(),
    source: v.string(), // Which rule determined the result
    canRequestOverride: v.boolean(),
    hasOverride: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    const coachPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // PRIORITY 1: Individual Coach Override (highest)
    if (coachPrefs?.trustGateOverride === true) {
      return {
        gatesActive: false,
        source: "coach_override",
        canRequestOverride: false, // Already has override
        hasOverride: true,
      };
    }

    // PRIORITY 2: Admin Blanket Override
    if (org?.adminOverrideTrustGates !== undefined) {
      return {
        gatesActive: !org.adminOverrideTrustGates, // Admin can turn gates OFF
        source: "admin_blanket",
        canRequestOverride: org?.allowCoachOverrides ?? false,
        hasOverride: false,
      };
    }

    // PRIORITY 3: Org Default Setting
    const gatesEnabled = org?.voiceNotesTrustGatesEnabled ?? true; // default: true

    return {
      gatesActive: gatesEnabled,
      source: "org_default",
      canRequestOverride: org?.allowCoachOverrides ?? false,
      hasOverride: false,
    };
  }
});
```

### Priority Hierarchy (Highest to Lowest)

1. **Individual Coach Override** (coachPrefs.trustGateOverride)
2. **Admin Blanket Override** (org.adminOverrideTrustGates)
3. **Org Default** (org.voiceNotesTrustGatesEnabled)

---

## User Flows

### Flow 1: Platform Staff Enables Admin Delegation

**Actors:** Platform Staff, Org Admin

1. Platform staff logs into `/platform-admin/feature-flags`
2. Finds org "Springfield GAA Club"
3. Toggles: **Allow Admin Delegation** = ON
4. (Optional) Toggles: **Allow Coach Overrides** = ON
5. Org admin receives notification: "You can now manage trust gates for your org"
6. Admin visits `/orgs/[orgId]/settings/features`
7. Admin sees:
   - Toggle: **Trust Gates** (blanket - affects all coaches)
   - Button: **Manage Coach Overrides** (individual)

---

### Flow 2: Admin Sets Blanket Override (Turn Gates OFF for Everyone)

**Actors:** Org Admin

1. Admin visits `/orgs/[orgId]/settings/features`
2. Sees current state: "Trust Gates: ON (coaches need Level 2+)"
3. Admin toggles: **Trust Gates OFF**
4. Confirmation modal: "This will allow ALL coaches to access gated features. Continue?"
5. Admin confirms
6. System updates: `org.adminOverrideTrustGates = true`
7. All coaches in org immediately gain access (real-time)
8. Success toast: "Trust gates disabled for all coaches"

---

### Flow 3: Admin Grants Individual Coach Override

**Actors:** Org Admin, Coach (Sarah)

1. Admin visits `/orgs/[orgId]/admin/coach-permissions`
2. Sees list of all coaches
3. Finds "Sarah Johnson" (Level 0)
4. Clicks "Grant Trust Gate Bypass"
5. Modal appears:
   - Reason (required): "Experienced coach from another club"
   - Expires (optional): Date picker (default: no expiry)
6. Admin submits
7. System updates Sarah's coachPrefs: `trustGateOverride = true`
8. Sarah immediately gains access
9. Sarah sees notification: "Your admin granted you access to advanced features"

---

### Flow 4: Coach Requests Override

**Actors:** Coach (John), Org Admin

1. John (Level 0) sees "Sent to Parents" tab is locked
2. Info card shows: "Available at Level 2+ | Request Access"
3. John clicks "Request Access"
4. Modal appears:
   - "Why do you need access?" (required)
   - John types: "I coach 3 teams and need to check parent engagement"
5. John submits request
6. System creates override request (status: pending)
7. John sees: "Request sent - your admin will review"
8. Admin receives notification
9. Admin visits `/orgs/[orgId]/admin/override-requests`
10. Admin reviews John's request
11. Admin approves with note: "Approved - experienced coach"
12. John's coachPrefs updated: `trustGateOverride = true`
13. John receives notification: "Access granted!"
14. John refreshes → "Sent to Parents" tab visible

---

### Flow 5: Admin Revokes Individual Override

**Actors:** Org Admin, Coach (Sarah)

1. Admin visits `/orgs/[orgId]/admin/coach-permissions`
2. Finds Sarah (shows badge: "Override Active")
3. Clicks "Revoke Access"
4. Confirmation: "Sarah will lose access to gated features. Continue?"
5. Admin confirms with reason: "Coach left organization"
6. System updates: Sarah's `trustGateOverride = false`
7. Sarah immediately loses access (real-time)
8. Next time Sarah loads page: "Sent to Parents" tab hidden again

---

## UI Components

### Platform Staff Admin UI

**Location:** `/platform-admin/feature-flags`

```typescript
interface OrgFeatureFlagsRow {
  orgId: string;
  orgName: string;
  orgLogo: string;

  // Master Control
  trustGatesEnabled: boolean;

  // Delegation Controls
  allowAdminDelegation: boolean;
  allowCoachOverrides: boolean;

  // Current State
  activeAdminOverride: boolean; // Is blanket override active?
  coachOverridesCount: number; // How many coaches have individual overrides?

  // Actions
  onToggleTrustGates: () => void;
  onToggleAdminDelegation: () => void;
  onToggleCoachOverrides: () => void;
}

function OrgFeatureFlagsTable({ orgs }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Organization</TableHead>
          <TableHead>Trust Gates</TableHead>
          <TableHead>Admin Delegation</TableHead>
          <TableHead>Coach Overrides</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orgs.map(org => (
          <TableRow key={org.orgId}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar src={org.orgLogo} />
                <span>{org.orgName}</span>
              </div>
            </TableCell>
            <TableCell>
              <Switch
                checked={org.trustGatesEnabled}
                onCheckedChange={org.onToggleTrustGates}
              />
              <span className="text-xs">
                {org.trustGatesEnabled ? "ON" : "OFF"}
              </span>
            </TableCell>
            <TableCell>
              <Switch
                checked={org.allowAdminDelegation}
                onCheckedChange={org.onToggleAdminDelegation}
              />
              <span className="text-xs">
                {org.allowAdminDelegation ? "Yes" : "No"}
              </span>
            </TableCell>
            <TableCell>
              <Switch
                checked={org.allowCoachOverrides}
                onCheckedChange={org.onToggleCoachOverrides}
              />
              <span className="text-xs">
                {org.allowCoachOverrides ? "Yes" : "No"}
              </span>
            </TableCell>
            <TableCell>
              {org.activeAdminOverride && (
                <Badge variant="warning">Admin Override Active</Badge>
              )}
              {org.coachOverridesCount > 0 && (
                <Badge variant="info">
                  {org.coachOverridesCount} coach overrides
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### Org Admin Settings UI

**Location:** `/orgs/[orgId]/settings/features`

```typescript
function TrustGateSettings() {
  const org = useQuery(api.models.organizations.getOrganization, { orgId });
  const updateOrg = useMutation(api.models.organizations.updateOrgSettings);

  const canManage = org?.allowAdminDelegation === true;
  const blanketOverride = org?.adminOverrideTrustGates;

  if (!canManage) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Platform Staff Only</AlertTitle>
        <AlertDescription>
          Contact platform staff to manage trust gate settings for your organization.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Gate Settings</CardTitle>
        <CardDescription>
          Control access to advanced features based on coach trust levels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blanket Override Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Trust Gates</Label>
            <p className="text-sm text-muted-foreground">
              {blanketOverride === true
                ? "Disabled - all coaches have access"
                : "Enabled - coaches need Level 2+ for gated features"}
            </p>
          </div>
          <Switch
            checked={blanketOverride !== true}
            onCheckedChange={async (checked) => {
              await updateOrg({
                orgId,
                adminOverrideTrustGates: !checked, // Inverted logic
              });
            }}
          />
        </div>

        <Separator />

        {/* Individual Coach Overrides */}
        <div>
          <Button
            variant="outline"
            onClick={() => router.push(`/orgs/${orgId}/admin/coach-permissions`)}
          >
            Manage Individual Coach Overrides
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Grant specific coaches access while keeping gates enabled for others
          </p>
        </div>

        {/* Preview */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Current State</AlertTitle>
          <AlertDescription>
            {blanketOverride === true ? (
              "All coaches can access: Sent to Parents tab, My Impact dashboard"
            ) : (
              "Only Level 2+ coaches can access gated features (unless individual override granted)"
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
```

---

### Coach Permissions Management

**Location:** `/orgs/[orgId]/admin/coach-permissions`

```typescript
function CoachPermissionsPage() {
  const coaches = useQuery(api.models.teams.getOrgCoaches, { orgId });
  const grantOverride = useMutation(api.models.coachOrgPreferences.grantOverride);
  const revokeOverride = useMutation(api.models.coachOrgPreferences.revokeOverride);

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Coach Permissions</h1>
          <p className="text-muted-foreground">
            Manage individual coach access to gated features
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          ← Back to Settings
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Coach</TableHead>
            <TableHead>Trust Level</TableHead>
            <TableHead>Override Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coaches?.map(coach => (
            <TableRow key={coach.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar>
                    {coach.firstName[0]}{coach.lastName[0]}
                  </Avatar>
                  <div>
                    <p className="font-medium">{coach.firstName} {coach.lastName}</p>
                    <p className="text-xs text-muted-foreground">{coach.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={coach.trustLevel >= 2 ? "success" : "warning"}>
                  Level {coach.trustLevel}
                </Badge>
              </TableCell>
              <TableCell>
                {coach.hasOverride ? (
                  <Badge variant="info">Override Active</Badge>
                ) : coach.trustLevel >= 2 ? (
                  <span className="text-xs text-muted-foreground">
                    Full access (Level 2+)
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Restricted (Level {coach.trustLevel})
                  </span>
                )}
              </TableCell>
              <TableCell>
                {coach.hasOverride ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevokeOverride(coach.id)}
                  >
                    Revoke Access
                  </Button>
                ) : coach.trustLevel < 2 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGrantOverride(coach.id)}
                  >
                    Grant Override
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No action needed
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### Override Request Review

**Location:** `/orgs/[orgId]/admin/override-requests`

```typescript
function OverrideRequestsPage() {
  const requests = useQuery(
    api.models.coachOverrideRequests.getPendingRequests,
    { orgId }
  );
  const approveRequest = useMutation(
    api.models.coachOverrideRequests.approveRequest
  );
  const denyRequest = useMutation(
    api.models.coachOverrideRequests.denyRequest
  );

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Override Requests</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({requests?.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {requests?.pending.map(request => (
            <Card key={request._id} className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {request.coachName[0]}
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {request.coachName}
                      </CardTitle>
                      <CardDescription>
                        Requested {formatDistanceToNow(request.requestedAt, { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge>Trust Level {request.coachTrustLevel}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label className="text-xs text-muted-foreground">
                    Reason for Request:
                  </Label>
                  <p className="mt-1">{request.reason}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      await approveRequest({ requestId: request._id });
                      toast.success("Override granted");
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await denyRequest({ requestId: request._id });
                      toast.success("Request denied");
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {requests?.pending.length === 0 && (
            <EmptyState
              icon={CheckCircle}
              title="No pending requests"
              description="All override requests have been reviewed"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Coach Override Request UI

**Location:** Embedded in voice-notes-dashboard.tsx when tab is hidden

```typescript
function TrustGateLockedCard({ feature }: { feature: string }) {
  const { data: session } = useSession();
  const coachId = session?.user?.userId || session?.user?.id;
  const orgId = useParams().orgId;

  const gateStatus = useQuery(
    api.models.trustGatePermissions.areTrustGatesActive,
    { coachId, organizationId: orgId }
  );

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reason, setReason] = useState("");
  const requestOverride = useMutation(
    api.models.coachOverrideRequests.createRequest
  );

  const handleSubmitRequest = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      await requestOverride({
        coachId,
        organizationId: orgId,
        featureType: "trust_gates",
        reason,
      });

      toast.success("Request sent to your admin");
      setShowRequestModal(false);
      setReason("");
    } catch (error) {
      toast.error("Failed to send request");
    }
  };

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {feature} Feature Locked
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            This feature is available at Trust Level 2+
          </p>

          {gateStatus?.canRequestOverride && (
            <Button
              variant="outline"
              onClick={() => setShowRequestModal(true)}
            >
              Request Access
            </Button>
          )}

          {!gateStatus?.canRequestOverride && (
            <p className="text-xs text-muted-foreground">
              Continue reviewing summaries to reach Level 2
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Access</DialogTitle>
            <DialogDescription>
              Tell your admin why you need early access to this feature
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Example: I coach 3 teams and need to check parent engagement stats"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRequestModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest}>
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Backend Mutations

### Grant Individual Override

```typescript
// packages/backend/convex/models/coachOrgPreferences.ts

export const grantOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("coachOrgPreferences"),
  handler: async (ctx, args) => {
    const admin = await authComponent.safeGetAuthUser(ctx);
    if (!admin) throw new Error("Not authenticated");

    // Verify admin has permission
    const adminPerms = await ctx.db
      .query("orgAdminPermissions")
      .withIndex("by_admin_org", q =>
        q.eq("adminUserId", admin.userId || admin._id)
         .eq("organizationId", args.organizationId)
      )
      .first();

    if (!adminPerms?.canGrantCoachOverrides) {
      throw new Error("Not authorized to grant overrides");
    }

    // Find or create coach preferences
    let prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId)
         .eq("organizationId", args.organizationId)
      )
      .first();

    if (prefs) {
      // Update existing
      await ctx.db.patch(prefs._id, {
        trustGateOverride: true,
        overrideGrantedBy: admin.userId || admin._id,
        overrideGrantedAt: Date.now(),
        overrideReason: args.reason,
        overrideExpiresAt: args.expiresAt,
      });
      return prefs._id;
    } else {
      // Create new
      return await ctx.db.insert("coachOrgPreferences", {
        coachId: args.coachId,
        organizationId: args.organizationId,
        trustGateOverride: true,
        overrideGrantedBy: admin.userId || admin._id,
        overrideGrantedAt: Date.now(),
        overrideReason: args.reason,
        overrideExpiresAt: args.expiresAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
});
```

### Revoke Individual Override

```typescript
export const revokeOverride = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await authComponent.safeGetAuthUser(ctx);
    if (!admin) throw new Error("Not authenticated");

    // Verify admin has permission
    const adminPerms = await ctx.db
      .query("orgAdminPermissions")
      .withIndex("by_admin_org", q =>
        q.eq("adminUserId", admin.userId || admin._id)
         .eq("organizationId", args.organizationId)
      )
      .first();

    if (!adminPerms?.canGrantCoachOverrides) {
      throw new Error("Not authorized to revoke overrides");
    }

    const prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", q =>
        q.eq("coachId", args.coachId)
         .eq("organizationId", args.organizationId)
      )
      .first();

    if (prefs) {
      await ctx.db.patch(prefs._id, {
        trustGateOverride: false,
        overrideGrantedBy: undefined,
        overrideGrantedAt: undefined,
        overrideReason: undefined,
        overrideExpiresAt: undefined,
      });
    }

    return null;
  }
});
```

### Set Blanket Override (Admin)

```typescript
// packages/backend/convex/models/organizations.ts

export const updateOrgSettings = mutation({
  args: {
    orgId: v.string(),
    adminOverrideTrustGates: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await authComponent.safeGetAuthUser(ctx);
    if (!admin) throw new Error("Not authenticated");

    // Verify admin has permission
    const adminPerms = await ctx.db
      .query("orgAdminPermissions")
      .withIndex("by_admin_org", q =>
        q.eq("adminUserId", admin.userId || admin._id)
         .eq("organizationId", args.orgId)
      )
      .first();

    const org = await ctx.db.get(args.orgId);

    if (!org?.allowAdminDelegation || !adminPerms?.canManageTrustGates) {
      throw new Error("Not authorized to manage trust gates");
    }

    await ctx.db.patch(args.orgId, {
      adminOverrideTrustGates: args.adminOverrideTrustGates,
      adminOverrideSetBy: admin.userId || admin._id,
      adminOverrideSetAt: Date.now(),
    });

    return null;
  }
});
```

---

## Testing Matrix

| Platform Staff | Org Setting | Admin Blanket | Coach Override | Trust Level | Expected Result |
|----------------|-------------|---------------|----------------|-------------|-----------------|
| Gates ON | - | - | - | Level 0 | Tab HIDDEN |
| Gates ON | - | - | - | Level 2 | Tab VISIBLE |
| Gates ON | Delegated | OFF (blanket) | - | Level 0 | Tab VISIBLE |
| Gates ON | Delegated | OFF (blanket) | - | Level 2 | Tab VISIBLE |
| Gates ON | Delegated | ON | Individual YES | Level 0 | Tab VISIBLE |
| Gates ON | Delegated | ON | - | Level 0 | Tab HIDDEN |
| Gates OFF | - | - | - | Level 0 | Tab VISIBLE |
| Gates OFF | - | - | - | Level 2 | Tab VISIBLE |

---

## Summary

This architecture provides:

1. **Platform Staff**: Master controls + delegation toggles
2. **Org Admins** (if delegated):
   - **Blanket control**: Turn gates OFF for entire org
   - **Individual control**: Grant specific coaches bypass
3. **Coaches** (if enabled): Request individual bypass

**Key Benefits:**
- Maximum flexibility (3 levels of control)
- Dual admin levers (blanket + individual)
- Clear permission hierarchy
- Audit trail at every level
- Scalable to future features

**Next:** Create Week 1.5 PRD for Ralph to implement this system.

