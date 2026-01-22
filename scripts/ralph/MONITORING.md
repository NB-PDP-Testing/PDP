# 📊 Ralph Progress Tracking - Complete Guide

## 🎯 Quick Start Commands

### Option 1: Live Dashboard (Best for Real-Time Monitoring) ⭐
```bash
# Run this in a separate terminal while Ralph is running
./scripts/ralph/monitor.sh
```

**Shows:**
- PRD status with progress bar (X/19 stories complete)
- Real-time completion percentage
- Recent git commits (last 3)
- Progress log updates
- Active Ralph process detection
- Auto-refreshes every 2 seconds

**When to use:** Keep this running in a terminal while Ralph works

---

### Option 2: Stream Viewer (See What Ralph is Doing)
```bash
# Watch Ralph's live output
./scripts/ralph/watch-stream.sh
```

**Shows:**
- Claude's thinking and responses
- Tool calls (Read, Edit, Write, Bash, etc.)
- Tool results
- Iteration completion

**When to use:** When you want to see exactly what Ralph is doing in real-time

---

### Option 3: Quick Status Checks (One-Off Commands)

**Check completed stories:**
```bash
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
```

**Count completed vs remaining:**
```bash
# Completed
cat scripts/ralph/prd.json | jq '[.userStories[] | select(.passes == true)] | length'

# Total
cat scripts/ralph/prd.json | jq '.userStories | length'

# Progress percentage
cat scripts/ralph/prd.json | jq '([.userStories[] | select(.passes == true)] | length) * 100 / (.userStories | length)'
```

**View recent commits:**
```bash
git log --oneline -10
```

**Check if Ralph is running:**
```bash
ps aux | grep "claude.*dangerously-skip" | grep -v grep
```

**Watch progress log (last 20 lines):**
```bash
tail -20 scripts/ralph/progress.txt
```

**Follow progress log live:**
```bash
tail -f scripts/ralph/progress.txt
```

---

## 🔍 Detailed Analysis Tools

### Parse a Specific Iteration
```bash
# Get session ID from progress.txt or session-history.txt
SESSION_ID="71aaf1aa-3b9c-4661-aee6-d60a7eea4ff6"

# Analyze the conversation
./scripts/ralph/parse-conversation.sh $SESSION_ID
```

**Shows:**
- Errors encountered
- Files modified (Write/Edit operations)
- Bash commands executed
- Git commits made
- Key decisions and patterns

**When to use:** After an iteration completes, to understand what happened

---

### Extract Insights from Iteration
```bash
# Auto-extract learnings to file
./scripts/ralph/extract-insights.sh $SESSION_ID scripts/ralph/insights/custom-name.md

# Or print to console
./scripts/ralph/extract-insights.sh $SESSION_ID
```

**Extracts:**
- Files touched
- Commands run
- Errors hit
- Commit messages
- User stories completed
- Code patterns discovered
- Summary statistics

**When to use:** For deep analysis or debugging failed iterations

---

### Get Current Session ID
```bash
# Get the current Claude conversation ID
./scripts/ralph/capture-session-id.sh
```

**When to use:** To find session ID for current iteration (for later analysis)

---

## 📁 Key Files to Monitor

### progress.txt
```bash
# View entire file
cat scripts/ralph/progress.txt

# Last entry
tail -50 scripts/ralph/progress.txt

# Search for errors
grep -i "error\|fail\|mistake" scripts/ralph/progress.txt | tail -10

# See what's left to do
grep "What to do next" scripts/ralph/progress.txt -A 5 | tail -10
```

### session-history.txt
```bash
# View all iterations
cat scripts/ralph/session-history.txt

# Get latest session ID
tail -1 scripts/ralph/session-history.txt

# Count iterations
wc -l scripts/ralph/session-history.txt
```

### insights/ folder
```bash
# List all insight files (newest first)
ls -lt scripts/ralph/insights/

# View latest insight
ls -t scripts/ralph/insights/ | head -1 | xargs -I {} cat scripts/ralph/insights/{}

# View specific iteration insight
cat scripts/ralph/insights/iteration-3-*.md
```

---

## 🎛️ Multi-Terminal Setup (Recommended)

**Terminal 1: Run Ralph**
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 20
```

**Terminal 2: Live Dashboard**
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/monitor.sh
```

**Terminal 3: Watch Commits**
```bash
cd /Users/neil/Documents/GitHub/PDP
watch -n 5 'git log --oneline -5'
```

**Terminal 4: Follow Progress Log** (optional)
```bash
cd /Users/neil/Documents/GitHub/PDP
tail -f scripts/ralph/progress.txt
```

---

## 📈 Progress Tracking Checklist

### Every 30 Minutes
- [ ] Check monitor.sh dashboard (how many stories done?)
- [ ] Quick glance at git log (new commits?)
- [ ] Check if Ralph is still running (ps aux | grep claude)

### After Each Story
- [ ] Review commit message
- [ ] Check progress.txt last entry
- [ ] Verify story marked passes: true
- [ ] Look for errors or warnings

### If Something Seems Wrong
1. Check monitor.sh - Is Ralph still running?
2. Check progress.txt - Any error messages?
3. Check git log - Did last commit succeed?
4. Get session ID: `./scripts/ralph/capture-session-id.sh`
5. Parse conversation: `./scripts/ralph/parse-conversation.sh $SESSION_ID`
6. Review extracted insights

---

## 🚨 Troubleshooting Commands

**Ralph stopped unexpectedly:**
```bash
# Check if still running
ps aux | grep claude

# Get last session ID
tail -1 scripts/ralph/session-history.txt

# Parse what happened
SESSION_ID=$(tail -1 scripts/ralph/session-history.txt | awk '{print $3}')
./scripts/ralph/parse-conversation.sh $SESSION_ID
```

**Story marked complete but seems wrong:**
```bash
# View the commit
git log -1 --stat

# See what changed
git diff HEAD~1

# Read the story's progress entry
grep "US-XXX" scripts/ralph/progress.txt -A 30
```

**Want to manually fix something:**
```bash
# Make your changes
# Then commit
git add .
git commit -m "manual: Fix issue with US-XXX"

# Update PRD if story now complete
# Edit scripts/ralph/prd.json, set passes: true

# Continue Ralph
./scripts/ralph/ralph.sh 15
```

---

## 🎨 Example Monitor Output

```
╔════════════════════════════════════════════════════════╗
║          Ralph Progress Monitor (Live)                ║
║     Press Ctrl+C to stop monitoring                   ║
╚════════════════════════════════════════════════════════╝

📋 PRD Status:
   Total Stories: 19
   ✓ Complete: 8
   ⧖ Remaining: 11
   Progress: 42%
   [████████████████░░░░░░░░░░░░░░░░░░░░░░░░] 42%
   🎉 Story just completed!

📝 Recent Git Activity:
   Commits (last 10 min): 1
   ✓ New commit detected!
   976edfb chore: Prepare Ralph for Phases 3-5
   7abbffd docs: Add comprehensive PRD and Ralph JSON
   d6b9641 docs: Add implementation plan

📖 Progress Log:
   Lines: 1245
   ✓ New progress logged!
   Last entry:
   ## [2026-01-22 18:30] - US-008 - Add passport stats
   **Status**: Complete
   **Commit**: abc1234
   Files changed: 1 file (+45, -10)

🔄 Active Sessions:
   Iterations: 8
   Iteration 8: abc1234-5678-90ab-cdef-123456789012

✓ Ralph is ACTIVE

Refreshing in 2s... (Ctrl+C to stop)
```

---

## 📚 Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `./scripts/ralph/ralph.sh 20` | Run Ralph | Start autonomous work |
| `./scripts/ralph/monitor.sh` | Live dashboard | Real-time progress |
| `./scripts/ralph/watch-stream.sh` | Watch output | See what Ralph is doing |
| `./scripts/ralph/validate-prd.sh` | Check PRD | Before running Ralph |
| `./scripts/ralph/parse-conversation.sh $ID` | Analyze iteration | Debug/understand |
| `./scripts/ralph/extract-insights.sh $ID` | Extract learnings | Deep analysis |
| `./scripts/ralph/capture-session-id.sh` | Get session ID | For later analysis |
| `tail -f scripts/ralph/progress.txt` | Follow log | See updates live |
| `git log --oneline -10` | Recent commits | Check progress |

---

**Pro Tip:** Run `monitor.sh` in a separate terminal and just glance at it occasionally. 
It will show you everything you need to know at a glance! 📊✨
