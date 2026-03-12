# Deployment Pipeline Review & Environment Strategy

**Date:** 2026-03-12
**Status:** Proposal — awaiting approval

---

## 1. Current State Assessment

### 1.1 How Deployments Work Today

```
Developer laptop
    │
    ├─ git push ──► GitHub (main branch)
    │                 │
    │                 ├─ CI workflow: typecheck + lint + build (dummy env vars)
    │                 │
    │                 └─ Vercel auto-deploy (triggered by GitHub integration)
    │                       │
    │                       └─ vercel.json buildCommand:
    │                            cd packages/backend &&
    │                            npx convex deploy            ◄── deploys backend to PROD Convex
    │                              --cmd 'turbo run build'    ◄── then builds Next.js frontend
    │                              --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
    │
    └─ `convex dev` locally ──► personal dev Convex instance
```

**Translation:** Every push to `main` triggers Vercel, which runs `convex deploy` against whatever `CONVEX_DEPLOY_KEY` is set in Vercel environment variables — currently pointing at the **production** Convex deployment. There is no staging layer.

### 1.2 What Exists

| Component | Status | Notes |
|-----------|--------|-------|
| **CI workflow** (`ci.yml`) | Active | Typecheck, lint (changed files), build, bundle analysis, security audit. Runs on PR + push to `main`. |
| **PR Preview** (`pr-preview.yml`) | Partially active | Posts a comment about preview URLs, but code-quality job is `if: false` (disabled). |
| **UAT Tests** (`uat-tests.yml`) | Fully disabled | Both `uat-tests` and `uat-staging` jobs have `if: false`. Placeholder job runs instead. |
| **Dependency Updates** (`dependency-updates.yml`) | Active | Weekly Monday scan — reports only, no auto-PRs. |
| **Old CI** (`ci-old.yml.bak`) | Dead file | Backup of previous CI. Security, bundle-size, convex-validate jobs all `if: false`. |
| **Vercel** | Auto-deploy on `main` | Single production deployment. Preview deploys exist for PRs but share the same Convex backend. |
| **Convex** | Single deployment | `CONVEX_DEPLOY_KEY` in Vercel points to one deployment. No staging/preview Convex instances configured. |
| **Husky + lint-staged** | Configured | Pre-commit hooks exist locally. |

### 1.3 Critical Problems

#### Problem 1: No Environment Separation
- **Every Vercel preview deployment runs `convex deploy`** against the production Convex backend (via `vercel.json` buildCommand).
- A PR preview could push schema migrations, new functions, or data changes to production before the PR is even reviewed.
- There is no staging environment for testers to validate against.

#### Problem 2: No Convex Staging Deployment
- Convex supports multiple deployments per project (dev, staging, prod).
- Currently only a single deployment exists. Developers use personal `convex dev` instances locally but there's no shared staging.

#### Problem 3: UAT Tests Can't Run
- The UAT workflow is entirely disabled (`if: false`).
- It references `secrets.PLAYWRIGHT_BASE_URL` which defaults to `'https://your-staging-url.vercel.app'` — a placeholder.
- No test user credentials are configured in GitHub Secrets.
- Without a staging environment, there's nothing stable to test against.

#### Problem 4: No Branch Protection or Required Checks
- CI runs but nothing enforces that checks must pass before merging.
- No evidence of branch protection rules requiring CI success.

#### Problem 5: Dead/Disabled Code in Pipelines
- `ci-old.yml.bak` — dead file in workflows directory.
- Multiple `if: false` jobs across active workflows.
- PR preview `code-quality` job disabled "during sprint" — appears permanent.

#### Problem 6: Build Uses Dummy Secrets in CI
- CI build step uses `'dummy-key-for-ci'` for `CONVEX_DEPLOY_KEY` — meaning the CI build doesn't actually validate that Convex functions compile correctly against a real deployment.

---

## 2. Proposed Environment Architecture

### 2.1 Three-Environment Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENTS                              │
├──────────────┬──────────────────┬────────────────────────────────┤
│  Development │    Staging        │    Production                  │
├──────────────┼──────────────────┼────────────────────────────────┤
│ Vercel:      │ Vercel:           │ Vercel:                        │
│  Preview     │  staging branch   │  main branch                   │
│  deploys     │  auto-deploy      │  auto-deploy                   │
├──────────────┼──────────────────┼────────────────────────────────┤
│ Convex:      │ Convex:           │ Convex:                        │
│  Personal    │  Staging          │  Production                    │
│  dev         │  deployment       │  deployment                    │
│  instances   │  (shared)         │  (shared)                      │
├──────────────┼──────────────────┼────────────────────────────────┤
│ Who:         │ Who:              │ Who:                           │
│  Developers  │  Testers,         │  End users,                    │
│              │  design partners, │  live clubs                    │
│              │  QA, internal     │                                │
├──────────────┼──────────────────┼────────────────────────────────┤
│ Data:        │ Data:             │ Data:                          │
│  Personal    │  Seeded test      │  Real user                     │
│  test data   │  data (reset-able)│  data                          │
└──────────────┴──────────────────┴────────────────────────────────┘
```

### 2.2 Git Branch Strategy

```
feature branches ──► PR to main ──► CI checks pass
                                        │
                         Vercel Preview  │  (uses Staging Convex)
                                        │
                                   merge to main
                                        │
                              ┌─────────┴─────────┐
                              │                     │
                     auto-deploy to            auto-deploy to
                     Staging Vercel            Production Vercel
                     + Staging Convex          + Production Convex
```

**Option A (Simpler — Recommended for now):**
- `main` branch deploys to **both** staging and production
- Staging deploys first; production deploys after staging succeeds
- Use Vercel's "Promote to Production" for manual prod gate if needed

**Option B (More control — for later):**
- `main` → staging auto-deploy
- `release/*` or manual promotion → production
- Requires more process overhead

---

## 3. Implementation Plan

### Phase 1: Foundation (Week 1)

#### 1A. Create Convex Staging Deployment
- In Convex Dashboard, create a second deployment for the project (staging)
- Generate a `CONVEX_DEPLOY_KEY` for the staging deployment
- The staging deployment gets its own URL: `https://staging-xxx.convex.cloud`

#### 1B. Configure Vercel Environments
- **Production environment** (Vercel): `CONVEX_DEPLOY_KEY` → production Convex key
- **Preview environment** (Vercel): `CONVEX_DEPLOY_KEY` → staging Convex key
- This way preview deployments deploy Convex changes to staging, not production
- Set `NEXT_PUBLIC_CONVEX_URL` per environment (Vercel handles this automatically via `--cmd-url-env-var-name`)

#### 1C. Fix `vercel.json` buildCommand for Environment Safety
The current buildCommand always runs `convex deploy`. We need it to be environment-aware:

```json
{
  "buildCommand": "cd ../../packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL"
}
```

This actually works as-is — `convex deploy` uses whichever `CONVEX_DEPLOY_KEY` is set. The fix is entirely in Vercel environment variable configuration:
- Production env vars → prod Convex key
- Preview env vars → staging Convex key

#### 1D. Configure GitHub Secrets
Add to GitHub repository secrets:
- `CONVEX_DEPLOY_KEY_STAGING` — for CI to validate against staging
- `STAGING_URL` — Vercel staging URL
- `STAGING_CONVEX_URL` — staging Convex cloud URL
- Test user credentials (for UAT):
  - `TEST_OWNER_EMAIL` / `TEST_OWNER_PASSWORD`
  - `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`
  - `TEST_COACH_EMAIL` / `TEST_COACH_PASSWORD`
  - `TEST_PARENT_EMAIL` / `TEST_PARENT_PASSWORD`

### Phase 2: Pipeline Hardening (Week 1-2)

#### 2A. Clean Up Dead Workflow Code
- Delete `ci-old.yml.bak`
- Remove disabled `if: false` jobs or re-enable them properly
- Consolidate PR preview into CI workflow

#### 2B. Update CI to Validate Against Staging Convex
Replace dummy keys in CI build with staging keys:

```yaml
- name: Build for production
  run: npm run build
  env:
    CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_STAGING }}
    NEXT_PUBLIC_CONVEX_URL: ${{ secrets.STAGING_CONVEX_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET_STAGING }}
    BETTER_AUTH_URL: ${{ secrets.STAGING_URL }}
```

#### 2C. Enable Branch Protection on `main`
Configure in GitHub repo settings:
- Require PR reviews before merging
- Require status checks to pass (CI Success job)
- Require branches to be up to date before merging
- No direct pushes to `main`

#### 2D. Add Deployment Status Notifications
Add a workflow step that posts deployment status to a Slack channel or GitHub Discussions so testers know when staging is updated.

### Phase 3: UAT Pipeline Activation (Week 2-3)

#### 3A. Seed Staging Convex with Test Data
- Use existing seed scripts (`scripts/seed-session-plans.ts`, `seed/orchestrator.ts`) to populate staging
- Create a dedicated test organization with known test users
- Document the test data setup process

#### 3B. Enable UAT Workflow
- Remove `if: false` from `uat-tests` job
- Point `PLAYWRIGHT_BASE_URL` at the staging Vercel URL
- Configure test user credentials in GitHub Secrets
- Run on PR merges to `main` (after staging deploy completes)

#### 3C. Add Staging Deploy Verification Workflow
New workflow: `deploy-staging.yml`

```yaml
name: Deploy & Verify Staging

on:
  push:
    branches: [main]

jobs:
  wait-for-deploy:
    name: Wait for Vercel Staging Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Vercel deployment
        # Use Vercel CLI or API to check deployment status
        run: |
          # Poll Vercel API until staging deployment is ready
          echo "Waiting for staging deployment..."

  smoke-test:
    name: Staging Smoke Test
    needs: wait-for-deploy
    runs-on: ubuntu-latest
    steps:
      - name: Health check
        run: |
          curl -f ${{ secrets.STAGING_URL }}/api/health || exit 1

  run-uat:
    name: UAT on Staging
    needs: smoke-test
    uses: ./.github/workflows/uat-tests.yml
    secrets: inherit
```

### Phase 4: Production Safety (Week 3-4)

#### 4A. Add Production Deploy Workflow
Create `deploy-production.yml` with:
- Manual approval gate (GitHub Environments with required reviewers)
- Run UAT against staging first
- Only deploy to production after staging UAT passes
- Post-deploy smoke test against production

#### 4B. Add Rollback Documentation
Document how to:
- Roll back a Vercel deployment (instant via Vercel dashboard)
- Roll back Convex schema changes (requires `convex deploy` with previous code)
- Handle data migrations that need reversal

#### 4C. Add Monitoring Hooks
- PostHog error tracking (already partially configured)
- Convex function error alerting
- Vercel deployment failure notifications

---

## 4. Environment Variable Matrix

| Variable | Local Dev | CI | Staging (Vercel Preview) | Production (Vercel) |
|----------|-----------|-----|--------------------------|---------------------|
| `CONVEX_DEPLOY_KEY` | N/A (uses `convex dev`) | Staging key | Staging key | **Production key** |
| `NEXT_PUBLIC_CONVEX_URL` | Local dev URL | Staging URL | Staging URL | **Production URL** |
| `BETTER_AUTH_SECRET` | Local secret | Staging secret | Staging secret | **Production secret** |
| `BETTER_AUTH_URL` | `localhost:3000` | Staging URL | Staging URL | **Production URL** |
| `ANTHROPIC_API_KEY` | Dev key | Staging key | Staging key | **Production key** |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | N/A | Staging project | **Production project** |

---

## 5. Immediate Action Items (Manual Steps Required)

These require access to Vercel Dashboard and Convex Dashboard — they can't be done via code:

### Vercel Dashboard
1. Go to Project Settings → Environment Variables
2. For each env var, set **separate values** for "Production" vs "Preview" environments
3. Specifically: set `CONVEX_DEPLOY_KEY` for Preview to use the staging Convex deployment key

### Convex Dashboard
1. Create a new deployment for the project (this becomes "staging")
2. Copy the staging deployment URL and deploy key
3. Seed the staging deployment with test data
4. Set environment variables on the staging deployment (ANTHROPIC_API_KEY, RESEND_API_KEY, etc.)

### GitHub Repository Settings
1. Settings → Branches → Add branch protection rule for `main`
2. Settings → Secrets → Add staging secrets listed in Phase 1D
3. Settings → Environments → Create "staging" and "production" environments

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Preview deploys pushing to prod Convex | **HIGH** — schema changes hit production | Phase 1B fixes this immediately |
| No branch protection | **MEDIUM** — untested code can reach prod | Phase 2C adds required checks |
| UAT tests disabled | **MEDIUM** — no automated E2E validation | Phase 3 enables this |
| Single deploy key in CI | **LOW** — CI build doesn't validate real Convex | Phase 2B fixes with staging key |
| Test data leaking to prod | **LOW** — environment separation prevents this | Phase 1 creates boundary |

---

## 7. Summary of Priorities

**Do first (this week):**
1. Create Convex staging deployment
2. Split Vercel env vars by environment (Preview vs Production)
3. Enable branch protection on `main`
4. Delete `ci-old.yml.bak`

**Do next (next 1-2 weeks):**
5. Seed staging with test data
6. Enable UAT tests against staging
7. Clean up disabled workflow jobs
8. Add staging deploy verification

**Do later (weeks 3-4):**
9. Production deploy approval gates
10. Rollback documentation
11. Monitoring and alerting
