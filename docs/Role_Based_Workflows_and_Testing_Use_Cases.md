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

## Implementation Status Legend
- ✅ **Implemented** - Fully working in code
- 🟡 **Partial** - Backend exists, UI may be incomplete
- ❌ **Not Implemented** - Not yet in code
- 🔄 **In Progress** - Currently being worked on

---

## Core Platform Concepts

- **Player Passport** ✅
  - A persistent digital record that follows a player across:
    - Seasons ✅
    - Teams ✅
    - Clubs ✅ (via orgPlayerEnrollments)
    - Sports ✅ (via sportPassports)
- **Age-aware permissions** 🟡
  - Different rules for minors vs adults (schema supports, UI partial)
  - Player self-access policies per organization ✅
- **Consent & safeguarding** 🟡
  - Guardian approval system for player self-access ✅
  - Consent for data sharing (consentedToSharing flag) ✅
  - Full GDPR workflow ❌
- **Auditability** 🟡
  - Approval actions logged ✅
  - Player access logs ✅
  - Full change history ❌

---

## Role Architecture

### Better Auth Hierarchy Roles (System-level)
| Role | Description |
|---|---|
| owner | Organization creator, full control |
| admin | Administrative access |
| member | Base membership (default for all users) |

### Functional Roles (Capabilities)
Stored in `member.functionalRoles` array. Users can have multiple:

| Role | Description | Status |
|---|---|---|
| admin | Organization administration | ✅ |
| coach | Team coaching and assessments | ✅ |
| parent | Guardian of minor players | ✅ |
| player | Adult player self-access | ✅ |

---

## Role Overview (Updated)

| Role | Description | Status |
|---|---|---|
| Application Admin | Organisation-level system administrator | ✅ |
| Coach | Team or individual coach | ✅ |
| Parent / Guardian | Legal guardian of a minor player | ✅ |
| Adult Player | Player aged 18+ with self-access | ✅ |
| Child Player | Player under 18 with limited access | 🟡 |

---

# 1. Application Admin

## Role Goals
- Configure and govern the platform
- Ensure compliance and safeguarding
- Manage users, roles, and data access

## Behaviours & Use Cases

### Organisation Management
| Capability | Status | Notes |
|---|---|---|
| Create, edit organizations | ✅ | Via Better Auth organization system |
| Deactivate organizations | 🟡 | Deletion requires platform staff approval (orgDeletionRequests) |
| Create seasons, teams, squads | ✅ | teams table with sport/ageGroup/gender/season |
| Create age groups | ✅ | ageGroups reference table |
| Configure sport-specific settings | ✅ | sportAgeGroupConfig, sportAgeGroupEligibilityRules |
| Team eligibility enforcement | ✅ | teamEligibilitySettings (strict/warning/flexible) |

### User & Role Management
| Capability | Status | Notes |
|---|---|---|
| Create user accounts | ✅ | Via invitation or join request approval |
| Assign functional roles | ✅ | updateMemberFunctionalRoles mutation |
| Revoke roles | ✅ | Via functional role update |
| Approve/reject join requests | ✅ | orgJoinRequests table |
| Approve/reject role requests | ✅ | pendingFunctionalRoleRequests on member |
| Transfer organization ownership | ✅ | transferOwnership mutation |
| Prevent unauthorized role escalation | ✅ | Role-based checks on mutations |

### Player Lifecycle
| Capability | Status | Notes |
|---|---|---|
| Create player profiles | ✅ | playerIdentities + orgPlayerEnrollments |
| Bulk import players | ✅ | batchImportPlayersWithIdentity |
| GAA membership import | ✅ | GAAMembershipWizard component |
| Approve/reject self-registrations | ✅ | Via join request system |
| Archive/deactivate players | 🟡 | Status field exists, UI limited |
| Age group eligibility overrides | ✅ | ageGroupEligibilityOverrides table |

### Player Passport Governance
| Capability | Status | Notes |
|---|---|---|
| Define passport data persistence | ✅ | Sport passports per player identity |
| Lock historical records | ❌ | Not implemented |
| Control data visibility rules | ✅ | playerAccessPolicies per organization |
| Set player self-access minimum age | ✅ | minimumAge in playerAccessPolicies |

### Compliance & Safeguarding
| Capability | Status | Notes |
|---|---|---|
| Configure guardian approval requirements | ✅ | requireGuardianApproval in policies |
| View unclaimed guardians | ✅ | getUnclaimedGuardians query |
| Manage parental consent records | 🟡 | consentedToSharing flag, basic implementation |
| GDPR data access requests | ❌ | Not implemented |
| GDPR data export | ❌ | Not implemented |
| GDPR data erasure | ❌ | Not implemented |
| Legal holds | ❌ | Not implemented |

### Audit & Oversight
| Capability | Status | Notes |
|---|---|---|
| View approval audit logs | ✅ | approvalActions table |
| View player access logs | ✅ | playerAccessLogs table |
| Track data changes | ❌ | Full audit trail not implemented |

---

# 2. Coach

## Role Goals
- Deliver training and development
- Assess player performance
- Communicate with players and parents

## Behaviours & Use Cases

### Squad & Player Access
| Capability | Status | Notes |
|---|---|---|
| View only assigned team players | ✅ | coachAssignments table with teams/ageGroups |
| Access player passports | ✅ | Via sportPassports with org filter |
| Read-only historical data | ✅ | skillAssessments with assessmentDate |
| Multi-team assignment | ✅ | coachAssignments.teams is array |

### Training & Match Management
| Capability | Status | Notes |
|---|---|---|
| Create training sessions | ❌ | Not implemented |
| Record attendance | 🟡 | attendance field on enrollment exists |
| Log match participation | ❌ | Not implemented |
| Log positions played | ❌ | Not implemented |

### Player Assessment
| Capability | Status | Notes |
|---|---|---|
| Create skill assessments | ✅ | skillAssessments table |
| Add notes, ratings, observations | ✅ | notes, privateNotes, rating fields |
| Edit own assessments only | 🟡 | assessedBy field tracked, enforcement partial |
| Benchmark comparisons | ✅ | benchmarkRating, benchmarkStatus fields |
| Coach insight preferences | ✅ | coachInsightPreferences for AI insights |

### Individual Development Plans (IDP)
| Capability | Status | Notes |
|---|---|---|
| Create development goals | ✅ | passportGoals table |
| Update goals and progress | ✅ | Full CRUD on goals |
| Define milestones | ✅ | milestones array on goals |
| Set target/review dates | ✅ | targetDate, nextReviewDue fields |

### Media & Evidence
| Capability | Status | Notes |
|---|---|---|
| Upload videos/photos | ❌ | Not implemented |
| Attach media to sessions | ❌ | Not implemented |
| Attach media to assessments | ❌ | Not implemented |

### Communication
| Capability | Status | Notes |
|---|---|---|
| Message players/parents | ❌ | Not implemented |
| Send team announcements | ❌ | Not implemented |

### Injury & Wellbeing Tracking
| Capability | Status | Notes |
|---|---|---|
| Log injuries (platform-level) | ✅ | playerInjuries table |
| Add org-specific injury notes | ✅ | orgInjuryNotes table |
| Track recovery status | ✅ | status, returnToPlayProtocol fields |
| Return-to-play protocol | ✅ | Protocol steps with completion tracking |

### Voice Notes & AI
| Capability | Status | Notes |
|---|---|---|
| Record voice notes | ✅ | voiceNotes with audioStorageId |
| AI transcription | ✅ | transcription, transcriptionStatus |
| AI-generated insights | ✅ | insights array with player links |
| Apply/dismiss insights | ✅ | status: pending/applied/dismissed |

---

# 3. Parent / Guardian

## Role Goals
- Support their child's development
- Stay informed
- Maintain safety and consent control

## Behaviours & Use Cases

### Player Oversight
| Capability | Status | Notes |
|---|---|---|
| View child's player passport | ✅ | Via guardianPlayerLinks |
| View assessments | ✅ | skillAssessments accessible |
| View development goals | ✅ | passportGoals with parentCanView |
| View progress/trends | 🟡 | Data available, UI limited |

### Consent Management
| Capability | Status | Notes |
|---|---|---|
| Grant/revoke media consent | 🟡 | Field exists, UI not complete |
| Grant/revoke medical data sharing | 🟡 | Via visibility overrides |
| Grant/revoke cross-club data sharing | ✅ | consentedToSharing on guardianPlayerLinks |
| Control player self-access | ✅ | playerAccessGrants table |
| Set visibility overrides | ✅ | visibilityOverrides in grants |
| Notification preferences | ✅ | notifyOnLogin, notifyOnViewSensitive |

### Communication
| Capability | Status | Notes |
|---|---|---|
| Receive messages/notifications | ❌ | Not implemented |
| Communicate with coaches | ❌ | Not implemented |

### Scheduling
| Capability | Status | Notes |
|---|---|---|
| View training/match calendars | ❌ | Not implemented |
| Receive schedule updates | ❌ | Not implemented |

### Data Control
| Capability | Status | Notes |
|---|---|---|
| Request data corrections | ❌ | Not implemented |
| Request data export | ❌ | Not implemented |
| Request data deletion | ❌ | Not implemented |

---

# 4. Adult Player (18+)

## Role Goals
- Own and manage personal development
- Control passport access
- Collaborate with coaches

## Behaviours & Use Cases

### Passport Ownership
| Capability | Status | Notes |
|---|---|---|
| Full access to own passport | ✅ | Via playerAccountLinks + playerSelfAccess |
| Control sharing with clubs | 🟡 | Basic structure exists |
| Control sharing with coaches | 🟡 | Via organization policies |
| View skill ratings | ✅ | Based on visibility settings |
| View skill history | ✅ | skillHistory visibility flag |
| View benchmarks | ✅ | benchmarkComparison visibility flag |

### Development Tracking
| Capability | Status | Notes |
|---|---|---|
| View assessments | ✅ | Via getPlayerSelfViewPassport |
| Track performance trends | 🟡 | Data available, analytics limited |
| View coach notes | ✅ | publicCoachNotes visibility flag |

### Self-Assessment
| Capability | Status | Notes |
|---|---|---|
| Add reflections | 🟡 | playerNotes on passport |
| Add wellness updates | ❌ | Not implemented (Issue #26) |
| Set personal goals | ❌ | Player-created goals not implemented |

### Injury & Medical Records
| Capability | Status | Notes |
|---|---|---|
| Log own injuries | 🟡 | playerInjuries supports player role |
| View injury history | ✅ | injuryStatus visibility flag |
| Control medical data visibility | ✅ | isVisibleToAllOrgs, restrictedToOrgIds |

### Portability
| Capability | Status | Notes |
|---|---|---|
| Share passport with new clubs | 🟡 | Multi-org enrollment exists |
| Revoke access from previous clubs | ❌ | Not implemented |

### Emergency Contacts
| Capability | Status | Notes |
|---|---|---|
| Manage emergency contacts | ✅ | playerEmergencyContacts table |

---

# 5. Child Player (Minor)

## Role Goals
- Engage safely with development
- Stay motivated
- Understand progress in an age-appropriate way

## Behaviours & Use Cases

### Limited Access
| Capability | Status | Notes |
|---|---|---|
| View own progress | ✅ | Via player self-access with guardian approval |
| Access simplified dashboards | ❌ | Child-friendly UI not implemented |
| Age-based access restrictions | ✅ | minimumAge in policies |

### Engagement & Motivation
| Capability | Status | Notes |
|---|---|---|
| View goals and milestones | ✅ | developmentGoals visibility flag |
| Earn badges/recognition | ❌ | Not implemented |

### Feedback
| Capability | Status | Notes |
|---|---|---|
| Submit limited feedback | ❌ | Not implemented |
| Emoji reactions | ❌ | Not implemented |

### Communication Restrictions
| Capability | Status | Notes |
|---|---|---|
| Receive messages from coaches | ❌ | Messaging not implemented |
| Restricted messaging | ❌ | Not applicable (no messaging) |

### Privacy & Safety
| Capability | Status | Notes |
|---|---|---|
| No access to peer assessments | ✅ | By design - players only see own data |
| No editing of official records | ✅ | Read-only access enforced |
| Guardian controls visibility | ✅ | playerAccessGrants |

---

# Cross-Cutting Scenarios

## Identity & Role Overlap
| Scenario | Status | Notes |
|---|---|---|
| Same user as Coach and Parent | ✅ | Multiple functionalRoles supported |
| Same user as Player and Coach | ✅ | functionalRoles array |
| Role switching UI | ✅ | OrgRoleSwitcher component |
| Context-aware permissions | ✅ | activeFunctionalRole on member |

## Passport Continuity
| Scenario | Status | Notes |
|---|---|---|
| Player moves clubs | ✅ | New orgPlayerEnrollment, same playerIdentity |
| Player switches sports | ✅ | Multiple sportPassports per player |
| Player returns after inactivity | ✅ | Enrollment status can be reactivated |
| Cross-org data visibility | ✅ | Controlled by consentedToSharing |

## Compliance
| Scenario | Status | Notes |
|---|---|---|
| GDPR export requests | ❌ | Not implemented |
| Right to erasure | ❌ | Not implemented |
| Legal holds for safeguarding | ❌ | Not implemented |

---

## Capability Matrix (Updated)

| Capability | Admin | Coach | Parent | Adult Player | Child Player |
|---|---|---|---|---|---|
| Create Player Passport | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Own Passport | ❌ | ❌ | ❌ | ✅ | ✅ (with approval) |
| View Team Player Passports | ✅ | ✅ (assigned teams) | ❌ | ❌ | ❌ |
| View Child's Passport | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit Core Bio Data | ✅ | ❌ | ✅ (child) | ✅ | ❌ |
| Create Assessments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Assessments | ✅ | ✅ (own only) | ❌ | ❌ | ❌ |
| View Assessments | ✅ | ✅ | ✅ | ✅ | Limited |
| Create Development Goals | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Development Goals | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log Injuries | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Teams | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure Policies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Grant Self-Access | ❌ | ❌ | ✅ | ❌ | ❌ |
| Use Voice Notes | ❌ | ✅ | ❌ | ❌ | ❌ |
| Bulk Import Players | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Outstanding Features (Not Yet Implemented)

### High Priority
1. **Communication System** - Messages between coaches, parents, players
2. **Training/Match Management** - Sessions, attendance, fixtures
3. **Media Uploads** - Videos, photos attached to assessments
4. **GDPR Compliance** - Data export, erasure, access requests
5. **Adult Wellness Check-in** - Daily wellness for adult players (Issue #26)

### Medium Priority
1. **Full Audit Trail** - All data changes logged
2. **Child-Friendly Dashboard** - Simplified UI for minors
3. **Badge/Achievement System** - Gamification for engagement
4. **Historical Record Locking** - Prevent modifications to old data
5. **Calendar Integration** - Training/match scheduling

### Lower Priority
1. **Feedback/Emoji Reactions** - Player self-reflection
2. **Player-Created Goals** - Self-set development targets
3. **Revoke Previous Club Access** - Fine-grained passport sharing

---

## Intended Engineering Outputs

This document should be used to derive:
- User stories
- BDD/Gherkin test cases
- Permission matrices
- API access rules
- Audit and compliance requirements
