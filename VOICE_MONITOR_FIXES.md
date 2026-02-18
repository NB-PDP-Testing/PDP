# Voice Monitoring Fixes - Complete

## ✅ Fixes Applied (2026-02-18)

### 1. Coach and Org Names in Artifacts Grid ✅

**Issue**: Artifacts table showing truncated IDs instead of human-readable names

**Fix Applied**:
- **Backend** (`packages/backend/convex/models/voiceNoteArtifacts.ts`):
  - Modified `getPlatformArtifacts` query to batch-fetch users and orgs using Better Auth adapter
  - Added `coachName` and `orgName` enriched fields to return validator
  - Implemented N+1 prevention pattern with Map lookups
- **Frontend** (`apps/web/src/app/platform/voice-monitoring/artifacts/page.tsx`):
  - Updated lines 211-215 to display enriched names instead of IDs
  - Changed from `artifact.senderUserId.slice(0, 10)` to `artifact.coachName || "Unknown"`
  - Changed from `orgCandidates[0]?.organizationId.slice(0, 10)` to `artifact.orgName || "—"`

**Result**: Artifacts grid now shows "Neil Barlow" and "Grange Armagh" instead of truncated IDs.

---

### 2. Pipeline Page Validator Error ✅

**Issue**: `getFailedArtifacts` throwing validator error about extra field `pageStatus`

**Fix Applied** (`packages/backend/convex/models/voicePipelineEvents.ts`, lines 457-469):
- Updated return validator to include missing optional fields:
  - `pageStatus: v.optional(v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()))`
  - `splitCursor: v.optional(v.union(v.string(), v.null()))`
- These fields are automatically added by Convex `.paginate()` method

**Result**: Pipeline page loads without validator errors.

---

### 3. Settings Page Placeholder ✅

**Issue**: Settings page showing outdated "Coming in Phase M9" message

**Fix Applied** (`apps/web/src/app/platform/voice-monitoring/settings/page.tsx`):
- Removed "Coming in Phase M9" placeholder
- Updated with proper messaging:
  - "Settings and configuration options for voice monitoring"
  - "Additional configuration options coming soon"

**Result**: Settings page shows appropriate placeholder for future work.

---

### 4. Metrics Page Loading State ✅

**Issue**: Metrics page stuck in skeleton loading state

**Root Cause**: Queries were being skipped when `user` was `undefined` (loading), not just when `user === null` (not authenticated)

**Fix Applied** (`apps/web/src/app/platform/voice-monitoring/metrics/page.tsx`, lines 157-195):
- Added proper skip logic:
  ```typescript
  const shouldSkip = user === null || (user !== undefined && !isPlatformStaff);
  ```
- Changed all query calls from `isPlatformStaff ? {} : "skip"` to `shouldSkip ? "skip" : {}`
- This allows queries to run once auth resolves, instead of staying skipped forever

**Note**: The metrics page will show zeros if no voice notes have been processed through the v2 pipeline yet. This is expected behavior - the cron jobs are configured and will populate data once v2 pipeline is active.

**Result**: Metrics page loads and displays data (or zeros if no data yet) instead of infinite skeleton state.

---

### 5. Metrics Page Duplicate Key Error ✅

**Issue**: React warning about duplicate keys when rendering throughput chart

**Root Cause**: Multiple data points with the same time label (e.g., "04:00 PM" on different days) caused duplicate keys

**Fix Applied** (`apps/web/src/app/platform/voice-monitoring/metrics/page.tsx`, line 50):
- Changed from `key={item.label}` to `key={`${item.label}-${index}`}`
- This ensures unique keys even when time labels repeat across days

**Result**: Duplicate key warning eliminated after browser hard refresh.

---

### 6. Interactive Graph Enhancements ✅

**Issue**: Missing interactive features per PRD requirements

**Requirements from PRD:**
1. Pipeline flow graph boxes should be clickable (open drill-down modal)
2. Cost trend should be area chart with gradient (not line chart)
3. Latency by stage should be stacked bars (not individual bars)

**Fixes Applied:**

**6a. Clickable Pipeline Flow Graph**
- **File**: `apps/web/src/app/platform/voice-monitoring/_components/pipeline-flow-graph.tsx`
- Added `onStageClick` prop to PipelineFlowGraph component
- Wrapped stage rectangles in clickable `<g>` elements with cursor pointer
- Added `pointerEvents="none"` to text elements to prevent click interference
- Applied to both desktop (horizontal) and mobile (vertical) layouts

- **File**: `apps/web/src/app/platform/voice-monitoring/pipeline/page.tsx`
- Fixed `Date.now()` infinite loop by using `useState(() => Date.now())`
- Added `handleFlowGraphStageClick` function to map flow graph stage IDs to breakdown data
- Wired up click handler to PipelineFlowGraph component
- Modified handler to **always open modal** even when no stage data exists yet
- Added "No data available yet" message in StageDrillDown component when `count === 0`
- Clicking a stage box now opens the drill-down modal with stage details or helpful message

**6b. Area Chart with Gradient for Cost Trend**
- **File**: `apps/web/src/app/platform/voice-monitoring/metrics/page.tsx` (lines 140-182)
- Created new `AreaChart` component using SVG path and linearGradient
- Gradient transitions from 30% opacity at top to 5% at bottom
- Replaced LineChart with AreaChart for cost trend visualization

**6c. Stacked Bar Chart for Latency by Stage**
- **File**: `apps/web/src/app/platform/voice-monitoring/metrics/page.tsx` (lines 84-138)
- Created new `StackedBarChart` component showing cumulative latency
- Each stage displayed as colored segment in horizontal stacked bar
- Added color-coded legend showing individual stage latencies
- Shows total end-to-end latency at bottom
- Distinct colors per stage: blue, violet, pink, orange, emerald, cyan

**6d. Fixed Date.now() Infinite Loop**
- **Files affected**:
  - `apps/web/src/app/platform/voice-monitoring/metrics/page.tsx`
  - `apps/web/src/app/platform/voice-monitoring/pipeline/page.tsx`
  - `apps/web/src/app/platform/voice-monitoring/page.tsx` (Overview)
- **Problem**: Calling `Date.now()` on every render caused infinite re-subscription loop
- **Fix**: Changed `const now = Date.now()` to `const [now] = useState(() => Date.now())`
- **Result**: Pages now render correctly instead of showing skeleton loaders indefinitely

**Result**: All PRD-specified interactive graph features now implemented.

**Testing Confirmation**:
- Tested with dev-browser automation tool
- 10 clickable stages detected (5 desktop + 5 mobile)
- Modal opens on click with correct stage title
- Shows "No data available yet" message when metrics are zero
- Screenshot saved to `tmp/modal-opened.png`

**Important**: Users must **hard refresh browser** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) to see the latest JavaScript changes. The modal will not work with cached code.

---

## Events Tab Chevron

**Status**: Requires Testing

The Events tab chevron code looks correct (lines 69-114 in `events/page.tsx`):
- Clicking row toggles `expanded` state
- Chevron changes from `ChevronRight` to `ChevronDown` when expanded
- Expanded row shows event metadata as JSON and error messages

**Likely causes if not working**:
1. Events might have null/undefined metadata (would show empty expanded section)
2. No events in database yet
3. Need to test with actual event data

**To verify**: Click a row in the Events tab and check if expanded content appears below.

---

## Summary

| Issue | Status | Files Modified |
|-------|--------|----------------|
| Coach/Org Names | ✅ Fixed | voiceNoteArtifacts.ts, artifacts/page.tsx |
| Pipeline Validator | ✅ Fixed | voicePipelineEvents.ts |
| Settings Placeholder | ✅ Fixed | settings/page.tsx |
| Metrics Loading | ✅ Fixed | metrics/page.tsx |
| Metrics Duplicate Keys | ✅ Fixed | metrics/page.tsx |
| Interactive Graphs | ✅ Fixed | pipeline-flow-graph.tsx, pipeline/page.tsx, metrics/page.tsx |
| Date.now() Infinite Loop | ✅ Fixed | metrics/page.tsx, pipeline/page.tsx, page.tsx (Overview) |
| Clickable Flow Graph | ✅ Fixed & Tested | pipeline-flow-graph.tsx, pipeline/page.tsx |
| Events Chevron | ⏳ Needs Testing | - |

All backend changes deployed with `npx convex dev --once`.

**Note**: Interactive features require hard browser refresh (Cmd+Shift+R / Ctrl+Shift+R) to see changes.
