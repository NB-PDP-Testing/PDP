# Irish Dancing Skill Mapping - Grade to Competition System

## Overview

This document maps the traditional CLRG Grade Examination criteria (4 broad areas) to the detailed competition-based skill taxonomy (25 specific skills).

**Context:** As part of consolidation (Option 3B), we unified two Irish Dancing assessment systems into a single comprehensive framework using the 25 detailed skills with both competition-level and grade-level benchmarks.

---

## Traditional Grade Criteria → Detailed Skills Mapping

### 1. Timing & Rhythm (Grade Criterion)

Maps to **3 specific skills:**

| Skill | Code | Category | Description |
|-------|------|----------|-------------|
| **Rhythm & Timing** | `rhythm_timing` | Performance | Timing accuracy and rhythmic precision with music |
| **Musicality** | `musicality` | Performance | Connection to music, phrasing, and musical interpretation |
| **Flow & Continuity** | `flow_continuity` | Performance | Smooth transitions and consistent rhythmic flow |

**Grade Assessment Focus:** Basic timing accuracy → Musical interpretation → Advanced rhythmic complexity

---

### 2. Technique (Grade Criterion)

Maps to **11 specific skills:**

#### Footwork & Technique (7 skills)
| Skill | Code | Description |
|-------|------|-------------|
| **Toe Point** | `toe_point` | Pointed foot technique and articulation |
| **Turnout** | `turnout` | Hip rotation and proper foot positioning |
| **Elevation on Toes** | `elevation_on_toes` | Height and control on balls of feet |
| **Weight Placement** | `weight_placement` | Proper weight distribution and balance |
| **Footwork Speed** | `footwork_speed` | Tempo and speed of footwork execution |
| **Precision & Clarity** | `precision_clarity` | Clean and accurate step execution |
| **Crossing at Knees** | `crossing_at_knees` | Proper leg crossing technique |

#### Hard Shoe Technique (3 skills)
| Skill | Code | Description |
|-------|------|-------------|
| **Trebles/Toe Technique** | `trebles_toe_technique` | Hard shoe toe work precision and clarity |
| **Stamps & Heel Clicks** | `stamps_heel_clicks` | Hard shoe heel work clarity and sound quality |
| **Rhythmic Drumming** | `rhythmic_drumming` | Rhythmic complexity and sound production in hard shoe |

#### Movement Quality (1 skill)
| Skill | Code | Description |
|-------|------|-------------|
| **Lightness & Spring** | `lightness_spring` | Bounce, lightness, and spring quality in movement |

**Grade Assessment Focus:** Basic foot positions → Technical execution → Advanced technique mastery

---

### 3. Presentation & Carriage (Grade Criterion)

Maps to **8 specific skills:**

#### Posture & Carriage (5 skills)
| Skill | Code | Description |
|-------|------|-------------|
| **Upper Body Control** | `upper_body_control` | Stillness and control of upper body during footwork |
| **Head Position** | `head_position` | Proper head carriage and alignment |
| **Arm Placement** | `arm_placement` | Correct arm positioning at sides |
| **Back Alignment** | `back_alignment` | Upright posture and spinal alignment |
| **Shoulder Position** | `shoulder_position` | Relaxed yet controlled shoulder placement |

#### Performance (3 skills)
| Skill | Code | Description |
|-------|------|-------------|
| **Stage Presence** | `stage_presence` | Confidence, poise, and presentation quality |
| **Facial Expression** | `facial_expression` | Appropriate facial animation and engagement |
| **Performance Quality** | `performance_quality` | Overall execution and performance delivery |

**Grade Assessment Focus:** Basic posture control → Stage presence → Professional presentation

---

### 4. Musicality & Expression (Grade Criterion)

Maps to **3 specific skills:**

| Skill | Code | Category | Description |
|-------|------|----------|-------------|
| **Musicality** | `musicality` | Performance | Musical interpretation and connection to music |
| **Facial Expression** | `facial_expression` | Performance | Facial animation expressing music and character |
| **Performance Quality** | `performance_quality` | Performance | Artistic expression and performance delivery |

**Note:** These skills overlap with Presentation & Carriage, reflecting the holistic nature of performance assessment.

**Grade Assessment Focus:** Basic musical awareness → Expressive performance → Artistic interpretation

---

## Unique Skills Not in Traditional Grade Criteria

The following skills provide additional granularity beyond traditional grade assessments:

### Movement Quality & Athletic Skills

| Skill | Code | Category | Added Value |
|-------|------|----------|-------------|
| **Jump Height** | `jump_height` | Movement Quality | Quantifies elevation in jumps (not explicitly graded traditionally) |
| **Landing Control** | `landing_control` | Movement Quality | Assesses landing technique and control |
| **Stamina & Endurance** | `stamina_endurance` | Performance | Measures ability to maintain quality throughout performance |

**Rationale:** These skills are implied in traditional grading but not explicitly assessed. The detailed system makes expectations clear.

---

## How Grades Work in Unified System

### Grade-Level Benchmarks

Each of the 25 skills now has benchmarks for all 13 CLRG grades:

- **Preliminary** (recreational, 1.5 expected)
- **Grades 1-2** (recreational, 1.5-2.0 expected)
- **Grades 3-5** (development, 2.5-3.0 expected)
- **Grades 6-8** (competitive, 3.5-4.0 expected)
- **Grades 9-12** (elite, 4.0-5.0 expected)

### Assessment Examples

**Traditional Grade System:**
```
Grade 3 Assessment:
✓ Timing & Rhythm: 3/5
✓ Technique: 2/5
✓ Presentation & Carriage: 3/5
✓ Musicality & Expression: 3/5
```

**Unified Detailed System:**
```
Grade 3 Assessment (same student):
Timing & Rhythm:
  ✓ Rhythm & Timing: 3.0/5.0
  ✓ Musicality: 3.0/5.0
  ✓ Flow & Continuity: 3.0/5.0

Technique:
  ✓ Toe Point: 2.5/5.0
  ✓ Turnout: 2.0/5.0
  ✓ Precision & Clarity: 2.5/5.0
  ... (8 more technique skills)

Presentation & Carriage:
  ✓ Upper Body Control: 3.0/5.0
  ✓ Stage Presence: 3.0/5.0
  ... (6 more posture/performance skills)
```

**Benefit:** Teachers and students get specific feedback on exactly which technical elements need work, rather than a single broad score.

---

## UI Implementation Notes

### Displaying Grade Assessments

When viewing a Grade Examination assessment, the UI should:

1. **Group by Traditional Criteria** (for familiarity):
   - Show traditional 4-category structure
   - Expand to show detailed skills within each category

2. **Grade Context Badge**:
   - Display "Grade 5 Assessment" or "Preliminary Grade" prominently
   - Show grade-specific benchmarks (not competition-level ones)

3. **Progress Tracking**:
   - Show progress toward next grade
   - Compare against grade-specific expected ratings

### Example UI Structure

```
📋 Grade 5 Assessment - Emma Murphy (Age 11)

┌─ Timing & Rhythm ─────────────────────────┐
│ ⭐ 2.8/5.0 (Grade 5 Expected: 3.0)       │
│                                            │
│ • Rhythm & Timing        3.0/5.0  ✓       │
│ • Musicality             2.5/5.0  ↗       │
│ • Flow & Continuity      3.0/5.0  ✓       │
└────────────────────────────────────────────┘

┌─ Technique ───────────────────────────────┐
│ ⭐ 2.9/5.0 (Grade 5 Expected: 3.0)       │
│                                            │
│ • Toe Point              3.5/5.0  ✓       │
│ • Turnout                2.5/5.0  ↗       │
│ • Precision & Clarity    3.0/5.0  ✓       │
│ • [+8 more...]                             │
└────────────────────────────────────────────┘

... (Presentation & Musicality sections)
```

---

## Benefits of Unified System

### For Students
- ✅ Specific feedback on exactly what to improve
- ✅ Same skills tracked across grade exams and competitions
- ✅ Clear progression path

### For Teachers
- ✅ Detailed assessment rubric
- ✅ Can use same skills for all contexts (grades, competitions, practice)
- ✅ Better progress tracking over time

### For System
- ✅ Single source of truth for skill definitions
- ✅ Consistent data model
- ✅ 1,025 total benchmarks covering all contexts (700 competition + 325 grade)
- ✅ Less maintenance than parallel systems

---

## Migration Summary

**What Changed:**
- Deleted: 64 grade-specific skills (4 criteria × 13 grades × repetition)
- Kept: 25 detailed competition skills
- Added: 325 grade-level benchmarks for existing 25 skills
- Total benchmarks: 1,025 (700 competition + 325 grade)

**What Stayed:**
- All CLRG grade levels (Preliminary + Grades 1-12)
- Grade examination assessment capability
- Traditional 4-category conceptual framework (via skill grouping)

**What Improved:**
- More detailed feedback (25 skills vs 4 criteria)
- Unified skill taxonomy across all contexts
- Complete benchmark coverage (old system had 0 benchmarks)

---

## Questions & Clarifications

**Q: Will this confuse teachers familiar with old 4-category system?**
A: No - UI can display grouped by traditional categories. Teachers see familiar structure but get more detail.

**Q: Are grade standards different from competition standards?**
A: Yes - benchmarks are context-specific. Grade 5 "Toe Point" expectations differ from U12 Competitive "Toe Point" expectations.

**Q: Can a student be assessed in both contexts?**
A: Yes - same 25 skills, different benchmarks. One student might have:
- Grade 7 assessment (grade context)
- U14 Competitive assessment (competition context)
- Both tracked using same skill definitions

**Q: What if CLRG changes grade requirements?**
A: Update grade benchmark values - skill definitions remain stable.

---

## Technical Implementation

### Database Queries

**Get Grade Assessment Benchmarks:**
```typescript
const gradeBenchmarks = await ctx.db
  .query("skillBenchmarks")
  .withIndex("by_context", q =>
    q.eq("sportCode", "irish_dancing")
     .eq("ageGroup", "Grade 5")  // Grade as ageGroup
     .eq("level", "development")  // Maps to development level
  )
  .collect();
```

**Get Competition Assessment Benchmarks:**
```typescript
const compBenchmarks = await ctx.db
  .query("skillBenchmarks")
  .withIndex("by_context", q =>
    q.eq("sportCode", "irish_dancing")
     .eq("ageGroup", "U12")  // Age group
     .eq("level", "competitive")  // Competition level
  )
  .collect();
```

### Distinguishing Grade vs Competition

```typescript
const isGradeAssessment = ageGroup.startsWith("Grade") ||
                          ageGroup === "Preliminary";

const isCompetitionAssessment = ["U6", "U8", "U10", "U12", "U14",
                                  "U16", "U18", "Adult"].includes(ageGroup);
```

---

**Document Version:** 1.0
**Last Updated:** 2026-02-04
**Status:** Implemented (Option 3B Consolidation Complete)
