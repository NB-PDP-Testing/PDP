# Phase 2 Complete: Recovery Management - Issue #261

**Date:** February 3, 2026
**Commit:** `f6a96e5f`
**Branch:** `feature/261-injury-tracking-phase1-notifications`

---

## Overview

Phase 2 of the Injury Tracking System has been implemented, adding comprehensive recovery management capabilities including recovery plans, milestone tracking, progress timelines, and medical document uploads.

---

## Files Created (8 new files)

### Frontend Components (`apps/web/src/components/injuries/`)

| File | Description |
|------|-------------|
| `injury-detail-modal.tsx` | Full injury detail view with 4 tabs (Overview, Recovery, Timeline, Documents) |
| `milestone-tracker.tsx` | Interactive milestone checklist with completion tracking |
| `recovery-plan-form.tsx` | Form for coaches to create/edit recovery plans |
| `recovery-timeline.tsx` | Visual timeline of all progress updates |
| `document-list.tsx` | Display uploaded documents with download/delete actions |
| `document-upload.tsx` | File upload component using Convex storage |

### API Routes (`apps/web/src/app/api/`)

| File | Description |
|------|-------------|
| `injury-document-url/route.ts` | Next.js API route to fetch document download URLs from Convex |

### Backend (`packages/backend/convex/models/`)

| File | Description |
|------|-------------|
| `injuryDocuments.ts` | Full CRUD operations for injury documents with storage integration |

---

## Files Modified (7 files)

| File | Changes |
|------|---------|
| `packages/backend/convex/schema.ts` | Added `injuryDocuments` and `injuryProgressUpdates` tables |
| `packages/backend/convex/models/playerInjuries.ts` | Added Phase 2 mutations (milestones, recovery plans, progress updates) |
| `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx` | Integrated InjuryDetailModal, made injury cards clickable |
| `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx` | Integrated InjuryDetailModal (view-only mode for parents) |
| `apps/web/src/app/orgs/[orgId]/admin/layout.tsx` | Fixed dynamic require issue causing Convex client error |
| `apps/web/src/hooks/use-ux-feature-flags.ts` | Enabled all UX feature flags for testing |
| `packages/backend/convex/_generated/api.d.ts` | Auto-generated types updated |

---

## Schema Changes

### New Table: `injuryDocuments`

```typescript
injuryDocuments: defineTable({
  injuryId: v.id("playerInjuries"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileType: v.string(),
  fileSize: v.number(),
  documentType: v.union(
    v.literal("medical_report"),
    v.literal("clearance_form"),
    v.literal("xray_scan"),
    v.literal("therapy_notes"),
    v.literal("insurance_form"),
    v.literal("other")
  ),
  description: v.optional(v.string()),
  isPrivate: v.boolean(),
  uploadedBy: v.string(),
  uploadedByName: v.string(),
  uploadedByRole: v.union(v.literal("guardian"), v.literal("coach"), v.literal("admin")),
  createdAt: v.number(),
})
  .index("by_injury", ["injuryId"])
  .index("by_injury_type", ["injuryId", "documentType"])
```

### New Table: `injuryProgressUpdates`

```typescript
injuryProgressUpdates: defineTable({
  injuryId: v.id("playerInjuries"),
  updatedBy: v.string(),
  updatedByName: v.string(),
  updatedByRole: v.union(v.literal("guardian"), v.literal("coach"), v.literal("admin")),
  updateType: v.union(
    v.literal("progress_note"),
    v.literal("milestone_completed"),
    v.literal("status_change"),
    v.literal("document_uploaded"),
    v.literal("clearance_received"),
    v.literal("recovery_plan_created"),
    v.literal("recovery_plan_updated")
  ),
  notes: v.optional(v.string()),
  previousStatus: v.optional(v.string()),
  newStatus: v.optional(v.string()),
  milestoneId: v.optional(v.string()),
  documentId: v.optional(v.id("injuryDocuments")),
  createdAt: v.number(),
})
  .index("by_injury", ["injuryId"])
  .index("by_injury_created", ["injuryId", "createdAt"])
```

### Updated Table: `playerInjuries`

Added Phase 2 fields:

```typescript
// Recovery planning
estimatedRecoveryDays: v.optional(v.number()),
recoveryPlanNotes: v.optional(v.string()),

// Milestones
milestones: v.optional(v.array(v.object({
  id: v.string(),
  description: v.string(),
  targetDate: v.optional(v.string()),
  completedDate: v.optional(v.string()),
  completedBy: v.optional(v.string()),
  notes: v.optional(v.string()),
  order: v.number(),
}))),

// Medical clearance
medicalClearanceRequired: v.optional(v.boolean()),
medicalClearanceReceived: v.optional(v.boolean()),
medicalClearanceDate: v.optional(v.string()),
```

---

## New Backend Functions

### `injuryDocuments.ts`

| Function | Type | Description |
|----------|------|-------------|
| `generateUploadUrl` | Action | Generate Convex storage upload URL |
| `saveDocument` | Mutation | Save document metadata after upload |
| `getDocuments` | Query | Get documents for injury (filtered by access) |
| `getDocumentsAdmin` | Query | Get all documents (admin view) |
| `getDownloadUrl` | Query | Get download URL for a document |
| `deleteDocument` | Mutation | Delete document and storage |
| `updateDocumentPrivacy` | Mutation | Toggle document privacy |
| `getDocumentCounts` | Query | Get document counts by type |

### `playerInjuries.ts` (New Phase 2 Functions)

| Function | Type | Description |
|----------|------|-------------|
| `getInjuryById` | Query | Get single injury with all fields |
| `setRecoveryPlan` | Mutation | Create/update recovery plan |
| `addMilestone` | Mutation | Add milestone to recovery plan |
| `updateMilestone` | Mutation | Update/complete milestone |
| `removeMilestone` | Mutation | Remove milestone |
| `addProgressUpdate` | Mutation | Add progress note |
| `getProgressUpdates` | Query | Get progress timeline |

---

## Testing Completed

### Manual Testing

| Test Case | Status |
|-----------|--------|
| Coach can open injury detail modal | ✅ Pass |
| Coach can create recovery plan | ✅ Pass |
| Coach can add milestones | ✅ Pass |
| Coach can complete milestones | ✅ Pass |
| Parent can view injury detail modal | ✅ Pass |
| Parent can complete milestones | ✅ Pass |
| Document upload works | ✅ Pass |
| Document download works | ✅ Pass |
| Progress timeline displays updates | ✅ Pass |
| Milestones update in real-time | ✅ Pass |

### Automated Testing

| Check | Status |
|-------|--------|
| Biome linting | ✅ Pass |
| Pre-commit hooks | ✅ Pass |
| Convex codegen | ✅ Pass |

---

## Bug Fixes During Implementation

1. **Admin Layout Convex Client Error**
   - Issue: Dynamic `require()` for `usePathname` and `useQuery` caused "must be used within ConvexProvider" error
   - Fix: Changed to static imports at top of file

2. **Missing `_creationTime` in Returns Validators**
   - Issue: `getProgressUpdates`, `getDocuments`, `getDocumentsAdmin` missing `_creationTime`
   - Fix: Added `_creationTime: v.number()` to all returns validators

3. **Milestones Not Updating in Real-Time**
   - Issue: Modal used static prop data instead of live subscription
   - Fix: Added `getInjuryById` query for real-time data, merged with prop data

4. **Document Download Not Working**
   - Issue: API route `/api/injury-document-url` was never created
   - Fix: Created Next.js API route using `fetchQuery` from `convex/nextjs`

---

## User Workflows Supported

### Coach Workflow
1. View injury from dashboard
2. Click to open detail modal
3. Create recovery plan with estimated days and notes
4. Add milestones with target dates
5. Upload medical documents
6. Track progress via timeline

### Parent Workflow
1. View child's injury from dashboard
2. Click to open detail modal
3. View recovery plan and milestones
4. Mark milestones as complete
5. Add progress notes
6. Upload medical documents

---

## Next Steps (Phase 3+)

- [ ] Notifications for milestone completion
- [ ] Weekly progress reminder emails
- [ ] Medical clearance workflow
- [ ] Injury analytics dashboard
- [ ] Export injury reports

---

## Commit Details

```
feat(injuries): Implement Phase 2 recovery management (#261)

15 files changed, 3001 insertions(+), 93 deletions(-)
```
