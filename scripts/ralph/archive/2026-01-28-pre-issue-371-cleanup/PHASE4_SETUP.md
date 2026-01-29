# Phase 4 Setup - Enhanced Parent Experience

## Branch
`ralph/coach-parent-summaries-p4`

## PRD
`scripts/ralph/prds/coach-parent-summaries-phase4.prd.json`

## Overview
Phase 4 focuses on enhancing the parent experience with:
1. **Browser Tab Notifications** - Unread count shows in browser tab title (US-004 to US-006)
2. **Shareable Images** - Generate branded image cards for sharing (US-010 to US-018)
3. **Passport Deep Links** - Link from summaries to relevant passport sections (US-003, US-007 to US-009)
4. **Share Tracking** - Track share events for analytics (US-001, US-002)
5. **UX Enhancements** - Sport icons and unread badges (US-019, US-020)

## Context from Phases 1-3

### Existing Tables
- `coachParentSummaries` - AI-generated summaries with sensitivityCategory, status
- `parentSummaryViews` - Tracks when parents view summaries
- `guardianIdentities` - Parent records linked to users
- `guardianPlayerLinks` - Parent-to-child relationships
- `coachTrustLevels` - Coach automation preferences

### Existing Queries
- `getParentUnreadCount(organizationId)` - Badge count for parents
- `getParentSummariesByChildAndSport(organizationId)` - Grouped summaries
- `markSummaryViewed(summaryId, viewSource)` - Records parent view

### Existing Components
- `parent-summary-card.tsx` - Individual summary card
- `coach-feedback.tsx` - Groups summaries by sport/child
- `parent-sidebar.tsx` - Already fetches unread count

### Key Patterns to Follow
- Use `.withIndex()` for all queries, never `.filter()`
- All mutations/queries need args and returns validators
- Auth check: `authComponent.safeGetAuthUser(ctx)` pattern
- Guardian lookup via `guardianIdentities` table with `by_userId` index

## User Stories (20 total)

### Priority 1-3: Backend (Schema & Queries)
- US-001: Add summaryShares table
- US-002: trackShareEvent mutation
- US-003: getPassportLinkForSummary query

### Priority 4-6: Tab Notifications
- US-004: useTabNotification hook
- US-005: TabNotificationProvider component
- US-006: Add provider to app layout

### Priority 7-9: Passport Links
- US-007: MessagePassportLink component
- US-008: Wire navigation logic
- US-009: Add to ParentSummaryCard

### Priority 10-13: Image Generation Backend
- US-010: Install satori/resvg
- US-011: generateShareableImage action
- US-012: Design image template
- US-013: Store in Convex storage

### Priority 14-18: Share Modal UI
- US-014: ShareModal component
- US-015: Image preview
- US-016: Download button
- US-017: Native share
- US-018: Add share button to cards

### Priority 19-20: UX Enhancements
- US-019: Sport icons
- US-020: Unread badges per sport

## Getting Started

Run Ralph with:
```bash
./scripts/ralph/agents/start-all.sh
```

Or start implementing US-001 (summaryShares table) in `packages/backend/convex/schema.ts`.
