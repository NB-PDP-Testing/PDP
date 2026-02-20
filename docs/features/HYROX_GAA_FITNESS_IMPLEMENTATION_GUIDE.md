# Hyrox & GAA Fitness - Implementation Guide

## Executive Summary

This guide provides complete instructions for implementing the **Hyrox & GAA Fitness** sport/benchmark system in PlayerARC for a personal trainer supporting U14, U16, U18, and Adult athletes (both male and female) in GAA fitness conditioning and Hyrox race preparation.

## What's Been Created

### 1. Skills System
**File:** `/packages/backend/scripts/hyrox-gaa-fitness-skills.json`

- **Total Skills:** 42 skills across 6 categories
- **Categories:**
  1. **Running & Endurance** (4 skills) - Aerobic capacity, running economy, pacing, recovery
  2. **Power & Strength** (5 skills) - Lower/upper body, grip, explosive power, strength endurance
  3. **Core & Stability** (4 skills) - Core strength, balance, hip stability, postural control
  4. **Speed & Agility** (5 skills) - Sprint speed, acceleration, COD, reactive agility, RSA
  5. **Hyrox Stations** (8 skills) - All 8 Hyrox competition stations
  6. **Movement Quality** (6 skills) - Fundamental movement patterns and mobility

- **Rating Scale:** 1-5 with detailed descriptors per level
- **Age Group Relevance:** Appropriate skills tagged for U14, U16, U18, Senior

### 2. Benchmarks System
**File:** `/packages/backend/scripts/hyrox-gaa-fitness-benchmarks.json`

- **Total Benchmarks:** 150+ benchmarks covering:
  - **Age Groups:** U14, U16, U18, Senior
  - **Gender:** Male, Female, All (where appropriate)
  - **Levels:** Recreational, Competitive, Elite

- **Progressive Standards:**
  - U14: Foundation building, technique focus
  - U16: 70-80% of adult standards, developing capacity
  - U18: 85-95% of adult standards, near-adult performance
  - Adults: Full competition standards

- **Key Benchmarks Included:**
  - **Aerobic Capacity** (all age/gender/level combinations)
  - **Lower Body Strength** (all combinations)
  - **Sprint Speed** (all combinations)
  - **Core Strength** (gender-neutral, all combinations)
  - **Squat Pattern** (gender-neutral, all combinations)

### 3. Documentation
**File:** `/docs/features/hyrox-gaa-fitness-benchmark.md`

Complete system documentation covering:
- About Hyrox and GAA fitness requirements
- Skill categories explained
- Rating scale definitions
- Age group considerations
- Gender considerations
- Benchmark level definitions
- Assessment protocols
- Safety guidelines
- Implementation notes

---

## Step-by-Step Implementation

### Prerequisites

1. **Platform Staff Access** - You need platform admin access to:
   - Create sports (`/platform/sports`)
   - Import skills (`/platform/skills`)
   - Import benchmarks (via Convex dashboard)

2. **Files Ready:**
   - ✅ `/packages/backend/scripts/hyrox-gaa-fitness-skills.json`
   - ✅ `/packages/backend/scripts/hyrox-gaa-fitness-benchmarks.json`
   - ✅ `/docs/features/hyrox-gaa-fitness-benchmark.md`

### Step 1: Create the Sport (Platform Admin)

1. **Navigate to Platform Sports Page:**
   ```
   http://localhost:3000/platform/sports
   ```

2. **Click "Add Sport"**

3. **Fill in Sport Details:**
   - **Code:** `hyrox_gaa_fitness` (IMPORTANT: must match exactly)
   - **Name:** `Hyrox & GAA Fitness`
   - **Governing Body:** `Hyrox / GAA`
   - **Description:**
     ```
     Fitness assessment system for Hyrox racing and GAA conditioning.
     Supports U14-Adult athletes (male/female) with comprehensive benchmarks
     for endurance, strength, power, speed, and movement quality.
     ```

4. **Click "Create Sport"**

5. **Verify:** Sport appears in the sports list with code `hyrox_gaa_fitness`

---

### Step 2: Import Skills (Platform Admin)

1. **Navigate to Platform Skills Page:**
   ```
   http://localhost:3000/platform/skills
   ```

2. **Select Sport:** Choose "Hyrox & GAA Fitness" from dropdown

3. **Click "Bulk Import" Button**

4. **Upload Skills File:**
   - Click "Choose File"
   - Select: `/packages/backend/scripts/hyrox-gaa-fitness-skills.json`

5. **Review Import Preview:**
   - Should show 6 categories
   - Should show 42 skills total
   - Check for any validation errors

6. **Confirm Import**

7. **Verify Import Success:**
   - Refresh the page
   - You should see all 6 categories:
     - Running & Endurance (4 skills)
     - Power & Strength (5 skills)
     - Core & Stability (4 skills)
     - Speed & Agility (5 skills)
     - Hyrox Stations (8 skills)
     - Movement Quality (6 skills)

---

### Step 3: Import Benchmarks (Platform Admin)

**Option A: Via Convex Dashboard (Recommended)**

1. **Open Convex Dashboard:**
   ```
   https://dashboard.convex.dev
   ```

2. **Navigate to Your Project**

3. **Go to "Functions" Tab**

4. **Find Function:**
   ```
   models/skillBenchmarks/bulkImportBenchmarks
   ```

5. **Prepare Import Data:**
   - Open `/packages/backend/scripts/hyrox-gaa-fitness-benchmarks.json`
   - Copy the **entire file contents**

6. **Execute Function:**
   - Paste the JSON into the function arguments
   - The full structure should be:
     ```json
     {
       "source": "Hyrox/GAA Standards",
       "sourceDocument": "Hyrox & GAA Fitness Benchmark System v1.0",
       "sourceYear": 2026,
       "benchmarks": [ /* array of benchmark objects */ ]
     }
     ```
   - Click "Run Function"

7. **Check Result:**
   - Should return: `{ success: true, imported: 150+ }`
   - If errors, check sportCode matches exactly: `hyrox_gaa_fitness`

**Option B: Via Code (Backend Script)**

Create a migration file:

```typescript
// packages/backend/convex/migrations/importHyroxBenchmarks.ts
import { internalMutation } from "../_generated/server";
import benchmarksData from "../scripts/hyrox-gaa-fitness-benchmarks.json";

export const importHyroxBenchmarks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { bulkImportBenchmarks } = await import("../models/skillBenchmarks");
    return await bulkImportBenchmarks(ctx, benchmarksData);
  },
});
```

Then run via Convex CLI:
```bash
npx convex run migrations/importHyroxBenchmarks:importHyroxBenchmarks
```

---

### Step 4: Verify Import (Org Admin)

1. **Navigate to Org Benchmarks Page:**
   ```
   http://localhost:3000/orgs/[your-org-id]/admin/benchmarks
   ```

2. **Select Sport:** "Hyrox & GAA Fitness"

3. **Check All Categories Load:**
   - Running & Endurance
   - Power & Strength
   - Core & Stability
   - Speed & Agility
   - Hyrox Stations
   - Movement Quality

4. **Spot Check Benchmarks:**
   - **Test 1:** Select "U14" age group
     - Should see benchmarks for Recreational and Competitive levels
     - Should NOT see Elite level (not applicable for U14)

   - **Test 2:** Select "U16" age group
     - Should see benchmarks for all three levels (Recreational, Competitive, Elite)

   - **Test 3:** Select "Senior" age group
     - Should see benchmarks with percentile data (25th, 50th, 75th, 90th)
     - Should show detailed expected ratings

5. **Verify Expected Ratings:**
   - **Aerobic Capacity, U14 Male Recreational:** Expected = 2.5
   - **Lower Body Strength, U16 Male Competitive:** Expected = 3.0
   - **Sprint Speed, U18 Female Elite:** Expected = 4.5
   - **Core Strength, Senior Male Elite:** Expected = 4.5

---

### Step 5: Test Assessment Flow (Coach)

1. **Navigate to Coach Assess Page:**
   ```
   http://localhost:3000/orgs/[your-org-id]/coach/assess
   ```

2. **Select a Player:**
   - Choose any player in your org
   - If no players exist, create a test player first

3. **Select Sport:** "Hyrox & GAA Fitness"

4. **Choose Assessment Type:**
   - Training
   - Match
   - Trial
   - Formal Review

5. **Rate Skills:**
   - Expand a category (e.g., "Running & Endurance")
   - Use slider to set rating (1-5)
   - Should see color coding:
     - 1-1.9: Red (Beginner)
     - 2-2.9: Orange (Developing)
     - 3-3.9: Yellow (Competent)
     - 4-4.9: Light Green (Good)
     - 5.0: Emerald (Excellent)

6. **Check Benchmark Comparison:**
   - System should auto-calculate player's age group from DOB
   - Should show benchmark status:
     - Below (Red)
     - Developing (Orange)
     - On Track (Yellow)
     - Exceeding (Green)
     - Exceptional (Emerald)

7. **Add Notes (Optional):**
   - Add notes for specific skills
   - Add private coach notes

8. **Save Assessment:**
   - Click "Save Assessment"
   - Should see success toast

9. **Verify on Player Page:**
   - Navigate to player's passport page
   - Check "Skills" section shows Hyrox & GAA Fitness
   - Verify ratings display correctly
   - Check benchmark comparison shows

---

### Step 6: Test Batch Assessment (Coach)

1. **Return to Assess Page**

2. **Toggle to "Batch Mode"**

3. **Select Multiple Players:**
   - Choose 2-3 players (same age group recommended for first test)

4. **Rate Skills:**
   - Rate skills for all selected players
   - System should handle multi-player ratings efficiently

5. **Save Batch:**
   - Click "Save Batch Assessment"
   - Should create individual assessments for each player

6. **Verify:**
   - Check each player's passport page
   - All should have new assessment recorded

---

## Usage Guidelines for Personal Trainer

### Initial Athlete Onboarding

1. **Create Player Profile:**
   - Add player to organization
   - Ensure **Date of Birth** is accurate (critical for age group calculation)
   - Set gender (male/female)

2. **Initial Assessment:**
   - Schedule 60-90 minute assessment session
   - Use "Formal Review" assessment type
   - Test in this order:
     1. Movement Quality (squat, hinge, mobility)
     2. Core & Stability
     3. Speed & Agility (if applicable)
     4. Power & Strength
     5. Hyrox Stations (if applicable)
     6. Running & Endurance (last, as it causes most fatigue)

3. **Interpret Benchmarks:**
   - **Recreational Level:** General fitness, health, participation
   - **Competitive Level:** Club/county development, serious training
   - **Elite Level:** High performance, championship aspirations

### Ongoing Assessments

**Frequency:**
- **U14-U16:** Every 12 weeks
- **U18:** Every 8-10 weeks
- **Adults:** Every 6-8 weeks
- **Pre-Competition:** 2-3 weeks before major Hyrox events

**Assessment Types:**
- **Training:** Quick checks during training sessions
- **Formal Review:** Comprehensive quarterly assessments
- **Trial:** Testing new athletes or movements
- **Match:** Post-competition assessment

### Progress Tracking

1. **View Historical Trends:**
   - Player passport shows skill history
   - Look for consistent improvement over time
   - Identify plateaus or regressions

2. **Benchmark Progress:**
   - Track movement through benchmark zones:
     - Below → Developing → On Track → Exceeding → Exceptional
   - Celebrate when athlete moves up a zone
   - Investigate if athlete moves down

3. **Goal Setting:**
   - Link goals to specific skill improvements
   - Use benchmark targets as measurable objectives
   - Example: "Improve Aerobic Capacity from 3.0 to 4.0 (Exceeding) by end of season"

### Hyrox-Specific Use Cases

**Pre-Hyrox Training Block (12-16 weeks out):**
1. Assess all Hyrox Stations
2. Identify weakest 2-3 stations
3. Create training focus on weak areas
4. Re-assess at 8 weeks and 2 weeks out

**GAA Pre-Season:**
1. Focus on Running & Endurance, Speed & Agility
2. Assess movement quality first (injury prevention)
3. Build strength base before adding speed work
4. Re-assess every 4 weeks during pre-season

---

## Customization Options

### Adding More Benchmarks

If you need additional benchmarks for specific age groups or levels:

1. **Create New Benchmark Object:**
   ```json
   {
     "sportCode": "hyrox_gaa_fitness",
     "skillCode": "aerobic_capacity",
     "ageGroup": "u12",  // New age group
     "gender": "male",
     "level": "recreational",
     "expectedRating": 2.0,
     "minAcceptable": 1.5,
     "developingThreshold": 2.0,
     "excellentThreshold": 3.0,
     "notes": "U12 male recreational - early development"
   }
   ```

2. **Import via Convex Dashboard:**
   - Add to the `benchmarks` array in the JSON
   - Re-run `bulkImportBenchmarks` function

### Adding New Skills

If you need to add additional skills:

1. **Edit Skills JSON:**
   ```json
   {
     "code": "new_skill_code",
     "name": "New Skill Name",
     "description": "What this skill measures",
     "level1Descriptor": "Cannot perform...",
     "level2Descriptor": "Developing...",
     "level3Descriptor": "Competent...",
     "level4Descriptor": "Proficient...",
     "level5Descriptor": "Excellent...",
     "ageGroupRelevance": ["u16", "u18", "senior"],
     "sortOrder": 10
   }
   ```

2. **Re-Import Skills:**
   - Use bulk import dialog in `/platform/skills`
   - Or use update mutation for single skill

3. **Add Benchmarks for New Skill:**
   - Follow benchmark format above
   - Import via Convex dashboard

---

## Troubleshooting

### Issue: Sport Not Showing Up

**Solution:**
- Check sport code is exactly: `hyrox_gaa_fitness` (no spaces, all lowercase)
- Verify sport is active: `isActive: true`
- Refresh browser cache

### Issue: Skills Not Importing

**Symptoms:** Import fails with validation error

**Common Causes:**
1. **Sport doesn't exist:** Create sport first (Step 1)
2. **Duplicate skill codes:** Each skill code must be unique within the sport
3. **Invalid JSON:** Validate JSON syntax at jsonlint.com
4. **Missing required fields:** Each skill needs `code`, `name`, `sortOrder`

**Solution:**
- Check error message in import dialog
- Verify all required fields present
- Ensure sportCode matches created sport

### Issue: Benchmarks Not Showing

**Symptoms:** Benchmarks page loads but shows no data

**Possible Causes:**
1. **Age group mismatch:** Player age doesn't match any benchmark age groups
2. **Sport code mismatch:** Benchmark sportCode ≠ actual sport code
3. **Benchmarks not imported:** Import step failed silently

**Solution:**
1. Check Convex dashboard for benchmark records:
   ```
   Query: skillBenchmarks
   Filter: sportCode = "hyrox_gaa_fitness"
   ```
2. Verify player date of birth calculates to correct age group
3. Re-run benchmark import

### Issue: Benchmark Comparison Not Showing

**Symptoms:** Skills display but no benchmark comparison

**Possible Causes:**
1. **Player DOB missing:** Age group cannot be calculated
2. **No exact benchmark match:** No benchmark for player's age/gender/level combination
3. **Benchmark lookup failing:** System error

**Solution:**
1. Ensure player has valid `dateOfBirth` field
2. Check benchmark exists for:
   - Player's calculated age group (e.g., u16)
   - Player's gender (male/female)
   - Organization's default level (usually "competitive")
3. Check browser console for errors

---

## Sample Assessment Workflow

### Example: U16 Male Competitive GAA Player

**Athlete Profile:**
- Name: John Smith
- Age: 15 years 8 months → U16
- Gender: Male
- Level: Competitive (county development squad)
- Goals: Make county minor panel, prepare for summer Hyrox

**Initial Assessment (Week 1):**

1. **Movement Quality:**
   - Squat Pattern: 3.5 (Good mechanics, ready for loading)
   - Hip Hinge: 3.0 (Adequate, needs refinement)
   - Ankle Mobility: 3.5 (Good ROM)
   - **Benchmark:** On Track (Expected: 3.5 for competitive U16)

2. **Core & Stability:**
   - Core Strength: 3.5 (90s plank)
   - Balance: 3.0 (Adequate single-leg)
   - **Benchmark:** On Track to Exceeding

3. **Speed & Agility:**
   - Sprint Speed: 3.0 (Below expected 3.5 for competitive)
   - Acceleration: 3.5 (Good first step)
   - COD: 2.5 (Needs work - Below expected 3.0)
   - **Benchmark:** Below to On Track (mixed)

4. **Power & Strength:**
   - Lower Body Strength: 2.5 (Below expected 3.0)
   - Upper Body Strength: 2.0 (Developing)
   - Explosive Power: 3.0 (Adequate jump height)
   - **Benchmark:** Below to On Track

5. **Running & Endurance:**
   - Aerobic Capacity: 3.5 (On Track)
   - Running Economy: 3.0 (Could improve)
   - Pacing: 3.5 (Good awareness)
   - **Benchmark:** On Track

6. **Hyrox Stations** (Not all tested - new to Hyrox):
   - Sled Push: 2.5 (Developing)
   - Sled Pull: 2.0 (Weak - needs work)
   - Rowing: 3.0 (Adequate)
   - **Benchmark:** Below expected for competitive

**Training Focus (Weeks 2-12):**
- **Priority 1:** Lower body strength (from 2.5 → 3.5)
- **Priority 2:** Change of direction (from 2.5 → 3.5)
- **Priority 3:** Sled pull technique (from 2.0 → 3.0)
- **Maintenance:** Aerobic capacity, core, movement quality

**8-Week Re-Assessment:**
- Lower Body Strength: 2.5 → 3.0 ✅ (Improving)
- COD: 2.5 → 3.0 ✅ (On Track now)
- Sled Pull: 2.0 → 2.5 ⚠️ (Still below, continue focus)
- Aerobic Capacity: 3.5 → 4.0 ⬆️ (Exceeding now!)

**12-Week Final Assessment:**
- Lower Body Strength: 3.0 → 3.5 ✅ (Target reached)
- COD: 3.0 → 3.5 ✅ (Exceeding)
- Sled Pull: 2.5 → 3.0 ✅ (On Track)
- **Overall:** 8 of 10 skills now On Track or better

**Outcome:** Athlete ready for county minor trials and first Hyrox event (doubles category).

---

## Support & Resources

### Key Documentation Files

1. **System Overview:**
   - `/docs/features/hyrox-gaa-fitness-benchmark.md`

2. **Implementation Files:**
   - `/packages/backend/scripts/hyrox-gaa-fitness-skills.json`
   - `/packages/backend/scripts/hyrox-gaa-fitness-benchmarks.json`

3. **General Sport/Skills/Benchmarks System:**
   - `/docs/features/SPORTS_SKILLS_COMPLETE_REVIEW.md`
   - `/docs/architecture/player-passport.md`

### Getting Help

**For Platform Issues:**
- Check GitHub Issues: https://github.com/NB-PDP-Testing/PDP/issues
- Review CLAUDE.md for system architecture
- Check Convex dashboard for data verification

**For Training/Benchmarking Questions:**
- Hyrox Official: https://hyrox.com
- GAA Coaching: https://learning.gaa.ie
- LTAD Resources: Sport Ireland / GAA LTAD guidelines

---

## Changelog

### Version 1.0 (2026-02-02)
- Initial creation
- 42 skills across 6 categories
- 150+ benchmarks for U14-Adult, Male/Female, 3 levels
- Complete documentation and implementation guide

---

**End of Implementation Guide**
