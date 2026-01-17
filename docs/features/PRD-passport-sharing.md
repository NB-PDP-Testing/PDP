# Product Requirements Document: Passport Sharing

**Feature Name:** Cross-Organization Passport Sharing
**Document Version:** 1.2
**Date:** January 15, 2026
**Author:** PlayerARC Product Team
**Status:** Draft for Review (Updated with Industry Best Practices)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Goals](#3-vision--goals)
4. [User Personas & Use Cases](#4-user-personas--use-cases)
5. [Industry Best Practices & Standards](#5-industry-best-practices--standards)
6. [Feature Requirements](#6-feature-requirements)
7. [Data Architecture](#7-data-architecture)
8. [Consent Framework](#8-consent-framework)
9. [User Experience Design](#9-user-experience-design)
10. [AI & Insights Engine](#10-ai--insights-engine)
11. [GDPR & Compliance](#11-gdpr--compliance)
12. [Security & Privacy](#12-security--privacy)
13. [Admin & Governance Tools](#13-admin--governance-tools)
14. [Integration & Technical Considerations](#14-integration--technical-considerations)
15. [Implementation Phases](#15-implementation-phases)
16. [Success Metrics](#16-success-metrics)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

### 1.1 Overview

Passport Sharing is a **core foundational feature** of PlayerARC that enables controlled, consent-based sharing of player development data across organizations and sports. Inspired by Open Banking's data portability frameworks, this feature puts the **parent/guardian (or adult player) at the center as the ultimate data controller**, empowering them to authorize, review, and revoke access to their child's development passport.

### 1.2 Strategic Importance

This feature is a **game-changer** for youth sports development because it:

- **Breaks down data silos** between clubs and sports
- **Enables holistic player development** by giving coaches insights into multi-sport activities
- **Empowers parents** with transparency and control over their child's data
- **Creates network effects** as more organizations join the platform
- **Differentiates PlayerARC** as the trusted standard for athlete development data portability

### 1.3 Core Principle

> **"The child stays at the center of their development journey, regardless of which sport they play or which club they belong to."**

The parent/guardian acts as the **data controller**, similar to how individuals control their financial data in Open Banking. They decide:
- **What** data is shared (full passport or selected elements)
- **With whom** it is shared (specific organizations/coaches)
- **For how long** (time-bound consent with renewal requirements)
- **When to revoke** (immediate revocation capability)

### 1.4 Current State

PlayerARC has **~40% of the foundation built**:

| Component | Status |
|-----------|--------|
| Platform-level identity system | ✅ Built |
| Guardian-player linking | ✅ Built |
| Consent flag (`consentedToSharing`) | ✅ Built (schema + backend mutation) |
| Cross-org visibility pattern (injuries) | ✅ Built (reference implementation) |
| PDF export & native sharing | ✅ Built |
| Cross-org passport queries | ❌ Not built |
| Guardian consent UI | ❌ Not built |
| Coach shared passport view | ❌ Not built |
| Share analytics & audit trail | ❌ Not built |
| AI insights from shared data | ❌ Not built |

---

## 2. Problem Statement

### 2.1 Current Pain Points

**For Parents/Guardians:**
- No visibility into what data clubs hold about their child
- Cannot easily share child's development progress when trialing at new clubs
- Must manually provide information to each new organization
- No control over how data is used after their child leaves a club
- Managing multiple club apps/systems with no unified view

**For Coaches:**
- No insight into a player's development in other sports
- Cannot see relevant history when a player joins from another club
- Must start assessment from scratch for new players
- Miss important context about multi-sport athletes
- No understanding of training loads across sports (overtraining risk)

**For Club Administrators:**
- No visibility into what data their coaches are contributing to shared profiles
- Cannot ensure GDPR compliance for data leaving their organization
- No tools to guide parents on data sharing decisions
- Risk exposure from uncontrolled data sharing

**For Players (Adults):**
- Cannot easily share their development history when joining new clubs
- No portability of their athletic development record
- Must rebuild credibility at each new organization

### 2.2 Market Gap

Current solutions in the market:
- **Siloed systems**: Each club/organization has isolated data
- **PDF exports**: Static snapshots that become outdated immediately
- **No consent management**: Parents have no granular control
- **No cross-sport insights**: Coaches miss holistic development picture

### 2.3 Opportunity

By solving this problem, PlayerARC can:
- Become the **trusted standard** for athlete development data
- Create **network effects** (more value as more orgs join)
- Enable **AI-powered insights** across sports and organizations
- Position as the **"Open Banking for Sports Data"**

---

## 3. Vision & Goals

### 3.1 Product Vision

> Create a **human-centric, consent-based data sharing ecosystem** where player development data flows securely between organizations, controlled by parents/guardians, to enable **holistic athlete development** while maintaining **the highest standards of privacy and compliance**.

### 3.2 Design Principles

1. **Parent/Guardian as Data Controller**
   - Ultimate authority over all sharing decisions
   - Granular control over what is shared
   - Immediate revocation capability
   - Full transparency into who accessed what

2. **Child at the Center**
   - Development story follows the athlete
   - Multi-sport journey is connected
   - Insights serve the child's development, not commercial interests

3. **Coach Empowerment**
   - Richer context for better coaching
   - Cross-sport insights for holistic development
   - Clear boundaries on shared vs. owned data

4. **Trust & Transparency**
   - Clear explanations of data usage
   - Audit trails for all access
   - No hidden data flows

5. **Compliance by Design**
   - GDPR principles embedded in architecture
   - Data minimization in sharing
   - Purpose limitation enforced technically

### 3.3 Success Goals

| Goal | Metric | Target |
|------|--------|--------|
| Parent Adoption | % of parents enabling sharing | 60% within 6 months |
| Coach Utilization | % of coaches viewing shared passports | 70% within 6 months |
| Trust Score | Parent satisfaction with control | >4.5/5 rating |
| Cross-Sport Insight | Coaches reporting improved context | 80% positive feedback |
| Compliance | Zero GDPR incidents | 0 incidents |
| Data Quality | Passports with >3 org contributions | 20% within 12 months |

---

## 4. User Personas & Use Cases

### 4.1 Primary Personas

#### 4.1.1 Sarah - Parent of Multi-Sport Child

**Profile:**
- Mother of 12-year-old Jamie who plays GAA football and soccer
- Manages Jamie's activities across two clubs
- Concerned about data privacy but wants coaches to understand full picture
- Uses mobile primarily, limited time for complex admin

**Needs:**
- Single view of Jamie's development across both sports
- Easy way to authorize coaches to see relevant information
- Confidence that data is secure and used appropriately
- Ability to stop sharing if Jamie leaves a club

**Key Use Cases:**
1. Enable GAA coach to see Jamie's soccer fitness/agility data
2. Share development goals across both coaches
3. Revoke access when Jamie takes a break from soccer
4. Review what data each coach has accessed

#### 4.1.2 Michael - Youth Development Coach

**Profile:**
- Coaches U14 GAA team with 25 players
- 8 players also play other sports (soccer, rugby, basketball)
- Wants to understand each player's full development picture
- Concerned about overtraining multi-sport athletes

**Needs:**
- See relevant development data from other sports
- Understand training loads across sports
- Get insights on transferable skills being developed elsewhere
- Communicate with other coaches about shared players

**Key Use Cases:**
1. View shared passports for multi-sport players
2. See AI-generated insights on cross-sport development
3. Identify overtraining risks from combined activity
4. Contact other coaches about coordinating training loads

#### 4.1.3 Emma - Club Administrator

**Profile:**
- Administrator for a large GAA club with 500+ youth players
- Responsible for data protection compliance
- Needs visibility into data flows from the club
- Wants to support parents while maintaining governance

**Needs:**
- Dashboard showing what data is being shared
- Tools to guide parents on sharing decisions
- Audit trail for compliance reporting
- Ability to intervene if inappropriate sharing detected

**Key Use Cases:**
1. Review aggregate sharing statistics for the club
2. Investigate specific sharing arrangements if concerns raised
3. Generate compliance reports for committee
4. Send guidance to parents about sharing features

#### 4.1.4 Alex - Adult Player (18+)

**Profile:**
- 22-year-old who plays club rugby and does CrossFit
- Recently joined a new rugby club after moving cities
- Wants to share training history with new coaches
- Manages own data without parental involvement

**Needs:**
- Full control over own passport sharing
- Easy way to share with new club
- Portable development record
- Privacy from former clubs

**Key Use Cases:**
1. Share rugby passport with new club's coaches
2. Share fitness data from CrossFit with rugby coaches
3. Revoke access from previous club
4. Control what elements are visible

### 4.2 Secondary Personas

#### 4.2.1 Platform Staff

**Needs:**
- System-wide visibility into sharing patterns
- Tools to investigate data protection concerns
- Ability to intervene in edge cases
- Analytics on feature adoption

#### 4.2.2 Physio/Medical Professional (Future)

**Needs:**
- Share injury/recovery information with relevant coaches
- Ensure continuity of care across clubs
- Maintain appropriate confidentiality

---

## 5. Industry Best Practices & Standards

### 5.1 Open Banking Framework

The UK Open Banking framework provides an excellent model for consent-based data sharing:

**Key Principles Applied:**

| Open Banking Principle | PlayerARC Application |
|------------------------|----------------------|
| Explicit consent required | Parent must actively authorize each sharing relationship |
| Granular permissions | Parent chooses which passport elements to share |
| Easy revocation | One-click revocation with immediate effect |
| Consent dashboard | Centralized view of all active sharing relationships |
| Time-limited consent | Sharing expires at season end, requires renewal |
| Audit trail | Full log of who accessed what and when |
| Data minimization | Share only what's needed for stated purpose |

**Reference:** [Open Banking Standards - Consent Management](https://standards.openbanking.org.uk/customer-experience-guidelines/introduction/consent-mgmt/v3-1-5/)

### 5.2 Apple Health / Google Fit Model

Health data platforms provide excellent UX patterns for sensitive data sharing:

**Adopted Patterns:**

1. **Just-in-Time Consent**: Request permission at the moment it's needed, not upfront
2. **Granular Data Types**: Separate consent for each data category
3. **Visual Permission Indicators**: Clear icons showing what's shared with whom
4. **Easy Access to Settings**: One tap to review/modify permissions
5. **Data Type Explanations**: Clear descriptions of what each type contains

**Reference:** [Apple HealthKit Privacy](https://developer.apple.com/documentation/healthkit)

### 5.3 Solid Project (Data Pods)

Tim Berners-Lee's Solid project provides the conceptual model for user-centric data:

**Adopted Concepts:**

1. **User as Data Controller**: Parent controls the "pod" of child's data
2. **Selective Sharing**: Grant access to specific data, not all-or-nothing
3. **Portable Identity**: Player identity exists independent of any single club
4. **Revocable Access**: Access can be withdrawn at any time
5. **Interoperability**: Data can be shared across different systems

**Reference:** [Solid Project](https://solidproject.org/about)

### 5.4 MyData Standard

The MyData framework for human-centric personal data management:

**Adopted Principles:**

1. **Consent Receipts**: Verifiable record of what was consented to
2. **Transparency Dashboard**: Central view of all data relationships
3. **Machine-Readable Consent**: Technically enforceable permissions
4. **Withdrawal Mechanism**: Clear process to withdraw consent
5. **Purpose Limitation**: Data can only be used for stated purpose

**Reference:** [MyData Architecture](http://hiit.github.io/mydata-stack/stack.html)

### 5.5 Youth Athlete Data Protection

Special considerations for youth sports data:

**Requirements:**

1. **Parental Consent Mandatory**: Children cannot consent to data sharing themselves
2. **Age-Appropriate Explanations**: Clear language suitable for young people
3. **Enhanced Safeguards**: Higher bar for sharing sensitive data
4. **No Commercial Use**: Development data cannot be sold or used for profiling
5. **Right to be Forgotten**: Complete deletion when requested

**Reference:** [GDPR-K: Children's Data](https://www.clarip.com/data-privacy/gdpr-child-consent/)

### 5.6 2025 Regulatory Updates & Emerging Standards

Based on 2025 industry trends and regulatory developments, PlayerARC incorporates the following emerging best practices:

#### 5.6.1 AI Consent Disclosure (Apple Guideline 5.1.2(i) - Nov 2025)

When AI processes shared data, explicit disclosure is required:

**Implementation:**
1. **AI Processing Disclosure**: Consent flow includes clear statement: "AI will analyze shared data to generate cross-sport insights"
2. **Separate AI Opt-In**: Phase 2 will offer separate consent for AI processing beyond basic sharing
3. **Transparency**: AI-generated insights clearly labeled with "AI Generated" badge
4. **Limitation Statement**: "AI insights are generated within PlayerARC only - no external AI processing"

**Reference:** [Apple App Store Review Guidelines 5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/#data-use-and-sharing)

#### 5.6.2 Tiered Consent Model (Healthcare 2025 Best Practice)

Data sharing uses a tiered approach based on sensitivity:

| Tier | Data Types | Consent Level |
|------|------------|---------------|
| **Tier 1** | Basic profile (name, age group, photo) | Standard consent, lowest friction |
| **Tier 2** | Development data (skills, goals, notes) | Standard consent with element selection |
| **Tier 3** | Health/Contact (injuries, medical, contact info) | Enhanced confirmation dialog required |
| **Tier 4** | AI Processing | Separate opt-in consent (Phase 2) |

This tiering is reflected in the UI through progressive disclosure and additional confirmation for sensitive categories.

#### 5.6.3 New York CDPA Alignment (June 2025)

While PlayerARC is designed for GDPR compliance, US state laws are considered:

**New York Child Data Protection Act (CDPA) Provisions:**
- Prohibits sale of minors' data (PlayerARC: No commercial use policy)
- Requires Data Protection Agreements with third parties (PlayerARC: No third-party sharing)
- 14-day deletion upon user request (Future feature consideration)
- Enhanced parental consent for under-18 data (Already implemented)

**Reference:** [NY CDPA Summary](https://www.nysenate.gov/legislation/bills/2025/S2296)

#### 5.6.4 Dynamic/Adaptive Permissions (Future Enhancement)

Open Banking 2025 trends include context-aware permissions:

**Planned for Future Phases:**
- Time-bound purpose sharing (e.g., "Share training load only during pre-season")
- Context triggers (e.g., "Pause sharing during injury recovery")
- Adaptive recommendations based on usage patterns

#### 5.6.5 Privacy-Preserving Technology

Technical architecture incorporates privacy-preserving principles:

1. **Consent Gateway**: All shared data passes through consent validation layer
2. **Abstraction Layer**: Sensitive identifiers abstracted where possible in cross-org queries
3. **No Direct Access**: Receiving organizations cannot directly query source org databases
4. **Data Freshness**: Cached shared data with configurable refresh intervals

---

## 6. Feature Requirements

### 6.1 Functional Requirements

#### 6.1.1 Parent/Guardian Capabilities

**FR-P1: Sharing Control Center**
- Parent can access a dedicated "Sharing" section in their dashboard
- View all children and their current sharing status
- See which organizations have access to each child's data
- One-click access to modify any sharing arrangement

**FR-P2: Enable Sharing**
- Parent can enable passport sharing for a specific child
- Choose which organizations can see the shared passport
- Select which passport elements to share (granular control)
- Set sharing duration (season, 6 months, 1 year, custom)
- Provide consent with clear explanation of what's being shared

**FR-P3: Granular Element Selection**
- Parent can select/deselect individual passport elements:
  - [ ] Basic profile (name, age group, photo)
  - [ ] Skill ratings & assessments
  - [ ] Development goals & milestones
  - [ ] Coach notes (public notes only)
  - [ ] Benchmark comparisons
  - [ ] Attendance records
  - [ ] Injury history (safety-critical)
  - [ ] Medical summary
  - [ ] Contact information (for coach-to-coach communication)
- Default recommendation: Full passport sharing (with opt-out)
- Medical/contact info requires additional confirmation

**FR-P4: Organization Selection**
- Parent can choose specific organizations to share with
- Options:
  - All organizations where child is enrolled
  - Specific organizations (select from list)
  - Any organization on platform (broadest sharing)
- Clear explanation of implications of each choice

**FR-P5: Sharing Duration & Renewal**
- Sharing automatically expires at defined period
- Reminder notification 2 weeks before expiry
- Parent must actively renew to continue sharing
- If child becomes inactive in source organization, sharing stops automatically
- Season-end guard: All shares require re-authorization at new season start

**FR-P6: Immediate Revocation**
- Parent can revoke any sharing arrangement instantly
- Revocation takes effect within 60 seconds
- Receiving organization sees "Access Revoked" message
- Historical view retained for audit but marked as revoked

**FR-P7: Access Audit Trail**
- Parent can see detailed log of who accessed their child's data:
  - Organization name
  - User name and role
  - What was accessed (which sections)
  - When (timestamp)
  - How many times
- Export audit log as PDF/CSV for records

**FR-P8: Unified Parent Dashboard (Cross-Org)**
- New platform-level dashboard at `/parents` or `/parent/dashboard`
- See ALL children across ALL organizations in one view
- Unified activity feed across all children and sports
- Quick navigation to specific org/child views
- Sharing status summary for each child

**FR-P9: Notification Preferences**
- Parent can configure access notification frequency:
  - **Real-time**: Immediate notification on every access
  - **Daily digest**: Summary of all access in past 24 hours
  - **Weekly digest**: Summary of all access in past 7 days (default)
  - **None**: No access notifications (can still view log manually)
- Accessible via sharing settings
- Can be configured per-child or globally
- Default: Weekly digest (recommended during onboarding)

**FR-P10: Multi-Guardian Handling**
- Any guardian with `hasParentalResponsibility: true` can enable, modify, or revoke sharing
- ALL guardians with parental responsibility are notified of any sharing changes
- Notification includes: what changed, who changed it, option to review/modify
- Audit log captures which guardian made each change
- No "primary guardian" concept for sharing authority - equal rights
- Supports shared custody arrangements and modern family structures

**FR-P11: Age 18 Transition**
- On player's 18th birthday:
  1. All active shares are automatically PAUSED (not revoked)
  2. Control transfers from parent to player
  3. Player receives notification to review their sharing status
  4. Player must confirm, modify, or revoke each existing share
  5. Parent retains read-only access to audit log for previously shared data
- Shares remain paused until player takes action
- Coaches are notified that shares are "pending player review"
- Scheduled job checks for players turning 18 daily

**FR-P12: Data Portability Export (GDPR Article 20)**
- Parent can download all shared data in portable format
- Export formats: JSON (machine-readable), CSV (spreadsheet), PDF (human-readable)
- Export includes:
  - Full consent history (all shares created, modified, revoked)
  - Complete access audit log (who viewed what, when)
  - Shared passport elements with timestamps
  - Receiving organization details
- Available via "Export My Sharing Data" button in sharing dashboard
- Export generation is async with email notification when ready
- Supports GDPR Article 20 data portability right
- No charge for standard exports (platform policy)

#### 6.1.2 Coach Capabilities

**FR-C1: Shared Players View**
- New section in coach dashboard: "Players with Shared Passports"
- List of players where parent has authorized cross-org sharing
- Visual indicator showing which players have additional data available
- Filter by: sport, organization, data richness

**FR-C2: View Shared Passport**
- Coach can view shared passport data for authorized players
- Clear visual distinction between:
  - Own organization's data (editable)
  - Shared data from other organizations (read-only)
- "Shared from [Organization Name]" badge on shared data
- Timestamp showing when data was last updated

**FR-C3: Enriched Player Profile**
- Player profile page shows combined view:
  - Local passport data (primary view)
  - "Cross-Sport Insights" expandable section
  - Shared data clearly demarcated
- No pollution of local view - shared data is additive overlay
- Toggle to show/hide shared data

**FR-C4: AI Insights Panel**
- For players with shared passports, AI-generated insights:
  - Cross-sport skill correlations
  - Training load analysis (combined hours/intensity)
  - Transferable skills being developed
  - Potential overtraining indicators
  - Development recommendations
- Insights update weekly or on significant data changes

**FR-C5: Contact Information Access**
- If parent authorized contact sharing:
  - See contact details for other coaches working with player
  - Enable off-platform communication
  - Clear indication this is for coordination purposes only

**FR-C6: Coach Share Acceptance**
- Coach receives notification when parent shares a passport with their organization
- Coach can view summary of what's being shared before accepting
- Coach can accept (data becomes visible) or decline (parent notified)
- Acceptance is at organization level - one coach accepts for the org
- All coaches at that org with appropriate team assignments can then view
- Accepted shares appear in coach's "Shared Players" section
- Declined shares can be re-offered by parent (with "Previously declined" badge)
- After 3 declines for same share, cooling-off period required
- Team-scoped access: Coaches only see shares for players on their assigned teams

**FR-C7: Coach Request Access**
- Coach can identify players enrolled at other organizations
- Coach can send "Request to View Passport" to parent
- Request includes: Coach name, organization, reason (optional)
- Parent receives notification with approve/decline options
- If approved, parent is taken to enable sharing flow
- Requests auto-expire after 14 days
- Parent can dismiss early if not interested
- Coach can re-request after expiry
- Can request access to players at ANY organization on platform (including non-enrolled)
- Warning shown: "Jamie is not currently enrolled at [Your Club]. Continue?"

**FR-C8: Data Freshness Indicators**
- Display "Last updated: [date]" on all shared sections
- Amber warning if no updates in 6+ months: "This data hasn't been updated recently"
- If source organization becomes inactive:
  - Coach sees: "Data from [Org] is no longer available - source organization inactive"
  - Parent is notified of the pause

#### 6.1.3 Adult Player Capabilities

**FR-A1: Self-Controlled Sharing**
- Adult players (18+) have full control over their own passport sharing
- Same capabilities as parent/guardian for their own data
- No guardian approval required
- All sharing decisions are player's alone

**FR-A2: Share with New Organization**
- When joining a new club, player can share passport from other enrollments
- "Import My Development History" workflow
- Select which past organizations to share from
- Select which elements to include

**FR-A3: Manage Sharing Across Organizations**
- View all organizations that have access to passport
- Modify/revoke access individually
- Set up new sharing arrangements

#### 6.1.4 Club Admin Capabilities

**FR-AD1: Sharing Overview Dashboard**
- See aggregate statistics for the club:
  - Number of players with sharing enabled
  - Number of incoming shared passports (from other orgs)
  - Number of outgoing shared passports (to other orgs)
  - Sharing trends over time

**FR-AD2: Outgoing Shares Report**
- List of all passport data being shared FROM the club
- Shows: Player, Receiving Organization, Elements Shared, Since When
- Filter by: player, receiving org, date range
- Export for compliance records

**FR-AD3: Incoming Shares Report**
- List of all passport data being received BY the club
- Shows: Player, Source Organization, Elements Received, Since When
- Which coaches have accessed the data
- Export for compliance records

**FR-AD4: Guidance Tools**
- Send information to parents about sharing features
- Templates for explaining sharing benefits and controls
- FAQ and help content specific to admin oversight

**FR-AD5: Intervention Capability**
- Flag suspicious or inappropriate sharing for platform review
- Cannot override parent decisions but can escalate concerns
- Receive alerts for unusual sharing patterns

**FR-AD6: Organization Contact Configuration**
- Admin can configure public contact for passport sharing coordination
- Two modes available:
  - **Direct contact**: Name + Email + Phone (full details)
  - **Form mode**: General enquiries form/page URL (controlled routing)
- Admin selects their preferred mode in organization settings
- This contact info is visible to coaches at other organizations when viewing shared data
- Purpose: Enable coach-to-coach coordination about shared players
- Can be updated anytime in organization settings

#### 6.1.5 Platform Staff Capabilities

**FR-PS1: System-Wide Monitoring**
- Dashboard showing platform-wide sharing statistics
- Alert system for unusual patterns
- Search for specific sharing arrangements

**FR-PS2: Intervention Tools**
- Ability to suspend specific sharing arrangements
- Emergency revocation capability (with audit)
- Communication tools to contact affected parties

**FR-PS3: Compliance Reporting**
- Generate GDPR compliance reports
- Data flow mapping across organizations
- Consent audit trail exports

**FR-PS4: Safeguarding Access**
- Platform staff can export sharing audit trails for safeguarding investigations
- Requires:
  - Documented case reference
  - Reason for access
  - Authorized by designated safeguarding lead
  - All access independently audited
- Covered in platform Terms of Service and Privacy Policy
- Notify parents if legally permissible
- "Safeguarding export" function for designated platform staff only

### 6.2 Non-Functional Requirements

**NFR-1: Performance**
- Shared passport queries return within 500ms
- Consent changes propagate within 60 seconds
- Dashboard loads within 2 seconds

**NFR-2: Availability**
- Sharing service 99.9% uptime
- Consent revocation available even during maintenance

**NFR-3: Security**
- All sharing data encrypted at rest and in transit
- Access logging for all shared data views
- No caching of shared data on client devices

**NFR-4: Scalability**
- Support 100,000+ active sharing relationships
- Handle 1,000+ concurrent shared passport views

**NFR-5: Auditability**
- Complete audit trail for minimum 7 years
- Immutable consent records
- Export capability for regulatory requests

---

## 7. Data Architecture

### 7.1 Existing Schema (Leverage)

The following tables already exist and will be leveraged:

```typescript
// Platform-level identity (existing)
playerIdentities: {
  firstName, lastName, dateOfBirth, gender, playerType
  // No organizationId - exists across all orgs
}

guardianIdentities: {
  firstName, lastName, email, phone, address
  userId // Links to Better Auth
}

guardianPlayerLinks: {
  guardianIdentityId, playerIdentityId,
  relationship, isPrimary, hasParentalResponsibility,
  consentedToSharing: boolean // KEY FIELD - already exists
}

// Org-scoped enrollment (existing)
orgPlayerEnrollments: {
  playerIdentityId, organizationId,
  ageGroup, season, status
}

// Passport data (existing)
sportPassports: { playerIdentityId, organizationId, sport, ... }
skillAssessments: { passportId, rating, assessedBy, ... }
passportGoals: { sportPassportId, title, status, ... }
playerInjuries: {
  playerIdentityId,
  isVisibleToAllOrgs, // Reference pattern for visibility
  restrictedToOrgIds
}
```

### 7.2 Existing Schema Updates

The following fields need to be added to existing tables:

```typescript
// === ORGANIZATION TABLE UPDATES ===
// Add sharing contact configuration to organization table
organization: {
  // ... existing fields ...

  // NEW: Sharing contact configuration
  sharingContactMode: v.optional(v.union(v.literal("direct"), v.literal("form"))),
  sharingContactName: v.optional(v.string()),
  sharingContactEmail: v.optional(v.string()),
  sharingContactPhone: v.optional(v.string()),
  sharingEnquiriesUrl: v.optional(v.string()), // For form mode
}

// === COACH NOTES TABLE UPDATES ===
// Add shareability flag to coach notes (passportGoals or coachNotes table)
coachNotes: {
  // ... existing fields ...

  // NEW: Shareability flag
  isShareable: v.optional(v.boolean()),        // Default: false
  markedShareableAt: v.optional(v.number()),
  markedShareableBy: v.optional(v.string()),
}

// === PLAYER IDENTITY UPDATES ===
// Add age verification field
playerIdentities: {
  // ... existing fields ...

  // NEW: Age 18 transition tracking
  ageVerified18Plus: v.optional(v.boolean()),
  age18TransitionDate: v.optional(v.number()),
  controlTransferredAt: v.optional(v.number()),
}
```

### 7.3 New Schema Required

```typescript
// === SHARING CONSENT MANAGEMENT ===

/**
 * Passport Share Consents
 * Records explicit sharing consent from guardian/adult player
 * One record per guardian-player-receiving_org combination
 */
passportShareConsents: defineTable({
  // Who is sharing
  playerIdentityId: v.id("playerIdentities"),
  grantedBy: v.string(), // userId of guardian or adult player
  grantedByType: v.union(v.literal("guardian"), v.literal("self")),
  guardianIdentityId: v.optional(v.id("guardianIdentities")), // If guardian

  // Where data comes from (can be all orgs or specific)
  sourceOrgMode: v.union(
    v.literal("all_enrolled"),      // All orgs player is enrolled in
    v.literal("specific_orgs")      // Only selected orgs
  ),
  sourceOrgIds: v.optional(v.array(v.string())), // If specific_orgs mode

  // Who can see the data
  receivingOrgId: v.id("organization"), // The org receiving shared access

  // What can be seen (granular element control)
  sharedElements: v.object({
    basicProfile: v.boolean(),        // Name, age group, photo
    skillRatings: v.boolean(),        // Skill assessments
    skillHistory: v.boolean(),        // Historical ratings
    developmentGoals: v.boolean(),    // Goals & milestones
    coachNotes: v.boolean(),          // Public coach notes
    benchmarkData: v.boolean(),       // Benchmark comparisons
    attendanceRecords: v.boolean(),   // Training/match attendance
    injuryHistory: v.boolean(),       // Injury records (safety-critical)
    medicalSummary: v.boolean(),      // Medical profile summary
    contactInfo: v.boolean(),         // Guardian/coach contact for coordination
  }),

  // Consent lifecycle
  consentedAt: v.number(),            // Timestamp of consent
  expiresAt: v.number(),              // When consent expires
  renewalReminderSent: v.boolean(),   // Whether reminder was sent

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("expired"),
    v.literal("revoked"),
    v.literal("suspended")            // Platform intervention
  ),
  revokedAt: v.optional(v.number()),
  revokedReason: v.optional(v.string()),

  // Renewal tracking
  renewalCount: v.number(),           // How many times renewed
  lastRenewedAt: v.optional(v.number()),

  // Coach Acceptance (NEW)
  coachAcceptanceStatus: v.union(
    v.literal("pending"),              // Awaiting coach acceptance
    v.literal("accepted"),             // Coach accepted the share
    v.literal("declined")              // Coach declined the share
  ),
  acceptedByCoachId: v.optional(v.string()),
  acceptedAt: v.optional(v.number()),
  declinedAt: v.optional(v.number()),
  declineReason: v.optional(v.string()),
  declineCount: v.optional(v.number()),   // Track repeated declines for cooling-off

  // Age 18 Transition (NEW)
  pausedForAge18Review: v.optional(v.boolean()), // True when player turns 18
  age18ReviewCompletedAt: v.optional(v.number()),

  // Metadata
  consentVersion: v.string(),         // Version of consent terms accepted
  ipAddress: v.optional(v.string()),  // For audit purposes
})
.index("by_player", ["playerIdentityId"])
.index("by_player_and_status", ["playerIdentityId", "status"])
.index("by_receiving_org", ["receivingOrgId"])
.index("by_receiving_org_and_status", ["receivingOrgId", "status"])
.index("by_granted_by", ["grantedBy"])
.index("by_expiry", ["status", "expiresAt"])
.index("by_coach_acceptance", ["receivingOrgId", "coachAcceptanceStatus"]),

/**
 * Passport Share Access Logs
 * Immutable audit trail of all access to shared passport data
 */
passportShareAccessLogs: defineTable({
  consentId: v.id("passportShareConsents"),
  playerIdentityId: v.id("playerIdentities"),

  // Who accessed
  accessedBy: v.string(),             // userId
  accessedByName: v.string(),         // Denormalized for audit
  accessedByRole: v.string(),         // coach, admin, etc.
  accessedByOrgId: v.id("organization"),
  accessedByOrgName: v.string(),      // Denormalized for audit

  // What was accessed
  accessType: v.union(
    v.literal("view_summary"),        // Viewed shared passport overview
    v.literal("view_skills"),         // Viewed skill details
    v.literal("view_goals"),          // Viewed development goals
    v.literal("view_notes"),          // Viewed coach notes
    v.literal("view_medical"),        // Viewed medical/injury info
    v.literal("view_contact"),        // Viewed contact information
    v.literal("export_pdf"),          // Exported shared data as PDF
    v.literal("view_insights")        // Viewed AI insights
  ),

  // Context
  accessedAt: v.number(),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),

  // Source information
  sourceOrgId: v.optional(v.string()), // Which org's data was viewed
})
.index("by_consent", ["consentId"])
.index("by_player", ["playerIdentityId"])
.index("by_accessor", ["accessedBy"])
.index("by_org_accessed", ["accessedByOrgId"])
.index("by_date", ["accessedAt"]),

/**
 * Passport Share Insights
 * AI-generated insights from cross-org passport data
 * Cached to avoid repeated computation
 */
passportShareInsights: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  receivingOrgId: v.id("organization"),

  // Insight content
  insightType: v.union(
    v.literal("cross_sport_skills"),      // Skills correlating across sports
    v.literal("training_load"),           // Combined training load analysis
    v.literal("transferable_skills"),     // Skills transferring between sports
    v.literal("overtraining_risk"),       // Risk assessment
    v.literal("development_opportunities"), // Opportunities from other sports
    v.literal("weekly_summary")           // Weekly digest of cross-sport activity
  ),

  content: v.string(),                    // Markdown content of insight
  confidence: v.number(),                 // AI confidence score (0-1)
  dataSourceOrgs: v.array(v.string()),    // Which orgs contributed to insight

  // Lifecycle
  generatedAt: v.number(),
  validUntil: v.number(),                 // Insights expire and need regeneration
  viewedAt: v.optional(v.number()),       // First view timestamp
  viewedBy: v.optional(v.string()),       // Who first viewed

  // Feedback
  wasHelpful: v.optional(v.boolean()),    // Coach feedback
  feedbackNote: v.optional(v.string()),
})
.index("by_player_and_org", ["playerIdentityId", "receivingOrgId"])
.index("by_org", ["receivingOrgId"])
.index("by_type", ["insightType"]),

/**
 * Passport Share Notifications
 * Notifications related to sharing events
 */
passportShareNotifications: defineTable({
  userId: v.string(),                     // Recipient

  notificationType: v.union(
    v.literal("share_enabled"),           // Someone shared passport with your org
    v.literal("share_revoked"),           // Share was revoked
    v.literal("share_expiring"),          // Reminder that share is expiring
    v.literal("share_expired"),           // Share has expired
    v.literal("new_insights"),            // New AI insights available
    v.literal("access_alert"),            // Someone accessed shared data
    v.literal("renewal_required"),        // Parent must renew consent
    v.literal("coach_acceptance_pending"), // Coach needs to accept share (NEW)
    v.literal("coach_declined"),          // Coach declined share offer (NEW)
    v.literal("share_request"),           // Coach requested access to passport (NEW)
    v.literal("age18_transition"),        // Player turning 18, control transferring (NEW)
    v.literal("guardian_change"),         // Another guardian modified sharing (NEW)
    v.literal("org_inactive"),            // Source org became inactive (NEW)
    v.literal("data_stale")               // Shared data hasn't been updated (NEW)
  ),

  // References
  consentId: v.optional(v.id("passportShareConsents")),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  requestId: v.optional(v.id("passportShareRequests")), // NEW: For request notifications

  // Content
  title: v.string(),
  message: v.string(),
  actionUrl: v.optional(v.string()),

  // Status
  createdAt: v.number(),
  readAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
})
.index("by_user", ["userId"])
.index("by_user_unread", ["userId", "readAt"]),

/**
 * Passport Share Requests (NEW)
 * Coach-initiated requests for passport access
 */
passportShareRequests: defineTable({
  // Target player
  playerIdentityId: v.id("playerIdentities"),

  // Requesting coach/org
  requestedBy: v.string(),                // userId of coach
  requestedByName: v.string(),            // Denormalized for display
  requestedByRole: v.string(),            // e.g., "Head Coach"
  requestingOrgId: v.id("organization"),
  requestingOrgName: v.string(),          // Denormalized for display

  // Request details
  reason: v.optional(v.string()),         // Why coach wants access

  // Request lifecycle
  status: v.union(
    v.literal("pending"),                 // Awaiting parent response
    v.literal("approved"),                // Parent approved, consent flow started
    v.literal("declined"),                // Parent declined
    v.literal("expired")                  // Auto-expired after 14 days
  ),

  // Timestamps
  requestedAt: v.number(),
  respondedAt: v.optional(v.number()),
  respondedBy: v.optional(v.string()),    // userId of responding guardian
  expiresAt: v.number(),                  // Auto-expire timestamp (14 days)

  // Resulting consent (if approved)
  resultingConsentId: v.optional(v.id("passportShareConsents")),
})
.index("by_player", ["playerIdentityId"])
.index("by_player_and_status", ["playerIdentityId", "status"])
.index("by_requesting_org", ["requestingOrgId"])
.index("by_expiry", ["status", "expiresAt"]),

/**
 * Parent Notification Preferences (NEW)
 * Customizable notification settings for parents
 */
parentNotificationPreferences: defineTable({
  guardianIdentityId: v.id("guardianIdentities"),
  playerIdentityId: v.optional(v.id("playerIdentities")), // null = global default

  // Access notification frequency
  accessNotificationFrequency: v.union(
    v.literal("realtime"),                // Immediate notification on every access
    v.literal("daily"),                   // Daily digest
    v.literal("weekly"),                  // Weekly digest (default)
    v.literal("none")                     // No access notifications
  ),

  // Other notification preferences
  notifyOnCoachRequest: v.optional(v.boolean()),     // Default: true
  notifyOnShareExpiring: v.optional(v.boolean()),   // Default: true
  notifyOnGuardianChange: v.optional(v.boolean()),  // Default: true

  updatedAt: v.number(),
})
.index("by_guardian", ["guardianIdentityId"])
.index("by_guardian_and_player", ["guardianIdentityId", "playerIdentityId"]),
```

### 7.4 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PASSPORT SHARING FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │     PARENT       │
                          │  (Data Owner)    │
                          └────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │  CONSENT DECISION │
                         │  - What elements? │
                         │  - Which orgs?    │
                         │  - How long?      │
                         └─────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │   SOURCE ORG A  │  │   SOURCE ORG B  │  │   SOURCE ORG C  │
    │  (GAA Club)     │  │  (Soccer Club)  │  │  (Rugby Club)   │
    │                 │  │                 │  │                 │
    │  - Skills       │  │  - Skills       │  │  - Skills       │
    │  - Goals        │  │  - Goals        │  │  - Goals        │
    │  - Notes        │  │  - Notes        │  │  - Notes        │
    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  │
                      ┌───────────▼───────────┐
                      │   CONSENT GATEWAY     │
                      │                       │
                      │  - Validate consent   │
                      │  - Check expiry       │
                      │  - Filter elements    │
                      │  - Log access         │
                      └───────────┬───────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ RECEIVING COACH │ │   AI INSIGHTS   │ │  AUDIT TRAIL    │
    │                 │ │                 │ │                 │
    │ - View passport │ │ - Cross-sport   │ │ - Access logs   │
    │ - Read-only     │ │ - Training load │ │ - Parent view   │
    │ - No edit       │ │ - Suggestions   │ │ - Compliance    │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 7.5 Consent State Machine

```
                    ┌─────────────────┐
                    │     (start)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     ACTIVE      │◄─────────┐
                    └────────┬────────┘          │
                             │                   │
           ┌─────────────────┼─────────────────┐ │
           │                 │                 │ │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │   REVOKED   │   │   EXPIRED   │   │  SUSPENDED  │
    │             │   │             │   │             │
    │ By parent   │   │ Time limit  │   │ By platform │
    │ Immediate   │   │ reached     │   │ For review  │
    └─────────────┘   └──────┬──────┘   └──────┬──────┘
                             │                 │
                    ┌────────▼────────┐        │
                    │    RENEWAL      │        │
                    │    REQUIRED     │────────┘
                    └────────┬────────┘  (if cleared)
                             │
                             │ Parent renews
                             │
                    ┌────────▼────────┐
                    │     ACTIVE      │
                    │   (renewed)     │
                    └─────────────────┘
```

---

## 8. Consent Framework

### 8.1 Consent Principles

Based on industry best practices (Open Banking, GDPR, MyData):

| Principle | Implementation |
|-----------|----------------|
| **Explicit** | Active opt-in required, no pre-checked boxes |
| **Informed** | Clear explanation before consent screen |
| **Specific** | Consent is per-organization, per-element |
| **Granular** | Each data element can be individually toggled |
| **Revocable** | One-click revocation, immediate effect |
| **Time-bound** | Automatic expiry, renewal required |
| **Auditable** | Complete record of consent and access |
| **Portable** | Consent record exportable for user |

### 8.2 Consent Flow

#### 8.2.1 Initial Consent Grant

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSENT GRANT FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Parent navigates to Sharing settings
        │
        ▼
Step 2: Select child to configure sharing
        │
        ▼
Step 3: INFORMATION SCREEN
        ┌────────────────────────────────────────────────┐
        │  "What is Passport Sharing?"                   │
        │                                                │
        │  Sharing your child's development passport    │
        │  allows coaches at other clubs to see         │
        │  relevant information about their progress.   │
        │                                                │
        │  ✓ You control what is shared                 │
        │  ✓ You choose who can see it                  │
        │  ✓ You can stop sharing at any time          │
        │  ✓ You'll see who accessed the data          │
        │                                                │
        │  [Learn More]          [Continue →]           │
        └────────────────────────────────────────────────┘
        │
        ▼
Step 4: SELECT RECEIVING ORGANIZATIONS
        ┌────────────────────────────────────────────────┐
        │  "Who can see Jamie's passport?"               │
        │                                                │
        │  ○ All clubs where Jamie is enrolled          │
        │    (Currently: St. Mary's GAA, FC United)     │
        │                                                │
        │  ○ Only specific clubs:                       │
        │    ☑ St. Mary's GAA                          │
        │    ☐ FC United                               │
        │                                                │
        │  [← Back]              [Continue →]           │
        └────────────────────────────────────────────────┘
        │
        ▼
Step 5: SELECT ELEMENTS TO SHARE
        ┌────────────────────────────────────────────────┐
        │  "What would you like to share?"              │
        │                                                │
        │  Recommended: Share full passport ✓           │
        │                                                │
        │  Or customize:                                │
        │  ☑ Basic profile (name, age group)           │
        │  ☑ Skill ratings & assessments               │
        │  ☑ Development goals                         │
        │  ☑ Coach notes (public)                      │
        │  ☐ Benchmark comparisons                     │
        │  ☐ Attendance records                        │
        │  ☐ Injury history ⚠️                         │
        │  ☐ Medical summary ⚠️                        │
        │  ☐ Contact information 📞                    │
        │                                                │
        │  ⚠️ = Sensitive data, consider carefully      │
        │  📞 = Enables coach-to-coach contact          │
        │                                                │
        │  [← Back]              [Continue →]           │
        └────────────────────────────────────────────────┘
        │
        ▼
Step 6: SET DURATION
        ┌────────────────────────────────────────────────┐
        │  "How long should this sharing last?"          │
        │                                                │
        │  ○ Until end of current season (Mar 2026)     │
        │  ○ 6 months                                   │
        │  ● 1 year (recommended)                       │
        │  ○ Custom date: [__/__/____]                  │
        │                                                │
        │  ℹ️ You'll get a reminder before expiry       │
        │  ℹ️ You can stop sharing at any time          │
        │                                                │
        │  [← Back]              [Continue →]           │
        └────────────────────────────────────────────────┘
        │
        ▼
Step 7: CONFIRMATION & CONSENT
        ┌────────────────────────────────────────────────┐
        │  "Confirm Sharing Settings"                    │
        │                                                │
        │  Player: Jamie Smith                          │
        │  Sharing with: St. Mary's GAA                 │
        │  Elements: Full passport (9 items)            │
        │  Duration: Until January 14, 2027             │
        │                                                │
        │  By enabling sharing, you agree that:         │
        │  • Coaches can view Jamie's development data  │
        │  • You can revoke access at any time          │
        │  • All access will be logged for your review  │
        │                                                │
        │  [View Terms of Sharing]                      │
        │                                                │
        │  [← Back]      [Enable Passport Sharing ✓]    │
        └────────────────────────────────────────────────┘
        │
        ▼
Step 8: SUCCESS + NEXT STEPS
        ┌────────────────────────────────────────────────┐
        │  ✅ Sharing Enabled!                           │
        │                                                │
        │  Jamie's passport can now be viewed by        │
        │  coaches at St. Mary's GAA.                   │
        │                                                │
        │  What happens next:                           │
        │  • Coaches will see Jamie's shared data       │
        │  • You'll be notified when data is accessed   │
        │  • Review access history anytime              │
        │                                                │
        │  [View Sharing Dashboard]    [Done]           │
        └────────────────────────────────────────────────┘
```

#### 8.2.2 Consent Renewal Flow

Triggered 2 weeks before expiry:

```
┌────────────────────────────────────────────────────────────────┐
│  📧 NOTIFICATION: Sharing Expiring Soon                        │
│                                                                │
│  Your passport sharing for Jamie with St. Mary's GAA          │
│  will expire on January 28, 2027.                             │
│                                                                │
│  [Review & Renew]           [Let it Expire]                   │
└────────────────────────────────────────────────────────────────┘

If [Review & Renew]:
┌────────────────────────────────────────────────────────────────┐
│  "Renew Passport Sharing"                                      │
│                                                                │
│  Current settings:                                            │
│  • Player: Jamie Smith                                        │
│  • Shared with: St. Mary's GAA                                │
│  • Elements: Full passport                                    │
│  • Access count: 12 views since last renewal                  │
│                                                                │
│  Renew for another:                                           │
│  ○ 6 months                                                   │
│  ● 1 year (recommended)                                       │
│  ○ Custom: [__/__/____]                                       │
│                                                                │
│  [Modify Settings]     [Renew with Same Settings]            │
└────────────────────────────────────────────────────────────────┘
```

#### 8.2.3 Revocation Flow

```
┌────────────────────────────────────────────────────────────────┐
│  "Stop Sharing?"                                               │
│                                                                │
│  Are you sure you want to stop sharing Jamie's passport       │
│  with St. Mary's GAA?                                         │
│                                                                │
│  What happens:                                                │
│  • Coaches will immediately lose access                       │
│  • Historical data will be retained for your records          │
│  • You can re-enable sharing at any time                      │
│                                                                │
│  Optional: Tell us why (helps us improve)                     │
│  ○ No longer needed                                           │
│  ○ Privacy concerns                                           │
│  ○ Child left the club                                        │
│  ○ Other: [___________________]                               │
│                                                                │
│  [Cancel]              [Stop Sharing]                         │
└────────────────────────────────────────────────────────────────┘
```

#### 8.2.4 Coach Acceptance Flow (NEW)

When parent enables sharing, coaches at receiving org must accept:

```
Parent enables sharing
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  📧 NOTIFICATION TO COACHES AT RECEIVING ORG                   │
│                                                                │
│  Sarah Smith has shared Jamie's development passport           │
│  with your organization.                                       │
│                                                                │
│  [View & Respond]                                              │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  "Review Shared Passport Offer"                                │
│                                                                │
│  Player: Jamie Smith (Age 12)                                  │
│  Shared by: Sarah Smith (Parent)                              │
│  From: FC United                                               │
│                                                                │
│  Elements being shared:                                        │
│  ✓ Basic profile      ✓ Skill ratings                        │
│  ✓ Development goals  ✓ Coach notes                          │
│  ✓ Benchmark data     ✗ Medical info                         │
│                                                                │
│  Duration: Until January 14, 2027                              │
│                                                                │
│  By accepting, you agree to use this data only for            │
│  Jamie's development at your organization.                    │
│                                                                │
│  [Decline]                [Accept & View Passport]            │
└────────────────────────────────────────────────────────────────┘

If coach declines:
┌────────────────────────────────────────────────────────────────┐
│  "Reason for Declining" (Optional)                             │
│                                                                │
│  ○ Not my assigned player                                     │
│  ○ Don't need additional data                                 │
│  ○ Player no longer with us                                   │
│  ○ Other: [___________________]                               │
│                                                                │
│  [Cancel]                      [Confirm Decline]              │
└────────────────────────────────────────────────────────────────┘

→ Parent receives notification:
┌────────────────────────────────────────────────────────────────┐
│  ℹ️ Share Offer Declined                                       │
│                                                                │
│  Your passport sharing offer for Jamie with St. Mary's GAA    │
│  was declined.                                                 │
│                                                                │
│  You can modify the offer and try again.                      │
│                                                                │
│  [Modify & Re-offer]                      [OK]                │
└────────────────────────────────────────────────────────────────┘
```

#### 8.2.5 Coach Request-to-Share Flow (NEW)

Coach-initiated request for passport access:

```
Coach identifies multi-org player
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  Player: Jamie Smith (Age 12)                                  │
│                                                                │
│  Other organizations: FC United                                │
│                                                                │
│  📭 Passport not shared with your organization                 │
│                                                                │
│  [Request Access to Passport]                                  │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  "Request Passport Access"                                     │
│                                                                │
│  You are requesting access to view Jamie Smith's              │
│  development passport from FC United.                         │
│                                                                │
│  Add a reason (optional, visible to parent):                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Would like to understand Jamie's soccer training to      │ │
│  │ better coordinate his GAA development.                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  This request will be sent to Jamie's parent/guardian.       │
│  They can approve, decline, or ignore your request.          │
│  Request expires after 14 days.                               │
│                                                                │
│  [Cancel]                      [Send Request]                 │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
→ Parent receives notification:
┌────────────────────────────────────────────────────────────────┐
│  📬 Passport Access Request                                    │
│                                                                │
│  Michael O'Brien (Head Coach at St. Mary's GAA) has           │
│  requested access to view Jamie's development passport.       │
│                                                                │
│  Reason: "Would like to understand Jamie's soccer training    │
│  to better coordinate his GAA development."                   │
│                                                                │
│  [View Request]                                                │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  "Respond to Request"                                          │
│                                                                │
│  From: Michael O'Brien                                         │
│  Role: Head Coach                                              │
│  Organization: St. Mary's GAA                                  │
│                                                                │
│  Reason: "Would like to understand Jamie's soccer training    │
│  to better coordinate his GAA development."                   │
│                                                                │
│  ○ Approve - Start sharing setup                              │
│  ○ Decline - Don't want to share                              │
│  ○ Ignore - Request expires in 12 days                        │
│                                                                │
│  [Continue]                                                    │
└────────────────────────────────────────────────────────────────┘

If Approve: → Starts normal Enable Sharing flow (8.2.1)
If Decline: → Coach notified, can re-request after expiry
```

#### 8.2.6 Age 18 Transition Flow (NEW)

When player turns 18, control transfers from parent to player:

```
Day before 18th birthday:
┌────────────────────────────────────────────────────────────────┐
│  📧 NOTIFICATION TO PARENT                                     │
│                                                                │
│  Jamie turns 18 tomorrow!                                      │
│                                                                │
│  Control of Jamie's passport sharing will transfer to them.   │
│  All active shares will be paused for Jamie to review.        │
│                                                                │
│  [View Jamie's Current Shares]                   [OK]         │
└────────────────────────────────────────────────────────────────┘

On 18th birthday - Player receives:
┌────────────────────────────────────────────────────────────────┐
│  🎂 Happy Birthday Jamie!                                      │
│                                                                │
│  You're now in control of your development passport.          │
│                                                                │
│  Your parent previously set up passport sharing with some     │
│  of your clubs. These shares have been paused until you       │
│  review them.                                                  │
│                                                                │
│  [Review My Sharing Settings]                                  │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  "Review Your Sharing"                                         │
│                                                                │
│  Previously active shares (now paused):                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  St. Mary's GAA                                          │ │
│  │  Full passport shared since Jan 2026                     │ │
│  │  Accessed 24 times by 3 coaches                          │ │
│  │                                                          │ │
│  │  [ ] Keep this share active                              │ │
│  │  [ ] Revoke - stop sharing                               │ │
│  │  [ ] Modify - change what's shared                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  FC United                                                │ │
│  │  Skills & goals shared since Mar 2026                    │ │
│  │  Accessed 8 times by 1 coach                             │ │
│  │                                                          │ │
│  │  [ ] Keep this share active                              │ │
│  │  [ ] Revoke - stop sharing                               │ │
│  │  [ ] Modify - change what's shared                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Save & Continue]                                             │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
→ Coaches notified of any changes or confirmation
→ Parent retains read-only access to historical audit log
```

#### 8.2.7 Quick Share Flow (Feature-Flagged) (NEW)

Simplified flow for parents who want faster setup:

```
Initial Sharing Screen:
┌────────────────────────────────────────────────────────────────┐
│  "Set Up Passport Sharing for Jamie"                           │
│                                                                │
│  Choose your setup method:                                     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ⚡ Quick Setup (Recommended)                             │ │
│  │                                                          │ │
│  │  • Share full passport with all enrolled clubs           │ │
│  │  • 1 year duration                                       │ │
│  │  • You can customize later                               │ │
│  │                                                          │ │
│  │  [Quick Setup - 2 clicks]                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  🔧 Custom Setup                                          │ │
│  │                                                          │ │
│  │  • Choose exactly what to share                          │ │
│  │  • Select specific organizations                         │ │
│  │  • Set custom duration                                   │ │
│  │                                                          │ │
│  │  [Custom Setup - 6 steps]                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘

If Quick Setup selected:
┌────────────────────────────────────────────────────────────────┐
│  "Confirm Quick Setup"                                         │
│                                                                │
│  You are enabling passport sharing for Jamie:                  │
│                                                                │
│  📋 What's shared: Full development passport                   │
│     (Skills, goals, notes, benchmarks, attendance)            │
│                                                                │
│  🏢 With: All clubs Jamie is enrolled in                       │
│     • St. Mary's GAA                                          │
│     • FC United                                               │
│                                                                │
│  ⏱️ Duration: 1 year (until Jan 14, 2027)                      │
│                                                                │
│  ℹ️ You can modify these settings anytime                     │
│  ℹ️ All access will be logged for your review                 │
│  ℹ️ You can revoke sharing at any time                        │
│                                                                │
│  [← Back]              [Confirm & Enable Sharing ✓]           │
└────────────────────────────────────────────────────────────────┘

Note: Quick Share is controlled by feature flag for A/B testing.
Default: Disabled (Custom Setup only)
```

### 8.3 Automatic Sharing Controls

#### 8.3.1 Season-End Guard

At the start of each new season:

```
┌────────────────────────────────────────────────────────────────┐
│  🔔 New Season - Review Your Sharing Settings                  │
│                                                                │
│  The 2027 season has started. Please review your              │
│  passport sharing arrangements.                               │
│                                                                │
│  Active shares for Jamie:                                     │
│  ☑ St. Mary's GAA - Full passport                            │
│  ☐ FC United - Skills & goals                                │
│                                                                │
│  Uncheck any you want to stop.                                │
│                                                                │
│  [Confirm & Continue]                                         │
└────────────────────────────────────────────────────────────────┘
```

#### 8.3.2 Inactive Player Guard

If a child becomes inactive (status changed to inactive/left) at a club:

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Sharing Paused - Player Inactive                           │
│                                                                │
│  Jamie is no longer active at FC United.                      │
│                                                                │
│  Sharing of FC United data has been automatically paused.     │
│  Data from FC United will no longer be visible to other       │
│  organizations.                                               │
│                                                                │
│  If Jamie returns to FC United, you can re-enable sharing.    │
│                                                                │
│  [OK]                                                         │
└────────────────────────────────────────────────────────────────┘
```

### 8.4 Consent Receipt

Following MyData/Kantara standards, a machine-readable and human-readable consent receipt:

```json
{
  "receiptId": "cr_abc123def456",
  "version": "1.0",
  "timestamp": "2026-01-14T10:30:00Z",

  "dataSubject": {
    "name": "Jamie Smith",
    "playerId": "pi_789xyz"
  },

  "consentGiver": {
    "name": "Sarah Smith",
    "relationship": "Parent/Guardian",
    "userId": "usr_abc123"
  },

  "dataController": {
    "name": "PlayerARC",
    "contact": "privacy@playerarc.com"
  },

  "dataRecipient": {
    "organizationId": "org_gaa123",
    "organizationName": "St. Mary's GAA",
    "purpose": "Player development coaching"
  },

  "consentedElements": [
    "basicProfile",
    "skillRatings",
    "skillHistory",
    "developmentGoals",
    "coachNotes",
    "benchmarkData",
    "attendanceRecords"
  ],

  "consentDuration": {
    "from": "2026-01-14",
    "until": "2027-01-14"
  },

  "rights": {
    "revocation": "Immediate via Sharing Dashboard",
    "access": "Full audit log available",
    "complaint": "privacy@playerarc.com"
  }
}
```

---

## 9. User Experience Design

### 9.1 Design System Principles

1. **Progressive Disclosure**: Show essential info first, details on demand
2. **Clear Visual Hierarchy**: Distinguish owned vs. shared data
3. **Consistent Iconography**: Recognizable sharing/privacy icons throughout
4. **Mobile-First**: All flows optimized for mobile screens
5. **Accessibility**: WCAG 2.1 AA compliance minimum

### 9.2 Parent Dashboard: Sharing Control Center

#### 9.2.1 Main Sharing Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Parent Dashboard                              Sarah Smith   │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  📱 My Children                                                │
│  ────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  👦 Jamie Smith (12)                                    │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │  🏈 St. Mary's GAA      ⚽ FC United                    │  │
│  │                                                         │  │
│  │  📤 Sharing: ON                                         │  │
│  │  Shared with 1 organization                            │  │
│  │  Last accessed: 2 days ago                             │  │
│  │                                                         │  │
│  │  [View Details]                    [Manage Sharing →]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  👧 Emma Smith (9)                                      │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │  🏈 St. Mary's GAA                                      │  │
│  │                                                         │  │
│  │  📤 Sharing: OFF                                        │  │
│  │  No active sharing                                     │  │
│  │                                                         │  │
│  │  [View Details]                    [Enable Sharing →]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.2.2 Child Sharing Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                    Jamie's Sharing Settings             │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  📤 Active Sharing Arrangements                                │
│  ────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  🏈 St. Mary's GAA                                      │  │
│  │                                                         │  │
│  │  Sharing: Full Passport ✓                              │  │
│  │  Since: January 14, 2026                               │  │
│  │  Expires: January 14, 2027 (353 days)                  │  │
│  │                                                         │  │
│  │  📊 12 views by 2 coaches                              │  │
│  │  Last viewed: Jan 12 by Michael O'Brien (Coach)        │  │
│  │                                                         │  │
│  │  [View Access Log]    [Edit]    [⏹ Stop Sharing]       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ⚽ FC United                                           │  │
│  │                                                         │  │
│  │  📭 No sharing enabled                                  │  │
│  │  Coaches here cannot see Jamie's GAA data              │  │
│  │                                                         │  │
│  │  [+ Enable Sharing]                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ────────────────────────────────────────────────────────────  │
│  📋 Access History (Last 30 days)                             │
│                                                                │
│  Jan 12  Michael O'Brien (Coach, St. Mary's)   Skills & Goals │
│  Jan 10  Michael O'Brien (Coach, St. Mary's)   Full View      │
│  Jan 8   Lisa Murphy (Admin, St. Mary's)       Summary        │
│  Jan 5   Michael O'Brien (Coach, St. Mary's)   Skills         │
│  ... [View All →]                                             │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.2.3 Access Log Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                    Access Log for Jamie                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  Filter: [All Organizations ▼] [Last 30 days ▼] [All Types ▼] │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  January 12, 2026 at 14:32                              │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │  👤 Michael O'Brien                                     │  │
│  │  Role: Head Coach                                       │  │
│  │  Organization: St. Mary's GAA                           │  │
│  │                                                         │  │
│  │  Accessed:                                              │  │
│  │  • Skill ratings (FC United data)                       │  │
│  │  • Development goals (FC United data)                   │  │
│  │                                                         │  │
│  │  Duration: 3 minutes 42 seconds                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  January 10, 2026 at 09:15                              │  │
│  │  ... (more entries)                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  [Export Log as PDF]                   [Export Log as CSV]    │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Coach Dashboard: Shared Passport View

#### 9.3.1 Coach Dashboard with Shared Players

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Coach Dashboard                         Michael O'Brien     │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  My Teams: [U14 Boys ▼]                                        │
│                                                                │
│  ────────────────────────────────────────────────────────────  │
│  👥 Team Players (18)                                          │
│  ────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Search: [_________________________] [🔍]               │  │
│  │  Filter: [All ▼] [With Shared Data ▼]                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌───────────────────────────────────┬─────────────────────┐  │
│  │ Player           │ Age  │ Rating │ 📤 Shared Data      │  │
│  ├───────────────────────────────────┼─────────────────────┤  │
│  │ Jamie Smith      │ 12   │ ⭐⭐⭐⭐  │ ✓ FC United        │  │
│  │ Sean Murphy      │ 12   │ ⭐⭐⭐   │ ✓ Rugby Club       │  │
│  │ Patrick Kelly    │ 13   │ ⭐⭐⭐⭐  │ -                  │  │
│  │ David Walsh      │ 12   │ ⭐⭐⭐   │ -                  │  │
│  │ ... (more)       │      │        │                     │  │
│  └───────────────────────────────────┴─────────────────────┘  │
│                                                                │
│  📤 = Has shared passport from other organizations             │
│                                                                │
│  ────────────────────────────────────────────────────────────  │
│  🔮 Cross-Sport Insights (3 players)                          │
│  ────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ⚠️ Training Load Alert                                 │  │
│  │  Jamie Smith has 8+ training sessions this week         │  │
│  │  across GAA (4) and Soccer (4). Monitor for fatigue.   │  │
│  │                                                         │  │
│  │  [View Details]                         [Dismiss]       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  💡 Skill Transfer Opportunity                          │  │
│  │  Sean Murphy's rugby agility training shows strong     │  │
│  │  footwork. Consider incorporating into solo drills.    │  │
│  │                                                         │  │
│  │  [View Details]                         [Dismiss]       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.3.2 Player Profile with Shared Data

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Team                    Jamie Smith                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Overview] [Skills] [Goals] [Notes] [📤 Cross-Sport]          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    OVERVIEW                              │  │
│  │                                                         │  │
│  │  👦 Jamie Smith                   📤 Shared data from:  │  │
│  │  Age: 12 (U14)                    ⚽ FC United           │  │
│  │  Position: Midfielder                                   │  │
│  │  Overall Rating: ⭐⭐⭐⭐ (4.2/5)                          │  │
│  │                                                         │  │
│  │  ┌─────────────── St. Mary's GAA ───────────────┐      │  │
│  │  │                 (Your data)                   │      │  │
│  │  │  Technical: ⭐⭐⭐⭐   Physical: ⭐⭐⭐⭐        │      │  │
│  │  │  Tactical: ⭐⭐⭐     Mental: ⭐⭐⭐⭐          │      │  │
│  │  │  [Edit] [View History]                       │      │  │
│  │  └──────────────────────────────────────────────┘      │  │
│  │                                                         │  │
│  │  ┌─────────────── FC United ────────────────────┐      │  │
│  │  │               (Shared data)                   │      │  │
│  │  │  Technical: ⭐⭐⭐⭐   Physical: ⭐⭐⭐⭐        │      │  │
│  │  │  Tactical: ⭐⭐⭐⭐    Mental: ⭐⭐⭐           │      │  │
│  │  │  Last updated: Jan 10, 2026                  │      │  │
│  │  │  [View Details] (Read-only)                  │      │  │
│  │  └──────────────────────────────────────────────┘      │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### 9.3.3 Cross-Sport Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Team                    Jamie Smith                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Overview] [Skills] [Goals] [Notes] [📤 Cross-Sport]          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                │
│  📤 CROSS-SPORT INSIGHTS                                       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📊 Combined Training Load (This Week)                  │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  St. Mary's GAA:  ████████░░░░  4 sessions (6 hrs)     │  │
│  │  FC United:       ████████░░░░  4 sessions (5 hrs)     │  │
│  │  ────────────────────────────────────────────────────  │  │
│  │  Total:           ████████████████  8 sessions (11 hrs)│  │
│  │                                                         │  │
│  │  ⚠️ Above recommended (6-8 sessions/week for age 12)   │  │
│  │                                                         │  │
│  │  [View Training Calendar]                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  🔄 Transferable Skills                                 │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  Soccer → GAA                                          │  │
│  │  • Ball control → Hand-eye coordination (Strong ✓)     │  │
│  │  • Passing accuracy → Kick-passing (Developing)        │  │
│  │  • Spatial awareness → Reading play (Strong ✓)         │  │
│  │                                                         │  │
│  │  GAA → Soccer                                          │  │
│  │  • Endurance → Match fitness (Strong ✓)                │  │
│  │  • Physical contact → Tackling (Developing)            │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  🎯 Goals Across Sports                                 │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  GAA (St. Mary's)              Soccer (FC United)      │  │
│  │  • Improve solo skills ⏳      • First touch control ✓ │  │
│  │  • Game reading ⏳             • Positioning ⏳         │  │
│  │  • Endurance 🎯               • Leadership ⏳          │  │
│  │                                                         │  │
│  │  💡 Synergy: Leadership focus in soccer may benefit    │  │
│  │  on-field communication in GAA matches.                │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📞 Coach Contact (If authorized)                       │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  FC United U12 Coach:                                  │  │
│  │  John McCarthy | john.m@fcunited.ie | 087-XXX-XXXX     │  │
│  │                                                         │  │
│  │  Parent has authorized coach-to-coach communication    │  │
│  │  for coordinating Jamie's development.                 │  │
│  │                                                         │  │
│  │  [Send Email]                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4 Club Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Admin Dashboard                              Lisa Murphy    │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Members] [Teams] [Settings] [📤 Data Sharing]                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                │
│  📤 PASSPORT SHARING OVERVIEW                                  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📊 Quick Stats                                         │  │
│  │                                                         │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐             │  │
│  │  │    142    │ │    87     │ │    34     │             │  │
│  │  │  Players  │ │ Incoming  │ │ Outgoing  │             │  │
│  │  │   total   │ │  shares   │ │  shares   │             │  │
│  │  └───────────┘ └───────────┘ └───────────┘             │  │
│  │                                                         │  │
│  │  61% of players have sharing enabled                   │  │
│  │  Last 30 days: +12 new shares, -3 revocations         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📤 Outgoing Shares (Data from your club)               │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  Player         To Organization      Elements   Since   │  │
│  │  ────────────── ─────────────────── ─────────  ───────  │  │
│  │  Jamie Smith    FC United            Full       Jan 14  │  │
│  │  Sean Murphy    Rugby Club           Skills     Dec 1   │  │
│  │  ...                                                    │  │
│  │                                                         │  │
│  │  [View All] [Export Report]                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📥 Incoming Shares (Data visible to your coaches)      │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  Player         From Organization   Accessed   Views    │  │
│  │  ────────────── ─────────────────── ─────────  ───────  │  │
│  │  Jamie Smith    FC United            Jan 12    12       │  │
│  │  Sean Murphy    Rugby Club           Jan 10    8        │  │
│  │  ...                                                    │  │
│  │                                                         │  │
│  │  [View All] [Export Report]                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  📋 Compliance & Governance                             │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │  [Generate GDPR Report]                                │  │
│  │  [View Data Flow Diagram]                              │  │
│  │  [Send Sharing Guide to Parents]                       │  │
│  │  [Flag Concern for Platform Review]                    │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. AI & Insights Engine

### 10.1 Overview

The AI Insights Engine provides coaches with intelligent analysis of cross-sport development data, helping them understand their players more holistically while keeping the child's development at the center.

### 10.2 Insight Types

#### 10.2.1 Training Load Analysis

**Purpose:** Identify potential overtraining or undertraining across sports

**Input Data:**
- Training sessions (dates, duration, intensity) from all shared orgs
- Match participation
- Age-appropriate training guidelines

**Output:**
```
Training Load Analysis for Jamie Smith (Age 12)

Weekly Summary:
• GAA: 4 sessions (6 hours) - Moderate intensity
• Soccer: 4 sessions (5 hours) - High intensity
• Combined: 8 sessions (11 hours)

Assessment:
⚠️ Above recommended load for age 12 (6-8 sessions/week)

Recommendations:
1. Consider reducing one soccer session if fatigue observed
2. Monitor for signs of overtraining (irritability, declining performance)
3. Ensure adequate recovery between high-intensity sessions
4. Coordinate with FC United coach on training scheduling
```

#### 10.2.2 Skill Transfer Mapping

**Purpose:** Identify skills developed in one sport that transfer to another

**Input Data:**
- Skill assessments from all shared orgs
- Sport-specific skill taxonomies
- Transfer correlation matrices

**Output:**
```
Skill Transfer Analysis for Jamie Smith

Strong Transfers (Soccer → GAA):
✓ Ball control → Excellent hand-eye coordination in catching
✓ Spatial awareness → Strong positional play in defense
✓ First touch → Quick ball handling under pressure

Developing Transfers (GAA → Soccer):
⏳ Physical resilience → Improving tackling confidence
⏳ Endurance → Good match fitness, maintain through season

Opportunities:
💡 Soccer's passing drills may accelerate kick-passing development
💡 GAA's contact training could boost soccer defensive play
```

#### 10.2.3 Cross-Sport Development Patterns

**Purpose:** Identify development patterns and anomalies across sports

**Input Data:**
- Skill rating history from all shared orgs
- Goal progress across sports
- Benchmark comparisons

**Output:**
```
Development Pattern Analysis for Jamie Smith

Pattern Identified: Consistent Technical Progression
Both sports show steady 0.3-0.5 point improvement in technical
skills over 6 months. This multi-sport technical development
is above average for age group.

Anomaly Detected: Physical Rating Divergence
• GAA physical rating: 4.2 (improving)
• Soccer physical rating: 3.5 (stable)

Possible Explanation:
GAA's emphasis on endurance training may not be reflected in
soccer assessments. Consider sharing training approaches with
FC United coach.
```

#### 10.2.4 Goal Synergy Analysis

**Purpose:** Identify complementary goals across sports

**Input Data:**
- Development goals from all shared orgs
- Goal categories and priorities
- Milestone completion rates

**Output:**
```
Goal Synergy Analysis for Jamie Smith

Aligned Goals (Work Together):
🎯 GAA: "Improve game reading" + Soccer: "Better positioning"
   → Both require spatial awareness development
   → Progress in one accelerates the other

Conflicting Priorities:
⚠️ GAA: "Increase training intensity" (Priority: High)
⚠️ Soccer: "Build endurance base" (Priority: High)
   → May conflict with current training load
   → Recommend coordination with both coaches

Unique Development:
📝 Soccer has leadership focus not present in GAA
   → May benefit GAA on-field communication
   → Consider similar goal in GAA if appropriate
```

#### 10.2.5 Weekly Cross-Sport Digest

**Purpose:** Summarize cross-sport activity for coach awareness

**Input Data:**
- Recent assessments from all shared orgs
- Training/match participation
- Goal updates
- Notable achievements

**Output:**
```
Weekly Cross-Sport Digest for Jamie Smith
Week of January 8-14, 2026

Activity Summary:
• GAA: 2 training sessions, 1 match (started)
• Soccer: 3 training sessions, 1 match (substitute)

Highlights:
⭐ FC United coach noted "excellent work rate in training"
⭐ Completed milestone: "Consistent first touch" goal at soccer

Watch Points:
👀 No recorded sessions Jan 11-12 (both sports)
   - Check if illness/injury or scheduling gap

Coming Up:
📅 Soccer has cup match Jan 18 - may affect GAA training attendance
```

### 10.3 AI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI INSIGHTS ENGINE                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  DATA COLLECTION LAYER                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  GAA Data   │  │ Soccer Data │  │ Rugby Data  │             │
│  │  (Shared)   │  │  (Shared)   │  │  (Shared)   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            CONSENT VALIDATION GATEWAY                    │  │
│  │  • Verify active consent for each data source            │  │
│  │  • Apply element-level filtering                         │  │
│  │  • Log all data access for audit                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────────────┐
│  ANALYSIS ENGINE         ▼                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               NORMALIZED DATA STORE                      │  │
│  │  • Unified skill taxonomy mapping                        │  │
│  │  • Cross-sport goal categorization                       │  │
│  │  • Activity timeline aggregation                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │  Training  │   │   Skill    │   │    Goal    │              │
│  │   Load     │   │  Transfer  │   │  Synergy   │              │
│  │  Analyzer  │   │   Mapper   │   │  Analyzer  │              │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘              │
│        │                │                │                     │
│        └────────────────┼────────────────┘                     │
│                         │                                      │
│                         ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              INSIGHT GENERATION (Claude AI)              │  │
│  │  • Natural language summaries                            │  │
│  │  • Actionable recommendations                            │  │
│  │  • Confidence scoring                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                      │
└─────────────────────────┼──────────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────────┐
│  DELIVERY LAYER         ▼                                      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                    INSIGHT CACHE                        │   │
│  │  • Cached insights (valid 7 days or until data change) │   │
│  │  • Triggered regeneration on significant updates       │   │
│  └────────────────────────────────────────────────────────┘   │
│                          │                                     │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │   Coach    │   │   Parent   │   │   Alert    │              │
│  │ Dashboard  │   │   Digest   │   │  System    │              │
│  │  (On-Demand)│   │  (Weekly) │   │ (Real-time)│              │
│  └────────────┘   └────────────┘   └────────────┘              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 10.4 AI Guardrails

To ensure responsible AI usage:

| Guardrail | Implementation |
|-----------|----------------|
| **No profiling for talent identification** | Insights focus on development, not potential |
| **No predictive scoring** | Don't predict future performance |
| **Human-in-the-loop** | All insights are recommendations, not directives |
| **Explainability** | Show what data contributed to each insight |
| **Bias monitoring** | Track for demographic biases in recommendations |
| **Coach feedback** | Learn from coach ratings of insight usefulness |
| **Parent visibility** | Parents can see AI insights generated about their child |

---

## 11. GDPR & Compliance

### 11.1 GDPR Principles Applied

| GDPR Principle | Implementation |
|----------------|----------------|
| **Lawfulness, fairness, transparency** | Explicit consent with clear explanations; full audit trail visible to parents |
| **Purpose limitation** | Data only used for player development coaching; no commercial use |
| **Data minimization** | Granular element selection; only share what's needed |
| **Accuracy** | Real-time data sync; clear timestamps on all shared data |
| **Storage limitation** | Consent-based retention; auto-deletion options |
| **Integrity & confidentiality** | Encryption; access logging; security controls |
| **Accountability** | Platform maintains compliance documentation; DPO contact available |

### 11.2 Legal Basis for Processing

**Children's Data (Under 16):**
- Legal basis: Parental/Guardian Consent (Article 8 GDPR)
- Verified parental relationship required
- Age-appropriate privacy notices

**Adult Players (16+):**
- Legal basis: Consent (Article 6(1)(a) GDPR)
- Self-managed consent controls
- Full data portability rights

### 11.3 Data Subject Rights Implementation

| Right | Implementation |
|-------|----------------|
| **Right to be informed** | Privacy notices; consent explanations; in-app help |
| **Right of access** | Full audit log export; data download capability |
| **Right to rectification** | Parents can request corrections via organization |
| **Right to erasure** | "Delete all shared data" option with cascading deletion |
| **Right to restrict processing** | Granular element controls; pause sharing option |
| **Right to data portability** | Export passport in standard format (JSON/PDF) |
| **Right to object** | Easy revocation; object to specific uses |

### 11.4 Data Protection Impact Assessment (DPIA)

A DPIA is required for this feature because:
- Processing of children's data
- Large-scale processing of special category data (health/medical)
- Cross-organizational data sharing
- Profiling and automated decision-making (AI insights)

**DPIA Summary:**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unauthorized access | Medium | High | Strong authentication; access logging; consent gateway |
| Data breach | Low | High | Encryption; security monitoring; incident response plan |
| Consent manipulation | Low | Medium | Clear UI; no dark patterns; renewal requirements |
| Purpose creep | Medium | Medium | Technical enforcement; regular audits; purpose logging |
| Excessive retention | Medium | Low | Auto-expiry; deletion workflows; retention policies |
| Child data misuse | Low | High | No commercial use; parental control; platform oversight |

### 11.5 Compliance Monitoring

**Automated Checks:**
- Consent validity verification before every data access
- Expiry monitoring with automated notifications
- Access pattern anomaly detection
- Retention period enforcement

**Manual Reviews:**
- Quarterly compliance audits
- Annual DPIA review
- Incident response drills
- Parent complaint analysis

### 11.6 Cross-Border Considerations

If data is shared across jurisdictions:
- Standard Contractual Clauses (SCCs) for transfers outside EEA
- Data localization options for sensitive organizations
- Jurisdiction-specific consent forms if required

### 11.7 Consent Version Tracking

**Versioned Consent Terms:**
- All consent includes `consentVersion` field referencing the terms version accepted
- Consent terms document maintained with semantic versioning (e.g., v1.0.0, v1.1.0)
- Major version changes (e.g., v1.x → v2.x) require re-consent from all active sharers

**Re-Consent Workflow:**
1. When consent terms materially change, new version is published
2. All active shares are flagged for re-consent review
3. Parents receive notification: "Sharing terms have been updated - please review"
4. Share remains active during grace period (30 days)
5. If not re-consented within grace period, share is paused (not revoked)
6. Coach sees: "Share pending parent re-consent to updated terms"

**Material Changes Requiring Re-Consent:**
- New data categories added to sharing scope
- Changes to how AI processes shared data
- New third-party access provisions
- Changes to retention periods
- Significant changes to data subject rights

**Non-Material Changes (No Re-Consent):**
- Clarifications and corrections
- Contact information updates
- Adding new data subject rights
- Security improvements

### 11.8 US State Law Considerations

While PlayerARC's primary compliance framework is GDPR, the platform accommodates US state privacy laws:

#### 11.8.1 New York CDPA (Child Data Protection Act - June 2025)

**Applicable Provisions:**
| Requirement | PlayerARC Implementation |
|-------------|-------------------------|
| No sale of minors' data | Policy: No commercial use of any data |
| Parental consent for under-18 | Already implemented via guardian consent |
| Data protection agreements | No third-party sharing (single platform model) |
| 14-day deletion requests | Future feature: Expedited deletion workflow |

#### 11.8.2 California CCPA/CPRA Considerations

**Applicable if Platform Expands to US Market:**
- Right to know what data is collected (Covered by transparency dashboard)
- Right to delete (Covered by revocation + deletion workflows)
- Right to opt-out of sale (N/A - no data sales)
- Right to non-discrimination (No feature restrictions based on privacy choices)

#### 11.8.3 Multi-Jurisdiction Approach

For players enrolled in organizations across jurisdictions:
- Apply most restrictive applicable law
- Consent forms dynamically include jurisdiction-specific disclosures
- Future: Geo-fencing for consent workflows based on organization location

---

## 12. Security & Privacy

### 12.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER                                              │
│  ─────────────────────────────────────────────────────────────  │
│  • Role-based access control (RBAC)                            │
│  • Session management (Better Auth)                            │
│  • Input validation and sanitization                           │
│  • CSRF protection                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  API LAYER                                                      │
│  ─────────────────────────────────────────────────────────────  │
│  • Authentication required for all endpoints                   │
│  • Consent validation on every shared data request             │
│  • Rate limiting per user/organization                         │
│  • Request logging and monitoring                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  • Encryption at rest (AES-256)                                │
│  • Encryption in transit (TLS 1.3)                             │
│  • Database-level access controls                              │
│  • Audit logging for all data access                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE LAYER                                           │
│  ─────────────────────────────────────────────────────────────  │
│  • Convex Cloud security controls                              │
│  • Vercel edge security                                        │
│  • DDoS protection                                             │
│  • Security monitoring and alerting                            │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Access Control Matrix

| Actor | Own Org Data | Shared Data (Receiving) | Shared Data (Source) | Consent Management |
|-------|--------------|-------------------------|----------------------|-------------------|
| Parent | View (child) | View who accessed | N/A | Full control |
| Coach | Read/Write | Read only | Contributes | None |
| Admin | Full | View statistics | View statistics | Oversight only |
| Platform Staff | Audit only | Audit only | Audit only | Emergency intervention |
| Adult Player | Read/Write | N/A | Controls own | Full control |

### 12.3 Consent Gateway

Every request for shared data passes through a Consent Gateway:

```typescript
// Consent Gateway Logic (Pseudo-code)
async function validateShareAccess(request) {
  // 1. Verify requesting user is authenticated
  const user = await authenticateRequest(request);
  if (!user) throw new UnauthorizedError();

  // 2. Verify user has role that can view shared data
  if (!canViewSharedPassports(user.role)) {
    throw new ForbiddenError("Role cannot access shared data");
  }

  // 3. Find active consent for this player + receiving org
  const consent = await findActiveConsent({
    playerIdentityId: request.playerIdentityId,
    receivingOrgId: user.organizationId,
    status: "active"
  });

  if (!consent) {
    throw new ForbiddenError("No active sharing consent");
  }

  // 4. Check consent hasn't expired
  if (consent.expiresAt < Date.now()) {
    await markConsentExpired(consent.id);
    throw new ForbiddenError("Sharing consent has expired");
  }

  // 5. Filter data to only consented elements
  const allowedElements = filterToConsentedElements(
    request.requestedData,
    consent.sharedElements
  );

  // 6. Log this access
  await logShareAccess({
    consentId: consent.id,
    accessedBy: user.id,
    accessType: request.type,
    elementsAccessed: allowedElements,
    timestamp: Date.now()
  });

  // 7. Return filtered data
  return fetchFilteredData(request.playerIdentityId, allowedElements);
}
```

### 12.4 Privacy by Design

| Principle | Implementation |
|-----------|----------------|
| **Proactive not reactive** | Privacy built into architecture from start |
| **Privacy as default** | Sharing OFF by default; opt-in required |
| **Privacy embedded** | Consent checks in every data access path |
| **Full functionality** | Rich features without compromising privacy |
| **End-to-end security** | Protection throughout data lifecycle |
| **Visibility and transparency** | Full audit trail; clear explanations |
| **Respect for user privacy** | User-centric controls; easy management |

### 12.5 Incident Response

**Data Breach Protocol:**

1. **Detection** (Automated + Manual)
   - Security monitoring alerts
   - User reports
   - Platform staff review

2. **Containment** (Within 1 hour)
   - Isolate affected systems
   - Revoke compromised access tokens
   - Suspend affected sharing arrangements

3. **Assessment** (Within 24 hours)
   - Determine scope of breach
   - Identify affected data subjects
   - Assess risk to individuals

4. **Notification** (Within 72 hours)
   - Notify supervisory authority (if required)
   - Notify affected parents/players
   - Notify affected organizations

5. **Remediation**
   - Fix vulnerability
   - Restore services
   - Enhance monitoring

6. **Review**
   - Post-incident analysis
   - Update security controls
   - Update DPIA

---

## 13. Admin & Governance Tools

### 13.1 Club Admin Capabilities

#### 13.1.1 Sharing Dashboard

Club admins need visibility into data flows for governance:

**Metrics Available:**
- Total players with sharing enabled
- Incoming shares (data received from other orgs)
- Outgoing shares (data sent to other orgs)
- Access frequency by coach
- Sharing trend over time

**Reports Available:**
- GDPR compliance report (data flow mapping)
- Access log summary by time period
- Coach utilization of shared data
- Consent expiry forecast

#### 13.1.2 Guidance Tools

Admins can proactively help parents understand sharing:

**Communication Templates:**
- "Introduction to Passport Sharing" email
- "Managing Your Child's Data" guide
- "FAQ: Sharing Between Clubs"
- "Renewal Reminder" template

**In-App Guidance:**
- Link to add to parent onboarding flows
- Trigger sharing setup prompt for multi-sport families
- Seasonal reminder to review sharing settings

#### 13.1.3 Intervention Capability

Admins cannot override parent decisions but can:

- **Flag concerns** to platform staff for review
- **Receive alerts** for unusual sharing patterns
- **Recommend** parents review their settings
- **Document** any safeguarding concerns related to data

### 13.2 Platform Staff Capabilities

#### 13.2.1 System Monitoring

**Dashboard:**
- Platform-wide sharing statistics
- Anomaly detection alerts
- Consent compliance metrics
- AI insight utilization

**Search & Investigation:**
- Search for specific sharing arrangements
- View detailed consent history
- Audit access logs across organizations
- Trace data flows

#### 13.2.2 Intervention Tools

**Emergency Actions:**
- Suspend specific sharing arrangement (with audit)
- Temporarily disable sharing for investigation
- Force consent re-validation
- Block suspicious users

**Communication:**
- Contact affected parents
- Contact organization admins
- Issue platform-wide guidance

#### 13.2.3 Compliance Reporting

**Reports:**
- Full data flow map (all organizations)
- Consent audit trail export
- DPIA supporting documentation
- Regulatory request responses

### 13.3 Governance Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

   Parent Makes Sharing Decision
              │
              ▼
   ┌────────────────────────┐
   │  Automatic Enforcement │ ← Standard path
   │  (Consent Gateway)     │
   └──────────┬─────────────┘
              │
              ▼
   ┌────────────────────────┐    ┌────────────────────────┐
   │  Club Admin Oversight  │───▶│  Flag Concern          │
   │  (Dashboard Review)    │    │  (Unusual pattern)     │
   └──────────┬─────────────┘    └──────────┬─────────────┘
              │                             │
              │                             ▼
              │                  ┌────────────────────────┐
              │                  │  Platform Staff Review │
              │                  │  (Investigation)       │
              │                  └──────────┬─────────────┘
              │                             │
              │              ┌──────────────┼──────────────┐
              │              │              │              │
              │              ▼              ▼              ▼
              │        No Action      Suspend Share   Escalate
              │                       (Temporary)    (Legal/Safeguarding)
              │              │              │              │
              │              └──────────────┼──────────────┘
              │                             │
              ▼                             ▼
   ┌────────────────────────────────────────────────────────┐
   │  Audit Trail (Immutable record of all actions)         │
   └────────────────────────────────────────────────────────┘
```

---

## 14. Integration & Technical Considerations

### 14.1 Existing System Integration

#### 14.1.1 Leverage Existing Patterns

| Existing Component | Reuse Strategy |
|--------------------|----------------|
| `guardianPlayerLinks.consentedToSharing` | Extend as master switch; add granular consents |
| Injury cross-org visibility pattern | Replicate for passport elements |
| PDF generation (`pdf-generator.ts`) | Add shared passport PDF export |
| Permission system (`permissions.ts`) | Add `canViewSharedPassports()` |
| Audit logging (`playerAccessLogs`) | Extend for share access logging |

#### 14.1.2 New Components Required

| Component | Type | Location |
|-----------|------|----------|
| `passportShareConsents` | Table | `schema.ts` |
| `passportShareAccessLogs` | Table | `schema.ts` |
| `passportShareInsights` | Table | `schema.ts` |
| `passportShareNotifications` | Table | `schema.ts` |
| Sharing queries | Backend | `convex/models/passportSharing.ts` |
| Consent mutations | Backend | `convex/models/passportSharing.ts` |
| AI insights generation | Action | `convex/actions/aiInsights.ts` |
| Sharing dashboard (Parent) | Frontend | `apps/web/src/app/parents/sharing/` |
| Sharing dashboard (Admin) | Frontend | `apps/web/src/app/orgs/[orgId]/admin/sharing/` |
| Cross-sport tab (Coach) | Frontend | `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/` |

### 14.2 API Design

#### 14.2.1 Key Queries

```typescript
// Get sharing status for a player (parent view)
getPlayerSharingStatus(playerIdentityId, guardianId) → {
  activeShares: ShareConsent[],
  pendingRenewals: ShareConsent[],
  recentAccessSummary: AccessSummary
}

// Get shared passport data (coach view)
getSharedPassportData(playerIdentityId, requestingOrgId, requestingUserId) → {
  consentedElements: PassportElements,
  sourceOrganizations: OrgInfo[],
  lastUpdated: timestamp
}

// Get AI insights for shared player (coach view)
getSharedPlayerInsights(playerIdentityId, receivingOrgId) → {
  insights: Insight[],
  generatedAt: timestamp,
  nextRefreshAt: timestamp
}

// Get sharing statistics (admin view)
getOrgSharingStatistics(organizationId) → {
  incomingShares: number,
  outgoingShares: number,
  accessCounts: AccessStats,
  trends: TrendData
}
```

#### 14.2.2 Key Mutations

```typescript
// Create sharing consent (parent action)
createShareConsent(
  playerIdentityId,
  grantedBy,
  receivingOrgId,
  sharedElements,
  expiresAt
) → ConsentId

// Update sharing consent (parent action)
updateShareConsent(
  consentId,
  sharedElements?, // Optional: modify elements
  expiresAt?       // Optional: extend/shorten
) → Success

// Revoke sharing consent (parent action)
revokeShareConsent(
  consentId,
  reason?
) → Success

// Renew sharing consent (parent action)
renewShareConsent(
  consentId,
  newExpiresAt
) → Success

// Log share access (system action)
logShareAccess(
  consentId,
  accessedBy,
  accessType,
  elementsAccessed
) → LogId
```

### 14.3 Performance Considerations

#### 14.3.1 Query Optimization

**Challenge:** Cross-org queries are more expensive than single-org queries.

**Solutions:**
1. **Denormalization:** Store aggregated consent status on player enrollment
2. **Caching:** Cache shared passport data with appropriate invalidation
3. **Pagination:** Paginate access logs and large data sets
4. **Indexes:** Comprehensive indexes on consent and log tables

#### 14.3.2 AI Insight Generation

**Challenge:** Generating insights for every player on every view is expensive.

**Solutions:**
1. **Pre-generation:** Generate insights on schedule (weekly) or data change
2. **Caching:** Store generated insights with validity period
3. **Lazy loading:** Generate on first view, cache for subsequent views
4. **Batching:** Process multiple players' insights together

### 14.4 Notification Strategy

| Event | Recipient | Channel | Timing |
|-------|-----------|---------|--------|
| Sharing enabled | Receiving org coaches | In-app | Immediate |
| Sharing revoked | Receiving org coaches | In-app | Immediate |
| Consent expiring | Parent | Email + In-app | 2 weeks before |
| Consent expired | Parent + Coaches | In-app | On expiry |
| First data access | Parent | In-app | Weekly digest |
| Unusual access pattern | Platform staff | Alert | Immediate |
| New AI insight | Coach | In-app | On generation |

---

## 15. Implementation Phases

### 15.1 Phase 1: Foundation (Core Sharing)

**Goal:** Enable cross-org passport viewing with parent consent and coach acceptance

**Scope:**
- [ ] Schema: `passportShareConsents`, `passportShareAccessLogs`, `passportShareRequests`, `parentNotificationPreferences`
- [ ] Schema: Organization sharing contact fields
- [ ] Schema: Coach notes `isShareable` flag
- [ ] Backend: Consent mutations (create, update, revoke, renew)
- [ ] Backend: Consent gateway (validate access, filter elements)
- [ ] Backend: Cross-org passport query (respecting consent)
- [ ] Backend: Coach acceptance workflow
- [ ] Backend: Coach request-to-share workflow
- [ ] Backend: Multi-guardian notification handling
- [ ] Frontend: Parent sharing dashboard (basic)
- [ ] Frontend: Parent consent flow (all steps)
- [ ] Frontend: Coach shared player indicator
- [ ] Frontend: Coach shared passport view (read-only)
- [ ] Frontend: Coach acceptance flow
- [ ] Frontend: Coach request-to-share flow
- [ ] Frontend: Organization sharing contact settings (admin)
- [ ] Notifications: Basic consent events
- [ ] Notifications: Coach acceptance notifications
- [ ] Notifications: Request notifications

**Dependencies:**
- Existing platform identity system
- Existing guardian-player linking
- Existing passport data queries

**Outcomes:**
- Parents can enable/disable sharing
- Parents can select which orgs receive shared data
- Parents can choose which elements to share
- **Coaches must accept share offers before viewing** (NEW)
- **Coaches can request access to passports** (NEW)
- **Multi-guardian notifications** (NEW)
- All access is logged

**Stretch Goal (Phase 1):**
- [ ] Cross-org parent dashboard (simplified version)

### 15.2 Phase 2: Enhanced Control & Visibility

**Goal:** Rich parent controls and admin oversight

**Scope:**
- [ ] Frontend: Granular element selection UI
- [ ] Frontend: Access audit log viewer (parent)
- [ ] Frontend: Sharing duration controls
- [ ] Frontend: Season-end renewal workflow
- [ ] Frontend: Club admin sharing dashboard
- [ ] Frontend: Admin reports (incoming/outgoing)
- [ ] Backend: Automatic expiry processing
- [ ] Backend: Renewal reminder notifications
- [ ] Backend: Inactive player auto-pause

**Dependencies:**
- Phase 1 complete

**Outcomes:**
- Parents have full granular control
- Parents can see detailed access history
- Sharing auto-expires and requires renewal
- Club admins have governance visibility
- Automatic safeguards in place

### 15.3 Phase 3: AI Insights Engine

**Goal:** Intelligent cross-sport insights for coaches

**Scope:**
- [ ] Schema: `passportShareInsights`
- [ ] Backend: AI insight generation action
- [ ] Backend: Training load analyzer
- [ ] Backend: Skill transfer mapper
- [ ] Backend: Goal synergy analyzer
- [ ] Frontend: Coach cross-sport tab
- [ ] Frontend: AI insight cards
- [ ] Frontend: Coach-to-coach contact (if authorized)
- [ ] Backend: Weekly digest generation
- [ ] Notifications: New insight alerts

**Dependencies:**
- Phase 2 complete
- Claude AI API integration

**Outcomes:**
- Coaches receive intelligent insights
- Training load monitoring across sports
- Skill transfer opportunities identified
- Goal synergies highlighted
- Coach coordination enabled

### 15.4 Phase 4: Adult Player Self-Management

**Goal:** Adult players can share their own passport

**Scope:**
- [ ] Frontend: Adult player sharing dashboard
- [ ] Frontend: Self-consent flow (simplified)
- [ ] Backend: Self-granted consent handling
- [ ] Frontend: "Import history to new club" workflow
- [ ] Backend: Age verification integration

**Dependencies:**
- Phase 2 complete
- Age verification system

**Outcomes:**
- Adult players have full self-control
- Easy sharing when joining new clubs
- No guardian involvement required (18+)

### 15.5 Phase 5: Unified Parent Experience

**Goal:** Cross-org parent dashboard

**Scope:**
- [ ] Frontend: Platform-level parent dashboard (`/parents`)
- [ ] Frontend: All children across all orgs view
- [ ] Frontend: Unified activity feed
- [ ] Frontend: Cross-org sharing management
- [ ] Backend: Cross-org parent queries
- [ ] Notifications: Cross-org digest

**Dependencies:**
- Phase 2 complete

**Outcomes:**
- Parents see all children in one place
- Single dashboard for all sharing decisions
- Unified activity tracking

### 15.6 Phase 6: Advanced Features

**Goal:** Extended capabilities and refinements

**Scope:**
- [ ] Public share tokens (time-limited external viewing)
- [ ] QR code generation for mobile sharing
- [ ] Platform staff intervention tools
- [ ] Enhanced compliance reporting
- [ ] Youth voice features (14-17 visibility)
- [ ] Medical data sharing extension (future)
- [ ] Team-level sharing scoping (granular)

**Dependencies:**
- Phase 3+ complete

**Outcomes:**
- Public passport sharing for trials
- Mobile-friendly sharing
- Full platform governance
- Foundation for medical data sharing

### 15.7 Rollout Strategy (NEW)

**Approach:** Feature flag gradual rollout with monitoring

**Rollout Phases:**

| Phase | Scope | Duration | Gate Criteria |
|-------|-------|----------|---------------|
| Internal Testing | Platform team only | 2 weeks | Core flows working, no critical bugs |
| Closed Beta | 5-10 partner orgs | 4 weeks | Consent completion rate >70%, coach acceptance rate >60% |
| Limited Release | 5% of organizations | 2 weeks | Error rate <0.1%, no critical issues |
| Expanded Release | 25% → 50% | 2 weeks each | Positive metrics trending |
| General Availability | 100% | Ongoing | All gates passed |

**Feature Flags:**

| Flag | Purpose | Default |
|------|---------|---------|
| `passport_sharing_enabled` | Master switch for feature | OFF |
| `passport_sharing_quick_setup` | Quick Share flow option | OFF |
| `passport_sharing_ai_insights` | AI insights panel | OFF |
| `passport_sharing_coach_requests` | Coach request-to-share | ON (when feature enabled) |

**Monitoring Metrics:**
- Consent flow completion rate
- Coach acceptance rate
- Error rates per flow
- Support ticket volume
- User feedback scores

**Rollback Capability:**
- Instant feature flag disable
- Preserve existing consents (paused, not deleted)
- Clear messaging to affected users
- Audit trail maintained

---

## 16. Success Metrics

### 16.1 Adoption Metrics

| Metric | Definition | Target (6 months) | Target (12 months) |
|--------|------------|-------------------|-------------------|
| Parent enablement rate | % parents with sharing ON | 40% | 60% |
| Coach utilization rate | % coaches viewing shared data | 50% | 70% |
| Multi-sport coverage | % multi-sport players with sharing | 60% | 80% |
| Consent renewal rate | % consents renewed vs. expired | 70% | 80% |

### 16.2 Engagement Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Shared views per coach | Average views of shared passports/month | 10+ |
| AI insight interactions | % of insights viewed by coaches | 60% |
| Cross-sport tab usage | % of shared player views that include cross-sport | 50% |
| Parent dashboard visits | Visits to sharing dashboard/month | 2+ |

### 16.3 Trust Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Parent satisfaction | Rating of sharing controls (1-5) | 4.5+ |
| Coach satisfaction | Rating of shared data usefulness (1-5) | 4.0+ |
| Consent revocation rate | % of consents revoked (lower is better) | <10% |
| Complaint rate | Sharing-related complaints/1000 users | <1 |

### 16.4 Compliance Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| GDPR incidents | Number of compliance incidents | 0 |
| Data breach incidents | Number of security incidents | 0 |
| Consent audit pass rate | % of audited consents fully compliant | 100% |
| Access log completeness | % of accesses with full audit trail | 100% |

### 16.5 Business Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Network effect growth | Orgs with active sharing relationships | +50%/quarter |
| Platform stickiness | Retention of orgs using sharing | 95%+ |
| Cross-org acquisition | Orgs joined due to sharing feature | Track |
| Premium feature interest | Orgs interested in advanced sharing | Track |

---

## 17. Risks & Mitigations

### 17.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation from cross-org queries | Medium | Medium | Caching, denormalization, query optimization |
| AI insight quality inconsistency | Medium | Low | Human review, confidence scores, feedback loops |
| Complex consent state management | Medium | Medium | State machine, comprehensive testing, rollback capability |
| Notification fatigue | Medium | Low | Smart batching, user preferences, importance levels |

### 17.2 User Adoption Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parents confused by sharing options | Medium | High | Progressive disclosure, clear explanations, defaults |
| Coaches don't use shared data | Medium | Medium | Proactive insights, dashboard prominence, training |
| Low multi-sport family engagement | Medium | Medium | Targeted onboarding, value demonstration |
| Feature perceived as invasive | Low | High | Privacy-first messaging, transparent controls |

### 17.3 Privacy & Compliance Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data breach of shared data | Low | High | Security architecture, monitoring, incident response |
| Consent validity challenges | Low | Medium | Consent receipts, audit trails, legal review |
| Cross-border transfer issues | Low | Medium | SCCs, data localization options |
| Child data misuse | Very Low | Very High | No commercial use, parental control, platform oversight |

### 17.4 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature complexity delays delivery | Medium | Medium | Phased rollout, MVP first, iterate |
| Organizations resist data sharing | Medium | Medium | Value demonstration, pilot programs |
| Competitive response | Low | Low | Move fast, build network effects |

---

## 18. Appendices

### 18.1 Glossary

| Term | Definition |
|------|------------|
| **Passport** | Comprehensive player development record including skills, goals, notes, and history |
| **Sharing Consent** | Explicit authorization from parent/player to share passport data with a specific organization |
| **Shared Elements** | The specific components of a passport that have been authorized for sharing |
| **Source Organization** | The organization where passport data originates |
| **Receiving Organization** | The organization granted access to view shared passport data |
| **Consent Gateway** | Technical system that validates consent before allowing data access |
| **Cross-Sport Insight** | AI-generated analysis combining data from multiple sports |
| **Training Load** | Aggregate measure of training volume and intensity across sports |
| **Skill Transfer** | Skills developed in one sport that benefit performance in another |
| **Consent Receipt** | Machine-readable record of consent for audit purposes |

### 18.2 Reference Documents

**Internal:**
- `/docs/features/passport-sharing-current-state.md` - Current implementation analysis
- `/docs/features/PRD-passport-sharing-decisions.md` - Stakeholder decisions log (30 decisions)
- `/docs/features/PRD-passport-sharing-review-gaps.md` - Gap analysis and review
- `/docs/features/PRD-passport-sharing-ux-specification.md` - UX specification
- `/docs/architecture/player-passport.md` - Passport architecture design
- `/docs/architecture/identity-system.md` - Platform identity system
- `/packages/backend/convex/schema.ts` - Database schema

**External Standards:**
- [Open Banking Standards - Consent Management](https://standards.openbanking.org.uk/customer-experience-guidelines/introduction/consent-mgmt/v3-1-5/)
- [MyData Architecture](http://hiit.github.io/mydata-stack/stack.html)
- [Solid Project](https://solidproject.org/about)
- [UK Data (Use and Access) Act 2025](https://www.gov.uk/guidance/data-use-and-access-act-2025-data-protection-and-privacy-changes)
- [GDPR-K: Children's Data](https://www.clarip.com/data-privacy/gdpr-child-consent/)

### 18.3 User Research Questions

For validation during implementation:

**For Parents:**
1. How often do you share your child's development information with other coaches?
2. What concerns would you have about digital sharing between clubs?
3. How important is it to see who has accessed your child's data?
4. Would you prefer to share more or less data by default?
5. How would you feel about seasonal re-authorization requirements?

**For Coaches:**
1. How valuable would it be to see a player's development in other sports?
2. What cross-sport information would be most useful?
3. How would you use AI-generated insights in your coaching?
4. Would you contact coaches at other clubs about shared players?
5. What would make you more likely to review shared passport data?

**For Club Administrators:**
1. What governance visibility do you need over data sharing?
2. How would you communicate sharing features to parents?
3. What compliance reporting would be most valuable?
4. What concerns would you have about data leaving your organization?

### 18.4 Competitive Analysis Summary

| Competitor | Sharing Capability | Parent Control | Cross-Sport | AI Insights |
|------------|-------------------|----------------|-------------|-------------|
| Competitor A | PDF export only | None | No | No |
| Competitor B | Team transfer notes | Limited | No | No |
| Competitor C | None | N/A | No | No |
| **PlayerARC** | Full passport sharing | Granular | Yes | Yes |

### 18.5 Future Considerations

**Beyond Initial Scope (Future Roadmap):**

1. **Medical Data Sharing**
   - Physio reports shared with coaches
   - Return-to-play protocols across clubs
   - Injury prevention insights

2. **Trial/Recruitment Sharing**
   - Time-limited shares for trials
   - Scout access with parent approval
   - Academy assessment sharing

3. **International Data Portability**
   - Cross-country data transfer
   - Federation-level integration
   - International standards compliance

4. **Advanced AI Features**
   - Predictive injury risk (aggregated, not individual)
   - Optimal training load recommendations
   - Career pathway suggestions (adult players)

5. **Platform Integrations**
   - Wearable data integration (Garmin, Whoop)
   - Health platform connections (Apple Health, Google Fit)
   - External assessment tools

6. **Biometric Data Handling**
   - If wearable integration added, biometric data requires separate consent tier
   - Enhanced protections for biometric identifiers (heart rate, sleep patterns, GPS location)
   - Illinois BIPA compliance considerations if US market expansion
   - Biometric data never shared without explicit separate consent
   - Age-appropriate controls: Under-16 biometric sharing requires enhanced parental verification
   - Biometric data retention: Shorter retention periods than standard passport data

7. **Dynamic/Adaptive Permissions**
   - Context-aware sharing rules (e.g., "Share only during active season")
   - Purpose-specific time windows (e.g., "Training load data for pre-season only")
   - Automatic pause triggers (e.g., "Pause sharing during injury recovery")
   - Usage-based recommendations (e.g., "Coach hasn't viewed data in 90 days - consider revoking?")
   - Seasonal auto-renewal with smart defaults based on history

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-14 | PlayerARC Product Team | Initial PRD creation |
| 1.1 | 2026-01-14 | PlayerARC Product Team | Updated with 30 stakeholder decisions: coach acceptance workflow, request-to-share, multi-guardian handling, age 18 transition, quick share option, rollout strategy, data freshness indicators, safeguarding access, team-scoped access, notification preferences. See `PRD-passport-sharing-decisions.md` for full decisions log. |
| 1.2 | 2026-01-15 | PlayerARC Product Team | Added 2025 industry best practices: Section 5.6 (AI consent disclosure, tiered consent, NY CDPA, dynamic permissions, privacy-preserving tech), FR-P12 (data portability export), Section 11.7 (consent version tracking), Section 11.8 (US state law considerations), Section 18.5 items 6-7 (biometric handling, adaptive permissions). |

---

## Sign-Off

| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | | ☐ Pending | |
| Technical Lead | | ☐ Pending | |
| Security/Privacy | | ☐ Pending | |
| Legal/Compliance | | ☐ Pending | |
| UX Lead | | ☐ Pending | |

---

**End of PRD Document**
