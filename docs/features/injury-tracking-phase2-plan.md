# Injury Tracking Phase 2: Recovery Management - Implementation Plan

**GitHub Issue:** #261
**Phase:** 2 of 4
**Status:** Planning
**Date:** February 2026

## Overview

Phase 2 focuses on **Recovery Management** - enabling coaches and parents to create recovery plans, track milestones, update progress, and upload medical documentation.

---

## Phase 2 Scope

| Feature | Priority | Complexity |
|---------|----------|------------|
| Recovery Plan Creation | High | Medium |
| Milestone Tracking | High | Medium |
| Progress Updates | High | Medium |
| Medical Document Upload | Medium | High |
| Recovery Timeline View | Medium | Medium |
| Notifications for Progress | Low | Low |

---

## Current State Analysis

### What Exists

**Schema (playerInjuries table):**
- ✅ `expectedReturn` - ISO date string
- ✅ `actualReturn` - ISO date string
- ✅ `daysOut` - calculated days
- ✅ `treatment` - text field
- ✅ `medicalProvider` - text field
- ✅ `medicalNotes` - private notes
- ✅ `returnToPlayProtocol` - array of steps with completion tracking

**Mutations:**
- ✅ `setReturnToPlayProtocol` - creates protocol steps
- ✅ `completeProtocolStep` - marks steps complete
- ✅ `updateInjuryDetails` - updates treatment/provider/notes
- ✅ `updateInjuryStatus` - changes status

**UI:**
- ✅ Coach injuries page with edit dialog
- ✅ Parent injuries page (read-only)
- ✅ Notification bell with injury alerts

### What's Missing

**Schema:**
- ❌ `estimatedRecoveryDays` - numeric estimate
- ❌ `recoveryPlan` - structured plan object
- ❌ `milestones` - array with dates/completion
- ❌ `medicalDocumentIds` - file references
- ❌ `medicalClearanceRequired` - boolean
- ❌ `medicalClearanceReceived` - boolean
- ❌ `medicalClearanceDate` - date

**Tables:**
- ❌ `injuryProgressUpdates` - progress history
- ❌ `injuryDocuments` - file metadata

**UI:**
- ❌ Recovery plan form (coach)
- ❌ Milestone tracker (coach + parent)
- ❌ Progress update form (parent)
- ❌ Document upload component
- ❌ Recovery timeline visualization

---

## Implementation Tasks

### Task 1: Schema Updates

**File:** `packages/backend/convex/schema.ts`

#### 1.1 Update playerInjuries table

```typescript
// Add to playerInjuries table:

// Recovery planning
estimatedRecoveryDays: v.optional(v.number()),
recoveryPlanNotes: v.optional(v.string()), // Coach's recovery guidance

// Milestones (enhanced from returnToPlayProtocol)
milestones: v.optional(
  v.array(
    v.object({
      id: v.string(),
      description: v.string(),
      targetDate: v.optional(v.string()), // ISO date
      completedDate: v.optional(v.string()),
      completedBy: v.optional(v.string()), // User ID
      notes: v.optional(v.string()),
      order: v.number(),
    })
  )
),

// Medical clearance
medicalClearanceRequired: v.optional(v.boolean()),
medicalClearanceReceived: v.optional(v.boolean()),
medicalClearanceDate: v.optional(v.string()),
```

#### 1.2 Create injuryProgressUpdates table

```typescript
injuryProgressUpdates: defineTable({
  injuryId: v.id("playerInjuries"),
  updatedBy: v.string(), // User ID
  updatedByRole: v.union(
    v.literal("guardian"),
    v.literal("coach"),
    v.literal("admin")
  ),
  updateType: v.union(
    v.literal("progress_note"),
    v.literal("milestone_completed"),
    v.literal("status_change"),
    v.literal("document_uploaded"),
    v.literal("clearance_received")
  ),
  notes: v.optional(v.string()),
  previousStatus: v.optional(v.string()),
  newStatus: v.optional(v.string()),
  milestoneId: v.optional(v.string()), // If milestone-related
  documentId: v.optional(v.id("injuryDocuments")),
  createdAt: v.number(),
})
  .index("by_injury", ["injuryId"])
  .index("by_injury_created", ["injuryId", "createdAt"]),
```

#### 1.3 Create injuryDocuments table

```typescript
injuryDocuments: defineTable({
  injuryId: v.id("playerInjuries"),
  uploadedBy: v.string(), // User ID
  uploadedByRole: v.union(
    v.literal("guardian"),
    v.literal("coach"),
    v.literal("admin")
  ),
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileType: v.string(), // MIME type
  fileSize: v.number(), // bytes
  documentType: v.union(
    v.literal("medical_report"),
    v.literal("clearance_form"),
    v.literal("xray_scan"),
    v.literal("therapy_notes"),
    v.literal("other")
  ),
  description: v.optional(v.string()),
  isPrivate: v.boolean(), // If true, only guardians can see
  createdAt: v.number(),
})
  .index("by_injury", ["injuryId"])
  .index("by_injury_type", ["injuryId", "documentType"]),
```

---

### Task 2: Backend Mutations & Queries

**File:** `packages/backend/convex/models/playerInjuries.ts`

#### 2.1 Recovery Plan Mutations

```typescript
// Set recovery plan for an injury
export const setRecoveryPlan = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    estimatedRecoveryDays: v.optional(v.number()),
    recoveryPlanNotes: v.optional(v.string()),
    milestones: v.optional(v.array(v.object({
      description: v.string(),
      targetDate: v.optional(v.string()),
      order: v.number(),
    }))),
    medicalClearanceRequired: v.optional(v.boolean()),
  },
  // Implementation...
});

// Update a milestone
export const updateMilestone = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    milestoneId: v.string(),
    completedDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  // Implementation...
});

// Add milestone to existing plan
export const addMilestone = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    description: v.string(),
    targetDate: v.optional(v.string()),
  },
  // Implementation...
});

// Remove milestone
export const removeMilestone = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    milestoneId: v.string(),
  },
  // Implementation...
});
```

#### 2.2 Progress Update Mutations

```typescript
// Add progress update (parents/coaches)
export const addProgressUpdate = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    notes: v.string(),
    updateType: v.union(
      v.literal("progress_note"),
      v.literal("milestone_completed")
    ),
    milestoneId: v.optional(v.string()),
  },
  // Implementation - also creates notification
});

// Get progress history
export const getProgressUpdates = query({
  args: {
    injuryId: v.id("playerInjuries"),
    limit: v.optional(v.number()),
  },
  // Implementation...
});
```

#### 2.3 Document Mutations

**File:** `packages/backend/convex/models/injuryDocuments.ts` (NEW)

```typescript
// Generate upload URL
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

// Save document metadata after upload
export const saveDocument = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    documentType: documentTypeValidator,
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  // Implementation - also logs progress update
});

// Get documents for injury
export const getDocuments = query({
  args: {
    injuryId: v.id("playerInjuries"),
  },
  // Implementation - filters private docs based on user role
});

// Delete document
export const deleteDocument = mutation({
  args: {
    documentId: v.id("injuryDocuments"),
  },
  // Implementation - also deletes from storage
});

// Get download URL
export const getDownloadUrl = query({
  args: {
    documentId: v.id("injuryDocuments"),
  },
  // Implementation - checks access permissions
});
```

#### 2.4 Medical Clearance Mutations

```typescript
// Record medical clearance
export const recordMedicalClearance = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    clearanceDate: v.string(),
    documentId: v.optional(v.id("injuryDocuments")),
  },
  // Implementation - updates status, sends notifications
});
```

---

### Task 3: Notification Updates

**File:** `packages/backend/convex/lib/injuryNotifications.ts`

Add new notification functions:

```typescript
// Notify when milestone is completed
export async function notifyMilestoneCompleted(ctx, args) {
  // Notifies coaches when parent completes milestone
  // Notifies parents when coach updates
}

// Notify when progress update is added
export async function notifyProgressUpdate(ctx, args) {
  // Weekly reminder to update progress
}

// Notify when medical clearance received
export async function notifyMedicalClearance(ctx, args) {
  // Notifies coach that clearance is received
}
```

**File:** `packages/backend/convex/schema.ts`

Add notification types:

```typescript
// Add to notifications table type union:
v.literal("milestone_completed"),
v.literal("progress_update"),
v.literal("clearance_received"),
v.literal("recovery_reminder"), // Weekly reminder
```

---

### Task 4: Coach UI Updates

**File:** `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx`

#### 4.1 Recovery Plan Section in Edit Dialog

Add recovery plan form section:
- Estimated recovery days input
- Recovery notes textarea
- Milestone list with add/remove
- Medical clearance required checkbox

#### 4.2 Recovery Plan Card

New card showing:
- Recovery progress visualization
- Milestone checklist
- Expected return date
- Days remaining

#### 4.3 Progress Timeline

New component showing:
- Timeline of all updates
- Who made each update
- Milestone completions highlighted

---

### Task 5: Parent UI Updates

**File:** `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx`

#### 5.1 Progress Update Form

Add ability for parents to:
- Add progress notes
- Mark milestones as completed
- Upload documents

#### 5.2 Recovery Plan View

Display:
- Current recovery plan
- Milestone checklist (can mark complete)
- Expected return date
- Progress timeline

#### 5.3 Document Upload Section

- Upload medical documents
- View uploaded documents
- Mark as private/shared

---

### Task 6: Shared Components

**File:** `apps/web/src/components/injuries/` (NEW directory)

#### 6.1 MilestoneTracker.tsx

```typescript
interface MilestoneTrackerProps {
  milestones: Milestone[];
  canEdit: boolean;
  onComplete: (milestoneId: string) => void;
  onRemove?: (milestoneId: string) => void;
}
```

#### 6.2 RecoveryTimeline.tsx

```typescript
interface RecoveryTimelineProps {
  updates: ProgressUpdate[];
  milestones: Milestone[];
  injuryDate: string;
  expectedReturn?: string;
}
```

#### 6.3 DocumentUpload.tsx

```typescript
interface DocumentUploadProps {
  injuryId: Id<"playerInjuries">;
  onUploadComplete: () => void;
}
```

#### 6.4 DocumentList.tsx

```typescript
interface DocumentListProps {
  documents: InjuryDocument[];
  canDelete: boolean;
  onDelete: (docId: string) => void;
}
```

#### 6.5 RecoveryPlanForm.tsx

```typescript
interface RecoveryPlanFormProps {
  injury: PlayerInjury;
  onSave: (plan: RecoveryPlan) => void;
}
```

---

## Implementation Order

### Week 1: Schema & Backend Foundation

| Day | Task |
|-----|------|
| 1-2 | Schema updates (playerInjuries, new tables) |
| 2-3 | Recovery plan mutations |
| 3-4 | Progress update mutations |
| 4-5 | Document upload mutations |

### Week 2: Core UI Components

| Day | Task |
|-----|------|
| 1-2 | MilestoneTracker component |
| 2-3 | RecoveryTimeline component |
| 3-4 | DocumentUpload component |
| 4-5 | RecoveryPlanForm component |

### Week 3: Page Integration

| Day | Task |
|-----|------|
| 1-2 | Coach injuries page - recovery plan section |
| 2-3 | Coach injuries page - timeline integration |
| 3-4 | Parent injuries page - progress updates |
| 4-5 | Parent injuries page - document upload |

### Week 4: Polish & Testing

| Day | Task |
|-----|------|
| 1-2 | Notifications for progress/milestones |
| 2-3 | Access control testing |
| 3-4 | End-to-end testing |
| 4-5 | Documentation & cleanup |

---

## User Workflows

### Workflow 1: Coach Creates Recovery Plan

```
1. Coach opens injury from dashboard
2. Clicks "Create Recovery Plan"
3. Fills out form:
   - Estimated recovery: 3 weeks
   - Notes: "Rest for week 1, light activity week 2, full return week 3"
   - Milestones:
     [x] Rest period complete (Week 1)
     [ ] Can walk without pain (Week 2)
     [ ] Can jog without pain (Week 2.5)
     [ ] Full training (Week 3)
   - Medical clearance required: Yes
4. Saves plan
5. Parent receives notification: "Recovery plan created for [Player]"
```

### Workflow 2: Parent Updates Progress

```
1. Parent opens child's injury
2. Sees recovery plan with milestones
3. Checks "Can walk without pain" milestone
4. Adds note: "Walked to school today, no issues!"
5. Saves update
6. Coach receives notification: "Progress update for [Player]"
7. Timeline shows new entry
```

### Workflow 3: Parent Uploads Clearance

```
1. Parent has doctor's clearance document
2. Opens injury → Documents section
3. Clicks "Upload Document"
4. Selects "Medical Clearance" type
5. Uploads PDF
6. System marks clearance as received
7. Coach notified: "Medical clearance uploaded for [Player]"
8. Coach reviews and can mark player as "Cleared"
```

---

## Security Considerations

### Document Access Control

| Document Type | Guardian | Coach | Admin |
|--------------|----------|-------|-------|
| Medical Report | Full | Metadata only | Metadata only |
| Clearance Form | Full | Full | Full |
| Private Docs | Full | None | Audit only |

### Privacy Rules

1. Parents control document visibility
2. Coaches see status, not full medical details
3. Private documents only visible to uploading guardian
4. Audit trail for all document access

---

## Testing Checklist

### Backend Tests
- [ ] Schema migration runs successfully
- [ ] Recovery plan CRUD operations
- [ ] Milestone completion updates
- [ ] Progress update creation
- [ ] Document upload/download
- [ ] Access control for documents
- [ ] Notifications triggered correctly

### Frontend Tests
- [ ] Recovery plan form validation
- [ ] Milestone tracker interactions
- [ ] Document upload flow
- [ ] Timeline rendering
- [ ] Mobile responsiveness
- [ ] Error handling

### Integration Tests
- [ ] Coach creates plan → Parent sees it
- [ ] Parent completes milestone → Coach notified
- [ ] Parent uploads document → Coach can view metadata
- [ ] Full recovery workflow end-to-end

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Recovery plans created | 80%+ of moderate/severe injuries |
| Milestone completion rate | 70%+ milestones tracked |
| Document uploads | 50%+ injuries with clearance docs |
| Parent engagement | 60%+ parents update progress weekly |

---

## Dependencies

- Phase 1 must be merged (notifications infrastructure)
- Convex storage setup (already exists for voice notes)
- File upload component (can adapt logo-upload.tsx)

---

## Open Questions

1. Should milestones have required vs optional types?
2. Maximum file size for document uploads?
3. Should documents be automatically deleted after injury heals?
4. Weekly reminder cadence - configurable per org?
5. Should coaches be able to add milestones to parent-created progress?
