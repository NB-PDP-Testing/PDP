# Phase 4: Federation Connectors & AI Mapping

**Timeline**: Weeks 13-20
**Status**: Pending Phase 3 Completion
**Dependencies**: Phase 1, Phase 2, Phase 3

---

## Objectives

1. Build federation connector framework
2. Implement GAA Foireann API connector
3. Add AI-powered column mapping (Claude API)
4. Enable scheduled/triggered syncs
5. Webhook support for federation push updates

---

## Success Criteria

- [ ] GAA Foireann connector fetches membership data via API
- [ ] OAuth 2.0 flow works for federation authentication
- [ ] Scheduled syncs run automatically on cron schedule
- [ ] AI column mapping achieves >70% accuracy
- [ ] Webhook receiver processes federation push updates
- [ ] Connector marketplace foundation ready

---

## Features

### 1. Federation Connector Framework

**Authentication Types**:
- OAuth 2.0
- API Key
- Basic Auth

**Sync Strategies**:
- Manual trigger
- Scheduled (cron)
- Webhook push
- Real-time polling

**Conflict Resolution**:
- Federation wins
- Local wins
- Merge (configurable per field)

### 2. AI-Powered Column Mapping

**LLM Integration**: Use Claude API for column inference.

**Prompt Template**:
```
Given the following CSV column name and sample values:
Column: "{columnName}"
Sample values: ["{val1}", "{val2}", "{val3}"]

Which of these target fields does this column most likely map to?
Options: firstName, lastName, dateOfBirth, email, phone, address, ...

Return: {targetField, confidence (0-100), reasoning}
```

**Caching**: Cache AI responses for 30 days per column pattern.

### 3. GAA Foireann Connector

**API Integration**:
- Membership list endpoint
- Member detail endpoint
- Webhook receiver for updates

**Sync Frequency**: Nightly batch or manual trigger.

---

## Database Schema

### New Tables

**federationConnectors**:
```typescript
defineTable({
  name: v.string(),
  federationCode: v.string(),
  status: v.union(v.literal("active"), v.literal("inactive"), v.literal("error")),
  authType: v.union(v.literal("oauth2"), v.literal("api_key"), v.literal("basic")),
  credentialsStorageId: v.id("_storage"),
  endpoints: v.object({
    membershipList: v.string(),
    memberDetail: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
  }),
  syncConfig: v.object({
    enabled: v.boolean(),
    schedule: v.optional(v.string()),
    conflictStrategy: v.string(),
  }),
  templateId: v.id("importTemplates"),
  connectedOrganizations: v.array(v.object({
    organizationId: v.string(),
    federationOrgId: v.string(),
    enabledAt: v.number(),
    lastSyncAt: v.optional(v.number()),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_federationCode", ["federationCode"])
  .index("by_status", ["status"])
```

---

## Backend Implementation

### Files to Create

**/packages/backend/convex/actions/federationSync.ts** (~300 lines)
- Fetch data from federation APIs
- OAuth flow handling
- Rate limiting & backoff

**/packages/backend/convex/lib/import/aiMapper.ts** (~200 lines)
- LLM-powered column inference
- Prompt templates
- Response parsing
- Caching layer

**/packages/backend/convex/crons.ts** (~100 lines)
- Scheduled federation syncs
- Cleanup abandoned imports
- Undo window expiry

---

## Frontend Implementation

### Files to Create

**/apps/web/src/app/platform-admin/connectors/page.tsx** (~300 lines)
- Connector management dashboard
- Create/edit connectors
- Test connections
- View sync logs

**/apps/web/src/components/import/AIMapping.tsx** (~150 lines)
- AI suggestion display
- Accept/reject AI mappings
- Confidence visualization

---

## Ralph Integration

### Parallel Work Streams

#### Stream 1: Connector Framework (2 weeks)
- Agent 1: Schema + encryption
- Agent 2: OAuth flow
- Agent 3: API client abstraction
- Agent 4: Rate limiting

#### Stream 2: GAA Connector (2 weeks)
- Agent 5: API integration
- Agent 6: Data mapping
- Agent 7: Testing with real API

#### Stream 3: AI Mapping (1.5 weeks)
- Agent 8: LLM integration (Anthropic SDK)
- Agent 9: Prompt engineering
- Agent 10: Frontend AI UI

#### Stream 4: Sync Engine (2 weeks)
- Agent 11: Cron scheduler
- Agent 12: Change detection
- Agent 13: Conflict automation
- Agent 14: Webhook receiver

#### Stream 5: Platform Tools (1.5 weeks)
- Agent 15: Connector management UI
- Agent 16: Sync dashboard
- Agent 17: Analytics integration

---

**Previous Phase**: [Phase 3: Mobile UX](./phase-3-mobile-ux.md)
**Next Phase**: [Phase 5: Advanced Features](./phase-5-advanced-features.md)
