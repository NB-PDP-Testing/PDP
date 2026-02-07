# ADR-VN2-014: Claims Viewer Access Control

**Date:** 2026-02-06
**Status:** Accepted
**Context:** Phase 4, Story US-VN-016

## Context and Problem Statement

The claims viewer at `/platform/v2-claims` is a debug tool for platform staff to inspect extracted claims. It needs to display claims across all organizations. The question is: what level of access control should be enforced, and should queries be org-scoped or unrestricted?

## Decision Drivers

- The claims viewer is a platform staff debug tool, not a production user feature
- Claims contain coach observations about players -- sensitive data
- Platform staff already have unrestricted access to other debug tools (AI config, etc.)
- The existing pattern at `/platform/ai-config` uses `useCurrentUser()` but does not enforce `isPlatformStaff` server-side

## Considered Options

### Option 1: Client-side auth check only (match ai-config pattern)
**Pros:** Consistent with existing platform pages. Simple implementation. Platform routes already have layout-level auth guard.
**Cons:** Public queries could theoretically be called by any authenticated user who knows the API.

### Option 2: Server-side auth check on all public queries
**Pros:** Defense in depth. Queries verify the caller is platform staff.
**Cons:** Requires passing user identity to queries. Adds complexity. The platform page layout already guards access.

### Option 3: Make all claims viewer queries internal, expose via HTTP action
**Pros:** No public query exposure at all.
**Cons:** Breaks Convex real-time subscription model. Overengineered for a debug tool.

## Decision Outcome

**Chosen Option:** Option 1 -- Client-side auth check matching the ai-config pattern, with one addition.

**Rationale:** This is a debug tool for internal use. The platform layout already guards access to `/platform/*` routes. The `getRecentArtifacts` and `getRecentClaims` public queries return data ordered by creation time with a limit cap, which is appropriate for a debug tool. Server-side auth enforcement can be added in a future phase if the claims viewer evolves into a production feature.

However, the `getClaimsByOrgAndCoach` query (already defined in US-VN-015) requires `organizationId` + `coachUserId` args, which provides implicit scoping. For the debug page, a simpler `getRecentClaims` query that returns the most recent claims across all orgs is more appropriate.

## Implementation Notes

- Claims viewer page: `apps/web/src/app/platform/v2-claims/page.tsx`
- Uses `useCurrentUser()` for auth display (following ai-config pattern)
- Uses `useQuery(api.models.voiceNoteArtifacts.getRecentArtifacts)` for artifact list
- Uses `useQuery(api.models.voiceNoteClaims.getRecentClaims)` for claims list
- Both queries have configurable limits (default 50/100, max 200/500)
- `getRecentArtifacts` uses `by_status_and_createdAt` index, ordered desc -- note this means it filters by status. For a debug tool that wants ALL artifacts regardless of status, Ralph should use `.order("desc").take(limit)` without index (table scan is acceptable for small debug queries with hard limit). Alternatively, use the `by_senderUserId_and_createdAt` index -- but this requires a userId. The simplest approach is a plain `.order("desc").take(limit)` since this is a capped debug query.
- `getRecentClaims` can use `.order("desc").take(limit)` similarly

## Consequences

**Positive:** Simple implementation. Consistent with existing platform debug pages. Real-time updates via Convex subscriptions.

**Negative:** Public queries are technically accessible to any authenticated user. Acceptable for a debug tool with capped results.

**Risks:** If claims data grows very large, the unbounded table scan in `getRecentArtifacts` could slow down. Mitigation: the hard limit (200 max) prevents this from being a problem at any reasonable scale.
