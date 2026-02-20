# Bug Fix: Fake Data in Session Planning (#506)

## Issue

**GitHub Issue:** #506 — UAT Testing - Fake Data in Session Planning

Session plans generated via the "Session Plans" page (`/coach/session-plans/new`) contained hardcoded fake/simulated content instead of real AI-generated content. The metadata extraction step also returned hardcoded tags.

## Root Cause Analysis

There were two separate code paths for session plan generation:

| Path | Entry Point | AI Status |
|------|-------------|-----------|
| Quick Actions (coach dashboard modal) | `session-plan-context.tsx` → `/api/session-plan` Next.js route | ✅ Real Claude API |
| Session Plans page | `/coach/session-plans/new/page.tsx` → Convex `generateAndSave` mutation → `generatePlanContent` action | ❌ **Hardcoded fake data** |

The Convex action `packages/backend/convex/actions/sessionPlans.ts` had two functions:

1. **`generatePlanContent`** — Created during initial development as a placeholder with a comment: *"For now, generate based on planId. In a real implementation, you'd fetch the plan details first."* It generated an identical static training plan template for every team regardless of focus area, age group, or player count.

2. **`extractMetadata`** — Similarly returned hardcoded tags (`["Technical Training", "Game-Based"]`, etc.) for every plan.

Neither function ever called the Claude API.

## What Was Changed

**File:** `packages/backend/convex/actions/sessionPlans.ts`

Complete rewrite of both actions:

### `generatePlanContent`
- Fetches plan details (`teamName`, `ageGroup`, `playerCount`, `focusArea`, `duration`, `sport`) using the existing `getPlanByIdInternal` query
- Builds a contextual prompt tailored to the specific team and session
- Calls the Anthropic Claude API directly using `ANTHROPIC_API_KEY` from the Convex environment
- Parses the AI-generated markdown response into structured `sections` using a new `parseSectionsFromContent` helper
- Falls back gracefully: marks plan as `"draft"` with an error message if the API call fails

### `extractMetadata`
- Calls Claude API with a structured JSON-extraction prompt to analyse the actual plan content
- Parses the JSON response to extract real `categories`, `skills`, `equipment`, and `intensity` values
- Falls back gracefully: returns `null` (metadata simply absent) if the API call fails

### Supporting helpers added
- `callClaudeAPI()` — shared HTTP request helper to avoid code duplication
- `buildSessionPlanPrompt()` — builds a contextual prompt from plan metadata
- `buildMetadataPrompt()` — builds a JSON-extraction prompt from plan content
- `parseSectionsFromContent()` — parses AI markdown into structured section/activity objects (split into smaller helpers to keep complexity within linting limits)
- Top-level regex constants as required by the Biome linter

## Files Modified

- `packages/backend/convex/actions/sessionPlans.ts` — complete rewrite

## Notes

- The `ANTHROPIC_API_KEY` must be set in the Convex deployment environment (confirmed already set).
- The Quick Actions path (`session-plan-context.tsx` → `/api/session-plan`) is unchanged and unaffected.
- If the Claude API call fails for any reason, the plan is marked as failed and the user sees a clear error message, preserving the existing graceful degradation behaviour.
