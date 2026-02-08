Fix the bug described in GitHub issue #$ARGUMENTS.

Follow this structured workflow exactly. DO NOT skip phases or combine steps.

---

## Phase 1: Read the Bug Report

1. Run `gh issue view $ARGUMENTS --repo NB-PDP-Testing/PDP` to get the full issue details.
2. Read all comments: `gh api repos/NB-PDP-Testing/PDP/issues/$ARGUMENTS/comments`
3. Summarize: what is the expected behavior, what is the actual behavior, and what are the reproduction steps.

---

## Phase 2: Investigate the Codebase

1. **Find ALL related files.** Use Glob and Grep to search for every file involved in the bug's code path. This project has multiple similar pages per role (coach, parent, admin) -- find them all.
2. **Trace the full code path.** From the UI component through hooks, API calls, backend queries/mutations, and schema. Read each file.
3. **Check for duplicates.** Search for duplicate components or similar implementations that might be the actual target vs. what you initially assumed.
4. **Determine current state.** Is the bug still active or was it already fixed in a recent commit? Check git log for recent changes to the relevant files.
5. **Identify root cause.** Find the actual root cause, not just the symptom. Document what goes wrong and why.

---

## Phase 3: Present Findings and STOP

**MANDATORY APPROVAL GATE -- DO NOT PROCEED PAST THIS POINT WITHOUT USER CONFIRMATION.**

Present to the user:
- **Bug summary:** One sentence describing the issue
- **Root cause:** What specifically is wrong and in which file(s)
- **All related files found:** List every file that is part of this code path
- **Proposed fix:** Describe the minimal change needed, including which file(s) to edit
- **Risk assessment:** What else could be affected by this change
- **Questions:** Anything you are unsure about

Then say: **"Ready to implement? Please confirm or redirect."**

Wait for the user's explicit approval before continuing.

---

## Phase 4: Implement the Fix

1. Make the **minimal** change needed. Do not refactor surrounding code, add comments to unchanged lines, or "improve" things that aren't broken.
2. **Co-locate imports with usage** -- add any new imports in the same edit as the code that uses them (the auto-formatter removes unused imports).
3. Run verification:
   ```bash
   npx -w packages/backend convex codegen
   npm run check-types
   npx ultracite fix
   npm run check
   ```
4. If any check fails, fix the issue and re-run. Do not skip verification.

---

## Phase 5: Document, Branch, Commit, and PR

1. **Create bug-fix doc:** Write `docs/archive/bug-fixes/BUG_FIX_$ARGUMENTS_<short_description>.md` with:
   - Issue number and title
   - Root cause analysis
   - What was changed and why
   - Files modified

2. **Create branch and commit:**
   ```
   git checkout -b fix/issue-$ARGUMENTS-<short-description>
   ```
   Stage only the relevant files (not unrelated changes). Commit with message:
   ```
   fix: <description> (#$ARGUMENTS)
   ```

3. **Create PR:**
   Use `gh pr create` with a body that references the issue: `Fixes #$ARGUMENTS`

4. **Post to GitHub issue:**
   ```bash
   gh issue comment $ARGUMENTS --repo NB-PDP-Testing/PDP --body-file docs/archive/bug-fixes/BUG_FIX_$ARGUMENTS_<short_description>.md
   ```

---

## Rules

- **Never skip the Phase 3 approval gate.** Even if the fix seems obvious.
- **Never dismiss user feedback.** If the user says the fix didn't work, re-investigate with actual evidence (console output, database queries, screenshots).
- **Always search for duplicates.** The most common mistake is editing the wrong file because a similar file exists.
- **Minimal changes only.** A bug fix is not an opportunity to refactor.
