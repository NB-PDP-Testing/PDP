# Implementation Plan: Injury Tracking Phase 1 - Notifications & Parent Reporting

## Overview

Complete Phase 1 of the Injury Tracking System by implementing in-app notifications for injury events and enabling parents to report injuries for their children. This addresses the two critical gaps identified in the updated PRD: lack of stakeholder notifications and parent-only view access.

## Requirements

### Functional Requirements
- R1: System sends in-app notifications when injuries are reported
- R2: System sends notifications when injury status changes
- R3: Severe injuries trigger admin alerts
- R4: Users can view their notifications in a dropdown
- R5: Users can mark notifications as read
- R6: Parents can report injuries for their linked children
- R7: Coach receives notification when parent reports an injury

### Non-Functional Requirements
- NF1: Notifications must not create N+1 query patterns
- NF2: Notification queries must use indexes
- NF3: UI must be responsive on mobile
- NF4: Parent injury form must reuse existing coach form patterns

## Assumptions & Constraints

**Assumptions:**
- Email notifications are out of scope (Phase 2)
- Push notifications are out of scope (Future)
- Existing `playerInjuries` schema is sufficient
- Parents are linked to children via `guardianIdentityLinks` table

**Constraints:**
- Must follow Convex query optimization patterns from CLAUDE.md
- Must use existing shadcn/ui components
- No new npm packages required

## Architecture Changes

| Change | File Path | Description |
|--------|-----------|-------------|
| New table | `packages/backend/convex/schema.ts` | Add `notifications` table |
| New model | `packages/backend/convex/models/notifications.ts` | CRUD operations for notifications |
| Modify | `packages/backend/convex/models/playerInjuries.ts` | Add notification triggers |
| New component | `apps/web/src/components/notifications/notification-bell.tsx` | Navbar notification icon |
| New component | `apps/web/src/components/notifications/notification-dropdown.tsx` | Notification list |
| Modify | `apps/web/src/components/layout/navbar.tsx` | Add notification bell |
| Modify | `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx` | Add report injury button/dialog |

## Implementation Steps

### Phase 1A: Notification Infrastructure (Backend)

#### Step 1: Add notifications table to schema
**File:** `packages/backend/convex/schema.ts`
- **Action:** Add `notifications` table definition with indexes
- **Why:** Foundation for all notification functionality
- **Dependencies:** None
- **Risk:** Low
- **Details:**
  ```typescript
  notifications: defineTable({
    userId: v.string(),              // Better Auth user ID (recipient)
    organizationId: v.string(),      // Org context
    type: v.union(
      v.literal("injury_reported"),
      v.literal("injury_status_changed"),
      v.literal("severe_injury_alert"),
      v.literal("injury_cleared")
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),    // Deep link URL
    relatedInjuryId: v.optional(v.id("playerInjuries")),
    relatedPlayerId: v.optional(v.id("playerIdentities")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_org", ["userId", "organizationId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_org_and_type", ["organizationId", "type"])
  ```

#### Step 2: Create notifications model
**File:** `packages/backend/convex/models/notifications.ts` (NEW)
- **Action:** Create queries and mutations for notifications
- **Why:** Encapsulate notification logic
- **Dependencies:** Step 1
- **Risk:** Low
- **Functions to create:**
  - `getNotificationsForUser(userId, orgId, limit?)` - Get user's notifications
  - `getUnreadCount(userId, orgId)` - Get unread notification count
  - `markAsRead(notificationId)` - Mark single notification as read
  - `markAllAsRead(userId, orgId)` - Mark all as read
  - `createNotification(args)` - Internal helper for creating notifications
  - `deleteOldNotifications(userId, olderThan)` - Cleanup old notifications

#### Step 3: Create notification helper functions
**File:** `packages/backend/convex/lib/notificationHelpers.ts` (NEW)
- **Action:** Create helper functions for sending notifications to stakeholders
- **Why:** Reusable logic for determining who to notify
- **Dependencies:** Step 2
- **Risk:** Medium (must handle missing guardian links gracefully)
- **Functions:**
  - `notifyInjuryReported(ctx, injuryId, reportedByRole)` - Notify relevant parties
  - `notifyStatusChanged(ctx, injuryId, newStatus)` - Notify on status change
  - `getCoachesForPlayer(ctx, playerIdentityId, orgId)` - Get coaches to notify
  - `getGuardiansForPlayer(ctx, playerIdentityId)` - Get parents to notify

#### Step 4: Add notification triggers to playerInjuries
**File:** `packages/backend/convex/models/playerInjuries.ts`
- **Action:** Call notification helpers after reportInjury and updateInjuryStatus
- **Why:** Trigger notifications on injury events
- **Dependencies:** Step 3
- **Risk:** Medium (must not break existing functionality)
- **Changes:**
  - In `reportInjury`: After successful insert, call `notifyInjuryReported`
  - In `updateInjuryStatus`: After successful update, call `notifyStatusChanged`

### Phase 1B: Notification UI (Frontend)

#### Step 5: Create notification bell component
**File:** `apps/web/src/components/notifications/notification-bell.tsx` (NEW)
- **Action:** Create bell icon with unread badge
- **Why:** Visual indicator for new notifications
- **Dependencies:** Step 2
- **Risk:** Low
- **Details:**
  - Use `Bell` icon from lucide-react
  - Show red badge with unread count (max "9+")
  - Click opens dropdown
  - Use `useQuery` with `getUnreadCount`

#### Step 6: Create notification dropdown component
**File:** `apps/web/src/components/notifications/notification-dropdown.tsx` (NEW)
- **Action:** Create dropdown showing notification list
- **Why:** Allow users to view and interact with notifications
- **Dependencies:** Step 5
- **Risk:** Low
- **Details:**
  - Use shadcn `DropdownMenu` component
  - Show recent notifications (limit 10)
  - Each item: icon, title, message preview, time ago
  - Click item: mark as read + navigate to link
  - "Mark all as read" button
  - "View all" link (future: dedicated page)

#### Step 7: Add notification bell to navbar
**File:** `apps/web/src/components/layout/navbar.tsx`
- **Action:** Add NotificationBell component to navbar
- **Why:** Make notifications accessible from anywhere
- **Dependencies:** Step 6
- **Risk:** Low
- **Position:** Before user menu, after org selector

### Phase 1C: Parent Injury Reporting

#### Step 8: Create parent injury report dialog
**File:** `apps/web/src/app/orgs/[orgId]/parents/injuries/components/report-injury-dialog.tsx` (NEW)
- **Action:** Create dialog with injury report form for parents
- **Why:** Enable parents to report injuries for their children
- **Dependencies:** None (can be parallel with notification work)
- **Risk:** Medium (form validation, child selection)
- **Details:**
  - Reuse form structure from coach injuries page
  - Child selector (dropdown of linked children)
  - All injury fields: type, body part, side, severity, description, etc.
  - `occurredDuring` defaults to "non_sport" for parent reports
  - `reportedByRole` set to "guardian"
  - Submit calls existing `reportInjury` mutation

#### Step 9: Add report button to parent injuries page
**File:** `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx`
- **Action:** Add "Report Injury" button that opens dialog
- **Why:** Entry point for parent injury reporting
- **Dependencies:** Step 8
- **Risk:** Low
- **Changes:**
  - Import ReportInjuryDialog component
  - Add state for dialog open/close
  - Add Button in header section
  - Pass children list to dialog for selection

#### Step 10: Verify notification flow for parent-reported injuries
**File:** Integration testing
- **Action:** Test that coach receives notification when parent reports injury
- **Why:** Complete the feedback loop
- **Dependencies:** Steps 4, 9
- **Risk:** Low (verification only)

## Testing Strategy

### Unit Tests
- `notifications.ts`: Test all query/mutation functions
- `notificationHelpers.ts`: Test stakeholder resolution logic

### Integration Tests
| Test Case | Description |
|-----------|-------------|
| IT-1 | Coach reports injury → Parent receives notification |
| IT-2 | Parent reports injury → Coach receives notification |
| IT-3 | Severe injury reported → Admin receives notification |
| IT-4 | Status changed to "cleared" → Both parties notified |
| IT-5 | Mark notification as read → Unread count decreases |
| IT-6 | Mark all as read → All notifications marked |

### Manual E2E Tests
| Test Case | Steps |
|-----------|-------|
| E2E-1 | Login as coach → Report injury → Login as parent → See notification |
| E2E-2 | Login as parent → Report injury → Login as coach → See notification |
| E2E-3 | Click notification → Navigate to injury page |
| E2E-4 | Multiple notifications → Badge shows correct count |

## Risks & Mitigations

### Risk 1: N+1 queries in notification creation
- **Severity:** High
- **Mitigation:** Batch fetch all recipients before creating notifications. Use `Promise.all` with pre-fetched data, not queries inside loops.

### Risk 2: Missing guardian links
- **Severity:** Medium
- **Mitigation:** Gracefully handle cases where player has no linked guardians. Log warning but don't fail the injury report.

### Risk 3: Notification spam
- **Severity:** Medium
- **Mitigation:**
  - Don't notify the person who triggered the action
  - Debounce rapid status changes (future enhancement)
  - Add user preference for notification types (Phase 2)

### Risk 4: Performance on large orgs
- **Severity:** Medium
- **Mitigation:**
  - Index all notification queries
  - Limit notification list to 10 items
  - Add pagination if needed (future)

### Risk 5: UI doesn't reflect real-time updates
- **Severity:** Low
- **Mitigation:** Convex's real-time subscriptions handle this automatically via `useQuery`.

## Success Criteria

### Phase 1A Complete
- [ ] `notifications` table exists in schema with proper indexes
- [ ] `notifications.ts` model has all CRUD functions
- [ ] `reportInjury` triggers notifications to parents
- [ ] `updateInjuryStatus` triggers notifications to stakeholders
- [ ] Severe injuries trigger admin notifications

### Phase 1B Complete
- [ ] Notification bell appears in navbar
- [ ] Unread count badge displays correctly
- [ ] Clicking bell shows notification dropdown
- [ ] Clicking notification marks it as read
- [ ] "Mark all as read" works
- [ ] Clicking notification navigates to related page

### Phase 1C Complete
- [ ] "Report Injury" button appears on parent injuries page
- [ ] Dialog opens with child selector and injury form
- [ ] Form validation works (required fields)
- [ ] Submitting creates injury with `reportedByRole: "guardian"`
- [ ] Coach receives notification when parent reports

### Overall Phase 1 Complete
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual E2E tests verified
- [ ] No N+1 query patterns introduced
- [ ] Code passes lint/type checks
- [ ] PR reviewed and merged

## Estimated Effort

| Phase | Steps | Complexity |
|-------|-------|------------|
| 1A: Backend | 1-4 | Medium |
| 1B: Frontend | 5-7 | Low |
| 1C: Parent Reporting | 8-10 | Low-Medium |

**Recommended Order:** 1A → 1C → 1B (backend first, then parent form, then notification UI)

This order allows testing notification triggers before building the UI.

## Dependencies Diagram

```
Step 1 (Schema)
    ↓
Step 2 (Notifications Model)
    ↓
Step 3 (Helpers)  ←──────────────────┐
    ↓                                │
Step 4 (Triggers) ───────────────────┤
    ↓                                │
Step 5 (Bell Component)              │
    ↓                                │
Step 6 (Dropdown)                    │
    ↓                                │
Step 7 (Navbar Integration)          │
                                     │
Step 8 (Parent Dialog) ──────────────┘
    ↓
Step 9 (Parent Page)
    ↓
Step 10 (Verification)
```

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Should notifications persist forever? | No - add cleanup job after 30 days (Phase 2) |
| Should we notify on every status change? | Yes for cleared/healed; No for active→recovering (minor) |
| Link format for notifications? | `/orgs/{orgId}/players/{playerId}?tab=injuries` |
| Batch vs individual notifications? | Individual for now; batch digests in Phase 2 |
