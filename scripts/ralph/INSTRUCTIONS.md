# Running Ralph for Issue #371 - Onboarding Implementation

This guide covers running Ralph to implement the Universal Onboarding System (Issue #371).

## Overview

Ralph is an autonomous AI agent that implements PRD user stories iteratively. For issue #371, we have **8 phases** with **80 user stories** total:

| Phase | File | Stories | Description |
|-------|------|---------|-------------|
| 1 | `phase-1-foundation.prd.json` | 7 | Bug fixes (#297, #327), OnboardingOrchestrator |
| 1B | `phase-1b-invitation-lifecycle.prd.json` | 8 | Expired invitation UX |
| 2 | `phase-2-gdpr.prd.json` | 8 | GDPR consent system |
| 3 | `phase-3-child-linking.prd.json` | 10 | Child linking, admin tools |
| 4 | `phase-4-notifications.prd.json` | 9 | Real-time toast notifications |
| 5 | `phase-5-first-user.prd.json` | 12 | First user setup wizard |
| 6 | `phase-6-polish.prd.json` | 15 | Error handling, scheduled jobs |
| 7 | `phase-7-graduation.prd.json` | 11 | Player graduation (LOW PRIORITY) |

---

## Prerequisites

Before starting, verify you have:

```bash
# Check Claude Code CLI is installed
claude --version

# Check jq is installed (for JSON parsing)
jq --version

# Check you're in the PDP repo
pwd  # Should be /Users/jkobrien/code/PDP (or similar)
```

---

## Step 1: Set Up the Phase PRD

Ralph expects a single `prd.json` file. Copy the phase you want to run:

```bash
# For Phase 1 (start here - fixes critical bugs)
cp scripts/ralph/features/371/phase-1-foundation.prd.json scripts/ralph/prd.json

# Verify it copied
cat scripts/ralph/prd.json | jq '.project, .branchName'
```

**Phase order recommendation:** 1 → 1B → 2 → 3 → 4 → 5 → 6 → 7

---

## Step 2: Restore prompt.md (One-time Setup)

The prompt.md file was archived. Restore it:

```bash
cp scripts/ralph/archive/2026-01-28-pre-issue-371-cleanup/prompt.md scripts/ralph/prompt.md
```

---

## Step 3: Validate the PRD

Run the validation script to check task sizing:

```bash
./scripts/ralph/validate-prd.sh
```

Expected output shows story analysis with any warnings about task complexity.

---

## Step 4: Run Preflight Check

This ensures you're on the correct branch:

```bash
./scripts/ralph/preflight.sh
```

This will:
- Check that `prd.json` exists
- Read the `branchName` from the PRD
- Create/switch to that branch if needed

---

## Step 5: Initialize Progress File

Reset progress.txt for the new phase:

```bash
echo "# Ralph Progress Log - Phase 1" > scripts/ralph/progress.txt
echo "Started: $(date)" >> scripts/ralph/progress.txt
echo "---" >> scripts/ralph/progress.txt
```

---

## Step 6: Start Monitoring Agents (Terminal 1)

Open a terminal and start the background agents:

```bash
cd /Users/jkobrien/code/PDP/scripts/ralph/agents
./start-all.sh
```

This starts 4 agents:
- Quality Monitor
- PRD Auditor
- Documenter
- Test Runner

Monitor their output:

```bash
tail -f scripts/ralph/agents/output/*.log
```

---

## Step 7: Start Ralph (Terminal 2)

In a new terminal, run Ralph with the number of iterations:

```bash
cd /Users/jkobrien/code/PDP
./scripts/ralph/ralph.sh 20
```

The `20` means max 20 iterations. Ralph will stop earlier if all stories complete.

---

## Step 8: Monitor Progress (Terminal 3)

Open another terminal for the live monitor:

```bash
./scripts/ralph/monitor.sh
```

This shows:
- PRD completion status
- Recent git commits
- Progress log updates
- Active session status

---

## Step 9: Additional Monitoring (Optional Terminals)

### Watch progress.txt updates:
```bash
tail -f ./scripts/ralph/progress.txt
```

### Watch git commits:
```bash
watch -n 2 'git log --oneline -5'
```

### Watch story completion:
```bash
watch -n 2 'jq ".userStories[] | select(.passes==true) | .id" ./scripts/ralph/prd.json'
```

---

## Step 10: Stopping Ralph

When done (or to pause):

### 1. Wait for current iteration to complete (recommended)
Ralph commits between iterations, so let it finish cleanly.

### 2. Stop the agents:
```bash
cd /Users/jkobrien/code/PDP/scripts/ralph/agents
./stop-all.sh
```

### 3. Close monitor terminals
Press `Ctrl+C` in each monitoring terminal.

---

## Moving to Next Phase

When a phase completes (all stories `passes: true`):

1. **Commit any remaining changes**
2. **Archive the completed phase** (optional):
   ```bash
   mkdir -p scripts/ralph/archive/$(date +%Y-%m-%d)-phase-1-complete
   cp scripts/ralph/prd.json scripts/ralph/archive/$(date +%Y-%m-%d)-phase-1-complete/
   cp scripts/ralph/progress.txt scripts/ralph/archive/$(date +%Y-%m-%d)-phase-1-complete/
   ```
3. **Copy the next phase PRD**:
   ```bash
   cp scripts/ralph/features/371/phase-1b-invitation-lifecycle.prd.json scripts/ralph/prd.json
   ```
4. **Run preflight** for new branch:
   ```bash
   ./scripts/ralph/preflight.sh
   ```
5. **Reset progress.txt** for new phase
6. **Start Ralph again**

---

## Troubleshooting

### Ralph keeps failing on same story
- Story might be too large - check the PRD for complexity
- Review `progress.txt` for error patterns
- Manually intervene and fix, then let Ralph continue

### Quality checks failing
```bash
# Run manually to see errors
npm run check-types
npx ultracite fix
npm run check
```

### Check story status
```bash
jq '.userStories[] | {id, title, passes}' scripts/ralph/prd.json
```

### Check agent logs
```bash
cat scripts/ralph/agents/output/*.log
```

### View Ralph's learnings
```bash
cat scripts/ralph/progress.txt
```

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Validate PRD | `./scripts/ralph/validate-prd.sh` |
| Preflight check | `./scripts/ralph/preflight.sh` |
| Start agents | `./scripts/ralph/agents/start-all.sh` |
| Run Ralph (20 iter) | `./scripts/ralph/ralph.sh 20` |
| Monitor progress | `./scripts/ralph/monitor.sh` |
| Stop agents | `./scripts/ralph/agents/stop-all.sh` |
| Check story status | `jq '.userStories[] \| {id, passes}' scripts/ralph/prd.json` |
| View progress | `cat scripts/ralph/progress.txt` |

---

## Important Notes

1. **Dev server should be running** on port 3000 for browser testing
2. **Each iteration is a fresh Claude context** - progress persists via git + progress.txt
3. **Small tasks work best** - each story should be completable in one context
4. **Monitor the first few iterations** to ensure Ralph is working correctly
5. **Phases have dependencies** - complete them in order (1 → 1B → 2 → etc.)

---

## Terminal Layout Suggestion

```
┌─────────────────────────────────────┬─────────────────────────────────────┐
│ Terminal 1: Ralph (main)            │ Terminal 2: Monitor                 │
│ ./scripts/ralph/ralph.sh 20         │ ./scripts/ralph/monitor.sh          │
├─────────────────────────────────────┼─────────────────────────────────────┤
│ Terminal 3: Progress                │ Terminal 4: Git log                 │
│ tail -f scripts/ralph/progress.txt  │ watch -n 2 'git log --oneline -5'   │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

Good luck with the implementation!
