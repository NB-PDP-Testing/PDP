# M5 Lessons Learned - Dashboard UI

**Phase:** M5 - Dashboard Overview UI
**Story:** US-VNM-008
**Date:** 2026-02-17
**Status:** Complete (with fixes)

---

## Executive Summary

Ralph delivered 70% of M5 requirements correctly in ~10-12 minutes. However, **4 critical functional requirements were missed**, requiring manual fixes (~30 minutes).

**Root Cause:** Implementation guide focused on architectural patterns but didn't capture all functional requirements from the PRD.

**Impact:** Delayed testing, required rework, wasted time.

**Prevention:** Updated process to ensure PRD functional requirements are captured in ADRs or implementation guides.

---

## What Went Wrong

### Gaps Delivered by Ralph

| Gap | PRD Requirement | Ralph Delivered | Impact |
|-----|----------------|-----------------|---------|
| **Card 1: Active Artifacts** | Query `getActiveArtifacts` for DB count | Math estimate: `received - completed - failed` | Incorrect count |
| **Card 2 & 3: Completed/Failed** | Show 24h estimates (`* 24`) | Showed 1h values with "Last hour" label | Misleading labels |
| **Card 4: Avg Latency** | Query `getHistoricalMetrics`, calculate average | Placeholder "--" with "Available in M7" | Missing functionality |
| **Card 6: Total Cost** | Calculate sum from events `aiCost` | Placeholder "--" with "Available in M7" | Missing functionality |

### Why Ralph Missed These

1. **ADR vs PRD Conflict**:
   - Ralph correctly prioritized ADRs over PRD for architectural decisions
   - ADRs focused on patterns (client components, query lifting, responsive design)
   - **But ADRs didn't include all functional requirements** (specific queries, calculations)
   - Ralph had no source of truth for "what data to display"

2. **Implementation Guide Gap**:
   - `m5-implementation-guide.md` showed 3 queries: `getRealTimeMetrics`, `getRecentEvents`, `getActiveAlerts`
   - **Missing:** `getActiveArtifacts`, `getHistoricalMetrics`
   - **Missing:** Calculation formulas (× 24 for estimates, sum for costs)
   - Ralph followed the guide perfectly but guide was incomplete

3. **Backend API Assumptions**:
   - Ralph assumed latency/cost data not available (marked "Available in M7")
   - **Reality:** M2 `getHistoricalMetrics` HAS latency data
   - **Reality:** Events already have `aiCost` metadata
   - Ralph didn't know these APIs existed

4. **Card Label Confusion**:
   - PRD says "Completed Today" but provides `artifactsCompleted1h` (1h counter)
   - Ralph chose literal interpretation: 1h data = 1h label (logical!)
   - PRD expected estimation: 1h × 24 = today estimate (not documented)

---

## Root Cause Analysis

### The Core Problem

**ADRs documented HOW to build (architecture), but not WHAT to build (functionality).**

**Example:**
- ✅ ADR-VNM-015: "Use 3 useQuery calls with skip pattern" (HOW)
- ❌ No ADR/guide: "Card 4 should query getHistoricalMetrics and calculate average" (WHAT)

**Result:** Ralph built the architecture perfectly but missed functional requirements.

### Why This Happened Twice

This is **NOT Ralph's fault**. The process gap is:

1. **PRD → ADR Translation**: We only translated architectural decisions to ADRs
2. **PRD Functional Requirements**: Were left in PRD JSON, not visible during implementation
3. **Implementation Guide**: Showed simplified examples, not full requirements

**Ralph had no single source of truth** for functional requirements during implementation.

---

## Lessons Learned

### 1. Functional Requirements MUST Be Documented

**Problem:** ADRs focused on architecture, not functionality.

**Solution:** Create "Implementation Requirements" section in implementation guide with:
- **All queries required** (with exact signatures)
- **All calculations required** (with formulas)
- **All data transformations** (with examples)
- **All labels and copy** (exact text)

**Example:**
```markdown
## Implementation Requirements

### Queries Required (5 total)
1. getRealTimeMetrics() → metrics
2. getRecentEvents({ filters: {}, paginationOpts: { numItems: 20, cursor: null } }) → events
3. getActiveAlerts() → alerts
4. **getActiveArtifacts({ paginationOpts: { numItems: 100, cursor: null } })** → activeArtifacts
5. **getHistoricalMetrics({ periodType: "hourly", startTime, endTime })** → historicalMetrics

### Status Card Calculations
- **Card 1:** activeArtifacts.page.length
- **Card 2:** metrics.artifactsCompleted1h × 24 (label: "Last 24 hours (est)")
- **Card 3:** metrics.artifactsFailed1h × 24 (label: "Last 24 hours (est)")
- **Card 4:** avg(historicalMetrics.map(m => m.avgEndToEndLatency)) (label: "End-to-end (24h avg)")
- **Card 5:** circuitBreakerState from alerts
- **Card 6:** sum(events.map(e => e.metadata.aiCost)) (label: "Pipeline AI costs (est)")
```

### 2. Implementation Guide Template Improvements

**Add these sections:**
1. **Backend APIs Required** - Full list with signatures
2. **Data Calculations** - Formulas and transformations
3. **UI Copy & Labels** - Exact text for all cards/sections
4. **Validation Checklist** - Before committing, verify all PRD requirements

### 3. PRD Review Process

**New Step:** Before Ralph starts, create "Functional Requirements Checklist" from PRD:

```markdown
## US-VNM-008 Functional Requirements Checklist

### Backend Queries (from PRD lines 198-202)
- [ ] getRealTimeMetrics
- [ ] getHistoricalMetrics (for latency card)
- [ ] getRecentEvents
- [ ] getActiveArtifacts (for active count)

### Status Cards (from PRD lines 99-126)
- [ ] Card 1: Active Artifacts (value: count from getActiveArtifacts)
- [ ] Card 2: Completed Today (value: artifactsCompleted1h × 24)
- [ ] Card 3: Failed Today (value: artifactsFailed1h × 24)
- [ ] Card 4: Avg Latency (value: avg from getHistoricalMetrics)
- [ ] Card 5: AI Service Status (value: circuit breaker state)
- [ ] Card 6: Total Cost (value: sum of aiCost from events)
```

This checklist goes in the implementation guide AND gets reviewed after Ralph's commit.

### 4. Post-Implementation Verification

**New Process:**
1. Ralph completes implementation
2. **Run automated gap check** comparing deliverables vs PRD checklist
3. Fix gaps before marking story complete

**Automated check script:**
```bash
# Check if all required queries are called
grep -q "getActiveArtifacts" apps/web/.../page.tsx || echo "MISSING: getActiveArtifacts"
grep -q "getHistoricalMetrics" apps/web/.../page.tsx || echo "MISSING: getHistoricalMetrics"
# etc.
```

---

## Process Improvements Implemented

### 1. Created M5_LESSONS_LEARNED.md (This File)

Documents all gaps, root causes, and prevention strategies.

### 2. Updated Implementation Guide Template

Added these sections to future guides:
- **Backend APIs Required** (full list with signatures)
- **Data Calculations & Transformations** (formulas with examples)
- **UI Copy & Labels** (exact text)
- **Pre-Commit Verification Checklist** (validate vs PRD)

### 3. Created PRD Functional Requirements Extraction Process

**Before Ralph starts any phase:**
1. Read PRD JSON fully
2. Extract ALL functional requirements (queries, calculations, labels)
3. Create "Functional Requirements Checklist"
4. Include in implementation guide OR create separate "Requirements.md"
5. Ralph uses this as source of truth alongside ADRs

### 4. Post-Commit Gap Check Script

Created `scripts/ralph/verify-prd-requirements.sh`:
- Takes PRD JSON and delivered files
- Checks for required queries, calculations, labels
- Reports gaps before marking story complete

---

## M5-Specific Patterns (Correctly Implemented)

These worked perfectly and should be reused in M6-M9:

### ✅ 5 Query Pattern (Fixed)

```typescript
// All queries at page level (NO queries in components)
const metrics = useQuery(api.models.voicePipelineMetrics.getRealTimeMetrics, isPlatformStaff ? {} : "skip");
const events = useQuery(api.models.voicePipelineEvents.getRecentEvents, isPlatformStaff ? { paginationOpts: { numItems: 20, cursor: null }, filters: {} } : "skip");
const alerts = useQuery(api.models.voicePipelineAlerts.getActiveAlerts, isPlatformStaff ? {} : "skip");
const activeArtifacts = useQuery(api.models.voicePipelineEvents.getActiveArtifacts, isPlatformStaff ? { paginationOpts: { numItems: 100, cursor: null } } : "skip");
const now = Date.now();
const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
const historicalMetrics = useQuery(api.models.voicePipelineMetrics.getHistoricalMetrics, isPlatformStaff ? { periodType: "hourly", startTime: twentyFourHoursAgo, endTime: now } : "skip");
```

### ✅ Status Card Calculations (Fixed)

```typescript
// Card 1: Active Artifacts (DB count, not math estimate)
const activeCount = activeArtifacts?.page?.length ?? 0;

// Card 2 & 3: 24h Estimates (multiply 1h by 24)
const completedToday = Math.round(metrics.artifactsCompleted1h * 24);
const failedToday = Math.round(metrics.artifactsFailed1h * 24);

// Card 4: Avg Latency (calculate from historical snapshots)
const avgLatency = historicalMetrics && historicalMetrics.length > 0
  ? historicalMetrics.reduce((sum, m) => sum + (m.avgEndToEndLatency ?? 0), 0) / historicalMetrics.length
  : 0;

// Card 6: Total Cost (sum from events)
const totalCost = events?.reduce((sum, e) => sum + (e.metadata?.aiCost ?? 0), 0) ?? 0;
```

### ✅ Component Prop Pattern

```typescript
// Pass ALL data as props (components have NO queries)
<StatusCards
  metrics={realTimeMetrics}
  alerts={activeAlerts}
  activeArtifacts={activeArtifactsResult?.page as any}
  historicalMetrics={historicalMetrics}
  recentEvents={recentEvents?.page as any}
/>
```

### ✅ Loading State Pattern

```typescript
// Each component handles undefined props with skeleton
export function StatusCards({ metrics, alerts, activeArtifacts, historicalMetrics, recentEvents }) {
  if (!metrics) return <StatusCardsSkeleton />;
  // Use data...
}
```

---

## Success Metrics

### Before Fixes
- **Architecture:** ✅ Perfect (client components, query lifting, responsive)
- **Functionality:** ❌ 70% complete (4 cards wrong, 2 placeholders)
- **Type Safety:** ✅ Perfect
- **Performance:** ✅ Perfect (no N+1)

### After Fixes
- **Architecture:** ✅ Perfect
- **Functionality:** ✅ 100% complete (all 6 cards working)
- **Type Safety:** ✅ Perfect
- **Performance:** ✅ Perfect (5 queries, all lifted)

### Time Cost
- **Ralph's Implementation:** ~10-12 minutes
- **Gap Discovery:** ~15 minutes (manual PRD comparison)
- **Gap Fixes:** ~30 minutes
- **Total:** ~55 minutes (vs ~45 minutes if done right first time)

**Lesson:** Spending 10 extra minutes on comprehensive implementation guide would have saved 40 minutes of rework.

---

## Recommendations for M6-M9

### Immediate Actions

1. **Before Ralph starts M6:**
   - Read PHASE_M6.json fully
   - Extract ALL queries, calculations, labels
   - Create "M6_FUNCTIONAL_REQUIREMENTS.md"
   - Include in implementation guide

2. **During M6 implementation:**
   - Ralph reads functional requirements alongside ADRs
   - Uses requirements as checklist
   - Marks off each requirement as implemented

3. **After Ralph commits M6:**
   - Run automated gap check
   - Manual PRD comparison (5 minutes)
   - Fix any gaps before testing

### Long-Term Improvements

1. **Standardize Implementation Guide Format:**
   - Section 1: Architecture (ADRs)
   - Section 2: Functional Requirements (queries, calculations, labels)
   - Section 3: Code Examples (complete, not simplified)
   - Section 4: Verification Checklist

2. **Create PRD → Requirements Extractor Tool:**
   - Script that reads PRD JSON
   - Outputs markdown checklist of all requirements
   - Auto-includes in implementation guide

3. **Post-Commit Validation:**
   - Automated check for required queries
   - Automated check for required calculations
   - Automated check for placeholder strings ("--", "Available in...")

---

## Conclusion

**What Went Right:**
- Ralph's architecture implementation was perfect
- Code quality, type safety, performance all excellent
- Speed was impressive (~10 minutes)

**What Went Wrong:**
- Functional requirements not documented in implementation guide
- Ralph had no source of truth for WHAT data to display
- Result: 4 missing features, 30 minutes of rework

**Key Insight:**
> **ADRs are great for HOW to build, but we also need documentation for WHAT to build.**

**Solution:**
> **Include functional requirements checklist in implementation guide alongside ADRs.**

**Expected Impact:**
- M6-M9 should have 0 functional gaps
- Ralph will know exactly what queries to call
- No more placeholder cards
- First-time-right implementation

---

**File:** `scripts/ralph/prds/voice-monitor-harness/context/M5_LESSONS_LEARNED.md`
**Updated:** 2026-02-17
**Author:** Claude Code (Gap Analysis & Fixes)
