# PRD: AI-Powered Session Plans Management System

**Document Version:** 1.0
**Created:** January 12, 2026
**Status:** Draft - Ready for Review
**Author:** Product Team
**Target Release:** Q1 2026

---

## Executive Summary

This PRD defines a comprehensive Session Plans management system that enables coaches to generate, store, organize, search, and learn from AI-powered training session plans. Building on the existing session plan generation capability (currently ephemeral), this feature adds persistence, archival workflows, analytics, and continuous improvement mechanisms.

### Key Value Propositions

1. **Persistent Session Library** - All generated session plans are stored and accessible for future reference
2. **Quality Feedback Loop** - Archive plans as "worked" or "didn't work" to build institutional knowledge
3. **Granular Drill-Level Feedback** - Rate and annotate individual drills and activities within each session
4. **Search & Discovery** - Quickly find past plans by focus area, team, date, or outcome (including specific drills)
5. **Dashboard Insights** - Understand what types of sessions AND specific drills are most effective
6. **Continuous Improvement** - AI learns from feedback at both session and drill level for better future generation

---

## Problem Statement

### Current State

The PlayerARC platform currently has:
- **Session plan generation** via AI (Claude Haiku) - `/api/session-plan` route
- **Frontend UI** in SmartCoachDashboard that generates plans on-demand
- **Team and player data** available to inform plan generation

**However, session plans are ephemeral** - once generated, they disappear when the coach navigates away. There's no way to:
- Save a plan for later reference
- Track which plans were actually used
- Mark plans as successful or unsuccessful
- Learn from past sessions
- Search through historical plans
- Share plans with other coaches

### Pain Points

| Pain Point | Impact |
|------------|--------|
| Plans disappear after generation | Coaches regenerate similar plans repeatedly |
| No quality tracking | Can't learn which session structures work best |
| No drill-level feedback | Can't identify which specific drills work vs. don't work |
| No search capability | Can't find "that drill we did 3 weeks ago" |
| No session history | New coaches can't learn from experienced ones |
| Wasted AI calls | Same types of plans regenerated frequently |
| No accountability | No record of what was planned vs. executed |
| No granular learning | AI can't learn that "3v1 possession worked but cone dribbling didn't" |

### Opportunity

Transform session plan generation from a one-time feature into a **knowledge management system** that:
- Builds a searchable library of training sessions AND individual drills
- Captures institutional knowledge about what works at both session and drill level
- Enables data-driven coaching improvements with granular feedback
- Reduces time spent on session planning by surfacing proven drills
- Allows AI to learn which specific activities work for specific age groups, skill levels, and focus areas

---

## Codebase Integration Analysis

### Existing Infrastructure to Leverage

| Component | File Location | Usage |
|-----------|---------------|-------|
| **Session plan API** | `apps/web/src/app/api/session-plan/route.ts` | Existing Claude AI integration |
| **AI service** | `apps/web/src/lib/ai-service.ts` | `generateSessionPlan()` function |
| **Coach dashboard** | `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx` | Integration point for session plans |
| **SmartCoachDashboard** | `apps/web/src/components/smart-coach-dashboard.tsx` | Current session plan UI (lines 502-547) |
| **Quick actions** | `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` | "Generate Session Plan" button (line 71-76) |
| **Voice notes pattern** | `packages/backend/convex/models/voiceNotes.ts` | Reference for coach-specific feature architecture |
| **Coach assignments** | `packages/backend/convex/models/coaches.ts` | Team/coach access control |
| **Team analytics** | `SmartCoachDashboard` | Existing team data aggregation |

### Current Session Plan Generation Flow

```typescript
// apps/web/src/lib/ai-service.ts - generateSessionPlan()
export async function generateSessionPlan(
  teamData: TeamData,
  focus?: string
): Promise<string> {
  // Calls /api/session-plan
  // Returns markdown string
  // Plan is displayed but NOT stored
}
```

```typescript
// SmartCoachDashboard - handleGenerateSessionPlan()
const handleGenerateSessionPlan = async () => {
  setLoadingSessionPlan(true);
  setShowSessionPlan(true);
  // ... generates plan
  setSessionPlan(plan); // Stored only in React state!
};
```

### Files That Will Be Modified

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `sessionPlans` table |
| `packages/backend/convex/models/sessionPlans.ts` | New file - queries/mutations |
| `packages/backend/convex/actions/sessionPlans.ts` | New file - AI generation with storage |
| `apps/web/src/lib/ai-service.ts` | Update to use Convex backend |
| `apps/web/src/components/smart-coach-dashboard.tsx` | Update session plan UI |
| `apps/web/src/app/orgs/[orgId]/coach/session-plans/*` | New route folder |
| `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` | Update quick action routing |

---

## Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **G1** | Store all generated session plans persistently with structured sections and activities |
| **G2** | Enable coaches to archive plans with outcome feedback at THREE levels: overall, section, and drill |
| **G3** | Provide searchable session plan AND drill library with filtering |
| **G4** | Display dashboard insights on session AND drill effectiveness |
| **G5** | Allow deletion of broken/invalid session plans |
| **G6** | Enable AI learning from granular drill feedback for improved future generation |
| **G7** | Build a "Drill Library" aggregated from coach feedback over time |
| **G8** | Surface proven drills and warn against consistently failing drills |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Storage** | | |
| Session plan storage rate | 100% of generated plans stored | System tracking |
| **Feedback - Overall** | | |
| Session feedback rate | 40% of used plans receive outcome feedback | Database analytics |
| **Feedback - Granular (KEY METRICS)** | | |
| Section feedback rate | 60% of sessions have section-level feedback | Database analytics |
| Drill feedback rate | 50% of drills in used sessions get rated | Database analytics |
| Drills with notes | 30% of rated drills have coach notes | Database analytics |
| Modifications suggested | 20% of "didn't work" drills have modifications | Database analytics |
| **Search & Discovery** | | |
| Search utilization | 30% of coaches use search weekly | Usage analytics |
| Drill library usage | 25% of coaches browse drill library monthly | Usage analytics |
| Time to find past plan | <30 seconds | UX testing |
| **AI Learning** | | |
| Improved plan ratings | Plans generated with feedback context rate 0.5★ higher | Database analytics |
| Drill reuse from library | 40% of new plans include proven drills | System tracking |
| Avoided drill reduction | 80% reduction in low-rated drill appearances | System tracking |
| **User Satisfaction** | | |
| Coach satisfaction | 4/5 on session planning workflow | Survey |
| Feedback UI satisfaction | 4/5 on ease of providing drill feedback | Survey |
| Repeat generation reduction | 50% fewer duplicate plan types | AI token tracking |

---

## User Stories

### Coach Stories

```
As a coach, I want to:

SESSION MANAGEMENT
- Generate an AI-powered session plan and have it automatically saved
- View all my past session plans in a searchable library
- Delete session plans that were broken or irrelevant
- Filter my session plans by team, date, focus area, or outcome
- Search for past plans that focused on specific skills (e.g., "ball control")
- Know which plans I've actually used vs. just generated
- Re-use a successful session plan template for similar situations

OVERALL FEEDBACK
- Mark a session plan as "worked well" after using it successfully
- Mark a session plan as "didn't work" so I remember to avoid similar approaches
- Rate the overall session effectiveness (1-5 stars)
- Add notes about what worked and what to improve

SECTION-LEVEL FEEDBACK
- Rate each section of the session (warm-up, technical, tactical, etc.)
- Note which sections worked well vs. needed improvement
- Provide section-specific notes (e.g., "Tactical section was too long")

DRILL-LEVEL FEEDBACK (GRANULAR)
- Rate individual drills within a session (1-5 stars)
- Mark specific drills as "worked" or "didn't work"
- Add notes to individual drills (e.g., "Kids loved this!" or "Too complex for U10s")
- Indicate whether I would use a drill again
- Suggest modifications for drills that didn't work (e.g., "Add competition element")
- Rate player engagement level for each drill (low/medium/high)
- Indicate if a drill was age-appropriate for my team

INSIGHTS & LEARNING
- See insights on what types of sessions have been most successful
- View my top-performing drills across all sessions
- See which drills consistently don't work (and why)
- Browse a "drill library" built from my feedback over time
- Search for drills that work well for specific age groups
- See suggested modifications from past feedback when a drill appears again
- Let AI use my drill feedback to generate better future plans
```

### Admin Stories

```
As an organization admin, I want to:
- See aggregate session plan metrics across all coaches
- Understand which coaches are actively planning sessions
- Export session plan data for training program analysis
- Share successful session plans across the coaching staff
```

---

## Feature Specification

### 1. Session Plan Data Model

The data model is designed with **three levels of granularity**:
1. **Session Plan** - The overall training session (90 minutes)
2. **Session Section** - A phase of training (e.g., Warm-up, Technical Skills, Cool-down)
3. **Section Activity** - An individual drill or exercise within a section

This structure enables feedback at every level, from "the whole session worked" down to "this specific 3v1 possession drill was great."

#### 1.1 Session Plan Entity (Top Level)

```typescript
interface SessionPlan {
  // Identity
  _id: Id<"sessionPlans">;
  organizationId: string;
  coachId: string;           // User ID of coach who generated
  coachName: string;         // Denormalized for display

  // Team context
  teamId?: string;           // Team the plan was generated for
  teamName: string;          // Denormalized
  ageGroup?: string;
  sport?: string;
  playerCount: number;

  // Plan content - STRUCTURED
  title: string;             // Auto-generated or coach-provided
  rawContent: string;        // Original markdown (for display/export)
  focusArea?: string;        // Primary skill/area focus
  duration: number;          // Session duration in minutes (default: 90)

  // Structured sections (see Section entity below)
  sections: SessionSection[];

  // Generation context
  generationPrompt?: string; // What was asked for
  teamStrengths: Array<{ skill: string; avg: number }>;
  teamWeaknesses: Array<{ skill: string; avg: number }>;

  // Status tracking
  status: "draft" | "saved" | "archived_success" | "archived_failed" | "deleted";
  usedInSession: boolean;    // Did coach actually use this?
  usedDate?: number;         // When was it used?

  // OVERALL Feedback (session-level)
  overallRating?: 1 | 2 | 3 | 4 | 5;  // How well did the session work overall?
  overallNotes?: string;              // General session notes
  whatWorkedWell?: string;            // Session-level: what worked
  whatToImprove?: string;             // Session-level: what to change

  // AI learning
  feedbackSubmitted: boolean;
  feedbackUsedForTraining: boolean;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}
```

#### 1.2 Session Section Entity (Mid Level)

Each session is divided into sections representing phases of training.

```typescript
interface SessionSection {
  // Identity
  id: string;                // Unique ID within the session (e.g., "section-1")

  // Section info
  type: "warmup" | "technical" | "tactical" | "games" | "cooldown" | "custom";
  title: string;             // e.g., "Warm-up", "Technical Skills", "Small-sided Games"
  duration: number;          // Duration in minutes (e.g., 10, 30, 25)
  order: number;             // Display order (1, 2, 3, ...)

  // Activities within this section
  activities: SectionActivity[];

  // SECTION-LEVEL Feedback
  sectionRating?: 1 | 2 | 3 | 4 | 5;  // How well did this section work?
  sectionNotes?: string;              // Notes about this section
  sectionWorked?: boolean;            // Quick: did this section work? (null = not rated)
}
```

#### 1.3 Section Activity Entity (Granular Level) - THE KEY INNOVATION

Each section contains individual drills, exercises, or activities that can be rated independently.

```typescript
interface SectionActivity {
  // Identity
  id: string;                // Unique ID within the session (e.g., "activity-1-1")

  // Activity info
  name: string;              // e.g., "3v1 Possession Game", "Cone Dribbling Circuit"
  description: string;       // Full description of the drill/activity
  duration?: number;         // Duration in minutes (if specified)
  order: number;             // Display order within section

  // Categorization (for searching and AI learning)
  activityType: "drill" | "game" | "exercise" | "demonstration" | "discussion" | "rest";
  skillsFocused?: string[];  // e.g., ["ball_control", "first_touch", "passing"]
  equipment?: string[];      // e.g., ["cones", "balls", "bibs"]
  playerGrouping?: string;   // e.g., "pairs", "groups of 4", "full team"
  intensity?: "low" | "medium" | "high";

  // ACTIVITY-LEVEL Feedback (THE GRANULAR PART)
  activityRating?: 1 | 2 | 3 | 4 | 5;  // How well did THIS specific drill work?
  activityWorked?: boolean;            // Quick toggle: worked / didn't work
  activityNotes?: string;              // "Kids loved this" or "Too complex for U10s"

  // AI learning metadata
  wouldUseAgain?: boolean;             // Would you include this drill again?
  suggestedModification?: string;      // "Use smaller area" or "Add defender"
  ageGroupAppropriate?: boolean;       // Was this right for the age group?
  engagementLevel?: "low" | "medium" | "high";  // How engaged were players?
}
```

#### 1.4 Session Plan Tags (for categorization)

```typescript
interface SessionPlanTag {
  _id: Id<"sessionPlanTags">;
  organizationId: string;
  name: string;              // e.g., "Match Prep", "Recovery", "Skills Focus"
  color: string;             // For UI display
  createdAt: number;
}
```

#### 1.5 Drill Library Entity (Aggregated from Feedback)

Over time, activities with feedback become a searchable drill library.

```typescript
interface DrillLibraryEntry {
  // Identity
  _id: Id<"drillLibrary">;
  organizationId: string;

  // Drill info (aggregated from activities)
  name: string;                        // Normalized drill name
  description: string;                 // Best description
  activityType: string;
  skillsFocused: string[];
  equipment: string[];

  // Aggregated metrics
  timesUsed: number;                   // How many times included in plans
  avgRating: number;                   // Average rating across uses
  successRate: number;                 // % of times marked "worked"

  // Context effectiveness
  effectiveAgeGroups: string[];        // Age groups where it works best
  effectiveFocusAreas: string[];       // Skills it's best for
  commonModifications: string[];       // Frequently suggested improvements

  // Source tracking
  sourceActivityIds: string[];         // Original activities this aggregates

  createdAt: number;
  updatedAt: number;
}

### 2. Database Schema

```typescript
// packages/backend/convex/schema.ts additions

// Reusable validators for nested structures
const activityFeedbackValidator = v.object({
  activityRating: v.optional(v.union(
    v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
  )),
  activityWorked: v.optional(v.boolean()),
  activityNotes: v.optional(v.string()),
  wouldUseAgain: v.optional(v.boolean()),
  suggestedModification: v.optional(v.string()),
  ageGroupAppropriate: v.optional(v.boolean()),
  engagementLevel: v.optional(v.union(
    v.literal("low"), v.literal("medium"), v.literal("high")
  )),
});

const sectionActivityValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  duration: v.optional(v.number()),
  order: v.number(),
  activityType: v.union(
    v.literal("drill"),
    v.literal("game"),
    v.literal("exercise"),
    v.literal("demonstration"),
    v.literal("discussion"),
    v.literal("rest")
  ),
  skillsFocused: v.optional(v.array(v.string())),
  equipment: v.optional(v.array(v.string())),
  playerGrouping: v.optional(v.string()),
  intensity: v.optional(v.union(
    v.literal("low"), v.literal("medium"), v.literal("high")
  )),
  // Feedback fields inline
  activityRating: v.optional(v.union(
    v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
  )),
  activityWorked: v.optional(v.boolean()),
  activityNotes: v.optional(v.string()),
  wouldUseAgain: v.optional(v.boolean()),
  suggestedModification: v.optional(v.string()),
  ageGroupAppropriate: v.optional(v.boolean()),
  engagementLevel: v.optional(v.union(
    v.literal("low"), v.literal("medium"), v.literal("high")
  )),
});

const sessionSectionValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("warmup"),
    v.literal("technical"),
    v.literal("tactical"),
    v.literal("games"),
    v.literal("cooldown"),
    v.literal("custom")
  ),
  title: v.string(),
  duration: v.number(),
  order: v.number(),
  activities: v.array(sectionActivityValidator),
  // Section-level feedback
  sectionRating: v.optional(v.union(
    v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
  )),
  sectionNotes: v.optional(v.string()),
  sectionWorked: v.optional(v.boolean()),
});

// Session plans storage
sessionPlans: defineTable({
  // Identity
  organizationId: v.string(),
  coachId: v.string(),
  coachName: v.string(),

  // Team context
  teamId: v.optional(v.string()),
  teamName: v.string(),
  ageGroup: v.optional(v.string()),
  sport: v.optional(v.string()),
  playerCount: v.number(),

  // Plan content - STRUCTURED
  title: v.string(),
  rawContent: v.string(),           // Original markdown for display/export
  focusArea: v.optional(v.string()),
  duration: v.number(),

  // STRUCTURED SECTIONS with nested activities
  sections: v.array(sessionSectionValidator),

  // Generation context (stored for future AI improvements)
  generationPrompt: v.optional(v.string()),
  teamStrengths: v.array(v.object({
    skill: v.string(),
    avg: v.number(),
  })),
  teamWeaknesses: v.array(v.object({
    skill: v.string(),
    avg: v.number(),
  })),

  // Status
  status: v.union(
    v.literal("draft"),
    v.literal("saved"),
    v.literal("archived_success"),
    v.literal("archived_failed"),
    v.literal("deleted")
  ),
  usedInSession: v.boolean(),
  usedDate: v.optional(v.number()),

  // OVERALL Session-level Feedback
  overallRating: v.optional(v.union(
    v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
  )),
  overallNotes: v.optional(v.string()),
  whatWorkedWell: v.optional(v.string()),
  whatToImprove: v.optional(v.string()),

  // Tags (array of tag IDs)
  tags: v.optional(v.array(v.string())),

  // AI learning
  feedbackSubmitted: v.boolean(),
  feedbackUsedForTraining: v.boolean(),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
})
  .index("by_org", ["organizationId"])
  .index("by_coach", ["coachId"])
  .index("by_org_and_coach", ["organizationId", "coachId"])
  .index("by_org_and_status", ["organizationId", "status"])
  .index("by_org_and_team", ["organizationId", "teamId"])
  .index("by_coach_and_status", ["coachId", "status"])
  .index("by_org_and_createdAt", ["organizationId", "createdAt"])
  .index("by_focusArea", ["focusArea"])
  .searchIndex("search_content", {
    searchField: "rawContent",
    filterFields: ["organizationId", "coachId", "status"],
  })
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["organizationId", "coachId", "status"],
  }),

// Session plan tags for categorization
sessionPlanTags: defineTable({
  organizationId: v.string(),
  name: v.string(),
  color: v.string(),
  createdAt: v.number(),
})
  .index("by_org", ["organizationId"]),

// Drill library - aggregated from activity feedback over time
drillLibrary: defineTable({
  organizationId: v.string(),

  // Drill info (aggregated from activities)
  name: v.string(),
  normalizedName: v.string(),        // Lowercase, trimmed for matching
  description: v.string(),
  activityType: v.string(),
  skillsFocused: v.array(v.string()),
  equipment: v.array(v.string()),

  // Aggregated metrics
  timesUsed: v.number(),
  totalRatingSum: v.number(),        // For calculating average
  ratingCount: v.number(),           // Number of ratings received
  successCount: v.number(),          // Times marked "worked"
  failureCount: v.number(),          // Times marked "didn't work"

  // Context effectiveness
  effectiveAgeGroups: v.array(v.string()),
  ineffectiveAgeGroups: v.array(v.string()),
  effectiveFocusAreas: v.array(v.string()),
  commonModifications: v.array(v.string()),

  // Source tracking
  sourceSessionPlanIds: v.array(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_and_name", ["organizationId", "normalizedName"])
  .index("by_org_and_type", ["organizationId", "activityType"])
  .searchIndex("search_drills", {
    searchField: "name",
    filterFields: ["organizationId", "activityType"],
  }),
```

### 3. Backend Functions

#### 3.1 Mutations

```typescript
// packages/backend/convex/models/sessionPlans.ts

/**
 * Generate and store a new session plan
 */
export const generateAndSave = mutation({
  args: {
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    teamName: v.string(),
    ageGroup: v.optional(v.string()),
    sport: v.optional(v.string()),
    playerCount: v.number(),
    focusArea: v.optional(v.string()),
    duration: v.optional(v.number()),
    teamStrengths: v.array(v.object({
      skill: v.string(),
      avg: v.number(),
    })),
    teamWeaknesses: v.array(v.object({
      skill: v.string(),
      avg: v.number(),
    })),
    customPrompt: v.optional(v.string()),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    // 1. Get current user and verify coach access
    // 2. Create session plan record with status "draft"
    // 3. Schedule AI generation action
    // 4. Return plan ID for frontend tracking
  },
});

/**
 * Update plan content after AI generation completes
 */
export const updateContent = internalMutation({
  args: {
    planId: v.id("sessionPlans"),
    title: v.string(),
    content: v.string(),
    status: v.union(v.literal("saved"), v.literal("draft")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update plan with generated content
  },
});

/**
 * Mark a session plan as used
 */
export const markAsUsed = mutation({
  args: {
    planId: v.id("sessionPlans"),
    usedDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Update usedInSession = true, usedDate
  },
});

/**
 * Archive a session plan with COMPREHENSIVE outcome feedback
 * Includes overall, section, and activity-level feedback
 */
export const archive = mutation({
  args: {
    planId: v.id("sessionPlans"),
    outcome: v.union(v.literal("success"), v.literal("failed")),

    // Overall session feedback
    overallRating: v.optional(v.union(
      v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
    )),
    overallNotes: v.optional(v.string()),
    whatWorkedWell: v.optional(v.string()),
    whatToImprove: v.optional(v.string()),

    // Section-level feedback (array matching sections)
    sectionFeedback: v.optional(v.array(v.object({
      sectionId: v.string(),
      sectionRating: v.optional(v.union(
        v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
      )),
      sectionWorked: v.optional(v.boolean()),
      sectionNotes: v.optional(v.string()),
    }))),

    // Activity-level feedback (the granular part!)
    activityFeedback: v.optional(v.array(v.object({
      activityId: v.string(),
      activityRating: v.optional(v.union(
        v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
      )),
      activityWorked: v.optional(v.boolean()),
      activityNotes: v.optional(v.string()),
      wouldUseAgain: v.optional(v.boolean()),
      suggestedModification: v.optional(v.string()),
      ageGroupAppropriate: v.optional(v.boolean()),
      engagementLevel: v.optional(v.union(
        v.literal("low"), v.literal("medium"), v.literal("high")
      )),
    }))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Update status to archived_success or archived_failed
    // 3. Store overall feedback
    // 4. Apply section feedback to sections array
    // 5. Apply activity feedback to activities within sections
    // 6. Mark feedbackSubmitted = true
    // 7. Set archivedAt timestamp
    // 8. Update drill library with activity feedback (for AI learning)
  },
});

/**
 * Update feedback for a single activity (real-time as coach reviews)
 */
export const updateActivityFeedback = mutation({
  args: {
    planId: v.id("sessionPlans"),
    sectionId: v.string(),
    activityId: v.string(),
    feedback: v.object({
      activityRating: v.optional(v.union(
        v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
      )),
      activityWorked: v.optional(v.boolean()),
      activityNotes: v.optional(v.string()),
      wouldUseAgain: v.optional(v.boolean()),
      suggestedModification: v.optional(v.string()),
      ageGroupAppropriate: v.optional(v.boolean()),
      engagementLevel: v.optional(v.union(
        v.literal("low"), v.literal("medium"), v.literal("high")
      )),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Find the activity in the nested structure
    // 3. Update the activity's feedback fields
    // 4. Update plan's updatedAt
  },
});

/**
 * Update feedback for a single section
 */
export const updateSectionFeedback = mutation({
  args: {
    planId: v.id("sessionPlans"),
    sectionId: v.string(),
    feedback: v.object({
      sectionRating: v.optional(v.union(
        v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5)
      )),
      sectionWorked: v.optional(v.boolean()),
      sectionNotes: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Find the section
    // 3. Update section feedback fields
  },
});

/**
 * Soft delete a session plan
 */
export const deletePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Update status to "deleted"
    // 3. Record deletion timestamp
  },
});

/**
 * Restore a deleted session plan
 */
export const restore = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Update status back to "saved"
  },
});

/**
 * Update session plan title or notes
 */
export const updatePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
    title: v.optional(v.string()),
    coachNotes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Update specified fields
    // 3. Update updatedAt timestamp
  },
});

/**
 * Duplicate a session plan (for reuse)
 */
export const duplicate = mutation({
  args: {
    planId: v.id("sessionPlans"),
    newTeamId: v.optional(v.string()),
    newTeamName: v.optional(v.string()),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    // 1. Verify access to original
    // 2. Create copy with new ID
    // 3. Reset status to "saved", clear feedback
    // 4. Update title to indicate copy
  },
});
```

#### 3.2 Queries

```typescript
/**
 * Get session plans for current coach
 */
export const getMyPlans = query({
  args: {
    organizationId: v.string(),
    status: v.optional(v.string()),
    teamId: v.optional(v.string()),
    focusArea: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Return paginated plans for current coach
    // Exclude deleted plans by default
  },
});

/**
 * Get a single session plan by ID
 */
export const getPlan = query({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Verify access and return plan
  },
});

/**
 * Search session plans by content
 */
export const searchPlans = query({
  args: {
    organizationId: v.string(),
    searchTerm: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Use search index on content and title
    // Filter by org and coach access
  },
});

/**
 * Get session plan statistics for dashboard
 */
export const getStats = query({
  args: {
    organizationId: v.string(),
    coachId: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  returns: v.object({
    totalPlans: v.number(),
    usedPlans: v.number(),
    successfulPlans: v.number(),
    failedPlans: v.number(),
    avgRating: v.optional(v.number()),
    topFocusAreas: v.array(v.object({
      focusArea: v.string(),
      count: v.number(),
      successRate: v.number(),
    })),
    plansByMonth: v.array(v.object({
      month: v.string(),
      count: v.number(),
    })),
    feedbackRate: v.number(),
  }),
  handler: async (ctx, args) => {
    // Aggregate session plan data for insights
  },
});

/**
 * Get recently archived successful plans (for learning)
 */
export const getSuccessfulTemplates = query({
  args: {
    organizationId: v.string(),
    focusArea: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Return highly-rated archived_success plans
    // For inspiration and reuse
  },
});

/**
 * Get plans pending feedback
 */
export const getPendingFeedback = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Return plans where usedInSession = true
    // but feedbackSubmitted = false
  },
});

// ==========================================
// DRILL LIBRARY QUERIES (from aggregated feedback)
// ==========================================

/**
 * Get top-rated drills from the library
 */
export const getTopDrills = query({
  args: {
    organizationId: v.string(),
    activityType: v.optional(v.string()),
    skillFocus: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    name: v.string(),
    description: v.string(),
    avgRating: v.number(),
    successRate: v.number(),
    timesUsed: v.number(),
    effectiveAgeGroups: v.array(v.string()),
    commonModifications: v.array(v.string()),
  })),
  handler: async (ctx, args) => {
    // Return drills sorted by success rate and rating
    // Filtered by optional criteria
  },
});

/**
 * Search drills by name or skill focus
 */
export const searchDrills = query({
  args: {
    organizationId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Use search index on drill library
  },
});

/**
 * Get drill effectiveness breakdown by age group
 */
export const getDrillEffectiveness = query({
  args: {
    organizationId: v.string(),
    drillName: v.string(),
  },
  returns: v.object({
    drill: v.any(),
    byAgeGroup: v.array(v.object({
      ageGroup: v.string(),
      avgRating: v.number(),
      successRate: v.number(),
      sampleSize: v.number(),
    })),
    recentFeedback: v.array(v.object({
      date: v.number(),
      rating: v.number(),
      notes: v.optional(v.string()),
      modification: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    // Return detailed effectiveness data for a specific drill
  },
});

/**
 * Get activity-level insights for dashboard
 */
export const getActivityInsights = query({
  args: {
    organizationId: v.string(),
    coachId: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  returns: v.object({
    // Top performing activities
    topActivities: v.array(v.object({
      name: v.string(),
      avgRating: v.number(),
      timesUsed: v.number(),
    })),
    // Activities that consistently don't work
    underperformingActivities: v.array(v.object({
      name: v.string(),
      avgRating: v.number(),
      commonIssues: v.array(v.string()),
    })),
    // Most suggested modifications
    popularModifications: v.array(v.object({
      activityName: v.string(),
      modification: v.string(),
      frequency: v.number(),
    })),
    // Engagement patterns
    engagementByActivityType: v.array(v.object({
      activityType: v.string(),
      avgEngagement: v.string(),
      sampleSize: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Aggregate activity-level feedback for insights
  },
});
```

#### 3.3 Actions

```typescript
// packages/backend/convex/actions/sessionPlans.ts

/**
 * Generate session plan content using Claude AI
 */
export const generatePlanContent = action({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Fetch plan record with team context
    // 2. Build prompt with:
    //    - Team strengths/weaknesses
    //    - Focus area
    //    - Age group
    //    - Sport
    //    - Duration
    //    - Historical feedback from similar plans (if available)
    // 3. Call Claude API (Haiku for speed)
    // 4. Parse response and extract title
    // 5. Update plan via internal mutation
    // 6. Handle errors gracefully
  },
});

/**
 * Generate improved plan using feedback from similar archived plans
 */
export const generateImprovedPlan = action({
  args: {
    planId: v.id("sessionPlans"),
    previousPlanIds: v.array(v.id("sessionPlans")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Fetch feedback from previous similar plans
    // 2. Include "what worked" and "what didn't" in prompt
    // 3. Generate improved plan
    // 4. Store with reference to learning sources
  },
});

/**
 * Update drill library with feedback from archived session
 * Called after a session is archived with feedback
 */
export const updateDrillLibraryFromFeedback = internalAction({
  args: {
    sessionPlanId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get session plan with all activity feedback
    // 2. For each activity with feedback:
    //    a. Normalize the drill name
    //    b. Check if drill exists in library
    //    c. If exists, update aggregated metrics
    //    d. If new, create drill library entry
    // 3. Update effectiveness by age group based on ageGroupAppropriate flag
    // 4. Aggregate common modifications
    // 5. Update engagement averages
  },
});
```

### 3.4 AI Prompt Generation with Drill Feedback (THE LEARNING MECHANISM)

The key innovation is that AI learns from drill-level feedback to generate better plans.

```typescript
/**
 * Build AI prompt that incorporates drill feedback
 */
function buildIntelligentPrompt(
  teamData: TeamData,
  focusArea: string,
  drillLibrary: DrillLibraryEntry[],
  recentFeedback: ActivityFeedback[]
): string {
  // 1. Base prompt with team context
  let prompt = `You are an expert GAA football coach creating a training session plan.

Team: ${teamData.teamName} (${teamData.playerCount} players, ${teamData.ageGroup})
Focus Area: ${focusArea}

Team Strengths: ${teamData.strengths.map(s => s.skill).join(", ")}
Team Weaknesses: ${teamData.weaknesses.map(w => w.skill).join(", ")}
`;

  // 2. Add PROVEN DRILLS from the library (high-rated, age-appropriate)
  const provenDrills = drillLibrary
    .filter(d =>
      d.avgRating >= 4.0 &&
      d.effectiveAgeGroups.includes(teamData.ageGroup)
    )
    .slice(0, 5);

  if (provenDrills.length > 0) {
    prompt += `
## PROVEN DRILLS FOR THIS AGE GROUP (prefer these)
${provenDrills.map(d =>
  `- "${d.name}" (${d.avgRating}★, ${d.successRate}% success): ${d.description}`
).join("\n")}
`;
  }

  // 3. Add DRILLS TO AVOID (low-rated, not age-appropriate)
  const avoidDrills = drillLibrary
    .filter(d =>
      d.avgRating < 2.5 ||
      d.ineffectiveAgeGroups.includes(teamData.ageGroup)
    )
    .slice(0, 3);

  if (avoidDrills.length > 0) {
    prompt += `
## DRILLS TO AVOID (don't include these)
${avoidDrills.map(d =>
  `- "${d.name}" - Issues: ${d.commonIssues?.join(", ") || "Low engagement"}`
).join("\n")}
`;
  }

  // 4. Add SUGGESTED MODIFICATIONS from past feedback
  const modifications = drillLibrary
    .filter(d => d.commonModifications && d.commonModifications.length > 0)
    .flatMap(d => d.commonModifications.map(m => ({ drill: d.name, mod: m })))
    .slice(0, 5);

  if (modifications.length > 0) {
    prompt += `
## COACH-SUGGESTED MODIFICATIONS
${modifications.map(m => `- "${m.drill}": ${m.mod}`).join("\n")}
`;
  }

  // 5. Add recent insights from this coach's feedback
  const recentInsights = recentFeedback
    .filter(f => f.activityNotes)
    .slice(0, 3);

  if (recentInsights.length > 0) {
    prompt += `
## RECENT COACH INSIGHTS
${recentInsights.map(f =>
  `- ${f.activityWorked ? "✅" : "❌"} "${f.activityName}": ${f.activityNotes}`
).join("\n")}
`;
  }

  // 6. Final instructions
  prompt += `

Create a detailed ${teamData.duration || 90}-minute training session that:
1. Uses proven drills from the list above when possible
2. Avoids drills that have consistently failed
3. Applies suggested modifications where relevant
4. Structures the session with: Warm-up, Technical Skills, Tactical Work, Games, Cool-down

IMPORTANT: Return the plan in structured JSON format with sections and activities.
Each activity should have: name, description, duration, activityType, skillsFocused.
`;

  return prompt;
}
```

**Example of how feedback improves generation:**

Before feedback (generic):
```
Warm-up: Cone dribbling circuit
Technical: Individual ball control exercises
```

After feedback learning:
```
Warm-up: 3v1 Possession Game (rated 4.8★ by coaches, high engagement)
Technical: Partner Passing Under Pressure (rated 4.6★, great for U14)
// Note: Avoided "Cone Dribbling Circuit" - marked as boring by 6 coaches
```

### 4. Frontend Components

#### 4.1 Session Plans Library Page

**Route:** `/orgs/[orgId]/coach/session-plans`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Session Plans                                      [+ New Plan]       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search plans...                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Filters: [All Teams ▼] [All Status ▼] [All Focus Areas ▼] [Date ▼]     │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  📊 Quick Stats                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │    12      │  │     8      │  │    75%     │  │    4.2     │        │
│  │ Total Plans│  │   Used     │  │Success Rate│  │ Avg Rating │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  Recent Plans                                                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🎯 Ball Control Focus - U14 Boys                                  │   │
│  │    Team: Dublin Dragons  •  90 min  •  Jan 10, 2026               │   │
│  │    ✅ Archived as Successful  •  ⭐⭐⭐⭐⭐                        │   │
│  │    [View] [Duplicate] [...]                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ⚽ Tactical Movement Session - U16 Girls                          │   │
│  │    Team: Phoenix FC  •  90 min  •  Jan 8, 2026                    │   │
│  │    📝 Saved  •  Not yet used                                      │   │
│  │    [View] [Mark as Used] [Archive] [...]                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🏃 Fitness & Conditioning - U12 Mixed                             │   │
│  │    Team: Junior Stars  •  60 min  •  Jan 5, 2026                  │   │
│  │    ❌ Archived as Didn't Work  •  ⭐⭐                             │   │
│  │    Coach note: "Too intense for this age group"                   │   │
│  │    [View] [Duplicate] [...]                                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [Load More...]                                                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.2 Session Plan Detail/View Page

**Route:** `/orgs/[orgId]/coach/session-plans/[planId]`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to Plans                                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  # Ball Control Focus - U14 Boys                              [Edit ✏️]  │
│                                                                          │
│  Team: Dublin Dragons  •  Age Group: U14  •  Duration: 90 min            │
│  Focus: Ball Control  •  Created: Jan 10, 2026                           │
│  Status: ✅ Archived as Successful                                       │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ## Session Content                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  ## Warm-up (10 minutes)                                         │   │
│  │  - Dynamic stretching and light jogging                          │   │
│  │  - Ball familiarization exercises                                │   │
│  │  - Fun possession games (3v1, 4v2)                               │   │
│  │                                                                   │   │
│  │  ## Technical Skills (30 minutes)                                │   │
│  │  **Focus on Ball Control:**                                      │   │
│  │  - Demonstrate proper technique                                  │   │
│  │  - Individual practice (5 mins)                                  │   │
│  │  ...                                                             │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ## Generation Context                                                   │
│  Team Strengths: Passing (4.2), Movement (3.8)                          │
│  Team Weaknesses: Ball Control (2.3), Shooting (2.8)                    │
│  Players: 18                                                             │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ## Coach Feedback                                                       │
│  Rating: ⭐⭐⭐⭐⭐                                                       │
│  "Great progression from basic to pressure situations.                   │
│   Kids responded well to the partner drills."                            │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  [Duplicate Plan]  [Print/Export]  [Delete]                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.3 Generate New Plan Modal/Page

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🤖 Generate Session Plan                                    [✕]         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Team:          [Dublin Dragons (U14 Boys) ▼]                            │
│                                                                          │
│  Duration:      [90 minutes ▼]                                           │
│                                                                          │
│  Focus Area:    [Ball Control ▼]  (Based on team weaknesses)             │
│                 ○ Custom: [_______________________]                      │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  📊 Team Analysis                                                        │
│  Strengths: Passing (4.2), Movement (3.8)                               │
│  Weaknesses: Ball Control (2.3), Shooting (2.8)                         │
│  Players: 18                                                             │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  💡 Learn from past sessions?                                            │
│  ☑ Include insights from 3 successful similar sessions                   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    [Generate Session Plan]                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.4 Archive Feedback Page (Multi-Step with Granular Drill Feedback)

**Route:** `/orgs/[orgId]/coach/session-plans/[planId]/feedback`

This is a full page (not modal) because it captures comprehensive feedback at multiple levels.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Session Feedback: Ball Control Focus - U14 Boys           [Save Draft]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Progress: ████████░░░░░░░░░░░░░░░░░░░  Step 1 of 3                      │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│  STEP 1: Overall Session Feedback                                        │
│  ═══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  How did this session go overall?                                        │
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │        ✅ Worked            │  │      ❌ Didn't Work         │       │
│  │    "Session was effective"  │  │   "Needs improvement"       │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
│                                                                          │
│  Overall Rating:                                                         │
│  ○ ⭐     ○ ⭐⭐    ○ ⭐⭐⭐    ● ⭐⭐⭐⭐    ○ ⭐⭐⭐⭐⭐              │
│                                                                          │
│  What worked well overall?                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Great energy, kids stayed engaged throughout...                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  What would you change about the session?                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Needed more water breaks, some activities ran long...             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│                                         [Next: Rate Sections →]          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Step 2: Section-Level Feedback**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Session Feedback: Ball Control Focus - U14 Boys           [Save Draft]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Progress: ████████████████░░░░░░░░░░░  Step 2 of 3                      │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│  STEP 2: Section Feedback                                                │
│  ═══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  Rate each section of the session (click to expand for drill details):   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🏃 Warm-up (10 min)                               [▼ Expand]      │   │
│  │                                                                   │   │
│  │    Did this section work?   [✅ Yes]  [❌ No]                     │   │
│  │    Section Rating: ○⭐ ○⭐⭐ ●⭐⭐⭐⭐ ○⭐⭐⭐⭐⭐                  │   │
│  │    Notes: [Good energy, got everyone moving quickly__________]    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ⚽ Technical Skills (30 min)                      [▼ Expand]      │   │
│  │                                                                   │   │
│  │    Did this section work?   [✅ Yes]  [ No]                       │   │
│  │    Section Rating: ○⭐ ○⭐⭐ ○⭐⭐⭐ ○⭐⭐⭐⭐ ●⭐⭐⭐⭐⭐           │   │
│  │    Notes: [Best part of the session - kids really focused____]    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🎯 Tactical Work (25 min)                         [▼ Expand]      │   │
│  │                                                                   │   │
│  │    Did this section work?   [ Yes]  [❌ No]                       │   │
│  │    Section Rating: ○⭐ ●⭐⭐ ○⭐⭐⭐ ○⭐⭐⭐⭐ ○⭐⭐⭐⭐⭐           │   │
│  │    Notes: [Too complex for U14s, needed simpler progressions]     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🎮 Small-sided Games (20 min)                     [▼ Expand]      │   │
│  │    [Not rated yet - click to expand]                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🧘 Cool-down (5 min)                              [▼ Expand]      │   │
│  │    [Not rated yet - click to expand]                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [← Back]                                   [Next: Rate Drills →]        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Step 3: Drill/Activity-Level Feedback (THE KEY INNOVATION)**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Session Feedback: Ball Control Focus - U14 Boys           [Save Draft]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Progress: ████████████████████████░░░  Step 3 of 3                      │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│  STEP 3: Drill & Activity Feedback (Granular)                            │
│  ═══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  💡 Rate individual drills to help AI learn what works for your team!    │
│                                                                          │
│  Filter: [All Sections ▼]  Show: [⚪ All] [🟢 Worked] [🔴 Didn't Work]   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│  🏃 WARM-UP                                                              │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🟢 Dynamic Stretching & Light Jogging                             │   │
│  │    ┌─────────┐ ┌─────────┐                                       │   │
│  │    │✅ Worked│ │  Didn't │     Rating: ●⭐⭐⭐⭐ ○⭐⭐⭐⭐⭐       │   │
│  │    └─────────┘ └─────────┘                                       │   │
│  │                                                                   │   │
│  │    Would use again? [✅ Yes]  Age appropriate? [✅ Yes]           │   │
│  │    Engagement: [○ Low  ● Medium  ○ High]                         │   │
│  │                                                                   │   │
│  │    Notes: [Standard warm-up, did the job___________________]      │   │
│  │    Suggested modification: [________________________________]      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🟢 3v1 Possession Game                                            │   │
│  │    ┌─────────┐ ┌─────────┐                                       │   │
│  │    │✅ Worked│ │  Didn't │     Rating: ○⭐⭐⭐⭐ ●⭐⭐⭐⭐⭐       │   │
│  │    └─────────┘ └─────────┘                                       │   │
│  │                                                                   │   │
│  │    Would use again? [✅ Yes]  Age appropriate? [✅ Yes]           │   │
│  │    Engagement: [○ Low  ○ Medium  ● High]                         │   │
│  │                                                                   │   │
│  │    Notes: [Kids LOVED this! Great energy, competitive_______]     │   │
│  │    Suggested modification: [Make it 4v1 for weaker players__]     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│  ⚽ TECHNICAL SKILLS                                                     │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 Cone Dribbling Circuit                                         │   │
│  │    ┌─────────┐ ┌─────────┐                                       │   │
│  │    │  Worked │ │❌ Didn't│     Rating: ●⭐⭐ ○⭐⭐⭐ ○⭐⭐⭐⭐      │   │
│  │    └─────────┘ └─────────┘                                       │   │
│  │                                                                   │   │
│  │    Would use again? [❌ No]   Age appropriate? [✅ Yes]           │   │
│  │    Engagement: [● Low  ○ Medium  ○ High]                         │   │
│  │                                                                   │   │
│  │    Notes: [Too repetitive, kids got bored after 3 mins_____]      │   │
│  │    Suggested modification: [Add competition element - races]      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🟢 Partner Passing Under Pressure                                 │   │
│  │    ┌─────────┐ ┌─────────┐                                       │   │
│  │    │✅ Worked│ │  Didn't │     Rating: ○⭐⭐⭐⭐ ●⭐⭐⭐⭐⭐       │   │
│  │    └─────────┘ └─────────┘                                       │   │
│  │                                                                   │   │
│  │    Would use again? [✅ Yes]  Age appropriate? [✅ Yes]           │   │
│  │    Engagement: [○ Low  ○ Medium  ● High]                         │   │
│  │                                                                   │   │
│  │    Notes: [Excellent progression from basic to pressure_____]     │   │
│  │    Suggested modification: [________________________________]      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [... more drills ...]                                                   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  Summary: 8/12 drills rated  •  6 worked  •  2 didn't work               │
│                                                                          │
│  [← Back]                                   [Archive Session →]          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Quick Feedback Mode (Alternative for Busy Coaches)**

For coaches who don't have time for full granular feedback, offer a quick mode:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Quick Feedback Mode                                      [Full Mode] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Tap drills that WORKED (green) or DIDN'T WORK (red):                   │
│                                                                          │
│  🏃 Warm-up                                                              │
│  [🟢 Dynamic Stretching] [🟢 3v1 Possession] [⚪ Ball Familiarization]   │
│                                                                          │
│  ⚽ Technical Skills                                                     │
│  [🔴 Cone Dribbling] [🟢 Partner Passing] [🟢 Individual Practice]      │
│  [⚪ Pressure Situations] [🟢 Group Feedback]                           │
│                                                                          │
│  🎯 Tactical Work                                                        │
│  [🔴 Position Drills] [⚪ Game Scenarios] [🔴 Decision Making]          │
│                                                                          │
│  🎮 Small-sided Games                                                    │
│  [🟢 7v7 Game]                                                          │
│                                                                          │
│  🧘 Cool-down                                                            │
│  [⚪ Stretching] [🟢 Team Huddle]                                        │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  Overall: [✅ Worked] [  Didn't]    Rating: ●⭐⭐⭐⭐ ○⭐⭐⭐⭐⭐         │
│                                                                          │
│  [Archive Session →]                                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.5 Dashboard Insights Widget (Enhanced with Drill Insights)

Add to existing coach dashboard:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📊 Session Plan Insights                          [View All Plans →]    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  This Month                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │     5      │  │    80%     │  │    47      │  │     2      │        │
│  │Plans Created│  │Success Rate│  │Drills Rated│  │Awaiting    │        │
│  │            │  │            │  │            │  │ Feedback   │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│                                                                          │
│  ⭐ Top Performing Drills (Your Teams)                                   │
│  1. 3v1 Possession Game (4.8★, 95% success)                             │
│  2. Partner Passing Under Pressure (4.6★, 90% success)                  │
│  3. 7v7 Conditioned Game (4.5★, 88% success)                            │
│                                                                          │
│  ⚠️ Drills to Reconsider                                                │
│  1. Cone Dribbling Circuit (2.1★) - "Kids get bored"                    │
│  2. Position-specific Drills (2.4★) - "Too complex for U14"             │
│     💡 Suggested: Add competition element                                │
│                                                                          │
│  🎯 Top Focus Areas by Success                                           │
│  Ball Control (90%) • Passing (85%) • Tactical (70%)                    │
│                                                                          │
│  ⚠️ Needs Feedback: 2 recent sessions haven't been reviewed             │
│  [Provide Feedback →]                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.6 Drill Library Page (New - Aggregated from Feedback)

**Route:** `/orgs/[orgId]/coach/session-plans/drills`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📚 Drill Library                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Drills you've used and rated, sorted by effectiveness.                  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search drills...                                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Filters: [All Types ▼] [All Skills ▼] [All Age Groups ▼]               │
│                                                                          │
│  Sort: [⭐ Highest Rated] [📈 Most Used] [🎯 Best for Age Group]        │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ⭐ TOP RATED                                                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🏃 3v1 Possession Game                                            │   │
│  │    Type: Game  •  Skills: Ball Control, Passing, Movement         │   │
│  │                                                                   │   │
│  │    ⭐ 4.8 avg  •  Used 12 times  •  95% success rate              │   │
│  │                                                                   │   │
│  │    ✅ Works great for: U12, U14, U16                              │   │
│  │    💡 Common modification: "Make it 4v1 for beginners"            │   │
│  │    📊 Engagement: High                                            │   │
│  │                                                                   │   │
│  │    [View Details] [Add to New Plan]                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ⚽ Partner Passing Under Pressure                                 │   │
│  │    Type: Drill  •  Skills: Passing, First Touch, Decision Making  │   │
│  │                                                                   │   │
│  │    ⭐ 4.6 avg  •  Used 8 times  •  90% success rate               │   │
│  │                                                                   │   │
│  │    ✅ Works great for: U14, U16                                   │   │
│  │    ⚠️ Less effective for: U10 (too complex)                       │   │
│  │    📊 Engagement: High                                            │   │
│  │                                                                   │   │
│  │    [View Details] [Add to New Plan]                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ⚠️ NEEDS IMPROVEMENT (Consider Modifications)                          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 Cone Dribbling Circuit                                         │   │
│  │    Type: Drill  •  Skills: Ball Control, Dribbling                │   │
│  │                                                                   │   │
│  │    ⭐ 2.1 avg  •  Used 6 times  •  33% success rate               │   │
│  │                                                                   │   │
│  │    ❌ Issues: "Kids get bored", "Too repetitive"                  │   │
│  │    💡 Try: "Add races", "Make it competitive", "Time trials"      │   │
│  │    📊 Engagement: Low                                             │   │
│  │                                                                   │   │
│  │    [View Details] [View Modifications]                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.7 Session Plan Detail View (Updated with Drill Feedback Display)

When viewing an archived plan, show the drill-level feedback inline:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to Plans                                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  # Ball Control Focus - U14 Boys                                         │
│                                                                          │
│  Team: Dublin Dragons  •  Age Group: U14  •  Duration: 90 min            │
│  Status: ✅ Archived as Successful  •  Overall: ⭐⭐⭐⭐ (4/5)            │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  ## 🏃 Warm-up (10 min)                          Section: ⭐⭐⭐⭐ ✅     │
│                                                                          │
│  ┌─ 🟢 Dynamic Stretching ─────────────────────────────────────────────┐ │
│  │  - Dynamic stretching and light jogging                             │ │
│  │  ⭐⭐⭐⭐ • ✅ Worked • Engagement: Medium                           │ │
│  │  📝 "Standard warm-up, did the job"                                 │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─ 🟢 3v1 Possession Game ────────────────────────────────────────────┐ │
│  │  - Fun possession games (3v1, 4v2)                                  │ │
│  │  ⭐⭐⭐⭐⭐ • ✅ Worked • Engagement: High                           │ │
│  │  📝 "Kids LOVED this! Great energy, competitive"                    │ │
│  │  💡 Modification: "Make it 4v1 for weaker players"                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ## ⚽ Technical Skills (30 min)                  Section: ⭐⭐⭐⭐⭐ ✅   │
│                                                                          │
│  ┌─ 🔴 Cone Dribbling Circuit ─────────────────────────────────────────┐ │
│  │  - Individual dribbling through cone circuit                        │ │
│  │  ⭐⭐ • ❌ Didn't Work • Engagement: Low                            │ │
│  │  📝 "Too repetitive, kids got bored after 3 mins"                   │ │
│  │  💡 Modification: "Add competition element - races"                 │ │
│  │  ⚠️ Would NOT use again                                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─ 🟢 Partner Passing Under Pressure ─────────────────────────────────┐ │
│  │  - Partner drills with defender pressure                            │ │
│  │  ⭐⭐⭐⭐⭐ • ✅ Worked • Engagement: High                           │ │
│  │  📝 "Excellent progression from basic to pressure"                  │ │
│  │  ✅ Would use again • ✅ Age appropriate                            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [... more sections and drills ...]                                      │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  ## Overall Session Feedback                                             │
│  What worked well: "Great energy, kids stayed engaged throughout"        │
│  What to improve: "Needed more water breaks, some activities ran long"   │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  [Duplicate Plan]  [Edit Feedback]  [Print/Export]  [Delete]             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5. Integration Points

#### 5.1 Update SmartCoachDashboard

Modify the existing session plan generation to save to database:

```typescript
// In smart-coach-dashboard.tsx

const handleGenerateSessionPlan = async () => {
  setLoadingSessionPlan(true);

  try {
    const team = teamAnalytics.find((t) => t.playerCount > 0);
    if (!team) {
      toast.error("No teams with players found");
      return;
    }

    // Create plan record and trigger generation
    const planId = await generateAndSave({
      organizationId: orgId,
      teamId: team.teamId,
      teamName: team.teamName,
      ageGroup: team.ageGroup,
      sport: team.sport,
      playerCount: team.playerCount,
      focusArea: team.weaknesses[0]?.skill,
      duration: 90,
      teamStrengths: team.strengths,
      teamWeaknesses: team.weaknesses,
    });

    // Navigate to view the plan (or show inline)
    router.push(`/orgs/${orgId}/coach/session-plans/${planId}`);

  } catch (error) {
    console.error("Error generating session plan:", error);
    toast.error("Failed to generate session plan");
  } finally {
    setLoadingSessionPlan(false);
  }
};
```

#### 5.2 Update Quick Actions

```typescript
// In layout.tsx

{
  id: "session-plan",
  icon: Target,
  label: "Generate Session Plan",
  title: "AI-powered training session",
  onClick: () => router.push(`/orgs/${orgId}/coach/session-plans/new` as Route),
  color: "bg-purple-600 hover:bg-purple-700",
},
```

#### 5.3 Navigation Integration

Add to CoachSidebar:
```typescript
{
  title: "Session Plans",
  href: `/orgs/${orgId}/coach/session-plans`,
  icon: ClipboardList,
}
```

---

## Implementation Phases

### Phase 1: Core Storage & Structured Generation (Week 1)

**Backend:**
- [ ] Add `sessionPlans` table to schema with nested sections/activities structure
- [ ] Add `drillLibrary` table for aggregated drill feedback
- [ ] Implement `generateAndSave` mutation
- [ ] Implement `updateContent` internal mutation
- [ ] Update AI generation to return STRUCTURED JSON (sections + activities)
- [ ] Implement `getPlan` and `getMyPlans` queries

**Frontend:**
- [ ] Create `/coach/session-plans` route
- [ ] Basic session plans list view
- [ ] Session plan detail view WITH structured sections display
- [ ] Update SmartCoachDashboard to save plans
- [ ] Update Quick Actions routing

### Phase 2: Granular Feedback System (Week 2) - THE KEY PHASE

**Backend:**
- [ ] Implement `archive` mutation with section & activity feedback
- [ ] Implement `updateActivityFeedback` mutation (real-time drill rating)
- [ ] Implement `updateSectionFeedback` mutation
- [ ] Implement `markAsUsed` mutation
- [ ] Implement `deletePlan` mutation
- [ ] Implement `updateDrillLibraryFromFeedback` action

**Frontend:**
- [ ] Multi-step archive feedback page (3 steps: overall → sections → drills)
- [ ] Activity-level feedback cards with:
  - Worked/Didn't Work toggle
  - 1-5 star rating
  - Notes field
  - "Would use again?" toggle
  - "Age appropriate?" toggle
  - Engagement level selector
  - Suggested modification field
- [ ] Quick feedback mode (tap drills as worked/didn't)
- [ ] Section-level feedback UI
- [ ] Save draft functionality (resume feedback later)

### Phase 3: Drill Library & Search (Week 3)

**Backend:**
- [ ] Implement drill aggregation logic (normalize names, merge feedback)
- [ ] Implement `getTopDrills` query
- [ ] Implement `searchDrills` query
- [ ] Implement `getDrillEffectiveness` query
- [ ] Implement session plan search indexes
- [ ] Implement `searchPlans` query

**Frontend:**
- [ ] Drill Library page (`/coach/session-plans/drills`)
- [ ] Drill cards showing ratings, success rate, age effectiveness
- [ ] Drill detail modal with feedback history
- [ ] Search bar with filters (by type, skill, age group)
- [ ] Session plan search and filtering
- [ ] "Add to New Plan" drill action

### Phase 4: AI Learning & Insights (Week 4)

**Backend:**
- [ ] Implement `buildIntelligentPrompt` with drill feedback integration
- [ ] Implement `getActivityInsights` query
- [ ] Implement `getStats` query with drill-level metrics
- [ ] Implement `getPendingFeedback` query
- [ ] Implement `duplicate` mutation

**Frontend:**
- [ ] Dashboard insights widget with drill insights
- [ ] "Top Performing Drills" section
- [ ] "Drills to Reconsider" section with modification suggestions
- [ ] Pending feedback notifications
- [ ] "Learn from past sessions" checkbox in generation
- [ ] Show proven/avoid drills during generation preview

### Phase 5: Polish & Advanced Features (Week 5)

**Backend:**
- [ ] Organization-wide plan sharing (optional)
- [ ] Export functionality (include drill feedback)
- [ ] Retention policies
- [ ] Drill library sharing across coaches (opt-in)

**Frontend:**
- [ ] Print/export session plans with feedback summary
- [ ] Organization admin view of all plans
- [ ] Drill effectiveness reports
- [ ] Mobile-optimized feedback UI
- [ ] Empty states and onboarding
- [ ] Quick feedback reminder notifications

---

## Testing Strategy

### Unit Tests

- Session plan creation validation
- Status transition logic
- Access control verification
- Search query functionality

### Integration Tests

- Full generate → save → view flow
- Archive with feedback flow
- Duplicate plan flow
- Search and filter accuracy

### E2E Tests

```
Scenario 1: Generate and Save Plan
1. Log in as coach
2. Navigate to Session Plans
3. Click "Generate New Plan"
4. Select team and focus area
5. Generate plan
6. Verify plan saved and visible in list

Scenario 2: Use and Archive Plan
1. View a saved session plan
2. Click "Mark as Used"
3. After training, click "Archive"
4. Select "Worked" and provide rating
5. Add feedback notes
6. Verify plan archived with feedback

Scenario 3: Search and Reuse
1. Navigate to Session Plans
2. Search for "ball control"
3. Find archived successful plan
4. Click "Duplicate"
5. Verify new plan created from template
```

---

## Security & Access Control

### Access Rules

| Action | Coach (Own Plans) | Coach (Other's Plans) | Admin | Platform Staff |
|--------|-------------------|----------------------|-------|----------------|
| Create plan | ✓ | ✗ | ✓ | ✓ |
| View plan | ✓ | ✗ (org share optional) | ✓ | ✓ |
| Edit plan | ✓ | ✗ | ✓ | ✓ |
| Archive plan | ✓ | ✗ | ✓ | ✓ |
| Delete plan | ✓ | ✗ | ✓ | ✓ |
| View org stats | ✗ | ✗ | ✓ | ✓ |

### Data Protection

- Session plans scoped to organization
- Coach can only access own plans (unless org sharing enabled)
- Soft delete preserves data for audit
- AI prompt/response not exposed to users

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI generation failures | Medium | Low | Fallback to simulated plans, retry logic |
| Large content storage | Low | Medium | Pagination, archival policies |
| Low feedback rate | Medium | Medium | Reminders, gamification, easy UI |
| Search performance | Medium | Low | Proper indexing, pagination |
| Coaches not using library | High | Medium | Dashboard integration, quick actions |

---

## Success Criteria

1. **Functional:** All generated plans are stored and retrievable
2. **Adoption:** 70% of generated plans are saved (not just viewed)
3. **Feedback:** 40% of used plans receive outcome feedback
4. **Search:** Coaches can find past plans in <30 seconds
5. **Improvement:** AI plans improve based on feedback (measured by ratings)
6. **Performance:** Plan generation <5s, list load <2s

---

## Future Enhancements (v2+)

- **Plan Templates Library** - Pre-built templates for common scenarios
- **Collaborative Planning** - Share plans between coaches
- **Calendar Integration** - Schedule plans on training calendar
- **Player-Specific Modifications** - Customize drills for individual players
- **Video Integration** - Link drill videos to plan activities
- **Multi-Sport Templates** - Sport-specific plan structures
- **Print-Friendly Export** - PDF generation with drill diagrams
- **AI Drill Suggestions** - Real-time drill recommendations during planning
- **Session Execution Tracking** - Record what was actually done vs. planned
- **Parent Visibility** - Share session summaries with parents (optional)

---

## Appendix

### A. Related Documentation

- [Voice Notes Architecture](./voice-notes.md) - Reference pattern for coach features
- [Quick Actions System](./quick-actions-system.md) - Quick action integration
- [Coach Dashboard](../architecture/coach-dashboard.md) - Dashboard integration points
- [AI API Setup](../setup/ai-api.md) - Claude API configuration

### B. Open Questions

1. Should plans be shareable across coaches in the same org? (Recommend: v2)
2. Should there be a "template library" separate from archived plans? (Recommend: v2)
3. Should plans integrate with a training calendar? (Recommend: v2)
4. Should there be automatic reminders for feedback? (Recommend: Yes, in v1)
5. Should deleted plans be permanently deleted or retained? (Recommend: Soft delete, admin can purge)

### C. Glossary

| Term | Definition |
|------|------------|
| Session Plan | AI-generated training session structure |
| Archived (Success) | Plan was used and marked as effective |
| Archived (Failed) | Plan was used but marked as ineffective |
| Draft | Plan generated but not yet saved |
| Saved | Plan stored and available for use |
| Focus Area | Primary skill or topic the session addresses |

---

---

## ADDENDUM: Simplified A/B Testable Feedback System

> **Note:** This section describes the simplified feedback approach based on user research indicating that the granular 3-step wizard (described in Section 4.4) may create too much friction. This A/B testable approach allows validation before full implementation.

### Design Principles

1. **Thumbs up/down over 1-5 stars** - Simpler, faster, like frontier model feedback
2. **Feedback at "return visit"** - Not immediately after generation (too early), not as separate task (homework)
3. **Non-blocking** - Can skip, always editable later
4. **A/B testable** - Test one-click vs two-click with drill highlights

### Simplified Data Model

```typescript
interface SimplifiedSessionPlanFeedback {
  // Session-level (simple)
  sessionFeedback: "positive" | "negative" | null;
  sessionFeedbackAt?: number;

  // Drill-level (sparse - only drills with feedback)
  drillFeedback: DrillFeedback[];

  // A/B test tracking
  feedbackVariant: "one_click" | "two_click_highlights";
  feedbackCompletionTime?: number; // Time spent on feedback (for A/B analysis)
}

interface DrillFeedback {
  drillId: string;           // Activity ID from session structure
  drillName: string;         // For aggregation matching
  feedback: "positive" | "negative";
  negativeReason?: "boring" | "too_complex" | "too_simple" | "too_long" | "wrong_age" | "other";
  note?: string;             // Optional free text
  feedbackAt: number;
}
```

### Feedback Touchpoint: Return Visit Pattern

**When:** Coach opens "Generate New Plan" page and has a recently used session without feedback.

**UI:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🤖 Generate Session Plan                                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  💬 Quick feedback on your last session?                            │ │
│  │                                                                      │ │
│  │  "Ball Control Focus - U14 Boys" (Jan 10)                           │ │
│  │                                                                      │ │
│  │       [👍 Worked]    [👎 Didn't Work]    [Skip]                     │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ───────────────────────────────────────────────────────────────────     │
│                                                                          │
│  Team:          [Dublin Dragons (U14 Boys) ▼]                            │
│  Focus Area:    [Ball Control ▼]                                         │
│  ...                                                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### A/B Test Variants

#### Variant A: One-Click (Minimal Friction)

1. Coach clicks 👍 or 👎
2. **Done** - Feedback saved immediately
3. If 👎, show "Why?" popover:

```
┌─────────────────────────────────┐
│  What didn't work?              │
│                                 │
│  ○ Kids were bored              │
│  ○ Too complex                  │
│  ○ Too simple                   │
│  ○ Drills too long              │
│  ○ Wrong for age group          │
│  ○ Other                        │
│                                 │
│  [Done]                         │
└─────────────────────────────────┘
```

#### Variant B: Two-Click with Drill Highlights

1. Coach clicks 👍 or 👎 (session-level)
2. Brief expand showing drills:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Any standout drills?                                                    │
│                                                                          │
│  Tap drills that were especially 👍 good or 👎 bad:                      │
│                                                                          │
│  [🏃 Dynamic Stretching] [⚽ 3v1 Possession] [🎯 Partner Passing]        │
│  [🔴 Cone Dribbling] [🎮 7v7 Game] [🧘 Team Huddle]                      │
│                                                                          │
│  ⚪ = not rated, 🟢 = good, 🔴 = didn't work                             │
│                                                                          │
│  [Done - Save Feedback]                                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Inline Feedback (Always Available)

On the Session Plan detail view, subtle inline 👍/👎 buttons:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  # Ball Control Focus - U14 Boys                                         │
│  ...                                                                     │
│                                                                          │
│  ## 🏃 Warm-up (10 min)                                                  │
│                                                                          │
│  - Dynamic Stretching           [👍] [👎]  ← subtle, inline              │
│  - 3v1 Possession Game          [👍] [👎]                                │
│  - Ball Familiarization         [👍] [👎]                                │
│                                                                          │
│  ## ⚽ Technical Skills (30 min)                                         │
│                                                                          │
│  - Cone Dribbling Circuit       [👎 ✓]     ← already rated negative      │
│    └─ "Kids got bored" [edit]                                            │
│  - Partner Passing              [👍 ✓]     ← already rated positive      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Aggregation View

When viewing a drill's 👍/👎, show aggregated feedback:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚽ 3v1 Possession Game                                      [Close]     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Your rating: 👍 Worked                                                  │
│                                                                          │
│  ───────────────────────────────────────────────────────────────────     │
│                                                                          │
│  📊 What other coaches say:                                              │
│                                                                          │
│  👍 12 coaches   |  👎 2 coaches                                         │
│  ████████████░░  |  ░░                                                   │
│      86%         |    14%                                                │
│                                                                          │
│  💬 Recent notes:                                                        │
│  • "Kids LOVED this" - Coach Sarah                                       │
│  • "Great for U14, too hard for U10" - Coach Mike                        │
│                                                                          │
│  💡 Suggested modifications:                                             │
│  • "Make it 4v1 for beginners" (3 coaches)                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### A/B Test Success Metrics

| Metric | Variant A (One-Click) | Variant B (Two-Click) |
|--------|----------------------|----------------------|
| Feedback completion rate | Target: 60% | Target: 45% |
| Drill-level feedback rate | N/A (session only) | Target: 30% |
| Time to complete feedback | Target: <5 sec | Target: <15 sec |
| User satisfaction score | Survey after 2 weeks | Survey after 2 weeks |

### Schema Additions for A/B Testing

```typescript
// Add to sessionPlans table
simplifiedFeedback: v.optional(v.object({
  sessionFeedback: v.optional(v.union(v.literal("positive"), v.literal("negative"))),
  sessionFeedbackAt: v.optional(v.number()),
  negativeReason: v.optional(v.union(
    v.literal("boring"),
    v.literal("too_complex"),
    v.literal("too_simple"),
    v.literal("too_long"),
    v.literal("wrong_age"),
    v.literal("other")
  )),
  drillFeedback: v.optional(v.array(v.object({
    drillId: v.string(),
    drillName: v.string(),
    feedback: v.union(v.literal("positive"), v.literal("negative")),
    negativeReason: v.optional(v.string()),
    note: v.optional(v.string()),
    feedbackAt: v.number(),
  }))),
  feedbackVariant: v.optional(v.union(v.literal("one_click"), v.literal("two_click_highlights"))),
  feedbackCompletionTime: v.optional(v.number()),
})),
```

### Simplified Backend Functions

```typescript
// Simplified mutations for quick feedback
export const submitQuickFeedback = mutation({
  args: {
    planId: v.id("sessionPlans"),
    sessionFeedback: v.union(v.literal("positive"), v.literal("negative")),
    negativeReason: v.optional(v.string()),
    variant: v.union(v.literal("one_click"), v.literal("two_click_highlights")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Update simplifiedFeedback.sessionFeedback
    // 3. Track variant for A/B analysis
    // 4. Update drill library aggregates
  },
});

export const submitDrillFeedback = mutation({
  args: {
    planId: v.id("sessionPlans"),
    drillId: v.string(),
    drillName: v.string(),
    feedback: v.union(v.literal("positive"), v.literal("negative")),
    negativeReason: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify ownership
    // 2. Append to simplifiedFeedback.drillFeedback array
    // 3. Update drill library entry
  },
});

export const getPendingFeedbackSession = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(v.object({
    planId: v.id("sessionPlans"),
    title: v.string(),
    teamName: v.string(),
    usedDate: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    // Return most recent used session without feedback
    // Only sessions used in last 7 days
  },
});
```

### Implementation Note

The simplified A/B feedback system should be implemented **alongside** the detailed feedback system (Section 4.4), not as a replacement. Coaches can:
1. Use quick 👍/👎 feedback (simplified)
2. Optionally dive deeper into the detailed feedback page if they want granular drill-level notes

This allows data collection on which approach coaches prefer while still offering the full functionality.

---

**Document Status:** Draft - Ready for Review
**Next Steps:** Product/Engineering alignment, sprint planning
**Reviewer:** [Pending]
