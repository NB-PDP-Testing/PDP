# Outstanding Features - PDP/PlayerARC System

> **Last Updated:** 2025-12-22
> **Status:** Comprehensive backlog for MVP parity and enhancement
> **Focus Area:** Skills, Player Passport, and Coach/Player/Parent Interactions

## Overview

This document tracks all outstanding features that need to be built to achieve MVP parity and beyond. Features are organized by priority and complexity, with special focus on the skills system, player passport features, and the interaction flows between coaches, players, and parents.

---

## System Architecture Summary

| Component                   | Current State       | Notes                                                                                |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| **Authentication**          | ✅ Complete         | Better Auth with Google/Microsoft OAuth                                              |
| **User Management**         | ✅ Complete         | Role assignment, approval workflow, functional roles                                 |
| **Identity System**         | ✅ Complete         | Platform-level `playerIdentities`, `guardianIdentities`, `guardianPlayerLinks`       |
| **Organization Enrollment** | ✅ Complete         | `orgPlayerEnrollments` with org-scoped membership                                    |
| **Sport Passports**         | ✅ Backend Complete | `sportPassports` table with positions, ratings, notes                                |
| **Skill Assessments**       | ✅ Backend Complete | `skillAssessments` table with temporal tracking                                      |
| **Skill Definitions**       | ✅ Backend Complete | `skillDefinitions`, `skillCategories` reference data                                 |
| **Skill Benchmarks**        | ✅ Backend Complete | `skillBenchmarks` with NGB source attribution                                        |
| **Voice Notes**             | ✅ Complete         | Recording, transcription, insights, **now applies skill ratings to player profiles** |
| **Coach Assessment Page**   | ✅ Complete         | Player filtering, team-scoped access, assessment history                             |
| **Player Passport View**    | ✅ View Complete    | All sections implemented: basic info, skills, goals, notes, positions, emergency     |
| **Parent Dashboard**        | ✅ Complete         | Full dashboard with child cards, coach feedback, schedule, AI practice assistant     |
| **Coach Dashboard**         | ✅ Complete         | Team analytics, AI recommendations, quick actions, players list, session plans       |
| **Goals System**            | ✅ Complete         | Full dashboard with CRUD, milestones, skill linking, bulk team goals                 |
| **Injuries System**         | ✅ Complete         | Full coach injury dashboard + org-wide history, parent view pending                  |
| **Player Self-Access**      | ❌ Design Only      | Schema designed, no implementation                                                   |
| **PDF/Sharing**             | ✅ Complete         | PDF generation, download, and sharing via WhatsApp/Email/Native                      |
| **Analytics Dashboard**     | ❌ Not Started      | Backend query exists, no UI                                                          |

---

## Skills & Player Passport System Status

### Backend Implementation ✅ COMPLETE

The new identity-based skills and passport system is fully implemented in the backend:

| Table                  | Purpose                                                 | Status      |
| ---------------------- | ------------------------------------------------------- | ----------- |
| `playerIdentities`     | Platform-level player identity (youth + adult)          | ✅ Complete |
| `guardianIdentities`   | Platform-level guardian/parent identity                 | ✅ Complete |
| `guardianPlayerLinks`  | N:M guardian-player relationships                       | ✅ Complete |
| `orgPlayerEnrollments` | Organization-specific player membership                 | ✅ Complete |
| `sportPassports`       | Per-sport skill tracking with positions                 | ✅ Complete |
| `skillAssessments`     | Point-in-time skill assessment records                  | ✅ Complete |
| `skillDefinitions`     | Sport-specific skill definitions with descriptors       | ✅ Complete |
| `skillCategories`      | Skill groupings (Technical, Tactical, Physical, Mental) | ✅ Complete |
| `skillBenchmarks`      | NGB benchmark standards by age/gender/level             | ✅ Complete |
| `passportGoals`        | Development goals linked to passports                   | ✅ Complete |
| `playerInjuries`       | Cross-org injury tracking with visibility controls      | ✅ Complete |
| `teamPlayerIdentities` | Team membership (replaces legacy `teamPlayers`)         | ✅ Complete |

### Backend Models Available

| Model File            | Key Functions                                                                                                                                                  | Status      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `skillAssessments.ts` | `recordAssessment`, `getLatestAssessmentsForPassport`, `getSkillHistory`, `recordAssessmentWithBenchmark`, `getClubBenchmarkAnalytics`, `getAssessmentHistory` | ✅ Complete |
| `sportPassports.ts`   | `getFullPlayerPassportView`, `createPassport`, `updatePositions`, `updateRatings`, `findOrCreatePassport`                                                      | ✅ Complete |
| `passportGoals.ts`    | Full CRUD for development goals                                                                                                                                | ✅ Complete |
| `playerInjuries.ts`   | `reportInjury`, `updateInjuryStatus`, `setReturnToPlayProtocol`, `getActiveInjuriesForOrg`                                                                     | ✅ Complete |
| `referenceData.ts`    | Sports, age groups, skill categories, skill definitions management                                                                                             | ✅ Complete |
| `coaches.ts`          | `getCoachAssignmentsWithTeams`, `debugCoachData`                                                                                                               | ✅ Complete |

### Frontend Implementation Status

| Component                  | Status       | Notes                                                        |
| -------------------------- | ------------ | ------------------------------------------------------------ |
| Player Passport Page       | ✅ Complete  | Full view with all sections, role-based permissions          |
| Basic Info Section         | ✅ Complete  | Player details, teams, parents, attendance, injury notes     |
| Skills Section             | ✅ Complete  | Sport-specific skill displays (Soccer, Rugby, GAA, Generic)  |
| Goals Section              | ✅ Complete  | View goals with status, progress, milestones, parent help    |
| Notes Section              | ✅ Complete  | Coach, parent, and player notes with styled cards            |
| Positions/Fitness Section  | ✅ Complete  | Position preferences, fitness metrics with progress bars     |
| Emergency Contacts Section | ✅ Complete  | Full CRUD for adult players, view for coaches                |
| Benchmark Comparison       | ✅ Complete  | `benchmark-comparison.tsx` integrated into passport          |
| Skill Rating Sliders       | ✅ Complete  | `rating-slider.tsx` with RatingBar, RatingDots               |
| Skill Assessment Form      | ✅ Complete  | Coach assess page with individual + batch modes              |
| Coach Assess Page          | ✅ Complete  | Team filtering, player selection, assessment history         |
| Radar/Spider Charts        | ❌ Not Built | MVP had `SkillChart` - needs porting                         |
| Goals Creation/Edit UI     | ✅ Complete  | Full wizard with skill linking, milestones                   |
| Goals Dashboard            | ✅ Complete  | `/orgs/[orgId]/coach/goals` with stats, filters, bulk create |

---

## Coach-Player-Parent Interaction Features

### Coach Features

| Feature                      | Status      | Backend                        | Frontend                 | Priority |
| ---------------------------- | ----------- | ------------------------------ | ------------------------ | -------- |
| View assigned players        | ✅ Complete | `getCoachAssignmentsWithTeams` | Coach assess page        | -        |
| Filter by team               | ✅ Complete | Team membership queries        | Team dropdown            | -        |
| Search players               | ✅ Complete | Client-side filtering          | Search input             | -        |
| View assessment history      | ✅ Complete | `getAssessmentHistory`         | History display          | -        |
| **Record skill assessment**  | ✅ Complete | ✅ `recordAssessment`          | Full UI in coach assess  | -        |
| **Create development goals** | ✅ Complete | ✅ `passportGoals` CRUD        | Goals dashboard + wizard | -        |
| Voice notes with AI          | ✅ Complete | OpenAI Whisper + GPT-4o        | Full dashboard           | -        |
| Apply skill rating insights  | ✅ Complete | Creates skillAssessments       | Works for skill ratings  | -        |
| Apply other insights         | ⚠️ Partial  | Skill ratings work             | Goals/injuries not wired | MEDIUM   |
| Report injuries              | ✅ Complete | ✅ `playerInjuries` CRUD       | Full injury dashboard    | -        |
| View player passport         | ✅ Complete | Full passport query            | Passport page            | -        |

### Parent Features

| Feature                       | Status      | Backend                     | Frontend                     | Priority |
| ----------------------------- | ----------- | --------------------------- | ---------------------------- | -------- |
| View linked children          | ✅ Complete | `guardianPlayerLinks`       | Child cards grid             | -        |
| View child passport           | ✅ Complete | Full passport query         | Read-only view               | -        |
| **Enhanced parent dashboard** | ✅ Complete | Backend ready               | Full component suite         | -        |
| Child overview cards          | ✅ Complete | Data available              | `child-card.tsx`             | -        |
| Top strengths display         | ✅ Complete | Skills data available       | Star ratings in cards        | -        |
| Attendance visualization      | ✅ Complete | Attendance in enrollment    | Training/Match % display     | -        |
| Coach feedback section        | ✅ Complete | `coachNotes` in passport    | `coach-feedback.tsx`         | -        |
| Goals view (parent-visible)   | ✅ Complete | `parentCanView` flag exists | Goals in child cards         | -        |
| Injury status for children    | ✅ Complete | `playerInjuries` data       | Active injury badge in cards | -        |
| Weekly schedule               | ✅ Complete | Mock data (tables planned)  | `weekly-schedule.tsx`        | -        |
| AI Practice Assistant         | ✅ Complete | Skills data for analysis    | `ai-practice-assistant.tsx`  | -        |

### Player Self-Access Features

| Feature                  | Status         | Notes                                    |
| ------------------------ | -------------- | ---------------------------------------- |
| Player login capability  | ❌ Design Only | `playerIdentities.userId` field exists   |
| Player passport view     | ❌ Design Only | Requires access grant flow               |
| Player self-assessment   | ❌ Design Only | Schema supports `assessmentType: "self"` |
| Guardian access approval | ❌ Design Only | `playerAccessGrants` table designed      |
| Club policy settings     | ❌ Design Only | `playerAccessPolicies` table designed    |

---

## HIGH PRIORITY - Core Missing UI

### 1. Skill Assessment Rating Sliders ✅ COMPLETE

| Aspect        | Status                                           |
| ------------- | ------------------------------------------------ |
| **Backend**   | ✅ `skillAssessments.ts` with full CRUD          |
| **UI**        | ✅ Full implementation in coach assess page      |
| **Location**  | `/orgs/[orgId]/coach/assess`                     |
| **Component** | `rating-slider.tsx` with RatingSlider, RatingBar |

**Completed Features:**

- ✅ Rating slider component (1-5 scale with gradient colors)
- ✅ Skill assessment form with individual save per skill
- ✅ Before/after comparison display (previous value shown)
- ✅ Benchmark status integration (above/at/below benchmark)
- ✅ Batch assessment mode for team sessions
- ✅ Progress insights (improving/declining skills)
- ✅ Assessment history display
- ✅ General development notes

**Components:**

- `RatingSlider` - Interactive slider with labels
- `RatingDots` - Dot-based rating display
- `RatingBar` - Progress bar style display

---

### 2. Goals Dashboard for Coaches ✅ COMPLETE

| Aspect       | Status                                           |
| ------------ | ------------------------------------------------ |
| **Backend**  | ✅ `passportGoals.ts` with full CRUD             |
| **UI**       | ✅ Full dashboard at `/orgs/[orgId]/coach/goals` |
| **Location** | `/orgs/[orgId]/coach/goals`                      |

**Completed Features:**

- ✅ Goals dashboard with stats (total, in progress, completed, avg progress)
- ✅ Goal creation dialog with player selection
- ✅ Bulk team goal creation (create same goal for entire team)
- ✅ Milestone tracking with completion
- ✅ Add new milestones dynamically
- ✅ Progress visualization (0-100% with progress bars)
- ✅ Target date management
- ✅ Link goals to specific skills (`linkedSkills` field)
- ✅ Parent visibility toggle
- ✅ Status management (not started, in progress, completed, on hold, cancelled)
- ✅ Category filtering (technical, tactical, physical, mental, social)
- ✅ Priority badges (high, medium, low)
- ✅ Search and filter goals
- ✅ Goal detail dialog with full editing

---

### 3. Apply Voice Note Insights to Player Profiles

| Aspect             | Status                                                  |
| ------------------ | ------------------------------------------------------- |
| **Skill Ratings**  | ✅ Complete - creates `skillAssessments` records        |
| **Skill Progress** | ✅ Complete - parses ratings or creates goals           |
| **Injuries**       | ❌ Not wired - insights created but not routed to table |
| **Behavior/Perf**  | ❌ Not wired - insights created but not routed to notes |

**Recently Completed (Dec 22):**

- Skill rating insights now create `skillAssessments` records
- Word number parsing ("three" → 3, "four" → 4)
- Patterns supported: "set to 3", "rating 4/5", "improved to 3"
- Player passport now displays skills from assessments correctly

**Still Needed:**

- Route injury insights → `playerInjuries` table
- Route behavior/performance → player notes
- Add "Apply All" / "Reject All" buttons
- Edit insight before applying
- Success/warning message banners

---

### 4. Parent Dashboard Enhancement ✅ COMPLETE

| Aspect         | Status                                            |
| -------------- | ------------------------------------------------- |
| **Backend**    | ✅ `guardianPlayerLinks` for parent-child linking |
| **UI**         | ✅ Full dashboard implementation                  |
| **Location**   | `/orgs/[orgId]/parents`                           |
| **Components** | 4 new components in `/parents/components/`        |

**Completed Features (Dec 22):**

- ✅ "Your Family's Journey" gradient header with child count
- ✅ Summary stats cards (Children, Reviews Complete, Due Soon, Overdue)
- ✅ Children overview cards with:
  - Overall performance score with progress bar
  - Top 3 strengths with 5-star ratings
  - Training/Match attendance percentages (color-coded)
  - Current development goals with parent actions
  - Injury status indicator (active count or "All Clear")
  - Review status badge (Complete/Due Soon/Overdue)
- ✅ Coach feedback section with notes per child
- ✅ Weekly schedule calendar (7-day grid with mock data)
- ✅ AI Practice Assistant:
  - Child selection dropdown
  - Skill analysis to find weakest areas
  - Sport-specific drill database (Soccer, GAA, Rugby, Generic)
  - 3 × 5-minute drill plans
  - Equipment lists, instructions, success metrics
  - AI coaching tips
  - Progress checklist
  - Share button

**Components Created:**

- `child-card.tsx` - Full child overview card
- `coach-feedback.tsx` - Coach notes display
- `weekly-schedule.tsx` - 7-day calendar grid
- `ai-practice-assistant.tsx` - Practice plan generator

---

### 5. Radar/Spider Chart for Skills

| Aspect            | Status                    |
| ----------------- | ------------------------- |
| **Backend**       | ✅ Skills data available  |
| **UI**            | ❌ No chart visualization |
| **MVP Reference** | `SkillChart` component    |

**Features Needed:**

- Radar chart showing skill categories
- Overlay with benchmark comparison
- Historical progression view
- Team average comparison option
- Age group comparison option

---

### 6. Guardian Identity Claiming Flow

| Aspect      | Status                                  |
| ----------- | --------------------------------------- |
| **Backend** | ✅ `linkGuardianToUser` mutation exists |
| **UI**      | ❌ No claiming UI during signup         |
| **Impact**  | Guardians can't claim imported profiles |

**Features Needed:**

- Post-signup check for matching guardian identity
- "We found your profile" dialog
- Verification/confirmation step
- Link userId to existing guardianIdentity
- Cross-org consent settings

---

## MEDIUM PRIORITY - Enhanced Functionality

### 7. Medical Profiles Dashboard

| Aspect       | Status                            |
| ------------ | --------------------------------- |
| **Backend**  | ✅ `medicalProfiles` table exists |
| **UI**       | ❌ No page built                  |
| **Location** | `/orgs/[orgId]/admin/medical`     |

**Features Needed:**

- Medical profile viewing (allergies, conditions, medications)
- Emergency contact management
- Blood type, doctor info display
- Privacy controls (coach vs admin visibility)

---

### 8. PDF Generation & Sharing ✅ COMPLETE

| Aspect       | Status                                          |
| ------------ | ----------------------------------------------- |
| **Backend**  | ✅ `pdf-lib` library integrated                 |
| **UI**       | ✅ ShareModal component                         |
| **Location** | `/orgs/[orgId]/players/[playerId]` Share button |

**Completed Features (Dec 22):**

- ✅ Player passport PDF generation with `pdf-lib`
- ✅ PDF includes: player info, skill ratings (circle indicators), goals, coach notes, medical summary
- ✅ Download PDF functionality
- ✅ Preview PDF in new tab
- ✅ Share via WhatsApp (with PDF attachment on mobile via Web Share API)
- ✅ Share via Email (with PDF attachment on mobile via Web Share API)
- ✅ Share via Device (native share sheet)
- ✅ Copy link to passport page
- ✅ Session plan PDF generation for Smart Coach dashboard
- ✅ Mobile detection with fallback behavior for desktop

**Components Created:**

- `pdf-generator.ts` - PDF generation service with `generatePassportPDF()`, `generateSessionPlanPDF()`
- `share-modal.tsx` - Share dialog with download, preview, and share options
- Share helper functions: `shareViaWhatsApp()`, `shareViaEmail()`, `shareViaNative()`

---

### 9. Analytics Dashboard

| Aspect       | Status                                      |
| ------------ | ------------------------------------------- |
| **Backend**  | ✅ `getClubBenchmarkAnalytics` query exists |
| **UI**       | ❌ No page built                            |
| **Location** | `/orgs/[orgId]/admin/analytics`             |

**Features Needed:**

- Club-wide skill distribution charts
- Team comparison visualizations
- Progress over time graphs
- Benchmark comparison across age groups
- Export analytics data

---

### 10. Team Roster Management UI

| Aspect       | Status                                      |
| ------------ | ------------------------------------------- |
| **Backend**  | ✅ `teamPlayerIdentities.ts` with full CRUD |
| **UI**       | ⚠️ Basic team list only                     |
| **Location** | `/orgs/[orgId]/admin/teams/[teamId]`        |

**Features Needed:**

- Drag-and-drop roster management
- Bulk player assignment
- Transfer between teams
- Position visualization
- Coach assignment interface

---

### 11. Voice Notes UX Enhancements

| Aspect        | Status                                           |
| ------------- | ------------------------------------------------ |
| **Core**      | ✅ Recording + AI works                          |
| **Missing**   | Multiple UX features from MVP                    |
| **Reference** | `VOICE_NOTES_MVP_COMPARISON_AND_ENHANCEMENTS.md` |

**Features Needed:**

- Apply All / Reject All buttons
- Edit insight before applying
- Real-time transcription display while speaking
- Search & filter notes
- View source note link from insight
- Coach stats panel (approved/rejected/edited counts)
- Export to CSV
- Success/warning animated banners
- Recently reviewed log

---

### 12. Emergency Contacts for Adult Players ✅ COMPLETE

| Aspect           | Status                                                   |
| ---------------- | -------------------------------------------------------- |
| **Backend**      | ✅ `playerEmergencyContacts.ts` with full CRUD           |
| **Adult Player** | ✅ Can manage own contacts in player dashboard           |
| **Coach View**   | ✅ Sees contacts on adult player passport (read-only)    |
| **Match Day**    | ✅ `/orgs/[orgId]/coach/match-day` with ICE quick access |

**Completed Features (Dec 22):**

- Add/edit/delete emergency contacts with modal dialogs
- Priority ordering with up/down arrows
- ICE badge for priority 1-2 contacts
- Relationship dropdown (spouse, parent, sibling, etc.)
- Phone number with click-to-call links
- Match day view for coaches with all adult player ICE contacts
- Search and team filter on match day view

---

## LOW PRIORITY - Nice to Have

### 13. Player Self-Access System

| Aspect      | Status                                        |
| ----------- | --------------------------------------------- |
| **Design**  | ✅ Complete in `PLAYER_SELF_ACCESS_DESIGN.md` |
| **Backend** | ❌ Not implemented                            |
| **UI**      | ❌ Not implemented                            |

**Features Needed:**

- `playerAccessPolicies` table for club settings
- `playerAccessGrants` table for guardian permissions
- `playerAccountLinks` table for player accounts
- Player dashboard with own passport view
- Guardian approval workflow
- Age-based access controls

---

### 14. Reference Data Management (Admin)

| Aspect      | Status                  |
| ----------- | ----------------------- |
| **Backend** | ✅ `referenceData.ts`   |
| **UI**      | ❌ No admin interface   |
| **Impact**  | Admin-only, low urgency |

**Features Needed:**

- Sports management
- Age group management
- Skill category editing
- Skill definition management
- Benchmark data management

---

### 15. Parent Notification System

| Aspect      | Status       |
| ----------- | ------------ |
| **Backend** | ❌ Not built |
| **UI**      | ❌ Not built |

**Features Needed:**

- Notify parents when insights applied
- Injury notifications
- Review due reminders
- Parent-friendly message templates
- Notification preferences per guardian

---

### 16. Team Briefing Generator

| Aspect      | Status       |
| ----------- | ------------ |
| **Backend** | ❌ Not built |
| **UI**      | ❌ Not built |

**Features Needed:**

- Auto-generate weekly briefing from voice notes
- Injury summary
- Top performers
- Focus areas for next week
- Shareable parent report

---

### 17. Multi-Sport Passport Views

| Aspect      | Status                                                  |
| ----------- | ------------------------------------------------------- |
| **Backend** | ✅ `sportPassports` supports multiple sports per player |
| **UI**      | ❌ Single sport view only                               |

**Features Needed:**

- Sport switcher/tabs in passport view
- Cross-sport skill comparison
- Combined development view
- Sport-specific position displays

---

### 18. Audit Logging

| Aspect            | Status                            |
| ----------------- | --------------------------------- |
| **Backend**       | ⚠️ `approvalActions` table exists |
| **UI**            | ❌ No audit viewer                |
| **MVP Reference** | `AuditLogViewer`                  |

**Features Needed:**

- Track all data changes
- User action logging
- Admin audit dashboard
- Export audit logs
- Player data access logging

---

## Implementation Checklist by Sprint

### Sprint A: Core Skill Assessment ✅ COMPLETE

- [x] Port `RatingSlider` component from MVP ✅
- [x] Create skill assessment form component ✅
- [x] Wire to `recordAssessmentWithBenchmark` mutation ✅
- [x] Add assessment capability to coach assess page ✅
- [x] Display before/after comparison ✅
- [x] Show benchmark indicators ✅
- [x] Add batch assessment mode for team sessions ✅

### Sprint B: Goals System ✅ COMPLETE

- [x] Create goals dashboard page ✅
- [x] Goal creation wizard with skill linking ✅
- [x] Milestone tracking interface ✅
- [x] Progress visualization ✅
- [x] Bulk team goal creation ✅
- [x] Parent visibility controls ✅

### Sprint C: Voice Notes Integration (1 week)

- [x] Implement skill rating routing to player profiles ✅ (Dec 22)
- [ ] Create injury records from injury insights
- [ ] Update player notes from behavior insights
- [ ] Apply All / Reject All buttons
- [ ] Edit insight before applying
- [ ] Success/warning message banners

### Sprint D: Parent Experience ✅ COMPLETE

- [x] Enhanced parent dashboard with child cards ✅
- [x] Top strengths and performance display ✅
- [x] Goals view for parents ✅
- [x] Injury view for parents ✅
- [x] Coach feedback section ✅
- [x] Link to full passport views ✅
- [x] Weekly schedule calendar ✅
- [x] AI Practice Assistant ✅

### Sprint E: Visualization & Analytics (1 week)

- [ ] Skill radar charts
- [ ] Analytics dashboard
- [ ] Benchmark comparison charts
- [ ] Progress over time visualization

### Sprint F: Export & Sharing ✅ COMPLETE

- [x] PDF generation library integration (`pdf-lib`) ✅
- [x] Player passport PDF template ✅
- [x] Session plan PDF template ✅
- [x] Share modal component ✅
- [x] Email/WhatsApp sharing ✅
- [x] Download functionality ✅
- [x] Preview in new tab ✅

### Sprint G: Advanced Features (1+ weeks)

- [ ] Guardian identity claiming flow
- [ ] Team roster management
- [ ] Medical profiles dashboard
- [ ] Parent notification system
- [ ] Player self-access system

---

## Backend Status Summary

### Complete Models (Backend Ready, UI Needed)

| Model                        | CRUD Status  | Key Functions                                |
| ---------------------------- | ------------ | -------------------------------------------- |
| `passportGoals.ts`           | ✅ Full CRUD | Goal creation, milestones, progress tracking |
| `playerInjuries.ts`          | ✅ Full CRUD | Injury reporting, return-to-play protocol    |
| `orgInjuryNotes.ts`          | ✅ Full CRUD | Organization-specific injury notes           |
| `skillAssessments.ts`        | ✅ Full CRUD | Assessment recording with benchmarks         |
| `skillBenchmarks.ts`         | ✅ Full CRUD | NGB benchmark management                     |
| `playerEmergencyContacts.ts` | ✅ Full CRUD | Adult player emergency contacts              |
| `orgGuardianProfiles.ts`     | ✅ Full CRUD | Guardian org preferences                     |
| `teamPlayerIdentities.ts`    | ✅ Full CRUD | Team roster management                       |
| `guardianIdentities.ts`      | ✅ Full CRUD | Guardian management + linking                |

### Complete UI (Working)

| Component              | Status      | Location                           |
| ---------------------- | ----------- | ---------------------------------- |
| Voice notes dashboard  | ✅ Working  | `/orgs/[orgId]/coach/voice-notes`  |
| Coach assessment page  | ✅ Working  | `/orgs/[orgId]/coach/assess`       |
| Coach injury tracking  | ✅ Working  | `/orgs/[orgId]/coach/injuries`     |
| Goals dashboard        | ✅ Complete | `/orgs/[orgId]/coach/goals`        |
| Match day ICE access   | ✅ Working  | `/orgs/[orgId]/coach/match-day`    |
| Adult player dashboard | ✅ Working  | `/orgs/[orgId]/player`             |
| Emergency contacts     | ✅ Working  | Player passport + match day        |
| User management        | ✅ Working  | Admin section                      |
| Player passport view   | ✅ Complete | `/orgs/[orgId]/players/[playerId]` |
| GAA import wizard      | ✅ Working  | Admin import                       |
| Benchmarks admin       | ✅ Working  | Admin section                      |
| Organization theming   | ✅ Working  | Org settings                       |
| **Parent dashboard**   | ✅ Complete | `/orgs/[orgId]/parents`            |

---

## Feature Count Summary

| Category                            | Count       | Status         |
| ----------------------------------- | ----------- | -------------- |
| **HIGH Priority (Core Missing UI)** | 2 features  | 🔴 Blocking    |
| **MEDIUM Priority (Enhanced)**      | 4 features  | 🟡 Important   |
| **LOW Priority (Nice to Have)**     | 6 features  | 🟢 Future      |
| **Backend Complete, UI Missing**    | 7+ models   | Ready to build |
| **Total Outstanding**               | 14 features |                |
| **Sprints Complete**                | 4 (A+B+D+F) | ✅ Done        |

---

## Key Architecture Notes

### Identity System (Implemented)

- **Platform-level**: `playerIdentities`, `guardianIdentities`, `guardianPlayerLinks`
- **Organization-level**: `orgPlayerEnrollments`, `orgGuardianProfiles`, `sportPassports`
- **Supports**: Youth players (guardian-managed) and adult players (self-managed)
- **Cross-org**: Player/guardian identities are reusable across organizations

### Sport Passport System (Implemented)

- One player can have multiple sport passports
- Each passport tracks positions, fitness, notes per sport
- Skill assessments are temporal (point-in-time records)
- Benchmarks enable comparison to NGB standards

### Voice Notes AI (Implemented)

- OpenAI Whisper for transcription
- GPT-4o for insight extraction with Zod schema validation
- Player name matching against organization roster
- 6 insight categories: injury, skill_progress, behavior, performance, attendance, team_culture

---

**Document Version:** 3.3
**Previous Update:** 2025-12-22
**Next Review:** After Sprint C (Voice Notes) + Sprint E (Visualization) completion

---

## Recent Development Log (December 22, 2024)

### Session 4: PDF Generation & Sharing (Dec 22 Late Evening)

- ✅ Added `pdf-lib` dependency for PDF generation
- ✅ Created `pdf-generator.ts` service with:
  - `generatePassportPDF()` - Full player passport PDF (A4, multi-page support)
  - `generateSessionPlanPDF()` - Training session plan PDF from AI coach
  - `downloadPDF()` - Download helper
  - `previewPDF()` - Preview in new tab
  - `shareViaWhatsApp()` - Uses Web Share API on mobile, fallback for desktop
  - `shareViaEmail()` - Uses Web Share API on mobile, mailto fallback
  - `shareViaNative()` - Device native share sheet
- ✅ Created `share-modal.tsx` component with:
  - PDF status indicator (generating/ready)
  - Download PDF button
  - Preview in new tab button
  - Share via device (native share)
  - Share via Email with address input
  - Share via WhatsApp (includes PDF on mobile)
  - Copy link to passport page
  - Info box showing what's included in PDF
- ✅ Fixed WinAnsi encoding error (replaced Unicode stars/emojis with ASCII)
- ✅ Skill ratings use colored circles instead of star characters
- ✅ Medical icons use ASCII: `[!]`, `[Rx]`, `[+]`, `[ICE]`
- ✅ WhatsApp sharing works on mobile via Web Share API with file attachment
- ✅ Desktop fallback: downloads PDF + opens WhatsApp with instructions

---

## Recent Development Log (December 22, 2024 - Earlier Sessions)

### Session 1: Voice Notes → Skill Assessments

- ✅ Voice notes can now update skill ratings via `skillAssessments`
- ✅ AI prompt improved to categorize `skill_rating` vs `skill_progress`
- ✅ Rating parsing supports: "rating 3", "set to 3", "level 3", word numbers
- ✅ Player profile `getFullPlayerPassportView` now transforms assessments to `Record<string, number>`
- ✅ TypeScript fixes for coach assess page optional properties

### Session 2: Emergency Contacts & Adult Player Dashboard

- ✅ Emergency contacts visible on coach's player passport view (adult players)
- ✅ Adult player dashboard shows full passport (skills, goals, benchmarks, contacts)
- ✅ Emergency contacts editable by adult players
- ✅ Match day ICE access for coaches at `/orgs/[orgId]/coach/match-day`

### Session 3: Comprehensive Feature Review (Dec 22 Evening)

**Confirmed Complete Systems:**

1. **Skill Assessments (Coach Assess Page)** - `/orgs/[orgId]/coach/assess`
   - ✅ Individual assessment mode with per-skill save
   - ✅ Batch/Team Session mode for multiple players at once
   - ✅ Rating slider component (1-5 scale with gradient colors)
   - ✅ Before/after comparison (previous rating shown)
   - ✅ Benchmark status integration (above/at/below)
   - ✅ Assessment history display with progress insights
   - ✅ Improving/declining skill tracking
   - ✅ General development notes saved to passport
   - ✅ Mark review complete functionality
   - ✅ Auto-select sport from team

2. **Goals Dashboard** - `/orgs/[orgId]/coach/goals`
   - ✅ Full CRUD with creation wizard
   - ✅ Bulk team goal creation
   - ✅ Milestone tracking with add/complete
   - ✅ Skill linking
   - ✅ Parent visibility toggle
   - ✅ Status management and filtering

3. **Coach Dashboard** - SmartCoachDashboard component
   - ✅ Team analytics cards with strengths/weaknesses
   - ✅ AI recommendations (GPT-4o)
   - ✅ Session plan generator with PDF sharing
   - ✅ Quick actions for all coach features
   - ✅ Team notes system
   - ✅ Sortable player list with filters

4. **Player Passport View** - All sections complete
   - ✅ Basic info, skills, goals, notes, positions, emergency contacts

5. **Injuries Dashboard** - `/orgs/[orgId]/coach/injuries`
   - ✅ Active injuries overview (org-wide alert card)
   - ✅ Player selection dropdown for injury history
   - ✅ Report new injury dialog with full form
   - ✅ Injury types: Strain, Sprain, Bruise, Cut, Fracture, Concussion, etc.
   - ✅ Body part selection (18+ options)
   - ✅ Side selection (left/right/both)
   - ✅ Severity levels: minor, moderate, severe, long_term
   - ✅ Status progression: active → recovering → cleared → healed
   - ✅ Status transition buttons
   - ✅ Date occurred + expected return dates
   - ✅ Treatment/management notes
   - ✅ Occurred during context (training/match/other sport/non-sport)
   - ✅ Cross-org visibility setting
   - ✅ Complete org-wide injury history with filters
   - ✅ Days out calculation display
