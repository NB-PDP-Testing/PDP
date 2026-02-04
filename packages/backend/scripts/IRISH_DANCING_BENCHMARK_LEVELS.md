# Irish Dancing Benchmark Level Mappings

## Overview

The Irish Dancing benchmarks have been regenerated to use database schema-compliant level values.

## Database Schema Levels

The `sportSkillBenchmarks` table only accepts these four levels:
- `recreational`
- `development`
- `competitive`
- `elite`

## CLRG Competition Level Mappings

Irish Dancing has 6 traditional CLRG competition levels, which have been mapped to the 4 database levels:

| CLRG Competition Level | Database Level | Rationale |
|------------------------|----------------|-----------|
| Beginner | `recreational` | Entry-level dancers learning fundamentals |
| Advanced Beginner | `development` | Developing skills and building foundations |
| Novice | `competitive` | First competitive level |
| Prizewinner | `competitive` | Advanced competitive level (combined with Novice) |
| Preliminary Championship | `elite` | Pre-championship level |
| Open Championship | `elite` | Highest championship level (combined with Prelim) |

## Age Group Distributions

| Age Group | Levels Available | Benchmark Count |
|-----------|------------------|-----------------|
| U6 | recreational, development | 50 (25 skills × 2 levels) |
| U8 | recreational, development, competitive | 75 (25 skills × 3 levels) |
| U10 | recreational, development, competitive | 75 (25 skills × 3 levels) |
| U12 | recreational, development, competitive, elite | 100 (25 skills × 4 levels) |
| U14 | recreational, development, competitive, elite | 100 (25 skills × 4 levels) |
| U16 | recreational, development, competitive, elite | 100 (25 skills × 4 levels) |
| U18 | recreational, development, competitive, elite | 100 (25 skills × 4 levels) |
| Adult | recreational, development, competitive, elite | 100 (25 skills × 4 levels) |

**Total: 700 benchmarks**

## Skills Covered (25 total)

1. Upper Body Control
2. Arm Placement
3. Shoulder Position
4. Head Position
5. Back Alignment
6. Turnout
7. Toe Point
8. Crossing at Knees
9. Weight Placement
10. Elevation on Toes
11. Lightness & Spring
12. Jump Height
13. Landing Control
14. Footwork Speed
15. Trebles/Toe Technique
16. Rhythmic Drumming
17. Stamps & Heel Clicks
18. Precision & Clarity
19. Rhythm & Timing
20. Musicality
21. Flow & Continuity
22. Performance Quality
23. Stage Presence
24. Facial Expression
25. Stamina & Endurance

## Notes Field Format

Each benchmark's `notes` field follows this pattern:
```
"[Competition Level Context] [Age Group]: [skill description]"
```

Examples:
- `"Beginner U6: keeping arms at sides"` (recreational)
- `"Advanced Beginner U8: consistent arm control"` (development)
- `"Novice/Prizewinner U10: controlled stillness with choreography"` (competitive)
- `"Preliminary/Open Championship U14: perfect stillness under pressure"` (elite)

This preserves the CLRG context while using database-compliant level values.

## Expected Rating Progression

| Level | Typical Rating Range | Description |
|-------|---------------------|-------------|
| recreational | 1.5 | Learning fundamentals |
| development | 2.0 | Developing consistency |
| competitive | 3.0-3.5 | Strong execution with speed |
| elite | 4.0-4.5 | Championship-level excellence |

## File Details

- **File**: `irish-dancing-benchmarks-IMPORT.json`
- **Generator**: `generate-irish-dancing-benchmarks.js`
- **Size**: ~241KB
- **Lines**: 8,406
- **Format**: JSON with `{ benchmarks: [...] }` structure

## Unique Constraint Compliance

Each benchmark has a unique combination of:
- `sportCode` (always "irish_dancing")
- `skillName` (one of 25 skills)
- `ageGroup` (one of 8 age groups)
- `gender` (always "all")
- `level` (one of 4 database levels)

This matches the database schema's unique constraint.

## Regeneration

To regenerate the benchmarks file:

```bash
cd /Users/neil/Documents/GitHub/PDP/packages/backend/scripts
node generate-irish-dancing-benchmarks.js 1> irish-dancing-benchmarks-IMPORT.json
```

The script will output to stderr: `Generating 700 benchmarks...`

## History

- **Original**: Used 6 CLRG competition levels (beginner, advanced_beginner, novice, prizewinner, preliminary_championship, open_championship)
- **Updated**: Consolidated to 4 database schema levels (recreational, development, competitive, elite)
- **Date**: February 4, 2026
- **Reason**: Database schema validation - invalid level values were being rejected
