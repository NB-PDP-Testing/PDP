# What's Actually Deployed - January 17, 2026

## Quick Status

**Question:** "What is left to deploy to main? I don't see passport sharing, enhanced user profile/card, or role switching improvements."

**Answer:** Everything is deployed to main, but some features require:
1. ✅ Feature flags enabled in PostHog (you said these are ON)
2. ❌ **Navigation links missing** (users can't find the pages)
3. ⚠️ PostHog feature flag loading may have issues

---

## Feature Status Breakdown

### 1. Enhanced User Menu ✅ DEPLOYED (Feature Flag Controlled)

**Status:** Fully deployed, waiting for PostHog flag to enable

**Files:**
- Component: `/apps/web/src/components/profile/enhanced-user-menu.tsx`
- Dialogs:
  - `/apps/web/src/components/profile/profile-settings-dialog.tsx` ✅
  - `/apps/web/src/components/profile/preferences-dialog.tsx` ✅
  - `/apps/web/src/components/profile/alerts-dialog.tsx` ✅
- Integration: `/apps/web/src/components/header.tsx` (lines 16, 198-205)

**Feature Flags Required:**
- `ux_enhanced_user_menu` → Shows enhanced user menu (you said this is ON)
- `ux_org_usage_tracking` → Shows usage stats in menu (you said this is ON)

**How It Works:**
```tsx
// header.tsx line 198-205
{useEnhancedUserMenu ? (
  <EnhancedUserMenu />  // New enhanced menu
) : (
  <>
    <UserMenu />        // Old menu
    <ModeToggle />
  </>
)}
```

**What You Should See:**
- Avatar button in header (top right)
- Click opens dropdown with:
  - User profile (name, email)
  - Theme selector (Light/Dark/System)
  - Quick actions: Profile, Settings, Alerts
  - Sign out button

**Troubleshooting:**
1. Open browser console
2. Look for: `[PostHog] Successfully initialized!`
3. Check: `posthog.isFeatureEnabled('ux_enhanced_user_menu')`
4. If false, flags aren't loading from PostHog

---

### 2. Passport Sharing ✅ DEPLOYED (Backend + Frontend)

**Status:** Fully deployed, **BUT NO NAVIGATION LINKS**

#### Backend (100% Complete)

**Schema Tables:**
- `passportShareConsents` ✅
- `passportShareAccessLogs` ✅
- `passportShareRequests` ✅
- `parentNotificationPreferences` ✅
- `passportShareNotifications` ✅

**Backend Functions:** `/packages/backend/convex/models/passportSharing.ts`
- Consent management (create, revoke, renew)
- Request workflows (coach requests access)
- Access control (consentGateway)
- Notifications (guardian/coach)
- Audit logging

#### Frontend (100% Complete, No Navigation)

**Parent Sharing Dashboard:**
- **Page:** `/orgs/[orgId]/parents/sharing/page.tsx` ✅ EXISTS
- **Components:**
  - `parent-sharing-dashboard.tsx` - Main dashboard
  - `child-sharing-card.tsx` - Per-child sharing controls
  - `enable-sharing-wizard.tsx` - Onboarding wizard
  - `pending-requests.tsx` - Coach access requests
  - `access-audit-log.tsx` - Who accessed what/when
  - `notification-preferences.tsx` - Email/alert preferences
  - `quick-share.tsx` - Fast sharing controls
  - `revoke-consent-modal.tsx` - Revoke sharing
- **URL:** `/orgs/{orgId}/parents/sharing`
- **Problem:** ❌ **NO NAVIGATION LINK** from parent dashboard

**Coach Shared Passports View:**
- **Component:** `/orgs/[orgId]/coach/shared-passports.tsx` ✅ EXISTS
- **Integration:** ✅ Embedded in coach-dashboard.tsx (line 654)
- **Status:** ✅ **Already visible on coach dashboard**

**Admin Sharing Statistics:**
- **Page:** `/orgs/[orgId]/admin/sharing/page.tsx` ✅ EXISTS
- **URL:** `/orgs/{orgId}/admin/sharing`
- **Problem:** ❌ **NO NAVIGATION LINK** in admin sidebar

---

### 3. Role Switching ✅ DEPLOYED AND VISIBLE

**Status:** Fully deployed and should be visible

**Component:** `/apps/web/src/components/org-role-switcher.tsx`
**Integration:** `/apps/web/src/components/header.tsx` (line 195)

**What You Should See:**
- Dropdown in header showing current org + role
- Click to switch between:
  - Different organizations
  - Different roles (Coach/Parent/Admin)

**This should already be visible** - check top-right of header.

---

## What's Missing: Navigation Links

### Missing Link 1: Parent → Sharing Dashboard

**Current:** Parents have no way to navigate to `/orgs/[orgId]/parents/sharing`

**Fix Needed:** Add link to parent dashboard navigation

**File to Edit:** `/apps/web/src/app/orgs/[orgId]/parents/page.tsx`

**Add:**
```tsx
<Link href={`/orgs/${orgId}/parents/sharing`}>
  <Button>Manage Passport Sharing</Button>
</Link>
```

### Missing Link 2: Admin → Sharing Statistics

**Current:** Admins have no way to navigate to `/orgs/[orgId]/admin/sharing`

**Fix Needed:** Add to admin sidebar navigation

**File to Edit:** Admin layout or sidebar navigation

---

## How to Verify Features Are Working

### Test Enhanced User Menu

1. Open app at `http://localhost:3000`
2. Log in
3. Open browser console
4. Look for PostHog initialization:
   ```
   [PostHog] Initializing... {hasKey: true, hasHost: true}
   [PostHog] Successfully initialized!
   ```
5. Check feature flag:
   ```javascript
   posthog.isFeatureEnabled('ux_enhanced_user_menu')
   // Should return: true
   ```
6. If true but menu not showing, check header.tsx line 198

### Test Passport Sharing (Parents)

**Direct URL Test:**
1. Navigate to: `http://localhost:3000/orgs/{YOUR_ORG_ID}/parents/sharing`
2. Should see "Passport Sharing Dashboard"
3. If you see it, the feature works - just needs navigation link

**Coach View Test:**
1. Navigate to coach dashboard: `http://localhost:3000/orgs/{YOUR_ORG_ID}/coach`
2. Scroll down - should see "Shared Passports" section
3. This should already be visible

**Admin View Test:**
1. Navigate to: `http://localhost:3000/orgs/{YOUR_ORG_ID}/admin/sharing`
2. Should see sharing statistics
3. If you see it, the feature works - just needs navigation link

---

## Why You're Not Seeing Features

### Issue 1: PostHog Feature Flags Not Loading

**Symptoms:**
- Enhanced User Menu not showing despite flag being ON in PostHog
- Old UserMenu + ModeToggle showing instead

**Diagnosis:**
```javascript
// In browser console:
posthog.isFeatureEnabled('ux_enhanced_user_menu')
// If returns false, flags aren't loading
```

**Possible Causes:**
1. PostHog API key mismatch
2. User not identified with PostHog
3. Flags not set for all users (check PostHog rollout %)
4. Cookie issues (flags bootstrapped from cookies)

**Fix:**
1. Check PostHog dashboard → Feature Flags
2. Verify `ux_enhanced_user_menu` is:
   - Enabled: true
   - Rollout: 100% (or includes you)
3. Clear browser cookies and reload
4. Check console for `[PostHog]` messages

### Issue 2: No Navigation to Passport Sharing Pages

**Symptoms:**
- Can't find passport sharing dashboard
- Features exist but no way to access them

**Diagnosis:**
- Try direct URL: `/orgs/{orgId}/parents/sharing`
- If it loads, navigation is just missing

**Fix:** Add navigation links (see below)

---

## Quick Fixes Needed

### 1. Add Parent Sharing Navigation

**File:** `/apps/web/src/app/orgs/[orgId]/parents/page.tsx`

Add button/link to sharing page in parent dashboard.

### 2. Add Admin Sharing Navigation

**File:** Admin sidebar navigation (need to locate)

Add "Sharing Statistics" link to admin menu.

### 3. Debug PostHog Feature Flags

If Enhanced User Menu isn't showing:

1. Check browser console for PostHog messages
2. Verify flags in PostHog dashboard
3. Test flag directly:
   ```javascript
   // In console:
   posthog.isFeatureEnabled('ux_enhanced_user_menu')
   ```
4. If false, check:
   - Rollout percentage (should be 100%)
   - User targeting (should be "all users")
   - Flag key spelling matches exactly

---

## Summary

| Feature | Backend | Frontend | Navigation | Visible? |
|---------|---------|----------|------------|----------|
| Enhanced User Menu | ✅ | ✅ | ✅ In header | ⚠️ If flag works |
| Passport Sharing (Parent) | ✅ | ✅ | ❌ Missing | No (no link) |
| Passport Sharing (Coach) | ✅ | ✅ | ✅ In dashboard | Yes |
| Passport Sharing (Admin) | ✅ | ✅ | ❌ Missing | No (no link) |
| Role Switching | ✅ | ✅ | ✅ In header | Yes |

---

## Next Steps

**Option 1:** Fix navigation links (5 minutes)
- Add link in parent dashboard → sharing page
- Add link in admin sidebar → sharing statistics

**Option 2:** Debug PostHog flags (10 minutes)
- Check console logs
- Verify flag configuration in PostHog
- Test flag loading

**Option 3:** Manual testing (2 minutes)
- Try direct URLs to verify pages work
- Confirm features just need navigation

**Recommendation:** Start with Option 3 (manual testing), then Option 1 (add links), then Option 2 (debug flags if needed).

---

**End of Status Document**
