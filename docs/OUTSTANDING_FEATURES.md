# Outstanding Features - PDP/PlayerARC System

> **Last Updated:** 2025-12-29
> **Status:** Comprehensive backlog aligned with GitHub Project #4
> **Focus Area:** Remaining features after major MVP parity work complete

## Overview

This document tracks all outstanding features that need to be built. The system has achieved significant MVP parity, with most core features now complete. This document reflects the current GitHub project backlog status and actual implementation state.

---

## System Architecture Summary

| Component                   | Current State        | Notes                                                                                |
| --------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| **Authentication**          | ✅ Complete          | Better Auth with Google/Microsoft OAuth                                              |
| **User Management**         | ✅ Complete          | Role assignment, approval workflow, functional roles                                 |
| **Identity System**         | ✅ Complete          | Platform-level `playerIdentities`, `guardianIdentities`, `guardianPlayerLinks`       |
| **Organization Enrollment** | ✅ Complete          | `orgPlayerEnrollments` with org-scoped membership                                    |
| **Sport Passports**         | ✅ Complete          | `sportPassports` table with positions, ratings, notes                                |
| **Skill Assessments**       | ✅ Complete          | Coach assess page with rating sliders, batch mode, history                           |
| **Skill Definitions**       | ✅ Complete          | `skillDefinitions`, `skillCategories` reference data                                 |
| **Skill Benchmarks**        | ✅ Complete          | `skillBenchmarks` with NGB source attribution                                        |
| **Skill Radar Charts**      | ✅ Complete          | `skill-radar-chart.tsx` with benchmark overlay                                       |
| **Voice Notes**             | ✅ Complete          | Recording, transcription, insights, applies skill ratings to player profiles         |
| **Coach Assessment Page**   | ✅ Complete          | Player filtering, team-scoped access, assessment history                             |
| **Coach Injuries Page**     | ✅ Complete          | Full injury tracking with return-to-play protocol                                    |
| **Coach Medical Page**      | ✅ Complete          | Medical profiles dashboard                                                           |
| **Coach Goals Page**        | ✅ Complete          | Full dashboard with CRUD, milestones, skill linking, bulk team goals                 |
| **Coach Match Day**         | ✅ Complete          | ICE contacts quick access for coaches                                                |
| **Player Passport View**    | ✅ Complete          | All sections: basic info, skills, goals, notes, positions, emergency, share modal    |
| **Parent Dashboard**        | ✅ Complete          | Child cards, coach feedback, schedule, AI practice assistant, medical info           |
| **Adult Player Dashboard**  | ✅ Complete          | Full passport view with self-managed emergency contacts                              |
| **Goals System**            | ✅ Complete          | Full dashboard with CRUD, milestones, skill linking, bulk team goals                 |
| **Injuries System**         | ✅ Complete          | Full coach injury dashboard + org-wide history                                       |
| **PDF/Sharing**             | ✅ Complete          | PDF generation, download, and sharing via WhatsApp/Email/Native                      |
| **Analytics Dashboard**     | ✅ Complete          | Full dashboard with charts, filters, and player insights                             |
| **Player Self-Access**      | ✅ Backend + Admin   | Schema, backend models, and admin settings complete                                  |
| **Emergency Contacts**      | ✅ Complete          | Adult player self-management + coach match-day view                                  |

---

## GitHub Project #4 Status Summary

**Repository:** https://github.com/orgs/NB-PDP-Testing/projects/4

| Status      | Count | Items                                                                                              |
| ----------- | ----- | -------------------------------------------------------------------------------------------------- |
| **Done**    | 11    | Goals, Analytics, PDF/Sharing, Skill Sliders, Legacy Tables, Voice Notes Apply, Medical, Emergency, Parent Dashboard |
| **Backlog** | 12    | See "Outstanding Features" below                                                                   |

---

## COMPLETED FEATURES (Done in GitHub Project)

### Issue #4: Goals Dashboard for Coaches ✅
- **Location:** `/orgs/[orgId]/coach/goals`
- Goal creation wizard with skill linking
- Milestone tracking interface
- Progress visualization
- Bulk goal creation for teams

### Issue #5: Skill Assessment Rating Sliders ✅
- **Location:** `/orgs/[orgId]/coach/assess`
- Rating slider component (1-5 scale with colors)
- Before/after comparison view
- Batch assessment for team sessions
- Assessment history timeline

### Issue #6: Apply Voice Note Insights to Player Profiles ✅
- Skill ratings create `skillAssessments` records
- Word number parsing supported
- Player matching to roster

### Issue #8: Medical Profiles Dashboard ✅
- **Location:** `/orgs/[orgId]/coach/medical`
- Medical profile viewing
- Allergy/medication tracking
- Emergency contact display

### Issue #9: Emergency Contacts Management ✅
- **Locations:** Player passport, `/orgs/[orgId]/coach/match-day`
- Self-service for adult players
- ICE designation and priority ordering
- Coach quick access for match days

### Issue #10: PDF Generation and Sharing ✅
- **Component:** `share-modal.tsx`
- Player passport PDF export
- Share via email/WhatsApp/native
- Download and preview options

### Issue #11: Analytics Dashboard ✅
- **Location:** `/orgs/[orgId]/admin/analytics`
- Summary cards with trends
- Skill distribution charts
- Progress over time visualization

### Issue #23: Remove Legacy Tables References ✅
- Legacy tables removed
- New identity system in use

### Issue #25: Adult Player Workflow ✅
- **Location:** `/orgs/[orgId]/player`
- Full passport view for adult players
- Self-managed emergency contacts

### Issue #7: Parent Dashboard Enhancement ✅
- **Location:** `/orgs/[orgId]/parents`
- **Verified:** 2025-12-29
- **Components:**
  - `page.tsx` - Main dashboard with gradient header, summary stats, children grid
  - `child-card.tsx` - Performance score, top 3 skills, attendance, goals, injury status
  - `coach-feedback.tsx` - Coach notes display per child
  - `weekly-schedule.tsx` - 7-day calendar grid (mock data, real integration planned)
  - `ai-practice-assistant.tsx` - Sport-specific drill database, personalized practice plans
  - `medical-info.tsx` - Medical information display
  - `guardian-settings.tsx` - Guardian preferences

---

## OUTSTANDING FEATURES (Backlog)

### MEDIUM PRIORITY

#### Issue #12: Team Roster Management UI
| Aspect       | Status                                      |
| ------------ | ------------------------------------------- |
| **Backend**  | ✅ `teamPlayerIdentities.ts` with full CRUD |
| **UI**       | ⚠️ Basic team list only                     |
| **Location** | `/orgs/[orgId]/admin/teams`                 |

**Features Needed:**
- Drag-and-drop roster management (@dnd-kit/core)
- Bulk player assignment
- Transfer between teams
- Coach assignment interface

---

#### Issue #13: Guardian Profile Management
| Aspect      | Status                                    |
| ----------- | ----------------------------------------- |
| **Backend** | ✅ `orgGuardianProfiles.ts` with full CRUD |
| **UI**      | ⚠️ Partial - settings page exists         |
| **Location**| `/orgs/[orgId]/parents/components/guardian-settings.tsx` |

**Features Needed:**
- Communication preferences
- Emergency priority settings
- Notification settings
- Linked children management

---

#### Issue #14: Guardian Self-Service Registration and Linking
| Aspect      | Status                                   |
| ----------- | ---------------------------------------- |
| **Backend** | ✅ `guardianIdentities.ts` find-or-create |
| **UI**      | ❌ No self-service flow                   |

**Features Needed:**
- Guardian self-registration flow
- Child linking with verification
- Verification methods (email code, admin approval, club code)
- Multiple guardian support

---

#### Issue #15: Voice Notes UX Enhancements
| Aspect        | Status                             |
| ------------- | ---------------------------------- |
| **Core**      | ✅ Recording + AI transcription works |
| **UX**        | ⚠️ Missing multiple MVP features    |

**Features Needed:**
- Apply All / Reject All buttons
- Edit insight before applying
- Real-time transcription display while speaking
- Search and filter notes
- Export to CSV
- View source note link from insight

---

#### Issue #26: Adult Player Daily Wellness Check-in 🆕
| Aspect      | Status                             |
| ----------- | ---------------------------------- |
| **Backend** | ❌ No wellness tracking schema     |
| **UI**      | ❌ Not built                       |
| **Location**| `/orgs/[orgId]/player` (player dashboard) |

**Description:**
Quick daily snapshot for adult players to track health and wellbeing using visual face icons.

**5 Questions (answered with 🟢/🟠/🔴 face icons):**
1. How did you sleep?
2. How are you feeling physically?
3. How are you feeling emotionally?
4. Have you drunk enough water?
5. Have you eaten well?

**Features Needed:**
- Daily check-in card on player dashboard
- 5-question form with green/orange/red face icons
- Response tracking (good/okay/poor)
- History view showing past check-ins
- One check-in per day limit
- Mobile-friendly touch targets

**Schema:** `playerWellnessCheckins` table with responses, date, and overall score (5-15 points)

---

### LOW PRIORITY

#### Issue #16: Reference Data Management (Admin)
| Aspect      | Status                  |
| ----------- | ----------------------- |
| **Backend** | ✅ `referenceData.ts`   |
| **UI**      | ❌ No admin interface   |

**Features Needed:**
- Sports management
- Age group management
- Skill category editing
- Skill definition management
- Benchmark data management

---

#### Issue #17: Parent Notification System
| Aspect      | Status       |
| ----------- | ------------ |
| **Backend** | ❌ Not built |
| **UI**      | ❌ Not built |

**Features Needed:**
- Notify parents when insights applied
- Injury notifications (always on)
- Review due reminders
- In-app notification center
- Notification preferences per guardian

---

#### Issue #18: Team Briefing Generator
| Aspect      | Status       |
| ----------- | ------------ |
| **Backend** | ❌ Not built |
| **UI**      | ❌ Not built |

**Features Needed:**
- Auto-generate weekly briefing from voice notes
- Injury summary
- Top performers highlight
- Shareable parent report
- Email distribution

---

#### Issue #19: Multi-Sport Passport Views
| Aspect      | Status                                                  |
| ----------- | ------------------------------------------------------- |
| **Backend** | ✅ `sportPassports` supports multiple sports per player |
| **UI**      | ⚠️ Single sport view only                               |

**Features Needed:**
- Sport switcher/tabs in passport view
- Cross-sport skill comparison
- Combined development view
- Transferable skills highlighting

---

#### Issue #20: Audit Logging System
| Aspect            | Status                            |
| ----------------- | --------------------------------- |
| **Backend**       | ⚠️ `approvalActions` table exists |
| **UI**            | ❌ No audit viewer                |

**Features Needed:**
- Track all data changes
- User action logging
- Admin audit dashboard
- Export logs to CSV
- Player data access logging

---

#### Issue #21: Schedule and Calendar System
| Aspect      | Status       |
| ----------- | ------------ |
| **Backend** | ❌ Not built |
| **UI**      | ⚠️ Mock data only in parent schedule |

**Features Needed:**
- Training sessions table
- Match fixtures table
- Coach calendar view with create/edit
- Parent schedule view (real data)
- iCal export

---

#### Issue #22: Milestone Tracking Clarification
| Aspect    | Status                  |
| --------- | ----------------------- |
| **Current** | Free-form text field  |
| **Needed** | Clarify requirements   |

**Question:** Is the current free-form milestone field sufficient, or is a structured milestone interface needed?

---

#### Issue #24: Legacy Tables Migration
| Aspect      | Status                   |
| ----------- | ------------------------ |
| **Code**    | ✅ References removed    |
| **Data**    | ⚠️ Migration needed      |

**Action Required:**
- Migrate existing data from old tables to new identity system
- See `docs/LEGACY_TABLE_ANALYSIS.md` for migration steps

---

## Player Self-Access System Status

### Completed ✅
- `playerAccessPolicies` table for club settings
- `playerAccessGrants` table for guardian permissions
- `playerAccountLinks` table for player accounts
- `playerAccessLogs` table for audit trail
- Backend model with all CRUD operations
- Admin settings page `/orgs/[orgId]/admin/player-access`
- Adult player dashboard `/orgs/[orgId]/player`

### Still Needed ❌
- Guardian UI to enable child's access
- Youth player dashboard (separate from adult)
- Player self-assessment capability
- Player account creation/linking flow from guardian UI

---

## Feature Count Summary

| Category                  | Count    | Status         |
| ------------------------- | -------- | -------------- |
| **Completed (Done)**      | 11       | ✅ Done        |
| **Backlog (Medium)**      | 5        | 🟡 Important   |
| **Backlog (Low)**         | 7        | 🟢 Future      |
| **Total in GitHub**       | 23       |                |

---

## Quick Reference: Route Structure

### Coach Routes (`/orgs/[orgId]/coach/`)
| Route        | Status      | Description                    |
| ------------ | ----------- | ------------------------------ |
| `/assess`    | ✅ Complete | Skill assessment with sliders  |
| `/goals`     | ✅ Complete | Goals dashboard                |
| `/injuries`  | ✅ Complete | Injury tracking                |
| `/medical`   | ✅ Complete | Medical profiles               |
| `/match-day` | ✅ Complete | ICE contacts access            |
| `/voice-notes` | ✅ Complete | Voice recording + AI insights |

### Admin Routes (`/orgs/[orgId]/admin/`)
| Route           | Status      | Description                    |
| --------------- | ----------- | ------------------------------ |
| `/analytics`    | ✅ Complete | Club-wide analytics            |
| `/benchmarks`   | ✅ Complete | NGB benchmark management       |
| `/coaches`      | ✅ Complete | Coach management               |
| `/gaa-import`   | ✅ Complete | GAA membership import          |
| `/medical`      | ✅ Complete | Medical profiles admin         |
| `/player-access`| ✅ Complete | Player self-access settings    |
| `/players`      | ✅ Complete | Player management              |
| `/teams`        | ⚠️ Basic    | Team list (needs roster UI)    |
| `/users`        | ✅ Complete | User management                |

### Parent Routes (`/orgs/[orgId]/parents/`)
| Component              | Status      | Description                    |
| ---------------------- | ----------- | ------------------------------ |
| `child-card.tsx`       | ✅ Complete | Child overview cards           |
| `coach-feedback.tsx`   | ✅ Complete | Coach notes display            |
| `weekly-schedule.tsx`  | ⚠️ Mock     | Calendar (needs real data)     |
| `ai-practice-assistant.tsx` | ✅ Complete | Practice plan generator   |
| `medical-info.tsx`     | ✅ Complete | Medical information            |
| `guardian-settings.tsx`| ⚠️ Basic    | Guardian preferences           |

### Player Routes
| Route                          | Status      | Description                    |
| ------------------------------ | ----------- | ------------------------------ |
| `/orgs/[orgId]/player`         | ✅ Complete | Adult player dashboard         |
| `/orgs/[orgId]/players/[id]`   | ✅ Complete | Player passport (coach view)   |

---

## Key Components Inventory

| Component                   | Location                                  | Status      |
| --------------------------- | ----------------------------------------- | ----------- |
| `rating-slider.tsx`         | `apps/web/src/components/`                | ✅ Complete |
| `skill-radar-chart.tsx`     | `apps/web/src/components/`                | ✅ Complete |
| `benchmark-comparison.tsx`  | `apps/web/src/components/`                | ✅ Complete |
| `smart-coach-dashboard.tsx` | `apps/web/src/components/`                | ✅ Complete |
| `share-modal.tsx`           | `apps/web/src/.../players/[id]/components/` | ✅ Complete |
| `gaa-import.tsx`            | `apps/web/src/components/`                | ✅ Complete |

---

## Next Sprint Recommendations

### Sprint Priority 1: Verify & Close
1. Verify Parent Dashboard Enhancement (Issue #7) is working
2. Mark as Done in GitHub project
3. Close any other verified issues

### Sprint Priority 2: Medium Priority Features
1. **Team Roster UI** (Issue #12) - High user value
2. **Guardian Self-Registration** (Issue #14) - Onboarding friction reduction
3. **Voice Notes UX** (Issue #15) - Coach productivity

### Sprint Priority 3: Data Quality
1. **Legacy Tables Migration** (Issue #24) - Data integrity
2. **Milestone Tracking Clarification** (Issue #22) - Requirements

---

**Document Version:** 4.0
**Previous Update:** 2025-12-23
**GitHub Project Sync:** 2025-12-29

---

## Changelog

### 2025-12-29
- Synced with GitHub Project #4 (22 items total)
- Updated status of all Done items (10 complete)
- Added Parent Dashboard to In Review status
- Reorganized outstanding features by priority
- Added route structure quick reference
- Added component inventory
- Removed duplicate/outdated sections
- Aligned with actual file structure verification
