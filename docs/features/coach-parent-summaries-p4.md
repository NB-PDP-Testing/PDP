# Coach-Parent AI Summaries - Phase 4 (Enhanced Parent Experience)

> Auto-generated documentation - Last updated: 2026-01-20 22:37

## Status

- **Branch**: `ralph/coach-parent-summaries-p4`
- **Progress**: 10 / 20 stories complete
- **Phase Status**: 🔄 In Progress

## Completed Features

### US-001: Add summaryShares table

As a developer, I need to track when parents share summaries.

**Acceptance Criteria:**
- Add summaryShares table to schema.ts after coachParentSummaries table
- Fields: summaryId (v.id('coachParentSummaries')), guardianIdentityId (v.id('guardianIdentities')), sharedAt (v.number()), shareDestination (v.union of literals)
- Add indexes: by_summary (summaryId), by_guardian (guardianIdentityId)
- Typecheck passes: npx -w packages/backend convex codegen

### US-002: Implement trackShareEvent mutation

As the system, I need to track share events for analytics.

**Acceptance Criteria:**
- Add trackShareEvent mutation to coachParentSummaries.ts
- Args: summaryId (v.id('coachParentSummaries')), shareDestination (v.union of 3 literals)
- Get authenticated user via authComponent.safeGetAuthUser(ctx)
- Look up guardianIdentity via by_userId index: ctx.db.query('guardianIdentities').withIndex('by_userId', q => q.eq('userId', user.userId)).first()
- Fetch summary to get playerIdentityId
- Verify guardian has access via by_guardian_and_player index on guardianPlayerLinks
- Insert summaryShares record: { summaryId, guardianIdentityId, sharedAt: Date.now(), shareDestination }
- Returns: v.null()
- Typecheck passes

### US-003: Implement getPassportLinkForSummary query

As a parent, I want to navigate to relevant passport section.

**Acceptance Criteria:**
- Add getPassportLinkForSummary query to coachParentSummaries.ts
- Args: summaryId (v.id('coachParentSummaries'))
- Fetch summary via ctx.db.get(args.summaryId)
- Get category from summary.privateInsight.category
- Map category to passport section: skill_rating->'skills', skill_progress->'goals', injury->'medical', behavior->'overview', default->'overview'
- Also check sensitivityCategory: if 'injury' use 'medical', if 'behavior' use 'overview'
- Build URL: `/orgs/${summary.organizationId}/parents/children/${summary.playerIdentityId}/passport?section=${section}`
- Returns: v.object({ section: v.string(), url: v.string() })
- Typecheck passes

### US-004: Create useTabNotification hook

As a parent, I want browser tab to show unread count.

**Acceptance Criteria:**
- Create apps/web/src/hooks/use-tab-notification.ts
- Accept unreadCount: number parameter
- Use useEffect to update document.title
- Format: count > 0 ? `(${count}) Messages | PlayerARC` : 'PlayerARC'
- Store original title in useRef and restore on unmount
- Add cleanup function in useEffect return
- Typecheck passes

### US-005: Create TabNotificationProvider component

As a developer, I need to wrap app with tab notification logic.

**Acceptance Criteria:**
- Create apps/web/src/components/providers/tab-notification-provider.tsx
- Props: children (ReactNode), orgId (string)
- Use useSession from @/lib/auth-client to get current session
- Check if activeFunctionalRole === 'parent' (from session)
- Use useQuery(api.models.coachParentSummaries.getParentUnreadCount, { organizationId: orgId }) when parent
- Pass count to useTabNotification hook
- Render children unchanged
- Return null for count query if not parent role
- Typecheck passes

### US-006: Add TabNotificationProvider to app layout

As a parent, tab notifications should work across the app.

**Acceptance Criteria:**
- Import TabNotificationProvider in apps/web/src/app/orgs/[orgId]/layout.tsx
- Wrap children with TabNotificationProvider
- Pass orgId from params.orgId
- Provider should be inside ConvexClientProvider but wrapping the main content
- Typecheck passes

### US-007: Create MessagePassportLink component

As a parent, I want to click through to passport from a message.

**Acceptance Criteria:**
- Create apps/web/src/components/parent/message-passport-link.tsx
- Props: summaryId (Id<'coachParentSummaries'>), className (optional string)
- Show 'View in Passport' text with ArrowRight icon from lucide-react
- Use Button component with variant='link' and size='sm'
- Typecheck passes

### US-008: Wire MessagePassportLink navigation

As a parent, clicking passport link navigates correctly.

**Acceptance Criteria:**
- In MessagePassportLink, use useQuery to call getPassportLinkForSummary with summaryId
- Add onClick handler that uses router.push(linkData.url)
- Show loading state while query resolves (disabled button or spinner)
- Handle case where query returns null gracefully
- Use useRouter from next/navigation
- Typecheck passes

### US-009: Add MessagePassportLink to ParentSummaryCard

As a parent, summary cards show passport links.

**Acceptance Criteria:**
- Edit apps/web/src/app/orgs/[orgId]/parents/components/parent-summary-card.tsx
- Add summaryId to component props type
- Import MessagePassportLink component
- Render MessagePassportLink in the card footer/actions area
- Pass summary._id as summaryId prop
- Typecheck passes

### US-010: Install satori and resvg dependencies

As a developer, I need image generation libraries.

**Acceptance Criteria:**
- Run: npm install satori @resvg/resvg-js -w packages/backend
- Verify packages appear in packages/backend/package.json dependencies
- Verify packages are installed in node_modules
- Run: npm run check-types to ensure no type errors


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Biome auto-removes unused imports during Edit operations - use Write tool for new files to apply import and usage in one operation
- Parent-specific features should be added to `/parents/layout.tsx`, not the global org layout
- Parent sidebar doesn't check roles - the layout routing handles role-based access control
- When adding provider + import with Edit tool, Biome removes import if usage isn't in same edit - had to use Write to apply both at once
- Tab notification depends on getParentUnreadCount query (already existed from Phases 1-3)
- PassportLink mapping requires privateInsight.category and sensitivityCategory from summary record
--
- Defensive session checks prevent errors when components render before auth is ready
- Use `const shouldQuery = !!session?.user;` then `shouldQuery ? { args } : "skip"` pattern
- Biome prefers `type` over `interface` for consistency

**Gotchas encountered:**
- When adding provider + import with Edit tool, Biome removes import if usage isn't in same edit - had to use Write to apply both at once
- Tab notification depends on getParentUnreadCount query (already existed from Phases 1-3)
- PassportLink mapping requires privateInsight.category and sensitivityCategory from summary record
- [ ] US-007 - Create MessagePassportLink component
- [ ] US-008 - Wire MessagePassportLink navigation
- [ ] US-009 - Add MessagePassportLink to ParentSummaryCard
--
- Progress.txt CODE REVIEW FEEDBACK mentioned checking `activeFunctionalRole`, but:
- TabNotificationProvider depends on authClient.useSession for defensive checks
- Parent layout location matters - provider is in parent-specific layout, not global org layout

### Files Changed

- packages/backend/convex/schema.ts (+14 lines) - Added summaryShares table
- packages/backend/convex/models/coachParentSummaries.ts (+108 lines) - Added trackShareEvent mutation and getPassportLinkForSummary query
- apps/web/src/hooks/use-tab-notification.ts (new file, 31 lines)
- apps/web/src/providers/tab-notification-provider.tsx (new file, 34 lines)
- apps/web/src/app/orgs/[orgId]/parents/layout.tsx (+3 lines) - Wrapped with TabNotificationProvider
- packages/backend/package.json (+2 dependencies)
- package-lock.json (updated)
- ✅ Type check: passed
- ✅ Linting: passed (pre-commit hook ran successfully)
- ⏳ Browser verification: Not done yet (will test after more UI components built)
- Biome auto-removes unused imports during Edit operations - use Write tool for new files to apply import and usage in one operation
- Parent-specific features should be added to `/parents/layout.tsx`, not the global org layout
- Parent sidebar doesn't check roles - the layout routing handles role-based access control
--
- apps/web/src/components/parent/message-passport-link.tsx (new file, 70 lines)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
