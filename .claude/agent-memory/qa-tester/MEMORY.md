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

## Project-Specific Notes

- Platform auth: `/platform/layout.tsx` enforces `isPlatformStaff` — individual pages don't need to check it
- `user._id` not `user.id` for Better Auth user IDs
- All queries should use `.withIndex()` not `.filter()`
- Recharts is installed (`recharts: ^2.15.4`) — Ralph uses it for charts
- Backend: `packages/backend/convex/models/` for queries/mutations, `packages/backend/convex/actions/` for actions
