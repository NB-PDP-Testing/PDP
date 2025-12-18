# Outstanding Features - Identity System Migration

> Last Updated: 2025-12-18
> Branch: `feature/identity-system-migration`

## Overview

This document tracks features that have backend implementation but are missing frontend UI, along with recommended priorities for implementation.

---

## HIGH PRIORITY - Core Functionality Missing UI

| Feature | Backend | Frontend | Impact |
|---------|---------|----------|--------|
| **Guardian Profile Management** | ✅ Full | ❌ None | Guardians can't manage their org-specific preferences |
| **Emergency Contacts (Adult Players)** | ✅ Full CRUD | ❌ None | Adult players can't add emergency contacts |
| **Injury View for Parents** | ✅ Full | ❌ None | Parents can't see their child's injuries |
| **Goals View for Parents** | ✅ Full | ❌ None | Parents can't see their child's development goals |
| **Dedicated Goals Management** | ✅ Full | ⚠️ Nested only | Coaches need a better interface to manage goals |

### Details

#### Guardian Profile Management
- **Backend**: `orgGuardianProfiles` table with full CRUD in `orgGuardianProfiles.ts`
- **Missing UI**: No page for guardians to manage communication preferences, emergency priority, or view club notes
- **Location**: Should be at `/orgs/[orgId]/parents/profile` or similar

#### Emergency Contacts (Adult Players)
- **Backend**: `playerEmergencyContacts` table with full CRUD in `playerEmergencyContacts.ts`
- **Missing UI**: No page for adult players to add/edit/delete emergency contacts
- **Location**: Should be at `/orgs/[orgId]/profile/emergency-contacts` or in player settings

#### Injury View for Parents
- **Backend**: `playerInjuries` with visibility controls already implemented
- **Missing UI**: Parent dashboard doesn't show injuries for their children
- **Location**: Add to `/orgs/[orgId]/parents` page

#### Goals View for Parents
- **Backend**: `passportGoals` with `isVisibleToParent` field
- **Missing UI**: Parent dashboard doesn't show goals for their children
- **Location**: Add to `/orgs/[orgId]/parents` page

#### Dedicated Goals Management
- **Backend**: Full CRUD in `passportGoals.ts`
- **Current UI**: Goals only visible nested in player passport view
- **Missing UI**: Dedicated page for coaches to create/manage goals
- **Location**: Should be at `/orgs/[orgId]/coach/goals`

---

## MEDIUM PRIORITY - Extended Functionality

| Feature | Backend | Frontend | Impact |
|---------|---------|----------|--------|
| **Benchmark Analytics Dashboard** | ✅ Full | ❌ None | No visualization of skill benchmarks across org |
| **Guardian Registration Flow** | ✅ Full | ❌ None | No self-service guardian signup |
| **Guardian-Player Linking UI** | ✅ Full | ❌ None | Manual linking only via import |
| **Player Profile Edit (by Guardian)** | ✅ Full | ❌ None | Guardians can't update player info |
| **Team Roster Management** | ✅ Full | ⚠️ Limited | No dedicated UI to manage team assignments |

### Details

#### Benchmark Analytics Dashboard
- **Backend**: `getClubBenchmarkAnalytics` query in `skillAssessments.ts`
- **Missing UI**: No dashboard showing skills needing attention, player progress vs benchmarks
- **Location**: Should be at `/orgs/[orgId]/admin/analytics` or `/orgs/[orgId]/coach/analytics`

#### Guardian Registration Flow
- **Backend**: `guardianIdentities.ts` with find-or-create functionality
- **Missing UI**: No self-service registration for guardians
- **Current**: Guardians created only via player import

#### Guardian-Player Linking UI
- **Backend**: `guardianPlayerLinks.ts` with full relationship management
- **Missing UI**: No UI for guardians to link to players or admins to manage links
- **Current**: Links created only via player import

#### Player Profile Edit (by Guardian)
- **Backend**: Update operations exist in `playerIdentities.ts`
- **Missing UI**: Guardians cannot update their child's contact info, address, etc.
- **Current**: Only coaches/admins can edit player data

#### Team Roster Management
- **Backend**: `teamPlayerIdentities.ts` with full CRUD, transfers, bulk operations
- **Missing UI**: No dedicated interface to manage team rosters
- **Current**: Team assignments only visible in player passport

---

## LOW PRIORITY - Admin/Reference Data

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| **Reference Data Management** | ✅ Full | ❌ None | Sports, age groups, skill definitions - admin only |
| **Org Injury Notes** | ✅ Full | ⚠️ Minimal | Notes exist but not surfaced in UI |
| **Multi-Sport Passport Views** | ✅ Full | ❌ None | Players can have multiple sports but no multi-view |

---

## Implementation Plan

### Quick Wins (1-2 hours each)
- [x] ~~Add `/coach/injuries` page~~ (Completed 2025-12-18)
- [x] ~~Parent injury view - expose existing injury data to parent role~~ (Completed 2025-12-18)
- [x] ~~Parent goals view - expose existing goals to parent dashboard~~ (Completed 2025-12-18)
- [x] ~~Add navigation link to `/coach/injuries` from coach dashboard~~ (Completed 2025-12-18)

### Medium Effort (half day each)
- [ ] Emergency contacts management page for adult players
- [ ] Dedicated goals management page for coaches
- [ ] Benchmark analytics dashboard

### Larger Features (1+ day each)
- [ ] Guardian registration and profile management
- [ ] Guardian-player linking flow
- [ ] Team roster management UI

---

## Backend Models Reference

### New Identity System Tables

| Table | Model File | Status |
|-------|-----------|--------|
| `playerIdentities` | `playerIdentities.ts` | ✅ Complete |
| `guardianIdentities` | `guardianIdentities.ts` | ✅ Complete |
| `orgPlayerEnrollments` | `orgPlayerEnrollments.ts` | ✅ Complete |
| `guardianPlayerLinks` | `guardianPlayerLinks.ts` | ✅ Complete |
| `orgGuardianProfiles` | `orgGuardianProfiles.ts` | ✅ Complete |
| `sportPassports` | `sportPassports.ts` | ✅ Complete |
| `skillAssessments` | `skillAssessments.ts` | ✅ Complete |
| `skillBenchmarks` | `skillBenchmarks.ts` | ✅ Complete |
| `passportGoals` | `passportGoals.ts` | ✅ Complete |
| `teamPlayerIdentities` | `teamPlayerIdentities.ts` | ✅ Complete |
| `playerInjuries` | `playerInjuries.ts` | ✅ Complete |
| `orgInjuryNotes` | `orgInjuryNotes.ts` | ✅ Complete |
| `playerEmergencyContacts` | `playerEmergencyContacts.ts` | ✅ Complete |

---

## Frontend Pages Status

### Coach Section (`/orgs/[orgId]/coach/`)
- [x] Dashboard (`/coach`)
- [x] Skill Assessment (`/coach/assess`)
- [x] Voice Notes (`/coach/voice-notes`)
- [x] Injury Tracking (`/coach/injuries`)
- [ ] Goals Management (`/coach/goals`) - **TODO**

### Parent Section (`/orgs/[orgId]/parents/`)
- [x] Dashboard (`/parents`)
- [ ] Profile Management (`/parents/profile`) - **TODO**
- [ ] Injury View - **TODO** (add to dashboard)
- [ ] Goals View - **TODO** (add to dashboard)

### Admin Section (`/orgs/[orgId]/admin/`)
- [x] Players (`/admin/players`)
- [x] Teams (`/admin/teams`)
- [x] Coaches (`/admin/coaches`)
- [x] Users (`/admin/users`)
- [x] Benchmarks (`/admin/benchmarks`)
- [x] Settings (`/admin/settings`)
- [ ] Analytics Dashboard - **TODO**
- [ ] Team Roster Management - **TODO**

### Player Section (`/orgs/[orgId]/players/`)
- [x] Player Passport (`/players/[playerId]`)
- [ ] Edit Player (guardian access) - **TODO**
