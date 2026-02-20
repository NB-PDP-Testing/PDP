# Phase 9 Week 1 - Collaboration Foundations + AI Copilot Backend

> Auto-generated documentation - Last updated: 2026-01-30 22:30

## Status

- **Branch**: `ralph/team-collaboration-hub-p9`
- **Progress**: 8 / 8 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P9-001: Create teamCollaboration Backend Model

Create foundation file with Better Auth adapter pattern.

**Acceptance Criteria:**
- Create packages/backend/convex/models/teamCollaboration.ts
- File exports placeholder queries/mutations
- CRITICAL: All functions use Better Auth adapter pattern: ctx.runQuery(components.betterAuth.adapter.findOne, {...})
- Proper validators (args + returns)
- Type check passes
- Run npx -w packages/backend convex codegen

### US-P9-002: Create Database Tables

Add insightComments, insightReactions, teamActivityFeed, teamHubPresence tables with indexes.

**Acceptance Criteria:**
- Modify packages/backend/convex/schema.ts
- Add insightComments table (with priority: critical/important/normal)
- Add insightReactions table
- Add teamActivityFeed table (with priority field)
- Add teamHubPresence table
- Add all indexes (by_insight, by_team_priority, by_user_and_team, etc.)
- Run Convex schema push
- Type check passes

### US-P9-003: Implement Presence Backend

Real-time presence tracking (updatePresence, getTeamPresence).

**Acceptance Criteria:**
- Modify teamCollaboration.ts
- Implement updatePresence mutation (args: userId, organizationId, teamId, currentView)
- Implement getTeamPresence query (args: teamId, organizationId)
- CRITICAL: Use Better Auth adapter for user lookup
- Auto-calculate status (active <5min, idle 5-15min, away >15min)
- Test in Convex dashboard
- Type check passes

### US-P9-004: Create Presence Indicators Component

UI showing online coaches with avatars and tooltips.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/coach/team-hub/components/presence-indicators.tsx
- Shows avatars (max 5, then +N)
- Tooltip with name, current view, last active
- Real-time updates via useQuery
- Green ring for active, gray for idle
- Exclude current user
- Use skeleton while loading
- Type check passes
- REQUIRED: Visual verification using dev-browser (see presence update in real-time)

### US-P9-005: Implement Comment Backend

Backend for comments with threading and priority detection.

**Acceptance Criteria:**
- Modify teamCollaboration.ts
- Implement getInsightComments query
- Implement addComment mutation (supports parentCommentId for threading)
- CRITICAL: Use Better Auth adapter for user lookups
- Auto-determine priority from content keywords (injury/urgent=critical, important/concern=important, else=normal)
- Create activity feed entry on comment (placeholder for US-P9-018)
- Test in Convex dashboard
- Type check passes

### US-P9-006: Implement Reactions Backend

Backend for like/helpful/flag reactions.

**Acceptance Criteria:**
- Modify teamCollaboration.ts
- Implement toggleReaction mutation (like/helpful/flag)
- Implement getReactions query
- CRITICAL: Use Better Auth adapter
- Prevent duplicate reactions (check index by_insight_and_user before insert)
- Return added or removed status
- Test in Convex dashboard
- Type check passes

### US-P9-007: Create InsightComments UI Component

Display comments with real-time updates.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx
- Displays comments chronologically (oldest first)
- Shows avatar, name, content, timestamp (relative: 5 min ago)
- Uses ListSkeleton while loading (3 rows)
- Empty state: No comments yet - be the first to share your thoughts!
- Real-time updates via useQuery (new comments appear instantly)
- Type check passes
- REQUIRED: Visual verification using dev-browser

### US-P9-008: Create CommentForm Component

Form for posting comments with auto-expand textarea.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx
- Textarea with auto-expand (grows with content, max 200px)
- Post button (enabled only when text entered)
- Calls addComment mutation from teamCollaboration
- Form clears after successful submit
- Loading state on button (spinner + disabled)
- Error handling with toast (sonner)
- Type check passes
- REQUIRED: Visual verification - form works, comment appears in list after submit


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Placeholder functions should prefix unused params with underscore (`_ctx`, `_args`) to avoid lint errors
- Remove `async` from handlers that don't await anything (lint rule: `useAwait`)
- Return type literals need `as const` when returning union types (e.g., `{ action: "added" as const }`)
- Initial commit failed due to lint errors for unused parameters
- Fixed by removing `async` and prefixing params with `_`
- None - this is a foundation file for future stories
--
- Convex automatically adds `_creationTime` to ALL indexes - never include it explicitly
- Index names must be unique within a table (duplicate field lists cause error)
- Use `by_org` not `by_org_and_creation` since creation time is added automatically

**Gotchas encountered:**
- Initial commit failed due to lint errors for unused parameters
- Fixed by removing `async` and prefixing params with `_`
- None - this is a foundation file for future stories
- [x] US-P9-001 complete
- [ ] US-P9-002: Create database tables (schema.ts)
--
- Initial codegen failed: "IndexFieldsContainCreationTime" - removed explicit `_creationTime` from index
- Second codegen failed: "IndexNotUnique" - removed duplicate `by_org_and_time` index (redundant with `by_org`)
- These tables are referenced in teamCollaboration.ts placeholder functions
- Next step (US-P9-003) will implement presence queries using teamHubPresence table

### Files Changed

- packages/backend/convex/models/teamCollaboration.ts (+156, -0) [NEW]
- packages/backend/convex/_generated/api.d.ts (auto-generated)
- scripts/ralph/prd.json (+1, -1) [marked US-P9-001 passes: true]
- ✅ Type check: passed
- ✅ Linting: passed (after prefixing unused params with underscore)
- ✅ Convex codegen: successful
- ✅ No browser verification needed (backend-only change)
- Placeholder functions should prefix unused params with underscore (`_ctx`, `_args`) to avoid lint errors
- Remove `async` from handlers that don't await anything (lint rule: `useAwait`)
- Return type literals need `as const` when returning union types (e.g., `{ action: "added" as const }`)
- Initial commit failed due to lint errors for unused parameters
- Fixed by removing `async` and prefixing params with `_`
--
- packages/backend/convex/schema.ts (+103, -0)
- packages/backend/convex/_generated/*.ts (auto-generated)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
