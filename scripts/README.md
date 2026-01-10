# UX Agent Orchestrator v7

Multi-agent UX improvement system for PlayerARC.

## Quick Start

```bash
# Check status
python3 scripts/ux-orchestrator.py status

# Test single agent (recommended first - will prompt for permissions)
python3 scripts/ux-orchestrator.py direct audit

# Run full workflow (will prompt for permissions)
python3 scripts/ux-orchestrator.py split
```

## Prerequisites

- Python 3.8+
- Claude Code CLI (`claude` command)
- tmux (`brew install tmux`)
- Anthropic API key

```bash
export ANTHROPIC_API_KEY='your-key-here'
pip install anthropic
```

## Security

**By default, Claude will prompt for permission** before:
- Reading files
- Writing files
- Executing commands

This is the safe mode - you'll see what Claude wants to do before it happens.

### `--unsafe` Flag (Use with Caution)

```bash
python3 scripts/ux-orchestrator.py direct audit --unsafe
python3 scripts/ux-orchestrator.py split --unsafe
```

The `--unsafe` flag:
- Skips ALL permission prompts
- Claude can read/write/execute without confirmation
- **Only use in sandboxed environments you fully trust**
- Required for fully automated workflows

### Security Considerations

1. **Temp files**: Instructions are written to `/tmp/` with restricted permissions (0600)
2. **No sanitization**: Agent instructions are passed directly to Claude
3. **Full access**: With `--unsafe`, Claude has full filesystem access

## Commands

| Command | Description |
|---------|-------------|
| `status` | Check workflow progress |
| `direct <agent>` | Test single agent (audit, implement, quality, verify, test) |
| `split` | Side-by-side view (tmux) |
| `windows` | Separate windows (tmux) |
| `grid` | All agents visible (tmux) |
| `reset` | Remove all outputs, start fresh |

Add `--unsafe` to any command to skip permission prompts.

## The 5 Agents

| Agent | Output File | Purpose |
|-------|-------------|---------|
| Auditor | `UX_AUDIT_FINDINGS.md` | Finds UX gaps |
| Implementer | `UX_IMPLEMENTATION_LOG.md` | Fixes issues |
| Quality | `CODE_QUALITY_REPORT.md` | Runs CI/CD checks |
| Verifier | `UX_VERIFICATION_REPORT.md` | Confirms completeness |
| Tester | `UX_QA_REPORT.md` | Tests all viewports |

## Workflow

```
Audit -> Implement -> Quality -> Verify -> Test -> Complete
```

Each agent creates an output file. The orchestrator polls for these files to know when to proceed.

## v7 Fixes

- Uses `claude -p` for non-interactive execution
- 10-minute timeout on file polling (no infinite hangs)
- Explicit "use Write tool" instructions for file creation
- `direct` mode for testing individual agents
- Updated agent prompts with PDP-specific file paths

## Agent Configuration

Agent context files are in `.agents/`:
- `ux-auditor.md` - Audit instructions
- `ux-implementer.md` - Implementation patterns
- `code-quality.md` - Quality checks
- `code-verifier.md` - Verification checklist
- `qa-tester.md` - Testing procedures

## Troubleshooting

### Agent hangs
- Use `direct` mode to test: `python3 scripts/ux-orchestrator.py direct audit`
- Check if Claude is prompting for permissions
- 10-minute timeout will trigger with retry options

### Output file not created
- Agents now explicitly instructed to use Write tool
- Check agent output for errors
- Verify Claude CLI has write permissions

### tmux issues
```bash
# Kill existing session
tmux kill-session -t ux-agents

# Start fresh
python3 scripts/ux-orchestrator.py reset
```

## Related Documentation

- `.agents/` - Agent prompt files
- `docs/ux/UX_IMPLEMENTATION_AUDIT.md` - Current audit status
- `docs/ux/UX_IMPLEMENTATION_PLAN.md` - UX improvement plan
