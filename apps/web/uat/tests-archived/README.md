# Archived UAT Tests

**Archived Date**: January 19, 2026
**Reason**: Temporarily archived to focus test suite on navigation tests only

## Contents

This directory contains all UAT test suites that were temporarily archived to streamline test execution. These tests are preserved for future reactivation.

### Archived Test Suites

1. **admin/** - Admin dashboard and management tests
   - analytics.spec.ts
   - benchmarks.spec.ts
   - dashboard.spec.ts
   - DEBUG_group_expansion.spec.ts
   - DEBUG_navigation.spec.ts
   - guardian-advanced.spec.ts
   - identity.spec.ts
   - invitations.spec.ts
   - navigation.spec.ts
   - overrides.spec.ts
   - teams.spec.ts

2. **auth/** - Authentication tests
   - login.spec.ts
   - signup.spec.ts

3. **coach/** - Coach functionality tests
   - analytics-coach.spec.ts
   - assessment.spec.ts
   - dashboard.spec.ts
   - injuries.spec.ts
   - voice-notes.spec.ts

4. **cross-role/** - Cross-role functionality tests
   - cross-role.spec.ts

5. **errors/** - Error handling tests
   - error-handling.spec.ts

6. **flows/** - Flow system tests
   - flow-advanced.spec.ts
   - flow-management.spec.ts
   - flow-wizard.spec.ts
   - platform-access.spec.ts

7. **homepage/** - Homepage tests
   - homepage-advanced.spec.ts
   - homepage.spec.ts

8. **mobile/** - Mobile viewport tests
   - mobile-viewport.spec.ts

9. **org/** - Organization tests
   - announcements.spec.ts
   - dashboard.spec.ts

10. **parent/** - Parent functionality tests
    - child-management.spec.ts

11. **performance/** - Performance tests
    - performance.spec.ts

12. **platform/** - Platform management tests
    - platform-management.spec.ts

13. **player/** - Player functionality tests
    - passport.spec.ts
    - self-access.spec.ts

14. **ux/** - UX feature tests
    - ux-features.spec.ts
    - ux-testing-suite.spec.ts

## Active Tests

Currently only **navigation tests** are active in `uat/tests/navigation/`:
- navbar-comprehensive.spec.ts (31 test cases, 96.7% pass rate)

## Restoring Tests

To restore any test suite:

```bash
# Restore a specific test suite
mv uat/tests-archived/<directory> uat/tests/

# Example: Restore auth tests
mv uat/tests-archived/auth uat/tests/

# Restore all tests
mv uat/tests-archived/* uat/tests/
```

## Test Execution

While archived, these tests will not run with:
- `npm run test` (main test command)
- `npm run test:navbar` (navigation-specific command)

To run archived tests temporarily without restoring:
```bash
npx playwright test --config=uat/playwright.config.ts tests-archived/<directory>/
```

## Notes

- All test files are preserved with their original structure
- Test data and fixtures remain in their original locations
- No test code was deleted, only moved
- Tests can be restored at any time without modifications

---

**Archived by**: AI Assistant (Claude Sonnet 4.5)
**Session**: UAT Test Infrastructure Fix - January 19, 2026
**Branch**: UATNavBarTesting
