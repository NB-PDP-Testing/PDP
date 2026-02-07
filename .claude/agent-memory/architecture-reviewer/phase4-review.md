# Phase 4 Claims Extraction - Detailed Review Notes

## Date: 2026-02-06

## Stories Reviewed
- US-VN-015: Claims Table & Extraction Action (2 days)
- US-VN-016: Pipeline Integration & Claims Viewer (1 day)

## Files Analyzed
- `packages/backend/convex/schema.ts` (lines 4130-4280, v2 tables area)
- `packages/backend/convex/actions/voiceNotes.ts` (lines 1-75, 216-300, 304-724, 983-1074)
- `packages/backend/convex/models/voiceNoteArtifacts.ts` (full, 211 lines, 5 functions)
- `packages/backend/convex/models/voiceNoteTranscripts.ts` (full, 75 lines, 2 functions)
- `packages/backend/convex/lib/featureFlags.ts` (full, 242 lines, 3 functions)
- `packages/backend/convex/lib/playerMatching.ts` (full, 176 lines)
- `packages/backend/convex/models/aiModelConfig.ts` (full, 565 lines)
- `packages/backend/convex/models/orgPlayerEnrollments.ts` (lines 1-50, 661-800, 1561-1580)
- `packages/backend/convex/models/coaches.ts` (getCoachAssignments, getFellowCoachesForTeams)
- `apps/web/src/app/platform/ai-config/page.tsx` (full, 694 lines)
- PRD: `scripts/ralph/prd.json`
- Implementation guide: `scripts/ralph/prds/voice-gateways-v2/context/PHASE4_CLAIMS_EXTRACTION.md`
- Agent context: `scripts/ralph/agents/output/PHASE4_AGENT_CONTEXT.md`
- Phase 3 context: `scripts/ralph/prds/voice-gateways-v2/context/PHASE3_V2_MIGRATION.md`

## Key Observations

### voiceNoteArtifacts indexes (confirmed)
- by_artifactId: [artifactId]
- by_senderUserId_and_createdAt: [senderUserId, createdAt]
- by_voiceNoteId: [voiceNoteId]
- by_status_and_createdAt: [status, createdAt]
- NO plain by_createdAt index. getRecentArtifacts must either use status prefix or table scan.

### getPlayersForCoachTeamsInternal return shape
Returns: { _id, playerIdentityId, firstName, lastName, name, ageGroup, sport }
Note: `name` is pre-computed as `${firstName} ${lastName}`

### getPlayersForOrgInternal return shape
Same as above. Used as fallback when coach has no team assignments.

### findSimilarPlayers args
{ organizationId: string, coachUserId: string, searchName: string, limit?: number }
Returns: { playerId: Id<"playerIdentities">, firstName, lastName, fullName, similarity, ageGroup, sport }

### PlayerFromOrg type (voiceNotes.ts:983)
{ _id, playerIdentityId, firstName, lastName, name, ageGroup, sport: string | null }

### findMatchingPlayer (voiceNotes.ts:993) - deterministic matching order
1. Match by playerId (AI's guess from roster)
2. Exact full name match (case-insensitive)
3. firstName + lastName match (case-insensitive)
4. First name only match (if unique)
5. Partial match (if unique)
6. Give up -> null

### v1 buildInsights coach context flow (lines 340-471)
1. Fetch players: getPlayersForCoachTeamsInternal OR getPlayersForOrgInternal
2. Fetch coach teams: api.models.coaches.getCoachAssignments
3. Resolve team details: betterAuth.adapter.findMany (all org teams) -> filter by coach's teams
4. Get recording coach name: betterAuth.userFunctions.getUserByStringId
5. Get fellow coaches: api.models.coaches.getFellowCoachesForTeams
6. Deduplicate players by playerIdentityId
7. Format as JSON strings

### Confirmed: extractClaims will receive artifact._id (Convex doc ID)
The scheduler call passes `{ artifactId: artifact._id }` not the string artifactId.
So getArtifactById takes `v.id("voiceNoteArtifacts")` as arg.
But updateArtifactStatus takes the string `artifactId` (not _id). Important distinction!

### updateArtifactStatus uses string artifactId, not _id
extractClaims must look up artifact first (via getArtifactById with _id),
then use artifact.artifactId (string) for updateArtifactStatus calls.

## Potential Issues Identified

1. **getRecentArtifacts index gap**: No plain `by_createdAt` index exists. PRD suggests using `by_status_and_createdAt` but that requires a status prefix. For a debug tool, a plain `.order("desc").take(limit)` is acceptable (table scan with hard limit).

2. **Coach name resolution inconsistency**: v1 uses firstName/lastName from betterAuth component query, which contradicts CLAUDE.md's guidance to use user.name. This is WORKING in production so must be ported as-is.

3. **Cognitive complexity risk in extractClaims**: The handler has 10+ steps. Must extract sub-functions to stay under Biome's limit of 15.

4. **storeClaims in mutations**: Must use for...of loop for db.insert calls, not Promise.all. Convex mutations are deterministic.

5. **entityMentions.position field**: The AI generates "approximate character offset" - this may not be reliable. Phase 5 should not depend on this field for critical logic.

## ADRs Created
- ADR-VN2-010: Claims table denormalization
- ADR-VN2-011: Coach context helper extraction
- ADR-VN2-012: Claims extraction parallel scheduling
- ADR-VN2-013: Claims index strategy
- ADR-VN2-014: Claims viewer access control

---

## POST-IMPLEMENTATION REVIEW (2026-02-06)

### Commits: e9ca75d5 (US-VN-015), d98a7766 (US-VN-016)
### Result: GOOD -- 0 critical, 5 warnings, 6 suggestions

### Verified Correct
- Schema: voiceNoteClaims at lines 4227-4316, all 7 indexes present
- All queries in voiceNoteClaims.ts use .withIndex() (zero .filter())
- storeClaims uses for...of loop (confirmed correct for determinism)
- Pipeline hook at voiceNotes.ts lines 258-263 (perfect ADR-VN2-012 alignment)
- coachContext.ts properly extracted as internalQuery (ADR-VN2-011)
- Claims viewer: 2 queries at page level, no useQuery in child components
- Error handling: try/catch with markArtifactFailed best-effort cleanup

### Issues Found

#### W1: claimId uses Math.random() not crypto.randomUUID()
- File: claimsExtraction.ts line 375
- `claim_${opts.now}_${Math.random().toString(36).slice(2, 11)}`
- Deviates from ADR-VN2-008 pattern. Pre-implementation review said crypto.randomUUID().
- Low practical risk but inconsistent.

#### W2: coachContext.ts line 144 uses firstName/lastName
- Intentional v1 port per ADR-VN2-011
- Falls through to user.name correctly
- Tech debt for future refactor

#### W3: resolveClaimPlayer has loop-based ctx.runQuery
- claimsExtraction.ts lines 539-556
- Each claim with no deterministic match calls findSimilarPlayers
- OK in action context (not ctx.db N+1), but latency concern at scale

#### W4-W5: Public queries without auth
- getRecentClaims, getRecentArtifacts: no auth (ADR-VN2-014 accepted)
- getClaimsByOrgAndCoach: no org membership check (needs fix Phase 5+)

#### S1: Claims viewer missing useCurrentUser()
- ADR-VN2-014 specifies it, implementation omits it

#### S6: output_text array check unnecessary
- claimsExtraction.ts line 522 checks Array.isArray(response.output_text)
- OpenAI output_text is always string. Dead code branch.

### Index Coverage: All 7 verified
| Index | Query/Consumer | Status |
|-------|---------------|--------|
| by_artifactId | getClaimsByArtifact | USED |
| by_artifactId_and_status | getClaimsByArtifactAndStatus | USED |
| by_claimId | getClaimByClaimId, updateClaimStatus | USED |
| by_topic | Future analytics | PLANNED |
| by_org_and_coach | getClaimsByOrgAndCoach | USED |
| by_org_and_status | Phase 5 disambiguation | PLANNED |
| by_resolvedPlayerIdentityId | Phase 6 drafts | PLANNED |

### ADR Alignment
- 010: ALIGNED
- 011: ALIGNED
- 012: ALIGNED
- 013: ALIGNED
- 014: PARTIAL (missing useCurrentUser)
