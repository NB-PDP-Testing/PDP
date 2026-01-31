# 🚀 START HERE - Ralph Agent System

Welcome! You're setting up a comprehensive automated monitoring system for Ralph's autonomous development runs.

## 📋 Quick Navigation

### First Time Setup (Required)
👉 **[IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md)** - Complete step-by-step setup guide
- Part 1: Bash monitoring agents (5 agents)
- Part 2: Claude Code automated hooks (4 hooks)
- Testing procedures
- Troubleshooting guide

### Daily Usage

**Starting Ralph with monitoring:**
```bash
# 1. Start bash agents
./scripts/ralph/agents/start-all.sh

# 2. Start live dashboard (optional)
./scripts/ralph/agents/watch-dashboard.sh

# 3. Start Ralph
./scripts/ralph/ralph.sh
```

**Stopping everything:**
```bash
./scripts/ralph/agents/stop-all.sh
```

### Documentation Index

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[AGENT-OVERVIEW.md](./AGENT-OVERVIEW.md)** | **All 13 components explained** | **Understanding the system** ⭐ |
| **[IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md)** | Complete setup guide | First time or troubleshooting |
| **[README.md](./README.md)** | Bash agent reference | Understanding bash agents |
| **[../.claude/README.md](../../.claude/README.md)** | Claude Code agents | Understanding AI-powered hooks |
| **[../.claude/AUTOMATION.md](../../.claude/AUTOMATION.md)** | Hook system deep dive | Customizing automation |
| **[../.claude/QUICKSTART.md](../../.claude/QUICKSTART.md)** | 5-minute quick start | Quick overview |

## 🎯 What You Get

### 13 Monitoring Components Across 3 Categories

**Category 1: Bash Agents (5 agents, auto-running)**
- quality-monitor.sh, prd-auditor.sh, documenter.sh, security-tester.sh, test-runner.sh
- Run continuously in background loops (30-120s intervals)

**Category 2: Claude Hooks (5 hooks, auto-triggered)**
- PostToolUse(Write), PostToolUse(Bash), SessionStart (status + architect prompt), SessionEnd
- Trigger automatically on events (file writes, commits, session start/end)
- **NEW:** Auto-prompts to run architect when new PRD detected!

**Category 3: Manual Agents (3+ agents, on-demand)**
- architect, security-reviewer, documenter-ai, quality-auditor, test-generator
- Run manually when needed (before phase, deep analysis, after phase)

**See [AGENT-OVERVIEW.md](./AGENT-OVERVIEW.md) for complete details on all 13 components.**

**Both write to:** `scripts/ralph/agents/output/feedback.md`
**Ralph reads feedback** before each iteration and fixes issues automatically

### Zero Manual Intervention

```
Ralph writes code → Hooks analyze immediately
                  ↓
              Findings → feedback.md
                  ↓
Ralph reads feedback → Fixes issues → Continues

✨ Fully automated quality assurance ✨
```

## ⚡ Quick Setup (5 Minutes)

If you just want to get started quickly:

```bash
# 1. Make scripts executable
chmod +x scripts/ralph/agents/*.sh

# 2. Start bash agents
./scripts/ralph/agents/start-all.sh

# 3. Verify Claude Code hooks (restart Claude Code in this project)

# 4. Test
echo "test" > test.txt
git add test.txt
git commit -m "test"
# Watch for "🔒 Auto security review..." in Claude Code status

# 5. Clean up test
git reset --soft HEAD~1
rm test.txt

# 6. You're ready! Start Ralph
./scripts/ralph/ralph.sh
```

For detailed setup, read **[IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md)**

## 🆘 Common Issues

**Agents not starting:**
```bash
chmod +x scripts/ralph/agents/*.sh
./scripts/ralph/agents/start-all.sh
```

**Hooks not firing:**
- Exit and restart Claude Code (hooks load on startup)
- Check `.claude/settings.json` exists

**No feedback appearing:**
```bash
mkdir -p scripts/ralph/agents/output
touch scripts/ralph/agents/output/feedback.md
```

For more troubleshooting, see [IMPORTANT-SETUP.md § Troubleshooting](./IMPORTANT-SETUP.md#troubleshooting)

## 📊 Monitoring Dashboard

Live monitoring while Ralph runs:

```bash
./scripts/ralph/agents/watch-dashboard.sh
```

Shows:
- Ralph status (running/stopped)
- Agent statuses (5/5 running)
- Story progress (X/Y complete)
- Recent commits
- Pending feedback
- Updates every 5 seconds

Press Ctrl+C to stop.

## 💰 Cost

**Bash Agents:** $0 (free, always)
**Claude Code Hooks:** $0 (free on Max plan, uses session context)

**Performance Impact:** <5% slowdown (hooks run async in background)

## 🎓 Learning Path

1. **Read:** [IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md) - Complete setup (20 min)
2. **Setup:** Follow Part 1 (Bash agents) + Part 2 (Claude hooks)
3. **Test:** Run provided test procedures
4. **Run:** Start Ralph with full monitoring
5. **Optimize:** Read [AUTOMATION.md](../../.claude/AUTOMATION.md) for customization

## ✅ Ready?

**Checklist before starting Ralph:**

- [ ] Bash agents running: `ps aux | grep monitor`
- [ ] Claude Code hooks active: Restart Claude, check for SessionStart message
- [ ] PRD exists: `ls scripts/ralph/prd.json`
- [ ] Feedback file ready: `ls scripts/ralph/agents/output/feedback.md`
- [ ] Dashboard ready: `./scripts/ralph/agents/watch-dashboard.sh &`

**All checked?** → `./scripts/ralph/ralph.sh` 🚀

---

**New to the system?** → Read [IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md)
**Just need a quick reminder?** → Use the commands above
**Having issues?** → See troubleshooting in [IMPORTANT-SETUP.md](./IMPORTANT-SETUP.md)
