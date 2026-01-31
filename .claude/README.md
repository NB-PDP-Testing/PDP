# Claude Code Agent System

This directory contains the **native Claude Code agent configuration** for intelligent monitoring and analysis during Ralph's autonomous development runs.

## Overview: Hybrid Agent System

We use a **hybrid approach** combining two types of agents:

### 1. Bash Monitoring Agents (Continuous)
**Location:** `scripts/ralph/agents/*.sh`
**Purpose:** Fast, continuous monitoring via polling loops

| Agent | Runs Every | Purpose |
|-------|------------|---------|
| `quality-monitor.sh` | 60s | Type checks, lint, pattern violations |
| `prd-auditor.sh` | 90s | Story verification against implementation |
| `documenter.sh` | 120s | Basic documentation extraction |
| `security-tester.sh` | 120s | Core security checks (secrets, dependencies) |
| `test-runner.sh` | 30s | Execute tests and report failures |

**How they work:**
- Run in background as shell scripts
- Poll for changes continuously
- Write findings to `scripts/ralph/agents/output/feedback.md`
- Ralph reads feedback before each iteration

### 2. Claude Code Native Agents (On-Demand)
**Location:** `.claude/agents/*.md`
**Purpose:** Deep AI-powered analysis when triggered

| Agent | Model | Purpose |
|-------|-------|---------|
| `security-reviewer.md` | Sonnet 4.5 | Deep vulnerability analysis |
| `quality-auditor.md` | Sonnet 4.5 | Intelligent code quality review |
| `architect.md` | Opus 4.5 | Pre-phase architectural planning |
| `test-generator.md` | Sonnet 4.5 | Generate comprehensive test suites |
| `documenter-ai.md` | Sonnet 4.5 | AI-powered documentation synthesis |

**How they work:**
- Defined as markdown agent specifications
- Invoked via Claude Code's Task tool or slash commands
- Use all Claude Code tools (Read, Grep, Glob, Write, Bash)
- Provide deep analysis beyond what bash scripts can do
- Write to same `feedback.md` for Ralph integration

## Why Both?

**Bash agents provide:**
- ✅ Fast continuous monitoring (no AI latency)
- ✅ Zero cost (no API calls)
- ✅ Independent operation (separate processes)
- ✅ Simple dashboards and logs
- ✅ Immediate detection of basic issues

**Claude agents provide:**
- ✅ Intelligent analysis (understand context)
- ✅ Deep insights (beyond pattern matching)
- ✅ Comprehensive reports (synthesis, not just extraction)
- ✅ Architectural reasoning (trade-offs, decisions)
- ✅ Learning from code (reusable patterns)

**Together:** Fast continuous checks + deep intelligent analysis = comprehensive quality assurance

---

## Agent Definitions

### Security Reviewer

**File:** `.claude/agents/security-reviewer.md`

**Triggers:**
- Manual: `/review-security`
- Post-commit hook (automatic)
- After story completion

**Capabilities:**
- OWASP Top 10 vulnerability scanning
- Authentication/authorization analysis
- XSS, CSRF, injection attack detection
- Secrets exposure detection
- Rate limiting verification
- Phase-specific security patterns

**Output:** Detailed security report with severity levels (CRITICAL, HIGH, MEDIUM)

**Example invocation:**
```bash
# Via Claude Code
/review-security latest

# Via Task tool
Task: {
  subagent_type: "security-reviewer",
  prompt: "Review security of latest commit"
}
```

---

### Quality Auditor

**File:** `.claude/agents/quality-auditor.md`

**Triggers:**
- After story marked complete
- Manual: `/quality-audit US-XXX`

**Capabilities:**
- Code pattern analysis (beyond linting)
- Performance optimization review
- TypeScript quality assessment
- UX pattern verification
- Testing coverage analysis
- Architectural consistency checks

**Output:** Quality score (Excellent/Good/Acceptable/Needs Work) + specific recommendations

---

### Architect

**File:** `.claude/agents/architect.md`

**Triggers:**
- **Before Ralph starts a phase** (recommended)
- Manual: `/architect-review`

**Capabilities:**
- Review PRD for architectural impact
- Generate Architecture Decision Records (ADRs)
- Document design trade-offs
- Identify scalability/security concerns
- Provide implementation guidance
- Create system diagrams

**Output:**
- ADRs in `docs/architecture/decisions/`
- Implementation guidance in `feedback.md`
- Mermaid diagrams for complex features

**Recommended workflow:**
```bash
# 1. Create PRD for new phase
# 2. Run architect review
/architect-review

# 3. Review generated ADRs
cat docs/architecture/decisions/ADR-*.md

# 4. Start Ralph with architectural guidance
./scripts/ralph/ralph.sh
```

---

### Test Generator

**File:** `.claude/agents/test-generator.md`

**Triggers:**
- After story completion
- Manual: `/generate-tests US-XXX`

**Capabilities:**
- Generate UAT test scenarios
- Create unit tests (Vitest)
- Identify edge cases
- Design integration tests
- Analyze test coverage gaps

**Output:**
- UAT scenarios: `scripts/ralph/agents/output/tests/[story]-uat.md`
- Unit tests: `packages/backend/convex/__tests__/[story].test.ts`
- Coverage analysis in `feedback.md`

---

### AI Documenter

**File:** `.claude/agents/documenter-ai.md`

**Triggers:**
- After phase completion
- Manual: `/document-phase [slug]`

**Capabilities:**
- Synthesize comprehensive documentation
- Extract architectural patterns
- Document challenges and solutions
- Analyze reusable components
- Generate developer onboarding materials

**Output:** Professional documentation in `docs/features/[slug].md`

---

## Commands

Slash commands for easy agent invocation:

### `/review-security [scope]`

**File:** `.claude/commands/review-security.sh`

Trigger security review agent.

**Scopes:**
- `latest` - Most recent commit (default)
- `all` - All changes in branch
- `story US-XXX` - Specific story

**Example:**
```bash
/review-security latest
```

### `/architect-review [prd-file]`

**File:** `.claude/commands/architect-review.sh`

Run architectural planning before starting a phase.

**Example:**
```bash
/architect-review scripts/ralph/prd.json
```

### `/quality-audit [story-id]`

Perform deep quality review of completed story.

### `/generate-tests [story-id]`

Generate test suite for completed story.

### `/document-phase [slug]`

Generate comprehensive AI-powered documentation.

---

## Integration with Ralph

### Feedback Loop

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Ralph Iteration Loop                               │
│                                                     │
│  1. Read feedback.md                                │
│  2. Implement story                                 │
│  3. Mark story complete                             │
│  4. Commit changes                                  │
│     │                                               │
│     ├──> Bash agents detect (30-120s)              │
│     │    ├─ Type check                             │
│     │    ├─ Lint check                             │
│     │    ├─ Run tests                              │
│     │    └─ Write issues to feedback.md            │
│     │                                               │
│     └──> Triggers Claude agents (optional)          │
│          ├─ Security review                         │
│          ├─ Quality audit                           │
│          ├─ Test generation                         │
│          └─ Write analysis to feedback.md           │
│                                                     │
│  5. Next iteration reads feedback                   │
│  6. Ralph fixes issues                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### When Each Agent Runs

**Continuous (Bash):**
- Every 30-120s during Ralph's run
- Always monitoring, always writing feedback

**On-Demand (Claude):**
- Manually triggered by developer
- Automatically via hooks (if configured)
- After major milestones (story complete, phase complete)

---

## Setup & Usage

### Quick Start

**1. Bash monitoring agents already running?**
```bash
ps aux | grep -E "(quality-monitor|prd-auditor|test-runner)"
```

**2. Start bash agents if needed:**
```bash
./scripts/ralph/agents/start-all.sh
```

**3. Use Claude agents as needed:**
```bash
# Before starting Ralph
/architect-review

# During Ralph's run (if you see a commit that concerns you)
/review-security latest

# After Ralph completes
/document-phase phase-9-week-2
```

### Recommended Workflow

#### Before Ralph Starts

```bash
# 1. Run architect agent
/architect-review scripts/ralph/prd.json

# 2. Review ADRs
cat docs/architecture/decisions/ADR-*.md

# 3. Start bash monitoring
./scripts/ralph/agents/start-all.sh

# 4. Start Ralph
./scripts/ralph/ralph.sh
```

#### During Ralph's Run

```bash
# Monitor via dashboard
./scripts/ralph/agents/watch-dashboard.sh

# Bash agents automatically:
# - Check types every 60s
# - Run tests every 30s
# - Audit stories every 90s

# Manually trigger Claude agents if needed:
/review-security latest    # If you see concerning code
/quality-audit US-P9-015   # Deep review of completed story
```

#### After Ralph Completes

```bash
# Generate comprehensive docs
/document-phase phase-9-week-2

# Stop bash agents
./scripts/ralph/agents/stop-all.sh

# Review all feedback
cat scripts/ralph/agents/output/feedback.md
```

---

## Configuration

### Adding New Claude Agents

1. **Create agent definition:**
```bash
touch .claude/agents/my-agent.md
```

2. **Define agent in markdown:**
```markdown
# My Agent Name

**Purpose:** [What this agent does]
**Model:** claude-sonnet-4-5-20250929
**Tools:** Read, Grep, Glob, Write, Bash

---

## Agent Capabilities
[Describe what the agent knows]

## Your Mission
[What the agent should do when invoked]

## Workflow
[Step-by-step process]
```

3. **Create command wrapper:**
```bash
cat > .claude/commands/my-command.sh << 'EOF'
#!/bin/bash
# Description of command
echo "Invoking my-agent..."
# Task invocation goes here
EOF
chmod +x .claude/commands/my-command.sh
```

4. **Invoke via Task tool or slash command:**
```javascript
Task({
  subagent_type: "my-agent",
  prompt: "Do the thing",
  description: "My agent task"
})
```

### Customizing for Different Phases

Update phase-specific checks in agents:

**Security Reviewer:** Update phase checks (line ~160):
```markdown
For **Phase 10 (Analytics)**:
- Check for data export permission violations
- Verify query pagination (prevent DOS)
- Validate date range limits
```

**Quality Auditor:** Add phase-specific patterns:
```markdown
**Phase 10 Patterns:**
- ✅ Analytics queries use aggregation pipelines
- ✅ Date ranges validated (max 1 year)
- ✅ Results cached with TTL
```

---

## Monitoring Dashboards

### Live Dashboard (Auto-Refreshing)

```bash
./scripts/ralph/agents/watch-dashboard.sh
```

Shows:
- Ralph status (running/stopped)
- All bash agent statuses (5/5)
- Story progress (6/14 complete)
- Recent commits
- Latest agent logs
- Pending feedback

Updates every 5 seconds, detects new completions and commits.

Press Ctrl+C to stop the dashboard.

### Individual Agent Logs

```bash
# Watch specific agent
tail -f scripts/ralph/agents/output/quality-monitor.log
tail -f scripts/ralph/agents/output/security-tester.log

# Watch all
tail -f scripts/ralph/agents/output/*.log
```

---

## Troubleshooting

### Claude Agents Not Invoking

**Check:**
1. Agent definition exists: `ls .claude/agents/`
2. Command is executable: `chmod +x .claude/commands/*.sh`
3. Claude Code version supports Task tool (v2.1+)

**Invoke manually:**
```
Task: {
  subagent_type: "security-reviewer",
  prompt: "Review latest commit",
  description: "Security review"
}
```

### Bash Agents Not Running

**Check:**
```bash
# Are they running?
ps aux | grep -E "(quality-monitor|prd-auditor)"

# Check PIDs
ls -la scripts/ralph/agents/output/*.pid

# Restart all
./scripts/ralph/agents/stop-all.sh
./scripts/ralph/agents/start-all.sh
```

### Feedback Not Reaching Ralph

**Check:**
1. Feedback file exists: `ls scripts/ralph/agents/output/feedback.md`
2. Ralph is reading it: `grep "feedback.md" scripts/ralph/ralph.sh`
3. Feedback is being written: `tail scripts/ralph/agents/output/feedback.md`

---

## Cost Considerations

### Bash Agents: $0 (Free)
- Pure shell scripts, no API calls
- Run continuously with no cost

### Claude Agents: Pay Per Use
- **Security Reviewer:** ~$0.02-0.05 per review (500-1000 tokens)
- **Quality Auditor:** ~$0.03-0.07 per audit
- **Architect:** ~$0.20-0.50 per phase (Opus, comprehensive analysis)
- **Test Generator:** ~$0.05-0.10 per story
- **AI Documenter:** ~$0.10-0.30 per phase

**Recommended:** Use Claude agents selectively for high-value analysis, rely on bash agents for continuous monitoring.

---

## Architecture Philosophy

**Why this hybrid approach?**

1. **Fast feedback loops** - Bash agents catch basics in seconds
2. **Deep intelligence** - Claude agents provide insights no script can
3. **Cost effective** - Only pay for AI when you need it
4. **Complementary** - Each system does what it's best at
5. **Seamless integration** - Both write to same feedback.md for Ralph

**The result:** Ralph gets comprehensive feedback from fast continuous checks AND deep intelligent analysis, catching issues immediately while building quality code.

---

## Next Steps

1. **Explore agent definitions:** Read `.claude/agents/*.md` to understand capabilities
2. **Try commands:** Run `/architect-review` or `/review-security`
3. **Monitor Ralph:** Start bash agents and watch dashboard
4. **Customize:** Add phase-specific checks to agents
5. **Extend:** Create new agents for your specific needs

---

*For bash agent details, see `/scripts/ralph/agents/README.md`*
*For project documentation, see `/docs/README.md`*
