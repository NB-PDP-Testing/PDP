# Bug Analysis: Issue #310 - Voice Insights Visibility for Parent

**Issue:** [#310 - UAT test error in parent voice note creation](https://github.com/NB-PDP-Testing/PDP/issues/310)

**Date:** 2026-01-23

**Status:** NOT A BUG - Working as designed

---

## Summary

User reported that when logged in as a parent, they could see the Voice Insights section with "Create Voice Note" button on their child's passport, and clicking it navigated to the coaches section.

---

## Investigation Findings

### Root Cause: User Has Both Coach AND Parent Roles

The user testing this has **both coach and parent functional roles** for the player in question. The system correctly prioritizes the coach view when a user has coaching privileges.

### Permission Logic Analysis

**File:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` (lines 293-308)

```typescript
{permissions.isCoach || permissions.isAdmin ? (
  /* Coaches/Admins: Show raw insights with transcriptions (prioritized) */
  <VoiceInsightsSectionImproved
    isAdmin={permissions.isAdmin}
    isCoach={permissions.isCoach}
    isParent={false}
    orgId={orgId}
    playerIdentityId={playerId as Id<"playerIdentities">}
  />
) : permissions.isParent ? (
  /* Parents: Show ONLY approved parent summaries (parent-safe content) */
  <ParentSummariesSection
    orgId={orgId}
    playerIdentityId={playerId as Id<"playerIdentities">}
  />
) : null}
```

### How It Works

| User Role(s) | Component Shown | Has "Create Voice Note" |
|--------------|-----------------|-------------------------|
| Coach only | VoiceInsightsSectionImproved | ✅ Yes |
| Admin only | VoiceInsightsSectionImproved | ✅ Yes |
| Parent only | ParentSummariesSection | ❌ No |
| **Coach + Parent** | VoiceInsightsSectionImproved | ✅ Yes |
| Admin + Parent | VoiceInsightsSectionImproved | ✅ Yes |
| No relevant role | Nothing | ❌ No |

### Why This Design Is Correct

1. **Coach role is prioritized** - If you're a coach, you need access to coaching tools regardless of other roles
2. **Security maintained** - Parent-only users see `ParentSummariesSection` which shows only approved, curated content
3. **No data leakage** - Parent summaries are explicitly filtered to show only `approved`, `delivered`, or `viewed` status content
4. **Practical usage** - A coach who is also a parent needs full coaching capabilities, not a restricted view

---

## Verification Steps

To verify this is working correctly:

1. **Test with parent-only account:**
   - Create a user with only "parent" functional role
   - Link them to a player
   - View the player passport
   - Should see "Coach Updates" section (ParentSummariesSection), NOT "Voice Insights"
   - Should NOT see "Create Voice Note" button

2. **Test with coach+parent account:**
   - Log in with current test account (has both roles)
   - View the player passport
   - Should see "Voice Insights" section (VoiceInsightsSectionImproved)
   - Should see "Create Voice Note" button
   - This is **expected behavior**

---

## Resolution

**No code changes required.** The system is operating as designed.

The confusion arose because the tester has dual roles (coach + parent). When testing parent-specific functionality, use an account that ONLY has the parent role.

---

## Related Components

- `VoiceInsightsSectionImproved` - Full coach interface with insights, transcriptions, create button
- `ParentSummariesSection` - Parent-safe view showing only approved summaries
- Permission determination at lines 124-146 in page.tsx

