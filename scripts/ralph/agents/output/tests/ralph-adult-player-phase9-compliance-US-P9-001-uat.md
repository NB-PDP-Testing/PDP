# UAT Test: US-P9-001 - Backend — Erasure Request Schema, Category Map & Core Mutations

> Auto-generated: 2026-02-28 17:58
> Status: ⏳ Pending Execution

## Story
As a backend developer, I need the schema, data category map, and core mutations for the adult erasure request system so that player requests can be submitted, reviewed, and executed with full GDPR Article 17 compliance.

## Acceptance Criteria Checklist

- [ ] CREATE packages/backend/convex/lib/erasureCategoryMap.ts:
- [ ] Export a DATA_CATEGORY_CONFIG constant (TypeScript const object, not a Convex function) with one entry per category:
- [ ] WELLNESS_DATA: { canErase: true, defaultRetentionDays: 730, tableNames: ['dailyPlayerHealthChecks'], playerIdField: 'playerIdentityId' }
- [ ] ASSESSMENT_HISTORY: { canErase: true, defaultRetentionDays: 1825, tableNames: ['orgPlayerEnrollments assessments — see note'], playerIdField: 'playerIdentityId' }
- [ ] INJURY_RECORDS: { canErase: false, retentionGrounds: 'Healthcare records — Ireland HSE 7-year retention standard (applicable where medical professional was involved)', defaultRetentionDays: 2555, minRetentionDays: 2555, tableNames: ['injuryReports if exists'], playerIdField: 'playerIdentityId' }
- [ ] COACH_FEEDBACK: { canErase: true, defaultRetentionDays: 1825, tableNames: ['coachPlayerFeedback if exists'], playerIdField: 'playerIdentityId' }
- [ ] PROFILE_DATA: { canErase: true, erasureMethod: 'anonymise', defaultRetentionDays: null, tableNames: ['orgPlayerEnrollments'] }
- [ ] COMMUNICATION_DATA: { canErase: true, defaultRetentionDays: 365, tableNames: ['whatsappMessages', 'whatsappWellnessSessions'], playerIdField: 'playerIdentityId' }
- [ ] AUDIT_LOGS: { canErase: false, retentionGrounds: 'GDPR Article 30 Records of Processing Activities — legal obligation of the controller', defaultRetentionDays: 1095, minRetentionDays: 1095 }
- [ ] CHILD_AUTH_LOGS: { canErase: false, retentionGrounds: 'Child safeguarding records — Ireland Child First Act 7-year retention requirement', defaultRetentionDays: 2555, minRetentionDays: 2555 }
- [ ] ADD to packages/backend/convex/schema.ts:
- [ ] erasureRequests table: playerId (v.id('orgPlayerEnrollments')), playerIdentityId (v.id('playerIdentities')), organizationId (v.string()), requestedByUserId (v.string()), submittedAt (v.number()), deadline (v.number() — submittedAt + 2592000000 which is 30 days in ms), status (v.union(v.literal('pending'), v.literal('in_review'), v.literal('completed'), v.literal('rejected'))), playerGrounds (v.optional(v.string())), categoryDecisions (v.optional(v.array(v.object({ category: v.string(), decision: v.union(v.literal('approved'), v.literal('rejected')), grounds: v.optional(v.string()), erasedAt: v.optional(v.number()) })))), adminUserId (v.optional(v.string())), processedAt (v.optional(v.number())), adminResponseNote (v.optional(v.string())). Indexes: by_player [playerIdentityId], by_org_and_status [organizationId, status], by_deadline [status, deadline].
- [ ] orgRetentionConfig table: organizationId (v.string()), wellnessDays (v.number()), assessmentDays (v.number()), injuryDays (v.number()), coachFeedbackDays (v.number()), auditLogDays (v.number()), communicationDays (v.number()), updatedAt (v.number()), updatedByUserId (v.string()). Index: by_org [organizationId].
- [ ] Add to dailyPlayerHealthChecks: retentionExpiresAt (v.optional(v.number())), retentionExpired (v.optional(v.boolean())), retentionExpiredAt (v.optional(v.number())). Add index: by_retention_expired [retentionExpired, retentionExpiredAt].
- [ ] Add isDeleted (v.optional(v.boolean())), deletedAt (v.optional(v.number())) to orgPlayerEnrollments.
- [ ] CREATE packages/backend/convex/models/erasureRequests.ts with the following exported functions:
- [ ] submitErasureRequest mutation: args { playerId: v.id('orgPlayerEnrollments'), organizationId: v.string(), playerGrounds: v.optional(v.string()) }. returns v.id('erasureRequests'). Handler: check no pending/in_review request already exists for this player+org (return error if so). Insert new erasureRequests record with status 'pending', submittedAt: Date.now(), deadline: Date.now() + 2592000000. Return new ID.
- [ ] getMyErasureRequestStatus query: args { playerIdentityId: v.id('playerIdentities'), organizationId: v.string() }. returns v.union(v.object({ ... }), v.null()). Returns the most recent erasureRequests record for this player+org.
- [ ] listPendingErasureRequests query (internal or admin-scoped): args { organizationId: v.string() }. Returns all requests with status 'pending' or 'in_review', ordered by deadline ascending (soonest deadline first).
- [ ] updateErasureRequestStatus mutation (admin): args { requestId: v.id('erasureRequests'), status: v.string(), adminUserId: v.string(), categoryDecisions: v.array(...), adminResponseNote: v.optional(v.string()) }. Updates the request record.
- [ ] markCategoryErased mutation (internal): args { requestId: v.id('erasureRequests'), category: v.string(), erasedAt: v.number() }. Patches the categoryDecisions array entry for this category with erasedAt timestamp.
- [ ] CREATE packages/backend/convex/models/retentionConfig.ts:
- [ ] getOrgRetentionConfig query: args { organizationId: v.string() }. Returns orgRetentionConfig or default values if not yet configured. Default values: wellnessDays: 730, assessmentDays: 1825, injuryDays: 2555, coachFeedbackDays: 1825, auditLogDays: 1095, communicationDays: 365.
- [ ] upsertOrgRetentionConfig mutation (admin): args { organizationId: v.string(), config: v.object({ wellnessDays: v.number(), assessmentDays: v.number(), injuryDays: v.number(), coachFeedbackDays: v.number(), auditLogDays: v.number(), communicationDays: v.number() }) }. Validation: auditLogDays must be >= 1095 (throw error if not). injuryDays must be >= 2555 (throw error if not). Upsert by organizationId index.
- [ ] stampRetentionExpiry mutation (internal): args { tableName: v.string(), recordId: v.id(any), retentionDays: v.number() }. Patches retentionExpiresAt: Date.now() + retentionDays * 86400000 on the target record. This is called at record creation time to pre-stamp expiry.
- [ ] Run npx -w packages/backend convex codegen — all types pass.
- [ ] npm run check-types passes.

## Playwright E2E Tests
- Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts -g "US-P9-001"`
- Report: `npx -w apps/web playwright show-report uat/playwright-report`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
