# Import Framework Architecture Review

## Review Date: 2026-02-12

## Phase 1.4 Pre-Implementation Review

### Result: READY with 2 issues to fix before/during implementation

### Key File Paths
- Backend CRUD: `packages/backend/convex/models/importTemplates.ts` (6 functions)
- Sessions: `packages/backend/convex/models/importSessions.ts`
- Mapper: `packages/backend/convex/lib/import/mapper.ts` (DEFAULT_TARGET_FIELDS, suggestMappingsSimple, suggestMappings)
- Parser: `packages/backend/convex/lib/import/parser.ts` (parseCSV)
- Admin sidebar: `apps/web/src/components/layout/admin-sidebar.tsx`
- Import entry: `apps/web/src/app/orgs/[orgId]/import/page.tsx` (already has template selection)
- Admin layout: `apps/web/src/app/orgs/[orgId]/admin/layout.tsx` (has role check)

### Issues Found
1. **cloneTemplate mutation** copies scope/organizationId from source verbatim. "Clone to My Org" won't work for platform->org clones. Fix: add optional scope/organizationId args.
2. **Missing by_templateId index** on importSessions (NOT importMappingHistory which already has it). Required for getTemplateUsageStats query.

### Existing Anti-Patterns (tech debt, not Phase 1.4 responsibility)
- `listTemplates` uses `.filter((t) => t.isActive)` after `.withIndex()` on all 3 code paths (lines 258, 269, 276)
- Would need composite index like `by_scope_and_isActive` to fix properly

### Schema Index State (importSessions)
- Has: by_organizationId, by_status, by_initiatedBy, by_startedAt, by_org_and_status
- Missing: by_templateId (needed for Phase 1.4)

### Schema Index State (importTemplates)
- Has: by_scope, by_sportCode, by_organizationId, by_scope_and_sport

### Frontend Import Patterns (verified working)
- `@pdp/backend/convex/lib/import/mapper` -- DEFAULT_TARGET_FIELDS, suggestMappingsSimple, FieldDefinition, MappingSuggestion
- `@pdp/backend/convex/lib/import/parser` -- parseCSV, ParseResult
- Already used in mapping-step.tsx and upload-step.tsx

### DEFAULT_TARGET_FIELDS -- 31 fields total
- PRD design doc only lists 27 (missing: isPlayer, medicalNotes, allergies)
- Ralph should import from mapper.ts directly, not hardcode

### Admin Sidebar Structure
- "Data & Import" group at lines 156-199
- Insertion point: after "Import Wizard" (line 185-188), before "Import Players" (line 190-193)
- FileSpreadsheet icon NOT currently imported -- must add with usage
