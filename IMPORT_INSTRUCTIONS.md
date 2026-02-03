# Strength & Conditioning Import Instructions

## Quick Start

You've already created the sport:
- **Code:** `strength&conditioning`
- **Name:** S&C

Now import the skills and benchmarks using the files below.

---

## Step 1: Import Skills (Platform Admin)

1. **Navigate to:** http://localhost:3000/platform/skills

2. **Select Sport:** Choose "S&C" from the dropdown

3. **Click "Bulk Import"**

4. **Upload File:**
   ```
   packages/backend/scripts/strength-conditioning-skills-IMPORT.json
   ```

5. **Verify Preview:**
   - ✓ Format: Complete Export (All Sports)
   - ✓ Total Categories: 6
   - ✓ Total Skills: 42
   - ✓ Sport: `strength&conditioning` (Status: Exists)

6. **Click "Import Skills"**

7. **Success Verification:**
   - Refresh the page
   - You should see 6 categories:
     1. Running & Endurance (4 skills)
     2. Power & Strength (5 skills)
     3. Core & Stability (4 skills)
     4. Speed & Agility (5 skills)
     5. Hyrox Stations (8 skills)
     6. Movement Quality (6 skills)

---

## Step 2: Import Benchmarks (Platform Admin)

### Option A: Via Convex Dashboard (Recommended)

1. **Open Convex Dashboard:**
   ```
   https://dashboard.convex.dev
   ```

2. **Navigate:** Functions → models/skillBenchmarks → bulkImportBenchmarks

3. **Paste This JSON Structure:**
   - Open: `packages/backend/scripts/strength-conditioning-benchmarks-IMPORT.json`
   - Copy entire contents
   - Paste into function arguments

4. **Run Function**

5. **Verify Result:**
   - Should return: `{ success: true, imported: 150+ }`

### Option B: Via Bash Script

Create and run this migration:

```bash
# Create migration file
cat > packages/backend/convex/migrations/importStrengthBenchmarks.ts << 'EOF'
import { internalMutation } from "../_generated/server";
import benchmarksData from "../../scripts/strength-conditioning-benchmarks-IMPORT.json";

export const importBenchmarks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { bulkImportBenchmarks } = await import("../models/skillBenchmarks");
    return await bulkImportBenchmarks(ctx, benchmarksData);
  },
});
EOF

# Run migration
npx convex run migrations/importStrengthBenchmarks:importBenchmarks
```

---

## Step 3: Verify Import

1. **Navigate to Org Benchmarks:**
   ```
   http://localhost:3000/orgs/[your-org-id]/admin/benchmarks
   ```

2. **Select Sport:** "S&C"

3. **Check Categories Load:**
   - All 6 categories should display
   - Each category should have skills with benchmarks

4. **Spot Check:**
   - Select "U14" age group → Should show Recreational + Competitive levels
   - Select "U16" age group → Should show all 3 levels (Rec, Comp, Elite)
   - Select "Senior" age group → Should show percentile data

5. **Expected Ratings Examples:**
   - **Aerobic Capacity, U14 Male Recreational:** Expected = 2.5
   - **Lower Body Strength, U16 Male Competitive:** Expected = 3.0
   - **Sprint Speed, U18 Female Elite:** Expected = 4.5
   - **Core Strength, Senior Male Elite:** Expected = 4.5

---

## Step 4: Test Assessment

1. **Navigate to:** http://localhost:3000/orgs/[org-id]/coach/assess

2. **Select a test player** (create one if needed)

3. **Select Sport:** "S&C"

4. **Rate some skills:**
   - Expand "Running & Endurance"
   - Rate "Aerobic Capacity" (e.g., 3.0)
   - Should see benchmark comparison appear

5. **Save Assessment**

6. **Check Player Passport:**
   - Navigate to player's page
   - Verify S&C skills display
   - Benchmark comparison should show

---

## Troubleshooting

### Import Fails: "Sport does not exist"

**Problem:** Sport code mismatch

**Solution:**
1. Check sport code in `/platform/sports`
2. If it's not exactly `strength&conditioning`, either:
   - **A)** Delete and recreate sport with code `strength&conditioning`
   - **B)** Edit JSON files to match your sport code

### Import Fails: "Duplicate skill code"

**Problem:** Skills already exist

**Solution:**
1. Check "Replace existing categories and skills" checkbox
2. Re-run import

### Benchmarks Not Showing

**Problem:** Sport code mismatch or DOB missing

**Solution:**
1. Verify player has valid Date of Birth
2. Check Convex data:
   ```
   Query: skillBenchmarks
   Filter: sportCode = "strength&conditioning"
   ```
3. Verify at least 1 result exists

---

## What's Included

### Skills (42 total)
- Running & Endurance: Aerobic capacity, running economy, pacing, recovery
- Power & Strength: Lower/upper body, grip, explosive power, strength endurance
- Core & Stability: Core strength, balance, hip stability, postural control
- Speed & Agility: Sprint speed, acceleration, COD, reactive agility, RSA
- Hyrox Stations: SkiErg, sled push/pull, rowing, farmers carry, etc.
- Movement Quality: Squat, hinge, mobility patterns, coordination

### Benchmarks (150+ total)
- **Age Groups:** U14, U16, U18, Senior
- **Gender:** Male, Female (and "all" for some skills)
- **Levels:** Recreational, Competitive, Elite
- **Progressive Standards:** U14 → U16 → U18 → Adults

---

## Files Reference

- **Skills:** `packages/backend/scripts/strength-conditioning-skills-IMPORT.json`
- **Benchmarks:** `packages/backend/scripts/strength-conditioning-benchmarks-IMPORT.json`
- **Documentation:** `docs/features/hyrox-gaa-fitness-benchmark.md`
- **Guide:** `docs/features/HYROX_GAA_FITNESS_IMPLEMENTATION_GUIDE.md`

---

**Ready to import! Start with Step 1 above.**
