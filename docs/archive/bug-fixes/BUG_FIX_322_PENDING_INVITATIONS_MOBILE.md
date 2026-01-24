# Bug Fix: Pending Invitations Mobile Layout - Issue #322

## Problem

On mobile screens (375px width), the Pending Invitations section on the Manage Users page became unusable when an invitation had a long email address. The layout was "crushed" and controls became inaccessible.

### Root Cause

The invitation card used a single-row flex layout with:
- Email and metadata on the left
- 5 action buttons (Edit, History, Details, Resend, Cancel) on the right

On mobile, there wasn't enough horizontal space for both the content and all buttons, causing them to overlap or get pushed off-screen.

## Solution

Applied the same two-row pattern that was used to fix the Organization Members section (#225):

### Layout Structure

**Before (single row):**
```
[Icon] [Email + Badges + Expiry] -------- [Edit] [History] [Details] [Resend] [Cancel]
```

**After (two rows):**
```
Row 1: [Icon] [Email (truncated)] -------- [🖊] [🕐] [👁] [📤] [✕]
Row 2:        [Role Badge] [→ Teams/Players] [• Expires in X days] [• Resent 2×]
```

### Key CSS Changes

1. **Container**: Changed from `flex items-center justify-between` to `flex flex-col gap-2`

2. **Action Buttons**:
   - Mobile: `h-8 w-8 p-0` (32px square icon-only buttons)
   - Desktop: `sm:h-auto sm:w-auto sm:px-3` (normal sized with padding)

3. **Button Text**: `hidden sm:inline` (hidden on mobile, visible on sm+ screens)

4. **Metadata Row**: `pl-[52px]` to align with email text (40px icon + 12px gap = 52px)

5. **Team/Player Names**: `max-w-[150px] truncate` to prevent long assignment lists from breaking layout

6. **Resend History**: Simplified display format (`Resent 2× today` instead of verbose text)

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` | Restructured Pending Invitations card layout |

## Testing Checklist

- [ ] Mobile (375px): All 5 action buttons visible and tappable
- [ ] Mobile: Long email addresses truncate with ellipsis
- [ ] Mobile: Role badges display on second row
- [ ] Desktop: Button text labels visible
- [ ] Expired invitation: Red styling applied correctly
- [ ] Coach role: Team assignments display with truncation
- [ ] Parent role: Player assignments display with truncation

## Pull Request

PR #328: https://github.com/NB-PDP-Testing/PDP/pull/328
