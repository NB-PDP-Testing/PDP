# PlayerARC - Phase 1.3: Import Frontend Wizard & Integration

> Auto-generated documentation - Last updated: 2026-02-13 20:16

## Status

- **Branch**: `ralph/phase-1.3-import-frontend-wizard`
- **Progress**: 10 / 10 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P1.3-001: Create import entry page with template selection

As an admin, I need an import page where I can select a sport, choose a template, and start the import wizard.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/import/page.tsx
- Show sport selection dropdown (query available sports)
- Show template selection cards (platform + org templates, filtered by sport)
- Show 'Start Import' button that launches the wizard
- Show recent imports list (last 5 sessions)
- Use shadcn/ui Card, Select, Button components
- Mobile responsive layout

### US-P1.3-002: Create ImportWizard orchestrator component

As the import system, I need a wizard component that orchestrates the multi-step import flow with state management.

**Acceptance Criteria:**
- Create apps/web/src/components/import/ImportWizard.tsx
- Define 7 wizard steps with step indicator at top
- Manage wizard state: currentStep, template, sportCode, parsedData, mappings, playerSelections, benchmarkSettings, sessionId
- Support Next/Back navigation between steps
- Conditional step skipping (skip Map Columns if 100% auto-mapped, skip Review if no issues)
- Create import session on wizard start

### US-P1.3-003: Create UploadStep component

As an admin, I need to upload a CSV file or paste data from a spreadsheet.

**Acceptance Criteria:**
- Create apps/web/src/components/import/steps/UploadStep.tsx
- File drag-and-drop zone accepting .csv files
- File input fallback button
- Clipboard paste textarea for pasting from Excel
- Parse content using parser.ts parseCSV function
- Show first 3 rows as preview table

### US-P1.3-004: Create MappingStep component

As an admin, I need to review and adjust auto-mapped column assignments.

**Acceptance Criteria:**
- Create apps/web/src/components/import/steps/MappingStep.tsx
- Show each source column with sample values, confidence badge, and target field dropdown
- Auto-mapped columns (>=95% confidence) show green checkmark and locked dropdown
- Unmatched columns show red badge and empty dropdown
- Override button to unlock auto-mapped columns
- Validation warning if required fields not mapped

### US-P1.3-005: Create PlayerSelectionStep component

As an admin, I need to select which players to import using checkboxes with search and bulk actions.

**Acceptance Criteria:**
- Create apps/web/src/components/import/steps/PlayerSelectionStep.tsx
- Player table with checkbox per row, sortable columns
- Select All / Deselect All bulk action buttons
- Search bar filtering by name, DOB, team
- Filter tabs: All / Selected / Unselected with counts
- All players selected by default

### US-P1.3-006: Create BenchmarkConfigStep component

As an admin, I need to configure how initial skill ratings are set for imported players.

**Acceptance Criteria:**
- Create apps/web/src/components/import/steps/BenchmarkConfigStep.tsx
- Toggle switch: 'Initialize skill ratings during import'
- Strategy radio buttons: Blank, Middle, Age-Appropriate (Recommended), NGB Standards, Custom Template
- Custom template selector dropdown when 'Custom Template' selected
- Preview section showing sample ratings
- Use shadcn/ui Switch, RadioGroup, Select components

### US-P1.3-007: Create ReviewStep with duplicate resolution

As an admin, I need to review validation errors and resolve duplicate players before importing.

**Acceptance Criteria:**
- Create apps/web/src/components/import/steps/ReviewStep.tsx
- Validation error summary and error table with row number, field, error, suggested fix
- Duplicate section with resolution options: Skip, Merge, Create New
- Team creation preview
- Summary cards: X valid, Y errors, Z duplicates
- Allow proceeding with errors (with confirmation dialog)

### US-P1.3-008: Create ImportStep and CompleteStep components

As an admin, I need to see real-time import progress and a completion summary.

**Acceptance Criteria:**
- Create apps/web/src/components/import/steps/ImportStep.tsx with phase-by-phase progress
- Call batchImportPlayersWithIdentity mutation with all wizard data
- Create apps/web/src/components/import/steps/CompleteStep.tsx
- Show statistics cards and 'What Next' action cards
- Return to import page link

### US-P1.3-009: Add import link to admin navigation

As an admin, I need to access the import page from the main navigation.

**Acceptance Criteria:**
- Add 'Import Players' link to admin sidebar/navigation pointing to /orgs/[orgId]/import
- Use Upload or FileUp Lucide icon
- Link visible only to admin and owner roles
- Typecheck passes: npm run check-types

### US-P1.3-010: Integration testing of import wizard flow

As a developer, I need to verify the complete import wizard works end-to-end.

**Acceptance Criteria:**
- Verify: Upload CSV -> auto-map -> select players -> configure benchmarks -> review -> import -> completion
- Verify: Template selection pre-fills mappings correctly
- Verify: Player selection checkboxes, search, and bulk actions work
- Verify: Completion step shows accurate statistics
- Run npx ultracite fix and npx -w packages/backend convex codegen
- Typecheck passes: npm run check-types


## Implementation Notes

### Key Patterns & Learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
