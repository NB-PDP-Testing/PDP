# P8 Self-Service Access Control - Implementation Summary

**Date**: 2026-01-27
**Status**: ✅ Backend Complete, Frontend Needed

---

## ✅ What Was Implemented

### 1. Database Schema Updates

**Better Auth Organization Table** (`betterAuth/schema.ts`):
- Added `adminBlanketBlock: v.optional(v.boolean())` - Block ALL coaches
- Added `adminBlanketBlockSetBy: v.optional(v.string())` - Who set the block
- Added `adminBlanketBlockSetAt: v.optional(v.number())` - When blocked

**Coach Org Preferences Table** (`schema.ts`):
- Added `parentAccessEnabled: v.optional(v.boolean())` - Coach self-service toggle (default true)
- Added `adminBlocked: v.optional(v.boolean())` - Admin blocked this coach
- Added `blockReason: v.optional(v.string())` - Why admin blocked
- Added `blockedBy: v.optional(v.string())` - Who blocked
- Added `blockedAt: v.optional(v.number())` - When blocked

### 2. New Backend Query

**`checkCoachParentAccess`** - Comprehensive access check with 8-priority logic:

```typescript
// Usage
const access = await ctx.runQuery(api.models.trustGatePermissions.checkCoachParentAccess, {
  coachId: currentUser._id,
  organizationId: orgId,
});

// Returns
{
  hasAccess: boolean,      // Can coach see "Sent to Parents" tab?
  reason: string,          // Why/why not?
  canRequest: boolean,     // Can coach request access?
  canToggle: boolean,      // Can coach toggle on/off?
}
```

**Priority Logic** (highest to lowest):
1. **Admin blanket block** → ❌ No access (blocks EVERYONE including Level 2)
2. **Individual admin block** → ❌ No access (this coach specifically blocked)
3. **Coach self-disabled** → ❌ No access (coach chose to hide, CAN toggle back on)
4. **Gates disabled** → ✅ Access (platform staff disabled system-wide)
5. **Admin blanket override** → ✅ Access (admin granted all coaches)
6. **Trust Level 2+** → ✅ Access (earned access)
7. **Individual override** → ✅ Access (admin approved coach request)
8. **Default** → ❌ No access

### 3. New Backend Mutations

**For Org Admins:**

**`setAdminBlanketBlock`** - Block/unblock ALL coaches
```typescript
await ctx.runMutation(api.models.trustGatePermissions.setAdminBlanketBlock, {
  organizationId: orgId,
  blocked: true, // or false to unblock
});
```

**`blockIndividualCoach`** - Block specific coach
```typescript
await ctx.runMutation(api.models.trustGatePermissions.blockIndividualCoach, {
  organizationId: orgId,
  coachId: userId,
  reason: "Coach requested to not handle parent communication",
});
```

**`unblockIndividualCoach`** - Unblock specific coach
```typescript
await ctx.runMutation(api.models.trustGatePermissions.unblockIndividualCoach, {
  organizationId: orgId,
  coachId: userId,
});
```

**For Coaches:**

**`toggleCoachParentAccess`** - Coach self-service on/off
```typescript
await ctx.runMutation(api.models.trustGatePermissions.toggleCoachParentAccess, {
  organizationId: orgId,
  enabled: false, // Hide tab
});
// Later...
await ctx.runMutation(api.models.trustGatePermissions.toggleCoachParentAccess, {
  organizationId: orgId,
  enabled: true, // Show tab again
});
```

---

## 📋 How The Complete System Works

### **Platform Staff** (`/platform/feature-flags`)

Controls what orgs and coaches CAN do:

| Toggle | Effect |
|--------|--------|
| **Gates Enabled** | ON = Trust system active<br>OFF = Everyone gets access |
| **Admin Delegation** | ON = Org admin can manage<br>OFF = No admin controls |
| **Coach Overrides** | ON = Coaches can request & self-manage<br>OFF = No coach self-service |

---

### **Org Admin** (`/orgs/[orgId]/admin/settings/features`)

**IF Admin Delegation is ON**, admin can:

**Bulk Controls:**
- **Blanket Override (Grant All)** - Turn ON: All coaches get access
- **Blanket Block (Block All)** - Turn ON: All coaches lose access (even Level 2!)

**Individual Controls:**
- **Grant Access** - Turn ON individual coach (creates override)
- **Block Access** - Turn OFF individual coach

**Review Requests:**
- View pending coach requests
- Approve/deny with reason

**Status Display:**
Coach list shows:
- ✅ **Active** - Has access and using it
- ✅ **Approved** - Has access via override, can toggle
- 🚫 **Blocked** - Admin blocked
- 👤 **Self-Off** - Coach chose to disable (can't admin-override)

---

### **Coach** (Voice Notes Dashboard)

**IF Coach Overrides is ON** and coach doesn't have access yet:
- See locked "Sent to Parents" tab
- Click "Request Access" button
- Submit with optional reason
- Wait for admin approval

**AFTER approved** (or if Level 2+ or has override):
- **Self-service toggle** in tab dropdown OR settings
- Turn OFF: Tab hidden (approval still valid)
- Turn ON: Tab reappears (no new request needed)

**IF Admin blocked coach**:
- Cannot toggle back on
- See message: "Admin blocked your access"

---

## 🎯 Complete User Flows

### Flow 1: Coach Requests Access

1. **Coach** (Level 0/1, no override)
   - Sees locked "Sent to Parents" tab
   - Clicks → "Request Access"
   - Enters reason: "I need to send summaries to parents"
   - Submits
   - Status: "Pending approval..."

2. **Org Admin** (has delegation enabled)
   - Goes to `/orgs/{orgId}/admin/settings/features`
   - Sees "Pending Requests" section
   - Reviews request from coach
   - Clicks "Approve"
   - Sets expiration: 90 days
   - Adds note: "Approved for parent communication"

3. **Coach** (receives notification)
   - Toast: "Your access request was approved!"
   - "Sent to Parents" tab now visible
   - Can send parent summaries

4. **Coach** (later, wants to temporarily hide)
   - Clicks dropdown on "Sent to Parents" tab
   - Selects "Hide this tab"
   - Tab hidden

5. **Coach** (even later, wants it back)
   - Goes to Settings tab
   - Toggles "Show Sent to Parents" to ON
   - Tab reappears immediately (no new request!)

---

### Flow 2: Admin Blocks Coach

1. **Org Admin** (wants to block coach)
   - Goes to feature flags page
   - Sees "Individual Coach Access" table
   - Finds John Smith (Level 2, currently Active)
   - Clicks "Block"
   - Confirms: "Block access for John Smith?"
   - Enters reason: "Coach requested to not handle parents"
   - Clicks "Block Access"

2. **Coach** (John Smith, next time they load)
   - "Sent to Parents" tab hidden
   - Sees message: "Admin blocked your access"
   - Cannot toggle back on

3. **Org Admin** (later, wants to unblock)
   - Finds John Smith in table (status: Blocked)
   - Clicks "Unblock"
   - John regains access

---

### Flow 3: Admin Bulk Block

1. **Org Admin** (needs to disable for everyone temporarily)
   - Goes to feature flags page
   - Sees "Override All Coaches" section
   - Toggles "Block All" to ON
   - Confirms: "⚠️ This will block ALL coaches..."
   - All coaches lose access immediately

2. **Coaches** (all coaches, including Level 2+)
   - "Sent to Parents" tab hidden
   - See message: "Admin has disabled parent communication for all coaches"

3. **Org Admin** (ready to re-enable)
   - Toggles "Block All" to OFF
   - Coaches regain access based on normal rules (Level 2, overrides, etc.)

---

## 🔄 Access Priority Matrix

| Coach Status | Blanket Block | Individual Block | Self-Disabled | Trust Level 2+ | Override | Access? |
|--------------|---------------|------------------|---------------|----------------|----------|---------|
| Any | ✅ | - | - | - | - | ❌ |
| Any | ❌ | ✅ | - | - | - | ❌ |
| Any | ❌ | ❌ | ✅ | - | - | ❌ |
| Any | ❌ | ❌ | ❌ | ✅ | - | ✅ |
| Any | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Any | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key Points**:
- Blanket block > everything (even Level 2)
- Individual block > trust level
- Coach self-disabled can be toggled back on
- Admin block cannot be overridden by coach

---

## 🚧 Frontend Work Needed

### 1. Org Admin Page Updates

**File**: `apps/web/src/app/orgs/[orgId]/admin/settings/features/page.tsx`

**Add Bulk Block Toggle**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Override All Coaches</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Existing: Blanket Override (Grant All) */}
    <div className="flex items-center justify-between">
      <Label>Grant All Coaches Access</Label>
      <Switch
        checked={blanketOverride}
        onCheckedChange={handleBlanketOverride}
      />
    </div>

    {/* NEW: Blanket Block */}
    <div className="flex items-center justify-between">
      <Label>Block All Coaches</Label>
      <Switch
        checked={blanketBlock}
        onCheckedChange={handleBlanketBlock}
      />
    </div>
    <p className="text-muted-foreground text-sm">
      ⚠️ Block overrides all individual settings
    </p>
  </CardContent>
</Card>
```

**Add Individual Coach Controls Table**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Individual Coach Access</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Coach Name</TableHead>
          <TableHead>Trust Level</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coaches.map(coach => (
          <TableRow key={coach.id}>
            <TableCell>{coach.name}</TableCell>
            <TableCell>Level {coach.trustLevel}</TableCell>
            <TableCell>
              {coach.adminBlocked && <Badge variant="destructive">🚫 Blocked</Badge>}
              {coach.parentAccessEnabled === false && <Badge>👤 Self-Off</Badge>}
              {coach.hasAccess && <Badge variant="success">✓ Active</Badge>}
            </TableCell>
            <TableCell>
              {coach.adminBlocked ? (
                <Button size="sm" onClick={() => unblock(coach.id)}>
                  Unblock
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => block(coach.id)}
                >
                  Block
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

---

### 2. Coach Self-Service Toggle

**Option A: Tab Dropdown** (Recommended)

File: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// In tab rendering
<TabsList>
  {/* Other tabs... */}
  {showSentToParentsTab && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TabsTrigger value="sent-to-parents" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Sent to Parents
          <ChevronDown className="h-3 w-3" />
        </TabsTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => toggleAccess(false)}
        >
          Hide this tab
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</TabsList>
```

**Option B: Settings Tab Toggle**

File: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

```tsx
<Card>
  <CardHeader>
    <CardTitle>Parent Communication Access</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Label>Show "Sent to Parents" Tab</Label>
        <p className="text-muted-foreground text-sm">
          You can hide this tab if you prefer not to see parent summaries
        </p>
      </div>
      <Switch
        checked={parentAccessEnabled}
        onCheckedChange={handleToggle}
      />
    </div>
  </CardContent>
</Card>
```

---

### 3. Coach Request Access Button

**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

When coach has no access but CAN request:

```tsx
{!hasAccess && canRequest && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Lock className="h-5 w-5" />
        Parent Communication Locked
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        This feature requires Trust Level 2 or admin approval.
      </p>
      <Button
        onClick={() => setRequestDialogOpen(true)}
        className="mt-4"
      >
        Request Access
      </Button>
    </CardContent>
  </Card>
)}

<Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Request Access to Parent Communication</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Label>Reason (optional)</Label>
      <Textarea
        value={requestReason}
        onChange={(e) => setRequestReason(e.target.value)}
        placeholder="Why do you need access?"
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleRequestAccess}>
        Submit Request
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 4. Update Tab Visibility Logic

**File**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

Replace current trust level check with new comprehensive check:

```tsx
// OLD
const showSentToParentsTab = coachTrustLevel >= 2;

// NEW
const accessCheck = useQuery(api.models.trustGatePermissions.checkCoachParentAccess, {
  coachId: currentUser?._id,
  organizationId: orgId,
});

const showSentToParentsTab = accessCheck?.hasAccess ?? false;
const canRequestAccess = accessCheck?.canRequest ?? false;
const canToggleAccess = accessCheck?.canToggle ?? false;
```

---

## 🧪 Testing Checklist

### Backend Testing (Convex Dashboard)

**Test checkCoachParentAccess query**:
```javascript
// Test 1: Level 0 coach, no override
{ coachId: "<level-0-coach>", organizationId: "<org>" }
// Expected: hasAccess: false, canRequest: true (if coach overrides enabled)

// Test 2: Level 2 coach
{ coachId: "<level-2-coach>", organizationId: "<org>" }
// Expected: hasAccess: true, reason: "Trust Level 2+", canToggle: true

// Test 3: Admin blanket block ON
// Set org.adminBlanketBlock = true
{ coachId: "<any-coach>", organizationId: "<org>" }
// Expected: hasAccess: false, reason: "Admin has disabled..."

// Test 4: Coach self-disabled
// Set coachPref.parentAccessEnabled = false
{ coachId: "<coach>", organizationId: "<org>" }
// Expected: hasAccess: false, reason: "You disabled...", canToggle: true
```

**Test mutations**:
```javascript
// Test setAdminBlanketBlock
api.models.trustGatePermissions.setAdminBlanketBlock({
  organizationId: "<org>",
  blocked: true
})
// Verify: org.adminBlanketBlock = true

// Test blockIndividualCoach
api.models.trustGatePermissions.blockIndividualCoach({
  organizationId: "<org>",
  coachId: "<coach>",
  reason: "Test block"
})
// Verify: coachPref.adminBlocked = true

// Test toggleCoachParentAccess
api.models.trustGatePermissions.toggleCoachParentAccess({
  organizationId: "<org>",
  enabled: false
})
// Verify: coachPref.parentAccessEnabled = false
```

### Frontend Testing (After Implementation)

**Org Admin Tests**:
1. Enable blanket block → all coaches lose tab
2. Disable blanket block → coaches regain based on rules
3. Block individual coach → coach loses tab
4. Unblock individual coach → coach regains tab
5. View coach status table → correct badges shown

**Coach Tests**:
1. Request access → creates pending request
2. After approval → tab visible, can toggle
3. Toggle off → tab hidden
4. Toggle on → tab reappears
5. If blocked → cannot toggle on

---

## 📝 Next Steps

### Immediate:
1. ✅ Run codegen (already done)
2. ✅ Test backend mutations in Convex dashboard
3. 🚧 Implement frontend components (org admin bulk/individual controls)
4. 🚧 Implement coach self-service toggle
5. 🚧 Implement coach request access button

### Then:
1. Full UAT testing with real users
2. Update testing guides with new features
3. Deploy to production

---

## 🔗 Related Files

**Backend**:
- `packages/backend/convex/betterAuth/schema.ts` - Organization fields added
- `packages/backend/convex/schema.ts` - Coach preferences fields added
- `packages/backend/convex/models/trustGatePermissions.ts` - All logic implemented

**Frontend** (to be implemented):
- `apps/web/src/app/orgs/[orgId]/admin/settings/features/page.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Documentation**:
- `docs/testing/Voice Insights/P8_WEEK1.5_TESTING_GUIDE.md` - Needs update
- `scripts/ralph/AUTH_PATTERN_CRITICAL_FIX.md` - Auth pattern reference

---

## ✅ Summary

**Backend is 100% complete**:
- 3 new schema fields added
- 1 new comprehensive access check query
- 4 new mutations for admin and coach control
- All following correct Better Auth patterns
- All using proper indexes

**Frontend needs**:
- Org admin bulk block toggle
- Org admin individual coach table with block/unblock
- Coach self-service toggle (tab dropdown OR settings)
- Coach request access dialog

**Estimated frontend work**: 4-6 hours
