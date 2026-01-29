# Phase 1 Handoff & Phase 2 Preparation

## 1. Manual Testing Checklist for Phase 1

### Prerequisites
- Dev server running (`npm run dev`)
- ANTHROPIC_API_KEY set in Convex dashboard (for AI features)
- Test accounts: coach user, parent user with linked child

### Coach Flow Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **Voice Note → Summary** | 1. Login as coach<br>2. Go to Voice Notes<br>3. Record note mentioning a player<br>4. Wait for AI processing | Summary appears in "Pending Parent Summaries" section |
| **View Pending Summary** | 1. See pending summaries list<br>2. Check player name, AI summary content | Shows player info, confidence indicator |
| **Expand Original Insight** | 1. Click expand/collapse on summary card<br>2. View original insight | Shows coach's private insight (title, description) |
| **Approve Summary** | 1. Click "Approve" button<br>2. Observe toast notification | Summary removed from pending, toast shows success |
| **Suppress Summary** | 1. Click "Don't Share" button<br>2. Observe toast notification | Summary removed from pending, toast shows success |

### Parent Flow Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **Unread Badge** | 1. Login as parent<br>2. Check navigation sidebar | Shows badge with unread count (or hidden if 0) |
| **Coach Feedback Section** | 1. Navigate to parent dashboard<br>2. Find "Coach Feedback" section | Shows grouped summaries by child, then by sport |
| **View Summary** | 1. Click on an unread summary<br>2. Observe NEW badge | Summary content visible, NEW badge disappears |
| **Grouped Display** | 1. View summaries for multi-sport child | Summaries grouped under sport headers |

### Edge Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **No Pending Summaries** | 1. Approve/suppress all summaries<br>2. Check pending section | Empty state or section hidden |
| **No Summaries for Parent** | 1. Login as parent with no approved summaries | Empty state message in Coach Feedback |
| **Injury/Behavior Insight** | 1. Create voice note about injury<br>2. Check classification | Should be flagged, requires manual review |

---

## 2. Push to Remote Feature Branch

### Current State
```
Branch: ralph/coach-parent-summaries-phase1
Commits: 15 (clean history)
Stashes: None
Uncommitted: Only tracking files (session-history.txt, insights/)
```

### Commands to Push
```bash
# Ensure clean state (optional - commit tracking files)
git add scripts/ralph/session-history.txt scripts/ralph/insights/
git commit -m "chore: Update session history and insights for Phase 1"

# Push to remote
git push -u origin ralph/coach-parent-summaries-phase1

# Create PR (optional - if ready for review)
gh pr create --title "feat: Coach-Parent AI Summaries - Phase 1" \
  --body "## Summary
- AI-powered coach-to-parent communication pipeline
- Voice notes trigger AI summary generation
- Coach approval workflow before parent delivery
- Parent viewing with unread tracking

## Stories Completed
30 of 30 user stories (100%)

## Test Coverage
26 UAT tests created (pending auth fixture setup)

🤖 Generated with Ralph (autonomous coding agent)"
```

---

## 3. Insights to Retain for Phase 2

### Critical Patterns Learned

**From progress.txt - Codebase Patterns section:**
```
- NEVER use `.filter()` - always use `.withIndex()`
- All functions need `args` and `returns` validators
- Use `Id<"tableName">` types, not `string`
- Actions cannot access `ctx.db` - use `ctx.runQuery`/`ctx.runMutation`
- User object: `user._id` (Convex ID) vs `user.userId` (Better Auth ID)
- VoiceNote uses `coachId` (string) and `orgId` (string), not typed IDs
```

**Phase 1 Specific Learnings:**
```
- authComponent.safeGetAuthUser(ctx) for authenticated mutations
- guardianIdentities uses by_userId index (not by_user)
- For OR conditions on indexed fields, query each value separately and combine
- Biome enforces: no non-null assertions, no shadowed variables, block statements
- React hooks cannot be called inside .map() - violates rules of hooks
```

### Files Ralph Will Modify in Phase 2

Phase 2 builds directly on Phase 1 code:
- `packages/backend/convex/schema.ts` - Add coachTrustLevels table
- `packages/backend/convex/models/coachParentSummaries.ts` - Hook trust metrics into approve/suppress
- `apps/web/.../voice-notes/voice-notes-dashboard.tsx` - Add trust indicator
- New files for trust components

---

## 4. Phase 2 Setup Checklist

### Before Starting Ralph

1. **Create new branch from Phase 1**
   ```bash
   git checkout ralph/coach-parent-summaries-phase1
   git checkout -b ralph/coach-parent-summaries-p2
   ```

2. **Copy Phase 2 PRD to prd.json**
   ```bash
   cp scripts/ralph/prds/coach-parent-summaries-phase2.prd.json scripts/ralph/prd.json
   ```

3. **Reset progress.txt** (keep Codebase Patterns, clear iteration entries)
   - Keep the "Codebase Patterns" section at the top
   - Clear all iteration entries below
   - Add Phase 1 learnings relevant to Phase 2

4. **Clear insights folder**
   ```bash
   rm -rf scripts/ralph/insights/*
   ```

5. **Clear session history** (optional - start fresh)
   ```bash
   echo "# Ralph Session History\n# Tracks Claude conversation IDs for each iteration\n---" > scripts/ralph/session-history.txt
   ```

6. **Verify Phase 1 code is available**
   - Ralph needs to see the Phase 1 code to modify it
   - Run `npm run check-types` to ensure build is clean

---

## 5. Improvements for Next Ralph Run

### Process Improvements

| Issue in Phase 1 | Improvement for Phase 2 |
|------------------|------------------------|
| CODE REVIEW FEEDBACK added mid-run | Start Quality Monitor BEFORE Ralph begins |
| Type errors detected after multiple commits | Quality Monitor should check after EACH commit |
| PRD Auditor ran at end | Run PRD Auditor periodically (every 5-10 stories) |
| UAT tests created but skipped | Create auth fixtures BEFORE starting |

### Agent Coordination Plan

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (You)                        │
│  - Starts all agents                                         │
│  - Monitors overall progress                                 │
│  - Intervenes if agents report critical issues               │
└─────────────────────────────────────────────────────────────┘
         │
         ├──▶ Ralph (Primary Implementer)
         │      - Runs ./scripts/ralph/ralph.sh
         │      - Implements stories from PRD
         │      - Documents progress in progress.txt
         │
         ├──▶ Quality Monitor (Continuous)
         │      - Runs npm run check-types after each commit
         │      - Runs npx ultracite fix
         │      - Adds feedback to progress.txt if issues
         │      - Alerts orchestrator of critical failures
         │
         ├──▶ PRD Auditor (Periodic - every 5 stories)
         │      - Verifies acceptance criteria met
         │      - Updates PRD_AUDIT_REPORT.md
         │      - Flags stories that claim "passes: true" but don't
         │
         └──▶ UAT Test Agent (After each major section)
               - Creates tests as features are implemented
               - Groups tests by backend/frontend sections
               - Updates test files incrementally
```

### Monitoring Commands

```bash
# Watch Ralph's commits
watch -n 30 'git log --oneline -5'

# Watch for type errors
watch -n 60 'npm run check-types 2>&1 | tail -20'

# Watch progress.txt updates
watch -n 30 'tail -50 scripts/ralph/progress.txt'
```

---

## 6. Pre-Phase 2 Verification

Run these checks before starting Phase 2:

```bash
# 1. Verify Phase 1 build is clean
npm run check-types

# 2. Verify all Phase 1 stories are passing
jq '.userStories | map(select(.passes == false)) | length' scripts/ralph/prd.json
# Should output: 0

# 3. Verify Phase 2 PRD is ready
jq '.userStories | length' scripts/ralph/prds/coach-parent-summaries-phase2.prd.json
# Should output: 20

# 4. Create and switch to Phase 2 branch
git checkout -b ralph/coach-parent-summaries-p2
```

---

## Summary

**Manual Testing**: 10 core tests covering coach approval flow and parent viewing flow

**Push Strategy**: Clean push to `ralph/coach-parent-summaries-phase1`, optionally create PR

**Phase 2 Dependencies**: Phase 2 modifies Phase 1 code (approveSummary, suppressSummary hooks)

**Agent Improvements**:
- Start monitoring BEFORE Ralph begins
- Quality checks after EACH commit
- Periodic PRD audits (not just at end)
- Incremental UAT test creation

**Key Insight**: The 4-agent system worked well but timing was off. Start all agents simultaneously and have them monitor continuously rather than intervening reactively.
