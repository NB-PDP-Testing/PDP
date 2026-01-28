# Phase 5.3 (Cost Optimization) - Handoff to Ralph

## Phase 2 Completion Summary

Phase 2 (Auto-Approval System) is complete with all features implemented and bugs fixed:

**Completed User Stories:**
- US-007: Auto-approval decision logic
- US-008: Auto-approval in createParentSummary
- US-009: Revoke summary mutation
- US-010: AutoApprovedTab component and query
- US-011: Auto-approved tab in dashboard

**Bug Fixes Applied:**
1. **Authentication Pattern Fix** - Fixed all trust level queries to use `user.userId || user._id` instead of just `user?.userId` (Better Auth userId field is optional/unset)
2. **Slider UX Fix** - Changed slider max from `earnedLevel` to always `3` with validation, so visual position matches actual level
3. **Trust Level Downgrade Fix** - Removed logic that permanently downgraded `currentLevel` when `preferredLevel` set lower

All changes committed to `ralph/coach-parent-summaries-p5-phase2` branch.

---

## Phase 3 Overview

**Goal:** Reduce AI costs by 90% through prompt caching and comprehensive usage tracking.

**Key Technologies:**
- Anthropic Prompt Caching (cache static prompts, only vary insight content)
- Usage tracking database (token counts, costs, cache hit rates)
- Analytics dashboard for monitoring

**Expected Impact:**
- 90% cost reduction on parent summary generation
- Full visibility into AI spend by org/coach/player
- Foundation for future cost optimization

---

## Phase 3 User Stories

### US-012: Add prompt caching to generateParentSummary action

**Acceptance Criteria:**
- Add `anthropic-beta: prompt-caching-2024-07-31` header to API calls
- Cache system prompts and player/sport context
- Only insight content varies (no cache)
- Update cost calculation to account for cached vs non-cached tokens

**Implementation Notes:**
- Modify `packages/backend/convex/actions/generateParentSummary.ts`
- Use Anthropic SDK prompt caching feature
- Cache TTL is 5 minutes
- Claude Haiku pricing: Regular input $5/M, Cached $0.50/M (90% discount), Output $15/M

**Testing:**
- Generate summary, verify cache-control headers in response
- Generate another summary within 5 min, verify cache hit
- Check costs are ~90% lower on cached calls

---

### US-013: Add aiUsageLog table to schema

**Acceptance Criteria:**
- New table with fields: timestamp, organizationId, coachId, playerId, operation, model, inputTokens, cachedTokens, outputTokens, cost, cacheHitRate
- Indexes: by_organizationId, by_coachId, by_timestamp, by_operation
- Returns validator for usage log entry

**Implementation Notes:**
- Add to `packages/backend/convex/schema.ts`
- Use `v.number()` for token counts and cost (store as dollars, e.g., 0.00015)
- operation field: "parent_summary", "voice_note_transcription", etc.
- Run `npx -w packages/backend convex codegen` after schema change

**Testing:**
- Verify schema compiles
- Check indexes are created in Convex dashboard
- Test inserting a log entry manually

---

### US-014: Log AI usage in generateParentSummary action

**Acceptance Criteria:**
- After each API call, extract token counts from response
- Calculate cost: (inputTokens - cachedTokens) * 0.000005 + cachedTokens * 0.0000005 + outputTokens * 0.000015
- Calculate cache hit rate: cachedTokens / inputTokens
- Insert log entry via mutation

**Implementation Notes:**
- Modify `packages/backend/convex/actions/generateParentSummary.ts`
- Use `ctx.runMutation(api.models.aiUsageLog.logUsage, {...})`
- Create new mutation in `packages/backend/convex/models/aiUsageLog.ts`
- Include organizationId, coachId, playerId from summary context

**Testing:**
- Generate summary, verify log entry created
- Check token counts match API response
- Verify cost calculation is correct
- Test with and without cache hits

---

### US-015: Create AI usage analytics dashboard query

**Acceptance Criteria:**
- Query to fetch usage logs by organization with date range filter
- Aggregates: total cost, total tokens, average cache hit rate
- Breakdown by operation type
- Top coaches/players by usage
- Returns validator for analytics data

**Implementation Notes:**
- Create `packages/backend/convex/models/aiUsageLog.ts`
- Add queries: `getOrgUsage`, `getCoachUsage`, `getUsageByDateRange`
- Use indexes for efficient filtering
- Consider pagination for large result sets

**Testing:**
- Query with various date ranges
- Verify aggregations are correct
- Check performance with large datasets
- Test with no data (empty org)

---

## Phase 3 Testing Strategy

### US-012 Testing (Prompt Caching)
1. Clear any existing cache (wait 5+ minutes or use different insight)
2. Generate parent summary, capture response headers
3. Verify `cache-control` or cache stats in response metadata
4. Generate same summary again within 5 min
5. Verify cache hit (should see higher cachedTokens count)
6. Calculate cost savings: compare first call to cached call

### US-013 Testing (Schema)
1. Run codegen, verify no errors
2. Open Convex dashboard, verify aiUsageLog table exists
3. Check all indexes are present
4. Insert test record via Convex dashboard
5. Query test record to verify structure

### US-014 Testing (Logging)
1. Generate parent summary
2. Query aiUsageLog table for new entry
3. Verify all fields populated correctly
4. Check cost calculation matches expected formula
5. Generate multiple summaries, verify all logged
6. Test error handling (what if logging fails?)

### US-015 Testing (Analytics)
1. Generate usage data (multiple summaries across orgs/coaches)
2. Query `getOrgUsage` for test org
3. Verify aggregates match manual calculation
4. Test date range filtering
5. Check performance with 100+ log entries
6. Verify empty results for org with no usage

---

## Known Issues & Gotchas

1. **Better Auth userId field** - Always use `user.userId || user._id` pattern, never just `user.userId`
2. **Prompt caching TTL** - Cache expires after 5 minutes, don't test with >5min delays
3. **Cost calculation precision** - Use full precision for costs (don't round prematurely)
4. **Anthropic API beta header** - Required for caching: `anthropic-beta: prompt-caching-2024-07-31`
5. **Action context** - Actions can't access `ctx.db`, must use `ctx.runQuery` or `ctx.runMutation`

---

## Success Criteria

Phase 3 is complete when:
- All 4 user stories pass tests
- Parent summary generation uses prompt caching
- Every AI call is logged to aiUsageLog table
- Analytics queries return accurate cost/usage data
- 90% cost reduction verified on cached calls
- No regressions in Phase 1 or Phase 2 features

---

## Ralph Execution Checklist

- [ ] Read this handoff document
- [ ] Review `scripts/ralph/prd.json` for Phase 3 stories (US-012 to US-015)
- [ ] Review `scripts/ralph/progress.txt` for patterns and learnings
- [ ] Implement US-012 (prompt caching)
- [ ] Implement US-013 (schema)
- [ ] Implement US-014 (logging)
- [ ] Implement US-015 (analytics)
- [ ] Run tests for each story
- [ ] Update progress.txt with Phase 3 completion
- [ ] Mark all stories as passing in prd.json

Ready for Ralph to execute Phase 3!
