# ⚠️ IMPORTANT: Complete Agent System Setup Guide

**READ THIS FIRST** before running Ralph for autonomous development.

This guide sets up a **hybrid agent system** that provides comprehensive monitoring and intelligent analysis during Ralph's autonomous coding runs, with **zero manual intervention** required.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Bash Monitoring Agents](#part-1-bash-monitoring-agents)
4. [Part 2: Claude Code Automated Hooks](#part-2-claude-code-automated-hooks)
5. [Testing the Complete System](#testing-the-complete-system)
6. [Running Ralph with Full Automation](#running-ralph-with-full-automation)
7. [Troubleshooting](#troubleshooting)
8. [Cost & Performance](#cost--performance)

---

## System Overview

### The Hybrid Approach

We use **two complementary systems** working together:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  BASH AGENTS (Continuous Background Loops)      │
│  ├─ quality-monitor.sh (every 60s)              │
│  ├─ prd-auditor.sh (every 90s)                  │
│  ├─ documenter.sh (every 120s)                  │
│  ├─ security-tester.sh (every 120s)             │
│  └─ test-runner.sh (every 30s)                  │
│                                                 │
│  CLAUDE CODE HOOKS (Event-Triggered AI)         │
│  ├─ PostToolUse(Write) → Auto quality check    │
│  ├─ PostToolUse(Bash/commit) → Auto security   │
│  ├─ SessionStart #1 → Status check             │
│  ├─ SessionStart #2 → Auto-architect prompt    │
│  └─ SessionEnd → Summary                       │
│                                                 │
│  BOTH WRITE TO: feedback.md                     │
│                                                 │
│  Ralph reads feedback.md before each iteration  │
│  → Fixes issues automatically                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Why Both?

**Bash Agents:**
- ✅ Fast (catch issues in 30-120 seconds)
- ✅ Free (no API costs)
- ✅ Simple pattern matching
- ✅ Continuous monitoring
- ✅ Live dashboards

**Claude Code Hooks:**
- ✅ Intelligent (understands context)
- ✅ Deep analysis (beyond patterns)
- ✅ Automatic (no manual commands)
- ✅ Immediate (triggers on events)
- ✅ Free (if on Max plan, uses session)

**Together:** Comprehensive quality assurance with zero manual intervention.

---

## Prerequisites

### Required

- ✅ Ralph PRD created at `scripts/ralph/prd.json`
- ✅ Claude Code installed and working
- ✅ Project has bash monitoring agents in `scripts/ralph/agents/`
- ✅ jq installed: `brew install jq` (for JSON parsing)

### Recommended

- ✅ Claude Code Max plan (for unlimited hook triggers)
- ✅ Terminal multiplexer (tmux/screen) for monitoring
- ✅ Git repo initialized

---

## Part 1: Bash Monitoring Agents

These run continuously in background loops, providing fast feedback.

### 1.1 Verify Agents Exist

Check that you have the 5 core agents:

```bash
ls scripts/ralph/agents/*.sh
```

Should see:
- `quality-monitor.sh` - Type/lint checks every 60s
- `prd-auditor.sh` - Story verification every 90s
- `documenter.sh` - Documentation every 120s
- `security-tester.sh` - Security patterns every 120s
- `test-runner.sh` - Execute tests every 30s

### 1.2 Make Scripts Executable

```bash
chmod +x scripts/ralph/agents/*.sh
```

### 1.3 Create Output Directory

```bash
mkdir -p scripts/ralph/agents/output
```

### 1.4 Test Individual Agent

Test one agent to ensure it works:

```bash
# Run quality monitor once
./scripts/ralph/agents/quality-monitor.sh
```

Press `Ctrl+C` after you see output. If it runs without errors, you're good.

### 1.5 Start All Bash Agents

```bash
./scripts/ralph/agents/start-all.sh
```

**Expected output:**
```
🚀 Starting Ralph Monitoring Agents...
Starting Quality Monitor...
  PID: 12345
Starting PRD Auditor...
  PID: 12346
Starting Documenter...
  PID: 12347
Starting Security Tester...
  PID: 12348
Starting Test Runner (UAT + Unit tests)...
  PID: 12349

✅ All 5 agents started!
```

### 1.6 Verify Agents Running

```bash
ps aux | grep -E "(quality-monitor|prd-auditor|documenter|security-tester|test-runner)" | grep -v grep
```

Should see 5 processes running.

### 1.7 Watch Live Dashboard (Optional but Recommended)

In a separate terminal:

```bash
./scripts/ralph/agents/watch-dashboard.sh
```

This shows:
- Ralph status (running/stopped)
- All 5 agent statuses
- Story progress (X/Y complete)
- Recent commits
- Latest agent logs
- Pending feedback

Refreshes every 5 seconds. Press `Ctrl+C` to stop.

---

## Part 2: Claude Code Automated Hooks

These use Claude Code's hook system to automatically trigger AI analysis on events.

### 2.1 Understand Claude Code Settings Hierarchy

Claude Code loads settings in this order:
1. Global: `~/.claude/settings.json` (affects all projects)
2. Project: `<project>/.claude/settings.json` (affects only this project)
3. Local: `<project>/.claude/settings.local.json` (user-specific, not in git)

**We use project-specific settings** to keep automation local to this project.

### 2.2 Check Existing Project Settings

```bash
cat .claude/settings.json
```

You should see existing hooks for ultracite/biome formatting.

### 2.3 Verify Automated Hooks Are Present

Check for the new hooks:

```bash
grep -q "AUTOMATED QUALITY CHECK" .claude/settings.json && echo "✅ Quality check hook present" || echo "❌ Missing"
grep -q "AUTOMATED POST-COMMIT SECURITY REVIEW" .claude/settings.json && echo "✅ Security review hook present" || echo "❌ Missing"
grep -q "SessionStart" .claude/settings.json && echo "✅ Session start hooks present (2 hooks)" || echo "❌ Missing"
grep -q "AUTO-ARCHITECT" .claude/settings.json && echo "✅ Auto-architect hook present" || echo "❌ Missing"
```

All should say "✅ ... present".

### 2.4 Understand Hook Behavior

**PostToolUse Hook (Write/Edit):**
- **Trigger:** After Claude writes/edits any file
- **Condition:** Only analyzes backend files (`packages/backend/convex/models/*.ts`)
- **Checks:** Better Auth violations, `.filter()` usage, missing auth, XSS risks
- **Output:** Writes findings to `scripts/ralph/agents/output/feedback.md`
- **Status:** Shows "🔍 Auto quality check..." in Claude Code status line

**PostToolUse Hook (Bash):**
- **Trigger:** After any bash command executes successfully
- **Condition:** Only runs if command contains `git commit`
- **Checks:** Hardcoded secrets, XSS, auth bypasses, injection attacks, Better Auth violations
- **Output:** Writes findings to `scripts/ralph/agents/output/feedback.md`
- **Status:** Shows "🔒 Auto security review..." in Claude Code status line

**SessionStart Hook #1 (Status Check):**
- **Trigger:** Once when Claude Code opens in this project
- **Checks:** Ralph running? Agents running? Story progress? Pending feedback?
- **Output:** Displays 3-line summary
- **Status:** Runs once, brief output

**SessionStart Hook #2 (Auto-Architect Prompt):**
- **Trigger:** Once when Claude Code opens, if new PRD detected
- **Checks:** Is this a new/unreviewed PRD phase?
- **Action:** Prompts: "Would you like to run architectural review now? (yes/no)"
- **If YES:** Runs architect agent, generates ADRs, writes guidance to feedback.md
- **If NO:** Skips, marks as reviewed (won't ask again)
- **Tracking:** Uses `.claude/.reviewed-phases` file
- **Status:** Only prompts for new phases, respectful of your time

**SessionEnd Hook:**
- **Trigger:** When Claude Code session closes
- **Output:** Shows story completion count + feedback lines
- **Status:** Quick summary on exit

### 2.5 Activate Hooks (Restart Required)

**IMPORTANT:** Hooks only activate when Claude Code starts. To activate:

1. **Exit this Claude Code session completely**
2. **Restart Claude Code in this project directory**
3. **Watch for SessionStart outputs:**

**First, status check:**
```
🤖 Ralph: STOPPED | Agents: 5/5 | Stories: 6/14 | Feedback: 41 lines
```

**Then, architect prompt (if new PRD):**
```
📐 NEW PHASE DETECTED: phase-9-week-2 (14 stories)

Would you like to run architectural review now?
...
Run architect now? (yes/no)
```

- Say **yes** to run architect automatically (takes 2-3 min)
- Say **no** to skip (can run `/architect-review` manually later)

---

## Testing the Complete System

### Test 1: Verify Bash Agents Are Working

```bash
# Check agent logs
tail -20 scripts/ralph/agents/output/quality-monitor.log

# Should see recent timestamps showing monitoring is active
```

### Test 2: Test Claude Code Write Hook

**Create a test file with a deliberate issue:**

```bash
# Create a file with a Better Auth violation
cat > packages/backend/convex/models/testfile.ts << 'EOF'
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const testMutation = mutation({
  args: { userId: v.id("user") },
  handler: async (ctx, { userId }) => {
    // ❌ BAD: Direct DB access to user table
    const user = await ctx.db.get(userId);
    return user;
  },
});
EOF
```

**Expected behavior:**
- Watch Claude Code status line for: "🔍 Auto quality check..."
- Check feedback: `cat scripts/ralph/agents/output/feedback.md`
- Should see a new entry about Better Auth violation in testfile.ts

**Clean up:**
```bash
rm packages/backend/convex/models/testfile.ts
```

### Test 3: Test Claude Code Commit Hook

**Make a test commit:**

```bash
echo "test" > test.txt
git add test.txt
git commit -m "test commit for hook validation"
```

**Expected behavior:**
- Watch Claude Code status line for: "🔒 Auto security review..."
- Check feedback: `tail -30 scripts/ralph/agents/output/feedback.md`
- Should see a new "Auto Security Review" section

**Clean up:**
```bash
git reset --soft HEAD~1
rm test.txt
```

### Test 4: Verify Integration

**Check feedback file:**

```bash
cat scripts/ralph/agents/output/feedback.md
```

You should see entries from:
- ✅ Bash agents (Quality Monitor, PRD Auditor, etc.)
- ✅ Claude Code hooks (Auto Quality Check, Auto Security Review)

Both systems writing to the same file = integration working!

---

## Running Ralph with Full Automation

### Pre-Flight Checklist

```bash
# 1. Bash agents running?
ps aux | grep -E "(quality-monitor|prd-auditor)" | grep -v grep
# Should see processes

# 2. Claude Code hooks active?
grep -q "SessionStart" .claude/settings.json && echo "✅ Hooks configured"

# 3. PRD ready?
[ -f scripts/ralph/prd.json ] && echo "✅ PRD exists"

# 4. Feedback file clean? (optional - clear old feedback)
> scripts/ralph/agents/output/feedback.md
echo "✅ Feedback file cleared"
```

### Launch Sequence

**Terminal 1: Ralph**
```bash
./scripts/ralph/ralph.sh
```

**Terminal 2: Live Dashboard (Optional)**
```bash
./scripts/ralph/agents/watch-dashboard.sh
```

**Terminal 3: Feedback Monitoring (Optional)**
```bash
tail -f scripts/ralph/agents/output/feedback.md
```

### What Happens Automatically

```
┌─────────────────────────────────────────────────┐
│ Ralph's Iteration Loop                          │
│                                                 │
│ 1. Ralph reads feedback.md                      │
│ 2. Ralph implements next story                  │
│ 3. Ralph writes code files                      │
│    ├─> Hook triggers: Auto quality check        │
│    └─> Findings → feedback.md                   │
│                                                 │
│ 4. Ralph commits changes                        │
│    ├─> Hook triggers: Auto security review      │
│    └─> Findings → feedback.md                   │
│                                                 │
│ 5. Bash agents detect changes (30-120s)         │
│    ├─> quality-monitor: Type/lint check         │
│    ├─> security-tester: Pattern check           │
│    ├─> test-runner: Execute tests               │
│    └─> All findings → feedback.md               │
│                                                 │
│ 6. Next iteration: Ralph reads NEW feedback     │
│ 7. Ralph fixes issues before continuing         │
│                                                 │
│ ✨ ZERO MANUAL INTERVENTION REQUIRED ✨         │
└─────────────────────────────────────────────────┘
```

### Monitoring During Run

**Watch the dashboard:**
- Story progress updating
- New commits appearing
- Agent statuses (should stay 5/5)
- Feedback line count growing

**Watch for issues:**
- If agents go from 5/5 to 4/5 → Check logs
- If feedback.md grows rapidly → Ralph might be hitting same issue repeatedly
- If Ralph stops unexpectedly → Check ralph.sh logs

### When Ralph Completes

**Stop bash agents:**
```bash
./scripts/ralph/agents/stop-all.sh
```

**Review feedback:**
```bash
cat scripts/ralph/agents/output/feedback.md
```

**Check story completion:**
```bash
jq '[.userStories[] | select(.passes == true)] | length' scripts/ralph/prd.json
```

---

## Troubleshooting

### Bash Agents Not Running

**Check logs:**
```bash
tail -50 scripts/ralph/agents/output/quality-monitor.log
```

**Common issues:**
- **Permission denied:** Run `chmod +x scripts/ralph/agents/*.sh`
- **No output directory:** Run `mkdir -p scripts/ralph/agents/output`
- **Port conflict:** Another instance running? `./scripts/ralph/agents/stop-all.sh`

**Restart agents:**
```bash
./scripts/ralph/agents/stop-all.sh
./scripts/ralph/agents/start-all.sh
```

### Claude Code Hooks Not Firing

**Verify hooks loaded:**
```bash
cat .claude/settings.json | jq '.hooks'
```

Should show PostToolUse, PreToolUse, SessionStart, SessionEnd.

**Restart required:**
Hooks only load on session start. Exit and restart Claude Code.

**Check hook syntax:**
```bash
cat .claude/settings.json | jq empty
```

If error: JSON syntax issue. Fix and restart.

### Hooks Firing But No Analysis

**Check if prompts are executing:**
- Watch Claude Code status line for hook messages
- If status shows but no output → Prompt might be too complex
- Check if feedback.md is writable

**Simplify to test:**
Edit `.claude/settings.json` and change a hook prompt to:
```json
"prompt": "Echo test: Write 'Hook fired!' to scripts/ralph/agents/output/feedback.md"
```

Test if that works, then restore original prompt.

### Feedback Not Reaching Ralph

**Check Ralph reads feedback:**
```bash
grep -n "feedback.md" scripts/ralph/ralph.sh
```

Should show ralph.sh reading feedback file.

**Check feedback file location:**
```bash
ls -la scripts/ralph/agents/output/feedback.md
```

**Manual test:**
```bash
echo "## Test Feedback" >> scripts/ralph/agents/output/feedback.md
# Start ralph.sh and verify it reads this
```

### Agents Consuming Too Much CPU

**Check processes:**
```bash
ps aux | grep -E "(quality-monitor|prd-auditor)" | grep -v grep
```

**Reduce frequency:**
Edit agent scripts, increase `sleep` intervals:
- quality-monitor: 60s → 120s
- test-runner: 30s → 60s

**Stop when not needed:**
```bash
./scripts/ralph/agents/stop-all.sh
```

Only run during Ralph sessions.

---

## Cost & Performance

### Bash Agents

**Cost:** $0 (free)
**CPU:** Low (shell scripts, basic commands)
**Disk:** ~10MB logs per 8-hour run
**Network:** None

### Claude Code Hooks (Max Plan)

**Cost:** $0 (included in Max plan, uses session context)
**Latency:** 2-5 seconds per hook trigger
**Frequency:**
- Write hook: Every file Ralph writes (~10-20 per story)
- Commit hook: Every commit Ralph makes (~1 per story)

**If on Pro plan:** Hooks count toward message limit. Recommend using bash agents only.

### Performance Impact on Ralph

**Bash agents:** Zero impact (run independently)
**Claude hooks:** Minimal impact (async background)

**Total slowdown:** <5% (hooks run in parallel with Ralph)

---

## Advanced Configuration

### Customize Hook Behavior

Edit `.claude/settings.json`:

**Make hooks less aggressive:**
```json
"runWhen": "success"  // Only on successful operations
```

**Make hooks more selective:**
```json
"prompt": "Only run if file path contains 'models' AND ..."
```

**Change feedback location:**
```json
"prompt": "... Write findings to /custom/path/feedback.md"
```

### Add Phase-Specific Checks

In security review hook, update Phase 9 checks for your phase:

```json
"3. **Phase-specific checks (Phase 10 - Analytics):**\n   - SQL injection in custom analytics queries\n   - Data export permission violations\n   - Query result pagination (prevent DOS)\n   - Date range validation (max 1 year)"
```

### Create Custom Hooks

Add new hooks to `.claude/settings.json`:

```json
{
  "matcher": "Read",
  "hooks": [{
    "type": "prompt-submit",
    "prompt": "If reading a PRD file, summarize changes...",
    "statusMessage": "Analyzing PRD..."
  }]
}
```

---

## Quick Reference

### Start Everything

```bash
# 1. Start bash agents
./scripts/ralph/agents/start-all.sh

# 2. Start dashboard (optional)
./scripts/ralph/agents/watch-dashboard.sh &

# 3. Ensure Claude Code hooks active (restart if needed)

# 4. Start Ralph
./scripts/ralph/ralph.sh
```

### Stop Everything

```bash
# Stop bash agents
./scripts/ralph/agents/stop-all.sh

# Stop dashboard (if running)
pkill -f watch-dashboard

# Ralph stops automatically when complete
```

### Check Status

```bash
# Bash agents running?
ps aux | grep -E "(quality-monitor|prd-auditor)" | grep -v grep

# Hooks configured?
grep -q "SessionStart" .claude/settings.json && echo "✅"

# Ralph running?
pgrep -f "ralph.sh"

# Story progress?
jq '[.userStories[] | select(.passes == true)] | length' scripts/ralph/prd.json
```

### View Feedback

```bash
# Latest feedback
tail -50 scripts/ralph/agents/output/feedback.md

# Watch live
tail -f scripts/ralph/agents/output/feedback.md

# Count feedback entries
grep -c "^##" scripts/ralph/agents/output/feedback.md
```

---

## Summary

**You now have:**

✅ **5 bash monitoring agents** running continuously (30-120s loops)
✅ **4 Claude Code hooks** triggering automatically on events
✅ **Zero manual intervention** required during Ralph's run
✅ **Comprehensive feedback** written to single file
✅ **Real-time dashboards** showing live progress

**Result:** Ralph gets fast continuous monitoring (bash) + deep intelligent analysis (Claude hooks) → Catches issues immediately → Fixes them before moving forward → High-quality code with full automation.

**Next Steps:**
1. Verify all agents running: `ps aux | grep monitor`
2. Verify hooks active: Restart Claude Code, watch for SessionStart
3. Run Ralph: `./scripts/ralph/ralph.sh`
4. Monitor: `./scripts/ralph/agents/watch-dashboard.sh`
5. Relax: System runs itself! ☕

---

## Documentation References

| File | Purpose |
|------|---------|
| `scripts/ralph/agents/README.md` | Bash agent details |
| `.claude/README.md` | Claude Code native agents |
| `.claude/AUTOMATION.md` | Hook system deep dive |
| `.claude/QUICKSTART.md` | 5-minute quick start |
| **This file** | **Complete setup guide** |

---

**Questions?** Check the troubleshooting section or review the documentation references above.

**Ready?** Follow the setup steps, test the system, then launch Ralph with full automation! 🚀
