# Phase 6 Phased Implementation Plan

**Date:** January 25, 2026
**Strategy:** 4 separate Ralph runs (similar to P5 phased approach)
**Total Stories:** 23 user stories
**Base Branch:** `main` (includes all P5 work via PR #331)

---

## Overview

Phase 6 will be implemented in **4 separate runs**, each with its own branch and PR. This mirrors the successful P5 phased approach and provides:

- ✅ Incremental progress and testing
- ✅ Smaller, reviewable PRs
- ✅ Clear stopping points between phases
- ✅ Ability to ship features as they're ready
- ✅ Reduced risk of context loss

---

## Phase Breakdown

### **Phase 6.1: Cost Controls** (11 stories)
**Branch:** `ralph/coach-parent-summaries-p6-phase1`
**PRD:** `scripts/ralph/prds/coach-parent-summaries-phase6.1.prd.json`
**Stories:** US-001 to US-011
**Duration:** ~1 week

**What it does:**
- Per-org budget tracking with daily/monthly caps
- Budget checks before AI calls (fail fast)
- Cost alert system with 80% threshold warnings
- Rate limiting (messages per hour/day, cost per hour/day)
- Automated daily resets and alert monitoring
- Platform-wide failsafe limits

**New Tables:**
- `orgCostBudgets` - Per-org budget tracking
- `platformCostAlerts` - Alert audit trail
- `rateLimits` - Platform and per-org rate limits

**New Crons (added to existing crons.ts):**
- `updateOrgDailySpend` - Daily at 00:00 UTC
- `checkCostAlerts` - Every 10 minutes
- `resetRateLimitWindows` - Every hour at :00

**Key Integration:**
- Edit `processVoiceNoteInsight` action to check rate limits and budgets BEFORE calling AI

**Testing Focus:**
- Set budget to $5/day, exceed it, verify blocking
- Hit rate limit, verify 11th message blocked
- Verify cost alerts at 80% threshold
- Verify no alert spam (deduplication)

---

### **Phase 6.2: Graceful Degradation** (5 stories)
**Branch:** `ralph/coach-parent-summaries-p6-phase2`
**PRD:** `scripts/ralph/prds/coach-parent-summaries-phase6.2.prd.json`
**Stories:** US-012 to US-016
**Duration:** ~1 week
**Depends on:** Phase 6.1 merged to main

**What it does:**
- Circuit breaker pattern for AI service failures
- Fallback template messages when AI unavailable
- Degradation banners in coach UI
- Self-healing (auto-recovery when service restores)
- Zero user-facing errors when Anthropic API down

**New Tables:**
- `aiServiceHealth` - Service health tracking (singleton)

**New Files:**
- `lib/circuitBreaker.ts` - Circuit breaker logic
- `components/coach/degradation-banner.tsx` - UI component
- `models/aiServiceHealth.ts` - Health queries

**Key Integration:**
- Edit `generateParentSummary` and `classifyInsightSensitivity` actions to use circuit breaker
- Add degradation banner to voice notes dashboard
- Optional: Add warning badge to Coach Settings Dialog

**Testing Focus:**
- Simulate API failure (invalid API key)
- Verify circuit opens after 5 failures
- Verify fallback template messages sent
- Verify degradation banner appears/disappears automatically
- Verify circuit auto-closes after successful test call

---

### **Phase 6.3: Admin Dashboard** (6 stories)
**Branch:** `ralph/coach-parent-summaries-p6-phase3`
**PRD:** `scripts/ralph/prds/coach-parent-summaries-phase6.3.prd.json`
**Stories:** US-017 to US-022
**Duration:** ~1 week
**Depends on:** Phase 6.2 merged to main

**What it does:**
- Platform admin dashboard at `/platform/messaging`
- 5 tabs: Overview, Cost Analytics, Rate Limits, Service Health, Settings
- Real-time cost/usage monitoring
- Rate limit configuration UI
- Circuit breaker status display
- Emergency kill switch for all AI features

**New Route:**
- `/platform/messaging` - Admin dashboard (platform staff only)

**New Tables:**
- `platformMessagingSettings` - Feature toggle settings (singleton)

**New Queries:**
- `getPlatformUsage` - Platform-wide cost aggregation (wrapper around getOrgUsage)

**5 Tabs:**
1. **Overview** (default) - War room view with all key metrics
   - Total Messages/Cost (24h), Active Orgs, Service Status
   - Trust System Health (coaches automated, summaries auto-sent)
   - Alert panel with unacknowledged alerts
   - Recent activity feed

2. **Cost Analytics** - 30-day trends and breakdowns
   - Total Cost (30 days), Cost Today, Avg per Message, Cache Hit Rate
   - Daily cost line chart
   - Top 10 orgs by cost table

3. **Rate Limits** - Configure and monitor limits
   - Platform-wide limits (editable)
   - Per-org overrides (add/edit/remove)
   - Recent violations table

4. **Service Health** - Monitor AI service
   - Circuit breaker state (healthy/degraded/down)
   - Last success/failure times
   - Cache effectiveness metrics
   - Force reset button

5. **Settings** - Emergency controls
   - Feature toggles (AI generation, auto-approval, notifications)
   - Emergency Disable All button (master kill switch)
   - Emergency message display

**Testing Focus:**
- Access /platform/messaging as non-staff, verify redirect
- Verify all tabs render with real data
- Update platform-wide rate limit, verify saved
- Trigger emergency mode, verify all AI disabled
- Acknowledge cost alert, verify dismissed

---

### **Phase 6.4: Performance Optimization** (1 story)
**Branch:** `ralph/coach-parent-summaries-p6-phase4`
**PRD:** `scripts/ralph/prds/coach-parent-summaries-phase6.4.prd.json`
**Stories:** US-023
**Duration:** ~2-3 days
**Depends on:** Phase 6.3 merged to main

**What it does:**
- Pre-aggregate daily AI usage stats for 100x faster dashboard queries
- Nightly cron aggregates previous day's usage
- Dashboard queries use aggregates for > 7 day ranges
- Keeps raw logs for detailed analysis

**New Tables:**
- `aiUsageDailyAggregates` - Pre-aggregated daily stats

**New Crons:**
- `aggregateDailyUsage` - Daily at 1 AM UTC

**Key Optimization:**
- Update `getOrgUsage` query to use aggregates for date ranges > 7 days
- 30-day dashboard query: O(30) instead of O(10,000)

**Testing Focus:**
- Generate 100 summaries, run aggregation
- Verify aggregates match raw logs (within 0.1%)
- Query 30-day stats, verify uses aggregates
- Measure query speed (< 100ms for 30-day)
- Verify idempotency (run cron twice, no duplicates)

---

## Implementation Timeline

| Phase | Stories | Duration | Branch | Merge To |
|-------|---------|----------|--------|----------|
| 6.1 | US-001 to US-011 | Week 1 | `ralph/coach-parent-summaries-p6-phase1` | main |
| 6.2 | US-012 to US-016 | Week 2 | `ralph/coach-parent-summaries-p6-phase2` | main |
| 6.3 | US-017 to US-022 | Week 3 | `ralph/coach-parent-summaries-p6-phase3` | main |
| 6.4 | US-023 | Week 4 | `ralph/coach-parent-summaries-p6-phase4` | main |

**Total Duration:** ~4 weeks

---

## Branch Strategy

Each phase follows this pattern:

1. **Create branch from main** (includes all previous phase work)
2. **Run Ralph with phase-specific PRD**
3. **Test phase deliverables**
4. **Create PR to main**
5. **Merge and start next phase**

Example for Phase 6.1:
```bash
git checkout main
git pull origin main
git checkout -b ralph/coach-parent-summaries-p6-phase1

# Ralph runs with coach-parent-summaries-phase6.1.prd.json

# After completion:
git push -u origin ralph/coach-parent-summaries-p6-phase1
gh pr create --title "feat: P6.1 - Cost Controls (US-001 to US-011)" --base main
```

---

## Dependencies Between Phases

### Phase 6.1 → 6.2
Phase 6.2 integrates circuit breaker into the AI pipeline that Phase 6.1 established with budget/rate checks.

### Phase 6.2 → 6.3
Phase 6.3 admin dashboard displays data from both Phase 6.1 (budgets, rate limits) and Phase 6.2 (circuit breaker health).

### Phase 6.3 → 6.4
Phase 6.4 optimizes the queries that Phase 6.3's dashboard uses (especially Cost Analytics tab).

**Each phase builds on the previous - cannot skip or reorder.**

---

## Ralph Agent Setup (Same for All Phases)

Before starting each phase:

```bash
# Start monitoring agents
./scripts/ralph/agents/start-all.sh

# Monitor progress (separate terminal)
tail -f scripts/ralph/agents/output/*.log
tail -f scripts/ralph/agents/output/test-runner.log
tail -f scripts/ralph/agents/output/feedback.md
```

After completing each phase:

```bash
# Stop agents
./scripts/ralph/agents/stop-all.sh
```

---

## Phase-Specific Notes

### Phase 6.1 Notes
- **CRITICAL:** Edit existing `crons.ts` file (don't create new)
- Budget check must run BEFORE any AI calls (rate check → budget check → AI)
- Alert deduplication prevents spam (60-minute window)
- Default platform limits are conservative - adjust after production observation

### Phase 6.2 Notes
- Circuit breaker state transitions: closed → open (5 failures) → half_open (1 min) → closed (success)
- Fallback messages are simple templates - don't try to be clever
- Degradation banner integration with Coach Settings Dialog is OPTIONAL
- Real-time Convex queries mean banner appears/disappears automatically

### Phase 6.3 Notes
- `/platform/messaging` is NOT under `/orgs/[orgId]` - platform-level route
- All tabs must check `user.isPlatformStaff` - redirect if not authorized
- May need to create `getPlatformUsage` wrapper around `getOrgUsage`
- Emergency kill switch requires confirmation dialog - don't allow accidental activation
- Overview tab is default active tab (load first)

### Phase 6.4 Notes
- This phase is OPTIONAL - can skip if performance is acceptable
- Trade-off: up to 24h stale data for 100x speed gain
- Aggregation cron must be idempotent (check if record exists before inserting)
- Sparse table: only insert records for orgs with usage that day
- Fall back to raw logs if aggregates missing for requested dates

---

## Success Criteria (All Phases)

Phase 6 is complete when:

- ✅ All 23 user stories marked `passes: true`
- ✅ All 4 PRs merged to main
- ✅ TypeScript type checks pass
- ✅ Biome linting passes
- ✅ Convex codegen succeeds
- ✅ All automated agent tests pass
- ✅ Admin dashboard fully functional at `/platform/messaging`
- ✅ Budget enforcement prevents overspending
- ✅ Rate limits block runaway costs
- ✅ Circuit breaker handles API failures gracefully
- ✅ Emergency kill switch tested and working
- ✅ Performance optimization (if implemented) shows 10-100x speedup

---

## Current Status

**Ready to Start:** Phase 6.1
**Branch:** `ralph/coach-parent-summaries-p6` (placeholder - will create `p6-phase1`)
**PRD:** `scripts/ralph/prds/coach-parent-summaries-phase6.1.prd.json`

**Next Steps:**
1. Create Phase 6.1 branch from main
2. Start Ralph agents
3. Run Ralph with Phase 6.1 PRD
4. Test budget and rate limiting
5. Create PR for Phase 6.1
6. Merge and proceed to Phase 6.2

---

**Let's start with Phase 6.1!** 🚀
