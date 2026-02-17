# Import Framework Architecture Notes

## Schema Location
- `importSessions`: schema.ts ~line 4695
- `importSessionDrafts`: schema.ts ~line 4716
- `importMappingHistory`: schema.ts ~line 4748
- `importTemplates`: schema.ts (exact line TBD)

## Phase 2.3: Save & Resume (REVIEWED 2026-02-13)
- **Status**: Implemented, 0 critical / 3 warnings / 4 suggestions
- **Key files**: `models/importSessionDrafts.ts`, `crons.ts` line 170, `import-wizard.tsx`, `import/page.tsx`, `import/wizard/page.tsx`
- **ADR**: `ADR-phase-2.3-draft-storage-strategy.md`

### Design Decisions
- Raw CSV NOT stored (1MB limit risk). User re-uploads on resume.
- One draft per user per org (upsert by userId+orgId)
- loadDraft is a query (read-only), saveDraft/deleteDraft are mutations
- Cron at 4:00 AM UTC daily, batch of 100

### Open Warnings
- W1: `listExpiredDrafts` is dead code (defined but never called)
- W2: No org membership check in saveDraft/loadDraft (pre-existing pattern from importSessions.ts)
- W3: Import page `isLoading` doesn't include draft query (causes layout shift)

### Open Suggestions
- S1: Cron overlap with cleanup-archived-invitations on Sundays (4:00 AM UTC)
- S2: Save timer not cancelled in cleanupDraft (race condition -> orphaned draft)
- S3: Feature docs thin (empty Implementation Notes/Key Files sections)
- S4: playerSelections stores `{ rowIndex, selected: true }` -- `selected` is always true

## Existing Patterns to Know
- `importSessions.ts` has NO auth checks (relies on frontend gating)
- `importSessionDrafts.ts` DOES have auth checks (improvement over importSessions)
- Better Auth client-side: `session?.user?.id` (string). Convex server-side: `user._id` (string from authComponent).
- authClient.useSession() returns { data: { user: { id, name, email, ... }, session: {...} } }

## Cron Time Slots (Updated 2026-02-13)
- 0:00 AM UTC: update-org-daily-spend
- 1:00 AM UTC: aggregate-daily-usage
- 2:00 AM UTC: update review statuses, adjust-insight-thresholds
- 2:30 AM UTC: expire-active-review-links
- 3:00 AM UTC: archive-old-invitations
- 3:15 AM UTC: cleanup-expired-review-links
- 4:00 AM UTC: cleanup-archived-invitations (weekly Sunday), cleanup-expired-import-drafts (daily)
- 6:00 AM UTC: detect-player-graduations
- 9:00 AM UTC: admin-expiration-alerts
- Hourly: mark-expired-invitations (:05), process-auto-reinvites (:15), reset-rate-limit-windows (:00)
- Every 5 min: process-scheduled-deliveries
- Every 10 min: check-cost-alerts
- Every 15 min: process-snoozed-review-reminders
- Weekly Sunday 2 AM: adjust-personalized-thresholds
