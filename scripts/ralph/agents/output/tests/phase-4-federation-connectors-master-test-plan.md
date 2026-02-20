# Phase 4: Federation Connectors & AI Mapping - Master Test Plan

> Created: 2026-02-16
> Project: Importing Members - Phase 4
> Status: 🔄 In Progress

## Overview

This document provides comprehensive testing coverage for **Phase 4: Federation Connectors & AI Mapping**, which enables PlayerARC to integrate with external federation systems (like GAA Foireann) to automatically import and sync player/member data.

**Phase 4 Sub-Phases:**
- **Phase 4.1:** Federation Framework (schema, OAuth, encryption, API client)
- **Phase 4.2:** GAA Connector (API integration, data mapping)
- **Phase 4.3:** AI Column Mapping (LLM-powered column inference)
- **Phase 4.4:** Sync Engine (cron scheduler, webhooks, conflict resolution)
- **Phase 4.5:** Platform Admin UI (connector management dashboard)

## Test Environment Requirements

### Prerequisites
- Platform staff user account with `isPlatformStaff: true`
- Test organization with import templates configured
- Dev server running on `localhost:3000`
- Convex backend deployed (dev environment)
- Claude API key configured (for AI mapping tests)

### Test Data Requirements
- Test federation connector (mock or sandbox)
- Sample CSV files with various column formats
- Test member/player data in different formats
- Organizations with existing player data (for conflict testing)

### External Dependencies
- **Claude AI API:** Required for Phase 4.3 (AI Mapping) tests
- **GAA Foireann API:** Optional (can use mocks) for Phase 4.2 tests
- **Webhook endpoint:** For Phase 4.4 webhook tests

---

## Phase 4.1: Federation Framework

### Test Coverage: Backend Infrastructure

#### TC-4.1-001: Connector Schema Validation
**Component:** `packages/backend/convex/models/federationConnectors.ts`

**Test Cases:**
1. Create connector with valid OAuth 2.0 configuration
2. Create connector with valid API Key configuration
3. Create connector with valid Basic Auth configuration
4. Reject connector with missing required fields
5. Reject connector with invalid auth type
6. Reject connector with malformed endpoints
7. Verify federationCode uniqueness constraint
8. Verify status enum validation (active, inactive, error)

**Acceptance Criteria:**
- Schema validates all required fields
- Auth configurations are properly structured
- Unique constraints are enforced
- Invalid data is rejected with clear error messages

#### TC-4.1-002: Credentials Encryption
**Component:** `packages/backend/convex/models/federationConnectors.ts`

**Test Cases:**
1. Store OAuth client secret - verify encrypted
2. Store API key - verify encrypted
3. Store Basic Auth password - verify encrypted
4. Retrieve encrypted credentials - verify decryption works
5. Update credentials - verify re-encryption
6. Delete connector - verify credentials are purged

**Acceptance Criteria:**
- All sensitive credentials are encrypted before storage
- Credentials can be decrypted for use in sync operations
- Encryption uses secure storage IDs
- Credentials are never exposed in plaintext in API responses

#### TC-4.1-003: OAuth 2.0 Authorization Flow
**Component:** `packages/backend/convex/actions/federationAuth.ts`

**Test Cases:**
1. Start OAuth flow - generate authorization URL
2. Verify state parameter generation (CSRF protection)
3. Complete OAuth flow with valid authorization code
4. Exchange auth code for access token
5. Store access token securely
6. Handle OAuth errors (denied, invalid_grant, etc.)
7. Token refresh when expired
8. Revoke token on connector delete

**Acceptance Criteria:**
- OAuth flow follows RFC 6749 standard
- State parameter prevents CSRF attacks
- Access tokens are stored encrypted
- Token refresh works automatically
- Errors are handled gracefully

#### TC-4.1-004: API Client Abstraction
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**
1. Make authenticated request with OAuth token
2. Make authenticated request with API key
3. Make authenticated request with Basic Auth
4. Handle 401 Unauthorized - trigger reauthorization
5. Handle 404 Not Found - log error
6. Handle 429 Rate Limit - implement backoff
7. Handle 500 Server Error - retry with exponential backoff
8. Handle network timeout - retry
9. Handle malformed JSON response

**Acceptance Criteria:**
- API client supports all auth types
- Proper headers are set for each auth method
- HTTP errors are handled appropriately
- Retries use exponential backoff
- Network errors don't crash sync process

#### TC-4.1-005: Rate Limiting
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**
1. Respect rate limit headers (X-RateLimit-Remaining)
2. Wait when rate limit reached
3. Resume sync after rate limit reset
4. Handle 429 response correctly
5. Implement per-connector rate limits
6. Queue requests when limit approached

**Acceptance Criteria:**
- Rate limit headers are parsed correctly
- Sync pauses when rate limit reached
- Backoff strategy prevents repeated 429 errors
- Per-connector limits prevent one connector from affecting others

---

## Phase 4.2: GAA Connector

### Test Coverage: GAA Foireann API Integration

#### TC-4.2-001: GAA API Authentication
**Component:** `packages/backend/convex/actions/federationAuth.ts`

**Test Cases:**
1. Connect to GAA Foireann sandbox API
2. Complete OAuth flow with GAA credentials
3. Retrieve access token successfully
4. Store GAA connector configuration
5. Test connection to GAA API endpoints

**Acceptance Criteria:**
- GAA OAuth flow completes successfully
- Access token can be used for API calls
- Connector is marked as "active" after successful setup

**Note:** This requires GAA Foireann sandbox/test API access. If not available, use mocked responses.

#### TC-4.2-002: Membership List Fetch
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**
1. Fetch membership list from GAA API
2. Handle paginated responses
3. Parse GAA member data format
4. Map GAA fields to PlayerARC fields
5. Handle empty membership list
6. Handle API errors during fetch

**Acceptance Criteria:**
- Membership list is fetched successfully
- Pagination is handled correctly (fetch all pages)
- GAA data format is parsed correctly
- Field mapping covers all required fields

#### TC-4.2-003: Member Detail Fetch
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**
1. Fetch individual member details
2. Enrich membership data with detailed info
3. Handle missing member details gracefully
4. Rate limit member detail requests

**Acceptance Criteria:**
- Member details are fetched when available
- Missing details don't block import
- Rate limiting prevents API abuse

#### TC-4.2-004: Data Mapping (GAA to PlayerARC)
**Component:** `packages/backend/convex/lib/import/mapper.ts`

**Test Cases:**
1. Map GAA firstName → PlayerARC firstName
2. Map GAA lastName → PlayerARC lastName
3. Map GAA dateOfBirth → PlayerARC dateOfBirth
4. Map GAA membership number → PlayerARC externalId
5. Handle missing optional fields
6. Handle invalid data types
7. Transform date formats correctly
8. Map GAA address to PlayerARC address fields

**Acceptance Criteria:**
- Required fields are mapped correctly
- Optional fields are handled gracefully
- Data type transformations work correctly
- Invalid data triggers validation errors

---

## Phase 4.3: AI Column Mapping

### Test Coverage: LLM-Powered Column Inference

#### TC-4.3-001: Claude API Integration
**Component:** `packages/backend/convex/actions/aiMapping.ts`

**Test Cases:**
1. Send column inference request to Claude API
2. Parse Claude API response
3. Handle API errors (rate limit, timeout, invalid key)
4. Verify prompt template is correct
5. Test with various column names and sample values

**Acceptance Criteria:**
- Claude API calls work successfully
- Responses are parsed correctly
- Errors are handled gracefully
- Prompt provides sufficient context for accurate inference

#### TC-4.3-002: Column Inference Accuracy
**Component:** `packages/backend/convex/lib/import/aiMapper.ts`

**Test Cases:**
1. Infer "First Name" → firstName (high confidence)
2. Infer "Surname" → lastName (high confidence)
3. Infer "DOB" → dateOfBirth (high confidence)
4. Infer "Email Address" → email (high confidence)
5. Infer "Mobile" → phone (high confidence)
6. Handle ambiguous columns ("Name" - could be first or last)
7. Handle completely unknown columns
8. Test with GAA-specific column names
9. Test with abbreviations ("FN", "LN", etc.)
10. Test with non-English column names (if applicable)

**Acceptance Criteria:**
- Clear, standard column names achieve >90% accuracy
- Ambiguous columns are flagged for manual review
- Unknown columns are left unmapped
- Confidence scores are calibrated correctly

#### TC-4.3-003: AI Mapping Cache
**Component:** `packages/backend/convex/models/aiMappingCache.ts`

**Test Cases:**
1. Cache AI response for column pattern
2. Retrieve cached mapping for same pattern
3. Cache hit prevents duplicate AI calls
4. Cache expires after 30 days
5. Cache is organization-scoped
6. Cache includes confidence score

**Acceptance Criteria:**
- AI responses are cached successfully
- Cache lookups are fast
- Duplicate AI calls are prevented
- Cache expiry works correctly

#### TC-4.3-004: AI Mapping Analytics
**Component:** `packages/backend/convex/models/aiMappingAnalytics.ts`

**Test Cases:**
1. Log AI mapping suggestion
2. Log user acceptance/rejection
3. Track accuracy over time
4. Generate analytics report
5. Calculate cache hit rate

**Acceptance Criteria:**
- All AI suggestions are logged
- User actions are tracked
- Analytics provide insights into accuracy
- Cache hit rate is calculated correctly

#### TC-4.3-005: AI Mapping UI
**Component:** `apps/web/src/components/import/AIMapping.tsx`

**Test Cases:**
1. Display AI suggestions in import wizard
2. Show confidence scores visually
3. Allow user to accept AI suggestion
4. Allow user to reject and manually map
5. Display reasoning for suggestion
6. Handle loading state during AI inference
7. Handle AI errors gracefully

**Acceptance Criteria:**
- AI suggestions are displayed clearly
- Confidence is visualized (color coding or progress bar)
- Accept/reject actions work correctly
- Reasoning helps user understand suggestion
- Loading and error states are user-friendly

---

## Phase 4.4: Sync Engine

### Test Coverage: Automated Sync & Conflict Resolution

#### TC-4.4-001: Manual Sync Trigger
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**
1. Trigger manual sync from UI
2. Sync starts immediately
3. Progress is tracked in syncQueue
4. Sync completion updates connector lastSyncAt
5. Sync results are logged to syncHistory
6. Handle sync errors gracefully

**Acceptance Criteria:**
- Manual sync can be triggered by platform staff
- Sync runs asynchronously
- Progress is visible in real-time
- Results are stored in syncHistory
- Errors are logged and displayed

#### TC-4.4-002: Scheduled Sync (Cron)
**Component:** `packages/backend/convex/actions/federationScheduler.ts`

**Test Cases:**
1. Schedule sync with cron expression ("0 2 * * *" - 2am daily)
2. Verify cron job is registered in Convex crons
3. Cron triggers sync at scheduled time
4. Sync runs automatically without manual intervention
5. Multiple connectors can have different schedules
6. Disabled connectors don't sync

**Acceptance Criteria:**
- Cron jobs are scheduled correctly
- Syncs run at scheduled times
- Per-connector schedules work independently
- Disabled connectors are skipped

#### TC-4.4-003: Webhook Receiver
**Component:** `packages/backend/convex/actions/federationWebhook.ts`

**Test Cases:**
1. Receive webhook POST request
2. Validate webhook signature (HMAC)
3. Reject invalid signatures
4. Parse webhook payload
5. Trigger immediate sync on webhook
6. Handle webhook errors
7. Return appropriate HTTP status codes

**Acceptance Criteria:**
- Webhook endpoint is publicly accessible
- Signatures are validated for security
- Invalid webhooks are rejected
- Valid webhooks trigger immediate sync
- HTTP status codes follow standards (200, 401, 500)

#### TC-4.4-004: Change Detection
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**
1. Detect new players in federation data
2. Detect updated players (changed fields)
3. Detect removed/inactive players
4. Compare federation data with local data
5. Generate change summary (created, updated, removed)
6. Skip unchanged players (optimization)

**Acceptance Criteria:**
- New players are identified correctly
- Field changes are detected accurately
- Removed players are flagged
- Unchanged players are skipped to save processing
- Change summary is accurate

#### TC-4.4-005: Conflict Resolution
**Component:** `packages/backend/convex/actions/federationSyncEngine.ts`

**Test Cases:**

**Conflict Strategy: Federation Wins**
1. Federation value differs from local → use federation value
2. Local changes are overwritten
3. Conflict is logged to syncHistory

**Conflict Strategy: Local Wins**
1. Federation value differs from local → keep local value
2. Federation update is ignored
3. Conflict is logged to syncHistory

**Conflict Strategy: Merge**
1. Merge non-conflicting fields
2. Use federation value for specific fields (configurable)
3. Use local value for other fields (configurable)
4. Log merged result to syncHistory

**Edge Cases:**
1. Handle null vs empty string conflicts
2. Handle date format differences
3. Handle case differences (Smith vs smith)
4. Handle whitespace differences

**Acceptance Criteria:**
- Each conflict strategy works as specified
- Conflicts are logged with before/after values
- Strategy is configurable per connector
- Per-field merge rules work correctly

#### TC-4.4-006: Sync Queue Management
**Component:** `packages/backend/convex/models/syncQueue.ts`

**Test Cases:**
1. Add sync job to queue
2. Process queue in FIFO order
3. Mark sync as "running"
4. Mark sync as "completed" or "failed"
5. Retry failed syncs (up to 3 times)
6. Handle concurrent syncs for different connectors
7. Prevent duplicate syncs for same connector

**Acceptance Criteria:**
- Queue ensures syncs run sequentially per connector
- Multiple connectors can sync concurrently
- Failed syncs are retried automatically
- Duplicate syncs are prevented

#### TC-4.4-007: Sync History Logging
**Component:** `packages/backend/convex/models/syncHistory.ts`

**Test Cases:**
1. Log sync start time
2. Log sync end time and duration
3. Log sync result (completed, failed)
4. Log statistics (created, updated, skipped, conflicts)
5. Log errors with stack traces
6. Query sync history by connector
7. Query sync history by date range
8. Paginate sync history

**Acceptance Criteria:**
- All sync attempts are logged
- Logs include sufficient detail for debugging
- Sync history can be queried efficiently
- Pagination works for large history

---

## Phase 4.5: Platform Admin UI

### Test Coverage: Connector Management Dashboard

**Note:** Phase 4.5 tests are already complete. See:
- `scripts/ralph/agents/output/tests/phase-4.5-platform-admin-ui-master-test-plan.md`
- `apps/web/uat/tests/platform-admin/*.spec.ts`

**Test Files:**
- `connector-management.spec.ts` - 565 lines, ~55 tests
- `sync-logs.spec.ts` - 654 lines, ~40 tests
- `health-dashboard.spec.ts` - 555 lines, ~35 tests
- `analytics.spec.ts` - 678 lines, ~40 tests

**Total:** ~170 automated E2E tests for Phase 4.5

---

## Cross-Phase Integration Tests

### Test Coverage: End-to-End Workflows

#### TC-INT-001: Complete Federation Setup Workflow
**Components:** All phases

**Test Scenario:**
1. Platform staff creates new federation connector (4.1)
2. Completes OAuth setup (4.1)
3. Tests connection successfully (4.1)
4. Configures sync schedule (4.4)
5. AI suggests column mappings (4.3)
6. User accepts AI suggestions (4.3)
7. Runs manual sync (4.2, 4.4)
8. Views sync results in dashboard (4.5)
9. Reviews sync logs and conflicts (4.5)

**Acceptance Criteria:**
- Complete workflow works end-to-end
- Each step leads naturally to the next
- Data flows correctly between components
- UI reflects backend state accurately

#### TC-INT-002: Scheduled Sync + Conflict Resolution
**Components:** Phase 4.2, 4.4

**Test Scenario:**
1. Scheduled sync runs automatically (4.4)
2. Fetches data from GAA API (4.2)
3. Detects conflicts with local data (4.4)
4. Applies conflict resolution strategy (4.4)
5. Logs conflicts to syncHistory (4.4)
6. Platform staff reviews conflicts in UI (4.5)

**Acceptance Criteria:**
- Scheduled sync runs without manual intervention
- Conflicts are resolved according to strategy
- Conflict details are visible in UI
- Platform staff can adjust strategy if needed

#### TC-INT-003: Webhook-Triggered Sync
**Components:** Phase 4.2, 4.4

**Test Scenario:**
1. Federation sends webhook notification
2. Webhook receiver validates signature (4.4)
3. Triggers immediate sync (4.4)
4. Fetches updated data from federation (4.2)
5. Updates local players (4.4)
6. Logs sync to syncHistory (4.4)
7. Dashboard shows recent sync (4.5)

**Acceptance Criteria:**
- Webhooks trigger syncs correctly
- Sync runs immediately (not scheduled)
- Data is updated in real-time
- Webhook syncs are visible in dashboard

#### TC-INT-004: AI-Assisted Import
**Components:** Phase 4.3

**Test Scenario:**
1. User uploads CSV with unknown columns
2. AI infers column mappings (4.3)
3. User reviews AI suggestions
4. User accepts high-confidence mappings
5. User manually maps low-confidence columns
6. Import proceeds with final mappings
7. AI suggestions are cached for future use (4.3)

**Acceptance Criteria:**
- AI suggestions are accurate and helpful
- User can override AI suggestions
- Accepted mappings are cached
- Import succeeds with correct field mappings

---

## Test Data Requirements

### Backend Test Data

#### Federation Connectors
```typescript
{
  name: "GAA Foireann Test Connector",
  federationCode: "gaa_test",
  status: "active",
  authType: "oauth2",
  endpoints: {
    membershipList: "https://api.gaa-sandbox.ie/members",
    memberDetail: "https://api.gaa-sandbox.ie/members/{id}",
    webhookSecret: "test_secret_123"
  },
  syncConfig: {
    enabled: true,
    schedule: "0 2 * * *",
    conflictStrategy: "federation_wins"
  },
  templateId: "<import_template_id>",
  connectedOrganizations: [
    {
      organizationId: "<org_id>",
      federationOrgId: "GAA123",
      enabledAt: Date.now(),
      lastSyncAt: Date.now() - 3600000 // 1 hour ago
    }
  ]
}
```

#### Sample GAA Member Data
```json
{
  "id": "GAA_12345",
  "firstName": "Seamus",
  "lastName": "O'Brien",
  "dateOfBirth": "2005-03-15",
  "email": "seamus.obrien@example.ie",
  "phone": "+353 87 123 4567",
  "membershipNumber": "GAA12345",
  "status": "active",
  "club": "Grange GAA",
  "address": {
    "street": "Main Street",
    "town": "Dublin",
    "county": "Dublin",
    "eircode": "D01 F5P2"
  }
}
```

#### Sample CSV with Various Column Formats
```csv
First Name,Surname,DOB,Email Address,Mobile,Member #
Seamus,O'Brien,15/03/2005,seamus@example.ie,087-123-4567,GAA12345
Aoife,Murphy,22/07/2006,aoife@example.ie,086-987-6543,GAA67890
```

### Frontend Test Data

- Platform staff user with `isPlatformStaff: true`
- Test organization with players
- Connectors with various statuses (active, inactive, error)
- Sync history with various results (completed, failed, with conflicts)
- Different time ranges of sync data (last 7 days, 30 days, 90 days)

---

## Test Execution Strategy

### Phase-by-Phase Testing

**Phase 4.1 (Foundation):**
1. Test backend schema and validation
2. Test OAuth flow manually or with integration tests
3. Test API client with mock responses
4. Test rate limiting with simulated scenarios

**Phase 4.2 (GAA Integration):**
1. Test with GAA sandbox API if available
2. Otherwise, use mocked API responses
3. Verify data mapping correctness
4. Test error handling

**Phase 4.3 (AI Mapping):**
1. Test with real Claude API (requires API key)
2. Verify cache is working to reduce API calls
3. Test UI with various column formats
4. Measure inference accuracy

**Phase 4.4 (Sync Engine):**
1. Test manual sync triggers
2. Test cron scheduling (may need to wait or advance time)
3. Test webhook receiver with mock requests
4. Test conflict resolution with prepared scenarios

**Phase 4.5 (UI):**
1. Fix test credentials in `test-data.json`
2. Run existing Playwright tests
3. Fix any failing tests
4. Add additional tests if gaps are found

### Test Types

**E2E Tests (Playwright):**
- All UI-based testing (Phase 4.5)
- AI mapping UI (Phase 4.3)
- OAuth callback flow (Phase 4.1)

**Integration Tests:**
- API client tests with mock HTTP server
- Database operations with test data
- Webhook receiver with test payloads

**Manual Tests:**
- OAuth flow with real federation
- Scheduled sync (cron) timing
- External API connectivity

---

## Success Criteria

### Phase 4.1
- ✅ All connector CRUD operations work
- ✅ OAuth flow completes successfully
- ✅ Credentials are stored encrypted
- ✅ API client handles all auth types
- ✅ Rate limiting prevents API abuse

### Phase 4.2
- ✅ GAA API connection works
- ✅ Membership data is fetched correctly
- ✅ Data mapping is accurate
- ✅ Pagination is handled

### Phase 4.3
- ✅ AI column inference achieves >70% accuracy
- ✅ Cache reduces API calls by >80%
- ✅ UI displays AI suggestions clearly
- ✅ Users can accept/reject suggestions

### Phase 4.4
- ✅ Manual sync works reliably
- ✅ Scheduled sync runs automatically
- ✅ Webhooks trigger immediate sync
- ✅ Conflict resolution applies correctly
- ✅ Sync history is complete and queryable

### Phase 4.5
- ✅ All UI pages load correctly
- ✅ Connector management works end-to-end
- ✅ Sync logs are visible and filterable
- ✅ Dashboard shows accurate metrics
- ✅ Analytics provide useful insights

---

## Test Coverage Summary

| Phase | Component | Manual Tests | E2E Tests | Integration Tests | Total |
|-------|-----------|--------------|-----------|-------------------|-------|
| 4.1   | Federation Framework | 10 | 5 | 15 | 30 |
| 4.2   | GAA Connector | 5 | 3 | 10 | 18 |
| 4.3   | AI Mapping | 8 | 10 | 12 | 30 |
| 4.4   | Sync Engine | 12 | 8 | 15 | 35 |
| 4.5   | Platform UI | 130 | 170 | 0 | 300 |
| **Integration** | Cross-Phase | 4 | 4 | 8 | 16 |
| **TOTAL** | | **169** | **200** | **60** | **429** |

---

## Next Steps

1. **Update test credentials** in `apps/web/uat/test-data.json`
2. **Run Phase 4.5 tests** to establish baseline
3. **Implement Phase 4.3 tests** (AI Mapping UI - highest user impact)
4. **Implement Phase 4.4 tests** (Sync Engine - core functionality)
5. **Implement Phase 4.1 tests** (Foundation - integration tests)
6. **Implement Phase 4.2 tests** (GAA Connector - when API available)
7. **Run full regression** test suite
8. **Document results** and create test report

---

*Master Test Plan Version: 1.0*
*Last Updated: 2026-02-16*
*Created by: AI Testing Agent*
