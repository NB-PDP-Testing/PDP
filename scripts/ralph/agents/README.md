# Ralph Monitoring Agents

This folder contains monitoring agent scripts that run alongside Ralph to provide quality assurance, documentation, and **real-time testing feedback**.

## Agent Overview

| Agent | Purpose | Interval | Output |
|-------|---------|----------|--------|
| `quality-monitor.sh` | Type/lint checks | 60s | `quality-monitor.log` |
| `prd-auditor.sh` | Verify completed stories | 90s | `prd-auditor.log` |
| `documenter.sh` | Generate feature docs | 120s | `documenter.log` + `docs/features/` |
| `test-runner.sh` | **UAT + Unit tests with real-time feedback** | 30s | `test-runner.log` + `tests/` |

## Quick Start

```bash
# Start all agents
./scripts/ralph/agents/start-all.sh

# Watch all outputs (real-time)
tail -f scripts/ralph/agents/output/*.log

# Watch test runner specifically
tail -f scripts/ralph/agents/output/test-runner.log

# Stop all agents
./scripts/ralph/agents/stop-all.sh
```

## Agent Details

### 1. Quality Monitor (`quality-monitor.sh`)

Runs type checks and lint every 60 seconds. If issues found, adds CODE REVIEW FEEDBACK to `feedback.md` which Ralph reads before each iteration.

**Checks:**
- `npx -w packages/backend convex codegen`
- `npm run check-types`
- `npx biome check`

**Output:** Issues are logged and critical problems are flagged for Ralph.

### 2. PRD Auditor (`prd-auditor.sh`)

Verifies completed stories against actual implementation every 90 seconds.

**Checks:**
- Stories marked `passes: true` have corresponding commits
- Files mentioned in acceptance criteria exist
- No regressions in completed features

**Output:** Discrepancies flagged in `feedback.md`.

### 3. Documenter (`documenter.sh`)

Generates and maintains feature documentation every 120 seconds.

**Actions:**
- Creates feature docs in `docs/features/` when milestones hit (every 5 stories)
- Updates docs when stories complete
- Extracts patterns from `progress.txt`
- Generates final documentation when phase completes

**Output:**
- `docs/features/{feature-slug}.md` - Feature documentation
- Updates `feedback.md` when docs generated

### 4. Test Runner (`test-runner.sh`) - **NEW: Real-time Testing**

Creates AND EXECUTES both UAT and unit tests when stories complete. **Polls every 30 seconds for fast feedback**.

**Key Features:**
- **Immediate detection** of newly completed stories
- **Runs full test suite** for each story:
  - Convex codegen (schema validation)
  - TypeScript type checks
  - Biome lint checks
  - Unit tests (if vitest configured)
- **Generates test files**:
  - UAT scenarios with acceptance criteria checklists
  - Unit test stubs for backend changes
- **Real-time feedback** written to `feedback.md` so Ralph can fix issues during the run

**Output:**
- `output/tests/{feature}-{story-id}-uat.md` - UAT test scenarios
- `packages/backend/convex/__tests__/{story-id}.test.ts` - Unit test stubs
- Immediate feedback in `feedback.md` for any failures

**Feedback Examples:**
```markdown
## Test Runner - 2026-01-20 10:30:45

❌ **TYPE ERRORS for US-003:**
```
error TS2345: Argument of type 'string' is not assignable...
```

**Action Required:** Fix these type errors before marking story complete.
```

## Output Files

All agents write to `scripts/ralph/agents/output/`:

```
output/
├── quality-monitor.log     # Type/lint check results
├── quality-monitor.pid     # Process ID
├── prd-auditor.log         # Story verification results
├── prd-auditor.pid
├── documenter.log          # Documentation generation log
├── documenter.pid
├── test-runner.log         # Test execution results
├── test-runner.pid
├── feedback.md             # Consolidated feedback for Ralph
├── .documented-stories     # Tracking file for documenter
├── .tested-stories         # Tracking file for test runner
└── tests/                  # Generated test files
    ├── {feature}-US-001-uat.md
    ├── {feature}-US-002-uat.md
    └── ...
```

## Integration with Ralph

The agents write feedback to `scripts/ralph/agents/output/feedback.md`. The `ralph.sh` script checks this file before each iteration and appends any new feedback to the `CODE REVIEW FEEDBACK` section of `progress.txt`.

**Real-Time Feedback Loop:**
1. Ralph implements a feature and marks story complete (`passes: true`)
2. Test Runner detects completion within 30 seconds
3. Test Runner runs full test suite (types, lint, codegen, unit tests)
4. Any failures are written immediately to `feedback.md`
5. Ralph reads feedback in next iteration
6. Ralph fixes issues before moving to next story

**Benefits:**
- Issues caught immediately, not at end of phase
- Ralph fixes problems while context is fresh
- No accumulation of technical debt
- All stories verified before phase marked complete

## Manual Agent Control

```bash
# Start individual agent
./scripts/ralph/agents/test-runner.sh &

# Check if agents are running
ps aux | grep -E "(quality-monitor|prd-auditor|documenter|test-runner)"

# Kill specific agent
kill $(cat scripts/ralph/agents/output/test-runner.pid)

# View specific agent log
tail -f scripts/ralph/agents/output/test-runner.log

# Clear tested stories to re-run tests
rm scripts/ralph/agents/output/.tested-stories
```

## Troubleshooting

**Agents not starting:**
- Check permissions: `chmod +x scripts/ralph/agents/*.sh`
- Check output dir exists: `mkdir -p scripts/ralph/agents/output`

**No output appearing:**
- Verify PRD exists: `ls scripts/ralph/prd.json`
- Check agent logs for errors

**Tests not running:**
- Check if `vitest` is configured in the project
- Verify `npm run check-types` works manually

**Feedback not appearing:**
- Check `feedback.md` exists and is writable
- Verify Ralph is reading from correct feedback file

**Agents consuming too much CPU:**
- Increase sleep intervals in scripts
- Stop agents when not running Ralph

## Design Philosophy

These agents use shell scripts that run system commands directly rather than Claude Code's Task tool. This ensures:

- **Persistent output** - Files written to disk, not lost on context switch
- **Real-time monitoring** - `tail -f` shows live progress
- **Independent lifecycle** - Start/stop agents without affecting Ralph
- **Clear separation** - Each agent has one job
- **Lightweight** - Simple shell scripts, no dependencies
- **Fast feedback** - 30-second polling catches issues immediately

## Recommended Workflow

1. **Before starting Ralph:**
   ```bash
   ./scripts/ralph/agents/start-all.sh
   ```

2. **During Ralph run:**
   ```bash
   # In a separate terminal
   tail -f scripts/ralph/agents/output/test-runner.log
   ```

3. **If issues detected:**
   - Ralph will see feedback in next iteration
   - Issues get fixed during the run, not after

4. **After Ralph completes:**
   ```bash
   ./scripts/ralph/agents/stop-all.sh
   ```
