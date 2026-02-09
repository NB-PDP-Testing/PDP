# UAT Test: US-VN-017 - Entity Resolution Table, Aliases & Action

> Auto-generated: 2026-02-07 13:17
> Status: ⏳ Pending Execution

## Story
Create voiceNoteEntityResolutions table, coachPlayerAliases table, and implement entity resolution logic with 6 enhancements: trust-adaptive thresholds, feature flag gating, analytics events, rich matchReason, coach alias learning, and batch same-name resolution. Phase 4 already populates resolvedPlayerIdentityId on claims using fuzzy matching (0.85 threshold). Phase 5 creates DETAILED resolution records for claims where Phase 4 could not auto-resolve, capturing multiple candidates with match reasons for disambiguation.

## Acceptance Criteria Checklist

- [ ] --- SCHEMA: voiceNoteEntityResolutions ---
- [ ] Backend: Add voiceNoteEntityResolutions table to schema.ts
- [ ] Schema fields:
- [ ] - claimId: v.id('voiceNoteClaims')
- [ ] - artifactId: v.id('voiceNoteArtifacts') (denormalized for efficient querying)
- [ ] - mentionIndex: v.number() (position in entityMentions array)
- [ ] - mentionType: v.union('player_name', 'team_name', 'group_reference', 'coach_name')
- [ ] - rawText: v.string() (e.g., 'Shawn')
- [ ] - candidates: v.array(v.object({ entityType, entityId, entityName, score, matchReason }))
- [ ] - status: v.union('auto_resolved', 'needs_disambiguation', 'user_resolved', 'unresolved')
- [ ] - resolvedEntityId: v.optional(v.string())
- [ ] - resolvedEntityName: v.optional(v.string())
- [ ] - resolvedAt: v.optional(v.number())
- [ ] - organizationId: v.string() (denormalized for auth filtering)
- [ ] - createdAt: v.number()
- [ ] Indexes: by_claimId, by_artifactId, by_artifactId_and_status, by_org_and_status (4 indexes — NO by_status to avoid unbounded table scans, per ADR-VN2-022)
- [ ] --- SCHEMA: coachPlayerAliases (Enhancement E5) ---
- [ ] Backend: Add coachPlayerAliases table to schema.ts
- [ ] Schema fields:
- [ ] - coachUserId: v.string()
- [ ] - organizationId: v.string()
- [ ] - rawText: v.string() (normalized lowercase, e.g., 'shawn')
- [ ] - resolvedEntityId: v.string() (playerIdentityId)
- [ ] - resolvedEntityName: v.string() (e.g., 'Sean O'Brien')
- [ ] - useCount: v.number() (times this alias auto-resolved)
- [ ] - lastUsedAt: v.number()
- [ ] - createdAt: v.number()
- [ ] Indexes:
- [ ] - by_coach_org_rawText: ['coachUserId', 'organizationId', 'rawText']
- [ ] - by_coach_org: ['coachUserId', 'organizationId']
- [ ] --- ACTION: entityResolution.ts ---
- [ ] Backend: Create actions/entityResolution.ts
- [ ] Function: resolveEntities (internalAction)
- [ ] args: { artifactId: v.id('voiceNoteArtifacts') }
- [ ] returns: v.null()
- [ ] Logic:
- [ ] 1. Get artifact to determine organizationId and coachUserId
- [ ] 2. [E2] Check feature flag: ctx.runQuery(internal.lib.featureFlags.shouldUseEntityResolution, { organizationId, userId: coachUserId }). If false, return null early
- [ ] 3. Get claims with status='extracted' for this artifactId (Phase 4 creates claims as 'extracted')
- [ ] 4. SKIP claims where resolvedPlayerIdentityId is already set (Phase 4 already resolved these)
- [ ] 5. [E1] Fetch coach trust level: ctx.runQuery(internal.models.coachTrustLevels.getCoachTrustLevelInternal, { coachId: coachUserId }). Use insightConfidenceThreshold as auto-resolve threshold (fallback 0.9 if no trust data)
- [ ] 6. [E6] Group entity mentions by normalized rawText across all unresolved claims. Track Map<normalizedName, Array<{claimId, mentionIndex}>>
- [ ] 7. [E5] For each unique player_name: FIRST check coachPlayerAliases for an existing alias. If found, auto-resolve ALL mentions of that name (status='auto_resolved', matchReason='coach_alias'), increment alias useCount. Skip fuzzy matching for this name.
- [ ] 8. For remaining unresolved unique player_names: BATCH call ctx.runQuery(internal.models.orgPlayerEnrollments.findSimilarPlayers, { limit: 5 }) once per unique name. Store in Map<rawText, SimilarPlayerResult[]>
- [ ] 9. [E4] For each candidate, compute rich matchReason by checking: irish_alias (ALIAS_TO_CANONICAL match), exact_first_name, fuzzy_full_name, fuzzy_first_name, last_name_match, reversed_name, partial_match. Append '+team_context' if team bonus applied
- [ ] 10. For each unresolved claim, for each entityMention:
- [ ] - player_name: Look up candidates from Map. If 1 candidate with score >= trust threshold → 'auto_resolved'. If >1 candidates → 'needs_disambiguation'. If 0 → 'unresolved'
- [ ] - team_name: Match against coachContext.teams by name → auto_resolved or unresolved
- [ ] - group_reference: Always 'unresolved' (Phase 6 handles group expansion)
- [ ] - coach_name: Match against coachContext.coaches by name → auto_resolved or unresolved
- [ ] 11. [E6] For batch resolution: when storing, apply same resolution to ALL mentions in the same rawText group
- [ ] 12. Store all resolutions via batch internalMutation (storeResolutions)
- [ ] 13. Update claim statuses: all auto_resolved → claim 'resolved'; any needs_disambiguation → claim 'needs_disambiguation'; all unresolved → claim 'needs_disambiguation'
- [ ] 14. Log counts via console.info (auto_resolved, needs_disambiguation, unresolved, alias_hits)
- [ ] --- MODEL: voiceNoteEntityResolutions.ts ---
- [ ] Backend: Create models/voiceNoteEntityResolutions.ts
- [ ] Functions (5 internal + 3 public):
- [ ] - storeResolutions (internalMutation): Batch insert, args: { resolutions: array }, returns: array of IDs
- [ ] - getResolutionsByArtifact (internalQuery): args: { artifactId }, returns: array
- [ ] - getResolutionsByArtifactAndStatus (internalQuery): args: { artifactId, status }, returns: array
- [ ] - updateResolutionStatus (internalMutation): args: { resolutionId, status, resolvedEntityId?, resolvedEntityName? }, returns: null
- [ ] - batchUpdateResolutionsByRawText (internalMutation): For E6 — update all resolutions in artifact with matching rawText. args: { artifactId, rawText, status, resolvedEntityId, resolvedEntityName }
- [ ] - getResolutionsByClaim (query - PUBLIC with auth): args: { claimId }, returns: array
- [ ] - getDisambiguationQueue (query - PUBLIC with auth): args: { organizationId, limit? }, returns: needs_disambiguation resolutions
- [ ] - resolveEntity (mutation - PUBLIC with auth): args: { resolutionId, resolvedEntityId, resolvedEntityName }, returns: null. Sets user_resolved + resolvedAt. ALSO: [E5] stores coach alias, [E6] batch-resolves same rawText in artifact, [E3] logs analytics event
- [ ] --- MODEL: coachPlayerAliases.ts (Enhancement E5) ---
- [ ] Backend: Create models/coachPlayerAliases.ts
- [ ] Functions (2 internal + 1 public):
- [ ] - lookupAlias (internalQuery): args: { coachUserId, organizationId, rawText }, returns: alias or null. Normalizes rawText to lowercase before lookup
- [ ] - storeAlias (internalMutation): args: { coachUserId, organizationId, rawText, resolvedEntityId, resolvedEntityName }. Upserts: if exists, increment useCount + update lastUsedAt. If not, create new. Normalizes rawText to lowercase
- [ ] - getCoachAliases (query - PUBLIC with auth): args: { organizationId }, returns: array of aliases for authenticated coach. For future admin view
- [ ] --- INTEGRATION ---
- [ ] Integration: Schedule from claimsExtraction.ts (NOT claimProcessing.ts which does not exist)
- [ ] - In extractClaims handler, after storeClaims (line ~563):
- [ ] - [E2] Check via ctx.runQuery(internal.lib.featureFlags.shouldUseEntityResolution, { organizationId, userId: coachUserId })
- [ ] - If enabled: ctx.scheduler.runAfter(0, internal.actions.entityResolution.resolveEntities, { artifactId })
- [ ] - This runs IN PARALLEL with existing flow (same pattern as Phase 4 scheduler)
- [ ] --- VERIFICATION ---
- [ ] Type check passes: npm run check-types
- [ ] Build passes: npm run build
- [ ] Manual test: Claim with 'Shawn' -> finds 'Sean' -> auto-resolves if >= trust threshold
- [ ] Manual test: Claim with common name (multiple matches) -> needs_disambiguation
- [ ] Manual test: [E5] Resolve 'Shawn' -> 'Sean' once, then send another voice note with 'Shawn' -> auto-resolves via alias
- [ ] Manual test: [E6] Voice note mentions 'Tommy' 3 times -> only 1 disambiguation prompt, resolving updates all 3
- [ ] Manual test: [E1] Level 3 coach auto-resolves at lower threshold than Level 0 coach

## Playwright E2E Tests
- Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts -g "US-VN-017"`
- Report: `npx -w apps/web playwright show-report uat/playwright-report`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
