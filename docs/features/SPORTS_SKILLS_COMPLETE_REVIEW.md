# Sports, Skills & Benchmarks - Complete System Review

**Date:** January 8, 2026
**Status:** COMPREHENSIVE REVIEW COMPLETE
**Auditor:** Claude Code Agent

---

## Executive Summary

This document provides a **complete mapping** of all sports, skills, benchmarks, and age group functionality across the PlayerARC platform. The system is **functional but has gaps** in gender-specific benchmarking, performance optimization, and parent portal integration.

### Quick Stats

| Metric | Count |
|--------|-------|
| Backend Models | 7 core models |
| Frontend Pages Using Skills/Sports | 42 files |
| Database Tables | 15+ related tables |
| API Functions | 50+ queries/mutations |
| User Flows | 8 primary flows |
| Identified Gaps | 12 significant items |

---

## Part 1: Data Architecture

### Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REFERENCE DATA LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│  sports              │  ageGroups           │  skillCategories      │
│  - code (PK)         │  - code (PK)         │  - sportCode (FK)     │
│  - name              │  - minAge, maxAge    │  - code               │
│  - governingBody     │  - ltadStage         │  - name               │
│  - isActive          │  - sortOrder         │  - sortOrder          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SKILL DEFINITIONS LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│  skillDefinitions                │  skillBenchmarks                 │
│  - categoryId (FK)               │  - sportCode (FK)                │
│  - sportCode (FK)                │  - skillCode (FK)                │
│  - code                          │  - ageGroup (FK)                 │
│  - name                          │  - gender (male/female/all)      │
│  - level1-5Descriptors           │  - level (recreational/elite)    │
│  - ageGroupRelevance             │  - expectedRating                │
│  - sortOrder                     │  - minAcceptable                 │
│                                  │  - developingThreshold           │
│                                  │  - excellentThreshold            │
│                                  │  - percentile25/50/75/90         │
│                                  │  - source, sourceYear            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SPORT CONFIGURATION LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│  sportAgeGroupConfig             │  sportAgeGroupEligibilityRules   │
│  - sportCode (FK)                │  - sportCode (FK)                │
│  - ageGroupCode (FK)             │  - fromAgeGroupCode              │
│  - minAge, maxAge (override)     │  - toAgeGroupCode                │
│  - description                   │  - isAllowed                     │
│                                  │  - requiresApproval              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PLAYER DATA LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  playerIdentities    │  orgPlayerEnrollments │  sportPassports      │
│  - firstName         │  - playerIdentityId   │  - playerIdentityId  │
│  - lastName          │  - organizationId     │  - sportCode         │
│  - dateOfBirth ───────► ageGroup calc        │  - organizationId    │
│  - gender ────────────► benchmark lookup     │  - positions         │
│                      │  - ageGroup           │  - currentRatings    │
│                      │  - lastReviewDate     │  - assessmentCount   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ASSESSMENT DATA LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  skillAssessments                │  passportGoals                   │
│  - passportId (FK)               │  - passportId (FK)               │
│  - playerIdentityId (FK)         │  - category                      │
│  - skillCode (FK)                │  - linkedSkills[]                │
│  - rating (1-5)                  │  - status                        │
│  - benchmarkRating (snapshot)    │  - progress                      │
│  - benchmarkStatus               │  - milestones[]                  │
│  - assessmentType                │                                  │
│  - assessedBy                    │                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

| From | To | Relationship |
|------|-----|--------------|
| skillCategories | sports | Many categories per sport |
| skillDefinitions | skillCategories | Many skills per category |
| skillBenchmarks | skillDefinitions | Many benchmarks per skill (age/gender/level) |
| sportPassports | playerIdentities | Many passports per player (one per sport) |
| skillAssessments | sportPassports | Many assessments per passport |
| passportGoals | sportPassports | Many goals per passport |

---

## Part 2: Complete File Usage Map

### Age Group Usage Across Application

| File | Usage Type | Purpose |
|------|------------|---------|
| **Platform Admin** | | |
| `/platform/sports/page.tsx` | Config | Configure sport-specific age ranges |
| `/platform/skills/page.tsx` | Config | Filter skills by age relevance |
| `/platform/skills/bulk-import-dialog.tsx` | Import | Import age-specific benchmarks |
| **Org Admin** | | |
| `/admin/players/page.tsx` | Display/Filter | Show player age group, filter list |
| `/admin/players/[playerId]/edit/page.tsx` | Edit | Edit player age group |
| `/admin/teams/page.tsx` | Config | Team age group assignment |
| `/admin/benchmarks/page.tsx` | View | Filter benchmarks by age group |
| `/admin/analytics/page.tsx` | Analytics | Age group performance breakdown |
| `/admin/player-import/page.tsx` | Import | Map age groups during import |
| `/admin/gaa-import/page.tsx` | Import | GAA-specific age mapping |
| `/admin/overrides/page.tsx` | Config | Age eligibility overrides |
| `/admin/coaches/page.tsx` | Config | Coach age group assignments |
| `/admin/guardians/page.tsx` | Display | Child age groups |
| `/admin/users/page.tsx` | Display | User age context |
| `/admin/users/approvals/page.tsx` | Display | Approval age context |
| `/admin/medical/page.tsx` | Display | Medical by age group |
| **Coach** | | |
| `/coach/assess/page.tsx` | Lookup | Auto-lookup benchmarks by age |
| `/coach/coach-dashboard.tsx` | Display | Player age groups |
| `/coach/injuries/page.tsx` | Display | Injury by age context |
| `/coach/match-day/page.tsx` | Display | Match day age groups |
| `/coach/medical/page.tsx` | Display | Medical by age |
| **Player** | | |
| `/players/[playerId]/page.tsx` | Display | Player age group |
| `/players/[playerId]/edit/page.tsx` | Edit | Edit age group |
| `/players/[playerId]/components/basic-info-section.tsx` | Display | Age group display |
| `/player/page.tsx` | Display | Self-view age group |
| **Parent** | | |
| `/parents/components/child-card.tsx` | Display | Child age group |
| `/parents/components/medical-info.tsx` | Display | Medical context |
| **Shared** | | |
| `/components/skill-radar-chart.tsx` | Viz | Age-appropriate visualization |
| `/components/benchmark-comparison.tsx` | Compare | Age-based comparison |
| `/components/gaa-import.tsx` | Import | GAA age mapping |
| `/components/smart-coach-dashboard.tsx` | Dashboard | Age filtering |
| `/lib/constants.ts` | Constants | Age group definitions |
| `/lib/types.ts` | Types | Age group types |
| `/lib/pdf-generator.ts` | Export | Age in PDF reports |
| `/lib/ai-service.ts` | AI | Age-appropriate recommendations |
| `/hooks/use-player-identity.ts` | Hook | Age calculation |
| `/api/recommendations/route.ts` | API | Age-based AI recommendations |
| `/api/session-plan/route.ts` | API | Age-appropriate plans |
| `/orgs/join/[orgId]/page.tsx` | Join | Age context in join flow |

### Skills/Assessments Usage

| File | Purpose |
|------|---------|
| `/platform/skills/page.tsx` | **PRIMARY**: Define skills, categories, import |
| `/admin/benchmarks/page.tsx` | View skill benchmarks for org |
| `/admin/analytics/page.tsx` | Skill performance analytics |
| `/admin/dev-tools/page.tsx` | Debug skill data |
| `/coach/assess/page.tsx` | **PRIMARY**: Record skill assessments |
| `/coach/coach-dashboard.tsx` | Skill overview dashboard |
| `/coach/goals/page.tsx` | Link goals to skills |
| `/coach/voice-notes/voice-notes-dashboard.tsx` | Voice notes linked to skills |
| `/components/skill-radar-chart.tsx` | Skill visualization |
| `/components/benchmark-comparison.tsx` | Skill vs benchmark display |

### Sport/Passport Usage

| File | Purpose |
|------|---------|
| `/platform/sports/page.tsx` | **PRIMARY**: Manage sports |
| `/platform/skills/page.tsx` | Sports dropdown for skill assignment |
| `/platform/skills/delete-sport-dialog.tsx` | Delete sport with cascade warning |
| `/platform/skills/bulk-import-dialog.tsx` | Import per sport |
| `/setup/organization/page.tsx` | Org sport selection |
| `/orgs/create/page.tsx` | Select org sports |
| `/admin/settings/page.tsx` | Org sport configuration |
| `/admin/teams/page.tsx` | Team sport assignment |
| `/admin/players/page.tsx` | Player sport filter |
| `/admin/player-import/page.tsx` | Import with sport |
| `/admin/gaa-import/page.tsx` | GAA sport import |
| `/admin/benchmarks/page.tsx` | Benchmark sport filter |
| `/admin/analytics/page.tsx` | Analytics by sport |
| `/admin/users/page.tsx` | User sport context |
| `/admin/users/remove-from-org-dialog.tsx` | Remove with sport context |
| `/coach/assess/page.tsx` | Assessment sport selection |
| `/coach/coach-dashboard.tsx` | Sport-specific dashboard |
| `/coach/goals/page.tsx` | Goals per sport |
| `/coach/voice-notes/voice-notes-dashboard.tsx` | Notes per sport |
| `/players/[playerId]/page.tsx` | Passport view per sport |
| `/players/[playerId]/edit/page.tsx` | Edit passport |
| `/player/page.tsx` | Self passport view |
| `/parents/components/child-card.tsx` | Child sport display |
| `/parents/components/coach-feedback.tsx` | Feedback per sport |
| `/parents/components/ai-practice-assistant.tsx` | Sport-specific practice |

---

## Part 3: User Flow Diagrams

### Flow 1: Platform Admin Creates Sport & Skills

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PLATFORM ADMIN: SPORT & SKILLS SETUP                                     │
└──────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO PLATFORM > SPORTS
   └─► /platform/sports/page.tsx
       └─► api.models.sports.getAll()

2. CREATE NEW SPORT
   └─► Click "Add Sport"
   └─► Enter: code="rugby", name="Rugby Union", governingBody="IRFU"
   └─► api.models.sports.create()
   └─► Sport added to list

3. CONFIGURE AGE GROUPS FOR SPORT
   └─► Click "Age Groups" on sport row
   └─► api.models.sportAgeGroupConfig.getSportAgeGroupConfig("rugby")
   └─► Customize age ranges (e.g., U12 = 11-13 for rugby)
   └─► api.models.sportAgeGroupConfig.upsertSportAgeGroupConfig()

4. CONFIGURE ELIGIBILITY RULES
   └─► Click "Eligibility Rules"
   └─► api.models.sportAgeGroupConfig.getSportEligibilityRules("rugby")
   └─► Define play-up/play-down rules
   └─► api.models.sportAgeGroupConfig.upsertSportEligibilityRule()

5. NAVIGATE TO PLATFORM > SKILLS
   └─► /platform/skills/page.tsx
   └─► Select "rugby" from sport dropdown
   └─► api.models.referenceData.getAllCategoriesAdmin("rugby")

6. CREATE SKILL CATEGORIES
   └─► Click "Add Category"
   └─► Enter: code="tackling", name="Tackling Skills"
   └─► api.models.referenceData.createSkillCategory()

7. ADD SKILLS TO CATEGORY
   └─► Expand "Tackling Skills" category
   └─► Click "Add Skill"
   └─► Enter: code="front_on_tackle", name="Front-on Tackle"
   └─► Add level 1-5 descriptors
   └─► api.models.referenceData.createSkillDefinition()

8. BULK IMPORT SKILLS (ALTERNATIVE)
   └─► Click "Import Skills"
   └─► Upload JSON with categories and skills
   └─► api.models.referenceData.importSkillsForSport()

9. IMPORT BENCHMARKS
   └─► Click "Benchmarks" tab
   └─► Select sport
   └─► Click "Import Benchmarks"
   └─► Upload JSON with benchmark data:
       {
         "skillCode": "front_on_tackle",
         "ageGroup": "u14",
         "gender": "all",
         "level": "competitive",
         "expectedRating": 3.5,
         "minAcceptable": 2.5,
         ...
       }
   └─► api.models.skillBenchmarks.bulkImportBenchmarks()

✅ RESULT: Sport ready with skills and benchmarks
```

### Flow 2: Org Admin Enables Sport for Organization

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ORG ADMIN: SPORT CONFIGURATION                                           │
└──────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO ADMIN > SETTINGS
   └─► /orgs/[orgId]/admin/settings/page.tsx
   └─► api.models.referenceData.getSports()

2. SELECT SPORTS FOR ORGANIZATION
   └─► Toggle on "Rugby Union", "GAA Football"
   └─► api.models.organizations.updateSports()

3. NAVIGATE TO ADMIN > BENCHMARKS
   └─► /orgs/[orgId]/admin/benchmarks/page.tsx
   └─► Select sport: "Rugby Union"
   └─► Select age group: "U14"
   └─► api.models.skillBenchmarks.getBenchmarksForSport()

4. VIEW BENCHMARK STANDARDS
   └─► See all skills with expected ratings
   └─► Visual RatingBar shows zones
   └─► Understand what "on track" means for each skill

5. VIEW CLUB ANALYTICS
   └─► api.models.skillAssessments.getClubBenchmarkAnalytics()
   └─► See:
       - On-track percentage
       - Skills needing attention
       - Players needing support

✅ RESULT: Org configured with sport, can view benchmarks
```

### Flow 3: Player Enrollment with Sport Passport

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PLAYER ENROLLMENT & PASSPORT CREATION                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. ADMIN IMPORTS/CREATES PLAYER
   └─► /orgs/[orgId]/admin/players/page.tsx
   └─► Click "Add Player" or "Import"
   └─► Enter: firstName="Emma", lastName="Walsh", DOB="2012-03-15", gender="female"
   └─► api.models.playerIdentities.createPlayerIdentity()
   └─► api.models.orgPlayerEnrollments.enrollPlayer()
       └─► ageGroup auto-calculated from DOB → "u14"

2. SPORT PASSPORT AUTO-CREATED (or manual)
   └─► On first assessment OR manual trigger
   └─► api.models.sportPassports.findOrCreatePassport()
   └─► Creates passport: {
         playerIdentityId,
         sportCode: "rugby",
         organizationId,
         positions: [],
         currentOverallRating: null
       }

3. ASSIGN TO TEAM
   └─► /orgs/[orgId]/admin/teams/page.tsx
   └─► Select team "U14 Girls Rugby"
   └─► Add player to team
   └─► api.models.teamPlayerIdentities.assignPlayerToTeam()

4. COACH ASSIGNED TO TEAM
   └─► api.models.coaches.getCoachAssignmentsWithTeams()
   └─► Coach can now assess player

✅ RESULT: Player enrolled with sport passport, ready for assessment
```

### Flow 4: Coach Records Assessment

```
┌──────────────────────────────────────────────────────────────────────────┐
│ COACH: SKILL ASSESSMENT RECORDING                                        │
└──────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO COACH > ASSESS
   └─► /orgs/[orgId]/coach/assess/page.tsx

2. SELECT ASSESSMENT MODE
   └─► "Individual" (one player) or "Batch" (multiple players)
   └─► Choose Individual

3. SELECT PLAYER
   └─► Search "Emma Walsh"
   └─► api.models.orgPlayerEnrollments.getPlayersForOrg()
   └─► Player selected

4. SELECT SPORT
   └─► Dropdown shows org sports
   └─► Select "Rugby Union"
   └─► api.models.referenceData.getSkillDefinitionsBySport("rugby")
   └─► Skills loaded by category

5. RECORD RATINGS
   ┌────────────────────────────────────────┐
   │ Tackling Skills                        │
   ├────────────────────────────────────────┤
   │ Front-on Tackle    [●●●●○] 4/5        │
   │ Side Tackle        [●●●○○] 3/5        │
   │ Tackle Timing      [●●●○○] 3/5        │
   ├────────────────────────────────────────┤
   │ Passing Skills                         │
   ├────────────────────────────────────────┤
   │ Spin Pass          [●●○○○] 2/5        │
   │ Pop Pass           [●●●●○] 4/5        │
   └────────────────────────────────────────┘
   └─► Coach rates each skill 1-5
   └─► Adds notes per skill (optional)

6. SELECT ASSESSMENT TYPE
   └─► "training" / "match" / "formal_review" / "trial"
   └─► Select "training"

7. SAVE ASSESSMENT
   └─► Click "Save Assessment"
   └─► FOR EACH SKILL:
       └─► api.models.skillAssessments.recordAssessmentWithBenchmark()
           │
           ├─► Lookup player DOB → 2012-03-15
           ├─► Calculate age → 12 years old → "u14"
           ├─► Lookup benchmark: rugby + front_on_tackle + u14 + all + recreational
           ├─► Get benchmark: expectedRating=3.2, minAcceptable=2.0, developing=2.8, excellent=3.8
           ├─► Compare: rating=4 vs expected=3.2
           ├─► Calculate status: 4 >= 3.8 → "exceeding"
           ├─► Store: {
           │     passportId,
           │     skillCode: "front_on_tackle",
           │     rating: 4,
           │     benchmarkRating: 3.2,
           │     benchmarkStatus: "exceeding",
           │     assessmentType: "training",
           │     assessedBy: coachId
           │   }
           └─► Return { benchmarkFound: true, status: "exceeding" }

8. UPDATE PASSPORT RATINGS
   └─► api.models.sportPassports.updateRatings()
   └─► Recalculate currentOverallRating

9. SHOW RESULTS
   └─► Toast: "Assessment saved for Emma Walsh"
   └─► Show benchmark comparison:
       "Front-on Tackle: 4/5 (Exceeding - benchmark 3.2)"

✅ RESULT: Assessment recorded with benchmark comparison
```

### Flow 5: Parent Views Child Progress

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PARENT: VIEW CHILD DEVELOPMENT                                           │
└──────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO PARENT PORTAL
   └─► /orgs/[orgId]/parents/page.tsx
   └─► api.models.guardianPlayerLinks.getGuardianLinks()
   └─► Shows linked children

2. SELECT CHILD
   └─► Click "Emma Walsh" card
   └─► /orgs/[orgId]/players/[playerId]/page.tsx
   └─► api.models.sportPassports.getFullPlayerPassportView()

3. VIEW SKILLS SECTION
   └─► /orgs/[orgId]/players/[playerId]/components/skills-section.tsx
   └─► Display grouped by category:

       ┌─────────────────────────────────────────────┐
       │ TACKLING SKILLS                    AVG: 3.3 │
       ├─────────────────────────────────────────────┤
       │ Front-on Tackle  ████████░░  4/5 Exceeding │
       │ Side Tackle      ██████░░░░  3/5 On Track  │
       │ Tackle Timing    ██████░░░░  3/5 On Track  │
       └─────────────────────────────────────────────┘

       ┌─────────────────────────────────────────────┐
       │ PASSING SKILLS                     AVG: 3.0 │
       ├─────────────────────────────────────────────┤
       │ Spin Pass        ████░░░░░░  2/5 Developing│
       │ Pop Pass         ████████░░  4/5 Exceeding │
       └─────────────────────────────────────────────┘

4. VIEW RADAR CHART
   └─► /components/skill-radar-chart.tsx
   └─► Visual spider/radar showing all skill areas
   └─► Benchmark overlay (expected vs actual)

5. VIEW BENCHMARK COMPARISON
   └─► /components/benchmark-comparison.tsx
   └─► See how child compares to age group standards
   └─► Shows: "Emma is performing above average in Tackling"

6. VIEW GOALS
   └─► passportGoals linked to skills
   └─► Shows: "Improve Spin Pass to 3.5 by March"
   └─► Progress tracking

7. VIEW AI PRACTICE RECOMMENDATIONS
   └─► /parents/components/ai-practice-assistant.tsx
   └─► api /api/recommendations
   └─► "Based on Emma's assessment, focus on Spin Pass drills"

✅ RESULT: Parent sees comprehensive development view
```

### Flow 6: Admin Views Club Analytics

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ADMIN: CLUB-WIDE BENCHMARK ANALYTICS                                     │
└──────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO ADMIN > BENCHMARKS
   └─► /orgs/[orgId]/admin/benchmarks/page.tsx

2. SELECT FILTERS
   └─► Sport: "Rugby Union"
   └─► Age Group: "U14" (or "All")

3. LOAD ANALYTICS
   └─► api.models.skillAssessments.getClubBenchmarkAnalytics(orgId, "rugby", "u14")

4. VIEW DASHBOARD
   ┌──────────────────────────────────────────────────────────────┐
   │ CLUB BENCHMARK DASHBOARD - Rugby U14                         │
   ├──────────────────────────────────────────────────────────────┤
   │                                                               │
   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
   │  │   58%       │  │    12       │  │     3       │          │
   │  │  On Track   │  │   Players   │  │  Need Help  │          │
   │  └─────────────┘  └─────────────┘  └─────────────┘          │
   │                                                               │
   │  SKILLS NEEDING ATTENTION (>25% below benchmark)             │
   │  ────────────────────────────────────────────────            │
   │  • Spin Pass: 8/12 below (67%) ⚠️                           │
   │  • Ruck Clear Out: 4/12 below (33%) ⚠️                      │
   │                                                               │
   │  PLAYERS NEEDING SUPPORT (2+ skills below)                   │
   │  ────────────────────────────────────────────────            │
   │  • Carlos Rodriguez (3 skills below) → View                  │
   │  • Sarah Murphy (2 skills below) → View                      │
   │  • James O'Brien (2 skills below) → View                     │
   │                                                               │
   │  STATUS DISTRIBUTION                                          │
   │  ────────────────────────────────────────────────            │
   │  Below:      ████░░░░░░░░░░░░  12%                          │
   │  Developing: ██████░░░░░░░░░░  18%                          │
   │  On Track:   ████████████░░░░  42%                          │
   │  Exceeding:  ██████░░░░░░░░░░  20%                          │
   │  Exceptional:██░░░░░░░░░░░░░░   8%                          │
   │                                                               │
   └──────────────────────────────────────────────────────────────┘

5. DRILL DOWN
   └─► Click "Spin Pass" skill
   └─► See all players with their ratings
   └─► Identify who needs support

6. ACTION
   └─► Plan targeted training sessions
   └─► Assign goals to struggling players
   └─► Schedule follow-up assessments

✅ RESULT: Admin has actionable insights for club development
```

### Flow 7: Batch Assessment (Multiple Players)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ COACH: BATCH ASSESSMENT                                                  │
└──────────────────────────────────────────────────────────────────────────┘

1. SELECT BATCH MODE
   └─► /orgs/[orgId]/coach/assess/page.tsx
   └─► Click "Batch Assessment"

2. SELECT PLAYERS
   └─► Multi-select: Emma, Carlos, Sarah, James
   └─► 4 players selected

3. SELECT SKILLS TO ASSESS
   └─► Check: "Spin Pass", "Pop Pass", "Front-on Tackle"
   └─► 3 skills selected

4. FILL ASSESSMENT GRID
   ┌──────────────────────────────────────────────────────────────┐
   │              │ Spin Pass │ Pop Pass │ Front-on │             │
   ├──────────────┼───────────┼──────────┼──────────┤             │
   │ Emma Walsh   │    2      │    4     │    4     │             │
   │ Carlos R.    │    1      │    3     │    2     │             │
   │ Sarah M.     │    3      │    3     │    3     │             │
   │ James O.     │    2      │    2     │    3     │             │
   └──────────────────────────────────────────────────────────────┘

5. SAVE ALL
   └─► api.models.skillAssessments.recordBatchAssessments()
   └─► 4 players × 3 skills = 12 assessments created
   └─► Each with benchmark lookup and status calculation

✅ RESULT: Efficient batch recording with benchmark comparison
```

### Flow 8: Goal Setting Linked to Skills

```
┌──────────────────────────────────────────────────────────────────────────┐
│ COACH: GOAL CREATION LINKED TO SKILLS                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. NAVIGATE TO COACH > GOALS
   └─► /orgs/[orgId]/coach/goals/page.tsx

2. SELECT PLAYER
   └─► Search "Emma Walsh"

3. CREATE NEW GOAL
   └─► Title: "Improve Spin Pass"
   └─► Category: "Technical"
   └─► Target Date: "2026-03-15"
   └─► Link to Skills: ["spin_pass"]
   └─► Target Rating: 3.5
   └─► Milestones:
       - "Practice 20 spin passes per session"
       - "Achieve 3.0 rating by Feb"
       - "Achieve 3.5 rating by March"

4. SAVE GOAL
   └─► api.models.passportGoals.createGoal()
   └─► Creates: {
         passportId,
         playerIdentityId,
         title: "Improve Spin Pass",
         linkedSkills: ["spin_pass"],
         status: "active",
         progress: 0,
         milestones: [...]
       }

5. TRACK PROGRESS
   └─► When new assessment recorded for spin_pass
   └─► Goal progress auto-updates
   └─► Milestone completion tracked

✅ RESULT: Goal linked to skill with progress tracking
```

---

## Part 4: Backend API Reference

### sports.ts

| Function | Type | Purpose |
|----------|------|---------|
| `getAll()` | Query | Get all active sports |
| `getByCode(code)` | Query | Get sport by code |
| `create(code, name, ...)` | Mutation | Create new sport |
| `update(code, ...)` | Mutation | Update sport |
| `remove(code)` | Mutation | Soft delete sport |

### skillBenchmarks.ts

| Function | Type | Purpose |
|----------|------|---------|
| `getBenchmarkById(id)` | Query | Get single benchmark |
| `getBenchmarksForSport(sportCode)` | Query | All benchmarks for sport |
| `getBenchmarksForSkill(sportCode, skillCode)` | Query | Benchmarks for specific skill |
| `getBenchmarkForContext(sport, skill, age, gender, level)` | Query | Smart lookup with fallback |
| `getBenchmarksForAgeGroup(sport, age, gender?, level?)` | Query | All skills for age group |
| `compareRatingToBenchmark(...)` | Query | Compare rating, get status |
| `createBenchmark(...)` | Mutation | Create single benchmark |
| `bulkImportBenchmarks(source, year, benchmarks[])` | Mutation | Batch import |
| `updateBenchmark(id, ...)` | Mutation | Update benchmark |
| `deactivateBenchmark(id)` | Mutation | Soft delete |

### skillAssessments.ts

| Function | Type | Purpose |
|----------|------|---------|
| `getAssessmentsForPassport(passportId)` | Query | All assessments for player's sport |
| `getLatestAssessmentsForPassport(passportId)` | Query | Latest per skill |
| `getSkillHistory(passportId, skillCode)` | Query | Timeline for one skill |
| `getSkillProgress(passportId, skillCode)` | Query | Progress metrics |
| `getClubBenchmarkAnalytics(orgId, sport?, age?)` | Query | Club-wide analytics |
| `recordAssessment(...)` | Mutation | Record single (no benchmark lookup) |
| `recordAssessmentWithBenchmark(...)` | Mutation | Record with auto benchmark lookup |
| `recordBatchAssessments(passportId, date, type, ratings[])` | Mutation | Multiple skills at once |
| `updateAssessmentNotes(id, notes)` | Mutation | Update notes |
| `deleteAssessment(id)` | Mutation | Hard delete |

### sportPassports.ts

| Function | Type | Purpose |
|----------|------|---------|
| `getPassportById(id)` | Query | Single passport |
| `getPassportsForPlayer(playerId)` | Query | All sports for player |
| `getPassportForPlayerAndSport(playerId, sportCode)` | Query | Specific passport |
| `getFullPlayerPassportView(playerId, orgId, sport?)` | Query | Comprehensive view |
| `getSportsForPlayer(playerId, orgId)` | Query | List of sport codes |
| `createPassport(...)` | Mutation | Create passport |
| `findOrCreatePassport(...)` | Mutation | Upsert pattern |
| `updatePositions(...)` | Mutation | Update positions |
| `updateRatings(...)` | Mutation | Update cached ratings |
| `changeStatus(id, status)` | Mutation | Change status |

### sportAgeGroupConfig.ts

| Function | Type | Purpose |
|----------|------|---------|
| `getSportAgeGroupConfig(sportCode)` | Query | Age configs for sport |
| `getSportEligibilityRules(sportCode)` | Query | Play up/down rules |
| `upsertSportAgeGroupConfig(...)` | Mutation | Create/update config |
| `upsertSportEligibilityRule(...)` | Mutation | Create/update rule |

### referenceData.ts

| Function | Type | Purpose |
|----------|------|---------|
| `getAgeGroups()` | Query | All age groups |
| `getSports()` | Query | Active sports |
| `getAgeGroupFromDOB(dob)` | Query | Calculate age group |
| `getAllCategoriesAdmin(sportCode)` | Query | Categories for sport |
| `getAllSkillsAdmin(sportCode)` | Query | Skills for sport |
| `getSkillDefinitionsBySport(sportCode)` | Query | Skill definitions |
| `createSport(...)` | Mutation | Create sport |
| `createSkillCategory(...)` | Mutation | Create category |
| `createSkillDefinition(...)` | Mutation | Create skill |
| `importSkillsForSport(sportCode, categories[], replace?)` | Mutation | Bulk import |

---

## Part 5: Identified Gaps & Issues

### Critical Issues

| # | Issue | Impact | Fix Effort |
|---|-------|--------|------------|
| 1 | **Gender not passed to benchmark lookup** | Female-specific benchmarks ignored | Medium |
| 2 | **Benchmark status calculation inconsistent** | Different results in different places | Low |
| 3 | **No benchmark update UI** | Can only import, not edit benchmarks | Medium |

### High Priority

| # | Issue | Impact | Fix Effort |
|---|-------|--------|------------|
| 4 | **Performance: getClubBenchmarkAnalytics loops** | Slow for large orgs | High |
| 5 | **Age group transitions not handled** | Old benchmarks used after birthday | Medium |
| 6 | **Skill relevance by age unused** | ageGroupRelevance field ignored | Low |
| 7 | **Parent portal incomplete** | Skills visible but limited context | Medium |

### Medium Priority

| # | Issue | Impact | Fix Effort |
|---|-------|--------|------------|
| 8 | **No assessment approval workflow** | Assistant coach assessments not reviewed | High |
| 9 | **Batch assessment partial failure** | No rollback on error | Medium |
| 10 | **Goal progress not auto-updated** | Manual calculation needed | Medium |
| 11 | **No benchmark source URL display** | Can't verify source | Low |
| 12 | **No skill ordering UI** | Can reorder in import only | Low |

### Data Model Gaps

| Gap | Description |
|-----|-------------|
| No assessment drafts | Can't save partial assessments |
| No assessment templates | Must rate all skills each time |
| No coach notes privacy levels | All notes visible or none |
| No benchmark versioning | Old benchmarks overwritten |
| No player self-assessment | Only coach/parent/admin |

---

## Part 6: Improvement Opportunities

### Quick Wins (< 1 day each)

1. **Pass gender to benchmark lookup** - Fix recordAssessmentWithBenchmark
2. **Standardize status calculation** - Use one function everywhere
3. **Add benchmark source URL display** - Show link in UI
4. **Filter skills by age relevance** - Use existing field
5. **Add skill reorder UI** - Drag and drop in platform admin

### Medium Effort (1-3 days each)

1. **Benchmark edit UI** - Add edit/delete for individual benchmarks
2. **Parent portal enhancement** - Add historical progress view
3. **Auto-update goals** - Link assessment changes to goal progress
4. **Age transition notifications** - Alert when player ages up
5. **Assessment templates** - Pre-select common skill sets

### Major Features (1+ weeks each)

1. **Performance optimization** - Add aggregation/caching for analytics
2. **Assessment approval workflow** - Review queue for coaches
3. **Player self-assessment** - Allow players to rate themselves
4. **Benchmark effectiveness tracking** - Compare predictions to outcomes
5. **Multi-sport comparison** - Compare player across sports

---

## Part 7: Testing Plan

### Unit Tests Needed

| Area | Test Cases |
|------|------------|
| Age calculation | DOB → age group mapping |
| Benchmark lookup | Exact match, gender fallback, not found |
| Status calculation | All threshold boundaries |
| Assessment recording | With/without benchmark, batch |
| Passport creation | New vs existing |

### Integration Tests Needed

| Flow | Test Cases |
|------|------------|
| Sport → Skills | Create sport, add skills, verify link |
| Player → Assessment | Create player, assess, verify storage |
| Benchmark → Analytics | Import benchmarks, assess players, verify analytics |
| Goal → Progress | Create goal, assess skill, verify update |

### E2E Tests Needed

| Scenario | Steps |
|----------|-------|
| Full assessment flow | Coach logs in → selects player → rates skills → saves |
| Benchmark import | Admin uploads JSON → verifies benchmarks appear |
| Analytics accuracy | Multiple assessments → verify analytics correct |
| Parent view | Parent logs in → views child → sees latest skills |

---

## Appendix A: Key Code Locations

```
Backend Models:
├── packages/backend/convex/models/sports.ts
├── packages/backend/convex/models/skillBenchmarks.ts
├── packages/backend/convex/models/skillAssessments.ts
├── packages/backend/convex/models/sportPassports.ts
├── packages/backend/convex/models/sportAgeGroupConfig.ts
├── packages/backend/convex/models/referenceData.ts
└── packages/backend/convex/schema.ts

Frontend Platform:
├── apps/web/src/app/platform/sports/page.tsx
├── apps/web/src/app/platform/skills/page.tsx
└── apps/web/src/app/platform/skills/*.tsx (dialogs)

Frontend Admin:
├── apps/web/src/app/orgs/[orgId]/admin/benchmarks/page.tsx
├── apps/web/src/app/orgs/[orgId]/admin/analytics/page.tsx
└── apps/web/src/app/orgs/[orgId]/admin/teams/page.tsx

Frontend Coach:
├── apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx
├── apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx
└── apps/web/src/app/orgs/[orgId]/coach/goals/page.tsx

Frontend Player:
├── apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx
└── apps/web/src/app/orgs/[orgId]/players/[playerId]/components/*.tsx

Frontend Parent:
├── apps/web/src/app/orgs/[orgId]/parents/page.tsx
└── apps/web/src/app/orgs/[orgId]/parents/components/*.tsx

Shared Components:
├── apps/web/src/components/skill-radar-chart.tsx
├── apps/web/src/components/benchmark-comparison.tsx
└── apps/web/src/components/rating-slider.tsx
```

---

## Appendix B: Sample Data Structures

### Sport
```json
{
  "_id": "sport_123",
  "code": "rugby",
  "name": "Rugby Union",
  "governingBody": "IRFU",
  "description": "15-a-side rugby union",
  "isActive": true,
  "createdAt": 1704672000000
}
```

### Skill Definition
```json
{
  "_id": "skill_456",
  "categoryId": "cat_789",
  "sportCode": "rugby",
  "code": "front_on_tackle",
  "name": "Front-on Tackle",
  "description": "Ability to make a controlled front-on tackle",
  "level1Descriptor": "Cannot execute tackle safely",
  "level2Descriptor": "Executes with major technique issues",
  "level3Descriptor": "Executes with minor technique issues",
  "level4Descriptor": "Executes consistently with good technique",
  "level5Descriptor": "Executes with excellent technique under pressure",
  "ageGroupRelevance": ["u10", "u11", "u12", "u13", "u14", "u15", "u16", "u17", "u18", "u21", "senior"],
  "sortOrder": 1,
  "isActive": true
}
```

### Skill Benchmark
```json
{
  "_id": "bench_111",
  "sportCode": "rugby",
  "skillCode": "front_on_tackle",
  "ageGroup": "u14",
  "gender": "all",
  "level": "competitive",
  "expectedRating": 3.2,
  "minAcceptable": 2.0,
  "developingThreshold": 2.8,
  "excellentThreshold": 3.8,
  "percentile25": 2.5,
  "percentile50": 3.2,
  "percentile75": 3.8,
  "percentile90": 4.2,
  "source": "IRFU",
  "sourceYear": 2024,
  "isActive": true
}
```

### Skill Assessment
```json
{
  "_id": "assess_222",
  "passportId": "passport_333",
  "playerIdentityId": "player_444",
  "sportCode": "rugby",
  "skillCode": "front_on_tackle",
  "organizationId": "org_555",
  "rating": 4,
  "previousRating": 3,
  "assessmentDate": "2026-01-08",
  "assessmentType": "training",
  "assessedBy": "coach_666",
  "assessorRole": "coach",
  "benchmarkRating": 3.2,
  "benchmarkStatus": "exceeding",
  "notes": "Excellent improvement in tackling technique",
  "confidence": "high"
}
```

---

*End of Complete Review Document*
