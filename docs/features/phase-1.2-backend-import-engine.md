# PlayerARC - Phase 1.2: Backend Import Engine

> Auto-generated documentation - Last updated: 2026-02-12 18:11

## Status

- **Branch**: `ralph/phase-1.2-backend-import-engine`
- **Progress**: 10 / 10 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P1.2-001: Create CSV parser utility

As the import system, I need to parse CSV files with robust handling of edge cases including quoted fields, multi-line cells, and various delimiters.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/import/parser.ts
- Implement parseCSV function that handles: comma/semicolon/tab/pipe delimiters, quoted fields with embedded commas, multi-line cells in quotes
- Implement detectDelimiter function that auto-detects the delimiter from file content
- Implement detectHeaderRow function using heuristic (first row with >50% string-like values)
- Return ParseResult type: { headers: string[], rows: Record<string, string>[], totalRows: number, detectedDelimiter: string }
- Handle empty rows and whitespace-only values gracefully
- NOTE: Use native string parsing - do NOT add npm dependencies like papaparse (Convex runtime restrictions)

### US-P1.2-002: Create field alias database and exact/alias matching

As the import system, I need a comprehensive alias database for common CSV column names and matching functions for exact and alias-based mapping.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/import/mapper.ts
- Define FIELD_ALIASES constant mapping target fields to arrays of known aliases for 20+ fields
- Implement exactMatch function: lowercase comparison, returns 100% confidence
- Implement aliasMatch function: checks against alias database, returns 95% confidence
- Implement normalizeColumnName function: lowercase, trim, remove special chars
- Export getFieldAliases helper for external use

### US-P1.2-003: Add fuzzy and content-analysis matching to mapper

As the import system, I need fuzzy string matching and content analysis to map columns that don't match exactly or by alias.

**Acceptance Criteria:**
- Add to packages/backend/convex/lib/import/mapper.ts
- Implement fuzzyMatch function using Levenshtein distance calculation (implement inline - no npm dependency)
- Fuzzy match threshold: distance <= 3 edits returns 70-90% confidence (scaled by distance)
- Implement analyzeColumnContent function: examine sample values to infer field type using regex patterns
- Content analysis returns 60-80% confidence based on pattern match strength
- Implement main suggestMappings function that runs all strategies in order: exact -> alias -> fuzzy -> content analysis

### US-P1.2-004: Add historical mapping lookup to mapper

As the import system, I need to check importMappingHistory for past successful mappings to improve accuracy for returning organizations.

**Acceptance Criteria:**
- Add to packages/backend/convex/lib/import/mapper.ts
- Create suggestMappingsWithHistory function that accepts a QueryCtx parameter
- Query importMappingHistory by normalizedColumnName and optional organizationId using indexes
- Historical matches return 80% confidence when usageCount >= 3, 70% when < 3
- Integrate into pipeline: exact -> alias -> historical -> fuzzy -> content analysis

### US-P1.2-005: Create row validator with auto-fix suggestions

As the import system, I need to validate each row against field definitions and provide auto-fix suggestions for common errors.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/import/validator.ts
- Implement validateRow function checking: required fields, email format, phone format, date format, gender normalization
- Implement autoFixValue function for: date format standardization, phone prefix suggestion, email typo detection, name title-casing
- Return ValidationResult: { valid: boolean, errors: Array<{field, error, value, suggestedFix?}> }
- Implement validateBatch for processing multiple rows with summary stats

### US-P1.2-006: Create benchmark applicator with 5 strategies

As the import system, I need to apply initial skill ratings to newly created sport passports using one of 5 strategies.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/import/benchmarkApplicator.ts
- Implement applyBenchmarksToPassport function accepting MutationCtx, passportId, and settings
- Strategy 'blank': set all skills to rating 1
- Strategy 'middle': set all skills to rating 3
- Strategy 'age-appropriate': query skillBenchmarks for sport+ageGroup, use expectedRating
- Strategy 'ngb-benchmarks': same as age-appropriate but filtered by NGB source
- Strategy 'custom': query benchmarkTemplates by templateId, use template ratings
- Create skillAssessment records with assessmentType 'import'
- Return { benchmarksApplied: number } count

### US-P1.2-007: Create sport configuration helper

As the import system, I need to look up sport-specific configurations including age groups, skills, and validation rules.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/import/sportConfig.ts
- Implement getSportConfig, getAgeGroupsForSport, getSkillsForSport, validateAgeForGroup functions
- All queries use .withIndex() - never .filter()
- Query from existing sportAgeGroupConfig and skillDefinitions tables

### US-P1.2-008: Add sportCode parameter to playerImport.ts

As the import system, I need to pass a sport code to the import mutation instead of hardcoding 'gaa_football'.

**Acceptance Criteria:**
- Add optional arg: sportCode: v.optional(v.string()) to batchImportPlayersWithIdentity
- Replace all hardcoded 'gaa_football' references with: args.sportCode || 'gaa_football'
- DO NOT modify the guardian matching algorithm
- Existing imports work identically when sportCode is not provided
- Typecheck passes: npm run check-types

### US-P1.2-009: Add session tracking and row selection to playerImport.ts

As the import system, I need to track which import session created records and filter by selected rows.

**Acceptance Criteria:**
- Add optional args: sessionId and selectedRowIndices to batchImportPlayersWithIdentity
- When selectedRowIndices provided, filter players array before processing
- When sessionId provided, include importSessionId field when creating records
- DO NOT modify the guardian matching algorithm
- Typecheck passes: npm run check-types

### US-P1.2-010: Add benchmark application to playerImport.ts

As the import system, I need to apply benchmark ratings to sport passports during import when configured.

**Acceptance Criteria:**
- Add optional arg benchmarkSettings to batchImportPlayersWithIdentity
- After sport passport creation, if benchmarkSettings.applyBenchmarks is true, call applyBenchmarksToPassport
- Import applyBenchmarksToPassport from lib/import/benchmarkApplicator.ts
- Add benchmarksApplied count to the return value
- DO NOT modify the guardian matching algorithm
- Typecheck passes: npm run check-types


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
