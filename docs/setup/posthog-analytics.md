# PostHog Implementation Guide - Exact Code Changes

**Status:** Phase 1-3 Implementation
**Completed:** Backend helper + signup tracking + Feature Flag Bootstrap
**Remaining:** ~95 events across 30+ files

This guide provides **copy-paste code examples** for implementing Phase 1-3 tracking.

---

## ✅ Already Implemented

- ✅ Backend tracking helper (`convex/lib/analytics.ts`)
- ✅ `user_signed_up` - Email signup tracking
- ✅ `user_logged_in` - Already tracking (auth tracker)
- ✅ `user_logged_out` - Already tracking (auth tracker)
- ✅ **Feature Flag Bootstrap** - Server-side flag fetching via proxy.ts

---

## 🏗️ Architecture: Feature Flag Bootstrap

Feature flags are fetched server-side to eliminate the race condition where components render before flags load.

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   proxy.ts      │────▶│   PostHog API   │────▶│  Cookie Set     │
│ (server-side)   │     │  getAllFlags()  │     │ ph-bootstrap-   │
└─────────────────┘     └─────────────────┘     │     flags       │
                                                └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  PHProvider     │◀────│   Read Cookie   │◀─────────────┘
│ (client-side)   │     │                 │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ useUXFeature    │
│    Flags()      │
│ (instant access)│
└─────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/proxy.ts` | Server-side flag fetching (Next.js 16 proxy) |
| `apps/web/src/providers/posthog-provider.tsx` | Client-side PostHog init with bootstrap |
| `apps/web/src/hooks/use-ux-feature-flags.ts` | React hook to access feature flags |

### Why proxy.ts (not middleware.ts)?

In **Next.js 16**, the `middleware.ts` file convention was renamed to `proxy.ts`. The exported function is `proxy` instead of `middleware`. This clarifies the network boundary purpose.

### Cookies Used

| Cookie | Purpose | TTL |
|--------|---------|-----|
| `ph-bootstrap-flags` | Cached feature flag values (JSON) | 5 minutes |
| `ph-distinct-id` | User identifier for consistent flag values | 1 year |

---

## 🔥 Phase 1: Critical Events (Implement These First)

### 1. Organization Creation

**File:** `packages/backend/convex/models/organizations.ts`

**Find the mutation:** Look for the function that creates organizations (likely `createOrganization` or similar)

**Add this import at the top:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Add tracking after organization is created:**
```typescript
export const createOrganization = mutation({
  // ... existing args/returns
  handler: async (ctx, args) => {
    // Existing org creation code
    const orgId = await ctx.db.insert("organizations", {
      // ... org data
    });

    // 🆕 ADD THIS: Track organization creation
    await track(ctx, AnalyticsEvents.ORG_CREATED, {
      org_id: orgId,
      org_name: args.name,
      has_logo: !!args.logoUrl,
      sports_count: args.supportedSports?.length || 0,
    });

    return orgId;
  },
});
```

---

### 2. Organization Settings Updates

**File:** `packages/backend/convex/models/organizations.ts`

**Add to color update mutation:**
```typescript
export const updateOrganizationColors = mutation({
  handler: async (ctx, args) => {
    // ... existing update logic

    // 🆕 ADD THIS: Track settings update
    await track(ctx, AnalyticsEvents.ORG_SETTINGS_UPDATED, {
      org_id: args.organizationId,
      update_type: "colors",
      has_primary: !!args.primaryColor,
      has_secondary: !!args.secondaryColor,
    });
  },
});
```

**Add to social links update:**
```typescript
export const updateOrganizationSocialLinks = mutation({
  handler: async (ctx, args) => {
    // ... existing update logic

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.ORG_SETTINGS_UPDATED, {
      org_id: args.organizationId,
      update_type: "social_links",
    });
  },
});
```

---

### 3. Join Request Flow

**File:** `packages/backend/convex/models/orgJoinRequests.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track join request creation:**
```typescript
export const createJoinRequest = mutation({
  handler: async (ctx, args) => {
    // ... existing code
    const requestId = await ctx.db.insert("orgJoinRequests", {
      // ... request data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.JOIN_REQUEST_CREATED, {
      org_id: args.organizationId,
      requested_role: args.functionalRole,
      has_children_info: !!args.metadata?.children?.length,
    });

    return requestId;
  },
});
```

**Track approval:**
```typescript
export const approveJoinRequest = mutation({
  handler: async (ctx, args) => {
    // ... approval logic
    const request = await ctx.db.get(args.requestId);

    // ... rest of approval code

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.JOIN_REQUEST_APPROVED, {
      org_id: request.organizationId,
      approved_role: request.functionalRole,
      auto_linked_players: linkedPlayerIds?.length || 0,
    });
  },
});
```

**Track rejection:**
```typescript
export const rejectJoinRequest = mutation({
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);

    // ... rejection logic

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.JOIN_REQUEST_REJECTED, {
      org_id: request.organizationId,
      requested_role: request.functionalRole,
      reason: args.reason,
    });
  },
});
```

---

### 4. Team Creation

**File:** `packages/backend/convex/models/teams.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track team creation:**
```typescript
export const createTeam = mutation({
  handler: async (ctx, args) => {
    const teamId = await ctx.db.insert("teams", {
      // ... team data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.TEAM_CREATED, {
      org_id: args.organizationId,
      team_id: teamId,
      sport: args.sport,
      age_group: args.ageGroup,
      gender: args.gender,
      season: args.season,
    });

    return teamId;
  },
});
```

---

### 5. Player Enrollment

**File:** `packages/backend/convex/models/players.ts` or `orgPlayerEnrollments.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track single player creation:**
```typescript
export const createPlayer = mutation({
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("playerIdentities", {
      // ... player data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.PLAYER_ENROLLED, {
      org_id: args.organizationId,
      player_id: playerId,
      age_group: args.ageGroup,
      gender: args.gender,
      has_medical_info: !!args.medicalProfile,
    });

    return playerId;
  },
});
```

**Track bulk import:**
```typescript
export const bulkImportPlayers = mutation({
  handler: async (ctx, args) => {
    // ... bulk import logic
    const results = /* imported players */;

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.PLAYERS_BULK_IMPORTED, {
      org_id: args.organizationId,
      total_players: results.length,
      with_parents: results.filter(r => r.parentLinked).length,
      import_method: "csv",
    });
  },
});
```

---

### 6. Invitation Tracking (NEW - User Requested)

**File:** `packages/backend/convex/models/members.ts` or wherever invitations are sent

**Track invitation sent:**
```typescript
// In the function that sends invitations (likely in better-auth integration)
export const inviteUserToOrganization = mutation({
  handler: async (ctx, args) => {
    // ... invitation logic

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.USER_INVITED, {
      org_id: args.organizationId,
      invited_role: args.functionalRole,
      invitation_method: "email",
    });
  },
});
```

**Track invitation acceptance:**
```typescript
// In the accept invitation handler
export const acceptInvitation = mutation({
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    // ... acceptance logic

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.INVITATION_ACCEPTED, {
      org_id: invitation.organizationId,
      accepted_role: invitation.functionalRole,
    });
  },
});
```

---

## 🎯 Phase 2: Feature Usage Events

### 7. Skill Assessment Tracking

**File:** `packages/backend/convex/models/skillAssessments.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track individual assessment:**
```typescript
export const recordAssessment = mutation({
  handler: async (ctx, args) => {
    const assessmentId = await ctx.db.insert("skillAssessments", {
      // ... assessment data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.SKILL_ASSESSMENT_COMPLETED, {
      org_id: args.organizationId,
      player_id: args.playerId,
      skill_id: args.skillId,
      rating: args.rating,
      assessment_type: args.assessmentType,
      has_notes: !!args.notes,
    });

    return assessmentId;
  },
});
```

**Track batch assessments:**
```typescript
export const recordBatchAssessments = mutation({
  handler: async (ctx, args) => {
    // ... batch logic

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.ASSESSMENTS_BATCH_RECORDED, {
      org_id: args.organizationId,
      total_assessments: args.assessments.length,
      unique_players: new Set(args.assessments.map(a => a.playerId)).size,
      skill_id: args.skillId,
    });
  },
});
```

---

### 8. Goal Tracking

**File:** `packages/backend/convex/models/passportGoals.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track goal creation:**
```typescript
export const createGoal = mutation({
  handler: async (ctx, args) => {
    const goalId = await ctx.db.insert("passportGoals", {
      // ... goal data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.GOAL_CREATED, {
      org_id: args.organizationId,
      player_id: args.playerId,
      category: args.category,
      priority: args.priority,
      has_milestones: args.milestones?.length > 0,
      parent_visible: args.parentVisible,
    });

    return goalId;
  },
});
```

**Track milestone completion:**
```typescript
export const completeMilestone = mutation({
  handler: async (ctx, args) => {
    // ... completion logic
    const goal = await ctx.db.get(args.goalId);

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.GOAL_MILESTONE_COMPLETED, {
      org_id: goal.organizationId,
      player_id: goal.playerId,
      goal_id: args.goalId,
    });
  },
});
```

---

### 9. Voice Notes & AI Insights

**File:** `packages/backend/convex/models/voiceNotes.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track typed note:**
```typescript
export const createTypedNote = mutation({
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      // ... note data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.VOICE_NOTE_RECORDED, {
      org_id: args.organizationId,
      note_type: "typed",
      training_type: args.noteType,
      character_count: args.content.length,
    });

    return noteId;
  },
});
```

**Track audio note:**
```typescript
export const createRecordedNote = mutation({
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      // ... note data
    });

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.VOICE_NOTE_RECORDED, {
      org_id: args.organizationId,
      note_type: "audio",
      training_type: args.noteType,
    });

    return noteId;
  },
});
```

**Track AI insight generation (internal mutation):**
```typescript
export const updateInsights = internalMutation({
  handler: async (ctx, args) => {
    // ... update insights

    // 🆕 ADD THIS
    await track(ctx, AnalyticsEvents.AI_INSIGHT_GENERATED, {
      voice_note_id: args.noteId,
      insights_count: args.insights?.length || 0,
    });
  },
});
```

---

### 10. Injury Tracking

**File:** `packages/backend/convex/models/playerInjuries.ts`

**Add import:**
```typescript
import { track, AnalyticsEvents } from "../lib/analytics";
```

**Track injury report:**
```typescript
export const reportInjury = mutation({
  handler: async (ctx, args) => {
    const injuryId = await ctx.db.insert("playerInjuries", {
      // ... injury data
    });

    // 🆕 ADD THIS
    await track(ctx, "injury_reported", {
      org_id: args.organizationId,
      player_id: args.playerId,
      severity: args.severity,
      body_part: args.bodyPart,
      injury_type: args.injuryType,
    });

    return injuryId;
  },
});
```

**Track status update:**
```typescript
export const updateInjuryStatus = mutation({
  handler: async (ctx, args) => {
    const injury = await ctx.db.get(args.injuryId);

    // ... update logic

    // 🆕 ADD THIS
    await track(ctx, "injury_status_updated", {
      org_id: injury.organizationId,
      player_id: injury.playerId,
      old_status: injury.recoveryStatus,
      new_status: args.newStatus,
    });
  },
});
```

---

## 📄 Phase 3: Page View Tracking

### Coach Pages

**Pattern for all coach pages:**

```typescript
"use client";

import { useAnalytics } from "@/lib/analytics";
import { useEffect } from "react";

export default function CoachAssessPage() {
  const { track } = useAnalytics();

  useEffect(() => {
    track("page_coach_assess_opened", {
      // Add any relevant context
    });
  }, []); // Empty dependency array = track once on mount

  return (
    // ... page content
  );
}
```

**Files to update:**

1. `/apps/web/src/app/orgs/[orgId]/coach/page.tsx` → `page_coach_dashboard_opened`
2. `/apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx` → `page_coach_assess_opened`
3. `/apps/web/src/app/orgs/[orgId]/coach/goals/page.tsx` → `page_coach_goals_opened`
4. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx` → `page_coach_voice_notes_opened`
5. `/apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx` → `page_coach_injuries_opened`
6. `/apps/web/src/app/orgs/[orgId]/coach/match-day/page.tsx` → `page_coach_match_day_opened`

---

### Admin Pages

**Same pattern - add to these files:**

1. `/apps/web/src/app/orgs/[orgId]/admin/page.tsx` → `page_admin_dashboard_opened`
2. `/apps/web/src/app/orgs/[orgId]/admin/players/page.tsx` → `page_admin_players_opened`
3. `/apps/web/src/app/orgs/[orgId]/admin/teams/page.tsx` → `page_admin_teams_opened`
4. `/apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` → `page_admin_users_opened`
5. `/apps/web/src/app/orgs/[orgId]/admin/coaches/page.tsx` → `page_admin_coaches_opened`
6. `/apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx` → `page_admin_guardians_opened`
7. `/apps/web/src/app/orgs/[orgId]/admin/medical/page.tsx` → `page_admin_medical_opened`
8. `/apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx` → `page_admin_import_opened`

---

### Parent Portal

**File:** `/apps/web/src/app/orgs/[orgId]/parents/page.tsx`

```typescript
"use client";

import { useAnalytics } from "@/lib/analytics";
import { useEffect } from "react";

export default function ParentPortal() {
  const { track } = useAnalytics();

  useEffect(() => {
    track("page_parent_dashboard_opened", {
      children_count: linkedChildren?.length || 0,
    });
  }, [linkedChildren]);

  return (
    // ... page content
  );
}
```

---

## 🧪 Testing Your Implementation

### 1. Test Signup Event

1. Go to `/signup`
2. Create a new account with email
3. Go to PostHog → Activity
4. Look for `user_signed_up` event
5. Verify properties: `method: "email"`, `has_redirect: false`

### 2. Test Backend Events

After adding backend tracking:

1. Perform the action (e.g., create team)
2. Check browser console for `[Analytics] team_created { org_id: "...", ... }`
3. Go to PostHog → Activity
4. Verify event appears (may take 10-30 seconds)

### 3. Test Page Views

1. Navigate to a tracked page (e.g., `/coach/assess`)
2. PostHog Activity should show `page_coach_assess_opened`
3. Verify it only tracks once per page load

---

## 📊 After Implementation

Once events are tracking, create dashboards in PostHog:

### Onboarding Funnel
1. Go to Insights → New Insight → Funnels
2. Steps:
   - `user_signed_up`
   - `join_request_created`
   - `join_request_approved`
   - `team_created`
   - `player_enrolled`
3. Save to new dashboard: "🚀 User Onboarding"

### Feature Adoption
1. Go to Insights → New Insight → Trends
2. Add events:
   - `voice_note_recorded`
   - `skill_assessment_completed`
   - `goal_created`
   - `injury_reported`
3. Chart type: Line chart
4. Interval: Weekly
5. Save to new dashboard: "📊 Feature Usage"

---

## 🎯 Implementation Checklist

### Phase 1 - Critical Events
- [x] Backend tracking helper created
- [x] User signup tracking
- [ ] Organization creation
- [ ] Organization settings updates
- [ ] Join request flow (created, approved, rejected)
- [ ] Team creation
- [ ] Player enrollment (single + bulk)
- [ ] Invitation tracking (sent, accepted)

### Phase 2 - Feature Usage
- [ ] Skill assessments (individual + batch)
- [ ] Goal creation & milestones
- [ ] Voice notes (typed + audio)
- [ ] AI insight generation
- [ ] Injury tracking

### Phase 3 - Page Views
- [ ] Coach pages (6 pages)
- [ ] Admin pages (8 pages)
- [ ] Parent portal

### Testing & Dashboards
- [ ] Test all critical events
- [ ] Verify events in PostHog Activity
- [ ] Create Onboarding Funnel dashboard
- [ ] Create Feature Adoption dashboard
- [ ] Document insights and findings

---

## 💡 Pro Tips

1. **Test as you go** - Implement one event, test it, move to next
2. **Check console logs** - `[Analytics]` logs help debug
3. **Use browser Network tab** - See PostHog requests going out
4. **Be patient** - Events may take 10-30 seconds to appear in PostHog
5. **Commit frequently** - Commit after each major section

---

**Estimated Time:**
- Phase 1: 2-3 hours
- Phase 2: 2-3 hours
- Phase 3: 1-2 hours
- Testing & Dashboards: 1 hour

**Total: 6-9 hours** for complete Phase 1-3 implementation

Good luck! 🚀
