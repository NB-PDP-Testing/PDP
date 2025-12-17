# Player Passport Architecture: Multi-Sport, Scalable, Knowledge Graph-Ready

## Executive Summary

This document defines a modular, scalable architecture for the Player Passport system that:
1. **Supports multiple sports** with sport-specific skills, benchmarks, and positions
2. **Enables cross-organization player identity** without duplicating player records
3. **Aligns with national governing body (NGB) frameworks** (FAI, IRFU, GAA)
4. **Implements Long-Term Athlete Development (LTAD)** best practices
5. **Prepares for knowledge graph augmentation** for insights and pattern recognition
6. **Powers the Parent Dashboard** with unified views across sports and organizations
7. **Maintains backward compatibility** with existing data structures
8. **Scales efficiently** as organizations and sports grow

---

## 1. Research Findings & Industry Best Practices

### 1.1 Long-Term Athlete Development (LTAD) Framework

The internationally recognized LTAD model provides the foundation for age-appropriate player development:

| Stage | Ages | Focus | Training Ratio |
|-------|------|-------|----------------|
| **Active Start** | 0-6 | Fun, basic movement | 100% play |
| **FUNdamentals** | 6-9 | ABC's (Agility, Balance, Coordination) | 80% play, 20% structure |
| **Learn to Train** | 8-12 | Sport-specific skill introduction | 70% training, 30% competition |
| **Train to Train** | 11-16 | Aerobic base, sport skills | 60% training, 40% competition |
| **Train to Compete** | 15-21 | Competition preparation | 40% training, 60% competition |
| **Train to Win** | 18+ | Elite performance | Competition focused |

**Key Principle**: Windows of trainability - certain physical and skill qualities are best developed at specific ages.

### 1.2 Irish NGB Frameworks

#### FAI (Football Association of Ireland) - Soccer
- **Framework**: FAI Player Development Plan with Football Pathways Plan
- **Phases**: FUNdamental → Youth Development → High Performance
- **Key Focus**: Technical skills before tactical, small-sided games (4v4 to 11v11 progression)
- **Age Groups**: U6, U7, U8, U9, U10, U11, U12, U13, U14, U15, U16, U17, U18, U19, Senior

Sources: [FAI Football Pathways Plan](https://www.fai.ie/play-and-participate/football-pathways-plan/), [FAI Player Development Plan](https://www.stfrancisfc1958.ie/images/coaching/FAI_Player_Development_Plan.pdf)

#### IRFU (Irish Rugby Football Union) - Rugby
- **Framework**: Long-Term Player Development (LTPD) with 6 phases
- **Five Capacities**: Technical, Tactical, Physical, Mental, Lifestyle
- **Key Principle**: No positional specialization before age 14
- **Age Groups**: Leprechaun (non-contact), Mini Rugby, U13-U19, Adult

Sources: [IRFU Long Term Player Development](https://www.irishrugby.ie/2007/06/14/long-term-player-development/), [IRFU Youth Rugby](https://www.irishrugby.ie/playing-the-game/age-grade/youth-rugby/)

#### GAA (Gaelic Athletic Association) - GAA Football & Hurling
- **Framework**: Gaelic Games Player Pathway (based on FTEM model)
- **Stages**: F1 (Fundamental 4-11) → F2 (Extension 7-11) → F3 (Youth 12-17) → T1-T4 (Talent) → Elite
- **Key Programs**: Go Games, FUNdamentals, ABC Nursery Programme
- **Dual Sport**: Many players play both Football and Hurling

Sources: [GAA Player Pathway](https://learning.gaa.ie/playerpathway), [GAA Skill Acquisition](https://www.gaa.ie/article/skill-acquisition-key-to-unlocking-a-young-player-s-potential)

### 1.3 Skills Taxonomy Best Practices

From industry research on skills classification:

1. **Hierarchical Structure**: Skills → Categories → Domains
2. **Proficiency Levels**: Clear descriptors for each level (1-5 scale)
3. **Skill Relationships**: Prerequisites, related skills, transferable skills
4. **Context Awareness**: Open vs Closed skills, Gross vs Fine motor skills
5. **Non-Linear Development**: Acknowledge individual variation in progression

Sources: [Skills Taxonomy Guide](https://365talents.com/en/resources/your-comprehensive-guide-to-skills-taxonomy/), [Sports Skill Classification](https://sportscienceinsider.com/skill-classification-continuums/)

### 1.4 Knowledge Graph Architecture

From research on sports analytics and knowledge graphs:

1. **Entity Types**: Player, Skill, Sport, Team, Coach, Assessment, Benchmark
2. **Relationship Types**: HAS_SKILL, PLAYS_FOR, COACHED_BY, PREREQUISITE_FOR, TRANSFERS_TO
3. **Triple Structure**: `<entity, relation, entity>` with attributes
4. **Benefits**: Pattern recognition, rising star identification, performance prediction

Sources: [Graph Databases for Pro Sports](https://graphable.ai/blog/graph-databases-for-pro-sports/), [Sports Big Data Knowledge Graphs](https://www.hindawi.com/journals/complexity/2021/6676297/)

### 1.5 Assessment Best Practices

From sports psychology and performance assessment research:

1. **Multi-Source Assessment**: Coach, self, parent, peer evaluations
2. **Temporal Tracking**: Point-in-time assessments, not just current state
3. **Context Capture**: Assessment type (training, match, formal review)
4. **Benchmark Comparison**: Compare to age/gender/level norms
5. **Developmental Sensitivity**: Age-appropriate expectations

Sources: [Assessment in Youth Sport Best Practices](https://pmc.ncbi.nlm.nih.gov/articles/PMC3919511/), [Sports School Data Model](https://vertabelo.com/blog/a-sports-school-data-model/)

---

## 2. Current State Analysis

### 2.1 MVP App Analysis

The MVP (`/mvp-app`) implements a comprehensive player passport with:

**Strengths:**
- Three sport-specific skill sets (GAA: 17, Soccer: 29, Rugby: 42 skills)
- Well-organized skill categories per sport
- 1-5 rating scale with clear labels
- PDF generation with sport-specific skill selection
- Multi-sport athlete support (same player, multiple passports)
- Family linking via email and familyId
- Rich parent/guardian data structure

**Skill Categories by Sport:**

| Sport | Categories | Total Skills |
|-------|-----------|--------------|
| GAA Football | Ball Mastery, Catching, Free Taking, Tactical, Laterality, Defensive | 17 |
| Soccer | Ball Mastery, Passing/Distribution, Shooting/Finishing, Tactical, Physical, Character/Team | 29 |
| Rugby | Passing/Handling, Catching/Receiving, Running/Ball Carry, Kicking, Contact/Breakdown, Tactical/Game Awareness | 42 |

**Limitations:**
- Skills stored as JSON string (not queryable)
- No temporal tracking (only current state)
- No benchmark data
- No skill relationships/prerequisites
- Single sport per player record (multi-sport = multiple records)

### 2.2 Current Main App Analysis

The main app (`/apps/web` + `/packages/backend`) has:

**Implemented:**
- Player CRUD with organization scoping
- `skills` as `Record<string, number>` (improvement over JSON string)
- Team-player junction table (`teamPlayers`)
- Smart parent matching with confidence scoring
- Development goals table (structured, separate from MVP `actions` field)
- Injuries table with return-to-play protocol
- Medical profiles table
- Coach assignments

**Schema Fields (from `schema.ts`):**
```typescript
players: {
  // Core identity
  name, ageGroup, sport, gender, organizationId, season,

  // Skills (flat record)
  skills: Record<string, number>,

  // Positions & Fitness
  positions: { favourite, leastFavourite, coachesPref, dominantSide, goalkeeper },
  fitness: { pushPull, core, endurance, speed, broncoBeep },

  // Attendance
  attendance: { training, matches },

  // Review tracking
  reviewedWith, reviewStatus, lastReviewDate, nextReviewDue,

  // Notes
  coachNotes, parentNotes, playerNotes, injuryNotes, actions,

  // Parent/Family linking
  parents[], parentEmail, familyId, inferredParent*
}
```

**Gaps:**
- Single `sport` field (no multi-sport)
- Flat skills (no categories, history, or context)
- No benchmark integration
- No skill definitions/taxonomy
- Limited graph-ready structure
- **Players are org-scoped** - same child at two clubs = two unlinked records
- **No cross-org visibility** for parents with children at multiple clubs

---

## 3. Platform-Level Identity Architecture

### 3.1 The Multi-Org Problem

**Current State:**
- Players are **org-scoped** (`organizationId: v.string()`)
- If a child plays GAA at Club A and Soccer at Club B, they exist as **two separate player records**
- No linkage between the two records
- Parent info, DOB, address all duplicated in each player record
- Parent can't see unified view of their child across clubs
- **Same problem exists for parents/guardians**: contact info duplicated across clubs and player records

**Churn Scenarios Without Solution:**
1. Admin at Club B manually re-enters child already at Club A
2. Parent sees fragmented view - must switch orgs to see different children
3. Cross-sport insights impossible (e.g., "Clodagh's agility transfers from GAA to Soccer")
4. Parent updates phone number at Club A → Club B still has old number
5. Guardian relationship data ("Mary is Clodagh's mother") stored redundantly everywhere

### 3.2 Design Decision: Platform-Level vs Organization-Level Identities

The fundamental question: **Where should identity live?**

| Entity | Should Be | Rationale |
|--------|-----------|-----------|
| **Player (child)** | Platform-level | "Clodagh Barlow born 2013-05-15" is a fact independent of any club |
| **Guardian (parent)** | Platform-level | "Mary Barlow, mary@example.com" is a fact independent of any club |
| **Guardian-Player relationship** | Platform-level | "Mary is Clodagh's mother" is a fact, not club-specific |
| **Club membership** | Organization-level | "Clodagh plays at St. Francis FC" is club-specific |
| **Skill assessments** | Organization-level | "Coach John rated Clodagh's passing as 4/5" belongs to the assessing club |
| **Communication preferences** | Organization-level | "Email Mary for match updates" is club-specific |

### 3.3 Alternative Approaches Considered

#### Approach A: Organization-Scoped Everything (Current State)

```
Organization
└── Players (with embedded parent data)
    └── Skills, Notes, etc.
```

**Pros:**
- Simple mental model
- Complete data isolation between clubs
- No cross-org privacy concerns
- Easy to implement

**Cons:**
- Data duplication (same child = multiple records)
- No cross-org visibility for parents
- Admin re-entry burden
- Contact info gets stale
- Can't do cross-sport analysis

**Verdict:** ❌ Doesn't scale for multi-club families (very common in Ireland)

---

#### Approach B: Embedded Guardian Array in Player Identity

```
Platform Level:
  playerIdentities
    └── guardians: [{email, phone, relationship}]  // Embedded array

Organization Level:
  orgPlayerEnrollments
  sportPassports
```

**Pros:**
- Simpler than full normalization
- Player and guardians travel together
- Single query gets player + guardians

**Cons:**
- Guardian data duplicated if they have multiple children
- Updates to guardian info require updating all their children's records
- Can't have guardian-specific platform preferences
- Can't track guardian verification independently
- Guardian without registered children can't exist in system

**Verdict:** ❌ Creates data consistency issues at scale

---

#### Approach C: Platform-Level Identity for Both (Recommended) ✅

```
Platform Level (Cross-Org):
  guardianIdentities (parents/guardians as first-class entities)
  playerIdentities (children as first-class entities)
  guardianPlayerLinks (N:M relationships)

Organization Level (Per-Club):
  orgGuardianProfiles (club-specific preferences)
  orgPlayerEnrollments (club membership)
  sportPassports (skill tracking)
```

**Pros:**
- Single source of truth for identity data
- Update once, reflects everywhere
- Guardians are first-class entities (can exist without children in system)
- Clean N:M relationship between guardians and players
- Proper normalization - no data duplication
- Cross-org visibility with consent controls
- GDPR-friendly (centralized data management)
- Unregistered guardians can be tracked (from imports)
- Easy to merge duplicates

**Cons:**
- More complex data model
- More tables to manage
- Queries require joins across tables
- Must carefully manage cross-org privacy
- Identity matching logic needed

**Verdict:** ✅ Best long-term architecture for multi-club platform

---

#### Approach D: Federated Identity (External Provider)

```
External Identity Provider (Auth0, Okta, etc.)
  └── User profiles with family relationships

Platform:
  └── References to external IDs
```

**Pros:**
- Identity management handled by specialists
- SSO across multiple platforms
- Industry-standard security

**Cons:**
- Vendor dependency and cost
- Can't track unregistered guardians (from imports)
- Complex integration
- Overkill for sports club platform
- Less control over data model

**Verdict:** ❌ Unnecessary complexity, doesn't solve import use case

### 3.4 Recommended Architecture: Platform-Level Identity Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM LEVEL (Cross-Org)                               │
│                         No organizationId - these are facts                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐              ┌─────────────────────────┐          │
│   │   guardianIdentities    │◄────────────►│    playerIdentities     │          │
│   │   (parents/guardians)   │    N:M       │    (children/athletes)  │          │
│   │                         │    link      │                         │          │
│   │ • firstName, lastName   │              │ • firstName, lastName   │          │
│   │ • email, phone          │              │ • dateOfBirth, gender   │          │
│   │ • address               │              │ • verificationStatus    │          │
│   │ • userId (if registered)│              │                         │          │
│   └───────────┬─────────────┘              └────────────┬────────────┘          │
│               │                                         │                        │
│               │         ┌───────────────────┐           │                        │
│               └────────►│guardianPlayerLinks│◄──────────┘                        │
│                         │                   │                                    │
│                         │ • relationship    │                                    │
│                         │ • isPrimary       │                                    │
│                         │ • consentSharing  │                                    │
│                         └───────────────────┘                                    │
│                                                                                  │
│   ┌─────────────────────────┐                                                   │
│   │     Better Auth         │  userId in guardianIdentities links to this       │
│   │     user table          │  (only for registered/logged-in guardians)        │
│   └─────────────────────────┘                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Referenced by (via IDs)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       ORGANIZATION LEVEL (Per-Club)                              │
│                       Has organizationId - club-specific data                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐              ┌─────────────────────────┐          │
│   │  orgGuardianProfiles    │              │  orgPlayerEnrollments   │          │
│   │  (club prefs for parent)│              │  (club membership)      │          │
│   │                         │              │                         │          │
│   │ • guardianIdentityId    │              │ • playerIdentityId      │          │
│   │ • organizationId        │              │ • organizationId        │          │
│   │ • emergencyPriority     │              │ • ageGroup, season      │          │
│   │ • communicationPrefs    │              │ • status                │          │
│   │ • clubNotes             │              │ • clubMembershipNumber  │          │
│   └─────────────────────────┘              └───────────┬─────────────┘          │
│                                                        │                         │
│                                                        │ 1:many                  │
│                                                        ▼                         │
│                                            ┌─────────────────────────┐          │
│                                            │    sportPassports       │          │
│                                            │    (per-sport skills)   │          │
│                                            │                         │          │
│                                            │ • enrollmentId          │          │
│                                            │ • sportCode             │          │
│                                            │ • positions, ratings    │          │
│                                            └───────────┬─────────────┘          │
│                                                        │                         │
│                                                        │ 1:many                  │
│                                                        ▼                         │
│                                            ┌─────────────────────────┐          │
│                                            │   skillAssessments      │          │
│                                            │   (temporal records)    │          │
│                                            └─────────────────────────┘          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Key Insight: Guardian ≠ Better Auth User

A critical design insight: **Guardian identity can exist without a registered user account**.

```
Scenario: Club imports GAA membership CSV with parent contact info

1. Import creates playerIdentity for each child
2. Import creates guardianIdentity for each parent (from email/phone in CSV)
3. guardianPlayerLinks created to connect them
4. Guardian has NO userId yet (not registered)

Later: Parent registers on platform

5. Parent signs up with same email
6. System: "We found your profile from Club A. Is this you?"
7. Parent confirms → userId linked to existing guardianIdentity
8. Parent now has full dashboard access to their children
```

**Why this matters:**
- Clubs can import membership data before parents register
- Guardian contact info is available for emergencies
- When parent registers, they "claim" their existing identity
- No data loss or re-entry required

### 3.6 Pros and Cons Summary

#### Pros of Platform-Level Identity Model

| Benefit | Description |
|---------|-------------|
| **Single Source of Truth** | Guardian contact info updated once, reflects everywhere |
| **No Data Duplication** | "Mary is Clodagh's mother" stored once, not per-club |
| **Cross-Org Visibility** | Parent dashboard can show children across all clubs |
| **Import-Friendly** | Can create identities from CSV before users register |
| **GDPR Compliant** | Centralized data easier to export/delete on request |
| **Future-Proof** | Supports knowledge graph, analytics, insights |
| **Clean Relationships** | Proper N:M modeling (guardian with 3 kids, child with 2 guardians) |
| **Merge Capability** | Can merge duplicate identities discovered later |

#### Cons and Mitigations

| Challenge | Mitigation |
|-----------|------------|
| **More Complex Queries** | Create well-designed query functions that abstract joins |
| **Cross-Org Privacy Risk** | Consent flags on guardianPlayerLinks; org can only see own enrollments |
| **Identity Matching Errors** | Conservative matching (require email + name + DOB); admin review for uncertain matches |
| **More Tables to Manage** | Clear naming conventions; comprehensive documentation |
| **Migration Complexity** | Clean slate option (delete test data); or simple one-time migration script |

### 3.7 Data Ownership and Privacy Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA OWNERSHIP MATRIX                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Platform Owns (cross-org):                                     │
│  ├── guardianIdentities.* (name, email, phone, address)         │
│  ├── playerIdentities.* (name, DOB, gender)                     │
│  └── guardianPlayerLinks.* (relationships)                      │
│                                                                  │
│  Organization Owns (per-club):                                  │
│  ├── orgPlayerEnrollments.* (membership, age group)             │
│  ├── orgGuardianProfiles.* (communication prefs, notes)         │
│  ├── sportPassports.* (positions, sport-specific data)          │
│  └── skillAssessments.* (ratings, coach notes)                  │
│                                                                  │
│  Guardian Controls:                                              │
│  ├── guardianPlayerLinks.consentedToSharing                     │
│  │   └── If false: other orgs can't see this guardian-player    │
│  │       relationship exists                                     │
│  └── Own profile data (can request update/deletion)             │
│                                                                  │
│  Cross-Org Visibility Rules:                                    │
│  ├── Club A CANNOT see Club B's assessments                     │
│  ├── Club A CANNOT see Club B's enrollment details              │
│  ├── Club A CAN see "player exists" IF guardian consented       │
│  └── Parent CAN see all their children across all clubs         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.8 How This Minimizes Admin Churn

#### Scenario 1: Child Already Exists at Another Club

**Without Platform Identity (painful):**
1. Admin manually enters all player data again
2. No knowledge child exists elsewhere
3. Duplicate records, no linkage

**With Platform Identity (smooth):**
1. Admin starts adding player → enters name + DOB + guardian email
2. System checks `playerIdentities` AND `guardianIdentities` for match
3. If match found: "This player may already exist. Link to existing identity?"
4. If linked: Auto-populates all identity data, admin just adds org-specific info
5. If no match: Creates new player + guardian identities

#### Scenario 2: Child Joins Second Sport at Same Club

1. Admin sees existing player in roster
2. Clicks "Add Sport" → selects sport (Soccer, GAA, Rugby)
3. Creates new `sportPassport` linked to same enrollment
4. Each sport has independent skill tracking

#### Scenario 3: Parent Joins New Club

1. Parent registers with email mary@example.com
2. System finds existing `guardianIdentity` (from Club A import)
3. "Welcome Mary! We found your profile. Is this you?"
4. Parent confirms → `userId` linked to existing identity
5. System shows: "You have 2 children: Clodagh (at Club A), Sean (at Club A)"
6. "Would you like to enroll them at this club?"

#### Scenario 4: Guardian Updates Contact Info

**Without Platform Identity:**
- Must update at each club separately
- Must update each child's record separately
- Info gets stale, inconsistent

**With Platform Identity:**
1. Guardian updates phone in their profile
2. Single update to `guardianIdentities` table
3. All clubs automatically see new phone number
4. No per-child, per-club updates needed

### 3.9 Platform Identity Schema Design

#### `guardianIdentities` - Platform-Level Guardian/Parent

```typescript
guardianIdentities: defineTable({
  // Core identity
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),

  // Link to Better Auth user (when registered)
  userId: v.optional(v.string()),

  // Address (shared across all relationships)
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),

  // Verification
  verificationStatus: v.union(
    v.literal("unverified"),        // From import, not yet verified
    v.literal("email_verified"),    // Email confirmed
    v.literal("id_verified")        // Official ID checked
  ),
  verifiedAt: v.optional(v.string()),
  verifiedBy: v.optional(v.string()),

  // Platform preferences
  preferredContactMethod: v.optional(v.union(
    v.literal("email"),
    v.literal("phone"),
    v.literal("both")
  )),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  createdByOrgId: v.optional(v.string()), // Which org first created this
  mergedFrom: v.optional(v.array(v.id("guardianIdentities"))),
})
  .index("by_email", ["email"])
  .index("by_userId", ["userId"])
  .index("by_phone", ["phone"])
  .index("by_verification", ["verificationStatus"])
  .searchIndex("name_search", { searchField: "firstName" })
```

#### `playerIdentities` - Platform-Level Player (Youth OR Adult)

The `playerIdentities` table supports both youth players (managed by guardians) and adult players (self-managed).

```typescript
playerIdentities: defineTable({
  // Core identity
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),           // ISO date
  gender: v.union(
    v.literal("male"),
    v.literal("female"),
    v.literal("other")
  ),

  // Player type - determines management mode
  playerType: v.union(
    v.literal("youth"),              // Managed by guardians
    v.literal("adult")               // Self-managed
  ),

  // Self-management link (for adult players)
  // If set, this player manages their own profile
  userId: v.optional(v.string()),    // Better Auth user ID (adults only)

  // Contact info (for adult players - youth use guardian contact)
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),

  // Verification
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("guardian_verified"),  // Guardian confirmed (youth)
    v.literal("self_verified"),      // Adult self-verified via email
    v.literal("document_verified")   // ID document checked
  ),
  verifiedAt: v.optional(v.string()),
  verifiedBy: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  createdByOrgId: v.optional(v.string()),
  mergedFrom: v.optional(v.array(v.id("playerIdentities"))),
})
  .index("by_name_dob", ["firstName", "lastName", "dateOfBirth"])
  .index("by_userId", ["userId"])        // For adult self-lookup
  .index("by_email", ["email"])          // For adult matching
  .index("by_playerType", ["playerType"])
  .index("by_verification", ["verificationStatus"])
  .searchIndex("name_search", { searchField: "firstName" })
```

#### `guardianPlayerLinks` - N:M Relationship Table

```typescript
guardianPlayerLinks: defineTable({
  guardianIdentityId: v.id("guardianIdentities"),
  playerIdentityId: v.id("playerIdentities"),

  // Relationship details
  relationship: v.string(),          // "mother", "father", "guardian", "grandparent", "step-parent"
  isPrimary: v.boolean(),            // Primary contact for this child

  // Cross-org consent (guardian controls this)
  consentedToSharing: v.boolean(),   // Can other orgs see this relationship exists?

  // Legal/custody notes (sensitive)
  custodyNotes: v.optional(v.string()), // E.g., "No contact with father"

  // Verification
  verifiedAt: v.optional(v.string()),
  verifiedBy: v.optional(v.string()),

  createdAt: v.number(),
})
  .index("by_guardian", ["guardianIdentityId"])
  .index("by_player", ["playerIdentityId"])
  .index("by_guardian_player", ["guardianIdentityId", "playerIdentityId"])
```

#### `orgGuardianProfiles` - Organization-Level Guardian Preferences

```typescript
orgGuardianProfiles: defineTable({
  guardianIdentityId: v.id("guardianIdentities"),
  organizationId: v.string(),

  // Emergency contact priority (1 = first call)
  emergencyContactPriority: v.optional(v.number()),

  // Communication preferences for THIS club
  communicationPrefs: v.optional(v.object({
    receiveNewsletters: v.boolean(),
    receiveMatchUpdates: v.boolean(),
    receiveTrainingReminders: v.boolean(),
    receiveEmergencyAlerts: v.boolean(),
    preferredMethod: v.optional(v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("app_notification")
    )),
  })),

  // Club-specific notes (only this club sees)
  adminNotes: v.optional(v.string()),

  // Volunteer/helper status at this club
  volunteerRoles: v.optional(v.array(v.string())), // ["team_manager", "car_pool", "first_aid"]

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_guardian", ["guardianIdentityId"])
  .index("by_organization", ["organizationId"])
  .index("by_guardian_org", ["guardianIdentityId", "organizationId"])
```

#### `orgPlayerEnrollments` - Organization-Level Player Membership

```typescript
orgPlayerEnrollments: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),

  // Enrollment status
  status: v.union(
    v.literal("active"),
    v.literal("inactive"),           // Taking a break
    v.literal("archived"),           // Left the club
    v.literal("pending_verification")
  ),

  // Organization-specific data
  clubMembershipNumber: v.optional(v.string()),
  ageGroup: v.string(),
  season: v.string(),

  // Registration source
  registrationSource: v.union(
    v.literal("manual"),             // Admin entered
    v.literal("import"),             // Bulk import (GAA membership, etc.)
    v.literal("self_registration"),  // Parent registered online
    v.literal("identity_link")       // Linked from existing identity
  ),

  // Club-specific notes
  adminNotes: v.optional(v.string()),

  // Medical consent (org-specific, not platform)
  medicalConsentGiven: v.optional(v.boolean()),
  photoConsentGiven: v.optional(v.boolean()),

  // Timestamps
  enrolledAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
})
  .index("by_identity", ["playerIdentityId"])
  .index("by_organization", ["organizationId"])
  .index("by_identity_org", ["playerIdentityId", "organizationId"])
  .index("by_status", ["organizationId", "status"])
  .index("by_ageGroup", ["organizationId", "ageGroup"])
  .index("by_season", ["organizationId", "season"])
```

### 3.10 Adult/Senior Player Support

A critical use case: **Senior teams where players are adults managing their own profiles**.

#### The Adult Player Challenge

| Youth Players | Adult Players |
|---------------|---------------|
| Managed by guardians | Self-managed |
| Contact via parent | Direct contact |
| Parent views dashboard | Player views own dashboard |
| Guardian consent for sharing | Self-consent |
| Emergency contact: parent | Emergency contact: next of kin |

#### Solution: Unified Player Identity with Type Flag

The `playerType` field in `playerIdentities` determines the management mode:

```typescript
// Youth player (U6-U18) - guardian managed
{
  playerType: "youth",
  userId: null,                    // No direct login
  email: null,                     // Contact via guardian
  // Managed via guardianPlayerLinks
}

// Adult player (Senior/Adult teams) - self managed
{
  playerType: "adult",
  userId: "user_abc",              // Direct login
  email: "player@example.com",     // Direct contact
  phone: "087-123-4567",
  // No guardianPlayerLinks needed (optional emergency contacts instead)
}
```

#### Emergency Contacts for Adults

Adults don't have "guardians" but may have emergency contacts (next of kin). We handle this with a separate table:

```typescript
playerEmergencyContacts: defineTable({
  playerIdentityId: v.id("playerIdentities"),

  // Contact details
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),

  // Relationship
  relationship: v.string(),        // "spouse", "partner", "parent", "sibling", "friend"

  // Priority (1 = first call)
  priority: v.number(),

  // Availability notes
  notes: v.optional(v.string()),   // "Only call after 6pm", "Works night shift"

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_player", ["playerIdentityId"])
  .index("by_priority", ["playerIdentityId", "priority"])
```

#### Youth vs Adult Data Flow Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUTH PLAYER FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User (Parent) logs in
       │
       ▼
guardianIdentities (find by userId/email)
       │
       ▼
guardianPlayerLinks (find linked children)
       │
       ▼
playerIdentities (playerType: "youth")
       │
       ▼
orgPlayerEnrollments → sportPassports → skillAssessments


┌─────────────────────────────────────────────────────────────────┐
│                     ADULT PLAYER FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User (Player) logs in
       │
       ▼
playerIdentities (find by userId, playerType: "adult")
       │
       ▼
orgPlayerEnrollments → sportPassports → skillAssessments
       │
       ▼
playerEmergencyContacts (optional, for club reference)
```

#### Age-Based Automatic Transition

Players can transition from youth to adult as they age:

```typescript
// Check if player should transition to adult
function shouldTransitionToAdult(player: PlayerIdentity): boolean {
  const age = calculateAge(player.dateOfBirth);
  // GAA/Soccer/Rugby typically: 18+ is adult
  return age >= 18 && player.playerType === "youth";
}

// Transition process
async function transitionToAdult(
  ctx: MutationCtx,
  playerId: Id<"playerIdentities">,
  userEmail: string
) {
  // 1. Update player type
  await ctx.db.patch(playerId, {
    playerType: "adult",
    email: userEmail,
  });

  // 2. Create user account invitation
  await sendAdultTransitionInvite(userEmail, playerId);

  // 3. Optionally: convert primary guardian to emergency contact
  const guardianLink = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
    .filter((q) => q.eq(q.field("isPrimary"), true))
    .first();

  if (guardianLink) {
    const guardian = await ctx.db.get(guardianLink.guardianIdentityId);
    if (guardian) {
      await ctx.db.insert("playerEmergencyContacts", {
        playerIdentityId: playerId,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        phone: guardian.phone || "",
        email: guardian.email,
        relationship: guardianLink.relationship,  // "mother" → still valid
        priority: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  // 4. Notify guardians their access will change
  await notifyGuardiansOfTransition(playerId);
}
```

#### Adult Player Dashboard

Adult players see their own dashboard, not a "parent dashboard":

```typescript
// Get player profile for adult (self-managed)
export const getMyPlayerProfile = query({
  args: {},
  returns: v.optional(v.object({
    playerIdentityId: v.id("playerIdentities"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    enrollments: v.array(v.object({
      organizationId: v.string(),
      organizationName: v.string(),
      ageGroup: v.string(),
      sports: v.array(v.string()),
    })),
    emergencyContacts: v.array(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
  })),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return undefined;

    // Find player identity linked to this user (adult self-management)
    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!player || player.playerType !== "adult") return undefined;

    // Get enrollments
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_identity", (q) => q.eq("playerIdentityId", player._id))
      .collect();

    // Get emergency contacts
    const emergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
      .collect();

    return {
      playerIdentityId: player._id,
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email,
      phone: player.phone,
      enrollments: await Promise.all(enrollments.map(async (e) => ({
        organizationId: e.organizationId,
        organizationName: await getOrgName(ctx, e.organizationId),
        ageGroup: e.ageGroup,
        sports: await getSportsForEnrollment(ctx, e._id),
      }))),
      emergencyContacts: emergencyContacts.map((ec) => ({
        name: `${ec.firstName} ${ec.lastName}`,
        phone: ec.phone,
        relationship: ec.relationship,
      })),
    };
  },
});
```

#### Scenarios Supported

| Scenario | How It Works |
|----------|--------------|
| **Senior GAA player joins club** | Admin creates playerIdentity with `playerType: "adult"`, sends invite to player's email |
| **Player registers themselves** | Self-registration creates playerIdentity with `playerType: "adult"` + links userId |
| **U18 player turns 18** | System prompts for transition, converts guardian to emergency contact |
| **Adult has children playing** | Same user can be BOTH a guardianIdentity (for their kids) AND have a playerIdentity (for themselves) |
| **Adult adds emergency contact** | Player manages their own emergencyContacts via profile |
| **Coach checks emergency info** | Views playerEmergencyContacts for adult, guardianPlayerLinks for youth |

#### Mixed Household Example

One user account can have multiple roles:

```
User: John Murphy (john@example.com)
├── guardianIdentity (id: guardian_001)
│   └── guardianPlayerLinks:
│       ├── Sarah Murphy (daughter, U12) - isPrimary: true
│       └── Tom Murphy (son, U10) - isPrimary: true
│
└── playerIdentity (id: player_002, playerType: "adult")
    ├── Linked via userId to same account
    ├── orgPlayerEnrollments: [Senior Football @ Club A]
    └── playerEmergencyContacts: [Mary Murphy (wife)]
```

John can:
- View **Parent Dashboard** → See Sarah and Tom's passports
- View **My Player Profile** → See his own senior football passport
- Both accessible from same account with role switching

---

### 3.11 Identity Matching Logic

When creating a new player or guardian, the system should check for existing matches:

```typescript
// Guardian matching - find potential duplicates
async function findGuardianMatches(
  ctx: QueryCtx,
  email: string,
  phone?: string,
  firstName?: string,
  lastName?: string
): Promise<{ identity: GuardianIdentity; confidence: "high" | "medium" | "low" }[]> {
  const matches = [];

  // High confidence: exact email match
  const emailMatch = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
    .first();

  if (emailMatch) {
    matches.push({ identity: emailMatch, confidence: "high" });
    return matches; // Email is unique, no need to check further
  }

  // Medium confidence: phone match + name similarity
  if (phone) {
    const phoneMatches = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_phone", (q) => q.eq("phone", normalizePhone(phone)))
      .collect();

    for (const match of phoneMatches) {
      if (isSimilarName(match.firstName, firstName) &&
          isSimilarName(match.lastName, lastName)) {
        matches.push({ identity: match, confidence: "medium" });
      }
    }
  }

  return matches;
}

// Player matching - find potential duplicates
async function findPlayerMatches(
  ctx: QueryCtx,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  guardianEmail?: string
): Promise<{ identity: PlayerIdentity; confidence: "high" | "medium" | "low" }[]> {
  const matches = [];

  // High confidence: exact name + DOB match
  const exactMatch = await ctx.db
    .query("playerIdentities")
    .withIndex("by_name_dob", (q) =>
      q.eq("firstName", firstName)
       .eq("lastName", lastName)
       .eq("dateOfBirth", dateOfBirth)
    )
    .first();

  if (exactMatch) {
    matches.push({ identity: exactMatch, confidence: "high" });
  }

  // Medium confidence: guardian email links to player
  if (guardianEmail) {
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", guardianEmail.toLowerCase()))
      .first();

    if (guardian) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardian._id))
        .collect();

      for (const link of links) {
        const player = await ctx.db.get(link.playerIdentityId);
        if (player && isSimilarName(player.firstName, firstName)) {
          matches.push({ identity: player, confidence: "medium" });
        }
      }
    }
  }

  return matches;
}
```

### 3.11 Migration: Clean Slate Approach

**Current Status:** The system is in early testing with minimal data. All test records can be deleted.

**Recommended Approach:**
1. **Delete all existing player records** (test data only)
2. **Deploy new schema** with platform-level tables
3. **Start fresh** with identity-first player/guardian creation
4. **No migration scripts needed**

**If preserving test data:**
```typescript
// One-time migration script
async function migrateToIdentityModel(ctx: MutationCtx) {
  const players = await ctx.db.query("players").collect();

  for (const player of players) {
    // Create or find guardian identity
    let guardianId: Id<"guardianIdentities"> | null = null;

    if (player.parentEmail) {
      const existingGuardian = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_email", (q) => q.eq("email", player.parentEmail.toLowerCase()))
        .first();

      if (existingGuardian) {
        guardianId = existingGuardian._id;
      } else {
        guardianId = await ctx.db.insert("guardianIdentities", {
          firstName: player.parentFirstName || "Unknown",
          lastName: player.parentSurname || player.name.split(" ").pop() || "",
          email: player.parentEmail.toLowerCase(),
          phone: player.parentPhone,
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Create player identity
    const [firstName, ...lastNameParts] = player.name.split(" ");
    const playerIdentityId = await ctx.db.insert("playerIdentities", {
      firstName,
      lastName: lastNameParts.join(" ") || "",
      dateOfBirth: player.dateOfBirth || "",
      gender: player.gender === "Boys" ? "male" : player.gender === "Girls" ? "female" : "other",
      verificationStatus: "unverified",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link guardian to player
    if (guardianId) {
      await ctx.db.insert("guardianPlayerLinks", {
        guardianIdentityId: guardianId,
        playerIdentityId,
        relationship: "parent",
        isPrimary: true,
        consentedToSharing: false,
        createdAt: Date.now(),
      });
    }

    // Create enrollment
    const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
      playerIdentityId,
      organizationId: player.organizationId,
      status: "active",
      ageGroup: player.ageGroup,
      season: player.season,
      registrationSource: "import",
      enrolledAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create sport passport and migrate skills...
  }
}
```

---

## 4. Parent Dashboard Architecture

### 4.1 Parent Dashboard Overview

The Parent Dashboard provides a unified view of all children's development across sports and organizations. Key features from MVP analysis:

| Feature | Description | Data Source |
|---------|-------------|-------------|
| **Family Header** | "Your Family's Journey" + child count | Player identities linked to parent |
| **Weekly Schedule** | Training/match calendar | Future: events table |
| **Coach Feedback** | Latest notes from coaches | sportPassports.coachNotes |
| **AI Practice Assistant** | Personalized drill recommendations | skillAssessments + skillDefinitions |
| **Children Cards** | Per-child development summary | sportPassports + skillAssessments |
| **Family Summary Stats** | Reviews completed/due/overdue | Aggregated from passports |

### 4.2 Data Flow for Parent Dashboard (Using Platform Identity Model)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARENT DASHBOARD DATA FLOW                    │
│                  (Using Guardian Identity Model)                 │
└─────────────────────────────────────────────────────────────────┘

1. Parent logs in with email: mary@example.com
   ┌────────────────────────────────────────────────────────────┐
   │ Better Auth validates credentials                          │
   │ Returns: { userId: "user_abc", email: "mary@example.com" } │
   └────────────────────────────────────────────────────────────┘

2. Find guardian identity:
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT * FROM guardianIdentities                           │
   │ WHERE userId = 'user_abc'                                  │
   │    OR email = 'mary@example.com'                           │
   └────────────────────────────────────────────────────────────┘
   Result: guardian_456 (Mary Barlow)

3. Find linked children via guardianPlayerLinks:
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT pl.*, p.*                                           │
   │ FROM guardianPlayerLinks pl                                │
   │ JOIN playerIdentities p ON p._id = pl.playerIdentityId     │
   │ WHERE pl.guardianIdentityId = 'guardian_456'               │
   └────────────────────────────────────────────────────────────┘
   Result: [
     { link: {relationship: "mother", isPrimary: true, consentedToSharing: true},
       player: {firstName: "Clodagh", lastName: "Barlow", _id: "player_123"} },
     { link: {relationship: "mother", isPrimary: true, consentedToSharing: true},
       player: {firstName: "Sean", lastName: "Barlow", _id: "player_789"} }
   ]

4. For current organization context (/orgs/[orgId]/parents):
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT * FROM orgPlayerEnrollments                         │
   │ WHERE playerIdentityId IN ['player_123', 'player_789']     │
   │   AND organizationId = 'current_org'                       │
   │   AND status = 'active'                                    │
   └────────────────────────────────────────────────────────────┘
   Result: [enrollment_001 (Clodagh @ this club)]
   Note: Sean not enrolled at this club

5. Get sport passports for enrolled children:
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT * FROM sportPassports                               │
   │ WHERE enrollmentId IN ['enrollment_001']                   │
   │   AND status = 'active'                                    │
   └────────────────────────────────────────────────────────────┘
   Result: [passport_gaa (GAA Football), passport_soccer (Soccer)]

6. Get guardian's org-specific profile (for preferences):
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT * FROM orgGuardianProfiles                          │
   │ WHERE guardianIdentityId = 'guardian_456'                  │
   │   AND organizationId = 'current_org'                       │
   └────────────────────────────────────────────────────────────┘
   Result: { emergencyContactPriority: 1, communicationPrefs: {...} }

7. Get latest skill assessments:
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT DISTINCT ON (skillCode) * FROM skillAssessments     │
   │ WHERE passportId IN ['passport_gaa', 'passport_soccer']    │
   │ ORDER BY assessmentDate DESC                               │
   └────────────────────────────────────────────────────────────┘

8. Cross-org indicator (if guardian has children elsewhere):
   ┌────────────────────────────────────────────────────────────┐
   │ SELECT DISTINCT organizationId FROM orgPlayerEnrollments   │
   │ WHERE playerIdentityId IN ['player_123', 'player_789']     │
   │   AND organizationId != 'current_org'                      │
   │   AND status = 'active'                                    │
   └────────────────────────────────────────────────────────────┘
   Result: ['other_club_id'] → "You have children at 1 other club"
```

### 4.3 Parent Dashboard API Design (Using Guardian Identity)

```typescript
// Helper: Get guardian identity for current user
async function getGuardianForUser(ctx: QueryCtx): Promise<GuardianIdentity | null> {
  const user = await getCurrentUser(ctx);
  if (!user) return null;

  // First try by userId (registered users)
  if (user._id) {
    const byUserId = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (byUserId) return byUserId;
  }

  // Fallback to email (for users who haven't linked yet)
  if (user.email) {
    const byEmail = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", user.email.toLowerCase()))
      .first();
    return byEmail;
  }

  return null;
}

// Helper: Get all linked children for a guardian
async function getLinkedChildren(
  ctx: QueryCtx,
  guardianId: Id<"guardianIdentities">
): Promise<Array<{ link: GuardianPlayerLink; player: PlayerIdentity }>> {
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardianId))
    .collect();

  const result = [];
  for (const link of links) {
    const player = await ctx.db.get(link.playerIdentityId);
    if (player) {
      result.push({ link, player });
    }
  }
  return result;
}

// Get all children for a parent (current org context)
export const getChildrenForParent = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    // Identity info
    playerIdentityId: v.id("playerIdentities"),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),

    // Relationship info
    relationship: v.string(),
    isPrimaryGuardian: v.boolean(),

    // Enrollment info (null if not enrolled at this org)
    enrollment: v.optional(v.object({
      enrollmentId: v.id("orgPlayerEnrollments"),
      ageGroup: v.string(),
      status: v.string(),
      clubMembershipNumber: v.optional(v.string()),
    })),

    // Sport passports (empty if not enrolled)
    passports: v.array(v.object({
      passportId: v.id("sportPassports"),
      sportCode: v.string(),
      sportName: v.string(),
      currentOverallRating: v.optional(v.number()),
      lastAssessmentDate: v.optional(v.string()),
      reviewStatus: v.string(),
    })),

    // Aggregated stats
    totalSports: v.number(),
    averageRating: v.optional(v.number()),
    nextReviewDue: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const guardian = await getGuardianForUser(ctx);
    if (!guardian) return [];

    // Get all linked children
    const linkedChildren = await getLinkedChildren(ctx, guardian._id);

    const result = [];
    for (const { link, player } of linkedChildren) {
      // Get enrollment at this organization (if any)
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_identity_org", (q) =>
          q.eq("playerIdentityId", player._id)
           .eq("organizationId", args.organizationId)
        )
        .first();

      // Get passports if enrolled
      let passports: PassportInfo[] = [];
      if (enrollment && enrollment.status === "active") {
        passports = await getPassportsForEnrollment(ctx, enrollment._id);
      }

      result.push({
        playerIdentityId: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        relationship: link.relationship,
        isPrimaryGuardian: link.isPrimary,
        enrollment: enrollment ? {
          enrollmentId: enrollment._id,
          ageGroup: enrollment.ageGroup,
          status: enrollment.status,
          clubMembershipNumber: enrollment.clubMembershipNumber,
        } : undefined,
        passports,
        totalSports: passports.length,
        averageRating: calculateAverageRating(passports),
        nextReviewDue: getEarliestReviewDue(passports),
      });
    }

    return result;
  },
});

// Get children across ALL organizations (cross-org family view)
export const getChildrenAcrossOrganizations = query({
  args: {},
  returns: v.array(v.object({
    player: v.object({
      id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
    }),
    relationship: v.string(),
    enrollments: v.array(v.object({
      organizationId: v.string(),
      organizationName: v.string(),
      ageGroup: v.string(),
      status: v.string(),
      sports: v.array(v.string()),
    })),
  })),
  handler: async (ctx) => {
    const guardian = await getGuardianForUser(ctx);
    if (!guardian) return [];

    const linkedChildren = await getLinkedChildren(ctx, guardian._id);

    const result = [];
    for (const { link, player } of linkedChildren) {
      // Skip children where guardian hasn't consented to cross-org sharing
      if (!link.consentedToSharing) continue;

      // Get all enrollments for this child
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_identity", (q) => q.eq("playerIdentityId", player._id))
        .collect();

      const enrollmentDetails = await Promise.all(
        enrollments.map(async (e) => ({
          organizationId: e.organizationId,
          organizationName: await getOrgName(ctx, e.organizationId),
          ageGroup: e.ageGroup,
          status: e.status,
          sports: await getSportsForEnrollment(ctx, e._id),
        }))
      );

      result.push({
        player: {
          id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
        },
        relationship: link.relationship,
        enrollments: enrollmentDetails,
      });
    }

    return result;
  },
});

// Get guardian's profile and preferences for an organization
export const getGuardianOrgProfile = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.optional(v.object({
    guardianIdentityId: v.id("guardianIdentities"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    emergencyContactPriority: v.optional(v.number()),
    communicationPrefs: v.optional(v.object({
      receiveNewsletters: v.boolean(),
      receiveMatchUpdates: v.boolean(),
      receiveTrainingReminders: v.boolean(),
      receiveEmergencyAlerts: v.boolean(),
    })),
    volunteerRoles: v.optional(v.array(v.string())),
  })),
  handler: async (ctx, args) => {
    const guardian = await getGuardianForUser(ctx);
    if (!guardian) return undefined;

    const orgProfile = await ctx.db
      .query("orgGuardianProfiles")
      .withIndex("by_guardian_org", (q) =>
        q.eq("guardianIdentityId", guardian._id)
         .eq("organizationId", args.organizationId)
      )
      .first();

    return {
      guardianIdentityId: guardian._id,
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      email: guardian.email,
      phone: guardian.phone,
      emergencyContactPriority: orgProfile?.emergencyContactPriority,
      communicationPrefs: orgProfile?.communicationPrefs,
      volunteerRoles: orgProfile?.volunteerRoles,
    };
  },
});
```

### 4.4 Parent Dashboard Components

```
apps/web/src/app/orgs/[orgId]/parents/
├── page.tsx                          # Main dashboard (org-scoped)
├── layout.tsx                        # Parent layout with nav
└── components/
    ├── family-header.tsx             # "Your Family's Journey" + stats
    ├── cross-org-indicator.tsx       # "2 children at other clubs"
    ├── child-card.tsx                # Per-child summary card
    ├── child-sport-tabs.tsx          # Multi-sport tabbed view
    ├── skill-overview.tsx            # Top strengths, areas to improve
    ├── weekly-schedule.tsx           # Training/match calendar
    ├── coach-feedback.tsx            # Latest coach notes
    ├── ai-practice-assistant.tsx     # Drill recommendations
    ├── practice-plan-modal.tsx       # Detailed practice plan
    └── review-status-badge.tsx       # Completed/Due Soon/Overdue
```

### 4.5 Child Card Component (MVP Feature Mapping)

```typescript
interface ChildCardProps {
  child: {
    identityId: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
    passports: SportPassport[];
    // ... other fields
  };
}

function ChildCard({ child }: ChildCardProps) {
  const isMultiSport = child.passports.length > 1;

  return (
    <Card>
      {/* Header with name and badges */}
      <CardHeader>
        <div className="flex items-center gap-2">
          <h3>{child.firstName} {child.lastName}</h3>
          {isMultiSport && <Badge variant="secondary">Multi-Sport</Badge>}
          <ReviewStatusBadge status={child.nextReviewDue} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Overall Performance Score */}
        <OverallPerformance rating={child.averageRating} />

        {/* Top Strengths (aggregated or per-sport) */}
        <TopStrengths passports={child.passports} />

        {/* Attendance */}
        <AttendanceSummary passports={child.passports} />

        {/* Development Goals */}
        <GoalsPreview passports={child.passports} />

        {/* Injury Status */}
        <InjuryStatus playerId={child.identityId} />

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {child.passports.length === 1 ? (
            <Button asChild>
              <Link href={`/passport/${child.passports[0].passportId}`}>
                View Full Passport
              </Link>
            </Button>
          ) : (
            child.passports.map(p => (
              <Button key={p.sportCode} variant="outline" asChild>
                <Link href={`/passport/${p.passportId}`}>
                  View {p.sportName}
                </Link>
              </Button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4.6 AI Practice Assistant Integration

The AI Practice Assistant analyzes skill gaps and generates personalized practice plans:

```typescript
// Get recommended practice focus based on skill assessments
export const getPracticeRecommendations = query({
  args: {
    passportId: v.id("sportPassports"),
  },
  returns: v.object({
    focusSkill: v.object({
      code: v.string(),
      name: v.string(),
      currentRating: v.number(),
      benchmarkRating: v.optional(v.number()),
      gap: v.number(),
    }),
    drills: v.array(v.object({
      name: v.string(),
      duration: v.string(),
      equipment: v.array(v.string()),
      instructions: v.string(),
      successMetrics: v.string(),
    })),
    weeklyGoal: v.string(),
    practiceSchedule: v.string(),
  }),
  handler: async (ctx, args) => {
    const passport = await ctx.db.get(args.passportId);
    if (!passport) throw new Error("Passport not found");

    // Get latest assessments and benchmarks
    const assessments = await getLatestAssessments(ctx, args.passportId);
    const benchmarks = await getBenchmarksForPassport(ctx, passport);

    // Find skill with largest gap (most improvement potential)
    const gaps = assessments.map(a => {
      const benchmark = benchmarks.find(b => b.skillCode === a.skillCode);
      return {
        ...a,
        benchmarkRating: benchmark?.expectedRating,
        gap: (benchmark?.expectedRating || 3) - a.rating,
      };
    }).sort((a, b) => b.gap - a.gap);

    const focusSkill = gaps[0];

    // Get skill definition for drill generation
    const skillDef = await getSkillDefinition(ctx, passport.sportCode, focusSkill.skillCode);

    // Generate drills based on sport and skill
    const drills = generateDrillsForSkill(passport.sportCode, skillDef);

    return {
      focusSkill: {
        code: focusSkill.skillCode,
        name: skillDef.name,
        currentRating: focusSkill.rating,
        benchmarkRating: focusSkill.benchmarkRating,
        gap: focusSkill.gap,
      },
      drills,
      weeklyGoal: `Improve ${skillDef.name} from ${focusSkill.rating} to ${focusSkill.rating + 0.5}`,
      practiceSchedule: "3 sessions × 15 minutes",
    };
  },
});
```

### 4.7 Cross-Organization Indicator

When a parent has children at multiple clubs, show an indicator:

```typescript
function CrossOrgIndicator({ organizations }: { organizations: OrgSummary[] }) {
  if (organizations.length <= 1) return null;

  const otherOrgs = organizations.filter(o => o.id !== currentOrgId);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users className="h-4 w-4" />
      <span>
        You have children at {otherOrgs.length} other {otherOrgs.length === 1 ? 'club' : 'clubs'}
      </span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/family">View All</Link>
      </Button>
    </div>
  );
}
```

### 3.7 Migration Simplified: Clean Slate Option

**Current Status:** The system is in early testing with a very small population. All test records can be deleted if needed, making migration trivial.

**Recommended Approach:**
1. **Delete all existing player records** (test data only)
2. **Deploy new schema** with `playerIdentities`, `orgPlayerEnrollments`, and `sportPassports`
3. **Start fresh** with identity-first player creation
4. **No migration scripts needed** - clean implementation

**Why This Is Better:**
- No legacy data compatibility concerns
- No duplicate detection needed
- Simpler codebase without backward-compatibility code
- Cleaner data model from day one

**If Keeping Test Data (Optional):**
If some test data should be preserved, run a simple one-time script:
```typescript
// Simple migration - only needed if preserving test data
for (const player of existingPlayers) {
  const identity = await ctx.db.insert("playerIdentities", {
    firstName: player.name.split(" ")[0],
    lastName: player.name.split(" ").slice(1).join(" "),
    dateOfBirth: player.dateOfBirth || "",
    gender: player.gender === "Boys" ? "male" : player.gender === "Girls" ? "female" : "other",
    guardians: player.parentEmail ? [{
      id: generateId(),
      firstName: player.parentFirstName || "",
      lastName: player.parentSurname || "",
      email: player.parentEmail,
      isPrimary: true,
      consentedToSharing: false,
    }] : [],
    verificationStatus: "unverified",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const enrollment = await ctx.db.insert("orgPlayerEnrollments", {
    playerIdentityId: identity,
    organizationId: player.organizationId,
    status: "active",
    ageGroup: player.ageGroup,
    season: player.season,
    registrationSource: "import",
    enrolledAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create sport passport and migrate skills...
}
```

---

## 5. Reference Data Schema (Sport Configuration)

### 5.1 Core Design Principles

1. **Player-Centric**: Player identity separate from sport-specific data
2. **LTAD-Aligned**: Age-appropriate expectations and benchmarks
3. **NGB-Compatible**: Map to FAI/IRFU/GAA frameworks
4. **Temporal**: All assessments are timestamped snapshots
5. **Hierarchical**: Sport → Category → Skill → Assessment
6. **Graph-Ready**: Entities and relationships suitable for knowledge graph

### 5.2 Entity Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PLAYER PASSPORT DATA MODEL                             │
└─────────────────────────────────────────────────────────────────────────────────┘

REFERENCE DATA (Sport Configuration)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌──────────┐     ┌─────────────────┐     ┌─────────────────┐                   │
│  │  sports  │────▶│ skillCategories │────▶│ skillDefinitions│                   │
│  └──────────┘     └─────────────────┘     └─────────────────┘                   │
│       │                                           │                              │
│       │           ┌─────────────────┐             │                              │
│       └──────────▶│   benchmarks    │◀────────────┘                              │
│                   └─────────────────┘                                            │
│                                                                                  │
│  ┌──────────────────┐     ┌─────────────────┐                                   │
│  │ positionsBySpor  │     │ ageGroupConfig  │                                   │
│  └──────────────────┘     └─────────────────┘                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

PLAYER DATA (Per-Player Records)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                           ┌──────────────┐                                       │
│                           │   players    │                                       │
│                           │  (identity)  │                                       │
│                           └──────┬───────┘                                       │
│                                  │                                               │
│           ┌──────────────────────┼──────────────────────┐                        │
│           │                      │                      │                        │
│           ▼                      ▼                      ▼                        │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │ sportPassports │    │  teamPlayers   │    │ medicalProfiles │                │
│  │  (per sport)   │    │ (team links)   │    │ (health data)   │                │
│  └───────┬────────┘    └────────────────┘    └─────────────────┘                │
│          │                                                                       │
│          │ 1:N                                                                   │
│          ▼                                                                       │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │skillAssessments│    │developmentGoals│    │fitnessAssessments│               │
│  │  (temporal)    │    │   (per sport)  │    │   (temporal)    │                │
│  └────────────────┘    └────────────────┘    └─────────────────┘                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

KNOWLEDGE GRAPH LAYER (Future)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌────────────────────┐     ┌─────────────────────┐                             │
│  │skillRelationships  │     │ graphRelationships  │                             │
│  │(prerequisite, etc) │     │ (computed insights) │                             │
│  └────────────────────┘     └─────────────────────┘                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Detailed Schema Design

#### 5.3.1 `sports` - Sport Configuration

```typescript
sports: defineTable({
  // Identity
  code: v.string(),              // "soccer", "rugby_union", "gaa_football", "gaa_hurling"
  name: v.string(),              // "Soccer", "Rugby Union", "GAA Football"
  shortName: v.string(),         // "Soccer", "Rugby", "GAA"
  variant: v.optional(v.string()), // "union", "league", "sevens" for rugby variants

  // Governing body reference
  governingBody: v.string(),     // "FAI", "IRFU", "GAA"
  governingBodyFullName: v.string(), // "Football Association of Ireland"
  governingBodyUrl: v.optional(v.string()),

  // LTAD Configuration
  ltadFramework: v.optional(v.string()), // "FAI Player Development Plan", "IRFU LTPD"
  ageGroupProgression: v.array(v.string()), // ["U6", "U7", "U8", ... "Senior"]

  // Game configuration
  hasPositions: v.boolean(),
  hasGoalkeeper: v.boolean(),
  standardTeamSize: v.number(),  // 11, 15, 6, etc.
  pitchType: v.optional(v.string()), // "rectangular", "oval"

  // Visual
  icon: v.optional(v.string()),
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),

  // Status
  isActive: v.boolean(),
  displayOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_governingBody", ["governingBody"])
  .index("by_isActive", ["isActive"])
```

#### 5.3.2 `skillCategories` - Skill Groupings

Aligned with NGB frameworks (FAI Technical/Tactical/Physical/Mental, IRFU 5 Capacities, GAA domains).

```typescript
skillCategories: defineTable({
  // References
  sportCode: v.string(),

  // Identity
  code: v.string(),              // "technical_ball_mastery", "tactical_positioning"
  name: v.string(),              // "Ball Mastery", "Positioning & Awareness"
  shortName: v.string(),         // "Ball Mastery"
  description: v.optional(v.string()),

  // LTAD alignment
  domain: v.union(               // Aligns with IRFU 5 Capacities / FAI domains
    v.literal("technical"),
    v.literal("tactical"),
    v.literal("physical"),
    v.literal("mental"),
    v.literal("lifestyle"),      // IRFU includes this
    v.literal("character")       // Team/social skills
  ),

  // Ordering & UI
  displayOrder: v.number(),
  icon: v.optional(v.string()),
  color: v.optional(v.string()),

  // Flags
  isCore: v.boolean(),           // Core category for the sport
  isAdvanced: v.boolean(),       // Advanced category (older ages)
  isActive: v.boolean(),

  // Age applicability
  minAgeGroup: v.optional(v.string()), // Earliest age this category applies
  maxAgeGroup: v.optional(v.string()), // Latest age (usually "Senior")

  createdAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_domain", ["sportCode", "domain"])
  .index("by_displayOrder", ["sportCode", "displayOrder"])
```

#### 5.3.3 `skillDefinitions` - Individual Skills

Each assessable skill with full metadata.

```typescript
skillDefinitions: defineTable({
  // References
  sportCode: v.string(),
  categoryCode: v.string(),

  // Identity
  code: v.string(),              // "first_touch", "passing_accuracy", "solo_run"
  name: v.string(),              // "First Touch", "Passing Accuracy", "Solo Run"
  shortName: v.string(),         // For compact displays
  description: v.string(),       // Detailed description for coaches

  // Assessment guidance - what each rating means
  ratingDescriptors: v.array(v.object({
    rating: v.number(),          // 1-5
    label: v.string(),           // "Developing", "Emerging", etc.
    description: v.string(),     // Detailed criteria
    ageContext: v.optional(v.string()), // "Expected at U10 level"
  })),

  // Skill classification (sports science)
  skillType: v.optional(v.union(
    v.literal("open"),           // Environment-dependent (tackling)
    v.literal("closed"),         // Stable environment (free kick)
    v.literal("mixed")           // Both contexts
  )),
  motorType: v.optional(v.union(
    v.literal("gross"),          // Large muscle groups (running)
    v.literal("fine"),           // Precision (ball control)
    v.literal("mixed")
  )),

  // Age applicability
  minAgeGroup: v.optional(v.string()),
  maxAgeGroup: v.optional(v.string()),
  isAgeAppropriate: v.optional(v.record(v.string(), v.boolean())), // {"U8": true, "U10": true}

  // Ordering & display
  displayOrder: v.number(),
  isCore: v.boolean(),           // Fundamental skill
  isAdvanced: v.boolean(),       // Advanced skill
  isActive: v.boolean(),

  // Knowledge graph preparation
  prerequisiteSkills: v.optional(v.array(v.string())), // Skill codes
  relatedSkills: v.optional(v.array(v.string())),      // Similar/complementary
  transfersTo: v.optional(v.array(v.object({          // Cross-sport transfer
    sportCode: v.string(),
    skillCode: v.string(),
    transferWeight: v.number(),  // 0-1 how much transfers
  }))),

  // Metadata
  ngbReference: v.optional(v.string()), // Reference to NGB documentation
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_category", ["sportCode", "categoryCode"])
  .index("by_code", ["sportCode", "code"])
  .index("by_displayOrder", ["sportCode", "categoryCode", "displayOrder"])
```

#### 5.3.4 `benchmarks` - NGB Standards

Age/gender/level appropriate expectations from governing bodies.

```typescript
benchmarks: defineTable({
  // References
  sportCode: v.string(),
  skillCode: v.string(),

  // Context (what this benchmark applies to)
  ageGroup: v.string(),          // "U8", "U10", "U12", etc.
  gender: v.union(
    v.literal("male"),
    v.literal("female"),
    v.literal("all")
  ),
  level: v.union(
    v.literal("recreational"),   // Fun/participation focused
    v.literal("competitive"),    // Club competitive
    v.literal("development"),    // Development pathway
    v.literal("elite")           // High performance
  ),

  // Benchmark values (1-5 scale)
  expectedRating: v.number(),    // Expected for this age/level
  minAcceptable: v.number(),     // Minimum acceptable
  developingThreshold: v.number(), // Below this = needs work
  excellentThreshold: v.number(), // Above this = exceptional

  // Percentile data (if available from NGB)
  percentile25: v.optional(v.number()),
  percentile50: v.optional(v.number()),
  percentile75: v.optional(v.number()),
  percentile90: v.optional(v.number()),

  // Source attribution
  source: v.string(),            // "FAI", "IRFU", "GAA", "internal"
  sourceDocument: v.optional(v.string()), // "FAI Player Development Plan 2024"
  sourceUrl: v.optional(v.string()),
  sourceYear: v.number(),
  validFrom: v.optional(v.string()),  // ISO date
  validTo: v.optional(v.string()),    // ISO date (null = current)

  // Notes
  notes: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_skill", ["sportCode", "skillCode"])
  .index("by_context", ["sportCode", "skillCode", "ageGroup", "gender", "level"])
  .index("by_source", ["source", "sourceYear"])
```

#### 5.3.5 `sportPassports` - Player's Sport-Specific Passport

Links a player to a specific sport with their current status.

```typescript
sportPassports: defineTable({
  // References
  playerId: v.id("players"),
  sportCode: v.string(),
  organizationId: v.string(),

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("inactive"),       // Taking a break
    v.literal("archived")        // Historical record
  ),

  // Position preferences (if sport has positions)
  primaryPosition: v.optional(v.string()),
  secondaryPositions: v.optional(v.array(v.string())),
  coachPreferredPosition: v.optional(v.string()),
  leastPreferredPosition: v.optional(v.string()),

  // Physical attributes
  dominantSide: v.optional(v.union(
    v.literal("left"),
    v.literal("right"),
    v.literal("both")
  )),
  isGoalkeeper: v.optional(v.boolean()), // For soccer/GAA

  // Current computed values (denormalized for performance)
  currentOverallRating: v.optional(v.number()),
  currentTechnicalRating: v.optional(v.number()),
  currentTacticalRating: v.optional(v.number()),
  currentPhysicalRating: v.optional(v.number()),
  currentMentalRating: v.optional(v.number()),

  // Assessment tracking
  lastAssessmentDate: v.optional(v.string()),
  lastAssessmentType: v.optional(v.string()),
  assessmentCount: v.number(),
  nextReviewDue: v.optional(v.string()),

  // Notes (sport-specific)
  coachNotes: v.optional(v.string()),
  parentNotes: v.optional(v.string()),
  playerNotes: v.optional(v.string()),

  // Season tracking
  currentSeason: v.optional(v.string()),
  seasonsPlayed: v.optional(v.array(v.string())),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_playerId_and_sport", ["playerId", "sportCode"])
  .index("by_organizationId", ["organizationId"])
  .index("by_organizationId_and_sport", ["organizationId", "sportCode"])
  .index("by_status", ["organizationId", "sportCode", "status"])
```

#### 5.3.6 `skillAssessments` - Point-in-Time Skill Records

Individual skill assessments with full context for temporal tracking.

```typescript
skillAssessments: defineTable({
  // References
  passportId: v.id("sportPassports"),
  playerId: v.id("players"),       // Denormalized for querying
  sportCode: v.string(),           // Denormalized
  skillCode: v.string(),
  organizationId: v.string(),      // Denormalized

  // Assessment data
  rating: v.number(),              // 1-5 scale
  previousRating: v.optional(v.number()), // For delta tracking

  // Context
  assessmentDate: v.string(),      // ISO date
  assessmentType: v.union(
    v.literal("initial"),          // First assessment
    v.literal("training"),         // Regular training observation
    v.literal("match"),            // Post-match assessment
    v.literal("trial"),            // Trial/tryout
    v.literal("formal_review"),    // Scheduled formal review
    v.literal("self"),             // Player self-assessment
    v.literal("parent"),           // Parent observation
    v.literal("import")            // Imported from external source
  ),

  // Assessor information
  assessedBy: v.optional(v.string()),     // User ID
  assessedByName: v.optional(v.string()), // Denormalized name
  assessorRole: v.optional(v.union(
    v.literal("coach"),
    v.literal("head_coach"),
    v.literal("assistant_coach"),
    v.literal("parent"),
    v.literal("self"),
    v.literal("admin"),
    v.literal("system")
  )),

  // Benchmark comparison (snapshot at time of assessment)
  benchmarkRating: v.optional(v.number()),
  benchmarkLevel: v.optional(v.string()),  // "competitive", "recreational"
  benchmarkDelta: v.optional(v.number()),  // rating - benchmarkRating
  benchmarkStatus: v.optional(v.union(
    v.literal("below"),
    v.literal("developing"),
    v.literal("on_track"),
    v.literal("exceeding"),
    v.literal("exceptional")
  )),

  // Notes
  notes: v.optional(v.string()),
  privateNotes: v.optional(v.string()), // Coach-only notes

  // Session context (if applicable)
  sessionId: v.optional(v.string()),    // Link to training session
  matchId: v.optional(v.string()),      // Link to match record

  // Metadata
  confidence: v.optional(v.union(       // Assessor's confidence
    v.literal("low"),
    v.literal("medium"),
    v.literal("high")
  )),
  createdAt: v.number(),
})
  .index("by_passportId", ["passportId"])
  .index("by_playerId", ["playerId"])
  .index("by_playerId_and_sport", ["playerId", "sportCode"])
  .index("by_skill", ["passportId", "skillCode"])
  .index("by_date", ["passportId", "assessmentDate"])
  .index("by_assessor", ["assessedBy", "assessmentDate"])
  .index("by_organizationId", ["organizationId", "assessmentDate"])
  .index("by_type", ["passportId", "assessmentType"])
```

#### 5.3.7 `fitnessAssessments` - Physical Fitness Records

Sport-agnostic physical development tracking.

```typescript
fitnessAssessments: defineTable({
  // References
  playerId: v.id("players"),
  organizationId: v.string(),
  passportId: v.optional(v.id("sportPassports")), // Optional sport context

  // Assessment timing
  assessmentDate: v.string(),
  assessmentType: v.union(
    v.literal("pre_season"),
    v.literal("mid_season"),
    v.literal("post_season"),
    v.literal("regular"),
    v.literal("return_from_injury")
  ),

  // Core ratings (1-5 scale)
  speedRating: v.optional(v.number()),
  agilityRating: v.optional(v.number()),
  enduranceRating: v.optional(v.number()),
  strengthRating: v.optional(v.number()),
  flexibilityRating: v.optional(v.number()),
  balanceRating: v.optional(v.number()),
  coordinationRating: v.optional(v.number()),

  // Measured values (objective tests)
  sprint10m: v.optional(v.number()),      // seconds
  sprint20m: v.optional(v.number()),
  sprint40m: v.optional(v.number()),
  beepTestLevel: v.optional(v.string()),  // "8.4", "10.2"
  beepTestShuttles: v.optional(v.number()),
  broncoTime: v.optional(v.number()),     // seconds
  yoyoTestLevel: v.optional(v.string()),
  verticalJump: v.optional(v.number()),   // cm
  standingBroadJump: v.optional(v.number()), // cm
  sitAndReach: v.optional(v.number()),    // cm

  // Body metrics (optional, age-appropriate)
  height: v.optional(v.number()),         // cm
  weight: v.optional(v.number()),         // kg

  // Context
  assessedBy: v.optional(v.string()),
  notes: v.optional(v.string()),

  createdAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_date", ["playerId", "assessmentDate"])
  .index("by_organizationId", ["organizationId"])
  .index("by_type", ["playerId", "assessmentType"])
```

#### 5.3.8 `positionsBySport` - Sport-Specific Positions

Reference data for positions by sport.

```typescript
positionsBySport: defineTable({
  sportCode: v.string(),
  code: v.string(),              // "goalkeeper", "midfielder", "half_forward"
  name: v.string(),              // "Goalkeeper", "Midfielder", "Half Forward"
  shortName: v.string(),         // "GK", "MF", "HF"
  category: v.optional(v.string()), // "defense", "midfield", "attack"

  // Position details
  description: v.optional(v.string()),
  keySkills: v.optional(v.array(v.string())), // Skill codes important for this position
  physicalRequirements: v.optional(v.array(v.string())), // "speed", "height", etc.

  // Display
  displayOrder: v.number(),
  pitchZone: v.optional(v.string()), // For visual pitch representation
  isActive: v.boolean(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_code", ["sportCode", "code"])
```

#### 5.3.9 `ageGroupConfig` - Age Group Configuration

Configurable age group settings per organization/sport.

```typescript
ageGroupConfig: defineTable({
  // Scope
  organizationId: v.optional(v.string()), // null = global default
  sportCode: v.optional(v.string()),      // null = all sports

  // Age group
  code: v.string(),              // "U8", "U10", "U12", etc.
  name: v.string(),              // "Under 8", "Under 10"

  // Age range
  minAge: v.number(),            // 6
  maxAge: v.number(),            // 8
  birthYearCutoff: v.optional(v.string()), // "January 1" or "September 1"

  // LTAD alignment
  ltadStage: v.union(
    v.literal("active_start"),
    v.literal("fundamentals"),
    v.literal("learn_to_train"),
    v.literal("train_to_train"),
    v.literal("train_to_compete"),
    v.literal("train_to_win")
  ),

  // Game format
  teamSize: v.optional(v.number()),      // 4v4, 7v7, 11v11
  gameDuration: v.optional(v.number()),  // minutes
  fieldSize: v.optional(v.string()),     // "small", "medium", "full"

  // Assessment guidance
  assessmentFrequency: v.optional(v.string()), // "monthly", "quarterly"
  focusAreas: v.optional(v.array(v.string())), // ["fundamentals", "fun"]

  displayOrder: v.number(),
  isActive: v.boolean(),
})
  .index("by_code", ["code"])
  .index("by_organization", ["organizationId", "sportCode"])
```

---

## 6. Multi-Sport Support

### 6.1 Player with Multiple Sports Example

```
Player: "Clodagh Barlow" (playerId: "player_123")
├── Basic Info: name, dateOfBirth, familyId, parents[]
│
├── sportPassport: GAA Football (passportId: "sp_gaa")
│   ├── ageGroup: U12
│   ├── primaryPosition: "half_forward"
│   ├── currentOverallRating: 4.2
│   └── skillAssessments: [solo: 4, kick_pass: 5, hand_pass: 4, ...]
│
├── sportPassport: Rugby (passportId: "sp_rugby")
│   ├── ageGroup: U12
│   ├── primaryPosition: "centre"
│   ├── currentOverallRating: 3.8
│   └── skillAssessments: [catch_pass: 4, tackle_technique: 3, ...]
│
├── sportPassport: Soccer (passportId: "sp_soccer")
│   ├── ageGroup: U12
│   ├── primaryPosition: "midfielder"
│   ├── currentOverallRating: 4.0
│   └── skillAssessments: [first_touch: 4, passing: 5, dribbling: 4, ...]
│
└── fitnessAssessments: [speed: 4, agility: 5, endurance: 4, ...]
```

### 6.2 Cross-Sport Skill Transfer

Some skills transfer between sports. The `transfersTo` field in `skillDefinitions` captures this:

```typescript
// Example: Passing transfers across sports
{
  sportCode: "soccer",
  code: "short_passing",
  transfersTo: [
    { sportCode: "gaa_football", skillCode: "hand_pass", transferWeight: 0.6 },
    { sportCode: "rugby_union", skillCode: "pop_pass", transferWeight: 0.5 },
  ]
}

// Example: Tackling transfers
{
  sportCode: "rugby_union",
  code: "tackle_technique",
  transfersTo: [
    { sportCode: "gaa_football", skillCode: "tackling", transferWeight: 0.7 },
  ]
}
```

### 6.3 UI Handling

```typescript
// In Player Passport page
const passports = useQuery(api.players.getPlayerPassports, { playerId });

if (passports.length === 1) {
  // Single sport: Show standard passport view
  return <SingleSportPassport passport={passports[0]} />;
}

if (passports.length > 1) {
  // Multi-sport: Show tabbed interface
  return (
    <Tabs defaultValue={passports[0].sportCode}>
      <TabsList>
        {passports.map(p => (
          <TabsTrigger key={p.sportCode} value={p.sportCode}>
            {getSportName(p.sportCode)}
          </TabsTrigger>
        ))}
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>
      {passports.map(p => (
        <TabsContent key={p.sportCode} value={p.sportCode}>
          <SingleSportPassport passport={p} />
        </TabsContent>
      ))}
      <TabsContent value="overview">
        <CrossSportOverview passports={passports} />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 7. Benchmark Integration

### 7.1 Benchmark Sources by Sport

| Sport | Source | Framework | Document |
|-------|--------|-----------|----------|
| Soccer | FAI | Player Development Plan | [FAI PDP](https://www.fai.ie/play-and-participate/football-pathways-plan/) |
| Rugby | IRFU | LTPD / 5 Capacities | [IRFU LTPD](https://www.irishrugby.ie/2007/06/14/long-term-player-development/) |
| GAA | GAA | Gaelic Games Player Pathway | [GAA Pathway](https://learning.gaa.ie/playerpathway) |

### 7.2 Benchmark Comparison Logic

```typescript
function getBenchmarkStatus(
  rating: number,
  benchmark: Benchmark
): "below" | "developing" | "on_track" | "exceeding" | "exceptional" {
  if (rating >= benchmark.excellentThreshold) return "exceptional";
  if (rating >= benchmark.expectedRating) return "exceeding";
  if (rating >= benchmark.developingThreshold) return "on_track";
  if (rating >= benchmark.minAcceptable) return "developing";
  return "below";
}

function getBenchmarkColor(status: string): string {
  switch (status) {
    case "exceptional": return "text-blue-600 bg-blue-50";
    case "exceeding": return "text-green-600 bg-green-50";
    case "on_track": return "text-lime-600 bg-lime-50";
    case "developing": return "text-yellow-600 bg-yellow-50";
    case "below": return "text-red-600 bg-red-50";
  }
}
```

### 7.3 Benchmark Display

```typescript
// In skill assessment display
<div className="flex items-center gap-2">
  <span className="font-medium">{skill.name}</span>
  <Badge variant={getBenchmarkColor(benchmarkStatus)}>
    {rating}/5 ({benchmarkStatus})
  </Badge>
  {benchmarkDelta !== 0 && (
    <span className={benchmarkDelta > 0 ? "text-green-600" : "text-red-600"}>
      {benchmarkDelta > 0 ? "+" : ""}{benchmarkDelta.toFixed(1)} vs benchmark
    </span>
  )}
</div>
```

---

## 8. Knowledge Graph Preparation

### 8.1 Entity Types

```typescript
type GraphEntityType =
  | "player"           // Individual athlete
  | "skill"            // Skill definition
  | "skill_assessment" // Point-in-time rating
  | "sport"            // Sport configuration
  | "category"         // Skill category
  | "team"             // Team
  | "coach"            // Coach user
  | "organization"     // Club/organization
  | "benchmark"        // NGB benchmark
  | "goal"             // Development goal
  | "session"          // Training session
  | "match";           // Match/game
```

### 8.2 Relationship Types

```typescript
type GraphRelationship =
  // Player relationships
  | { type: "PLAYS_SPORT"; from: "player"; to: "sport"; since?: string }
  | { type: "HAS_SKILL"; from: "player"; to: "skill"; rating: number; date: string }
  | { type: "PLAYS_FOR"; from: "player"; to: "team"; position?: string }
  | { type: "COACHED_BY"; from: "player"; to: "coach"; sport?: string }
  | { type: "MEMBER_OF"; from: "player"; to: "organization" }

  // Skill relationships
  | { type: "PREREQUISITE_FOR"; from: "skill"; to: "skill"; strength: number }
  | { type: "RELATED_TO"; from: "skill"; to: "skill"; strength: number }
  | { type: "TRANSFERS_TO"; from: "skill"; to: "skill"; weight: number }
  | { type: "BELONGS_TO"; from: "skill"; to: "category" }

  // Assessment relationships
  | { type: "IMPROVED_FROM"; from: "assessment"; to: "assessment"; delta: number }
  | { type: "MEETS_BENCHMARK"; from: "assessment"; to: "benchmark"; status: string }

  // Derived relationships (computed)
  | { type: "SIMILAR_PROFILE"; from: "player"; to: "player"; similarity: number }
  | { type: "RECOMMENDED_FOCUS"; from: "player"; to: "skill"; priority: number };
```

### 8.3 Graph Query Examples

```typescript
// Find players with similar skill profiles
export const findSimilarPlayers = query({
  args: {
    playerId: v.id("players"),
    sportCode: v.string(),
    minSimilarity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const targetAssessments = await getLatestAssessments(ctx, args.playerId, args.sportCode);
    const targetVector = assessmentsToVector(targetAssessments);

    // Find all players in same sport/age group
    const candidates = await getCandidatePlayers(ctx, args.sportCode);

    // Calculate similarity scores
    const similarities = candidates.map(player => ({
      player,
      similarity: cosineSimilarity(targetVector, player.skillVector),
    }));

    return similarities
      .filter(s => s.similarity >= (args.minSimilarity || 0.7))
      .sort((a, b) => b.similarity - a.similarity);
  },
});

// Recommend skills to focus on based on benchmark gaps
export const getRecommendedFocusAreas = query({
  args: {
    passportId: v.id("sportPassports"),
  },
  handler: async (ctx, args) => {
    const passport = await ctx.db.get(args.passportId);
    const assessments = await getLatestAssessments(ctx, passport.playerId, passport.sportCode);
    const benchmarks = await getBenchmarksForContext(ctx, passport);

    // Find skills below benchmark
    const gaps = assessments
      .map(a => {
        const benchmark = benchmarks.find(b => b.skillCode === a.skillCode);
        if (!benchmark) return null;
        return {
          skillCode: a.skillCode,
          gap: benchmark.expectedRating - a.rating,
          priority: calculatePriority(a, benchmark),
        };
      })
      .filter(g => g && g.gap > 0)
      .sort((a, b) => b.priority - a.priority);

    return gaps.slice(0, 5); // Top 5 focus areas
  },
});
```

### 8.4 Future Graph Database Migration

```
Phase 1: Relational (Current - Convex)
├── All data in Convex tables
├── Relationships via foreign keys and denormalization
├── Queries compute relationships on-demand
└── Works for <100k players

Phase 2: Hybrid (Mid-term)
├── Core transactional data in Convex
├── Add graphRelationships table for precomputed relationships
├── Background jobs compute and update relationships
├── Query from cache for insights
└── Works for 100k-1M players

Phase 3: Full Graph (Long-term)
├── Core identity/transactional data in Convex
├── Neo4j or Amazon Neptune for relationship queries
├── Sync via Convex actions/webhooks
├── Advanced graph algorithms (PageRank, community detection)
├── Real-time recommendations and insights
└── Works for 1M+ players with complex queries
```

---

## 9. Seed Data: Initial Sport Configuration

### 9.1 Soccer Skills (FAI-aligned)

```typescript
const soccerCategories = [
  { code: "technical_ball_mastery", name: "Ball Mastery", domain: "technical", displayOrder: 1 },
  { code: "technical_passing", name: "Passing & Distribution", domain: "technical", displayOrder: 2 },
  { code: "technical_shooting", name: "Shooting & Finishing", domain: "technical", displayOrder: 3 },
  { code: "tactical", name: "Tactical Awareness", domain: "tactical", displayOrder: 4 },
  { code: "physical", name: "Physical Attributes", domain: "physical", displayOrder: 5 },
  { code: "mental", name: "Mental & Character", domain: "mental", displayOrder: 6 },
];

const soccerSkills = [
  // Ball Mastery (5 skills)
  { category: "technical_ball_mastery", code: "first_touch", name: "First Touch", isCore: true },
  { category: "technical_ball_mastery", code: "ball_control", name: "Ball Control", isCore: true },
  { category: "technical_ball_mastery", code: "ball_control_pressure", name: "Ball Control Under Pressure", isCore: false },
  { category: "technical_ball_mastery", code: "dribbling", name: "Dribbling", isCore: true },
  { category: "technical_ball_mastery", code: "turns_feints", name: "Turns & Feints", isCore: false },

  // Passing (4 skills)
  { category: "technical_passing", code: "short_passing", name: "Short Passing", isCore: true },
  { category: "technical_passing", code: "long_passing", name: "Long Passing", isCore: false },
  { category: "technical_passing", code: "through_balls", name: "Through Balls", isCore: false },
  { category: "technical_passing", code: "crossing", name: "Crossing", isCore: false },

  // Shooting (4 skills)
  { category: "technical_shooting", code: "finishing", name: "Finishing", isCore: true },
  { category: "technical_shooting", code: "shot_power", name: "Shot Power", isCore: false },
  { category: "technical_shooting", code: "shot_accuracy", name: "Shot Accuracy", isCore: true },
  { category: "technical_shooting", code: "heading", name: "Heading", isCore: false },

  // Tactical (5 skills)
  { category: "tactical", code: "positioning", name: "Positioning", isCore: true },
  { category: "tactical", code: "off_ball_movement", name: "Off-Ball Movement", isCore: false },
  { category: "tactical", code: "decision_making", name: "Decision Making", isCore: true },
  { category: "tactical", code: "game_awareness", name: "Game Awareness", isCore: true },
  { category: "tactical", code: "defensive_awareness", name: "Defensive Awareness", isCore: false },

  // Physical (4 skills)
  { category: "physical", code: "speed", name: "Speed", isCore: true },
  { category: "physical", code: "agility", name: "Agility", isCore: true },
  { category: "physical", code: "strength", name: "Strength", isCore: false },
  { category: "physical", code: "endurance", name: "Endurance", isCore: false },

  // Mental (4 skills)
  { category: "mental", code: "communication", name: "Communication", isCore: true },
  { category: "mental", code: "coachability", name: "Coachability", isCore: true },
  { category: "mental", code: "leadership", name: "Leadership", isCore: false },
  { category: "mental", code: "resilience", name: "Resilience", isCore: false },
];
```

### 9.2 Rugby Skills (IRFU-aligned)

```typescript
const rugbyCategories = [
  { code: "passing_handling", name: "Passing & Handling", domain: "technical", displayOrder: 1 },
  { code: "catching_receiving", name: "Catching & Receiving", domain: "technical", displayOrder: 2 },
  { code: "running_evasion", name: "Running & Evasion", domain: "technical", displayOrder: 3 },
  { code: "kicking", name: "Kicking", domain: "technical", displayOrder: 4 },
  { code: "contact_breakdown", name: "Contact & Breakdown", domain: "technical", displayOrder: 5 },
  { code: "tactical", name: "Tactical & Game Awareness", domain: "tactical", displayOrder: 6 },
  { code: "physical", name: "Physical Attributes", domain: "physical", displayOrder: 7 },
];

// Similar structure for rugby skills...
```

### 9.3 GAA Football Skills (GAA-aligned)

```typescript
const gaaFootballCategories = [
  { code: "ball_handling", name: "Ball Handling & Control", domain: "technical", displayOrder: 1 },
  { code: "passing_kicking", name: "Passing & Kicking", domain: "technical", displayOrder: 2 },
  { code: "catching", name: "Catching & Fielding", domain: "technical", displayOrder: 3 },
  { code: "scoring", name: "Scoring Skills", domain: "technical", displayOrder: 4 },
  { code: "defending", name: "Defending", domain: "technical", displayOrder: 5 },
  { code: "tactical", name: "Tactical Awareness", domain: "tactical", displayOrder: 6 },
  { code: "physical", name: "Physical Attributes", domain: "physical", displayOrder: 7 },
];

const gaaSkills = [
  // Ball Handling (4 skills)
  { category: "ball_handling", code: "solo", name: "Solo Run", isCore: true },
  { category: "ball_handling", code: "toe_tap", name: "Toe Tap / Bounce", isCore: true },
  { category: "ball_handling", code: "pick_up", name: "Pick Up", isCore: true },
  { category: "ball_handling", code: "ball_control", name: "Ball Control", isCore: true },

  // Passing & Kicking (3 skills)
  { category: "passing_kicking", code: "hand_pass", name: "Hand Pass", isCore: true },
  { category: "passing_kicking", code: "kick_pass", name: "Kick Pass", isCore: true },
  { category: "passing_kicking", code: "long_kick", name: "Long Kicking", isCore: false },

  // And so on...
];
```

---

## 10. Implementation Strategy

### 10.1 Phase 1: Reference Data (Week 1)

**Tasks:**
1. Create `sports` table and seed with Soccer, Rugby, GAA Football, GAA Hurling
2. Create `skillCategories` table and seed per sport
3. Create `skillDefinitions` table and seed all skills
4. Create `positionsBySport` table and seed
5. Create `ageGroupConfig` table with defaults

**Validation:**
- All sports have complete skill hierarchies
- Display order is correct
- Skills map to existing MVP skill keys

### 10.2 Phase 2: Player Passports (Week 2)

**Tasks:**
1. Create `sportPassports` table
2. Create `skillAssessments` table
3. Create `fitnessAssessments` table
4. Migrate existing `players.skills` to `skillAssessments`
5. Migrate existing `players.fitness` to `fitnessAssessments`

**Migration Script:**
```typescript
// For each player with skills
const passport = await createSportPassport({
  playerId: player._id,
  sportCode: player.sport,
  organizationId: player.organizationId,
  status: "active",
});

// Convert skills record to individual assessments
for (const [skillCode, rating] of Object.entries(player.skills)) {
  await createSkillAssessment({
    passportId: passport._id,
    playerId: player._id,
    sportCode: player.sport,
    skillCode,
    rating,
    assessmentDate: player.lastReviewDate || new Date().toISOString(),
    assessmentType: "import",
    assessedBy: "system",
  });
}
```

### 10.3 Phase 3: UI Updates (Week 3)

**Tasks:**
1. Update Player Passport page to read from new structure
2. Add multi-sport tab interface
3. Update skill edit forms to write to `skillAssessments`
4. Add benchmark comparison display
5. Add skill history/progression view

### 10.4 Phase 4: Benchmarks (Week 4)

**Tasks:**
1. Create `benchmarks` table
2. Seed benchmark data (start with Soccer/FAI)
3. Build benchmark comparison queries
4. Add benchmark indicators to UI
5. Create benchmark report view

### 10.5 Phase 5: Knowledge Graph Prep (Week 5+)

**Tasks:**
1. Add `skillRelationships` table (prerequisite, transfer)
2. Create similarity computation queries
3. Build recommendation engine for focus areas
4. Add "Similar Players" feature
5. Add "Skill Progression Insights" feature

---

## 11. API Design

### 11.1 Core Queries

```typescript
// Reference data
getSports(): Sport[]
getSkillCategories(sportCode): SkillCategory[]
getSkillDefinitions(sportCode, categoryCode?): SkillDefinition[]
getPositions(sportCode): Position[]
getBenchmarks(sportCode, ageGroup, gender?, level?): Benchmark[]

// Player passports
getPlayerPassports(playerId): SportPassport[]
getPlayerPassport(playerId, sportCode): SportPassport
getLatestSkillAssessments(passportId): SkillAssessment[]
getSkillHistory(passportId, skillCode, limit?): SkillAssessment[]
getSkillProgression(passportId): ProgressionData[]

// Comparison & insights
getBenchmarkComparison(passportId): BenchmarkComparison[]
getRecommendedFocusAreas(passportId, limit?): FocusArea[]
findSimilarPlayers(passportId, minSimilarity?): SimilarPlayer[]
getCrossSportInsights(playerId): CrossSportInsight[]
```

### 11.2 Core Mutations

```typescript
// Passport management
createSportPassport(playerId, sportCode, organizationId, initialData?)
updatePassportPositions(passportId, positions)
archiveSportPassport(passportId)

// Skill assessments
createSkillAssessment(passportId, skillCode, rating, type, notes?)
batchCreateSkillAssessments(passportId, assessments[], type)
updateSkillAssessment(assessmentId, rating, notes?)

// Fitness
createFitnessAssessment(playerId, data)
```

---

## 12. Success Criteria

### 12.1 Functional Requirements

- [ ] Players can have multiple sport passports
- [ ] Skills are hierarchically organized by sport → category → skill
- [ ] All skill assessments are temporal with history
- [ ] Benchmarks can be loaded and compared against
- [ ] Cross-sport skill transfer is modeled
- [ ] UI supports multi-sport players with tabs
- [ ] Backward compatible with existing player data
- [ ] PDF export works with new structure

### 12.2 Performance Requirements

- [ ] Passport page loads < 2s (including all sports)
- [ ] Skill history query < 500ms for 100 assessments
- [ ] Benchmark comparison < 200ms
- [ ] Batch skill update (20 skills) < 1s
- [ ] Similar player search < 3s

### 12.3 Data Quality

- [ ] 100% of existing skills mapped to new definitions
- [ ] All assessments have valid dates
- [ ] No orphan assessments (passportId always valid)
- [ ] Benchmarks have source attribution

---

## 13. Open Questions

1. **Benchmark Sourcing**: How do we get official benchmark data from NGBs?
2. **Assessment Frequency**: What's the recommended cadence per age group?
3. **Historical Retention**: How long do we keep assessment history?
4. **Cross-Org Benchmarks**: Global benchmarks vs organization-specific?
5. **Self-Assessment Weight**: How should player self-assessments factor in?
6. **Coach Credentials**: Should assessor qualifications affect weighting?
7. **Graph DB Timing**: When is the data volume sufficient for dedicated graph DB?

---

## 14. Related Documents

- [PLAYER_PASSPORT_ANALYSIS.md](./PLAYER_PASSPORT_ANALYSIS.md) - Original MVP analysis
- [PARENT_DASHBOARD_ANALYSIS.md](./PARENT_DASHBOARD_ANALYSIS.md) - Parent view requirements
- [COMPREHENSIVE_AUTH_PLAN.md](./COMPREHENSIVE_AUTH_PLAN.md) - Section 12-13 (Knowledge Graph)
- [AUTH_IMPLEMENTATION_LOG.md](./AUTH_IMPLEMENTATION_LOG.md) - Implementation progress

---

## 15. References

### Industry Frameworks
- [Long-Term Athlete Development (LTAD) Model](https://sportforlife.ca/long-term-development/)
- [FTEM Framework (Australia)](https://www.ais.gov.au/ftem)

### Irish Governing Bodies
- [FAI Football Pathways Plan](https://www.fai.ie/play-and-participate/football-pathways-plan/)
- [IRFU Long Term Player Development](https://www.irishrugby.ie/2007/06/14/long-term-player-development/)
- [GAA Player Pathway](https://learning.gaa.ie/playerpathway)

### Technical Resources
- [Graph Databases for Pro Sports](https://graphable.ai/blog/graph-databases-for-pro-sports/)
- [Assessment in Youth Sport Best Practices](https://pmc.ncbi.nlm.nih.gov/articles/PMC3919511/)
- [Sports School Data Model](https://vertabelo.com/blog/a-sports-school-data-model/)
- [Skills Taxonomy Guide](https://365talents.com/en/resources/your-comprehensive-guide-to-skills-taxonomy/)

---

## 16. Next Steps

1. **Review and approve** this architecture with stakeholders
2. **Prioritize** initial sports (recommend: Soccer first, then GAA, then Rugby)
3. **Create seed data** for skill definitions
4. **Contact NGBs** for benchmark data or use internal estimates
5. **Begin Phase 1** schema implementation
6. **Create detailed tickets** for each phase
