# Quick Start: Hybrid Agent System

Get up and running with both bash monitoring agents and Claude Code native agents in 5 minutes.

## Prerequisites

- Ralph PRD created at `scripts/ralph/prd.json`
- Claude Code v2.1+ (for native agent support)
- Bash monitoring agents ready to start

---

## Step 1: Pre-Phase Architectural Planning (Optional but Recommended)

Before Ralph starts implementing, get architectural guidance:

```bash
# Invoke the architect agent
/architect-review
```

**What it does:**
1. Reads all stories in the PRD
2. Identifies key architectural decisions
3. Generates ADRs in `docs/architecture/decisions/`
4. Writes implementation guidance to feedback.md

**Review the output:**
```bash
# Check ADRs generated
ls docs/architecture/decisions/

# Review implementation guidance
cat scripts/ralph/agents/output/feedback.md
```

**Time:** 2-3 minutes for Opus to complete comprehensive analysis

---

## Step 2: Start Bash Monitoring Agents

Launch continuous monitoring for fast feedback:

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/agents/start-all.sh
```

**Agents started (5 total):**
- ✅ quality-monitor.sh (every 60s)
- ✅ prd-auditor.sh (every 90s)
- ✅ documenter.sh (every 120s)
- ✅ security-tester.sh (every 120s)
- ✅ test-runner.sh (every 30s)

**Verify they're running:**
```bash
ps aux | grep -E "(quality-monitor|prd-auditor|documenter|security-tester|test-runner)"
```

---

## Step 3: Start Live Dashboard

Monitor Ralph's progress in real-time:

```bash
./scripts/ralph/agents/watch-dashboard.sh
```

**Shows:**
- Ralph status (running/stopped)
- All 5 agent statuses
- Story progress (X/Y complete)
- Recent commits
- Latest agent logs
- Pending feedback

Refreshes every 5 seconds. Press `Ctrl+C` to stop.

---

## Step 4: Start Ralph

With monitoring active and architectural guidance ready:

```bash
./scripts/ralph/ralph.sh
```

Ralph will:
1. Read architectural guidance from feedback.md
2. Implement stories following ADRs
3. Commit changes after each story
4. Agents detect commits and run checks
5. Issues written to feedback.md
6. Ralph reads feedback in next iteration
7. Ralph fixes issues before continuing

---

## Step 5: Use Claude Agents During Ralph's Run (As Needed)

While Ralph works, you can trigger deep analysis manually:

### After a concerning commit:
```bash
/review-security latest
```

### After story completion for deep quality check:
```bash
/quality-audit US-P9-015
```

### To generate comprehensive tests:
```bash
/generate-tests US-P9-015
```

**When to use:**
- You see a security-sensitive change in the dashboard
- A complex story completes and you want deep review
- Tests are failing and you need better coverage

---

## Step 6: After Ralph Completes Phase

Generate comprehensive documentation:

```bash
/document-phase phase-9-week-2
```

**What it generates:**
- Executive summary
- Architecture and design details
- Implementation highlights
- Challenges and solutions
- Test coverage
- Technical debt and future work

**Output:** `docs/features/phase-9-week-2.md`

---

## Step 7: Cleanup

Stop bash agents:

```bash
./scripts/ralph/agents/stop-all.sh
```

Review all feedback:

```bash
cat scripts/ralph/agents/output/feedback.md
```

---

## Typical Workflow Summary

```bash
# === BEFORE RALPH ===
/architect-review                                    # 2-3 min
./scripts/ralph/agents/start-all.sh                  # Instant
./scripts/ralph/agents/watch-dashboard.sh &          # Runs in background

# === START RALPH ===
./scripts/ralph/ralph.sh                             # 30-60 min per phase

# === DURING RALPH (optional) ===
/review-security latest                              # 30-60 sec
/quality-audit US-P9-015                             # 30-60 sec

# === AFTER RALPH ===
/document-phase phase-9-week-2                       # 1-2 min
./scripts/ralph/agents/stop-all.sh                   # Instant
```

---

## What Each Agent Does

### Bash Agents (Continuous, Free)

| Agent | Speed | Cost | Value |
|-------|-------|------|-------|
| quality-monitor | 60s | $0 | Fast type/lint checks |
| prd-auditor | 90s | $0 | Story verification |
| documenter | 120s | $0 | Basic docs extraction |
| security-tester | 120s | $0 | Core security patterns |
| test-runner | 30s | $0 | Execute tests, fast feedback |

**Total cost:** $0
**Total coverage:** Continuous monitoring, immediate feedback

### Claude Agents (On-Demand, AI-Powered)

| Agent | Time | Cost | Value |
|-------|------|------|-------|
| security-reviewer | 30-60s | ~$0.03 | Deep vulnerability analysis |
| quality-auditor | 30-60s | ~$0.05 | Intelligent code review |
| architect | 2-3min | ~$0.30 | Pre-phase planning, ADRs |
| test-generator | 60s | ~$0.08 | Comprehensive test suites |
| documenter-ai | 1-2min | ~$0.20 | Professional documentation |

**Cost per phase:** ~$0.50-1.00 if you use all agents
**Value:** Deep insights, architectural guidance, professional docs

---

## Tips

1. **Always run architect before Ralph** - Saves time fixing architectural issues later
2. **Use live dashboard** - Catch issues as they happen
3. **Trigger Claude agents selectively** - Don't need them for every story
4. **Review ADRs** - They guide Ralph's implementation
5. **Check feedback.md regularly** - See what agents are telling Ralph

---

## Troubleshooting

**Agents not running:**
```bash
./scripts/ralph/agents/stop-all.sh
./scripts/ralph/agents/start-all.sh
```

**Claude agents not working:**
- Check Claude Code version: Should be v2.1+
- Try manual invocation with Task tool

**No feedback appearing:**
```bash
ls -la scripts/ralph/agents/output/feedback.md
tail -f scripts/ralph/agents/output/*.log
```

---

## Next Steps

- Read full agent documentation: `.claude/README.md`
- Explore agent definitions: `.claude/agents/*.md`
- Customize for your phase: Update phase-specific checks
- Create new agents: Follow patterns in existing agents

---

**You're ready!** Start with the architect review, launch monitoring, and let Ralph build while agents ensure quality.
