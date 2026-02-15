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
