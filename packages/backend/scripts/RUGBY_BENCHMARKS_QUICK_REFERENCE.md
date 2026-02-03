# Rugby Benchmarks - Quick Reference

**File:** `rugby-benchmarks-IMPORT.json`
**Total Benchmarks:** 1,008
**All Skills:** 44 skills across 6 age groups

---

## Quick Stats

| Age Group | Total | Levels | Genders |
|-----------|-------|--------|---------|
| U10 | 44 | Rec | all |
| U12 | 88 | Rec, Comp | all |
| U14 | 219 | Rec, Comp, Elite | all/male/female |
| U16 | 219 | Rec, Comp, Elite | all/male/female |
| U18 | 219 | Rec, Comp, Elite | all/male/female |
| Senior | 219 | Rec, Comp, Elite | all/male/female |

---

## Rating Quick Guide

### By Age/Level
```
U10 Rec:    1.0-2.0  (Foundation)
U12 Rec:    2.0      (Competent fundamentals)
U12 Comp:   2.5      (Above average)
U14 Rec:    2.5      (Functional competence)
U14 Comp:   3.0      (Strong skills)
U14 Elite:  3.5      (County/dev squad)
U16 Rec:    3.0      (Competent)
U16 Comp:   3.5      (Representative)
U16 Elite:  4.0      (Academy standard)
U18 Rec:    3.0      (Adult baseline)
U18 Comp:   3.5      (Strong club)
U18 Elite:  4.0      (Academy/U20)
Senior Rec: 3.0      (Social/club)
Senior Comp:4.0      (High-level club)
Senior Elite:4.5     (Professional)
```

### Special Cases
- **Tactical skills**: Start lower (1.0 at U10)
- **Contact skills**: U10 = 1.5, U12 ≤ 2.5
- **Kicking skills**: U10 = 1.0, U12 = 1.5-2.0
- **Advanced skills**: Jackaling, Spiral Pass = 1.0 until U14

---

## Gender Classification Quick Check

### Always "all" Gender
```
✓ All 9 Tactical Skills
✓ Pass Accuracy (L/R)
✓ Ball Security
✓ Chest/Body Catch
✓ Hands Ready
✓ Watch Ball In
```

### Gender-Specific from U14+
```
✓ All 8 Contact Skills
✓ Kicking Distance
✓ Punt Kicks (L/R)
✓ Evasion skills
✓ Pass Under Pressure
```

---

## Benchmark Structure

```json
{
  "sportCode": "rugby",
  "skillName": "Skill Name",
  "ageGroup": "U10|U12|U14|U16|U18|Senior",
  "gender": "all|male|female",
  "level": "recreational|competitive|elite",
  "expectedRating": 1.0-4.5,
  "minAcceptable": expectedRating - 0.5,
  "developingThreshold": expectedRating,
  "excellentThreshold": expectedRating + 0.5,
  "notes": "Contextual notes..."
}
```

---

## Common Queries

### Get all U10 benchmarks
```
Filter: ageGroup = "U10"
Count: 44
```

### Get U14 Elite Male Tackle Technique
```
Filter: ageGroup="U14", level="elite", gender="male", skillName="Tackle Technique"
Expected: 3.5
```

### Get Senior Elite Kicking Distance (both genders)
```
Filter: ageGroup="Senior", level="elite", skillName="Kicking Distance"
Male: 4.5 (50m+ backs, 40m+ forwards)
Female: 4.5 (45m+ backs, 35m+ forwards)
```

### Get all Tactical Skills for any age/level
```
Filter: skillName IN (Decision Making, Reading Defense, ...)
Gender: Always "all"
```

---

## Import Notes

1. **Validation**: All 1,008 benchmarks validated ✅
2. **Coverage**: All 44 skills × all applicable age/level/gender combinations
3. **Gender Logic**: Hybrid approach (all vs gender-specific) correctly applied
4. **Rating Progression**: Age-appropriate ratings with skill-type adjustments
5. **Notes**: Contextual notes for every benchmark

---

## Key Principles

1. **Safety First**: Contact skills emphasize safe technique at all ages
2. **Progressive Development**: Age-appropriate introduction and progression
3. **Bilateral Development**: Left/Right skills have equal ratings
4. **Gender Equity**: Same technique standards, gender-specific only where physical components differ
5. **Research-Informed**: Based on LTPD framework, not official sanctioned standards

---

**Generated:** February 3, 2026
**For:** PlayerARC/PDP Rugby Assessment System
