# Phase 1.2: Backend Import Engine - Manual Test Suite

**Branch:** `ralph/phase-1.2-backend-import-engine`
**Dashboard:** https://dashboard.convex.dev/d/brazen-squirrel-35

Phase 1.2 consists of **library utilities** (parser, mapper, validator, benchmarkApplicator, sportConfig) and **mutations** (playerImport.ts enhancements). The utilities are pure functions used by the frontend and backend — they can't be tested directly from the Dashboard. The mutations can be tested via Dashboard.

---

## Pre-Requisites

1. Ensure you're on the correct branch: `git checkout ralph/phase-1.2-backend-import-engine`
2. Run codegen: `npx -w packages/backend convex codegen`
3. Run type check: `npm run check-types`
4. Phase 1.1 templates must be seeded (run `importTemplateSeeds:seedDefaultTemplates` if not done)
5. Open Convex Dashboard: https://dashboard.convex.dev/d/brazen-squirrel-35

---

## Part A: Build Verification

### Test 1: All Files Exist

**Goal:** Verify all 5 new library files were created.

#### Steps
Run in terminal:
```bash
ls -la packages/backend/convex/lib/import/
```

#### Expected Result
5 files present:
- [ ] `parser.ts` (~330 lines) — CSV parser
- [ ] `mapper.ts` (~823 lines) — Field mapper with 5 strategies
- [ ] `validator.ts` (~438 lines) — Row validator with auto-fix
- [ ] `benchmarkApplicator.ts` (~226 lines) — 5 benchmark strategies
- [ ] `sportConfig.ts` (~146 lines) — Sport configuration helper

---

### Test 2: Codegen Passes

```bash
npx -w packages/backend convex codegen
```
**Expected:** Exits with code 0, no errors.

---

### Test 3: Type Check Passes

```bash
npm run check-types
```
**Expected:** Passes (pre-existing errors in migrations/ and coachParentSummaries.ts are OK).

---

## Part B: CSV Parser Tests (parser.ts)

These tests verify parsing logic. Since `parseCSV` is a library function (not a Convex function), test via a Node script or browser console. Alternatively, verify by uploading a CSV through the existing GAA import UI and confirming it parses correctly.

### Test 4: Basic CSV Parsing

**Goal:** Verify standard CSV parsing works.

#### Test Input (paste into a file `test.csv`):
```csv
Forename,Surname,DOB,gender
John,Smith,01/05/2012,Male
Jane,Doe,15/03/2013,Female
```

#### Verification
Upload through the GAA import page (`/orgs/[orgId]/admin/player-import`). The parser should detect:
- [ ] Delimiter: comma
- [ ] 2 columns detected correctly
- [ ] 2 data rows parsed

---

### Test 5: Tab-Delimited Content

**Goal:** Verify tab delimiter auto-detection.

#### Test Input (tab-separated):
```
First Name	Last Name	Date of Birth	Gender
John	Smith	01/05/2012	Male
```

#### Expected
- [ ] Parser detects tab delimiter
- [ ] Headers parsed correctly despite spaces in names

---

### Test 6: Quoted Fields with Commas

**Goal:** Verify RFC 4180 compliant CSV parsing.

#### Test Input:
```csv
Name,Address,Town
"Smith, John","123 Main St, Apt 4",Dublin
```

#### Expected
- [ ] Name field: `Smith, John` (comma preserved inside quotes)
- [ ] Address field: `123 Main St, Apt 4`

---

## Part C: Field Mapper Tests (mapper.ts)

### Test 7: Exact Match Strategy

**Goal:** Verify exact field name matching.

#### Verification
The mapper should map these source columns with 100% confidence:
- [ ] `firstName` → `firstName` (exact match)
- [ ] `lastName` → `lastName` (exact match)
- [ ] `dateOfBirth` → `dateOfBirth` (exact match)

---

### Test 8: Alias Match Strategy

**Goal:** Verify alias database matches known column name variations.

#### Key Alias Mappings to Verify
Upload a CSV with these headers — the mapper should auto-map them:
- [ ] `Forename` → `firstName` (GAA alias)
- [ ] `Surname` → `lastName` (GAA alias)
- [ ] `DOB` → `dateOfBirth` (common alias)
- [ ] `Mobile Number` → `parentPhone` (GAA alias)
- [ ] `Eircode` → `postcode` (Irish alias)
- [ ] `E-mail` → `parentEmail` (common alias)

---

### Test 9: Fuzzy Match Strategy

**Goal:** Verify Levenshtein distance matching catches close misspellings.

#### Test Cases
Upload CSV with slightly misspelled headers:
- [ ] `frstName` → `firstName` (1 char missing)
- [ ] `lst_name` → `lastName` (fuzzy match)
- [ ] `date_of_brith` → `dateOfBirth` (typo in "birth")

---

### Test 10: Content Analysis Strategy

**Goal:** Verify content-based pattern matching.

#### Test Cases
Upload CSV with ambiguous column headers but recognizable data patterns:
- [ ] Column with values like `john@gmail.com, jane@yahoo.com` → detected as email field
- [ ] Column with values like `087-1234567, 086-9876543` → detected as phone field
- [ ] Column with values like `01/05/2012, 15/03/2013` → detected as date field

---

## Part D: Row Validator Tests (validator.ts)

### Test 11: Required Field Validation

**Goal:** Verify required fields are checked.

#### Verification via Import Flow
Try to import a CSV missing required fields:
```csv
Forename,Surname,DOB,gender
,Smith,01/05/2012,Male
John,,01/05/2012,Male
```

#### Expected
- [ ] Row 1 flagged: `firstName` is required
- [ ] Row 2 flagged: `lastName` is required

---

### Test 12: Email Validation with Auto-Fix

**Goal:** Verify email format checking and typo suggestions.

#### Test Input
```csv
Forename,Surname,DOB,gender,email
John,Smith,01/05/2012,Male,john@gmial.com
Jane,Doe,15/03/2013,Female,not-an-email
```

#### Expected
- [ ] Row 1: Email warning with suggestion `john@gmail.com` (gmial→gmail typo fix)
- [ ] Row 2: Email error - invalid format

---

### Test 13: Date Format Validation

**Goal:** Verify date parsing handles multiple formats.

#### Test Input
```csv
Forename,Surname,DOB,gender
John,Smith,01/05/2012,Male
Jane,Doe,2013-03-15,Female
Bob,Jones,15-Mar-2010,Male
```

#### Expected
- [ ] Row 1: Valid (DD/MM/YYYY format)
- [ ] Row 2: Valid (ISO format YYYY-MM-DD)
- [ ] Row 3: Warning or auto-fix suggestion

---

### Test 14: Gender Normalization

**Goal:** Verify gender values are normalized.

#### Test Values
- [ ] `Male`, `M`, `m`, `boy` → normalized to `male`
- [ ] `Female`, `F`, `f`, `girl` → normalized to `female`
- [ ] `Other`, `Non-Binary`, `X` → normalized to `other`

---

## Part E: Benchmark Applicator Tests (via Dashboard)

### Test 15: Import with "blank" Benchmark Strategy

**Goal:** Verify blank strategy sets all skills to rating 1.

#### Steps
1. Run `playerImport:batchImportPlayersWithIdentity` with:
```json
{
  "organizationId": "<your-org-id>",
  "sportCode": "gaa_football",
  "benchmarkSettings": {
    "applyBenchmarks": true,
    "strategy": "blank",
    "ageGroup": "u14"
  },
  "players": [
    {
      "firstName": "Bench",
      "lastName": "TestBlank",
      "dateOfBirth": "2011-05-15",
      "gender": "male",
      "ageGroup": "u14",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `benchmarksApplied` > 0 in response
- [ ] Check `sportPassports` table — find the passport for "Bench TestBlank"
- [ ] Check `skillRatings` table — all ratings should be `1`

---

### Test 16: Import with "middle" Benchmark Strategy

**Goal:** Verify middle strategy sets all skills to rating 3.

#### Steps
Same as Test 15 but with:
```json
{
  "organizationId": "<your-org-id>",
  "sportCode": "gaa_football",
  "benchmarkSettings": {
    "applyBenchmarks": true,
    "strategy": "middle",
    "ageGroup": "u14"
  },
  "players": [
    {
      "firstName": "Bench",
      "lastName": "TestMiddle",
      "dateOfBirth": "2011-05-15",
      "gender": "male",
      "ageGroup": "u14",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `benchmarksApplied` > 0
- [ ] All `skillRatings` for this player should be `3`

---

### Test 17: Import with "age-appropriate" Benchmark Strategy

**Goal:** Verify age-appropriate strategy queries skillBenchmarks table.

#### Steps
Same as Test 15 but with `"strategy": "age-appropriate"`.

#### Expected Result
- [ ] `benchmarksApplied` > 0 (if skillBenchmarks data exists for gaa_football + u14)
- [ ] Ratings pulled from `skillBenchmarks` table for the sport/ageGroup combination
- [ ] If no benchmark data exists, falls back to middle (3)

---

### Test 18: Import without Benchmarks

**Goal:** Verify benchmarks are skipped when not configured.

#### Steps
```json
{
  "organizationId": "<your-org-id>",
  "players": [
    {
      "firstName": "Bench",
      "lastName": "TestNone",
      "dateOfBirth": "2011-05-15",
      "gender": "male",
      "ageGroup": "u14",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `benchmarksApplied`: 0
- [ ] No `skillRatings` created for this player

---

## Part F: playerImport.ts Enhancement Tests (via Dashboard)

### Test 19: sportCode Parameter

**Goal:** Verify sportCode creates a sport passport during import.

#### Steps
```json
{
  "organizationId": "<your-org-id>",
  "sportCode": "gaa_football",
  "players": [
    {
      "firstName": "Sport",
      "lastName": "TestCode",
      "dateOfBirth": "2012-06-20",
      "gender": "female",
      "ageGroup": "u13",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `playerIdentities` entry created
- [ ] `orgPlayerEnrollments` entry created
- [ ] `sportPassports` entry created with `sportCode: "gaa_football"`, `status: "active"`
- [ ] Check Data tab > `sportPassports` for the new record

---

### Test 20: sportCode Omitted (Backward Compatibility)

**Goal:** Verify import still works without sportCode.

#### Steps
```json
{
  "organizationId": "<your-org-id>",
  "players": [
    {
      "firstName": "NoSport",
      "lastName": "TestCompat",
      "dateOfBirth": "2012-06-20",
      "gender": "male",
      "ageGroup": "u13",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] Import succeeds
- [ ] `playerIdentities` and `orgPlayerEnrollments` created
- [ ] No `sportPassports` created (sportCode was not provided)
- [ ] No errors

---

### Test 21: Session Tracking (sessionId)

**Goal:** Verify sessionId is stored on created records.

#### Steps
1. First, create an import session via `importSessions:createImportSession`:
```json
{
  "organizationId": "<your-org-id>",
  "initiatedBy": "test-user",
  "sourceInfo": {
    "type": "file",
    "fileName": "test.csv",
    "fileSize": 1000,
    "rowCount": 2,
    "columnCount": 6
  }
}
```
2. Copy the returned session ID
3. Run import with sessionId:
```json
{
  "organizationId": "<your-org-id>",
  "sessionId": "<session-id-from-step-1>",
  "players": [
    {
      "firstName": "Session",
      "lastName": "TestTrack",
      "dateOfBirth": "2013-01-10",
      "gender": "male",
      "ageGroup": "u12",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `playerIdentities` record has `importSessionId` matching the session ID
- [ ] `orgPlayerEnrollments` record has `importSessionId` matching the session ID

---

### Test 22: Row Selection (selectedRowIndices)

**Goal:** Verify only selected rows are imported.

#### Steps
```json
{
  "organizationId": "<your-org-id>",
  "selectedRowIndices": [0, 2],
  "players": [
    {
      "firstName": "Selected",
      "lastName": "RowZero",
      "dateOfBirth": "2012-01-01",
      "gender": "male",
      "ageGroup": "u13",
      "season": "2025"
    },
    {
      "firstName": "Skipped",
      "lastName": "RowOne",
      "dateOfBirth": "2012-02-02",
      "gender": "female",
      "ageGroup": "u13",
      "season": "2025"
    },
    {
      "firstName": "Selected",
      "lastName": "RowTwo",
      "dateOfBirth": "2012-03-03",
      "gender": "male",
      "ageGroup": "u13",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `totalProcessed`: 2 (not 3)
- [ ] `playersCreated`: 2
- [ ] "Selected RowZero" and "Selected RowTwo" created in `playerIdentities`
- [ ] "Skipped RowOne" NOT created

---

### Test 23: Full Import with All New Parameters

**Goal:** End-to-end test with sportCode + sessionId + selectedRows + benchmarks.

#### Steps
1. Create a session (as in Test 21, step 1)
2. Run:
```json
{
  "organizationId": "<your-org-id>",
  "sportCode": "gaa_football",
  "sessionId": "<session-id>",
  "selectedRowIndices": [0, 1],
  "benchmarkSettings": {
    "applyBenchmarks": true,
    "strategy": "middle",
    "ageGroup": "u12"
  },
  "players": [
    {
      "firstName": "Full",
      "lastName": "TestOne",
      "dateOfBirth": "2013-03-15",
      "gender": "male",
      "ageGroup": "u12",
      "season": "2025"
    },
    {
      "firstName": "Full",
      "lastName": "TestTwo",
      "dateOfBirth": "2013-07-20",
      "gender": "female",
      "ageGroup": "u12",
      "season": "2025"
    },
    {
      "firstName": "Excluded",
      "lastName": "NotImported",
      "dateOfBirth": "2013-11-01",
      "gender": "male",
      "ageGroup": "u12",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `totalProcessed`: 2
- [ ] `playersCreated`: 2 (Full TestOne + Full TestTwo)
- [ ] `enrollmentsCreated`: 2
- [ ] `benchmarksApplied` > 0
- [ ] Each player has: `playerIdentities` + `orgPlayerEnrollments` (with importSessionId) + `sportPassports` (gaa_football) + `skillRatings` (rating 3)
- [ ] "Excluded NotImported" NOT in any table

---

## Part G: Sport Config Tests (via Dashboard)

### Test 24: Sport Age Groups Query

**Goal:** Verify sport configuration lookups work.

#### Steps
Check if `sportAgeGroupConfig` table has data:
1. Go to Data tab > `sportAgeGroupConfig`
2. If data exists for `gaa_football`, the sportConfig helper can query it

#### Expected
- [ ] Table exists and is accessible
- [ ] If data exists: age groups have `sportCode`, `ageGroupCode`, `minAge`, `maxAge`, `isActive` fields

---

### Test 25: Skill Definitions Query

**Goal:** Verify skill definitions can be queried by sport.

#### Steps
1. Go to Data tab > `skillDefinitions`
2. Filter/search for `gaa_football` entries

#### Expected
- [ ] Table has skill definitions with `sportCode`, `code`, `name`, `isActive` fields
- [ ] Skills are sport-specific (filtered by sportCode)

---

## Cleanup

After testing, clean up test data:
1. Delete test `playerIdentities` records (those with firstName starting with "Bench", "Sport", "NoSport", "Session", "Selected", "Full", "Excluded")
2. Delete corresponding `orgPlayerEnrollments` records
3. Delete corresponding `sportPassports` records
4. Delete corresponding `skillRatings` records
5. Delete test import sessions

---

## Summary Checklist

| # | Test | Area | Status |
|---|------|------|--------|
| 1 | All 5 lib files exist | Build | [ ] |
| 2 | Codegen passes | Build | [ ] |
| 3 | Type check passes | Build | [ ] |
| 4 | Basic CSV parsing | Parser | [ ] |
| 5 | Tab-delimited detection | Parser | [ ] |
| 6 | Quoted fields with commas | Parser | [ ] |
| 7 | Exact match strategy | Mapper | [ ] |
| 8 | Alias match strategy | Mapper | [ ] |
| 9 | Fuzzy match strategy | Mapper | [ ] |
| 10 | Content analysis strategy | Mapper | [ ] |
| 11 | Required field validation | Validator | [ ] |
| 12 | Email validation + auto-fix | Validator | [ ] |
| 13 | Date format validation | Validator | [ ] |
| 14 | Gender normalization | Validator | [ ] |
| 15 | Blank benchmark strategy | Benchmarks | [ ] |
| 16 | Middle benchmark strategy | Benchmarks | [ ] |
| 17 | Age-appropriate benchmarks | Benchmarks | [ ] |
| 18 | Import without benchmarks | Benchmarks | [ ] |
| 19 | sportCode parameter | playerImport | [ ] |
| 20 | sportCode omitted (compat) | playerImport | [ ] |
| 21 | Session tracking (sessionId) | playerImport | [ ] |
| 22 | Row selection (selectedRowIndices) | playerImport | [ ] |
| 23 | Full import all params | playerImport | [ ] |
| 24 | Sport age groups query | SportConfig | [ ] |
| 25 | Skill definitions query | SportConfig | [ ] |
