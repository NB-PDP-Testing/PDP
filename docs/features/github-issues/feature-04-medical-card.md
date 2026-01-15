# Medical Card Feature

## Overview
Implement a comprehensive medical card system that enables coaches, parents, and club administrators to access critical medical information about players in emergency situations, while maintaining proper data privacy and compliance.

## Current State
- Unwired buttons exist in the system for medical card
- `medicalProfiles` table exists in the database
- Feature workflow and management needs to be fully thought out

## Purpose
Provide quick access to critical medical information about a player in emergency situations. The medical card should help speed recovery in disastrous situations by giving coaches and emergency services immediate access to allergies, medications, blood type, and emergency contacts.

## Primary Consumers (Priority Order)
1. **Coaches** - Emergency access during training/matches
2. **Parents** - Management and keeping information up-to-date
3. **Club Admins** - Compliance and ensuring completeness
4. **Emergency Services** - Printable/shareable format for first responders

## Key Features

### 1. Medical Card Management (Parents)
- **Profile Setup**
  - Blood type
  - Allergies (food, medication, environmental)
  - Current medications
  - Medical conditions (asthma, diabetes, seizures, etc.)
  - Emergency contacts (primary, secondary)
  - Doctor information
  - Insurance information
  - Special instructions/notes

- **Data Entry**
  - Easy form-based input
  - Required vs. optional fields
  - Validation for critical information
  - Photo upload for medical documents (if needed)
  - History tracking (when information was last updated)

- **Notifications**
  - Remind parents to update medical information annually
  - Alert when medical card is incomplete
  - Confirmation when information is updated

### 2. Emergency Access (Coaches)
- **Quick Access**
  - One-click access to player's medical card from roster
  - Large, readable display optimized for emergency situations
  - Critical information prominently displayed
  - Mobile-optimized for sideline use

- **Offline Access**
  - Downloadable/printable team medical roster
  - Access medical cards even when offline
  - Cache critical information for quick loading

- **Privacy & Logging**
  - Log when medical cards are accessed
  - Coaches only see medical cards for their assigned teams
  - Emergency access mode (always available, but logged)

### 3. Compliance Dashboard (Club Admins)
- **Completeness Tracking**
  - View which players have complete medical cards
  - View which players have outdated information (>1 year)
  - Filter by team, age group, sport
  - Export compliance reports

- **Enforcement**
  - Option to require medical card completion before season starts
  - Automated reminders to parents with incomplete cards
  - Report generation for board meetings

### 4. Emergency Services Export
- **Printable Format**
  - Print individual medical cards
  - Print entire team roster with critical info
  - PDF export for sharing with emergency services
  - QR code on card for quick digital access

- **Shareable Format**
  - Generate secure link to medical card (time-limited)
  - Share with tournament organizers
  - Share with venue medical staff

## User Workflows

### Parent Workflow
1. Receive notification to complete medical card
2. Navigate to child's profile → Medical Card
3. Fill out comprehensive medical information
4. Save and confirm information is accurate
5. Receive annual reminder to update information

### Coach Emergency Workflow
1. Player is injured during training/match
2. Coach opens app → Team Roster → Player → Medical Card
3. View critical information (allergies, conditions, emergency contacts)
4. Contact emergency services if needed
5. Contact parent/guardian using emergency contact info
6. (Access is logged for audit purposes)

### Admin Compliance Workflow
1. Navigate to Compliance Dashboard
2. View list of players with incomplete medical cards
3. Send bulk reminder to parents
4. Generate compliance report for board
5. Track completion rates over time

## Technical Considerations
- Medical data is highly sensitive - implement strict access controls
- Audit log all medical card accesses
- Ensure GDPR/HIPAA compliance where applicable
- Optimize for mobile (coaches accessing on sideline)
- Consider offline access for poor network situations
- Encrypt sensitive medical data at rest

## Privacy & Security
- Only authorized users can access medical cards
- Parents control their child's medical information
- Coaches only see cards for their assigned teams
- All access is logged for audit purposes
- Option to mark information as "emergency only" (hidden until emergency declared)

## Success Criteria
- Parents can easily enter and update medical information
- Coaches can access critical information in <5 seconds during emergencies
- Club admins can track compliance and completeness
- Medical cards are printable/shareable for tournaments and events
- System is GDPR/HIPAA compliant
- Emergency services can quickly understand player's medical needs

## References
- Existing `medicalProfiles` table in schema
- Medical information compliance requirements
- Industry best practices for emergency medical information systems

## Implementation Phases

### Phase 1: Core Medical Card
- Parent can enter and update medical information
- Coach can view medical cards for their teams
- Basic printable format

### Phase 2: Compliance & Notifications
- Admin compliance dashboard
- Automated reminders to parents
- Completeness tracking

### Phase 3: Emergency Features
- Offline access
- QR codes for quick access
- Emergency services export format
