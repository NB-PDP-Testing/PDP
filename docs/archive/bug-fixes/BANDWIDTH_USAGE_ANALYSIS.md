# Convex Bandwidth Usage Analysis

## Problem
Database Bandwidth: **1.18 GB / 1 GB** (18% over limit!)
Database Storage: Only 3.09 MB

This indicates **inefficient data fetching**, not storage issues.

## Root Causes Found

### 1. Unpaginated Backend Queries (Critical)

#### `packages/backend/convex/models/players.ts` - **Highest Risk**
- `getAllPlayers()` - Returns ALL players across entire database (no filters!)
- `getPlayersByOrganization()` - Returns all org players (unbounded)
- `getPlayersByTeam()` - Returns all team players (unbounded)
- `getPlayersByAgeGroup()` - Returns all players for age group (unbounded)
- `getPlayersBySport()` - Returns all players for sport (unbounded)
- `getPlayerCountForTeam()` - Fetches all players just to count them
- `searchPlayers()` - Returns all matching players (unbounded)

**Impact**: If there are 100 players with 10KB each, every query transfers 1MB. With frequent renders, this adds up FAST.

#### `packages/backend/convex/models/orgJoinRequests.ts`
- `getPendingRequestsForOrg()` - Returns all pending requests (unbounded)
- `getUserJoinRequests()` - Returns all user requests (unbounded)
- `getUserPendingRequests()` - Returns all pending requests (unbounded)

**Impact**: Called on every admin page load and probably every few seconds if polling.

#### `packages/backend/convex/models/voiceNotes.ts`
- `getVoiceNotesByOrgId()` - Returns all voice notes (unbounded)
- `getVoiceNotesByCoach()` - Returns all coach notes (unbounded)
- `getAllVoiceNotesWithoutInsights()` - Returns ALL voice notes across database!

### 2. Frequent Re-fetching Components

#### `apps/web/src/components/org-selector.tsx`
- Calls `useCurrentUser()` on EVERY render
- Mounted in header = re-queries constantly
- User data unlikely to change frequently

#### `apps/web/src/app/orgs/[orgId]/admin/page.tsx`
- Runs 3 unbounded queries on every load:
  - `getPendingRequestsForOrg`
  - `getPlayersByOrganization` 
  - `getMemberCountsByRole`
- Admin dashboard = frequently visited page
- No caching strategy

### 3. Development Amplification
- Hot reload during dev = every save triggers all queries
- Multiple browser tabs = multiplicative effect
- Each component mount = full data refetch

## Estimated Bandwidth Per Page Load

Assuming minimal data (10 players, 5 requests, 3 members):
- Player query: ~50KB
- Join requests: ~20KB
- Member counts: ~10KB
- User query (org selector): ~5KB

**Per page load**: ~85KB
**With 10 page loads**: 850KB
**With hot reload (100+ times)**: 8.5MB+
**Over development session**: Easily 1GB+

## Critical Fixes Needed

### Immediate (Stop the Bleeding)
1. Add `.take(50)` to ALL `.collect()` queries
2. Implement pagination for player listings
3. Remove `getAllPlayers()` query entirely
4. Add indexes to speed up filtered queries

### Short-term (Optimize)
1. Implement proper pagination UI
2. Add query result caching
3. Use `useMemo` for query arguments
4. Lazy load data when possible

### Long-term (Architecture)
1. Implement virtual scrolling for long lists
2. Add query de-duplication
3. Implement stale-while-revalidate pattern
4. Consider aggregation queries for counts

