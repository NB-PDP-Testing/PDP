# Trust Curve System

The Trust Curve system tracks coach reliability when reviewing AI-generated parent summaries. As coaches consistently approve summaries, their trust level increases, enabling higher levels of automation.

## Overview

### Trust Levels

| Level | Name | Description | Requirements |
|-------|------|-------------|--------------|
| 0 | New | Manual review required for all summaries | Default starting level |
| 1 | Learning | Quick review with AI suggestions | 10+ approvals |
| 2 | Trusted | Auto-approve normal summaries, review sensitive | 50+ approvals, <10% suppression rate |
| 3 | Expert | Full automation with coach opt-in | 200+ approvals + explicit opt-in |

### Key Features

- **Progressive Trust**: Coaches earn higher levels through consistent approvals
- **Suppression Tracking**: High suppression rates can block advancement to Level 2+
- **Coach Control**: Coaches can cap their preferred automation level at any time
- **Nudge System**: Encouragement banners appear when close to next level
- **Level History**: All level changes are logged with timestamps and reasons

## Database Schema

### coachTrustLevels Table

```typescript
// packages/backend/convex/schema.ts
coachTrustLevels: defineTable({
  coachId: v.string(),           // Better Auth user ID
  organizationId: v.string(),    // Organization scope
  currentLevel: v.number(),      // 0-3
  preferredLevel: v.optional(v.number()), // Coach-set cap
  totalApprovals: v.number(),
  totalSuppressed: v.number(),
  consecutiveApprovals: v.number(),
  levelHistory: v.array(v.object({
    level: v.number(),
    changedAt: v.number(),
    reason: v.string(),
  })),
  lastActivityAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_coach_org", ["coachId", "organizationId"])
  .index("by_org", ["organizationId"])
```

## Backend API

### Queries

#### getCoachTrustLevel
Returns the coach's current trust level with progress metrics.

```typescript
// packages/backend/convex/models/coachTrustLevels.ts
export const getCoachTrustLevel = query({
  args: { organizationId: v.string() },
  returns: v.object({
    currentLevel: v.number(),
    preferredLevel: v.optional(v.number()),
    totalApprovals: v.number(),
    totalSuppressed: v.number(),
    consecutiveApprovals: v.number(),
    progressToNextLevel: v.object({
      currentCount: v.number(),
      threshold: v.number(),
      percentage: v.number(),
      blockedBySuppressionRate: v.boolean(),
    }),
  }),
});
```

### Mutations

#### setCoachPreferredLevel
Allows coaches to cap their maximum automation level.

```typescript
export const setCoachPreferredLevel = mutation({
  args: {
    organizationId: v.string(),
    preferredLevel: v.number(), // 0, 1, 2, or 3
  },
  returns: trustLevelValidator,
});
```

### Internal Mutations

#### updateTrustMetrics
Called internally when a coach approves, suppresses, or edits a summary.

```typescript
export const updateTrustMetrics = internalMutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    action: v.union(
      v.literal("approved"),
      v.literal("suppressed"),
      v.literal("edited")
    ),
  },
});
```

## Frontend Components

### TrustLevelIndicator

Displays the coach's current trust level with progress bar.

**Location**: `apps/web/src/components/coach/trust-level-indicator.tsx`

**Props**:
```typescript
type TrustLevelIndicatorProps = {
  trustLevel: number;
  totalApprovals: number;
  totalSuppressed: number;
  progressToNextLevel: {
    percentage: number;
    threshold: number;
  };
  onSettingsClick?: () => void;
  className?: string;
};
```

**Features**:
- Badge showing level name (New, Learning, Trusted, Expert)
- Semantic colors per level (gray, blue, green, purple)
- Progress bar toward next level
- Settings gear icon (optional)
- "Maximum level reached" state for Level 3

### TrustPreferenceSettings

Radio group for selecting preferred automation level.

**Location**: `apps/web/src/components/coach/trust-preference-settings.tsx`

**Props**:
```typescript
type TrustPreferenceSettingsProps = {
  currentLevel: number;
  preferredLevel: number | null;
  onUpdate: (level: number) => void;
};
```

**Features**:
- All 4 levels displayed with descriptions
- Unearned levels disabled with "(Not yet earned)"
- Level 3 warning alert about full automation
- Selected level highlighted in green

### TrustNudgeBanner

Encouragement banner shown when close to next level.

**Location**: `apps/web/src/components/coach/trust-nudge-banner.tsx`

**Props**:
```typescript
type TrustNudgeBannerProps = {
  currentLevel: number;
  totalApprovals: number;
  threshold: number;
  onDismiss: () => void;
};
```

**Features**:
- Shows when within 2 approvals of next level (8/10, 45/50)
- Dismissible with X button
- Dismiss state persisted in localStorage per level
- Auto-resets when level changes

## Integration Points

### Voice Notes Dashboard

The Trust Curve components are integrated into the Voice Notes dashboard:

**Location**: `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

```typescript
// Query trust level
const trustLevel = useQuery(api.models.coachTrustLevels.getCoachTrustLevel, {
  organizationId: orgId,
});

// Mutation for preferences
const setPreferredLevel = useMutation(
  api.models.coachTrustLevels.setCoachPreferredLevel
);
```

### Summary Approval/Suppression Hooks

Trust metrics are automatically updated when coaches approve or suppress summaries:

**Location**: `packages/backend/convex/models/coachParentSummaries.ts`

```typescript
// In approveSummary mutation:
await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
  coachId: coachIdString,
  organizationId: summary.organizationId,
  action: "approved",
});

// In suppressSummary mutation:
await ctx.runMutation(internal.models.coachTrustLevels.updateTrustMetrics, {
  coachId: coachIdString,
  organizationId: summary.organizationId,
  action: "suppressed",
});
```

## Trust Level Calculator

Pure functions for calculating trust levels and progress.

**Location**: `packages/backend/convex/lib/trustLevelCalculator.ts`

### Thresholds

```typescript
export const TRUST_THRESHOLDS = {
  LEVEL_1_APPROVALS: 10,
  LEVEL_2_APPROVALS: 50,
  LEVEL_2_MAX_SUPPRESSION_RATE: 0.1, // 10%
  LEVEL_3_APPROVALS: 200,
};
```

### Functions

- `calculateTrustLevel(approvals, suppressed, optedInToLevel3)` - Returns earned level (0-3)
- `calculateProgressToNextLevel(currentLevel, approvals, suppressed)` - Returns progress metrics

## User Experience

### How Coaches See Their Trust Level

1. **Trust Level Indicator** appears at the top of the Voice Notes dashboard
2. Shows current level badge, approval count, and progress bar
3. Suppression rate shown if any summaries have been suppressed

### How to Change Preferred Level

1. Click the **settings gear icon** on the Trust Level Indicator
2. **Trust Level Settings dialog** opens
3. Select preferred maximum level (only earned levels selectable)
4. Changes save automatically with toast confirmation

### What Each Level Means

| Level | Automation Behavior |
|-------|---------------------|
| 0 (New) | All summaries require manual review before sending |
| 1 (Learning) | Summaries shown with AI suggestions, coach approves |
| 2 (Trusted) | Normal summaries auto-approved, sensitive flagged for review |
| 3 (Expert) | Full automation - summaries sent without review (requires opt-in) |

## Security Considerations

- Trust levels are organization-scoped (coach has separate level per org)
- Only the coach who created an insight can approve/suppress its summary
- Level 3 requires explicit opt-in to prevent accidental full automation
- Coaches can always lower their level instantly, but must earn upgrades

## Related Documentation

- [Voice Notes System](./voice-notes.md)
- [Coach Parent Summaries](./coach-parent-summaries.md)
- [AI Configuration](./ai-configuration.md)
