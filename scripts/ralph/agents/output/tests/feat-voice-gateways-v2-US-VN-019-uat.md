# UAT Test: US-VN-019 - Drafts Table & Auto-Confirm Logic

> Auto-generated: 2026-02-07 19:07
> Status: ⏳ Pending Execution

## Story
Create insightDrafts table to store pending insights awaiting confirmation before applying to player records. Each draft has confidence scoring (AI extraction * entity resolution). Trusted coaches (level >= 2) with high-confidence drafts get auto-confirmed. Others require manual confirmation via WhatsApp or web UI.

## Acceptance Criteria Checklist

- [ ] --- SCHEMA: insightDrafts ---
- [ ] Backend: Add insightDrafts table to schema.ts
- [ ] Schema fields:
- [ ] - draftId: v.string() (UUID via crypto.randomUUID())
- [ ] - artifactId: v.id('voiceNoteArtifacts')
- [ ] - claimId: v.id('voiceNoteClaims')
- [ ] - playerIdentityId: v.optional(v.id('playerIdentities'))
- [ ] - insightType: v.union('injury','skill_rating','skill_progress','behavior','performance','attendance','wellbeing','recovery','development_milestone','physical_development','parent_communication','tactical','team_culture','todo','session_plan') — mirrors voiceNoteClaims.topic exactly (15 types, NOT 8)
- [ ] - title: v.string()
- [ ] - description: v.string()
- [ ] - evidence: v.object({ transcriptSnippet: v.string(), timestampStart: v.optional(v.number()) })
- [ ] - aiConfidence: v.number() (from claim.extractionConfidence)
- [ ] - resolutionConfidence: v.number() (from entity resolution score, 1.0 if auto-resolved in Phase 4)
- [ ] - overallConfidence: v.number() (aiConfidence * resolutionConfidence)
- [ ] - requiresConfirmation: v.boolean()
- [ ] - status: v.union('pending', 'confirmed', 'rejected', 'applied', 'expired')
- [ ] - organizationId: v.string() (denormalized for auth filtering)
- [ ] - coachUserId: v.string() (denormalized for auth filtering)
- [ ] - confirmedAt: v.optional(v.number())
- [ ] - displayOrder: v.number() — 1-indexed position for stable WhatsApp CONFIRM 1,2,3 numbering (ADR-VN2-028)
- [ ] - resolvedPlayerName: v.optional(v.string()) — denormalized from entity resolution for WhatsApp summary (avoids N+1 lookup)
- [ ] - appliedAt: v.optional(v.number())
- [ ] - createdAt: v.number()
- [ ] - updatedAt: v.number()
- [ ] Indexes:
- [ ] - by_draftId: ['draftId']
- [ ] - by_artifactId: ['artifactId']
- [ ] - by_artifactId_and_status: ['artifactId', 'status'] — for command handler querying pending drafts per artifact (ADR-VN2-029)
- [ ] - by_org_and_coach_and_status: ['organizationId', 'coachUserId', 'status']
- [ ] - by_playerIdentityId_and_status: ['playerIdentityId', 'status']
- [ ] --- MODEL: insightDrafts.ts ---
- [ ] Backend: Create models/insightDrafts.ts
- [ ] Functions:
- [ ] - createDrafts (internalMutation): Batch insert drafts. Calculate overallConfidence. Set requiresConfirmation based on threshold + trust level.
- [ ] - getDraftsByArtifact (internalQuery): args: { artifactId }. Returns all drafts for an artifact.
- [ ] - getPendingDraftsForCoach (query - PUBLIC): args: { organizationId }. Derives coachUserId from identity.subject. Returns pending drafts.
- [ ] - confirmDraft (mutation - PUBLIC): args: { draftId }. Verify ownership via artifact. Set status='confirmed', confirmedAt=now.
- [ ] - confirmAllDrafts (mutation - PUBLIC): args: { artifactId }. Confirm all pending drafts for this artifact. Verify ownership.
- [ ] - rejectDraft (mutation - PUBLIC): args: { draftId }. Verify ownership. Set status='rejected'.
- [ ] - rejectAllDrafts (mutation - PUBLIC): args: { artifactId }. Reject all pending. Verify ownership.
- [ ] - applyDraft (internalMutation): args: { draftId }. Apply confirmed draft to player records (create voiceNoteInsight or similar). Set status='applied', appliedAt=now.
- [ ] --- DRAFT GENERATION ACTION ---
- [ ] Backend: Create actions/draftGeneration.ts
- [ ] Function: generateDrafts (internalAction)
- [ ] args: { artifactId: v.id('voiceNoteArtifacts') }
- [ ] returns: v.null()
- [ ] Logic:
- [ ] 1. Get artifact (org, coach context)
- [ ] 2. Get all claims for artifact that are resolved or auto-resolved
- [ ] 3. Get entity resolution records for resolved claims
- [ ] 4. For each resolved claim with a player entity:
- [ ] - Map claim topic to insightType
- [ ] - Calculate confidence scores
- [ ] - Create draft record
- [ ] 5. Get coach trust level
- [ ] 6. Auto-confirm gate (ADR-VN2-024 — ALL conditions must pass):
- [ ] a. Coach trust level >= 2 (respecting preferredLevel cap)
- [ ] b. overallConfidence >= coach's personalized insightConfidenceThreshold (default 0.85)
- [ ] c. insightAutoApplyPreferences[insightType] !== false (per-category toggle)
- [ ] d. insightType NOT in ['injury', 'wellbeing', 'recovery'] — NEVER auto-confirm sensitive categories
- [ ] 7. For auto-confirmed drafts, schedule applyDraft
- [ ] --- INTEGRATION ---
- [ ] Integration: Schedule from entityResolution.ts after resolutions are stored
- [ ] - After storeResolutions: ctx.scheduler.runAfter(0, internal.actions.draftGeneration.generateDrafts, { artifactId })
- [ ] - Only if feature flag enabled (reuse shouldUseV2Pipeline check)
- [ ] --- VERIFICATION ---
- [ ] Type check passes: npm run check-types
- [ ] Build passes: npm run build
- [ ] Manual test: Voice note with high-confidence resolved claim → draft auto-confirmed for trusted coach
- [ ] Manual test: Voice note with low-confidence claim → draft pending for confirmation
- [ ] Manual test: New coach (trust level 0) → all drafts pending regardless of confidence

## Playwright E2E Tests
- Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts -g "US-VN-019"`
- Report: `npx -w apps/web playwright show-report uat/playwright-report`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
