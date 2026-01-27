# Coach-Parent AI Summaries - Phase 6 Testing Guide
# Monitoring & Scale (Cost Controls, Graceful Degradation, Admin Dashboard, Performance)

**Feature**: Phase 6 - Monitoring, Cost Controls, and Scale Infrastructure
**Sub-Phases**: 6.1 (Cost Controls), 6.2 (Graceful Degradation), 6.3 (Admin Dashboard), 6.4 (Performance Optimization)
**Version**: 1.0
**Last Updated**: January 27, 2026

---

## Overview

Phase 6 focuses on production-grade monitoring, cost controls, and scale infrastructure for the Coach-Parent AI Summaries system. This phase ensures the platform can operate safely and efficiently at scale with proactive cost management, graceful failure handling, administrative oversight, and performance optimization.

**Phase 6 Sub-Phases**:

### Phase 6.1: Cost Controls
Per-organization budgets, rate limiting, automated alerting, and budget enforcement to prevent runaway costs.

### Phase 6.2: Graceful Degradation
Circuit breaker pattern for AI service failures, fallback templates, and user-facing degradation notices.

### Phase 6.3: Admin Dashboard
Platform staff dashboard at `/platform/messaging` with cost analytics, rate limit controls, service health monitoring, and emergency kill switch.

### Phase 6.4: Performance Optimization
Pre-aggregated daily AI usage stats for 100x faster dashboard queries at scale.

---

## Prerequisites

### Test Accounts

| Role | Email | Password | Access | Notes |
|------|-------|----------|--------|-------|
| **Platform Staff** | `neil.B@blablablak.com` | `lien1979` | `/platform/*` routes | Admin dashboard access |
| **Coach (L2+)** | (test user) | varies | Coach dashboard | For testing cost enforcement |
| **Org Admin** | (test user) | varies | Org settings | For budget configuration |

### Required Setup

1. Dev server running on http://localhost:3000
2. Convex backend deployed with Phase 5 (Phases 1-4) merged
3. Anthropic API key configured (`ANTHROPIC_API_KEY` in Convex environment)
4. Platform staff account with `isPlatformStaff = true`
5. At least 2 test organizations for multi-org testing
6. aiUsageLog table populated with test data (from Phase 5.3)

### Test Data Requirements

- **Organizations**: At least 3 test orgs with varying usage patterns
- **AI Usage Logs**: At least 50 AI call logs for cost analytics
- **Trust Levels**: Coaches at various trust levels for usage pattern testing
- **Voice Notes**: Ability to generate new summaries on demand

---

## Phase 6.1: Cost Controls

### Purpose
Implement per-organization budgets, rate limiting, and automated cost monitoring to prevent runaway costs.

---

### TC-P61-001: orgCostBudgets Table Schema
**Test**: Verify cost budgets table exists with correct fields
**Steps**:
1. Open Convex dashboard
2. Navigate to Data → Tables
3. Find `orgCostBudgets` table

**Expected**:
- ✅ Table exists
- ✅ Fields present:
  - `organizationId` (string)
  - `dailyBudgetUsd` (number)
  - `monthlyBudgetUsd` (number)
  - `alertThresholdPercent` (number, default 80)
  - `isEnabled` (boolean)
  - `currentDailySpend` (number)
  - `currentMonthlySpend` (number)
  - `lastResetDate` (string YYYY-MM-DD)
  - `lastResetMonth` (string YYYY-MM)
- ✅ Index: `by_org` on `organizationId`

**Pass/Fail**: _______

---

### TC-P61-002: platformCostAlerts Table Schema
**Test**: Verify cost alerts audit trail table
**Steps**:
1. Check Convex dashboard for `platformCostAlerts` table

**Expected**:
- ✅ Table exists
- ✅ Fields:
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
- ✅ Indexes: `by_timestamp`, `by_org`, `by_severity_ack`

**Pass/Fail**: _______

---

### TC-P61-003: rateLimits Table Schema
**Test**: Verify rate limiting infrastructure table
**Steps**:
1. Check Convex dashboard for `rateLimits` table

**Expected**:
- ✅ Table exists
- ✅ Fields:
  - `scope` (union: 'platform' | 'organization')
  - `scopeId` (string, 'platform' for global)
  - `limitType` (union: 'messages_per_hour' | 'messages_per_day' | 'cost_per_hour' | 'cost_per_day')
  - `limitValue` (number)
  - `currentCount` (number)
  - `currentCost` (number)
  - `windowStart` (number)
  - `windowEnd` (number)
  - `lastResetAt` (number)
- ✅ Index: `by_scope_type` on `(scope, scopeId, limitType)`

**Pass/Fail**: _______

---

### TC-P61-004: Budget Check - No Budget Set
**Test**: System allows AI calls when no budget configured
**Steps**:
1. Select test org with no `orgCostBudgets` record
2. Create voice note with player insight
3. Wait for AI summary generation
4. Check logs/console

**Expected**:
- ✅ `checkOrgCostBudget` returns `{ withinBudget: true, reason: 'no_budget_set' }`
- ✅ AI summary generates normally
- ✅ No budget errors

**Pass/Fail**: _______

---

### TC-P61-005: Budget Check - Within Budget
**Test**: AI calls proceed when under budget
**Steps**:
1. Create test org budget: `dailyBudgetUsd = 10.00`, `currentDailySpend = 2.00`
2. Generate AI summary
3. Check budget check result

**Expected**:
- ✅ `checkOrgCostBudget` returns `{ withinBudget: true, dailyRemaining: 8.00, monthlyRemaining: [value] }`
- ✅ AI calls proceed normally
- ✅ `currentDailySpend` increments after AI call

**Pass/Fail**: _______

---

### TC-P61-006: Budget Enforcement - Daily Limit Exceeded
**Test**: AI calls blocked when daily budget exceeded
**Steps**:
1. Create org budget: `dailyBudgetUsd = 5.00`
2. Manually set `currentDailySpend = 5.00` (at limit)
3. Attempt to generate AI summary
4. Check behavior

**Expected**:
- ✅ `checkOrgCostBudget` returns `{ withinBudget: false, reason: 'daily_exceeded', remaining: 0 }`
- ✅ `processVoiceNoteInsight` action returns early (skips AI calls)
- ✅ Console log: "Budget exceeded: daily_exceeded"
- ✅ `logBudgetExceededEvent` mutation called
- ✅ Error message to user includes reset time: "Daily budget exceeded. Resets at midnight UTC."
- ✅ No Anthropic API calls made

**Pass/Fail**: _______

---

### TC-P61-007: Budget Enforcement - Monthly Limit Exceeded
**Test**: AI calls blocked when monthly budget exceeded
**Steps**:
1. Create org budget: `monthlyBudgetUsd = 50.00`
2. Set `currentMonthlySpend = 50.00`
3. Attempt to generate summary

**Expected**:
- ✅ Budget check fails with `reason: 'monthly_exceeded'`
- ✅ AI calls skipped
- ✅ Error message mentions month-end reset

**Pass/Fail**: _______

---

### TC-P61-008: Budget Alert - 80% Threshold Warning
**Test**: Warning alert triggers at 80% of budget
**Steps**:
1. Create org budget: `dailyBudgetUsd = 10.00`, `alertThresholdPercent = 80`
2. Set `currentDailySpend = 8.00` (80%)
3. Wait for `checkCostAlerts` cron (or manually trigger)
4. Check `platformCostAlerts` table

**Expected**:
- ✅ Alert record created:
  - `alertType: 'org_daily_threshold'`
  - `severity: 'warning'`
  - `triggerValue: 8.00`
  - `thresholdValue: 10.00`
  - `message`: "Organization [name] has reached 80% of daily budget ($8.00 / $10.00)"
- ✅ `acknowledged: false`
- ✅ No duplicate alerts within 60 minutes (deduplication)

**Pass/Fail**: _______

---

### TC-P61-009: Budget Alert - 100% Critical Alert
**Test**: Critical alert triggers when budget fully consumed
**Steps**:
1. Org reaches 100% of daily budget
2. Wait for alert cron
3. Check alerts table

**Expected**:
- ✅ Alert created with:
  - `alertType: 'org_daily_exceeded'`
  - `severity: 'critical'`
  - `message`: "Organization [name] has EXCEEDED daily budget"
- ✅ Alert visible in admin dashboard

**Pass/Fail**: _______

---

### TC-P61-010: Daily Budget Reset Cron
**Test**: Daily spend resets at midnight UTC
**Steps**:
1. Set org `currentDailySpend = 5.00`, `lastResetDate = '2026-01-26'` (yesterday)
2. Manually trigger `updateOrgDailySpend` cron (or wait for scheduled run at 00:00 UTC)
3. Check org budget record

**Expected**:
- ✅ `currentDailySpend` reset to `0`
- ✅ `lastResetDate` updated to today's date (YYYY-MM-DD format)
- ✅ `currentMonthlySpend` unchanged (monthly reset separate)
- ✅ Cron runs daily at 00:00 UTC

**Pass/Fail**: _______

---

### TC-P61-011: Monthly Budget Reset
**Test**: Monthly spend resets at month start
**Steps**:
1. Set `currentMonthlySpend = 100.00`, `lastResetMonth = '2026-01'` (last month)
2. Trigger daily reset cron on first day of new month
3. Check budget record

**Expected**:
- ✅ `currentMonthlySpend` reset to `0`
- ✅ `lastResetMonth` updated to current month (YYYY-MM format)

**Pass/Fail**: _______

---

### TC-P61-012: Rate Limit Check - No Limits Set
**Test**: System allows AI calls when no rate limits configured
**Steps**:
1. Query `rateLimits` table (ensure no limits for test org)
2. Generate AI summary
3. Check rate limit check result

**Expected**:
- ✅ `checkRateLimit` returns `{ allowed: true }`
- ✅ AI calls proceed normally

**Pass/Fail**: _______

---

### TC-P61-013: Rate Limit - Messages Per Hour
**Test**: Rate limit blocks after hourly message limit reached
**Steps**:
1. Create rate limit: `scope: 'organization'`, `scopeId: [orgId]`, `limitType: 'messages_per_hour'`, `limitValue: 10`
2. Set `currentCount: 10` (at limit)
3. Attempt to generate summary

**Expected**:
- ✅ `checkRateLimit` returns `{ allowed: false, reason: 'rate_limit_exceeded', resetAt: [timestamp] }`
- ✅ AI call blocked before budget check
- ✅ Error message: "Rate limit exceeded. Resets at [time]."
- ✅ No AI API calls made

**Pass/Fail**: _______

---

### TC-P61-014: Rate Limit - Messages Per Day
**Test**: Daily message limit enforcement
**Steps**:
1. Create rate limit: `limitType: 'messages_per_day'`, `limitValue: 100`
2. Set `currentCount: 100`
3. Attempt AI call

**Expected**:
- ✅ Rate limit blocks call
- ✅ Error includes 24-hour reset time

**Pass/Fail**: _______

---

### TC-P61-015: Rate Limit Counter Increment
**Test**: Rate limit counter increments after successful AI call
**Steps**:
1. Set rate limit with `currentCount: 5`, `limitValue: 10`
2. Generate AI summary successfully
3. Check rate limit record

**Expected**:
- ✅ `currentCount` increments to `6`
- ✅ `currentCost` increments by summary generation cost
- ✅ Increment happens AFTER AI call completes (not before)

**Pass/Fail**: _______

---

### TC-P61-016: Rate Limit Window Reset Cron
**Test**: Expired rate limit windows reset automatically
**Steps**:
1. Create rate limit with `windowEnd` in the past (expired)
2. Set `currentCount: 10`
3. Manually trigger `resetRateLimitWindows` cron (runs hourly at :00)
4. Check rate limit record

**Expected**:
- ✅ `currentCount` reset to `0`
- ✅ `currentCost` reset to `0`
- ✅ `windowStart` set to current time
- ✅ `windowEnd` set to current time + duration (1 hour for hourly, 24 hours for daily)
- ✅ Rolling window maintained

**Pass/Fail**: _______

---

### TC-P61-017: Platform-Wide Rate Limits
**Test**: Global rate limits apply to all orgs
**Steps**:
1. Verify platform rate limit exists: `scope: 'platform'`, `scopeId: 'platform'`
2. Check default values:
   - `messages_per_hour: 1000`
   - `messages_per_day: 10000`
   - `cost_per_hour: 50.00`
   - `cost_per_day: 500.00`
3. Simulate platform-wide limit hit

**Expected**:
- ✅ Platform limits act as failsafe
- ✅ Checked BEFORE org-specific limits
- ✅ Block all orgs if platform limit exceeded

**Pass/Fail**: _______

---

### TC-P61-018: Org-Specific Rate Limit Override
**Test**: Per-org limits override platform defaults
**Steps**:
1. Platform limit: 1000 messages/hour
2. Create org-specific limit: 50 messages/hour
3. Org hits 50 messages

**Expected**:
- ✅ Org blocked at 50 (org limit enforced)
- ✅ Other orgs can still use remaining platform capacity
- ✅ Org-specific limits take precedence

**Pass/Fail**: _______

---

### TC-P61-019: Cost Alert Deduplication
**Test**: No duplicate alerts within 60 minutes
**Steps**:
1. Trigger 80% budget alert
2. Wait 30 minutes
3. Trigger alert cron again (org still at 80%)

**Expected**:
- ✅ Alert created first time
- ✅ No duplicate alert on second cron run
- ✅ Deduplication logic: no alert of same type/severity/org within 60 minutes
- ✅ After 60 minutes, new alert can be created if issue persists

**Pass/Fail**: _______

---

### TC-P61-020: checkCostAlerts Cron Efficiency
**Test**: Alert cron only queries enabled budgets
**Steps**:
1. Create 3 org budgets: 2 with `isEnabled: true`, 1 with `isEnabled: false`
2. Trigger `checkCostAlerts` cron
3. Check which orgs are checked

**Expected**:
- ✅ Cron runs every 10 minutes
- ✅ Only queries orgs with `isEnabled === true`
- ✅ Disabled orgs skipped (performance optimization)
- ✅ Execution completes in < 5 seconds

**Pass/Fail**: _______

---

### TC-P61-021: Defense in Depth - Order of Checks
**Test**: Verify execution order: rate limit → budget → AI
**Steps**:
1. Set up org with both rate limit (at limit) and budget (under limit)
2. Attempt AI call
3. Check which check fails first

**Expected**:
- ✅ Order in `processVoiceNoteInsight`:
  1. Rate limit check FIRST
  2. Budget check SECOND
  3. AI calls THIRD (only if both pass)
- ✅ If rate limit fails, budget check skipped
- ✅ Fail fast: no wasted processing

**Pass/Fail**: _______

---

### TC-P61-022: Performance - Budget Check Latency
**Test**: Budget check adds minimal latency
**Steps**:
1. Measure AI call time without budget check (baseline)
2. Enable budget check, measure again
3. Calculate delta

**Expected**:
- ✅ Budget check latency < 10ms (simple index query)
- ✅ Total AI call time increase < 20ms
- ✅ No noticeable impact on user experience

**Pass/Fail**: _______

---

### TC-P61-023: Performance - Rate Limit Check Latency
**Test**: Rate limit check efficiency
**Steps**:
1. Measure rate limit check time
2. Test with multiple concurrent checks

**Expected**:
- ✅ Single check < 20ms (2-3 index queries)
- ✅ No performance degradation under load

**Pass/Fail**: _______

---

## Phase 6.2: Graceful Degradation

### Purpose
Implement circuit breaker pattern to handle AI service failures gracefully with fallback templates and user transparency.

---

### TC-P62-001: aiServiceHealth Table Schema
**Test**: Verify service health tracking table
**Steps**:
1. Check Convex dashboard for `aiServiceHealth` table

**Expected**:
- ✅ Table exists (singleton pattern - only one record)
- ✅ Fields:
  - `service` (literal: 'anthropic')
  - `status` (union: 'healthy' | 'degraded' | 'down')
  - `lastSuccessAt` (number)
  - `lastFailureAt` (number)
  - `recentFailureCount` (number)
  - `failureWindow` (number, default 5 minutes)
  - `circuitBreakerState` (union: 'closed' | 'open' | 'half_open')
  - `lastCheckedAt` (number)
- ✅ No indexes needed (singleton)

**Pass/Fail**: _______

---

### TC-P62-002: Circuit Breaker - Initial State
**Test**: System starts in healthy state
**Steps**:
1. Query `aiServiceHealth` on fresh deployment
2. Check initial values

**Expected**:
- ✅ `status: 'healthy'`
- ✅ `circuitBreakerState: 'closed'`
- ✅ `recentFailureCount: 0`

**Pass/Fail**: _______

---

### TC-P62-003: Circuit Breaker - Failure Detection
**Test**: Circuit opens after 5 consecutive failures
**Steps**:
1. Simulate Anthropic API failure (invalid API key or mock)
2. Make 5 consecutive AI summary generation attempts
3. Check service health after each

**Expected**:
- ✅ After 1st failure: `recentFailureCount: 1`, state: 'closed'
- ✅ After 2nd-4th: count increments, state still 'closed'
- ✅ After 5th failure: `circuitBreakerState: 'open'`, `status: 'down'`
- ✅ Console log: "Circuit breaker opened after 5 failures"

**Pass/Fail**: _______

---

### TC-P62-004: Circuit Breaker - Open State Blocks Calls
**Test**: No AI calls made when circuit open
**Steps**:
1. Circuit in 'open' state (from previous test)
2. Attempt to generate AI summary
3. Check behavior

**Expected**:
- ✅ `shouldCallAPI(serviceHealth)` returns `false`
- ✅ No Anthropic API call attempted
- ✅ Fallback response used immediately
- ✅ Console log: "Circuit breaker open, using fallback"

**Pass/Fail**: _______

---

### TC-P62-005: Fallback Template - Generate Summary
**Test**: Fallback template used when AI unavailable
**Steps**:
1. Circuit open (AI unavailable)
2. Generate summary
3. Check result

**Expected**:
- ✅ Summary created with template content:
  - "Your coach shared an update about [player]. View details in passport."
- ✅ `isFallback: true` flag set
- ✅ `confidenceScore: 0.5` (neutral)
- ✅ Parent still receives notification (graceful degradation, not failure)

**Pass/Fail**: _______

---

### TC-P62-006: Fallback Template - Classify Sensitivity
**Test**: Fallback classification when AI down
**Steps**:
1. Circuit open
2. Attempt to classify insight sensitivity
3. Check result

**Expected**:
- ✅ Returns `{ category: 'normal', confidence: 0.5, isFallback: true }`
- ✅ Safe default (always 'normal' so no accidental auto-approval)
- ✅ System continues to function

**Pass/Fail**: _______

---

### TC-P62-007: Circuit Breaker - Half-Open State
**Test**: Circuit allows test call after cooldown
**Steps**:
1. Circuit opened (5 failures)
2. Wait 1 minute (cooldown period)
3. Check circuit state

**Expected**:
- ✅ After 1 minute: `circuitBreakerState: 'half_open'`
- ✅ `shouldCallAPI` returns `true` (allow one test call)
- ✅ Console log: "Circuit breaker half-open, attempting test call"

**Pass/Fail**: _______

---

### TC-P62-008: Circuit Breaker - Recovery on Success
**Test**: Successful call closes circuit
**Steps**:
1. Circuit in 'half_open' state
2. Restore Anthropic API (valid key)
3. Make successful AI call
4. Check circuit state

**Expected**:
- ✅ AI call succeeds
- ✅ `recordAPIResult(true)` called
- ✅ `circuitBreakerState: 'closed'`
- ✅ `status: 'healthy'`
- ✅ `recentFailureCount: 0` (reset)
- ✅ `lastSuccessAt` updated
- ✅ Normal operations resume

**Pass/Fail**: _______

---

### TC-P62-009: Circuit Breaker - Half-Open Failure Reopens
**Test**: Circuit reopens if test call fails
**Steps**:
1. Circuit in 'half_open'
2. Test call fails (API still down)
3. Check state

**Expected**:
- ✅ `circuitBreakerState: 'open'` (back to open)
- ✅ Wait another 1 minute before next test
- ✅ Console log: "Test call failed, reopening circuit"

**Pass/Fail**: _______

---

### TC-P62-010: Degradation Banner Component
**Test**: Verify banner UI component exists
**Steps**:
1. Check for `components/coach/degradation-banner.tsx`
2. Review props and styling

**Expected**:
- ✅ Component exists
- ✅ Props: `degradationType: 'ai_fallback' | 'rate_limited' | 'budget_exceeded'`
- ✅ Uses Alert component from shadcn/ui
- ✅ Warning icon and amber styling
- ✅ Different messages per degradation type

**Pass/Fail**: _______

---

### TC-P62-011: Degradation Banner - AI Fallback
**Test**: Banner shows when AI unavailable
**Steps**:
1. Open circuit (simulate AI failure)
2. Navigate to voice notes dashboard as coach
3. Check for banner

**Expected**:
- ✅ Banner visible below header, above tabs
- ✅ Message: "AI assistance temporarily unavailable. Using simplified summaries. Service typically recovers within 5 minutes."
- ✅ Warning icon displayed
- ✅ Amber/yellow background

**Pass/Fail**: _______

---

### TC-P62-012: Degradation Banner - Rate Limited
**Test**: Banner for rate limit hit
**Steps**:
1. Hit rate limit for org
2. View dashboard

**Expected**:
- ✅ Banner shows: "Rate limit reached. AI summaries paused until [reset time]."
- ✅ Contextual message

**Pass/Fail**: _______

---

### TC-P62-013: Degradation Banner - Budget Exceeded
**Test**: Banner for budget exhaustion
**Steps**:
1. Exceed daily budget
2. View dashboard

**Expected**:
- ✅ Banner shows: "Daily AI budget reached. Resets at midnight UTC."
- ✅ Clear explanation for coach

**Pass/Fail**: _______

---

### TC-P62-014: Degradation Banner - Real-Time Updates
**Test**: Banner appears/disappears automatically
**Steps**:
1. Open dashboard in browser (tab 1)
2. In separate tab/tool, open circuit (AI down)
3. Watch tab 1 (no page refresh)

**Expected**:
- ✅ Banner appears within 30 seconds (Convex real-time query)
- ✅ No manual refresh needed
- ✅ When service restores, banner disappears automatically

**Pass/Fail**: _______

---

### TC-P62-015: getAIServiceHealth Query
**Test**: Query returns current service status
**Steps**:
1. Create/verify `getAIServiceHealth` query in `models/aiServiceHealth.ts`
2. Call from frontend
3. Check response

**Expected**:
- ✅ Query exists and returns service health singleton
- ✅ Returns all fields: status, circuitBreakerState, lastFailureAt, etc.
- ✅ Real-time subscription works (updates on state change)

**Pass/Fail**: _______

---

### TC-P62-016: Coach Settings Dialog Integration (Optional)
**Test**: Degradation indicator in settings
**Steps**:
1. Open coach settings dialog (Profile → Settings)
2. Check for AI status indicator

**Expected**:
- ✅ OPTIONAL: Small warning badge if AI degraded
- ✅ Tooltip explains issue
- ✅ Link to voice notes dashboard for details
- ✅ (If not implemented, this is optional enhancement)

**Pass/Fail**: _______

---

### TC-P62-017: Try-Catch Error Handling
**Test**: All AI actions wrapped in error handling
**Steps**:
1. Review `generateParentSummary` action code
2. Review `classifyInsightSensitivity` action code

**Expected**:
- ✅ Both actions have try-catch around Anthropic API calls
- ✅ On success: `recordAPIResult(true)`
- ✅ On error: `recordAPIResult(false)` and return fallback
- ✅ No unhandled errors reach user

**Pass/Fail**: _______

---

### TC-P62-018: Zero User Errors
**Test**: No error messages shown to users when AI down
**Steps**:
1. Simulate complete Anthropic API outage
2. Coach generates summary
3. Parent views summary

**Expected**:
- ✅ Coach sees degradation banner (transparency)
- ✅ Coach can still approve/suppress (workflow continues)
- ✅ Parent receives notification with template message
- ✅ No "Error 500" or technical errors visible
- ✅ Graceful service degradation, not failure

**Pass/Fail**: _______

---

### TC-P62-019: Failure Window Tracking
**Test**: Only recent failures count toward circuit opening
**Steps**:
1. Failure 1 at time T
2. Failure 2 at T+1 min
3. Wait 5 minutes (outside failure window)
4. Failure 3

**Expected**:
- ✅ `failureWindow: 300000` (5 minutes)
- ✅ Failures outside window don't count toward threshold
- ✅ `recentFailureCount` only includes failures in last 5 minutes
- ✅ Prevents old failures from affecting current health

**Pass/Fail**: _______

---

### TC-P62-020: Performance - Circuit Breaker Check
**Test**: Minimal latency for health check
**Steps**:
1. Measure time for `shouldCallAPI` function
2. Test with circuit closed, open, half-open

**Expected**:
- ✅ Check completes in < 5ms (in-memory state)
- ✅ No database queries needed for check
- ✅ Fast fail when circuit open

**Pass/Fail**: _______

---

### TC-P62-021: Performance - Fallback Generation
**Test**: Template fallback is fast
**Steps**:
1. Measure fallback generation time
2. Compare to normal AI generation (2-3 seconds)

**Expected**:
- ✅ Fallback generation < 10ms (simple string interpolation)
- ✅ 200x faster than AI call
- ✅ User gets immediate response

**Pass/Fail**: _______

---

## Phase 6.3: Admin Dashboard

### Purpose
Platform admin dashboard for cost analytics, rate limit controls, service health monitoring, and emergency controls.

---

### TC-P63-001: Platform Messaging Route Authorization
**Test**: Only platform staff can access `/platform/messaging`
**Steps**:
1. Logout, login as non-platform-staff user (coach or parent)
2. Navigate to `/platform/messaging`
3. Check behavior

**Expected**:
- ✅ Redirect to unauthorized page or 403 error
- ✅ User cannot access route

**Steps** (Platform Staff):
1. Login as platform staff (`isPlatformStaff = true`)
2. Navigate to `/platform/messaging`

**Expected**:
- ✅ Page loads successfully
- ✅ Dashboard visible

**Pass/Fail**: _______

---

### TC-P63-002: Admin Dashboard Page Structure
**Test**: Dashboard layout with tabs
**Steps**:
1. Access `/platform/messaging` as platform staff
2. Check page structure

**Expected**:
- ✅ Page title: "Platform Messaging Admin"
- ✅ Tab navigation visible with tabs:
  - Overview (default active)
  - Cost Analytics
  - Rate Limits
  - Service Health
  - Settings
- ✅ Uses shadcn/ui Tabs components
- ✅ Professional layout

**Pass/Fail**: _______

---

### TC-P63-003: Overview Tab - Key Metrics Cards
**Test**: Overview displays summary metrics
**Steps**:
1. Click "Overview" tab (default)
2. Check displayed cards

**Expected**:
- ✅ Metric cards visible:
  - **Total Messages (24h)**: Count of AI calls in last 24 hours
  - **Total Cost (24h)**: Sum of costs in last 24 hours
  - **Active Orgs**: Count of orgs with AI usage
  - **Service Status**: Healthy / Degraded / Down badge
- ✅ Data accurate (matches aiUsageLog)
- ✅ Color-coded status indicators

**Pass/Fail**: _______

---

### TC-P63-004: Overview Tab - Trust System Health (Enhancement)
**Test**: Trust metrics displayed (optional enhancement)
**Steps**:
1. Check Overview tab for trust system metrics

**Expected** (if implemented):
- ✅ Card: "Trust System Health"
  - X coaches automated (trust level 2+)
  - Y summaries auto-sent (30 days)
- ✅ Card: "AI Learning"
  - Z coaches have personalized thresholds
- ✅ Data pulled from `coachTrustLevels` table
- ✅ (If not implemented, mark N/A)

**Pass/Fail**: _______

---

### TC-P63-005: Overview Tab - Unacknowledged Alerts Panel
**Test**: Recent alerts displayed prominently
**Steps**:
1. Create test alert (trigger 80% budget warning)
2. View Overview tab
3. Check alert panel

**Expected**:
- ✅ "Unacknowledged Alerts" section visible
- ✅ Shows recent alerts with:
  - Alert type (warning/critical badge)
  - Organization name
  - Message
  - Timestamp (relative: "5 minutes ago")
  - "Acknowledge" button
- ✅ Sorted by severity (critical first) then timestamp

**Pass/Fail**: _______

---

### TC-P63-006: Overview Tab - Acknowledge Alert
**Test**: Dismiss alert from panel
**Steps**:
1. Click "Acknowledge" button on alert
2. Check behavior

**Expected**:
- ✅ `acknowledgeCostAlert` mutation called
- ✅ Alert record updated:
  - `acknowledged: true`
  - `acknowledgedBy: [platform staff user ID]`
  - `acknowledgedAt: [timestamp]`
- ✅ Alert removed from panel
- ✅ Toast notification: "Alert acknowledged"

**Pass/Fail**: _______

---

### TC-P63-007: Overview Tab - Recent Activity Feed
**Test**: Activity feed shows recent events
**Steps**:
1. Generate test activity (summary created, auto-approved, budget alert)
2. View Overview tab activity feed

**Expected**:
- ✅ "Recent Activity" section visible
- ✅ Shows last 20 events:
  - Summary created
  - Summary auto-approved
  - Budget alert triggered
  - Rate limit hit
  - Circuit breaker opened/closed
- ✅ Each entry shows: timestamp, org name, event type, description
- ✅ Real-time updates (Convex query)

**Pass/Fail**: _______

---

### TC-P63-008: Overview Tab - Auto-Refresh
**Test**: Dashboard updates without manual refresh
**Steps**:
1. Open Overview tab in browser
2. In separate tab/tool, trigger event (create summary)
3. Watch dashboard (no refresh)

**Expected**:
- ✅ Metrics update within 30 seconds
- ✅ New activity appears in feed
- ✅ Real-time Convex queries working
- ✅ No page refresh needed

**Pass/Fail**: _______

---

### TC-P63-009: Cost Analytics Tab - Summary Cards
**Test**: Cost overview cards display
**Steps**:
1. Click "Cost Analytics" tab
2. Check top section cards

**Expected**:
- ✅ Cards display:
  - **Total Cost (30 days)**: Sum of costs in last 30 days
  - **Cost Today**: Today's costs
  - **Average per Message**: Total cost / message count
  - **Cache Hit Rate**: % of cached tokens / total tokens
- ✅ Values accurate (match aiUsageLog aggregation)
- ✅ Color coding: green if cache hit rate >80%, amber 60-80%, red <60%

**Pass/Fail**: _______

---

### TC-P63-010: Cost Analytics Tab - 30-Day Cost Chart
**Test**: Line chart shows cost trends
**Steps**:
1. View Cost Analytics tab
2. Check for chart visualization

**Expected**:
- ✅ Chart visible showing daily costs over 30 days
- ✅ X-axis: dates
- ✅ Y-axis: cost in USD
- ✅ Uses recharts or simple bars
- ✅ Renders in < 500ms
- ✅ Responsive design

**Pass/Fail**: _______

---

### TC-P63-011: Cost Analytics Tab - Top Orgs Table
**Test**: Table shows highest-cost organizations
**Steps**:
1. View Cost Analytics tab
2. Find "Top Organizations" table

**Expected**:
- ✅ Table displays top 10 orgs by cost (30 days)
- ✅ Columns:
  - Organization name
  - Total cost
  - Message count
  - Cache hit rate
  - Avg cost per message
- ✅ Sortable by column
- ✅ Data accurate

**Pass/Fail**: _______

---

### TC-P63-012: Cost Analytics Tab - Data Accuracy
**Test**: Analytics match raw usage logs
**Steps**:
1. Query `aiUsageLog` directly for test org
2. Calculate sum of costs manually
3. Compare to dashboard display

**Expected**:
- ✅ Dashboard total matches manual calculation
- ✅ Accuracy within 0.1% (rounding acceptable)
- ✅ Cache hit rate formula correct: cachedTokens / (inputTokens + cachedTokens)

**Pass/Fail**: _______

---

### TC-P63-013: Rate Limits Tab - Platform-Wide Limits Display
**Test**: Global limits shown in editable cards
**Steps**:
1. Click "Rate Limits" tab
2. Check platform limits section

**Expected**:
- ✅ Section: "Platform-Wide Limits"
- ✅ Cards display current limits:
  - Messages per hour: [value]
  - Messages per day: [value]
  - Cost per hour: $[value]
  - Cost per day: $[value]
- ✅ Edit button on each card

**Pass/Fail**: _______

---

### TC-P63-014: Rate Limits Tab - Update Platform Limit
**Test**: Admin can change global limits
**Steps**:
1. Click "Edit" on "Messages per hour" card
2. Change value from 1000 to 500
3. Click "Update Platform Limits"
4. Check database

**Expected**:
- ✅ `updatePlatformRateLimit` mutation called
- ✅ `rateLimits` record updated (scope: 'platform', limitType: 'messages_per_hour')
- ✅ `limitValue: 500`
- ✅ Toast notification: "Platform limits updated"
- ✅ New limit enforced immediately

**Pass/Fail**: _______

---

### TC-P63-015: Rate Limits Tab - Violations Table
**Test**: Recent rate limit hits displayed
**Steps**:
1. Trigger rate limit violation (hit org limit)
2. View Rate Limits tab
3. Check violations table

**Expected**:
- ✅ Section: "Recent Rate Limit Violations"
- ✅ Table shows:
  - Organization name
  - Limit type (messages_per_hour, etc.)
  - Time hit
  - Reset time
- ✅ Sorted by most recent first
- ✅ Data from rate limit logs

**Pass/Fail**: _______

---

### TC-P63-016: Rate Limits Tab - Per-Org Overrides Table
**Test**: Display org-specific rate limits
**Steps**:
1. View Rate Limits tab
2. Check "Per-Organization Overrides" section

**Expected**:
- ✅ Table lists orgs with custom limits
- ✅ Shows: org name, limit type, value, actions (edit/delete)
- ✅ Empty state if no overrides: "No custom org limits set"

**Pass/Fail**: _______

---

### TC-P63-017: Rate Limits Tab - Add Org Override
**Test**: Create custom limit for specific org
**Steps**:
1. Click "Add Override" button
2. Dialog opens with form:
   - Select organization (dropdown)
   - Select limit type (messages_per_hour, messages_per_day, etc.)
   - Enter limit value
3. Fill form: Test Org, messages_per_hour, 50
4. Save

**Expected**:
- ✅ `createOrgRateLimit` mutation called
- ✅ New `rateLimits` record created (scope: 'organization', scopeId: [orgId])
- ✅ Override appears in table
- ✅ Org now subject to custom limit (overrides platform default)

**Pass/Fail**: _______

---

### TC-P63-018: Service Health Tab - Status Indicator
**Test**: Large status display shows AI health
**Steps**:
1. Click "Service Health" tab
2. Check main status section

**Expected**:
- ✅ Large status badge visible:
  - Green: "Healthy" if status = 'healthy'
  - Amber: "Degraded" if status = 'degraded'
  - Red: "Down" if status = 'down'
- ✅ Icon matches status
- ✅ Real-time (updates when service state changes)

**Pass/Fail**: _______

---

### TC-P63-019: Service Health Tab - Health Metrics
**Test**: Detailed health data displayed
**Steps**:
1. View Service Health tab
2. Check metrics cards

**Expected**:
- ✅ Cards display:
  - **Last Success**: Timestamp of last successful AI call
  - **Last Failure**: Timestamp of last failure (if any)
  - **Recent Failure Count**: Number of failures in last 5 minutes
  - **Circuit Breaker State**: Closed / Open / Half-Open badge
- ✅ Data from `aiServiceHealth` table

**Pass/Fail**: _______

---

### TC-P63-020: Service Health Tab - Cache Effectiveness (Enhancement)
**Test**: Cache hit rate metrics
**Steps**:
1. Check Service Health tab for cache metrics

**Expected** (if implemented):
- ✅ Card: "Cache Effectiveness"
  - Average cache hit rate (from aiUsageLog)
  - Total tokens cached (last 30 days)
  - Cost savings from caching
- ✅ Data accurate
- ✅ (If not implemented, mark N/A)

**Pass/Fail**: _______

---

### TC-P63-021: Service Health Tab - Per-Org AI Usage (Enhancement)
**Test**: Top AI consumers listed
**Steps**:
1. Check for "Top AI Users" section

**Expected** (if implemented):
- ✅ Table shows top 5 orgs by AI call count
- ✅ Data from `getOrgUsage` query
- ✅ (If not implemented, mark N/A)

**Pass/Fail**: _______

---

### TC-P63-022: Service Health Tab - Recent Errors Table
**Test**: AI errors logged and displayed
**Steps**:
1. Simulate AI error (invalid API call)
2. View Service Health tab
3. Check errors table

**Expected**:
- ✅ "Recent Errors" table visible
- ✅ Shows: timestamp, error type, affected org, resolution status
- ✅ Last 20 errors displayed
- ✅ Sorted by most recent first

**Pass/Fail**: _______

---

### TC-P63-023: Service Health Tab - Force Reset Circuit Breaker
**Test**: Manual circuit breaker reset
**Steps**:
1. Open circuit (simulate AI failure)
2. View Service Health tab
3. Click "Force Reset Circuit Breaker" button
4. Check service health

**Expected**:
- ✅ Button visible when circuit open or half-open
- ✅ Confirmation dialog: "Are you sure? This will immediately restore AI service."
- ✅ On confirm: `forceResetCircuitBreaker` mutation called
- ✅ Circuit state changes to 'closed'
- ✅ Status changes to 'healthy'
- ✅ `recentFailureCount` reset to 0
- ✅ Toast notification: "Circuit breaker reset"
- ✅ Admin override for when you know service is restored

**Pass/Fail**: _______

---

### TC-P63-024: Settings Tab - platformMessagingSettings Table
**Test**: Feature toggle settings table exists
**Steps**:
1. Check Convex dashboard for `platformMessagingSettings` table

**Expected**:
- ✅ Table exists (singleton pattern)
- ✅ Fields:
  - `aiGenerationEnabled` (boolean)
  - `autoApprovalEnabled` (boolean)
  - `parentNotificationsEnabled` (boolean)
  - `emergencyMode` (boolean)
  - `emergencyMessage` (optional string)

**Pass/Fail**: _______

---

### TC-P63-025: Settings Tab - Feature Toggle Switches
**Test**: Individual feature controls
**Steps**:
1. Click "Settings" tab
2. Check toggle switches

**Expected**:
- ✅ Toggle switches for each setting:
  - "AI Generation Enabled" (default: true)
  - "Auto-Approval Enabled" (default: true)
  - "Parent Notifications Enabled" (default: true)
- ✅ Current state reflects database
- ✅ Can toggle on/off

**Pass/Fail**: _______

---

### TC-P63-026: Settings Tab - Disable AI Generation
**Test**: Turn off AI globally
**Steps**:
1. Toggle "AI Generation Enabled" to OFF
2. Save settings
3. Attempt to generate summary as coach
4. Check behavior

**Expected**:
- ✅ `updatePlatformSettings` mutation called
- ✅ `aiGenerationEnabled: false` in database
- ✅ AI summary generation blocked
- ✅ Error message to coach: "AI generation disabled by platform admin"
- ✅ Manual review still works (existing summaries can be approved)

**Pass/Fail**: _______

---

### TC-P63-027: Settings Tab - Disable Auto-Approval
**Test**: Turn off automation globally
**Steps**:
1. Toggle "Auto-Approval Enabled" to OFF
2. Save
3. Level 3 coach creates high-confidence summary
4. Check status

**Expected**:
- ✅ Settings updated
- ✅ Summary status = "pending_review" (NOT "auto_approved")
- ✅ Auto-approval disabled even for high trust coaches
- ✅ Manual review required for all summaries

**Pass/Fail**: _______

---

### TC-P63-028: Settings Tab - Disable Parent Notifications
**Test**: Turn off parent notifications
**Steps**:
1. Toggle "Parent Notifications Enabled" to OFF
2. Coach approves summary
3. Check parent notification

**Expected**:
- ✅ Summary approved normally
- ✅ Parent does NOT receive notification email/push
- ✅ Summary still visible in parent dashboard (when they check)
- ✅ Notification suppressed globally

**Pass/Fail**: _______

---

### TC-P63-029: Settings Tab - Emergency Disable All
**Test**: Master kill switch
**Steps**:
1. Click big red "Emergency Disable All" button
2. Confirmation dialog appears

**Expected**:
- ✅ Dialog shows:
  - Warning message: "This will immediately disable ALL AI features platform-wide. Only use in emergencies."
  - Text field for emergency message (optional)
  - "Confirm Emergency Mode" button (destructive)
  - "Cancel" button
- ✅ Red/critical styling

**Pass/Fail**: _______

---

### TC-P63-030: Settings Tab - Activate Emergency Mode
**Test**: Emergency mode activation
**Steps**:
1. In emergency dialog, enter message: "AI service undergoing maintenance. Will resume shortly."
2. Click "Confirm Emergency Mode"
3. Check settings and behavior

**Expected**:
- ✅ `emergencyMode: true`
- ✅ `aiGenerationEnabled: false`
- ✅ `autoApprovalEnabled: false`
- ✅ `parentNotificationsEnabled: false`
- ✅ `emergencyMessage` stored
- ✅ Toast: "Emergency mode activated"
- ✅ All AI features blocked immediately

**Pass/Fail**: _______

---

### TC-P63-031: Emergency Mode - User-Facing Banner
**Test**: Coaches and parents see emergency message
**Steps**:
1. Emergency mode active
2. Login as coach
3. Navigate to voice notes dashboard

**Expected**:
- ✅ Large banner at top of page
- ✅ Message: "[emergencyMessage]" or default: "AI features temporarily disabled by platform admin."
- ✅ Red/critical styling
- ✅ Visible on all relevant pages

**Steps** (Parent):
1. Login as parent
2. Check dashboard

**Expected**:
- ✅ Similar emergency banner visible
- ✅ Appropriate messaging for parents

**Pass/Fail**: _______

---

### TC-P63-032: Emergency Mode - Deactivation
**Test**: Disable emergency mode
**Steps**:
1. Emergency mode active
2. Return to Settings tab
3. Toggle "Emergency Mode" OFF or click "Disable Emergency Mode" button
4. Check behavior

**Expected**:
- ✅ `emergencyMode: false`
- ✅ Feature toggles return to previous state (or remain off, require manual re-enable)
- ✅ Emergency banner disappears for all users
- ✅ Toast: "Emergency mode deactivated"
- ✅ Log entry records who disabled emergency mode and when

**Pass/Fail**: _______

---

### TC-P63-033: Dashboard Performance - Page Load
**Test**: Full dashboard loads quickly
**Steps**:
1. Open `/platform/messaging` (cold load)
2. Measure load time (browser dev tools)

**Expected**:
- ✅ Full page load < 2 seconds
- ✅ Overview tab data loads first (default tab)
- ✅ Other tabs lazy load when clicked
- ✅ Queries optimized (use indexes)

**Pass/Fail**: _______

---

### TC-P63-034: Dashboard Performance - Tab Switching
**Test**: Tab navigation is instant
**Steps**:
1. Click between tabs (Overview → Cost Analytics → Rate Limits → etc.)
2. Measure switch time

**Expected**:
- ✅ Tab switch < 100ms
- ✅ Data loads smoothly (spinner if needed)
- ✅ No full page reload

**Pass/Fail**: _______

---

### TC-P63-035: Dashboard Performance - Real-Time Updates
**Test**: Live data refresh speed
**Steps**:
1. Dashboard open in browser
2. Trigger event (generate summary)
3. Measure time until dashboard updates

**Expected**:
- ✅ Dashboard reflects change within 500ms
- ✅ Convex real-time queries working efficiently
- ✅ No noticeable lag

**Pass/Fail**: _______

---

### TC-P63-036: Security - Authorization Check
**Test**: All queries check platform staff role
**Steps**:
1. Review query code (getPlatformUsage, getCostAnalytics, etc.)
2. Check for authorization

**Expected**:
- ✅ All `/platform/*` routes check `user.isPlatformStaff`
- ✅ All admin queries verify user role
- ✅ Non-staff users rejected with 403

**Pass/Fail**: _______

---

### TC-P63-037: Security - Audit Logging
**Test**: Admin actions logged
**Steps**:
1. Perform admin action (update rate limit, activate emergency mode)
2. Check for audit log entry

**Expected**:
- ✅ Action logged with:
  - Who: platform staff user ID
  - What: action taken (e.g., "emergency_mode_activated")
  - When: timestamp
  - Details: any relevant context
- ✅ Audit trail for compliance

**Pass/Fail**: _______

---

### TC-P63-038: Security - Cost Data Privacy
**Test**: Cost data only visible to platform staff
**Steps**:
1. Verify org admins CANNOT see platform-wide costs
2. Verify org admins can only see their own org costs (if implemented)

**Expected**:
- ✅ `/platform/messaging` inaccessible to org admins
- ✅ Cost analytics queries check platform staff role
- ✅ Org-level cost views (if any) scoped to org

**Pass/Fail**: _______

---

## Phase 6.4: Performance Optimization

### Purpose
Pre-aggregate daily AI usage stats for 100x faster dashboard queries at scale.

---

### TC-P64-001: aiUsageDailyAggregates Table Schema
**Test**: Pre-aggregation table exists
**Steps**:
1. Check Convex dashboard for `aiUsageDailyAggregates` table

**Expected**:
- ✅ Table exists
- ✅ Fields:
  - `date` (string YYYY-MM-DD)
  - `organizationId` (string)
  - `totalCost` (number)
  - `totalCalls` (number)
  - `totalInputTokens` (number)
  - `totalCachedTokens` (number)
  - `totalOutputTokens` (number)
  - `avgCacheHitRate` (number)
- ✅ Indexes: `by_date`, `by_org_date`

**Pass/Fail**: _______

---

### TC-P64-002: aggregateDailyUsage Cron Exists
**Test**: Nightly aggregation job configured
**Steps**:
1. Check `crons.ts` for `aggregateDailyUsage` cron
2. Verify schedule

**Expected**:
- ✅ Cron function exists
- ✅ Scheduled: Daily at 1 AM UTC (`cron.daily('aggregate-daily-usage', { hourUTC: 1, minuteUTC: 0 }, ...)`)
- ✅ Runs nightly automatically

**Pass/Fail**: _______

---

### TC-P64-003: Aggregation Logic - Date Range
**Test**: Cron aggregates previous day only
**Steps**:
1. Manually trigger `aggregateDailyUsage` cron on 2026-01-27
2. Check which date is aggregated

**Expected**:
- ✅ Queries `aiUsageLog` for 2026-01-26 (yesterday)
- ✅ Date range: yesterday 00:00 UTC to 23:59 UTC
- ✅ Does not aggregate today (incomplete data)
- ✅ Does not re-aggregate older dates (unless missing)

**Pass/Fail**: _______

---

### TC-P64-004: Aggregation Logic - Grouping by Org
**Test**: Separate aggregate per organization
**Steps**:
1. Create test data: 3 orgs with AI usage on 2026-01-26
2. Trigger aggregation cron
3. Check `aiUsageDailyAggregates` table

**Expected**:
- ✅ 3 records created (one per org)
- ✅ Each record has `date: '2026-01-26'` and respective `organizationId`
- ✅ No cross-org data mixing

**Pass/Fail**: _______

---

### TC-P64-005: Aggregation Logic - Calculation Accuracy
**Test**: Aggregated values match raw logs
**Steps**:
1. Query `aiUsageLog` for Test Org on 2026-01-26
2. Calculate manually:
   - Total cost: sum of all costUsd
   - Total calls: count of records
   - Total input tokens: sum
   - Total cached tokens: sum
   - Total output tokens: sum
   - Avg cache hit rate: (totalCachedTokens / (totalInputTokens + totalCachedTokens)) * 100
3. Run aggregation cron
4. Compare aggregate record to manual calculation

**Expected**:
- ✅ `totalCost` matches (within $0.01 rounding)
- ✅ `totalCalls` matches exactly
- ✅ Token totals match exactly
- ✅ `avgCacheHitRate` matches (within 0.1%)
- ✅ Data accuracy within 0.1% tolerance

**Pass/Fail**: _______

---

### TC-P64-006: Aggregation Logic - Idempotency
**Test**: Running cron twice doesn't duplicate data
**Steps**:
1. Trigger aggregation cron for date 2026-01-26
2. Check records created
3. Trigger same cron again for same date
4. Check records

**Expected**:
- ✅ First run: creates records
- ✅ Second run: checks if records exist for (org, date)
- ✅ Second run: skips insert (no duplicates) OR updates existing record
- ✅ Final result: one record per (org, date), no duplicates

**Pass/Fail**: _______

---

### TC-P64-007: Aggregation Logic - Sparse Table
**Test**: No records created for orgs with no usage
**Steps**:
1. Org A has AI usage on 2026-01-26
2. Org B has NO usage on 2026-01-26
3. Run aggregation cron

**Expected**:
- ✅ Record created for Org A
- ✅ NO record created for Org B (sparse table)
- ✅ Empty days omitted (saves storage)

**Pass/Fail**: _______

---

### TC-P64-008: Query Optimization - getOrgUsage Decision Logic
**Test**: Query chooses raw vs aggregate based on date range
**Steps**:
1. Review `getOrgUsage` query code (or new variant)
2. Check decision logic

**Expected**:
- ✅ If date range not specified: use raw logs (real-time)
- ✅ If date range <= 7 days: use raw logs
- ✅ If date range > 7 days: use aggregates table
- ✅ Fallback to raw logs if aggregates missing for requested dates

**Pass/Fail**: _______

---

### TC-P64-009: Query Performance - Raw Logs (7 days)
**Test**: Recent data queries use raw logs
**Steps**:
1. Query `getOrgUsage` with `startDate = today - 3 days`
2. Check query execution
3. Measure time

**Expected**:
- ✅ Query uses `aiUsageLog` table (not aggregates)
- ✅ Query time < 200ms for ~1000 logs
- ✅ Real-time data (most accurate)

**Pass/Fail**: _______

---

### TC-P64-010: Query Performance - Aggregates (30 days)
**Test**: Long date ranges use pre-aggregated data
**Steps**:
1. Populate `aiUsageDailyAggregates` with 30 days of data
2. Query `getOrgUsage` with `startDate = today - 30 days`
3. Check query execution
4. Measure time

**Expected**:
- ✅ Query uses `aiUsageDailyAggregates` table
- ✅ Query scans 30 aggregate records (not 10,000+ raw logs)
- ✅ Query time < 100ms regardless of raw log count
- ✅ 10-100x faster than raw logs

**Pass/Fail**: _______

---

### TC-P64-011: Query Performance - Scalability Test
**Test**: Aggregates remain fast as data grows
**Steps**:
1. Simulate 10,000 AI usage logs across 10 orgs
2. Populate aggregates via cron
3. Query 30-day stats using both methods:
   - Method A: Raw logs (baseline)
   - Method B: Aggregates (optimized)
4. Compare times

**Expected**:
- ✅ Raw logs query: slow, scales with log count (could be 5-10 seconds)
- ✅ Aggregates query: fast, constant time (~100ms)
- ✅ Aggregates 50-100x faster at scale
- ✅ Performance improvement proven

**Pass/Fail**: _______

---

### TC-P64-012: Dashboard Integration - Cost Analytics Uses Aggregates
**Test**: Admin dashboard leverages optimization
**Steps**:
1. Open `/platform/messaging` → Cost Analytics tab
2. View 30-day cost chart
3. Check query used (inspect network tab or console)

**Expected**:
- ✅ Dashboard queries use aggregates for 30-day view
- ✅ Chart loads in < 500ms
- ✅ Total page load < 2 seconds

**Pass/Fail**: _______

---

### TC-P64-013: Dashboard Integration - Data Freshness Trade-off
**Test**: Dashboard shows up-to-24h stale data
**Steps**:
1. Generate AI summary today (after last aggregation cron)
2. View dashboard Cost Analytics (30-day view)
3. Check if today's cost included

**Expected**:
- ✅ Today's data NOT in aggregates (aggregates only have yesterday and earlier)
- ✅ Dashboard MAY show today's data via separate real-time query OR accept up-to-24h staleness
- ✅ Trade-off documented: speed vs freshness
- ✅ For critical real-time monitoring, use Overview tab (real-time queries)

**Pass/Fail**: _______

---

### TC-P64-014: Cron Execution Performance
**Test**: Aggregation completes quickly
**Steps**:
1. Populate 1000 AI usage logs for previous day
2. Trigger aggregation cron
3. Measure execution time

**Expected**:
- ✅ Cron completes in < 5 seconds (worst case: 1000 logs)
- ✅ Efficient grouping and aggregation
- ✅ No timeout errors

**Pass/Fail**: _______

---

### TC-P64-015: Cron Error Handling
**Test**: Cron handles missing data gracefully
**Steps**:
1. Trigger cron on day with no AI usage (no logs for yesterday)
2. Check execution

**Expected**:
- ✅ Cron completes without errors
- ✅ No aggregate records created (sparse table)
- ✅ Logs message: "No usage data for yesterday, skipping aggregation"

**Pass/Fail**: _______

---

### TC-P64-016: Data Retention - Raw Logs
**Test**: Raw logs kept indefinitely
**Steps**:
1. Check if raw logs deleted after aggregation

**Expected**:
- ✅ Raw logs NOT deleted (kept for detailed analysis)
- ✅ Aggregates are derived data, raw logs are source of truth
- ✅ Can regenerate aggregates from raw logs if needed

**Pass/Fail**: _______

---

### TC-P64-017: Data Retention - Aggregates (Optional)
**Test**: Old aggregates archived
**Steps**:
1. Check if retention policy exists for aggregates > 1 year

**Expected** (if implemented):
- ✅ Aggregates older than 1 year archived or deleted
- ✅ Configurable retention period
- ✅ (If not implemented, mark N/A - optional optimization)

**Pass/Fail**: _______

---

### TC-P64-018: Fallback to Raw Logs
**Test**: Query falls back if aggregates missing
**Steps**:
1. Delete aggregate record for specific date (simulate missing data)
2. Query `getOrgUsage` for date range including that date
3. Check behavior

**Expected**:
- ✅ Query detects missing aggregate
- ✅ Falls back to raw logs for missing date
- ✅ Returns accurate results (mix of aggregates and raw logs)
- ✅ Graceful degradation

**Pass/Fail**: _______

---

### TC-P64-019: Aggregate Regeneration (Manual)
**Test**: Admin can manually trigger aggregation for past dates
**Steps**:
1. Manually call aggregation function with date parameter: `aggregateDailyUsage({ date: '2026-01-20' })`
2. Check if aggregate created

**Expected** (if implemented):
- ✅ Allows manual aggregation for specific date
- ✅ Useful for backfilling missing aggregates
- ✅ (If not implemented, mark N/A - optional feature)

**Pass/Fail**: _______

---

## Integration Tests - Phase 6 Combined

### Purpose
Test all Phase 6 sub-phases working together as a cohesive monitoring and scale infrastructure.

---

### INT-P6-001: Cost Enforcement → Graceful Degradation
**Test**: Budget exceeded triggers fallback
**Steps**:
1. Set org budget to $5/day
2. Spend $5 (reach limit)
3. Attempt to generate summary
4. Check behavior

**Expected**:
- ✅ Budget check fails (blocked)
- ✅ No AI call made (cost controlled)
- ✅ Error message to user (not fallback in this case, since budget blocks entirely)
- ✅ OR fallback template used if budget failure treated as degradation
- ✅ User sees degradation banner explaining budget issue

**Pass/Fail**: _______

---

### INT-P6-002: Circuit Open → Admin Dashboard Shows Status
**Test**: Service health reflected in dashboard
**Steps**:
1. Simulate AI failure (open circuit breaker)
2. Open admin dashboard → Service Health tab
3. Check display

**Expected**:
- ✅ Status shows "Down" (red)
- ✅ Circuit breaker state: "Open"
- ✅ Recent failures listed
- ✅ Dashboard real-time updates when circuit changes

**Pass/Fail**: _______

---

### INT-P6-003: Rate Limit Hit → Alert Logged → Dashboard Displays
**Test**: Rate limit violation flow
**Steps**:
1. Hit rate limit for org
2. Check `platformCostAlerts` table
3. View admin dashboard → Overview tab

**Expected**:
- ✅ Alert created with type 'rate_limit_exceeded' (if tracked as alert)
- ✅ Alert appears in dashboard alert panel
- ✅ Rate Limits tab shows violation in table
- ✅ Full visibility

**Pass/Fail**: _______

---

### INT-P6-004: Budget Alert → Acknowledged → Removed from Dashboard
**Test**: Alert lifecycle
**Steps**:
1. Trigger 80% budget alert
2. Alert appears in dashboard Overview
3. Click "Acknowledge"
4. Check dashboard and database

**Expected**:
- ✅ Alert created and visible
- ✅ Acknowledged in database
- ✅ Removed from "Unacknowledged Alerts" panel
- ✅ Still visible in historical alert logs (if implemented)

**Pass/Fail**: _______

---

### INT-P6-005: Emergency Mode → All Features Disabled → Banner Shown
**Test**: Emergency kill switch end-to-end
**Steps**:
1. Activate emergency mode from Settings tab
2. Attempt AI generation as coach
3. Check parent view
4. Check admin dashboard

**Expected**:
- ✅ Emergency mode active
- ✅ AI generation blocked (all orgs)
- ✅ Auto-approval disabled
- ✅ Coaches see emergency banner with custom message
- ✅ Parents see emergency banner
- ✅ Dashboard shows emergency mode active

**Pass/Fail**: _______

---

### INT-P6-006: Aggregated Data → Dashboard Loads Fast
**Test**: Performance optimization in action
**Steps**:
1. Populate 10,000+ AI usage logs
2. Run aggregation cron
3. Open admin dashboard → Cost Analytics
4. Measure load time

**Expected**:
- ✅ 30-day chart loads in < 500ms
- ✅ Total dashboard load < 2 seconds
- ✅ No performance degradation with large dataset
- ✅ Aggregates working as designed

**Pass/Fail**: _______

---

### INT-P6-007: Budget + Rate Limit + Circuit Breaker (Layered Defense)
**Test**: All three safety mechanisms active
**Steps**:
1. Set org budget to $10/day
2. Set rate limit to 10 messages/hour
3. Simulate AI failure (open circuit)
4. Attempt to generate summary

**Expected**:
- ✅ Order of checks: rate limit → budget → circuit breaker → AI
- ✅ Whichever fails first blocks the call
- ✅ Appropriate error message shown
- ✅ Defense in depth: multiple safety layers

**Pass/Fail**: _______

---

### INT-P6-008: Cost Monitoring → Alert → Admin Action
**Test**: Full monitoring workflow
**Steps**:
1. Org approaches 80% of budget
2. Alert cron triggers
3. Admin sees alert in dashboard
4. Admin adjusts org budget or rate limit
5. Org continues operation

**Expected**:
- ✅ Proactive alerting catches issue early
- ✅ Admin can respond before hard limit hit
- ✅ Dashboard provides tools to fix issue
- ✅ Smooth resolution

**Pass/Fail**: _______

---

### INT-P6-009: Aggregation Accuracy → Dashboard Trust
**Test**: Aggregated data reliability
**Steps**:
1. Run aggregation for multiple days
2. Compare aggregated cost analytics to raw logs
3. Verify dashboard displays accurate totals

**Expected**:
- ✅ Aggregates match raw logs within 0.1%
- ✅ No data loss or corruption
- ✅ Platform staff can trust dashboard metrics

**Pass/Fail**: _______

---

### INT-P6-010: Real-Time Monitoring → Historical Analysis
**Test**: Both real-time and historical use cases
**Steps**:
1. Use Overview tab for real-time monitoring (last 24 hours, raw logs)
2. Use Cost Analytics tab for historical trends (30 days, aggregates)
3. Verify both work correctly

**Expected**:
- ✅ Real-time data: fresh, up-to-the-minute
- ✅ Historical data: fast, performant
- ✅ Right tool for each job

**Pass/Fail**: _______

---

## Regression Tests - Phase 6

### Quick Smoke Tests After Any Phase 6 Changes

- [ ] Budget check blocks AI calls when limit exceeded
- [ ] Rate limit check blocks AI calls when limit hit
- [ ] Circuit breaker opens after 5 failures
- [ ] Circuit breaker closes after successful test call
- [ ] Fallback templates used when AI unavailable
- [ ] Degradation banner appears when service degraded
- [ ] Admin dashboard loads in < 2 seconds
- [ ] Platform staff authorization enforced on all `/platform/*` routes
- [ ] Cost analytics data matches raw logs
- [ ] Emergency mode disables all AI features
- [ ] Aggregation cron runs successfully
- [ ] Aggregated queries 10x+ faster than raw logs

---

## Performance Benchmarks - Phase 6

### Target Metrics

| Operation | Target | Pass Criteria |
|-----------|--------|---------------|
| Budget check latency | < 10ms | Simple index query |
| Rate limit check latency | < 20ms | 2-3 index queries |
| Circuit breaker check | < 5ms | In-memory state |
| Fallback generation | < 10ms | String interpolation |
| Admin dashboard page load | < 2 seconds | Full page with all tabs |
| Tab switch time | < 100ms | Instant navigation |
| 30-day cost chart render | < 500ms | Using aggregates |
| Aggregation cron execution | < 5 seconds | 1000 logs worst case |
| Real-time query update | < 500ms | Convex live queries |
| Aggregate query (30 days) | < 100ms | 30 records vs 10K+ raw |

---

## Known Issues & Limitations - Phase 6

### Current Behavior
- Budget resets at fixed times (midnight UTC for daily, month start for monthly)
- Rate limit windows are rolling (not fixed time windows)
- Aggregates have up to 24-hour staleness (acceptable for historical analysis)
- Emergency mode disables ALL AI features globally (no per-org granularity)
- Circuit breaker applies platform-wide (all orgs affected if Anthropic API down)

### Expected Edge Cases
- If aggregation cron fails, dashboard falls back to raw logs (slower but functional)
- If multiple alerts triggered simultaneously, deduplication may delay some alerts by up to 60 minutes
- Platform rate limits act as hard ceiling even if org has higher budget
- Budget check does not account for in-flight AI calls (race condition possible if many simultaneous requests)

---

## Troubleshooting - Phase 6

### Budgets not enforcing
- Check `isEnabled: true` on org budget
- Verify `checkOrgCostBudget` called BEFORE AI action
- Check `currentDailySpend` value (may need manual reset)
- Verify budget reset cron running at midnight UTC

### Rate limits not working
- Check `rateLimits` table has records for org or platform
- Verify `windowEnd` not in past (window expired)
- Check rate limit reset cron running hourly
- Verify `checkRateLimit` called FIRST in AI pipeline

### Circuit breaker not opening
- Check `aiServiceHealth` record exists
- Verify failures recorded via `recordAPIResult(false)`
- Check `recentFailureCount` increments
- Ensure failures within 5-minute window

### Degradation banner not showing
- Check `getAIServiceHealth` query working
- Verify circuit breaker state in database
- Check Convex real-time subscription active
- Ensure `DegradationBanner` component imported correctly

### Admin dashboard not loading
- Verify user has `isPlatformStaff: true`
- Check authorization on all admin queries
- Verify Convex functions deployed
- Check browser console for errors

### Aggregates inaccurate
- Manually compare aggregate to raw logs
- Check aggregation cron logic (groupBy, sum calculations)
- Verify cron ran for date in question
- Re-run aggregation manually if needed

### Dashboard slow
- Check if using aggregates for > 7 day queries
- Verify indexes exist on all tables
- Check network tab for slow queries
- Consider populating more aggregates

---

## Success Criteria - Phase 6

✅ **Phase 6.1 (Cost Controls)**
- Org budgets enforced correctly (daily and monthly)
- Rate limits prevent runaway costs
- Alerts trigger at 80% threshold
- Daily/monthly resets automated

✅ **Phase 6.2 (Graceful Degradation)**
- Circuit breaker opens after 5 failures
- Fallback templates used when AI down
- Degradation banners inform users
- Circuit auto-recovers when service restored

✅ **Phase 6.3 (Admin Dashboard)**
- Dashboard loads in < 2 seconds
- Cost analytics accurate and visual
- Rate limits configurable
- Emergency kill switch functional
- Platform staff only access

✅ **Phase 6.4 (Performance Optimization)**
- Aggregates 10-100x faster than raw logs
- Dashboard remains fast at scale
- Aggregation cron runs nightly without errors
- Data accuracy within 0.1%

**Total Test Cases**: 90+
**Estimated Test Time**: 8-10 hours (full Phase 6 suite)
**Quick Smoke Test**: 1 hour (critical paths)

---

**Tested By**: _______________
**Date**: _______________
**Environment**: _______________
**Result**: _______________

**Notes**:


---

*Generated by Claude Code - January 27, 2026*
*Phase 6 Testing Guide - Monitoring & Scale Infrastructure*
