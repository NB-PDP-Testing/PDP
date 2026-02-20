# US-VN-019 Implementation Summary

## Phase 6: Insight Drafts & Draft Generation

### Implementation Date
February 7, 2026

### Files Created

#### 1. `/packages/backend/convex/models/insightDrafts.ts` (NEW)
**Purpose**: Model layer for managing insight drafts with 8 functions

**Functions Implemented**:

1. **`createDrafts`** (internalMutation)
   - Batch insert drafts
   - Args: `{ drafts: DraftInput[] }`
   - Returns: `Array<Id<"insightDrafts">>`

2. **`getDraftsByArtifact`** (internalQuery)
   - Get all drafts for an artifact
   - Uses `by_artifactId` index
   - Args: `{ artifactId }`

3. **`getPendingDraftsForCoach`** (PUBLIC query)
   - Get pending drafts for authenticated coach
   - Uses `by_org_and_coach_and_status` index
   - Filters out expired drafts (>7 days old)
   - Auth: Derives coachUserId from `identity.subject`

4. **`confirmDraft`** (PUBLIC mutation)
   - Confirm a single draft
   - Verifies ownership via artifact.senderUserId
   - Sets status="confirmed", confirmedAt=now
   - Auth: Checks artifact ownership

5. **`confirmAllDrafts`** (PUBLIC mutation)
   - Confirm all pending drafts for an artifact
   - Uses `by_artifactId_and_status` index
   - Batch updates all pending drafts

6. **`rejectDraft`** (PUBLIC mutation)
   - Reject a single draft
   - Same ownership check as confirmDraft
   - Sets status="rejected"

7. **`rejectAllDrafts`** (PUBLIC mutation)
   - Reject all pending drafts for an artifact
   - Batch updates all pending drafts

8. **`applyDraft`** (internalMutation)
   - Apply a confirmed draft to player profile
   - Creates voiceNoteInsight record
   - Maps draft fields to voiceNoteInsights schema
   - Sets status="applied", appliedAt=now

**Key Patterns**:
- All public functions verify authentication
- Ownership verified via artifact.senderUserId === identity.subject
- Uses .withIndex() throughout (never .filter())
- Confidence values bounded to [0, 1]
- 7-day expiry on pending drafts

#### 2. `/packages/backend/convex/actions/draftGeneration.ts` (NEW)
**Purpose**: Generate insight drafts from resolved claims with auto-confirm logic

**Function**: `generateDrafts` (internalAction)

**Logic Flow**:
1. Get artifact via `internal.models.voiceNoteArtifacts.getArtifactById`
2. Extract organizationId from artifact.orgContextCandidates[0]
3. Get all claims via `internal.models.voiceNoteClaims.getClaimsByArtifact`
4. Get entity resolutions via `internal.models.voiceNoteEntityResolutions.getResolutionsByArtifact`
5. Build Map<claimId, resolutions[]> for quick lookup
6. Get coach trust level via `internal.models.coachTrustLevels.getCoachTrustLevelInternal`
7. For each claim with a resolved player entity:
   - Calculate aiConfidence = claim.extractionConfidence
   - Calculate resolutionConfidence from candidate score
   - Calculate overallConfidence = aiConfidence * resolutionConfidence
   - Determine requiresConfirmation using auto-confirm gate:
     - effectiveLevel = min(currentLevel, preferredLevel ?? 3)
     - threshold = insightConfidenceThreshold ?? 0.85
     - SENSITIVE_TYPES = ["injury", "wellbeing", "recovery"] → NEVER auto-confirm
     - Check autoApplyPreferences (skills, attendance, goals, performance)
     - requiresConfirmation = isSensitive OR effectiveLevel < 2 OR overallConfidence < threshold OR !autoApplyAllowed
   - Generate unique draftId via crypto.randomUUID()
   - Create draft with status="pending" or "confirmed"
8. Insert drafts via `internal.models.insightDrafts.createDrafts`
9. For auto-confirmed drafts, schedule `internal.models.insightDrafts.applyDraft`

**Auto-Confirm Gate Conditions**:
- Trust level ≥ 2
- Overall confidence ≥ threshold (default 0.85)
- NOT a sensitive type (injury, wellbeing, recovery)
- Coach has enabled auto-apply for that category

**Sensitive Types** (NEVER auto-confirm):
- injury
- wellbeing
- recovery

#### 3. `/packages/backend/convex/actions/entityResolution.ts` (MODIFIED)
**Change**: Added hook to schedule draft generation after entity resolution completes

**Location**: After line 180 (after `updateClaimStatuses`)

**Code Added**:
```typescript
// 15. Schedule draft generation (Phase 6)
await ctx.scheduler.runAfter(
  0,
  internal.actions.draftGeneration.generateDrafts,
  { artifactId: args.artifactId }
);
```

### Schema Validation

The `insightDrafts` table schema already exists in `packages/backend/convex/schema.ts` at line 4392 with:
- All required fields (draftId, artifactId, claimId, insightType, title, description, evidence, etc.)
- 5 indexes:
  - by_draftId
  - by_artifactId
  - by_artifactId_and_status
  - by_org_and_coach_and_status
  - by_playerIdentityId_and_status

**No schema changes required** ✓

### Type Safety

- All functions include both `args` and `returns` validators
- Actions use `ctx.runQuery`/`ctx.runMutation` (never direct ctx.db access)
- Confidence values bounded to [0, 1] with Math.max/Math.min
- Status fields use type literals ("pending" | "confirmed" | "rejected" | "applied" | "expired")
- draftId generated using crypto.randomUUID() (not in mutation)

### Performance Patterns

✓ Uses .withIndex() throughout (never .filter())
✓ Batch operations for confirmAllDrafts/rejectAllDrafts
✓ Map-based lookup for resolutions (O(1) access)
✓ No N+1 queries
✓ Auth checks return early with empty arrays

### Integration Points

**Upstream** (calls TO this code):
- `actions/entityResolution.ts` schedules `generateDrafts` after entity resolution

**Downstream** (this code calls):
- `models/voiceNoteArtifacts.getArtifactById` - get artifact
- `models/voiceNoteClaims.getClaimsByArtifact` - get claims
- `models/voiceNoteEntityResolutions.getResolutionsByArtifact` - get resolutions
- `models/coachTrustLevels.getCoachTrustLevelInternal` - get trust level
- `models/insightDrafts.createDrafts` - insert drafts
- `models/insightDrafts.applyDraft` - apply auto-confirmed drafts

### Testing Verification

**Convex Codegen**: ✓ Passed
**API Generation**: ✓ Functions exported in `_generated/api.d.ts`
**Syntax Check**: ✓ Node.js syntax validation passed
**Index Usage**: ✓ All queries use .withIndex()

### Known Dependencies

The following existing files were referenced but NOT modified:
- `packages/backend/convex/schema.ts` - insightDrafts table (already exists)
- `packages/backend/convex/models/voiceNoteArtifacts.ts` - getArtifactById query
- `packages/backend/convex/models/voiceNoteClaims.ts` - getClaimsByArtifact query
- `packages/backend/convex/models/voiceNoteEntityResolutions.ts` - getResolutionsByArtifact query
- `packages/backend/convex/models/coachTrustLevels.ts` - getCoachTrustLevelInternal query

### Unrelated Type Errors

The following type errors exist in OTHER files (not caused by this implementation):
- `packages/backend/convex/actions/migration.ts` - severity/sentiment type issues
- `packages/backend/convex/models/voiceNotes.ts` - query type issues

These are pre-existing and unrelated to US-VN-019.

### Next Steps (UI Implementation)

Frontend components needed (not part of this backend implementation):
1. Coach draft review UI (list pending drafts)
2. Draft confirmation/rejection buttons
3. Confidence score display
4. Auto-confirm settings UI (trust level preferences)
5. Draft expiry warnings (>7 days old)

### ADRs Referenced

- **ADR-VN2-007**: Feature flag storage design
- **ADR-VN2-008**: Artifact ID generation (crypto.randomUUID)
- **ADR-VN2-009**: Dual-path processing order

### Completion Status

✅ insightDrafts model (8 functions)
✅ draftGeneration action
✅ entityResolution hook
✅ Convex codegen passed
✅ Type safety validated
✅ Performance patterns verified
✅ Auth patterns verified

**Implementation Status**: COMPLETE ✓
