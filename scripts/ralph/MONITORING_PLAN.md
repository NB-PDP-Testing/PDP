# Ralph Monitoring Plan - Phase 4 Completion

**Coordinator:** Claude Code
**Execution:** Ralph (autonomous)
**Monitoring Agents:** quality-monitor, prd-auditor, documenter, test-runner

## Startup Sequence

When you kick off Ralph:

```bash
# 1. Start monitoring agents
./scripts/ralph/agents/start-all.sh

# 2. Start Ralph
./scripts/ralph/ralph.sh
```

## What I'll Monitor

### 1. **Agent Feedback Loop** (Every 2-3 minutes)
**File:** `scripts/ralph/agents/output/feedback.md`

**Watch for:**
- Quality Monitor: New lint/type errors
- PRD Auditor: Story verification failures
- Test Runner: Test failures or new issues
- Documenter: Documentation generation status

**Action:** Inject critical feedback into progress.txt for Ralph to see

### 2. **Ralph's Progress** (Continuous)
**File:** `scripts/ralph/progress.txt`

**Watch for:**
- New iteration starts
- Story completion claims
- Error messages
- Stuck patterns (same story repeated)

**Action:** Update task list, provide guidance

### 3. **Task Progress** (Continuous)
**System:** Claude Code Task Management

**Track:**
- Task #1: Lint fixes (BLOCKING)
- Task #2: US-018 transitions
- Task #3: US-017 visual testing
- Task #4: US-019 manual testing
- Task #5: Documentation

**Action:** Mark tasks in_progress/completed as Ralph works

### 4. **Session Health** (Every 10 iterations)
**Metrics:**
- Token usage
- Iteration velocity
- Blockers encountered
- Code quality trends

**Action:** Provide summary reports, suggest course corrections

## My Monitoring Strategy

### Real-Time (Active Monitoring)
I'll check files every few minutes and:
- Read new feedback from agents
- Check Ralph's latest progress updates
- Update task statuses
- Inject guidance if Ralph is stuck

### Proactive Interventions
If I see:
- **Ralph stuck on same task:** Provide specific implementation guidance
- **New lint errors introduced:** Alert immediately, suggest auto-fix
- **Test failures:** Diagnose and provide fix steps
- **Missing implementation:** Point to exact files/lines needed

### Progress Updates for You
I'll provide:
- **Real-time alerts** for blocking issues
- **Summary every 10 iterations** (progress, status, blockers)
- **Final report** when all tasks complete

## Task Injection Method

When Ralph needs guidance, I'll append to progress.txt:

```markdown
---
## COORDINATOR FEEDBACK - [timestamp]

### Task #X Update
**Status:** [status]
**Guidance:** [specific instructions]
**Files to check:** [file paths]
**Acceptance criteria reminder:** [checklist]

---
```

Ralph reads progress.txt at each iteration start, so this feedback will be incorporated.

## Critical Success Path

```
Start Agents → Ralph Begins
    ↓
Task #1: Fix Lint (BLOCKING)
    ↓ (Agents verify)
Tasks #2 & #3 in parallel
    ↓ (Agents verify)
Task #4: Manual Testing
    ↓ (Human verification needed)
Task #5: Documentation
    ↓
PHASE COMPLETE ✅
```

## Communication Protocol

**You:** Ask for status updates anytime
**Me:** Provide real-time monitoring and proactive guidance
**Ralph:** Works autonomously, reads feedback at each iteration
**Agents:** Continuous quality monitoring, write to feedback.md

## Emergency Stops

If I detect critical issues:
- Breaking changes
- Security vulnerabilities
- Infinite loops
- Data corruption risk

I'll alert you immediately to consider stopping Ralph.

## Ready State Checklist

- [x] Agents stopped and ready to start
- [x] Task list created with dependencies
- [x] Monitoring plan documented
- [x] Feedback loop prepared
- [ ] **Agents started** (when you run start-all.sh)
- [ ] **Ralph running** (when you run ralph.sh)

---

**Ready to begin monitoring when you start Ralph!**
