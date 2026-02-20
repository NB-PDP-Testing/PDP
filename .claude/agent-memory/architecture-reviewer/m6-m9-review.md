# M6-M9 Architecture Review (2026-02-17)

## Status: COMPLETE -- 8 ADRs generated, 6 critical findings

## Critical Findings

### C1: usePaginatedQuery Not Used Anywhere in Codebase
- Zero imports of `usePaginatedQuery` from `convex/react` in apps/web/src/
- M5 uses `useQuery` with manual `{ numItems, cursor: null }` args
- Resolution: USE usePaginatedQuery for M6 artifacts grid and M7 events page
- It IS available as import, just never used before

### C2: 5 New Backend Public Queries Needed (BLOCKING)
- `getPlatformArtifacts` -- paginated, platform-wide artifact listing
- `getPlatformArtifactById` -- single artifact for detail page
- `getClaimsByArtifactPlatform` -- claims for expanded rows
- `getResolutionsByArtifactPlatform` -- resolutions for expanded rows
- `getDraftsByArtifactPlatform` -- drafts for expanded rows
- MUST be created before M6 frontend work begins

### C3: getRecentArtifacts Uses .take() and User-Scoped
- Line 260 of voiceNoteArtifacts.ts: `.take(limit)` with `senderUserId` index
- Cannot be reused for platform-wide artifacts grid
- Need new getPlatformArtifacts with .paginate()

### C4: No organizationId Index on voiceNoteArtifacts
- orgContextCandidates is an array field (not indexable)
- Org filter must be client-side on returned page (25 items)
- Acceptable for MVP

### C5: getAlertHistory Full Table Scan (Tech Debt)
- Collects ALL platformCostAlerts then JS filters for PIPELINE_* prefix
- Acceptable at current scale, flag for future

### C6: getRecentEvents Custom Pagination Args
- Uses custom `v.object({ numItems, cursor })` not `paginationOptsValidator`
- Must verify usePaginatedQuery compatibility
- May need to modify to use standard validator

## ADRs Generated (ADR-VNM-021 through ADR-VNM-028)
- 021: Artifacts grid pagination (usePaginatedQuery)
- 022: CSS-based charts (div-width bars + inline SVG)
- 023: v2-claims component reuse (extract shared configs)
- 024: Event timeline display (CSS vertical line + colored nodes)
- 025: Filter state management (useState + useMemo)
- 026: New backend queries required (5 new queries)
- 027: Real-time toast notifications (useRef prev count pattern)
- 028: Mobile responsive breakpoints (functional@375px, optimized@768px+)

## Key Patterns Established
- usePaginatedQuery for unbounded lists (artifacts, events)
- useQuery for fixed-size data (metrics, alerts, recent 20 items)
- On-demand expansion queries (claims/resolutions in expanded rows -- exception to lifting rule)
- Batch name enrichment in backend handlers (not frontend)
- CSS bar charts reuse messaging dashboard pattern
- Inline SVG for line/area charts (same approach as PipelineFlowGraph)
- shadcn/ui Dialog for stage drill-down modals

## Files Reference
- Phase PRD: scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M6_M7_M8_M9.json
- Implementation guide: scripts/ralph/agents/output/feedback.md (top section)
- Architecture doc: docs/architecture/voice-flow-monitoring-harness.md
- Performance patterns: scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md
- M5 lessons learned: scripts/ralph/prds/voice-monitor-harness/context/M5_LESSONS_LEARNED.md

## Existing v2-Claims Feature Parity Checklist
Must verify before M9 deletion:
- Artifact list with status badges
- Expandable claims with topic/status/confidence/severity/sentiment
- Entity mention count
- Resolved player/team names
- Source text per claim
- Loading skeletons
- Empty state
