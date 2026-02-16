# Issue #305 - Logo Upload on Org Creation Page

## Issue
**Title:** Double check the logo uploader fully works..
**Issue:** https://github.com/NB-PDP-Testing/PDP/issues/305

The original logo upload bug (broken storage URLs) was fixed in PR #336. However, a feature parity gap remained: the org **creation** page only had a plain URL text input for logos, while the admin **settings** page had the full drag-and-drop `LogoUpload` component with resize and preview.

## What Was Done

### PR #507 — Logo file upload on org creation page
**Commits:**
- `559a536` — `feat: add logo file upload to org creation page (Option B)`
- `7e2a27a` — quality check feedback

**Changes:**
1. **Backend** (`packages/backend/convex/models/organizations.ts`):
   - Added `generateLogoUploadUrlForCreation` mutation — platform-staff-only upload URL generation that skips org membership checks (org doesn't exist yet during creation)
   - Added `getStorageUrl` mutation — converts a Convex `storageId` to a public URL for use as the logo field value

2. **Shared component** (`apps/web/src/components/logo-upload.tsx`):
   - Made `organizationId` optional so the component works in both creation and settings contexts
   - Added `useEffect` to sync the preview when `currentLogo` changes externally (e.g. when a scraped logo URL is applied)

3. **Org create page** (`apps/web/src/app/orgs/create/page.tsx`):
   - Replaced the plain URL text input with the full `LogoUpload` component
   - Supports drag-and-drop, file selection, crop/resize, and preview — same experience as org settings

### PR (pending) — Lint fix follow-up
**Commits:**
- `a40d7c7` — `fix: suppress biome a11y lint error on scraped logo img onError handler`
- `b9ce44f` — `style: auto-format logo-upload.tsx from lint-staged`

Fixed CI lint failure caused by biome flagging the `onError` handler on the non-interactive scraped logo `<img>` element. Added `biome-ignore` directive since the handler is intentional (hides broken images).

## Resolution
The org creation page now has full feature parity with the org settings page for logo uploads. Issue can be closed.
