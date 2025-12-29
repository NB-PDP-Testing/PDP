# Player Development Platform
## Role-Based Behaviours & Use Cases

## Purpose
This document defines the expected behaviours, permissions, and use cases for each role within a Player Development Platform.  
It is intended for engineers, QA, and product stakeholders to derive:
- User stories
- Acceptance criteria
- BDD/Gherkin test cases
- API and permission checks

---

## Core Platform Concepts

- **Player Passport**
  - A persistent digital record that follows a player across:
    - Seasons
    - Teams
    - Clubs
    - Sports
- **Age-aware permissions**
  - Different rules for minors vs adults
- **Consent & safeguarding**
  - Mandatory parental consent for minors
- **Auditability**
  - All changes are logged with user, timestamp, and action

---

## Role Overview

| Role | Description |
|---|---|
| Application Admin | Organisation-level system administrator |
| Coach | Team or individual coach |
| Parent / Guardian | Legal guardian of a minor player |
| Adult Player | Player aged 18+ |
| Child Player | Player under 18 |

---

# 1. Application Admin

## Role Goals
- Configure and govern the platform
- Ensure compliance and safeguarding
- Manage users, roles, and data access

## Behaviours & Use Cases

### Organisation Management
- Create, edit, and deactivate clubs
- Create seasons, teams, squads, and age groups
- Configure sport-specific settings

### User & Role Management
- Create user accounts
- Assign and revoke roles (Admin, Coach, Parent, Player)
- Prevent unauthorised role escalation

### Player Lifecycle
- Create player profiles
- Approve or reject self-registrations
- Archive or deactivate players

### Player Passport Governance
- Define which data persists across clubs and sports
- Lock historical records from modification
- Control data visibility rules

### Compliance & Safeguarding
- Enforce GDPR consent workflows
- Manage parental consent records
- Support data access, export, and erasure requests

### Audit & Oversight
- View system audit logs
- Track data changes and access history

---

# 2. Coach

## Role Goals
- Deliver training and development
- Assess player performance
- Communicate with players and parents

## Behaviours & Use Cases

### Squad & Player Access
- View only players assigned to their teams
- Access player passports (read-only historical data)

### Training & Match Management
- Create training sessions
- Record attendance
- Log match participation and positions

### Player Assessment
- Create qualitative and quantitative assessments
- Add notes, ratings, and observations
- Edit only assessments they created

### Individual Development Plans (IDP)
- Create and update IDPs
- Define goals, milestones, and review dates

### Media & Evidence
- Upload videos, photos, and documents
- Attach media to sessions or assessments

### Communication
- Message players and parents
- Send announcements to teams

### Injury & Wellbeing Tracking
- Log injuries
- Track recovery and return-to-play status

---

# 3. Parent / Guardian

## Role Goals
- Support their child’s development
- Stay informed
- Maintain safety and consent control

## Behaviours & Use Cases

### Player Oversight
- View child’s player passport
- View assessments, IDPs, and progress

### Consent Management
- Grant or revoke consent for:
  - Media usage
  - Medical data
  - Data sharing across clubs/sports

### Communication
- Receive messages and notifications
- Communicate with coaches (controlled channels)

### Scheduling
- View training and match calendars
- Receive schedule updates

### Data Control
- Request corrections to personal data
- Request data export or deletion (where permitted)

---

# 4. Adult Player (18+)

## Role Goals
- Own and manage personal development
- Control passport access
- Collaborate with coaches

## Behaviours & Use Cases

### Passport Ownership
- Full access to own player passport
- Control sharing with clubs, coaches, and sports

### Development Tracking
- View assessments and analytics
- Track long-term performance trends

### Self-Assessment
- Add reflections, wellness updates, and feedback
- Set and manage personal goals

### Injury & Medical Records
- Log injuries and recovery updates
- Control visibility of medical data

### Portability
- Share passport with new clubs
- Revoke access from previous clubs

---

# 5. Child Player (Minor)

## Role Goals
- Engage safely with development
- Stay motivated
- Understand progress in an age-appropriate way

## Behaviours & Use Cases

### Limited Access
- View own progress and achievements
- Access simplified dashboards

### Engagement & Motivation
- View goals and milestones
- Earn badges or recognition

### Feedback
- Submit limited feedback (e.g. emojis, short comments)

### Communication Restrictions
- Receive messages from assigned coaches
- Cannot initiate unrestricted messaging

### Privacy & Safety
- No access to peer assessments
- No editing of official records

---

# Cross-Cutting Scenarios

## Identity & Role Overlap
- Same user acting as:
  - Coach and Parent
  - Player and Coach
- Permissions evaluated per context

## Passport Continuity
- Player moves clubs
- Player switches sports
- Player returns after inactivity

## Compliance
- GDPR export requests
- Right to erasure
- Legal holds for safeguarding cases

---

## Intended Engineering Outputs

This document should be used to derive:
- User stories
- BDD/Gherkin test cases
- Permission matrices
- API access rules
- Audit and compliance requirements

---


| Capability             | Admin | Coach        | Parent | Adult Player | Child Player |
| ---------------------- | ----- | ------------ | ------ | ------------ | ------------ |
| Create Player Passport | ✅     | ❌            | ❌      | ❌            | ❌            |
| View Own Passport      | ❌     | ❌            | ❌      | ✅            | ✅            |
| View Child Passport    | ❌     | ❌            | ✅      | ❌            | ❌            |
| Edit Core Bio Data     | ✅     | ❌            | ❌      | ✅            | ❌            |
| Create Assessments     | ❌     | ✅            | ❌      | ❌            | ❌            |
| Edit Assessments       | ❌     | ✅ (own only) | ❌      | ❌            | ❌            |
| View Assessments       | ✅     | ✅            | ✅      | ✅            | Limited      |
| Create IDP             | ❌     | ✅            | ❌      | ✅            | ❌            |
| Upload Media           | ❌     | ✅            | ❌      | ✅            | ❌            |
| Messaging              | ✅     | ✅            | ✅      | ✅            | Restricted   |
| Consent Management     | ✅     | ❌            | ✅      | ✅            | ❌            |
| Transfer Passport      | ❌     | ❌            | ❌      | ✅            | ❌            |
