# Phase 1.2: Backend Import Engine - Manual Test Suite

**Branch:** `ralph/phase-1.2-backend-import-engine`
**Dashboard:** https://dashboard.convex.dev/d/brazen-squirrel-35

## What Can Be Tested Now vs Phase 1.3

Phase 1.2 created **5 library utility files** (parser, mapper, validator, benchmarkApplicator, sportConfig) and **enhanced playerImport.ts** with new parameters.

| Component | Testable Now? | How |
|-----------|---------------|-----|
| parser.ts | No | Library function, needs Phase 1.3 frontend to call it |
| mapper.ts | No | Library function, needs Phase 1.3 frontend to call it |
| validator.ts | No | Library function, needs Phase 1.3 frontend to call it |
| sportConfig.ts | No | Helper function, needs a Convex function caller |
| benchmarkApplicator.ts | **Yes** | Called by playerImport mutation when benchmarkSettings provided |
| playerImport.ts (new params) | **Yes** | Run `batchImportPlayersWithIdentity` via Dashboard |
| Build verification | **Yes** | Codegen + type check |

**This test suite covers only what can be verified now (12 tests).**
Library tests (parser, mapper, validator, sportConfig) will be verified during Phase 1.3 when the frontend wizard calls them.

---

## Pre-Requisites

1. Ensure you're on the correct branch: `git checkout ralph/phase-1.2-backend-import-engine`
2. Run codegen: `npx -w packages/backend convex codegen`
3. Run type check: `npm run check-types`
4. Phase 1.1 templates must be seeded (run `importTemplateSeeds:seedDefaultTemplates` if not done)
5. You need a valid `organizationId` — check Data tab > `organization` table and copy an ID
6. Open Convex Dashboard: https://dashboard.convex.dev/d/brazen-squirrel-35

---

## Part A: Build Verification

### Test 1: All Files Exist

**Goal:** Verify all 5 new library files were created.

```bash
ls -la packages/backend/convex/lib/import/
```

**Expected:** 5 files present:
- [ ] `parser.ts` — CSV parser
- [ ] `mapper.ts` — Field mapper with 5 strategies
- [ ] `validator.ts` — Row validator with auto-fix
- [ ] `benchmarkApplicator.ts` — 5 benchmark strategies
- [ ] `sportConfig.ts` — Sport configuration helper

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

## Part B: playerImport.ts Enhancement Tests (via Dashboard)

All tests below use the `playerImport:batchImportPlayersWithIdentity` mutation in the Dashboard Functions tab.

**Replace `<your-org-id>` with a real organization ID from your Data tab.**

### Test 4: sportCode Creates Sport Passport

**Goal:** Verify sportCode creates a sport passport during import.

#### Steps
Run `playerImport:batchImportPlayersWithIdentity`:
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
- [ ] Returns `playersCreated: 1`
- [ ] Data tab > `playerIdentities` — "Sport TestCode" exists
- [ ] Data tab > `orgPlayerEnrollments` — enrollment exists for this player + org
- [ ] Data tab > `sportPassports` — passport exists with `sportCode: "gaa_football"`, `status: "active"`

---

### Test 5: Import Without sportCode (Backward Compatibility)

**Goal:** Verify import still works without sportCode — no sport passport created.

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
- [ ] Returns successfully, no errors
- [ ] `playerIdentities` and `orgPlayerEnrollments` created
- [ ] **No** `sportPassports` record for this player
- [ ] `benchmarksApplied: 0`

---

### Test 6: Session Tracking (sessionId)

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
3. Run `playerImport:batchImportPlayersWithIdentity`:
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
- [ ] Data tab > `playerIdentities` — "Session TestTrack" has `importSessionId` matching the session ID
- [ ] Data tab > `orgPlayerEnrollments` — enrollment has `importSessionId` matching the session ID

---

### Test 7: Row Selection (selectedRowIndices)

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
- [ ] "Selected RowZero" and "Selected RowTwo" exist in `playerIdentities`
- [ ] "Skipped RowOne" does NOT exist

---

### Test 8: Blank Benchmark Strategy

**Goal:** Verify blank strategy sets all skill ratings to 1.

#### Steps
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
- [ ] Data tab > `sportPassports` — passport for "Bench TestBlank" with `sportCode: "gaa_football"`
- [ ] Data tab > `skillAssessments` — assessments exist with `rating: 1`, `assessmentType: "import"`

---

### Test 9: Middle Benchmark Strategy

**Goal:** Verify middle strategy sets all skill ratings to 3.

#### Steps
Same as Test 8 but change player name and strategy:
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
      "gender": "female",
      "ageGroup": "u14",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] `benchmarksApplied` > 0
- [ ] `skillAssessments` for this player have `rating: 3`

---

### Test 10: Import Without Benchmarks

**Goal:** Verify benchmarks are skipped when not configured.

#### Steps
```json
{
  "organizationId": "<your-org-id>",
  "sportCode": "gaa_football",
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
- [ ] `benchmarksApplied: 0`
- [ ] No `skillAssessments` created for this player

---

### Test 11: Full Import — All New Parameters

**Goal:** End-to-end test combining sportCode + sessionId + row selection + benchmarks.

#### Steps
1. Create a session first (same as Test 6, step 1)
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
- [ ] `totalProcessed`: 2 (not 3)
- [ ] `playersCreated`: 2 (Full TestOne + Full TestTwo)
- [ ] `enrollmentsCreated`: 2
- [ ] `benchmarksApplied` > 0
- [ ] "Excluded NotImported" NOT in any table
- [ ] Each imported player has:
  - `playerIdentities` record (with `importSessionId`)
  - `orgPlayerEnrollments` record (with `importSessionId`)
  - `sportPassports` record (`gaa_football`)
  - `skillAssessments` records (rating 3, type "import")

---

### Test 12: Age-Appropriate Benchmark Strategy

**Goal:** Verify age-appropriate strategy queries skillBenchmarks table.

#### Steps
```json
{
  "organizationId": "<your-org-id>",
  "sportCode": "gaa_football",
  "benchmarkSettings": {
    "applyBenchmarks": true,
    "strategy": "age-appropriate",
    "ageGroup": "u14"
  },
  "players": [
    {
      "firstName": "Bench",
      "lastName": "TestAgeAppropriate",
      "dateOfBirth": "2011-05-15",
      "gender": "male",
      "ageGroup": "u14",
      "season": "2025"
    }
  ]
}
```

#### Expected Result
- [ ] If `skillBenchmarks` has data for gaa_football + u14: ratings pulled from those benchmarks
- [ ] If no benchmark data exists: falls back gracefully (ratings default to 3)
- [ ] `benchmarksApplied` > 0

---

## Cleanup

After testing, clean up test data from the Data tab:
1. Delete `playerIdentities` records with firstName: "Sport", "NoSport", "Session", "Selected", "Skipped", "Bench", "Full", "Excluded"
2. Delete corresponding `orgPlayerEnrollments` records
3. Delete corresponding `sportPassports` records
4. Delete corresponding `skillAssessments` records (assessmentType: "import")
5. Delete test import sessions

---

## Summary Checklist

| # | Test | Status |
|---|------|--------|
| 1 | All 5 lib files exist | [ ] |
| 2 | Codegen passes | [ ] |
| 3 | Type check passes | [ ] |
| 4 | sportCode creates sport passport | [ ] |
| 5 | Import without sportCode (backward compat) | [ ] |
| 6 | Session tracking (sessionId) | [ ] |
| 7 | Row selection (selectedRowIndices) | [ ] |
| 8 | Blank benchmark strategy (rating 1) | [ ] |
| 9 | Middle benchmark strategy (rating 3) | [ ] |
| 10 | Import without benchmarks | [ ] |
| 11 | Full import — all new params combined | [ ] |
| 12 | Age-appropriate benchmark strategy | [ ] |

---

## Deferred to Phase 1.3

The following will be testable once the import wizard frontend is built:

| Component | What to Test |
|-----------|-------------|
| parser.ts | Tab/semicolon delimiter detection, quoted fields, multi-line cells, header row detection |
| mapper.ts | Exact match, alias match, fuzzy match (Levenshtein), content analysis, historical match |
| validator.ts | Required field errors, email typo auto-fix, phone format, date parsing, gender normalization |
| sportConfig.ts | Sport age group lookups, skill definitions query, age validation |
