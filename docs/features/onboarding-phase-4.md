# Onboarding Phase 4 - Toast Notifications for Existing Users

> Auto-generated documentation - Last updated: 2026-01-28 16:47

## Status

- **Branch**: `ralph/onboarding-phase-4`
- **Progress**: 9 / 9 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Create notifications table in schema

As the system, I store notifications for users including role grants, team assignments, and admin alerts.

**Acceptance Criteria:**
- Edit: packages/backend/convex/schema.ts
- Add new table notifications:
- 
- notifications: defineTable({
-   userId: v.string(),
-   organizationId: v.string(),
-   type: v.union(
-     v.literal('role_granted'),
-     v.literal('team_assigned'),
-     v.literal('team_removed'),
-     v.literal('child_declined'),
-     v.literal('invitation_request')
-   ),
-   title: v.string(),
-   message: v.string(),
-   link: v.optional(v.string()),
-   createdAt: v.number(),
-   seenAt: v.optional(v.number()),
-   dismissedAt: v.optional(v.number()),
- })
-   .index('by_user_unseen', ['userId', 'seenAt'])
-   .index('by_user_created', ['userId', 'createdAt'])
-   .index('by_org_type', ['organizationId', 'type']),
- 
- Run: npx -w packages/backend convex codegen
- Run: npm run check-types
- Verify in Convex dashboard that notifications table exists with indexes

### US-002: Create notification queries and mutations

As the system, I can query unseen notifications and mark them as seen/dismissed.

**Acceptance Criteria:**
- Create: packages/backend/convex/models/notifications.ts
- 
- Query: getUnseenNotifications
- Args: none (uses authenticated user)
- Returns: v.array(v.object({ _id, type, title, message, link, createdAt }))
- Logic: Query notifications where userId = user.id AND seenAt = undefined, order by createdAt desc
- 
- Query: getRecentNotifications
- Args: { limit: v.optional(v.number()) }
- Returns: v.array(Notification)
- Logic: Query notifications where userId = user.id, order by createdAt desc, take limit (default 20)
- 
- Mutation: markNotificationSeen
- Args: { notificationId: v.id('notifications') }
- Returns: v.null()
- Logic: Update notification seenAt = Date.now()
- 
- Mutation: markAllNotificationsSeen
- Args: none (uses authenticated user)
- Returns: v.null()
- Logic: Update all unseen notifications for user with seenAt = Date.now()
- 
- Mutation: dismissNotification
- Args: { notificationId: v.id('notifications') }
- Returns: v.null()
- Logic: Update notification dismissedAt = Date.now()
- 
- Mutation: createNotification (internal)
- Args: { userId, organizationId, type, title, message, link }
- Returns: v.id('notifications')
- Logic: Insert notification with createdAt = Date.now()
- 
- Run: npm run check-types

### US-003: Create NotificationProvider component with real-time subscription

As a logged-in user, I receive real-time notifications via a provider that subscribes to my unseen notifications.

**Acceptance Criteria:**
- Create: apps/web/src/components/notification-provider.tsx
- 
- Component structure:
- export function NotificationProvider({ children }: { children: React.ReactNode }) {
-   const { data: session } = useSession();
-   const notifications = useQuery(
-     api.models.notifications.getUnseenNotifications,
-     session?.user ? {} : 'skip'
-   );
-   const [displayedIds, setDisplayedIds] = useState<Set<string>>(new Set());
-   const markSeen = useMutation(api.models.notifications.markNotificationSeen);
- 
-   useEffect(() => {
-     if (!notifications) return;
-     
-     // Find new notifications not yet displayed
-     const newNotifications = notifications.filter(n => !displayedIds.has(n._id));
-     
-     // Display staggered toasts
-     newNotifications.forEach((notification, index) => {
-       setTimeout(() => {
-         showNotificationToast(notification);
-         setDisplayedIds(prev => new Set([...prev, notification._id]));
-         markSeen({ notificationId: notification._id });
-       }, index * 500);  // 500ms stagger
-     });
-   }, [notifications]);
- 
-   return <>{children}</>;
- }
- 
- Run: npm run check-types

### US-004: Create NotificationToast component

As a user receiving a notification, I see a styled toast with title, message, and optional link.

**Acceptance Criteria:**
- Create: apps/web/src/components/notification-toast.tsx
- 
- Create function showNotificationToast(notification: Notification) {
-   toast(notification.title, {
-     description: notification.message,
-     duration: 5000,  // 5 seconds auto-dismiss
-     action: notification.link ? {
-       label: 'View',
-       onClick: () => router.push(notification.link)
-     } : undefined,
-   });
- }
- 
- Export the function for use by NotificationProvider
- 
- Toast styling:
-   - Uses Sonner toast (already in project)
-   - Title in bold
-   - Description as secondary text
-   - Action button on right if link provided
-   - Auto-dismisses after 5 seconds
- 
- Run: npm run check-types

### US-005: Integrate NotificationProvider into app layout

As the system, I wrap the app with NotificationProvider so all authenticated users receive real-time notifications.

**Acceptance Criteria:**
- Edit: apps/web/src/app/orgs/[orgId]/layout.tsx
- Import NotificationProvider from '@/components/notification-provider'
- 
- Wrap children with NotificationProvider (inside OnboardingOrchestrator):
- return (
-   <OrgThemeProvider>
-     <OnboardingOrchestrator>
-       <NotificationProvider>
-         {children}
-       </NotificationProvider>
-     </OnboardingOrchestrator>
-   </OrgThemeProvider>
- );
- 
- Run: npm run check-types
- Test: Log in as user → Grant role from another browser/admin → Toast appears immediately

### US-006: Trigger notifications on role grant

As a user granted a new role, I receive a notification when an admin grants me admin or coach role.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/members.ts
- Import createNotification from notifications.ts
- 
- In grantFunctionalRole mutation (or wherever roles are granted):
- After successfully granting role, add:
- 
- if (role === 'Admin' || role === 'Coach') {
-   await createNotification(ctx, {
-     userId: targetUserId,
-     organizationId: orgId,
-     type: 'role_granted',
-     title: `New Role: ${role}`,
-     message: `You have been granted ${role} access to ${organizationName}`,
-     link: role === 'Coach' 
-       ? `/orgs/${orgId}/coach/dashboard`
-       : `/orgs/${orgId}/admin/dashboard`,
-   });
- }
- 
- Run: npm run check-types
- Test: Admin grants Coach role to user → User sees toast 'New Role: Coach'

### US-007: Trigger notifications on team assignment

As a coach assigned to a team, I receive a notification about my new team assignment.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/coachAssignments.ts
- Import createNotification from notifications.ts
- 
- In assignCoachToTeam mutation:
- After successfully creating the assignment, add:
- 
- await createNotification(ctx, {
-   userId: coachUserId,
-   organizationId: orgId,
-   type: 'team_assigned',
-   title: 'Team Assignment',
-   message: `You have been assigned to ${teamName}`,
-   link: `/orgs/${orgId}/teams/${teamId}`,
- });
- 
- In removeCoachFromTeam mutation:
- After successfully removing the assignment, add:
- 
- await createNotification(ctx, {
-   userId: coachUserId,
-   organizationId: orgId,
-   type: 'team_removed',
-   title: 'Team Update',
-   message: `You have been removed from ${teamName}`,
-   link: `/orgs/${orgId}/coach/dashboard`,
- });
- 
- Run: npm run check-types
- Test: Admin assigns coach to team → Coach sees toast 'Team Assignment'

### US-008: Trigger admin notifications for invitation requests

As an admin, I receive a notification when a user requests a new invitation.

**Acceptance Criteria:**
- Edit: packages/backend/convex/models/invitations.ts
- In createInvitationRequest mutation (from Phase 1B):
- After creating the request record, add:
- 
- // Notify org admins
- const admins = await getOrganizationAdmins(ctx, orgId);
- for (const admin of admins) {
-   await createNotification(ctx, {
-     userId: admin.userId,
-     organizationId: orgId,
-     type: 'invitation_request',
-     title: 'New Invitation Request',
-     message: `${userEmail} is requesting a new invitation`,
-     link: `/orgs/${orgId}/admin/invitations?tab=requests`,
-   });
- }
- 
- Run: npm run check-types
- Test: User clicks expired link → Requests new invitation → Admin sees toast

### US-009: Handle offline notification delivery

As a user who was offline when a notification was created, I see the notification toast when I log in.

**Acceptance Criteria:**
- The NotificationProvider already handles this:
- - On mount, useQuery fetches all unseen notifications
- - These are displayed as toasts (staggered)
- - Each is marked as seen after display
- 
- Test this flow:
- 1. User A logs out or closes browser
- 2. Admin grants Coach role to User A
- 3. User A logs back in
- 4. Verify: Toast appears showing 'New Role: Coach'
- 
- For multiple accumulated notifications:
- - Verify staggering works (500ms between each)
- - Verify none are missed
- - Verify all are marked as seen after display
- 
- Run: npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Use `user._id as string` to get user ID from authComponent.safeGetAuthUser()
- Use `components.betterAuth.adapter.findMany/findOne` to query Better Auth tables (organization, member, etc.)
- Internal mutations use `internalMutation` from convex/server
- To call internal mutations: `ctx.runMutation(internal.models.moduleName.functionName, args)`
- Router.push requires casting: `router.push(link as Route)`
- Need to import `useCallback` and wrap handlers used in useEffect dependencies
- Better Auth org data accessed via adapter, not ctx.db

**Gotchas encountered:**
- Router.push requires casting: `router.push(link as Route)`
- Need to import `useCallback` and wrap handlers used in useEffect dependencies
- Better Auth org data accessed via adapter, not ctx.db
- Notification system depends on authClient.useSession() for user state
- Notifications table separate from existing adminNotifications table (different purpose)
- Initially used `user.id` instead of `user._id as string`

### Files Changed

- packages/backend/convex/schema.ts (+23)
- packages/backend/convex/models/notifications.ts (+205, new file)
- packages/backend/convex/models/members.ts (+62)
- packages/backend/convex/models/coaches.ts (+61)
- packages/backend/convex/models/invitations.ts (+39)
- apps/web/src/components/notification-provider.tsx (+91, new file)
- apps/web/src/components/notification-toast.tsx (+40, new file)
- apps/web/src/app/orgs/layout.tsx (+5)
- ✅ Type check: passed
- ✅ Convex codegen: passed
- ⚠️ Linting: Pre-existing warnings in codebase (not from new code)
- Use `user._id as string` to get user ID from authComponent.safeGetAuthUser()
- Use `components.betterAuth.adapter.findMany/findOne` to query Better Auth tables (organization, member, etc.)
- Internal mutations use `internalMutation` from convex/server


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
