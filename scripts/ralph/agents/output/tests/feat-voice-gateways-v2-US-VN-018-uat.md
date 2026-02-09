# UAT Test: US-VN-018 - Disambiguation UI with Analytics & Batch Resolution

> Auto-generated: 2026-02-07 14:00
> Status: ⏳ Pending Execution

## Story
Create coach-facing UI to resolve ambiguous entity mentions. Shows candidates with rich match reasons (irish_alias, fuzzy, etc.). Batch-resolves same-name mentions across claims. Stores coach aliases on resolution. Logs disambiguation analytics events. Mobile-responsive with shadcn/ui and org theming.

## Acceptance Criteria Checklist

- [ ] --- PAGE STRUCTURE ---
- [ ] Frontend: Create apps/web/src/app/orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]/page.tsx
- [ ] Page structure:
- [ ] 1. Header: 'Resolve Player Mentions' with back button to voice notes list
- [ ] 2. Summary card: X unresolved mentions, Y auto-resolved (skipped), Z alias-resolved
- [ ] 3. [E6] Grouped by unique rawText: if 'Tommy' appears in 5 claims, show ONE card with note '5 claims will be updated'
- [ ] 4. For each unique unresolved name:
- [ ] - Show representative claim sourceText with rawText mention highlighted (bold/underline)
- [ ] - Show claim topic badge (reuse TOPIC_CONFIG pattern from v2-claims page)
- [ ] - Show count: 'Appears in N claims'
- [ ] - [E4] Radio group with candidates: fullName, team/ageGroup, similarity % bar, matchReason badge (e.g., 'Irish alias', 'Fuzzy match', 'Team context')
- [ ] - 'None of these' option for marking as unresolved
- [ ] - 'Confirm' button per group
- [ ] 5. 'Save All' and 'Skip All Remaining' buttons at bottom
- [ ] --- QUERIES (LIFT TO PARENT) ---
- [ ] Queries (lift to parent, pass as props):
- [ ] - useQuery(api.models.voiceNoteEntityResolutions.getDisambiguationQueue, { organizationId })
- [ ] - NOTE: Do NOT use useQuery inside list item components (N+1 anti-pattern)
- [ ] --- MUTATIONS ---
- [ ] Mutations:
- [ ] - useMutation(api.models.voiceNoteEntityResolutions.resolveEntity)
- [ ] --- RESOLVE ENTITY MUTATION BEHAVIOR ---
- [ ] Backend: resolveEntity mutation (defined in US-VN-017) does the following on each call:
- [ ] 1. Verify user identity via ctx.auth.getUserIdentity()
- [ ] 2. Update resolution: status='user_resolved', resolvedEntityId, resolvedEntityName, resolvedAt
- [ ] 3. [E6] Batch: Find all other resolution records in same artifact with same rawText, update them too
- [ ] 4. Update parent claim's resolvedPlayerIdentityId and resolvedPlayerName
- [ ] 5. [E5] Store coach alias: inline upsert to coachPlayerAliases table (query by_coach_org_rawText index, patch if exists or insert if new). Do NOT use scheduler — resolveEntity is already a mutation so write directly
- [ ] 6. [E3] Log analytics event: ctx.scheduler.runAfter(0, internal.models.reviewAnalytics.logReviewEvent, { eventType: 'disambiguate_accept', confidenceScore: selectedScore, category: claim.topic })
- [ ] --- SKIP/REJECT BEHAVIOR ---
- [ ] 'None of these' (reject all candidates):
- [ ] 1. Update resolution: status='unresolved'
- [ ] 2. [E3] Log analytics: eventType='disambiguate_reject_all', confidenceScore=topCandidate.score
- [ ] 'Skip All Remaining':
- [ ] 1. [E3] Log analytics: eventType='disambiguate_skip' for each skipped resolution
- [ ] --- MATCH REASON DISPLAY (Enhancement E4) ---
- [ ] Display matchReason as contextual badges on each candidate:
- [ ] - 'irish_alias' -> badge: 'Irish name alias' (with tooltip showing alias pair, e.g., 'Shawn = Sean')
- [ ] - 'exact_first_name' -> badge: 'Exact first name'
- [ ] - 'fuzzy_full_name' -> badge: 'Similar name'
- [ ] - 'fuzzy_first_name' -> badge: 'Similar first name'
- [ ] - 'last_name_match' -> badge: 'Last name match'
- [ ] - 'partial_match' -> badge: 'Partial match'
- [ ] - '+team_context' suffix -> additional badge: 'On your team'
- [ ] --- NAVIGATION ---
- [ ] Navigation: Add disambiguation badge/link to voice notes list page when artifact has needs_disambiguation resolutions
- [ ] - Badge shows count: '3 players to identify'
- [ ] - Links to /orgs/[orgId]/coach/voice-notes/disambiguation/[artifactId]
- [ ] --- STYLING ---
- [ ] Mobile-responsive: Touch targets >= 44px, scrolling list, bottom action bar sticky
- [ ] Use org theming (useOrgTheme hook) for primary color accents on Confirm buttons
- [ ] Similarity bar: visual progress bar colored by score (green >= 0.9, yellow 0.7-0.9, red < 0.7)
- [ ] --- VERIFICATION ---
- [ ] Type check passes: npm run check-types
- [ ] Build passes: npm run build
- [ ] Manual test:
- [ ] - Voice note with ambiguous mention -> shows disambiguation page
- [ ] - [E4] Candidates show matchReason badges (Irish alias, fuzzy, etc.)
- [ ] - [E6] 'Tommy' in 3 claims shows as 1 grouped card with 'Appears in 3 claims'
- [ ] - Select candidate -> confirm -> resolution + all same-name resolutions updated, claim updated
- [ ] - [E5] Next voice note with same name -> auto-resolves via alias (no disambiguation needed)
- [ ] - [E3] Check reviewAnalyticsEvents table for disambiguate_accept event after resolution
- [ ] - All resolved -> navigates back to voice notes list
- [ ] - Mobile: Touch targets work, scrolling smooth

## Playwright E2E Tests
- Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts -g "US-VN-018"`
- Report: `npx -w apps/web playwright show-report uat/playwright-report`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
