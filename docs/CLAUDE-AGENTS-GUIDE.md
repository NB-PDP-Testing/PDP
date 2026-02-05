# Claude Code Agents & Automation Guide

Complete guide to the Claude Code agent infrastructure for PDP/PlayerARC.

## Quick Start

```bash
# After cloning the PDP repo:
./scripts/setup-claude-agents.sh
```

That's it. Everything lives in the repo under `.claude/` and `scripts/ralph/agents/`.

---

## Architecture Overview

```
.claude/
├── agents/          # 12 agent definitions (Task subagents)
├── commands/        # 8 slash commands (type /command-name)
├── hooks/           # 6 hook scripts (run automatically)
└── settings.json    # Hook configuration (triggers + matchers)

scripts/ralph/agents/
├── start-all.sh     # Start 6 background monitoring agents
├── stop-all.sh      # Stop all agents
├── watch-dashboard.sh  # Live terminal dashboard
├── quality-monitor.sh  # Type check + lint + auto-fix
├── prd-auditor.sh      # PRD story verification
├── documenter.sh       # Auto-documentation
├── test-runner.sh      # Playwright E2E + type checks
├── security-tester.sh  # Security scanning + Claude CLI review
└── code-review-gate.sh # Pattern checks + deep review
```

There are **3 layers** of automation:

| Layer | What | When | How |
|-------|------|------|-----|
| **Agents** | Task subagents Claude spawns | On-demand via Task tool | `.claude/agents/*.md` |
| **Slash Commands** | User-invocable shortcuts | You type `/command` | `.claude/commands/*.md` |
| **Hooks** | Automatic triggers | On file save, commit, session start/end | `.claude/settings.json` + `.claude/hooks/*.sh` |
| **Ralph Agents** | Background bash monitoring | While Ralph runs | `scripts/ralph/agents/*.sh` |

---

## Layer 1: Agent Definitions (.claude/agents/)

These are specialized subagents that Claude Code can spawn via the `Task` tool. They run as autonomous subprocess agents with their own context and tools.

### Agents

| Agent | File | Model | Purpose |
|-------|------|-------|---------|
| **Architecture Reviewer** | `architecture-reviewer.md` | opus | Pre-phase architectural review, pattern validation |
| **Architect** | `architect.md` | opus | System architecture planning |
| **Build Error Resolver** | `build-error-resolver.md` | sonnet | Fix TypeScript/Convex/Next.js build errors with minimal diffs |
| **Code Reviewer** | `code-reviewer.md` | sonnet | APPROVE/WARN/BLOCK code quality gate |
| **Refactor Cleaner** | `refactor-cleaner.md` | sonnet | Dead code detection, unused deps, duplicate files |
| **E2E Runner** | `e2e-runner.md` | sonnet | Playwright test generation and execution |
| **QA Tester** | `qa-tester.md` | sonnet | Story acceptance verification against PRD |
| **Security Reviewer** | `security-reviewer.md` | sonnet | OWASP checks, auth review, data isolation |
| **Quality Auditor** | `quality-auditor.md` | sonnet | General quality checks |
| **Test Generator** | `test-generator.md` | sonnet | Unit test generation |
| **Documenter AI** | `documenter-ai.md` | sonnet | Phase documentation generation |
| **Parent Summary** | `parent-summary-agent.md` | sonnet | Domain-specific parent feature agent |

### How agents work

Claude Code automatically reads these files and uses them when it determines a task matches the agent's description. You can also explicitly request an agent:

```
"Use the code-reviewer agent to review my staged changes"
"Run the e2e-runner to test the team hub"
```

### Key PlayerARC patterns baked into agents

All agents know these project-specific rules:
- **Convex**: Always `.withIndex()`, never `.filter()`
- **Better Auth**: `user._id` not `user.id`, `user.name` not `user.firstName`
- **N+1 prevention**: Batch fetch + Map lookup pattern
- **Org isolation**: All queries must filter by `organizationId`
- **Frontend**: Lift `useQuery` to parent, pass as props
- **Code quality**: Biome/Ultracite formatting, returns validators required

---

## Layer 2: Slash Commands (.claude/commands/)

Type these in Claude Code to trigger specific workflows.

| Command | Args | What it does |
|---------|------|-------------|
| `/architect-review` | none | Spawns opus-level architecture review of the current PRD phase |
| `/check-prd` | none | Reads `scripts/ralph/prd.json`, shows story status with pass/fail |
| `/review-security` | `latest\|all\|story-id` | Deep security review of recent changes or specific story |
| `/document-phase` | `feature-slug` | Generates comprehensive docs for a completed phase |
| `/build-fix` | none | Runs diagnostics (check-types, codegen, build) and fixes errors |
| `/code-review` | `staged\|all\|main` | Reviews code changes for quality and pattern adherence |
| `/refactor-clean` | `analyze\|clean` | Finds dead code, unused deps, duplicate files |
| `/e2e` | `run\|run pattern\|generate story-id\|report` | Run or generate Playwright E2E tests |

### Examples

```
/check-prd
/build-fix
/code-review staged
/e2e run team-hub
/review-security latest
/architect-review
/refactor-clean analyze
/document-phase voice-gateways-v2
```

---

## Layer 3: Hooks (.claude/settings.json)

Hooks run automatically based on triggers. Configured in `.claude/settings.json`.

### PostToolUse Hooks (after Claude uses a tool)

| Trigger | What happens |
|---------|-------------|
| **File Edit/Write** | Auto-format with `npx ultracite fix` |
| **File Edit/Write** | Lint check with `npx biome check` |
| **File Edit/Write** | Quality check on backend files (Better Auth violations, .filter() usage) |
| **Git Commit** | Security review (secrets, XSS, injection, missing auth, console.log) |

### PreToolUse Hooks (before Claude uses a tool)

| Trigger | What happens |
|---------|-------------|
| **Dangerous Bash** | Blocks `git reset --hard`, `git clean -f`, `rm -rf /` |
| **Markdown Write** | Warns when creating `.md` files outside `docs/`, `scripts/ralph/`, `.claude/` |

### SessionStart Hooks

| Trigger | What happens |
|---------|-------------|
| **Any session** | Shows Ralph status (running/stopped, agent count, story progress) |
| **Any session** | Checks for new PRD phases, recommends `/architect-review` |

### SessionEnd / Stop Hooks

| Trigger | What happens |
|---------|-------------|
| **Session end** | Shows session summary (stories, feedback, commits) |
| **Stop** | Checks for leftover `console.log` in changed files |

### Hook Scripts

| Script | Purpose |
|--------|---------|
| `session-start.sh` | Ralph/agent status display |
| `check-new-prd.sh` | New PRD phase detection |
| `quality-check.sh` | Backend file quality patterns |
| `security-check.sh` | Post-commit security scan |
| `dangerous-command-check.sh` | Destructive command blocker |
| `session-end.sh` | Session summary |

---

## Layer 4: Ralph Background Agents (scripts/ralph/agents/)

These are bash scripts that run in the background while Ralph (the autonomous coding agent) works. They poll for issues and write feedback to `scripts/ralph/agents/output/feedback.md`.

### Starting/Stopping

```bash
# Start all 6 agents (run in separate terminal)
./scripts/ralph/agents/start-all.sh

# Watch live dashboard (another terminal)
./scripts/ralph/agents/watch-dashboard.sh

# Stop all agents
./scripts/ralph/agents/stop-all.sh
```

### The 6 Agents

| # | Agent | Interval | What it does |
|---|-------|----------|-------------|
| 1 | **Quality Monitor** | 60s | `npm run check-types` + `npx biome check` + auto-fix with ultracite + Claude CLI |
| 2 | **PRD Auditor** | 5min | Reads `prd.json`, verifies story implementations via Claude CLI |
| 3 | **Documenter** | 120s | Generates feature docs when stories complete |
| 4 | **Test Runner** | 30s | Runs Playwright E2E tests + type checks + lint |
| 5 | **Security Tester** | 120s | Grep-based security scan + deep Claude CLI review on milestones |
| 6 | **Code Review Gate** | 45s | Pattern checks on new commits + deep Claude CLI review every 3rd commit |

### Requirements for Ralph agents

- **Claude CLI**: Agents 2, 4, 5, 6 use `claude --print` for deep analysis. Install: `npm install -g @anthropic-ai/claude-code`
- **jq**: Used by PRD auditor and dashboard. Install: `brew install jq`
- **Playwright**: Used by test runner. Already in repo: `@playwright/test`
- **Dev server**: Test runner checks `localhost:3000` before running E2E tests

### Output files

All agent output goes to `scripts/ralph/agents/output/`:

| File | Content |
|------|---------|
| `feedback.md` | Aggregated feedback from all agents (Ralph reads this) |
| `quality-monitor.log` | Quality monitor output |
| `test-runner.log` | Test runner output |
| `security-tester.log` | Security scan results |
| `security-report.md` | Latest security report |
| `code-review-gate.log` | Code review output |
| `*.pid` | PID files for running agents |

---

## File Reference

### Complete file listing

```
# Agent Definitions (Claude reads these automatically)
.claude/agents/architect.md
.claude/agents/architecture-reviewer.md
.claude/agents/build-error-resolver.md
.claude/agents/code-reviewer.md
.claude/agents/documenter-ai.md
.claude/agents/e2e-runner.md
.claude/agents/parent-summary-agent.md
.claude/agents/qa-tester.md
.claude/agents/quality-auditor.md
.claude/agents/refactor-cleaner.md
.claude/agents/security-reviewer.md
.claude/agents/test-generator.md

# Slash Commands (type /name in Claude Code)
.claude/commands/architect-review.md
.claude/commands/build-fix.md
.claude/commands/check-prd.md
.claude/commands/code-review.md
.claude/commands/document-phase.md
.claude/commands/e2e.md
.claude/commands/refactor-clean.md
.claude/commands/review-security.md

# Hook Configuration
.claude/settings.json

# Hook Scripts
.claude/hooks/check-new-prd.sh
.claude/hooks/dangerous-command-check.sh
.claude/hooks/quality-check.sh
.claude/hooks/security-check.sh
.claude/hooks/session-end.sh
.claude/hooks/session-start.sh

# Ralph Background Agents
scripts/ralph/agents/start-all.sh
scripts/ralph/agents/stop-all.sh
scripts/ralph/agents/watch-dashboard.sh
scripts/ralph/agents/quality-monitor.sh
scripts/ralph/agents/prd-auditor.sh
scripts/ralph/agents/documenter.sh
scripts/ralph/agents/test-runner.sh
scripts/ralph/agents/security-tester.sh
scripts/ralph/agents/code-review-gate.sh

# Setup Script
scripts/setup-claude-agents.sh
```

---

## Adapting for a Different Project

If you want to use these agents on a **non-PDP project**, you need to customize:

### 1. Agent definitions - Replace PlayerARC-specific patterns

In each `.claude/agents/*.md` file, replace:
- Convex patterns with your ORM/database patterns
- Better Auth references with your auth system
- File paths (`packages/backend/convex/models/`) with your structure
- Framework-specific checks (Next.js App Router, shadcn/ui)

### 2. Hook scripts - Update paths and tools

In `.claude/hooks/`:
- `quality-check.sh`: Replace Convex/Better Auth checks with your patterns
- `security-check.sh`: Update mutation file paths and auth function names
- `session-start.sh`: Update `prd.json` path or remove PRD checks
- Replace `npx ultracite fix` with your formatter
- Replace `npx biome check` with your linter

### 3. Settings.json - Update matchers

In `.claude/settings.json`:
- Update `tool_input.file_path matches` patterns for your file structure
- Update the markdown warning path exclusions

### 4. Ralph agents - Heavy customization needed

The bash agents in `scripts/ralph/agents/` are deeply tied to:
- `scripts/ralph/prd.json` (PRD tracking format)
- Convex codegen (`npx -w packages/backend convex codegen`)
- Playwright config path (`apps/web/uat/playwright.config.ts`)
- Project-specific grep patterns for code review

### What's portable as-is

These work on any project without changes:
- `dangerous-command-check.sh` - Blocks destructive git/rm commands
- `session-end.sh` - Generic git commit counter
- Console.log detection hook
- Markdown file creation warning (update path exclusions)
- `/build-fix` command pattern (update build commands)
- `/code-review` command pattern (universal)
- `refactor-cleaner.md` agent (uses standard tools like knip, depcheck)

---

## Troubleshooting

### Slash commands not showing up
- Commands must be `.md` files in `.claude/commands/` (not `.sh`)
- Restart Claude Code after adding new commands

### Hooks not firing
- Check `.claude/settings.json` syntax is valid JSON
- Verify hook scripts are executable: `chmod +x .claude/hooks/*.sh`
- Check hook matchers match the tool names exactly

### Ralph agents crash immediately
- Ensure `jq` is installed: `brew install jq`
- Ensure `scripts/ralph/prd.json` exists (create a minimal one if needed)
- Check logs: `tail -f scripts/ralph/agents/output/*.log`

### Playwright tests fail
- Ensure dev server is running on `localhost:3000`
- Run `npx -w apps/web playwright install chromium` if browsers missing
- Check config: `apps/web/uat/playwright.config.ts`

### Claude CLI not found (in Ralph agents)
- Install: `npm install -g @anthropic-ai/claude-code`
- Verify: `claude --version`
- Deep review features in agents 2, 4, 5, 6 require Claude CLI
