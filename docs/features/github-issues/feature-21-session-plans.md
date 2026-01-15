# Session Plans Feature - Complete Implementation

## Overview
Implement a comprehensive AI-powered session planning system for coaches that enables them to generate, manage, share, and track training session plans. This feature includes a club library for sharing plans, drill library with effectiveness tracking, and admin moderation capabilities.

## Current State
- Session Plans feature was previously implemented but needs re-implementation on a clean branch
- Complete architecture and implementation details exist in documentation
- Backend model (~2,190 lines) includes all queries, mutations, and AI integration
- Frontend components and pages designed but need to be built
- Database schema fully designed with all indexes

## Purpose
Enable coaches to:
- Generate AI-powered training session plans based on team context
- Organize and manage their private session plans
- Share effective plans with other coaches in their organization
- Track plan usage and provide feedback for continuous improvement
- Access a drill library with effectiveness metrics
- Build better training sessions faster with data-driven insights

Enable admins to:
- Moderate club-shared session plans
- Pin featured plans for visibility
- Monitor plan quality and usage across the organization
- Ensure appropriate content in the shared library

## Strategic Importance
Session planning is a time-consuming task for coaches. By providing AI-powered plan generation with a collaborative library system, we:
- Save coaches significant time (generate plans in seconds vs. hours)
- Enable knowledge sharing across coaching staff
- Improve session quality through feedback loops
- Build a valuable library of proven training content
- Differentiate PlayerARC from basic club management tools

## Key Features

### 1. AI-Powered Session Plan Generation

**Generate New Plan:**
- Team selection from coach's assigned teams
- Focus area input (e.g., "Passing", "Defensive shape")
- Duration selection (60, 90, or 120 minutes)
- Player count auto-populated from team roster

**AI Generation:**
- Calls AI service (OpenAI/Anthropic) with team context
- Generates structured session plan with:
  - Warm-up activities
  - Technical drills
  - Tactical exercises
  - Game scenarios
  - Cool-down
- Parses AI response into structured sections and activities
- Saves to database with all metadata

**Navigation:**
- `/orgs/[orgId]/coach/session-plans/new` - Generation page
- Redirects to plan detail after generation

### 2. My Plans (Private Library)

**Coach's Personal Plans:**
- Default view when accessing session plans
- Shows all plans where `visibility === "private"` AND `coachId === currentUser`
- Filtered by sport, age group, focus area
- Searchable by title/content

**Plan Management:**
- View plan details (structured sections, drills, content)
- Duplicate plan (creates copy in private library)
- Share to club library (changes visibility to "club")
- Mark as used (tracks usage date)
- Archive plan (success/failed status)
- Delete plan (soft delete)

**Template Cards:**
- Display: title, sport, age group, duration, focus area
- Metadata: created date, times used, favorited
- Hover actions: duplicate, share, favorite

**Navigation:**
- `/orgs/[orgId]/coach/session-plans` - Main list page with tabs

### 3. Club Library (Organization-Shared Plans)

**Shared Plans:**
- Shows all plans where `visibility === "club"` AND `organizationId === currentOrg`
- All coaches in organization can view
- Attribution shows who shared the plan (`sharedBy` field)

**Sharing Workflow:**
1. Coach views their private plan
2. Clicks "Share to Club Library"
3. Confirms in dialog (explains plan will be visible to all coaches)
4. Plan visibility updated to "club"
5. Plan appears in Club Library with attribution

**Access:**
- Any coach in org can view club plans
- Can duplicate to their private library
- Cannot edit shared plans (read-only)
- Original author can un-share (revert to private)

### 4. Admin Moderation

**Admin Access:**
- "Admin" tab visible only to org admins/owners
- Shows ALL plans in organization (private, club, deleted)
- Full oversight for compliance and quality

**Moderation Actions:**
- Remove plan from club library (reverts to private)
- Pin/unpin featured plans (highlights quality content)
- View moderation history
- Records: `moderatedBy`, `moderatedAt`, `moderationNote`

**Admin Routes:**
- `/orgs/[orgId]/admin/session-plans` - Admin moderation interface
- `/orgs/[orgId]/admin/session-plans/[planId]` - Admin plan detail

### 5. Drill Library

**Purpose:**
- Aggregate effectiveness data from coach feedback
- Show which drills work best
- Help coaches discover proven activities

**Data Collection:**
- When coaches mark plans as used, they provide feedback
- Drill-level ratings (positive/negative)
- Aggregated into `drillLibrary` table
- Tracks: total uses, positive/negative counts, success rate

**Display:**
- Grid of drills color-coded by activity type
- Filter by type, skills, equipment
- Success rate percentage
- Usage statistics
- Drill details: description, skills focused, equipment needed

**Navigation:**
- `/orgs/[orgId]/coach/session-plans/drills` - Drill library page

### 6. Feedback & Analytics

**Session Feedback:**
- After marking plan as used, coach provides feedback
- Session-level: thumbs up/down
- Drill-level: individual drill ratings
- Optional comments for negative feedback

**Metrics Tracked:**
- View count (how many times plan viewed)
- Share count (times duplicated)
- Regenerate count (user dissatisfaction indicator)
- Success rate (positive feedback %)
- Drill effectiveness aggregation

**Analytics:**
- Organization-wide statistics for admins
- Total plans created
- Plans used vs. unused
- Success rates
- Most popular focus areas

## Technical Architecture

### Database Schema

**sessionPlans Table:**
```typescript
{
  // Identity
  organizationId: string
  coachId: string
  coachName: string
  teamId: optional string
  teamName: string
  playerCount: number

  // Content
  title: string
  rawContent: string // Full markdown from AI
  focusArea: optional string
  duration: number // minutes

  // Structured sections
  sections: array of {
    id: string
    type: "warmup" | "technical" | "tactical" | "games" | "cooldown" | "custom"
    title: string
    duration: number
    order: number
    activities: array of {
      id: string
      name: string
      description: string
      duration: optional number
      order: number
      activityType: "drill" | "game" | "exercise" | "demonstration" | "discussion" | "rest"
    }
  }

  // Context
  sport: optional string
  ageGroup: optional string

  // Drills referenced
  drills: optional array of drill objects

  // Template features
  isTemplate: optional boolean
  isFeatured: optional boolean
  timesUsed: optional number
  lastUsedDate: optional number
  favorited: optional boolean
  customTags: optional array of strings
  successRate: optional number // 0-100

  // Sharing (Phase 1)
  visibility: "private" | "club" | "platform"
  sharedAt: optional number
  sharedBy: optional string // Coach name

  // Admin moderation
  moderatedBy: optional string
  moderatedAt: optional number
  moderationNote: optional string
  pinnedByAdmin: optional boolean

  // Status
  status: "draft" | "saved" | "archived_success" | "archived_failed" | "deleted"
  usedInSession: boolean
  usedDate: optional number

  // Feedback
  feedbackSubmitted: boolean
  simplifiedFeedback: optional object {
    sessionFeedback: "positive" | "negative"
    drillFeedback: array of drill ratings
  }

  // Timestamps
  createdAt: number
  updatedAt: number
  archivedAt: optional number
}
```

**Indexes:**
- `by_org`, `by_coach`, `by_org_and_coach`
- `by_org_and_status`, `by_coach_and_status`
- `by_org_and_visibility` (for club library)
- `by_org_and_sport`, `by_org_and_ageGroup`
- `by_org_and_isFeatured` (for pinned plans)
- Search indexes: `search_content`, `search_title`

**drillLibrary Table:**
```typescript
{
  organizationId: string
  name: string
  normalizedName: string // For matching
  description: string
  activityType: string
  skillsFocused: array of strings
  equipment: array of strings

  // Aggregated effectiveness
  totalUses: number
  positiveCount: number
  negativeCount: number
  successRate: number // Calculated

  createdAt: number
  updatedAt: number
}
```

### Backend Implementation

**File:** `packages/backend/convex/models/sessionPlans.ts` (~2,190 lines)

**Key Mutations:**
- `generateAndSave` - Creates draft plan, schedules AI generation
- `updatePlanContent` (internal) - Saves AI-generated content
- `updateVisibility` - Share to club/platform
- `duplicatePlan` - Create copy
- `markAsUsed` - Track usage
- `archivePlan` - Archive with success/failed status
- `deletePlan` - Soft delete
- `removeFromClubLibrary` (admin) - Moderate shared plans
- `pinPlan` / `unpinPlan` (admin) - Feature quality plans
- `submitFeedback` - Record coach feedback

**Key Queries:**
- `listForCoach` - Get coach's private plans
- `listClubLibrary` - Get org-shared plans
- `listForAdmin` - Get all plans (admin only)
- `getPlanById` - Get specific plan details
- `getDrillLibrary` - Get aggregated drill effectiveness
- `getStats` - Organization-wide statistics

**Action:**
- `generatePlanContent` (internal) - Calls AI API, parses response

**Helper File:** `packages/backend/convex/lib/sessionPlanTracking.ts`
- Metrics tracking functions
- Event logging
- Analytics aggregation

### Frontend Implementation

**Coach Pages:**
1. **Session Plans List** - `/coach/session-plans/page.tsx`
   - Wrapper renders `<SessionPlansList />`
   - Three tabs: My Plans, Club Library, Admin (if admin)
   - Filter sidebar (sport, age group, focus area, search)
   - Template cards grid display

2. **Generate New Plan** - `/coach/session-plans/new/page.tsx`
   - Wrapper renders `<GenerateSessionPlan />`
   - Form: team selection, focus area, duration
   - Calls `generateAndSave` mutation
   - Redirects to detail page

3. **Plan Detail** - `/coach/session-plans/[planId]/page.tsx`
   - Wrapper renders `<SessionPlanDetail />`
   - Display structured sections and activities
   - Actions: share, duplicate, mark as used, archive, delete
   - Download as PDF

4. **Drill Library** - `/coach/session-plans/drills/page.tsx`
   - Wrapper renders `<DrillLibrary />`
   - Grid of drills with filters
   - Color-coded by activity type
   - Success rate display

**Admin Pages:**
1. **Admin Moderation** - `/admin/session-plans/page.tsx`
   - List all club-shared plans
   - Moderation actions (remove, pin)
   - Usage statistics

2. **Admin Plan Detail** - `/admin/session-plans/[planId]/page.tsx`
   - Full plan view with admin actions
   - Moderation history

**Shared Components:**
- `filter-sidebar.tsx` - Reusable filtering
- `template-card.tsx` - Plan card display
- `share-plan-dialog.tsx` - Sharing confirmation
- `moderation-dialog.tsx` - Admin removal dialog
- `admin-library.tsx` - Admin moderation view
- `team-selection-modal.tsx` - Team picker

### Navigation Integration

**Coach Sidebar:**
Add to Development section:
```typescript
{
  href: `/orgs/${orgId}/coach/session-plans`,
  label: "Session Plans",
  icon: ClipboardList,
}
```

## User Workflows

### Workflow 1: Generate New Session Plan
1. Coach clicks "Session Plans" in sidebar
2. Clicks "Generate New Plan" button
3. Selects team from dropdown (shows assigned teams only)
4. Enters focus area: "Passing accuracy"
5. Selects duration: 90 minutes
6. Player count auto-populated: 18 players
7. Clicks "Generate Plan"
8. AI generates plan in ~10-15 seconds
9. Redirected to plan detail page
10. Reviews structured plan with warm-up, drills, games, cool-down
11. Can share, duplicate, or mark as used

### Workflow 2: Share Plan to Club Library
1. Coach viewing their successful plan
2. Clicks "Share to Club Library" button
3. Dialog explains: "This plan will be visible to all coaches in [Org Name]"
4. Coach confirms sharing
5. Plan visibility changed to "club"
6. Plan now appears in Club Library tab for all org coaches
7. Attribution shows: "Shared by [Coach Name]"

### Workflow 3: Browse Club Library
1. Different coach opens Session Plans
2. Clicks "Club Library" tab
3. Sees plans shared by colleagues
4. Filters by "U12" age group
5. Finds plan focused on "Defensive shape"
6. Reviews plan details
7. Clicks "Duplicate to My Plans"
8. Copy created in coach's private library
9. Can modify copy without affecting original

### Workflow 4: Admin Moderation
1. Admin opens Session Plans
2. Sees "Admin" tab (only visible to admins)
3. Reviews all plans in organization
4. Notices inappropriate plan in club library
5. Clicks "Remove from Library"
6. Enters reason: "Content not appropriate for club"
7. Plan visibility reverted to "private"
8. Original coach notified
9. Moderation action logged in audit trail

### Workflow 5: Mark Plan as Used & Provide Feedback
1. Coach uses plan for training session
2. Opens plan after session
3. Clicks "Mark as Used"
4. Feedback form appears:
   - "Was this session effective?" (Thumbs up/down)
   - Drill-by-drill ratings
   - Optional comments
5. Coach provides feedback
6. Feedback saved, drill library updated
7. Success rate calculated for each drill
8. Data used to improve future plan generation

## Permissions & Data Isolation

**Coaches:**
- Can create, view own, share to club, view club library
- Cannot view other coaches' private plans
- Cannot edit shared plans (can duplicate)

**Admins:**
- All coach permissions PLUS
- View all organization plans (private, club, deleted)
- Moderate club library (remove, pin)
- Access analytics dashboard

**Platform Staff:**
- Super admin access across all organizations
- Set via `isPlatformStaff` flag

**Data Scoping:**
- All plans filtered by `organizationId`
- Coaches see: own private + club library
- Admins see: all org plans

## AI Integration

**AI Service:**
- OpenAI GPT-4 or Anthropic Claude
- Prompt includes: team context, age group, player count, focus area, duration, sport
- Response parsed into structured sections and activities
- Fallback to simulated plan if API fails

**Cost Optimization:**
- Caching strategy (Feature #17: AI Cost Management)
- Track API calls and costs
- Monitor generation success rate

## Success Metrics

**Adoption:**
- 70%+ of active coaches generate at least one plan per month
- 50%+ of generated plans marked as used
- 30%+ of plans shared to club library

**Quality:**
- 80%+ positive feedback on used plans
- 60%+ success rate for drills in library
- High duplication rate for club library plans

**Time Savings:**
- Coaches report 50%+ time savings vs. manual planning
- Average generation time: <30 seconds
- Plans used within 7 days of generation

**Engagement:**
- 40%+ feedback submission rate
- Growing club library (3+ new plans per month)
- Active drill library with 50+ drills rated

## Implementation Phases

### Phase 1: Foundation (Backend & Schema)
- Add `sessionPlans` and `drillLibrary` tables to schema
- Implement all backend mutations and queries (~2,190 lines)
- Implement AI action for plan generation
- Add tracking helper functions
- Test backend thoroughly

### Phase 2: Coach Interface
- Implement session plans list page with tabs
- Build generate new plan page
- Create plan detail view
- Build drill library page
- Implement all shared components (cards, filters, dialogs)

### Phase 3: Sharing Features
- Implement share to club library workflow
- Build club library tab and display
- Add duplicate functionality
- Test sharing permissions

### Phase 4: Admin Features
- Implement admin moderation interface
- Build admin plan detail page
- Add pin/unpin functionality
- Create moderation dialog

### Phase 5: Feedback & Analytics
- Implement feedback forms
- Build drill library aggregation
- Create analytics queries
- Add organization statistics dashboard

### Phase 6: Testing & Polish
- End-to-end testing of all workflows
- UAT with real coaches
- Performance optimization
- Documentation
- Production deployment

## Integration with Existing Features

**Team Management:**
- Pulls coach assignments from `coachAssignments` table
- Uses team roster for player count

**Voice Notes:**
- Session plans could reference voice notes from specific sessions (future)
- Feedback could link to observations

**Player Assessments:**
- Team strengths/weaknesses could inform AI generation (future)
- Post-session assessments could validate plan effectiveness

**Action Centre (Feature #11):**
- "Generate session plan for next training" task
- "Provide feedback on last session" reminder

**AI Cost Management (Feature #17):**
- Track generation API calls and costs
- Implement caching for similar requests
- Monitor and optimize AI usage

## Future Enhancements (Phase 3+)

**Platform Marketplace:**
- `visibility: "platform"` for public sharing
- Expert coach profiles
- Featured plans across all organizations
- Monetization potential

**Advanced Features:**
- Session plan templates (pre-built structures)
- Video integration (attach drill demonstration videos)
- Custom collections (organize plans by season, tournament prep)
- Plan versioning (track changes over time)
- Seasonal planning (multi-session programs)

**AI Improvements:**
- Learn from feedback to improve generation
- Personalized recommendations based on coach style
- Auto-adjust plans based on player performance data

## Technical Considerations

### Performance
- Efficient indexes for all query patterns
- Pagination for large plan libraries
- Lazy loading of plan details
- Cache AI-generated content

### Security
- Verify coach assignments before showing teams
- Validate plan ownership before modifications
- Admin-only moderation endpoints
- Rate limiting on AI generation

### UX Priorities
- Fast plan generation (<30 seconds)
- Mobile-responsive design
- Clear sharing attribution
- Easy feedback submission
- Intuitive navigation

## Testing Requirements

**Backend:**
- Unit tests for all mutations and queries
- Test AI action with mocked responses
- Verify permission checks
- Test drill aggregation logic

**Frontend:**
- Component testing for all pages
- Integration tests for workflows
- Test mobile responsiveness
- Verify role-based visibility

**E2E:**
- Full generate → share → duplicate workflow
- Admin moderation complete flow
- Feedback submission and drill library update
- Multi-coach collaboration scenarios

## Dependencies

**Frontend:**
- shadcn/ui components (Card, Button, Dialog, Tabs, etc.)
- lucide-react (ClipboardList icon)
- Convex React hooks
- Better Auth client

**Backend:**
- Convex database and serverless functions
- OpenAI or Anthropic API
- Better Auth integration

## References
- Complete implementation guide: `docs/features/SESSION_PLANS_COMPLETE_IMPLEMENTATION.md`
- Optimization proposal: `docs/features/SESSION_PLAN_OPTIMIZATION_PROPOSAL.md`
- Existing backend model: `packages/backend/convex/models/sessionPlans.ts` (if exists)

## Open Questions
1. Which AI service to use? (OpenAI GPT-4 vs. Anthropic Claude)
2. What's the cache duration for generated plans? (24 hours recommended)
3. Should platform marketplace (Phase 3) be built now or later?
4. What's the approval process for shared plans? (Opt-in vs. admin approval)
5. Should drill library be organization-specific or platform-wide?
