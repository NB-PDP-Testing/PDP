# PostHog Implementation Map - Complete Codebase Review

This document provides a complete map of all PostHog usage in the PlayerARC codebase, organized by frontend vs backend, and categorized by functionality.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Implementation](#frontend-implementation)
   - [Core Infrastructure Files](#core-infrastructure-files)
   - [Tracking Implementation Files](#tracking-implementation-files)
   - [Feature Flag Consumption](#feature-flag-consumption)
3. [Backend Implementation](#backend-implementation)
4. [Event Tracking Map](#event-tracking-map)
5. [Feature Flags Map](#feature-flags-map)
6. [Implementation Status Summary](#implementation-status-summary)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        POSTHOG ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         FRONTEND (apps/web)                           │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  INFRASTRUCTURE LAYER                                                 │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                    │  │
│  │  │  proxy.ts           │  │  posthog-provider   │                    │  │
│  │  │  (Server-side       │──│  .tsx               │                    │  │
│  │  │   flag bootstrap)   │  │  (Client init)      │                    │  │
│  │  └─────────────────────┘  └─────────────────────┘                    │  │
│  │           │                        │                                 │  │
│  │           │ Cookies (flags,        │ posthog-js                      │  │
│  │           │ distinct_id)           │ initialized                     │  │
│  │           ▼                        ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────┐     │  │
│  │  │                    TRACKING LAYER                            │     │  │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │     │  │
│  │  │  │ posthog-auth-  │  │ posthog-       │  │ analytics.ts   │ │     │  │
│  │  │  │ tracker.tsx    │  │ pageview.tsx   │  │ (useAnalytics) │ │     │  │
│  │  │  │ • identify()   │  │ • $pageview    │  │ • track()      │ │     │  │
│  │  │  │ • login/logout │  │                │  │ • identify()   │ │     │  │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘ │     │  │
│  │  └─────────────────────────────────────────────────────────────┘     │  │
│  │           │                        │                 │               │  │
│  │           ▼                        ▼                 ▼               │  │
│  │  ┌─────────────────────────────────────────────────────────────┐     │  │
│  │  │                   COMPONENT LAYER                            │     │  │
│  │  │  Components that call track():                               │     │  │
│  │  │  • sign-up-form.tsx       • pwa-install-prompt.tsx          │     │  │
│  │  │  • fab-variant.tsx        • horizontal-variant.tsx          │     │  │
│  │  │  • two-tier-variant.tsx   • preference-voting.tsx           │     │  │
│  │  │  • enhanced-user-menu.tsx • header-quick-actions-menu.tsx   │     │  │
│  │  │  • analytics-tracker.ts   (session plans)                   │     │  │
│  │  └─────────────────────────────────────────────────────────────┘     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       BACKEND (packages/backend)                      │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  convex/lib/analytics.ts                                             │  │
│  │  ┌─────────────────────────────────────────────────────────────┐     │  │
│  │  │  • trackEvent() - Logs to console only                      │     │  │
│  │  │  • track() - Helper with auto user ID                       │     │  │
│  │  │  • getUserId() - Extract user from context                  │     │  │
│  │  │  • AnalyticsEvents - Event constants (40+ defined)          │     │  │
│  │  │                                                             │     │  │
│  │  │  ⚠️ NOT CONNECTED TO POSTHOG - Console logging only         │     │  │
│  │  └─────────────────────────────────────────────────────────────┘     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                              ▼ Client-side only ▼                          │
│                                                                             │
│                      ┌─────────────────────────┐                           │
│                      │   PostHog Cloud (EU)    │                           │
│                      │   eu.i.posthog.com      │                           │
│                      └─────────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

### Core Infrastructure Files

#### 1. `apps/web/src/providers/posthog-provider.tsx`
**Purpose:** Client-side PostHog initialization

| Aspect | Details |
|--------|---------|
| **Function** | `PHProvider` - React context provider |
| **Initialization** | `posthog.init()` with EU host |
| **Bootstrap** | Reads flags from cookies (set by proxy.ts) |
| **Config** | `person_profiles: "identified_only"`, `capture_pageview: false` |
| **Session Recording** | Enabled with `maskAllInputs: true` |
| **Privacy** | Masks inputs, supports `.sensitive` class |

```typescript
// Key configuration
posthog.init(key, {
  api_host: host,                    // https://eu.i.posthog.com
  person_profiles: "identified_only", // Only create profiles for logged-in users
  capture_pageview: false,            // Manual page view tracking
  capture_pageleave: true,            // Track page leave
  bootstrap: {
    distinctID: distinctId,           // From cookie
    featureFlags: bootstrappedFlags,  // From cookie
  },
  session_recording: {
    maskAllInputs: true,              // Privacy
    maskTextSelector: ".sensitive",   // Custom mask class
  },
});
```

---

#### 2. `apps/web/src/proxy.ts`
**Purpose:** Server-side feature flag bootstrapping

| Aspect | Details |
|--------|---------|
| **Function** | Next.js middleware proxy |
| **Purpose** | Fetch flags server-side to eliminate client-side flicker |
| **SDK** | `posthog-node` |
| **Cookies Set** | `ph-bootstrap-flags` (5 min TTL), `ph-distinct-id` (1 year TTL) |

```typescript
// Server-side flag fetching
const posthog = new PostHog(posthogApiKey, {
  host: posthogHost || "https://eu.i.posthog.com",
  flushAt: 1,        // Immediate flush for serverless
  flushInterval: 0,  // No batching
});

const flags = await posthog.getAllFlags(distinctId);
response.cookies.set(POSTHOG_FLAGS_COOKIE, JSON.stringify(flags), {...});
```

---

#### 3. `apps/web/src/providers/posthog-auth-tracker.tsx`
**Purpose:** Automatic user identification on auth state changes

| Event | Trigger | Properties |
|-------|---------|------------|
| `identify()` | User logs in | `{ email, name }` |
| `user_logged_in` | Subsequent login (not first load) | `{ email }` |
| `user_logged_out` | User logs out | (none) |
| `reset()` | User logs out | Clears user identity |

**Note:** Internal user opt-out is defined but disabled (`internalEmails: []`)

---

#### 4. `apps/web/src/providers/posthog-pageview.tsx`
**Purpose:** Manual page view tracking

| Event | Trigger | Properties |
|-------|---------|------------|
| `$pageview` | Route change (pathname/searchParams) | `{ $current_url }` |

---

#### 5. `apps/web/src/lib/analytics.ts`
**Purpose:** Analytics hook and event constants for frontend

| Export | Type | Purpose |
|--------|------|---------|
| `AnalyticsEvents` | Object | Event name constants |
| `useAnalytics()` | Hook | Returns `{ track, identify, reset, isFeatureEnabled }` |

**Event Constants Defined (Frontend):**
```typescript
AnalyticsEvents = {
  USER_SIGNED_UP, USER_LOGGED_IN, USER_LOGGED_OUT, USER_INVITED, INVITATION_ACCEPTED,
  ORG_CREATED, ORG_JOINED, ORG_SETTINGS_UPDATED,
  TEAM_CREATED, TEAM_UPDATED, PLAYER_ENROLLED, PLAYER_PROFILE_VIEWED,
  VOICE_NOTE_RECORDED, VOICE_NOTE_TRANSCRIBED, AI_INSIGHT_GENERATED, AI_INSIGHT_APPLIED,
  SKILL_ASSESSMENT_STARTED, SKILL_ASSESSMENT_COMPLETED,
  PARENT_DASHBOARD_ACCESSED, BULK_IMPORT_STARTED, BULK_IMPORT_COMPLETED, EXPORT_INITIATED
}
```

---

#### 6. `apps/web/src/lib/analytics-tracker.ts`
**Purpose:** Session plan specific tracking

| Function | Event | Properties |
|----------|-------|------------|
| `trackPlanGenerated()` | `session_plan_generated` | teamId, teamName, playerCount, ageGroup, creationMethod |
| `trackPlanCached()` | `session_plan_cached` | + cacheHit: true |
| `trackPlanRegenerated()` | `session_plan_regenerated` | teamId, teamName, etc. |
| `trackPlanShared()` | `session_plan_shared` | + shareMethod |
| `trackPlanViewed()` | `session_plan_viewed` | teamId, teamName, etc. |

**Note:** Uses dynamic `require("posthog-js")` with fallback to console logging.

---

#### 7. `apps/web/src/lib/session-plan-config.ts`
**Purpose:** Session plan event name configuration

```typescript
sessionPlanConfig.events = {
  PLAN_GENERATED: "session_plan_generated",
  PLAN_CACHED: "session_plan_cached",
  PLAN_REGENERATED: "session_plan_regenerated",
  PLAN_SHARED: "session_plan_shared",
  PLAN_VIEWED: "session_plan_viewed",
}
```

---

### Tracking Implementation Files

#### Components That Track Events

| File | Events Tracked | Trigger |
|------|---------------|---------|
| **sign-up-form.tsx** | `user_signed_up` | Form submission success |
| **pwa-install-prompt.tsx** | `pwa_install_prompt_shown`, `pwa_install_clicked`, `pwa_install_accepted`, `pwa_install_declined`, `pwa_install_prompt_dismissed` | PWA prompt interactions |
| **fab-variant.tsx** | `ux_quick_actions_variant_viewed` | Component mount |
| **horizontal-variant.tsx** | `ux_quick_actions_variant_viewed`, `ux_quick_actions_action_clicked` | Mount, action click |
| **two-tier-variant.tsx** | `ux_quick_actions_variant_viewed`, `ux_quick_actions_action_clicked` | Mount, action click |
| **header-quick-actions-menu.tsx** | `ux_quick_actions_variant_viewed`, `ux_quick_actions_action_clicked` | Mount, action click |
| **preference-voting.tsx** | `ux_mockup_preference_selected`, `ux_mockup_feedback_submitted` | Vote/feedback submission |
| **enhanced-user-menu.tsx** | `ux_enhanced_user_menu_opened`, `ux_enhanced_user_menu_theme_changed` | Menu open, theme change |

---

### Feature Flag Consumption

#### `apps/web/src/hooks/use-ux-feature-flags.ts`
**Purpose:** Centralized feature flag access with 80+ flags across 18 phases

| Phase | Flags | Purpose |
|-------|-------|---------|
| **Phase 1** | `ux_bottom_nav`, `ux_touch_targets_44px`, `ux_admin_nav_*`, `ux_app_shell`, `ux_hover_actions`, `ux_responsive_inputs` | Navigation foundation |
| **Phase 2** | `ux_mobile_cards`, `ux_skeleton_loaders`, `ux_enhanced_tables`, `ux_swipe_cards`, `ux_pull_to_refresh` | Data display |
| **Phase 3** | `ux_responsive_forms` | Forms |
| **Phase 4** | `ux_command_menu`, `ux_responsive_dialogs` | Interactions |
| **Phase 5** | `ux_keyboard_shortcuts_overlay`, `ux_density_toggle`, `ux_offline_indicator`, `ux_pwa_install_prompt`, `ux_resizable_sidebar`, `ux_pinned_favorites`, `ux_recent_items` | Polish |
| **Phase 10** | `ux_context_menu`, `ux_action_sheet`, `ux_inline_edit` | Advanced interactions |
| **Phase 11** | `ux_service_worker`, `ux_offline_support`, `ux_pwa_update_prompt` | PWA & offline |
| **Phase 12** | `ux_skip_links`, `ux_focus_visible`, `ux_reduced_motion`, `ux_announcer` | Accessibility |
| **Phase 13** | `ux_lazy_components`, `ux_web_vitals`, `ux_deferred_render`, `ux_resource_hints` | Performance |
| **Phase 14** | `ux_theme_enhanced`, `ux_theme_contrast_colors`, `ux_theme_dark_variants`, `ux_theme_smooth_transitions`, `ux_header_nav_minimal` | Theme & accessibility |
| **Phase 15** | `ux_enhanced_user_menu`, `ux_org_usage_tracking` | Enhanced user menu |
| **Phase 16** | `ux_logo_adaptive_visibility` | Logo visibility |
| **Phase 17** | `parent_summary_share_image` | Parent features |
| **Phase 18** | `voice_notes_whatsapp`, `voice_notes_ai_model_display` | Voice notes |
| **A/B Tests** | `ux_quick_actions_fab`, `ux_quick_actions_horizontal`, `ux_quick_actions_two_tier` | Quick actions variants |

**UX Analytics Events Defined (80+):**
The file also defines `UXAnalyticsEvents` constant with events for all phases including mockup preferences, navigation, data display, forms, interactions, polish, PWA, accessibility, performance, theme, and quick actions.

---

## Backend Implementation

### `packages/backend/convex/lib/analytics.ts`

**Status:** ⚠️ **NOT CONNECTED TO POSTHOG** - Console logging only

| Export | Purpose | Status |
|--------|---------|--------|
| `AnalyticsEvents` | Event constants (40+) | ✅ Defined |
| `trackEvent(ctx, event)` | Track event | ⚠️ Console only |
| `getUserId(ctx)` | Get user from auth | ✅ Working |
| `track(ctx, event, props)` | Helper with auto user ID | ⚠️ Console only |

**Event Constants Defined (Backend):**
```typescript
AnalyticsEvents = {
  // Auth (5)
  USER_SIGNED_UP, USER_LOGGED_IN, USER_LOGGED_OUT, USER_INVITED, INVITATION_ACCEPTED,

  // Organization (4)
  ORG_CREATED, ORG_JOINED, ORG_SETTINGS_UPDATED, ORG_DELETION_REQUESTED,

  // Join Requests (3)
  JOIN_REQUEST_CREATED, JOIN_REQUEST_APPROVED, JOIN_REQUEST_REJECTED,

  // Teams (3)
  TEAM_CREATED, TEAM_UPDATED, TEAM_DELETED,

  // Players (4)
  PLAYER_ENROLLED, PLAYERS_BULK_IMPORTED, PLAYER_UPDATED, PLAYER_DELETED,

  // Voice Notes & AI (4)
  VOICE_NOTE_RECORDED, VOICE_NOTE_TRANSCRIBED, AI_INSIGHT_GENERATED, AI_INSIGHT_APPLIED,

  // Skill Assessments (3)
  SKILL_ASSESSMENT_STARTED, SKILL_ASSESSMENT_COMPLETED, ASSESSMENTS_BATCH_RECORDED,

  // Goals (5)
  GOAL_CREATED, GOAL_UPDATED, GOAL_STATUS_CHANGED, GOAL_MILESTONE_COMPLETED, GOAL_DELETED,

  // Injuries (4)
  INJURY_REPORTED, INJURY_STATUS_UPDATED, INJURY_CLEARED, INJURY_DELETED,

  // Guardians (3)
  GUARDIAN_LINKED_TO_PLAYER, GUARDIAN_INVITE_SENT, GUARDIAN_ACCEPTED_LINK,

  // Feature Usage (4)
  PARENT_DASHBOARD_ACCESSED, BULK_IMPORT_STARTED, BULK_IMPORT_COMPLETED, EXPORT_INITIATED
}
```

---

## Event Tracking Map

### Events Currently Being Tracked (Frontend)

| Event | File | Location | Status |
|-------|------|----------|--------|
| `$pageview` | posthog-pageview.tsx | Root layout | ✅ Active |
| `user_logged_in` | posthog-auth-tracker.tsx | Root layout | ✅ Active |
| `user_logged_out` | posthog-auth-tracker.tsx | Root layout | ✅ Active |
| `user_signed_up` | sign-up-form.tsx | /sign-up page | ✅ Active |
| `pwa_install_prompt_shown` | pwa-install-prompt.tsx | Root layout | ✅ Active (if flag enabled) |
| `pwa_install_clicked` | pwa-install-prompt.tsx | Root layout | ✅ Active (if flag enabled) |
| `pwa_install_accepted` | pwa-install-prompt.tsx | Root layout | ✅ Active (if flag enabled) |
| `pwa_install_declined` | pwa-install-prompt.tsx | Root layout | ✅ Active (if flag enabled) |
| `pwa_install_prompt_dismissed` | pwa-install-prompt.tsx | Root layout | ✅ Active (if flag enabled) |
| `session_plan_generated` | analytics-tracker.ts | Coach dashboard | ✅ Active |
| `session_plan_cached` | analytics-tracker.ts | Coach dashboard | ✅ Active |
| `session_plan_regenerated` | analytics-tracker.ts | Coach dashboard | ✅ Active |
| `session_plan_shared` | analytics-tracker.ts | Coach dashboard | ✅ Active |
| `session_plan_viewed` | analytics-tracker.ts | Coach dashboard | ✅ Active |
| `ux_quick_actions_variant_viewed` | fab/horizontal/two-tier/header variants | Coach dashboard | ✅ Active |
| `ux_quick_actions_action_clicked` | horizontal/two-tier/header variants | Coach dashboard | ✅ Active |
| `ux_mockup_preference_selected` | preference-voting.tsx | UX testing pages | ✅ Active |
| `ux_mockup_feedback_submitted` | preference-voting.tsx | UX testing pages | ✅ Active |
| `ux_enhanced_user_menu_opened` | enhanced-user-menu.tsx | Global header | ✅ Active |
| `ux_enhanced_user_menu_theme_changed` | enhanced-user-menu.tsx | Global header | ✅ Active |

### Events Defined But NOT Tracked (Backend - Console Only)

| Category | Events | Count |
|----------|--------|-------|
| Organization | `organization_created`, `organization_joined`, `organization_settings_updated`, `organization_deletion_requested` | 4 |
| Join Requests | `join_request_created`, `join_request_approved`, `join_request_rejected` | 3 |
| Teams | `team_created`, `team_updated`, `team_deleted` | 3 |
| Players | `player_enrolled`, `players_bulk_imported`, `player_updated`, `player_deleted` | 4 |
| Voice Notes | `voice_note_recorded`, `voice_note_transcribed` | 2 |
| AI | `ai_insight_generated`, `ai_insight_applied` | 2 |
| Skills | `skill_assessment_started`, `skill_assessment_completed`, `assessments_batch_recorded` | 3 |
| Goals | `goal_created`, `goal_updated`, `goal_status_changed`, `goal_milestone_completed`, `goal_deleted` | 5 |
| Injuries | `injury_reported`, `injury_status_updated`, `injury_cleared`, `injury_deleted` | 4 |
| Guardians | `guardian_linked_to_player`, `guardian_invite_sent`, `guardian_accepted_link` | 3 |
| Features | `parent_dashboard_accessed`, `bulk_import_started`, `bulk_import_completed`, `export_initiated` | 4 |
| **Total** | | **37** |

---

## Feature Flags Map

### Feature Flags by Category

| Category | Flags | Total |
|----------|-------|-------|
| Navigation (Phase 1) | `ux_bottom_nav`, `ux_touch_targets_44px`, `ux_admin_nav_sidebar`, `ux_admin_nav_bottomsheet`, `ux_admin_nav_tabs`, `ux_app_shell`, `ux_hover_actions`, `ux_responsive_inputs` | 8 |
| Data Display (Phase 2) | `ux_mobile_cards`, `ux_skeleton_loaders`, `ux_enhanced_tables`, `ux_swipe_cards`, `ux_pull_to_refresh` | 5 |
| Forms (Phase 3) | `ux_responsive_forms` | 1 |
| Interactions (Phase 4) | `ux_command_menu`, `ux_responsive_dialogs` | 2 |
| Polish (Phase 5) | `ux_keyboard_shortcuts_overlay`, `ux_density_toggle`, `ux_offline_indicator`, `ux_pwa_install_prompt`, `ux_resizable_sidebar`, `ux_pinned_favorites`, `ux_recent_items` | 7 |
| Advanced Interactions (Phase 10) | `ux_context_menu`, `ux_action_sheet`, `ux_inline_edit` | 3 |
| PWA & Offline (Phase 11) | `ux_service_worker`, `ux_offline_support`, `ux_pwa_update_prompt` | 3 |
| Accessibility (Phase 12) | `ux_skip_links`, `ux_focus_visible`, `ux_reduced_motion`, `ux_announcer` | 4 |
| Performance (Phase 13) | `ux_lazy_components`, `ux_web_vitals`, `ux_deferred_render`, `ux_resource_hints` | 4 |
| Theme (Phase 14) | `ux_theme_enhanced`, `ux_theme_contrast_colors`, `ux_theme_dark_variants`, `ux_theme_smooth_transitions`, `ux_header_nav_minimal` | 5 |
| User Menu (Phase 15) | `ux_enhanced_user_menu`, `ux_org_usage_tracking` | 2 |
| Logo (Phase 16) | `ux_logo_adaptive_visibility` | 1 |
| Parent Features (Phase 17) | `parent_summary_share_image` | 1 |
| Voice Notes (Phase 18) | `voice_notes_whatsapp`, `voice_notes_ai_model_display` | 2 |
| Quick Actions A/B | `ux_quick_actions_fab`, `ux_quick_actions_horizontal`, `ux_quick_actions_two_tier` | 3 |
| **Total** | | **51** |

---

## Implementation Status Summary

### Overall Statistics

| Metric | Count | Status |
|--------|-------|--------|
| **Frontend tracking files** | 8 | ✅ Active |
| **Events actively tracked** | ~20 | ✅ Sent to PostHog |
| **Events defined (not tracked)** | 37+ | ⚠️ Console only |
| **Feature flags defined** | 51 | ✅ Available |
| **Backend connection** | 0 | ❌ Not connected |

### What's Working

| Component | Status |
|-----------|--------|
| Client-side PostHog initialization | ✅ |
| Server-side feature flag bootstrap | ✅ |
| User identification on login | ✅ |
| Page view tracking | ✅ |
| Login/logout events | ✅ |
| Signup tracking (email only) | ✅ |
| Session plan tracking | ✅ |
| PWA install tracking | ✅ |
| Quick actions A/B tracking | ✅ |
| UX preference voting | ✅ |
| User menu analytics | ✅ |
| Session recording | ✅ |
| Feature flags | ✅ |

### What's NOT Working

| Component | Issue |
|-----------|-------|
| Backend event tracking | Only logs to console |
| Organization events | Not sent to PostHog |
| Team events | Not sent to PostHog |
| Player events | Not sent to PostHog |
| Voice note events | Not sent to PostHog |
| Skill assessment events | Not sent to PostHog |
| Goal events | Not sent to PostHog |
| Injury events | Not sent to PostHog |
| Guardian events | Not sent to PostHog |
| Google/Microsoft OAuth signup | Not tracked (only email) |
| User org/role context | Not included in identify() |

### Blocking Issue

**Users with ad blockers (like Martin Canning using DuckDuckGo) are completely invisible** because:
1. All tracking is client-side only
2. PostHog endpoints are blocked by privacy browsers
3. Backend tracking is not connected

---

## Files Reference

### Frontend Files (apps/web/src/)

| File | Lines | Purpose |
|------|-------|---------|
| `providers/posthog-provider.tsx` | 104 | Client initialization |
| `providers/posthog-auth-tracker.tsx` | 67 | User identification |
| `providers/posthog-pageview.tsx` | 26 | Page view tracking |
| `proxy.ts` | 115 | Server-side flag bootstrap |
| `lib/analytics.ts` | 100 | Hook and event constants |
| `lib/analytics-tracker.ts` | 110 | Session plan tracking |
| `lib/session-plan-config.ts` | 62 | Session plan config |
| `hooks/use-ux-feature-flags.ts` | 446 | Feature flag hook |
| `components/sign-up-form.tsx` | 539 | Signup tracking |
| `components/polish/pwa-install-prompt.tsx` | 355 | PWA tracking |
| `components/quick-actions/*.tsx` | ~600 | Quick actions tracking |
| `components/ux-testing/preference-voting.tsx` | 221 | Voting tracking |
| `components/profile/enhanced-user-menu.tsx` | 368 | Menu tracking |
| `components/providers.tsx` | 42 | Provider hierarchy |
| `app/layout.tsx` | 86 | Root layout with PostHog components |

### Backend Files (packages/backend/convex/)

| File | Lines | Purpose |
|------|-------|---------|
| `lib/analytics.ts` | 133 | Event constants and tracking (console only) |

---

## Next Steps

To fix the visibility gap (users like Martin Canning):

1. **Connect backend tracking to PostHog** using `@samhoque/convex-posthog` or direct `posthog-node` SDK
2. **Add server-side tracking calls** to existing mutations for critical events
3. **Enrich user identification** with organization ID and functional roles

See the main issue discussion for implementation recommendations.
