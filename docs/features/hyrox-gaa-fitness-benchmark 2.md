# Hyrox & GAA Fitness Benchmark System

## Overview

This document defines a comprehensive fitness assessment system for personal trainers focused on **Hyrox racing** and **GAA fitness conditioning**. The system supports:

- **Age Groups:** U14, U16, U18, Adults (Senior)
- **Gender:** Male and Female
- **Level:** Recreational, Competitive, Elite
- **Sport Code:** `hyrox_gaa_fitness`

## About Hyrox

**Hyrox** is a global fitness racing competition combining:
- **8km Running** (1km segments between stations)
- **8 Workout Stations:**
  1. SkiErg (1000m)
  2. Sled Push (50m)
  3. Sled Pull (50m)
  4. Burpee Broad Jumps (80m)
  5. Rowing (1000m)
  6. Farmers Carry (200m)
  7. Sandbag Lunges (100m)
  8. Wall Balls (100 reps)

## GAA Fitness Requirements

GAA (Gaelic Athletic Association) games require:
- **Aerobic Endurance** - 60-70 minutes of sustained effort
- **Anaerobic Power** - Sprint bursts, high-intensity efforts
- **Speed & Agility** - Quick changes of direction
- **Strength & Power** - Contact situations, jumping, striking
- **Core Stability** - Balance, control, injury prevention
- **Acceleration** - First 5-10m sprint ability

## Skill Categories

### 1. Running & Endurance
Focus on aerobic capacity, pacing, and running efficiency essential for both Hyrox 8km segments and GAA match endurance.

### 2. Power & Strength
Functional strength movements including sled work, carries, and GAA-specific power requirements (tackling, jumping, striking).

### 3. Core & Stability
Core strength, balance, and stability for injury prevention and performance in both Hyrox stations and GAA movements.

### 4. Speed & Agility
Sprint speed, acceleration, change of direction, and reactive agility critical for GAA performance.

### 5. Hyrox Stations
Specific skills for the 8 Hyrox competition stations.

### 6. Movement Quality
Fundamental movement patterns, mobility, and technique that underpin all performance.

## Rating Scale (1-5)

All skills use a consistent 1-5 rating scale:

| Rating | Label | Description |
|--------|-------|-------------|
| **1** | Beginner | Cannot perform consistently or safely |
| **2** | Developing | Can perform with significant coaching cues |
| **3** | Competent | Can perform consistently in training |
| **4** | Proficient | Can perform under fatigue/pressure |
| **5** | Excellent | Outstanding, role model level |

## Age Group Considerations

### U14 (Under 14)
- **Focus:** Fundamental movement patterns, technique development
- **Intensity:** Recreational to Competitive only
- **Safety:** Emphasize form over load
- **Volume:** Reduced distances/reps vs adults

### U16 (Under 16)
- **Focus:** Building work capacity, strength foundation
- **Intensity:** Recreational to Competitive (Elite for select athletes)
- **Progressive Overload:** Gradual increase in training load
- **Volume:** 70-80% of adult standards

### U18 (Under 18)
- **Focus:** Performance development, competition readiness
- **Intensity:** All levels (Recreational, Competitive, Elite)
- **Near Adult Standards:** 85-95% of adult benchmarks
- **Specialization:** Begin sport-specific focus

### Adults (Senior)
- **Focus:** Peak performance, competition outcomes
- **Intensity:** All levels with clear differentiation
- **Full Standards:** 100% benchmarks
- **Maintenance:** Long-term athlete development

## Gender Considerations

### Male Athletes
- **Strength:** Higher absolute strength standards
- **Power:** Greater power output expectations
- **Speed:** Faster sprint times
- **Endurance:** Similar relative standards (adjusted for distance/time)

### Female Athletes
- **Strength:** Adjusted load standards (70-85% of male)
- **Power:** Adjusted power output (75-85% of male)
- **Speed:** Adjusted sprint times (85-90% of male pace)
- **Endurance:** Equivalent or superior relative standards
- **Technical:** Equal technique expectations

## Benchmark Levels

### Recreational
- **Goal:** Fitness, health, enjoyment
- **Hyrox:** Complete a Hyrox event (60-90min for adults)
- **GAA:** Club player fitness baseline

### Competitive
- **Goal:** Performance improvement, competition
- **Hyrox:** Target sub-90min (adults), age-group podiums
- **GAA:** County development panel fitness

### Elite
- **Goal:** High-performance, championships
- **Hyrox:** Target sub-75min (adults), elite age group/open
- **GAA:** County senior panel fitness

## Implementation Notes

### Assessment Protocol
1. **Pre-Assessment:** Health screening, injury history
2. **Warm-Up:** Standardized 15-minute protocol
3. **Testing Order:** Movement quality → Speed → Power → Endurance
4. **Rest Periods:** Adequate recovery between tests
5. **Recording:** Document conditions, equipment, assessor

### Safety Considerations
- **Youth Athletes:** Never max testing under age 14
- **Technique First:** Never sacrifice form for performance
- **Progressive:** Build capacity over time
- **Supervision:** All testing under qualified supervision
- **Medical Clearance:** Required for elite testing

### Frequency
- **Initial Assessment:** Baseline measurement
- **Youth (U14-U16):** Every 12 weeks
- **Youth (U18):** Every 8-10 weeks
- **Adults:** Every 6-8 weeks
- **Pre-Competition:** 2-3 weeks before major events

### Integration with Training
- **Prescriptive:** Use assessments to guide programming
- **Motivational:** Show progress over time
- **Goal Setting:** Link benchmarks to development goals
- **Individualized:** Adjust training based on strengths/weaknesses

## Data Sources

Benchmarks derived from:
- **Hyrox Official Standards** (2024 competition data)
- **GAA Sports Science Research** (Croke Park Sports Science Department)
- **LTAD Guidelines** (Long-Term Athlete Development)
- **Trainer Experience** (Personal trainer client data)
- **Industry Standards** (NSCA, UKSCA, CrossFit benchmarks)

## File Locations

- **Skills Import:** `/packages/backend/scripts/hyrox-gaa-fitness-skills.json`
- **Benchmarks Import:** `/packages/backend/scripts/hyrox-gaa-fitness-benchmarks.json`
- **This Documentation:** `/docs/features/hyrox-gaa-fitness-benchmark.md`

## Import Instructions

### Step 1: Create Sport (Platform Admin)
1. Navigate to `/platform/sports`
2. Click "Add Sport"
3. Enter:
   - **Code:** `hyrox_gaa_fitness`
   - **Name:** Hyrox & GAA Fitness
   - **Governing Body:** Hyrox / GAA
   - **Description:** Fitness assessment system for Hyrox racing and GAA conditioning

### Step 2: Import Skills (Platform Admin)
1. Navigate to `/platform/skills`
2. Select sport: "Hyrox & GAA Fitness"
3. Click "Bulk Import"
4. Upload `hyrox-gaa-fitness-skills.json`
5. Review and confirm import

### Step 3: Import Benchmarks (Platform Admin)
1. Use Convex dashboard or mutation call:
   ```typescript
   await api.models.skillBenchmarks.bulkImportBenchmarks({
     source: "Hyrox/GAA Standards",
     sourceDocument: "Hyrox & GAA Fitness Benchmark System v1.0",
     sourceYear: 2026,
     benchmarks: [/* from JSON file */]
   })
   ```

### Step 4: Verify Import
1. Check `/orgs/[orgId]/admin/benchmarks`
2. Verify all age groups and skills present
3. Test assessment flow in `/orgs/[orgId]/coach/assess`

## Future Enhancements

### Phase 2 (3-6 months)
- **Timed Tests:** Add specific time-based benchmarks (e.g., 1km row time)
- **Video Reference:** Link to video demonstrations of proper technique
- **Percentile Data:** Add percentile distributions from competition data
- **Seasonal Adjustments:** Pre-season vs in-season benchmarks

### Phase 3 (6-12 months)
- **Auto-Programming:** Generate training programs from assessment data
- **Progress Predictions:** ML-based performance trajectory
- **Comparative Analytics:** Anonymous comparison to similar athletes
- **Hyrox Simulation:** Estimated Hyrox finish time based on station assessments

---

**Document Version:** 1.0
**Created:** 2026-02-02
**Author:** Claude Code (via user request)
**Status:** Ready for Import
