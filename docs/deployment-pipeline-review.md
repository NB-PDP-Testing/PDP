# Deployment Pipeline Review & Environment Strategy

**Date:** 2026-03-12
**Status:** Decisions resolved — pending Convex plan verification before implementation

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

## 2. Target End State

### 2.1 Environment Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              TARGET ARCHITECTURE                                      │
│                                                                                       │
│  ┌─────────────────┐     ┌─────────────────────┐     ┌────────────────────────┐      │
│  │   DEVELOPMENT    │     │      STAGING         │     │     PRODUCTION          │      │
│  │                  │     │                      │     │                         │      │
│  │  Vercel: N/A     │     │  Vercel: Preview     │     │  Vercel: Production     │      │
│  │  (localhost:3000) │     │  deploys (per PR)    │     │  (main branch)          │      │
│  │                  │     │  + staging subdomain  │     │  playerarc.com          │      │
│  │  Convex: Personal│     │                      │     │                         │      │
│  │  dev instances   │     │  Convex: Staging      │     │  Convex: Production     │      │
│  │  (convex dev)    │     │  deployment           │     │  deployment             │      │
│  │                  │     │  (shared instance)    │     │  (shared instance)      │      │
│  │  Data: Personal  │     │                      │     │                         │      │
│  │  throwaway data  │     │  Data: Seeded test    │     │  Data: Real user data   │      │
│  │                  │     │  org + accounts       │     │  (live clubs)           │      │
│  │  OAuth: N/A      │     │                      │     │                         │      │
│  │  (email/pw only) │     │  OAuth: Staging apps  │     │  OAuth: Production apps │      │
│  │                  │     │  (Google/MSFT test)   │     │  (Google/MSFT live)     │      │
│  │  Email: Console  │     │                      │     │                         │      │
│  │  logs only       │     │  Email: Resend test   │     │  Email: Resend prod     │      │
│  │                  │     │  domain               │     │  verified domain        │      │
│  └────────┬─────────┘     └──────────┬───────────┘     └────────────┬────────────┘      │
│           │                          │                              │                   │
│           │ git push                 │ PR merge to main             │ Promotion gate    │
│           ▼                          ▼                              ▼                   │
│  ┌──────────────────────────────────────────────────────────────────────────────┐      │
│  │                         DEPLOYMENT FLOW                                       │      │
│  │                                                                               │      │
│  │   feature/* ─── PR ──► CI checks ──► Staging deploy ──► UAT tests ──► Prod   │      │
│  │                  │                        │                  │           │      │      │
│  │                  │                        │                  │           │      │      │
│  │             typecheck              Vercel Preview       Playwright   Manual    │      │
│  │             lint                   + Convex Staging     E2E suite   approval   │      │
│  │             build                  auto-deploy          runs here   or auto    │      │
│  │             security                                                           │      │
│  └──────────────────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 What Changes from Today

| Aspect | Today | End State |
|--------|-------|-----------|
| **Convex deployments** | 1 (production) | 2 (staging + production) |
| **Vercel environments** | All share same env vars | Production and Preview have separate keys |
| **PR previews** | Deploy Convex to prod | Deploy Convex to staging |
| **CI build** | Uses dummy keys | Uses staging keys (real validation) |
| **UAT tests** | Disabled (`if: false`) | Run automatically against staging |
| **Branch protection** | None | Required reviews + passing CI |
| **Deploy to production** | Auto on push to main | Gate: staging UAT must pass first |
| **Test data** | None in shared env | Seeded test org in staging |
| **Dead workflow code** | 4+ disabled jobs, 1 backup file | Clean — no `if: false` stubs |

---

## 3. Data Strategy

### 3.1 Data Isolation by Environment

```
┌────────────────────────────────────────────────────────────────┐
│                      DATA TOPOLOGY                              │
│                                                                 │
│  PRODUCTION CONVEX                  STAGING CONVEX              │
│  ─────────────────                  ────────────────            │
│                                                                 │
│  Real clubs:                        Test org: "Demo Club"       │
│  ├─ Grange RFC                      ├─ 6 teams (3 sports)      │
│  ├─ St. Mary's GAA                  ├─ 60 seeded players       │
│  └─ ...                             ├─ 5 test user accounts    │
│                                     ├─ Benchmarks (all sports) │
│  Real users:                        └─ Skill definitions       │
│  ├─ Coaches, parents                                           │
│  ├─ Actual player data              Test users (known creds):  │
│  └─ Assessment history              ├─ owner@test.playerarc.com│
│                                     ├─ admin@test.playerarc.com│
│  Reference data:                    ├─ coach@test.playerarc.com│
│  ├─ Sport definitions               ├─ parent@test.playerarc.com│
│  ├─ Skill benchmarks                └─ member@test.playerarc.com│
│  └─ NGB standards                                              │
│                                     Reset-able:                 │
│  NEVER reset.                       ├─ fullReset script exists │
│  NEVER seed test data here.         ├─ stagedReset for safety  │
│                                     └─ Re-seed after reset     │
│                                                                 │
│  DEV INSTANCES (per developer)                                  │
│  ──────────────────────────────                                 │
│  Personal `convex dev` instances.                               │
│  Completely independent databases.                              │
│  Developers can reset freely.                                   │
│  No shared state.                                               │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Staging Data Requirements

The staging environment needs a complete, realistic dataset. Existing tooling covers most of this:

| Data Category | Source | Script / Process |
|---------------|--------|------------------|
| **Sport definitions** | Migration scripts | `importSoccerBenchmarks`, `importRugbyBenchmarks`, `importGAAFootballBenchmarks`, `importIrishDancingBenchmarks` |
| **Skill benchmarks** | Migration scripts | `importSoccerLevelDescriptors`, `importRugbyLevelDescriptors`, `importGAAFootballLevelDescriptors` |
| **Test organization** | Seed orchestrator | `convex/scripts/seed/orchestrator.ts` — creates "Demo Club" with 6 teams, 60 players |
| **Player passports** | Seed orchestrator | Creates assessments, goals, milestones at 3 stages (beginner/developing/advanced) |
| **Test user accounts** | Manual + script | Users sign up via web UI, then `bootstrapPlatformStaff` elevates permissions |
| **Guardian-player links** | Seed orchestrator | Creates parent-child relationships |
| **Coach assignments** | Seed orchestrator | Assigns coaches to teams |

#### What's Missing (Needs to Be Built)

| Gap | What's Needed | Effort |
|-----|---------------|--------|
| **Staging seed script** | A single `seed-staging.sh` that runs all migration + seed scripts against the staging Convex deployment in the correct order | Small — orchestrate existing scripts |
| **Test user provisioning** | Automated creation of 5 test accounts with known passwords and role assignments (not just manual signup) | Medium — extend `orchestrator.ts` or create a dedicated script |
| **Voice note test data** | Sample voice notes with transcriptions and AI-extracted insights | Small — add to orchestrator |
| **Injury test data** | Sample injuries across severity levels and statuses | Small — add to orchestrator |
| **Cross-org test data** | A second test org to validate org isolation and cross-org features (injuries, player graduation) | Medium — run orchestrator twice with different params |

### 3.3 Staging Data Lifecycle

```
┌─────────────────────────────────────────────────────┐
│              STAGING DATA LIFECYCLE                   │
│                                                      │
│  1. INITIAL SETUP (one-time)                        │
│     ├─ Create Convex staging deployment             │
│     ├─ Run benchmark migrations                     │
│     ├─ Create test users (signup + bootstrap)       │
│     └─ Run seed orchestrator                        │
│                                                      │
│  2. ONGOING                                          │
│     ├─ Schema changes deploy via Vercel preview     │
│     ├─ Data accumulates from tester activity        │
│     └─ New reference data via migration scripts     │
│                                                      │
│  3. RESET WHEN NEEDED                               │
│     ├─ Run stagedReset (safest, avoids timeouts)    │
│     ├─ Re-run benchmark migrations                  │
│     ├─ Re-create test users                         │
│     └─ Re-run seed orchestrator                     │
│                                                      │
│  4. PER-TESTER ISOLATION                            │
│     ├─ Each tester gets their own org               │
│     ├─ Shared "Demo Club" for read-only reference   │
│     └─ Testers can create/delete within their org   │
└─────────────────────────────────────────────────────┘
```

### 3.4 Data Migration Safety

Schema changes are a key risk when deploying to staging vs production:

```
                    Schema Change Flow
                    ──────────────────

  Developer adds new table/field
         │
         ▼
  PR created → CI builds (validates schema compiles)
         │
         ▼
  Vercel Preview deploys → convex deploy to STAGING
         │                    │
         │                    ├─ Additive changes (new tables, new fields): Safe
         │                    ├─ Removing fields: Breaks staging if data exists
         │                    └─ Index changes: May require backfill
         │
         ▼
  Merge to main → convex deploy to PRODUCTION
                        │
                        ├─ Same schema validated on staging first
                        └─ Data migration scripts run manually if needed
```

**Rules:**
1. Additive schema changes (new tables, optional fields) are safe to auto-deploy
2. Destructive changes (removing fields, changing types) need a migration script
3. Migration scripts should always support `dryRun: true` first
4. Run migrations on staging first, validate, then run on production with `--prod`

---

## 4. Third-Party Service Configuration per Environment

### 4.1 Convex Environment Variables

Each Convex deployment (staging and production) needs its own set of env vars:

| Convex Env Var | Staging | Production | Notes |
|----------------|---------|------------|-------|
| `SITE_URL` | `https://staging.playerarc.com` | `https://playerarc.com` | Used by Better Auth for OAuth callbacks and trusted origins |
| `GOOGLE_CLIENT_ID` | Staging OAuth app | Production OAuth app | Separate Google Cloud projects or same project with both redirect URIs |
| `GOOGLE_CLIENT_SECRET` | Staging secret | Production secret | |
| `MICROSOFT_CLIENT_ID` | Staging OAuth app | Production OAuth app | Separate Azure app registrations recommended |
| `MICROSOFT_CLIENT_SECRET` | Staging secret | Production secret | |
| `RESEND_API_KEY` | Test API key | Production API key | Resend supports test keys that don't send real emails |
| `EMAIL_FROM_ADDRESS` | `noreply@staging.playerarc.com` | `noreply@playerarc.com` | Needs verified domain in Resend |
| `ANTHROPIC_API_KEY` | Shared or separate key | Production key | Can share; AI features work the same |
| `TWILIO_ACCOUNT_SID` | Test credentials | Production credentials | Twilio has test mode for SMS/WhatsApp |
| `TWILIO_AUTH_TOKEN` | Test credentials | Production credentials | |
| `TWILIO_VERIFY_SERVICE_SID` | Test service | Production service | |
| `META_WEBHOOK_VERIFY_TOKEN` | Staging token | Production token | WhatsApp webhook verification |
| `FEDERATION_ENCRYPTION_KEY` | Staging key | Production key | Must be different — encrypts federation data |
| `POSTHOG_API_KEY` | Staging project key | Production project key | Separate PostHog projects to avoid polluting analytics |

### 4.2 Vercel Environment Variables

| Vercel Env Var | Preview | Production | Notes |
|----------------|---------|------------|-------|
| `CONVEX_DEPLOY_KEY` | Staging deploy key | Production deploy key | **Critical separation** |
| `NEXT_PUBLIC_CONVEX_URL` | Auto-set by `convex deploy` | Auto-set by `convex deploy` | `--cmd-url-env-var-name` handles this |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Staging URL | Production URL | Used for client-side Convex connection |
| `BETTER_AUTH_SECRET` | Staging secret | Production secret | **Must be different** — session tokens |
| `BETTER_AUTH_URL` | Staging URL | Production URL | |
| `ANTHROPIC_API_KEY` | Shared or staging key | Production key | Server-side only |
| `NEXT_PUBLIC_POSTHOG_KEY` | Staging project | Production project | Client-side analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | `https://eu.i.posthog.com` | Same (EU region) |
| `NEXT_PUBLIC_USE_REAL_AI` | `true` | `true` | |
| `NEXT_PUBLIC_SESSION_PLAN_CACHE_HOURS` | `0.05` (3 min — for testing) | `1` | Shorter cache for testers |

### 4.3 OAuth Provider Setup

Each environment needs its own OAuth redirect URIs registered:

**Google Cloud Console:**
```
Production:  https://playerarc.com/api/auth/callback/google
Staging:     https://staging.playerarc.com/api/auth/callback/google
             https://*.vercel.app/api/auth/callback/google   (for PR previews)
```

**Microsoft Azure Portal:**
```
Production:  https://playerarc.com/api/auth/callback/microsoft
Staging:     https://staging.playerarc.com/api/auth/callback/microsoft
             https://*.vercel.app/api/auth/callback/microsoft  (for PR previews)
```

**Decision needed:** Use one OAuth app with multiple redirect URIs, or separate OAuth apps per environment? Separate is cleaner but more to manage.

### 4.4 PostHog Analytics

Create two PostHog projects:
- **PlayerARC - Staging**: Captures tester activity without polluting production metrics
- **PlayerARC - Production**: Clean data from real users only

Both in EU region (`eu.i.posthog.com`) for GDPR compliance.

---

## 5. GitHub Actions Workflow End State

### 5.1 Workflow Files (Target)

| File | Purpose | Trigger |
|------|---------|---------|
| `ci.yml` | Typecheck, lint, build, security scan | PR to main, push to main |
| `uat-tests.yml` | Playwright E2E against staging | After staging deploy, manual dispatch |
| `dependency-updates.yml` | Weekly outdated + audit report | Monday 9 AM UTC, manual |

**Files to remove:**
- `ci-old.yml.bak` — dead backup
- `pr-preview.yml` — consolidate the useful PR comment into `ci.yml`

### 5.2 CI Workflow Changes

```yaml
# Key changes to ci.yml:

# 1. Build uses REAL staging keys (not dummy)
- name: Build for production
  run: npm run build
  env:
    CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_STAGING }}
    NEXT_PUBLIC_CONVEX_URL: ${{ secrets.STAGING_CONVEX_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET_STAGING }}
    BETTER_AUTH_URL: ${{ secrets.STAGING_URL }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

# 2. Security scan re-enabled (was disabled "during sprint")
- name: Run security audit
  if: matrix.check == 'security'    # Removed: && github.ref == 'refs/heads/main'
  run: |
    npm audit --audit-level=high || exit 1
```

### 5.3 Branch Protection Rules

```
main branch:
  ├─ Require pull request before merging
  │   └─ Required approvals: 1
  ├─ Require status checks to pass
  │   ├─ CI Success (from ci.yml)
  │   └─ UAT Tests (from uat-tests.yml) — optional initially
  ├─ Require branches to be up to date
  └─ Restrict who can push: no direct pushes
```

---

## 6. Implementation Phases

### Phase 1: Environment Foundation (Dashboard Work)

**Convex Dashboard:**
1. Create staging deployment for the project
2. Copy deploy key and URL
3. Set all env vars listed in Section 4.1 on the staging deployment
4. Run benchmark migration scripts against staging

**Vercel Dashboard:**
1. Edit `CONVEX_DEPLOY_KEY` — set Production value and Preview value separately
2. Edit `BETTER_AUTH_SECRET` — different values per environment
3. Edit `BETTER_AUTH_URL` — staging URL for Preview, prod URL for Production
4. Add `NEXT_PUBLIC_POSTHOG_KEY` per environment

**Google Cloud / Azure:**
1. Add staging redirect URIs to OAuth apps (or create staging OAuth apps)

**GitHub Settings:**
1. Add secrets: `CONVEX_DEPLOY_KEY_STAGING`, `STAGING_URL`, `STAGING_CONVEX_URL`, `BETTER_AUTH_SECRET_STAGING`
2. Add test user credential secrets
3. Enable branch protection on `main`

### Phase 2: Seed Staging Data

1. Sign up 5 test users on staging via the web UI
2. Run `bootstrapPlatformStaff` to make owner a platform admin
3. Run benchmark migrations (soccer, rugby, GAA, Irish dancing)
4. Run seed orchestrator to create "Demo Club" with 60 players
5. Verify all roles work (owner, admin, coach, parent, member)
6. Document the staging URLs and test credentials

### Phase 3: Pipeline Code Changes

1. Delete `ci-old.yml.bak`
2. Update `ci.yml` to use staging secrets instead of dummy keys
3. Re-enable security scanning in `ci.yml`
4. Remove `uat-tests.yml` disabled placeholder job, enable real job
5. Merge useful parts of `pr-preview.yml` into `ci.yml`, delete `pr-preview.yml`
6. Create `seed-staging.sh` script to automate the seeding process

### Phase 4: Production Safety Gates

1. Configure Vercel to not auto-promote previews
2. Add GitHub Environment "production" with required reviewers
3. Create post-deploy smoke test
4. Document rollback procedures

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Preview deploys pushing to prod Convex | **HIGH** — schema changes hit production | Phase 1 fixes immediately (separate deploy keys) |
| No branch protection | **MEDIUM** — untested code can reach prod | Phase 1 enables branch protection |
| UAT tests disabled | **MEDIUM** — no automated E2E validation | Phase 3 enables UAT |
| Staging data drift from production | **LOW** — staging schema matches prod via same deploy pipeline | Reset + re-seed when needed |
| OAuth redirect mismatch | **MEDIUM** — SSO login breaks on staging | Phase 1 adds staging redirect URIs |
| Test data in production | **LOW** — environment separation prevents this | Phase 1 creates the boundary |
| Convex schema migration breaks staging | **LOW** — staging is reset-able, prod is not | Always deploy to staging first |

---

## 8. Decision Log

Decisions resolved on 2026-03-12:

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Staging URL** | `staging.playerarc.com` (custom subdomain) | Professional, stable URL. Better for OAuth redirects and bookmarking. Requires DNS config. |
| 2 | **OAuth apps** | Separate apps per environment | Cleaner isolation. Each environment gets its own client ID/secret. Better audit trail. |
| 3 | **Production deploy gate** | Auto for patches, manual for features | Bugfix branches auto-promote after staging UAT passes. Feature branches require manual approval. Balanced speed vs safety. |
| 4 | **Convex plan** | **Pending verification** | Need to check Convex dashboard/pricing to confirm multiple deployments are supported on current plan. |
| 5 | **PostHog** | Separate staging project | Two PostHog projects (both EU region). Clean production analytics with no test noise. |
| 6 | **Email (Resend)** | Resend test mode for staging | No real emails sent from staging. Emails visible in Resend dashboard. No domain setup needed. |
| 7 | **Notifications** | GitHub Discussions/Issues | Deploy status, test failures, and security alerts posted as GitHub comments/discussion threads. No extra tooling. |

### Action Required

- [ ] **Decision 4**: Verify Convex plan supports staging + production deployments. Check pricing at [convex.dev/pricing](https://convex.dev/pricing) or in the Convex dashboard.

---

## 9. Agentic Capabilities Inventory

This project has a multi-layered agentic system that can be integrated into the deployment pipeline. Below is a complete catalog of what exists, what's active, and how each capability maps to pipeline stages.

### 9.1 Ralph — Autonomous Development Orchestrator

**Location:** `scripts/ralph/ralph.sh`
**Status:** Active infrastructure

Ralph is an autonomous loop that implements features from a PRD without manual intervention. Each iteration spawns a fresh Claude Code CLI session with persistent memory.

**How it works:**
1. Reads `prd.json` for uncompleted stories (priority order)
2. Spawns Claude Code CLI → implements the story
3. Runs quality checks (types, lint)
4. Commits if all checks pass, updates PRD
5. Repeats until all stories complete or max iterations reached

**Four-layer learning system:**
- Codebase patterns (consolidated at top of `progress.txt`)
- Structured progress entries per iteration
- Git history (actual code changes)
- Conversation logs (`~/.claude/projects/`)

**Pipeline integration opportunity:** Ralph branches could auto-trigger the staging deploy + UAT pipeline on completion, creating a fully autonomous develop → test → review loop.

### 9.2 Ralph Monitoring Agents (6 Background Agents)

Six bash scripts that run on intervals alongside Ralph, writing findings to `scripts/ralph/agents/output/feedback.md` which Ralph reads each iteration.

| Agent | File | Interval | What It Does |
|-------|------|----------|--------------|
| **Quality Monitor** | `quality-monitor.sh` | 60s | Convex codegen, type checks, Biome lint |
| **PRD Auditor** | `prd-auditor.sh` | 90s | Verifies completed stories match implementation |
| **Documenter** | `documenter.sh` | 120s | Generates feature docs at milestones |
| **Test Runner** | `test-runner.sh` | 30s | Fastest feedback — types, lint, schema validation on new commits |
| **Security Tester** | `security-tester.sh` | 120s | Grep-based pattern detection + AI security analysis |
| **Code Review Gate** | `code-review-gate.sh` | 45s | Pattern checks (`.filter()`, N+1, auth), AI code review on commits |

**Start/stop:** `scripts/ralph/agents/start-all.sh` / `stop-all.sh`

**Pipeline integration opportunity:** These agents could be adapted to run as CI jobs or post-deploy checks, providing the same quality gates in the pipeline that Ralph gets during development.

### 9.3 Claude Code AI Agents (On-Demand)

Defined in `.claude/agents/`, these are AI-powered agents invoked via Claude Code commands. Each uses a specific model and has deep domain knowledge.

| Agent | Model | Purpose | Invoked Via |
|-------|-------|---------|-------------|
| **Architect** | opus | Pre-phase architectural review, ADR generation | `/architect-review` |
| **Architecture Reviewer** | sonnet | Multi-phase validation with memory (`agent-memory/`) | Automatic |
| **Code Reviewer** | sonnet | Quality + security review (CRITICAL/HIGH/MEDIUM/LOW) | `/code-review` |
| **Security Reviewer** | sonnet | Deep OWASP Top 10 analysis, auth/authz patterns | `/review-security` |
| **QA Tester** | sonnet | Verifies implementations work (not just compile) | Post-story |
| **Test Generator** | sonnet | Generates UAT scenarios, unit tests, edge cases | Post-story |
| **Quality Auditor** | sonnet | Deep code quality beyond linting (patterns, perf, UX) | On-demand |
| **Build Error Resolver** | — | Diagnoses and fixes build failures | `/build-fix` |
| **AI Documenter** | sonnet | Comprehensive feature documentation synthesis | `/document-phase` |
| **Parent Summary Agent** | — | Specialized for parent communication features | On-demand |

**Pipeline integration opportunity:** These agents can serve as AI-powered CI gates — e.g., run `/review-security` automatically on PRs that touch auth code, or `/code-review` as a pre-merge check.

### 9.4 Claude Code Hooks (Automatic Triggers)

Defined in `.claude/settings.json`, these fire automatically during development sessions without manual invocation.

**PostToolUse (after file edit/write):**
- Auto-format with `npx ultracite fix`
- Biome lint check
- TypeScript type check
- Smart quality analysis for backend files

**PostToolUse (after git commit via Bash):**
- Security review on committed files
- Vulnerability pattern scanning

**PreToolUse (before Bash execution):**
- Blocks destructive commands (`git reset --hard`, `git clean -f`, `rm -rf`)
- Warns on `.md` file creation outside expected locations

**SessionStart:**
- Ralph project status check
- Detects new PRD phases (the notification you see at session start)
- Agent status dashboard

**SessionEnd:**
- Session summary
- Leftover `console.log` check
- Feedback status

### 9.5 Pre-Commit Hooks

**Location:** `.husky/pre-commit` + `.lintstagedrc.json`
**Status:** Active on every commit

Runs `npx lint-staged` which executes `npx biome check --diagnostic-level=error` on staged `.ts/.tsx/.js/.jsx` files. Blocks commit if linting fails.

### 9.6 Slash Commands (User-Invocable Skills)

Defined in `.claude/commands/`, these are quick-access commands for common operations.

| Command | Purpose |
|---------|---------|
| `/architect-review` | Full architectural analysis before a phase |
| `/review-security` | Deep security review of recent changes |
| `/code-review` | Review uncommitted code for quality + patterns |
| `/e2e` | Run or generate Playwright E2E tests |
| `/bugfix` | Fix a bug from a GitHub issue |
| `/build-fix` | Fix TypeScript and build errors |
| `/refactor-clean` | Remove dead code, unused deps, duplicates |
| `/document-phase` | Generate comprehensive phase documentation |
| `/check-prd` | Show PRD phase status and story breakdown |
| `/session-setup` | Pre-implementation session checks |
| `/review-fix` | Full review-and-fix pipeline on current branch |
| `/simplify` | Review changed code for reuse and efficiency |

### 9.7 Playwright E2E Tests

**Location:** `apps/web/uat/tests/`
**Config:** `apps/web/uat/playwright.config.ts`
**Status:** Comprehensive suite defined, **CI execution disabled** (`if: false` in `uat-tests.yml`)

**Test suites available:**
- Onboarding (7 phases)
- Voice notes pipeline
- Platform admin flows
- Player portal
- Accessibility
- Injury, email verification, compliance

**CI capabilities (when enabled):**
- Manual dispatch with test category selection (auth, admin, coach, flows, player, parent, org)
- HTML reports + JSON results + screenshots on failure
- 30-day artifact retention for reports, 7 days for screenshots

### 9.8 GitHub Actions Workflows

| Workflow | File | Status | Triggers |
|----------|------|--------|----------|
| **CI** | `ci.yml` | Active | PR to main, push to main |
| **PR Preview** | `pr-preview.yml` | Partial | PR open/sync (quality report disabled) |
| **UAT Tests** | `uat-tests.yml` | Disabled | (Would run on staging deploy) |
| **Dependency Updates** | `dependency-updates.yml` | Active | Weekly Monday 9 AM UTC |
| **Dependabot** | `dependabot.yml` | Active | Weekly, max 10 PRs |

---

## 10. Agentic Pipeline Integration Opportunities

How the existing agentic capabilities map to deployment pipeline stages:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AGENTIC PIPELINE INTEGRATION MAP                      │
│                                                                          │
│  STAGE               EXISTING CAPABILITY            STATUS               │
│  ─────               ────────────────────            ──────               │
│                                                                          │
│  Pre-Development                                                         │
│  ├─ Phase Planning    Architect Agent (opus)          ✅ Available        │
│  ├─ PRD Validation    validate-prd.sh                 ✅ Available        │
│  └─ Arch Review       Architecture Reviewer           ✅ Available        │
│                                                                          │
│  During Development (Ralph Loop)                                         │
│  ├─ Quality           Quality Monitor (60s)           ✅ Active           │
│  ├─ Tests             Test Runner (30s)               ✅ Active           │
│  ├─ Security          Security Tester (120s)          ✅ Active           │
│  ├─ Code Review       Code Review Gate (45s)          ✅ Active           │
│  ├─ PRD Compliance    PRD Auditor (90s)               ✅ Active           │
│  └─ Documentation     Documenter (120s)               ✅ Active           │
│                                                                          │
│  Pre-Commit                                                              │
│  ├─ Lint              Husky + lint-staged             ✅ Active           │
│  ├─ Format            Ultracite (via hooks)           ✅ Active           │
│  └─ Destructive Guard PreToolUse hook                 ✅ Active           │
│                                                                          │
│  Pull Request                                                            │
│  ├─ CI Checks         ci.yml                          ✅ Active           │
│  ├─ AI Code Review    Code Reviewer agent             ⚡ Manual trigger  │
│  ├─ AI Security       Security Reviewer agent         ⚡ Manual trigger  │
│  └─ Preview Deploy    pr-preview.yml                  ⚠️ Partial          │
│                                                                          │
│  Staging Deploy                                                          │
│  ├─ Schema Validation Convex deploy                   🔴 Not separated   │
│  ├─ E2E Tests         Playwright suite                🔴 Disabled in CI  │
│  ├─ QA Verification   QA Tester agent                 ⚡ Manual trigger  │
│  └─ Smoke Tests       (not built)                     🔴 Missing          │
│                                                                          │
│  Production Promotion                                                    │
│  ├─ Approval Gate     (not configured)                🔴 Missing          │
│  ├─ Deploy            Vercel auto-deploy              ⚠️ No gate          │
│  └─ Post-Deploy Check (not built)                     🔴 Missing          │
│                                                                          │
│  Ongoing                                                                 │
│  ├─ Dependency Scan   dependency-updates.yml          ✅ Active           │
│  ├─ Dependabot PRs    dependabot.yml                  ✅ Active           │
│  └─ Phase Docs        AI Documenter agent             ⚡ Manual trigger  │
│                                                                          │
│  Legend: ✅ Active  ⚡ Available (manual)  ⚠️ Partial  🔴 Missing/Off   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 10.1 Quick Wins — Activate What Exists

These require minimal effort because the tooling is already built:

| Opportunity | Effort | Impact |
|-------------|--------|--------|
| Enable Playwright in CI (`uat-tests.yml`) | Small — remove `if: false`, add staging secrets | E2E coverage on every PR |
| Run `/code-review` as PR check | Small — GitHub Action calling Claude Code CLI | AI-powered review on every PR |
| Run `/review-security` on auth-related PRs | Small — path-filter trigger + Claude Code CLI | Automated security for sensitive code |
| Connect Ralph branch completion → PR creation | Small — add `gh pr create` to `ralph.sh` epilogue | Auto-PRs from autonomous development |

### 10.2 Medium Effort — Extend Existing Agents

| Opportunity | Effort | Impact |
|-------------|--------|--------|
| Adapt Ralph monitoring agents as CI jobs | Medium — containerize bash scripts for GitHub Actions | Same quality gates in CI that Ralph uses |
| QA Tester as post-deploy verification | Medium — run against staging URL after deploy | Verify features actually work, not just build |
| Test Generator as PR enrichment | Medium — auto-generate test suggestions on PR | Improve test coverage systematically |
| Build Error Resolver as CI recovery | Medium — on build failure, auto-attempt fix + new commit | Self-healing builds |

### 10.3 Larger Opportunities — Full Agentic Pipeline

| Opportunity | Effort | Impact |
|-------------|--------|--------|
| **Autonomous patch pipeline:** Ralph branch → auto-PR → CI → staging deploy → Playwright → auto-merge | Large | Bugfixes land without human intervention |
| **AI-gated production promotion:** QA Tester + Security Reviewer must both pass before prod deploy | Large | AI-powered production safety net |
| **Continuous architecture validation:** Architecture Reviewer runs on every PR, flags structural drift | Medium-Large | Prevents architectural decay over time |
| **Self-documenting releases:** AI Documenter auto-generates release notes from PRD + git history | Medium | Always-current documentation |
