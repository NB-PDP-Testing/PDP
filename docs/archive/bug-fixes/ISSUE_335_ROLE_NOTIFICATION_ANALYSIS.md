# Issue #335: Role Granting Notification System - Comprehensive Analysis

**Date:** 2026-01-25
**Reporter:** John O'Brien (jkobrien)
**Issue URL:** https://github.com/NB-PDP-Testing/PDP/issues/335
**Status:** Investigation Complete - Awaiting Implementation Decision

---

## Executive Summary

Issue #335 identifies **three to four conflicting user onboarding workflows** that need to be unified. The core problem is that the system treats different user entry points (new user invitation, existing user role grant, guardian assignment) as separate flows, resulting in:

1. **Double notifications** when inviting new users with both team and guardian assignments
2. **No notifications** when granting roles to existing users
3. **No real-time or login-time awareness** when roles are changed
4. **Poor first-time user experience** - no guided onboarding or system overview

---

## Current State Analysis

### ✅ What Works

#### 1. **New User Invitation System**
- **File:** `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/utils/email.ts:74-439`
- **Status:** ✅ Fully functional
- **Features:**
  - Single consolidated email with all role information
  - Includes assigned teams (for coaches)
  - Includes linked players (for parents)
  - Special pending children acknowledgment section (for guardians)
  - Role-specific capabilities list
  - Supports both Email and WhatsApp delivery

**Example Flow:**
```
Admin invites new user → Creates Better Auth invitation → Stores metadata:
{
  suggestedFunctional Roles: ["coach", "parent"],
  teams: [{id, name, sport, ageGroup}],
  players: [{id, name, ageGroup}]
}
→ Sends single consolidated email via Resend → User clicks link →
Accepts invitation → Roles/teams/players synced from metadata
```

#### 2. **Guardian Assignment for Existing Users**
- **File:** `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/actions/guardianNotifications.ts`
- **Status:** ✅ Works but separate from main invitation flow
- **Features:**
  - Detects if user exists (Scenario A vs B)
  - Existing users get "Pending Actions" email
  - New users get full invitation with guardian context
  - Email sent via `sendPendingGuardianActionNotification()`

#### 3. **Admin Access Control**
- **File:** `/Users/neil/Documents/GitHub/PDP/apps/web/src/app/orgs/[orgId]/admin/layout.tsx:37-70`
- **Status:** ✅ Works correctly
- **Features:**
  - Checks BOTH Better Auth role (`admin`/`owner`) AND functional role (`admin`)
  - Users with functional admin role CAN access admin features
  - Redirects non-admin users appropriately

### ❌ What's Missing

#### 1. **No Email Notification When Granting Roles to Existing Users**

**Problem:**
- **File:** `/Users/neil/Documents/GitHub/PDP/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx:428-536`
- When admin grants "Coach" or "Admin" role to an existing member, NO email is sent
- Only the admin sees a toast: "User updated successfully"
- The affected user receives zero notification

**Impact:**
- User doesn't know they were granted a new role
- User doesn't know they have new teams assigned
- User must accidentally discover new features/dashboards

**Code Evidence:**
```typescript
// apps/web/src/app/orgs/[orgId]/admin/users/page.tsx:428-536
const handleSave = async () => {
  await updateMemberFunctionalRoles({ ... });
  await updateCoachAssignments({ ... }); // If coach
  await linkPlayers({ ... }); // If parent
  toast.success("User updated successfully"); // ❌ Only admin sees this
  // ❌ NO email sent to user
};
```

#### 2. **No Real-Time or Login-Time Notifications**

**Problem:**
- No `userNotifications` table in schema
- No toast/banner/modal system for role changes
- User only discovers new role by checking role switcher manually

**Current Notification Systems:**
| System | File | Purpose | For Role Changes? |
|--------|------|---------|-------------------|
| Tab Notifications | `tab-notification-provider.tsx` | Browser tab title updates | ❌ No - message count only |
| Guardian Emails | `guardianNotifications.ts` | Pending child acknowledgments | ❌ No - guardian-specific |
| Toast (Admin UI) | `users/page.tsx` | Admin feedback on save | ❌ No - only shows to admin |

**What's Needed:**
- Real-time toast when user is online: "You've been granted Coach role"
- Login-time notification when user signs in: "New role available: Admin"
- Persistent notification bell/badge showing unread notifications

#### 3. **No UI Option for Email Notification**

**Problem:**
- **File:** `/Users/neil/Documents/GitHub/PDP/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
- No checkbox for admin to choose whether to send email
- Contrast: Invitation system HAS a "Resend Invitation" button

**What's Needed:**
```tsx
<Checkbox
  id="send-email"
  checked={sendEmailNotification}
  onCheckedChange={setSendEmailNotification}
/>
<Label>Send email notification about new role</Label>
```

#### 4. **No Backend Authorization on Role Update**

**Critical Security Issue:**
- **File:** `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/members.ts:343-396`
- `updateMemberFunctionalRoles` mutation has NO permission check
- ANY authenticated user could theoretically call it

**Code Evidence:**
```typescript
export const updateMemberFunctionalRoles = mutation({
  args: { organizationId, userId, functionalRoles },
  handler: async (ctx, args) => {
    // ❌ NO check: Is current user admin/owner?
    // ❌ NO check: Is userId actually in this organization?
    await ctx.runMutation(components.betterAuth.adapter.updateOne, { ... });
  },
});
```

**What's Needed:**
```typescript
// Check if current user is admin/owner in this org
const currentUser = await authComponent.getAuthUser(ctx);
const member = await getMemberInOrg(currentUser.id, organizationId);
if (member.role !== "admin" && member.role !== "owner" &&
    !member.functionalRoles?.includes("admin")) {
  throw new Error("Unauthorized");
}
```

#### 5. **No Unified First-Time User Experience**

**Problem (from ardmhacha24's comment):**
- New users get invitation email → accept → immediately see dashboard
- No "Welcome to PlayerARC" tour
- No explanation of features/capabilities
- No guided onboarding wizard

**Industry Best Practices:**
- **Slack**: Shows product tour on first login
- **Notion**: "Getting Started" checklist
- **Linear**: Role-specific onboarding (e.g., "Here's how engineers use Linear")

**Current Flow System Status:**
- **File:** `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/flows.ts`
- Flow wizard system EXISTS for platform-wide announcements
- NOT integrated with role assignment events
- NOT triggered on first login

---

## Root Cause Analysis

### The Three Conflicting Workflows

#### Workflow A: New User Invitation (via Team/Role Assignment)
1. Admin invites user with email, assigns roles/teams/players
2. Single consolidated invitation email sent via `sendOrganizationInvitation()`
3. User clicks link → accepts invitation
4. Backend runs `syncFunctionalRolesFromInvitation()` to apply roles
5. User redirected to organization dashboard
6. **✅ Email sent, ❌ No onboarding wizard**

#### Workflow B: Guardian Assignment to New User
1. Admin adds guardian via player edit page
2. Backend checks if user exists
   - If NO: Creates invitation, sends full invite email with guardian context
   - If YES: Sends "Pending Actions" email, shows claim dialog on next login
3. User accepts guardian link
4. **❌ Can create duplicate with Workflow A if same user**

#### Workflow C: Guardian Assignment to Existing User
1. Admin adds guardian to player
2. Backend sends "Pending Actions" email
3. User logs in → Guardian claim dialog appears
4. User confirms → Link established
5. **✅ Works, but separate from main role system**

#### Workflow D: Role Grant to Existing User
1. Admin edits user, adds "Coach" or "Admin" role
2. Backend updates `member.functionalRoles` array
3. **❌ NO email, ❌ NO toast, ❌ NO notification**
4. User must discover new role accidentally
5. **⚠️ NO authorization check on backend mutation**

### Why These Conflict

| Scenario | Email? | Toast? | Onboarding? | Integrated? |
|----------|--------|--------|-------------|-------------|
| New user invited | ✅ Yes | ❌ No | ❌ No | ✅ Consolidated |
| Guardian (new) | ✅ Yes | ❌ No | ❌ No | ❌ Separate flow |
| Guardian (existing) | ✅ Yes | ❌ No | ❌ No | ❌ Separate flow |
| Role grant (existing) | ❌ NO | ❌ NO | ❌ NO | ❌ Broken |

**Key Insight:** The system has **two parallel notification systems:**
1. **Invitation-based** (Better Auth) - works for new users
2. **Guardian-specific** - works for child acknowledgments
3. **Role grant** - doesn't exist

---

## Proposed Solution Architecture

### Phase 1: Create Notification Infrastructure (1 day)

#### 1.1 Add `userNotifications` Table

**File:** `packages/backend/convex/schema.ts`

```typescript
userNotifications: defineTable({
  userId: v.string(),
  organizationId: v.optional(v.string()), // null for platform-wide
  type: v.union(
    v.literal("role_granted"),
    v.literal("role_removed"),
    v.literal("team_assigned"),
    v.literal("guardian_assigned"),
    v.literal("announcement")
  ),
  title: v.string(),
  message: v.string(),
  metadata: v.optional(v.object({
    roles: v.optional(v.array(v.string())),
    teams: v.optional(v.array(v.object({ id: v.string(), name: v.string() }))),
    players: v.optional(v.array(v.object({ id: v.string(), name: v.string() }))),
    actionUrl: v.optional(v.string()),
  })),
  displayMode: v.union(
    v.literal("toast"),    // Real-time toast notification
    v.literal("modal"),    // Login-time modal dialog
    v.literal("silent")    // No UI, just record
  ),
  status: v.union(v.literal("unread"), v.literal("read"), v.literal("dismissed")),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()), // Auto-cleanup after 30 days
})
  .index("by_userId_and_status", ["userId", "status"])
  .index("by_userId_and_orgId", ["userId", "organizationId"])
  .index("by_expiresAt", ["expiresAt"])
```

#### 1.2 Create Notification Model

**File:** `packages/backend/convex/models/userNotifications.ts` (NEW)

```typescript
// Queries
export const getUnreadNotifications = query({ ... });
export const getUnreadCount = query({ ... });

// Mutations
export const createNotification = mutation({ ... });
export const markAsRead = mutation({ ... });
export const markAllAsRead = mutation({ ... });

// Scheduled cleanup
export const cleanupExpiredNotifications = internalMutation({ ... });
```

---

### Phase 2: Fix Role Grant Notification (1 day)

#### 2.1 Add Backend Authorization

**File:** `packages/backend/convex/models/members.ts`

Update `updateMemberFunctionalRoles`:
```typescript
export const updateMemberFunctionalRoles = mutation({
  handler: async (ctx, args) => {
    // ✅ ADD: Authorization check
    const currentUser = await authComponent.getAuthUser(ctx);
    const currentMember = await getMemberInOrg(currentUser.id, args.organizationId);

    const isAuthorized =
      currentMember.role === "admin" ||
      currentMember.role === "owner" ||
      currentMember.functionalRoles?.includes("admin");

    if (!isAuthorized) {
      throw new Error("Unauthorized: Only admins can update roles");
    }

    // Calculate diff
    const currentRoles = existingMember.functionalRoles || [];
    const rolesAdded = args.functionalRoles.filter(r => !currentRoles.includes(r));
    const rolesRemoved = currentRoles.filter(r => !args.functionalRoles.includes(r));

    // Update roles
    await updateRoles(...);

    // ✅ ADD: Create notification
    if (rolesAdded.length > 0) {
      await ctx.runMutation(internal.models.userNotifications.createNotification, {
        userId: args.userId,
        organizationId: args.organizationId,
        type: "role_granted",
        title: `New role${rolesAdded.length > 1 ? 's' : ''} granted`,
        message: `You've been granted ${rolesAdded.join(", ")} at ${orgName}`,
        displayMode: "toast",
        metadata: { roles: rolesAdded },
      });
    }

    return { rolesAdded, rolesRemoved };
  },
});
```

#### 2.2 Add Email Notification Option

**File:** `packages/backend/convex/models/members.ts`

Add new mutation:
```typescript
export const updateMemberFunctionalRolesWithEmail = mutation({
  args: {
    ...updateMemberFunctionalRoles.args,
    sendEmail: v.boolean(),
  },
  handler: async (ctx, args) => {
    const result = await updateMemberFunctionalRoles(...);

    if (args.sendEmail && result.rolesAdded.length > 0) {
      await ctx.scheduler.runAfter(0, internal.actions.sendRoleGrantEmail, {
        email: user.email,
        rolesAdded: result.rolesAdded,
        organizationName: org.name,
      });
    }

    return result;
  },
});
```

**File:** `packages/backend/convex/actions/sendRoleGrantEmail.ts` (NEW)

```typescript
export const sendRoleGrantEmail = action({
  handler: async (ctx, args) => {
    await sendRoleGrantNotification({
      email: args.email,
      recipientName: args.userName,
      organizationName: args.organizationName,
      rolesGranted: args.rolesAdded,
      loginUrl: `${siteUrl}/orgs/${args.organizationId}`,
    });
  },
});
```

**File:** `packages/backend/convex/utils/email.ts`

Add new email template:
```typescript
export async function sendRoleGrantNotification(data: {
  email: string;
  recipientName: string;
  organizationName: string;
  rolesGranted: string[];
  loginUrl: string;
}): Promise<void> {
  // HTML email template similar to invitation
  // Subject: "New role granted at {Org}"
  // Body: "You've been granted {Role} at {Org}. Login to explore your new capabilities."
}
```

#### 2.3 Update Admin UI

**File:** `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

Add checkbox:
```tsx
const [sendEmailNotification, setSendEmailNotification] = useState(false);

// In the render:
<div className="mt-4 flex items-center gap-2">
  <Checkbox
    id="send-email"
    checked={sendEmailNotification}
    onCheckedChange={(checked) => setSendEmailNotification(!!checked)}
  />
  <Label htmlFor="send-email" className="text-sm cursor-pointer">
    Also send email notification about new roles
  </Label>
</div>

// In handleSave:
await updateMemberFunctionalRolesWithEmail({
  ...args,
  sendEmail: sendEmailNotification,
});
```

---

### Phase 3: Real-Time Notification Provider (1 day)

#### 3.1 Create Notification Provider

**File:** `apps/web/src/components/providers/role-notification-provider.tsx` (NEW)

```tsx
export function RoleNotificationProvider({ children, orgId }: Props) {
  const { data: session } = authClient.useSession();

  const notifications = useQuery(
    api.models.userNotifications.getUnreadNotifications,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const markAsRead = useMutation(api.models.userNotifications.markAsRead);
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifications) return;

    for (const notification of notifications) {
      if (notification.displayMode === "toast" && !shownIds.current.has(notification._id)) {
        shownIds.current.add(notification._id);

        toast(notification.title, {
          description: notification.message,
          duration: Infinity, // Persist until dismissed
          action: {
            label: "Dismiss",
            onClick: () => markAsRead({ notificationId: notification._id }),
          },
        });
      }
    }
  }, [notifications]);

  return <>{children}</>;
}
```

#### 3.2 Add to Layout

**File:** `apps/web/src/app/orgs/[orgId]/layout.tsx`

```tsx
import { RoleNotificationProvider } from "@/components/providers/role-notification-provider";

export default function OrgLayout({ children, params }: Props) {
  return (
    <RoleNotificationProvider orgId={params.orgId}>
      {children}
    </RoleNotificationProvider>
  );
}
```

---

### Phase 4: Unified Onboarding Experience (3-4 days)

#### 4.1 Research Summary: Industry Best Practices ✅ COMPLETED

**Research Document:** `docs/research/onboarding-best-practices.md`

**Key Findings from 2026 Industry Analysis:**

**Leading Tech Platforms:**
- **Slack**: Personalization quiz + interactive Slackbot guidance = 3-4 activation tasks max
- **Notion**: Learn-by-doing checklist in <60 seconds, uses product to teach product
- **Figma**: "Show, don't tell" with bite-sized tooltips, users productive in minutes
- **Linear**: 73% faster time-to-productivity with structured onboarding

**Sports Management Software:**
- **TeamSnap**: Simple but lacks individual user first-login onboarding
- **SportsEngine**: Complex setup, mixed reviews on user experience
- **Hudl**: Role selection (coach/athlete/analyst) upfront, sport-specific tailoring

**Critical Success Factors:**
1. ✅ **Role-based personalization is mandatory** (2026 standard)
2. ✅ **Interactive tours achieve 72% completion** (3-step tours optimal)
3. ✅ **<60 seconds to first value** (industry expectation)
4. ✅ **Learn-by-doing beats passive videos** (interactive > video-only)
5. ✅ **Progressive disclosure** (show advanced features later, not upfront)

**Competitive Gap Identified:**
Sports management platforms lag behind general tech platforms in onboarding UX. PlayerARC can differentiate by adopting tech industry best practices.

---

#### 4.2 Recommended Onboarding Architecture

**Implementation:** 3-tier approach (Survey → Tour → Checklist)

##### Tier 1: Welcome Survey (15 seconds)

**When:** Immediately after first login / invitation acceptance

**Questions (2 max):**

```tsx
// Question 1 (All users)
"What will you primarily use PlayerARC for?"
[ ] Coaching teams and tracking player development
[ ] Viewing my child's progress as a parent/guardian
[ ] Managing our organization as an admin
[ ] Accessing my own player profile (18+)

// Question 2 (Conditional on role)
If Coach: "What sport do you coach?" [Dropdown]
If Parent: "How many children do you have in [Org]?" [1-5+]
```

**Storage:** User profile metadata for personalization

---

##### Tier 2: 3-Step Interactive Product Tour (60-90 seconds)

**Design Principles:**
- Interactive actions required (not passive viewing)
- Skippable at any point
- Tooltips with visual highlights
- Completion celebration

**Coach Tour:**
1. **View Player Passport** (30s) - "Track each player's development"
2. **Record Voice Note** (45s) - "Quick observations with AI transcription" + optional 20s video
3. **Explore Dashboard** (15s) - "Your teams and recent activity"

**Parent Tour:**
1. **Acknowledge Child** (20s) - "Confirm your child connections"
2. **View Child's Passport** (30s) - "See development progress"
3. **Check Coach Feedback** (25s) - "AI-generated training summaries"

**Admin Tour:**
1. **Invite Members** (30s) - "Build your organization"
2. **Create/View Teams** (25s) - "Organize players by age/sport"
3. **Organization Settings** (20s) - "Customize branding"

---

##### Tier 3: Getting Started Checklist (Persistent)

**Implementation:** Dismissible card on dashboard (Notion-style)

**Coach Checklist:**
```
Getting Started as a Coach

[ ] View a player passport
[ ] Record your first voice note
[ ] Set a development goal for a player
[ ] Review coach dashboard
[ ] Optional: Customize your profile

2 of 5 tasks complete
```

**Design:**
- Auto-checks as tasks completed
- Progress bar shows %
- Reappears if <50% complete
- User can dismiss permanently

**Technical:** Store progress in user profile metadata

---

#### 4.3 Implementation Details

**New Components:**

1. **`apps/web/src/components/onboarding/welcome-survey.tsx`**
   - 2-question survey with conditional logic
   - Stores answers in user metadata
   - Routes to appropriate tour

2. **`apps/web/src/components/onboarding/product-tour.tsx`**
   - Role-specific 3-step tour
   - Uses Radix UI Tooltip for highlights
   - Tracks completion in user metadata

3. **`apps/web/src/components/onboarding/getting-started-checklist.tsx`**
   - Persistent card component
   - Auto-updates as tasks completed
   - Dismissible with preference storage

**Database Schema Extension:**

```typescript
// Extend user profile in Convex
onboardingMetadata: v.optional(v.object({
  surveyCompleted: v.boolean(),
  primaryRole: v.optional(v.string()), // "coach", "parent", "admin"
  sport: v.optional(v.string()), // If coach
  childCount: v.optional(v.number()), // If parent
  tourCompleted: v.boolean(),
  tourCompletedAt: v.optional(v.number()),
  checklistDismissed: v.boolean(),
  checklistProgress: v.optional(v.object({
    task1: v.boolean(),
    task2: v.boolean(),
    task3: v.boolean(),
    task4: v.boolean(),
    task5: v.boolean(),
  })),
}))
```

**Technology Options:**

- **Option A (Recommended):** Custom build with shadcn/ui + Radix UI Tooltip
- **Option B:** Use library like Intro.js or Shepherd.js (if advanced features needed)

**Recommendation:** Start with custom build for maximum control and brand consistency

---

#### 4.4 Success Metrics

**Primary KPIs:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Tour Completion Rate | >60% | % users who finish 3-step tour |
| Time to First Value | <3 min | Login to first meaningful action |
| Checklist Completion | >40% | % users who complete Getting Started |
| 7-Day Retention | >70% | % users who return within week |

**Role-Specific Metrics:**
- **Coaches:** % who record voice note in first week
- **Parents:** % who acknowledge child in first session
- **Admins:** % who invite member within 3 days

---

### Phase 5: Consolidate Guardian Flow (1 day)

#### 5.1 Merge Guardian Notification with Main System

**File:** `packages/backend/convex/actions/guardianNotifications.ts`

Update to use `userNotifications` table:
```typescript
// For existing users (Scenario A):
// Instead of sending email directly, create notification:
await ctx.runMutation(internal.models.userNotifications.createNotification, {
  userId: existingUser._id,
  organizationId,
  type: "guardian_assigned",
  title: "New child connection pending",
  message: `You've been linked to ${pendingChildrenCount} child(ren) at ${orgName}`,
  displayMode: "modal", // Shows Guardian claim dialog
  metadata: { players: [...] },
});

// Email is OPTIONAL (admin choice)
if (sendEmail) {
  await sendPendingGuardianActionNotification(...);
}
```

#### 5.2 Update Guardian Claim Dialog

**File:** `apps/web/src/components/guardian-identity-claim-dialog.tsx`

- Accept `notificationId` prop
- On successful claim, mark notification as read
- On "This isn't me", mark as dismissed

---

## Implementation Checklist

### Backend (Convex)
- [ ] Add `userNotifications` table to schema
- [ ] Create `models/userNotifications.ts` with CRUD operations
- [ ] Add authorization check to `updateMemberFunctionalRoles`
- [ ] Create `updateMemberFunctionalRolesWithEmail` mutation
- [ ] Create `actions/sendRoleGrantEmail.ts`
- [ ] Add `sendRoleGrantNotification` email template
- [ ] Update `guardianNotifications.ts` to use notification table
- [ ] Add scheduled cleanup cron job

### Frontend (Next.js)
- [ ] Create `role-notification-provider.tsx`
- [ ] Add provider to org layout
- [ ] Add email checkbox to admin users page
- [ ] Update `handleSave` to use new mutation
- [ ] Optional: Add notification bell/badge to header
- [ ] Optional: Create first-login onboarding wizard

### Documentation
- [ ] Update `docs/features/user-management.md`
- [ ] Create `docs/features/notification-system.md`
- [ ] Research competitor onboarding flows
- [ ] Document best practices for first-time UX

---

## Testing Plan

### Test Case 1: Role Grant to Existing User (No Email)
**Steps:**
1. Log in as admin
2. Edit existing member without coach role
3. Add "Coach" role, assign teams
4. Do NOT check "Send email" checkbox
5. Save changes
6. Log in as that user (in another browser)

**Expected:**
- [ ] Toast appears: "New role granted: Coach"
- [ ] Toast persists until dismissed
- [ ] No email sent
- [ ] Role switcher shows "Coach"

### Test Case 2: Role Grant to Existing User (With Email)
**Steps:**
1. Repeat steps 1-3 from Test Case 1
2. CHECK "Send email" checkbox
3. Save changes
4. Check email inbox

**Expected:**
- [ ] Email received with subject "New role granted at {Org}"
- [ ] Email explains new capabilities
- [ ] Email has "Login to explore" button
- [ ] Toast still appears when user logs in

### Test Case 3: New User Invitation (Coach + Parent)
**Steps:**
1. Log in as admin
2. Invite new user email
3. Select BOTH "Coach" and "Parent" roles
4. Assign teams and players
5. Send invitation

**Expected:**
- [ ] Only ONE email sent
- [ ] Email has both teams and players sections
- [ ] Email mentions pending child acknowledgments
- [ ] On acceptance, all roles/teams/players synced

### Test Case 4: Guardian Assignment (Existing User)
**Steps:**
1. Log in as admin
2. Edit player, add existing user as guardian
3. Save
4. Log in as that user

**Expected:**
- [ ] Modal dialog appears (Guardian claim)
- [ ] "This is mine" / "This isn't me" options
- [ ] On confirm, child linked
- [ ] Notification marked as read

### Test Case 5: Authorization Check
**Steps:**
1. Log in as regular member (no admin role)
2. Open browser console
3. Try to call `updateMemberFunctionalRoles` via Convex client

**Expected:**
- [ ] Mutation throws "Unauthorized" error
- [ ] Roles not updated
- [ ] Security violation logged

---

## Questions for Decision

### 1. Email Notification Default Behavior
When admin grants a role to an existing user, should email notification be:
- **Option A:** OFF by default (opt-in) - less intrusive
- **Option B:** ON by default (opt-out) - ensures users are informed
- **Option C:** Required for certain roles (e.g., always for Admin, optional for Coach/Parent)

**Recommendation:** Option A (opt-in) - respects user inbox, in-app toast is sufficient

### 2. Onboarding Wizard Scope
For first-time users, should we:
- **Option A:** Show generic "Welcome to PlayerARC" modal with links to docs
- **Option B:** Role-specific wizard (e.g., "Welcome, Coach! Here's how to...")
- **Option C:** Full interactive product tour (Intro.js / Shepherd.js library)
- **Option D:** Defer to Phase 2, research competitors first

**Recommendation:** Option D - Research first, then decide

### 3. Notification Persistence
How long should notifications stay in the system?
- **Option A:** 7 days (auto-delete after)
- **Option B:** 30 days (default)
- **Option C:** Forever (user must manually dismiss)

**Recommendation:** Option B (30 days) - balances utility with database cleanup

### 4. Guardian Flow Integration
Should guardian assignments:
- **Option A:** Create `userNotifications` record instead of direct email (current plan)
- **Option B:** Keep separate email system, just improve consolidation
- **Option C:** Hybrid - notification record + optional email

**Recommendation:** Option C (hybrid) - provides flexibility

---

## Risk Assessment

### Low Risk ✅
- Adding `userNotifications` table (backwards compatible)
- Adding new mutations (doesn't break existing)
- Email notification checkbox (opt-in)

### Medium Risk ⚠️
- Real-time notification provider (could cause performance issues if not optimized)
- Authorization check on `updateMemberFunctionalRoles` (could break existing admin flows if not tested)

### High Risk 🚨
- Modifying existing invitation flow (many dependencies)
- Changing guardian assignment behavior (complex state machine)

**Mitigation:**
1. **Feature flag:** Add `ENABLE_ROLE_NOTIFICATIONS` env var to toggle behavior
2. **Gradual rollout:** Deploy backend first, then enable frontend provider
3. **Comprehensive testing:** Test all role grant scenarios in staging

---

## Timeline Estimate

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | Notification infrastructure | 1 day |
| Phase 2 | Role grant notification | 1 day |
| Phase 3 | Real-time provider | 1 day |
| Phase 4 | Onboarding implementation (research complete ✅) | 3-4 days |
| Phase 5 | Guardian flow consolidation | 1 day |
| **Testing & QA** | All scenarios | 1-2 days |
| **TOTAL** | | **8-10 days** |

---

## Next Steps

1. **User Decision Required:**
   - Approve proposed architecture OR request changes
   - Answer the 4 decision questions above
   - Prioritize phases (all at once or incremental?)

2. **Research Task ✅ COMPLETED:**
   - ✅ Analyzed leading tech platforms (Slack, Notion, Figma, Linear)
   - ✅ Analyzed sports management software (TeamSnap, SportsEngine, Hudl)
   - ✅ Documented comprehensive findings in `docs/research/onboarding-best-practices.md`
   - ✅ Identified 2026 industry standards and competitive gaps
   - ✅ Created detailed implementation recommendations with 3-tier approach

3. **Implementation:**
   - Once approved, begin Phase 1 (notification infrastructure)
   - Deploy incrementally with feature flags

---

## Appendix: File Reference

### Backend Files to Modify
| File | Current Status | Changes Needed |
|------|----------------|----------------|
| `schema.ts` | ❌ No notifications table | Add `userNotifications` |
| `models/members.ts` | ⚠️ No auth check | Add authorization + notification |
| `utils/email.ts` | ✅ Invitation email works | Add role grant email template |
| `actions/guardianNotifications.ts` | ✅ Works but separate | Integrate with notification system |

### Frontend Files to Modify
| File | Current Status | Changes Needed |
|------|----------------|----------------|
| `admin/users/page.tsx` | ⚠️ No email option | Add checkbox + call new mutation |
| `orgs/[orgId]/layout.tsx` | ❌ No notification provider | Add `RoleNotificationProvider` |
| `guardian-identity-claim-dialog.tsx` | ✅ Works | Add `notificationId` prop |

### New Files to Create
- `packages/backend/convex/models/userNotifications.ts`
- `packages/backend/convex/actions/sendRoleGrantEmail.ts`
- `apps/web/src/components/providers/role-notification-provider.tsx`
- `apps/web/src/components/onboarding/first-login-wizard.tsx` (optional)
- `docs/research/onboarding-best-practices.md` (research deliverable)
