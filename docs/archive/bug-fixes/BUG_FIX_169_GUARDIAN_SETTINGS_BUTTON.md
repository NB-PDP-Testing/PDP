# Bug Fix: Issue #169 - Guardian Settings Button Missing Text

## Issue Summary
**GitHub Issue**: [#169](https://github.com/NB-PDP-Testing/PDP/issues/169)
**Status**: Fixed
**Date**: January 7, 2026

## Problem Description
On the Parent Dashboard, the "Guardian Settings" button text was invisible. The button appeared blank, but when hovering over it, the text became visible.

## Root Cause Analysis

The button text was invisible due to a **color inheritance issue** in the button component.

### Technical Details

1. The parent dashboard header uses a blue gradient with white text:
   ```tsx
   <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
   ```

2. The Guardian Settings button used `variant="outline"`:
   ```tsx
   <Button variant="outline" className="gap-2">
     <Settings className="h-4 w-4" />
     Guardian Settings
   </Button>
   ```

3. The `outline` variant in `button.tsx` was defined as:
   ```tsx
   outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground..."
   ```

4. **Key Issue**: The `outline` variant:
   - Uses `bg-background` (white/light background)
   - Did **NOT** explicitly set a text color
   - The button inherited `text-white` from the parent container
   - Result: **White text on white/light background = invisible text**

5. On hover, `hover:text-accent-foreground` kicked in, making the text visible.

## Fix Applied

Updated `apps/web/src/components/ui/button.tsx` to add explicit `text-foreground` to the `outline` variant:

```diff
- outline:
-   "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
+ outline:
+   "border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
```

## Files Changed
- `apps/web/src/components/ui/button.tsx`

## Impact
- Low-risk global fix
- All `outline` variant buttons now have consistent, visible text regardless of parent background color
- Prevents similar issues from occurring elsewhere in the app where outline buttons might be placed on colored backgrounds

## Testing Steps
1. Navigate to the Parent Dashboard (`/orgs/[orgId]/parents`) as a parent user
2. Verify the "Guardian Settings" button text is now visible (not white)
3. Verify the button still works correctly on hover
4. Check other outline buttons throughout the app remain properly styled