# ADR-VNM-023: v2-Claims Component Reuse Strategy

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M6/M9, Stories US-VNM-009, US-VNM-010, US-VNM-015

## Context and Problem Statement

The v2-claims page (`/platform/v2-claims/page.tsx`) contains 426 lines including reusable components (`ClaimRow`, `ArtifactCard`), display configs (`TOPIC_CONFIG`, `STATUS_CONFIG`, `ARTIFACT_STATUS_CONFIG`), and type aliases. The artifacts grid (M6) must achieve feature parity before the v2-claims page is deleted (M9). We need a strategy for what to reuse, what to enhance, and what to discard.

## Decision Drivers

- Feature parity required before v2-claims deletion
- Don't duplicate code -- extract shared constants
- Artifacts grid has MORE features than v2-claims (filters, retry, pagination)
- Component architecture: colocation with page.tsx (not global components)

## Current v2-Claims Components

| Component/Config | Lines | Purpose | Reuse? |
|---|---|---|---|
| `TOPIC_CONFIG` | 24-52 | Topic label/color mapping (15 topics) | YES - Extract to shared |
| `STATUS_CONFIG` | 54-65 | Claim status label/color mapping | YES - Extract to shared |
| `ARTIFACT_STATUS_CONFIG` | 67-78 | Artifact status label/color mapping | YES - Extract to shared |
| `getSeverityColor()` | 82-90 | Severity badge color helper | YES - Extract to shared |
| `ClaimRow` | 94-158 | Individual claim display with badges | ADAPT - Reuse with modifications |
| `ArtifactCard` | 163-223 | Expandable artifact card | REPLACE - New grid row pattern |
| `ArtifactList` | 240-286 | Artifact list with loading state | REPLACE - Table pattern instead |
| `V2ClaimsPage` | 290-425 | Main page with stats | REPLACE - New page entirely |
| Type aliases | 228-236 | TypeScript types from query results | REPLACE - New types from new queries |

## Decision Outcome

### 1. Extract Shared Constants to `_components/shared-configs.ts`

Create `apps/web/src/app/platform/voice-monitoring/_components/shared-configs.ts`:

```typescript
// Extract from v2-claims/page.tsx -- reused by artifacts grid, artifact detail, pipeline view
export const TOPIC_CONFIG: Record<string, { label: string; color: string }> = {
  injury: { label: "Injury", color: "bg-red-100 text-red-800" },
  skill_rating: { label: "Skill Rating", color: "bg-blue-100 text-blue-800" },
  // ... all 15 topics
};

export const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  extracted: { label: "Extracted", color: "bg-blue-100 text-blue-700" },
  // ... all 7 statuses
};

export const ARTIFACT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received: { label: "Received", color: "bg-gray-100 text-gray-700" },
  // ... all 6 statuses
};

export function getSeverityColor(severity: string): string {
  if (severity === "critical") return "bg-red-200 text-red-900";
  if (severity === "high") return "bg-orange-200 text-orange-900";
  return "bg-gray-100 text-gray-700";
}
```

### 2. Adapt ClaimRow Component

Move to `_components/claim-row.tsx` with these enhancements:
- Accept claim data as props (NO useQuery inside)
- Add entity resolution display (candidates, resolved entity)
- Add draft status indicator
- Keep existing topic/status badges, confidence, severity, sentiment

### 3. Replace ArtifactCard with Grid Row

The v2-claims `ArtifactCard` pattern (card-based list) is replaced by a table row pattern with expandable detail. The grid row will have:
- Columns: ID, Status, Source, Coach, Org, Claims, Disambig, Latency, Cost, Created, Actions
- Expandable section: claims list (using adapted ClaimRow), resolution details, retry button

### 4. New Components for Artifacts Grid

| Component | Location | Purpose |
|---|---|---|
| `shared-configs.ts` | `_components/` | Extracted constants from v2-claims |
| `claim-row.tsx` | `_components/` | Adapted ClaimRow with resolution info |
| `artifact-status-badge.tsx` | `_components/` | Reusable status badge (already in M5 scope) |
| `filter-bar.tsx` | `artifacts/` | Filter controls (status, org, date, source, search) |
| `artifacts-table.tsx` | `artifacts/` | Main table with expandable rows |
| `retry-button.tsx` | `_components/` | Retry action with confirmation dialog |

## Feature Parity Checklist

Before deleting v2-claims (M9), verify artifacts grid has:

- [ ] View all artifacts with status badges
- [ ] Expandable rows showing claims inline
- [ ] Topic badges on claims (TOPIC_CONFIG)
- [ ] Status badges on claims (STATUS_CONFIG)
- [ ] Confidence score display per claim
- [ ] Entity mention count per claim
- [ ] Severity badge display
- [ ] Sentiment display
- [ ] Resolved player/team name display
- [ ] Source text display per claim
- [ ] Artifact timestamp display
- [ ] Source channel display
- [ ] Loading skeletons
- [ ] Empty state message

**ADDITIONAL features in artifacts grid (beyond v2-claims):**
- [ ] Filter by status, org, date range, source channel
- [ ] Search by artifact ID
- [ ] Cursor-based pagination (load more)
- [ ] Retry buttons for failed artifacts
- [ ] Coach name display (batch-fetched)
- [ ] Org name display (batch-fetched)
- [ ] Latency display per artifact
- [ ] Cost display per artifact
- [ ] Disambiguation count per artifact
- [ ] Link to artifact detail page

## Implementation Notes

1. Extract shared configs FIRST (before artifacts page implementation)
2. Import configs in both v2-claims (still exists during M6-M8) and new artifacts page
3. ClaimRow adaptation: add `resolutions` and `drafts` optional props
4. v2-claims page continues to work during M6-M8 (parallel operation)
5. M9 verification: manually compare features before deleting
