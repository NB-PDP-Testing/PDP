# Parent Experience Improvements - Phases 3-5

> Auto-generated documentation - Last updated: 2026-01-22 19:57

## Status

- **Branch**: `ralph/coach-parent-summaries-p4`
- **Progress**: 19 / 19 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Move Coach Updates section to top of Player Passport for parents

As a parent, I want to see coach updates prominently at the top of the passport, not buried after skills and goals.

**Acceptance Criteria:**
- Open apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx
- Find the ParentSummariesSection rendering (around line 321 for parents)
- Move it to appear right after BasicInformationSection (before SkillRadarChart)
- Ensure only parent role sees this order (check permissions.isParent)
- Keep coach/admin order unchanged (they see VoiceInsightsSectionImproved instead)
- Verify on page: http://localhost:3000/orgs/[orgId]/players/[playerId]
- Type check passes: npm run check-types
- Lint passes: npx ultracite fix

### US-002: Add Active/History tab state to ParentSummariesSection

As a parent, I want to filter messages by Active (unread) and History (read) so I can focus on new items.

**Acceptance Criteria:**
- Open apps/web/src/app/orgs/[orgId]/players/[playerId]/components/parent-summaries-section.tsx
- Add state: const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
- Split playerSummaries into two arrays using useMemo:
-   const activeSummaries = playerSummaries.filter(s => !s.acknowledgedAt)
-   const historySummaries = playerSummaries.filter(s => s.acknowledgedAt)
- Counts should update automatically (activeSummaries.length, historySummaries.length)
- No UI changes yet (next story)
- Type check passes

### US-003: Add Tabs UI to ParentSummariesSection with Active/History

As a parent, I want tabs to switch between Active and History messages.

**Acceptance Criteria:**
- Import Tabs, TabsList, TabsTrigger, TabsContent from @/components/ui/tabs
- Wrap the existing summaries display in Tabs component
- Add TabsList with two triggers: Active ({count}) and History ({count})
- Show activeSummaries in Active TabsContent
- Show historySummaries in History TabsContent
- Active tab selected by default
- Badge on Active tab if activeSummaries.length > 0 (use Badge variant='destructive')
- Reuse existing renderSummaries() function or inline the summary cards
- Type check passes
- Test: Navigate to passport, verify tabs work, counts accurate

### US-004: Add Mark as Read button to summary cards in ParentSummariesSection

As a parent viewing passport, I want to acknowledge messages from the passport view, not just dashboard.

**Acceptance Criteria:**
- Still in parent-summaries-section.tsx
- Import useMutation from convex/react
- Import toast from sonner
- Add mutation: const acknowledgeSummary = useMutation(api.models.coachParentSummaries.acknowledgeParentSummary)
- Create handler: const handleAcknowledge = async (summaryId) => { await acknowledgeSummary({ summaryId }); toast.success('Marked as read'); }
- In summary card rendering (both tabs), add Button with Check icon
- Button text: 'Mark as Read', size='sm', variant='outline'
- Only show button if !summary.acknowledgedAt (hide in History tab)
- Disable button during acknowledgement (loading state)
- After acknowledgement, card should move to History tab automatically (query refetches)
- Type check passes
- Test: Click button, verify toast, check History tab shows it

### US-005: Create shared CoachAvatar component for reuse

As a developer, I need a reusable component to display coach avatars/initials.

**Acceptance Criteria:**
- Create apps/web/src/components/shared/coach-avatar.tsx
- Add 'use client' directive
- Props: coachName (string), size? ('sm' | 'md' | 'lg', default 'md')
- Extract initials: first letter of first + last name (max 2 letters)
- Render div with rounded-full, bg-primary/10, text-primary
- Size classes: sm='h-8 w-8 text-sm', md='h-10 w-10 text-base', lg='h-12 w-12 text-lg'
- Center text with flex items-center justify-center
- Example: 'John Smith' -> 'JS'
- Handle edge cases: single name, empty name (show '?')
- Export as default
- Type check passes

### US-006: Add coach avatars to passport summary cards

As a parent, I want to see who each message is from with a visual avatar.

**Acceptance Criteria:**
- In parent-summaries-section.tsx, import CoachAvatar from @/components/shared/coach-avatar
- In summary card rendering, add CoachAvatar component
- Pass summary.coachName as coachName prop
- Position avatar to left of summary content (use flex layout)
- Size: 'md' for desktop, 'sm' for mobile (responsive)
- Gap between avatar and content: gap-3
- Verify coachName is available (already in query response)
- Type check passes
- Test: View passport, see initials next to each message

### US-007: Create ChildSummaryCard component shell

As a developer, I need a component to show child overview stats on parent dashboard.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/parents/components/child-summary-card.tsx
- Add 'use client' directive
- Props: player ({ _id, firstName, lastName }), unreadCount (number), orgId (string)
- Import Card, CardHeader, CardContent, CardTitle from @/components/ui/card
- Import Button from @/components/ui/button
- Import Badge from @/components/ui/badge
- Render Card with player name in CardHeader
- Show unreadCount as Badge if > 0 (variant='destructive')
- Add placeholder text for stats (will fetch in next story)
- Add 'View Passport' Button in CardContent
- No onClick handler yet (just render the button)
- Type check passes

### US-008: Add passport stats query and navigation to ChildSummaryCard

As a parent, I want to see my child's average skill rating and navigate to their passport.

**Acceptance Criteria:**
- In child-summary-card.tsx, import useQuery from convex/react
- Import useRouter from next/navigation
- Add query: useQuery(api.models.sportPassports.getFullPlayerPassportView, { playerIdentityId: player._id, organizationId: orgId })
- Calculate average skill rating using useMemo:
-   const avgSkillRating = passportData?.passports?.[0]?.skills ? (skills.reduce((sum, s) => sum + s.rating, 0) / skills.length).toFixed(1) : null
- Display avgSkillRating in CardContent with Star icon
- Add onClick to button: router.push(`/orgs/${orgId}/players/${player._id}`)
- Show loading skeleton while query resolves (Loader2 icon or skeleton div)
- Handle case where no passport data (show 'N/A' for rating)
- Type check passes
- Test: Dashboard shows ratings, clicking navigates to passport

### US-009: Add child summary cards grid to parent dashboard

As a parent, I want to see all my children at a glance with their stats.

**Acceptance Criteria:**
- Open apps/web/src/app/orgs/[orgId]/parents/page.tsx
- Import ChildSummaryCard from ./components/child-summary-card
- Find where summariesData is used (currently passed to CoachFeedback)
- Add grid above CoachFeedback component:
-   <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
- Map over summariesData to render ChildSummaryCard for each child
- Calculate unreadCount per child: sum all sportGroups unreadCount
- Pass player, unreadCount, orgId props
- Only render grid if summariesData has children (conditional)
- Type check passes
- Test: Dashboard shows child cards above messages

### US-010: Create UnifiedInboxView component for all messages

As a parent, I want to see all messages across all children in one chronological list.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/parents/components/unified-inbox-view.tsx
- Add 'use client' directive
- Props: messages (array of summaries with childName and sportName added)
- Import ParentSummaryCard from ./parent-summary-card
- Render messages in a vertical list (space-y-3)
- Each message shows:
-   - Child name above the card (text-sm text-muted-foreground)
-   - Sport badge (use Badge component)
-   - The actual summary card using ParentSummaryCard
- Messages already sorted by createdAt desc (newest first)
- Type check passes

### US-011: Add view toggle to parent dashboard for By Child vs All Messages

As a parent, I want to switch between grouped and unified message views.

**Acceptance Criteria:**
- In apps/web/src/app/orgs/[orgId]/parents/page.tsx
- Import UnifiedInboxView from ./components/unified-inbox-view
- Import Button from @/components/ui/button
- Add state: const [view, setView] = useState<'by-child' | 'unified'>('by-child')
- Create flattened messages array using useMemo:
-   - Map over summariesData
-   - For each child, map over sportGroups
-   - For each sport, map over summaries
-   - Add childName and sportName to each summary
-   - Sort by createdAt desc
- Add toggle buttons above messages section:
-   <div className='flex gap-2 mb-4'>
-     <Button variant={view === 'by-child' ? 'default' : 'outline'} onClick={() => setView('by-child')}>By Child</Button>
-     <Button variant={view === 'unified' ? 'default' : 'outline'}>All Messages ({allMessages.length})</Button>
-   </div>
- Conditionally render: {view === 'unified' ? <UnifiedInboxView messages={allMessages} /> : <CoachFeedback ... />}
- Type check passes
- Test: Toggle works, both views display correctly

### US-012: Create ActionItemsPanel component for unread alerts

As a parent, I want a prominent alert when I have unread messages.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/parents/components/action-items-panel.tsx
- Add 'use client' directive
- Props: unreadCount (number), onReviewClick (() => void)
- Import Alert, AlertTitle, AlertDescription from @/components/ui/alert
- Import Button from @/components/ui/button
- Import AlertCircle icon from lucide-react
- Return null if unreadCount === 0
- Render Alert with:
-   - className: 'border-blue-500 bg-blue-50 mb-6'
-   - AlertCircle icon with text-blue-600
-   - AlertTitle: 'You have {unreadCount} new coach update{s}'
-   - AlertDescription with text and Button: 'Review Now'
-   - Button onClick calls onReviewClick prop
- Type check passes

### US-013: Add ActionItemsPanel to parent dashboard with scroll behavior

As a parent, clicking Review Now should scroll me to the messages section.

**Acceptance Criteria:**
- In apps/web/src/app/orgs/[orgId]/parents/page.tsx
- Import ActionItemsPanel from ./components/action-items-panel
- Import useRef from react
- Create ref: const messagesRef = useRef<HTMLDivElement>(null)
- Calculate total unread count from summariesData (sum all unreadCounts)
- Render ActionItemsPanel at top of page (above child cards)
- Pass unreadCount and onReviewClick handler
- Handler: messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
- Add ref to messages section: <div ref={messagesRef}>
- Type check passes
- Test: Click Review Now, page scrolls to messages smoothly

### US-014: Add coach avatars to dashboard summary cards

As a parent, I want to see coach avatars on the dashboard messages too.

**Acceptance Criteria:**
- Open apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback.tsx
- Import CoachAvatar from @/components/shared/coach-avatar
- In summary card rendering (line ~140-150), add CoachAvatar
- Position before summary content with gap-3
- Pass summary.coachName prop
- Size: 'md'
- Ensure layout doesn't break (use flex)
- Type check passes
- Test: Dashboard shows coach initials next to each message

### US-015: Update all date displays to use relative formatting

As a parent, I want recent messages to show '2 hours ago' instead of absolute dates.

**Acceptance Criteria:**
- Install date-fns if not present: npm install date-fns (check package.json first)
- Files to update:
-   1. apps/web/src/app/orgs/[orgId]/parents/components/parent-summary-card.tsx
-   2. apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback.tsx
-   3. apps/web/src/app/orgs/[orgId]/players/[playerId]/components/parent-summaries-section.tsx
- Import: import { formatDistanceToNow, format } from 'date-fns'
- For recent messages (< 7 days), use:
-   {formatDistanceToNow(new Date(summary.createdAt), { addSuffix: true })}
- For older messages (> 7 days), use:
-   {format(new Date(summary.createdAt), 'MMM d, yyyy')}
- Add logic: const isRecent = Date.now() - summary.createdAt < 7 * 24 * 60 * 60 * 1000
- Type check passes
- Test: Recent messages show 'X hours/days ago', old messages show date

### US-016: Add category-specific icons to summary cards

As a parent, I want visual icons to quickly identify message types.

**Acceptance Criteria:**
- Create icon mapping object at top of component:
-   const categoryIcons = {
-     skill_rating: Target,
-     skill_progress: TrendingUp,
-     injury: Heart,
-     behavior: AlertCircle,
-     performance: Trophy,
-     attendance: Calendar
-   }
- Import all icons from lucide-react
- Apply to these files:
-   1. parent-summary-card.tsx
-   2. coach-feedback.tsx (if not using parent-summary-card)
-   3. parent-summaries-section.tsx
- Get category from summary.privateInsight.category
- Render icon next to category badge or content
- Size: h-4 w-4
- Color based on sentiment (positive=green-600, concern=yellow-600, neutral=blue-600)
- Fallback to MessageSquare icon if category unknown
- Type check passes
- Test: Different message types show different icons

### US-017: Add responsive classes for mobile optimization

As a parent on mobile, all pages should work smoothly on small screens.

**Acceptance Criteria:**
- Files to update:
-   1. apps/web/src/app/orgs/[orgId]/parents/page.tsx
-   2. apps/web/src/app/orgs/[orgId]/parents/components/child-summary-card.tsx
-   3. apps/web/src/app/orgs/[orgId]/parents/components/unified-inbox-view.tsx
-   4. apps/web/src/app/orgs/[orgId]/players/[playerId]/components/parent-summaries-section.tsx
- Ensure all grids use: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Ensure flex containers use: flex-col sm:flex-row for button groups
- Ensure text sizes min 14px (text-sm minimum)
- Ensure touch targets min 44px (use p-4 or size='default' on buttons)
- Add max-w-full to images and cards to prevent overflow
- Test at 375px width (iPhone SE), 768px (tablet), 1920px (desktop)
- Type check passes
- Use browser dev tools responsive mode to verify

### US-018: Add smooth transitions and hover effects

As a parent, UI interactions should feel polished with smooth animations.

**Acceptance Criteria:**
- Add to all Card components: className='transition-all duration-200 hover:shadow-lg hover:scale-[1.02]'
- Add to all Button components: className includes 'transition-colors duration-200'
- NEW badges: Add 'animate-pulse' class for attention
- Tab switching: Tabs component already has transitions (verify they work)
- Cards in grid: Add 'transition-transform' to prevent layout shift
- Files to update:
-   1. child-summary-card.tsx
-   2. parent-summary-card.tsx
-   3. coach-feedback.tsx
-   4. parent-summaries-section.tsx
- Ensure no jank (test on 60fps monitor)
- Type check passes
- Test: Hover over cards, click buttons, verify smooth

### US-019: Final testing and polish pass

As a developer, I need to ensure all features work end-to-end.

**Acceptance Criteria:**
- Run full type check: npm run check-types (MUST pass)
- Run lint: npx ultracite fix (MUST pass)
- Manual testing checklist:
-   - Parent dashboard loads correctly
-   - Child cards show accurate stats
-   - View toggle (By Child / All Messages) works
-   - Action panel appears when unread > 0
-   - Clicking Review Now scrolls to messages
-   - Mark as Read works from dashboard
-   - Navigate to passport from child card
-   - Passport shows Coach Updates at top (not buried)
-   - Active/History tabs work in passport
-   - Mark as Read works from passport
-   - Coach avatars display everywhere
-   - Dates show relative format (2 hours ago)
-   - Category icons display correctly
-   - Mobile view (375px) works smoothly
-   - No console errors
-   - Real-time updates work (open 2 browser windows, mark read in one, see update in other)
- Document any issues in progress.txt
- Create list of remaining polish items (if any) for future


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
