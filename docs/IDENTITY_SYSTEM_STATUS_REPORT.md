# Identity System Status Report
*Generated: December 18, 2024*

## Executive Summary

This report provides a comprehensive analysis of:
1. Current implementation status of the Platform-Level Identity Architecture (Section 3.5)
2. Complete database schema documentation with table usage mapping
3. Legacy table migration status
4. Recommendations for completing the guardian identity claiming flow

---

## Part 1: Section 3.5 Guardian Identity Flow Analysis

### Architectural Design (from PLAYER_PASSPORT_ARCHITECTURE.md)

Section 3.5 describes the following flow:

**Scenario: Club imports GAA membership CSV with parent contact info**

1. Import creates `playerIdentity` for each child
2. Import creates `guardianIdentity` for each parent (from email/phone in CSV)
3. `guardianPlayerLinks` created to connect them
4. Guardian has **NO userId yet** (not registered)

**Later: Parent registers on platform**

5. Parent signs up with same email
6. System: **"We found your profile from Club A. Is this you?"**
7. Parent confirms → `userId` linked to existing `guardianIdentity`
8. Parent now has full dashboard access to their children

**Key Insight:** Guardian identity can exist without a registered user account.

---

## Current Implementation Status

### ✅ What's Implemented

#### 1. Guardian Identity Without userId

**Location:** `packages/backend/convex/models/guardianIdentities.ts:83-119`

```typescript
guardianIdentities: defineTable({
  userId: v.optional(v.string()), // Can be undefined initially
  verificationStatus: v.union(
    v.literal("unverified"),      // Created from import - NO userId yet
    v.literal("email_verified"),  // Email confirmed
    v.literal("id_verified")      // Full identity verified
  ),
  // ... other fields
})
```

**Status:** ✅ Fully implemented - guardians can exist without user accounts

#### 2. Import Creates Full Identity Graph

**Location:** `packages/backend/convex/models/playerImport.ts`

The `importPlayerWithIdentity` mutation creates the complete identity graph:

```typescript
// Step 1: Find or create player identity
const playerIdentityId = await findOrCreatePlayer(ctx, {
  firstName, lastName, dateOfBirth, gender
});

// Step 2: Find or create guardian identity from parent email
const guardianIdentityId = await findOrCreateGuardian(ctx, {
  firstName, lastName, email, phone
});

// Step 3: Create guardian-player link
await ctx.db.insert("guardianPlayerLinks", {
  guardianIdentityId,
  playerIdentityId,
  relationship: "guardian",
  isPrimary: true,
  consentedToSharing: false // Default to private
});

// Step 4: Create org enrollment
await ctx.db.insert("orgPlayerEnrollments", {
  playerIdentityId,
  organizationId,
  ageGroup,
  season,
  status: "active"
});
```

**Status:** ✅ Fully implemented - import creates unverified guardian identities

#### 3. Identity Linking Mutation

**Location:** `packages/backend/convex/models/guardianIdentities.ts:305-340`

```typescript
export const linkGuardianToUser = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate userId links
    const existingUserLink = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUserLink && existingUserLink._id !== args.guardianIdentityId) {
      throw new Error(
        "This user is already linked to another guardian identity"
      );
    }

    // Link the userId and update verification
    await ctx.db.patch(args.guardianIdentityId, {
      userId: args.userId,
      verificationStatus: "email_verified",
      updatedAt: Date.now(),
    });
  },
});
```

**Status:** ✅ Fully implemented - linking mechanism exists

#### 4. Smart Matching with Confidence Scoring

**Location:** `packages/backend/convex/models/guardianIdentities.ts:424-522`

```typescript
export const findMatchingGuardian = query({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Exact email match (highest confidence: 80-100)
    if (args.email) {
      const emailMatch = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first();

      if (emailMatch) {
        let confidence = 80;
        if (nameMatches(emailMatch, args)) confidence += 20;
        return { guardian: emailMatch, confidence, matchType: "email" };
      }
    }

    // 2. Phone match (confidence: 60-90)
    // 3. Name match (confidence: 40, needs review)
    // ...
  }
});
```

**Status:** ✅ Fully implemented - smart matching algorithm with confidence

#### 5. Auto-Linking Post-Join

**Location:** `packages/backend/convex/models/players.ts:1417-1494`

```typescript
export const autoLinkParentToChildren = mutation({
  args: {
    parentEmail: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Match against:
    // 1. player.parentEmail
    // 2. player.inferredParentEmail
    // 3. player.parentEmails array
    // 4. player.parents[].email array

    // Update matched players with parent email
  },
});
```

**Called in:** `syncFunctionalRolesFromInvitation` (members.ts:1106-1173)

**Status:** ✅ Implemented but only triggers when user joins org, not during signup

---

### ❌ What's Missing

#### 1. No Claiming UI Flow During Signup

**Location:** `apps/web/src/components/sign-up-form.tsx`

**Current behavior:**
- User fills out signup form (email, password, name)
- `authClient.signUp.email()` creates account
- Redirects to `/orgs/current` immediately
- **No check for existing guardianIdentity**

**Expected behavior (Section 3.5):**
- Check if email matches existing `guardianIdentity`
- If match found: Show dialog "We found your profile from [Club Name]. Is this you?"
- On confirmation: Link userId to guardianIdentity
- Show welcome: "You now have access to [Child Names]"

**Status:** ❌ Not implemented

#### 2. No Post-Signup Hook

**Location:** `packages/backend/convex/auth.ts:191-210`

```typescript
afterAddMember: async ({ member, user, organization }) => {
  // Note: Parent-player linking will happen when the user
  // accesses the parent dashboard or via the approval flow.
  if (user.email) {
    console.log(
      "[afterAddMember] User email available for potential parent linking:",
      user.email
    );
  }

  console.log("[afterAddMember] ✅ Hook complete");
},
```

**Current behavior:** Only logs potential, doesn't execute linking

**Expected behavior:** Automatically check for guardian identity matches and link

**Status:** ❌ Not implemented

#### 3. No Consent Prompts

**Location:** N/A (not implemented)

**Missing:**
- No UI asking guardian for `consentedToSharing` permission
- Flag exists in `guardianPlayerLinks` but not enforced
- No cross-org visibility settings in guardian dashboard

**Status:** ❌ Not implemented

---

## Part 2: Complete Database Schema Documentation

### Summary by Category

| Category | Table Count | Status |
|----------|-------------|--------|
| **Reference Data** | 5 | ✅ Active |
| **New Identity System (Platform)** | 4 | 🔄 In Progress |
| **New Identity System (Org)** | 2 | 🔄 In Progress |
| **Sport Passport & Skills** | 7 | 🔄 In Progress |
| **Legacy Tables** | 5 | ⚠️ Being Replaced |
| **Application Tables** | 9 | ✅ Active |
| **Total** | **32** | |

---

### Reference Data Tables (Platform-Wide)

#### 1. sports
- **Purpose:** Sport reference data (GAA Football, Soccer, Rugby)
- **Schema:** `code`, `name`, `governingBody`, `description`, `isActive`, `createdAt`
- **Indexes:** `by_code`, `by_isActive`
- **Backend Models:**
  - `referenceData.ts` - createSport, updateSport, getSportByCode, getActiveSports
  - `skillBenchmarks.ts` - queries by sportCode
  - `sportPassports.ts` - sport passport queries
- **Frontend:** Sport selection dropdowns
- **Status:** ✅ Active

#### 2. ageGroups
- **Purpose:** Age group definitions (U6, U7, ..., Senior)
- **Schema:** `code`, `name`, `minAge`, `maxAge`, `ltadStage`, `description`, `sortOrder`, `isActive`
- **Indexes:** `by_code`, `by_isActive`, `by_sortOrder`
- **Backend Models:** `referenceData.ts` - age group management
- **Frontend:** Age group filtering and selection
- **Status:** ✅ Active

#### 3. skillCategories
- **Purpose:** Sport-specific skill groupings (Ball Mastery, Passing, Tactical)
- **Schema:** `sportCode`, `code`, `name`, `description`, `sortOrder`, `isActive`
- **Indexes:** `by_sportCode`, `by_sportCode_and_code`, `by_sortOrder`
- **Backend Models:** `referenceData.ts`, `skillAssessments.ts`
- **Frontend:** Skill organization in assessment UI
- **Status:** ✅ Active

#### 4. skillDefinitions
- **Purpose:** Individual skills with 1-5 rating scale descriptors
- **Schema:** `categoryId`, `sportCode`, `code`, `name`, `level1-5Descriptor`, `ageGroupRelevance`, `sortOrder`, `isActive`
- **Indexes:** `by_categoryId`, `by_sportCode`, `by_sportCode_and_code`, `by_sortOrder`
- **Backend Models:** `referenceData.ts`, `skillAssessments.ts`
- **Frontend:** Skill assessment forms
- **Status:** ✅ Active

#### 5. skillBenchmarks
- **Purpose:** NGB standards and expectations by age/gender/level
- **Schema:** `sportCode`, `skillCode`, `ageGroup`, `gender`, `level`, `expectedRating`, `minAcceptable`, `source`, `sourceYear`
- **Indexes:** `by_sportCode`, `by_skill`, `by_context`, `by_source`
- **Backend Models:** `skillAssessments.ts` - recordAssessmentWithBenchmark, getClubBenchmarkAnalytics
- **Frontend:** Benchmark comparisons in analytics
- **Status:** ✅ Active

---

### New Identity System Tables (Platform-Level)

#### 6. playerIdentities
- **Purpose:** Platform-level player identity (cross-org, youth + adult)
- **Schema:** `firstName`, `lastName`, `dateOfBirth`, `gender`, `playerType` (youth/adult), `userId`, `email`, `phone`, `address`, `verificationStatus`, `createdFrom`
- **Indexes:** `by_name_dob`, `by_userId`, `by_email`, `by_playerType`
- **Backend Models:**
  - `playerIdentities.ts` - getPlayerById, findPlayerByNameAndDob, findPlayerByUserId, createPlayerIdentity, updatePlayerIdentity, linkPlayerToUser
  - `sportPassports.ts` - player passport views
  - `guardianPlayerLinks.ts` - parent-player links
  - `skillAssessments.ts` - assessment queries
  - `playerImport.ts` - import creates players
- **Frontend:**
  - `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx` - player passport page
  - `apps/web/src/app/orgs/[orgId]/parents/page.tsx` - parents view
- **Status:** 🔄 In Progress - Active with legacy fallback

#### 7. guardianIdentities
- **Purpose:** Platform-level guardian identity (can exist without userId)
- **Schema:** `firstName`, `lastName`, `email`, `phone`, `address`, `userId` (optional), `verificationStatus`, `preferredContactMethod`, `createdFrom`
- **Indexes:** `by_email`, `by_userId`, `by_phone`, `by_name`
- **Backend Models:**
  - `guardianIdentities.ts` - findGuardianByEmail, findGuardianByUserId, createGuardianIdentity, linkGuardianToUser, findMatchingGuardian
  - `guardianPlayerLinks.ts` - join queries
  - `playerImport.ts` - import creates guardians
- **Frontend:** Guardian/parent management pages
- **Status:** 🔄 In Progress - Active, missing claiming UI

#### 8. guardianPlayerLinks
- **Purpose:** N:M relationship between guardians and players
- **Schema:** `guardianIdentityId`, `playerIdentityId`, `relationship`, `isPrimary`, `hasParentalResponsibility`, `canCollectFromTraining`, `consentedToSharing`, `verifiedAt`, `verifiedBy`
- **Indexes:** `by_guardian`, `by_player`, `by_guardian_and_player`
- **Backend Models:**
  - `guardianPlayerLinks.ts` - getPlayersForGuardian, getGuardiansForPlayer, getPrimaryGuardian, createLink, updatePrimaryGuardian
  - `sportPassports.ts` - full player passport view
  - `playerImport.ts` - import creates links
- **Frontend:** Parent-child relationship UI
- **Status:** 🔄 In Progress - Active

#### 9. playerEmergencyContacts
- **Purpose:** Emergency contacts for adult players (who don't have guardians)
- **Schema:** `playerIdentityId`, `firstName`, `lastName`, `phone`, `email`, `relationship`, `priority`, `notes`
- **Indexes:** `by_player`, `by_priority`
- **Backend Models:**
  - `playerEmergencyContacts.ts` - full CRUD
  - `sportPassports.ts` - included in full player view
- **Frontend:** Emergency contact management for adult players
- **Status:** 🔄 In Progress - Adult player support

---

### New Identity System Tables (Organization-Level)

#### 10. orgPlayerEnrollments
- **Purpose:** Player membership in specific organization
- **Schema:** `playerIdentityId`, `organizationId`, `clubMembershipNumber`, `ageGroup`, `season`, `status`, `reviewStatus`, `attendance`, `coachNotes`, `adminNotes`
- **Indexes:** `by_playerIdentityId`, `by_organizationId`, `by_player_and_org`, `by_org_and_status`, `by_org_and_ageGroup`
- **Backend Models:**
  - `orgPlayerEnrollments.ts` - getEnrollmentById, getEnrollmentsByPlayer, getEnrollmentsByOrg, createEnrollment, bulkCreateEnrollments, getPlayersByOrg (paginated)
  - `skillAssessments.ts` - org player filtering
  - `sportPassports.ts` - full player passport view
  - `playerImport.ts` - import creates enrollments
- **Frontend:** Player listings, org management
- **Status:** 🔄 In Progress - Replacing legacy players table

#### 11. orgGuardianProfiles
- **Purpose:** Organization-specific guardian preferences and settings
- **Schema:** `guardianIdentityId`, `organizationId`, `emergencyPriority`, `receiveMatchUpdates`, `receiveTrainingUpdates`, `receiveNewsletters`, `preferredLanguage`, `clubNotes`, `isActive`
- **Indexes:** `by_guardianIdentityId`, `by_organizationId`, `by_guardian_and_org`
- **Backend Models:**
  - `orgGuardianProfiles.ts` - full CRUD
  - Join operations from guardianIdentities
- **Frontend:** Guardian communication preferences
- **Status:** 🔄 In Progress

---

### Sport Passport & Skill Tracking Tables

#### 12. sportPassports
- **Purpose:** Links player to specific sport with positions, ratings, notes
- **Schema:** `playerIdentityId`, `sportCode`, `organizationId`, `status`, positions (primary/secondary/coach/least preferred), `dominantSide`, `isGoalkeeper`, current ratings (overall/technical/tactical/physical/mental), assessment tracking, notes, season tracking
- **Indexes:** `by_playerIdentityId`, `by_player_and_sport`, `by_organizationId`, `by_org_and_sport`, `by_status`
- **Backend Models:**
  - `sportPassports.ts` - comprehensive operations including getFullPlayerPassportView, createPassport, updatePositions, updateRatings, findOrCreatePassport
  - `skillAssessments.ts` - assessment recording
  - `passportGoals.ts` - goal tracking
- **Frontend:** Primary player passport page (`apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`)
- **Status:** 🔄 In Progress - Core new system

#### 13. skillAssessments
- **Purpose:** Point-in-time skill assessment records
- **Schema:** `passportId`, `playerIdentityId`, `sportCode`, `skillCode`, `organizationId`, `rating`, `previousRating`, `assessmentDate`, `assessmentType`, `assessedBy`, `assessorRole`, benchmark data, notes, session context
- **Indexes:** `by_passportId`, `by_playerIdentityId`, `by_player_and_sport`, `by_skill`, `by_date`, `by_assessor`, `by_organizationId`, `by_type`
- **Backend Models:**
  - `skillAssessments.ts` - extensive operations including recordAssessment, getLatestAssessmentsForPassport, getSkillHistory, recordAssessmentWithBenchmark, getClubBenchmarkAnalytics
  - **Migration functions:** migrateLegacySkillsForPlayer, bulkMigrateLegacySkills
- **Frontend:** Skills section in player passport, analytics views
- **Status:** 🔄 In Progress - Has migration helpers

#### 14. passportGoals
- **Purpose:** Development goals linked to sport passports
- **Schema:** `passportId`, `playerIdentityId`, `organizationId`, `title`, `description`, `category`, `priority`, `status`, `progress`, `targetDate`, `linkedSkills`, `milestones`, `parentActions`, `parentCanView`, notes
- **Indexes:** `by_passportId`, `by_playerIdentityId`, `by_organizationId`, `by_status`, `by_category`
- **Backend Models:**
  - `passportGoals.ts` - full CRUD
  - `sportPassports.ts` - included in full passport view
- **Frontend:** Goals section in player passport
- **Status:** 🔄 In Progress - Replaces developmentGoals

#### 15. teamPlayerIdentities
- **Purpose:** Links Better Auth teams to player identities
- **Schema:** `teamId`, `playerIdentityId`, `organizationId`, `role`, `status`, `season`, `joinedDate`, `leftDate`
- **Indexes:** `by_teamId`, `by_playerIdentityId`, `by_team_and_player`, `by_organizationId`, `by_org_and_status`
- **Backend Models:**
  - `teamPlayerIdentities.ts` - operations
  - `sportPassports.ts` - team assignments in full view
- **Frontend:** Team assignments in player view
- **Status:** 🔄 In Progress - Replaces teamPlayers

#### 16. playerInjuries
- **Purpose:** Platform-level injury tracking (cross-org with privacy controls)
- **Schema:** `playerIdentityId`, `injuryType`, `bodyPart`, `side`, dates, `severity`, `status`, `description`, `mechanism`, treatment, return to play protocol, context, `isVisibleToAllOrgs`, `restrictedToOrgIds`, `reportedBy`
- **Indexes:** `by_playerIdentityId`, `by_status`, `by_date`, `by_sport`
- **Backend Models:**
  - `playerInjuries.ts` - comprehensive operations including reportInjury, updateInjuryStatus, setReturnToPlayProtocol, getActiveInjuriesForOrg
  - `orgInjuryNotes.ts` - org-specific notes
- **Frontend:** Coach injury dashboard (recent feature: "feat: add Injury Tracking UI for coaches")
- **Status:** 🔄 In Progress - Recently worked on

#### 17. orgInjuryNotes
- **Purpose:** Organization-specific notes on player injuries
- **Schema:** `injuryId`, `organizationId`, `note`, `noteType`, `addedBy`, `addedByName`, `addedByRole`, `isPrivate`
- **Indexes:** `by_injuryId`, `by_org_and_injury`, `by_date`
- **Backend Models:**
  - `orgInjuryNotes.ts` - addNote, getNotesForInjury, updateNote
  - References playerInjuries
- **Frontend:** Injury tracking UI notes section
- **Status:** 🔄 In Progress

---

### Legacy Tables (Being Replaced)

#### 18. players (LEGACY)
- **Purpose:** OLD org-scoped player table
- **Replaced By:** `playerIdentities` + `orgPlayerEnrollments`
- **Schema:** `name`, `ageGroup`, `sport`, `gender`, `organizationId`, `season`, review tracking, attendance, skills (Record<string, number>), positions, fitness, notes, family/contact info, parents array, DOB, address, inferred parent data
- **Indexes:** `by_organizationId`, `by_sport`, `by_ageGroup`, `by_familyId`, `by_parentEmail`, `by_inferredParentEmail`, `name_search`, `address_search`
- **Backend Models:**
  - `players.ts` - still active: getPlayerPassport, getPlayersByOrganization, createPlayer, updatePlayer, bulkCreatePlayers, linkPlayerToTeam, autoLinkParentToChildren
  - `skillAssessments.ts` - migration functions reference it
- **Frontend:** Fallback queries in player passport page when new system returns null
- **Status:** ⚠️ Partial Use - Fallback system operational
- **Migration:** 🔄 In Progress - Being replaced

#### 19. teamPlayers (LEGACY)
- **Purpose:** OLD team-player junction table
- **Replaced By:** `teamPlayerIdentities`
- **Schema:** `teamId`, `playerId`, `createdAt`
- **Indexes:** `by_teamId`, `by_playerId`
- **Backend Models:**
  - `players.ts` - still creating records: linkPlayerToTeam, unlinkPlayerFromTeam
- **Frontend:** Indirect via player views
- **Status:** ⚠️ Active - Still in use
- **Migration:** 🔄 In Progress - Parallel system

#### 20. injuries (LEGACY)
- **Purpose:** OLD player-scoped injury table
- **Replaced By:** `playerInjuries`
- **Schema:** `playerId`, `injuryType`, `bodyPart`, dates, `severity`, `status`, `description`, treatment, return to play protocol, coach notes
- **Indexes:** `by_playerId`, `by_status`, `by_severity`
- **Backend Models:** No dedicated model (old table)
- **Frontend:** None (replaced)
- **Status:** ❌ Not Used - Superseded
- **Migration:** 🔄 In Progress - Replaced by playerInjuries

#### 21. developmentGoals (LEGACY)
- **Purpose:** OLD player-scoped development goals
- **Replaced By:** `passportGoals`
- **Schema:** `playerId`, `title`, `description`, `category`, `priority`, `status`, `progress`, dates, `linkedSkills`, `milestones`, `parentActions`, coach/player notes
- **Indexes:** `by_playerId`, `by_status`, `by_priority`
- **Backend Models:** None
- **Frontend:** Replaced by passportGoals
- **Status:** ❌ Not Used - Superseded
- **Migration:** ⚠️ Not Started - No migration functions

#### 22. medicalProfiles (LEGACY)
- **Purpose:** OLD player medical data
- **Replaced By:** `playerEmergencyContacts`
- **Schema:** `playerId`, `bloodType`, `allergies`, `medications`, `conditions`, doctor info, emergency contacts, insurance
- **Indexes:** `by_playerId`
- **Backend Models:** None
- **Frontend:** Not visible
- **Status:** ❌ Not Used - Data absorbed
- **Migration:** ⚠️ Not Started - No migration helper

---

### Application Tables (Operational)

#### 23. todos
- **Status:** ✅ Active - Simple todo tracking

#### 24. coachAssignments
- **Purpose:** Coach team/age group assignments
- **Schema:** `userId`, `organizationId`, `teams`, `ageGroups`, `sport`, `roles`
- **Backend Models:** `coaches.ts`
- **Status:** ✅ Active

#### 25. coachInsightPreferences
- **Purpose:** Coach AI insight settings and learning
- **Schema:** `coachId`, auto-approval settings, preferred style, statistics, common edits
- **Status:** ✅ Active

#### 26. teamGoals
- **Purpose:** Team-level development goals
- **Schema:** `teamId`, `organizationId`, `title`, `description`, `category`, `priority`, `status`, `progress`, dates, coach notes
- **Indexes:** `by_teamId`, `by_organizationId`, `by_status`, `by_priority`
- **Status:** ✅ Active

#### 27. approvalActions
- **Purpose:** Audit trail for approval/rejection actions
- **Schema:** user info, admin info, `action`, `timestamp`, rejection reason, teams/players assigned
- **Indexes:** `by_userId`, `by_adminId`, `by_action`, `by_timestamp`, `by_organizationId`
- **Status:** ✅ Active

#### 28. orgJoinRequests
- **Purpose:** User requests to join organization
- **Schema:** user info, `organizationId`, `requestedRole`, `requestedFunctionalRoles`, `status`, `message`, parent/coach specific fields, reviewer info
- **Indexes:** `by_userId`, `by_organizationId`, `by_status`, `by_userId_and_organizationId`, `by_organizationId_and_status`
- **Backend Models:** `orgJoinRequests.ts`
- **Status:** ✅ Active

#### 29. voiceNotes
- **Purpose:** Voice/typed notes with AI transcription and insights
- **Schema:** `orgId`, `coachId`, `date`, `type`, `audioStorageId`, transcription data, AI insights with status, player insights
- **Indexes:** `by_orgId`, `by_orgId_and_coachId`
- **Backend Models:** `voiceNotes.ts`
- **Status:** ✅ Active

#### 30. orgDeletionRequests
- **Purpose:** Organization deletion workflow requiring platform staff approval
- **Schema:** organization info, requester info, `reason`, `status`, reviewer info, data summary
- **Indexes:** `by_organizationId`, `by_status`, `by_requestedAt`
- **Status:** ✅ Active

#### 31. demoAsks
- **Purpose:** Demo requests from landing page
- **Schema:** `name`, `email`, `phone`, `organization`, `message`, `status`, timestamps, `notes`
- **Indexes:** `by_status`, `by_email`
- **Backend Models:** `demoAsks.ts`
- **Status:** ✅ Active

---

## Part 3: Migration Status Summary

### Migration Progress by Phase

| Phase | Tables | Status | Notes |
|-------|--------|--------|-------|
| **Reference Data** | 5 tables | ✅ Complete | Active and stable |
| **Identity System (Platform)** | 4 tables | 🔄 70% | Core working, missing claiming UI |
| **Identity System (Org)** | 2 tables | 🔄 80% | Active, being used in imports |
| **Sport Passports** | 7 tables | 🔄 60% | Active with fallback, migration helpers exist |
| **Legacy Replacement** | 5 tables | 🔄 40% | Parallel systems running |
| **Application** | 9 tables | ✅ Complete | Operational |

### Key Migration Findings

#### ✅ Migration Helpers Exist
- `skillAssessments.ts` includes:
  - `migrateLegacySkillsForPlayer` (lines 844-930)
  - `bulkMigrateLegacySkills` (lines 932-1018)

#### 🔄 Parallel Systems Running
- **New system:** playerIdentities, guardianIdentities actively used
- **Legacy system:** players table still operational as fallback
- **Frontend strategy:** Check new system first, fallback to legacy

Example from player passport page:
```typescript
// Try new identity system first
const playerData = await getFullPlayerPassportView(...);
if (!playerData) {
  // Fallback to legacy players table
  const legacyPlayer = await getPlayerPassport(...);
}
```

#### ⚠️ No Migration Helpers
- `developmentGoals` → `passportGoals`: No migration function
- `medicalProfiles` → `playerEmergencyContacts`: No migration function
- These appear to be planned as fresh starts

### Recent Activity (from git log)

- **a4a14d7** (Dec 18, 2024): "feat: update GAA import wizard to use new identity system"
- **7c257a6** (Dec 17, 2024): "docs: add legacy table analysis for identity system migration"
- **866e3fd** (Dec 17, 2024): "docs: add MVP vs current system feature comparison"
- **395a2e5** (Recent): "feat: add parent injury/goals views and coach injury navigation"
- **1432517** (Major commit): Initial identity system implementation (17,575 insertions)

**Conclusion:** System is actively being migrated with significant recent work on GAA import and injury tracking.

---

## Part 4: Recommendations

### Immediate Priority: Complete Section 3.5 Flow

The following 3 steps are required to fully implement the Section 3.5 guardian identity claiming flow:

#### Step 1: Add Claiming UI to Signup Flow
**Location:** `apps/web/src/components/sign-up-form.tsx`

**Implementation:**
1. After successful signup, check for matching guardianIdentity
2. If high-confidence match found, show confirmation dialog
3. Display: "We found your profile from [Club Name]. Is this you?"
4. Show matched children names for verification
5. On confirmation, call `linkGuardianToUser` mutation
6. Show success: "Welcome! You now have access to [Child Names]"

#### Step 2: Create Post-Signup Hook
**Location:** `packages/backend/convex/auth.ts` or Next.js middleware

**Implementation:**
1. Add Better Auth hook or create post-signup API route
2. Automatically query `findMatchingGuardian` by user email
3. If match found, trigger identity linking
4. Store pending claim if user needs to confirm
5. Send email notification about matched profile

#### Step 3: Implement Consent Flow
**Location:** New guardian dashboard section

**Implementation:**
1. Add UI for managing `consentedToSharing` setting
2. Prompt during first login: "Allow other clubs to see your relationship with [Child]?"
3. Add privacy settings page for cross-org visibility
4. Enforce consent in queries (check flag before returning cross-org data)
5. Add audit trail for consent changes

### Migration Strategy

#### Short Term (Next Sprint)
1. ✅ Complete Section 3.5 claiming flow (3 steps above)
2. Test end-to-end: CSV import → Parent signup → Dashboard access
3. Document claiming flow for user testing

#### Medium Term (Next Month)
1. Create migration scripts for `developmentGoals` → `passportGoals`
2. Create migration scripts for `medicalProfiles` → `playerEmergencyContacts`
3. Migrate remaining legacy data
4. Remove fallback logic from frontend

#### Long Term (Next Quarter)
1. Archive legacy tables (players, teamPlayers, injuries, developmentGoals, medicalProfiles)
2. Clean up migration functions
3. Performance optimization of new identity queries
4. Add cross-org analytics (now possible with platform-level identities)

---

## Appendices

### A. Table Dependencies Diagram

```
Platform Level (No organizationId):
┌─────────────────────────────────────────────────────────────┐
│  guardianIdentities ←→ guardianPlayerLinks ←→ playerIdentities │
│         ↓                                          ↓          │
│  (userId optional)                        (youth + adult)     │
└─────────────────────────────────────────────────────────────┘
                           ↓
                   (Referenced by)
                           ↓
Organization Level (With organizationId):
┌─────────────────────────────────────────────────────────────┐
│  orgGuardianProfiles              orgPlayerEnrollments       │
│         ↓                                   ↓                │
│  (org preferences)               (org membership)            │
│                                             ↓                │
│                                    sportPassports            │
│                                             ↓                │
│                                    skillAssessments          │
│                                    passportGoals             │
│                                    teamPlayerIdentities       │
└─────────────────────────────────────────────────────────────┘
```

### B. Verification Status Flow

**Guardian:**
```
unverified → email_verified → id_verified
   ↑              ↑
(import)    (signup/claim)
```

**Player:**
```
unverified → guardian_verified → self_verified → document_verified
   ↑              ↑                   ↑
(import)    (parent confirms)   (adult registers)
```

### C. Critical File Locations

**Backend Models:**
- Identity: `packages/backend/convex/models/playerIdentities.ts`
- Identity: `packages/backend/convex/models/guardianIdentities.ts`
- Links: `packages/backend/convex/models/guardianPlayerLinks.ts`
- Enrollment: `packages/backend/convex/models/orgPlayerEnrollments.ts`
- Passports: `packages/backend/convex/models/sportPassports.ts`
- Assessments: `packages/backend/convex/models/skillAssessments.ts`
- Import: `packages/backend/convex/models/playerImport.ts`
- Auth: `packages/backend/convex/auth.ts`

**Frontend:**
- Signup: `apps/web/src/components/sign-up-form.tsx`
- Player View: `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`
- Parents View: `apps/web/src/app/orgs/[orgId]/parents/page.tsx`

**Documentation:**
- Architecture: `docs/PLAYER_PASSPORT_ARCHITECTURE.md`
- This Report: `docs/IDENTITY_SYSTEM_STATUS_REPORT.md`

---

## Conclusion

The PDP identity system migration is **well underway** with solid architectural foundations in place. The backend infrastructure for Section 3.5's guardian identity claiming flow exists, but the frontend claiming UI and automatic linking are missing.

**Immediate Next Steps:**
1. Implement the 3 missing pieces of Section 3.5 (claiming UI, post-signup hook, consent flow)
2. Test end-to-end import → signup → claim flow
3. Document for user acceptance testing

**Current Strength:** Platform-level identity architecture is correctly designed and implemented, enabling future cross-org features and analytics.

**Current Gap:** User-facing claiming flow not implemented, preventing guardians from easily claiming their imported identities during signup.

---

*End of Report*
