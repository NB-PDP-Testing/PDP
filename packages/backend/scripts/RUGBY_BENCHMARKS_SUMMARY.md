# Rugby Skill Benchmarks - Generation Summary

**Date Generated:** February 3, 2026
**Source Research:** `/Users/neil/Documents/GitHub/PDP/docs/research/RUGBY_SKILL_STANDARDS_RESEARCH.md`
**Output File:** `/Users/neil/Documents/GitHub/PDP/packages/backend/scripts/rugby-benchmarks-IMPORT.json`

---

## Overview

Successfully generated **1,008 comprehensive benchmarks** for all 44 Rugby skills across all age groups, competitive levels, and gender classifications.

---

## Distribution Summary

### By Age Group
- **U10**: 44 benchmarks (Recreational only)
- **U12**: 88 benchmarks (Recreational, Competitive)
- **U14**: 219 benchmarks (Recreational, Competitive, Elite)
- **U16**: 219 benchmarks (Recreational, Competitive, Elite)
- **U18**: 219 benchmarks (Recreational, Competitive, Elite)
- **Senior**: 219 benchmarks (Recreational, Competitive, Elite)

### By Competitive Level
- **Recreational**: 380 benchmarks
- **Competitive**: 336 benchmarks
- **Elite**: 292 benchmarks

### By Gender Classification
- **All**: 312 benchmarks
- **Male**: 348 benchmarks
- **Female**: 348 benchmarks

---

## Rating Distribution

- **Range**: 1.0 - 4.5
- **Average**: 3.24
- **Pattern**: min/dev/exc = expectedRating ± 0.5

---

## Gender Classification Approach

### "All" Gender (312 benchmarks)
Skills where technique quality = performance standard:
- **All Tactical Skills** (all ages)
  - Decision Making
  - Reading Defense
  - Positional Understanding
  - Support Play (Attack/Defense)
  - Communication on Field
  - Spatial Awareness
  - Game Sense / Instinct
  - Following Game Plan

- **Technical Execution Skills** (all ages)
  - Pass Accuracy (Left/Right)
  - Ball Security
  - Chest / Body Catch
  - Hands Ready Position
  - Watch Ball Into Hands

### Gender-Specific from U14+ (696 benchmarks)
Skills with physical component (strength/power/speed):

- **Contact Skills**
  - Tackle Technique
  - Tackle Completion
  - Body Position in Contact
  - Leg Drive Through Contact
  - Ball Presentation
  - Ruck Entry / Cleanout
  - Jackaling / Turnovers
  - Offload in Contact

- **Kicking Skills** (distance/power)
  - Kicking Distance
  - Punt Kick (Left/Right)

- **Running/Evasion** (speed differential)
  - Evasion (Side Step/Swerve)
  - Pass Under Pressure

**Note:** U10-U12 use "all" gender for these skills (pre-puberty, mixed teams permitted).

---

## Skill-Specific Benchmark Patterns

### Tactical Skills (9 skills)
- **Develop slower**: Start at 1.0 for U10, progress gradually
- **Gender**: "all" at all age groups
- **U10 Recreational**: 1.0
- **U12 Recreational/Competitive**: 1.5-2.0 / 2.0-2.5
- **U14-Senior**: Standard progression

**Example - Decision Making (U10 Rec):**
- Expected Rating: 1.0
- Notes: "Foundation age - learning basic concepts"

### Contact Skills (8 skills)
- **Progressive introduction**: U10 tag→contact, U12 progressive, U14+ full contact
- **Gender**: "all" U10-U12, gender-specific U14+
- **Safety emphasis**: All ages
- **U10**: 1.0-1.5 (tag to contact transition)
- **U12**: 2.0-2.5 (progressive contact with restrictions)
- **U14+**: Standard progression

**Example - Tackle Technique (U10 Rec):**
- Expected Rating: 1.5
- Notes: "Tag to contact transition - progressive contact with World Rugby Tackle Ready. Kneeling and walking speed only. Safety emphasis."

**Example - Tackle Technique (U14 Elite Male):**
- Expected Rating: 3.5
- Notes: "Full contact with age-appropriate restrictions. Safe technique at game speed. Head position safety critical"

### Kicking Skills (8 skills)
- **Not introduced**: U10 (rating 1.0)
- **Introduction**: U12 (1.5-2.0)
- **Gender**: "all" U10-U12, gender-specific U14+ for distance skills
- **Position-specific notes**: Senior elite

**Example - Kicking Distance (U10 Rec):**
- Expected Rating: 1.0
- Notes: "Not yet introduced - optional if included"

**Example - Kicking Distance (Senior Elite Male):**
- Expected Rating: 4.5
- Notes: "Professional/international standard 50m+ (backs), 40m+ (forwards)"

**Example - Kicking Distance (Senior Elite Female):**
- Expected Rating: 4.5
- Notes: "Professional/international standard 45m+ (backs), 35m+ (forwards)"

### Advanced Skills (Specialist)
- **Spiral / Long Pass**: Not until U14
- **Jackaling / Turnovers**: Not until U14
- **Dummy Pass**: Not expected until U12

---

## Expected Rating Progression by Age/Level

| Age | Recreational | Competitive | Elite |
|-----|-------------|-------------|-------|
| U10 | 1.5 | - | - |
| U12 | 2.0 | 2.5 | - |
| U14 | 2.5 | 3.0 | 3.5 |
| U16 | 3.0 | 3.5 | 4.0 |
| U18 | 3.0 | 3.5 | 4.0 |
| Senior | 3.0 | 4.0 | 4.5 |

**Adjustments Applied:**
- Tactical skills: -0.5 at younger ages
- Contact skills: Capped at U10-U12
- Kicking skills: Lower at U10-U12
- Specialist skills: 1.0 if not yet introduced

---

## Quality Assurance

### Validation Checks Passed
✅ JSON structure valid
✅ 1,008 total benchmarks
✅ All 44 skills included
✅ All age groups covered
✅ Gender classifications correct
✅ Rating ranges appropriate (1.0-4.5)
✅ min/dev/exc thresholds consistent
✅ Skill-specific notes included

### Sample Benchmarks Verified
✅ U10 tactical skills (low ratings)
✅ U12 kicking introduction
✅ U14 gender-specific contact skills
✅ U16 elite kicking distance (gender-specific notes)
✅ Senior elite professional standards

---

## Key Implementation Notes

### 1. Safety Emphasis (Contact Skills)
All contact skill benchmarks at all ages include safety-focused notes:
- U10: "Safe technique emphasis"
- U12: "Progressive contact with safety restrictions"
- U14+: "Head position safety critical"

### 2. Bilateral Development (Passing/Kicking)
Left/Right skill pairs include:
- "Bilateral development essential"
- Same ratings for both sides at same age/level

### 3. Age-Appropriate Context
Notes reflect developmental phase:
- U10: "Foundation age"
- U12: "Introduction to..."
- U14: "Full contact / Developed technique"
- U16: "Academy standard"
- Senior: "Professional level"

### 4. Position-Specific Guidance
Where relevant (e.g., kicking at elite levels):
- Backs vs Forwards expectations noted
- Distance targets specified by position

---

## Next Steps

1. **Import to Database**
   - Use standard benchmark import script
   - Verify all records created correctly

2. **Validation Testing**
   - Test gender classification logic
   - Test age-appropriate benchmark retrieval
   - Verify level-based filtering

3. **Coach Education**
   - Document how to use benchmarks
   - Explain gender classification approach
   - Provide examples of assessment

4. **Future Enhancements**
   - Consider position-specific benchmarks (forwards vs backs)
   - Add success rate targets where applicable
   - Link to video examples of each rating level

---

## Research Acknowledgment

These benchmarks are **research-informed** but **not officially sanctioned** by World Rugby or any national governing body.

Key sources:
- World Rugby Long Term Player Development framework
- RFU/IRFU/WRU age-grade guidelines
- Academic research on talent identification
- Bangor Rugby Assessment Tool (BRAT) methodology
- Physical testing standards for elite U19 players

**Important:** No official numerical skill rating system exists in rugby. These benchmarks represent a synthesis of coaching best practices, developmental frameworks, and research findings adapted to a 1-5 rating scale.

---

**Generated by:** Claude AI (Anthropic)
**Script:** `generate-rugby-benchmarks.py`
**Version:** 1.0
