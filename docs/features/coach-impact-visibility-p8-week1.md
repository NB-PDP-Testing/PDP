# P8 Week 1 - Coach Impact Visibility Foundation

> Auto-generated documentation - Last updated: 2026-01-27 18:37

## Status

- **Branch**: `ralph/coach-impact-visibility-p8-week1`
- **Progress**: 4 / 4 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P8-001: Create getCoachImpactSummary Backend Query

As a backend developer, I need to create a query that aggregates coach activity across 6 tables so the My Impact dashboard can display comprehensive coaching metrics.

**Acceptance Criteria:**
- Create getCoachImpactSummary query in packages/backend/convex/models/voiceNotes.ts
- Query accepts args: { coachId: v.string(), organizationId: v.string(), dateRange: v.object({ start: v.number(), end: v.number() }) }
- Query returns typed object with:
-   voiceNotesCreated: v.number()
-   insightsApplied: v.number()
-   insightsDismissed: v.number()
-   summariesSent: v.number()
-   summariesViewed: v.number()
-   summariesAcknowledged: v.number()
-   parentViewRate: v.number() - calculated as (summariesViewed / summariesSent) * 100
-   skillChanges: v.array() - recent skill changes from autoAppliedInsights
-   injuriesRecorded: v.array() - recent injuries where source='voice_note'
-   recentSummaries: v.array() - last 10 sent summaries
-   teamObservations: v.array() - team-level insights
-   parentEngagement: v.array() - per-parent engagement stats
-   weeklyTrends: v.array() - last 4 weeks of sent/viewed data
- Query uses .withIndex() for ALL sub-queries (NEVER .filter())
- Query aggregates from 6 tables: voiceNotes, voiceNoteInsights, coachParentSummaries, autoAppliedInsights, playerInjuries, teamObservations
- Date range filtering: Fetch from index with .gte(start), then filter .lte(end) in JavaScript
- Handle edge cases: no data returns zeros, coach not found returns null
- Include complete args and returns validators
- Type check passes: npm run check-types
- Run codegen: npx -w packages/backend convex codegen

### US-P8-002: Remove Trust Level Gate from Sent to Parents Tab

As a Level 0-1 coach, I want to see the 'Sent to Parents' tab so I can view summaries I've sent without needing Level 2+.

**Acceptance Criteria:**
- Modify apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx
- Find trust level check that hides tab for Level 0-1 (likely: if (coachTrustLevel < 2) return <EmptyState />)
- Remove the entire trust level check - delete the if statement
- Tab should be visible to ALL coaches (Level 0+)
- Existing functionality preserved: search, filter, parent view status still work
- Type check passes: npm run check-types
- Visual verification: Navigate to voice notes dashboard as Level 0 coach, verify tab visible
- Test with Level 0, Level 1, and Level 2 coaches (tab visible for all)

### US-P8-003: Create My Impact Tab Component Structure

As a frontend developer, I want to create the skeleton for the My Impact tab so we have a foundation for adding dashboard sections.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx
- Component exports MyImpactTab function component
- Component accepts props: { orgId: string, coachId: string }
- Component uses useQuery to fetch data: const impactData = useQuery(api.models.voiceNotes.getCoachImpactSummary, { coachId, organizationId: orgId, dateRange })
- Component has date range state: const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>(() => localStorage.getItem('impact-date-range') as any || 'month')
- Component has date range picker dropdown at top (options: This Week, This Month, All Time)
- Loading state: if (impactData === undefined) return <Skeleton /> with 4 card placeholders
- Error state: if query fails, show error message
- Empty state: if (impactData.voiceNotesCreated === 0) return <EmptyState message='No activity yet' />
- Component structure has sections (placeholders for Week 2):
-   {/* Summary cards - placeholder for US-P8-005 */}
-   {/* Sent summaries - placeholder for US-P8-006 */}
-   {/* Applied insights - placeholder for US-P8-007 */}
-   {/* Team observations - placeholder for US-P8-009 */}
- Type check passes: npm run check-types
- Visual verification: Component renders in browser, date picker works

### US-P8-004: Add My Impact Tab to Voice Notes Dashboard Navigation

As a coach, I want to see 'My Impact' as a tab option in the voice notes dashboard so I can access my impact summary.

**Acceptance Criteria:**
- Modify apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx
- Add 'My Impact' tab to dashboard tab list
- Tab visible to coaches with functional role 'Coach' OR platform staff
- Tab NOT visible to parents, admins without coach role
- Tab shows icon: <BarChart3 className='h-4 w-4 mr-2' /> from lucide-react
- Tab positioned after 'History' tab, before 'Settings' icon
- Clicking tab renders MyImpactTab component
- Import MyImpactTab from './components/my-impact-tab'
- Role check pattern: const hasCoachRole = member?.functionalRoles?.includes('Coach'); const isPlatformStaff = user?.isPlatformStaff;
- Type check passes: npm run check-types
- Visual verification: Tab appears in navigation, clicking navigates correctly


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Pre-existing lint errors exist in the codebase but don't block commits
- Pre-commit hooks use lint-staged which only checks staged files
- Code review feedback should be addressed before starting new stories
- ultracite fix shows many warnings but pre-commit hooks still pass
- The important part is that NEW changes don't introduce NEW lint errors
- [x] Code review feedback addressed
--
- coachParentSummaries uses publicSummary.content, not summaryText or playerName
- Player names must be fetched from playerIdentities table via playerIdentityId
- Must use proper null checking instead of non-null assertion (!) for Map.get()

**Gotchas encountered:**
- ultracite fix shows many warnings but pre-commit hooks still pass
- The important part is that NEW changes don't introduce NEW lint errors
- [x] Code review feedback addressed
- [ ] Pick up next story with passes: false (US-P8-001)
---
--
- targetRecordId in autoAppliedInsights can be undefined - provide empty string fallback
- Pre-commit hooks fail on non-null assertion (!) - use if (existing) instead
- Schema fields don't always match what you expect - read schema or existing queries first
- Query depends on playerIdentities table for player names

### Files Changed

- apps/web/src/app/api/recommendations/route.ts (+20, -5)
- apps/web/src/app/api/session-plan/route.ts (+13, -3)
- ✅ Type check: passed
- ✅ Linting: pre-commit hook passed (lint-staged)
- ✅ Commit successful with pre-commit hooks
- Pre-existing lint errors exist in the codebase but don't block commits
- Pre-commit hooks use lint-staged which only checks staged files
- Code review feedback should be addressed before starting new stories
- ultracite fix shows many warnings but pre-commit hooks still pass
- The important part is that NEW changes don't introduce NEW lint errors
- [x] Code review feedback addressed
--
- packages/backend/convex/models/voiceNotes.ts (+435)
- ✅ Type check: passed
- ✅ Convex codegen: passed


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
