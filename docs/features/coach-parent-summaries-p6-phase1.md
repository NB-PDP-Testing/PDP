# Coach-Parent AI Summaries - Phase 6.1 (Cost Controls)

> Auto-generated documentation - Last updated: 2026-01-25 12:28

## Status

- **Branch**: `ralph/coach-parent-summaries-p6-phase1`
- **Progress**: 11 / 11 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Add orgCostBudgets table to schema

As a platform admin, I set cost budgets per organization.

**Acceptance Criteria:**
- Add orgCostBudgets table to schema.ts: organizationId (string), dailyBudgetUsd (number), monthlyBudgetUsd (number), alertThresholdPercent (number, default 80), isEnabled (boolean)
- Add fields: currentDailySpend (number), currentMonthlySpend (number), lastResetDate (string YYYY-MM-DD), lastResetMonth (string YYYY-MM)
- Add index: by_org (organizationId)
- Run: npx -w packages/backend convex codegen
- Typecheck passes

### US-002: Add platformCostAlerts table to schema

As a platform admin, cost alerts are logged and tracked.

**Acceptance Criteria:**
- Add platformCostAlerts table to schema.ts: alertType (v.union: 'org_daily_threshold' | 'org_daily_exceeded' | 'org_monthly_threshold' | 'org_monthly_exceeded' | 'platform_spike'), organizationId (optional string), severity (v.union: 'warning' | 'critical'), message (string), triggerValue (number), thresholdValue (number), timestamp (number), acknowledged (boolean), acknowledgedBy (optional string), acknowledgedAt (optional number)
- Add indexes: by_timestamp (timestamp), by_org (organizationId), by_severity_ack (severity, acknowledged)
- Run: npx -w packages/backend convex codegen
- Typecheck passes

### US-003: Implement checkOrgCostBudget query

As the system, I check if org is within budget before AI calls.

**Acceptance Criteria:**
- Create models/orgCostBudgets.ts
- Add checkOrgCostBudget query with args: organizationId
- Fetch budget record via by_org index
- If no budget set: return { withinBudget: true, reason: 'no_budget_set' }
- Check currentDailySpend < dailyBudgetUsd and currentMonthlySpend < monthlyBudgetUsd
- If exceeded: return { withinBudget: false, reason: 'daily_exceeded' or 'monthly_exceeded', remaining: 0 }
- If within budget: return { withinBudget: true, dailyRemaining, monthlyRemaining }
- Returns: v.object({ withinBudget: v.boolean(), reason: v.string(), dailyRemaining: v.optional(v.number()), monthlyRemaining: v.optional(v.number()) })
- Typecheck passes

### US-004: Integrate budget check into AI pipeline

As the system, budget checks prevent overspending.

**Acceptance Criteria:**
- Edit processVoiceNoteInsight action in actions/coachParentSummaries.ts
- FIRST STEP (before any AI calls): Run const budgetCheck = await ctx.runQuery(api.models.orgCostBudgets.checkOrgCostBudget, { organizationId })
- If !budgetCheck.withinBudget: log warning, call logBudgetExceededEvent mutation, return early WITHOUT calling classifyInsightSensitivity or generateParentSummary (skip all AI)
- Create internal mutation: logBudgetExceededEvent with args: organizationId, reason
- Call logBudgetExceededEvent so we track how often this happens (analytics)
- Return helpful error message with resetAt time so coach knows when budget resets
- Typecheck passes

### US-005: Create updateOrgDailySpend scheduled function

As the system, daily spend resets automatically at midnight UTC.

**Acceptance Criteria:**
- Edit packages/backend/convex/crons.ts (file already exists with 3 existing cron jobs)
- Add scheduled function: updateOrgDailySpend that runs daily at 00:00 UTC
- Query all orgCostBudgets records
- For each: if lastResetDate !== today's date (YYYY-MM-DD format), set currentDailySpend = 0, lastResetDate = today
- Use cron.daily('update-org-daily-spend', { hourUTC: 0, minuteUTC: 0 }, internal.crons.updateOrgDailySpend)
- Typecheck passes

### US-006: Create checkCostAlerts scheduled function

As a platform admin, I'm alerted when costs exceed thresholds.

**Acceptance Criteria:**
- Edit packages/backend/convex/crons.ts
- Add scheduled function: checkCostAlerts that runs every 10 minutes
- Query orgCostBudgets where isEnabled === true
- For each org: calculate dailyPercentUsed = (currentDailySpend / dailyBudgetUsd) * 100
- If dailyPercentUsed >= alertThresholdPercent and no recent warning: insert platformCostAlerts record with type 'org_daily_threshold', severity 'warning'
- If dailyPercentUsed >= 100 and no recent critical alert: insert platformCostAlerts with type 'org_daily_exceeded', severity 'critical'
- Repeat for monthlyPercentUsed
- Use cron.interval('check-cost-alerts', { minutes: 10 }, internal.crons.checkCostAlerts)
- IMPORTANT: 'Recent alert' check = no alert of same type/severity for this org in last 60 minutes (prevents spam)
- Typecheck passes

### US-007: Add rateLimits table to schema

As a developer, I need rate limiting infrastructure.

**Acceptance Criteria:**
- Add rateLimits table to schema.ts: scope (v.union: 'platform' | 'organization'), scopeId (string, 'platform' for global), limitType (v.union: 'messages_per_hour' | 'messages_per_day' | 'cost_per_hour' | 'cost_per_day'), limitValue (number), currentCount (number), currentCost (number), windowStart (number), windowEnd (number), lastResetAt (number)
- Add indexes: by_scope_type (scope, scopeId, limitType)
- Run: npx -w packages/backend convex codegen
- Typecheck passes

### US-008: Implement checkRateLimit query

As the system, I check rate limits before AI calls.

**Acceptance Criteria:**
- Create models/rateLimits.ts
- Add checkRateLimit query with args: organizationId
- Check platform-wide limits first: query scope='platform', limitType='messages_per_hour'
- Check org-specific limits: query scope='organization', scopeId=organizationId
- For each active limit: if currentCount >= limitValue or currentCost >= limitValue, return { allowed: false, reason: 'rate_limit_exceeded', resetAt: windowEnd }
- If all limits OK: return { allowed: true, remainingMessages, resetAt }
- Returns: v.object({ allowed: v.boolean(), reason: v.optional(v.string()), resetAt: v.optional(v.number()), remainingMessages: v.optional(v.number()) })
- Typecheck passes

### US-009: Integrate rate limiting into AI pipeline

As the system, rate limits prevent abuse.

**Acceptance Criteria:**
- Edit processVoiceNoteInsight action in actions/coachParentSummaries.ts
- BEFORE budget check (US-004), add rate limit check: const rateCheck = await ctx.runQuery(api.models.rateLimits.checkRateLimit, { organizationId })
- If !rateCheck.allowed: log warning, return early with error explaining rate limit and resetAt time
- After successful AI call (both classify and generate complete), increment rate limit counter: ctx.runMutation(internal.models.rateLimits.incrementRateLimit, { organizationId, cost: calculatedCost })
- Typecheck passes

### US-010: Create resetRateLimitWindows scheduled function

As the system, rate limit windows reset automatically.

**Acceptance Criteria:**
- Edit packages/backend/convex/crons.ts
- Add scheduled function: resetRateLimitWindows that runs every hour at :00
- Query rateLimits where windowEnd <= Date.now() (window has expired)
- For each expired limit: set currentCount = 0, currentCost = 0, windowStart = Date.now(), windowEnd = Date.now() + (window duration based on limitType)
- hourly limits: windowEnd = now + 1 hour, daily limits: windowEnd = now + 24 hours
- Use cron.hourly('reset-rate-limit-windows', { minuteUTC: 0 }, internal.crons.resetRateLimitWindows)
- Typecheck passes

### US-011: Add default platform rate limits

As a platform admin, sensible defaults protect the platform.

**Acceptance Criteria:**
- Create migration script or seed data: packages/backend/convex/seed/defaultRateLimits.ts
- Insert platform-wide limits: messages_per_hour = 1000, messages_per_day = 10000, cost_per_hour = $50, cost_per_day = $500
- These are failsafes - should never hit in normal operation
- Document in comments: adjust based on actual platform usage patterns
- Typecheck passes


## Implementation Notes

### Key Patterns & Learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
