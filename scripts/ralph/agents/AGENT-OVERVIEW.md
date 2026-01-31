# Complete Agent Overview

**Quick answer:** We have **12 agents total** across 3 categories.

---

## The Three Categories

### Category 1: Bash Monitoring Agents (Auto-Running, Continuous)
**Location:** `scripts/ralph/agents/*.sh`
**Start:** `./start-all.sh`
**Stop:** `./stop-all.sh`
**Cost:** Free

| Agent | Runs Every | Purpose | Output |
|-------|------------|---------|--------|
| quality-monitor.sh | 60s | TypeScript checks, lint, pattern validation | quality-monitor.log |
| prd-auditor.sh | 90s | Verify stories match implementation | prd-auditor.log |
| documenter.sh | 120s | Extract docs from completed work | documenter.log + docs/features/ |
| security-tester.sh | 120s | Core security pattern checks | security-tester.log + security-report.md |
| test-runner.sh | 30s | Execute tests, report failures | test-runner.log + tests/ |

**How they work:**
- Start once: `./start-all.sh`
- Run continuously in background loops
- Poll for changes every 30-120 seconds
- Write findings to `output/feedback.md`
- Stop with: `./stop-all.sh`

**Use these for:** Continuous monitoring during Ralph's run (free, fast, always-on)

---

### Category 2: Claude Code Hooks (Auto-Triggered, Event-Based)
**Location:** `.claude/settings.json`
**Activate:** Restart Claude Code
**Cost:** Free (on Max plan)

| Hook | Triggers On | Purpose | Status Message |
|------|-------------|---------|----------------|
| PostToolUse(Write) | File write/edit | Auto quality check on backend files | 🔍 Auto quality check... |
| PostToolUse(Bash) | Git commit | Auto security review of changed files | 🔒 Auto security review... |
| SessionStart #1 | Claude Code starts | Check Ralph/agent status | Shows status summary |
| SessionStart #2 | Claude Code starts | **Ask to run architect if new PRD** | Architect prompt (if needed) |
| SessionEnd | Claude Code closes | Show completion summary | Session summary |

**How they work:**
- Configured in `.claude/settings.json`
- Activate when Claude Code starts (restart required)
- Trigger automatically on events (no manual commands)
- Use AI to analyze code intelligently
- Write findings to `output/feedback.md`

**Use these for:** Immediate intelligent analysis when events happen (automatic, zero intervention)

---

### Category 3: Claude Code Native Agents (Manual/On-Demand)
**Location:** `.claude/agents/*.md`
**Invoke:** Via slash commands or Task tool
**Cost:** Free (on Max plan)

| Agent | When to Run | Purpose | How to Invoke |
|-------|-------------|---------|---------------|
| **architect.md** | **BEFORE phase starts** | Generate ADRs, architectural planning | `/architect-review` |
| security-reviewer.md | When needed | Deep security vulnerability analysis | `/review-security` |
| quality-auditor.md | When needed | Intelligent code quality review | Manual Task |
| test-generator.md | After story complete | Generate UAT + unit test suites | Manual Task |
| documenter-ai.md | After phase complete | AI-powered comprehensive docs | `/document-phase` |

**How they work:**
- Defined as markdown agent specifications
- Invoked manually when needed
- Use Claude's full AI capabilities
- Write findings to `output/feedback.md` or specific locations
- Run once per invocation (not loops)

**Use these for:** Deep intelligent analysis when you need it (pre-phase planning, post-phase docs, complex reviews)

---

## All 12 Agents at a Glance

### Auto-Running (Start Once, Run Forever)
1. ✅ quality-monitor.sh (bash loop)
2. ✅ prd-auditor.sh (bash loop)
3. ✅ documenter.sh (bash loop)
4. ✅ security-tester.sh (bash loop)
5. ✅ test-runner.sh (bash loop)

### Auto-Triggered (Event-Based, No Manual Commands)
6. ✅ PostToolUse(Write) hook (on file write)
7. ✅ PostToolUse(Bash) hook (on git commit)
8. ✅ SessionStart #1 hook (status check)
9. ✅ SessionStart #2 hook (auto-architect prompt)
10. ✅ SessionEnd hook (on Claude close)

### Manual (Run When Needed)
11. 🎯 architect (before phase - or auto-prompted!)
12. 🔒 security-reviewer (deep security)
13. 📝 documenter-ai (comprehensive docs)

---

## When to Use What

### Before Ralph Starts a New Phase

**1. Architect agent runs automatically!** (Auto-prompted on session start)

When you restart Claude Code with a new PRD, you'll be prompted:
```
📐 NEW PHASE DETECTED: phase-9-week-2 (14 stories)

Would you like to run architectural review now?
...
Run architect now? (yes/no)
```

- Say **yes** → Runs automatically
- Say **no** → Skip (can run manually later)

**Or run manually anytime:**
```bash
/architect-review
```

- Generates ADRs in `docs/architecture/decisions/`
- Writes implementation guidance to `feedback.md`
- Ralph reads guidance and follows architectural decisions

### Starting Ralph

**2. Start bash monitoring agents** (Auto-running)
```bash
./scripts/ralph/agents/start-all.sh
```
- Runs continuously during Ralph's session
- Catches issues every 30-120 seconds

**3. Ensure Claude hooks active** (Auto-triggered)
- Restart Claude Code if needed
- Hooks trigger automatically on file writes and commits

**4. Start Ralph**
```bash
./scripts/ralph/ralph.sh
```

### During Ralph's Run

**Bash agents** monitor continuously (automatic)
**Claude hooks** trigger on events (automatic)

**Optional - Manual deep analysis if needed:**
```bash
/review-security latest      # If you see concerning code
/quality-audit US-P9-015    # Deep review of specific story
```

### After Ralph Completes

**5. Generate comprehensive docs** (Manual, one-time)
```bash
/document-phase phase-9-week-2
```
- AI-powered documentation in `docs/features/`

**6. Stop bash agents**
```bash
./scripts/ralph/agents/stop-all.sh
```

---

## Complete Workflow Diagram

```
BEFORE RALPH
├─ Manual: /architect-review
│  └─ Generates ADRs + guidance → feedback.md
│
START RALPH
├─ Auto: ./start-all.sh (bash agents)
│  └─ Runs continuously: quality, security, tests
├─ Auto: Restart Claude Code (activate hooks)
│  └─ Triggers on events: writes, commits
└─ Start: ./ralph.sh
   │
   DURING RALPH (All Automatic)
   ├─ Ralph writes code
   │  └─ Hook triggers: Auto quality check → feedback.md
   ├─ Ralph commits
   │  └─ Hook triggers: Auto security review → feedback.md
   ├─ Bash agents poll (30-120s)
   │  └─ Write findings → feedback.md
   ├─ Ralph reads feedback.md
   └─ Ralph fixes issues → Next iteration
   │
   AFTER RALPH
   ├─ Manual: /document-phase
   │  └─ Generates comprehensive docs
   └─ Auto: ./stop-all.sh (stop bash agents)
```

---

## Which Agents Write Where

### All Write to feedback.md
- ✅ quality-monitor.sh
- ✅ prd-auditor.sh
- ✅ security-tester.sh
- ✅ test-runner.sh
- ✅ PostToolUse(Write) hook
- ✅ PostToolUse(Bash) hook
- ✅ security-reviewer (when invoked)
- ✅ quality-auditor (when invoked)

### Write to Specific Locations
- documenter.sh → `docs/features/[slug].md`
- architect → `docs/architecture/decisions/ADR-*.md`
- documenter-ai → `docs/features/[slug].md`
- test-generator → `output/tests/` + test files

**Ralph reads:** `output/feedback.md` before each iteration

---

## Quick Reference: What Runs When

### Always Running (After start-all.sh)
- 5 bash agents (continuous loops)

### Always Active (After Claude restart)
- 4 hooks (trigger on events)

### Run Manually When Needed
- architect (before phase)
- security-reviewer (deep analysis)
- quality-auditor (deep review)
- test-generator (test creation)
- documenter-ai (comprehensive docs)

---

## FAQ

**Q: Do I need to manually trigger anything during Ralph's run?**
A: No! Once started, bash agents + hooks handle everything automatically.

**Q: When should I use the architect agent?**
A: Before Ralph starts a new phase. It generates ADRs and architectural guidance.

**Q: What's the difference between documenter.sh and documenter-ai?**
A: documenter.sh (bash) runs continuously and extracts text. documenter-ai uses AI for comprehensive analysis after phase completes.

**Q: What's the difference between security-tester.sh and security-reviewer?**
A: security-tester.sh (bash) runs pattern checks every 120s. security-reviewer (AI) does deep vulnerability analysis when invoked.

**Q: How do I know if hooks are working?**
A: Watch Claude Code status line for "🔍 Auto quality check..." and "🔒 Auto security review..." messages.

**Q: Which agents cost money?**
A: None! Bash agents are free. Claude hooks are free on Max plan (use session context).

---

## File Locations Summary

```
scripts/ralph/agents/
├── quality-monitor.sh       # Bash agent
├── prd-auditor.sh          # Bash agent
├── documenter.sh           # Bash agent
├── security-tester.sh      # Bash agent
├── test-runner.sh          # Bash agent
├── start-all.sh            # Start all bash agents
└── stop-all.sh             # Stop all bash agents

.claude/
├── settings.json           # Hook configuration (4 hooks)
├── agents/
│   ├── architect.md        # Manual agent
│   ├── security-reviewer.md # Manual agent
│   ├── quality-auditor.md  # Manual agent
│   ├── test-generator.md   # Manual agent
│   └── documenter-ai.md    # Manual agent
└── commands/
    ├── architect-review.sh  # /architect-review
    └── review-security.sh   # /review-security
```

---

**Summary:** 5 bash agents (auto-running) + 5 hooks (auto-triggered) + 3 manual agents (on-demand) = **13 total monitoring components** providing comprehensive monitoring and analysis.

**Note:** The architect agent can run both automatically (via SessionStart prompt) OR manually (via `/architect-review`)

**For complete setup:** See [IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md)
