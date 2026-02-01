# Comprehensive Injury Tracking & Management System

## Overview
Implement a comprehensive injury tracking system that allows coaches, parents, and club admins to record, monitor, and manage player injuries. The system should support recovery tracking, wellness checks, insurance documentation, and provide insights to coaches about player readiness.

## Current State (Updated February 2026)

### What's Already Implemented

**Database Schema (Complete)**
- `playerInjuries` table with 25+ fields - platform-level injury tracking
- `orgInjuryNotes` table for organization-specific notes on injuries
- Support for multi-org visibility (injuries visible across clubs for same player)
- Return-to-play protocol schema with step tracking
- Voice note linkage field (`voiceNoteId`)

**Backend Functions (Complete)**
Location: `packages/backend/convex/models/playerInjuries.ts`
- `reportInjury()` - Create new injury records
- `updateInjuryStatus()` - Status transitions with auto days-out calculation
- `updateInjuryDetails()` - Update treatment/medical info
- `setReturnToPlayProtocol()` - Configure recovery protocol steps
- `completeProtocolStep()` - Track protocol step completion
- `updateInjuryVisibility()` - Control multi-org visibility
- `getInjuriesForPlayer()` - Query injuries for a single player
- `getInjuriesForMultiplePlayers()` - Bulk query for parent dashboard
- `getAllActiveInjuriesForOrg()` - Org-wide active injuries
- `getAllInjuriesForOrg()` - Complete injury history
- `getInjuryStats()` - Per-player injury statistics
- `getInjuryHistoryByBodyPart()` - Body-part specific history
- `deleteInjury()` - Hard delete capability

**Frontend Pages (Functional)**
- Coach injury tracking: `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx`
  - Report new injuries for players
  - View active injuries across organization
  - Update injury status (active → recovering → cleared → healed)
  - Filter by status
  - Complete injury history view
- Parent injury view: `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx`
  - View all children's injuries
  - Summary statistics (active, recovering, all-clear)
  - Injury history with status badges
- Player passport injury section: `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/player-injuries-section.tsx`

### What's NOT Implemented (Gaps)

| Feature | Priority | Notes |
|---------|----------|-------|
| Notification system | **Critical** | No alerts when injuries reported/updated |
| Parent injury reporting | **High** | Parents can only view, not report injuries |
| Return-to-play protocol UI | **High** | Backend exists, no frontend |
| Milestone tracking UI | **Medium** | No visual progress for recovery |
| Admin analytics dashboard | **Medium** | No aggregate injury analytics |
| Document/image uploads | **Medium** | No medical clearance file storage |
| Voice note auto-creation | **Low** | Schema ready, no integration |
| AI-powered insights | **Future** | Predictive analytics |
| Insurance exports | **Future** | Compliance reporting |

## Purpose
Enable stakeholders to:
- **Coaches**: Know which players are injured, recovery status, when they can return
- **Parents**: Report injuries, track recovery, receive updates
- **Club Admins**: Manage insurance claims, ensure player safety, compliance reporting
- **Players** (senior): Self-report injuries and track recovery
- **Medical Staff** (future): Manage treatment plans and rehabilitation

The system should:
- Keep players at the center of recovery
- Support safe return-to-play protocols
- Provide transparency to all stakeholders
- Enable data-driven injury prevention

## Key Features

### 1. Injury Reporting

**Who Can Report:**
- **Coach**: ✅ IMPLEMENTED - Full injury report form
- **Parent**: ❌ NOT YET - Parents can only view injuries
- **Player** (18+): ❌ NOT YET - No self-report capability
- **Medical Staff** (future): ❌ NOT YET - Role not implemented

**Injury Report Form:** ✅ IMPLEMENTED (Coach side)
- Player name ✅
- Date/time of injury ✅
- Location (training, match, outside club) ✅ (`occurredDuring` field)
- Body part (shoulder, knee, ankle, head, etc.) ✅
- Injury type (sprain, fracture, concussion, muscle strain) ✅
- Severity (minor, moderate, severe, long_term) ✅
- Description/circumstances ✅
- Side (left/right/both) ✅
- Photo upload (optional) ❌ NOT YET
- Witness information ❌ NOT YET

**Voice Note Integration:** ⚠️ PARTIAL
- Schema supports `voiceNoteId` linkage ✅
- Auto-creation from voice note ❌ NOT YET
- Voice transcription auto-populate ❌ NOT YET

### 2. Injury Status Tracking

**Injury Lifecycle (IMPLEMENTED - Simplified to 4 states):**
1. **Active** → Currently injured (initial state)
2. **Recovering** → In recovery/rehabilitation
3. **Cleared** → Medical clearance to return
4. **Healed** → Fully healed (historical)

*Note: The PRD originally proposed 7 states, but the implementation uses 4 states which better matches real-world usage. The simplified model avoids confusion about edge cases like "under assessment" vs "confirmed".*

**Status Updates:** ⚠️ PARTIAL
- Coach can update status ✅
- Parent/medical staff updates ❌ NOT YET
- Automatic notifications ❌ NOT YET (Critical gap)
- Timeline view ❌ NOT YET

### 3. Recovery Management

**Recovery Plan:** ⚠️ PARTIAL (Schema exists, limited UI)
- Estimated recovery duration ✅ (`expectedReturn` field)
- Treatment plan ✅ (`treatment` field)
- Milestones - Schema supports via `returnToPlayProtocol` ✅, UI ❌
- Exercises and rehabilitation activities ❌ NOT YET
- Medical appointments schedule ❌ NOT YET
- Photos/videos of progress ❌ NOT YET

**Return-to-Play Protocol:** ⚠️ PARTIAL (Backend complete, no UI)
- Protocol schema ✅ (step-based with completion tracking)
- Backend functions ✅ (`setReturnToPlayProtocol`, `completeProtocolStep`)
- Protocol management UI ❌ NOT YET
- Clearance requirements ❌ NOT YET (no enforcement)
- Safety checks before return ❌ NOT YET

**Progress Tracking:** ⚠️ PARTIAL
- Coach can update status ✅
- Parent/player updates ❌ NOT YET
- Medical clearance documents ❌ NOT YET
- Photos showing recovery ❌ NOT YET

### 4. Coach Dashboard Integration

**Injury Overview Widget:** ✅ IMPLEMENTED
- Current injured players ✅ (Active Injuries section)
- Players in recovery ✅ (status filtering)
- Expected return date ✅ (shown in injury cards)
- Complete injury history ✅

**Team Availability:** ❌ NOT YET IMPLEMENTED
- "Next Match Availability" view ❌
- Available/injured/questionable status ❌
- Match planning integration ❌

**Injury Alerts:** ❌ NOT YET IMPLEMENTED
- All notification features pending

### 5. Parent Dashboard Integration

**My Child's Injuries:** ✅ IMPLEMENTED (Read-only)
- Current injuries and status ✅
- Summary statistics ✅ (active, recovering, all-clear counts)
- Injury history ✅
- Recovery plan/milestones ❌ NOT YET (no UI)
- **Ability to report injuries** ❌ NOT YET (Critical gap)
- Ability to update progress ❌ NOT YET

**Notifications:** ❌ NOT YET IMPLEMENTED
- All notification features pending

### 6. Club Admin Dashboard - ❌ NOT IMPLEMENTED

**Injury Analytics:** ❌ NOT YET
- No admin injury analytics page exists
- Backend has `getInjuryStats()` for individual players only
- Need aggregate org-level queries

**Compliance & Insurance:** ❌ NOT YET
- No compliance tracking
- No insurance integration

**Safety Reporting:** ❌ NOT YET
- No pattern detection
- No trend analysis

### 7. Injury Prevention Insights (AI-Powered) - ❌ FUTURE PHASE

**Predictive Analytics:** ❌ NOT YET
- All AI features are future scope

**Recommendations:** ❌ NOT YET
- Requires data collection and ML infrastructure

### 8. Medical Documentation - ❌ NOT IMPLEMENTED

**Document Storage:** ❌ NOT YET
- No file upload capability
- Schema proposed for `injuryDocuments` table (see Technical Implementation)

**Access Control:** ⚠️ PARTIAL
- Multi-org visibility controls ✅ (`isVisibleToAllOrgs`, `restrictedToOrgIds`)
- `medicalNotes` field exists for private notes ✅
- Full document access control ❌ NOT YET

## User Workflows

### Scenario 1: Coach Observes Injury During Training
1. During training, Player X twists ankle
2. Coach immediately opens app on sideline
3. Taps "Report Injury" from quick actions
4. Selects Player X
5. Fills out quick form:
   - Body part: Ankle
   - Severity: Moderate
   - Description: "Twisted ankle during drill, ice applied"
6. Submits report
7. Parent receives notification: "Coach reported an injury - review details"
8. Parent acknowledges and adds note: "Taking to doctor tomorrow"
9. Coach marks Player X as unavailable for next session

### Scenario 2: Parent Reports Out-of-Club Injury
1. Child falls off bike, hurts wrist
2. Parent opens app
3. Navigates to child's profile → Health → Report Injury
4. Fills out form:
   - Body part: Wrist
   - Severity: Minor
   - Location: Outside club
   - Description: "Fell off bike, minor bruising"
5. Submits report
6. Coach receives notification
7. Coach marks player as "monitor" (available but careful with wrist activities)

### Scenario 3: Tracking Recovery Progress
1. Player has confirmed ankle sprain (2-3 week recovery)
2. Recovery plan set up with milestones:
   - Week 1: Rest, ice, elevation
   - Week 2: Light walking without pain
   - Week 3: Jogging without pain
   - Week 4: Full training
3. Each week, parent updates progress:
   - Week 1: "Still swollen, resting"
   - Week 2: "Can walk without pain now!"
   - Week 3: "Jogged today, felt good"
4. Week 4: Parent uploads doctor's clearance note
5. Coach marks player as "cleared"
6. Player returns to full training
7. Coach monitors for first 2 sessions (watches for pain/limitation)
8. System tracks successful recovery

### Scenario 4: Admin Reviews Injury Trends
1. Admin opens Injury Analytics dashboard
2. Sees: "10 ankle injuries this season (up from 3 last season)"
3. Investigates: All occurred on Field #2
4. Inspects field, finds uneven surface
5. Schedules field repair
6. Injury rate decreases after repair
7. Admin reports to board: "Proactive injury prevention saved estimated 6 injuries"

### Scenario 5: Preventing Concussion Return Too Early
1. Player has concussion (serious injury)
2. System enforces strict return-to-play protocol:
   - Medical clearance REQUIRED (can't override)
   - Graduated return: 5 steps over minimum 5 days
   - Parent AND doctor must approve each step
3. Coach cannot mark player as available until all steps completed
4. System sends reminders to parent for updates
5. Player safely returns only when fully recovered
6. Audit trail shows compliance with concussion protocol

## Technical Implementation

### Database Schema (IMPLEMENTED)

The following schema is already implemented in `packages/backend/convex/schema.ts`:

```typescript
// Primary injury tracking table (platform-level)
playerInjuries {
  // Platform-level reference (supports multi-club players)
  playerIdentityId: Id<"playerIdentities">

  // Injury details
  injuryType: string           // "sprain", "strain", "fracture", "concussion", etc.
  bodyPart: string             // "ankle", "knee", "shoulder", "head", etc.
  side?: "left" | "right" | "both"

  // Dates
  dateOccurred: string         // ISO date
  dateReported: string         // ISO date

  // Severity and status
  severity: "minor" | "moderate" | "severe" | "long_term"
  status: "active" | "recovering" | "cleared" | "healed"

  // Description
  description: string
  mechanism?: string           // How injury occurred

  // Treatment
  treatment?: string
  medicalProvider?: string
  medicalNotes?: string        // Private medical notes

  // Return to play
  expectedReturn?: string      // ISO date
  actualReturn?: string        // ISO date
  daysOut?: number             // Auto-calculated when cleared/healed
  returnToPlayProtocol?: Array<{
    id: string
    step: number
    description: string
    completed: boolean
    completedDate?: string
    clearedBy?: string
  }>

  // Context
  occurredDuring?: "training" | "match" | "other_sport" | "non_sport" | "unknown"
  occurredAtOrgId?: string     // Which org the injury happened at
  sportCode?: string           // Sport being played when injured

  // Multi-org visibility
  isVisibleToAllOrgs: boolean  // Default true
  restrictedToOrgIds?: string[] // If not visible to all, which orgs can see

  // Reporting
  reportedBy?: string          // User ID who reported
  reportedByRole?: "guardian" | "player" | "coach" | "admin"
  source?: "manual" | "voice_note"
  voiceNoteId?: Id<"voiceNotes">

  // Timestamps
  createdAt: number
  updatedAt: number
}

// Organization-specific notes on injuries
orgInjuryNotes {
  injuryId: Id<"playerInjuries">
  organizationId: string

  note: string
  noteType: "observation" | "training_restriction" | "progress_update" | "clearance" | "follow_up"

  addedBy: string              // User ID
  addedByName: string
  addedByRole: "coach" | "admin" | "medical_officer"

  isPrivate: boolean           // If true, only org admins can see

  createdAt: number
}
```

### Schema Design Decisions

1. **Platform-level tracking**: Uses `playerIdentityId` instead of org-scoped enrollment ID, allowing injuries to be tracked across clubs for multi-club players.

2. **Separate notes table**: `orgInjuryNotes` allows each organization to add their own notes to a shared injury record, respecting organizational boundaries.

3. **Visibility controls**: `isVisibleToAllOrgs` and `restrictedToOrgIds` enable parents to control which clubs see sensitive injury information.

4. **4-state lifecycle**: Simplified from 7 states to 4 (`active` → `recovering` → `cleared` → `healed`) which matches real-world usage patterns.

### Schema NOT YET Implemented

```typescript
// Proposed for Phase 2: Document storage
injuryDocuments {
  injuryId: Id<"playerInjuries">
  documentType: "medical_clearance" | "xray" | "mri" | "physio_notes" | "insurance_form"
  storageId: Id<"_storage">    // Convex file storage
  uploadedBy: string
  uploadedAt: number
  description?: string
}

// Proposed for Phase 3: Injury analytics aggregation
injuryAnalytics {
  organizationId: string
  period: string               // "2026-01", "2026-Q1", "2026"
  totalInjuries: number
  byBodyPart: Record<string, number>
  bySeverity: Record<string, number>
  byAgeGroup: Record<string, number>
  avgRecoveryDays: number
  recurrenceRate: number
}
```

### Notifications (NOT YET IMPLEMENTED)

**Priority**: Critical - this is the #1 gap in the current implementation.

**Notification Events Needed:**

| Event | Recipients | Priority |
|-------|------------|----------|
| Injury reported by coach | Parents of player | High |
| Injury reported by parent | Coaches of player's teams | High |
| Severe injury reported | Org admins | High |
| Status changed to "cleared" | Parents, coaches | Medium |
| Status changed to "healed" | Parents, coaches | Low |
| Protocol step completed | Coaches | Medium |
| Overdue recovery update | Parents | Medium |

**Implementation Options:**

1. **In-app notifications** (Recommended for MVP)
   - Add `notifications` table to schema
   - Show notification badge in navbar
   - Mark as read when viewed

2. **Email notifications** (Phase 2)
   - Use Convex actions with email provider (Resend, SendGrid)
   - User preference for email frequency

3. **Push notifications** (Future)
   - Requires PWA or native app

**Proposed Schema:**
```typescript
notifications {
  userId: string              // Recipient
  organizationId: string
  type: "injury_reported" | "injury_status_changed" | "severe_injury_alert" | "protocol_step_completed"
  title: string
  message: string
  link?: string               // Deep link to relevant page
  relatedInjuryId?: Id<"playerInjuries">
  isRead: boolean
  createdAt: number
}
```

**Proposed Trigger Points:**
```typescript
// In reportInjury mutation - after successful insert:
await notifyInjuryReported(ctx, {
  injuryId: newInjuryId,
  playerId: args.playerIdentityId,
  reportedByRole: args.reportedByRole,
  severity: args.severity,
  organizationId: args.occurredAtOrgId,
});

// In updateInjuryStatus mutation - after successful update:
await notifyStatusChanged(ctx, {
  injuryId: args.injuryId,
  newStatus: args.status,
  playerId: injury.playerIdentityId,
});
```

## Privacy & Safety

### Sensitive Information
- Injuries are sensitive health data
- Parents control visibility of medical details
- Coaches see injury status, not full medical records
- Admins see aggregated data, not individual medical details

### Concussion Protocol
- Special handling for concussions (serious risk if return too early)
- Mandatory graduated return-to-play
- Cannot override safety checks
- Audit trail for compliance

### Insurance & Legal
- Injury reports can be used for insurance claims
- Proper documentation is crucial
- Audit trail of all actions
- Parent acknowledgment of risks

## Success Criteria
- **Adoption**: 90%+ of injuries are tracked in system
- **Compliance**: 100% of concussions follow return-to-play protocol
- **Safety**: Reduction in re-injury rate (players returning too soon)
- **Satisfaction**: 4.5+ star rating from coaches and parents
- **Prevention**: Injury analytics lead to actionable safety improvements

## Implementation Phases (Updated)

### Phase 1: Core Injury Reporting - 70% COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Injury report form (coach) | ✅ Done | Full form with all fields |
| Basic status tracking | ✅ Done | 4-status lifecycle |
| Coach injury dashboard | ✅ Done | Active injuries, history, filtering |
| Parent injury view | ✅ Done | Read-only view of children's injuries |
| **Notification system** | ❌ TODO | Critical gap - no alerts |
| **Parent injury reporting** | ❌ TODO | Parents cannot report injuries |

**Remaining Work for Phase 1:**
1. Build notification infrastructure (injury reported, status changed, severe injury alert)
2. Add injury reporting form to parent dashboard
3. Add "Report Injury" to coach quick actions

### Phase 2: Recovery Management - 30% COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Recovery protocol schema | ✅ Done | `returnToPlayProtocol` array |
| Protocol backend functions | ✅ Done | `setReturnToPlayProtocol`, `completeProtocolStep` |
| **Protocol management UI** | ❌ TODO | No way to create/edit protocols |
| **Milestone tracking UI** | ❌ TODO | No visual progress display |
| Progress updates | ⚠️ Partial | Basic status only, no detailed updates |
| **Document uploads** | ❌ TODO | Need Convex file storage |

**Remaining Work for Phase 2:**
1. Build return-to-play protocol UI (create steps, mark complete)
2. Add milestone progress visualization
3. Implement medical document upload (Convex `_storage`)
4. Add concussion-specific protocol template with mandatory steps

### Phase 3: Analytics & Prevention - 0% COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Admin analytics dashboard | ❌ TODO | Need new page |
| Injury trends charts | ❌ TODO | Need aggregate queries |
| Body part heatmap | ❌ TODO | Visual representation |
| Season comparison | ❌ TODO | Year-over-year metrics |
| AI risk prediction | ❌ Future | Phase 4+ |

**Remaining Work for Phase 3:**
1. Create `/orgs/[orgId]/admin/injuries` analytics page
2. Build aggregate query functions for injury statistics
3. Add charts: injuries by month, by body part, by severity
4. Add team comparison views

### Phase 4: Advanced Features - 10% COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Return-to-play enforcement | ⚠️ Partial | Schema supports it, no enforcement |
| Medical staff role | ❌ TODO | Role exists in notes, no full implementation |
| Voice note integration | ⚠️ Partial | Schema ready, no auto-creation |
| Insurance exports | ❌ TODO | Future requirement |
| Mobile optimization | ❌ TODO | Current pages are responsive but not optimized |

**Remaining Work for Phase 4:**
1. Enforce concussion protocol (cannot clear without completing all steps)
2. Add "Create injury from voice note" flow
3. Build insurance report export (PDF/CSV)
4. Add medical officer permissions and views

## File Locations

### Backend
- **Schema**: `packages/backend/convex/schema.ts` (lines 789-918)
- **Queries/Mutations**: `packages/backend/convex/models/playerInjuries.ts`
- **Org Notes**: `packages/backend/convex/models/orgInjuryNotes.ts` (if exists)

### Frontend
- **Coach Injuries Page**: `apps/web/src/app/orgs/[orgId]/coach/injuries/page.tsx`
- **Parent Injuries Page**: `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx`
- **Player Passport Section**: `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/player-injuries-section.tsx`
- **Coach Sidebar**: `apps/web/src/components/layout/coach-sidebar.tsx` (injuries link)
- **Parent Sidebar**: `apps/web/src/components/layout/parent-sidebar.tsx` (injuries link)

## References
- **Schema Tables**: `playerInjuries`, `orgInjuryNotes` in schema.ts
- Medical profiles: Medical Card feature (Feature #4)
- Voice note integration: VoiceNote Enhancement (Feature #7) - `voiceNoteId` field ready
- Parent-coach communication: Feature #2

## Open Questions (With Recommendations)

| Question | Recommendation | Status |
|----------|----------------|--------|
| Medical staff role with special permissions? | Use `medical_officer` in `addedByRole` for now. Full role can be added later if needed. | Deferred |
| Link injuries to specific drills/activities? | Nice-to-have for Phase 3 analytics. Add `activityId` field when implementing. | Future |
| Integrate with external medical providers? | Out of scope for MVP. Consider API webhooks later. | Out of scope |
| How long to retain injury records? | Keep indefinitely. Injuries are important historical health data. Add `isArchived` flag if UI becomes cluttered. | Decided: Keep all |
| Anonymous injury reporting? | Not recommended for sports context. All injuries should have accountability for safety. | Decided: No |

## Performance Notes

The current implementation has N+1 query patterns in `getAllActiveInjuriesForOrg()` and `getAllInjuriesForOrg()` that should be optimized before scaling:

```typescript
// Current (N+1 pattern) - packages/backend/convex/models/playerInjuries.ts:289
for (const enrollment of activeEnrollments) {
  const injuries = await ctx.db.query("playerInjuries")...  // Query per enrollment
  const player = await ctx.db.get(enrollment.playerIdentityId);  // Another query
}
```

**TODO**: Refactor to batch queries using the patterns in `CLAUDE.md` Performance section.

## Changelog

| Date | Change | Author |
|------|--------|--------|
| Jan 2026 | Initial PRD created | @jkobrien |
| Jan 24, 2026 | Added governing bodies, global sports scope | @CAMMGael |
| Feb 1, 2026 | Updated to reflect current implementation state | Claude |
