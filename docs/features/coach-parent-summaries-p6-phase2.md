# Coach-Parent AI Summaries - Phase 6.2 (Graceful Degradation)

> Auto-generated documentation - Last updated: 2026-01-25 18:20

## Status

- **Branch**: `ralph/coach-parent-summaries-p6-phase2`
- **Progress**: 5 / 5 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-012: Add aiServiceHealth table to schema

As the system, I track AI service health.

**Acceptance Criteria:**
- Add aiServiceHealth table to schema.ts (singleton pattern): service (v.literal('anthropic')), status (v.union: 'healthy' | 'degraded' | 'down'), lastSuccessAt (number), lastFailureAt (number), recentFailureCount (number), failureWindow (number, default 5 minutes), circuitBreakerState (v.union: 'closed' | 'open' | 'half_open'), lastCheckedAt (number)
- No indexes needed (singleton - only one record)
- Run: npx -w packages/backend convex codegen
- Typecheck passes

### US-013: Implement circuit breaker logic

As the system, I detect and react to API degradation.

**Acceptance Criteria:**
- Create lib/circuitBreaker.ts
- Export function shouldCallAPI(serviceHealth): boolean
- If circuitBreakerState === 'open': return false (don't call API)
- If circuitBreakerState === 'half_open': allow 1 test call to check if service recovered
- If circuitBreakerState === 'closed': return true (normal operation)
- Export function recordAPIResult(success: boolean): updates failure counts, state transitions
- State transitions: closed → open (5 failures in 5 min), open → half_open (after 1 min cooldown), half_open → closed (success) or open (failure)
- Typecheck passes

### US-014: Integrate circuit breaker into AI actions

As the system, degraded service triggers graceful fallback.

**Acceptance Criteria:**
- Edit generateParentSummary and classifyInsightSensitivity actions in actions/coachParentSummaries.ts
- Before Anthropic API call: check shouldCallAPI(serviceHealth)
- If false: return fallback response with isFallback flag
- Wrap Anthropic API call in try-catch: on success recordAPIResult(true), on error recordAPIResult(false) and return fallback
- Fallback for generateParentSummary: return template-based summary 'Your coach shared an update about {player}. View details in passport.'
- Fallback for classifyInsightSensitivity: return { category: 'normal', confidence: 0.5, isFallback: true }
- Typecheck passes

### US-015: Add degradation notice to coach UI

As a coach, I'm informed when AI is degraded.

**Acceptance Criteria:**
- Create components/coach/degradation-banner.tsx
- Props: { degradationType: 'ai_fallback' | 'rate_limited' | 'budget_exceeded' }
- Show contextual banner: 'AI assistance temporarily unavailable. Using simplified summaries. Service typically recovers within 5 minutes.'
- Different messages for each degradationType
- Import Alert, AlertDescription from @/components/ui/alert
- Warning icon and amber styling
- Typecheck passes

### US-016: Show degradation banner in voice notes dashboard

As a coach, degradation status is visible.

**Acceptance Criteria:**
- Edit voice-notes-dashboard.tsx
- Add query: getAIServiceHealth (create in models/aiServiceHealth.ts if needed)
- If status !== 'healthy': render DegradationBanner with appropriate type
- Position below header, above tabs
- Automatically dismisses when service recovers (query updates real-time)
- OPTIONAL: Also integrate degradation indicator in Coach Settings Dialog (components/profile/coach-settings-dialog.tsx) - small warning badge if AI degraded
- Typecheck passes


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Circuit breaker singleton pattern: aiServiceHealth table has only one record, no indexes needed
- Public vs internal queries: Created both getAIServiceHealth (public, simplified) and getServiceHealth (internal, full fields)
- Type safety for mutations: buildHealthUpdate returns explicit type structure matching mutation args (not Partial<>)
- Real-time UI updates: Convex queries automatically re-run when data changes, banner appears/disappears without page refresh
- Fallback transparency: Added isFallback flag to action returns for UI to detect degraded mode
- Linter removes unused imports: Had to add imports at same time as using them, otherwise Biome removes them
- Partial<Doc<>> type issues: Convex mutations need all required fields, can't use Partial. Changed buildHealthUpdate to return explicit type structure
- Type casting complexity: Instead of trying to cast Partial to full type, better to return complete type from helper function

**Gotchas encountered:**
- Linter removes unused imports: Had to add imports at same time as using them, otherwise Biome removes them
- Partial<Doc<>> type issues: Convex mutations need all required fields, can't use Partial. Changed buildHealthUpdate to return explicit type structure
- Type casting complexity: Instead of trying to cast Partial to full type, better to return complete type from helper function
- Circuit breaker logic depends on aiServiceHealth table existing
- AI actions need both internal queries/mutations and the circuit breaker functions
- Frontend banner needs public query (not internal) to display status
- Banner styling uses tailwind classes with dark mode support

### Files Changed

- packages/backend/convex/schema.ts (+39)
- packages/backend/convex/lib/circuitBreaker.ts (new, +217)
- packages/backend/convex/models/aiServiceHealth.ts (new, +143)
- packages/backend/convex/actions/coachParentSummaries.ts (+80, -15)
- apps/web/src/components/coach/degradation-banner.tsx (new, +56)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx (+8, -2)
- scripts/ralph/prd.json (marked all stories as passes: true)
- ✅ Type check: passed
- ✅ Linting: passed (pre-existing lint errors in api routes, not from Phase 6.2)
- ✅ Codegen: passed
- ✅ All commits passed pre-commit hooks
- Circuit breaker singleton pattern: aiServiceHealth table has only one record, no indexes needed
- Public vs internal queries: Created both getAIServiceHealth (public, simplified) and getServiceHealth (internal, full fields)
- Type safety for mutations: buildHealthUpdate returns explicit type structure matching mutation args (not Partial<>)


## Key Files

### Required Files (from dependencies)
- `actions/coachParentSummaries.ts - Where AI calls happen`
- `components/profile/coach-settings-dialog.tsx - Optional degradation indicator`

---
*Documentation auto-generated by Ralph Documenter Agent*
