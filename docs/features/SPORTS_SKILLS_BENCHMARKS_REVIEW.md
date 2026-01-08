# Sports Management & Skills Benchmarks - Feature Review Plan

**Created:** January 8, 2026
**Status:** PLANNING - Ready for tomorrow's deep dive
**Purpose:** Comprehensive review, documentation, and improvement planning for sports, skills, and benchmarks features

---

## Overview

This document outlines the scope for a comprehensive review of the Sports Management and Skills Benchmarks features. The goal is to:

1. **Review** - Understand current implementation end-to-end
2. **Document** - Create clear feature specs and user flows
3. **Identify Gaps** - Find missing functionality or unclear flows
4. **Plan Improvements** - Document opportunities and prioritize work
5. **Test** - Create comprehensive testing plan

---

## Scope of Review

### Feature Areas

| Area | Platform Level | Org Level | Player Level |
|------|---------------|-----------|--------------|
| **Sports** | Create/manage sports | Org uses sports | Player enrolled in sport |
| **Skills** | Define skills per sport | Org benchmarks | Player assessed on skills |
| **Benchmarks** | Global defaults | Org-specific benchmarks | Player compared to benchmarks |
| **Age Groups** | Age group rules | Team age groups | Player age group |
| **Assessments** | Assessment templates | Coach assessments | Player skill ratings |

### Key Questions to Answer

1. How does a sport flow from platform creation to player enrollment?
2. How do skills get assigned to a sport and then assessed?
3. How do benchmarks work at platform vs org vs player level?
4. What is the relationship between skills, assessments, and player progress?
5. Are there any orphaned or disconnected data paths?

---

## Files to Review

### Frontend - Platform Level

| File | Purpose | Lines |
|------|---------|-------|
| `apps/web/src/app/platform/sports/page.tsx` | Sports management UI | 812 |
| `apps/web/src/app/platform/skills/page.tsx` | Skills management UI | 2,006 |
| `apps/web/src/app/platform/skills/bulk-import-dialog.tsx` | Bulk import skills | 934 |
| `apps/web/src/app/platform/skills/edit-sport-dialog.tsx` | Edit sport details | TBD |
| `apps/web/src/app/platform/skills/delete-sport-dialog.tsx` | Delete sport | TBD |

### Frontend - Org Level

| File | Purpose | Lines |
|------|---------|-------|
| `apps/web/src/app/orgs/[orgId]/admin/benchmarks/page.tsx` | Org benchmarks UI | 824 |
| `apps/web/src/app/orgs/[orgId]/coach/assess/page.tsx` | Coach assessment UI | 2,039 |
| `apps/web/src/components/benchmark-comparison.tsx` | Benchmark display | 477 |
| `apps/web/src/components/skill-radar-chart.tsx` | Skill visualization | 567 |

### Backend - Data Models

| File | Purpose |
|------|---------|
| `packages/backend/convex/models/sports.ts` | Sports CRUD |
| `packages/backend/convex/models/skillBenchmarks.ts` | Benchmark definitions |
| `packages/backend/convex/models/skillAssessments.ts` | Player assessments |
| `packages/backend/convex/models/sportPassports.ts` | Player sport enrollment |
| `packages/backend/convex/models/sportAgeGroupConfig.ts` | Age group configuration |
| `packages/backend/convex/models/referenceData.ts` | Reference data (skills?) |

### Backend - Schema

| File | Purpose |
|------|---------|
| `packages/backend/convex/schema.ts` | Database schema definitions |

### Backend - Utilities

| File | Purpose |
|------|---------|
| `packages/backend/convex/lib/ageGroupUtils.ts` | Age group calculations |
| `packages/backend/convex/scripts/seedDefaultSportRules.ts` | Default sport seeding |

---

## Data Model Questions

### Sports

- [ ] What fields define a sport?
- [ ] How are sports linked to organizations?
- [ ] Can orgs create custom sports or only use platform sports?
- [ ] What is the sport lifecycle (draft → active → archived)?

### Skills

- [ ] How are skills organized (categories, groups)?
- [ ] What attributes does a skill have?
- [ ] How are skills linked to sports?
- [ ] Can skills be shared across sports?
- [ ] What is the skill rating scale?

### Benchmarks

- [ ] What is the benchmark data structure?
- [ ] How do platform-level vs org-level benchmarks work?
- [ ] How are benchmarks tied to age groups?
- [ ] How do benchmarks evolve over time?
- [ ] What statistics are tracked (mean, median, percentiles)?

### Assessments

- [ ] How does a coach create an assessment?
- [ ] What is the assessment workflow?
- [ ] How are assessments linked to players, skills, and benchmarks?
- [ ] Can assessments be edited/deleted?
- [ ] How is assessment history tracked?

### Sport Passports

- [ ] What is a sport passport?
- [ ] How does it relate to player enrollment?
- [ ] What data does it contain?
- [ ] How does it track progress over time?

---

## User Flows to Document

### Flow 1: Platform Admin Creates a New Sport

```
Platform Admin
    ↓
Platform > Sports page
    ↓
Click "Add Sport"
    ↓
Enter sport details (name, code, description, icon?)
    ↓
Save → Sport created
    ↓
Navigate to Platform > Skills
    ↓
Select sport
    ↓
Add skills to sport (manual or bulk import)
    ↓
Define skill categories and attributes
    ↓
Sport ready for orgs to use
```

**Questions:**
- What are all the required fields?
- What validation exists?
- Can skills be reordered?
- Are there skill templates?

### Flow 2: Org Admin Configures Sport for Organization

```
Org Admin
    ↓
Admin > Settings or Benchmarks
    ↓
Select/enable sports for org
    ↓
Configure org-specific benchmarks
    ↓
Set age group configurations
    ↓
Sport ready for players
```

**Questions:**
- How does an org "adopt" a platform sport?
- Can orgs customize skill lists?
- How do org benchmarks override platform defaults?

### Flow 3: Player Gets Enrolled in Sport

```
Player imported/created
    ↓
Assigned to age group
    ↓
Enrolled in organization
    ↓
Sport passport created (?)
    ↓
Player visible in sport-specific views
```

**Questions:**
- Is sport assignment automatic or manual?
- What triggers sport passport creation?
- Can a player have multiple sports?

### Flow 4: Coach Assesses Player Skills

```
Coach
    ↓
Coach Dashboard > Assess
    ↓
Select player(s)
    ↓
Select skill category
    ↓
Rate skills (1-5? 1-10?)
    ↓
Add notes (optional)
    ↓
Submit assessment
    ↓
Assessment saved
    ↓
Player progress updated
    ↓
Benchmark comparison available
```

**Questions:**
- What is the rating scale?
- Can partial assessments be saved?
- How are assessments aggregated?
- What triggers benchmark comparison?

### Flow 5: Parent Views Child's Progress

```
Parent
    ↓
Parent Portal > Children
    ↓
Select child
    ↓
View skill progress
    ↓
See radar chart
    ↓
See benchmark comparison
    ↓
See historical progress
```

**Questions:**
- What visualizations exist?
- How is progress calculated?
- What time periods are shown?

---

## Testing Plan Structure

### Unit Tests

| Area | Tests Needed |
|------|--------------|
| Sports CRUD | Create, read, update, delete, validation |
| Skills CRUD | Create, read, update, delete, bulk import |
| Benchmarks | Create, update, age group filtering |
| Assessments | Create, update, validation, aggregation |
| Sport Passports | Creation, updates, history |

### Integration Tests

| Flow | Tests Needed |
|------|--------------|
| Sport → Skills | Skills properly linked to sport |
| Org → Sport | Org can adopt and configure sport |
| Player → Sport | Player enrollment creates passport |
| Assessment → Benchmark | Assessment triggers comparison |
| Progress → Visualization | Data flows to charts correctly |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| Full sport setup | Platform creates sport → adds skills → org adopts → player enrolled → coach assesses → parent views |
| Benchmark comparison | Set benchmarks → assess player → verify comparison |
| Bulk skill import | Upload CSV → verify skills created |
| Multi-sport player | Player in 2 sports → separate tracking |

### Edge Cases

- [ ] Sport with no skills
- [ ] Skill with no assessments
- [ ] Player with no sport passport
- [ ] Benchmark with missing age group data
- [ ] Assessment for archived skill
- [ ] Org with no benchmarks configured

---

## Improvement Opportunities (To Identify)

### Potential UX Improvements

- [ ] Skill import wizard
- [ ] Benchmark visualization dashboard
- [ ] Assessment templates
- [ ] Bulk assessment entry
- [ ] Progress reports generation
- [ ] Parent notification on new assessment

### Potential Technical Improvements

- [ ] Caching for benchmark calculations
- [ ] Real-time assessment updates
- [ ] Offline assessment support
- [ ] Assessment draft autosave
- [ ] Bulk operations optimization

### Potential Feature Additions

- [ ] Custom skill categories per org
- [ ] Assessment scheduling
- [ ] Goal setting tied to benchmarks
- [ ] Peer comparison (anonymous)
- [ ] Coach collaboration on assessments

---

## Tomorrow's Agenda

### Morning Session: Discovery

1. **Read through all frontend files** listed above
2. **Read through all backend models** listed above
3. **Map data relationships** (create ERD)
4. **Document current user flows** with screenshots

### Afternoon Session: Analysis

1. **Identify gaps** in current implementation
2. **Document unclear flows**
3. **List improvement opportunities**
4. **Prioritize improvements**

### Output Deliverables

1. **Feature Specification Document** - Complete feature description
2. **User Flow Diagrams** - Visual flow documentation
3. **Data Model ERD** - Entity relationship diagram
4. **Testing Plan** - Comprehensive test cases
5. **Improvement Backlog** - Prioritized list of enhancements

---

## Related Documentation

- `/docs/ux/UX_IMPLEMENTATION_AUDIT.md` - UX component status
- `/docs/ux/UX_IMPLEMENTATION_PLAN.md` - Overall UX plan
- `/docs/ux/UX_FEATURE_FLAGS_GUIDE.md` - Feature flag reference

---

## Notes

*Add notes during tomorrow's review session here*

### Questions Raised

-

### Discoveries

-

### Blockers

-

---

*End of Planning Document*
