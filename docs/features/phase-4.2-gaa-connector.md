# PlayerARC - Phase 4.2: GAA Foireann Connector

> Auto-generated documentation - Last updated: 2026-02-15 21:50

## Status

- **Branch**: `ralph/phase-4.2-gaa-connector`
- **Progress**: 5 / 8 stories complete
- **Phase Status**: 🔄 In Progress

## Completed Features

### US-P4.2-001: Create GAA Foireann connector configuration

As a platform admin, I need to configure the GAA Foireann connector with API endpoints and default settings so clubs can connect to Foireann.

**Acceptance Criteria:**
- Create seed data for GAA Foireann connector in importTemplateSeeds.ts
- Connector name: 'GAA Foireann'
- federationCode: 'gaa_foireann'
- authType: 'oauth2' (Foireann uses OAuth 2.0)
- endpoints.membershipList: 'https://api.foireann.ie/v2/clubs/{clubId}/members'
- endpoints.memberDetail: 'https://api.foireann.ie/v2/members/{memberId}'
- syncConfig.conflictStrategy: 'federation_wins' (Foireann is source of truth)
- Link to GAA Foireann import template (created in Phase 1.1)
- status: 'inactive' (requires OAuth setup per club)
- Add seedGAAConnector mutation to create connector if not exists
- Run npx -w packages/backend convex codegen

### US-P4.2-002: Implement GAA membership list fetcher action

As the sync engine, I need to fetch the full membership list from GAA Foireann API with pagination support.

**Acceptance Criteria:**
- Create packages/backend/convex/actions/gaaFoireann.ts
- Implement fetchMembershipList action with args: connectorId, organizationId
- Load connector using getConnector query
- Find organization's federationOrgId from connectedOrganizations array
- Create FederationApiClient instance with connectorId
- Call GET /clubs/{clubId}/members endpoint
- Handle pagination: fetch all pages (max 100 members per page)
- Parse response to extract member array
- Expected response fields: memberId, firstName, lastName, dateOfBirth, email, phone, address, membershipNumber, membershipStatus, joinDate
- Return: { members: GAAMember[], totalCount: number, fetchedAt: number }
- Add error handling for 401 (auth), 404 (club not found), 429 (rate limit), 500 (server error)
- Log sync attempt with timestamp and result
- Run npx ultracite fix

### US-P4.2-003: Implement GAA member detail fetcher action

As the sync engine, I need to fetch detailed member information for individual members to get complete profile data.

**Acceptance Criteria:**
- Add to packages/backend/convex/actions/gaaFoireann.ts
- Implement fetchMemberDetail action with args: connectorId, memberId
- Create FederationApiClient instance
- Call GET /members/{memberId} endpoint
- Parse detailed response including: full address, emergency contacts, medical info, player positions, teams
- Return: { member: GAAMemberDetail, fetchedAt: number }
- Add caching: store fetched details in temporary cache (5 min TTL) to avoid duplicate API calls
- Handle errors: 404 (member not found), 403 (no access to member)
- TypeScript type: GAAMemberDetail extends GAAMember with additional fields
- Run npx ultracite fix and npm run check-types

### US-P4.2-004: Create GAA field mapping transformer

As a developer, I need to transform GAA Foireann field names and formats to match PlayerARC's schema for seamless import.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/federation/gaaMapper.ts
- Implement transformGAAMember function: (gaaMember: GAAMember) => ImportRowData
- Field mappings:
-   - memberId → externalIds.foireann
-   - firstName → firstName (trim, titlecase)
-   - lastName → lastName (trim, titlecase)
-   - dateOfBirth → dateOfBirth (parse ISO date, validate YYYY-MM-DD)
-   - email → email (lowercase, validate format)
-   - phone → phone (normalize: remove spaces/dashes, add +353 if missing country code)
-   - address → parse into street1, city, county, postcode, country='Ireland'
-   - membershipNumber → validate format XXX-XXXXX-XXX
-   - membershipStatus → map to enrollment status (Active/Lapsed → active/inactive)
-   - joinDate → enrollmentDate (parse ISO date)
- Add validation errors to ImportRowData.errors array if any field invalid
- Handle missing required fields gracefully (firstName, lastName required)
- Add TypeScript types: GAAMember, ImportRowData
- Run npx ultracite fix

### US-P4.2-005: Implement GAA sync orchestrator action

As an organization admin, I need to trigger a full sync from GAA Foireann that creates an import session and imports all members.

**Acceptance Criteria:**
- Add to packages/backend/convex/actions/gaaFoireann.ts
- Implement syncGAAMembers action with args: connectorId, organizationId
- Create import session with status 'importing' and sourceType 'federation_sync'
- Fetch membership list using fetchMembershipList
- Transform all members using transformGAAMember
- Run duplicate detection: check externalIds.foireann against existing players
- For duplicates, check if any fields changed (name, DOB, email, phone, address)
- If changes detected, mark player for update in import session
- Store transformed data in import session with mapped fields
- Call existing import pipeline to create/update players
- Update import session stats: playersCreated, playersUpdated, duplicatesFound, errors
- Update connector's lastSyncAt timestamp
- On success, set session status to 'completed' and return session ID
- On error, set session status to 'failed' and log error details
- Run npx -w packages/backend convex codegen and npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Actions can use `ctx.storage.store()` to save encrypted credentials as blobs
- Seed mutations should be actions (not mutations) when they need storage access
- Import templates must exist before creating connectors that link to them
- Use internal mutations for database operations from actions
- Initial attempt used placeholder string for `credentialsStorageId` - WRONG
- Must create actual encrypted blob in storage, even for placeholder credentials
- Actions cannot directly call mutations - must use `ctx.runMutation(internal.*)`
- Need to import encryption utilities dynamically in actions: `await import("../lib/federation/encryption")`
--
- Federation API client handles all auth, retries, rate limiting automatically

**Gotchas encountered:**
- Initial attempt used placeholder string for `credentialsStorageId` - WRONG
- Must create actual encrypted blob in storage, even for placeholder credentials
- Actions cannot directly call mutations - must use `ctx.runMutation(internal.*)`
- Need to import encryption utilities dynamically in actions: `await import("../lib/federation/encryption")`
- GAA connector depends on GAA import template existing first
- Must call `seedDefaultTemplates` before creating connector
- Connector schema requires valid `credentialsStorageId` of type `Id<"_storage">`
--
- Biome linter rejects `page++` - must use `page += 1`
- Pre-commit hook runs biome check - commit fails if linting errors exist

### Files Changed

- packages/backend/convex/models/importTemplateSeeds.ts (+113 lines)
- ✅ Convex codegen: passed
- ✅ Type check: passed (pre-existing errors OK per MEMORY.md)
- ✅ Linting: passed (ultracite fix applied)
- ⚠️ Browser verification: N/A (backend-only change)
- Actions can use `ctx.storage.store()` to save encrypted credentials as blobs
- Seed mutations should be actions (not mutations) when they need storage access
- Import templates must exist before creating connectors that link to them
- Use internal mutations for database operations from actions
--
- packages/backend/convex/actions/gaaFoireann.ts (new file, +223 lines)
- ✅ Convex codegen: passed
- ✅ Type check: passed
- ✅ Linting: passed (fixed page++ → page += 1 for noIncrementDecrement rule)
- ⚠️ Browser verification: N/A (backend-only action)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
