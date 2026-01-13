# CI/CD Pipeline Optimization

## Overview

Optimized CI/CD pipeline to reduce GitHub Actions minutes usage by ~50% while maintaining all essential quality checks.

## Changes Made (Jan 13, 2026)

### 1. Consolidated Jobs Architecture

**Before:** 6 independent jobs, each running `npm ci` (~2-3 min each)
- typecheck
- lint
- build
- security
- bundle-size
- convex-validate

**After:** 3 jobs with shared dependency caching
- `setup` - Install once, cache node_modules
- `quality-checks` - Parallel typecheck, lint, security (reuses cache)
- `build-and-analyze` - Single build, bundle analysis, Convex validation (reuses cache)

**Savings:** ~10 minutes per run

### 2. Path-Based Filtering

Skip CI entirely for documentation-only changes:
```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
  - '.github/workflows/**'
  - '.vscode/**'
```

**Savings:** ~20% of pushes skip CI

### 3. Dependency Caching

Cache `node_modules` between jobs:
```yaml
uses: actions/cache@v4
with:
  path: |
    node_modules
    apps/*/node_modules
    packages/*/node_modules
  key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
```

**Savings:** 1-2 minutes per job (faster installs)

### 4. Concurrency Control

Cancel previous runs when new commits pushed:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Savings:** Avoids wasting minutes on outdated commits

### 5. Matrix Strategy for Quality Checks

Run typecheck, lint, and security in parallel using matrix:
```yaml
strategy:
  fail-fast: false
  matrix:
    check: [typecheck, lint, security]
```

**Savings:** Run checks concurrently instead of sequentially

### 6. Removed Duplicate Jobs

- Removed `code-quality` job from PR preview (CI already handles it)
- Combined `build` and `bundle-size` into single job

**Savings:** 5-7 minutes per PR

## Results

### Estimated Minutes Usage

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| **Push to main** | 20-25 min | 8-10 min | 50-60% |
| **Pull request** | 25-30 min | 10-12 min | 60% |
| **Docs-only change** | 20-25 min | 0 min | 100% |

### Monthly Savings (Active Development)

**Assumptions:**
- 10 pushes/day to main during sprint
- 5 PRs/day with avg 3 commits each

**Before:** ~750 minutes/day = 22,500 min/month
**After:** ~300 minutes/day = 9,000 min/month
**Savings:** ~13,500 minutes/month (~$108/month at $0.008/min)

## What's Still Protected ✅

All essential checks remain active:

1. **TypeScript type checking** - Catches type errors
2. **Linting (changed files)** - Enforces code style
3. **Build validation** - Ensures app compiles
4. **Security audit** - Runs on main branch only (non-blocking)
5. **Bundle analysis** - Monitors bundle size
6. **Convex validation** - Schema checks (non-blocking)

## What Changed ⚙️

1. **Jobs run in sequence** with caching (setup → checks → build)
2. **Security audit** only on main branch (not every PR)
3. **Smarter caching** reduces npm install time
4. **Path filtering** skips docs-only changes

## Rollback Plan

If issues arise, restore original CI:
```bash
cp .github/workflows/ci-old.yml.bak .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "Rollback CI optimization"
git push
```

## Future Optimizations

1. **Self-hosted runner** - Free minutes (requires infrastructure)
2. **Selective test runs** - Only run tests for changed modules
3. **Build caching** - Cache Next.js build output between runs
4. **Convex schema caching** - Skip validation if schema unchanged

## Monitoring

Track Actions usage:
- Organization billing: https://github.com/organizations/NB-PDP-Testing/settings/billing
- Workflow runs: https://github.com/NB-PDP-Testing/PDP/actions

## Notes

- Original CI backed up at `.github/workflows/ci-old.yml.bak`
- UAT tests already disabled (separate from CI optimization)
- PR preview only shows deployment info (quality checks moved to CI)
