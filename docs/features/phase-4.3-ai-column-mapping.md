# PlayerARC - Phase 4.3: AI-Powered Column Mapping

> Auto-generated documentation - Last updated: 2026-02-15 22:36

## Status

- **Branch**: `ralph/phase-4.3-ai-column-mapping`
- **Progress**: 5 / 8 stories complete
- **Phase Status**: 🔄 In Progress

## Completed Features

### US-P4.3-001: Add AI mapping cache table to schema

As a developer, I need a table to cache AI column mapping results to avoid duplicate API calls and reduce costs.

**Acceptance Criteria:**
- Add aiMappingCache table to packages/backend/convex/schema.ts
- Fields: columnPattern (string - normalized column name), sampleValues (array of strings), suggestedField (string), confidence (number 0-100), reasoning (string), createdAt (number), expiresAt (number)
- columnPattern is normalized: lowercase, trim, remove special chars (e.g., 'First Name' → 'firstname')
- expiresAt = createdAt + 30 days (2592000000 ms)
- Add indexes: by_columnPattern, by_expiresAt
- Add cache cleanup index: by_expiresAt for periodic deletion of expired entries
- Run npx -w packages/backend convex codegen successfully

### US-P4.3-002: Create Claude API integration action

As a developer, I need to call Claude API with a prompt and parse the response for column mapping suggestions.

**Acceptance Criteria:**
- Create packages/backend/convex/actions/aiMapping.ts
- Install @anthropic-ai/sdk package: npm install @anthropic-ai/sdk
- Add ANTHROPIC_API_KEY to Convex environment variables
- Implement callClaudeAPI action: accepts prompt (string), returns parsed response
- Use Claude 3.5 Sonnet model: 'claude-3-5-sonnet-20241022'
- Set max_tokens: 1024 (sufficient for mapping response)
- Set temperature: 0.3 (deterministic but creative enough)
- Parse response: expect JSON with { targetField, confidence, reasoning }
- Add error handling for API errors: 401 (invalid key), 429 (rate limit), 500 (server error)
- Implement retry logic with exponential backoff (3 retries max)
- Add TypeScript types: AIMappingRequest, AIMappingResponse
- Run npx ultracite fix and npm run check-types

### US-P4.3-003: Create AI mapping prompt template

As a developer, I need a well-engineered prompt template that instructs Claude to map CSV columns to PlayerARC fields with high accuracy.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/import/aiMapper.ts
- Export buildMappingPrompt function: (columnName, sampleValues, availableFields) => string
- Prompt structure:
-   1. System context: 'You are a data mapping expert for a sports player management system.'
-   2. Task description: 'Map CSV column to target field based on column name and sample values.'
-   3. Available target fields: firstName, lastName, dateOfBirth, email, phone, address.street1, address.city, address.county, address.postcode, address.country, gender, guardianFirstName, guardianLastName, guardianEmail, guardianPhone
-   4. Column name: '{columnName}'
-   5. Sample values: ['{value1}', '{value2}', '{value3}']
-   6. Instructions: 'Return JSON with targetField (one of available fields or null if no match), confidence (0-100), reasoning (1 sentence explaining your choice).'
-   7. Examples: 3 example mappings showing high/medium/low confidence cases
-   8. Constraints: 'Only use provided target fields. Return null if unsure. Be conservative with confidence scores.'
- Add validation: ensure columnName and sampleValues are provided
- Run npx ultracite fix

### US-P4.3-004: Implement AI column mapper with caching

As the import system, I need to get AI-suggested mappings for CSV columns, using cached results when available.

**Acceptance Criteria:**
- Add to packages/backend/convex/actions/aiMapping.ts
- Implement suggestColumnMapping action with args: columnName, sampleValues (array of 3-5 values)
- Normalize columnName: lowercase, trim, remove special chars
- Check aiMappingCache for existing mapping (by columnPattern + sampleValues hash)
- If cached and not expired (expiresAt > now), return cached result
- If not cached or expired, build prompt using buildMappingPrompt
- Call Claude API with prompt
- Parse response JSON: { targetField, confidence, reasoning }
- Validate confidence is 0-100, targetField is in allowed fields list
- Store result in aiMappingCache with expiresAt = now + 30 days
- Return: { targetField, confidence, reasoning, cached: boolean }
- Log cache hit/miss for monitoring
- Run npx -w packages/backend convex codegen and npm run check-types

### US-P4.3-005: Create batch AI mapping orchestrator

As the import system, I need to suggest mappings for all CSV columns at once to minimize latency and provide a complete suggestion set.

**Acceptance Criteria:**
- Add to packages/backend/convex/actions/aiMapping.ts
- Implement suggestAllMappings action with args: columns (array of { name, sampleValues })
- Call suggestColumnMapping for each column in parallel (use Promise.all)
- Return: { mappings: Record<columnName, AIMappingResult>, cacheHitRate: number }
- cacheHitRate = (cached / total) * 100 for monitoring
- Add rate limiting: max 10 concurrent API calls to avoid overwhelming Claude API
- If rate limit hit (429), use exponential backoff and retry
- Sort results by confidence: HIGH → MEDIUM → LOW for UI display
- Add TypeScript types: BatchMappingRequest, BatchMappingResult
- Run npx ultracite fix and npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Import-related tables are grouped together in schema.ts starting around line 4630
- Schema table definitions use `.index()` chaining pattern
- 30-day TTL = 2592000000 milliseconds (mentioned in PRD notes)
- None - straightforward schema addition
- Schema changes require `npx -w packages/backend convex codegen` before type checking
--
- Convex actions use "use node" directive at the top
- Actions use `action({ args, returns, handler })` pattern
- Unused ctx parameter should be prefixed with underscore (_ctx)
- Biome linter enforces complexity limits (max 15) - extract helper functions if needed

**Gotchas encountered:**
- None - straightforward schema addition
- Schema changes require `npx -w packages/backend convex codegen` before type checking
- [ ] US-P4.3-002: Install @anthropic-ai/sdk and create Claude API integration action
- None
--
- Initial implementation had complexity score of 32 (max 15) - needed refactoring
- Biome linter caught unused variables (parseError, ctx) - needed underscore prefix or removal
- Regex pattern for JSON extraction needed to be moved to module level
- Actions need `"use node"` directive to access Node.js APIs (process.env, setTimeout)
- @anthropic-ai/sdk requires API key from environment variables

### Files Changed

- packages/backend/convex/schema.ts (+17 lines, added aiMappingCache table definition)
- ✅ Convex codegen: passed
- ✅ Pre-commit lint-staged: passed
- Import-related tables are grouped together in schema.ts starting around line 4630
- Schema table definitions use `.index()` chaining pattern
- 30-day TTL = 2592000000 milliseconds (mentioned in PRD notes)
- None - straightforward schema addition
- Schema changes require `npx -w packages/backend convex codegen` before type checking
- [ ] US-P4.3-002: Install @anthropic-ai/sdk and create Claude API integration action
--
- packages/backend/package.json (+1 dependency: @anthropic-ai/sdk)
- packages/backend/convex/actions/aiMapping.ts (+198 lines, new file)
- ✅ Convex codegen: passed
- ✅ Biome linting: passed (no errors/warnings)
- ✅ Pre-commit lint-staged: passed


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
