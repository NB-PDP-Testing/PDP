# Identity Migration Test Checklist

This document provides detailed test cases for validating each phase of the identity migration.

---

## How to Use This Document

1. Before marking a phase complete, run ALL tests for that phase
2. Record actual results in the "Actual" column
3. Mark Pass/Fail in the final column
4. If any test fails, investigate before proceeding
5. All tests must pass before moving to next phase

---

## Phase 1: Foundation Tables

### 1.1 Schema Compilation Tests

| # | Test | Command | Expected | Actual | Pass |
|---|------|---------|----------|--------|------|
| 1.1.1 | Schema compiles | `npx -w packages/backend convex codegen` | Exit code 0, no errors | | [ ] |
| 1.1.2 | Types generated | Check `_generated/dataModel.d.ts` | Contains `sports`, `ageGroups`, `skillCategories`, `skillDefinitions` | | [ ] |

### 1.2 Sports Table Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 1.2.1 | Get all sports | `getSports()` | Array of 3 sports | | [ ] |
| 1.2.2 | GAA Football exists | Check sports array | `{ code: "gaa_football", name: "GAA Football" }` | | [ ] |
| 1.2.3 | Soccer exists | Check sports array | `{ code: "soccer", name: "Soccer" }` | | [ ] |
| 1.2.4 | Rugby exists | Check sports array | `{ code: "rugby", name: "Rugby" }` | | [ ] |
| 1.2.5 | Index works | Query by code | Returns single sport | | [ ] |

### 1.3 Age Groups Table Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 1.3.1 | Get all age groups | `getAgeGroups()` | Array with U6-U19 + Senior | | [ ] |
| 1.3.2 | U6 exists | Check array | `{ code: "u6", name: "Under 6", minAge: 5, maxAge: 6 }` | | [ ] |
| 1.3.3 | U12 exists | Check array | `{ code: "u12", name: "Under 12", ltadStage: "Learn to Train" }` | | [ ] |
| 1.3.4 | Senior exists | Check array | `{ code: "senior", name: "Senior", minAge: 18 }` | | [ ] |
| 1.3.5 | LTAD stages correct | Check relevant groups | Stages match LTAD framework | | [ ] |

### 1.4 Skill Categories Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 1.4.1 | GAA categories | `getSkillCategoriesBySport("gaa_football")` | 6 categories (Ball Mastery, Catching, etc.) | | [ ] |
| 1.4.2 | Soccer categories | `getSkillCategoriesBySport("soccer")` | 6 categories | | [ ] |
| 1.4.3 | Rugby categories | `getSkillCategoriesBySport("rugby")` | 6 categories | | [ ] |
| 1.4.4 | Sort order works | Check order | Categories sorted by sortOrder | | [ ] |

### 1.5 Skill Definitions Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 1.5.1 | GAA skill count | `getSkillDefinitionsBySport("gaa_football")` | 17 skills | | [ ] |
| 1.5.2 | Soccer skill count | `getSkillDefinitionsBySport("soccer")` | 29 skills | | [ ] |
| 1.5.3 | Rugby skill count | `getSkillDefinitionsBySport("rugby")` | 42 skills | | [ ] |
| 1.5.4 | Skill has category | Check any skill | `categoryId` populated | | [ ] |
| 1.5.5 | Descriptors exist | Check skill | At least level 1-5 descriptors | | [ ] |
| 1.5.6 | By category works | `getSkillDefinitionsByCategory(categoryId)` | Returns skills in category | | [ ] |

### Phase 1 Sign-off

- [ ] All 1.1.x tests pass
- [ ] All 1.2.x tests pass
- [ ] All 1.3.x tests pass
- [ ] All 1.4.x tests pass
- [ ] All 1.5.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Phase 2: Guardian Identity System

### 2.1 Schema Tests

| # | Test | Command | Expected | Actual | Pass |
|---|------|---------|----------|--------|------|
| 2.1.1 | Schema compiles | `npx -w packages/backend convex codegen` | Exit code 0 | | [ ] |
| 2.1.2 | guardianIdentities type | Check dataModel | Table exists with correct fields | | [ ] |
| 2.1.3 | orgGuardianProfiles type | Check dataModel | Table exists with correct fields | | [ ] |

### 2.2 Guardian CRUD Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 2.2.1 | Create guardian | `createGuardianIdentity({ firstName, lastName, email })` | Returns `Id<"guardianIdentities">` | | [ ] |
| 2.2.2 | Required fields enforced | Omit email | Throws validation error | | [ ] |
| 2.2.3 | Email normalized | Create with "Test@Example.COM" | Stored as "test@example.com" | | [ ] |
| 2.2.4 | Get by ID | `ctx.db.get(id)` | Returns guardian object | | [ ] |
| 2.2.5 | Update guardian | `updateGuardianIdentity({ id, phone })` | Phone updated | | [ ] |
| 2.2.6 | Delete guardian | `ctx.db.delete(id)` | Guardian removed | | [ ] |

### 2.3 Guardian Query Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 2.3.1 | Find by email | `findGuardianByEmail("test@example.com")` | Returns guardian | | [ ] |
| 2.3.2 | Email case insensitive | `findGuardianByEmail("TEST@EXAMPLE.COM")` | Same guardian returned | | [ ] |
| 2.3.3 | Find by userId | `findGuardianByUserId(userId)` | Returns linked guardian | | [ ] |
| 2.3.4 | No match returns null | `findGuardianByEmail("nonexistent@x.com")` | Returns null | | [ ] |
| 2.3.5 | Find by phone | `findGuardianByPhone("0871234567")` | Returns guardian | | [ ] |

### 2.4 Duplicate Prevention Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 2.4.1 | Duplicate email rejected | Create 2 with same email | Second throws error | | [ ] |
| 2.4.2 | Different emails allowed | Create 2 with different emails | Both succeed | | [ ] |
| 2.4.3 | findOrCreate existing | Call with existing email | Returns existing ID (no new record) | | [ ] |
| 2.4.4 | findOrCreate new | Call with new email | Creates and returns new ID | | [ ] |

### 2.5 User Linking Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 2.5.1 | Link to user | `linkGuardianToUser({ guardianId, userId })` | userId field populated | | [ ] |
| 2.5.2 | Get for current user | `getGuardianForCurrentUser()` (logged in) | Returns guardian | | [ ] |
| 2.5.3 | Unlinked guardian | Query by userId when not linked | Returns null | | [ ] |
| 2.5.4 | Email match on login | Login user with matching email | Finds existing guardian | | [ ] |

### 2.6 Org Profile Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 2.6.1 | Create org profile | `createOrgGuardianProfile({ guardianId, orgId })` | Returns profile ID | | [ ] |
| 2.6.2 | Get org profile | `getOrgGuardianProfile({ guardianId, orgId })` | Returns profile | | [ ] |
| 2.6.3 | Different prefs per org | Create profiles for 2 orgs | Each has independent prefs | | [ ] |
| 2.6.4 | Update org profile | `updateOrgGuardianProfile({ profileId, prefs })` | Prefs updated | | [ ] |
| 2.6.5 | Get guardians for org | `getGuardiansForOrganization(orgId)` | Returns all org guardians | | [ ] |

### 2.7 Identity Matching Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 2.7.1 | Exact email match | `findMatchingGuardian({ email })` | Confidence >= 80 | | [ ] |
| 2.7.2 | Email + name match | `findMatchingGuardian({ email, firstName, lastName })` | Confidence = 100 | | [ ] |
| 2.7.3 | Phone only match | `findMatchingGuardian({ phone })` | Confidence = 60 | | [ ] |
| 2.7.4 | Name only match | `findMatchingGuardian({ firstName, lastName })` | Confidence = 40 (needs review) | | [ ] |
| 2.7.5 | No match | `findMatchingGuardian({ email: "none@x.com" })` | Returns null | | [ ] |

### Phase 2 Sign-off

- [ ] All 2.1.x tests pass
- [ ] All 2.2.x tests pass
- [ ] All 2.3.x tests pass
- [ ] All 2.4.x tests pass
- [ ] All 2.5.x tests pass
- [ ] All 2.6.x tests pass
- [ ] All 2.7.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Phase 3: Player Identity System

### 3.1 Schema Tests

| # | Test | Command | Expected | Actual | Pass |
|---|------|---------|----------|--------|------|
| 3.1.1 | Schema compiles | `npx -w packages/backend convex codegen` | Exit code 0 | | [ ] |
| 3.1.2 | playerIdentities type | Check dataModel | Table exists | | [ ] |
| 3.1.3 | guardianPlayerLinks type | Check dataModel | Table exists | | [ ] |
| 3.1.4 | orgPlayerEnrollments type | Check dataModel | Table exists | | [ ] |

### 3.2 Player CRUD Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 3.2.1 | Create youth player | `createPlayerIdentity({ ...data, playerType: "youth" })` | Returns ID | | [ ] |
| 3.2.2 | Required fields | Omit dateOfBirth | Throws validation error | | [ ] |
| 3.2.3 | Get by ID | `ctx.db.get(id)` | Returns player | | [ ] |
| 3.2.4 | Update player | `updatePlayerIdentity({ id, address })` | Address updated | | [ ] |
| 3.2.5 | Delete player | `ctx.db.delete(id)` | Player removed | | [ ] |

### 3.3 Player Query Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 3.3.1 | Find by name+DOB | `findPlayerByNameAndDob({ firstName, lastName, dob })` | Returns player | | [ ] |
| 3.3.2 | No match returns null | Query non-existent | Returns null | | [ ] |
| 3.3.3 | findOrCreate existing | Call with existing data | Returns existing ID | | [ ] |
| 3.3.4 | findOrCreate new | Call with new data | Creates new | | [ ] |

### 3.4 Guardian-Player Link Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 3.4.1 | Create link | `createGuardianPlayerLink({ guardianId, playerId, relationship })` | Returns link ID | | [ ] |
| 3.4.2 | Duplicate prevented | Create same link twice | Second throws error | | [ ] |
| 3.4.3 | Get guardians for player | `getGuardiansForPlayer(playerId)` | Returns linked guardians | | [ ] |
| 3.4.4 | Get players for guardian | `getPlayersForGuardian(guardianId)` | Returns linked players | | [ ] |
| 3.4.5 | Multiple guardians | Link 2 guardians to 1 player | Both returned | | [ ] |
| 3.4.6 | Multiple players | Link 1 guardian to 2 players | Both returned | | [ ] |
| 3.4.7 | Set primary | `setPrimaryGuardian({ linkId, playerId })` | Only one primary | | [ ] |
| 3.4.8 | Consent flag | `updateLinkConsent({ linkId, consented: true })` | Flag updated | | [ ] |

### 3.5 Enrollment Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 3.5.1 | Enroll player | `enrollPlayer({ playerId, orgId, ageGroup, season })` | Returns enrollment ID | | [ ] |
| 3.5.2 | Get enrollment | `getEnrollment({ playerId, orgId })` | Returns enrollment | | [ ] |
| 3.5.3 | Same player, 2 orgs | Enroll in org A and org B | 2 separate enrollments | | [ ] |
| 3.5.4 | Duplicate prevented | Enroll same player+org twice | Second throws error | | [ ] |
| 3.5.5 | Update enrollment | `updateEnrollment({ enrollmentId, ageGroup })` | Age group updated | | [ ] |
| 3.5.6 | Get enrollments for player | `getEnrollmentsForPlayer(playerId)` | All orgs returned | | [ ] |
| 3.5.7 | Get players for org | `getPlayersForOrg(orgId)` | All enrolled players | | [ ] |

### 3.6 Combined Query Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 3.6.1 | Players with identity | `getPlayersForOrg(orgId)` | Includes identity data | | [ ] |
| 3.6.2 | Guardian's children in org | Filter by guardian + org | Only enrolled children | | [ ] |
| 3.6.3 | Cross-org children | Guardian with kids in 2 orgs | See all (with consent) | | [ ] |

### 3.7 Age Calculation Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 3.7.1 | Age from DOB | `calculateAge("2015-03-20")` today | Correct age | | [ ] |
| 3.7.2 | Birthday not yet | DOB with birthday later this year | One less year | | [ ] |
| 3.7.3 | Birthday passed | DOB with birthday earlier this year | Correct year | | [ ] |
| 3.7.4 | Determine age group | `determineAgeGroup(10)` | "u11" or appropriate | | [ ] |

### Phase 3 Sign-off

- [ ] All 3.1.x tests pass
- [ ] All 3.2.x tests pass
- [ ] All 3.3.x tests pass
- [ ] All 3.4.x tests pass
- [ ] All 3.5.x tests pass
- [ ] All 3.6.x tests pass
- [ ] All 3.7.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Phase 4: Adult Player Support

### 4.1 Schema Tests

| # | Test | Command | Expected | Actual | Pass |
|---|------|---------|----------|--------|------|
| 4.1.1 | Schema compiles | `npx -w packages/backend convex codegen` | Exit code 0 | | [ ] |
| 4.1.2 | playerEmergencyContacts type | Check dataModel | Table exists | | [ ] |

### 4.2 Adult Player Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 4.2.1 | Create adult player | `registerAdultPlayer({ data, userId })` | playerType = "adult" | | [ ] |
| 4.2.2 | Adult has userId | Check created player | userId populated | | [ ] |
| 4.2.3 | Adult has no guardians | `getGuardiansForPlayer(adultId)` | Empty array | | [ ] |
| 4.2.4 | Get own profile | `getMyPlayerProfile()` (logged in as adult) | Returns player | | [ ] |

### 4.3 Emergency Contact Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 4.3.1 | Add contact | `addEmergencyContact({ playerId, data })` | Returns contact ID | | [ ] |
| 4.3.2 | Required fields | Omit phone | Throws validation error | | [ ] |
| 4.3.3 | Get contacts | `getEmergencyContacts(playerId)` | Returns contacts | | [ ] |
| 4.3.4 | Priority order | Add 3 contacts | Ordered by priority | | [ ] |
| 4.3.5 | Update contact | `updateEmergencyContact({ contactId, data })` | Data updated | | [ ] |
| 4.3.6 | Delete contact | `deleteEmergencyContact(contactId)` | Contact removed | | [ ] |
| 4.3.7 | Reorder contacts | `reorderContacts({ playerId, order })` | Priorities updated | | [ ] |

### 4.4 Transition Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 4.4.1 | Youth→Adult | `transitionToAdult({ playerId, userId })` | playerType = "adult" | | [ ] |
| 4.4.2 | Guardians→Contacts | After transition | Emergency contacts created | | [ ] |
| 4.4.3 | Contact count | Guardian count | Same number of contacts | | [ ] |
| 4.4.4 | Primary marked | Primary guardian | Contact notes mention primary | | [ ] |
| 4.4.5 | Already adult error | Transition adult player | Throws error | | [ ] |
| 4.4.6 | Email/phone copied | Adult has contact info | email, phone populated | | [ ] |

### Phase 4 Sign-off

- [ ] All 4.1.x tests pass
- [ ] All 4.2.x tests pass
- [ ] All 4.3.x tests pass
- [ ] All 4.4.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Phase 5: Data Migration

### 5.1 Pre-Migration Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 5.1.1 | Old data exists | Count old `players` table | > 0 records (or confirm clean) | | [ ] |
| 5.1.2 | Backup created | If preserving data | Backup verified | | [ ] |

### 5.2 Clean Slate Tests (if applicable)

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 5.2.1 | Clean runs | `cleanSlateForIdentityMigration()` | No errors | | [ ] |
| 5.2.2 | Old players deleted | Count `players` | 0 records | | [ ] |
| 5.2.3 | Old teamPlayers deleted | Count `teamPlayers` | 0 records | | [ ] |
| 5.2.4 | Old injuries deleted | Count `injuries` | 0 records | | [ ] |

### 5.3 Migration Tests (if applicable)

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 5.3.1 | Dry run succeeds | `migratePlayersToIdentities({ dryRun: true })` | No errors | | [ ] |
| 5.3.2 | Player count matches | Compare counts | Old players = new identities | | [ ] |
| 5.3.3 | Guardian extraction | Count guardians created | Reasonable number | | [ ] |
| 5.3.4 | Links created | Count guardian-player links | All linked | | [ ] |
| 5.3.5 | Enrollments created | Count enrollments | = old player count | | [ ] |
| 5.3.6 | Full run succeeds | `migratePlayersToIdentities({ dryRun: false })` | No errors | | [ ] |

### 5.4 Post-Migration Verification

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 5.4.1 | Can query new tables | `getPlayersForOrg(orgId)` | Returns data | | [ ] |
| 5.4.2 | Guardian queries work | `getGuardianForCurrentUser()` | Returns guardian | | [ ] |
| 5.4.3 | No orphaned data | Check for enrollments without identity | 0 orphans | | [ ] |

### Phase 5 Sign-off

- [ ] All 5.1.x tests pass
- [ ] All 5.2.x tests pass (if clean slate)
- [ ] All 5.3.x tests pass (if migration)
- [ ] All 5.4.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Phase 6: Frontend Integration

### 6.1 Hook Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 6.1.1 | useGuardianIdentity loads | Render component using hook | No error, data loads | | [ ] |
| 6.1.2 | usePlayerIdentity loads | Render component using hook | No error, data loads | | [ ] |

### 6.2 Parent Dashboard Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 6.2.1 | Page loads | Navigate to `/orgs/[orgId]/parents` | No error | | [ ] |
| 6.2.2 | Shows children | Visual inspection | Children list visible | | [ ] |
| 6.2.3 | Correct children | Compare to database | Matches linked players | | [ ] |
| 6.2.4 | Click child works | Click on child | Navigates to passport | | [ ] |

### 6.3 Player Passport Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 6.3.1 | Page loads | Navigate to `/orgs/[orgId]/players/[playerId]` | No error | | [ ] |
| 6.3.2 | Shows player data | Visual inspection | Name, DOB, etc. visible | | [ ] |
| 6.3.3 | Shows guardians | Visual inspection | Guardian list visible | | [ ] |

### 6.4 Admin Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 6.4.1 | Player list loads | Navigate to `/orgs/[orgId]/admin/players` | No error | | [ ] |
| 6.4.2 | Shows all players | Count visible | Matches database | | [ ] |
| 6.4.3 | Filter works | Filter by age group | Correct subset | | [ ] |

### 6.5 Import Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 6.5.1 | Import page loads | Navigate to import | No error | | [ ] |
| 6.5.2 | Import creates identity | Import 1 player | playerIdentity created | | [ ] |
| 6.5.3 | Import creates guardian | Import with parent data | guardianIdentity created | | [ ] |
| 6.5.4 | Import creates link | Check after import | guardianPlayerLink exists | | [ ] |
| 6.5.5 | Import creates enrollment | Check after import | enrollment exists | | [ ] |
| 6.5.6 | Duplicate handled | Import same player twice | Uses existing identity | | [ ] |

### 6.6 Cross-Org Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 6.6.1 | Parent sees all orgs | Login as multi-org parent | Children from all orgs visible | | [ ] |
| 6.6.2 | Org switcher works | Switch org | Children filter correctly | | [ ] |

### Phase 6 Sign-off

- [ ] All 6.1.x tests pass
- [ ] All 6.2.x tests pass
- [ ] All 6.3.x tests pass
- [ ] All 6.4.x tests pass
- [ ] All 6.5.x tests pass
- [ ] All 6.6.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Phase 7: Sport Passport Enhancement

### 7.1 Schema Tests

| # | Test | Command | Expected | Actual | Pass |
|---|------|---------|----------|--------|------|
| 7.1.1 | Schema compiles | `npx -w packages/backend convex codegen` | Exit code 0 | | [ ] |
| 7.1.2 | sportPassports type | Check dataModel | Table exists | | [ ] |
| 7.1.3 | skillAssessments type | Check dataModel | Table exists | | [ ] |

### 7.2 Sport Passport CRUD Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 7.2.1 | Create passport | `createSportPassport({ enrollmentId, sportCode })` | Returns ID | | [ ] |
| 7.2.2 | Get passport | `getSportPassport({ enrollmentId, sportCode })` | Returns passport | | [ ] |
| 7.2.3 | One per sport | Create same sport twice | Second throws error | | [ ] |
| 7.2.4 | Multi-sport | Create 2 different sports | Both succeed | | [ ] |
| 7.2.5 | Update positions | `updatePassportPositions({ passportId, positions })` | Positions updated | | [ ] |
| 7.2.6 | Update fitness | `updatePassportFitness({ passportId, fitness })` | Fitness updated | | [ ] |

### 7.3 Skill Assessment Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 7.3.1 | Record assessment | `recordSkillAssessment({ passportId, skillId, rating })` | Returns ID | | [ ] |
| 7.3.2 | Rating range | Rating = 6 | Throws validation error | | [ ] |
| 7.3.3 | Get latest | `getLatestAssessments(passportId)` | Returns latest ratings | | [ ] |
| 7.3.4 | Multiple assessments | Record same skill twice | Both preserved | | [ ] |
| 7.3.5 | Get history | `getAssessmentHistory({ passportId, skillId })` | Returns all records | | [ ] |
| 7.3.6 | By season | `getAssessmentsBySeason({ passportId, season })` | Filtered correctly | | [ ] |

### 7.4 Denormalization Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 7.4.1 | currentSkillRatings updated | Record assessment | Passport field updated | | [ ] |
| 7.4.2 | Latest wins | Record higher rating | Field shows higher | | [ ] |
| 7.4.3 | Multiple skills | Record 5 skills | All 5 in field | | [ ] |

### 7.5 Progress Calculation Tests

| # | Test | Method | Expected | Actual | Pass |
|---|------|--------|----------|--------|------|
| 7.5.1 | Calculate progress | `calculateSkillProgress({ passportId, skillId })` | Returns delta | | [ ] |
| 7.5.2 | Improvement shown | Rating 2 → 4 | Progress = +2 | | [ ] |
| 7.5.3 | Decline shown | Rating 4 → 3 | Progress = -1 | | [ ] |
| 7.5.4 | No prior data | First assessment | Progress = null/0 | | [ ] |

### Phase 7 Sign-off

- [ ] All 7.1.x tests pass
- [ ] All 7.2.x tests pass
- [ ] All 7.3.x tests pass
- [ ] All 7.4.x tests pass
- [ ] All 7.5.x tests pass

**Tested By:** _______________
**Date:** _______________

---

## Final Integration Tests

After all phases complete, run these end-to-end tests:

### E2E Scenarios

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| E2E-1 | New family joins club | 1. Parent registers 2. Requests to join 3. Admin approves with children 4. Parent sees children | Children visible in dashboard | [ ] |
| E2E-2 | Child joins second club | 1. Child enrolled at Club A 2. Enroll same child at Club B 3. Parent dashboard | Shows child in both clubs | [ ] |
| E2E-3 | Skill assessment flow | 1. Coach opens player 2. Records skill ratings 3. Check history | Ratings saved, history shows | [ ] |
| E2E-4 | Adult player self-registers | 1. Adult registers 2. Joins club 3. Views own profile | Can manage own data | [ ] |
| E2E-5 | Youth turns 18 | 1. Youth player in system 2. Transition to adult 3. Check guardians | Guardians → contacts | [ ] |
| E2E-6 | Import workflow | 1. Admin imports CSV 2. Check identities created 3. Parent claims account | All data linked correctly | [ ] |

### Final Sign-off

- [ ] All E2E scenarios pass
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Mobile responsive (if applicable)

**Final Tested By:** _______________
**Date:** _______________
**Approved By:** _______________

---

*Test Document Version: 1.0*
*Created: December 17, 2025*
