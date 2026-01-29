# Phase 6.1 Ready - Cost Controls

**Date:** January 25, 2026
**Branch:** `ralph/coach-parent-summaries-p6-phase1`
**PRD:** `scripts/ralph/prds/coach-parent-summaries-phase6.1.prd.json`
**Stories:** US-001 to US-011 (11 stories)
**Duration:** ~1 week

---

## What This Phase Does

Implements cost monitoring and rate limiting to prevent runaway AI costs:

**Cost Monitoring (US-001 to US-006):**
- Per-org budget tracking (daily and monthly caps)
- Budget checks BEFORE AI calls (fail fast)
- Cost alert system (80% threshold warnings)
- Automated daily/monthly resets
- Alert deduplication (no spam)

**Rate Limiting (US-007 to US-011):**
- Messages per hour/day limits
- Cost per hour/day limits
- Platform-wide and per-org limits
- Rolling window resets
- Default failsafe limits

---

## New Tables

### orgCostBudgets
Per-org budget tracking with daily/monthly spending limits.

**Fields:**
- `organizationId` (string)
- `dailyBudgetUsd` (number)
- `monthlyBudgetUsd` (number)
- `alertThresholdPercent` (number, default 80)
- `isEnabled` (boolean)
- `currentDailySpend` (number)
- `currentMonthlySpend` (number)
- `lastResetDate` (string YYYY-MM-DD)
- `lastResetMonth` (string YYYY-MM)

**Index:** `by_org` (organizationId)

### platformCostAlerts
Alert audit trail for all cost threshold violations.

**Fields:**
- `alertType` (union: 'org_daily_threshold' | 'org_daily_exceeded' | 'org_monthly_threshold' | 'org_monthly_exceeded' | 'platform_spike')
- `organizationId` (optional string)
- `severity` (union: 'warning' | 'critical')
- `message` (string)
- `triggerValue` (number)
- `thresholdValue` (number)
- `timestamp` (number)
- `acknowledged` (boolean)
- `acknowledgedBy` (optional string)
- `acknowledgedAt` (optional number)

**Indexes:**
- `by_timestamp` (timestamp)
- `by_org` (organizationId)
- `by_severity_ack` (severity, acknowledged)

### rateLimits
Platform-wide and per-org rate limiting.

**Fields:**
- `scope` (union: 'platform' | 'organization')
- `scopeId` (string, 'platform' for global)
- `limitType` (union: 'messages_per_hour' | 'messages_per_day' | 'cost_per_hour' | 'cost_per_day')
- `limitValue` (number)
- `currentCount` (number)
- `currentCost` (number)
- `windowStart` (number)
- `windowEnd` (number)
- `lastResetAt` (number)

**Index:** `by_scope_type` (scope, scopeId, limitType)

---

## New Backend Files

### models/orgCostBudgets.ts
```typescript
export const checkOrgCostBudget = query({...})
export const logBudgetExceededEvent = internalMutation({...})
```

### models/rateLimits.ts
```typescript
export const checkRateLimit = query({...})
export const incrementRateLimit = internalMutation({...})
```

### seed/defaultRateLimits.ts
```typescript
// Platform-wide default limits:
// messages_per_hour: 1000
// messages_per_day: 10000
// cost_per_hour: $50
// cost_per_day: $500
```

---

## Integration Points

### Edit: actions/coachParentSummaries.ts

**processVoiceNoteInsight action:**

```typescript
// 1. FIRST: Check rate limits
const rateCheck = await ctx.runQuery(api.models.rateLimits.checkRateLimit, { organizationId });
if (!rateCheck.allowed) {
  return { error: "Rate limit exceeded", resetAt: rateCheck.resetAt };
}

// 2. SECOND: Check budget
const budgetCheck = await ctx.runQuery(api.models.orgCostBudgets.checkOrgCostBudget, { organizationId });
if (!budgetCheck.withinBudget) {
  await ctx.runMutation(internal.models.orgCostBudgets.logBudgetExceededEvent, { organizationId, reason: budgetCheck.reason });
  return { error: "Budget exceeded", resetAt: ... };
}

// 3. THIRD: Call AI (both classify and generate)
// ... existing AI logic ...

// 4. FOURTH: Increment rate limit counter
await ctx.runMutation(internal.models.rateLimits.incrementRateLimit, {
  organizationId,
  cost: calculatedCost
});
```

**Order matters:** rate check → budget check → AI calls → increment counters

---

## New Cron Jobs

**IMPORTANT:** Edit existing `packages/backend/convex/crons.ts` (don't create new file)

### 1. updateOrgDailySpend
**Schedule:** Daily at 00:00 UTC
**Purpose:** Reset daily spend counters
```typescript
crons.daily(
  'update-org-daily-spend',
  { hourUTC: 0, minuteUTC: 0 },
  internal.crons.updateOrgDailySpend
);
```

### 2. checkCostAlerts
**Schedule:** Every 10 minutes
**Purpose:** Monitor budgets and create alerts
```typescript
crons.interval(
  'check-cost-alerts',
  { minutes: 10 },
  internal.crons.checkCostAlerts
);
```

**Alert deduplication:** No duplicate alerts of same type/severity for same org within 60 minutes.

### 3. resetRateLimitWindows
**Schedule:** Every hour at :00
**Purpose:** Reset expired rate limit windows
```typescript
crons.hourly(
  'reset-rate-limit-windows',
  { minuteUTC: 0 },
  internal.crons.resetRateLimitWindows
);
```

---

## Testing Checklist

### Budget Enforcement
- [ ] Set org budget to $5/day
- [ ] Generate summaries until $5 spent
- [ ] Verify next AI call blocked with helpful error
- [ ] Verify error includes reset time

### Alerting
- [ ] Set org budget to $10/day with 80% threshold
- [ ] Generate summaries until $8 spent (80%)
- [ ] Verify warning alert in platformCostAlerts
- [ ] Continue to $10, verify critical alert
- [ ] Verify no duplicate alerts within 60 minutes

### Daily Reset
- [ ] Manually trigger updateOrgDailySpend cron
- [ ] Verify currentDailySpend = 0
- [ ] Verify lastResetDate = today

### Rate Limiting
- [ ] Set org rate limit to 10 messages/hour
- [ ] Generate 10 summaries
- [ ] Verify 11th blocked with error message
- [ ] Verify error includes resetAt time

### Window Reset
- [ ] Hit rate limit
- [ ] Manually trigger resetRateLimitWindows
- [ ] Verify currentCount = 0
- [ ] Verify new summaries allowed

### Platform Defaults
- [ ] Verify platform-wide limits exist (1000/hour, 10000/day)
- [ ] Verify limits apply to org without specific limits
- [ ] Set org-specific limit, verify overrides platform default

---

## Performance Targets

- **Budget check:** < 10ms (simple index query)
- **Rate limit check:** < 20ms (2-3 index queries)
- **Cron efficiency:** checkCostAlerts only queries orgs with isEnabled=true

---

## Rollback Plan

If issues arise:
- **Budget checks:** Set `isEnabled=false` on all orgCostBudgets records
- **Rate limits:** Set `limitValue=999999` (effectively unlimited)

---

## Dependencies Verified ✅

- ✅ Phase 5 Phases 1-4 merged to main (PR #331)
- ✅ `aiUsageLog` table exists with logUsage mutation
- ✅ `processVoiceNoteInsight` action exists
- ✅ `crons.ts` exists with 3 existing cron jobs
- ✅ TypeScript compiles
- ✅ Linting passes

---

## Success Criteria

Phase 6.1 complete when:
- ✅ All 11 user stories marked `passes: true`
- ✅ All acceptance criteria met
- ✅ TypeScript type checks pass
- ✅ Biome linting passes
- ✅ Convex codegen succeeds
- ✅ All tests pass (see checklist above)
- ✅ Budget enforcement prevents overspending
- ✅ Rate limits block runaway costs
- ✅ Alerts fire at correct thresholds
- ✅ Cron jobs run successfully

---

## Next Steps

1. Start Ralph monitoring agents
2. Run Ralph with Phase 6.1 PRD
3. Complete all 11 stories
4. Test thoroughly
5. Create PR to main
6. Merge and proceed to Phase 6.2

**Ready to start Ralph on Phase 6.1!** 🚀
