# Comprehensive Injury Tracking & Management System

## Overview
Implement a comprehensive injury tracking system that allows coaches, parents, and club admins to record, monitor, and manage player injuries. The system should support recovery tracking, wellness checks, insurance documentation, and provide insights to coaches about player readiness.

## Current State
- Basic injury tracking exists in database schema (`injuries` table)
- Voice notes can mention injuries
- Medical profiles exist
- No comprehensive injury management workflow
- Limited integration between injury tracking and other features

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
- **Coach**: Observes injury during training/match
- **Parent**: Child injured outside club activities
- **Player** (18+): Self-report
- **Medical Staff** (future): Official diagnosis

**Injury Report Form:**
- Player name
- Date/time of injury
- Location (training, match, outside club)
- Body part (shoulder, knee, ankle, head, etc.)
- Injury type (sprain, fracture, concussion, muscle strain)
- Severity (minor, moderate, severe)
- Description/circumstances
- Photo upload (optional)
- Witness information

**Voice Note Integration:**
- Coach can leave voice note: "Player X seemed to hurt their ankle"
- System prompts: "Do you want to create an injury report?"
- Voice transcription auto-populates injury form

### 2. Injury Status Tracking

**Injury Lifecycle:**
1. **Reported** → Initial report filed
2. **Under Assessment** → Awaiting medical evaluation
3. **Confirmed** → Medical diagnosis received
4. **In Recovery** → Active rehabilitation
5. **Cleared** → Medical clearance to return
6. **Returned** → Player back in full training/matches
7. **Recurred** → Same injury happens again (tracked separately)

**Status Updates:**
- Coach, parent, or medical staff can update status
- Automatic notifications to relevant parties
- Timeline view of recovery progress

### 3. Recovery Management

**Recovery Plan:**
- Estimated recovery duration (e.g., 2-4 weeks)
- Treatment plan (rest, physical therapy, etc.)
- Milestones (e.g., "Can jog without pain", "Full sprint without pain")
- Exercises and rehabilitation activities
- Medical appointments schedule
- Photos/videos of progress

**Return-to-Play Protocol:**
- Graduated return (e.g., week 1: light training, week 2: full training, week 3: match play)
- Clearance requirements (doctor note, parent approval, player confirmation)
- Safety checks before return

**Progress Tracking:**
- Parent/player updates progress weekly
- Coach observes and notes changes
- Medical clearance documents uploaded
- Photos showing recovery (optional)

### 4. Coach Dashboard Integration

**Injury Overview Widget:**
- Current injured players
- Players in recovery (expected return date)
- Players recently returned (monitor for recurrence)
- Players cleared but not yet returned

**Team Availability:**
- "Next Match Availability" view
- Shows which players are available, injured, or questionable
- Helps with match planning and lineup decisions

**Injury Alerts:**
- New injury reported
- Player recovery milestone reached
- Player cleared for return
- Overdue recovery updates

### 5. Parent Dashboard Integration

**My Child's Injuries:**
- Current injuries and status
- Recovery plan and milestones
- Upcoming medical appointments
- Instructions from coach/medical staff
- Ability to update progress

**Notifications:**
- Coach reported an injury observation
- Reminder to update recovery progress
- Medical clearance required
- Child cleared to return

### 6. Club Admin Dashboard

**Injury Analytics:**
- Total injuries this season (vs. last season)
- Injury breakdown by type, body part, severity
- Most common injuries
- Injury rate per team, age group, sport
- Average recovery time by injury type

**Compliance & Insurance:**
- Injuries requiring incident reports
- Insurance claims tracking
- Documentation completeness (photos, medical reports)
- Parent signatures and acknowledgments

**Safety Reporting:**
- Patterns indicating unsafe conditions (e.g., multiple ankle sprains on same field)
- Injury rate trends (increasing = investigate)
- Generate reports for board meetings

### 7. Injury Prevention Insights (AI-Powered)

**Predictive Analytics:**
- "Player X is at risk for injury" (based on training load, fatigue, past injuries)
- "Team injury rate is 20% higher than league average" (investigate causes)
- "Ankle injuries spike in October" (field conditions? Equipment?)

**Recommendations:**
- Suggest rest days for overworked players
- Recommend preventive exercises for injury-prone players
- Alert to environmental risks (weather, field conditions)

### 8. Medical Documentation

**Document Storage:**
- Medical reports from doctors
- X-ray/MRI scans (images)
- Physical therapy progress notes
- Insurance forms
- Parent consent for treatment

**Access Control:**
- Parents control who sees medical docs
- Coaches see injury status, not full medical details
- Admins see what's needed for insurance/compliance
- Medical staff (if role exists) have full access

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

### Database Schema

```typescript
injuries {
  id: string
  playerId: Id<"orgPlayerEnrollments">
  organizationId: string

  // Injury details
  injuryDate: number
  bodyPart: string // "ankle", "knee", "shoulder", "head", etc.
  injuryType: string // "sprain", "fracture", "concussion", "strain"
  severity: "minor" | "moderate" | "severe"
  description: string
  location: "training" | "match" | "outside_club"

  // Reporting
  reportedBy: Id<"user"> // Coach, parent, or player
  reportedAt: number
  voiceNoteId?: Id<"voiceNotes"> // If reported via voice note

  // Status tracking
  status: "reported" | "under_assessment" | "confirmed" | "in_recovery" | "cleared" | "returned" | "recurred"
  statusUpdatedAt: number
  statusUpdatedBy: Id<"user">

  // Recovery
  estimatedRecoveryDays?: number
  actualRecoveryDays?: number
  recoveryPlan?: string
  milestones?: {
    description: string
    targetDate: number
    completedDate?: number
    notes?: string
  }[]

  // Medical
  medicalClearanceRequired: boolean
  medicalClearanceReceived: boolean
  medicalClearanceDate?: number
  medicalDocumentIds?: Id<"documents">[]

  // Return to play
  returnToPlayProtocol?: string // "standard" | "concussion" | "fracture"
  returnDate?: number
  returnApprovedBy?: Id<"user">[]

  // Recurrence tracking
  isRecurrence: boolean
  originalInjuryId?: Id<"injuries">
}

injuryUpdates {
  id: string
  injuryId: Id<"injuries">
  updatedBy: Id<"user">
  updateType: "status_change" | "milestone_completed" | "note_added" | "clearance_uploaded"
  timestamp: number
  notes?: string
  attachments?: string[]
}
```

### Notifications
```typescript
// Notify relevant parties
async function notifyInjury(injury: Injury) {
  const player = await ctx.db.get(injury.playerId)

  // Notify coach(es)
  const coaches = await getTeamCoaches(player.teamId)
  for (const coach of coaches) {
    await sendNotification(coach.userId, {
      type: "injury_reported",
      message: `${player.firstName} has reported an injury`,
      injuryId: injury.id,
    })
  }

  // Notify parent(s)
  const parents = await getPlayerParents(player.id)
  for (const parent of parents) {
    await sendNotification(parent.userId, {
      type: "injury_reported",
      message: `An injury has been reported for ${player.firstName}`,
      injuryId: injury.id,
    })
  }

  // Notify admin if severity is high
  if (injury.severity === "severe") {
    const admins = await getOrgAdmins(injury.organizationId)
    for (const admin of admins) {
      await sendNotification(admin.userId, {
        type: "severe_injury_alert",
        message: `Severe injury reported for ${player.firstName}`,
        injuryId: injury.id,
      })
    }
  }
}
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

## Implementation Phases

### Phase 1: Core Injury Reporting
- Injury report form
- Basic status tracking
- Notifications to stakeholders
- Coach/parent dashboards

### Phase 2: Recovery Management
- Recovery plan creation
- Milestone tracking
- Progress updates
- Medical document upload

### Phase 3: Analytics & Prevention
- Admin analytics dashboard
- Injury trends and insights
- AI-powered risk prediction
- Safety recommendations

### Phase 4: Advanced Features
- Return-to-play protocols
- Integration with medical staff role
- Mobile app optimization
- Insurance export features

## References
- Existing `injuries` table in schema
- Medical profiles: Medical Card feature (Feature #4)
- Voice note integration: VoiceNote Enhancement (Feature #7)
- Parent-coach communication: Feature #2

## Open Questions
1. Should there be a "medical staff" role with special permissions?
2. Can injuries be linked to specific training drills or activities (for pattern analysis)?
3. Should system integrate with external medical providers (e.g., physical therapists)?
4. How long should injury records be retained (years after recovery)?
5. Should there be anonymous injury reporting (to encourage reporting of all incidents)?
