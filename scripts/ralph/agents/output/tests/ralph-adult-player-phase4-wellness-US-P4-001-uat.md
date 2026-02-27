# UAT Test: US-P4-001 - Backend: Wellness Schemas, Queries & Mutations

> Auto-generated: 2026-02-25 19:55
> Status: ⏳ Pending Execution

## Story
As a backend developer, I need all wellness database schemas, queries, and mutations in place so that frontend stories can be implemented on top of a complete, type-safe API.

## Acceptance Criteria Checklist

- [ ] Add 4 tables to packages/backend/convex/schema.ts exactly as specified in the PRD:
- [ ] dailyPlayerHealthChecks: playerIdentityId (v.id), organizationId (string), checkDate (string YYYY-MM-DD), 8 optional number fields (sleepQuality/energyLevel/foodIntake/waterIntake/mood/motivation/physicalFeeling/muscleRecovery each v.optional(v.number())), enabledDimensions (v.array(v.string())), optional cyclePhase (v.union of 5 literals: menstruation/early_follicular/ovulation/early_luteal/late_luteal), optional notes string, submittedAt/updatedAt numbers, optional submittedOffline boolean, optional deviceSubmittedAt number. Indexes: by_player_and_date [playerIdentityId, checkDate], by_org_and_date [organizationId, checkDate], by_player [playerIdentityId]
- [ ] playerWellnessSettings: playerIdentityId (v.id), organizationId (string), enabledDimensions (v.array(v.string())), updatedAt (number). Index: by_player [playerIdentityId]. Default enabledDimensions when no record exists: ['sleepQuality', 'energyLevel', 'mood', 'physicalFeeling', 'motivation'] (the 5 core dimensions)
- [ ] wellnessCoachAccess: playerIdentityId (v.id), organizationId (string), coachUserId (string), coachName (string, denormalised), requestedAt (number), status (v.union of pending/approved/denied/revoked literals), optional approvedAt (number), optional revokedAt (number). Indexes: by_player [playerIdentityId], by_coach_and_player [coachUserId, playerIdentityId], by_org_and_coach [organizationId, coachUserId]
- [ ] playerHealthConsents: playerIdentityId (v.id), organizationId (string), consentType (string — use 'cycle_tracking'), givenAt (number), optional withdrawnAt (number). Index: by_player_and_type [playerIdentityId, consentType]
- [ ] Expand packages/backend/convex/models/playerHealthChecks.ts (the Phase 1 stub) with these queries and mutations (all must include returns validator):
- [ ] getTodayHealthCheck(playerIdentityId, checkDate): replace stub — query dailyPlayerHealthChecks using by_player_and_date index, return record or null
- [ ] getWellnessHistory(playerIdentityId, days): query by_player index, filter to last N days in-memory, return array sorted newest first. Default days=30.
- [ ] getWellnessSettings(playerIdentityId): query by_player index on playerWellnessSettings. If no record: return default object with 5 core dimensions enabled: { enabledDimensions: ['sleepQuality', 'energyLevel', 'mood', 'physicalFeeling', 'motivation'] }.
- [ ] submitDailyHealthCheck(playerIdentityId, organizationId, checkDate, dimensionValues object, enabledDimensions, cyclePhase?, notes?, submittedOffline?, deviceSubmittedAt?): insert into dailyPlayerHealthChecks. Check for existing record by by_player_and_date — if exists, throw error directing caller to use updateDailyHealthCheck.
- [ ] updateDailyHealthCheck(checkId, dimensionValues object, cyclePhase?, notes?): patch existing record, update updatedAt.
- [ ] updateWellnessSettings(playerIdentityId, organizationId, enabledDimensions): upsert playerWellnessSettings. Throw error if any of the 5 core dimensions (sleepQuality, energyLevel, mood, physicalFeeling, motivation) is absent from enabledDimensions array. Optional dimensions (foodIntake, waterIntake, muscleRecovery) can be freely added or removed.
- [ ] requestWellnessAccess(playerIdentityId, coachUserId, organizationId, coachName): check for existing pending record via by_coach_and_player index — if pending exists, no-op. Otherwise insert new wellnessCoachAccess with status 'pending'. Send in-app notification to player via existing notifications system.
- [ ] respondWellnessAccess(accessId, decision): patch status to 'approved' or 'denied'. Set approvedAt if approved.
- [ ] revokeWellnessAccess(accessId): patch status to 'revoked', set revokedAt.
- [ ] getWellnessCoachAccessList(playerIdentityId): return all wellnessCoachAccess records for this player (all statuses) using by_player index.
- [ ] getWellnessForCoach(coachUserId, organizationId): fetch all approved wellnessCoachAccess records for this coach via by_org_and_coach index where status === 'approved'. For each approved playerIdentityId: fetch last 7 days of check-ins, compute aggregate score per day (average of all dimension values present). Return array of { playerIdentityId, playerName, todayScore, trend7Days }. MUST NOT include individual dimension values in return type.
- [ ] giveCycleTrackingConsent(playerIdentityId, organizationId): upsert playerHealthConsents with consentType 'cycle_tracking', givenAt = now, withdrawnAt = undefined.
- [ ] withdrawCycleTrackingConsent(playerIdentityId): patch playerHealthConsents to set withdrawnAt = now. Run a separate mutation to null out cyclePhase field on all past dailyPlayerHealthChecks for this player.
- [ ] Run npx -w packages/backend convex codegen — all generated types must pass
- [ ] npm run check-types passes

## Playwright E2E Tests
- Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts -g "US-P4-001"`
- Report: `npx -w apps/web playwright show-report uat/playwright-report`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
