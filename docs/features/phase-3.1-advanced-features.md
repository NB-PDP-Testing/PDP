# PlayerARC - Phase 3.1: Confidence Indicators, Partial Undo & Analytics

> Auto-generated documentation - Last updated: 2026-02-14 23:01

## Status

- **Branch**: `ralph/phase-3.1-advanced-features`
- **Progress**: 5 / 12 stories complete
- **Phase Status**: 🔄 In Progress

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
