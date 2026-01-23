# Archive: Testing Documentation

**Last Updated**: January 21, 2026
**Document Count**: 6 files
**Retention Policy**: Varies by document type (see below)

---

## Purpose

This directory contains archived testing documentation including test reports, testing sessions, and historical testing artifacts. Active testing documentation lives in `/docs/testing/`.

**What's Here**: Historical test reports, testing session logs, archived test plans
**What's NOT Here**: Active test plans (in `/docs/testing/`), automated test code (in `apps/web/uat/`)

---

## Retention Policy

### Test Session Logs: DELETE AFTER 90 DAYS
Individual testing session logs deleted 90 days after completion.

**Rationale**:
- Tactical testing details with no long-term value
- Test results superseded by subsequent test runs
- Critical findings extracted to bug fix docs or feature improvements

**Consolidation**: Key learnings should be extracted to annual DEVELOPMENT_SUMMARY before deletion.

---

### Test Reports (UAT, Regression): RETAIN (180 days)
Test reports retained for 180 days after test execution.

**Retention Criteria**:
- Report documents test coverage at specific milestone
- Provides historical baseline for regression testing
- Shows test pass/fail rates over time

**After 180 days**: Review for permanent retention or deletion
- KEEP if: Major release test report with historical significance
- DELETE if: Routine test run with no unique insights

---

### Test Plans (Archived): RETAIN (365 days)
Archived test plans retained for at least 1 year.

**Retention Criteria**:
- Plan documents testing strategy for major feature or release
- Historical reference for test case evolution
- May be referenced for similar future testing

**After 365 days**: Review for permanent retention or deletion
- KEEP if: Master test plan or comprehensive UAT plan
- DELETE if: Feature-specific test plan for completed feature

---

## Directory Contents

This directory contains approximately 6 testing documents. Common document types include:

1. **UAT Test Reports** - User acceptance testing results
2. **Regression Test Logs** - Regression testing session logs
3. **Test Coverage Reports** - Code coverage analysis
4. **Performance Test Results** - Load/stress testing outcomes
5. **Integration Test Reports** - End-to-end testing results
6. **Test Session Summaries** - Exploratory testing sessions

---

## Related Documentation

### Active Testing Documentation (Not Archived)
- `/docs/testing/master-test-plan.md` - Master UAT test plan (166 test cases)
- `/docs/testing/flow-system-tests.md` - Flow system test cases (67 cases)
- `/apps/web/uat/` - Playwright automated tests (12 tests)
- `/apps/web/uat/README.md` - Running and writing automated tests

### Testing Infrastructure
- `apps/web/playwright.config.ts` - Playwright configuration
- `.github/workflows/uat-tests.yml` - CI/CD test automation
- GitHub Project Board #6: https://github.com/orgs/NB-PDP-Testing/projects/6/views/1

### Archive References
- `/docs/archive/session-logs/DEVELOPMENT_SUMMARY_2025.md` - UAT infrastructure setup (Jan 4, 2026)
- `/docs/archive/planning/USER_TESTING_PROCESS.md` - UAT process documentation

---

## Current Testing Status (January 2026)

### Automated Tests (Playwright)
- **Total Test Cases Defined**: 33
- **Automated Tests**: 12 (36%)
- **Pending Automation**: 21 (64%)
- **CI/CD Integration**: ✅ Enabled (blocks PR merge on failure)

**Test Suites**:
- Authentication (TEST-AUTH-001 to 004) ✅
- Coach Dashboard (TEST-COACH-001 to 004) ✅
- Admin Approval (TEST-ADMIN-001 to 004) ✅

### Manual Test Coverage
- **Master UAT Test Plan**: 166 test cases
- **Flow System Tests**: 67 test cases
- **Total Manual Tests**: 233 test cases

### Test Execution Metrics
- **Test Execution Time**: ~4.2 minutes (12 automated tests)
- **Test Success Rate**: 95% (CI/CD)
- **Flakiness**: <5% (down from 30% initial)

---

## Usage Guidelines

### For Developers
**Looking for active test plans?** Check `/docs/testing/master-test-plan.md` for current UAT test cases.

**Running automated tests?** See `/apps/web/uat/README.md` for Playwright test instructions.

**Historical test results?** This archive directory contains test reports and session logs from previous testing cycles.

### For AI Assistants (Claude Code)
**When creating test session logs**:
1. Include: test scope, results summary, failures found, lessons learned
2. Omit: Verbose step-by-step execution logs (too detailed)
3. Focus on: What was tested, what broke, what was learned
4. Reference: Related bug fix docs if bugs found

**Retention guidance**:
- Test session logs → DELETE after 90 days (extract findings first)
- Test reports (milestone) → RETAIN 180 days (historical baseline)
- Test plans (archived) → RETAIN 365 days (reference for similar testing)

---

## Testing Best Practices (Lessons Learned)

### 1. Pre-authenticated Sessions
**Pattern**: Creating sessions for each test is slow (~10x slower)
**Solution**: Use `auth.setup.ts` to create pre-authenticated sessions once, reuse across tests
**Impact**: 10x speedup in test execution

### 2. Network Idle Wait
**Pattern**: Tests fail randomly due to timing issues with real-time updates
**Solution**: Always use `waitForLoadState('networkidle')` before assertions
**Impact**: Reduced flakiness from 30% to <5%

### 3. Data Isolation
**Pattern**: Tests affect each other when using shared test data
**Solution**: Use unique test data per test run (timestamps, UUIDs)
**Impact**: Eliminated inter-test dependencies

### 4. CI/CD Blocking
**Pattern**: Bugs merged to main before testing
**Solution**: GitHub Actions workflow blocks PR merge if tests fail
**Impact**: Zero regressions in production from automated test coverage

### 5. Test Reporting
**Pattern**: Failed tests without context are hard to debug
**Solution**: Upload screenshots and HTML reports on failure
**Impact**: Faster debugging, reduced "works on my machine" issues

---

## Review Schedule

**Next Review**: April 21, 2026 (Quarterly)

**Review Criteria**:

1. **Test Session Logs** (>90 days old)
   - Extract key findings to DEVELOPMENT_SUMMARY or bug fix docs
   - DELETE after extraction

2. **Test Reports** (>180 days old)
   - Check if report has historical significance (major release, baseline)
   - KEEP if milestone report
   - DELETE if routine test run

3. **Archived Test Plans** (>365 days old)
   - Verify test plan is not referenced by active documentation
   - DELETE if feature-specific plan for completed feature
   - KEEP if master/comprehensive plan

**Review Process**:
```bash
# Find test docs older than 90/180/365 days
find docs/archive/testing/ -name "*session*.md" -mtime +90 -ls
find docs/archive/testing/ -name "*report*.md" -mtime +180 -ls
find docs/archive/testing/ -name "*plan*.md" -mtime +365 -ls

# Review and delete as appropriate
rm docs/archive/testing/[filename].md

# Update DELETION_LOG.md
```

**Review Owner**: System Architect

---

## Testing Roadmap (2026)

### Q1 2026 (Jan - Mar)
- [ ] Automate remaining 21 test cases (target: 90% automation)
- [ ] Add integration tests for voice notes system
- [ ] Implement visual regression testing

### Q2 2026 (Apr - Jun)
- [ ] Load testing (1000+ concurrent users)
- [ ] Security testing (penetration testing, OWASP Top 10)
- [ ] Performance testing (API response times, page load)

### Q3 2026 (Jul - Sep)
- [ ] Mobile app testing (iOS, Android)
- [ ] Accessibility testing (WCAG 2.1 AA compliance)
- [ ] Cross-browser testing (Safari, Firefox, Edge)

### Q4 2026 (Oct - Dec)
- [ ] Chaos engineering (resilience testing)
- [ ] Compliance testing (GDPR, COPPA)
- [ ] Annual test plan review and update

---

## Questions?

**Why delete test session logs?**
- Tactical execution details with no long-term value
- Test results superseded by subsequent runs
- Critical findings extracted to bug fix docs before deletion

**What if I need historical test results?**
```bash
# Find deleted test log in git history
git log --all --full-history -- docs/archive/testing/[filename].md

# Restore from specific commit
git checkout <commit-hash> -- docs/archive/testing/[filename].md
```

**What's the difference between `/docs/testing/` and `/docs/archive/testing/`?**
- `/docs/testing/` → Active test plans, current test documentation
- `/docs/archive/testing/` → Historical test reports, archived test logs
- **Automated test code** → `apps/web/uat/` (not in docs)

**How often should tests be run?**
- **Automated tests**: Every PR and push to main/develop (via CI/CD)
- **Manual UAT**: Before each release (major/minor versions)
- **Regression**: After bug fixes or major refactoring
- **Performance/Load**: Quarterly or before scaling events

---

**Archive Created**: Pre-2026 (exact date unknown)
**Last Cleanup**: Not yet performed (first cleanup scheduled April 21, 2026)
**Next Cleanup**: April 21, 2026
