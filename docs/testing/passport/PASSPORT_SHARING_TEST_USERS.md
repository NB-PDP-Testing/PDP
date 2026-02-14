# Passport Sharing Test Users - Manual Creation Guide

**Date**: January 19, 2026
**Purpose**: Complete specification of test users needed for passport sharing UAT

---

## Executive Summary

This document specifies all test users needed to fully test the passport sharing feature across multiple organizations. You will create these users manually via the app's signup/invitation flows.

---

## ⚠️ CRITICAL GAP: Cross-Org Player Enrollment

**Current State**: All 236 players are enrolled at Grange Armagh ONLY.

**Required**: At least one player (Cian Murphy) must be enrolled at TWO organizations to test cross-org comparison.

**After creating users, you MUST:**
1. Enroll Cian Murphy at Crossmaglen Rangers (via Admin UI or seed script)
2. Create a sport passport for Cian at Crossmaglen Rangers
3. Add skill assessments at Crossmaglen Rangers (with DIFFERENT ratings than Grange Armagh)

---

## Existing Infrastructure

### Organizations Available

| Org ID | Name | Slug | Use For |
|--------|------|------|---------|
| `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7` | **Grange Armagh** | st-colmcille-039-s-gfc-grange-armagh | Primary test org (Org A) |
| `jh71pbv6yfyppy3sren9apeqs17z86wq` | **Crossmaglen Rangers** | club-extra-1 | Secondary test org (Org B) |
| `jh73c402cnayr0j9r5kh9trpx17ywzbc` | DMC | dmc | Tertiary org (Org C) |
| `jh7dp5pen530609xe7m6jsk1t97z8vz1` | St. Patrick's GAA | club-extra-2222222 | Additional testing |
| `jh78babp0je7tyqrh5rj1705x97zdzsh` | Ruairi Og CLG, Cushendall | ruairi-og-clg-cushendall | Additional testing |

### Existing Test Users (Already Created)

| Email | Name | User ID | Current Use |
|-------|------|---------|-------------|
| `neil.b@blablablak.com` | NeilTEST | `k17aqe558mmrjwnzrvy34d5mkn7yzkaf` | Linked as guardian "Sarah Murphy" |
| `neiltest2@skfjkadsfdgsjdgsj.com` | kjksajkjakj | `k17fwp081bcxjyxcv4t43xq7997z1py1` | Unknown |
| `neiltest3@skfjkadsfdgsjdgsj.com` | neilparent | `k170ankxf7hjw72yeqjqz8n3557z0j6v` | Unknown |
| `neiltesting@example.com` | Neil TEST ACCOUNT | `k17cx7vnr8tz6qdr0mh4s09psh7ze0wa` | Unknown |

### Existing Players

| Player ID | Name | Guardian Link |
|-----------|------|---------------|
| `mx77tmyq2ync7ebsf7mhdpgcz97zbvqr` | Liam Murphy | Sarah Murphy (parental responsibility) |
| `mx770p92s6k8jc3efq91g23rn17zajb6` | Cian Murphy | Sarah Murphy (parental responsibility) |

---

## Required Test Users

### Organization A: Grange Armagh (Source Org)

#### User A1: Admin at Grange Armagh

| Field | Value |
|-------|-------|
| **Email** | `admin.grange@testpdp.com` |
| **Password** | `TestAdmin123!` |
| **First Name** | Michael |
| **Last Name** | Grange |
| **Organization** | Grange Armagh |
| **Better Auth Role** | `admin` |
| **Functional Roles** | `["admin"]` |
| **Purpose** | Manage sharing settings, view enquiries, approve requests |

**Test Scenarios:**
- Configure org sharing contact settings
- View sharing statistics
- Manage passport enquiry queue
- Export compliance data

---

#### User A2: Coach at Grange Armagh

| Field | Value |
|-------|-------|
| **Email** | `coach.grange@testpdp.com` |
| **Password** | `TestCoach123!` |
| **First Name** | Sean |
| **Last Name** | O'Brien |
| **Organization** | Grange Armagh |
| **Better Auth Role** | `member` |
| **Functional Roles** | `["coach"]` |
| **Purpose** | Create skill assessments, send enquiries to other orgs |

**Test Scenarios:**
- Assess players at Grange Armagh
- Send passport enquiry to Crossmaglen Rangers
- View players on their team
- Mark coach notes as shareable

---

#### User A3: Parent at Grange Armagh (USE EXISTING)

| Field | Value |
|-------|-------|
| **Email** | `neil.b@blablablak.com` (existing) |
| **Guardian Identity** | Sarah Murphy |
| **Linked Children** | Liam Murphy, Cian Murphy |
| **Organization** | Grange Armagh |
| **Better Auth Role** | `member` |
| **Functional Roles** | `["parent"]` |
| **Purpose** | Grant/revoke consent, view audit logs |

**Test Scenarios:**
- Enable passport sharing via wizard
- Select which elements to share
- Revoke consent
- View access audit log
- Respond to coach requests

---

### Organization B: Crossmaglen Rangers (Receiving Org)

#### User B1: Admin at Crossmaglen Rangers

| Field | Value |
|-------|-------|
| **Email** | `admin.cross@testpdp.com` |
| **Password** | `TestAdmin123!` |
| **First Name** | Patrick |
| **Last Name** | Cross |
| **Organization** | Crossmaglen Rangers |
| **Better Auth Role** | `admin` |
| **Functional Roles** | `["admin"]` |
| **Purpose** | Manage org B settings, receive enquiries |

**Test Scenarios:**
- Configure sharing contact (form vs direct)
- View incoming enquiries
- View sharing statistics for Org B

---

#### User B2: Coach at Crossmaglen Rangers (PRIMARY)

| Field | Value |
|-------|-------|
| **Email** | `coach.cross@testpdp.com` |
| **Password** | `TestCoach123!` |
| **First Name** | Padraig |
| **Last Name** | Kelly |
| **Organization** | Crossmaglen Rangers |
| **Better Auth Role** | `member` |
| **Functional Roles** | `["coach"]` |
| **Purpose** | Accept shared passports, view comparison, request access |

**Test Scenarios:**
- Accept pending passport share
- Decline passport share (with reason)
- View shared passport data
- Compare assessments between orgs
- Request access to non-shared player
- View data freshness indicators

---

#### User B3: Coach at Crossmaglen (Secondary - for decline testing)

| Field | Value |
|-------|-------|
| **Email** | `coach2.cross@testpdp.com` |
| **Password** | `TestCoach123!` |
| **First Name** | Dermot |
| **Last Name** | Ryan |
| **Organization** | Crossmaglen Rangers |
| **Better Auth Role** | `member` |
| **Functional Roles** | `["coach"]` |
| **Purpose** | Test multiple coach acceptance workflow |

**Test Scenarios:**
- Second coach tries to accept same share
- Test "already accepted by another coach" scenario

---

#### User B4: Parent at Crossmaglen Rangers

| Field | Value |
|-------|-------|
| **Email** | `parent.cross@testpdp.com` |
| **Password** | `TestParent123!` |
| **First Name** | Marie |
| **Last Name** | Donnelly |
| **Organization** | Crossmaglen Rangers |
| **Better Auth Role** | `member` |
| **Functional Roles** | `["parent"]` |
| **Purpose** | Test parent in receiving org (different perspective) |

**Test Scenarios:**
- Parent at Org B who might want to share TO Org A
- Verify parent can't see other players' shared data

---

### Organization C: DMC (Third Org for Multi-Org Testing)

#### User C1: Coach at DMC

| Field | Value |
|-------|-------|
| **Email** | `coach.dmc@testpdp.com` |
| **Password** | `TestCoach123!` |
| **First Name** | Ciaran |
| **Last Name** | Walsh |
| **Organization** | DMC |
| **Better Auth Role** | `member` |
| **Functional Roles** | `["coach"]` |
| **Purpose** | Test "share to multiple orgs" scenario |

**Test Scenarios:**
- Third org coach requests access
- Test "all enrolled orgs" sharing option
- Verify consent doesn't leak to unauthorized orgs

---

### Multi-Org Users (Same Person, Multiple Orgs)

#### User M1: Coach at BOTH Grange Armagh AND Crossmaglen Rangers

| Field | Value |
|-------|-------|
| **Email** | `coach.multi@testpdp.com` |
| **Password** | `TestCoach123!` |
| **First Name** | Brendan |
| **Last Name** | Multiclub |
| **Organizations** | Grange Armagh, Crossmaglen Rangers |
| **Better Auth Role** | `member` (at both) |
| **Functional Roles** | `["coach"]` (at both) |
| **Purpose** | Test coach who works at multiple clubs |

**Test Scenarios:**
- Coach switches org context
- Coach views comparison from both perspectives
- Test that assessments stay org-scoped
- Verify correct permissions per org

---

### Platform Staff User

#### User P1: Platform Staff

| Field | Value |
|-------|-------|
| **Email** | `platform.staff@testpdp.com` |
| **Password** | `TestPlatform123!` |
| **First Name** | Admin |
| **Last Name** | Platform |
| **isPlatformStaff** | `true` |
| **Purpose** | Platform-level administration |

**Test Scenarios:**
- View all organizations
- Manage platform flows
- Debug cross-org issues
- View aggregate analytics

---

## User Creation Checklist

### Step 1: Create Accounts (Signup Flow)

For each user, go through the signup process:

1. Navigate to `/signup`
2. Enter email and password
3. Complete email verification (if enabled)
4. Set first name, last name

| User | Email | Password | First | Last | Created |
|------|-------|----------|-------|------|---------|
| A1 | `admin.grange@testpdp.com` | `TestAdmin123!` | Michael | Grange | ☐ |
| A2 | `coach.grange@testpdp.com` | `TestCoach123!` | Sean | O'Brien | ☐ |
| B1 | `admin.cross@testpdp.com` | `TestAdmin123!` | Patrick | Cross | ☐ |
| B2 | `coach.cross@testpdp.com` | `TestCoach123!` | Padraig | Kelly | ☐ |
| B3 | `coach2.cross@testpdp.com` | `TestCoach123!` | Dermot | Ryan | ☐ |
| B4 | `parent.cross@testpdp.com` | `TestParent123!` | Marie | Donnelly | ☐ |
| C1 | `coach.dmc@testpdp.com` | `TestCoach123!` | Ciaran | Walsh | ☐ |
| M1 | `coach.multi@testpdp.com` | `TestCoach123!` | Brendan | Multiclub | ☐ |
| P1 | `platform.staff@testpdp.com` | `TestPlatform123!` | Admin | Platform | ☐ |

### Step 2: Add Users to Organizations

Use the admin panel or invitation flow:

| User | Organization | Role | Functional Role | Added |
|------|--------------|------|-----------------|-------|
| A1 | Grange Armagh | admin | admin | ☐ |
| A2 | Grange Armagh | member | coach | ☐ |
| B1 | Crossmaglen Rangers | admin | admin | ☐ |
| B2 | Crossmaglen Rangers | member | coach | ☐ |
| B3 | Crossmaglen Rangers | member | coach | ☐ |
| B4 | Crossmaglen Rangers | member | parent | ☐ |
| C1 | DMC | member | coach | ☐ |
| M1 | Grange Armagh | member | coach | ☐ |
| M1 | Crossmaglen Rangers | member | coach | ☐ |

### Step 3: Set Platform Staff Flag

For P1 (`platform.staff@testpdp.com`):
- Use Convex Dashboard to set `isPlatformStaff: true` on the user record
- Or use existing script: `npx -w packages/backend convex run scripts/bootstrapPlatformStaff:setFirstPlatformStaff`

### Step 4: Assign Coaches to Teams

| Coach | Team | Organization | Assigned |
|-------|------|--------------|----------|
| A2 (Sean O'Brien) | U12 Boys | Grange Armagh | ☐ |
| B2 (Padraig Kelly) | U12 Boys | Crossmaglen Rangers | ☐ |
| B3 (Dermot Ryan) | U14 Boys | Crossmaglen Rangers | ☐ |
| M1 (Brendan Multiclub) | U10 Boys | Grange Armagh | ☐ |
| M1 (Brendan Multiclub) | U10 Boys | Crossmaglen Rangers | ☐ |

---

## Data Creation After Users Exist

### Step 5: Enroll Cian Murphy at Crossmaglen Rangers

Currently Cian is only enrolled at Grange Armagh. Need to add:

```
Table: orgPlayerEnrollments
{
  playerIdentityId: "mx770p92s6k8jc3efq91g23rn17zajb6", // Cian Murphy
  organizationId: "jh71pbv6yfyppy3sren9apeqs17z86wq",   // Crossmaglen Rangers
  sport: "gaa_football",
  ageGroup: "U12",
  status: "active",
  enrolledAt: [timestamp],
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

### Step 6: Create Sport Passport at Crossmaglen

```
Table: sportPassports
{
  playerIdentityId: "mx770p92s6k8jc3efq91g23rn17zajb6", // Cian Murphy
  organizationId: "jh71pbv6yfyppy3sren9apeqs17z86wq",   // Crossmaglen Rangers
  sportCode: "gaa_football",
  status: "active",
  preferredPosition: "midfielder",
  createdAt: [timestamp]
}
```

### Step 7: Create Skill Assessments at BOTH Organizations

**At Grange Armagh (by Coach A2):**

| Skill | Rating | Notes |
|-------|--------|-------|
| gaa_hand_pass | 4.2 | Excellent technique |
| gaa_kick_pass | 3.8 | Good distance |
| gaa_solo | 4.0 | Confident |
| gaa_tackle | 3.5 | Needs work on timing |
| gaa_catch | 4.5 | Strong under pressure |

**At Crossmaglen Rangers (by Coach B2) - DIFFERENT RATINGS:**

| Skill | Rating | Notes | Comparison |
|-------|--------|-------|------------|
| gaa_hand_pass | 4.0 | Good | Agreement (0.2 diff) |
| gaa_kick_pass | 2.5 | Needs significant work | **Divergence** (1.3 diff) |
| gaa_solo | 3.9 | Consistent | Agreement (0.1 diff) |
| gaa_tackle | 4.5 | Excellent in matches | **Divergence** (1.0 diff) |
| gaa_shooting | 3.5 | Developing | **Blind spot** (only at Org B) |

### Step 8: Create Passport Share Consent

After parent (neil.b@blablablak.com) grants consent via UI:

```
Table: passportShareConsents
{
  playerIdentityId: "mx770p92s6k8jc3efq91g23rn17zajb6", // Cian Murphy
  grantedBy: "k17aqe558mmrjwnzrvy34d5mkn7yzkaf",        // neil.b user ID
  grantedByType: "guardian",
  guardianIdentityId: "md73yy29x586n999fbcwpgxe4x7zbq1g", // Sarah Murphy
  initiationType: "parent_initiated",

  sourceOrgMode: "specific_orgs",
  sourceOrgIds: ["jh7f6k14jw7j4sj9rr9dfzekr97xm9j7"],    // Grange Armagh
  receivingOrgId: "jh71pbv6yfyppy3sren9apeqs17z86wq",    // Crossmaglen Rangers

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

  status: "active",
  coachAcceptanceStatus: "pending",  // Coach B2 will accept

  consentedAt: [timestamp],
  expiresAt: [timestamp + 1 year],
  consentVersion: "1.0"
}
```

---

## Test Scenario Matrix

| Scenario | Users Involved | Prerequisites |
|----------|---------------|---------------|
| **Parent enables sharing** | A3 (neil.b) | Cian enrolled at both orgs |
| **Coach accepts share** | B2 (Padraig Kelly) | Pending consent exists |
| **Coach declines share** | B3 (Dermot Ryan) | Pending consent exists |
| **View comparison** | B2 (Padraig Kelly) | Accepted consent + assessments |
| **Coach sends enquiry** | B2 → A1 | Org A has enquiry contact configured |
| **Admin views enquiries** | A1 (Michael Grange) | Enquiry exists |
| **Parent revokes consent** | A3 (neil.b) | Active consent exists |
| **View audit log** | A3 (neil.b) | Access log entries exist |
| **Multi-org coach** | M1 (Brendan) | Member of both orgs |
| **Request access** | B2 → player without consent | Player exists at Org A |
| **Expired consent** | B2 | Consent with past expiresAt |

---

## Quick Reference Card

### Credentials Summary

```
GRANGE ARMAGH (Org A):
  Admin:  admin.grange@testpdp.com / TestAdmin123!
  Coach:  coach.grange@testpdp.com / TestCoach123!
  Parent: neil.b@blablablak.com (existing)

CROSSMAGLEN RANGERS (Org B):
  Admin:  admin.cross@testpdp.com / TestAdmin123!
  Coach:  coach.cross@testpdp.com / TestCoach123!
  Coach2: coach2.cross@testpdp.com / TestCoach123!
  Parent: parent.cross@testpdp.com / TestParent123!

DMC (Org C):
  Coach:  coach.dmc@testpdp.com / TestCoach123!

MULTI-ORG:
  Coach:  coach.multi@testpdp.com / TestCoach123!

PLATFORM:
  Staff:  platform.staff@testpdp.com / TestPlatform123!
```

### Key IDs Reference

```
ORGANIZATIONS:
  Grange Armagh:       jh7f6k14jw7j4sj9rr9dfzekr97xm9j7
  Crossmaglen Rangers: jh71pbv6yfyppy3sren9apeqs17z86wq
  DMC:                 jh73c402cnayr0j9r5kh9trpx17ywzbc

PLAYERS:
  Cian Murphy:         mx770p92s6k8jc3efq91g23rn17zajb6
  Liam Murphy:         mx77tmyq2ync7ebsf7mhdpgcz97zbvqr

GUARDIAN:
  Sarah Murphy:        md73yy29x586n999fbcwpgxe4x7zbq1g
  (linked to neil.b@blablablak.com)
```

---

## After User Creation - Verification

Run this diagnostic to verify users are set up correctly:

```bash
npx -w packages/backend convex run scripts/passportSharingDiagnostics:getFullDiagnostics '{}'
```

Expected output should show:
- All new users in the users array
- Correct organization memberships
- Coach assignments in place

---

**Document Version**: 1.0
**Last Updated**: January 19, 2026
