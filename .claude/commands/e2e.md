Run or generate Playwright E2E tests for PlayerARC.

## Arguments
$ARGUMENTS - Action: "run" (run all tests), "run [pattern]" (run matching tests), "generate [story-id]" (create tests for a story), "report" (show last results)

## Instructions

1. Read the e2e-runner agent definition at `.claude/agents/e2e-runner.md`

### If "run" (default)
```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts
```
- Show pass/fail summary
- For failures: show error message, file, and line
- Mention trace files and HTML report location

### If "run [pattern]"
```bash
npx -w apps/web playwright test --config=uat/playwright.config.ts -g "[pattern]"
```

### If "generate [story-id]"
1. Read the PRD at `scripts/ralph/prd.json` to find the story
2. Read the story's acceptance criteria
3. Read the implementation code for that story
4. Generate Playwright tests in `apps/web/uat/tests/[feature]/[story-id].spec.ts`
5. Map each acceptance criterion to at least one test case
6. Follow PlayerARC test patterns:
   - Use accessible selectors (`getByRole`, `getByLabel`, `getByText`)
   - Wait for Convex data with `toBeVisible({ timeout: 10000 })`, never `waitForTimeout`
   - Handle org-scoped URLs (`/orgs/[orgId]/...`)
   - Handle shadcn/ui components (Dialog, Select, etc.)
7. Run the generated tests to verify they work

### If "report"
```bash
npx -w apps/web playwright show-report uat/playwright-report
```

### Test location
All tests go in `apps/web/uat/tests/` organized by feature folder.

### Dev server
Tests expect the dev server running on `http://localhost:3000`. Don't start another one.
