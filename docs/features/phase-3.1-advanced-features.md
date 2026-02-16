# PlayerARC - Phase 3.1: Confidence Indicators, Partial Undo & Analytics

> Auto-generated documentation - Last updated: 2026-02-15 00:11

## Status

- **Branch**: `ralph/phase-3.1-advanced-features`
- **Progress**: 12 / 12 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P3.1-001: Add confidence score display to guardian matching

As an admin reviewing import duplicates, I need to see confidence scores for guardian matches so I can make informed decisions about auto-linking.

**Acceptance Criteria:**
- Extend guardian matching backend to calculate and return confidence scores (0-100)
- Confidence score based on: name similarity, email match, phone match, address match
- Each match signal weighted: email 40%, phone 30%, name 20%, address 10%
- Store confidence score in match result object returned by guardianMatcher
- Backend mutation returns confidence score with each duplicate guardian match
- Confidence score persists in importSessions duplicates array
- Run npx -w packages/backend convex codegen to verify types
- Run npx ultracite fix before completion

### US-P3.1-002: Add color-coded confidence indicators to duplicate resolution UI

As an admin reviewing duplicates, I need visual color-coded indicators so I can quickly identify high/medium/low confidence matches at a glance.

**Acceptance Criteria:**
- Update review-step.tsx duplicate resolution UI to display confidence indicators
- Add confidence badge component with three levels:
-   - High (60-100): Green badge with 'High Confidence' text and checkmark icon
-   - Medium (40-59): Yellow badge with 'Review Required' text and alert icon
-   - Low (0-39): Red badge with 'Low Confidence' text and X icon
- Progress bar color matches confidence: green (high), yellow (medium), red (low)
- Confidence badge appears prominently at top of each duplicate card
- Use shadcn/ui Badge component with custom color variants
- Mobile responsive: badge remains visible at 375px width
- Run npx ultracite fix before completion

### US-P3.1-003: Add match score breakdown and explanation

As an admin reviewing a match, I need to see why the confidence score was assigned so I can understand the matching algorithm's reasoning.

**Acceptance Criteria:**
- Add expandable 'Match Details' section to each duplicate card
- Show breakdown of contributing signals:
-   - Email match: ✓/✗ with weight (40%)
-   - Phone match: ✓/✗ with weight (30%)
-   - Name similarity: percentage score with weight (20%)
-   - Address match: ✓/✗ with weight (10%)
- Display calculated confidence score: (signal1_weight * signal1_match) + ...
- Add 'Learn More' link to algorithm documentation (future)
- Use Collapsible component from shadcn/ui for expandable section
- Mobile: Match details stack vertically with touch-friendly expand/collapse
- Run npx ultracite fix before completion

### US-P3.1-004: Add admin override controls with audit trail

As an admin, I need to override confidence-based auto-linking decisions and have those overrides logged so I can correct algorithm mistakes.

**Acceptance Criteria:**
- Add 'Force Link' button to low-confidence matches (<40) in duplicate resolution UI
- Add 'Reject Link' button to high-confidence matches (60+) in duplicate resolution UI
- Override buttons only visible to users with admin or owner role
- Create adminOverrides table in schema.ts:
-   - importSessionId, playerId, guardianId, action ('force_link' | 'reject_link'), reason (optional text), overriddenBy (userId), timestamp
- Add by_importSession and by_user indexes for querying overrides
- Store override in database before applying action
- Display override badge on duplicate card: 'Admin Override: Force Linked' or 'Rejected'
- Run npx -w packages/backend convex codegen after schema change
- Run npx ultracite fix before completion

### US-P3.1-005: Add selective player removal dialog

As an admin who imported incorrect data, I need to selectively remove specific players (not all) so I can fix mistakes without losing good data.

**Acceptance Criteria:**
- Create PartialUndoDialog.tsx component (300-400 lines) in components/import/
- Dialog triggered from import complete step via 'Remove Players' button
- Display list of all players from completed import (from importSession)
- Each player row shows: checkbox, name, DOB, enrollment status, related records count
- Select all / deselect all checkbox at top
- Selected count badge: 'X players selected' with dynamic update
- Disable 'Remove' button if no players selected
- Use AlertDialog from shadcn/ui with custom content
- Mobile: Player list scrollable, checkboxes touch-friendly (44x44px)
- Run npx ultracite fix before completion

### US-P3.1-006: Add search and filter for player selection in partial undo

As an admin with a large import, I need to search and filter the player list so I can quickly find specific players to remove.

**Acceptance Criteria:**
- Add search input at top of player list in PartialUndoDialog
- Search filters by: firstName, lastName, or combination (case-insensitive)
- Add filter dropdown: 'All Players' | 'Players with Errors' | 'Players with Warnings'
- Filter by enrollment status: 'Active' | 'Inactive' | 'All'
- Search and filters work together (AND logic)
- Search debounced 300ms to avoid performance issues
- Display result count: 'Showing X of Y players'
- Use Input component from shadcn/ui for search
- Use Select component from shadcn/ui for filters
- Mobile: Search and filters stack vertically at <640px
- Run npx ultracite fix before completion

### US-P3.1-007: Add per-player impact preview before removal

As an admin about to remove players, I need to see what data will be deleted so I can avoid unintended data loss.

**Acceptance Criteria:**
- Add 'Preview Impact' section in PartialUndoDialog below player list
- Preview shows cascading deletions for selected players:
-   - Player enrollments: X records
-   - Guardian links: X records (show if guardian will become orphaned)
-   - Sport passports: X records
-   - Team assignments: X records
-   - Skill assessments: X records
- Warning badge if action will orphan guardians: 'Warning: 3 guardians will have no linked players'
- Preview updates dynamically as selection changes
- Use Alert component from shadcn/ui for warnings
- Backend query: getRemovalImpact(playerIds) returns impact summary
- Run npx -w packages/backend convex codegen after adding query
- Run npx ultracite fix before completion

### US-P3.1-008: Implement atomic removal transaction

As a system, I need to remove selected players and all related data in a single transaction so the database remains consistent even if removal fails.

**Acceptance Criteria:**
- Create removePlayersFromImport mutation in playerImport.ts
- Mutation accepts: sessionId, playerIdentityIds[] to remove
- Transaction removes in order (reverse of creation):
-   1. Skill assessments for these players
-   2. Team assignments (teamPlayerIdentities)
-   3. Sport passports
-   4. Guardian links (guardianToPlayerLinks) - only if guardian orphaned
-   5. Enrollments (orgPlayerEnrollments)
-   6. Player identities (if not linked elsewhere)
- Use ctx.db.delete() for each record, wrapped in try-catch
- Roll back on any error (Convex mutations are atomic)
- Update importSession stats: subtract removed counts from totals
- Return removal result: { playersRemoved, enrollmentsRemoved, passportsRemoved, guardiansOrphaned, errors[] }
- Run npx -w packages/backend convex codegen after adding mutation
- Run npx ultracite fix before completion

### US-P3.1-009: Create platform staff analytics backend queries

As platform staff, I need backend queries to fetch cross-org import analytics so I can monitor platform health and identify systemic issues.

**Acceptance Criteria:**
- Create importAnalytics.ts in packages/backend/convex/models/
- Add getPlatformImportAnalytics query (platform staff only):
-   - Total imports across all orgs (last 30 days, last 90 days, all time)
-   - Success rate: (successful imports / total imports) * 100
-   - Average players per import
-   - Total players imported platform-wide
-   - Common error types with counts
- Add getOrgImportHistory query (org admins + platform staff):
-   - Org-specific import list with dates, player counts, status
-   - Success/failure breakdown
-   - Template usage statistics
- Add getCommonErrors query (platform staff only):
-   - Aggregated error messages across all imports
-   - Error frequency counts
-   - Top 10 most common errors
- Add by_organizationId and by_createdAt indexes to importSessions
- Use .withIndex() for all queries - NEVER .filter()
- Return validators for all queries with v.object() schemas
- Run npx -w packages/backend convex codegen after completion
- Run npx ultracite fix before completion

### US-P3.1-010: Create analytics dashboard page for platform staff

As platform staff, I need a visual analytics dashboard so I can monitor import performance and identify trends at a glance.

**Acceptance Criteria:**
- Create apps/web/src/app/platform/analytics/import/page.tsx
- Route protected: redirect non-platform-staff to /orgs/[orgId]/dashboard
- Display key metrics cards at top:
-   - Total Imports (with trend arrow: ↑↓)
-   - Success Rate (percentage with colored badge: green >90%, yellow 70-89%, red <70%)
-   - Total Players Imported (with breakdown by time period)
-   - Average Import Size (players per import)
- Add time period selector: Last 7 Days | Last 30 Days | Last 90 Days | All Time
- Display import activity chart (line chart showing imports over time)
- Display common errors table with error message, count, percentage
- Use Card component from shadcn/ui for metric cards
- Use recharts library for charts (already in package.json)
- Mobile: Metrics stack vertically, chart scrolls horizontally if needed
- Run npx ultracite fix before completion

### US-P3.1-011: Add org-level import history view

As an org admin, I need to see my organization's import history so I can track what data was imported and when.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/import/history/page.tsx
- Display table of all imports for current org:
-   - Date/time
-   - Imported by (user name)
-   - Players imported (count)
-   - Status (Success | Partial | Failed)
-   - Template used (if any)
-   - Actions column with 'View Details' and 'Undo' buttons
- Sort by date descending (most recent first)
- Pagination: 20 imports per page
- Filter by status: All | Success | Partial | Failed
- Filter by date range: Last 7 Days | Last 30 Days | Custom Range
- Use Table component from shadcn/ui
- Use Pagination component from shadcn/ui
- Status badge colors: green (success), yellow (partial), red (failed)
- Mobile: Table scrolls horizontally, cards view on <640px
- Run npx ultracite fix before completion

### US-P3.1-012: Add common error patterns display to analytics

As platform staff, I need to see common error patterns across all orgs so I can improve templates, documentation, and the import wizard.

**Acceptance Criteria:**
- Add 'Common Errors' section to platform analytics dashboard (from US-P3.1-010)
- Display table showing:
-   - Error message (truncated with tooltip for full message)
-   - Occurrences (count)
-   - Affected Orgs (count of unique organizations)
-   - Percentage of total errors
-   - Trend (↑↓ compared to previous period)
- Sort by occurrences descending (most common first)
- Limit to top 10 errors by default, with 'Show More' expansion
- Color-code by severity: critical errors in red, warnings in yellow
- Add 'Export CSV' button for full error report
- Use getCommonErrors query from US-P3.1-009
- Use Table component from shadcn/ui
- Mobile: Table becomes accordion list at <640px
- Run npx ultracite fix before completion


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Guardian matcher uses multi-signal scoring on 100-point scale
- Confidence levels calculated by `getConfidenceLevel(score)` helper
- Match reasons stored as human-readable strings for UI display
- Weights defined as constants at top of guardianMatcher.ts for easy tuning
- None - existing guardian matcher already had scoring infrastructure
- Only needed to adjust weights and persist scores in schema
--
- Confidence indicators only display when `duplicate.guardianConfidence` exists (optional field)
- Badge uses custom className prop to override default variants
- Progress bar implemented as custom div with CSS transitions (300ms) for smooth UX

**Gotchas encountered:**
- None - existing guardian matcher already had scoring infrastructure
- Only needed to adjust weights and persist scores in schema
- Frontend DuplicateInfo type must match backend duplicateValidator
- Both use optional guardianConfidence field (not all duplicates have guardian matches)
- Import from review-step.tsx propagates type to import-wizard.tsx
- [ ] US-P3.1-002: Add color-coded confidence badges to duplicate resolution UI
--
- Initially added Progress component import but removed in favor of custom implementation
- Linter auto-removed unused import (expected behavior)
- Must check for confidence existence before rendering to avoid errors on non-guardian duplicates

### Files Changed

- packages/backend/convex/lib/matching/guardianMatcher.ts (+10, -5)
- packages/backend/convex/models/importSessions.ts (+8, -1)
- apps/web/src/components/import/steps/review-step.tsx (+7, -1)
- ✅ Convex codegen: passed
- ✅ Type checking: passed (no new errors)
- ✅ Linting: passed (pre-existing warnings only)
- ✅ Pre-commit hooks: passed
- ⏭️ Browser verification: not applicable (backend-only changes)
- Guardian matcher uses multi-signal scoring on 100-point scale
- Confidence levels calculated by `getConfidenceLevel(score)` helper
- Match reasons stored as human-readable strings for UI display
- Weights defined as constants at top of guardianMatcher.ts for easy tuning
--
- apps/web/src/components/import/steps/review-step.tsx (+62, -7)
- ✅ Type checking: passed (npm run check-types)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
