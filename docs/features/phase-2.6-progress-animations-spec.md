# Phase 2.6: Professional Progress Animations - Implementation Spec

**Status**: Ready for Ralph
**Branch**: `ralph/phase-2.6-progress-animations`
**PRD**: `scripts/ralph/prd.json`
**Estimated Effort**: 7-11 hours

---

## Overview

Complete the missing professional progress animations from Phase 2.5. This phase adds real-time feedback during imports:

1. **Live stats counter** - Real-time record counts
2. **Current operation display** - Show which player is being processed
3. **Smooth animations** - No jarring progress jumps
4. **Enhanced error collection** - Errors appear as they occur

---

## Architecture

### Backend: Progress Tracker Pattern

Since Convex mutations can't stream data, we use a **polling pattern**:

1. Create `importProgressTrackers` table
2. Import mutation writes progress updates to tracker every 10-20 records
3. Frontend polls tracker query every 500ms during active import
4. Cleanup tracker on completion

**Schema**:
```typescript
importProgressTrackers: defineTable({
  sessionId: v.id("importSessions"),
  stats: v.object({
    playersCreated: v.number(),
    guardiansCreated: v.number(),
    enrollmentsCreated: v.number(),
    passportsCreated: v.number(),
    totalPlayers: v.number(),
  }),
  currentOperation: v.string(), // "Creating identity for Emma Walsh"
  errors: v.array(v.object({
    rowNumber: v.number(),
    playerName: v.string(),
    error: v.string(),
    timestamp: v.number(),
  })),
  phase: v.string(), // "preparing" | "importing" | "completed" | "failed"
  percentage: v.number(),
  updatedAt: v.number(),
})
  .index("by_sessionId", ["sessionId"])
```

### Frontend: Polling + Animations

**Components**:
- `import-step.tsx` - Main orchestrator
- `LiveStatsCard` (new) - Stats display
- `CurrentOperationDisplay` (new) - Operation text
- `AnimatedProgressBar` (new) - Smooth progress with framer-motion
- `ErrorCollectionUI` (new) - Collapsible error list

**Polling Hook**:
```typescript
// Poll every 500ms during active import
const progressTracker = useQuery(
  api.importProgressTrackers.getBySessionId,
  isImporting ? { sessionId } : "skip"
);

useEffect(() => {
  if (progressTracker) {
    setStats(progressTracker.stats);
    setCurrentOperation(progressTracker.currentOperation);
    setErrors(progressTracker.errors);
    setProgress(progressTracker.percentage);
  }
}, [progressTracker]);
```

---

## User Stories

### US-P2.6-001: Live Stats Counter ⏳

**Goal**: Display real-time record counts during import

**Backend Changes**:
- Add `yieldProgress()` helper in `playerImport.ts`
- Update tracker every 10-20 records
- Write: `{ playersCreated, guardiansCreated, enrollmentsCreated, passportsCreated }`

**Frontend Changes**:
- Create `LiveStatsCard` component
- Display: `Players: 45/120 • Guardians: 38/120 • Enrollments: 45/120 • Passports: 45/120`
- Update smoothly via polling

**Acceptance**: Stats update in real-time, match final counts

---

### US-P2.6-002: Current Operation Display ⏳

**Goal**: Show which player is currently being processed

**Backend Changes**:
- Set `currentOperation` before processing each player
- Format: `"Creating identity for [FirstName LastName]"`

**Frontend Changes**:
- Create `CurrentOperationDisplay` component
- Display: `Currently: Creating identity for Emma Walsh`
- Fade transition between names (framer-motion AnimatePresence)

**Acceptance**: Operation text updates smoothly, shows last player on completion

---

### US-P2.6-003: Smooth Progress Bar Animations ⏳

**Goal**: Animate progress bar transitions between percentages

**Backend Changes**:
- Update tracker percentage field

**Frontend Changes**:
- Wrap `<Progress>` in `motion.div`
- Add transition: `{{ duration: 0.5, ease: 'easeInOut' }}`
- Use `transform: scaleX()` for performance
- Add loading shimmer effect (subtle gradient)
- Color transitions: blue (0-50%) → green (50-100%)
- Completion: pulse animation
- Error: shake animation

**Acceptance**: Progress animates smoothly at 60fps, no jank

---

### US-P2.6-004: Enhanced Error Collection UI ⏳

**Goal**: Show errors as they occur during import

**Backend Changes**:
- Append errors to tracker as they occur
- Include: `{ rowNumber, playerName, error, timestamp }`

**Frontend Changes**:
- Create `ErrorCollectionUI` component
- Collapsible section: `Errors (3)` badge
- Scrollable error list (max-height: 200px)
- Each error: `Row #X: [PlayerName] - [Error message]`
- New errors fade in (framer-motion)
- Auto-scroll to bottom on new error

**Acceptance**: Errors appear in real-time, scrollable, mobile responsive

---

### US-P2.6-005: Progress Tracker Cleanup & Integration ⏳

**Goal**: Complete schema, cleanup logic, and wizard integration

**Backend Changes**:
- Add `importProgressTrackers` table to schema
- Add `getProgressTracker` query
- Add `cleanupProgressTracker` mutation
- Call cleanup on import completion/failure
- Optional: cron job to delete stale trackers (>1 hour old)

**Frontend Changes**:
- Poll `getProgressTracker` every 500ms during import
- Stop polling when `phase = 'completed' | 'failed'`
- Show loading skeleton until first update
- Handle missing tracker gracefully (fallback to basic progress)

**Acceptance**: All components integrated, no table bloat, mobile responsive

---

## UX Principles

1. **Smooth, not flashy** - Animations should feel natural, not gimmicky
2. **60fps target** - All animations run smoothly on mid-range devices
3. **Informative, not distracting** - Stats provide value without overwhelming
4. **Mobile-first** - Components stack vertically, no horizontal scroll
5. **Graceful degradation** - If polling fails, fall back to basic progress

---

## Technical Constraints

### Convex Limitations

1. **No streaming** - Mutations can't stream data to frontend
   - **Solution**: Polling pattern with progress tracker table

2. **Mutation timeout** - 60 seconds max
   - **Solution**: Write progress updates within mutation, not via scheduler

3. **Query costs** - Polling every 500ms increases function calls
   - **Solution**: Only poll during active import (stop when complete)

### Performance Considerations

1. **Progress update frequency** - Every 10-20 records is optimal
   - Too frequent: slows mutation
   - Too infrequent: jerky updates

2. **Polling interval** - 500ms balances responsiveness with cost
   - Faster: smoother updates, higher query cost
   - Slower: cheaper, less smooth

3. **Animation performance** - Use `transform` instead of `width`
   - `transform: scaleX()` is GPU-accelerated
   - Changing `width` triggers layout reflow (slower)

---

## Testing Strategy

### Manual Testing

1. **Small import** (3 records) - Verify stats/operation updates appear
2. **Medium import** (50 records) - Verify smooth animation at scale
3. **Large import** (500 records) - Verify no performance degradation
4. **Error import** (messy data) - Verify errors appear in real-time
5. **Mobile viewport** (375px) - Verify responsive layout

### Edge Cases

1. **Mutation timeout** - Progress tracker persists, can resume
2. **Browser refresh mid-import** - Poll resumes, shows current state
3. **Stale tracker** - Cleanup cron removes old trackers
4. **Missing tracker** - Fallback to basic progress

---

## Known Limitations

1. **No true streaming** - Polling introduces 0-500ms lag
   - Acceptable trade-off given Convex constraints
   - Future: Could use WebSocket if Convex adds support

2. **Query cost** - Polling increases Convex function calls
   - Mitigated by only polling during active import
   - Estimated cost: ~120 queries per 60-second import (500ms × 120)

3. **Concurrency** - If user runs multiple imports, each creates separate tracker
   - Acceptable: imports should be sequential anyway
   - Cleanup cron prevents tracker bloat

---

## Success Metrics

After implementation:

- [ ] Users see live stats during import (not just "Loading...")
- [ ] Progress bar animates smoothly (no jumps)
- [ ] Errors visible immediately (don't have to wait for completion)
- [ ] Import feels faster (psychological effect of detailed feedback)
- [ ] No performance regressions (imports complete in same time)

---

## Files to Create/Modify

### Backend
- ✏️ **Modify**: `packages/backend/convex/models/playerImport.ts`
  - Add progress tracker writes
  - Add `yieldProgress()` helper
  - Update `currentOperation` field

- ✏️ **Modify**: `packages/backend/convex/schema.ts`
  - Add `importProgressTrackers` table

- ✨ **Create**: `packages/backend/convex/models/importProgressTrackers.ts`
  - `getProgressTracker` query
  - `cleanupProgressTracker` mutation

- ✏️ **Modify**: `packages/backend/convex/crons.ts` (optional)
  - Add cleanup cron for stale trackers

### Frontend
- ✏️ **Modify**: `apps/web/src/components/import/steps/import-step.tsx`
  - Add polling logic
  - Integrate new components

- ✨ **Create**: `apps/web/src/components/import/progress/live-stats-card.tsx`
  - Stats display component

- ✨ **Create**: `apps/web/src/components/import/progress/current-operation-display.tsx`
  - Operation text with fade animation

- ✨ **Create**: `apps/web/src/components/import/progress/animated-progress-bar.tsx`
  - Smooth progress bar with framer-motion

- ✨ **Create**: `apps/web/src/components/import/progress/error-collection-ui.tsx`
  - Collapsible error list

---

**Ready for Ralph**: ✅ All context files exist, schema ready, PRD validated
