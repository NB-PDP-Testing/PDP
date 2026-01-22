# Parent Experience Improvements - Phases 3-5

> Auto-generated documentation - Last updated: 2026-01-22 19:17

## Status

- **Branch**: `ralph/coach-parent-summaries-p4`
- **Progress**: 5 / 19 stories complete
- **Phase Status**: 🔄 In Progress

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
