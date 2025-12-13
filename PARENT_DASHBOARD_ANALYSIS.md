# Parent Dashboard & Role - Migration Analysis

## Executive Summary

The MVP's Parent Dashboard is a comprehensive family-focused interface that provides parents with insights into their children's development across multiple sports. This document analyzes all features and provides a migration strategy for the main application.

---

## 1. Core Features Overview

### 1.1 Parent Role & Authentication
- **Current MVP**: Parents are identified by email matching in the `players.parents[]` array
- **Filtering Logic**: Backend filters players where `player.parents[].email` matches the logged-in user's email
- **Multi-Child Support**: Parents can have multiple children, potentially across different sports
- **Multi-Sport Support**: Single child can play multiple sports (e.g., Soccer + GAA Football)

### 1.2 Main Dashboard Components

#### A. Header Section
- **"Your Family's Journey"** - Gradient blue header
- Shows count of children being tracked
- Displays total number of sports across all children

#### B. Weekly Schedule Calendar
- **7-day grid view** (Mon-Sun)
- Shows training sessions (blue badges) and matches (green badges)
- Displays child's first name, event type, and time
- Quick stats:
  - Total training sessions
  - Total matches
  - Total events
- **Current Status**: Uses mock data - needs backend integration

#### C. Latest Coach Feedback
- Displays coach notes for each child
- Shows child name, team, and note content
- Only appears if at least one child has coach notes
- Styled with blue left border

#### D. AI Practice Assistant
- **Key Feature**: Generates personalized weekly practice plans
- **Plan Generation Logic**:
  - Analyzes child's weakest skills (lowest ratings)
  - Links to development goals
  - Creates sport-specific drills (Soccer vs GAA)
  - Provides 3 drills per plan (5 minutes each = 15 min total)
  - Includes success metrics and AI coaching tips
- **Plan Components**:
  - Weekly focus skill
  - Recommended practice schedule (3 days/week)
  - Detailed drill instructions
  - Equipment needed
  - Weekly goal
  - Progress tracking checklist
- **Sharing**: Can share practice plans via modal
- **UI**: Purple gradient card with white content area

#### E. Children Overview Cards
- **One card per child** (grouped by name for multi-sport athletes)
- **Card Contents**:
  1. **Child Header**:
     - Name
     - Multi-sport badge if applicable
     - Review status badge (Completed/Due Soon/Overdue/Not Started)
  
  2. **Overall Performance Score**:
     - Combined average rating across all skills
     - Progress bar (gradient blue-purple)
     - For multi-sport: aggregated across all sports
  
  3. **Top Strengths**:
     - Top 3 skills by rating
     - Star rating display (1-5 stars)
     - For multi-sport: combined across all sports
  
  4. **Attendance**:
     - Training attendance percentage
     - Match attendance percentage
     - Color-coded (green ≥80%, yellow ≥60%, red <60%)
  
  5. **Development Goals**:
     - Shows first goal from `actions` field
     - For multi-sport: shows goals per sport
     - Includes "How Parents Can Help" section
  
  6. **Last Review Date**:
     - Days since last review
     - Calendar icon
  
  7. **Injury Status**:
     - Active injuries count (red)
     - Recovering injuries count (yellow)
     - No injuries (green)
     - Most recent injury details
     - Link to full injury dashboard
  
  8. **Action Button**:
     - "View Full Passport" (single sport)
     - "View [Sport] Passport" buttons (multi-sport)

#### F. Family Summary Stats
- **4 stat cards**:
  1. Total Children count
  2. Completed Reviews count
  3. Due Soon count
  4. Overdue count

---

## 2. Data Requirements

### 2.1 Player Data Needed
```typescript
interface PlayerForParent {
  // Basic Info
  name: string;
  sport: string;
  ageGroup: string;
  team: string;
  
  // Skills
  skills: Record<string, number>; // All skill ratings
  
  // Attendance
  attendance: {
    training: string; // e.g., "85%"
    matches: string;  // e.g., "90%"
  };
  
  // Goals & Actions
  actions?: string; // Structured text with 🎯 delimiters
  
  // Review Status
  reviewStatus: 'Not Started' | 'Completed' | 'Overdue' | 'Due Soon';
  lastReviewDate: string | null;
  
  // Coach Notes
  coachNotes?: string;
  
  // Injuries
  injuries?: Array<{
    injuryType: string;
    bodyPart: string;
    severity: string;
    status: 'Active' | 'Recovering' | 'Healed';
    dateOccurred: string;
  }>;
  
  // Parents Array (for matching)
  parents: Array<{
    id: string;
    firstName: string;
    surname: string;
    email: string;
    phone?: string;
    relationship?: string;
    isPrimary?: boolean;
  }>;
}
```

### 2.2 Backend Queries Needed

1. **Get Players for Parent**
   - Filter by `parents[].email` matching user email
   - Return all player data including skills, attendance, goals, injuries

2. **Get Schedule Data** (Future)
   - Training sessions per team
   - Match fixtures
   - Filtered by parent's children's teams

---

## 3. Migration Strategy

### Phase 1: Core Dashboard Structure ✅ (Already Done)
- [x] Parent role identification via `functionalRoles`
- [x] Player filtering by parent email (via `linkPlayersToParent`)
- [x] Basic player passport view

### Phase 2: Dashboard Components (Recommended Order)

#### 2.1 Header & Summary Stats
**Priority**: High  
**Complexity**: Low  
**Files**:
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx` (new)
- `apps/web/src/app/orgs/[orgId]/parents/components/family-header.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/summary-stats.tsx`

**Backend**:
- Use existing `getMembersWithDetails` to get linked players
- Add query to get player review statuses

#### 2.2 Children Overview Cards
**Priority**: High  
**Complexity**: Medium  
**Files**:
- `apps/web/src/app/orgs/[orgId]/parents/components/child-card.tsx`

**Features**:
- Multi-sport grouping logic
- Performance score calculation
- Top skills extraction
- Attendance parsing and display
- Goals preview
- Injury summary
- Link to player passport

**Backend**:
- Ensure `getPlayerPassport` includes all needed data
- Add review status calculation

#### 2.3 Weekly Schedule Calendar
**Priority**: Medium  
**Complexity**: High  
**Files**:
- `apps/web/src/app/orgs/[orgId]/parents/components/weekly-schedule.tsx`

**Backend Requirements**:
- New table: `trainingSessions` (teamId, date, time, type)
- New table: `matches` (teamId, date, time, opponent)
- Query: `getScheduleForParent` (returns events for parent's children's teams)

**Note**: This requires significant backend work. Consider Phase 3 or use mock data initially.

#### 2.4 Coach Feedback Section
**Priority**: Medium  
**Complexity**: Low  
**Files**:
- `apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback.tsx`

**Backend**:
- Use existing `coachNotes` field from player data
- Filter players with non-empty `coachNotes`

#### 2.5 AI Practice Assistant
**Priority**: Low (Nice to Have)  
**Complexity**: High  
**Files**:
- `apps/web/src/app/orgs/[orgId]/parents/components/ai-practice-assistant.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/practice-plan-modal.tsx`

**Implementation Options**:
1. **Client-Side Generation** (MVP approach):
   - Analyze skills to find weakest
   - Generate drills based on sport
   - Link to goals
   - No AI/LLM needed

2. **Backend AI Integration** (Future):
   - Use OpenAI/Anthropic API
   - Generate more sophisticated plans
   - Store plans in database

**Recommendation**: Start with client-side generation (matches MVP), add AI later if needed.

---

## 4. Technical Implementation Details

### 4.1 Parent-Player Linking
**Current State**: 
- `linkPlayersToParent` mutation exists
- Links via email matching in `players.parents[]` array

**Migration**:
- Ensure parent's email from Better Auth matches `players.parents[].email`
- Use `getMembersWithDetails` to get linked players
- Filter players where `functionalRoles.includes("parent")`

### 4.2 Multi-Sport Grouping
```typescript
// Group players by name (same child, different sports)
const groupedPlayers = players.reduce((acc, player) => {
  const key = player.name;
  if (!acc[key]) {
    acc[key] = [];
  }
  acc[key].push(player);
  return acc;
}, {} as Record<string, Player[]>);
```

### 4.3 Skill Calculations
```typescript
// Get top 3 skills
const getTopSkills = (player: Player): Array<{name: string; rating: number}> => {
  const skills = player.skills as any;
  return Object.entries(skills)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => ({ name: key, rating: value as number }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
};

// Get average rating
const getAverageRating = (player: Player): number => {
  const skills = player.skills as any;
  const ratings = Object.values(skills)
    .filter(v => typeof v === 'number') as number[];
  return ratings.length > 0 
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
    : 0;
};
```

### 4.4 Attendance Parsing
```typescript
const parseAttendance = (attendance: string): number => {
  const match = attendance.match(/(\d+)%/);
  return match ? parseInt(match[1]) : 0;
};
```

### 4.5 Goals Parsing
```typescript
// Extract first goal from actions field
const firstGoal = player.actions?.split('🎯')[1]?.split('\n')[0] || 'Improve overall skills';

// Extract "How Parents Can Help"
const parentHelp = player.actions?.includes('👨‍👩‍👧 HOW PARENTS CAN HELP')
  ? player.actions.split('👨‍👩‍👧 HOW PARENTS CAN HELP:')[1]?.split('🎯')[0]
  : null;
```

---

## 5. Backend Changes Required

### 5.1 New Queries

#### `getPlayersForParent`
```typescript
export const getPlayersForParent = query({
  args: { organizationId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: identity.email, operator: "eq" }],
    });
    
    if (!user) return [];
    
    // Get all players for organization
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    
    // Filter by parent email
    const normalizedEmail = identity.email.toLowerCase().trim();
    return allPlayers.filter((player) =>
      player.parents?.some((parent: any) =>
        parent.email?.toLowerCase().trim() === normalizedEmail
      )
    );
  },
});
```

#### `getReviewStatus` (if not already calculated)
- Calculate based on `lastReviewDate` and review frequency
- Return: 'Not Started' | 'Completed' | 'Due Soon' | 'Overdue'

### 5.2 Schema Updates
- Ensure `players` table has:
  - `parents` array (already exists)
  - `reviewStatus` field (or calculate on-the-fly)
  - `lastReviewDate` field
  - `coachNotes` field
  - `injuries` array (if not exists)

---

## 6. UI/UX Considerations

### 6.1 Design System
- Use existing shadcn/ui components
- Match MVP color scheme:
  - Blue gradient headers
  - Purple for AI features
  - Green for positive stats
  - Red/Yellow for warnings

### 6.2 Responsive Design
- Cards: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- Calendar: Horizontal scroll on mobile
- Practice plans: Full-width on mobile

### 6.3 Accessibility
- Proper heading hierarchy
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly

---

## 7. Recommended Implementation Order

### Sprint 1: Foundation
1. Create parent dashboard route: `/orgs/[orgId]/parents`
2. Implement header and summary stats
3. Create child card component (basic version)

### Sprint 2: Core Features
1. Complete child card with all metrics
2. Add coach feedback section
3. Implement multi-sport grouping

### Sprint 3: Advanced Features
1. Weekly schedule calendar (with mock data initially)
2. AI Practice Assistant (client-side generation)
3. Practice plan sharing modal

### Sprint 4: Backend Integration
1. Real schedule data integration
2. Review status calculation
3. Performance optimizations

---

## 8. Open Questions & Decisions Needed

1. **Schedule Data**: 
   - Do we have a teams/schedule system yet?
   - Should we build it or use mock data initially?

2. **AI Practice Plans**:
   - Client-side generation (MVP approach) or backend AI?
   - Should plans be saved/stored?

3. **Review Status**:
   - How is review frequency determined?
   - Per organization? Per team? Per sport?

4. **Injuries**:
   - Do we have an injuries system?
   - Should we build it or skip for now?

5. **Notifications**:
   - Should parents get notified of new coach notes?
   - Should parents get notified of upcoming reviews?

---

## 9. Success Criteria

- [ ] Parent can see all their children in one dashboard
- [ ] Multi-sport athletes are properly grouped
- [ ] Performance metrics are accurate
- [ ] Coach feedback is visible
- [ ] Practice plans can be generated and shared
- [ ] Schedule calendar shows events (even if mock initially)
- [ ] All links to player passports work
- [ ] Dashboard is responsive and accessible

---

## 10. Files to Create/Modify

### New Files
```
apps/web/src/app/orgs/[orgId]/parents/
  ├── page.tsx (main dashboard)
  └── components/
      ├── family-header.tsx
      ├── summary-stats.tsx
      ├── child-card.tsx
      ├── weekly-schedule.tsx
      ├── coach-feedback.tsx
      ├── ai-practice-assistant.tsx
      └── practice-plan-modal.tsx
```

### Modified Files
```
packages/backend/convex/models/players.ts
  └── Add getPlayersForParent query

packages/backend/convex/models/members.ts
  └── Ensure parent filtering works correctly
```

---

## Conclusion

The Parent Dashboard is a feature-rich component that requires careful planning. The recommended approach is to implement in phases, starting with core features (header, stats, child cards) and gradually adding advanced features (schedule, AI assistant).

The MVP's client-side AI practice plan generation is a good starting point - it provides value without requiring complex backend AI integration.

Key success factors:
1. Proper parent-player linking via email
2. Multi-sport athlete handling
3. Accurate performance calculations
4. Clean, intuitive UI matching MVP design

