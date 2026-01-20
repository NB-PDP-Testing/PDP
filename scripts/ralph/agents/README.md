# Ralph Monitoring Agents

This folder contains monitoring agent scripts that run alongside Ralph to provide quality assurance, documentation, and testing.

## Problem with Phase 2 Agents

In Phase 2, we launched background Task agents, but they didn't persist their outputs because:
1. Task tool agents run in subprocesses that may complete/timeout
2. Background agents don't have persistent file handles
3. The `/tmp/claude/.../tasks/` folder was empty after completion

## Solution for Phase 3

Instead of using Claude Code's Task tool for monitoring, we use **shell scripts that invoke Claude CLI directly** with specific prompts. This ensures:
- Outputs are written to persistent files
- Progress can be monitored in real-time with `tail -f`
- Agents can be stopped/restarted independently
- Clear separation of concerns

## Agent Scripts

### 1. quality-monitor.sh
Runs type checks and lint every 60 seconds. If issues found, adds CODE REVIEW FEEDBACK to progress.txt.

```bash
./scripts/ralph/agents/quality-monitor.sh
```

### 2. prd-auditor.sh
Checks completed stories against actual implementation. Verifies claims match code.

```bash
./scripts/ralph/agents/prd-auditor.sh
```

### 3. uat-tester.sh
Creates and maintains test scenarios as features are implemented.

```bash
./scripts/ralph/agents/uat-tester.sh
```

### 4. documenter.sh
Documents features as they're built, maintaining architecture docs.

```bash
./scripts/ralph/agents/documenter.sh
```

## Output Files

All agents write to `scripts/ralph/agents/output/`:
- `quality-monitor.log` - Type/lint issues found
- `prd-auditor.log` - Story verification results
- `uat-tester.log` - Test scenarios and results
- `documenter.log` - Documentation updates
- `feedback.md` - Consolidated feedback for Ralph (auto-added to progress.txt)

## Usage

### Start All Agents
```bash
./scripts/ralph/agents/start-all.sh
```

### Stop All Agents
```bash
./scripts/ralph/agents/stop-all.sh
```

### Monitor Agent Outputs
```bash
# Watch all outputs
tail -f scripts/ralph/agents/output/*.log

# Watch specific agent
tail -f scripts/ralph/agents/output/quality-monitor.log
```

## Integration with Ralph

The agents write feedback to `scripts/ralph/agents/output/feedback.md`. The `ralph.sh` script checks this file before each iteration and appends any new feedback to the `CODE REVIEW FEEDBACK` section of `progress.txt`.

This creates a closed loop where:
1. Ralph implements features
2. Agents detect issues/gaps
3. Feedback is written to feedback.md
4. Ralph reads feedback in next iteration
5. Ralph addresses the feedback
