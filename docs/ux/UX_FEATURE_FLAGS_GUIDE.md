# UX Feature Flags Guide

This guide explains how to enable, disable, and manage UX experimental features in the PDP platform.

## Overview

UX experimental features are controlled through **PostHog Feature Flags**:

- **Who can enable/disable features**: Only Platform Staff (with PostHog admin access)
- **Who sees enabled features**: ALL users (not restricted to staff)
- **Default state**: All features OFF until explicitly enabled

This ensures controlled rollout while allowing platform-wide testing when features are enabled.

---

## Prerequisites

Before enabling UX features, ensure you have:

- [ ] **Platform Staff status** in PDP (to access PostHog)
- [ ] **PostHog dashboard access** (posthog.com or eu.posthog.com)
- [ ] **Admin permissions** in PostHog to create/edit feature flags

> **Note**: Regular users cannot enable/disable features themselves. Only Platform Staff with PostHog access control the feature flags.

---

## Step 1: Get PostHog Access (Platform Staff Only)

Only Platform Staff users can access PostHog to enable/disable UX features.

### Becoming Platform Staff

1. Log in to PDP as an existing Platform Staff user
2. Navigate to **Platform** → **Staff Management** (`/platform/staff`)
3. Find the user who needs feature flag control
4. Click **Add as Platform Staff**
5. Share PostHog credentials with the new staff member

### First-Time Setup (No Existing Staff)

The first user to register on a new PDP instance is automatically granted Platform Staff status.

### PostHog Access

Once you're Platform Staff, you need PostHog credentials:
1. Contact your team lead for PostHog login details
2. Or request access at posthog.com to your organization's project

---

## Step 2: Configure PostHog Feature Flags

### Accessing PostHog

1. Go to [PostHog](https://app.posthog.com) and log in
2. Select your PDP project
3. Navigate to **Feature Flags** in the left sidebar

### Available Feature Flags

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_admin_nav_sidebar` | Grouped sidebar navigation | Replaces 16 horizontal tabs with 4 collapsible groups in Admin Panel |
| `ux_bottom_nav` | Mobile bottom navigation | Adds persistent bottom navigation bar on mobile |
| `ux_mobile_cards` | Card-based mobile display | Uses cards instead of tables for data on mobile |
| `ux_touch_targets_44px` | 44px touch targets | Enforces minimum 44px touch targets (Apple/Google standard) |
| `ux_skeleton_loaders` | Skeleton loading states | Shows skeleton UI while content loads |

---

## Step 3: Create a Feature Flag in PostHog

### 3.1 Create New Flag

1. Click **+ New feature flag**
2. Enter the **Key** (e.g., `ux_admin_nav_sidebar`)
3. Add a **Description** (optional but recommended)

### 3.2 Configure Rollout

Choose how the flag is distributed:

#### Option A: Enable for All Platform Staff (Recommended for Internal Testing)
```
Release conditions:
└── Match: 100% of users
```
The platform staff check happens in-app, so all staff will see the feature.

#### Option B: Gradual Rollout to Staff
```
Release conditions:
└── Match: 25% of users
```
Only 25% of platform staff will see the feature (useful for A/B testing).

#### Option C: Specific Users Only
```
Release conditions:
└── User property: email
    └── matches: john@example.com, jane@example.com
```
Only these specific users will see the feature.

### 3.3 Enable the Flag

1. Toggle **Enabled** to ON
2. Click **Save**

---

## Step 4: Verify the Feature is Active

### Check in the Application

1. Log in as **any user** (features apply to all users when enabled)
2. Navigate to the relevant section:
   - For `ux_admin_nav_sidebar`: Go to any organization's Admin Panel
3. The new UI should be visible to everyone

### Debug via Browser Console

Open browser DevTools and check for PostHog logs:
```javascript
// In browser console
posthog.getFeatureFlag('ux_admin_nav_sidebar')
// Returns: true (enabled) or false (disabled)
```

---

## Step 5: Disable a Feature

### Temporary Disable (Keep Configuration)

1. Go to **Feature Flags** in PostHog
2. Find the flag
3. Toggle **Enabled** to OFF
4. Click **Save**

### Permanent Removal

1. Go to **Feature Flags** in PostHog
2. Find the flag
3. Click the **...** menu → **Delete**

---

## Troubleshooting

### Feature Not Appearing

| Issue | Solution |
|-------|----------|
| Feature flag not enabled | Enable the flag in PostHog and set 100% rollout |
| Rollout percentage too low | Increase rollout to 100% for full visibility |
| PostHog not loading | Check browser network tab for PostHog requests |
| Caching issue | Hard refresh the page (Ctrl+Shift+R) |

### Can't Access PostHog

| Issue | Solution |
|-------|----------|
| Not Platform Staff | Get added via `/platform/staff` by existing staff |
| No PostHog credentials | Request from team lead or existing admin |

### Check Platform Staff Status

```sql
-- In Convex Dashboard > Data
-- Check users table for isPlatformStaff = true
```

Or in the app, check if the user can access `/platform` routes.

---

## Feature Flag Combinations

Some features work best together:

### Recommended: Mobile UX Bundle
```
Enable all:
├── ux_bottom_nav
├── ux_mobile_cards
└── ux_touch_targets_44px
```

### Recommended: Admin Navigation Update
```
Enable:
└── ux_admin_nav_sidebar
```

---

## Rollout Process

### Phase 1: Internal Testing
1. Enable flags for 100% of users in PostHog
2. **All users** (not just staff) will see the feature
3. Platform Staff collect feedback from users

### Phase 2: A/B Testing (Optional)
1. Set rollout to 50%
2. Compare metrics between groups
3. Use PostHog analytics to measure impact

### Phase 3: Full Rollout (Make Permanent)
1. Keep flags enabled at 100%
2. Or update code to make the feature the default (remove flag check)
3. Archive the feature flag in PostHog

---

## Code Reference

### Phase 2 Data Display Components

Located in `apps/web/src/components/data-display/`:

| Component | Description | Usage |
|-----------|-------------|-------|
| `ResponsiveDataView` | Shows cards on mobile, table on desktop | Main data display component |
| `SwipeableCard` | Card with swipe-to-reveal actions | Mobile list items |

Located in `apps/web/src/hooks/`:

| Hook | Description | Usage |
|------|-------------|-------|
| `usePullToRefresh` | Pull-to-refresh gesture handling | Mobile list refresh |

### Feature Flag Hook Location
```
apps/web/src/hooks/use-ux-feature-flags.ts
```

### How It Works in Code
```typescript
// In any component
const { adminNavStyle, useBottomNav } = useUXFeatureFlags();

// When flag is OFF (default):
// { adminNavStyle: "current", useBottomNav: false, ... }

// When flag is ON (enabled in PostHog):
// { adminNavStyle: "sidebar", useBottomNav: true, ... }

// Features apply to ALL users when enabled
```

### Admin Layout Integration
```
apps/web/src/app/orgs/[orgId]/admin/layout.tsx
```

---

## Quick Reference Commands

### Enable Sidebar Navigation for Testing
1. PostHog → Feature Flags → New
2. Key: `ux_admin_nav_sidebar`
3. Rollout: 100%
4. Enable → Save

### Disable All Experimental Features
1. PostHog → Feature Flags
2. Disable all `ux_*` flags

### Check Current User Status
Navigate to `/platform/staff` to see all platform staff members.

---

## Support

For issues with feature flags:
1. Check this guide's troubleshooting section
2. Verify PostHog configuration
3. Check browser console for errors
4. Review the `use-ux-feature-flags.ts` hook logic