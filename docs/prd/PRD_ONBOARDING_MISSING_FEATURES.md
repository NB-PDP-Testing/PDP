# PRD: Onboarding System - Missing Features

**Document Version:** 1.0
**Date:** 2026-01-28
**Author:** Generated from UAT Test Analysis
**GitHub Issue:** #371
**Status:** Ready for Implementation

---

## Executive Summary

This PRD documents the missing features required to complete the Universal Onboarding System. These features were identified through UAT test analysis - the tests exist and define expected behavior, but the features have not been implemented.

**Total Missing Features:** 4 major feature areas, 21 specific test cases

| Feature Area | Tests | Priority |
|--------------|-------|----------|
| Phase 4: Notification Preferences | 4 failing | Medium |
| Phase 5: Organization Setup Wizard | 7 failing | High |
| Phase 7: Graduation & Completion UI | 8 failing | High |
| Mobile: Hamburger Navigation | 1 failing | Low |

---

## Table of Contents

1. [Phase 4: Notification Preferences System](#phase-4-notification-preferences-system)
2. [Phase 5: Organization Setup Wizard](#phase-5-organization-setup-wizard)
3. [Phase 7: Graduation & Completion UI](#phase-7-graduation--completion-ui)
4. [Mobile: Hamburger Menu Navigation](#mobile-hamburger-menu-navigation)
5. [Data Model Requirements](#data-model-requirements)
6. [Implementation Order](#implementation-order)

---

## Phase 4: Notification Preferences System

### Overview

Users need the ability to manage their notification preferences across different channels (email, push, in-app) and categories (team updates, player updates, announcements, assessments).

### User Stories

**US-P4-001:** As a user, I want to access notification settings from my profile/settings page so I can control how I receive updates.

**US-P4-002:** As a user, I want to toggle email notifications on/off so I can control my inbox.

**US-P4-003:** As a user, I want to enable/disable push notifications so I can control browser alerts.

**US-P4-004:** As a user, I want to manage in-app notification preferences so I can control what appears in my notification center.

**US-P4-005:** As a new user, I want to set my notification preferences during onboarding so I'm set up correctly from the start.

### Functional Requirements

#### FR-P4-001: Settings Page Integration

**Location:** `/orgs/[orgId]/admin/settings` (and coach/parent equivalents)

**Required Elements:**
- Notification settings section/tab
- Clear heading: "Notification Preferences" or similar
- Grouped by notification type

**Test Selectors Expected:**
```typescript
// Section identifiers
'[data-testid="notification-settings"]'
'[data-testid="notification-preferences"]'
'text=/notification/i'
```

#### FR-P4-002: Email Notification Toggles

**Required Controls:**
| Setting | Type | Default |
|---------|------|---------|
| All Email Notifications | Master toggle | ON |
| Team Updates | Toggle | ON |
| Player Updates | Toggle | ON |
| Announcements | Toggle | ON |
| Assessment Reminders | Toggle | ON |

**Test Selectors Expected:**
```typescript
'[data-testid="email-notification-toggle"]'
'[aria-label*="email" i] [role="switch"]'
'text=/email.*notification/i'
```

**Behavior:**
- Toggles use `role="switch"` with `aria-checked` attribute
- Changes persist immediately (optimistic update)
- Changes survive page reload

#### FR-P4-003: Push Notification Setup

**Required Elements:**
- "Enable Push Notifications" button
- Browser permission request on enable
- Status indicator (enabled/disabled/blocked)

**Test Selectors Expected:**
```typescript
'[data-testid*="push"]'
'button:has-text("Enable Push")'
'button:has-text("Allow Notifications")'
'text=/push.*notification/i'
'text=/browser.*notification/i'
```

#### FR-P4-004: In-App Notification Toggles

**Required Controls:**
| Setting | Type | Default |
|---------|------|---------|
| Show In-App Notifications | Master toggle | ON |
| Sound Alerts | Toggle | OFF |
| Badge Count | Toggle | ON |

**Test Selectors Expected:**
```typescript
'[data-testid*="in-app"]'
'text=/in-app/i'
'text=/app.*notification/i'
```

#### FR-P4-005: Onboarding Step (Optional)

**Trigger:** Show notification preferences step during onboarding flow

**Required Elements:**
- Step indicator showing "Notification Preferences"
- Quick toggles for main notification types
- "Skip" / "Not Now" button to defer
- "Save & Continue" button

**Test Selectors Expected:**
```typescript
'[data-testid="onboarding-step"]'
'text=/step.*notification/i'
'text=/notification.*preferences/i'
'button:has-text("Skip")'
'button:has-text("Later")'
'button:has-text("Not Now")'
```

### UI/UX Specifications

```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Notification Preferences                                │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ Email Notifications                                     │
│ ┌─────────────────────────────────────────┐            │
│ │ Receive email updates          [====○] ON │           │
│ │ Team announcements             [====○] ON │           │
│ │ Player progress updates        [====○] ON │           │
│ │ Assessment reminders           [====○] ON │           │
│ └─────────────────────────────────────────┘            │
│                                                         │
│ Push Notifications                                      │
│ ┌─────────────────────────────────────────┐            │
│ │ Status: Not enabled                      │            │
│ │ [  Enable Push Notifications  ]          │            │
│ └─────────────────────────────────────────┘            │
│                                                         │
│ In-App Notifications                                    │
│ ┌─────────────────────────────────────────┐            │
│ │ Show notifications             [====○] ON │           │
│ │ Play sound                     [○====] OFF│           │
│ └─────────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] Notification settings section visible at `/orgs/[orgId]/admin/settings`
- [ ] Email notification toggles work and persist after reload
- [ ] Push notification enable button triggers browser permission
- [ ] In-app notification toggles present
- [ ] All toggles use `role="switch"` with `aria-checked`
- [ ] Changes save automatically (no separate save button needed)
- [ ] **Test:** `phase4-notifications.spec.ts` passes (4 currently failing tests)

---

## Phase 5: Organization Setup Wizard

### Overview

First-time organization owners need a guided setup wizard to configure their organization properly. This includes organization details, branding (colors/logo), and initial team creation.

### User Stories

**US-P5-001:** As a new organization owner, I want a setup wizard to guide me through initial configuration so I know what to set up.

**US-P5-002:** As an owner, I want to set my organization's branding (colors, logo) so my club looks professional.

**US-P5-003:** As an owner, I want to see my setup progress so I know what's left to complete.

**US-P5-004:** As an owner, I want to be prompted to create my first team during setup so I can get started quickly.

### Functional Requirements

#### FR-P5-001: Setup Wizard Display

**Trigger Conditions:**
- User is organization owner
- Organization `setupComplete` is `false` or `undefined`
- User has not dismissed the wizard 3+ times

**Required Elements:**
- Modal or full-page wizard
- Step indicator (e.g., "Step 1 of 4")
- Progress bar
- Next/Back navigation buttons

**Test Selectors Expected:**
```typescript
'[data-testid="first-user-wizard"]'
'[data-testid="org-setup-wizard"]'
'[data-testid="org-setup"]'
'[aria-label*="Setup"]'
'text=/welcome.*organization/i'
'text=/set up.*organization/i'
'text=/complete.*setup/i'
```

#### FR-P5-002: Wizard Steps

**Step 1: Welcome**
- Welcome message
- Overview of what will be configured
- "Get Started" button

**Step 2: Organization Details**
- Organization name (pre-filled, editable)
- Organization slug
- Description (optional)
- Website URL (optional)

**Step 3: Branding**
- Primary color picker
- Secondary color picker
- Tertiary color picker (optional)
- Logo upload

**Step 4: Create First Team** (Optional)
- Team name
- Sport selection
- Age group
- "Skip for now" option

**Step 5: Completion**
- Summary of what was configured
- "Finish Setup" button

**Test Selectors Expected:**
```typescript
// Step navigation
'[data-testid="wizard-step-indicator"]'
'[aria-current="step"]'
'.step-active'
'button:has-text("Next")'
'button:has-text("Continue")'
'button:has-text("Back")'
'button:has-text("Previous")'

// Progress tracking
'[data-testid="setup-progress"]'
'text=/\\d+%/i'
'text=/step.*of/i'
'[role="progressbar"]'

// Organization details
'input[name="name"]'
'[data-testid="org-name-input"]'
'text=/organization.*details/i'
'text=/club.*details/i'

// Branding
'[data-testid="org-colors"]'
'input[type="color"]'
'text=/primary.*color/i'
'text=/branding/i'
'[data-testid="logo-upload"]'
'input[type="file"]'
'text=/upload.*logo/i'

// Completion
'[data-testid="setup-complete"]'
'text=/setup.*complete/i'
'text=/all.*done/i'
```

#### FR-P5-003: Progress Persistence

**Requirements:**
- Current step saved to user record (`setupStep` field)
- Form data preserved when navigating between steps
- Progress survives page refresh
- Can resume from last step on return

#### FR-P5-004: Settings Page Integration

After setup completion, all wizard settings should be editable from `/orgs/[orgId]/admin/settings`:

**Required Elements:**
- Edit button or inline editing
- Save/Update button
- Required field indicators (`aria-required="true"`)
- Validation error messages

**Test Selectors Expected:**
```typescript
'button:has-text("Edit")'
'button:has-text("Update")'
'[data-testid="edit-org"]'
'button:has-text("Save")'
'button[type="submit"]'
'[aria-required="true"]'
'.required'
'text=/required/i'
```

### UI/UX Specifications

```
┌─────────────────────────────────────────────────────────┐
│                   Welcome to PlayerARC!                 │
│                                                         │
│    Let's get your organization set up in a few steps   │
│                                                         │
│    ○───────○───────○───────○───────●                   │
│    1       2       3       4       5                   │
│  Welcome Details Branding  Team   Done                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step 3 of 5: Organization Branding                    │
│  ───────────────────────────────────                   │
│                                                         │
│  Primary Color                                         │
│  ┌────────┐                                            │
│  │ #1A5F2A│ [Color Picker]                            │
│  └────────┘                                            │
│                                                         │
│  Secondary Color                                       │
│  ┌────────┐                                            │
│  │ #000000│ [Color Picker]                            │
│  └────────┘                                            │
│                                                         │
│  Organization Logo                                     │
│  ┌─────────────────────┐                              │
│  │                     │                              │
│  │   [Upload Logo]     │                              │
│  │                     │                              │
│  └─────────────────────┘                              │
│                                                         │
│            [Back]              [Next]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] Setup wizard appears for new organization owners
- [ ] Step indicator shows current progress
- [ ] Progress bar reflects completion percentage
- [ ] Navigation between steps works (Next/Back)
- [ ] Form data persists when navigating between steps
- [ ] Color pickers work and save to organization
- [ ] Logo upload works
- [ ] Setup completion is tracked in database
- [ ] Settings page shows all configured values
- [ ] Settings page allows editing with validation
- [ ] **Test:** `phase5-first-user.spec.ts` passes (7 currently failing tests)

---

## Phase 7: Graduation & Completion UI

### Overview

When users complete onboarding, they should see a celebration UI and have their progress tracked. The system should prevent re-triggering onboarding for completed users while allowing optional re-visit.

### User Stories

**US-P7-001:** As a user who completes onboarding, I want to see a celebration/congratulations message so I feel accomplished.

**US-P7-002:** As a completed user, I want to not see the onboarding wizard again so I'm not interrupted.

**US-P7-003:** As a user, I want to optionally restart onboarding from settings if I want a refresher.

**US-P7-004:** As a user, I want to see my onboarding progress so I know what steps I've completed.

### Functional Requirements

#### FR-P7-001: Completion Detection

**Logic:**
```typescript
function isOnboardingComplete(user): boolean {
  return user.onboardingComplete === true ||
         (user.gdprConsentVersion !== undefined &&
          user.setupComplete === true);
}
```

**Test Selectors Expected:**
```typescript
'[data-testid="onboarding-complete"]'
'text=/onboarding.*complete/i'
'text=/welcome.*aboard/i'
'[data-testid="onboarding-status"]'
```

#### FR-P7-002: Graduation Celebration UI

**Trigger:** First time user completes all onboarding steps

**Required Elements:**
- Celebration modal/overlay
- Confetti animation (optional but recommended)
- "Congratulations!" heading
- Summary of completed steps
- "Get Started" / "Continue" / "Close" button

**Test Selectors Expected:**
```typescript
'[data-testid="graduation"]'
'[data-testid="celebration"]'
'[data-testid="confetti"]'
'text=/congratulations/i'
'[data-testid="completion-summary"]'
'text=/completed.*steps/i'
'text=/ready.*go/i'
'text=/all.*done/i'
'button:has-text("Get Started")'
'button:has-text("Continue")'
'button:has-text("Close")'
```

**Dismissal:**
- Click dismiss button
- Click outside modal
- Press Escape key
- Set `onboardingComplete: true` in user record

#### FR-P7-003: Progress Tracking UI

**Location:** Dashboard or settings page

**Required Elements:**
- Progress indicator (percentage or X of Y steps)
- Visual step checklist
- Completed steps marked with checkmark

**Test Selectors Expected:**
```typescript
'[data-testid="progress"]'
'[role="progressbar"]'
'text=/\\d+.*of.*\\d+/i'
'text=/\\d+%/i'
'[data-testid="step-complete"]'
'[aria-checked="true"]'
'.step-completed'
```

#### FR-P7-004: Re-Onboarding Prevention

**Requirements:**
- Once `onboardingComplete: true`, don't show wizard automatically
- Navigation between pages doesn't trigger wizard
- Page refresh doesn't trigger wizard

**Test Selectors Expected:**
```typescript
// Should NOT appear for completed users
'[data-testid="onboarding-wizard"]:not([data-completed="true"])'
'[data-testid="onboarding-modal"]'
```

#### FR-P7-005: Optional Re-Visit Onboarding

**Location:** Settings page

**Required Elements:**
- "Restart Onboarding" button
- Confirmation dialog before restart
- Warning about what will happen

**Test Selectors Expected:**
```typescript
'button:has-text("Restart Onboarding")'
'text=/run.*onboarding.*again/i'
'[data-testid="restart-onboarding"]'
'[role="alertdialog"]'
'text=/are you sure/i'
```

#### FR-P7-006: Help/Tour (Non-Destructive)

**Requirements:**
- Help button accessible from dashboard
- Opens help content/tour without resetting onboarding
- Distinct from "Restart Onboarding"

**Test Selectors Expected:**
```typescript
'button:has-text("Help")'
'button:has-text("Tour")'
'[data-testid="help-button"]'
'[data-testid="help-content"]'
'[data-testid="tour"]'
'text=/getting.*started/i'
```

### UI/UX Specifications

**Celebration Modal:**
```
┌─────────────────────────────────────────────────────────┐
│                         🎉                              │
│                                                         │
│              Congratulations!                           │
│                                                         │
│         You've completed your onboarding!               │
│                                                         │
│    ┌─────────────────────────────────────────┐         │
│    │ ✓ Accepted privacy policy               │         │
│    │ ✓ Confirmed your children               │         │
│    │ ✓ Set notification preferences          │         │
│    │ ✓ Reviewed organization settings        │         │
│    └─────────────────────────────────────────┘         │
│                                                         │
│         You're all set to use PlayerARC!               │
│                                                         │
│              [  Get Started  ]                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Progress Indicator (Dashboard Widget):**
```
┌─────────────────────────────────────┐
│ Setup Progress                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░  │
│ 4 of 5 steps complete (80%)         │
│                                     │
│ ✓ Privacy policy                    │
│ ✓ Profile setup                     │
│ ✓ Notifications                     │
│ ✓ Team setup                        │
│ ○ Invite members                    │
└─────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] Celebration UI appears when all onboarding steps complete
- [ ] Celebration includes congratulations message
- [ ] Celebration shows completion summary
- [ ] Celebration can be dismissed
- [ ] `onboardingComplete: true` set after dismissing celebration
- [ ] Completed users don't see onboarding wizard on navigation
- [ ] Completed state persists across page refresh
- [ ] Completed state persists across sessions
- [ ] "Restart Onboarding" button in settings
- [ ] Restart shows confirmation dialog
- [ ] Help/Tour accessible without resetting progress
- [ ] Progress indicator shows completed steps
- [ ] **Test:** `phase7-graduation.spec.ts` passes (8 currently failing tests)

---

## Mobile: Hamburger Menu Navigation

### Overview

On mobile viewports, the navigation should collapse into a hamburger menu that opens a mobile-friendly navigation panel.

### Functional Requirements

#### FR-M-001: Hamburger Menu Button

**Trigger:** Viewport width < 768px (mobile breakpoint)

**Required Elements:**
- Hamburger icon button (three horizontal lines)
- Accessible label

**Test Selectors Expected:**
```typescript
'[data-testid="hamburger-menu"]'
'[aria-label*="menu" i]'
```

#### FR-M-002: Mobile Menu Panel

**On Click:**
- Opens navigation panel
- Panel contains all navigation links
- Panel can be closed

**Test Selectors Expected:**
```typescript
'[data-testid="mobile-menu"]'
'[role="navigation"]'
'nav'
```

#### FR-M-003: Auto-Close on Navigation

**Behavior:**
- When menu item clicked, navigate to page
- Close menu panel after navigation
- Focus returns to hamburger button

### Acceptance Criteria

- [ ] Hamburger button visible on mobile viewport (< 768px)
- [ ] Hamburger button has accessible label
- [ ] Clicking hamburger opens navigation panel
- [ ] Navigation panel contains all nav links
- [ ] Clicking nav item navigates and closes panel
- [ ] Panel can be closed without navigating
- [ ] **Test:** `mobile.spec.ts` hamburger test passes

---

## Data Model Requirements

### User Table Extensions

The following fields should already exist (from Phase 7 user stories) but verify they're being used:

```typescript
// In betterAuth/schema.ts - user table
{
  // Onboarding tracking
  onboardingComplete: v.optional(v.boolean()),

  // Setup wizard tracking (Phase 5)
  setupComplete: v.optional(v.boolean()),
  setupStep: v.optional(v.string()), // 'welcome', 'details', 'branding', 'team', 'complete'

  // GDPR consent (Phase 2 - already implemented)
  gdprConsentVersion: v.optional(v.number()),
  gdprConsentedAt: v.optional(v.number()),
}
```

### New Table: Notification Preferences

```typescript
// New table for notification preferences
notificationPreferences: defineTable({
  userId: v.string(),
  organizationId: v.optional(v.string()), // Org-specific preferences

  // Email notifications
  emailEnabled: v.boolean(),
  emailTeamUpdates: v.boolean(),
  emailPlayerUpdates: v.boolean(),
  emailAnnouncements: v.boolean(),
  emailAssessments: v.boolean(),

  // Push notifications
  pushEnabled: v.boolean(),
  pushSubscription: v.optional(v.string()), // Browser push subscription JSON

  // In-app notifications
  inAppEnabled: v.boolean(),
  inAppSound: v.boolean(),
  inAppBadge: v.boolean(),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_orgId", ["userId", "organizationId"])
```

### Backend Functions Required

```typescript
// Notification Preferences
models/notificationPreferences.ts:
  - getNotificationPreferences(userId, orgId?)
  - updateNotificationPreferences(userId, preferences)
  - getDefaultNotificationPreferences()

// Onboarding Progress
models/onboarding.ts (extend existing):
  - markOnboardingComplete(userId)
  - getOnboardingProgress(userId)
  - resetOnboarding(userId) // For restart feature
  - updateSetupStep(userId, step)
```

---

## Implementation Order

### Recommended Sequence

1. **Phase 5: Organization Setup Wizard** (High Priority)
   - Impacts first-time user experience
   - Required for proper organization setup
   - Blocks Phase 7 completion detection

2. **Phase 7: Graduation & Completion UI** (High Priority)
   - Depends on Phase 5 completion
   - Critical for user satisfaction
   - Prevents confusion about onboarding state

3. **Phase 4: Notification Preferences** (Medium Priority)
   - Independent feature
   - Can be implemented in parallel
   - Enhances user experience but not blocking

4. **Mobile: Hamburger Menu** (Low Priority)
   - UI polish item
   - Existing navigation works, just not optimal
   - Can be deferred if needed

### Estimated Scope

| Feature | Frontend | Backend | Tests |
|---------|----------|---------|-------|
| Phase 4 | 2-3 components | 3 functions, 1 table | 4 tests |
| Phase 5 | 5-6 components | 3 functions | 7 tests |
| Phase 7 | 3-4 components | 3 functions | 8 tests |
| Mobile | 2 components | None | 1 test |

---

## Test Files Reference

All test files are located at: `/apps/web/uat/tests/onboarding/`

| Feature | Test File | Failing Tests |
|---------|-----------|---------------|
| Phase 4 | `phase4-notifications.spec.ts` | 4 |
| Phase 5 | `phase5-first-user.spec.ts` | 7 |
| Phase 7 | `phase7-graduation.spec.ts` | 8 |
| Mobile | `mobile.spec.ts` | 1 |

**Running Tests:**
```bash
cd /Users/jkobrien/code/PDP/apps/web/uat

# Run all onboarding tests
npx playwright test tests/onboarding/ --reporter=list

# Run specific phase
npx playwright test tests/onboarding/phase4-notifications.spec.ts
npx playwright test tests/onboarding/phase5-first-user.spec.ts
npx playwright test tests/onboarding/phase7-graduation.spec.ts
```

---

## Appendix: Test Selectors Quick Reference

### Phase 4 - Notifications
```typescript
'[data-testid="notification-settings"]'
'[data-testid="notification-preferences"]'
'[data-testid="email-notification-toggle"]'
'[data-testid*="push"]'
'[data-testid*="in-app"]'
'[data-testid="onboarding-step"]'
'[role="switch"]' with 'aria-checked'
```

### Phase 5 - Setup Wizard
```typescript
'[data-testid="first-user-wizard"]'
'[data-testid="org-setup-wizard"]'
'[data-testid="org-setup"]'
'[data-testid="wizard-step-indicator"]'
'[data-testid="setup-progress"]'
'[data-testid="org-colors"]'
'[data-testid="logo-upload"]'
'[data-testid="setup-complete"]'
'[role="progressbar"]'
```

### Phase 7 - Graduation
```typescript
'[data-testid="graduation"]'
'[data-testid="celebration"]'
'[data-testid="confetti"]'
'[data-testid="completion-summary"]'
'[data-testid="onboarding-complete"]'
'[data-testid="onboarding-status"]'
'[data-testid="progress"]'
'[data-testid="step-complete"]'
'[data-testid="restart-onboarding"]'
'[data-testid="help-button"]'
```

### Mobile
```typescript
'[data-testid="hamburger-menu"]'
'[data-testid="mobile-menu"]'
'[aria-label*="menu" i]'
```

---

**End of Document**
