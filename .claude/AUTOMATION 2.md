# Automated Agent Triggering with Hooks

## The Problem with Manual Commands

**Current approach requires manual intervention:**
```bash
# Every time you want analysis, you have to type:
/review-security
/quality-audit US-XXX
/architect-review
```

This is tedious and easy to forget during Ralph's autonomous runs.

## The Solution: Automatic Hooks

Claude Code supports **hooks** that automatically trigger prompts/commands when events happen. This eliminates manual steps!

## How Hooks Work

Hooks can fire on these events:

| Hook Type | When It Fires | Use Case |
|-----------|---------------|----------|
| `PreToolUse` | Before a tool executes | Validate before action |
| `PostToolUse` | After a tool executes | Auto-analyze changes |
| `SessionStart` | When Claude Code starts | Check system status |
| `SessionEnd` | When session ends | Save state, summarize |

**Hook Actions:**
- `type: "command"` → Run a shell command
- `type: "prompt-submit"` → Auto-submit a prompt to Claude (triggers AI analysis!)

## Automated Agent System

I've created an enhanced settings file that **automatically triggers agents** without manual commands:

### 1. Auto Security Review After Commits

**Trigger:** After any `git commit` bash command
**Action:** Automatically scan changed files for vulnerabilities

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "prompt-submit",
    "prompt": "If this was a git commit, review changed files for security issues...",
    "runWhen": "success"
  }]
}
```

**What happens:**
```
Ralph → git commit -m "Add notifications"
  ↓ (automatic)
Claude Code → Reads commit diff
  ↓
Claude → Scans for XSS, auth issues, secrets
  ↓
Claude → Writes findings to feedback.md
  ↓
Ralph → Reads feedback in next iteration
```

### 2. Auto Quality Check After File Edits

**Trigger:** After Write/Edit tool used
**Action:** Quick security and quality scan of modified file

```json
{
  "matcher": "Edit|Write",
  "hooks": [{
    "type": "prompt-submit",
    "prompt": "Check this file for common issues: auth bypasses, .filter() usage, XSS risks...",
    "runWhen": "always"
  }]
}
```

**What happens:**
```
Ralph → Writes packages/backend/convex/models/notifications.ts
  ↓ (automatic)
Claude → Scans file for:
         - Missing auth checks
         - .filter() usage
         - Better Auth violations
  ↓
Claude → Writes issues to feedback.md immediately
```

### 3. Session Start Health Check

**Trigger:** When Claude Code session starts
**Action:** Check if Ralph and agents are running

```json
{
  "type": "prompt-submit",
  "prompt": "Check if Ralph is running, check if agents are active...",
  "runWhen": "once"
}
```

**What happens:**
```
You → Start Claude Code
  ↓ (automatic)
Claude → Checks ps for ralph.sh
Claude → Checks for agent PIDs
  ↓
Claude → "Ralph running ✅, 5/5 agents active ✅"
```

### 4. Session End Summary

**Trigger:** When session ends
**Action:** Show feedback status for Ralph

```json
{
  "type": "command",
  "command": "wc -l scripts/ralph/agents/output/feedback.md"
}
```

## Enabling Automated Agents

### Option A: Merge into Your Existing Settings (Recommended)

Your current settings: `~/.claude/settings.json`
Enhanced settings: `~/.claude/settings-with-agent-automation.json`

**Merge manually:**

1. Open your current settings:
```bash
code ~/.claude/settings.json
```

2. Add the new hooks from `settings-with-agent-automation.json`:

**Add to PostToolUse > Edit|Write hooks:**
```json
{
  "type": "prompt-submit",
  "prompt": "File written: $CLAUDE_FILE_PATH\n\nIf this is a backend file in packages/backend/convex/models/*.ts, perform a quick security and quality check:\n1. Check for direct DB queries to auth tables (user/member/organization) without Better Auth adapter\n2. Check for .filter() usage (should use .withIndex())\n3. Check for missing authorization checks in mutations\n4. Check for XSS risks (dangerouslySetInnerHTML without sanitization)\n\nOnly report if you find issues. Write findings to scripts/ralph/agents/output/feedback.md in this format:\n\n## Quick Review - [timestamp]\n- ⚠️ Issue found in $CLAUDE_FILE_PATH:line\n  - Problem: [description]\n  - Fix: [recommendation]",
  "statusMessage": "Quick security/quality check...",
  "runWhen": "always"
}
```

**Add to PostToolUse > Bash hooks:**
```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "prompt-submit",
      "prompt": "A bash command was just executed: $CLAUDE_BASH_COMMAND\n\nIf this was a git commit (contains 'git commit'), automatically trigger a security review:\n\n1. Read the most recent commit\n2. Check all changed files for:\n   - Hardcoded secrets or API keys\n   - Security vulnerabilities (XSS, auth bypasses, etc.)\n   - Missing authorization checks\n   - Input validation issues\n\nWrite findings to scripts/ralph/agents/output/feedback.md following the security-reviewer agent pattern.\n\nOnly respond if it was a git commit, otherwise skip silently.",
      "statusMessage": "Post-commit security scan...",
      "runWhen": "success"
    }
  ]
}
```

**Add SessionStart and SessionEnd:**
```json
"SessionStart": [
  {
    "type": "prompt-submit",
    "prompt": "Session started in Ralph project.\n\nCheck if Ralph is currently running:\n1. Look for ralph.sh process\n2. Check if monitoring agents are active (scripts/ralph/agents/output/*.pid)\n3. If agents are running, show brief status\n4. If agents are not running but should be, suggest starting them\n\nBe brief (2-3 lines max).",
    "runWhen": "once"
  }
],
"SessionEnd": [
  {
    "type": "command",
    "command": "if [ -f scripts/ralph/agents/output/feedback.md ]; then echo \"📋 Feedback for Ralph: $(wc -l < scripts/ralph/agents/output/feedback.md) lines\"; fi",
    "statusMessage": "Checking Ralph feedback status..."
  }
]
```

### Option B: Replace Settings Entirely

**⚠️ This will overwrite your current hooks!**

```bash
cp ~/.claude/settings.json ~/.claude/settings.json.backup
cp ~/.claude/settings-with-agent-automation.json ~/.claude/settings.json
```

Restart Claude Code for changes to take effect.

## What You Get: Zero Manual Intervention

### Before (Manual)
```
Ralph commits code
  ↓
You notice in dashboard
  ↓
You type: /review-security latest
  ↓
Claude analyzes
  ↓
You wait for results
  ↓
Ralph reads feedback
```

### After (Automated)
```
Ralph commits code
  ↓ (hook triggers automatically)
Claude analyzes immediately
  ↓
Writes to feedback.md
  ↓
Ralph reads feedback in next iteration

✨ ZERO MANUAL STEPS ✨
```

## Hook Behavior Details

### `runWhen` Options

- `"always"` - Runs every time (can get noisy)
- `"success"` - Only runs if tool succeeded
- `"failure"` - Only runs if tool failed
- `"once"` - Runs once per session

### `prompt-submit` Type

This is the key to automation! When a hook has `"type": "prompt-submit"`:

1. Hook triggers on event
2. Prompt is automatically submitted to Claude
3. Claude processes it in the background
4. Claude writes output (like to feedback.md)
5. **You don't have to do anything!**

### Performance Impact

**Q: Won't this slow down Ralph?**

A: No! Hooks run asynchronously:
- Ralph commits code
- Hook triggers in background
- Ralph continues to next iteration
- Claude analysis completes in parallel
- Results ready in feedback.md for next iteration

**Q: Will I get spammed with agent outputs?**

A: Configure `runWhen` strategically:
- `"always"` for critical checks (security)
- `"success"` for post-action analysis
- Use conditional logic in prompts ("only report if issues found")

## Cost Considerations (Max Plan)

You mentioned you're on the **max plan**, which means:

✅ **Unlimited messages** - No cost per agent trigger
✅ **Can be aggressive** - Don't worry about triggering too often
✅ **Always-on monitoring** - Let hooks run on every event

**Recommendation:** Enable all hooks! You have unlimited usage, so maximize automation.

## Hybrid System with Automation

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  BASH AGENTS (Continuous, 30-120s loops)        │
│  ├─ quality-monitor.sh                          │
│  ├─ prd-auditor.sh                              │
│  ├─ security-tester.sh                          │
│  └─ test-runner.sh                              │
│                                                 │
│  CLAUDE HOOKS (Automatic, event-triggered)      │
│  ├─ PostToolUse(Write) → Quick quality check   │
│  ├─ PostToolUse(Bash/commit) → Security review │
│  ├─ SessionStart → Status check                │
│  └─ SessionEnd → Feedback summary              │
│                                                 │
│  ALL WRITE TO: feedback.md                      │
│                                                 │
│  Ralph reads feedback.md before each iteration  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Result:**
- Bash agents catch issues every 30-120s
- Claude hooks catch issues immediately on events
- Ralph gets comprehensive feedback with ZERO manual intervention

## Recommended Configuration for Ralph

For maximum automation during Ralph runs:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          // Keep your existing ultracite/biome hooks
          {
            "type": "prompt-submit",
            "prompt": "Quick security/quality check on $CLAUDE_FILE_PATH...",
            "runWhen": "success"  // Only if write succeeded
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt-submit",
            "prompt": "If git commit, auto security review...",
            "runWhen": "success"  // Only if commit succeeded
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "type": "prompt-submit",
        "prompt": "Check Ralph and agent status...",
        "runWhen": "once"  // Only once per session
      }
    ]
  }
}
```

## Testing the Automation

After enabling hooks:

1. **Test Write hook:**
```bash
# Create/edit a file
echo "test" > test-file.ts

# You should see: "Quick security/quality check..." in status
# Claude analyzes automatically
```

2. **Test Bash/commit hook:**
```bash
git add test-file.ts
git commit -m "test commit"

# You should see: "Post-commit security scan..." in status
# Claude reviews commit automatically
```

3. **Test SessionStart:**
```bash
# Restart Claude Code
# You should see automatic status check message
```

## Troubleshooting

**Hooks not firing:**
- Check `~/.claude/settings.json` is valid JSON
- Restart Claude Code after changes
- Check Claude Code version (hooks require v2.1+)

**Too much output:**
- Change `runWhen: "always"` to `"success"`
- Add conditions in prompt ("only report if issues found")
- Reduce hook frequency

**Hooks firing but no analysis:**
- Check prompt is being submitted (look for status message)
- Verify feedback.md is writable
- Check Claude Code logs for errors

## Next Level: Custom Hooks for Your Workflow

You can create hooks for any event! Examples:

**Auto-test after backend changes:**
```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "if echo $CLAUDE_FILE_PATH | grep -q 'convex/models'; then npm run check-types; fi",
    "statusMessage": "Type checking backend..."
  }]
}
```

**Auto-document when story completes:**
```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "prompt-submit",
    "prompt": "If prd.json was just updated with passes:true, trigger documenter agent...",
    "runWhen": "success"
  }]
}
```

---

**Bottom line:** With hooks + max plan, you can achieve **fully automated agent-driven monitoring** without any manual commands!

Enable the hooks in your settings, restart Claude Code, and watch agents work automatically as Ralph develops. 🚀
