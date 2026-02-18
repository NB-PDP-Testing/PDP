# Voice Monitor Harness PRD Review (2026-02-15)

## Files Reviewed
- Architecture: docs/architecture/voice-flow-monitoring-harness.md
- PRD.json: scripts/ralph/prds/voice-monitor-harness/PRD.json
- PHASE_M1.json through PHASE_M6_M7_M8_M9.json

## Critical Issues Found

### C1: Missing Context Files (PRD references non-existent files)
- `scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md` - DOES NOT EXIST
- `scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md` - DOES NOT EXIST
- Ralph will fail if it reads contextFiles from PRD.json

### C2: `transcribeAudio` action takes `noteId` not `artifactId`
- Actual signature: `transcribeAudio({ noteId: v.id("voiceNotes") })`
- PRD/Architecture assumes: `transcribeAudio({ artifactId })`
- Retry mutations (M3) reference wrong function signature
- Instrumentation points (M1 US-VNM-003) may need different approach

### C3: `voiceNoteArtifacts` has NO `organizationId` field
- Schema has `orgContextCandidates` (array of { organizationId, confidence })
- Event emission code in PRD assumes `artifact.organizationId` exists
- Must extract from orgContextCandidates[0].organizationId
- Affects ALL instrumentation points in US-VNM-003

### C4: platformCostAlerts severity union mismatch
- Existing: v.union(v.literal("warning"), v.literal("critical")) -- 2 values
- PRD M4 assumes: "low", "medium", "high", "critical" -- 4 values
- Schema change needed or PRD must map to existing 2-level severity

### C5: platformCostAlerts alertType union is closed
- Existing: 5 specific cost-related literals (org_daily_threshold, etc.)
- PRD M4 adds 6 new PIPELINE_ types
- Schema must be extended (union expanded) -- not called out

### C6: Actions use ctx.runMutation not ctx.scheduler for event logging
- PRD correctly notes this for actions in PHASE_M1 US-VNM-003 "notes" field
- BUT the fire-and-forget instruction says "NEVER await the scheduler/runMutation call"
- In actions, ctx.runMutation IS awaited (it's a promise). You CAN'T fire-and-forget from actions.
- This is a fundamental pattern mismatch for action instrumentation

## Warnings

### W1: Cron time conflicts
- Proposed "cleanup-pipeline-snapshots" at Sunday 4:30 AM -- conflicts with existing "cleanup-archived-invitations" at Sunday 4:00 AM
- Proposed "cleanup-pipeline-events" at Sunday 5:00 AM -- no conflict

### W2: Event count is 25 in architecture, verified at 25 in PHASE_M1
- artifact_received through rate_limit_hit = exactly 25 literals (ALIGNED)

### W3: `getRecentArtifacts` uses .take() not .paginate()
- Existing function uses .take(limit) pattern
- PRD correctly identifies this needs to change but doesn't call it out as a migration

### W4: `getActiveArtifacts` in PHASE_M1 queries voiceNoteArtifacts (not events)
- PRD correctly documents this is an artifact table query
- But needs 4 separate index queries for 4 active statuses (received, transcribing, transcribed, processing)
- by_status_and_createdAt index only supports single status eq

## What's Aligned
- 3 table schemas match architecture doc exactly
- 9 indexes on voicePipelineEvents match
- 2 indexes on voicePipelineMetricsSnapshots match
- 2 indexes on voicePipelineCounters match
- Event types list: 25 types, all match between arch and PRD
- Pipeline stages: 6 stages match
- Cron schedules: 4 crons match (hourly, daily, weekly cleanup, health check)
- Counter mapping: 7 counter types match
- Retention policy: 48h events, 7d hourly, 90d daily -- consistent

## M3 Pre-Implementation Review (2026-02-15)

### ADRs Generated
- ADR-VNM-005: Retry mutation scheduling (fire-and-forget via ctx.scheduler.runAfter)
- ADR-VNM-006: Full pipeline retry cleanup (sequential delete with try/catch, Convex atomic)
- ADR-VNM-007: Retry event logging timing (log BEFORE status reset and action scheduling)

### Critical Findings
- C1: voiceNoteId is OPTIONAL on artifacts (v.optional(v.id("voiceNotes"))). MUST guard.
- C2: Auth pattern inconsistency: M1 single-step vs M2 two-step. Recommended M2 pattern.
- C3: JavaScript .filter() on collected arrays is ACCEPTABLE (quality hook will false-positive)
- C4: Use direct ctx.db.patch() for status reset, NOT updateArtifactStatus internal mutation

### Action Signatures (Verified from Source)
- transcribeAudio: `{ noteId: v.id("voiceNotes") }` -- artifact.voiceNoteId, NOT artifactId
- extractClaims: `{ artifactId: v.id("voiceNoteArtifacts") }` -- artifact._id
- resolveEntities: `{ artifactId: v.id("voiceNoteArtifacts") }` -- artifact._id

### Index Coverage (All Exist -- No Schema Changes Needed for M3)
- voiceNoteTranscripts.by_artifactId (schema.ts:4263)
- voiceNoteClaims.by_artifactId (schema.ts:4353)
- voiceNoteEntityResolutions.by_artifactId (schema.ts:4404)
- insightDrafts.by_artifactId (schema.ts:4481)
- voicePipelineEvents.by_artifactId (schema.ts:4574)

### Status Reset Mapping
- retryTranscription -> "transcribing"
- retryClaimsExtraction -> "transcribed"
- retryEntityResolution -> (no status change, just delete resolutions)
- retryFullPipeline -> "received"

### Implementation Guidance Delivered
- Full guidance appended to scripts/ralph/agents/output/feedback.md
- Includes security, performance, risks, and pre-implementation checklist

## M4 Pre-Implementation Review (2026-02-15, UPDATED 2026-02-16)

### ADRs Generated (6 total)
- ADR-VNM-008: Alert storage strategy -- NEW voicePipelineAlerts table (not platformCostAlerts)
- ADR-VNM-009: Health check execution model -- single internalMutation, per-check try/catch
- ADR-VNM-010: Alert deduplication -- state-based (unacknowledged alert blocks duplicates)
- ADR-VNM-011: Latency baseline calculation -- bounded .collect() on 168 hourly snapshots
- ADR-VNM-012: Alert severity classification -- 4-level (critical/high/medium/low), static mapping
- ADR-VNM-013: Cron scheduling strategy -- 5-minute interval, no wrapper needed

### Critical Findings

#### C1: platformCostAlerts is Incompatible (RESOLVED by ADR-VNM-008)
- Severity union: only "warning"|"critical" (M4 needs 4 levels)
- AlertType union: only 5 cost literals (M4 needs 6 PIPELINE_ types)
- Fields: triggerValue/thresholdValue required (M4 uses metadata object)
- Decision: Create NEW voicePipelineAlerts table with proper schema

#### C2: CORRECTED -- by_status Index ALREADY EXISTS on voiceNoteEntityResolutions
- **Previous finding was WRONG.** Index exists at schema.ts line 4407: `.index("by_status", ["status"])`
- NO schema change needed for disambiguation backlog query
- Supports: `.withIndex("by_status", q => q.eq("status", "needs_disambiguation"))`

#### C3: Counter organizationId null vs undefined
- Platform-wide counters stored with organizationId = undefined
- M1/M2 implementation verified: uses `undefined` (omits field), NOT null
- Query pattern: `.eq("organizationId", undefined)` is correct

#### C4: Queue Depth Query Requires 4 Index Queries
- voiceNoteArtifacts.by_status_and_createdAt supports single status eq
- Must query received, transcribing, transcribed, processing separately
- Each query uses .collect() -- acceptable for MVP since threshold is 50

### Schema Changes Required for M4
1. ADD voicePipelineAlerts table (see ADR-VNM-008 for full definition)
   - 3 indexes: by_alertType_and_acknowledged, by_acknowledged_and_createdAt, by_createdAt
2. ~~ADD by_status index to voiceNoteEntityResolutions~~ **NOT NEEDED -- already exists**

### Index Coverage for M4 Queries (ALL VERIFIED)
- voicePipelineCounters.by_counterType_and_org -- EXISTS (M1)
- voicePipelineMetricsSnapshots.by_periodType_and_start -- EXISTS (M2)
- voiceNoteArtifacts.by_status_and_createdAt -- EXISTS
- voiceNoteEntityResolutions.by_status -- EXISTS (line 4407) **CORRECTED**
- voicePipelineEvents.by_eventType_and_timestamp -- EXISTS (M1)
- aiServiceHealth -- singleton, no index needed

### Cron Scheduling
- check-pipeline-health: every 5 minutes (crons.interval), no wrapper (ADR-VNM-013)
- Position: after M2 cron entries in crons.ts, before `export default crons;`

### Implementation Guidance Delivered
- Comprehensive guide: scripts/ralph/agents/output/m4-implementation-guide.md
- Also appended to scripts/ralph/agents/output/feedback.md
- Covers: schema, security, all 6 health checks, dedup, cron, risks, checklist
- Includes complete code examples for all 6 checks + helpers
