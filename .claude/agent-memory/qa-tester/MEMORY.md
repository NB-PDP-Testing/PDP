# QA Tester Agent Memory

## Critical Pattern: Convex Actions vs Mutations

When Ralph uses Convex backend functions, he frequently confuses mutations and actions:
- Actions (`action({...})`) MUST be called with `useAction()` in frontend
- Mutations (`mutation({...})`) MUST be called with `useMutation()` in frontend
- Using `useMutation` for an action causes a runtime error (not a type error — TypeScript may not catch it)

**Always check:** For every `useMutation(api.models.X.foo)` or `useMutation(api.actions.X.foo)`, grep the backend to verify if `foo` is `mutation({...})` or `action({...})`.

Key tell: anything in `packages/backend/convex/actions/` is almost always an `action`, not a mutation.

## Navigation Verification Pattern

A page that exists but has no link to it is unusable. Always verify:
1. Does the page exist?
2. Is there a link FROM parent pages to reach it?
3. Is there a link FROM the page back to parent (breadcrumb)?

Common gap: Ralph creates oauth-setup pages but forgets to add the "Setup OAuth" button on the form that initiates the flow.

## Internal ID Display Bug

Ralph frequently displays internal IDs (organizationId, connectorId) instead of human-readable names in tables and tooltips. Always check:
- Does the UI show `organizationId` (Better Auth internal ID) where an org name should appear?
- Does the UI require a map lookup (fetch org names separately) to show names?

## Retry Buttons: TODO Pattern

Ralph sometimes adds Retry/retry buttons with `toast.info("coming soon")` stubs. Always check retry button implementations — if the PRD requires it, a stub is a FAIL.

## PRD Path vs Implementation Path

Ralph may implement pages at a different URL path than specified. E.g.:
- PRD says `/platform-admin/connectors/` — Ralph used `/platform/connectors/`
- Check if authorization is equivalent before marking as fail

## Type Error Pattern

Ralph frequently leaves `implicit any` errors on `.map()` and `.filter()` callback parameters. These don't cause runtime errors but violate the PRD's `npm run check-types` requirement.

## Convex .filter() After .withIndex() — Recurring Violation

Ralph occasionally chains `.filter()` after `.withIndex()` when a separate, more specific index exists.
Always verify: if the query uses `.withIndex("by_X",...).filter(q => q.eq(q.field("userId"), ...))`,
check the schema for a `by_userId` index that would eliminate the need for .filter() entirely.
This pattern appeared in Phase 7's `requestDataErasure` mutation.

## session?.user?.id vs user._id

In the **frontend** (Better Auth client), `session?.user?.id` is the correct property — this is not
a bug. The `user._id` rule applies only to **backend Convex functions** where the Better Auth adapter
returns `_id`. Frontend pages throughout the project correctly use `session?.user?.id`.

## Phase 7 Child Authorization — Architecture Notes

- `parentChildAuthorizations` table: ONE record per child (not per parent). Unified access level.
- All changes logged to `parentChildAuthorizationLogs` (write-once). Never update/delete log entries.
- `restrictChildView` field is on `coachParentSummaries` table (not voiceNotes).
- `playerClaimTokens` reused for child account setup tokens with `tokenType: "child_account_setup"` discriminator.
- `use-child-access.ts` hook is the shared gating utility — check it's imported on every player portal page.
- DOB under-13 block is enforced at backend `grantChildAccess` mutation level, NOT at child account setup page.

## Ralph Recurring Pattern: Missing Aggregate Details in Admin Dashboards

Ralph tends to implement "summary" views (aggregate counts, chart, error log) for admin monitoring dashboards but omits the per-record player tables that the PRD requires. Always check US-P*-009 type stories for:
- Per-player status table (Name, Team, Channel, Status, Completion Time, Score)
- "Not-registered" count (often hardcoded to 0)
- Action buttons like "Send nudge" or "Invite"

Also check: `getChannelCounts` type queries often hardcode `notRegistered: 0` instead of computing actual counts.

## Ralph Recurring Pattern: Missing Session Expiry Response Messages

When Ralph implements session expiry (e.g. wellness sessions, voice note sessions), he often makes the active-session query return `null` for expired sessions but forgets to send the player a message explaining why the session is expired. The PRD will specify an exact message like "This session has expired. Next check tomorrow." Always verify: does the code path send this message, or does it silently fall through?

## Ralph Security Gap: Public Actions Without Auth Checks

Public `action({...})` functions in Convex (as opposed to `internalAction`) do not require authentication by default. Ralph sometimes creates public actions (e.g. `sendVerificationPin`, `verifyPinAndDetectChannel`) that take a `playerIdentityId` arg but never verify the caller owns that playerIdentityId. Always check: do public actions that operate on player data call `getAuthUserId(ctx)` and verify ownership?

## Project-Specific Notes

- Platform auth: `/platform/layout.tsx` enforces `isPlatformStaff` — individual pages don't need to check it
- `user._id` not `user.id` for Better Auth user IDs **in backend Convex functions**
- All queries should use `.withIndex()` not `.filter()`
- Recharts is installed (`recharts: ^2.15.4`) — Ralph uses it for charts
- Backend: `packages/backend/convex/models/` for queries/mutations, `packages/backend/convex/actions/` for actions
