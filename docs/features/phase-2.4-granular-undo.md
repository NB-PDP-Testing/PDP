# PlayerARC - Phase 2.4: Granular Undo

> Auto-generated documentation - Last updated: 2026-02-13 23:45

## Status

- **Branch**: `ralph/phase-2.4-granular-undo`
- **Progress**: 5 / 5 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P2.4-001: Create undo eligibility check query

As the import system, I need to check whether a completed import can be undone based on time window and dependent data.

**Acceptance Criteria:**
- Add checkUndoEligibility query to packages/backend/convex/models/importSessions.ts
- Args: sessionId (v.id('importSessions'))
- Returns: { eligible: boolean, reasons: string[], expiresAt: number | null, stats: { playerCount, guardianCount, enrollmentCount, passportCount, assessmentCount } }
- Check 1: Session status must be 'completed' — if not, return ineligible with reason
- Check 2: 24-hour window — if (Date.now() - session.completedAt) > 24*60*60*1000, return ineligible
- Check 3: Query skillAssessments by importSessionId index — if any assessments exist on imported players that were NOT created by this import, return ineligible with 'Players have assessments created after import'
- Check 4: Count records per table using by_importSessionId index on: playerIdentities, guardianIdentities, guardianPlayerLinks, orgPlayerEnrollments, sportPassports, skillAssessments
- Stats object returns counts so the UI can show impact preview
- expiresAt = session.completedAt + 24*60*60*1000 (or null if already expired)
- Run npx ultracite fix and npx -w packages/backend convex codegen

### US-P2.4-002: Create undoImport mutation

As an admin, I need to undo a completed import which deletes all records created by that import session.

**Acceptance Criteria:**
- Add undoImport mutation to packages/backend/convex/models/importSessions.ts
- Args: sessionId (v.id('importSessions')), reason (v.string())
- Returns: { success: boolean, rollbackStats: { playersRemoved, guardiansRemoved, guardianLinksRemoved, enrollmentsRemoved, passportsRemoved, assessmentsRemoved }, ineligibilityReasons: string[] }
- Step 1: Call requireOrgAdmin to verify auth
- Step 2: Run eligibility checks (same logic as checkUndoEligibility). If ineligible, return { success: false, ineligibilityReasons }
- Step 3: Query each table by importSessionId index and collect all record IDs
- Step 4: Delete all records using ctx.db.delete() — order matters: delete assessments first, then passports, then enrollments, then guardian links, then guardians, then players
- Step 5: Patch importSessions: status='undone', undoneAt=Date.now(), undoneBy=user._id, undoReason=args.reason
- Step 6: Return { success: true, rollbackStats: { counts per table } }
- Use HARD DELETE (ctx.db.delete) — NOT soft delete
- Tables to query: playerIdentities, guardianIdentities, guardianPlayerLinks, orgPlayerEnrollments, sportPassports, skillAssessments — all have by_importSessionId index
- Run npx ultracite fix and npx -w packages/backend convex codegen

### US-P2.4-003: Create import history page

As an admin, I need a page showing all past imports with their status, stats, and undo eligibility.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/import/history/page.tsx
- Admin/owner role check with redirect (same pattern as admin/layout.tsx)
- Fetch import sessions using listSessionsByOrg query (already exists)
- Table with columns: Date, Source (file name), Status badge, Rows Imported, Players Created, Guardians Created, Actions
- Status badges: completed (green), failed (red), cancelled (gray), undone (amber), importing (blue animated)
- For 'completed' sessions, show Undo button if within 24-hour window
- Undo button calls checkUndoEligibility to verify — show tooltip if ineligible
- Clicking Undo opens UndoImportDialog
- View Details link expands row to show full stats breakdown
- Mobile responsive: card view on small screens
- Use shadcn/ui Table, Badge, Button, Tooltip, Card components
- Run npx ultracite fix

### US-P2.4-004: Create UndoImportDialog component

As an admin, I need a confirmation dialog before undoing an import that shows the impact and requires explicit confirmation.

**Acceptance Criteria:**
- Create apps/web/src/components/import/undo-import-dialog.tsx
- Dialog shows session details: date, source file, rows imported
- Impact preview section: 'This will permanently delete: X players, Y guardians, Z enrollments, N passports, M assessments'
- Warning text: 'This action cannot be undone. All records created by this import will be permanently removed.'
- Reason input: required text field for why they're undoing (min 10 chars)
- Countdown timer showing time remaining in 24-hour window
- If ineligible, show reasons list and disable Undo button
- Undo button with destructive styling (red variant)
- On confirm, call undoImport mutation with sessionId and reason
- Show loading state during mutation
- On success, show success toast with rollback stats and close dialog
- On error, show error toast with message
- Use shadcn/ui AlertDialog, Input, Button, Alert components
- Mobile responsive at 375px
- Run npx ultracite fix

### US-P2.4-005: Add undo link to complete step and import page

As an admin who just completed an import, I need easy access to undo from the completion screen and import entry page.

**Acceptance Criteria:**
- Update complete-step.tsx: add 'Undo Import' link/button below the success message
- Undo link only shown for the just-completed import session
- Clicking opens UndoImportDialog with the session ID
- Update import entry page (apps/web/src/app/orgs/[orgId]/import/page.tsx): add 'View Import History' link
- History link navigates to /orgs/[orgId]/import/history
- If the most recent session was completed <24h ago, show a subtle 'Last import can be undone' notification
- Add 'Import History' link to admin sidebar (same section as Import Wizard)
- Run npx ultracite fix and npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Auth helper available at `authComponent.safeGetAuthUser(ctx)` from `../auth`
- Import in files: `import { authComponent } from "../auth";`
- Better Auth adapter accessed via `ctx.runQuery(components.betterAuth.adapter.findOne, ...)`
- ❌ skillAssessments uses `by_playerIdentityId` index, NOT `by_playerId`
- Field name is `playerIdentityId`, not `playerId`
- This caused initial type error, fixed by using correct index name
- Added this pattern to Codebase Patterns section for future iterations
--
- Auth pattern: `authComponent.getAuthUser(ctx)` for user, then check membership via Better Auth adapter
- Admin check: Query member table, check `betterAuthRole` (admin/owner) OR `functionalRoles.includes("admin")`

**Gotchas encountered:**
- ❌ skillAssessments uses `by_playerIdentityId` index, NOT `by_playerId`
- Field name is `playerIdentityId`, not `playerId`
- This caused initial type error, fixed by using correct index name
- Added this pattern to Codebase Patterns section for future iterations
- checkUndoEligibility is read-only query - can be called reactively by frontend
- Uses 6 table queries via by_importSessionId index (batch pattern)
- Uses by_playerIdentityId index to query assessments per player (with Promise.all batch fetch)
--
- ⚠️ **CRITICAL**: Must add imports AND usage in SAME edit or linter removes "unused" imports!
- Initially added imports separately, linter removed them, causing "undeclared variable" errors

### Files Changed

- packages/backend/convex/models/importSessions.ts (+144 lines)
- ✅ Type check: passed (pre-existing errors in other files)
- ✅ Codegen: passed
- ✅ Linting: passed (pre-existing warnings in other files)
- ✅ Pre-commit hooks: passed
- Auth helper available at `authComponent.safeGetAuthUser(ctx)` from `../auth`
- Import in files: `import { authComponent } from "../auth";`
- Better Auth adapter accessed via `ctx.runQuery(components.betterAuth.adapter.findOne, ...)`
- ❌ skillAssessments uses `by_playerIdentityId` index, NOT `by_playerId`
- Field name is `playerIdentityId`, not `playerId`
- This caused initial type error, fixed by using correct index name
- Added this pattern to Codebase Patterns section for future iterations
--
- packages/backend/convex/models/importSessions.ts (+240 lines)
- ✅ Type check: passed (pre-existing errors in other files)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
