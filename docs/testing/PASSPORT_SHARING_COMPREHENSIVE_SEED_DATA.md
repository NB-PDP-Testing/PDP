# Passport Sharing Feature - Comprehensive Seed Data Specification

**Date**: January 19, 2026
**Author**: Claude (Data Engineer / UAT Analyst)
**Purpose**: Complete data requirements for testing all passport sharing scenarios

---

## Executive Summary

This document provides a comprehensive analysis of the seed data required to fully test the Passport Sharing feature, including:
- **Cross-Organization Passport Sharing** (Parent → Coach workflow)
- **Coach Passport Comparison** (Insights, Split View, Overlay View)
- **Passport Enquiry System** (Org-to-Org communication)
- **Browse & Discovery** (Coach searching for players)

### Critical Finding

**All existing test accounts are in the SAME organization**, which makes cross-organization passport sharing impossible to test properly.

| Email | Organization ID |
|-------|-----------------|
| neil.b@blablablak.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 |
| neiltest2@skfjkadsfdgsjdgsj.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 |
| neiltest3@skfjkadsfdgsjdgsj.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 |
| neiltesting@example.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 |

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PASSPORT SHARING DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────────┐
    │                        PLATFORM LEVEL (Cross-Org)                      │
    │                                                                        │
    │   ┌─────────────────────────────────────────────────────────────┐     │
    │   │                     PLAYER IDENTITY                          │     │
    │   │   _id: "player_cian_murphy"                                 │     │
    │   │   firstName: "Cian"                                         │     │
    │   │   lastName: "Murphy"                                        │     │
    │   │   dateOfBirth: "2014-03-15"                                │     │
    │   │   gender: "male"                                            │     │
    │   │   playerType: "youth"                                       │     │
    │   └───────────────────────────────┬─────────────────────────────┘     │
    │                                   │                                    │
    │   ┌───────────────────────────────┴─────────────────────────────┐     │
    │   │                   GUARDIAN IDENTITY                          │     │
    │   │   _id: "guardian_mary_murphy"                               │     │
    │   │   userId: [parent_user_id] ◄─── LINKED TO USER             │     │
    │   │   firstName: "Mary"                                         │     │
    │   │   lastName: "Murphy"                                        │     │
    │   │   email: "parent@example.com"                               │     │
    │   │   phone: "+353861234567"                                    │     │
    │   └───────────────────────────────┬─────────────────────────────┘     │
    │                                   │                                    │
    │   ┌───────────────────────────────┴─────────────────────────────┐     │
    │   │               GUARDIAN-PLAYER LINK                           │     │
    │   │   guardianIdentityId: [guardian_id]                         │     │
    │   │   playerIdentityId: [player_id]                             │     │
    │   │   relationship: "mother"                                     │     │
    │   │   hasParentalResponsibility: true ◄─── REQUIRED FOR CONSENT │     │
    │   │   isPrimary: true                                            │     │
    │   │   canSharePassport: true                                     │     │
    │   └─────────────────────────────────────────────────────────────┘     │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘

                            │                              │
        ┌───────────────────┘                              └───────────────────┐
        │                                                                       │
        ▼                                                                       ▼
┌───────────────────────────────┐                   ┌───────────────────────────────┐
│     ORGANIZATION A             │                   │     ORGANIZATION B             │
│     (Source Org - Cork GAA)    │                   │     (Receiving Org - Dublin FC)│
│                                │                   │                                │
│  ORG ENROLLMENT                │                   │  ORG ENROLLMENT                │
│  ├─ playerIdentityId           │                   │  ├─ playerIdentityId           │
│  ├─ organizationId: [org_a]    │                   │  ├─ organizationId: [org_b]    │
│  ├─ sport: "gaa"              │                   │  ├─ sport: "gaa"              │
│  ├─ ageGroup: "u12"           │                   │  ├─ ageGroup: "u12"           │
│  └─ status: "active"          │                   │  └─ status: "active"          │
│                                │                   │                                │
│  SPORT PASSPORT                │                   │  SPORT PASSPORT                │
│  ├─ playerIdentityId           │                   │  ├─ playerIdentityId           │
│  ├─ organizationId: [org_a]    │                   │  ├─ organizationId: [org_b]    │
│  ├─ sportCode: "gaa"          │                   │  ├─ sportCode: "gaa"          │
│  └─ status: "active"          │                   │  └─ status: "active"          │
│                                │                   │                                │
│  SKILL ASSESSMENTS             │                   │  SKILL ASSESSMENTS             │
│  ├─ gaa_hand_pass: 4.2        │                   │  ├─ gaa_hand_pass: 4.0  ◄─AGREE│
│  ├─ gaa_kick_pass: 3.8        │                   │  ├─ gaa_kick_pass: 2.5  ◄─DIV! │
│  ├─ gaa_solo: 4.0             │                   │  ├─ gaa_solo: 3.9       ◄─AGREE│
│  ├─ gaa_tackle: 3.5           │                   │  ├─ gaa_tackle: 4.5     ◄─DIV! │
│  └─ gaa_catch: 4.5            │                   │  └─ gaa_shooting: 3.5   ◄─BLIND│
│         │                      │                   │         │                      │
│         │                      │                   │         │                      │
│  COACHES:                      │                   │  COACHES:                      │
│  └─ [Coach at Org A]           │                   │  └─ [Coach at Org B] ◄─ USES  │
│                                │                   │         COMPARISON FEATURE     │
└────────────────────────────────┘                   └────────────────────────────────┘
                    │                                              ▲
                    │                                              │
                    │         ┌──────────────────────────────┐     │
                    │         │   PASSPORT SHARE CONSENT      │     │
                    │         │                               │     │
                    └────────►│   playerIdentityId: [player]  │     │
                              │   grantedBy: [parent_userId]  │◄────┘
                              │   guardianIdentityId: [guard] │
                              │                               │
                              │   SOURCE:                     │
                              │   ├─ sourceOrgMode: "specific"│
                              │   └─ sourceOrgIds: [org_a]    │
                              │                               │
                              │   RECEIVING:                  │
                              │   └─ receivingOrgId: [org_b]  │
                              │                               │
                              │   ELEMENTS:                   │
                              │   ├─ basicProfile: true       │
                              │   ├─ skillRatings: true       │
                              │   ├─ skillHistory: true       │
                              │   └─ developmentGoals: true   │
                              │                               │
                              │   STATUS:                     │
                              │   ├─ status: "active"         │
                              │   ├─ coachAcceptance: "accepted"
                              │   └─ expiresAt: [future]      │
                              └──────────────────────────────┘
```

---

## Required Database Tables

### Tier 1: Foundation (Must Have First)

| Table | Records Needed | Purpose |
|-------|---------------|---------|
| `user` (Better Auth) | 4+ | Parent, Coach A, Coach B, Admin |
| `organization` (Better Auth) | 2 | Source Org (A) + Receiving Org (B) |
| `member` (Better Auth) | 5+ | User memberships with functionalRoles |

### Tier 2: Identity System

| Table | Records Needed | Purpose |
|-------|---------------|---------|
| `playerIdentities` | 3-5 | Platform-level player records |
| `guardianIdentities` | 2-3 | Platform-level guardian records |
| `guardianPlayerLinks` | 3-5 | Guardian-player relationships |

### Tier 3: Organization-Scoped Data

| Table | Records Needed | Purpose |
|-------|---------------|---------|
| `orgPlayerEnrollments` | 6-10 | Players enrolled at each org |
| `sportPassports` | 6-10 | One per player per sport per org |
| `skillAssessments` | 40-60 | Skill ratings (10 per passport) |
| `passportGoals` | 6-10 | Development goals |
| `team` | 2-4 | Teams at each organization |
| `teamPlayerIdentities` | 6-10 | Player-team links |
| `coachAssignments` | 2-4 | Coach-team mappings |

### Tier 4: Passport Sharing

| Table | Records Needed | Purpose |
|-------|---------------|---------|
| `passportShareConsents` | 3-5 | Active sharing consents |
| `passportShareRequests` | 2-3 | Coach access requests |
| `passportShareAccessLogs` | 5-10 | Audit trail entries |
| `passportEnquiries` | 2-3 | Org-to-org enquiries |
| `passportShareNotifications` | 5-10 | Notifications |
| `parentNotificationPreferences` | 2-3 | Guardian preferences |

### Tier 5: Reference Data

| Table | Records Needed | Purpose |
|-------|---------------|---------|
| `sports` | 2-3 | GAA, Soccer reference |
| `skillCategories` | 5-10 | Skill groupings |
| `skillDefinitions` | 20-30 | Individual skills |
| `skillBenchmarks` | 10-20 | NGB standards |

---

## Detailed Seed Data Specifications

### Scenario 1: Primary Test Case - Cross-Org Sharing with Comparison

**Purpose**: Test the complete passport sharing and comparison workflow

#### Organizations (Better Auth)

```javascript
// Organization A - Source (existing)
{
  _id: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  name: "Cork Youth GAA",
  slug: "cork-youth-gaa",
  metadata: { sport: "gaa" },
  sharingContactMode: "enquiry",
  // Extended fields:
  colors: ["#FF0000", "#FFFFFF", "#000000"],
  website: "https://corkyouthgaa.ie"
}

// Organization B - Receiving (NEW - MUST CREATE)
{
  _id: "org_dublin_fc_test_001",
  name: "Dublin Football Club",
  slug: "dublin-fc-test",
  metadata: { sport: "gaa" },
  sharingContactMode: "enquiry",
  colors: ["#0066CC", "#FFFFFF", "#000033"]
}
```

#### Users (Better Auth)

```javascript
// User 1: Parent (existing)
{
  _id: "user_parent_001",
  email: "parent.murphy@example.com",
  name: "Mary Murphy",
  firstName: "Mary",
  lastName: "Murphy",
  phone: "+353861234567"
}

// User 2: Coach at Org A (existing)
{
  _id: "user_coach_a_001",
  email: "coach.cork@example.com",
  name: "Sean O'Brien",
  firstName: "Sean",
  lastName: "O'Brien",
  currentOrgId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7"
}

// User 3: Coach at Org B (NEW)
{
  _id: "user_coach_b_001",
  email: "coach.dublin@example.com",
  name: "Patrick Kelly",
  firstName: "Patrick",
  lastName: "Kelly",
  currentOrgId: "org_dublin_fc_test_001"
}

// User 4: Admin at Org B (NEW)
{
  _id: "user_admin_b_001",
  email: "admin.dublin@example.com",
  name: "Catherine Walsh",
  firstName: "Catherine",
  lastName: "Walsh",
  currentOrgId: "org_dublin_fc_test_001"
}
```

#### Members (Better Auth)

```javascript
// Parent is member of Org A (to view child data)
{
  userId: "user_parent_001",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  role: "member",
  functionalRoles: ["parent"],
  activeFunctionalRole: "parent"
}

// Coach is member of Org A
{
  userId: "user_coach_a_001",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  role: "member",
  functionalRoles: ["coach"],
  activeFunctionalRole: "coach"
}

// Coach is member of Org B
{
  userId: "user_coach_b_001",
  organizationId: "org_dublin_fc_test_001",
  role: "member",
  functionalRoles: ["coach"],
  activeFunctionalRole: "coach"
}

// Admin is member of Org B
{
  userId: "user_admin_b_001",
  organizationId: "org_dublin_fc_test_001",
  role: "admin",
  functionalRoles: ["admin", "coach"],
  activeFunctionalRole: "admin"
}
```

#### Player Identity (Platform-Level)

```javascript
// Player 1: Main test player - enrolled at BOTH orgs
{
  _id: "player_cian_murphy_001",
  firstName: "Cian",
  lastName: "Murphy",
  dateOfBirth: "2014-03-15",
  gender: "male",
  playerType: "youth",
  verificationStatus: "guardian_verified",
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}

// Player 2: Single-org player (control)
{
  _id: "player_aoife_ryan_002",
  firstName: "Aoife",
  lastName: "Ryan",
  dateOfBirth: "2013-07-22",
  gender: "female",
  playerType: "youth",
  verificationStatus: "unverified",
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}

// Player 3: Multi-sport player
{
  _id: "player_liam_kelly_003",
  firstName: "Liam",
  lastName: "Kelly",
  dateOfBirth: "2012-11-08",
  gender: "male",
  playerType: "youth",
  verificationStatus: "guardian_verified",
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}
```

#### Guardian Identity (Platform-Level)

```javascript
// Guardian for Cian Murphy
{
  _id: "guardian_mary_murphy_001",
  userId: "user_parent_001",  // CRITICAL: Links to parent user
  firstName: "Mary",
  lastName: "Murphy",
  email: "parent.murphy@example.com",
  phone: "+353861234567",
  address: {
    line1: "123 Main Street",
    city: "Cork",
    county: "Cork",
    eircode: "T12 AB34"
  },
  allowGlobalPassportDiscovery: true,
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}

// Second guardian for Cian (father)
{
  _id: "guardian_john_murphy_002",
  userId: "user_parent_002",  // Different user account
  firstName: "John",
  lastName: "Murphy",
  email: "john.murphy@example.com",
  phone: "+353867654321",
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}
```

#### Guardian-Player Links

```javascript
// Mary Murphy is Cian's mother with parental responsibility
{
  guardianIdentityId: "guardian_mary_murphy_001",
  playerIdentityId: "player_cian_murphy_001",
  relationship: "mother",
  hasParentalResponsibility: true,  // CRITICAL
  isPrimary: true,
  canSharePassport: true,
  canViewMedicalInfo: true,
  canReceiveNotifications: true,
  createdAt: 1704067200000
}

// John Murphy is Cian's father with parental responsibility
{
  guardianIdentityId: "guardian_john_murphy_002",
  playerIdentityId: "player_cian_murphy_001",
  relationship: "father",
  hasParentalResponsibility: true,
  isPrimary: false,
  canSharePassport: true,
  canViewMedicalInfo: true,
  canReceiveNotifications: true,
  createdAt: 1704067200000
}
```

#### Org Player Enrollments

```javascript
// Cian at Org A (Cork GAA)
{
  playerIdentityId: "player_cian_murphy_001",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  sport: "gaa",
  ageGroup: "u12",
  season: "2025-2026",
  status: "active",
  enrolledAt: 1704067200000,
  createdAt: 1704067200000,
  updatedAt: 1704067200000
}

// Cian at Org B (Dublin FC)
{
  playerIdentityId: "player_cian_murphy_001",
  organizationId: "org_dublin_fc_test_001",
  sport: "gaa",
  ageGroup: "u12",
  season: "2025-2026",
  status: "active",
  enrolledAt: 1704153600000,
  createdAt: 1704153600000,
  updatedAt: 1704153600000
}
```

#### Sport Passports

```javascript
// Cian's GAA passport at Org A
{
  _id: "passport_cian_org_a_gaa",
  playerIdentityId: "player_cian_murphy_001",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  sportCode: "gaa",
  status: "active",
  preferredPosition: "midfielder",
  currentTechnicalRating: 4.0,
  currentTacticalRating: 3.5,
  currentPhysicalRating: 4.2,
  currentMentalRating: 4.0,
  createdAt: 1704067200000,
  updatedAt: Date.now()
}

// Cian's GAA passport at Org B
{
  _id: "passport_cian_org_b_gaa",
  playerIdentityId: "player_cian_murphy_001",
  organizationId: "org_dublin_fc_test_001",
  sportCode: "gaa",
  status: "active",
  preferredPosition: "forward",  // Note: Different position assessment
  currentTechnicalRating: 3.8,   // Slightly different ratings
  currentTacticalRating: 3.7,
  currentPhysicalRating: 4.0,
  currentMentalRating: 4.2,
  createdAt: 1704153600000,
  updatedAt: Date.now()
}
```

#### Skill Assessments - Org A (Source)

```javascript
const orgAAssessments = [
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_hand_pass",
    rating: 4.2,
    confidence: "high",
    assessmentDate: "2026-01-10",
    assessmentType: "training",
    assessorUserId: "user_coach_a_001",
    assessorRole: "coach",
    notes: "Excellent hand pass technique, good accuracy",
    createdAt: Date.now() - 86400000
  },
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_kick_pass",
    rating: 3.8,
    confidence: "high",
    assessmentDate: "2026-01-10",
    assessmentType: "training",
    assessorUserId: "user_coach_a_001",
    assessorRole: "coach",
    notes: "Good kick pass, working on distance",
    createdAt: Date.now() - 86400000
  },
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_solo",
    rating: 4.0,
    confidence: "high",
    assessmentDate: "2026-01-10",
    assessmentType: "match",
    assessorUserId: "user_coach_a_001",
    assessorRole: "coach",
    createdAt: Date.now() - 86400000
  },
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_tackle",
    rating: 3.5,
    confidence: "medium",
    assessmentDate: "2026-01-08",
    assessmentType: "training",
    assessorUserId: "user_coach_a_001",
    assessorRole: "coach",
    notes: "Needs work on timing",
    createdAt: Date.now() - 172800000
  },
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_catch",
    rating: 4.5,
    confidence: "high",
    assessmentDate: "2026-01-10",
    assessmentType: "match",
    assessorUserId: "user_coach_a_001",
    assessorRole: "coach",
    notes: "Strong catching ability under pressure",
    createdAt: Date.now() - 86400000
  }
];
```

#### Skill Assessments - Org B (Receiving) - DIFFERENT RATINGS FOR COMPARISON

```javascript
const orgBAssessments = [
  {
    passportId: "passport_cian_org_b_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_hand_pass",
    rating: 4.0,   // AGREEMENT: Within 0.5 of Org A (4.2)
    confidence: "high",
    assessmentDate: "2026-01-12",
    assessmentType: "training",
    assessorUserId: "user_coach_b_001",
    assessorRole: "coach",
    createdAt: Date.now() - 43200000
  },
  {
    passportId: "passport_cian_org_b_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_kick_pass",
    rating: 2.5,   // DIVERGENCE: 1.3 difference from Org A (3.8)
    confidence: "medium",
    assessmentDate: "2026-01-12",
    assessmentType: "training",
    assessorUserId: "user_coach_b_001",
    assessorRole: "coach",
    notes: "Needs significant work on kick accuracy",
    createdAt: Date.now() - 43200000
  },
  {
    passportId: "passport_cian_org_b_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_solo",
    rating: 3.9,   // AGREEMENT: Within 0.5 of Org A (4.0)
    confidence: "high",
    assessmentDate: "2026-01-12",
    assessmentType: "training",
    assessorUserId: "user_coach_b_001",
    assessorRole: "coach",
    createdAt: Date.now() - 43200000
  },
  {
    passportId: "passport_cian_org_b_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_tackle",
    rating: 4.5,   // DIVERGENCE: 1.0 difference from Org A (3.5) - opposite direction!
    confidence: "high",
    assessmentDate: "2026-01-12",
    assessmentType: "match",
    assessorUserId: "user_coach_b_001",
    assessorRole: "coach",
    notes: "Excellent tackling in matches",
    createdAt: Date.now() - 43200000
  },
  {
    passportId: "passport_cian_org_b_gaa",
    playerIdentityId: "player_cian_murphy_001",
    sportCode: "gaa",
    skillCode: "gaa_shooting",
    rating: 3.5,   // BLIND SPOT: Only assessed at Org B
    confidence: "medium",
    assessmentDate: "2026-01-12",
    assessmentType: "training",
    assessorUserId: "user_coach_b_001",
    assessorRole: "coach",
    createdAt: Date.now() - 43200000
  }
];
```

#### Passport Share Consent (THE KEY RECORD)

```javascript
{
  _id: "consent_cian_to_dublin",
  playerIdentityId: "player_cian_murphy_001",

  // Who granted consent
  grantedBy: "user_parent_001",  // Parent's user ID
  grantedByType: "guardian",
  guardianIdentityId: "guardian_mary_murphy_001",

  // How sharing was initiated
  initiationType: "parent_initiated",  // or "coach_requested"
  sourceRequestId: null,  // Link to passportShareRequests if coach_requested

  // SOURCE: Where data comes FROM
  sourceOrgMode: "specific_orgs",  // or "all_enrolled"
  sourceOrgIds: ["jh7f6k14jw7j4sj9rr9dfzekr97xm9j7"],  // Cork GAA

  // RECEIVING: Who can VIEW the data
  receivingOrgId: "org_dublin_fc_test_001",  // Dublin FC

  // What data is shared
  sharedElements: {
    basicProfile: true,
    skillRatings: true,
    skillHistory: true,
    developmentGoals: true,
    coachNotes: false,
    benchmarkData: false,
    attendanceRecords: false,
    injuryHistory: false,
    medicalSummary: false,
    contactInfo: false
  },

  // Status
  status: "active",
  coachAcceptanceStatus: "accepted",  // CRITICAL: Coach has accepted!
  acceptedByCoachId: "user_coach_b_001",
  acceptedAt: Date.now() - 86400000,  // Accepted yesterday

  // Dates
  consentedAt: Date.now() - 172800000,  // Granted 2 days ago
  expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),  // 1 year from now
  renewalReminderSent: false,
  renewalCount: 0,

  consentVersion: "1.0",
  createdAt: Date.now() - 172800000,
  updatedAt: Date.now() - 86400000
}
```

#### Teams

```javascript
// Team at Org A
{
  _id: "team_cork_u12_boys",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  name: "Cork U12 Boys",
  sport: "gaa",
  ageGroup: "u12",
  gender: "male",
  season: "2025-2026",
  status: "active"
}

// Team at Org B
{
  _id: "team_dublin_u12_boys",
  organizationId: "org_dublin_fc_test_001",
  name: "Dublin U12 Squad",
  sport: "gaa",
  ageGroup: "u12",
  gender: "male",
  season: "2025-2026",
  status: "active"
}
```

#### Team Player Identities

```javascript
// Cian on Cork team
{
  playerIdentityId: "player_cian_murphy_001",
  teamId: "team_cork_u12_boys",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  role: "player",
  season: "2025-2026",
  status: "active",
  joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000
}

// Cian on Dublin team
{
  playerIdentityId: "player_cian_murphy_001",
  teamId: "team_dublin_u12_boys",
  organizationId: "org_dublin_fc_test_001",
  role: "player",
  season: "2025-2026",
  status: "active",
  joinedAt: Date.now() - 20 * 24 * 60 * 60 * 1000
}
```

#### Coach Assignments

```javascript
// Coach A assigned to Cork team
{
  userId: "user_coach_a_001",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  teamIds: ["team_cork_u12_boys"],
  ageGroups: ["u12"],
  isPrimaryCoach: true,
  createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000
}

// Coach B assigned to Dublin team
{
  userId: "user_coach_b_001",
  organizationId: "org_dublin_fc_test_001",
  teamIds: ["team_dublin_u12_boys"],
  ageGroups: ["u12"],
  isPrimaryCoach: true,
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
}
```

---

## Test Scenarios Coverage

### Scenario Matrix

| ID | Scenario | Required Data | Expected Outcome |
|----|----------|--------------|------------------|
| **S1** | Parent enables sharing from Org A to Org B | Player, Guardian, Enrollments at both orgs | Consent created with status="active" |
| **S2** | Coach B accepts pending share | Consent with coachAcceptanceStatus="pending" | Status changes to "accepted" |
| **S3** | Coach B views comparison - same sport | Active consent + assessments at both orgs | Insights show agreements/divergences |
| **S4** | Coach B views comparison - different sport | Player with GAA at Org A, Soccer at Org B | Cross-sport notice displayed |
| **S5** | Coach B requests access via enquiry | Org A configured for enquiry mode | Enquiry created with status="open" |
| **S6** | Admin reviews enquiry queue | Open enquiries | Queue displays with counts |
| **S7** | Coach browses discoverable players | Players with allowGlobalDiscovery=true | Search results displayed |
| **S8** | Parent revokes consent | Active consent | Status changes to "revoked" |
| **S9** | Consent expires | Expired consent | Access denied |
| **S10** | Multi-guardian notification | 2 guardians with parental responsibility | Both receive notifications |

---

## Expected Comparison Results

For the seed data above, the comparison view should show:

### Agreements (Delta ≤ 0.5)
| Skill | Org A | Org B | Delta | Status |
|-------|-------|-------|-------|--------|
| Hand Pass | 4.2 | 4.0 | 0.2 | ✅ Agreement |
| Solo | 4.0 | 3.9 | 0.1 | ✅ Agreement |

### Divergences (Delta > 0.5)
| Skill | Org A | Org B | Delta | Status |
|-------|-------|-------|-------|--------|
| Kick Pass | 3.8 | 2.5 | 1.3 | 🔴 Significant |
| Tackle | 3.5 | 4.5 | 1.0 | 🟡 Minor |

### Blind Spots
| Type | Skills |
|------|--------|
| Local Only (Org A) | Catch |
| Shared Only (Org B) | Shooting |

---

## Reference Data Requirements

### Sports

```javascript
{
  code: "gaa",
  name: "GAA Football",
  governingBody: "GAA",
  isActive: true,
  sortOrder: 1
}
```

### Skill Categories (GAA)

```javascript
const gaaCategories = [
  { code: "gaa_ball_mastery", name: "Ball Mastery", sportCode: "gaa", sortOrder: 1 },
  { code: "gaa_kicking", name: "Kicking", sportCode: "gaa", sortOrder: 2 },
  { code: "gaa_catching", name: "Catching", sportCode: "gaa", sortOrder: 3 },
  { code: "gaa_tackling", name: "Tackling & Blocking", sportCode: "gaa", sortOrder: 4 },
  { code: "gaa_movement", name: "Movement & Agility", sportCode: "gaa", sortOrder: 5 }
];
```

### Skill Definitions (GAA)

```javascript
const gaaSkills = [
  {
    code: "gaa_hand_pass",
    name: "Hand Pass",
    categoryId: "[ball_mastery_id]",
    sportCode: "gaa",
    description: "Ability to accurately hand pass the ball",
    level1: "Cannot perform consistently",
    level2: "Basic execution under no pressure",
    level3: "Consistent execution under moderate pressure",
    level4: "Good execution in match conditions",
    level5: "Excellent execution under high pressure"
  },
  // ... more skills
];
```

---

## Verification Checklist

After seeding data, verify:

### Identity System
- [ ] Player exists in `playerIdentities`
- [ ] Guardian exists in `guardianIdentities` with `userId` linked to parent user
- [ ] Guardian-Player link exists with `hasParentalResponsibility: true`

### Organization Enrollment
- [ ] Player enrolled at BOTH organizations
- [ ] Sport passports exist at BOTH organizations
- [ ] Teams exist at both organizations
- [ ] Player linked to teams via `teamPlayerIdentities`
- [ ] Coaches assigned to teams

### Skill Assessments
- [ ] Assessments exist at Org A with specific ratings
- [ ] Assessments exist at Org B with DIFFERENT ratings
- [ ] At least 2 agreements (delta ≤ 0.5)
- [ ] At least 2 divergences (delta > 0.5)
- [ ] At least 1 blind spot (skill only at one org)

### Passport Sharing
- [ ] Consent record exists with:
  - `status: "active"`
  - `coachAcceptanceStatus: "accepted"`
  - `receivingOrgId` pointing to Org B
  - `sourceOrgIds` including Org A
  - `sharedElements.skillRatings: true`
  - `expiresAt` in the future

### Reference Data
- [ ] Sport "gaa" exists in `sports` table
- [ ] Skill categories exist for GAA
- [ ] Skill definitions exist for all skill codes used in assessments

---

## Implementation Options

### Option 1: Manual via Convex Dashboard (Fastest)

1. Go to Convex Dashboard → Data
2. Create Organization B manually in Better Auth tables
3. Create user accounts and memberships
4. Insert platform-level identities
5. Insert organization-scoped data
6. Create consent record

**Time**: 2-3 hours
**Risk**: Low (no code changes)

### Option 2: Seed Script (Most Reliable)

Create `packages/backend/convex/scripts/seedPassportSharingTestData.ts`:

```typescript
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const seedPassportSharingData = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Create Organization B via Better Auth component
    // 2. Create users and memberships
    // 3. Create platform-level identities
    // 4. Create org-scoped data
    // 5. Create consent record
    // 6. Log created IDs for verification
  }
});
```

**Time**: 4-6 hours
**Risk**: Medium (requires careful implementation)
**Benefit**: Repeatable, automated

### Option 3: Better Auth Admin API (For Organizations)

```typescript
// Create organization via Better Auth admin API
const org = await authClient.admin.createOrganization({
  name: "Dublin Football Club",
  slug: "dublin-fc-test",
  metadata: { sport: "gaa" }
});

// Add user as member
await authClient.admin.addMemberToOrganization({
  organizationId: org.id,
  userId: "user_coach_b_001",
  role: "member"
});
```

**Time**: 3-4 hours
**Risk**: Low (uses official APIs)

---

## Minimum Viable Seed Data

For basic testing with minimal setup:

| Table | Records | Time |
|-------|---------|------|
| Organization B | 1 | 5 min |
| User (Coach B) | 1 | 5 min |
| Member (Coach B at Org B) | 1 | 5 min |
| Player Identity | 1 (reuse existing) | 0 min |
| Guardian Identity | 1 (reuse existing) | 0 min |
| Guardian-Player Link | 1 (verify exists) | 5 min |
| Org Enrollment (Org B) | 1 | 5 min |
| Sport Passport (Org B) | 1 | 5 min |
| Skill Assessments (Org B) | 5 | 10 min |
| Consent Record | 1 | 10 min |

**Total**: ~50 minutes for minimum test setup

---

## Summary

To fully test the passport sharing feature, you need:

1. **Two different organizations** (critical - currently only one exists)
2. **A player enrolled at BOTH organizations**
3. **Skill assessments at BOTH organizations** (with varying ratings)
4. **An active consent record** with `coachAcceptanceStatus: "accepted"`
5. **Coach assignment** at the receiving organization
6. **Guardian with parental responsibility** linked to player

The most critical step is **creating a second organization**, which requires either:
- Using Better Auth admin APIs
- Using the Convex Dashboard to insert directly
- Creating a seed script

---

## Next Steps

1. **Choose implementation approach** (Manual / Script / API)
2. **Create Organization B** with proper Better Auth setup
3. **Add test users** to Organization B
4. **Create remaining seed data** following this specification
5. **Run verification checklist** to confirm data integrity
6. **Execute test scenarios** from the UAT plan

---

## PRD User Story Coverage Matrix

Based on `scripts/ralph/prds/passport-sharing-phase-1.json`, the seed data must support testing these 49 user stories:

### Backend User Stories (US-001 to US-022)

| Story | Title | Data Required | Covered |
|-------|-------|---------------|---------|
| **US-001** | passportShareConsents table - core fields | Consent record with all fields | ✅ |
| **US-002** | Coach acceptance fields | Consent with coachAcceptanceStatus variations | ✅ |
| **US-003** | Lifecycle fields | Expired consent, renewed consent | ⚠️ Need expired |
| **US-004** | passportShareAccessLogs table | Access log entries | ✅ |
| **US-005** | passportShareRequests table | Coach access request records | ⚠️ Need request |
| **US-006** | parentNotificationPreferences table | Guardian preference records | ⚠️ Need prefs |
| **US-007** | Organization sharing contact fields | Org with sharingContactMode | ✅ |
| **US-008** | Coach notes isShareable flag | Goals/notes with isShareable=true | ⚠️ Need notes |
| **US-009** | passportSharing.ts helpers | Guardian with parental responsibility | ✅ |
| **US-010** | Create consent mutation | Guardian, player, receiving org | ✅ |
| **US-011** | Consent notifications | Multiple guardians with responsibility | ✅ |
| **US-012** | Update consent mutation | Active consent to modify | ✅ |
| **US-013** | Revoke consent mutation | Active consent to revoke | ✅ |
| **US-014** | Consent gateway query | Active + expired + revoked consents | ⚠️ Need variations |
| **US-015** | Cross-org passport query | Passport with skill assessments | ✅ |
| **US-016** | Coach acceptance mutation | Pending consent at receiving org | ⚠️ Need pending |
| **US-017** | Coach decline mutation | Consent with decline history | ⚠️ Need declined |
| **US-018** | Coach request-to-share | Player without existing consent | ⚠️ Need player B |
| **US-019** | Parent respond to request | Pending request from coach | ⚠️ Need request |
| **US-020** | Access logging mutation | Active consent + accessor | ✅ |
| **US-021** | Multi-guardian notification | Multiple guardians on player | ✅ |
| **US-022** | Consent expiry job | Consents expiring in 14 days | ⚠️ Need expiring |

### Frontend User Stories (US-023 to US-049)

| Story | Title | Data Required |
|-------|-------|---------------|
| **US-023** | Parent sharing dashboard - page | Multiple children with varying status |
| **US-024** | Child cards | Active shares, pending requests |
| **US-025-029** | Enable sharing wizard | Receiving orgs to select |
| **US-030** | Quick share option | Previous consent history |
| **US-031** | Revocation flow UI | Active consent to revoke |
| **US-032-033** | Access audit log | Access log entries |
| **US-034** | Notification preferences | Guardian record |
| **US-035** | Pending coach requests | Pending request records |
| **US-036** | Shared players on coach dashboard | Accepted consents |
| **US-037-038** | Accept/decline share modal | Pending consent |
| **US-039-040** | Shared passport viewer | Skills, goals, notes |
| **US-041** | Request access flow | Player without consent |
| **US-042** | Data freshness indicators | Assessments of varying ages |
| **US-043** | Organization contact display | Org with contact config |
| **US-044** | Admin sharing contact settings | Organization to configure |
| **US-045-046** | Admin sharing statistics | Multiple consents/activity |
| **US-047-049** | Notifications | Various consent events |

---

## Additional Seed Data for Full PRD Coverage

### 1. Consent Status Variations

```javascript
// Pending consent (coach hasn't accepted)
{
  _id: "consent_pending_001",
  playerIdentityId: "player_aoife_ryan_002",
  grantedBy: "user_parent_002",
  receivingOrgId: "org_dublin_fc_test_001",
  status: "active",
  coachAcceptanceStatus: "pending",  // KEY: Pending
  // ... other fields
}

// Declined consent
{
  _id: "consent_declined_001",
  playerIdentityId: "player_liam_kelly_003",
  grantedBy: "user_parent_003",
  receivingOrgId: "org_dublin_fc_test_001",
  status: "active",
  coachAcceptanceStatus: "declined",
  declineReason: "Player not on my team",
  declineCount: 1
}

// Expired consent
{
  _id: "consent_expired_001",
  playerIdentityId: "player_cian_murphy_001",
  grantedBy: "user_parent_001",
  receivingOrgId: "org_dublin_fc_test_001",
  status: "expired",
  expiresAt: Date.now() - 86400000  // Expired yesterday
}

// Expiring soon consent (14 days)
{
  _id: "consent_expiring_001",
  playerIdentityId: "player_aoife_ryan_002",
  grantedBy: "user_parent_002",
  receivingOrgId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  status: "active",
  coachAcceptanceStatus: "accepted",
  expiresAt: Date.now() + (14 * 24 * 60 * 60 * 1000),  // 14 days
  renewalReminderSent: false
}
```

### 2. Passport Share Requests (Coach-Initiated)

```javascript
// Pending request from coach
{
  _id: "request_001",
  playerIdentityId: "player_liam_kelly_003",
  requestingUserId: "user_coach_b_001",
  requestingOrgId: "org_dublin_fc_test_001",
  reason: "Would like to coordinate training for dual-club player",
  status: "pending",
  expiresAt: Date.now() + (14 * 24 * 60 * 60 * 1000),  // 14 days
  createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000),  // 3 days ago
  updatedAt: Date.now() - (3 * 24 * 60 * 60 * 1000)
}

// Expired request
{
  _id: "request_002",
  playerIdentityId: "player_aoife_ryan_002",
  requestingUserId: "user_coach_b_001",
  requestingOrgId: "org_dublin_fc_test_001",
  reason: "Player trying out for our team",
  status: "expired",
  expiresAt: Date.now() - 86400000,  // Expired yesterday
  createdAt: Date.now() - (15 * 24 * 60 * 60 * 1000)
}
```

### 3. Parent Notification Preferences

```javascript
// Real-time notifications
{
  guardianIdentityId: "guardian_mary_murphy_001",
  accessNotificationFrequency: "realtime",
  allowEnrollmentVisibility: true,
  notifyOnCoachAccess: true,
  notifyOnShare: true,
  notifyOnRevoke: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

// Weekly digest
{
  guardianIdentityId: "guardian_john_murphy_002",
  accessNotificationFrequency: "weekly",
  allowEnrollmentVisibility: true,
  notifyOnCoachAccess: true,
  notifyOnShare: false,
  notifyOnRevoke: true
}
```

### 4. Access Log Entries

```javascript
const accessLogs = [
  {
    consentId: "consent_cian_to_dublin",
    playerIdentityId: "player_cian_murphy_001",
    accessedBy: "user_coach_b_001",
    accessedByRole: "coach",
    organizationId: "org_dublin_fc_test_001",
    accessType: "view_skills",
    accessedAt: Date.now() - 86400000,
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0..."
  },
  {
    consentId: "consent_cian_to_dublin",
    playerIdentityId: "player_cian_murphy_001",
    accessedBy: "user_coach_b_001",
    accessedByRole: "coach",
    organizationId: "org_dublin_fc_test_001",
    accessType: "view_goals",
    accessedAt: Date.now() - 43200000
  },
  {
    consentId: "consent_cian_to_dublin",
    playerIdentityId: "player_cian_murphy_001",
    accessedBy: "user_admin_b_001",
    accessedByRole: "admin",
    organizationId: "org_dublin_fc_test_001",
    accessType: "view_summary",
    accessedAt: Date.now() - 3600000
  }
];
```

### 5. Passport Goals (with isShareable)

```javascript
const passportGoals = [
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    title: "Improve kick accuracy",
    description: "Work on point-scoring from play",
    category: "technical",
    status: "in_progress",
    priority: "high",
    isShareable: true,  // KEY: Can be shared
    progress: 60,
    milestones: [
      { title: "Practice 3 times weekly", completed: true },
      { title: "Score 5 points in training match", completed: false }
    ],
    createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000)
  },
  {
    passportId: "passport_cian_org_a_gaa",
    playerIdentityId: "player_cian_murphy_001",
    title: "Defensive positioning",
    description: "Private coach note - not for sharing",
    category: "tactical",
    status: "in_progress",
    priority: "medium",
    isShareable: false,  // KEY: Private
    progress: 30
  }
];
```

### 6. Passport Enquiries (Org-to-Org)

```javascript
// Open enquiry
{
  playerIdentityId: "player_cian_murphy_001",
  playerName: "Cian Murphy",
  sourceOrgId: "org_dublin_fc_test_001",
  sourceOrgName: "Dublin Football Club",
  sourceUserId: "user_coach_b_001",
  sourceUserName: "Patrick Kelly",
  sourceUserEmail: "coach.dublin@example.com",
  targetOrgId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  targetOrgName: "Cork Youth GAA",
  subject: "Coordinate dual club commitments",
  message: "Hi, we'd like to coordinate training schedules for Cian who plays for both clubs.",
  contactPreference: "email",
  status: "open",
  createdAt: Date.now() - (2 * 24 * 60 * 60 * 1000)
}

// Closed enquiry
{
  playerIdentityId: "player_cian_murphy_001",
  playerName: "Cian Murphy",
  sourceOrgId: "org_dublin_fc_test_001",
  sourceOrgName: "Dublin Football Club",
  sourceUserId: "user_coach_b_001",
  sourceUserName: "Patrick Kelly",
  sourceUserEmail: "coach.dublin@example.com",
  targetOrgId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  targetOrgName: "Cork Youth GAA",
  subject: "Request training calendar",
  message: "Could you share your training calendar for planning?",
  contactPreference: "email",
  status: "closed",
  closedAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
  closedBy: "user_coach_a_001",
  closedByName: "Sean O'Brien",
  resolution: "Shared Google Calendar link via email",
  createdAt: Date.now() - (14 * 24 * 60 * 60 * 1000)
}
```

---

## Complete Seed Data Counts

| Table | Minimum Records | Full Coverage |
|-------|-----------------|---------------|
| `organization` (Better Auth) | 2 | 2 |
| `user` (Better Auth) | 4 | 6 |
| `member` (Better Auth) | 5 | 8 |
| `playerIdentities` | 1 | 3 |
| `guardianIdentities` | 1 | 3 |
| `guardianPlayerLinks` | 1 | 4 |
| `orgPlayerEnrollments` | 2 | 6 |
| `sportPassports` | 2 | 6 |
| `skillAssessments` | 10 | 30 |
| `passportGoals` | 0 | 4 |
| `team` | 2 | 4 |
| `teamPlayerIdentities` | 2 | 6 |
| `coachAssignments` | 2 | 4 |
| `passportShareConsents` | 1 | 5 |
| `passportShareRequests` | 0 | 2 |
| `passportShareAccessLogs` | 0 | 5 |
| `passportEnquiries` | 0 | 2 |
| `parentNotificationPreferences` | 0 | 2 |
| `sports` | 1 | 2 |
| `skillCategories` | 5 | 10 |
| `skillDefinitions` | 10 | 30 |

---

## Test Execution Order

### Phase 1: Backend Validation (No UI)
1. Verify schema tables exist
2. Test consent gateway authorization
3. Test access logging
4. Test notification helpers

### Phase 2: Parent Flows
1. Create consent via wizard
2. Update consent
3. Revoke consent
4. View audit log
5. Respond to coach request

### Phase 3: Coach Flows
1. Accept pending share
2. Decline pending share
3. View shared passport
4. Request access to player
5. View comparison insights

### Phase 4: Admin Flows
1. Configure sharing contact
2. View sharing statistics
3. Manage enquiry queue

### Phase 5: Edge Cases
1. Expired consent access denied
2. Multi-guardian notifications
3. 14-day renewal reminder
4. Cross-sport comparison notice

---

**Document Version**: 1.1
**Last Updated**: January 19, 2026
**PRD Reference**: `scripts/ralph/prds/passport-sharing-phase-1.json`
