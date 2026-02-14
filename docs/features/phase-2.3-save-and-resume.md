# PlayerARC - Phase 2.3: Save & Resume

> Auto-generated documentation - Last updated: 2026-02-13 21:55

## Status

- **Branch**: `ralph/phase-2.3-save-and-resume`
- **Progress**: 6 / 6 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P2.3-001: Create importSessionDrafts schema and model

As the import system, I need a table to persist wizard draft state across sessions.

**Acceptance Criteria:**
- Add importSessionDrafts table to packages/backend/convex/schema.ts
- Fields: userId (v.string()), organizationId (v.string()), step (v.number()), parsedHeaders (v.optional(v.array(v.string()))), parsedRowCount (v.optional(v.number())), mappings (v.optional(v.record(v.string(), v.string()))), playerSelections (v.optional(v.array(v.object({ rowIndex: v.number(), selected: v.boolean(), reason: v.optional(v.string()) })))), benchmarkSettings (v.optional(v.object({ applyBenchmarks: v.boolean(), strategy: v.string(), customTemplateId: v.optional(v.id('benchmarkTemplates')), passportStatuses: v.array(v.string()) }))), templateId (v.optional(v.id('importTemplates'))), sourceFileName (v.optional(v.string())), expiresAt (v.number()), lastSavedAt (v.number())
- Indexes: by_userId_and_orgId on [userId, organizationId], by_expiresAt on [expiresAt]
- Do NOT store raw parsed CSV data in the draft — too large. Store headers, row count, mappings, and selections only. User re-uploads the file on resume.
- Run npx -w packages/backend convex codegen to verify schema

### US-P2.3-002: Create draft persistence mutations and query

As the import system, I need mutations to save and delete drafts, and a query to load the most recent draft.

**Acceptance Criteria:**
- Create packages/backend/convex/models/importSessionDrafts.ts
- saveDraft mutation: upserts draft by userId + organizationId (delete old draft first, then insert new). Sets expiresAt to 7 days from now. Requires auth check.
- loadDraft query (NOT mutation): finds most recent non-expired draft for userId + organizationId using by_userId_and_orgId index. Returns null if no draft exists.
- deleteDraft mutation: deletes draft by ID. Requires auth check.
- listExpiredDrafts internalQuery: finds drafts where expiresAt < Date.now() using by_expiresAt index, returns up to 100 at a time
- cleanupExpiredDrafts internalMutation: calls listExpiredDrafts and deletes them in batch
- Include args and returns validators on all functions
- Auth check on saveDraft and deleteDraft: verify user is authenticated via authComponent.getAuthUser
- Run npx ultracite fix and npx -w packages/backend convex codegen

### US-P2.3-003: Add cron job for expired draft cleanup

As the system, I need to automatically clean up expired drafts to prevent storage bloat.

**Acceptance Criteria:**
- Add daily cron job to packages/backend/convex/crons.ts
- Cron runs cleanupExpiredDrafts internalMutation once per day
- Use the existing crons.ts pattern (check if file exists, follow existing cron registration pattern)
- If crons.ts does not exist, create it following Convex cron documentation: import { cronJobs } from 'convex/server', define crons, export default
- Run npx -w packages/backend convex codegen to verify

### US-P2.3-004: Add auto-save to import wizard

As an admin using the import wizard, I need my progress to be automatically saved after each step so I can resume later.

**Acceptance Criteria:**
- Update import-wizard.tsx to call saveDraft mutation after each step transition
- Debounce saves by 500ms to avoid rapid-fire mutations during fast navigation
- Save includes: current step number, mappings, player selections, benchmark settings, template ID, source file name, parsed headers, parsed row count
- Do NOT save raw parsed CSV data — too large for Convex documents
- Show subtle 'Saved' indicator (small text or icon) after successful save
- On wizard completion (import step succeeds), call deleteDraft to clean up
- On wizard cancellation, call deleteDraft to clean up
- Use useMutation from convex/react for saveDraft and deleteDraft
- Run npx ultracite fix

### US-P2.3-005: Add resume UI to import entry page

As an admin returning to the import page, I need to see if I have a saved draft and be able to resume from where I left off.

**Acceptance Criteria:**
- Update apps/web/src/app/orgs/[orgId]/import/page.tsx
- Query for existing draft using loadDraft query (pass current userId and orgId)
- If draft exists, show a 'Resume Import' card above or alongside the new import options
- Resume card shows: source file name, step reached, last saved time (relative: '2 hours ago'), expiry countdown
- Resume button navigates to wizard with draft data pre-loaded
- Discard button opens confirmation dialog, then calls deleteDraft
- If no draft exists, page renders as before (no changes)
- Use shadcn/ui Card, Button, AlertDialog components
- Mobile responsive: full-width card at 375px
- Run npx ultracite fix and npm run check-types

### US-P2.3-006: Handle wizard resume with file re-upload

As an admin resuming a draft, I need the wizard to restore my previous settings after I re-upload the CSV file.

**Acceptance Criteria:**
- When wizard opens with draft data, start at upload step (step 0) regardless of saved step
- Show message: 'Please re-upload [filename] to continue where you left off'
- After file upload and parsing, verify headers match the saved draft headers
- If headers match: auto-apply saved mappings, selections, and settings — jump to saved step
- If headers don't match: show warning 'The uploaded file has different columns than the original. Your previous mappings may not apply.' Let user choose: apply anyway or start fresh
- If user chooses start fresh, delete the draft and proceed normally
- Run npx ultracite fix and npm run check-types


## Implementation Notes

### Key Patterns & Learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
