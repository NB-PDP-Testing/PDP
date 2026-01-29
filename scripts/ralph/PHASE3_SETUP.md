# Phase 3 Setup Guide

## Status: Ready for Phase 3

Phase 2 (Trust Curve) is complete and pushed to `ralph/coach-parent-summaries-p2`.

## What's Been Done

### Phase 2 Completed Features
- **Trust Level System**: Full backend + frontend implementation
  - coachTrustLevels table with metrics tracking
  - Trust level calculation (0-3 levels with thresholds)
  - Automatic level progression on approvals
  - Coach preference settings (cap automation level)
- **UI Components**:
  - TrustLevelIndicator (full stats bar - available but not used in current UI)
  - TrustLevelIcon (compact icon with tooltip - displayed in header)
  - TrustNudgeBanner (shows when close to next level)
  - TrustPreferenceSettings (in Settings tab)
- **Integration**: Hooked into approveSummary/suppressSummary mutations

### Monitoring Agents Ready
Located in `scripts/ralph/agents/`:
- `quality-monitor.sh` - Runs type/lint checks every 60s
- `prd-auditor.sh` - Verifies completed stories
- `start-all.sh` - Starts both agents in background
- `stop-all.sh` - Stops all agents

### Ralph System Updated
- `ralph.sh` now checks `agents/output/feedback.md` before each iteration
- Agent feedback automatically appends to `progress.txt`
- Archive system preserves previous PRDs when branch changes

## To Start Phase 3

### 1. Create the PRD
Create `scripts/ralph/prd.json` with Phase 3 user stories.

The PRD should specify:
```json
{
  "project": "Coach-Parent AI Summaries - Phase 3",
  "branchName": "ralph/coach-parent-summaries-p3",
  "description": "...",
  "dependencies": {
    "phase2Branch": "ralph/coach-parent-summaries-p2"
  },
  "userStories": [...]
}
```

### 2. Start the Monitoring Agents (Optional)
In a separate terminal:
```bash
./scripts/ralph/agents/start-all.sh
```

Monitor output:
```bash
tail -f scripts/ralph/agents/output/*.log
```

### 3. Run Ralph
```bash
./scripts/ralph/ralph.sh 10
```

### 4. Monitor Progress
In another terminal:
```bash
./scripts/ralph/monitor.sh
```

## Phase 3 Suggestions

Based on Phase 2 completion, consider:

1. **Auto-Send System**
   - Implement "send to parents" button functionality
   - Auto-approve flow for Level 2+ coaches
   - Scheduled sending (e.g., end of week summary)

2. **Parent Notification Delivery**
   - Email delivery infrastructure
   - In-app notification system
   - Delivery status tracking

3. **Summary Templates**
   - Customizable summary templates
   - Per-organization branding
   - Sport-specific formatting

4. **Analytics Dashboard**
   - Coach performance metrics
   - Summary approval/suppress rates
   - Parent engagement tracking

## Key Learnings from Phase 2

- Use helper functions instead of `ctx.runMutation(internal.models.X.Y)` to avoid circular refs
- Biome aggressively removes unused imports - add import and usage together
- Better Auth userId is `user.userId`, not `user._id`
- Always use `.withIndex()`, never `.filter()`
- Convex codegen is source of truth for backend validity

## Files to Reference

- Phase 2 PRD: `scripts/ralph/archive/2026-01-20-coach-parent-summaries-p2/prd.json`
- Progress log: `scripts/ralph/progress.txt`
- Trust system docs: `docs/features/trust-curve-system.md`
