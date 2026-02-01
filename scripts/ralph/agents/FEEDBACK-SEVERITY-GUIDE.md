# Agent Feedback Severity Guide

This guide defines **when** and **how** agents should categorize feedback to prevent progress.txt bloat.

## Purpose

Ralph's `progress.txt` should only contain **CRITICAL** issues that block development. Warnings and code review items should remain in `feedback.md` only.

## Severity Levels

### 🔴 CRITICAL (Goes to progress.txt)

**Definition:** Issues that **BLOCK** development or break functionality.

**Use these markers:**
- `❌ **TYPE ERRORS for {story_id}:**` - TypeScript compilation errors
- `❌ **UNIT TEST FAILURES for {story_id}:**` - Test failures
- `❌ **CODEGEN FAILED for {story_id}:**` - Convex schema/codegen errors
- `💥 BUILD FAILURE` - Application fails to build
- `🔴 CRITICAL` - Generic critical blocker

**Examples:**
```markdown
❌ **TYPE ERRORS for US-P9-001:**
\`\`\`
apps/web/src/app/page.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'.
\`\`\`
**Action Required:** Fix these type errors before marking story complete.
```

### ⚠️ WARNING (Stays in feedback.md only)

**Definition:** Code quality issues that don't break functionality.

**Use these markers:**
- `⚠️ MEDIUM: XSS Risk Detected` - Security code review items
- `⚠️ MEDIUM: Possible Missing Authorization` - Auth review items
- `ℹ️ INFO: Debug Logging Found` - Console.log statements
- `⚠️ Biome lint errors found` - Linting issues
- `❌ **NEW LINT ERRORS for {story_id}:**` - Lint regression (not blocking)

**Examples:**
```markdown
⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage in:
- apps/web/src/components/ui/confetti.tsx
**Fix:** Sanitize with DOMPurify before rendering
```

## Agent Implementation

### test-runner.sh ✅ (Already Correct)
- Uses `❌ **TYPE ERRORS` for type failures
- Uses `❌ **UNIT TEST FAILURES` for test failures
- Uses `❌ **CODEGEN FAILED` for schema errors
- Uses `❌ **NEW LINT ERRORS` for lint (WARNING, not CRITICAL)

### security-tester.sh ⚠️ (Needs Update)
- Currently marks all findings as `⚠️ MEDIUM` or `ℹ️ INFO`
- **SHOULD ONLY use 🔴 CRITICAL for:**
  - Runtime security exploits (SQL injection, RCE)
  - Exposed secrets (API keys, passwords)
  - Broken authentication (bypasses)
- **Keep as ⚠️ WARNING:**
  - XSS risks (code review)
  - Missing auth checks (code review)
  - Debug logging

### quality-monitor.sh ⚠️ (Needs Update)
- Currently marks lint errors as `⚠️`
- **SHOULD use 🔴 CRITICAL for:**
  - Type check failures (`tsc --noEmit` errors)
  - Build failures
- **Keep as ⚠️ WARNING:**
  - Lint errors (Biome)
  - Formatting issues

## Ralph's Filtering Logic

In `ralph.sh`, the `check_agent_feedback()` function:

```bash
CRITICAL_FEEDBACK=$(grep -B 2 -A 20 \
  "❌ \*\*TYPE ERRORS\|❌ \*\*UNIT TEST FAILURES\|❌ \*\*CODEGEN FAILED\|🔴 CRITICAL\|💥 BUILD FAILURE" \
  "$AGENTS_FEEDBACK_FILE" || echo "")
```

- **If CRITICAL found:** Appends to progress.txt under "⚠️ CRITICAL ISSUES (FIX ASAP)"
- **If only warnings:** Displays "Agent feedback found (warnings only - not appending to progress.txt)"

## Best Practices

1. **Be conservative** - Only mark truly blocking issues as CRITICAL
2. **Provide context** - Include file paths, line numbers, error messages
3. **Suggest fixes** - Tell Ralph exactly what needs to change
4. **No duplicates** - Don't repeat the same warning every 30 seconds (track what's been reported)

## Migration Path

When updating existing agents:
1. Read this guide
2. Identify what should be CRITICAL vs WARNING in your agent
3. Update `write_feedback()` calls to use correct markers
4. Test with a mock failure to verify Ralph sees it in progress.txt
