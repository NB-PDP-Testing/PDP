# PlayerARC - Phase 4.1: Federation Connector Framework

> Auto-generated documentation - Last updated: 2026-02-15 20:56

## Status

- **Branch**: `ralph/phase-4.1-federation-framework`
- **Progress**: 5 / 8 stories complete
- **Phase Status**: 🔄 In Progress

## Completed Features

### US-P4.1-001: Add federationConnectors table to schema

As a developer, I need a table to store federation connector configurations including authentication details, sync settings, and connected organizations.

**Acceptance Criteria:**
- Add federationConnectors table to packages/backend/convex/schema.ts
- Fields: name (string), federationCode (string - unique identifier like 'gaa_foireann'), status (active/inactive/error)
- authType: v.union(v.literal('oauth2'), v.literal('api_key'), v.literal('basic'))
- credentialsStorageId: v.id('_storage') - encrypted credentials file reference
- endpoints object: membershipList (string), memberDetail (optional string), webhookSecret (optional string)
- syncConfig object: enabled (boolean), schedule (optional cron string), conflictStrategy (string)
- templateId: v.id('importTemplates') - default import template for this connector
- connectedOrganizations array: organizationId, federationOrgId, enabledAt, lastSyncAt
- createdAt, updatedAt (number timestamps)
- Add indexes: by_federationCode, by_status
- Run npx -w packages/backend convex codegen successfully

### US-P4.1-002: Implement credential encryption utilities

As a platform, I need to securely encrypt and decrypt federation credentials (OAuth tokens, API keys) before storing them in Convex file storage.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/federation/encryption.ts
- Implement encryptCredentials function: accepts credentials object, returns encrypted buffer
- Implement decryptCredentials function: accepts encrypted buffer, returns credentials object
- Use Web Crypto API (crypto.subtle) for AES-GCM encryption
- Encryption key stored in Convex environment variable: FEDERATION_ENCRYPTION_KEY
- Generate initialization vector (IV) per encryption (prepend to ciphertext)
- Return encrypted data as base64 string for storage
- Add error handling for missing encryption key
- Add TypeScript types: FederationCredentials (union of OAuth2Credentials, ApiKeyCredentials, BasicAuthCredentials)
- Run npx ultracite fix

### US-P4.1-003: Create connector CRUD mutations

As a platform admin, I need to create, update, and manage federation connectors including storing encrypted credentials.

**Acceptance Criteria:**
- Create packages/backend/convex/models/federationConnectors.ts
- Implement createConnector mutation with args: name, federationCode, authType, endpoints, syncConfig, templateId
- createConnector accepts credentials object (not encrypted - mutation handles encryption)
- createConnector calls encryptCredentials, stores result in file storage, saves storageId
- Implement updateConnector mutation: allows updating name, endpoints, syncConfig, templateId
- Implement updateConnectorCredentials mutation: re-encrypts and replaces credentials
- Implement deleteConnector mutation: soft delete (status = 'inactive'), does NOT delete credentials file
- Implement getConnector query: returns connector WITHOUT decrypted credentials
- Implement listConnectors query: by status, using by_status index
- All mutations include returns validators
- All queries use .withIndex() - never .filter()
- Run npx -w packages/backend convex codegen and npm run check-types

### US-P4.1-004: Implement OAuth 2.0 authorization flow action

As a platform admin, I need to complete the OAuth 2.0 authorization flow with a federation API to obtain access tokens.

**Acceptance Criteria:**
- Create packages/backend/convex/actions/federationAuth.ts
- Implement startOAuthFlow action: generates authorization URL with state parameter
- Returns: { authorizationUrl, state } for frontend redirect
- Implement completeOAuthFlow action: accepts code and state parameters
- Validates state matches expected value (CSRF protection)
- Exchanges authorization code for access token via POST to token endpoint
- Stores access token, refresh token, expires_at in encrypted credentials
- Updates connector's credentialsStorageId with encrypted token data
- Implement refreshOAuthToken action: refreshes expired access token
- Checks if token is expired (expires_at < now), calls refresh endpoint if needed
- Updates credentials file with new access token and expiry
- Add error handling for invalid codes, expired tokens, network failures
- Run npx ultracite fix and npm run check-types

### US-P4.1-006: Implement exponential backoff with jitter utility

As a developer, I need a reusable exponential backoff utility with jitter to prevent thundering herd problems when retrying failed requests.

**Acceptance Criteria:**
- Create packages/backend/convex/lib/federation/backoff.ts
- Export exponentialBackoff function: (attempt: number, baseDelayMs = 1000, maxDelayMs = 30000) => Promise<void>
- Formula: delay = min(baseDelayMs * 2^attempt, maxDelayMs)
- Add jitter: randomize delay between 50% and 100% of calculated delay
- Returns Promise that resolves after delay (use setTimeout in Node environment)
- Export withRetry wrapper: async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3) => Promise<T>
- withRetry executes fn, retries with backoff on failure up to maxAttempts
- Throws original error if all retries exhausted
- Add TypeScript types and JSDoc comments
- Run npx ultracite fix and npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Storage operations (`ctx.storage.store`) only available in actions, not mutations
- Must use `ctx.runMutation(internal.models.X)` from actions to write to DB
- Create internal mutations for DB writes that are called from actions
- Use `api.models.X` for queries (from actions), `internal.models.X` for internal mutations
- Initial error: tried to use `ctx.storage.store` in mutation - not allowed
- Fix: Convert createConnector and updateConnectorCredentials to actions
- Actions call internal mutations (`createConnectorInternal`, `updateConnectorCredentialsInternal`)
- Files in `/actions` folder MUST have `"use node";` directive at top of file

**Gotchas encountered:**
- Initial error: tried to use `ctx.storage.store` in mutation - not allowed
- Fix: Convert createConnector and updateConnectorCredentials to actions
- Actions call internal mutations (`createConnectorInternal`, `updateConnectorCredentialsInternal`)
- Files in `/actions` folder MUST have `"use node";` directive at top of file
- Circular reference type errors when referencing `internal.models.X` before export
- Encryption utilities depend on `FEDERATION_ENCRYPTION_KEY` environment variable
--
- Linter auto-removes unused imports - must use imported symbols immediately
- Adding `api` import but using it later in file causes linter to remove it
- Fix: Add import statement in same edit as first usage

### Files Changed

- `packages/backend/convex/schema.ts` (+60 lines) - Added federationConnectors table
- `packages/backend/convex/lib/federation/encryption.ts` (+235 lines) - NEW: Encryption utilities
- `packages/backend/convex/models/federationConnectors.ts` (+360 lines) - NEW: CRUD operations
- `scripts/ralph/progress.txt` (+40 lines) - Added codebase patterns section
- ✅ Type check: passed (no federationConnectors errors)
- ✅ Linting: passed (pre-existing errors only)
- ✅ Convex codegen: passed
- ✅ Commit hook: passed
- Storage operations (`ctx.storage.store`) only available in actions, not mutations
- Must use `ctx.runMutation(internal.models.X)` from actions to write to DB
- Create internal mutations for DB writes that are called from actions
- Use `api.models.X` for queries (from actions), `internal.models.X` for internal mutations
--
- `packages/backend/convex/actions/federationAuth.ts` (+274 lines) - NEW: OAuth flow actions
- `scripts/ralph/progress.txt` (+150 lines) - Documented iteration 1 learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
