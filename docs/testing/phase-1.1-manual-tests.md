# Phase 1.1: Import Database Foundation - Manual Test Suite

**Branch:** `ralph/phase-1.1-import-database-foundation`
**Dashboard:** https://dashboard.convex.dev/d/brazen-squirrel-35

All tests use the Convex Dashboard "Functions" tab to run mutations/queries directly.

---

## Pre-Requisites

1. Ensure you're on the correct branch: `git checkout ralph/phase-1.1-import-database-foundation`
2. Run codegen: `npx -w packages/backend convex codegen`
3. Run type check: `npm run check-types`
4. Open Convex Dashboard: https://dashboard.convex.dev/d/brazen-squirrel-35

---

## Test 1: Schema Verification

**Goal:** Verify all 4 new tables exist with correct indexes.

### Steps
1. Open Convex Dashboard > **Data** tab
2. Verify these tables appear in the left sidebar:
   - [ ] `importTemplates`
   - [ ] `importSessions`
   - [ ] `importMappingHistory`
   - [ ] `benchmarkTemplates`
3. Click each table and verify it loads (even if empty)

### Expected Result
All 4 tables visible and accessible. No errors.

---

## Test 2: Seed Default Templates

**Goal:** Verify the seed mutation creates both default templates.

### Steps
1. Dashboard > **Functions** tab
2. Find and run: `importTemplateSeeds:seedDefaultTemplates`
3. Args: `{}` (empty object)
4. Note the returned `gaaTemplateId` and `genericTemplateId`

### Expected Result
```json
{
  "gaaTemplateId": "<some_id>",
  "genericTemplateId": "<some_id>",
  "alreadyExisted": false
}
```

### Verify
5. Go to **Data** tab > `importTemplates` table
6. Verify 2 rows exist:
   - [ ] "GAA Foireann Export" - sportCode: "gaa_football", scope: "platform", 12 column mappings
   - [ ] "Generic CSV/Excel" - scope: "platform", 10 column mappings, no sportCode

---

## Test 3: Seed Idempotency

**Goal:** Running seed again should not create duplicates.

### Steps
1. Run `importTemplateSeeds:seedDefaultTemplates` again with `{}`

### Expected Result
```json
{
  "alreadyExisted": true
}
```
No `gaaTemplateId` or `genericTemplateId` in the response. Table still has exactly 2 rows.

---

## Test 4: hasDefaultTemplates Query

**Goal:** Verify the check query works.

### Steps
1. Run `importTemplateSeeds:hasDefaultTemplates` with `{}`

### Expected Result
```json
{
  "gaaTemplate": true,
  "genericTemplate": true
}
```

---

## Test 5: List Templates by Scope

**Goal:** Verify listTemplates query uses indexes correctly.

### Steps
1. Run `importTemplates:listTemplates` with:
```json
{ "scope": "platform" }
```

### Expected Result
Array with 2 templates (GAA Foireann + Generic CSV). Both have `isActive: true`.

---

## Test 6: Get Template by ID

**Goal:** Verify single template retrieval.

### Steps
1. Copy the `gaaTemplateId` from Test 2
2. Run `importTemplates:getTemplate` with:
```json
{ "templateId": "<gaaTemplateId>" }
```

### Expected Result
Full GAA Foireann template object with all fields:
- [ ] name: "GAA Foireann Export"
- [ ] sportCode: "gaa_football"
- [ ] sourceType: "csv"
- [ ] scope: "platform"
- [ ] columnMappings: 12 entries
- [ ] ageGroupMappings: 5 entries
- [ ] skillInitialization.strategy: "age-appropriate"
- [ ] defaults.createTeams: true
- [ ] isActive: true

---

## Test 7: Create Custom Template

**Goal:** Verify template creation mutation.

### Steps
1. Run `importTemplates:createTemplate` with:
```json
{
  "name": "Test Rugby Template",
  "description": "Testing template creation",
  "sportCode": "rugby",
  "sourceType": "csv",
  "scope": "organization",
  "organizationId": "test-org-123",
  "columnMappings": [
    { "sourcePattern": "Name", "targetField": "firstName", "required": true }
  ],
  "ageGroupMappings": [],
  "skillInitialization": {
    "strategy": "blank",
    "applyToPassportStatus": ["active"]
  },
  "defaults": { "createTeams": false, "createPassports": true },
  "createdBy": "test-user"
}
```

### Expected Result
Returns a template ID string. Verify in Data tab that the template exists with all fields.

---

## Test 8: Update Template

**Goal:** Verify template update mutation.

### Steps
1. Use the template ID from Test 7
2. Run `importTemplates:updateTemplate` with:
```json
{
  "templateId": "<id_from_test_7>",
  "name": "Test Rugby Template (Updated)",
  "description": "Updated description"
}
```

### Expected Result
Returns `null`. Check Data tab - template name and description updated, `updatedAt` changed.

---

## Test 9: Clone Template

**Goal:** Verify template cloning.

### Steps
1. Use the GAA template ID from Test 2
2. Run `importTemplates:cloneTemplate` with:
```json
{
  "templateId": "<gaaTemplateId>",
  "newName": "GAA Clone for Testing"
}
```

### Expected Result
Returns a new template ID. Check Data tab:
- [ ] New template has name "GAA Clone for Testing"
- [ ] All other fields copied from GAA template
- [ ] Different `_id` from original
- [ ] `importTemplates` table now has 4 rows

---

## Test 10: Delete Template (Soft Delete)

**Goal:** Verify soft delete sets isActive to false.

### Steps
1. Use the test template ID from Test 7
2. Run `importTemplates:deleteTemplate` with:
```json
{ "templateId": "<id_from_test_7>" }
```

### Expected Result
Returns `null`. Check Data tab - template still exists but `isActive` is `false`.

---

## Test 11: Create Import Session

**Goal:** Verify session creation with initial status.

### Steps
1. Run `importSessions:createImportSession` with:
```json
{
  "organizationId": "test-org-123",
  "initiatedBy": "test-user-456",
  "sourceInfo": {
    "type": "file",
    "fileName": "test-export.csv",
    "fileSize": 12345,
    "rowCount": 50,
    "columnCount": 8
  }
}
```
2. Save the returned session ID

### Expected Result
Returns a session ID. Check Data tab > `importSessions`:
- [ ] status: "uploading"
- [ ] stats.totalRows: 50
- [ ] stats.playersCreated: 0 (all zeroed)
- [ ] errors: [] (empty)
- [ ] duplicates: [] (empty)
- [ ] mappings: {} (empty)
- [ ] playerSelections: [] (empty)
- [ ] startedAt: populated timestamp

---

## Test 12: Session Status Transitions (Happy Path)

**Goal:** Verify valid status transitions work.

### Steps
Using the session ID from Test 11, run these in order:

1. `importSessions:updateSessionStatus`:
```json
{ "sessionId": "<id>", "status": "mapping" }
```
2. Verify status is "mapping" in Data tab
3. `importSessions:updateSessionStatus`:
```json
{ "sessionId": "<id>", "status": "selecting" }
```
4. Then: `"reviewing"`, then `"importing"`, then `"completed"`

### Expected Result
Each transition succeeds (returns `null`). After "completed":
- [ ] status: "completed"
- [ ] completedAt: populated timestamp

---

## Test 13: Session Status Transitions (Invalid)

**Goal:** Verify invalid transitions are rejected.

### Steps
1. Create a new session (repeat Test 11 steps)
2. Try to skip from "uploading" to "importing":
```json
{ "sessionId": "<new_id>", "status": "importing" }
```

### Expected Result
Error: `"Invalid status transition: uploading -> importing"`

### Also test:
3. Transition to "completed", then try to change status again:
```json
{ "sessionId": "<id>", "status": "cancelled" }
```

### Expected Result
Error: `"Invalid status transition: completed -> cancelled"` (completed is terminal)

---

## Test 14: Session Cancellation

**Goal:** Verify cancellation from non-terminal states.

### Steps
1. Create a new session
2. Transition to "mapping"
3. Cancel:
```json
{ "sessionId": "<id>", "status": "cancelled" }
```

### Expected Result
Returns `null`. Status is "cancelled". No further transitions possible.

---

## Test 15: Update Player Selections

**Goal:** Verify player selection storage.

### Steps
1. Create a new session (or use one in "uploading" state)
2. Run `importSessions:updatePlayerSelections`:
```json
{
  "sessionId": "<id>",
  "selections": [
    { "rowIndex": 0, "selected": true },
    { "rowIndex": 1, "selected": true },
    { "rowIndex": 2, "selected": false, "reason": "duplicate" },
    { "rowIndex": 3, "selected": true }
  ]
}
```

### Expected Result
Returns `null`. Data tab shows `playerSelections` array with 4 entries.

---

## Test 16: Set Benchmark Settings

**Goal:** Verify benchmark configuration storage.

### Steps
1. Run `importSessions:setBenchmarkSettings`:
```json
{
  "sessionId": "<id>",
  "settings": {
    "applyBenchmarks": true,
    "strategy": "age-appropriate",
    "passportStatuses": ["active"]
  }
}
```

### Expected Result
Returns `null`. Data tab shows `benchmarkSettings` object populated.

---

## Test 17: Record Session Stats

**Goal:** Verify final statistics recording.

### Steps
1. Run `importSessions:recordSessionStats`:
```json
{
  "sessionId": "<id>",
  "stats": {
    "totalRows": 50,
    "selectedRows": 45,
    "validRows": 43,
    "errorRows": 2,
    "duplicateRows": 3,
    "playersCreated": 40,
    "playersUpdated": 3,
    "playersSkipped": 2,
    "guardiansCreated": 30,
    "guardiansLinked": 25,
    "teamsCreated": 2,
    "passportsCreated": 40,
    "benchmarksApplied": 40
  }
}
```

### Expected Result
Returns `null`. Data tab shows all stats updated.

---

## Test 18: Get Session

**Goal:** Verify session retrieval returns all data.

### Steps
1. Run `importSessions:getSession`:
```json
{ "sessionId": "<id_from_test_11>" }
```

### Expected Result
Full session object with all fields populated from previous tests.

---

## Test 19: List Sessions by Org

**Goal:** Verify organization-scoped session listing.

### Steps
1. Run `importSessions:listSessionsByOrg`:
```json
{ "organizationId": "test-org-123" }
```

### Expected Result
Array of all sessions created with `organizationId: "test-org-123"`, sorted by `startedAt` descending (most recent first).

---

## Test 20: List Sessions by Org + Status Filter

**Goal:** Verify filtered listing works.

### Steps
1. Run `importSessions:listSessionsByOrg`:
```json
{ "organizationId": "test-org-123", "status": "completed" }
```

### Expected Result
Only sessions with status "completed" for that org.

---

## Test 21: Record Mapping History

**Goal:** Verify mapping history creation.

### Steps
1. Run `importMappingHistory:recordMappingHistory`:
```json
{
  "organizationId": "test-org-123",
  "sourceColumnName": "First Name",
  "targetField": "firstName",
  "confidence": 0.95
}
```

### Expected Result
Returns the mapping history record ID. Data tab > `importMappingHistory`:
- [ ] normalizedColumnName: "first name" (lowercased, trimmed)
- [ ] usageCount: 1
- [ ] lastUsedAt: populated

---

## Test 22: Mapping History Upsert (Increment)

**Goal:** Verify that recording same mapping increments usageCount.

### Steps
1. Run `importMappingHistory:recordMappingHistory` again with same args:
```json
{
  "organizationId": "test-org-123",
  "sourceColumnName": "First Name",
  "targetField": "firstName",
  "confidence": 0.95
}
```

### Expected Result
Returns the SAME record ID. Data tab shows:
- [ ] usageCount: 2 (incremented from 1)
- [ ] lastUsedAt: updated timestamp

---

## Test 23: Get Historical Mappings

**Goal:** Verify historical lookup by column name.

### Steps
1. Run `importMappingHistory:getHistoricalMappings`:
```json
{ "normalizedColumnName": "first name" }
```

### Expected Result
Array containing the mapping record from Tests 21-22.

### Also test with org filter:
```json
{ "normalizedColumnName": "first name", "organizationId": "test-org-123" }
```

### Expected Result
Same record (matches org filter).

---

## Test 24: Get Best Mapping

**Goal:** Verify best mapping returns highest confidence.

### Steps
1. First, create a second mapping with lower confidence:
```json
{
  "organizationId": "test-org-123",
  "sourceColumnName": "First Name",
  "targetField": "givenName",
  "confidence": 0.60
}
```
2. Run `importMappingHistory:getBestMapping`:
```json
{ "normalizedColumnName": "first name" }
```

### Expected Result
Returns the mapping with targetField "firstName" (confidence 0.95), not "givenName" (0.60).

---

## Test 25: Existing Table Extensions

**Goal:** Verify playerIdentities and orgPlayerEnrollments have new optional fields.

### Steps
1. Dashboard > Data tab > `playerIdentities`
2. If existing records exist, verify they still display correctly (new fields are optional)
3. Dashboard > Data tab > `orgPlayerEnrollments`
4. Same verification

### Expected Result
- [ ] Existing records unaffected (backward compatible)
- [ ] Schema shows `importSessionId` and `externalIds` fields on playerIdentities
- [ ] Schema shows `importSessionId`, `lastSyncedAt`, `syncSource` fields on orgPlayerEnrollments

---

## Build Verification Tests

### Test 26: Convex Codegen
```bash
npx -w packages/backend convex codegen
```
**Expected:** Exits with code 0, no errors.

### Test 27: Type Check
```bash
npm run check-types
```
**Expected:** Passes (pre-existing errors in migrations/ and coachParentSummaries.ts are OK).

### Test 28: Lint Check
```bash
npx ultracite fix && npm run check
```
**Expected:** No new lint errors from Phase 1.1 files.

---

## Cleanup

After testing, you can clean up test data:
1. Delete test sessions from `importSessions` table (those with `organizationId: "test-org-123"`)
2. Delete test template "Test Rugby Template" and "GAA Clone for Testing"
3. Delete test mapping history records
4. Keep the 2 seeded platform templates (GAA Foireann + Generic CSV)

---

## Summary Checklist

| # | Test | Status |
|---|------|--------|
| 1 | Schema - 4 new tables visible | [ ] |
| 2 | Seed default templates | [ ] |
| 3 | Seed idempotency | [ ] |
| 4 | hasDefaultTemplates query | [ ] |
| 5 | List templates by scope | [ ] |
| 6 | Get template by ID | [ ] |
| 7 | Create custom template | [ ] |
| 8 | Update template | [ ] |
| 9 | Clone template | [ ] |
| 10 | Delete template (soft) | [ ] |
| 11 | Create import session | [ ] |
| 12 | Status transitions (happy path) | [ ] |
| 13 | Status transitions (invalid) | [ ] |
| 14 | Session cancellation | [ ] |
| 15 | Update player selections | [ ] |
| 16 | Set benchmark settings | [ ] |
| 17 | Record session stats | [ ] |
| 18 | Get session by ID | [ ] |
| 19 | List sessions by org | [ ] |
| 20 | List sessions by org + status | [ ] |
| 21 | Record mapping history | [ ] |
| 22 | Mapping history upsert | [ ] |
| 23 | Get historical mappings | [ ] |
| 24 | Get best mapping | [ ] |
| 25 | Existing table extensions | [ ] |
| 26 | Convex codegen | [ ] |
| 27 | Type check | [ ] |
| 28 | Lint check | [ ] |
