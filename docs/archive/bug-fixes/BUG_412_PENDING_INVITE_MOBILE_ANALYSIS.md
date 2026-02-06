# Bug #412 Analysis: Pending Invite Email Not Visible on Mobile

## Status: Under Investigation

The issue has been identified but requires further testing before implementing a fix.

## Problem

On iPhone 17 using Chrome, the email/name of the person in the Pending Invitations section is not visible. Other elements display correctly:
- "Invited By" text ✓
- Club name ✓
- Children associated ✓
- Team names ✓
- Expiration info ✓
- Cancel button (red X) ✓

But the **email address is not visible**.

## Environment

- **Affected:** Real iPhone 17 with Chrome
- **Not affected:** Desktop Chrome with DevTools mobile emulation

This suggests the issue is specific to actual mobile Chrome rendering, not the viewport size or user agent.

## Root Cause Analysis

The email display in `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` (line 1059):

```jsx
<p className="font-medium sm:truncate">
  {invitation.email}
</p>
```

On mobile (below `sm` breakpoint), there's **no `truncate` class**. This was intentionally removed in commit `a4eb329e` to show full emails on mobile.

However, the "Invited by" text directly below it **does have** `truncate`:

```jsx
<p className="truncate text-muted-foreground text-xs">
  Invited by {invitation.inviter?.name || "Unknown"}
</p>
```

The `truncate` class includes `overflow-hidden` which stabilizes the layout. Without it, the email text in nested flex containers with `min-w-0` can behave unpredictably on real mobile Chrome vs desktop emulation.

## Proposed Fix (Pending Verification)

Add `truncate` back to the email paragraph:

```jsx
<p className="truncate font-medium">
  {invitation.email}
</p>
```

This ensures consistent rendering across all devices. Trade-off: long emails will be truncated with ellipsis on mobile.

## Testing Required

Before implementing the fix:

1. Reproduce on additional devices to confirm it's not device-specific
2. Test with remote debugging (connect iPhone via USB, use Safari/Chrome inspect)
3. Try pointing iPhone at local dev server (`http://<mac-ip>:3000`) to test fix before deploying

## Relevant History

| Commit | Date | Description |
|--------|------|-------------|
| `de68211c` | Jan 15, 2026 | Added `truncate` to email (original fix) |
| `a4eb329e` | Jan 24, 2026 | Changed to `sm:truncate` to show full email on mobile |

The change in `a4eb329e` introduced this regression on real mobile devices.

---

*Analysis by Claude Code - Feb 2, 2026*
