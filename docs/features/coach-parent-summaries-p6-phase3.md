# Coach-Parent AI Summaries - Phase 6.3 (Admin Dashboard)

> Auto-generated documentation - Last updated: 2026-01-25 19:33

## Status

- **Branch**: `ralph/coach-parent-summaries-p6-phase3`
- **Progress**: 6 / 6 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-017: Create platform messaging admin page structure

As a platform admin, I have a centralized control panel.

**Acceptance Criteria:**
- Create apps/web/src/app/platform/messaging/page.tsx
- Check user.isPlatformStaff, redirect if not authorized
- Page layout: tabs for Overview / Cost Analytics / Rate Limits / Service Health / Settings
- Use Tabs, TabsList, TabsTrigger, TabsContent from @/components/ui/tabs
- Placeholder content for each tab (filled in next stories)
- Typecheck passes

### US-018: Build Cost Analytics tab

As a platform admin, I see cost trends and breakdowns.

**Acceptance Criteria:**
- In messaging admin page, Cost Analytics tab
- Use getOrgUsage query (aiUsageLog:getOrgUsage, created in P5 US-015) - call without organizationId to get platform-wide data OR create new getPlatformUsage query that aggregates across all orgs
- Show cards: Total Cost (30 days), Cost Today, Average per Message, Cache Hit Rate
- Show line chart: daily cost over 30 days (use recharts library if available, or simple bars)
- Show table: top 10 orgs by cost with breakdown
- Color coding: green if cache hit rate >80%, amber if 60-80%, red if <60%
- Typecheck passes

### US-019: Build Rate Limits tab

As a platform admin, I configure and monitor rate limits.

**Acceptance Criteria:**
- In messaging admin page, Rate Limits tab
- Show current platform-wide limits in editable cards
- Button: 'Update Platform Limits' calls updatePlatformRateLimit mutation
- Show recent rate limit violations table: org, limit type, time, reset time
- Show per-org overrides table with 'Add Override' button
- Form to set per-org limits: select org, set messages/hour, messages/day, save
- Typecheck passes

### US-020: Build Service Health tab

As a platform admin, I monitor AI service health.

**Acceptance Criteria:**
- In messaging admin page, Service Health tab
- Query aiServiceHealth for current status
- Show large status indicator: green 'Healthy', amber 'Degraded', red 'Down'
- Show metrics: last success time, last failure time, recent failure count, circuit breaker state
- ENHANCEMENT: Show cache effectiveness: average cache hit rate from aiUsageLog (pull from existing getOrgUsage query)
- ENHANCEMENT: Show per-org AI usage: top 5 orgs by AI calls (from getOrgUsage)
- Show recent errors table (from logs): timestamp, error type, affected org, resolution
- Button: 'Force Reset Circuit Breaker' (admin override to close circuit manually)
- Typecheck passes

### US-021: Build Settings tab with master kill switch

As a platform admin, I can disable features globally.

**Acceptance Criteria:**
- In messaging admin page, Settings tab
- Add platformMessagingSettings table if not exists (singleton): aiGenerationEnabled (boolean), autoApprovalEnabled (boolean), parentNotificationsEnabled (boolean), emergencyMode (boolean), emergencyMessage (optional string)
- Show toggle switches for each setting
- Big red 'Emergency Disable All' button sets emergencyMode = true, disables all AI features
- Emergency mode banner shows emergencyMessage to all users (coaches, parents)
- Confirmation dialog before enabling emergency mode
- Typecheck passes

### US-022: Build Overview tab with key metrics

As a platform admin, I see health dashboard on page load.

**Acceptance Criteria:**
- In messaging admin page, Overview tab (default active tab)
- Show metric cards: Total Messages (24h), Total Cost (24h), Active Orgs, Service Status
- ENHANCEMENT: Add Trust System Health card: X coaches automated (trust level 2+), Y summaries auto-sent (30 days)
- ENHANCEMENT: Add AI Learning card: Z coaches have personalized thresholds (from coachTrustLevels where personalizedThreshold is not null)
- Show alert panel: unacknowledged cost alerts with 'Acknowledge' button
- Show recent activity feed: last 20 events (summary created, auto-approved, budget alert, etc.)
- Color-coded status: green if all healthy, amber if warnings, red if critical alerts
- Auto-refresh every 30 seconds (use setInterval or Convex real-time queries)
- Typecheck passes


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Platform layout.tsx already provides isPlatformStaff protection for all /platform/* routes
- No need to add auth checks in individual platform pages
- Linter auto-removes unused imports - must add component usage before import, or add them together
- Platform pages follow consistent structure: gradient header + white content card
- Linter aggressively removes unused imports in real-time
- When adding icon import and usage separately, import gets removed before usage is added
- Solution: Add the component usage first, then add the import (or use Edit to add both)
--
- Platform-wide queries should aggregate across all orgs (no organizationId filter)
- Daily aggregation uses ISO date strings (YYYY-MM-DD) for consistent grouping

**Gotchas encountered:**
- Linter aggressively removes unused imports in real-time
- When adding icon import and usage separately, import gets removed before usage is added
- Solution: Add the component usage first, then add the import (or use Edit to add both)
- Platform messaging page is independent, no dependencies yet
- Will need backend queries for future tabs (US-018 onwards)
- [ ] US-018: Build Cost Analytics tab - needs getOrgUsage query or new getPlatformUsage
--
- Cannot access `org.name` directly via `ctx.db.get(orgId)` - Better Auth tables are in component
- Type error: `Property 'name' does not exist on type` when trying `org?.name`
- Solution: Use organization ID as display name, add TODO for Better Auth integration

### Files Changed

- apps/web/src/app/platform/messaging/page.tsx (NEW, +165 lines)
- apps/web/src/app/platform/page.tsx (+20 lines for navigation card)
- ✅ Type check: passed
- ✅ Linting: passed (pre-commit hooks)
- ⏭️ Browser verification: not needed (structural setup only, will test when tabs have content)
- Platform layout.tsx already provides isPlatformStaff protection for all /platform/* routes
- No need to add auth checks in individual platform pages
- Linter auto-removes unused imports - must add component usage before import, or add them together
- Platform pages follow consistent structure: gradient header + white content card
- Linter aggressively removes unused imports in real-time
- When adding icon import and usage separately, import gets removed before usage is added
- Solution: Add the component usage first, then add the import (or use Edit to add both)
--
- packages/backend/convex/models/aiUsageLog.ts (+172 lines for getPlatformUsage query)
- ✅ Type check: passed


## Key Files


### New Files Created
- apps/web/src/app/platform/messaging/page.tsx (NEW, +165 lines)
- packages/backend/convex/models/platformMessagingSettings.ts (NEW, +191 lines)

---
*Documentation auto-generated by Ralph Documenter Agent*
