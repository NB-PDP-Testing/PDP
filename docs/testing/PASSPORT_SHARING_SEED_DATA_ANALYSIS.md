# Passport Sharing Feature - Seed Data Analysis & Recommendations

**Date**: January 19, 2026
**Purpose**: Comprehensive analysis of data requirements for testing the Coach Passport Comparison feature

---

## Executive Summary

After comprehensive analysis of the Convex schema, backend models, and frontend components, I've identified the complete data flow required to test the passport sharing and comparison features. **The critical finding is that all existing test accounts are in the SAME organization**, which makes cross-organization passport sharing impossible to test.

---

## Current Test Account Status

| Email | Roles | Organization ID |
|-------|-------|-----------------|
| `neil.b@blablablak.com` | Coach, Parent | `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7` |
| `neiltest2@skfjkadsfdgsjdgsj.com` | Admin, Coach | `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7` |
| `neiltest3@skfjkadsfdgsjdgsj.com` | Parent | `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7` |
| `neiltesting@example.com` | Admin, Coach, Parent | `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7` |

**Problem**: All accounts are in the SAME organization. Passport sharing is a **cross-organization** feature.

---

## Feature Data Flow

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PASSPORT SHARING DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   ORG A       │     │   PLAYER      │     │   ORG B       │
│  (Source)     │     │   IDENTITY    │     │  (Receiving)  │
│               │     │  (Platform)   │     │               │
│ • Cork GAA    │     │ • Cian Murphy │     │ • Dublin FC   │
│ • Coaches     │     │ • DOB, gender │     │ • Coaches     │
│ • Teams       │     │               │     │ • Teams       │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        │    ┌────────────────┴────────────────┐    │
        │    │                                 │    │
        ▼    ▼                                 ▼    ▼
┌─────────────────┐                   ┌─────────────────┐
│ ORG ENROLLMENT  │                   │ ORG ENROLLMENT  │
│     (Org A)     │                   │     (Org B)     │
│                 │                   │                 │
│ • sport: GAA    │                   │ • sport: GAA    │
│ • ageGroup: U12 │                   │ • ageGroup: U12 │
│ • status: active│                   │ • status: active│
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│ SPORT PASSPORT  │                   │ SPORT PASSPORT  │
│     (Org A)     │                   │     (Org B)     │
│                 │                   │                 │
│ • sportCode:GAA │                   │ • sportCode:GAA │
│ • status:active │                   │ • status:active │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│SKILL ASSESSMENTS│                   │SKILL ASSESSMENTS│
│     (Org A)     │                   │     (Org B)     │
│                 │                   │                 │
│ • passing: 4.2  │                   │ • passing: 3.8  │
│ • shooting: 3.5 │                   │ • shooting: 4.0 │
│ • tackling: 4.0 │                   │ • tackling: 3.7 │
└─────────────────┘                   └─────────────────┘

                         │
       ┌─────────────────┴─────────────────┐
       │           GUARDIAN                 │
       │        IDENTITY                    │
       │                                    │
       │ • userId (linked to parent user)   │
       │ • firstName, lastName              │
       │ • email, phone                     │
       └─────────────────┬─────────────────┘
                         │
                         ▼
       ┌─────────────────────────────────────┐
       │        GUARDIAN-PLAYER LINK         │
       │                                     │
       │ • hasParentalResponsibility: true   │
       │ • isPrimary: true                   │
       │ • relationship: "parent"            │
       └─────────────────┬───────────────────┘
                         │
                         │ Parent grants consent
                         ▼
       ┌─────────────────────────────────────────────────────────┐
       │              PASSPORT SHARE CONSENT                      │
       │                                                          │
       │ • playerIdentityId: [player]                            │
       │ • grantedBy: [guardian's userId]                        │
       │ • guardianIdentityId: [guardian]                        │
       │ • receivingOrgId: [Org B's ID]  ◄─── CRITICAL           │
       │ • sourceOrgMode: "all_enrolled" | "specific_orgs"       │
       │ • sourceOrgIds: [Org A's ID]  ◄─── CRITICAL             │
       │ • sharedElements: { skillRatings: true, ... }           │
       │ • status: "active"                                      │
       │ • coachAcceptanceStatus: "pending" → "accepted"         │
       │ • expiresAt: [future timestamp]                         │
       └─────────────────────────────────────────────────────────┘
                         │
                         │ Coach at Org B accepts
                         ▼
       ┌─────────────────────────────────────────────────────────┐
       │              COACH AT ORG B CAN NOW:                     │
       │                                                          │
       │ 1. View shared passport data from Org A                 │
       │ 2. Compare with their own assessments at Org B          │
       │ 3. See insights, divergences, recommendations           │
       └─────────────────────────────────────────────────────────┘
```

---

## Required Tables and Relationships

### 1. Better Auth Tables (via betterAuth component)

| Table | Required Records | Purpose |
|-------|------------------|---------|
| `user` | 2+ users | Parent account, Coach accounts |
| `organization` | **2 organizations** | Source org (Org A) + Receiving org (Org B) |
| `member` | Multiple | Users as members of organizations |

### 2. Platform-Level Identity Tables

| Table | Required Records | Purpose |
|-------|------------------|---------|
| `playerIdentities` | 1+ | Platform-level player record |
| `guardianIdentities` | 1+ | Platform-level guardian record (linked to parent user) |
| `guardianPlayerLinks` | 1+ | Links guardian to player with `hasParentalResponsibility: true` |

### 3. Organization-Scoped Tables

| Table | Required Records | Purpose |
|-------|------------------|---------|
| `orgPlayerEnrollments` | 2 per player | Player enrolled at BOTH Org A and Org B |
| `sportPassports` | 2 per player | Sport passport at each org |
| `skillAssessments` | Multiple | Skill ratings from both orgs (for comparison) |
| `coachAssignments` | At least 1 | Coach assigned to team(s) at Org B |
| `team` | 1+ per org | Teams for player enrollment |
| `teamPlayerIdentities` | 1+ | Player assigned to team(s) |

### 4. Passport Sharing Tables

| Table | Required Records | Purpose |
|-------|------------------|---------|
| `passportShareConsents` | 1 | Active consent with `coachAcceptanceStatus: "accepted"` |

### 5. Supporting Tables

| Table | Required Records | Purpose |
|-------|------------------|---------|
| `skillCategories` | GAA skill categories | Organize skills |
| `skillDefinitions` | GAA skills | Skill codes/names for assessments |

---

## Seed Data Recommendations

### CRITICAL: Need a Second Organization

The most critical requirement is **creating a second organization**. Without this, passport sharing cannot be tested.

### Recommended Test Scenario

**Scenario**: Player "Cian Murphy" plays GAA at both "Cork Youth GAA" (Org A) and "Dublin Football Club" (Org B). His parent shares his Cork GAA passport data with Dublin FC so the Dublin coach can compare assessments.

### Required Seed Data

#### 1. Second Organization (via Better Auth)
```javascript
// Organization B - Receiving Organization
{
  id: "org_dublin_fc_test",  // Or auto-generated ID
  name: "Dublin Football Club",
  slug: "dublin-fc-test",
  metadata: {
    sport: "gaa"
  }
}
```

#### 2. Player Identity (Platform-Level)
```javascript
// playerIdentities table
{
  _id: "player_cian_murphy",  // Convex will generate
  firstName: "Cian",
  lastName: "Murphy",
  dateOfBirth: "2014-03-15",
  gender: "male",
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### 3. Guardian Identity (Platform-Level)
```javascript
// guardianIdentities table
{
  _id: "guardian_mary_murphy",
  userId: "[neil.b@blablablak.com's user ID]",  // Link to parent user
  firstName: "Mary",
  lastName: "Murphy",
  email: "neil.b@blablablak.com",
  phone: "+353861234567",
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### 4. Guardian-Player Link
```javascript
// guardianPlayerLinks table
{
  guardianIdentityId: "[guardian ID from above]",
  playerIdentityId: "[player ID from above]",
  relationship: "mother",
  hasParentalResponsibility: true,
  isPrimary: true,
  createdAt: Date.now()
}
```

#### 5. Player Enrollments at BOTH Organizations
```javascript
// Enrollment at Org A (Cork GAA - existing org)
{
  playerIdentityId: "[player ID]",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",  // Existing org
  sport: "gaa",
  ageGroup: "u12",
  status: "active",
  enrolledAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now()
}

// Enrollment at Org B (Dublin FC)
{
  playerIdentityId: "[player ID]",
  organizationId: "org_dublin_fc_test",  // New org
  sport: "gaa",
  ageGroup: "u12",
  status: "active",
  enrolledAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### 6. Sport Passports at BOTH Organizations
```javascript
// Passport at Org A
{
  playerIdentityId: "[player ID]",
  organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
  sportCode: "gaa",
  status: "active",
  createdAt: Date.now()
}

// Passport at Org B
{
  playerIdentityId: "[player ID]",
  organizationId: "org_dublin_fc_test",
  sportCode: "gaa",
  status: "active",
  createdAt: Date.now()
}
```

#### 7. Skill Assessments (Different Ratings to Create Divergences)
```javascript
// Assessments at Org A (Cork GAA)
const orgAAssessments = [
  { skillCode: "gaa_hand_pass", rating: 4.2 },
  { skillCode: "gaa_kick_pass", rating: 3.8 },
  { skillCode: "gaa_solo", rating: 4.0 },
  { skillCode: "gaa_tackle", rating: 3.5 },
  { skillCode: "gaa_catch", rating: 4.5 },
];

// Assessments at Org B (Dublin FC) - DIFFERENT to show divergences
const orgBAssessments = [
  { skillCode: "gaa_hand_pass", rating: 4.0 },  // Close agreement
  { skillCode: "gaa_kick_pass", rating: 2.5 },  // Divergence!
  { skillCode: "gaa_solo", rating: 3.9 },       // Close agreement
  { skillCode: "gaa_tackle", rating: 4.5 },     // Divergence (opposite direction)
  { skillCode: "gaa_shooting", rating: 3.5 },   // Only at Org B (blind spot)
];
```

#### 8. Coach Assignment at Receiving Org (Dublin FC)
```javascript
// coachAssignments table
{
  userId: "[neiltest2's user ID]",  // Or another user who is coach at Org B
  organizationId: "org_dublin_fc_test",
  teams: ["[team ID at Org B]"],
  isPrimaryCoach: true,
  createdAt: Date.now()
}
```

#### 9. Team Player Identity Link
```javascript
// teamPlayerIdentities table
{
  playerIdentityId: "[player ID]",
  teamId: "[team ID at Org B]",
  organizationId: "org_dublin_fc_test",
  status: "active",
  joinedAt: Date.now()
}
```

#### 10. Passport Share Consent (The Key Record)
```javascript
// passportShareConsents table
{
  playerIdentityId: "[player ID]",
  grantedBy: "[guardian's userId]",
  grantedByType: "guardian",
  guardianIdentityId: "[guardian ID]",
  initiationType: "parent_initiated",

  // SOURCE: Where data comes FROM
  sourceOrgMode: "specific_orgs",
  sourceOrgIds: ["jh7f6k14jw7j4sj9rr9dfzekr97xm9j7"],  // Cork GAA

  // RECEIVING: Who can VIEW the data
  receivingOrgId: "org_dublin_fc_test",  // Dublin FC

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
  coachAcceptanceStatus: "accepted",  // Coach has accepted!
  acceptedByCoachId: "[coach's userId at Dublin FC]",
  acceptedAt: Date.now(),

  // Dates
  consentedAt: Date.now(),
  expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),  // 1 year from now
  renewalReminderSent: false,
  renewalCount: 0,

  consentVersion: "1.0"
}
```

---

## Alternative: Using Existing Organization

If creating a second organization is complex, you could:

1. **Use the existing organization as BOTH source and receiving**
   - This won't work properly - the code is designed for cross-org sharing

2. **Create test data directly in the database**
   - Use the Convex Dashboard to insert records manually
   - Faster for testing, but not production-realistic

---

## Seed Script Approach

For a proper seed script, you would need to:

1. **Create second organization via Better Auth API**
   ```typescript
   // This requires server-side Better Auth admin API
   // Or use the Convex dashboard to create via betterAuth component
   ```

2. **Add user as member of second organization**
   ```typescript
   // Add one of the test users as coach at Org B
   ```

3. **Create remaining records via Convex mutations**
   ```typescript
   // Use Convex dashboard or create a seed function
   ```

---

## Testing Checklist

After seeding data, verify:

- [ ] Player exists in `playerIdentities`
- [ ] Guardian exists in `guardianIdentities` with `userId` linked to parent user
- [ ] Guardian-Player link exists with `hasParentalResponsibility: true`
- [ ] Player enrolled at BOTH organizations
- [ ] Sport passports exist at BOTH organizations
- [ ] Skill assessments exist at BOTH organizations (with different ratings)
- [ ] Team exists at receiving organization (Org B)
- [ ] Coach assignment exists linking coach to team at Org B
- [ ] TeamPlayerIdentity links player to team at Org B
- [ ] Consent record exists with:
  - `status: "active"`
  - `coachAcceptanceStatus: "accepted"`
  - `receivingOrgId` pointing to Org B
  - `sourceOrgIds` including Org A
  - `sharedElements.skillRatings: true`
  - `expiresAt` in the future

---

## Summary

**To test the passport comparison feature, you MUST have:**

1. **Two different organizations** (currently you only have one)
2. **A player enrolled at BOTH organizations**
3. **Skill assessments at BOTH organizations** (with varying ratings to see divergences)
4. **An active consent record** with `coachAcceptanceStatus: "accepted"`
5. **Coach assignment** at the receiving organization

The seed data above provides a complete working scenario. The most critical step is **creating a second organization**, which requires either:
- Using Better Auth admin APIs
- Using the Convex Dashboard to insert directly into the betterAuth component tables
- Creating a seed script with server-side auth access

---

## Files Analyzed

| File | Lines | Purpose |
|------|-------|---------|
| `packages/backend/convex/schema.ts` | 2384 | Full database schema |
| `packages/backend/convex/models/passportSharing.ts` | ~3400 | Sharing queries/mutations |
| `packages/backend/convex/models/passportComparison.ts` | 754 | Comparison logic |
| `apps/web/.../shared-passports-view.tsx` | 395 | Hub UI component |
| `apps/web/.../compare/page.tsx` | 47 | Comparison page |
| `apps/web/.../compare/comparison-view.tsx` | 201 | Comparison view component |
