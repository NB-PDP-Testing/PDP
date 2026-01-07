# PostHog Integration Plan - PlayerARC/PDP

**Created:** January 3, 2026
**Status:** Comprehensive implementation roadmap based on actual codebase features

This document provides a complete plan for integrating PostHog analytics across all implemented PlayerARC features.

---

## Executive Summary

**Scope:** 100+ tracking opportunities across 10+ user flows
**Implementation Time:** 3-4 weeks (phased approach)
**Priority Events:** 15 critical events for immediate tracking
**Total Potential Events:** 100+ business events

---

## Current State

### ✅ Already Tracking (3 events)
- `$pageview` - Automatic page navigation
- `user_logged_in` - User login
- `user_logged_out` - User logout

### ❌ Not Yet Tracking (Need Code Changes)
- All business events (organizations, teams, players, assessments, goals, injuries, etc.)
- Feature usage events (coach tools, admin tools, parent portal)
- Data operations (imports, exports, bulk operations)

---

## Phase 1: Foundation Events (Week 1) - HIGH PRIORITY

These events provide core funnel tracking and user engagement metrics.

### 1.1 Authentication Events

**File:** `apps/web/src/app/signup/page.tsx` (or signup component)

```typescript
import { useAnalytics, AnalyticsEvents } from "@/lib/analytics";

// After successful signup
const handleSignup = async (userData) => {
  const result = await signUp(userData);

  if (result.success) {
    track(AnalyticsEvents.USER_SIGNED_UP, {
      method: result.method, // 'email' or 'oauth'
      provider: result.provider, // 'google', 'email', etc.
    });
  }
};
```

**Events:**
- ✅ `user_logged_in` (already tracking)
- ✅ `user_logged_out` (already tracking)
- ⚠️ `user_signed_up` (ADD THIS)

---

### 1.2 Organization Lifecycle Events

**File:** `packages/backend/convex/models/organizations.ts`

Add tracking to these mutations:

```typescript
import { AnalyticsEvents } from "../lib/analytics"; // Create this helper

export const createOrganization = mutation({
  // ... existing code
  handler: async (ctx, args) => {
    const orgId = await ctx.db.insert("organizations", {
      // ... org data
    });

    // Track org creation
    await trackEvent(ctx, {
      event: AnalyticsEvents.ORG_CREATED,
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: orgId,
        org_name: args.name,
        has_logo: !!args.logoUrl,
        sports_count: args.supportedSports?.length || 0,
      },
    });

    return orgId;
  },
});
```

**Events to Add:**
- `org_created` - New organization created
- `org_settings_updated` - Theme/branding changed
- `org_deletion_requested` - User requests deletion

**Priority:** HIGH - Core funnel metric

---

### 1.3 Join Request Flow

**File:** `packages/backend/convex/models/orgJoinRequests.ts`

```typescript
export const createJoinRequest = mutation({
  handler: async (ctx, args) => {
    const requestId = await ctx.db.insert("orgJoinRequests", {
      // ... request data
    });

    await trackEvent(ctx, {
      event: "join_request.created",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        requested_role: args.functionalRole,
        has_children: args.metadata?.children?.length > 0,
      },
    });

    return requestId;
  },
});

export const approveJoinRequest = mutation({
  handler: async (ctx, args) => {
    // ... approval logic

    await trackEvent(ctx, {
      event: "join_request.approved",
      userId: approverUserId,
      properties: {
        org_id: request.organizationId,
        approved_role: request.functionalRole,
        auto_linked_players: linkedPlayerIds.length,
      },
    });
  },
});
```

**Events:**
- `join_request.created` - User submits join request
- `join_request.approved` - Admin approves request
- `join_request.rejected` - Admin rejects request

**Priority:** HIGH - Onboarding funnel

---

### 1.4 Team & Player Creation

**File:** `packages/backend/convex/models/teams.ts`

```typescript
export const createTeam = mutation({
  handler: async (ctx, args) => {
    const teamId = await ctx.db.insert("teams", {
      // ... team data
    });

    await trackEvent(ctx, {
      event: AnalyticsEvents.TEAM_CREATED,
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        team_id: teamId,
        sport: args.sport,
        age_group: args.ageGroup,
        gender: args.gender,
      },
    });

    return teamId;
  },
});
```

**File:** `packages/backend/convex/models/players.ts`

```typescript
export const createPlayer = mutation({
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("playerIdentities", {
      // ... player data
    });

    await trackEvent(ctx, {
      event: AnalyticsEvents.PLAYER_ENROLLED,
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        player_id: playerId,
        age_group: args.ageGroup,
        gender: args.gender,
        has_medical_info: !!args.medicalProfile,
      },
    });

    return playerId;
  },
});

export const bulkImportPlayers = mutation({
  handler: async (ctx, args) => {
    // ... bulk import logic
    const importedCount = results.length;

    await trackEvent(ctx, {
      event: "players.bulk_imported",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        total_players: importedCount,
        with_parents: results.filter(r => r.parentLinked).length,
        import_method: "csv",
      },
    });
  },
});
```

**Events:**
- `team_created` - Team created
- `player_enrolled` - Single player added
- `players.bulk_imported` - CSV import completed

**Priority:** HIGH - Core onboarding funnel

---

## Phase 2: Feature Usage Events (Week 2) - MEDIUM PRIORITY

Track usage of key features to understand adoption.

### 2.1 Skill Assessment Events

**File:** `packages/backend/convex/models/skillAssessments.ts`

```typescript
export const recordAssessment = mutation({
  handler: async (ctx, args) => {
    const assessmentId = await ctx.db.insert("skillAssessments", {
      // ... assessment data
    });

    await trackEvent(ctx, {
      event: AnalyticsEvents.SKILL_ASSESSMENT_COMPLETED,
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        player_id: args.playerId,
        skill_id: args.skillId,
        rating: args.rating,
        assessment_type: args.assessmentType, // training, match, formal_review
        has_notes: !!args.notes,
      },
    });

    return assessmentId;
  },
});

export const recordBatchAssessments = mutation({
  handler: async (ctx, args) => {
    // ... batch logic

    await trackEvent(ctx, {
      event: "assessments.batch_recorded",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        total_assessments: assessments.length,
        unique_players: new Set(assessments.map(a => a.playerId)).size,
        skill_id: args.skillId,
      },
    });
  },
});
```

**Events:**
- `skill_assessment_completed` - Single assessment recorded
- `assessments.batch_recorded` - Batch assessment mode used

**Priority:** MEDIUM - Feature adoption metric

---

### 2.2 Goal Setting Events

**File:** `packages/backend/convex/models/passportGoals.ts`

```typescript
export const createGoal = mutation({
  handler: async (ctx, args) => {
    const goalId = await ctx.db.insert("passportGoals", {
      // ... goal data
    });

    await trackEvent(ctx, {
      event: "goal.created",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        player_id: args.playerId,
        category: args.category, // technical, tactical, physical, mental, social
        priority: args.priority,
        has_milestones: args.milestones?.length > 0,
        parent_visible: args.parentVisible,
      },
    });

    return goalId;
  },
});

export const completeMilestone = mutation({
  handler: async (ctx, args) => {
    // ... completion logic

    await trackEvent(ctx, {
      event: "goal.milestone_completed",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: goal.organizationId,
        player_id: goal.playerId,
        goal_id: args.goalId,
        milestone_index: args.milestoneIndex,
      },
    });
  },
});
```

**Events:**
- `goal.created` - Development goal created
- `goal.milestone_completed` - Milestone marked complete
- `goal.status_changed` - Goal status updated

**Priority:** MEDIUM - Feature adoption

---

### 2.3 Voice Notes & AI Insights

**File:** `packages/backend/convex/models/voiceNotes.ts`

```typescript
export const createTypedNote = mutation({
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      // ... note data
    });

    await trackEvent(ctx, {
      event: AnalyticsEvents.VOICE_NOTE_RECORDED,
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        note_type: "typed",
        training_type: args.noteType, // training, match, general
        character_count: args.content.length,
      },
    });

    return noteId;
  },
});

export const createRecordedNote = mutation({
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      // ... note data
    });

    await trackEvent(ctx, {
      event: AnalyticsEvents.VOICE_NOTE_RECORDED,
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        note_type: "audio",
        training_type: args.noteType,
        has_transcription: !!args.transcription,
      },
    });

    return noteId;
  },
});

// Internal mutation after AI processing
export const updateInsights = internalMutation({
  handler: async (ctx, args) => {
    // ... update insights

    await trackEvent(ctx, {
      event: AnalyticsEvents.AI_INSIGHT_GENERATED,
      properties: {
        voice_note_id: args.noteId,
        insights_count: args.insights.length,
        processing_time_ms: args.processingTime,
      },
    });
  },
});
```

**Events:**
- `voice_note_recorded` - Note created (typed or audio)
- `ai_insight_generated` - AI processing completed
- `voice_note.insight_acknowledged` - Coach marks insight as resolved

**Priority:** HIGH - Key differentiator feature

---

### 2.4 Injury Tracking

**File:** `packages/backend/convex/models/playerInjuries.ts`

```typescript
export const reportInjury = mutation({
  handler: async (ctx, args) => {
    const injuryId = await ctx.db.insert("playerInjuries", {
      // ... injury data
    });

    await trackEvent(ctx, {
      event: "injury.reported",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        player_id: args.playerId,
        severity: args.severity, // minor, moderate, severe, long_term
        body_part: args.bodyPart,
        injury_type: args.injuryType, // training, match, non_sport
      },
    });

    return injuryId;
  },
});

export const updateInjuryStatus = mutation({
  handler: async (ctx, args) => {
    // ... status update

    await trackEvent(ctx, {
      event: "injury.status_updated",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: injury.organizationId,
        player_id: injury.playerId,
        old_status: injury.recoveryStatus,
        new_status: args.newStatus,
      },
    });
  },
});
```

**Events:**
- `injury.reported` - New injury recorded
- `injury.status_updated` - Recovery status changed
- `injury.cleared` - Player cleared to play

**Priority:** MEDIUM - Safety feature usage

---

## Phase 3: Page View Events (Week 2) - LOW-MEDIUM PRIORITY

Track feature page visits to understand navigation patterns.

### 3.1 Frontend Page Tracking

Add to key feature pages:

**File:** `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx`

```typescript
"use client";

import { useAnalytics } from "@/lib/analytics";
import { useEffect } from "react";

export default function AssessPage() {
  const { track } = useAnalytics();

  useEffect(() => {
    track("page.coach_assess_opened", {
      org_id: orgId,
    });
  }, []);

  // ... rest of component
}
```

**Pages to Track:**

**Coach Tools:**
- `page.coach_dashboard_opened` - `/coach`
- `page.coach_assess_opened` - `/coach/assess`
- `page.coach_goals_opened` - `/coach/goals`
- `page.coach_voice_notes_opened` - `/coach/voice-notes`
- `page.coach_injuries_opened` - `/coach/injuries`
- `page.coach_match_day_opened` - `/coach/match-day`

**Admin Tools:**
- `page.admin_dashboard_opened` - `/admin`
- `page.admin_players_opened` - `/admin/players`
- `page.admin_teams_opened` - `/admin/teams`
- `page.admin_users_opened` - `/admin/users`
- `page.admin_coaches_opened` - `/admin/coaches`
- `page.admin_guardians_opened` - `/admin/guardians`
- `page.admin_medical_opened` - `/admin/medical`
- `page.admin_import_opened` - `/admin/player-import`

**Parent Portal:**
- `page.parent_dashboard_opened` - `/parents`
- `page.parent_child_viewed` - `/players/[playerId]` (from parent context)

**Priority:** LOW-MEDIUM - Navigation insights

---

## Phase 4: Guardian & Parent Events (Week 3) - MEDIUM PRIORITY

Track parent engagement and guardian management.

### 4.1 Guardian Link Events

**File:** `packages/backend/convex/models/guardianPlayerLinks.ts`

```typescript
export const createGuardianPlayerLink = mutation({
  handler: async (ctx, args) => {
    const linkId = await ctx.db.insert("guardianPlayerLinks", {
      // ... link data
    });

    await trackEvent(ctx, {
      event: "guardian.linked_to_player",
      userId: ctx.auth.getUserIdentity()?.subject,
      properties: {
        org_id: args.organizationId,
        guardian_id: args.guardianId,
        player_id: args.playerId,
        relationship: args.relationship,
        is_primary: args.isPrimary,
        link_method: "manual", // or "auto_matched", "import"
      },
    });

    return linkId;
  },
});
```

**Events:**
- `guardian.linked_to_player` - Parent-child link created
- `guardian.invite_sent` - Invitation sent to parent
- `guardian.accepted_link` - Parent accepted link
- `parent.accessed_portal` - Parent logged into portal
- `parent.viewed_child_goal` - Parent viewed goal
- `parent.viewed_child_medical` - Parent accessed medical info

**Priority:** MEDIUM - Family engagement metric

---

### 4.2 Parent Portal Usage

**File:** `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

```typescript
export default function ParentPortal() {
  const { track } = useAnalytics();

  useEffect(() => {
    track("parent.accessed_portal", {
      org_id: orgId,
      children_count: linkedChildren.length,
    });
  }, []);

  const handleViewGoal = (goalId: string) => {
    track("parent.viewed_child_goal", {
      org_id: orgId,
      player_id: playerId,
      goal_id: goalId,
    });
  };

  // ... rest of component
}
```

**Priority:** MEDIUM - Parent engagement

---

## Phase 5: Data Operations (Week 3-4) - LOW PRIORITY

Track bulk operations and data management.

### 5.1 Bulk Import Events

Already covered in Phase 1 (`players.bulk_imported`)

### 5.2 Search & Filter Events

**File:** `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`

```typescript
const handleSearch = (query: string) => {
  if (query.length >= 3) {
    track("data.search_performed", {
      org_id: orgId,
      context: "admin_players",
      query_length: query.length,
    });
  }
};

const handleFilter = (filterType: string, filterValue: string) => {
  track("data.filter_applied", {
    org_id: orgId,
    context: "admin_players",
    filter_type: filterType, // team, age_group, sport, gender
    filter_value: filterValue,
  });
};
```

**Events:**
- `data.search_performed` - User searched
- `data.filter_applied` - Filter applied
- `data.export_requested` - Export initiated

**Priority:** LOW - Power user metrics

---

## Implementation Guide

### Step 1: Create Backend Tracking Helper

**File:** `packages/backend/convex/lib/analytics.ts`

```typescript
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const AnalyticsEvents = {
  // Copy from apps/web/src/lib/analytics.ts
  USER_SIGNED_UP: "user_signed_up",
  ORG_CREATED: "org_created",
  TEAM_CREATED: "team_created",
  // ... all events
} as const;

/**
 * Track event from backend
 * This will be sent to PostHog via webhook or API
 */
export async function trackEvent(
  ctx: MutationCtx | QueryCtx,
  event: {
    event: string;
    userId?: string;
    properties?: Record<string, any>;
  }
) {
  // For now, just log to console
  // TODO: Send to PostHog via API or webhook
  console.log("[Analytics]", event.event, event.properties);

  // Store in analytics events table (optional)
  await ctx.db.insert("analyticsEvents", {
    event: event.event,
    userId: event.userId,
    properties: event.properties,
    timestamp: Date.now(),
  });
}
```

### Step 2: Add to Each Mutation

Follow the code examples in each phase above.

### Step 3: Test Event Tracking

1. Perform action in app (e.g., create team)
2. Check PostHog Activity view
3. Verify event appears with correct properties

---

## Recommended Dashboards (After Implementation)

### Dashboard 1: Onboarding Funnel
**Funnel Steps:**
1. `user_signed_up`
2. `join_request.created`
3. `join_request.approved`
4. `org_created` OR `team_created` (depending on role)
5. `player_enrolled`

**Time Window:** 30 days
**Breakdown:** By `requested_role` to see coach vs parent onboarding

---

### Dashboard 2: Feature Adoption
**Insights:**
- **Voice Notes Usage** - `voice_note_recorded` over time
- **Assessment Activity** - `skill_assessment_completed` over time
- **Goal Setting** - `goal.created` over time
- **Injury Tracking** - `injury.reported` over time
- **Most Used Features** - Bar chart of all feature events

**Breakdown:** By organization to see which orgs are power users

---

### Dashboard 3: Coach Engagement
**Insights:**
- **Active Coaches** - Unique users with `coach.*` events
- **Assessment Frequency** - Assessments per coach per week
- **Voice Note Adoption** - % of coaches using voice notes
- **Batch vs Individual** - `assessments.batch_recorded` vs `skill_assessment_completed`

---

### Dashboard 4: Parent Engagement
**Insights:**
- **Parent Portal Visits** - `parent.accessed_portal` over time
- **Parent Actions** - `parent.viewed_child_goal`, `parent.viewed_child_medical`
- **Guardian Link Success** - Funnel from `guardian.invite_sent` → `guardian.accepted_link`
- **Parent Retention** - % returning after first visit

---

### Dashboard 5: Data Operations
**Insights:**
- **Bulk Imports** - `players.bulk_imported` count
- **Search Usage** - `data.search_performed` frequency
- **Filter Usage** - `data.filter_applied` by filter type
- **Power Users** - Users with most admin actions

---

### Dashboard 6: Organization Health
**Insights:**
- **Active Organizations** - Orgs with any event in last 7 days
- **Org Growth** - `org_created` over time
- **Avg Players per Org** - Calculate from `player_enrolled`
- **Avg Teams per Org** - Calculate from `team_created`
- **Feature Adoption by Org** - Heatmap of which orgs use which features

---

## Event Priority Matrix

### CRITICAL (Implement First)
1. `user_signed_up` - Signup conversion
2. `org_created` - Org creation
3. `join_request.created` / `join_request.approved` - Onboarding funnel
4. `team_created` - Team setup
5. `player_enrolled` - Player onboarding
6. `voice_note_recorded` - Key feature
7. `skill_assessment_completed` - Core feature
8. `ai_insight_generated` - AI feature usage

### HIGH PRIORITY (Week 1-2)
9. `goal.created` - Development tracking
10. `injury.reported` - Safety feature
11. `guardian.linked_to_player` - Parent engagement
12. `players.bulk_imported` - Bulk operations
13. `assessments.batch_recorded` - Batch mode usage

### MEDIUM PRIORITY (Week 2-3)
14. Page view events (coach/admin/parent)
15. `parent.accessed_portal` - Parent engagement
16. `goal.milestone_completed` - Goal progress
17. `injury.status_updated` - Recovery tracking
18. Filter/search events

### LOW PRIORITY (Week 3-4)
19. Granular page navigation
20. Detailed filter breakdowns
21. Export events
22. Settings updates
23. Minor feature interactions

---

## Testing Checklist

### Phase 1 Testing
- [ ] Sign up new user - verify `user_signed_up` in PostHog
- [ ] Create organization - verify `org_created`
- [ ] Submit join request - verify `join_request.created`
- [ ] Approve join request - verify `join_request.approved`
- [ ] Create team - verify `team_created`
- [ ] Add player - verify `player_enrolled`
- [ ] Bulk import players - verify `players.bulk_imported`

### Phase 2 Testing
- [ ] Record skill assessment - verify `skill_assessment_completed`
- [ ] Batch assess - verify `assessments.batch_recorded`
- [ ] Create goal - verify `goal.created`
- [ ] Complete milestone - verify `goal.milestone_completed`
- [ ] Record typed note - verify `voice_note_recorded` (typed)
- [ ] Record audio note - verify `voice_note_recorded` (audio)
- [ ] AI generates insight - verify `ai_insight_generated`

### Phase 3 Testing
- [ ] Open coach dashboard - verify `page.coach_dashboard_opened`
- [ ] Open assessment page - verify `page.coach_assess_opened`
- [ ] Open admin dashboard - verify `page.admin_dashboard_opened`
- [ ] Open parent portal - verify `parent.accessed_portal`

### Phase 4 Testing
- [ ] Link guardian to player - verify `guardian.linked_to_player`
- [ ] Parent views goal - verify `parent.viewed_child_goal`
- [ ] Parent views medical - verify `parent.viewed_child_medical`

---

## Success Metrics

**After 1 Month:**
- [ ] 100% of critical events tracking
- [ ] 5+ dashboards created
- [ ] Onboarding funnel conversion rate known
- [ ] Top 3 features by usage identified
- [ ] Coach engagement metrics established

**After 3 Months:**
- [ ] All Phase 1-3 events tracking
- [ ] Retention metrics established
- [ ] Feature adoption trends visible
- [ ] Parent engagement benchmarks set
- [ ] Data-driven product decisions made

---

## Next Steps

1. **Week 1:** Implement Phase 1 (authentication, org, team, player events)
2. **Week 2:** Implement Phase 2 (feature usage events)
3. **Week 3:** Implement Phase 3 (page views) + Phase 4 (guardian events)
4. **Week 4:** Implement Phase 5 (data operations) + create all dashboards
5. **Week 5:** Test all events, verify data quality, document insights

---

**Ready to start?** Begin with Phase 1 - Foundation Events. These provide the core funnel metrics you need to understand user onboarding and activation.
