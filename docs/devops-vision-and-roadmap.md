# PlayerARC DevOps Vision & Transition Roadmap

**Date:** 2026-03-12
**Audience:** All stakeholders — engineering, product, testers, design partners
**Status:** Proposal for review

---

## 1. Executive Summary

PlayerARC is transitioning from a single-developer, push-to-production workflow into a multi-developer, multi-environment platform that supports structured testing, design partner onboarding, and production safety. This document maps the **complete end state** across six dimensions — environments, deployment pipelines, data strategy, bug resolution, feature delivery, and agentic automation — and lays out a phased transition plan.

### What This Enables

| Capability | Today | Target |
|-----------|-------|--------|
| Environments | 1 (production) | 3 (dev / staging / production) |
| Deploy safety | Push to main = live | Staging validation gate before production |
| Bug turnaround | Manual discovery → manual fix → push to prod | Automated detection → branch → CI → staging verify → prod |
| Feature delivery | Local dev → push to main → live | Local → PR → CI → staging UAT → approval → prod |
| Agentic automation | Post-edit hooks, Ralph orchestrator | Full lifecycle: detect → triage → fix → test → deploy |
| Multi-developer | Single dev (Claude/Ralph) | Multiple devs, parallel branches, protected main |
| Tester onboarding | Share production URL | Dedicated staging with seeded test data |
| Observability | Console logs, manual checks | PostHog analytics, Convex function monitoring, automated alerts |

---

## 2. Target Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PLAYERARC PLATFORM ARCHITECTURE                      │
│                                                                               │
│  ┌──────────────┐    ┌───────────────────┐    ┌────────────────────────┐     │
│  │  DEVELOPMENT  │    │     STAGING        │    │     PRODUCTION          │     │
│  │               │    │                    │    │                         │     │
│  │  localhost     │    │  staging.playerarc │    │  playerarc.com          │     │
│  │  :3000        │    │  .com (or Vercel   │    │  (Vercel Production)    │     │
│  │               │    │  Preview subdomain)│    │                         │     │
│  │  Convex: dev  │    │  Convex: staging   │    │  Convex: production     │     │
│  │  (personal)   │    │  (shared)          │    │  (shared)               │     │
│  │               │    │                    │    │                         │     │
│  │  Data: own    │    │  Data: seeded      │    │  Data: real users       │     │
│  │  Email: logs  │    │  Email: Resend test│    │  Email: Resend prod     │     │
│  │  OAuth: N/A   │    │  OAuth: test apps  │    │  OAuth: production      │     │
│  │  Analytics: - │    │  Analytics: staging│    │  Analytics: production  │     │
│  │               │    │  PostHog project   │    │  PostHog project        │     │
│  └──────┬────────┘    └────────┬───────────┘    └──────────┬──────────────┘     │
│         │                      │                           │                    │
│         │                      │                           │                    │
│  ┌──────┴──────────────────────┴───────────────────────────┴──────────────┐    │
│  │                         DEPLOYMENT PIPELINE                             │    │
│  │                                                                         │    │
│  │  feature/* ─┐                                                           │    │
│  │  bugfix/* ──┤── PR ──► CI ──► Staging Deploy ──► UAT ──► Prod Deploy   │    │
│  │  claude/* ──┘   │      │           │               │          │         │    │
│  │                 │      │           │               │          │         │    │
│  │            Review   Typecheck   Vercel Preview  Playwright  Manual     │    │
│  │            Required  Lint       + Convex        E2E tests   approval   │    │
│  │                     Build       Staging auto     against    (or auto   │    │
│  │                     Security    deploy           staging    after UAT  │    │
│  │                                                             passes)    │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                         AGENTIC LAYER                                   │    │
│  │                                                                         │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │ Claude Code  │  │ Ralph Agent  │  │ Bash Monitors│  │ GitHub     │  │    │
│  │  │ Hooks        │  │ Orchestrator │  │ (continuous) │  │ Actions    │  │    │
│  │  │              │  │              │  │              │  │            │  │    │
│  │  │ PostEdit:    │  │ PRD-driven   │  │ quality      │  │ CI/CD      │  │    │
│  │  │  format      │  │ story impl   │  │ security     │  │ UAT        │  │    │
│  │  │  lint        │  │              │  │ prd-audit    │  │ Dependency │  │    │
│  │  │  typecheck   │  │ Reads        │  │ test-runner  │  │ scans      │  │    │
│  │  │  quality     │  │ feedback.md  │  │ documenter   │  │            │  │    │
│  │  │              │  │ for self-    │  │              │  │ Deploys    │  │    │
│  │  │ PostCommit:  │  │ correction   │  │ Writes to    │  │ to Vercel  │  │    │
│  │  │  security    │  │              │  │ feedback.md  │  │ + Convex   │  │    │
│  │  │  scan        │  │              │  │              │  │            │  │    │
│  │  │              │  │              │  │              │  │            │  │    │
│  │  │ PreTool:     │  │              │  │              │  │            │  │    │
│  │  │  block       │  │              │  │              │  │            │  │    │
│  │  │  destructive │  │              │  │              │  │            │  │    │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                       OBSERVABILITY                                     │    │
│  │                                                                         │    │
│  │  PostHog         Convex Dashboard      GitHub Actions      Feature     │    │
│  │  ─ User flows    ─ Function errors     ─ Build status      Flags      │    │
│  │  ─ Feature       ─ Slow queries        ─ Test results      ─ 4-level  │    │
│  │    adoption      ─ Usage metrics       ─ Deploy history      cascade  │    │
│  │  ─ Error         ─ Scheduled jobs      ─ Security audits   ─ Per-org  │    │
│  │    tracking      ─ Storage usage                            ─ Per-user │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Process Flows

### 3.1 Feature Delivery Flow

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                      FEATURE DELIVERY LIFECYCLE                              │
 │                                                                              │
 │  1. IDEATION & PLANNING                                                      │
 │  ───────────────────────                                                     │
 │  Product writes PRD (scripts/ralph/prds/*.json)                              │
 │       │                                                                      │
 │       ├─ Stories with acceptance criteria                                     │
 │       ├─ Technical constraints                                               │
 │       └─ Phase breakdown                                                     │
 │       │                                                                      │
 │       ▼                                                                      │
 │  /architect-review ──► ADRs + implementation guidance                        │
 │       │                                                                      │
 │       ▼                                                                      │
 │  2. DEVELOPMENT                                                              │
 │  ───────────────                                                             │
 │  Developer creates feature branch (feature/*, ralph/*)                       │
 │       │                                                                      │
 │       ├─ Claude Code hooks auto-run on every edit:                           │
 │       │   ├─ ultracite format                                                │
 │       │   ├─ biome lint                                                      │
 │       │   ├─ typecheck (scoped to file)                                      │
 │       │   └─ quality-check.sh (Better Auth, .filter(), N+1 patterns)         │
 │       │                                                                      │
 │       ├─ On commit:                                                          │
 │       │   ├─ husky pre-commit → lint-staged                                  │
 │       │   └─ security-check.sh (secrets, XSS, injection, auth)              │
 │       │                                                                      │
 │       ├─ Ralph (agentic):                                                    │
 │       │   ├─ Implements stories from PRD autonomously                        │
 │       │   ├─ Bash monitors run continuously (quality, security, tests)       │
 │       │   ├─ Reads feedback.md for self-correction                           │
 │       │   └─ Commits after each story completion                             │
 │       │                                                                      │
 │       └─ Feature flags (for progressive rollout):                            │
 │           ├─ Add flag to featureFlags table                                  │
 │           ├─ 4-level cascade: env → platform → org → user                   │
 │           └─ Enable for staging first, then per-org in prod                  │
 │       │                                                                      │
 │       ▼                                                                      │
 │  3. PULL REQUEST                                                             │
 │  ──────────────                                                              │
 │  Developer opens PR against main                                             │
 │       │                                                                      │
 │       ├─ GitHub Actions CI (automated):                                      │
 │       │   ├─ TypeScript type check                                           │
 │       │   ├─ Biome lint (changed files)                                      │
 │       │   ├─ Production build (with staging Convex keys)                     │
 │       │   └─ Security audit (npm audit)                                      │
 │       │                                                                      │
 │       ├─ Vercel Preview Deploy (automated):                                  │
 │       │   ├─ Deploys Convex changes to STAGING backend                       │
 │       │   ├─ Builds Next.js frontend                                         │
 │       │   └─ Generates unique preview URL                                    │
 │       │                                                                      │
 │       ├─ Code review (human or /code-review agent):                          │
 │       │   ├─ Architecture alignment                                          │
 │       │   ├─ Security review                                                 │
 │       │   └─ Pattern adherence (Better Auth, Convex rules)                   │
 │       │                                                                      │
 │       └─ QA testing on preview URL                                           │
 │       │                                                                      │
 │       ▼                                                                      │
 │  4. STAGING VALIDATION                                                       │
 │  ─────────────────                                                           │
 │  After merge to main:                                                        │
 │       │                                                                      │
 │       ├─ Staging auto-deploys (Vercel + Convex staging)                      │
 │       ├─ Playwright UAT suite runs against staging                           │
 │       ├─ Smoke tests verify critical paths                                   │
 │       └─ Testers / design partners validate on staging                       │
 │       │                                                                      │
 │       ▼                                                                      │
 │  5. PRODUCTION RELEASE                                                       │
 │  ─────────────────                                                           │
 │  After staging UAT passes:                                                   │
 │       │                                                                      │
 │       ├─ Manual approval gate (or auto after UAT passes)                     │
 │       ├─ Convex deploys to production                                        │
 │       ├─ Vercel promotes to production                                       │
 │       ├─ Post-deploy smoke test                                              │
 │       └─ Feature flags enable for specific orgs → all users                  │
 │                                                                              │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Bug Fix Flow

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         BUG FIX LIFECYCLE                                     │
 │                                                                              │
 │  DETECTION (multiple sources)                                                │
 │  ─────────────────────────────                                               │
 │  ├─ User report (design partner, tester)                                     │
 │  ├─ PostHog error tracking / funnel drop-off                                 │
 │  ├─ Convex Dashboard function errors                                         │
 │  ├─ Playwright UAT test failure                                              │
 │  ├─ Agentic detection (quality/security hooks)                               │
 │  └─ GitHub Dependabot security advisory                                      │
 │       │                                                                      │
 │       ▼                                                                      │
 │  TRIAGE                                                                      │
 │  ──────                                                                      │
 │  GitHub Issue created (manual or automated)                                  │
 │       │                                                                      │
 │       ├─ Severity:                                                           │
 │       │   ├─ P0 (Critical) — auth bypass, data loss, site down              │
 │       │   ├─ P1 (High) — broken core feature, data corruption               │
 │       │   ├─ P2 (Medium) — UI bug, performance degradation                  │
 │       │   └─ P3 (Low) — cosmetic, minor UX issue                            │
 │       │                                                                      │
 │       └─ Labels: bug, priority/P0-P3, area/backend, area/frontend           │
 │       │                                                                      │
 │       ▼                                                                      │
 │  INVESTIGATION                                                               │
 │  ─────────────                                                               │
 │  /bugfix <issue-number> ──► Claude Code agent:                               │
 │       │                                                                      │
 │       ├─ 1. Read GitHub issue details                                        │
 │       ├─ 2. Search codebase for related files                                │
 │       ├─ 3. Identify root cause                                              │
 │       ├─ 4. Present findings (no code changes yet)                           │
 │       └─ 5. Wait for approval before fixing                                  │
 │       │                                                                      │
 │       ▼                                                                      │
 │  FIX IMPLEMENTATION                                                          │
 │  ──────────────────                                                          │
 │  Create bugfix/* branch:                                                     │
 │       │                                                                      │
 │       ├─ Fix code                                                            │
 │       ├─ Claude hooks auto-validate (format, lint, typecheck, quality)       │
 │       ├─ Run relevant E2E tests locally (/e2e)                               │
 │       └─ Commit with "fix: description (fixes #NNN)"                         │
 │       │                                                                      │
 │       ▼                                                                      │
 │  VERIFICATION                                                                │
 │  ────────────                                                                │
 │  PR → CI → Staging Deploy → UAT                                             │
 │       │                                                                      │
 │       ├─ P0/P1: Fast-track — single reviewer, expedited merge               │
 │       └─ P2/P3: Standard flow — full review cycle                           │
 │       │                                                                      │
 │       ▼                                                                      │
 │  PRODUCTION DEPLOY + CLOSE ISSUE                                             │
 │                                                                              │
 │  P0 HOTFIX PATH (bypass staging):                                            │
 │  ──────────────────────────────────                                          │
 │  For critical production issues:                                             │
 │       │                                                                      │
 │       ├─ Fix on hotfix/* branch from main                                    │
 │       ├─ Minimal CI (typecheck + build only)                                 │
 │       ├─ Deploy directly to production                                       │
 │       ├─ Backfill: merge to main, verify staging                            │
 │       └─ Post-incident review                                                │
 │                                                                              │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Multi-Developer Workflow

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                    MULTI-DEVELOPER COLLABORATION                             │
 │                                                                              │
 │  BRANCH STRATEGY                                                             │
 │  ───────────────                                                             │
 │                                                                              │
 │  main (protected)                                                            │
 │    │                                                                         │
 │    ├─ feature/player-graduation     (Developer A — manual)                   │
 │    ├─ feature/coach-dashboard-v2    (Developer B — manual)                   │
 │    ├─ ralph/phase-10-compliance     (Ralph — autonomous agent)               │
 │    ├─ claude/fix-issue-456          (Claude Code — assisted)                 │
 │    ├─ bugfix/auth-redirect-loop     (Any developer — bug fix)                │
 │    └─ hotfix/critical-data-loss     (Emergency — fast-track)                 │
 │                                                                              │
 │  RULES                                                                       │
 │  ─────                                                                       │
 │  ├─ main is protected: no direct pushes                                      │
 │  ├─ All changes via PR with required CI + 1 review                           │
 │  ├─ Branches must be up-to-date with main before merge                       │
 │  ├─ Each PR deploys its own Vercel preview (sharing staging Convex)          │
 │  ├─ Schema conflicts detected at Convex deploy time (staging catches first)  │
 │  └─ Feature flags allow merging incomplete features safely                   │
 │                                                                              │
 │  CONFLICT PREVENTION                                                         │
 │  ───────────────────                                                         │
 │  ├─ Convex schema: additive-only changes preferred                           │
 │  ├─ If multiple devs touch schema: coordinate via shared schema PR first     │
 │  ├─ Feature flags: merge code behind flags, enable when complete             │
 │  └─ Staging Convex: shared instance reveals conflicts early                  │
 │                                                                              │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Toolset Inventory

### 4.1 What Exists Today

| Category | Tool | Status | Function |
|----------|------|--------|----------|
| **IDE** | Claude Code | Active | AI-assisted development, hooks, agent skills |
| **Pre-commit** | Husky + lint-staged | Active | Runs biome lint on staged files |
| **Post-edit hooks** | ultracite, biome, tsc | Active | Auto-format, lint, typecheck on every file edit |
| **Quality hooks** | quality-check.sh | Active | Detects Better Auth violations, .filter(), N+1, missing orgId |
| **Security hooks** | security-check.sh | Active | Post-commit scan for secrets, XSS, injection, auth gaps |
| **Safety hooks** | dangerous-command-check.sh | Active | Blocks `rm -rf`, `git reset --hard`, `git clean -f` |
| **Session hooks** | session-start.sh, session-end.sh | Active | Ralph status check, feedback summary |
| **Agent orchestrator** | Ralph (ralph.sh) | Active | PRD-driven autonomous story implementation |
| **Bash monitors** | 5 agents (quality, security, prd-audit, test-runner, documenter) | Available | Continuous monitoring during Ralph runs |
| **Claude skills** | 15 skills (/bugfix, /code-review, /e2e, /build-fix, etc.) | Active | On-demand specialized analysis |
| **Feature flags** | featureFlags.ts | Active | 4-level cascade (env → platform → org → user) |
| **CI** | GitHub Actions (ci.yml) | Active | Typecheck, lint, build, security audit |
| **Deploy** | Vercel + Convex | Active | Auto-deploy on push to main |
| **Analytics** | PostHog (partial) | Partial | Client-side tracking scaffolded, ~3 events implemented |
| **Dependency audit** | Dependabot + weekly workflow | Active | Weekly scan + Dependabot PRs |
| **E2E tests** | Playwright | Available | Test framework exists, UAT workflow disabled |

### 4.2 What Needs to Be Added

| Category | Tool/Process | Purpose | Phase |
|----------|-------------|---------|-------|
| **Staging environment** | Convex staging deployment + Vercel Preview env config | Isolate testing from production | 1 |
| **Branch protection** | GitHub branch rules on main | Enforce PR reviews + passing CI | 1 |
| **Staging seed script** | `scripts/seed-staging.sh` | One-command staging data setup | 1 |
| **UAT activation** | Enable uat-tests.yml workflow | Automated E2E against staging | 2 |
| **Health check endpoint** | `/api/health` route | Smoke test target for deploy verification | 2 |
| **Deploy verification** | Post-deploy smoke test workflow | Verify staging/prod after deploy | 2 |
| **GitHub issue templates** | Bug report + feature request templates | Structured triage | 2 |
| **Error boundary reporting** | Global React error boundary → PostHog | Capture frontend crashes | 3 |
| **Convex error alerting** | Convex function error → notification | Alert on backend errors | 3 |
| **Production approval gate** | GitHub Environments with reviewers | Manual approval for prod deploy | 3 |
| **Hotfix workflow** | hotfix/* branch + expedited pipeline | Fast-track critical bug fixes | 3 |
| **Schema migration safety** | Pre-deploy schema diff check | Warn on destructive schema changes | 4 |
| **Performance monitoring** | PostHog + Convex usage metrics | Track slow queries, function latency | 4 |
| **Incident response runbook** | Documented procedures | Rollback, data recovery, escalation | 4 |

### 4.3 Agentic Capabilities — Current & Target

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENTIC AUTOMATION LAYERS                         │
│                                                                      │
│  LAYER 1: REAL-TIME HOOKS (exists ✅)                               │
│  ──────────────────────────────────────                              │
│  Trigger: Every file edit / commit                                   │
│  Latency: <5 seconds                                                │
│  Actions:                                                            │
│    ├─ Auto-format (ultracite)                                ✅     │
│    ├─ Auto-lint (biome)                                      ✅     │
│    ├─ Auto-typecheck (tsc, scoped)                           ✅     │
│    ├─ Quality pattern check (Better Auth, .filter(), N+1)    ✅     │
│    ├─ Security scan on commit (secrets, XSS, auth)           ✅     │
│    ├─ Block destructive commands                             ✅     │
│    └─ Console.log detection on session stop                  ✅     │
│                                                                      │
│  LAYER 2: CONTINUOUS MONITORS (exists ✅)                           │
│  ──────────────────────────────────────────                          │
│  Trigger: Polling (30s-120s intervals)                               │
│  Actions:                                                            │
│    ├─ quality-monitor.sh (60s — type + lint checks)          ✅     │
│    ├─ security-tester.sh (120s — pattern scanning)           ✅     │
│    ├─ prd-auditor.sh (90s — story completion checks)         ✅     │
│    ├─ test-runner.sh (30s — run tests after changes)         ✅     │
│    └─ documenter.sh (120s — auto-extract docs)               ✅     │
│                                                                      │
│  LAYER 3: ON-DEMAND AGENTS (exists ✅)                              │
│  ──────────────────────────────────────                               │
│  Trigger: Manual invocation via /skills                              │
│  Actions:                                                            │
│    ├─ /bugfix <issue> — investigate + fix GitHub issues       ✅     │
│    ├─ /code-review — review uncommitted changes              ✅     │
│    ├─ /review-security — deep security analysis              ✅     │
│    ├─ /architect-review — architectural analysis + ADRs      ✅     │
│    ├─ /e2e — run Playwright E2E tests                        ✅     │
│    ├─ /build-fix — fix TypeScript and build errors           ✅     │
│    ├─ /refactor-clean — dead code removal                    ✅     │
│    ├─ /check-prd — PRD phase status                          ✅     │
│    ├─ /document-phase — comprehensive phase docs             ✅     │
│    └─ /review-fix — full review-and-fix pipeline             ✅     │
│                                                                      │
│  LAYER 4: CI/CD PIPELINE (partial ⚠️ — needs enhancement)          │
│  ────────────────────────────────────────────────────────             │
│  Trigger: PR / push to main                                          │
│  Current:                                                            │
│    ├─ Typecheck + lint + build                               ✅     │
│    ├─ Security audit (re-enable)                             ⚠️     │
│    ├─ UAT E2E tests (disabled)                               ❌     │
│    ├─ Staging deploy verification                            ❌     │
│    └─ Production approval gate                               ❌     │
│  Target additions:                                                   │
│    ├─ UAT tests run against staging after deploy             🎯     │
│    ├─ Post-deploy smoke test (health check)                  🎯     │
│    ├─ Schema migration safety check                          🎯     │
│    └─ Deploy notification (Slack/GitHub)                     🎯     │
│                                                                      │
│  LAYER 5: OBSERVABILITY & ALERTING (needs build-out 🎯)            │
│  ──────────────────────────────────────────────────────               │
│  Trigger: Continuous / threshold-based                               │
│  Target:                                                             │
│    ├─ PostHog: user flow analytics + error tracking          🎯     │
│    ├─ Convex: function error rate alerting                   🎯     │
│    ├─ Vercel: deployment failure notifications               🎯     │
│    ├─ GitHub: Dependabot auto-merge for patch updates        🎯     │
│    └─ Custom: Schema drift detection between envs            🎯     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Strategy

### 5.1 Environment Data Model

```
┌────────────────────────────────────────────────────────────────────┐
│                       DATA BY ENVIRONMENT                           │
│                                                                     │
│  PRODUCTION                                                         │
│  ──────────                                                         │
│  Source of truth. Never seeded. Never reset.                        │
│  ├─ Real clubs (Grange RFC, St. Mary's GAA, etc.)                  │
│  ├─ Real users with real credentials                                │
│  ├─ Live player assessments, injuries, goals                        │
│  ├─ Production OAuth (Google/Microsoft)                             │
│  ├─ Real email delivery (Resend production domain)                  │
│  └─ Clean PostHog analytics (real user behavior)                    │
│                                                                     │
│  STAGING                                                            │
│  ───────                                                            │
│  Shared testing environment. Reset-able. Seeded.                    │
│  ├─ "Demo Club" org (60 players, 6 teams, 3 sports)               │
│  ├─ 5 test user accounts (known passwords):                        │
│  │   ├─ owner@test.playerarc.com   (Owner role)                    │
│  │   ├─ admin@test.playerarc.com   (Admin role)                    │
│  │   ├─ coach@test.playerarc.com   (Coach role)                    │
│  │   ├─ parent@test.playerarc.com  (Parent role)                   │
│  │   └─ member@test.playerarc.com  (Member role)                   │
│  ├─ Complete reference data (benchmarks, skills, all sports)        │
│  ├─ Seeded player data at 3 stages (beginner/developing/advanced)   │
│  ├─ Test OAuth apps (Google/Microsoft staging redirect URIs)        │
│  ├─ Resend test mode (emails logged, not delivered)                 │
│  ├─ Separate PostHog project (testing noise isolated)               │
│  └─ Each design partner gets their own org (not Demo Club)          │
│                                                                     │
│  DEVELOPMENT (per developer)                                        │
│  ──────────                                                         │
│  Personal Convex dev instance. Fully independent.                   │
│  ├─ `convex dev` creates isolated database                          │
│  ├─ Developer can seed/reset freely                                 │
│  ├─ No OAuth needed (email/password only)                           │
│  ├─ Emails go to console log                                        │
│  └─ No PostHog (or personal project)                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Staging Seed & Reset Process

```
# Initial Setup (one-time)
seed-staging.sh:
  1. Import benchmark data (soccer, rugby, GAA, Irish dancing)
  2. Import level descriptors (all sports)
  3. Create test user accounts (or instruct manual signup)
  4. Run bootstrapPlatformStaff for owner account
  5. Run seed orchestrator (creates Demo Club + 60 players)
  6. Verify all roles can log in and see appropriate data

# Reset When Needed
reset-staging.sh:
  1. Run stagedReset (3 phases to avoid timeouts)
  2. Re-run seed-staging.sh
  3. Verify health check passes

# Per-Tester Setup
  1. Tester signs up on staging URL
  2. Admin invites tester to Demo Club (or tester creates own org)
  3. Tester works in their own org (doesn't pollute Demo Club)
```

### 5.3 Schema Migration Safety

| Change Type | Risk | Process |
|-------------|------|---------|
| New table | Safe | Auto-deploy to staging, then production |
| New optional field | Safe | Auto-deploy |
| New required field | Medium | Add as optional first, backfill, then make required |
| Remove field | High | Grep all usages, remove code refs, then remove from schema |
| Change field type | High | Migration script with dryRun, run on staging first |
| New index | Safe | Auto-deploy (Convex builds indexes async) |
| Remove index | Medium | Ensure no queries use it first |

---

## 6. Third-Party Services per Environment

| Service | Dev | Staging | Production |
|---------|-----|---------|------------|
| **Convex** | Personal dev instance | Staging deployment (shared) | Production deployment |
| **Vercel** | N/A (localhost) | Preview environment | Production environment |
| **Google OAuth** | N/A | Staging redirect URIs | Production redirect URIs |
| **Microsoft OAuth** | N/A | Staging redirect URIs | Production redirect URIs |
| **Resend** (email) | Console log | Test API key (no real sends) | Production key (real sends) |
| **Twilio** (SMS/WhatsApp) | N/A | Test credentials | Production credentials |
| **PostHog** (analytics) | N/A | Staging project (EU) | Production project (EU) |
| **Anthropic** (AI features) | Dev key | Shared or staging key | Production key |
| **GitHub Actions** | N/A | Shared (runs on all PRs) | Shared |

Full environment variable matrix in `docs/deployment-pipeline-review.md` Section 4.

---

## 7. Security Operations (SecOps)

### 7.1 Security Controls by Layer

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SECURITY CONTROLS                               │
│                                                                      │
│  CODE-TIME (before commit)                                           │
│  ├─ Biome lint (code quality, potential issues)                      │
│  ├─ quality-check.sh hook (Better Auth violations, auth bypass)      │
│  ├─ dangerous-command-check.sh (block rm -rf, reset --hard)          │
│  └─ TypeScript strict mode (type safety)                             │
│                                                                      │
│  COMMIT-TIME                                                         │
│  ├─ security-check.sh hook (hardcoded secrets, XSS, injection)       │
│  ├─ lint-staged (biome check on staged files)                        │
│  └─ Console.log detection (prevent debug leaks)                      │
│                                                                      │
│  PR-TIME                                                             │
│  ├─ CI security audit (npm audit)                                    │
│  ├─ /code-review skill (AI-powered security review)                  │
│  ├─ /review-security skill (deep vulnerability analysis)             │
│  └─ Required review before merge                                     │
│                                                                      │
│  RUNTIME                                                             │
│  ├─ Better Auth rate limiting (signup: 3/hr, login: 5/15min)         │
│  ├─ Organization-scoped data isolation (all queries by orgId)        │
│  ├─ Role-based access (owner/admin/coach/parent/member)              │
│  ├─ GDPR: assessment retention expiry, EU PostHog                    │
│  └─ Federation encryption (AES for federation data)                  │
│                                                                      │
│  DEPENDENCY                                                          │
│  ├─ Dependabot (weekly auto-PRs for known vulnerabilities)           │
│  ├─ npm audit in CI (every PR)                                       │
│  └─ Weekly dependency-updates.yml (audit report)                     │
│                                                                      │
│  INFRASTRUCTURE                                                      │
│  ├─ Vercel: automatic HTTPS, DDoS protection                        │
│  ├─ Convex: managed infrastructure, encrypted at rest                │
│  └─ Environment separation (staging keys ≠ production keys)         │
│                                                                      │
│  TARGET ADDITIONS 🎯                                                 │
│  ├─ GitHub secret scanning (detect leaked tokens in commits)         │
│  ├─ SAST tool integration (CodeQL or similar in CI)                  │
│  ├─ Convex function-level error alerting                             │
│  ├─ Incident response runbook                                        │
│  └─ Security review required for auth/payment PRs                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Incident Response (Target)

| Severity | Response Time | Actions |
|----------|--------------|---------|
| P0 (Critical) | < 1 hour | Hotfix branch, expedited deploy, post-mortem |
| P1 (High) | < 4 hours | Priority fix, standard PR with expedited review |
| P2 (Medium) | < 1 sprint | Normal PR flow, full staging validation |
| P3 (Low) | Backlog | Scheduled in next sprint |

---

## 8. Observability & Insights

### 8.1 Current State

| Signal | Tool | Status |
|--------|------|--------|
| User analytics | PostHog | Partial — SDK installed, ~3 events tracked |
| Backend errors | Convex Dashboard | Manual — check dashboard |
| Frontend errors | None | No error boundary reporting |
| Deploy status | Vercel Dashboard | Manual — check dashboard |
| CI status | GitHub Actions | Automated — badges available |
| Security | npm audit | Weekly report |
| Performance | None | No tracking |

### 8.2 Target State

```
┌─────────────────────────────────────────────────────────────────────┐
│                     OBSERVABILITY STACK                               │
│                                                                      │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│  │   PostHog      │   │   Convex       │   │   GitHub       │         │
│  │   (Analytics)  │   │   (Backend)    │   │   (CI/CD)      │         │
│  │                │   │                │   │                │         │
│  │  User flows    │   │  Function      │   │  Build status  │         │
│  │  Feature       │   │  errors &      │   │  Test results  │         │
│  │  adoption      │   │  latency       │   │  Deploy history│         │
│  │  Error events  │   │  Storage usage │   │  Dependency    │         │
│  │  Funnels       │   │  Scheduled job │   │  audit results │         │
│  │  Session       │   │  status        │   │                │         │
│  │  replays       │   │                │   │                │         │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘         │
│          │                    │                     │                  │
│          └────────────────────┼─────────────────────┘                  │
│                               │                                       │
│                    ┌──────────▼──────────┐                            │
│                    │   ALERTS (target)    │                            │
│                    │                      │                            │
│                    │  ├─ Slack channel    │                            │
│                    │  │   #playerarc-ops  │                            │
│                    │  │                   │                            │
│                    │  ├─ Error rate > 5%  │                            │
│                    │  ├─ Deploy failure   │                            │
│                    │  ├─ UAT test failure │                            │
│                    │  ├─ Security vuln    │                            │
│                    │  └─ Schema conflict  │                            │
│                    │                      │                            │
│                    └─────────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key PostHog Events to Implement** (from existing docs, ~95 events planned):

| Category | Priority | Examples |
|----------|----------|---------|
| Auth flows | P1 | `user_signed_up`, `user_logged_in`, `user_logged_out` |
| Organization | P1 | `org_created`, `member_invited`, `join_request_approved` |
| Player management | P2 | `player_enrolled`, `player_assessment_created` |
| Coaching | P2 | `voice_note_recorded`, `insight_applied`, `task_completed` |
| Errors | P1 | `frontend_error`, `api_error`, `auth_failure` |

---

## 9. Phased Transition Plan

### Phase 1: Environment Foundation (Week 1)

**Goal:** Staging environment exists and is safe.

| # | Task | Owner | Tools Needed |
|---|------|-------|-------------|
| 1.1 | Create Convex staging deployment | Manual (Convex Dashboard) | Browser |
| 1.2 | Set Convex staging env vars (SITE_URL, OAuth, Resend, etc.) | Manual (Convex Dashboard) | Browser |
| 1.3 | Split Vercel env vars: Preview → staging keys, Production → prod keys | Manual (Vercel Dashboard) | Browser |
| 1.4 | Add staging redirect URIs to Google/Microsoft OAuth apps | Manual (Cloud consoles) | Browser |
| 1.5 | Add GitHub secrets (CONVEX_DEPLOY_KEY_STAGING, test user creds, etc.) | Manual (GitHub Settings) | Browser |
| 1.6 | Enable branch protection on main (require PR + CI) | Manual (GitHub Settings) | Browser |
| 1.7 | Delete `ci-old.yml.bak` from workflows | Code change | Git |
| 1.8 | Create seed-staging.sh script | Code change | Git |

**Verification:** Open a PR, confirm Vercel preview deploys to staging Convex (not production). Verify preview URL loads correctly.

### Phase 2: Pipeline Hardening (Week 2)

**Goal:** CI uses real staging keys. UAT tests can run. PR flow is clean.

| # | Task | Owner | Tools Needed |
|---|------|-------|-------------|
| 2.1 | Update ci.yml: use staging keys instead of dummy values | Code change | Git |
| 2.2 | Re-enable security scanning in ci.yml | Code change | Git |
| 2.3 | Merge PR preview comment into ci.yml, delete pr-preview.yml | Code change | Git |
| 2.4 | Clean up disabled `if: false` jobs | Code change | Git |
| 2.5 | Create `/api/health` endpoint in Next.js | Code change | Git |
| 2.6 | Seed staging environment (run seed-staging.sh) | Manual | CLI |
| 2.7 | Create GitHub issue templates (bug report, feature request) | Code change | Git |
| 2.8 | Enable UAT tests workflow (remove `if: false`, configure secrets) | Code change | Git |

**Verification:** Merge a PR to main. Confirm CI passes with real keys. Confirm UAT tests execute against staging. Confirm staging has seeded data.

### Phase 3: Production Safety & Observability (Week 3-4)

**Goal:** Production deploys have a gate. Errors are visible. Testers are onboarded.

| # | Task | Owner | Tools Needed |
|---|------|-------|-------------|
| 3.1 | Create GitHub Environment "production" with required reviewers | Manual (GitHub) | Browser |
| 3.2 | Add post-deploy smoke test workflow | Code change | Git |
| 3.3 | Create separate PostHog staging project | Manual (PostHog) | Browser |
| 3.4 | Implement global React error boundary → PostHog error events | Code change | Git |
| 3.5 | Add P1 PostHog events (auth flows, org creation, errors) | Code change | Git |
| 3.6 | Create hotfix/* branch workflow documentation | Documentation | Git |
| 3.7 | Onboard first design partner to staging | Manual | Staging URL |
| 3.8 | Document tester onboarding process | Documentation | Git |

**Verification:** Intentionally break staging → confirm error appears in PostHog. Confirm design partner can log in and use staging independently.

### Phase 4: Maturity & Scale (Week 5+)

**Goal:** Full DevOps maturity. Multi-developer ready. Self-healing where possible.

| # | Task | Owner | Tools Needed |
|---|------|-------|-------------|
| 4.1 | Add Slack/notification integration for deploy status + alerts | Code change | Slack API |
| 4.2 | Add schema migration safety check to CI (warn on destructive changes) | Code change | Git |
| 4.3 | Implement remaining PostHog events (~90 events) | Code change | Git |
| 4.4 | Create incident response runbook | Documentation | Git |
| 4.5 | Enable GitHub secret scanning | Manual (GitHub) | Browser |
| 4.6 | Add Dependabot auto-merge for patch-level updates | Code change | Git |
| 4.7 | Performance monitoring: identify and alert on slow Convex functions | Code change | Convex Dashboard |
| 4.8 | Create second test org in staging for cross-org testing | Manual | Staging |

---

## 10. Decision Log

Decisions needed from stakeholders before/during implementation:

| # | Decision | Options | Impact | Needed By |
|---|----------|---------|--------|-----------|
| 1 | Staging URL | Vercel subdomain vs custom subdomain | Tester experience, OAuth config | Phase 1 |
| 2 | OAuth setup | One app with multiple redirect URIs vs separate apps per env | Maintenance overhead | Phase 1 |
| 3 | Production gate | Auto after UAT passes vs manual approval | Deploy speed vs safety | Phase 3 |
| 4 | Convex plan | Verify current plan supports multiple deployments | Blocking for staging | Phase 1 |
| 5 | Notification channel | Slack, Discord, email, or GitHub Discussions | Team communication | Phase 3 |
| 6 | PostHog setup | Separate staging project vs environment filtering | Analytics cleanliness | Phase 3 |
| 7 | Email for staging | Resend test mode vs staging subdomain for real delivery | Tester experience | Phase 1 |
| 8 | Tester accounts | Self-service signup vs pre-provisioned accounts | Onboarding friction | Phase 2 |

---

## 11. Success Metrics

How we'll know each phase is working:

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | PR previews never deploy to production Convex | 100% |
| 1 | All merges to main require passing CI | 100% |
| 2 | UAT tests run automatically on every merge | 100% |
| 2 | CI uses real keys (no dummy values) | 100% |
| 3 | Design partners can log in and test on staging | First partner onboarded |
| 3 | Frontend errors appear in PostHog within 60s | < 60s latency |
| 3 | Zero production deploys without staging validation | 100% |
| 4 | Mean time to detect bugs | < 1 hour (vs days today) |
| 4 | Mean time to deploy a bug fix | < 4 hours for P1 |
| 4 | Schema migrations tested on staging first | 100% |
