# Phase 9 Week 1 - Review & Testing Guide

## Quick Review Commands

### 1. See All Changes
```bash
# View all commits from this session
git log --oneline 48f8370c^..48f8370c --reverse

# See file changes summary
git diff 0a665aef..48f8370c --stat

# See actual code changes
git diff 0a665aef..48f8370c
```

### 2. Review Specific Stories

**US-P9-001: Backend Model Foundation**
```bash
git show c39e7564
# Review: packages/backend/convex/models/teamCollaboration.ts
```

**US-P9-002: Database Tables**
```bash
git show 9734f44f
# Review: packages/backend/convex/schema.ts
# Check: 4 new tables with indexes
```

**US-P9-003: Presence Backend**
```bash
git show 0fd4cf17
# Review: updatePresence, getTeamPresence implementations
```

**US-P9-004: Presence UI Component**
```bash
git show 845c761e
# Review: apps/web/src/app/orgs/[orgId]/coach/team-hub/components/presence-indicators.tsx
```

**US-P9-005: Comment Backend**
```bash
git show bc0997fd
# Review: addComment, getInsightComments implementations
```

**US-P9-006: Reactions Backend**
```bash
git show f9a571c8
# Review: toggleReaction, getReactions implementations
```

**US-P9-007: InsightComments UI**
```bash
git show 8614173b
# Review: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx
```

**US-P9-008: CommentForm UI**
```bash
git show 48f8370c
# Review: apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/comment-form.tsx
```

---

## Testing Strategy

### Phase 1: Code Review (10 min)

**Check Backend Patterns:**
```bash
# Verify Better Auth adapter usage
grep -n "components.betterAuth.adapter" packages/backend/convex/models/teamCollaboration.ts

# Verify no .filter() usage
grep -n "\.filter(" packages/backend/convex/models/teamCollaboration.ts

# Verify all functions have validators
grep -n "returns:" packages/backend/convex/models/teamCollaboration.ts
```

**Check Database Schema:**
```bash
# View new tables
grep -A 20 "insightComments:" packages/backend/convex/schema.ts
grep -A 20 "insightReactions:" packages/backend/convex/schema.ts
grep -A 20 "teamActivityFeed:" packages/backend/convex/schema.ts
grep -A 20 "teamHubPresence:" packages/backend/convex/schema.ts
```

**Check Frontend Components:**
```bash
# Verify skeleton loaders used
grep -n "Skeleton" apps/web/src/app/orgs/[orgId]/coach/team-hub/components/presence-indicators.tsx
grep -n "Skeleton" apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx

# Verify useQuery usage
grep -n "useQuery" apps/web/src/app/orgs/[orgId]/coach/team-hub/components/presence-indicators.tsx
grep -n "useQuery" apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-comments.tsx
```

---

### Phase 2: Convex Dashboard Testing (15 min)

**Test Presence Functions:**
1. Go to Convex dashboard: https://dashboard.convex.dev
2. Navigate to your project
3. Go to "Functions" tab

**Test `updatePresence`:**
```json
{
  "userId": "your-user-id",
  "organizationId": "your-org-id",
  "teamId": "your-team-id",
  "currentView": "voice-notes"
}
```
Expected: Returns null, creates presence record

**Test `getTeamPresence`:**
```json
{
  "teamId": "your-team-id",
  "organizationId": "your-org-id"
}
```
Expected: Returns array with your presence record

**Test `addComment`:**
```json
{
  "insightId": "your-insight-id",
  "content": "This is a test comment about an important issue"
}
```
Expected: Returns new comment ID, auto-detects "important" priority

**Test `getInsightComments`:**
```json
{
  "insightId": "your-insight-id"
}
```
Expected: Returns array with your comment

**Test `toggleReaction`:**
```json
{
  "insightId": "your-insight-id",
  "type": "like"
}
```
Expected: Returns { action: "added" }

**Test `getReactions`:**
```json
{
  "insightId": "your-insight-id"
}
```
Expected: Returns { like: 1, helpful: 0, flag: 0, userReactions: [...] }

---

### Phase 3: Browser Visual Testing (20 min)

**Prerequisites:**
- Dev server running on port 3000
- Dev-browser server running
- Logged in as a coach with teams

**Test Scenario 1: Presence Indicators**

Since the component exists but isn't integrated into a page yet, we need to:
1. Check if there's a team hub page that uses it
2. Or create a test page to render it

**Test Scenario 2: Comment System**

The components exist in the voice-notes folder. We need to check:
1. Is there a voice notes page that displays insights?
2. Can we integrate the comment components into an existing page?

**Files to check:**
```bash
# Find voice notes pages
find apps/web/src/app/orgs/\[orgId\]/coach -name "*voice*" -type f | grep -E "page\.tsx$"

# Find team hub pages
find apps/web/src/app/orgs/\[orgId\]/coach -name "*team*" -type f | grep -E "page\.tsx$"
```

---

### Phase 4: Integration Check (10 min)

**Check if components are being imported anywhere:**
```bash
# Search for imports of new components
grep -r "presence-indicators" apps/web/src --include="*.tsx"
grep -r "insight-comments" apps/web/src --include="*.tsx"
grep -r "comment-form" apps/web/src --include="*.tsx"
```

**Expected Result:**
- If NOT imported anywhere: Components are ready but need integration (Week 2+)
- If imported: Test the pages that use them

---

## What to Look For

### ✅ Backend Code Quality

**Must Have:**
- [ ] All functions use Better Auth adapter for user lookups
- [ ] All queries use `.withIndex()`, no `.filter()`
- [ ] All functions have `args` and `returns` validators
- [ ] Proper error handling
- [ ] Type-safe return types match validators

**Good Patterns:**
- [ ] Batch fetch + Map for N+1 prevention
- [ ] Descriptive function documentation
- [ ] Index names match query patterns

### ✅ Frontend Code Quality

**Must Have:**
- [ ] Skeleton loaders used (not spinners)
- [ ] Real-time updates via `useQuery`
- [ ] Proper loading states
- [ ] Error handling with toast notifications
- [ ] TypeScript types (no `any`)

**Good Patterns:**
- [ ] Component composition
- [ ] Proper accessibility (ARIA labels)
- [ ] Responsive design
- [ ] Organization theming applied

### ✅ Database Schema

**Must Have:**
- [ ] All 4 tables defined
- [ ] Proper indexes for query patterns
- [ ] Foreign key fields use `Id<"tableName">` type
- [ ] Required fields marked appropriately

---

## Known Status

From Ralph's notes in prd.json:
- **US-P9-004, 007, 008**: "Browser testing deferred"
  - Components created but not integrated into pages yet
  - This is OK for Week 1 - integration happens in later weeks

---

## Next Steps After Review

1. **If everything looks good:**
   - Merge to main or keep branch for Week 2
   - Update documentation
   - Prepare Week 2 stories

2. **If issues found:**
   - Document issues in progress.txt
   - Create fix tickets
   - Run Ralph on fixes if needed

3. **If want to test visually:**
   - Create integration page
   - Use dev-browser for visual verification
   - Test real-time updates with multiple browser windows
