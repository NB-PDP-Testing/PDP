# PlayerARC - Phase 1.1: Import Database Foundation

> Auto-generated documentation - Last updated: 2026-02-12 18:07

## Status

- **Branch**: `ralph/phase-1.1-import-database-foundation`
- **Progress**: 8 / 8 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P1.1-001: Add importTemplates table to schema

As a developer, I need a table to store sport-specific and organization-specific import configurations (column mappings, age group mappings, skill initialization strategy, defaults).

**Acceptance Criteria:**
- Add importTemplates table to packages/backend/convex/schema.ts with all fields from Phase 1 PRD section 'New Tables > importTemplates'
- Fields: name, description, sportCode, sourceType (csv/excel/paste), scope (platform/organization), organizationId, columnMappings array, ageGroupMappings array, skillInitialization object, defaults object, isActive, createdBy, createdAt, updatedAt
- Add indexes: by_scope, by_sportCode, by_organizationId, by_scope_and_sport
- Run npx -w packages/backend convex codegen successfully
- Typecheck passes: npm run check-types

### US-P1.1-002: Add importSessions table to schema

As a developer, I need a table to track each import execution with full audit trail including status, source info, mappings, player selections, benchmark settings, stats, errors, and duplicates.

**Acceptance Criteria:**
- Add importSessions table to packages/backend/convex/schema.ts with all fields from Phase 1 PRD section 'New Tables > importSessions'
- Status union: uploading, mapping, selecting, reviewing, importing, completed, failed, cancelled
- Include sourceInfo object, mappings record, playerSelections array, benchmarkSettings object, stats object, errors array, duplicates array
- Add indexes: by_organizationId, by_status, by_initiatedBy, by_startedAt, by_org_and_status
- Run npx -w packages/backend convex codegen successfully

### US-P1.1-003: Add importMappingHistory and benchmarkTemplates tables to schema

As a developer, I need tables for learning from past imports (mapping history) and custom benchmark configurations per sport/organization.

**Acceptance Criteria:**
- Add importMappingHistory table with fields: organizationId, templateId, sourceColumnName, normalizedColumnName, targetField, usageCount, lastUsedAt, confidence, createdAt
- Add importMappingHistory indexes: by_normalizedColumnName, by_organizationId, by_templateId, by_targetField
- Add benchmarkTemplates table with fields: name, sportCode, scope (platform/organization), organizationId, benchmarks array (skillCode, ageGroup, expectedRating, minAcceptable, description), isActive, createdAt
- Add benchmarkTemplates indexes: by_sportCode, by_scope, by_organizationId
- Run npx -w packages/backend convex codegen successfully

### US-P1.1-004: Extend existing tables with import tracking fields

As a developer, I need to track which import session created each player identity and enrollment, plus external system IDs for deduplication.

**Acceptance Criteria:**
- Add to playerIdentities table: importSessionId: v.optional(v.id('importSessions')), externalIds: v.optional(v.record(v.string(), v.string()))
- Add to orgPlayerEnrollments table: importSessionId: v.optional(v.id('importSessions')), lastSyncedAt: v.optional(v.number()), syncSource: v.optional(v.string())
- Both fields are optional to maintain backward compatibility with existing data
- Run npx -w packages/backend convex codegen successfully
- Typecheck passes: npm run check-types

### US-P1.1-005: Create importTemplates CRUD mutations and queries

As an admin, I need to create, read, update, delete, and clone import templates for my organization or the platform.

**Acceptance Criteria:**
- Create packages/backend/convex/models/importTemplates.ts
- Implement createTemplate mutation with full args validation and returns validator
- Implement updateTemplate mutation (by template ID)
- Implement deleteTemplate mutation (soft delete via isActive = false)
- Implement cloneTemplate mutation (create copy with new name)
- Implement getTemplate query (by ID)
- Implement listTemplates query (by scope, with optional sportCode filter, using indexes)
- All queries use .withIndex() - never .filter()
- Run npx ultracite fix and npx -w packages/backend convex codegen

### US-P1.1-006: Create importSessions lifecycle mutations and queries

As the import system, I need to create sessions, track status transitions, store player selections, and record import statistics.

**Acceptance Criteria:**
- Create packages/backend/convex/models/importSessions.ts
- Implement createImportSession mutation (creates with status 'uploading', returns session ID)
- Implement updateSessionStatus mutation (validates status transitions)
- Implement updatePlayerSelections mutation (stores array of row selections)
- Implement setBenchmarkSettings mutation (stores benchmark configuration)
- Implement recordSessionStats mutation (stores final import statistics)
- Implement getSession query (by ID, returns full session data)
- Implement listSessionsByOrg query (by organizationId, ordered by startedAt desc, using by_org_and_status index)
- All queries use .withIndex() - never .filter()

### US-P1.1-007: Create importMappingHistory mutations and queries

As the import system, I need to record column mapping decisions and query historical mappings to improve auto-mapping accuracy.

**Acceptance Criteria:**
- Add to packages/backend/convex/models/importSessions.ts (or create separate file if cleaner)
- Implement recordMappingHistory mutation (upsert: increment usageCount if exists, create if new)
- Implement getHistoricalMappings query (by normalizedColumnName and optional organizationId)
- Implement getBestMapping query (returns highest confidence mapping for a given column name)
- Normalize column names: lowercase, trim, remove special characters
- All queries use .withIndex() - never .filter()

### US-P1.1-008: Seed default import templates

As the platform, I need pre-configured templates for GAA Foireann exports and generic CSV imports so users can import immediately.

**Acceptance Criteria:**
- Create packages/backend/convex/models/importTemplateSeeds.ts with seed data
- Create a seedDefaultTemplates mutation that inserts templates if they don't already exist
- GAA Foireann template: sportCode 'gaa_football', sourceType 'csv', scope 'platform', with 10+ column mappings (Forename->firstName, Surname->lastName, DOB->dateOfBirth, gender->gender, email->parentEmail, Mobile Number->parentPhone, Address1->address, Postcode->postcode, Town->town)
- Generic CSV template: sportCode null (works for all sports), sourceType 'csv', scope 'platform', with regex-based column mappings for common field patterns
- Both templates have skillInitialization strategy 'age-appropriate' for GAA, 'blank' for generic
- Templates marked isActive: true


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Schema file is ~4500 lines - use offset/limit when reading
- Convex codegen is the fastest way to validate schema + model files together
- Status transition validation pattern: use a `VALID_TRANSITIONS` record mapping current->allowed
- Biome requires block statements `{}` for ALL if bodies - single-line ifs fail lint
- Non-null assertion (`args.status!`) fails lint - extract to local variable first
- Optional chaining required: `template?.isActive` instead of `template && template.isActive`
- `npx ultracite fix` auto-fixes formatting but NOT lint errors (block statements, non-null assertions)

**Gotchas encountered:**
- Biome requires block statements `{}` for ALL if bodies - single-line ifs fail lint
- Non-null assertion (`args.status!`) fails lint - extract to local variable first
- Optional chaining required: `template?.isActive` instead of `template && template.isActive`
- `npx ultracite fix` auto-fixes formatting but NOT lint errors (block statements, non-null assertions)
- First commit attempt for model files failed due to biome lint errors (block statements, non-null assertion)
- Should have run `npx ultracite fix` AND checked for biome errors before first commit attempt
---

### Files Changed

- packages/backend/convex/schema.ts (+218)
- packages/backend/convex/models/importTemplates.ts (+255, new)
- packages/backend/convex/models/importSessions.ts (+315, new)
- packages/backend/convex/models/importMappingHistory.ts (+167, new)
- packages/backend/convex/models/importTemplateSeeds.ts (+270, new)
- ✅ Convex codegen: passed
- ✅ Linting (biome): passed after fixes
- ✅ Type check: pre-existing errors only (seedFeatureFlags.ts)
- N/A Browser verification: backend-only changes
- Schema file is ~4500 lines - use offset/limit when reading
- Convex codegen is the fastest way to validate schema + model files together
- Status transition validation pattern: use a `VALID_TRANSITIONS` record mapping current->allowed
- Biome requires block statements `{}` for ALL if bodies - single-line ifs fail lint


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
