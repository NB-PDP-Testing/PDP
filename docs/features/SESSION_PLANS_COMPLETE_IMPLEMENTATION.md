# Session Plans Feature - Complete Implementation Guide

**Purpose**: This document provides complete implementation details for re-implementing the Session Plans feature on a clean branch. It covers navigation, all pages, components, backend models, schema, and sharing/moderation functionality.

**Scope**: Session Plans navigation, pages, components, and backend ONLY. Does not include Quick Actions or FAB components.

---

## 1. NAVIGATION STRUCTURE

### Coach Sidebar Addition

**File**: `apps/web/src/components/layout/coach-sidebar.tsx`

**Location**: Under the "Development" navigation group

```typescript
{
  label: "Development",
  icon: TrendingUp,
  items: [
    {
      href: `/orgs/${orgId}/coach/goals`,
      label: "Goals",
      icon: TrendingUp,
    },
    {
      href: `/orgs/${orgId}/coach/voice-notes`,
      label: "Voice Notes",
      icon: Mic,
    },
    {
      href: `/orgs/${orgId}/coach/session-plans`,  // ADD THIS
      label: "Session Plans",
      icon: ClipboardList,
    },
  ],
}
```

**Import Required**:
```typescript
import { ClipboardList } from "lucide-react";
```

---

## 2. ROUTE STRUCTURE

### Coach Routes
```
/orgs/[orgId]/coach/session-plans
├── /                                    # Main list page (My Plans / Club Library tabs)
├── /new                                 # Generate new session plan page
├── /[planId]                           # Session plan detail/view page
└── /drills                             # Drill library page
```

### Admin Routes
```
/orgs/[orgId]/admin/session-plans
├── /                                    # Admin moderation list
└── /[planId]                           # Admin plan detail/moderation page
```

---

## 3. PAGES & COMPONENTS INVENTORY

### 3.1 Coach Pages

#### `/coach/session-plans/page.tsx`
**Purpose**: Route wrapper for main session plans list
**Content**: Simple wrapper that renders `<SessionPlansList />`

```typescript
import { SessionPlansList } from "./session-plans-list";

export default function SessionPlansPage() {
  return <SessionPlansList />;
}
```

---

#### `/coach/session-plans/session-plans-list.tsx`
**Purpose**: Main session plans interface with tabs
**Key Features**:
- Three tabs: "My Plans", "Club Library", "Admin" (admin-only)
- Filtering sidebar
- Template cards display
- Integration with backend queries

**State Management**:
```typescript
const [activeTab, setActiveTab] = useState<"my-plans" | "club-library" | "admin">("my-plans");
const [filters, setFilters] = useState<FilterState>({
  search: "",
  ageGroups: [],
  sports: [],
  focusAreas: [],
});
```

**Key Queries**:
- `api.models.sessionPlans.listForCoach` - Get coach's private plans
- `api.models.sessionPlans.listClubLibrary` - Get org-shared plans
- `api.models.sessionPlans.listForAdmin` - Get all plans for moderation (admin only)

**Permissions Check**:
```typescript
const { data: session } = authClient.useSession();
const isPlatformStaff = (session?.user as any)?.isPlatformStaff;
const isOrgAdmin = (session?.user as any)?.activeOrganization?.role === "admin" ||
                   (session?.user as any)?.activeOrganization?.role === "owner";
const isAdmin = isPlatformStaff || isOrgAdmin;
```

---

#### `/coach/session-plans/new/page.tsx`
**Purpose**: Route wrapper for session plan generation
**Content**: Renders `<GenerateSessionPlan />`

---

#### `/coach/session-plans/new/generate-session-plan.tsx`
**Purpose**: Form to generate a new AI-powered session plan
**Key Features**:
- Team selection dropdown
- Focus area input
- Duration selection
- Player count auto-populated from team
- Calls `api.models.sessionPlans.generateAndSave` mutation
- Redirects to plan detail page after generation

**Form Fields**:
```typescript
{
  teamId: string | undefined,
  teamName: string,
  focusArea: string,
  duration: number, // 60, 90, or 120 minutes
  playerCount: number
}
```

---

#### `/coach/session-plans/[planId]/page.tsx`
**Purpose**: Route wrapper for session plan detail
**Content**: Renders `<SessionPlanDetail />`

---

#### `/coach/session-plans/[planId]/session-plan-detail.tsx`
**Purpose**: View and interact with a specific session plan
**Key Features**:
- Display plan title, content, sections, drills
- Actions: Share, Duplicate, Archive, Delete
- Mark as used
- Download as PDF
- Share to club library (changes visibility)

**Mutations Used**:
- `api.models.sessionPlans.duplicatePlan`
- `api.models.sessionPlans.updateVisibility` (for sharing)
- `api.models.sessionPlans.markAsUsed`
- `api.models.sessionPlans.archivePlan`
- `api.models.sessionPlans.deletePlan`

---

#### `/coach/session-plans/drills/page.tsx`
**Purpose**: Route wrapper for drill library
**Content**: Renders `<DrillLibrary />`

---

#### `/coach/session-plans/drills/drill-library.tsx`
**Purpose**: Browse and filter drill library
**Key Features**:
- Grid display of drills
- Filter by activity type, skills, equipment
- Color coding by activity type
- Query: `api.models.sessionPlans.getDrillLibrary`

---

### 3.2 Admin Pages

#### `/admin/session-plans/page.tsx`
**Purpose**: Admin interface for moderating shared session plans
**Key Features**:
- List all club-shared plans
- Remove plans from library
- Pin/unpin featured plans
- View plan details

**Mutations**:
- `api.models.sessionPlans.removeFromClubLibrary`
- `api.models.sessionPlans.pinPlan` / `unpinPlan`

---

#### `/admin/session-plans/[planId]/page.tsx`
**Purpose**: Admin view of specific session plan with moderation actions
**Similar to coach detail page but with admin-specific actions**

---

### 3.3 Shared Components

#### `filter-sidebar.tsx`
**Purpose**: Reusable filtering component for session plans
**Exports**:
```typescript
export type FilterState = {
  search: string;
  ageGroups: string[];
  sports: string[];
  focusAreas: string[];
};

export function FilterSidebar({
  filters,
  onFilterChange,
  availableAgeGroups,
  availableSports,
  availableFocusAreas,
}: FilterSidebarProps)
```

---

#### `template-card.tsx`
**Purpose**: Display session plan as a card
**Key Elements**:
- Plan title, sport, age group
- Duration, focus area
- Metadata (created date, times used, favorited)
- Click to view details
- Hover actions (duplicate, share, favorite)

---

#### `share-plan-dialog.tsx`
**Purpose**: Dialog for sharing a plan to club library
**Features**:
- Confirmation UI
- Calls `api.models.sessionPlans.updateVisibility` with "club"
- Shows attribution (coach name shared the plan)

---

#### `moderation-dialog.tsx`
**Purpose**: Admin dialog for removing plans from library
**Features**:
- Reason for removal input
- Calls `api.models.sessionPlans.removeFromClubLibrary`
- Records moderation action

---

#### `admin-library.tsx`
**Purpose**: Component for rendering admin's moderation view
**Shows**: All club-shared plans with moderation actions

---

#### `/components/coach/team-selection-modal.tsx`
**Purpose**: Modal for selecting which team to generate plan for
**Used by**: Generate session plan page
**Features**: Lists coach's assigned teams

---

#### `/components/coach/multi-team-session-plan-modal.tsx`
**Purpose**: Modal for viewing session plan (legacy/alternative view)
**Note**: May be replaced by detail page in current implementation

---

## 4. BACKEND ARCHITECTURE

### File: `packages/backend/convex/models/sessionPlans.ts`

This file contains ALL backend logic for session plans. It's approximately 2,190 lines and includes:

### 4.1 Helper Functions

```typescript
async function getCoachForOrg(ctx: any, userId: string, orgId: string)
// Verifies user has coach role in organization

function normalizeDrillName(name: string): string
// Normalizes drill names for consistent matching
```

### 4.2 Key Mutations

#### `generateAndSave`
```typescript
Args: {
  organizationId: string,
  teamId?: string,
  teamName: string,
  ageGroup?: string,
  playerCount: number,
  focusArea?: string,
  duration?: number
}
Returns: Id<"sessionPlans">
```
- Creates draft plan
- Schedules AI generation via `internal.actions.sessionPlans.generatePlanContent`
- Initializes metrics tracking
- Records creation event

#### `updatePlanContent` (Internal)
```typescript
Args: {
  planId: Id<"sessionPlans">,
  title: string,
  rawContent: string,
  status: "saved" | "draft"
}
```
- Called by AI action to populate generated content

#### `updateVisibility`
```typescript
Args: {
  planId: Id<"sessionPlans">,
  visibility: "private" | "club" | "platform"
}
```
- Changes plan visibility (sharing to club library)
- Records sharing event and metrics

#### `duplicatePlan`
```typescript
Args: { planId: Id<"sessionPlans"> }
Returns: Id<"sessionPlans">
```
- Creates copy of existing plan
- Updates duplication metrics

#### `markAsUsed`
```typescript
Args: { planId: Id<"sessionPlans"> }
```
- Marks plan as used in actual session
- Records usage date

#### `archivePlan`
```typescript
Args: {
  planId: Id<"sessionPlans">,
  success: boolean
}
```
- Archives plan with success/failed status

#### `deletePlan`
```typescript
Args: { planId: Id<"sessionPlans"> }
```
- Soft delete (sets status to "deleted")

#### `removeFromClubLibrary` (Admin)
```typescript
Args: {
  planId: Id<"sessionPlans">,
  moderatorId: string,
  moderatorName: string,
  reason?: string
}
```
- Admin removes plan from club library
- Records moderation event

#### `pinPlan` / `unpinPlan` (Admin)
```typescript
Args: { planId: Id<"sessionPlans"> }
```
- Admin pins/unpins featured plans

#### `submitFeedback`
```typescript
Args: {
  planId: Id<"sessionPlans">,
  sessionFeedback: "positive" | "negative",
  drillFeedback?: Array<{
    drillId: string,
    drillName: string,
    feedback: "positive" | "negative",
    negativeReason?: string
  }>
}
```
- Records coach feedback on plan quality
- Updates drill library effectiveness metrics

### 4.3 Key Queries

#### `listForCoach`
```typescript
Args: {
  organizationId: string,
  coachId: string
}
Returns: Array<SessionPlan>
```
- Returns coach's private plans (visibility: "private")
- Ordered by creation date descending

#### `listClubLibrary`
```typescript
Args: {
  organizationId: string
}
Returns: Array<SessionPlan>
```
- Returns plans shared to club (visibility: "club")
- Includes plan creator attribution

#### `listForAdmin`
```typescript
Args: {
  organizationId: string
}
Returns: Array<SessionPlan>
```
- Returns ALL plans in organization for admin moderation
- Includes private, club, and deleted plans

#### `getPlanById`
```typescript
Args: {
  planId: Id<"sessionPlans">
}
Returns: SessionPlan | null
```
- Get specific plan details
- Includes sections, drills, metadata

#### `getDrillLibrary`
```typescript
Args: {
  organizationId: string
}
Returns: Array<DrillLibraryEntry>
```
- Returns aggregated drill effectiveness data
- Based on feedback from used plans

#### `getStats`
```typescript
Args: {
  organizationId: string
}
Returns: {
  totalPlans: number,
  usedPlans: number,
  successfulPlans: number,
  failedPlans: number
}
```
- Organization-wide statistics
- Displayed on coach dashboard

---

### File: `packages/backend/convex/actions/sessionPlans.ts`

#### `generatePlanContent` (Internal Action)
```typescript
Args: { planId: Id<"sessionPlans"> }
```
- Fetches plan context (team, focus, duration)
- Calls AI service to generate session plan
- Parses AI response into structured sections/drills
- Calls `updatePlanContent` mutation to save
- Handles errors and sets failure status if needed

**AI Integration**: Uses OpenAI API or similar to generate training plans based on:
- Team age group
- Player count
- Focus area
- Duration
- Sport type

---

### File: `packages/backend/convex/lib/sessionPlanTracking.ts`

Analytics and metrics tracking helper functions:

#### `initializePlanMetrics`
```typescript
Args: {
  sessionPlanId: Id<"sessionPlans">,
  creatorId: string,
  creatorName: string,
  organizationId: string,
  organizationName: string,
  initialVisibility: "private" | "club"
}
```
- Creates initial metrics record

#### `recordPlanEvent`
```typescript
Args: {
  sessionPlanId: Id<"sessionPlans">,
  eventType: "created" | "viewed" | "shared" | "duplicated" | "used" | "archived" | "deleted",
  actorId: string,
  actorName: string,
  actorRole: string,
  organizationId: string,
  organizationName: string
}
```
- Records all plan lifecycle events

#### `updateViewMetrics`, `updateSharingMetrics`, `updateDuplicationMetrics`, `updateFeedbackMetrics`
- Update specific metric counters

---

## 5. DATABASE SCHEMA

### File: `packages/backend/convex/schema.ts`

### 5.1 sessionPlans Table

```typescript
sessionPlans: defineTable({
  // Identity
  organizationId: v.string(),
  coachId: v.string(),
  coachName: v.string(),
  teamId: v.optional(v.string()),
  teamName: v.string(),
  playerCount: v.number(),

  // Content
  title: v.string(),
  rawContent: v.string(), // Full markdown/text content from AI
  focusArea: v.optional(v.string()),
  duration: v.number(), // minutes

  // Sections with activities structure
  sections: v.array(
    v.object({
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
      activities: v.array(
        v.object({
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
        })
      ),
    })
  ),

  // Context
  sport: v.optional(v.string()),
  ageGroup: v.optional(v.string()),

  // Drills referenced
  drills: v.optional(
    v.array(
      v.object({
        drillId: v.string(),
        name: v.string(),
        description: v.string(),
        duration: v.optional(v.number()),
        skillsFocused: v.array(v.string()),
        equipment: v.array(v.string()),
        intensity: v.optional(
          v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
        ),
        playerCountRange: v.optional(
          v.object({
            min: v.number(),
            max: v.number(),
            optimal: v.number(),
          })
        ),
      })
    )
  ),

  // Template Library Features
  isTemplate: v.optional(v.boolean()),
  isFeatured: v.optional(v.boolean()),
  timesUsed: v.optional(v.number()),
  lastUsedDate: v.optional(v.number()),
  favorited: v.optional(v.boolean()),
  customTags: v.optional(v.array(v.string())),
  collections: v.optional(v.array(v.string())),
  successRate: v.optional(v.number()), // 0-100

  // Sharing & Visibility (Phase 1: Club Sharing)
  visibility: v.optional(
    v.union(
      v.literal("private"),   // Default - coach only
      v.literal("club"),      // Shared with organization
      v.literal("platform")   // Public platform gallery (Phase 3)
    )
  ),
  sharedAt: v.optional(v.number()),
  sharedBy: v.optional(v.string()), // Coach name for attribution

  // Admin Moderation (Phase 2)
  moderatedBy: v.optional(v.string()),
  moderatedAt: v.optional(v.number()),
  moderationNote: v.optional(v.string()),
  pinnedByAdmin: v.optional(v.boolean()),

  // PlayerArc Marketplace (Phase 3 - Future)
  approvedForPlatform: v.optional(v.boolean()),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  platformCategory: v.optional(v.string()),
  expertCoachProfile: v.optional(v.string()),

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

  // Feedback
  feedbackSubmitted: v.boolean(),
  feedbackUsedForTraining: v.boolean(),
  simplifiedFeedback: v.optional(
    v.object({
      sessionFeedback: v.optional(
        v.union(v.literal("positive"), v.literal("negative"))
      ),
      sessionFeedbackAt: v.optional(v.number()),
      negativeReason: v.optional(v.string()),
      drillFeedback: v.optional(
        v.array(
          v.object({
            drillId: v.string(),
            drillName: v.string(),
            feedback: v.union(v.literal("positive"), v.literal("negative")),
            negativeReason: v.optional(v.string()),
            note: v.optional(v.string()),
            feedbackAt: v.number(),
          })
        )
      ),
      feedbackVariant: v.optional(
        v.union(v.literal("one_click"), v.literal("two_click_highlights"))
      ),
    })
  ),

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
  // Template Gallery Indexes
  .index("by_org_and_isTemplate", ["organizationId", "isTemplate"])
  .index("by_org_and_isFeatured", ["organizationId", "isFeatured"])
  .index("by_org_and_favorited", ["organizationId", "favorited"])
  .index("by_org_and_sport", ["organizationId", "sport"])
  .index("by_org_and_ageGroup", ["organizationId", "ageGroup"])
  // Sharing Indexes (Phase 1)
  .index("by_org_and_visibility", ["organizationId", "visibility"])
  .index("by_visibility", ["visibility"])
  // PlayerArc Marketplace Indexes (Phase 3)
  .index("by_platform_category", ["platformCategory", "approvedAt"])
  .searchIndex("search_content", {
    searchField: "rawContent",
    filterFields: [
      "organizationId",
      "coachId",
      "status",
      "sport",
      "ageGroup",
      "isTemplate",
      "isFeatured",
      "favorited",
      "visibility",
    ],
  })
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: [
      "organizationId",
      "coachId",
      "status",
      "sport",
      "ageGroup",
      "isTemplate",
      "isFeatured",
      "favorited",
      "visibility",
    ],
  }),
```

---

### 5.2 drillLibrary Table

```typescript
drillLibrary: defineTable({
  organizationId: v.string(),
  name: v.string(),
  normalizedName: v.string(), // Lowercase for matching
  description: v.string(),
  activityType: v.string(), // "drill", "game", "exercise", etc.
  skillsFocused: v.array(v.string()),
  equipment: v.array(v.string()),

  // Aggregation from session plan feedback
  totalUses: v.number(),
  positiveCount: v.number(),
  negativeCount: v.number(),
  successRate: v.number(), // Calculated percentage

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_and_name", ["organizationId", "normalizedName"])
  .index("by_org_and_type", ["organizationId", "activityType"]),
```

---

## 6. FEATURE WORKFLOWS

### 6.1 MY PLANS (Private Coach Plans)

**User Flow**:
1. Coach navigates to Session Plans from sidebar
2. Default tab is "My Plans"
3. Shows only plans where `visibility === "private"` AND `coachId === currentUserId`
4. Coach can:
   - Create new plan (navigate to `/new`)
   - View plan details (click card)
   - Duplicate plan
   - Share to club library
   - Archive/Delete plan

**Backend Query**: `api.models.sessionPlans.listForCoach`

---

### 6.2 CLUB LIBRARY (Organization-Shared Plans)

**User Flow**:
1. Coach clicks "Club Library" tab
2. Shows all plans where `visibility === "club"` AND `organizationId === currentOrgId`
3. All coaches in org can see these plans
4. Coach can:
   - View plan details
   - Duplicate to their private plans
   - See who shared it (`sharedBy` field)

**Sharing Process**:
1. Coach views their private plan
2. Clicks "Share to Club Library" button
3. `SharePlanDialog` opens
4. On confirm:
   - Calls `api.models.sessionPlans.updateVisibility({ planId, visibility: "club" })`
   - Sets `sharedAt` and `sharedBy` fields
   - Plan now appears in Club Library for all org members

**Backend Query**: `api.models.sessionPlans.listClubLibrary`

---

### 6.3 ADMIN MODERATION

**User Flow**:
1. Admin/Owner navigates to Session Plans
2. Sees "Admin" tab (only visible to admins)
3. Shows ALL plans in organization (private, club, deleted)
4. Admin can:
   - Remove plans from club library
   - Pin/unpin featured plans
   - View moderation history

**Remove from Library**:
1. Admin clicks "Remove from Library" on a club-shared plan
2. `ModerationDialog` opens
3. Admin enters reason (optional)
4. Calls `api.models.sessionPlans.removeFromClubLibrary`
5. Plan visibility reverts to "private"
6. Moderation event recorded (`moderatedBy`, `moderatedAt`, `moderationNote`)

**Backend Query**: `api.models.sessionPlans.listForAdmin`

**Alternative Admin Route**: `/admin/session-plans/` - Dedicated admin interface

---

### 6.4 DRILL LIBRARY

**Purpose**: Aggregate effectiveness data from session plan feedback

**Data Source**:
- When coaches mark plans as used and provide feedback
- Drill-level feedback aggregated into `drillLibrary` table
- Tracks: total uses, positive/negative counts, success rate

**Display**:
- Grid of drills with color coding by activity type
- Filters by type, skills, equipment
- Shows success rate and usage stats

**Backend**: `api.models.sessionPlans.getDrillLibrary`

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Navigation & Routes
- [ ] Add Session Plans to coach sidebar
- [ ] Create all route folders under `/coach/session-plans/`
- [ ] Create all route folders under `/admin/session-plans/`

### Phase 2: Schema & Backend
- [ ] Add `sessionPlans` table to schema with all fields and indexes
- [ ] Add `drillLibrary` table to schema
- [ ] Implement `sessionPlans.ts` model file with all mutations/queries
- [ ] Implement `sessionPlans.ts` action file for AI generation
- [ ] Implement `sessionPlanTracking.ts` helper functions

### Phase 3: Coach Pages
- [ ] Implement `session-plans-list.tsx` with tabs
- [ ] Implement `template-card.tsx` component
- [ ] Implement `filter-sidebar.tsx` component
- [ ] Implement `generate-session-plan.tsx` page
- [ ] Implement `session-plan-detail.tsx` page
- [ ] Implement `drill-library.tsx` page

### Phase 4: Sharing Components
- [ ] Implement `share-plan-dialog.tsx`
- [ ] Implement club library query and display

### Phase 5: Admin Features
- [ ] Implement admin session plans list
- [ ] Implement `moderation-dialog.tsx`
- [ ] Implement admin plan detail page

### Phase 6: Testing
- [ ] Test plan creation and AI generation
- [ ] Test plan sharing workflow
- [ ] Test admin moderation
- [ ] Test drill library aggregation
- [ ] Test permissions (coach vs admin)

---

## 8. KEY DEPENDENCIES

### Frontend Packages
- `lucide-react` - Icons (ClipboardList for navigation)
- `@/components/ui/*` - shadcn components (Card, Button, Dialog, Tabs, etc.)
- `convex/react` - useQuery, useMutation hooks
- `next/navigation` - useRouter, useParams
- `sonner` - toast notifications
- `@/lib/auth-client` - Better Auth client

### Backend Packages
- `convex` - Database and serverless functions
- Better Auth component integration
- OpenAI or similar AI service for plan generation

---

## 9. IMPORTANT NOTES

### Visibility Levels
- **private**: Coach only (default)
- **club**: Shared with organization
- **platform**: Public marketplace (Phase 3, not yet implemented)

### Status Values
- **draft**: Being generated by AI
- **saved**: Complete and available
- **archived_success**: Archived after successful use
- **archived_failed**: Archived after failed session
- **deleted**: Soft deleted

### Permissions
- **Coaches**: Can create, view own, share to club, view club library
- **Admins**: All coach permissions + moderation + view all plans
- **Platform Staff**: Super admin access (if `isPlatformStaff` flag set)

### Data Isolation
- All plans scoped by `organizationId`
- Coaches can only see their own private plans + club library
- Admins can see all org plans

---

## 10. TESTING SCENARIOS

### Coach Workflows
1. Generate new session plan for a team
2. View generated plan
3. Duplicate an existing plan
4. Share a plan to club library
5. Browse club library
6. Duplicate a plan from club library
7. Mark plan as used
8. Submit feedback on plan
9. Archive/delete a plan

### Admin Workflows
1. View all organization plans
2. Remove inappropriate plan from club library
3. Pin featured plans
4. View moderation history

### Drill Library
1. Submit feedback with drill ratings
2. View drill library with aggregated stats
3. Filter drills by type/skills

---

## END OF DOCUMENT

This document should provide complete context for re-implementing the Session Plans feature on a clean branch.
