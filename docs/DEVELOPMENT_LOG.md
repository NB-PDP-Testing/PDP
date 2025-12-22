# Development Log - December 22, 2024

## Executive Summary

This session focused on **Voice Notes integration with Skills Assessments** and **player profile skill display fixes**. The key achievements were:

1. **Voice Notes can now update Skill Ratings** - When coaches mention specific skill ratings in voice notes (e.g., "set his passing to 3"), applying the insight creates a `skillAssessments` record
2. **Player Profile now displays skills from assessments** - The `getFullPlayerPassportView` query now correctly transforms `skillAssessments` records into the `Record<string, number>` format expected by the UI
3. **AI prompt improvements** - Updated the voice note AI to better categorize `skill_rating` vs `skill_progress` insights
4. **TypeScript fixes** - Fixed 3 TypeScript errors in the coach assess page related to optional properties

---

## Detailed Changes

### 1. Voice Notes → Skill Assessments Integration

**Files Modified:**

- `packages/backend/convex/actions/voiceNotes.ts`
- `packages/backend/convex/models/voiceNotes.ts`

**Changes:**

#### AI Prompt Enhancement (`voiceNotes.ts` - actions)

```typescript
// Updated AI prompt to explicitly differentiate categories:
// - skill_rating: when coach mentions a specific numeric rating (e.g., "set to 3", "rating 4/5")
// - skill_progress: general skill improvement without specific numbers

// Added instruction to include rating in recommendedUpdate field
```

#### Skill Rating Application (`voiceNotes.ts` - models)

Added new category handler for `skill_rating`:

- Parses rating from insight description/recommendedUpdate
- Supports word numbers ("three" → 3, "four" → 4)
- Creates `skillAssessments` record with extracted rating
- Updates passport's lastAssessmentDate and assessmentCount

Updated `skill_progress` handler to also check for ratings:

- If a rating is found in description, creates skill assessment instead of goal
- Falls back to creating development goal if no rating found

**Rating Parsing Patterns:**

```typescript
const patterns = [
  /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(\d)(?:\/5)?/i,
  /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(one|two|three|four|five)(?:\/5)?/i,
];
```

---

### 2. Player Profile Skills Display Fix

**Files Modified:**

- `packages/backend/convex/models/sportPassports.ts`

**Problem:**
The `SkillsSection` component expected `player.skills` to be a `Record<string, number>` (e.g., `{ ballControl: 3, passing: 4 }`), but `getFullPlayerPassportView` was returning the raw assessments array.

**Solution:**

```typescript
// Before:
const assessments = await ctx.db.query("skillAssessments")...
return { skills: assessments } // Wrong - array instead of Record

// After:
const assessmentsRaw = await ctx.db.query("skillAssessments")
  .withIndex("by_passportId", ...)
  .order("desc")
  .take(100);

// Transform to Record<string, number>
const skillsMap: Record<string, number> = {};
for (const assessment of assessmentsRaw) {
  const key = assessment.skillCode;
  if (!skillsMap[key]) {
    skillsMap[key] = assessment.rating; // First occurrence wins (most recent)
  }
}

return { skills: skillsMap } // Correct - Record<string, number>
```

---

### 3. Coach Assess Page TypeScript Fixes

**Files Modified:**

- `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx`

**Errors Fixed:**

1. `'debugData.teamMemberships' is possibly 'undefined'`
2. `'debugData.assignedTeamIds' is possibly 'undefined'`
3. `'debugData.allTeams' is possibly 'undefined'`

**Solution:**

```typescript
// Before:
console.log("🐛 ASSIGNED TEAM IDS:", debugData.assignedTeamIds);
console.log("🐛 ALL TEAMS:", debugData.allTeams);
const uniqueTeamIds = new Set(
  debugData.teamMemberships.map((tm: any) => tm.teamId)
);
const assignedTeamId = debugData.assignedTeamIds[0];
const teamExists = debugData.allTeams.find(
  (t: any) => t._id === assignedTeamId
);

// After:
console.log("🐛 ASSIGNED TEAM IDS:", debugData.assignedTeamIds ?? []);
console.log("🐛 ALL TEAMS:", debugData.allTeams ?? []);
const uniqueTeamIds = new Set(
  debugData.teamMemberships?.map((tm: any) => tm.teamId) ?? []
);
const assignedTeamId = debugData.assignedTeamIds?.[0];
const teamExists = debugData.allTeams?.find(
  (t: any) => t._id === assignedTeamId
);
```

---

## Data Flow Summary

### Voice Note → Skill Assessment Flow:

```
1. Coach creates voice note: "Charlie's passing improved, set to rating 3"
   ↓
2. AI transcribes and extracts insight:
   - category: "skill_rating" or "skill_progress"
   - playerName: "Charlie"
   - title: "Passing Skills Improved"
   - description: "...improved, set to rating 3"
   ↓
3. Coach clicks "Apply" on insight
   ↓
4. updateInsightStatus mutation:
   - Detects skill_rating or skill_progress category
   - Parses "rating 3" → value: 3
   - Finds player's passport
   - Creates skillAssessments record:
     {
       passportId, playerIdentityId, sportCode,
       skillCode: "passing_skills_improved",
       rating: 3,
       assessmentDate: "2024-12-22",
       assessmentType: "training",
       ...
     }
   ↓
5. Player profile loads via getFullPlayerPassportView:
   - Queries skillAssessments for passport
   - Transforms to: { passing_skills_improved: 3 }
   - UI displays rating in Skills section
```

---

## Testing Notes

### To Test Voice Notes → Skill Ratings:

1. Navigate to Voice Notes (`/orgs/[orgId]/coach/voice-notes`)
2. Add a note with explicit rating: "Charlie's hand_pass skill is now at rating 3"
3. Wait for AI processing
4. Look for insight with `skill_rating` or `skill_progress` category
5. Click Apply (✓)
6. Expected message: "📊 Skill 'hand_pass' set to 3/5 for Charlie"
7. Verify on player profile: Players → Charlie → Skills section

### Rating Patterns That Work:

- "Rating: 3" or "rating 3"
- "set to 3" or "set to three"
- "update to 4" or "to four"
- "improved to 4/5"
- "level 3"
- "now at 3/5"

---

## Files Changed Summary

| File                                                  | Type     | Description                                     |
| ----------------------------------------------------- | -------- | ----------------------------------------------- |
| `packages/backend/convex/actions/voiceNotes.ts`       | Modified | Enhanced AI prompt for skill_rating category    |
| `packages/backend/convex/models/voiceNotes.ts`        | Modified | Added skill_rating handler, word number parsing |
| `packages/backend/convex/models/sportPassports.ts`    | Modified | Fixed skills transformation to Record format    |
| `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx` | Modified | Fixed 3 TypeScript optional property errors     |

---

# Development Log - December 22, 2024 (Session 2)

## Executive Summary

This session focused on **Emergency Contacts Management for Adult Players** and **Adult Player Dashboard Enhancements**. The key achievements were:

1. **Emergency Contacts visible on Coach's Player Passport View** - Coaches can now see emergency contacts for adult players directly in the player passport page
2. **Adult Player Dashboard shows full passport** - Adult players now see the same comprehensive view as coaches including skills, goals, benchmarks, and emergency contacts
3. **Emergency Contacts editable by adult players** - Adult players can add, edit, delete, and reorder their own emergency contacts
4. **Match Day ICE Access** - Coaches have quick access to all adult player ICE contacts on match day

---

## Detailed Changes

### 1. Emergency Contacts Section in Coach's Player Passport View

**Files Modified:**

- `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`
- `packages/backend/convex/models/sportPassports.ts`

**Problem:**
Coaches viewing an adult player's passport page could not see their emergency contacts, even though the data was being returned by the API.

**Solution:**

#### Added playerType to Query Return (`sportPassports.ts`)

```typescript
// Build legacy-compatible player data structure
return {
  _id: player._id,
  name: `${player.firstName} ${player.lastName}`,
  // ...
  playerType: player.playerType, // "youth" or "adult" - NEW!
  // ...
};
```

#### Added EmergencyContactsSection to Coach View (`players/[playerId]/page.tsx`)

```typescript
import { EmergencyContactsSection } from "./components/emergency-contacts-section";

// In render:
{/* Emergency Contacts - for adult players, shown right after basic info */}
{"playerType" in playerData && playerData.playerType === "adult" && (
  <EmergencyContactsSection
    playerIdentityId={playerId as Id<"playerIdentities">}
    isEditable={false} // Coaches can view but not edit adult player's contacts
    playerType="adult"
  />
)}
```

---

### 2. Adult Player Dashboard Enhancement

**Files Modified:**

- `apps/web/src/app/orgs/[orgId]/player/page.tsx`

**Problem:**
The adult player dashboard showed only basic information instead of the full player passport view that coaches see.

**Solution:**
Updated the player self-view to include all passport sections:

```typescript
import { BasicInformationSection } from "../players/[playerId]/components/basic-info-section";
import { EmergencyContactsSection } from "../players/[playerId]/components/emergency-contacts-section";
import { GoalsSection } from "../players/[playerId]/components/goals-section";
import { NotesSection } from "../players/[playerId]/components/notes-section";
import { PositionsFitnessSection } from "../players/[playerId]/components/positions-fitness-section";
import { SkillsSection } from "../players/[playerId]/components/skills-section";
```

**Section Order (top to bottom):**

1. Header (welcome banner with player name and org)
2. BasicInformationSection
3. EmergencyContactsSection (editable for adult players)
4. BenchmarkComparison (skill benchmarks)
5. GoalsSection
6. NotesSection (read-only for players)
7. SkillsSection
8. PositionsFitnessSection

---

### 3. Emergency Contacts System (Already Implemented)

**Files Reviewed/Verified:**

- `packages/backend/convex/schema.ts` - `playerEmergencyContacts` table
- `packages/backend/convex/models/emergencyContacts.ts` - Full CRUD operations
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/emergency-contacts-section.tsx` - Full UI component
- `apps/web/src/app/orgs/[orgId]/coach/match-day/page.tsx` - Match day ICE access

**Schema:**

```typescript
playerEmergencyContacts: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  relationship: v.string(),
  priority: v.number(),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_player", ["playerIdentityId"])
  .index("by_priority", ["playerIdentityId", "priority"]),
```

**Backend Functions (`emergencyContacts.ts`):**

- `getForPlayer` - Get all contacts for a player
- `getICEContacts` - Get priority 1-2 contacts only (ICE)
- `getForOrganization` - Get all adult players with contacts (for match day)
- `create` - Add new contact with auto priority management
- `update` - Update contact details
- `updatePriority` - Move contact up/down
- `remove` - Delete contact and reorder remaining
- `reorderAll` - Bulk priority update
- `hasContacts`, `getCount` - Utility queries

**UI Features (`emergency-contacts-section.tsx`):**

- Add/Edit/Delete contacts with modal dialogs
- Priority reordering with up/down arrows
- ICE badge for priority 1-2 contacts
- Relationship dropdown (spouse, parent, sibling, friend, etc.)
- Phone number with click-to-call links
- Notes field for additional info
- Empty state with call-to-action

**Match Day View (`match-day/page.tsx`):**

- Quick access to ICE contacts for all adult players
- One-tap calling functionality
- Search and team filter
- Stats: total players, with/without ICE, total contacts
- Alert banner for players missing contacts

---

## Permission Model

### Emergency Contacts Visibility:

| Viewer                        | Can See | Can Edit                   |
| ----------------------------- | ------- | -------------------------- |
| Adult Player (own profile)    | ✅ Yes  | ✅ Yes                     |
| Coach (viewing player)        | ✅ Yes  | ❌ No                      |
| Admin (viewing player)        | ✅ Yes  | ❌ No                      |
| Parent (viewing youth player) | N/A     | N/A (managed by guardians) |

### Youth vs Adult Players:

- **Youth Players**: Emergency contacts managed through guardian profiles (different system)
- **Adult Players**: Self-managed emergency contacts via `playerEmergencyContacts` table

---

## Data Flow Summary

### Adult Player Managing Contacts:

```
1. Player navigates to /orgs/[orgId]/player (their dashboard)
   ↓
2. EmergencyContactsSection loads with isEditable={true}
   ↓
3. Query: emergencyContacts.getForPlayer
   ↓
4. Player adds/edits contact via modal
   ↓
5. Mutation: emergencyContacts.create or update
   ↓
6. UI updates with new contact list
```

### Coach Viewing Player Contacts:

```
1. Coach navigates to /orgs/[orgId]/players/[playerId]
   ↓
2. getFullPlayerPassportView includes playerType field
   ↓
3. If playerType === "adult", show EmergencyContactsSection
   ↓
4. isEditable={false} - coach can only view
   ↓
5. Phone links for quick calling in emergencies
```

---

## Testing Notes

### To Test Emergency Contacts:

**As Adult Player:**

1. Login as adult player with player role
2. Navigate to player dashboard
3. Scroll to Emergency Contacts section
4. Click "Add Contact"
5. Fill in: John Smith, Spouse, 087-123-4567
6. Save → Contact appears with priority 1
7. Add another contact → Auto-assigned priority 2
8. Use arrows to reorder priorities
9. Click edit icon to modify
10. Click delete icon to remove

**As Coach:**

1. Login as coach
2. Navigate to player list
3. Click on adult player
4. Verify Emergency Contacts section appears after Basic Information
5. Verify contacts are read-only (no add/edit/delete buttons)
6. Click phone number → should open phone app

**Match Day View:**

1. Navigate to /orgs/[orgId]/coach/match-day
2. Verify all adult players listed
3. Check ICE badge for players with contacts
4. Verify alert shows count of players without contacts
5. Test search and team filters
6. Click phone number → opens phone app

---

## Files Changed Summary

| File                                                        | Type     | Description                                                     |
| ----------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| `packages/backend/convex/models/sportPassports.ts`          | Modified | Added playerType to getFullPlayerPassportView return            |
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` | Modified | Added EmergencyContactsSection for adult players                |
| `apps/web/src/app/orgs/[orgId]/player/page.tsx`             | Modified | Added full passport sections including EmergencyContactsSection |

## Previously Existing (Verified Working)

| File                                                                                         | Type      | Description                              |
| -------------------------------------------------------------------------------------------- | --------- | ---------------------------------------- |
| `packages/backend/convex/schema.ts`                                                          | Schema    | playerEmergencyContacts table definition |
| `packages/backend/convex/models/emergencyContacts.ts`                                        | Backend   | Full CRUD operations for contacts        |
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/emergency-contacts-section.tsx` | Component | Full UI for managing contacts            |
| `apps/web/src/app/orgs/[orgId]/coach/match-day/page.tsx`                                     | Page      | Match day ICE quick access view          |

---

# Development Log - December 22, 2024 (Session 3)

## Executive Summary

This session focused on **Complete Parent Dashboard Enhancement** with all features merged from the Guardian section. The key achievements were:

1. **Enhanced Parent Dashboard** - Full feature-rich dashboard with 6 new components
2. **AI Practice Assistant** - Generates personalized 15-minute practice plans based on skill analysis
3. **Medical Information Section** - Merged from Guardian, full CRUD for medical profiles
4. **Guardian Settings** - Merged from Guardian, privacy and consent management
5. **Guardian Section Removed** - Consolidated all functionality into Parent Dashboard

---

## Detailed Changes

### 1. Parent Dashboard Complete Overhaul

**Files Created:**

- `apps/web/src/app/orgs/[orgId]/parents/components/child-card.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/weekly-schedule.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/ai-practice-assistant.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/medical-info.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/components/guardian-settings.tsx`

**Files Modified:**

- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

**Files Deleted:**

- `apps/web/src/app/orgs/[orgId]/guardian/medical/page.tsx`
- `apps/web/src/app/orgs/[orgId]/guardian/settings/page.tsx`
- Entire `guardian/` directory

---

### 2. Component Details

#### ChildCard (`child-card.tsx`)

```typescript
// Features:
- Player avatar with initials
- Overall performance score (0-100%) with progress bar
- Top 3 strengths with 5-star ratings
- Training attendance % (color-coded: >80% green, >60% amber, else red)
- Match attendance % (same color coding)
- Development goals preview (max 2 shown) with status badges
- Parent action buttons for goals
- Injury status (active count or "All Clear" badge)
- Review status badge (Complete/Due Soon/Overdue)
- "View Full Passport" button linking to player detail page
```

#### CoachFeedback (`coach-feedback.tsx`)

```typescript
// Features:
- Queries passport data for coach notes
- Displays latest 3 notes per child
- Styled cards with blue accent border
- Shows coach name and date
- Filters out children with no notes
```

#### WeeklySchedule (`weekly-schedule.tsx`)

```typescript
// Features:
- 7-day calendar grid (Mon-Sun)
- Mock data generator for training/match events
- Color-coded events (blue=training, green=match)
- Time display with clock icon
- Stats summary (total training sessions, total matches)
- "Coming soon" banner for real schedule integration
```

#### AIPracticeAssistant (`ai-practice-assistant.tsx`)

```typescript
// Features:
- Child selection dropdown
- Skill analysis to find weakest areas
- Sport-specific drill database:
  - Soccer: Wall Pass, Cone Weave, Target Practice, Throw & Control
  - GAA: Wall Hand Pass, Kick Pass Targets, High Catch Practice
  - Rugby: Spiral Pass, High Ball Catching
  - Generic: Quick Feet, Single Leg Balance
- Generates 3 × 5-minute drills (15 mins total)
- Each drill includes:
  - Name and duration
  - Equipment list
  - Step-by-step instructions
  - Success metrics
- AI coaching tip personalized to child
- Weekly progress checklist
- Share button for sending plan
```

#### MedicalInfo (`medical-info.tsx`)

```typescript
// Merged from Guardian medical page
// Features:
- Grid view of all children with medical status
- Color-coded cards:
  - Red border: Missing medical profile
  - Amber border: Has allergies or conditions
  - Green border: Complete and healthy
- Status badges (Complete/Missing)
- Emergency contact (ICE) display
- Allergy/Medication/Condition badges with counts
- Full medical form dialog with:
  - Primary & Secondary emergency contacts (required)
  - Blood type selector (A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown)
  - Insurance coverage toggle
  - Family doctor info
  - Allergies list (add/remove with badges)
  - Current medications list
  - Medical conditions list
  - Additional notes
- Info banner explaining data sharing with coaches
```

#### GuardianSettings (`guardian-settings.tsx`)

```typescript
// Merged from Guardian settings page
// Features:
- Button in header: "Guardian Settings"
- Dialog with:
  - Guardian profile info (name, email, phone, verification status)
  - Children & privacy settings card
  - Per-child settings:
    - Name, DOB, relationship badge
    - Primary contact badge
    - Cross-organization sharing toggle
    - Parental responsibility status
    - Collection from training permission
  - Info card explaining cross-org sharing
```

---

### 3. Parent Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Your Family's Journey                    [Guardian Settings] │
│ Tracking X children in [Organization]                       │
│ Welcome back, [Guardian Name]!                              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │Children │ │Reviews  │ │Due Soon │ │Overdue  │            │
│ │ Tracked │ │Complete │ │         │ │         │            │
│ │    3    │ │    2    │ │    1    │ │    0    │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Your Children                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │  Child Card  │ │  Child Card  │ │  Child Card  │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│ Weekly Schedule                                             │
│ [Mon][Tue][Wed][Thu][Fri][Sat][Sun]                        │
├─────────────────────────────────────────────────────────────┤
│ Latest Coach Feedback                                       │
│ (Notes cards per child)                                     │
├─────────────────────────────────────────────────────────────┤
│ Medical Information                        [X incomplete]   │
│ ┌────────────────┐ ┌────────────────┐                      │
│ │ Child 1 ✓     │ │ Child 2 ⚠      │                      │
│ │ Complete      │ │ Missing        │                      │
│ │ [Update]      │ │ [Add Medical]  │                      │
│ └────────────────┘ └────────────────┘                      │
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────────┐ ┌────────────────────┐              │
│ │ AI Practice        │ │ Coming Soon        │              │
│ │ Assistant          │ │ • Schedule         │              │
│ │ [Select Child ▼]   │ │ • Notifications    │              │
│ │ [Generate Plan]    │ │ • PDF Export       │              │
│ └────────────────────┘ └────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Documentation Updated

**Files Modified:**

- `docs/OUTSTANDING_FEATURES.md` - Updated to v3.3
  - Parent Dashboard marked ✅ Complete
  - Sprint D marked ✅ Complete
  - All parent features marked complete with component locations
  - Added detailed completion notes for Dec 22

---

## Data Flow Summary

### Parent Dashboard Data Loading:

```
1. Parent navigates to /orgs/[orgId]/parents
   ↓
2. useGuardianChildrenInOrg hook:
   - Queries guardianIdentities for current user
   - Queries guardianPlayerLinks for children
   - Queries orgPlayerEnrollments for org-specific data
   ↓
3. Each section queries additional data:
   - ChildCard → passport data per child
   - CoachFeedback → coach notes from passport
   - MedicalInfo → medicalProfiles.getAllForOrganization
   - AIPracticeAssistant → passport skills for analysis
   ↓
4. GuardianSettings (in header):
   - Queries guardianPlayerLinks for privacy settings
   - Updates via updateLinkConsent mutation
```

### AI Practice Plan Generation:

```
1. Parent selects child in dropdown
   ↓
2. Query passport data for selected child
   ↓
3. Click "Generate Practice Plan"
   ↓
4. Analyze skills to find weakest (lowest rating)
   ↓
5. Look up sport from passport (soccer/gaa/rugby/generic)
   ↓
6. Select matching drill from DRILL_DATABASE
   ↓
7. Add 2 additional drills from same sport
   ↓
8. Generate personalized AI tip
   ↓
9. Display in modal dialog with:
   - Focus skill and weekly goal
   - Recommended schedule (Tue/Thu/Sat)
   - 3 drill cards with full details
   - Progress checklist
```

---

## Testing Notes

### To Test Parent Dashboard:

1. Login as user with parent role or linked guardian
2. Navigate to /orgs/[orgId]/parents
3. Verify:
   - Header shows child count and guardian name
   - Summary stats display correctly
   - Child cards show performance data
   - Weekly schedule renders 7 days
   - Coach feedback shows recent notes
   - Medical info shows profile status per child

### To Test Medical Info:

1. Click "Add Medical Info" on incomplete child
2. Fill required emergency contacts
3. Add allergies (type + Enter or click +)
4. Add medications and conditions
5. Save → Card updates to "Complete" with green border
6. Click "Update" to modify existing profile

### To Test Guardian Settings:

1. Click "Guardian Settings" button in header
2. Verify profile info displays
3. Toggle cross-org sharing for a child
4. Verify success toast appears
5. Verify sharing info banner updates

### To Test AI Practice Assistant:

1. Select a child from dropdown
2. Click "Generate Practice Plan"
3. Wait for "Analyzing skills..." animation
4. Verify dialog shows:
   - Weekly focus (weakest skill)
   - 3 drills matching child's sport
   - Equipment and instructions
   - AI coaching tip

---

## Files Changed Summary

| File                                                                         | Type     | Description                        |
| ---------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `apps/web/src/app/orgs/[orgId]/parents/page.tsx`                             | Modified | Complete dashboard overhaul        |
| `apps/web/src/app/orgs/[orgId]/parents/components/child-card.tsx`            | Created  | Child overview cards               |
| `apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback.tsx`        | Created  | Coach notes display                |
| `apps/web/src/app/orgs/[orgId]/parents/components/weekly-schedule.tsx`       | Created  | 7-day calendar                     |
| `apps/web/src/app/orgs/[orgId]/parents/components/ai-practice-assistant.tsx` | Created  | Practice plan generator            |
| `apps/web/src/app/orgs/[orgId]/parents/components/medical-info.tsx`          | Created  | Medical profiles (from Guardian)   |
| `apps/web/src/app/orgs/[orgId]/parents/components/guardian-settings.tsx`     | Created  | Privacy settings (from Guardian)   |
| `apps/web/src/app/orgs/[orgId]/guardian/`                                    | Deleted  | Entire directory removed           |
| `docs/OUTSTANDING_FEATURES.md`                                               | Modified | Updated to v3.3, Sprint D complete |
