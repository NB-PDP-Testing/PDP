# Quick Start - Ralph with Claude Code Monitoring

## Your Commands (Run These)

```bash
# 1. Start monitoring agents (in your terminal)
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/agents/start-all.sh

# 2. Start Ralph (in same or new terminal)
./scripts/ralph/ralph.sh
```

## What Happens Next

### Ralph Will:
1. Read progress.txt and see the 5-task priority list
2. Start with Task #1 (Fix lint errors - BLOCKING)
3. Work through tasks in dependency order
4. Update progress.txt with findings at each iteration

### Monitoring Agents Will:
- **Quality Monitor** (60s): Check for type/lint errors
- **PRD Auditor** (90s): Verify story implementations
- **Test Runner** (30s): Run tests on completed stories
- **Documenter** (120s): Generate feature docs

All write findings to: `scripts/ralph/agents/output/feedback.md`

### I (Claude Code) Will:
- Monitor feedback.md every 2-3 minutes
- Track Ralph's progress in progress.txt
- Update task statuses in real-time
- Inject guidance if Ralph gets stuck
- Provide summary reports every 10 iterations
- Alert you immediately for blocking issues

## Monitoring Dashboard (What I'm Watching)

```
┌─────────────────────────────────────────────────────────┐
│ RALPH SESSION MONITOR                                   │
├─────────────────────────────────────────────────────────┤
│ Tasks:        [1⚠️] [2⏸️] [3⏸️] [4⏸️] [5⏸️]              │
│ Iteration:    [tracking...]                             │
│ Lint Errors:  377+ → [targeting 0]                      │
│ Agent Status: [4 running]                               │
│ Blockers:     [monitoring...]                           │
└─────────────────────────────────────────────────────────┘
```

## Files I'm Monitoring

```
scripts/ralph/agents/output/feedback.md    # Agent findings
scripts/ralph/progress.txt                 # Ralph's log
scripts/ralph/agents/output/*.log          # Individual agents
```

## What You'll See From Me

### Real-Time Updates
- "🚨 Alert: Ralph stuck on lint errors - providing guidance"
- "✅ Task #1 complete - lint errors fixed"
- "⚠️ New issue detected in feedback.md - investigating"

### Periodic Summaries (Every 10 iterations)
```
📊 SUMMARY - Iteration 10
Tasks: 1✅ 2🔄 3⏸️ 4⏸️ 5⏸️
Progress: 40% complete
Blockers: None
Next: US-018 transitions
ETA: ~5 more iterations
```

### Final Report
```
🎉 PHASE 4 COMPLETE
✅ All tasks completed
✅ 0 lint errors
✅ All tests passing
✅ Documentation updated
→ Ready for PR creation
```

## Stop Commands (If Needed)

```bash
# Stop all agents
./scripts/ralph/agents/stop-all.sh

# Stop Ralph (Ctrl+C in Ralph terminal)
```

## Ask Me Anytime

- "What's Ralph working on?"
- "What's the task status?"
- "Any issues from the agents?"
- "Show me the latest feedback"
- "How many iterations so far?"

## Success Criteria

- [ ] Task #1: Lint errors fixed (0 errors)
- [ ] Task #2: US-018 transitions complete
- [ ] Task #3: US-017 visual testing documented
- [ ] Task #4: US-019 manual testing checklist done
- [ ] Task #5: Documentation updated
- [ ] All agents reporting green
- [ ] Ready for PR

---

**Status: READY TO BEGIN**
**Waiting for:** You to start agents + Ralph
**Then:** I'll begin active monitoring

*Last updated: 2026-01-24 14:55*
