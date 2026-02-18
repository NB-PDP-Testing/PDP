# Critical Fixes Applied to Voice Flow Monitoring Harness PRDs

**Date:** February 15, 2026
**Review Agents:** Architecture Reviewer, Completeness Auditor, Enhancement Recommender, Consistency Checker

---

## ✅ COMPLETED FIXES

### 1. **Context Files Created** ✅
**Issue:** PRD.json referenced missing context files
**Files Created:**
- `context/MAIN_CONTEXT.md` - Complete project overview, architecture summary, tables, patterns
- `context/PERFORMANCE_PATTERNS.md` - Mandatory performance patterns with code examples

---

## 🔧 FIXES TO APPLY TO PHASE PRDs

### PHASE_M1.json - Critical Fixes Needed

#### Fix 1: organizationId Extraction Pattern
**Location:** US-VNM-003, file1_voiceNoteArtifacts, createArtifact
**Current (WRONG):**
```json
"organizationId": "args.organizationId",
"code": "organizationId: args.organizationId"
```

**Fix (CORRECT):**
```json
"organizationId": "artifact.orgContextCandidates[0]?.organizationId (highest confidence candidate)",
"code": "organizationId: newArtifact.orgContextCandidates[0]?.organizationId"
```

**Apply to:**
- file1_voiceNoteArtifacts → createArtifact instrumentation (line ~415)
- file2_voiceNoteTranscripts → needs artifact lookup first
- Note in implementationNotes that artifacts use orgContextCandidates array, not flat field

#### Fix 2: Fire-and-Forget Pattern for Actions
**Location:** US-VNM-003, criticalPatterns.fireAndForget
**Current (WRONG):**
```json
"Actions use ctx.runMutation(...) - not ctx.scheduler",
"NEVER await the scheduler/runMutation call - fire-and-forget pattern"
```

**Fix (CORRECT):**
```json
"Mutations use: ctx.scheduler.runAfter(0, ...) - TRUE fire-and-forget, returns immediately",
"Actions use: await ctx.runMutation(...) - MUST await (no scheduler), wrap in try/catch",
"Event logging failures should NOT crash the pipeline - logEvent catches errors internally"
```

**Add example:**
```typescript
// In actions (transcribeAudio, extractClaims, etc.):
try {
  await ctx.runMutation(internal.models.voicePipelineEvents.logEvent, {
    eventType: "transcription_started",
    artifactId,
    pipelineStage: "transcription",
    stageStartedAt: Date.now()
  });
} catch (logError) {
  console.error("Event logging failed:", logError);
  // Don't throw - continue pipeline execution
}
```

#### Fix 3: Counter Race Condition Handling
**Location:** US-VNM-002, function1_logEvent, implementation step 5
**Current:** Basic increment/reset logic
**Add:** Race condition handling when multiple events arrive at window boundary

```typescript
// Step 5d enhancement:
if (counter && Date.now() >= counter.windowEnd) {
  // ATOMIC RESET: Use patch to avoid race condition
  // If another event already reset the window, this will increment the new window
  await ctx.db.patch(counter._id, {
    currentValue: 1,  // Reset to 1, not increment
    windowStart: Date.now(),
    windowEnd: Date.now() + 3600000
  });
} else if (counter) {
  // Normal increment (window still valid)
  await ctx.db.patch(counter._id, {
    currentValue: counter.currentValue + 1
  });
}
```

#### Fix 4: Add Missing Failure Event Types
**Location:** US-VNM-001, table1_voicePipelineEvents, eventTypes array
**Current:** Missing entity_resolution_failed, draft_generation_failed
**Add to eventTypes array (after existing types):**
```json
"entity_resolution_failed",
"draft_generation_failed"
```

**Update total count:** "25+ event types" → "27 event types"

---

### PHASE_M2.json - Moderate Fixes

#### Fix 5: P95 Latency Calculation Algorithm
**Location:** US-VNM-004, function5_aggregateHourlyMetrics, implementation step 3
**Add after "p95EndToEndLatency: sum of p95 stage latencies (approximation)":**
```json
"P95 calculation: Sort all durationMs values ascending, take value at index Math.floor(count * 0.95)"
```

#### Fix 6: Weighted Average Formula
**Location:** US-VNM-004, function6_aggregateDailyMetrics, implementation step 3
**Change:**
```json
"Average latency metrics (weighted by volume)"
```
**To:**
```json
"Average latency metrics: weighted_avg = sum(hourlyAvg * hourlyCount) / sum(hourlyCount)"
```

#### Fix 7: Batch Fetch Code Example
**Location:** US-VNM-004, function4_getOrgBreakdown, implementation
**Add detailed code example (see PERFORMANCE_PATTERNS.md Pattern 2)**

---

### PHASE_M3.json - Critical Fixes

#### Fix 8: transcribeAudio Action Signature Mismatch
**Location:** US-VNM-006, function1_retryTranscription, implementation step 6
**Current (WRONG):**
```json
"6. Schedule transcribeAudio action: await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { artifactId })"
```

**Fix (CORRECT):**
```json
"6. Fetch artifact to get linked voiceNoteId: const artifact = await ctx.db.get(args.artifactId)",
"7. Schedule transcribeAudio action with noteId: await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId: artifact.voiceNoteId })",
"NOTE: transcribeAudio action takes v1 noteId (v.id('voiceNotes')), not v2 artifactId"
```

#### Fix 9: Full Pipeline Retry Transaction Handling
**Location:** US-VNM-006, function4_retryFullPipeline, implementation step 4
**Add transaction safety:**
```json
"4. Delete all derived data (in order, check each step succeeds):",
"   a. Try to delete voiceNoteTranscripts - if fails, abort and return error",
"   b. Try to delete voiceNoteClaims - if fails, abort",
"   c. Try to delete voiceNoteEntityResolutions - if fails, abort",
"   d. Try to delete insightDrafts - if fails, abort",
"   e. Only if all deletes succeed: reset artifact status",
"NOTE: Wrap deletion sequence in try/catch - if any step fails, return error without partial cleanup"
```

---

### PHASE_M4.json - Moderate Fixes

#### Fix 10: Recommend Dedicated voicePipelineAlerts Table
**Location:** US-VNM-007, tableExtension note
**Change from:**
```json
"note": "Reuse existing platformCostAlerts table - no schema changes needed"
```

**To:**
```json
"RECOMMENDATION: Create dedicated voicePipelineAlerts table instead of extending platformCostAlerts",
"REASON: platformCostAlerts has closed union validators (severity: 'warning'|'critical', alertType: 5 literals)",
"EXTENDING IT REQUIRES: Schema migration to expand unions + add metadata field",
"ALTERNATIVE (CLEANER): New table with pipeline-specific fields, 4-level severity, metadata object",
"For MVP: If time-constrained, can reuse platformCostAlerts by mapping 4 severities to 2 (low/medium->warning, high/critical->critical)"
```

#### Fix 11: Latency Spike Baseline Calculation
**Location:** US-VNM-007, function1_checkPipelineHealth, CHECK 2
**Add:**
```json
"Baseline calculation: Query last 168 hourly snapshots (7 days), compute avg(avgEndToEndLatency), compare to current"
```

#### Fix 12: Alert Deduplication Time Window
**Location:** US-VNM-007, function1_checkPipelineHealth, implementation step 7
**Change:**
```json
"7. Deduplicate alerts: before inserting, check if same alertType already exists with acknowledged=false"
```
**To:**
```json
"7. Deduplicate alerts (15-minute window): before inserting, check if same alertType exists with acknowledged=false AND createdAt > (Date.now() - 900000). Only create new alert if no recent unacknowledged alert of same type."
```

---

### PHASE_M5.json - Moderate Fixes

#### Fix 13: Mobile Responsive Breakpoints
**Location:** US-VNM-008, criticalPatterns, responsiveDesign
**Change:**
```json
"Dashboard must work on desktop, tablet, and mobile"
```
**To:**
```json
"responsiveBreakpoints": {
  "desktop": ">= 1024px - 3-column status cards, horizontal flow graph",
  "tablet": "768-1023px - 2-column status cards, horizontal flow graph",
  "mobile": "< 768px - 1-column status cards, vertical flow graph",
  "mobileTabNav": "Horizontal scroll for tabs (not stacked)",
  "mobileFilters": "Collapse to drawer/accordion",
  "testWidth": "375px minimum (iPhone SE)"
}
```

#### Fix 14: SVG Flow Graph Code Snippet
**Location:** US-VNM-008, component1_PipelineFlowGraph, svgStructure
**Add example:**
```json
"codeExample": "<svg viewBox='0 0 1200 300' className='w-full h-auto'><rect x='50' y='100' width='200' height='100' fill='green'/><text x='150' y='150' textAnchor='middle'>Ingestion ({count})</text><!-- More stages... --></svg>"
```

---

### PHASE_M6.json - Moderate Fixes

#### Fix 15: Feature Parity Checklist
**Location:** US-VNM-009, acceptanceCriteria
**Add:**
```json
"v2ClaimsFeatureParity": [
  "View all claims with status badges (extracted, resolved, needs_disambiguation)",
  "Filter by status, organization, coach, date range",
  "Display claim confidence scores",
  "Show entity resolution candidates",
  "Manual resolution capability (for needs_disambiguation claims)",
  "Expandable claim details (show full text, raw text, topic)",
  "Display timestamps (created, resolved)",
  "Sort by confidence, created date",
  "Pagination with load more"
]
```

#### Fix 16: Expandable Row Pattern
**Location:** US-VNM-009, implementation
**Add:**
```json
"expandableRowPattern": "Use shadcn/ui Collapsible component OR custom state with row[artifactId].expanded boolean. Store expanded state in React.useState<Set<string>>(). Click row → toggle expanded state → render claims/resolutions inline (no re-query, data already loaded)."
```

#### Fix 17: CSV Export Format
**Location:** US-VNM-009, implementation
**Add:**
```json
"csvExportFormat": "Headers: Artifact ID, Status, Source, Coach, Org, Claims, Disambig, Latency, Cost, Created. Use browser download via Blob URL. Library: papa-parse OR manual CSV string generation."
```

---

### PHASE_M7.json - Moderate Fixes

#### Fix 18: CSS Chart Implementation Examples
**Location:** US-VNM-011, implementation step 4
**Add:**
```json
"cssChartExamples": {
  "barChart": "<div className='bar' style={{ width: `${(value/max)*100}%`, height: '20px', background: 'blue' }} />",
  "stackedBar": "<div className='bar'><div style={{ width: `${pct1}%` }} /><div style={{ width: `${pct2}%` }} /></div>",
  "lineChart": "Use positioned divs or CSS clip-path polygon for line path",
  "reference": "See apps/web/src/app/platform/messaging/* for existing CSS chart patterns"
}
```

---

### PHASE_M8.json - Moderate Fixes

#### Fix 19: Stage Drill-Down Modal Implementation
**Location:** US-VNM-013, implementation step 3
**Add:**
```json
"modalImplementation": "Use shadcn/ui Dialog component. On stage click: open modal, query getActiveArtifacts filtered by status for that stage (e.g., status='transcribing' for Transcription stage). Display table with columns: Artifact ID, Coach, Org, Time Elapsed, Actions (retry button)."
```

#### Fix 20: Toast Notification Pattern
**Location:** US-VNM-014, implementation step 5
**Add:**
```json
"toastPattern": "Use useQuery(api.models.voicePipelineAlerts.getActiveAlerts). In useEffect, compare previous alerts.length to current. If new critical alert detected (previous < current), show toast via sonner: toast.error('Critical Alert', { description: alert.message })."
```

---

### PHASE_M9.json - Moderate Fixes

#### Fix 21: E2E Test Template
**Location:** US-VNM-015, implementation
**Add file:** `test-scenarios.md` (see separate file)

---

### README.md - Minor Fix

#### Fix 22: Remove Obsolete Context File References
**Location:** File structure diagram
**Remove:**
```
context/
├── PHASE1_DATA_CAPTURE.md        ❌ OBSOLETE (from old 7-phase plan)
├── PHASE2_VISUALIZATION.md       ❌ OBSOLETE
├── PHASE3_ANALYTICS.md           ❌ OBSOLETE
├── PHASE4_DASHBOARD.md           ❌ OBSOLETE
├── PHASE5_ALERTS.md              ❌ OBSOLETE
├── PHASE6_AB_TESTING.md          ❌ OBSOLETE
└── PHASE7_ADVANCED.md            ❌ OBSOLETE
```

**Replace with:**
```
context/
├── MAIN_CONTEXT.md               ✅ Project overview, architecture
└── PERFORMANCE_PATTERNS.md       ✅ Mandatory performance patterns
```

**Note:** The detailed phase implementation instructions are in `phases/PHASE_M1.json` through `phases/PHASE_M6_M7_M8_M9.json`, not separate context `.md` files.

---

## 📝 ADDITIONAL ENHANCEMENTS APPLIED

### Test Scenarios Document Created
**File:** `test-scenarios.md`
**Content:** E2E test scenarios for all 9 phases with specific test cases

---

## 🎯 SUMMARY

**Total Fixes:** 22
**Critical (Must Fix):** 9
**Moderate (Should Fix):** 12
**Minor (Nice to Have):** 1

**Files Modified:**
- ✅ context/MAIN_CONTEXT.md (created)
- ✅ context/PERFORMANCE_PATTERNS.md (created)
- 🔧 PHASE_M1.json (4 critical fixes needed)
- 🔧 PHASE_M2.json (3 moderate fixes needed)
- 🔧 PHASE_M3.json (2 critical fixes needed)
- 🔧 PHASE_M4.json (3 moderate fixes needed)
- 🔧 PHASE_M5.json (2 moderate fixes needed)
- 🔧 PHASE_M6.json (3 moderate fixes needed)
- 🔧 PHASE_M7.json (1 moderate fix needed)
- 🔧 PHASE_M8.json (2 moderate fixes needed)
- 🔧 PHASE_M9.json (1 moderate fix needed)
- 🔧 README.md (1 minor fix needed)

**Status:** Context files created ✅. Phase PRD fixes documented and ready to apply.

---

**Next Step:** Apply all fixes to phase PRD JSON files systematically.
