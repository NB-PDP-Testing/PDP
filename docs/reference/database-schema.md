# Existing Schema Documentation

This document provides a comprehensive review of the current Convex schema, table purposes, data flows, and relationships. This is essential reading before implementing the proposed Platform-Level Identity Architecture documented in `PLAYER_PASSPORT_ARCHITECTURE.md`.

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Better Auth Tables](#2-better-auth-tables)
3. [Application Tables](#3-application-tables)
4. [Data Relationships](#4-data-relationships)
5. [Current Data Flows](#5-current-data-flows)
6. [Parent-Player Linking (Current)](#6-parent-player-linking-current)
7. [Migration Considerations](#7-migration-considerations)
8. [Decisions Required](#8-decisions-required)

---

## 1. Schema Overview

The application uses two schema sources:

1. **Better Auth Schema** (`packages/backend/convex/betterAuth/schema.ts`)
   - Extended from auto-generated Better Auth tables
   - Handles authentication, sessions, organizations, members, teams, invitations

2. **Application Schema** (`packages/backend/convex/schema.ts`)
   - Custom application tables
   - Players, injuries, goals, voice notes, etc.

### Schema Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BETTER AUTH TABLES                        │
│  (Authentication & Organization Layer)                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│    user      │   session    │   account    │  verification  │
│              │              │              │     jwks       │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                    ORGANIZATION LAYER                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ organization │    member    │     team     │  invitation    │
│              │              │  teamMember  │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION TABLES                         │
│  (Sports Club Data)                                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   players    │  teamPlayers │   injuries   │developmentGoals│
├──────────────┼──────────────┼──────────────┼────────────────┤
│medicalProfile│  coachAssign │  teamGoals   │  voiceNotes    │
├──────────────┼──────────────┼──────────────┼────────────────┤
│orgJoinRequest│approvalAction│coachInsight  │orgDeletionReq  │
│              │              │  Prefs       │                │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                       OTHER                                  │
├──────────────┬──────────────────────────────────────────────┤
│    todos     │              demoAsks                        │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 2. Better Auth Tables

### 2.1 User Table (Extended)

**File:** `packages/backend/convex/betterAuth/schema.ts`

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"user">` | Better Auth user ID |
| `name` | `string` | Display name |
| `email` | `string` | Email address (login) |
| `emailVerified` | `boolean` | Email verification status |
| `image` | `string?` | Profile image URL |
| `createdAt` | `number` | Account creation timestamp |
| `updatedAt` | `number` | Last update timestamp |
| `userId` | `string?` | External user ID (if any) |
| **Custom Fields:** | | |
| `isPlatformStaff` | `boolean?` | Platform staff flag |
| `firstName` | `string?` | First name |
| `lastName` | `string?` | Last name |
| `phone` | `string?` | Phone number |
| `onboardingComplete` | `boolean?` | Onboarding status |
| `currentOrgId` | `string?` | Active organization ID |

**Indexes:**
- `email_name` - [email, name]
- `name` - [name]
- `userId` - [userId]

**Key Flows:**
- User registration and login
- Profile management
- Platform staff identification
- Active organization tracking

---

### 2.2 Organization Table (Extended)

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"organization">` | Organization ID |
| `name` | `string` | Organization name |
| `slug` | `string` | URL slug |
| `logo` | `string?` | Logo URL |
| `createdAt` | `number` | Creation timestamp |
| `metadata` | `string?` | JSON metadata |
| **Custom Fields:** | | |
| `colors` | `string[]?` | Club colors (hex codes) |
| `socialFacebook` | `string?` | Facebook URL |
| `socialTwitter` | `string?` | Twitter URL |
| `socialInstagram` | `string?` | Instagram URL |
| `socialLinkedin` | `string?` | LinkedIn URL |
| `website` | `string?` | Website URL |

**Indexes:**
- `name` - [name]
- `slug` - [slug]

**Key Flows:**
- Organization creation
- Theme/branding configuration
- Social links management

---

### 2.3 Member Table (Extended)

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"member">` | Member ID |
| `organizationId` | `string` | Organization reference |
| `userId` | `string` | User reference |
| `role` | `string` | Better Auth role (owner/admin/member) |
| `createdAt` | `number` | Join timestamp |
| **Custom Fields:** | | |
| `functionalRoles` | `("coach"│"parent"│"admin")[]?` | Capabilities array |
| `activeFunctionalRole` | `"coach"│"parent"│"admin"?` | Currently active role |
| `pendingFunctionalRoleRequests` | `array?` | Pending role requests |

**Indexes:**
- `organizationId` - [organizationId]
- `userId` - [userId]
- `role` - [role]
- `organizationId_userId` - [organizationId, userId]

**Key Flows:**
- Organization membership
- Role assignment and switching
- Functional role requests

---

### 2.4 Team Table (Extended)

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"team">` | Team ID |
| `name` | `string` | Team name |
| `organizationId` | `string` | Organization reference |
| `createdAt` | `number` | Creation timestamp |
| `updatedAt` | `number?` | Last update |
| **Custom Fields:** | | |
| `sport` | `string?` | Sport type |
| `ageGroup` | `string?` | Age group (U12, U14, etc.) |
| `gender` | `"Boys"│"Girls"│"Mixed"?` | Team gender |
| `season` | `string?` | Season (2025, etc.) |
| `description` | `string?` | Team description |
| `trainingSchedule` | `string?` | Training times |
| `homeVenue` | `string?` | Home ground |
| `isActive` | `boolean?` | Active status |

**Indexes:**
- `organizationId` - [organizationId]
- `sport` - [sport]
- `ageGroup` - [ageGroup]
- `season` - [season]
- `isActive` - [isActive]

**Key Flows:**
- Team creation and management
- Player assignment to teams
- Coach assignment to teams

---

### 2.5 Other Better Auth Tables

| Table | Purpose |
|-------|---------|
| `session` | User session management |
| `account` | OAuth/credential accounts |
| `verification` | Email/phone verification tokens |
| `jwks` | JSON Web Key Store |
| `teamMember` | Better Auth team membership (junction) |
| `invitation` | Organization invitations |

---

## 3. Application Tables

### 3.1 Players Table

**File:** `packages/backend/convex/schema.ts`

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"players">` | Player ID |
| `name` | `string` | Player full name |
| `ageGroup` | `string` | Age group |
| `sport` | `string` | Primary sport |
| `gender` | `string` | Gender |
| `organizationId` | `string` | **Org-scoped** - belongs to one org |
| `season` | `string` | Current season |
| `completionDate` | `string?` | PDP completion date |
| **Review Tracking:** | | |
| `reviewedWith` | `object?` | Review participants |
| `reviewStatus` | `enum?` | Review status |
| `lastReviewDate` | `string?` | Last review date |
| `nextReviewDue` | `string?` | Next review due |
| **Attendance:** | | |
| `attendance` | `object?` | Training/match attendance |
| **Skills:** | | |
| `skills` | `Record<string, number>` | Skill ratings |
| **Positions:** | | |
| `positions` | `object?` | Position preferences |
| **Fitness:** | | |
| `fitness` | `object?` | Fitness metrics |
| **Notes:** | | |
| `injuryNotes` | `string?` | Injury notes |
| `coachNotes` | `string?` | Coach observations |
| `parentNotes` | `string?` | Parent notes |
| `playerNotes` | `string?` | Player self-assessment |
| `seasonReviews` | `any[]?` | Historical reviews |
| **Contact/Family:** | | |
| `familyId` | `string?` | Family grouping ID |
| `parentFirstName` | `string?` | Primary parent first name |
| `parentSurname` | `string?` | Primary parent surname |
| `parentEmail` | `string?` | **Primary parent email (used for linking)** |
| `parentEmails` | `string[]?` | Additional parent emails |
| `parentPhone` | `string?` | Primary parent phone |
| `parents` | `array?` | **Full parent profiles array** |
| `dateOfBirth` | `string?` | Date of birth |
| `address` | `string?` | Address |
| `town` | `string?` | Town |
| `postcode` | `string?` | Postcode |
| **Inferred Data (from imports):** | | |
| `inferredParentFirstName` | `string?` | Inferred from membership |
| `inferredParentSurname` | `string?` | Inferred from membership |
| `inferredParentEmail` | `string?` | Inferred from membership |
| `inferredParentPhone` | `string?` | Inferred from membership |
| `inferredFromSource` | `string?` | Import source |
| `createdFrom` | `string?` | Creation source |

**Indexes:**
- `by_organizationId` - [organizationId]
- `by_sport` - [sport]
- `by_ageGroup` - [ageGroup]
- `by_familyId` - [familyId]
- `by_parentEmail` - [parentEmail]
- `by_inferredParentEmail` - [inferredParentEmail]

**Search Indexes:**
- `name_search` - Full text search on name
- `address_search` - Full text search on address

**Key Issue for Migration:**
> **Players are organization-scoped.** A player in Club A is a completely separate record from the same child in Club B. Parent information is **embedded** in the player record, not normalized.

---

### 3.2 Parents Array Schema (Embedded in Players)

```typescript
parents: v.optional(
  v.array(
    v.object({
      id: v.string(),           // UUID generated client-side
      firstName: v.string(),
      surname: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      relationship: v.optional(v.string()),  // "mother", "father", "guardian"
      isPrimary: v.optional(v.boolean()),
    })
  )
)
```

**Key Issue for Migration:**
> Parent data is **duplicated** across player records. Same parent with children in different teams/orgs has their data stored multiple times.

---

### 3.3 TeamPlayers Table (Junction)

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"teamPlayers">` | Link ID |
| `teamId` | `string` | Team reference |
| `playerId` | `Id<"players">` | Player reference |
| `createdAt` | `number` | Creation timestamp |

**Indexes:**
- `by_teamId` - [teamId]
- `by_playerId` - [playerId]

**Purpose:** Links players to teams (many-to-many within organization).

---

### 3.4 CoachAssignments Table

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | `Id<"coachAssignments">` | Assignment ID |
| `userId` | `string` | Better Auth user ID |
| `organizationId` | `string` | Organization reference |
| `teams` | `string[]` | Team names/IDs assigned |
| `ageGroups` | `string[]` | Age groups coached |
| `sport` | `string?` | Primary sport |
| `roles` | `string[]?` | Additional roles |
| `createdAt` | `number` | Creation timestamp |
| `updatedAt` | `number` | Last update |

**Indexes:**
- `by_user_and_org` - [userId, organizationId]
- `by_organizationId` - [organizationId]

**Purpose:** Maps coaches to their team assignments within an organization.

---

### 3.5 Injuries Table

| Field | Type | Purpose |
|-------|------|---------|
| `playerId` | `Id<"players">` | Player reference |
| `injuryType` | `string` | Type of injury |
| `bodyPart` | `string` | Affected body part |
| `dateOccurred` | `string` | Injury date |
| `severity` | `"Minor"│"Moderate"│"Severe"` | Severity level |
| `status` | `"Active"│"Recovering"│"Healed"` | Current status |
| `returnToPlayProtocol` | `array` | Recovery steps |
| `coachNotes` | `array` | Coach notes on injury |

**Indexes:**
- `by_playerId` - [playerId]
- `by_status` - [status]
- `by_severity` - [severity]

---

### 3.6 DevelopmentGoals Table

| Field | Type | Purpose |
|-------|------|---------|
| `playerId` | `Id<"players">` | Player reference |
| `title` | `string` | Goal title |
| `description` | `string` | Goal description |
| `category` | `"Technical"│"Physical"│"Mental"│"Team"` | Category |
| `priority` | `"High"│"Medium"│"Low"` | Priority level |
| `status` | `"Not Started"│"In Progress"│"Completed"│"On Hold"` | Status |
| `progress` | `number` | Progress percentage |
| `linkedSkills` | `string[]` | Related skills |
| `milestones` | `array` | Goal milestones |
| `parentActions` | `string[]` | Parent action items |
| `coachNotes` | `array` | Coach notes |
| `playerNotes` | `array` | Player notes |

**Indexes:**
- `by_playerId` - [playerId]
- `by_status` - [status]
- `by_priority` - [priority]

---

### 3.7 MedicalProfiles Table

| Field | Type | Purpose |
|-------|------|---------|
| `playerId` | `Id<"players">` | Player reference |
| `bloodType` | `string?` | Blood type |
| `allergies` | `string[]` | Known allergies |
| `medications` | `string[]` | Current medications |
| `conditions` | `string[]` | Medical conditions |
| `emergencyContact1Name` | `string` | Emergency contact 1 |
| `emergencyContact1Phone` | `string` | Emergency contact 1 phone |
| `emergencyContact2Name` | `string?` | Emergency contact 2 |
| `emergencyContact2Phone` | `string?` | Emergency contact 2 phone |

**Indexes:**
- `by_playerId` - [playerId]

---

### 3.8 TeamGoals Table

| Field | Type | Purpose |
|-------|------|---------|
| `teamId` | `string` | Team reference |
| `organizationId` | `string` | Organization reference |
| `title` | `string` | Goal title |
| `category` | `enum` | Goal category |
| `status` | `enum` | Status |
| `progress` | `number` | Progress percentage |

**Indexes:**
- `by_teamId` - [teamId]
- `by_organizationId` - [organizationId]
- `by_status` - [status]

---

### 3.9 VoiceNotes Table

| Field | Type | Purpose |
|-------|------|---------|
| `orgId` | `string` | Organization reference |
| `coachId` | `string?` | Coach user ID |
| `date` | `string` | Recording date |
| `type` | `"training"│"match"│"general"` | Note type |
| `audioStorageId` | `Id<"_storage">?` | Audio file reference |
| `transcription` | `string?` | Transcribed text |
| `transcriptionStatus` | `enum?` | Transcription status |
| `summary` | `string?` | AI summary |
| `insights` | `array` | AI-generated insights |
| `insightsStatus` | `enum?` | Insights extraction status |

**Indexes:**
- `by_orgId` - [orgId]
- `by_orgId_and_coachId` - [orgId, coachId]

---

### 3.10 OrgJoinRequests Table

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `string` | Requesting user |
| `userEmail` | `string` | User email |
| `userName` | `string` | User name |
| `organizationId` | `string` | Target organization |
| `organizationName` | `string` | Organization name |
| `requestedRole` | `enum` | Better Auth role requested |
| `requestedFunctionalRoles` | `array?` | Functional roles requested |
| `status` | `"pending"│"approved"│"rejected"` | Request status |
| `message` | `string?` | Request message |
| **Parent-specific:** | | |
| `phone` | `string?` | Phone for matching |
| `address` | `string?` | Address for matching |
| `children` | `string?` | JSON: [{name, age, team?}] |
| **Coach-specific:** | | |
| `coachSport` | `string?` | Sport |
| `coachGender` | `string?` | Team gender preference |
| `coachTeams` | `string?` | Requested teams |
| `coachAgeGroups` | `string?` | Age groups |

**Indexes:**
- `by_userId` - [userId]
- `by_organizationId` - [organizationId]
- `by_status` - [status]
- `by_userId_and_organizationId` - [userId, organizationId]
- `by_organizationId_and_status` - [organizationId, status]

---

### 3.11 ApprovalActions Table (Audit)

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `string` | Affected user |
| `userEmail` | `string` | User email |
| `adminId` | `string` | Admin who acted |
| `action` | `"approved"│"rejected"│"unrejected"` | Action taken |
| `teamsAssigned` | `string[]?` | Teams assigned (coach) |
| `playersLinked` | `array?` | Players linked (parent) |
| `organizationId` | `string` | Organization reference |

---

### 3.12 CoachInsightPreferences Table

| Field | Type | Purpose |
|-------|------|---------|
| `coachId` | `string` | Coach user ID |
| `autoApproveEnabled` | `boolean` | Auto-approve AI insights |
| `autoApproveThreshold` | `number` | Confidence threshold |
| `preferredStyle` | `string` | Preferred insight style |
| `totalInsights` | `number` | Stats: total |
| `approvedCount` | `number` | Stats: approved |
| `rejectedCount` | `number` | Stats: rejected |
| `editedCount` | `number` | Stats: edited |
| `commonEdits` | `array` | Common edit patterns |

---

### 3.13 OrgDeletionRequests Table

| Field | Type | Purpose |
|-------|------|---------|
| `organizationId` | `string` | Organization to delete |
| `organizationName` | `string` | Name for reference |
| `requestedBy` | `string` | Owner user ID |
| `reason` | `string` | Deletion reason |
| `status` | `enum` | Workflow status |
| `dataSummary` | `object?` | Data counts at request time |

---

## 4. Data Relationships

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BETTER AUTH                                      │
│                                                                          │
│  ┌──────────┐    1:N    ┌──────────┐    N:1    ┌──────────────┐         │
│  │   user   │◄──────────│  member  │──────────►│ organization │         │
│  └────┬─────┘           └────┬─────┘           └──────┬───────┘         │
│       │                      │                        │                  │
│       │ 1:N                  │ custom:               │ 1:N              │
│       │                      │ functionalRoles       │                  │
│       ▼                      │ activeFunctionalRole  ▼                  │
│  ┌──────────┐               │ pendingRequests  ┌──────────┐            │
│  │ session  │               │                   │   team   │            │
│  └──────────┘               │                   └────┬─────┘            │
│                              │                        │                  │
└──────────────────────────────┼────────────────────────┼──────────────────┘
                               │                        │
                               │                        │
┌──────────────────────────────┼────────────────────────┼──────────────────┐
│                              │                        │                  │
│                              ▼                        ▼                  │
│  ┌───────────────────┐    ┌───────────────┐    ┌─────────────┐          │
│  │  coachAssignments │    │  teamPlayers  │◄───│   players   │          │
│  │  (userId, teams)  │    │  (teamId,     │    │  (org-scoped│          │
│  └───────────────────┘    │   playerId)   │    │  + embedded │          │
│                            └───────────────┘    │  parents)   │          │
│                                                 └──────┬──────┘          │
│                                                        │                 │
│                                                        │ 1:N             │
│                                                        ▼                 │
│                              ┌────────────────────────────────────┐      │
│                              │  injuries │ developmentGoals │     │      │
│                              │  medicalProfiles │ (etc.)         │      │
│                              └────────────────────────────────────┘      │
│                                                                          │
│                              APPLICATION TABLES                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Key Relationships

| From | To | Relationship | Notes |
|------|-----|--------------|-------|
| `user` | `member` | 1:N | User can be member of multiple orgs |
| `organization` | `member` | 1:N | Org has multiple members |
| `organization` | `team` | 1:N | Org has multiple teams |
| `organization` | `players` | 1:N | **Players are org-scoped** |
| `team` | `teamPlayers` | 1:N | Junction to players |
| `players` | `teamPlayers` | 1:N | Player can be on multiple teams |
| `players` | `injuries` | 1:N | Player injuries |
| `players` | `developmentGoals` | 1:N | Player goals |
| `players` | `medicalProfiles` | 1:1 | One medical profile |
| `user` (coach) | `coachAssignments` | 1:1 per org | Coach's team assignments |
| `organization` | `voiceNotes` | 1:N | Org voice notes |

---

## 5. Current Data Flows

### 5.1 Player Creation Flow

```
1. Admin imports players (GAA import, CSV, or manual)
   │
   ▼
2. createPlayerForImport() / bulkImportPlayers()
   │
   ├─► Player record created with:
   │   - organizationId (scoped to importing org)
   │   - Parent info embedded (parentEmail, parents[], etc.)
   │   - Skills, positions, fitness data
   │
   └─► teamPlayers junction created
       - Links player to team within same org
```

### 5.2 Parent-Player Linking Flow (Current)

```
1. Parent registers & joins organization
   │
   ▼
2. Parent submits join request with:
   - Children info (name, age)
   - Phone, address for matching
   │
   ▼
3. Admin reviews request
   │
   ├─► Smart matching: getSmartMatchesForParent()
   │   - Matches on email (50 pts)
   │   - Matches on child name (25-40 pts)
   │   - Matches on surname (25 pts)
   │   - Matches on phone (15 pts)
   │   - Matches on postcode/address (20 pts)
   │
   ▼
4. Admin approves with linkedPlayerIds
   │
   ▼
5. approveJoinRequest()
   - Creates member with functionalRoles: ["parent"]
   - Sets player.parentEmail = parent's email
   │
   ▼
6. Parent views children via getPlayersForParent()
   - Queries players WHERE parentEmail = user.email
   - OR inferredParentEmail = user.email
   - OR parentEmails includes user.email
   - OR parents[].email includes user.email
```

### 5.3 Coach Assignment Flow

```
1. Coach joins organization
   │
   ▼
2. Admin approves with coachTeams
   │
   ▼
3. coachAssignments record created
   - userId: coach's Better Auth ID
   - organizationId: org ID
   - teams: [team names/IDs]
   │
   ▼
4. Coach dashboard: getPlayersForCoach()
   - Gets coach's assigned teams
   - Gets players via teamPlayers junction
   - Returns only players from assigned teams
```

### 5.4 Role Switching Flow

```
1. User has multiple functionalRoles (e.g., ["coach", "parent"])
   │
   ▼
2. User clicks role in OrgRoleSwitcher
   │
   ▼
3. switchActiveFunctionalRole()
   - Updates member.activeFunctionalRole
   │
   ▼
4. Redirects to role-appropriate dashboard
   - /orgs/[orgId]/coach (if coach)
   - /orgs/[orgId]/parents (if parent)
   - /orgs/[orgId]/admin (if admin)
```

---

## 6. Parent-Player Linking (Current)

### 6.1 How Parents Currently Link to Children

The current system uses **email matching** to link parents to players:

1. **Direct parentEmail field:** Primary link field
2. **inferredParentEmail:** From membership imports
3. **parentEmails array:** Multiple parent emails
4. **parents[] embedded array:** Full parent profiles

### 6.2 Current Implementation Issues

| Issue | Impact | Example |
|-------|--------|---------|
| **Data duplication** | Same parent info stored multiple times | Parent with 3 kids = 3 copies of their contact info |
| **No cross-org visibility** | Parent can't see child across clubs | Child plays GAA and Soccer at different clubs |
| **Email-based linking only** | Fragile; email changes break links | Parent changes email, loses access |
| **No normalized guardian identity** | Can't update parent info centrally | Address change requires updating every player record |
| **Embedded arrays** | Hard to query, no referential integrity | Finding all players for a parent requires full table scan |

### 6.3 Parent Data Fields in Players Table

```typescript
// Current schema (problematic)
players: {
  // Legacy single-parent fields
  parentFirstName: v.optional(v.string()),
  parentSurname: v.optional(v.string()),
  parentEmail: v.optional(v.string()),      // Primary matching field
  parentPhone: v.optional(v.string()),

  // Multiple emails
  parentEmails: v.optional(v.array(v.string())),

  // Full embedded profiles
  parents: v.optional(v.array(v.object({
    id: v.string(),
    firstName: v.string(),
    surname: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  }))),

  // Inferred from imports
  inferredParentFirstName: v.optional(v.string()),
  inferredParentSurname: v.optional(v.string()),
  inferredParentEmail: v.optional(v.string()),
  inferredParentPhone: v.optional(v.string()),
}
```

### 6.4 Query Pattern for Parent's Children

**Current:** `getPlayersForParent` in `models/players.ts:275-334`

```typescript
// Current approach - scans all players in org
const allPlayers = await ctx.db
  .query("players")
  .withIndex("by_organizationId", ...)
  .collect();

// Filter by email match across multiple fields
const linkedPlayers = allPlayers.filter((player) => {
  if (player.parentEmail?.toLowerCase() === email) return true;
  if (player.inferredParentEmail?.toLowerCase() === email) return true;
  if (player.parentEmails?.some(e => e.toLowerCase() === email)) return true;
  if (player.parents?.some(p => p.email?.toLowerCase() === email)) return true;
  return false;
});
```

**Problem:** This requires loading ALL players for the organization, then filtering in memory.

---

## 7. Migration Considerations

### 7.1 Data That Needs Migration

| Current Location | Proposed Location | Migration Complexity |
|------------------|-------------------|---------------------|
| `players.parentEmail` | `guardianIdentities` | **Medium** - Need to deduplicate |
| `players.parents[]` | `guardianIdentities` + `guardianPlayerLinks` | **High** - Need to normalize embedded array |
| `players.inferredParent*` | `guardianIdentities` (with `unverified` status) | **Medium** |
| `players` (core fields) | `playerIdentities` + `orgPlayerEnrollments` | **High** - Split required |
| `players.skills, fitness, etc.` | `orgPlayerEnrollments` | Part of split |
| `coachAssignments` | No change | None |
| `member.functionalRoles` | No change | None |

### 7.2 What Can Stay As-Is

- Better Auth tables (user, organization, member, team)
- `coachAssignments`
- `injuries` (just needs foreign key update)
- `developmentGoals` (just needs foreign key update)
- `medicalProfiles` (needs decision - see below)
- `teamGoals`
- `voiceNotes`
- `orgJoinRequests` (may need enhancement for new model)
- Audit tables

### 7.3 Foreign Key Updates Required

After creating new identity tables:

```typescript
// Currently: injuries references players._id
injuries.playerId: Id<"players">

// After migration: needs to reference new table
injuries.playerEnrollmentId: Id<"orgPlayerEnrollments">
// OR
injuries.playerIdentityId: Id<"playerIdentities">  // If tracking across orgs
```

### 7.4 Medical Profile Decision

**Question:** Should medical profiles be:
1. **Platform-level** - Same allergies/conditions follow player across orgs?
2. **Organization-level** - Each club maintains their own medical records?
3. **Hybrid** - Core conditions at platform level, org-specific notes at org level?

**Recommendation:** Platform-level for safety-critical data (allergies, conditions), org-level for org-specific medical staff contacts.

---

## 8. Decisions Required

### 8.1 Critical Decisions Before Migration

| # | Decision | Options | Recommendation | Impact |
|---|----------|---------|----------------|--------|
| 1 | **Clean slate or migration?** | A) Delete test data, start fresh B) Migrate existing data | **A - Clean slate** (per user feedback) | Simplifies implementation |
| 2 | **Medical profile scope** | A) Platform-level B) Org-level C) Hybrid | **C - Hybrid** | Affects schema design |
| 3 | **Injury/goal scope** | A) Follow player identity B) Stay org-scoped | **B - Org-scoped** | Org owns their assessments |
| 4 | **Parent-to-guardian migration** | A) Auto-match by email B) Require re-registration | **A - Auto-match** | Preserves existing links |
| 5 | **Adult vs youth cutoff age** | A) 18 years B) Configurable per org | **A - 18 years** (legal adult) | Affects transition logic |

### 8.2 Implementation Phasing Questions

1. **Can we deploy new tables alongside old?**
   - Yes - new tables are additive, don't break existing functionality

2. **When do we switch reads to new tables?**
   - After data migration is verified complete

3. **How do we handle in-flight data during migration?**
   - Given clean slate approach, not applicable

4. **Do we need backwards-compatible APIs?**
   - For clean slate: No
   - For migration: Yes, temporarily

### 8.3 Frontend Impact Assessment

| Page/Component | Uses Current Schema | Changes Needed |
|----------------|---------------------|----------------|
| Player passport page | `players`, `injuries`, `developmentGoals` | Update to use new queries |
| Parent dashboard | `getPlayersForParent` | New query using `guardianIdentities` |
| Coach dashboard | `getPlayersForCoach` | Update to use enrollments |
| Admin player import | `bulkImportPlayers` | New import creating identities |
| Admin user approvals | `orgJoinRequests` | May need enhancement |
| Join request flow | `createJoinRequest` | Add identity linking |

---

## Summary

The current schema has several architectural limitations that the proposed Platform-Level Identity Architecture addresses:

1. **Players are org-scoped** - Same child is duplicated across organizations
2. **Parent data is embedded** - No normalized guardian identity
3. **Email-based linking is fragile** - Changes break relationships
4. **No cross-org visibility** - Parents can't see all children in one view
5. **No adult player support** - Schema assumes all players have guardians

The proposed migration to platform-level identities (`guardianIdentities`, `playerIdentities`, `guardianPlayerLinks`) with org-level enrollments (`orgGuardianProfiles`, `orgPlayerEnrollments`) resolves these issues while maintaining org-specific data ownership.

Given the small test population, a **clean slate approach** is recommended - delete existing test data and implement the new schema fresh, avoiding complex migration logic.
