# Injury Notification System - Phase 1 Implementation

**GitHub Issue:** #261
**Status:** Completed
**Date:** February 2026

## Overview

Phase 1 implements in-app notifications for the injury tracking system, alerting relevant stakeholders when injuries are reported or when injury status changes significantly.

## Features Implemented

### 1. Notification Types

| Type | Title | When Triggered | Icon |
|------|-------|----------------|------|
| `injury_reported` | "Injury Reported" | Minor/moderate injury created | Orange Heart |
| `severe_injury_alert` | "Severe Injury Reported" | Severe/long-term injury created | Red AlertTriangle |
| `injury_cleared` | "Player Cleared to Return" | Status changed to cleared | Green CheckCircle |
| `injury_status_changed` | "Injury Fully Healed" | Status changed to healed | Blue Heart |

### 2. Notification Recipients

#### When Injury is Reported

| Reporter | Recipients |
|----------|------------|
| Guardian/Player | All coaches assigned to player's teams |
| Coach/Admin | All guardians linked to player |

**Additional rule:** Severe or long-term injuries also notify all organization admins/owners.

#### When Status Changes to Cleared/Healed

- All guardians linked to the player
- All coaches assigned to player's teams
- (Reporter is excluded from notifications)

### 3. UI Improvements

- **Notification Bell:** Updated with injury-specific icons and styling
- **Edit Injury Dialog:** Full field editing capability for coaches
- **Clickable History Cards:** Injury history cards open edit dialog when clicked
- **Status Dropdown:** All status options available in edit dialog

## Technical Implementation

### Files Changed

| File | Changes |
|------|---------|
| `packages/backend/convex/lib/injuryNotifications.ts` | NEW - Notification helper module |
| `packages/backend/convex/models/members.ts` | Added `getAdminUserIdsForOrg` internal query |
| `packages/backend/convex/models/playerInjuries.ts` | Integrated notifications into mutations |
| `packages/backend/convex/models/notifications.ts` | Added injury notification types |
| `packages/backend/convex/schema.ts` | Added notification type literals |
| `apps/web/src/components/notifications/notification-bell.tsx` | Added injury icons and styling |
| `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx` | Added edit dialog and clickable cards |

### Helper Functions

```typescript
// packages/backend/convex/lib/injuryNotifications.ts

getGuardianUserIdsForPlayer(ctx, playerIdentityId)
// Returns user IDs of guardians linked to a player

getCoachUserIdsForPlayer(ctx, playerIdentityId, organizationId)
// Returns user IDs of coaches assigned to player's teams

getAdminUserIdsForOrg(ctx, organizationId)
// Returns user IDs of org admins/owners (via internal query)

notifyInjuryReported(ctx, args)
// Creates notifications when new injuries are reported

notifyStatusChanged(ctx, args)
// Creates notifications when injury status changes
```

### Notification Workflow Diagrams

#### New Injury Reported

```
┌─────────────────────────────────────────────────────────────┐
│                    INJURY REPORTED                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IF reported by Guardian/Player:                            │
│    → Notify all coaches assigned to player's teams          │
│                                                             │
│  IF reported by Coach/Admin:                                │
│    → Notify all guardians linked to player                  │
│                                                             │
│  IF severity is "severe" or "long_term":                    │
│    → ALSO notify all org admins/owners                      │
│                                                             │
│  Deduplication:                                             │
│    - Reporter filtered out (don't notify yourself)          │
│    - Duplicates removed via Set                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Status Changed

```
┌─────────────────────────────────────────────────────────────┐
│                 STATUS CHANGED                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Only triggers for significant changes:                     │
│    - Status changed to "cleared" (return to play)           │
│    - Status changed to "healed" (fully recovered)           │
│                                                             │
│  Recipients:                                                │
│    → All guardians linked to player                         │
│    → All coaches assigned to player's teams                 │
│                                                             │
│  Deduplication:                                             │
│    - Updater filtered out                                   │
│    - Duplicates removed via Set                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. No Clickable Links (Phase 1)

Notifications are informational only - no navigation links. This avoids:
- Routing complexity (different pages for different user roles)
- 404 errors from non-existent routes
- Role-based access issues

### 2. Deduplication Strategy

Multiple levels of deduplication prevent duplicate notifications:
1. `getAdminUserIdsForOrg` uses `Set` to dedupe user IDs
2. `notifyInjuryReported/notifyStatusChanged` use `Set` on final recipients
3. Reporter is always filtered out

### 3. Error Handling

Notification failures are logged but don't block the main operation:
```typescript
try {
  await injuryNotifications.notifyInjuryReported(ctx, {...});
} catch (error) {
  console.error("[reportInjury] Failed to send notifications:", error);
}
```

### 4. Better Auth Integration

Admin lookup requires the Better Auth adapter pattern. Implemented via internal query in `members.ts` to access `components.betterAuth.adapter.findMany`.

## Testing Checklist

- [x] Coach reports minor injury → Parents notified
- [x] Coach reports severe injury → Parents AND admins notified
- [x] Parent reports injury → Coaches notified
- [x] Status changed to "cleared" → Both parents and coaches notified
- [x] Status changed to "healed" → Both parents and coaches notified
- [x] Reporter not notified of their own action
- [x] No duplicate notifications for same user
- [x] Notification bell displays correct icons
- [x] Edit injury dialog works from history cards

## Future Enhancements (Phase 2+)

- Email notifications for severe injuries
- Push notifications (mobile)
- Notification preferences per user
- Clickable links to injury details (role-aware routing)
- Admin injuries dashboard
