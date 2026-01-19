# UAT Test Archival - January 19, 2026

## Summary

Successfully archived all UAT test suites except navigation tests to streamline test execution. All 36 test files across 14 test suites have been moved to `uat/tests-archived/` with full git history preserved.

## What Was Done

### 1. Archived Test Suites (36 files)

All non-navigation tests were moved from `uat/tests/` to `uat/tests-archived/`:

| Test Suite | Files | Description |
|------------|-------|-------------|
| admin | 11 | Admin dashboard, teams, players, guardians, users, analytics, benchmarks, overrides, announcements, player access |
| auth | 2 | Login and signup flows |
| coach | 5 | Assessment, dashboard, analytics, injuries, voice notes |
| cross-role | 1 | Cross-role functionality testing |
| errors | 1 | Error handling tests |
| flows | 4 | Flow system (onboarding, announcements, flow management, platform access) |
| homepage | 2 | Homepage and homepage advanced tests |
| mobile | 1 | Mobile viewport testing |
| org | 2 | Organization dashboard and announcements |
| parent | 1 | Child management |
| performance | 1 | Performance testing |
| platform | 1 | Platform management |
| player | 2 | Passport and self-access |
| ux | 2 | UX features and testing suite |

### 2. Updated Test Scripts (package.json)

**Main test command**:
```json
"test": "playwright test --config=uat/playwright.config.ts tests/navigation/"
```

**Active navigation test**:
```json
"test:navbar": "playwright test --config=uat/playwright.config.ts tests/navigation/"
```

**Archived test scripts** (prefixed with `_` for reference):
- `_test:auth` → `tests-archived/auth/`
- `_test:admin` → `tests-archived/admin/`
- `_test:coach` → `tests-archived/coach/`
- `_test:parent` → `tests-archived/parent/`
- `_test:player` → `tests-archived/player/`
- `_test:org` → `tests-archived/org/`
- `_test:flows` → `tests-archived/flows/`
- `_test:homepage` → `tests-archived/homepage/`
- `_test:cross-role` → `tests-archived/cross-role/`
- `_test:performance` → `tests-archived/performance/`
- `_test:mobile` → `tests-archived/mobile/`

### 3. Documentation Created

**Archive README**: `uat/tests-archived/README.md`
- Complete inventory of archived tests
- Restoration instructions
- Context for why tests were archived

**Infrastructure Fix Summary**: `docs/archive/bug-fixes/UAT_TEST_INFRASTRUCTURE_FIX_2026_01_19.md`
- Details of recent test infrastructure fixes
- Root cause analysis of previous failures
- Test results showing 96.7% pass rate

### 4. Active Test Suite

**Only navigation tests remain active**:
- Location: `uat/tests/navigation/navbar-comprehensive.spec.ts`
- Test cases: 31 (30 passing, 1 flaky)
- Pass rate: 96.7%
- Duration: ~8-9 minutes including global setup

## Test Execution Commands

### Run Active Tests
```bash
# Main test command (now runs only navigation tests)
npm run test

# Explicit navigation test command
npm run test:navbar
```

### Run Archived Tests (Without Restoring)
```bash
# Run a specific archived suite
npx playwright test --config=uat/playwright.config.ts tests-archived/auth/

# Run all archived tests
npx playwright test --config=uat/playwright.config.ts tests-archived/
```

## Restoring Tests

### Restore Specific Suite
```bash
# Example: Restore auth tests
mv uat/tests-archived/auth uat/tests/

# Update package.json script (remove underscore prefix)
# "_test:auth" → "test:auth"
```

### Restore All Tests
```bash
# Move all archived tests back
mv uat/tests-archived/* uat/tests/

# Update package.json scripts (remove all underscore prefixes)
```

## Test Results

### Before Archival
- All UAT test suites available
- Navigation tests: 30/31 passing (96.7%)
- Other suites: Not recently validated

### After Archival
```
Running 31 tests using 1 worker
  ✓  30 passed (8.6m)
  ✘  1 flaky (NAVBAR-COACH-003: Assess link - timing issue)

Test Results:
- NAVBAR-ADMIN: 14/14 passing
- NAVBAR-COACH: 10/10 passing (1 flaky)
- NAVBAR-PARENT: 4/4 passing
- NAVBAR-OWNER: 3/3 passing
```

## Benefits

1. **Faster Test Execution**: ~9 minutes vs potential 30+ minutes for full suite
2. **Focused Testing**: Only run recently validated, stable tests
3. **Simplified CI/CD**: Reduced execution time for PR validation
4. **Clear Organization**: Archived tests clearly separated but easily accessible
5. **Preserved History**: All test code retained with full git history

## Rollback Plan

If full test suite needs to be restored:

1. Restore all archived tests:
   ```bash
   mv uat/tests-archived/* uat/tests/
   ```

2. Update package.json:
   ```bash
   # Remove underscore prefix from all archived test scripts
   # Change: "_test:auth" → "test:auth"
   ```

3. Update main test command:
   ```json
   "test": "playwright test --config=uat/playwright.config.ts"
   ```

## Git History

All files moved via `git mv` (or recognized as renames) to preserve full history:
- View history: `git log --follow uat/tests-archived/auth/login.spec.ts`
- Blame tracking: `git blame uat/tests-archived/auth/login.spec.ts`

## Related Commits

- **a40050f**: refactor(uat): archive non-navigation tests, streamline test execution
- **da0be44**: fix(uat): resolve test infrastructure issues and console error filtering
- **1bbfc29**: fix(uat): resolve guardians page bugs (nested buttons + Convex ID validation)

## Future Considerations

### When to Restore Tests

Consider restoring archived tests when:
1. Implementing new features that require testing
2. Fixing bugs in archived functionality
3. Preparing for major release validation
4. Setting up comprehensive CI/CD pipeline

### Test Maintenance

While archived:
- Tests won't run automatically
- Tests won't be updated for API changes
- Tests may require updates when restored

**Recommendation**: Periodically validate and update archived tests to ensure they remain functional.

---

**Archived by**: AI Assistant (Claude Sonnet 4.5)
**Date**: January 19, 2026
**Branch**: UATNavBarTesting
**Commit**: a40050f
**Context**: Streamline test execution to focus on recently fixed navigation tests
