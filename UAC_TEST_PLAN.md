# User Acceptance Testing (UAT) Plan

## PDP (Player Development Platform) / PlayerARC

**Version:** 1.0  
**Date:** March 1, 2026  
**Status:** Ready for Execution  
**Focus Users:** Platform Admin, Coach, Adult Player, Parent

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment Setup](#2-test-environment-setup)
3. [User Roles Summary](#3-user-roles-summary)
4. [Platform Admin Testing](#4-platform-admin-testing)
5. [Coach Testing](#5-coach-testing)
6. [Adult Player Testing](#6-adult-player-testing)
7. [Parent Testing](#7-parent-testing)
8. [Cross-Role Testing Scenarios](#8-cross-role-testing-scenarios)
9. [Bug Reporting Template](#9-bug-reporting-template)
10. [Test Completion Checklist](#10-test-completion-checklist)

---

## 1. Overview

### 1.1 Purpose

This document provides comprehensive step-by-step testing procedures for end-user acceptance testing of the PDP/PlayerARC platform. Testing focuses on four primary user roles:

- **Platform Admin** - Organization administrators
- **Coach** - Team coaches/managers
- **Adult Player** - Players aged 18+ with self-access
- **Parent/Guardian** - Guardians of minor players

### 1.2 Application Architecture

| Component      | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Frontend       | Next.js 14 (App Router)                               |
| Authentication | Better Auth (Email/Password + Google + Microsoft SSO) |
| Database       | Convex (Real-time serverless)                         |
| Deployment     | Vercel                                                |

### 1.3 Key URLs

```
/                           # Landing page (public)
/login                      # Sign-in page
/signup                     # Sign-up page
/orgs                       # Organization selection
/orgs/join                  # Browse/join organizations
/orgs/[orgId]               # Organization dashboard
/orgs/[orgId]/admin/*       # Admin routes
/orgs/[orgId]/coach/*       # Coach routes
/orgs/[orgId]/parents       # Parent dashboard
/orgs/[orgId]/players/[id]  # Player passport
```

---

## 2. Test Environment Setup

### 2.1 Prerequisites

- [ ] Access to test environment URL
- [ ] Test user accounts created (see below)
- [ ] Browser with DevTools (Chrome recommended)
- [ ] Test data seeded in database

### 2.2 Test User Accounts

| Role            | Email                       | Password   | Notes                     |
| --------------- | --------------------------- | ---------- | ------------------------- |
| Platform Staff  | `staff@test.playerarc.io`   | `Test123!` | Can create organizations  |
| Org Owner       | `owner@test.playerarc.io`   | `Test123!` | Created test organization |
| Org Admin       | `admin@test.playerarc.io`   | `Test123!` | Admin functional role     |
| Coach           | `coach@test.playerarc.io`   | `Test123!` | Has team assignments      |
| Parent          | `parent@test.playerarc.io`  | `Test123!` | Has linked children       |
| Adult Player    | `player@test.playerarc.io`  | `Test123!` | 18+ with self-access      |
| Multi-Role User | `multi@test.playerarc.io`   | `Test123!` | Coach + Parent            |
| New User        | `newuser@test.playerarc.io` | `Test123!` | Fresh account             |

### 2.3 Test Organization

- **Name:** Test Club FC
- **Sport:** GAA Football (primary), Soccer, Rugby
- **Teams:** U10 Boys, U12 Girls, U14 Boys, U16 Girls, U18 Boys, Senior Mixed
- **Players:** Minimum 10 players per team

---

## 3. User Roles Summary

### 3.1 Permission Matrix

| Capability               | Admin      | Coach                    | Parent               | Adult Player |
| ------------------------ | ---------- | ------------------------ | -------------------- | ------------ |
| Create organizations     | ✅ (owner) | ❌                       | ❌                   | ❌           |
| Manage users             | ✅         | ❌                       | ❌                   | ❌           |
| Approve join requests    | ✅         | ❌                       | ❌                   | ❌           |
| Manage teams             | ✅         | ❌                       | ❌                   | ❌           |
| Create players           | ✅         | ❌                       | ❌                   | ❌           |
| Bulk import players      | ✅         | ❌                       | ❌                   | ❌           |
| View all players         | ✅         | ❌ (assigned teams only) | ❌                   | ❌           |
| Create assessments       | ✅         | ✅                       | ❌                   | ❌           |
| View player passport     | ✅         | ✅ (assigned)            | ✅ (linked children) | ✅ (own)     |
| Create development goals | ✅         | ✅                       | ❌                   | ❌           |
| Record voice notes       | ❌         | ✅                       | ❌                   | ❌           |
| Log injuries             | ✅         | ✅                       | ✅                   | ✅ (own)     |
| Manage medical profiles  | ✅         | ✅ (view)                | ✅ (own children)    | ✅ (own)     |
| View coach feedback      | ✅         | ✅                       | ✅                   | ✅           |
| Grant child self-access  | ❌         | ❌                       | ✅                   | ❌           |

---

## 4. Platform Admin Testing

### 4.1 Authentication & Access

#### TEST-ADMIN-AUTH-001: Admin Login

| Field               | Value                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can log in successfully                                                                                        |
| **Preconditions**   | Admin account exists with admin functional role                                                                             |
| **Steps**           | 1. Navigate to `/login`<br>2. Enter email: `admin@test.playerarc.io`<br>3. Enter password: `Test123!`<br>4. Click "Sign In" |
| **Expected Result** | - Login successful<br>- Redirect to `/orgs/current` or `/orgs/[orgId]`<br>- Admin dashboard accessible                      |
| **Pass/Fail**       | ☐                                                                                                                           |

#### TEST-ADMIN-AUTH-002: Admin SSO Login (Google)

| Field               | Value                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can log in via Google SSO                                                          |
| **Preconditions**   | Admin account linked to Google                                                                  |
| **Steps**           | 1. Navigate to `/login`<br>2. Click "Continue with Google"<br>3. Complete Google OAuth flow     |
| **Expected Result** | - OAuth flow completes<br>- Redirect to organization dashboard<br>- Admin permissions preserved |
| **Pass/Fail**       | ☐                                                                                               |

#### TEST-ADMIN-AUTH-003: Admin Session Persistence

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Objective**       | Verify session survives page refresh                                                   |
| **Preconditions**   | Admin logged in                                                                        |
| **Steps**           | 1. Verify logged-in state<br>2. Refresh browser (F5)<br>3. Navigate to admin dashboard |
| **Expected Result** | - Still authenticated<br>- No re-login required<br>- Admin access maintained           |
| **Pass/Fail**       | ☐                                                                                      |

---

### 4.2 User Management

#### TEST-ADMIN-USER-001: View Organization Members

| Field               | Value                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can see all organization members                                                                              |
| **Preconditions**   | Admin logged in, members exist in organization                                                                             |
| **Steps**           | 1. Navigate to `/orgs/[orgId]/admin`<br>2. Click "Users" in sidebar or navigate to `/admin/users`<br>3. Review member list |
| **Expected Result** | - List shows all members<br>- Each member shows: name, email, role<br>- Search/filter works                                |
| **Pass/Fail**       | ☐                                                                                                                          |

#### TEST-ADMIN-USER-002: Invite New Member via Email

| Field               | Value                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can invite users by email                                                                                                                                |
| **Preconditions**   | Admin logged in                                                                                                                                                       |
| **Steps**           | 1. Navigate to `/admin/users`<br>2. Click "Invite Member" button<br>3. Enter email: `newinvite@example.com`<br>4. Select role: "member"<br>5. Click "Send Invitation" |
| **Expected Result** | - Success toast appears<br>- Invitation email sent<br>- Pending invitation visible                                                                                    |
| **Pass/Fail**       | ☐                                                                                                                                                                     |

#### TEST-ADMIN-USER-003: View Pending Join Requests

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can see pending membership requests                                                                                 |
| **Preconditions**   | Admin logged in, pending requests exist                                                                                          |
| **Steps**           | 1. Navigate to `/admin/users/approvals`<br>2. View "Pending" tab                                                                 |
| **Expected Result** | - List of pending requests displayed<br>- Each shows: user name, email, requested role, date<br>- Approve/Reject buttons visible |
| **Pass/Fail**       | ☐                                                                                                                                |

#### TEST-ADMIN-USER-004: Approve Coach Join Request with Team Assignment

| Field               | Value                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can approve coach and assign teams                                                                                                                                           |
| **Preconditions**   | Pending coach join request exists, teams created                                                                                                                                          |
| **Steps**           | 1. Navigate to `/admin/users/approvals`<br>2. Find pending coach request<br>3. Click "Configure & Approve"<br>4. Select teams: "U10 Boys", "U12 Girls"<br>5. Click "Approve & Add to Org" |
| **Expected Result** | - Request disappears from pending list<br>- Success toast appears<br>- Coach added to organization<br>- Coach assignment created with selected teams                                      |
| **Pass/Fail**       | ☐                                                                                                                                                                                         |

#### TEST-ADMIN-USER-005: Approve Parent Join Request with Smart Matching

| Field               | Value                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify smart matching suggests correct children                                                                                                                                                                                      |
| **Preconditions**   | Parent request exists, player with matching email/surname exists                                                                                                                                                                     |
| **Steps**           | 1. Navigate to `/admin/users/approvals`<br>2. Find pending parent request<br>3. Click "Configure & Approve"<br>4. Review smart matches in "High Confidence" section<br>5. Select matched children<br>6. Click "Approve & Add to Org" |
| **Expected Result** | - Smart matches displayed with confidence badges<br>- Can select/deselect children<br>- Parent linked to selected children after approval                                                                                            |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                    |

#### TEST-ADMIN-USER-006: Reject Join Request with Reason

| Field               | Value                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can reject requests with required reason                                                                                                                            |
| **Preconditions**   | Pending join request exists                                                                                                                                                      |
| **Steps**           | 1. Navigate to `/admin/users/approvals`<br>2. Find a pending request<br>3. Click "Reject" button<br>4. Enter reason: "Unable to verify identity"<br>5. Click "Confirm Rejection" |
| **Expected Result** | - Request moved to "Rejected" tab<br>- Rejection reason stored<br>- User notified (if applicable)                                                                                |
| **Pass/Fail**       | ☐                                                                                                                                                                                |

#### TEST-ADMIN-USER-007: Update Member Functional Roles

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can add/remove functional roles                                                                              |
| **Preconditions**   | Member exists who needs role update                                                                                       |
| **Steps**           | 1. Navigate to `/admin/users`<br>2. Find member<br>3. Click to edit roles<br>4. Toggle "coach" role on<br>5. Save changes |
| **Expected Result** | - Role updated successfully<br>- Member now has coach capabilities<br>- Change reflected immediately                      |
| **Pass/Fail**       | ☐                                                                                                                         |

#### TEST-ADMIN-USER-008: Approve Existing Member Role Request

| Field               | Value                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can approve role requests from existing members                                                               |
| **Preconditions**   | Member has pending role request                                                                                            |
| **Steps**           | 1. Navigate to `/admin/users/approvals`<br>2. Find role request in "Role Requests" section<br>3. Click "Grant [Role] Role" |
| **Expected Result** | - Role added to member<br>- Request removed from pending<br>- Success notification                                         |
| **Pass/Fail**       | ☐                                                                                                                          |

---

### 4.3 Team Management

#### TEST-ADMIN-TEAM-001: View All Teams

| Field               | Value                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can see all organization teams                                                                      |
| **Preconditions**   | Teams exist in organization                                                                                      |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Review team list                                                             |
| **Expected Result** | - All teams displayed<br>- Each shows: name, sport, age group, player count<br>- Filter by sport/age group works |
| **Pass/Fail**       | ☐                                                                                                                |

#### TEST-ADMIN-TEAM-002: Create New Team

| Field               | Value                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can create a team                                                                                                                                             |
| **Preconditions**   | Admin logged in                                                                                                                                                            |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Click "Create Team"<br>3. Fill in: Name: "U8 Mixed", Sport: "GAA Football", Age Group: "U8", Gender: "Mixed"<br>4. Click "Create Team" |
| **Expected Result** | - Team created successfully<br>- Appears in team list<br>- Can expand to see details                                                                                       |
| **Pass/Fail**       | ☐                                                                                                                                                                          |

#### TEST-ADMIN-TEAM-003: Edit Team Details

| Field               | Value                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify admin can modify team settings                                                                                                |
| **Preconditions**   | Team exists                                                                                                                          |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Click team to expand<br>3. Click "Edit" button<br>4. Change training schedule<br>5. Save changes |
| **Expected Result** | - Changes saved<br>- Team details updated<br>- Success toast                                                                         |
| **Pass/Fail**       | ☐                                                                                                                                    |

#### TEST-ADMIN-TEAM-004: Assign Players to Team

| Field               | Value                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can add/remove players from teams                                                                                                                                                        |
| **Preconditions**   | Team exists, unassigned players exist                                                                                                                                                                 |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Click team to expand<br>3. Click "Manage Members" or "Edit"<br>4. Search for player<br>5. Click to toggle player assignment (green = assigned)<br>6. Save changes |
| **Expected Result** | - Player added to team<br>- Visual state changes (green background)<br>- Player count updates                                                                                                         |
| **Pass/Fail**       | ☐                                                                                                                                                                                                     |

#### TEST-ADMIN-TEAM-005: Remove Player from Team

| Field               | Value                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can remove players from teams                                                                                                                           |
| **Preconditions**   | Team has players assigned                                                                                                                                            |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Expand team<br>3. Click "Edit" or "Manage Members"<br>4. Click assigned player to toggle off (red background)<br>5. Save changes |
| **Expected Result** | - Player removed from team<br>- Visual state shows pending removal<br>- Player count decreases after save                                                            |
| **Pass/Fail**       | ☐                                                                                                                                                                    |

#### TEST-ADMIN-TEAM-006: View Team Roster

| Field               | Value                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify team roster displays correctly                                                                                |
| **Preconditions**   | Team has players                                                                                                     |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Click team to expand<br>3. View roster section                                   |
| **Expected Result** | - All team players displayed<br>- Shows player name, age group<br>- Avatar with initials<br>- Responsive grid layout |
| **Pass/Fail**       | ☐                                                                                                                    |

#### TEST-ADMIN-TEAM-007: Delete Team

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can delete teams                                                                              |
| **Preconditions**   | Team exists (preferably empty)                                                                             |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Find team to delete<br>3. Click "Delete" button<br>4. Confirm deletion |
| **Expected Result** | - Confirmation dialog appears<br>- Team deleted after confirmation<br>- Removed from list                  |
| **Pass/Fail**       | ☐                                                                                                          |

---

### 4.4 Player Management

#### TEST-ADMIN-PLAYER-001: View All Players

| Field               | Value                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can see all organization players                                     |
| **Preconditions**   | Players exist in organization                                                     |
| **Steps**           | 1. Navigate to `/admin/players`<br>2. Review player list                          |
| **Expected Result** | - All players displayed<br>- Search/filter works<br>- Can sort by name, age group |
| **Pass/Fail**       | ☐                                                                                 |

#### TEST-ADMIN-PLAYER-002: Bulk Import Players via GAA Wizard

| Field               | Value                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify GAA membership import works                                                                                             |
| **Preconditions**   | Admin logged in, valid GAA data available                                                                                      |
| **Steps**           | 1. Navigate to `/admin/gaa-import`<br>2. Paste GAA membership data<br>3. Map columns<br>4. Preview import<br>5. Confirm import |
| **Expected Result** | - Data parsed correctly<br>- Preview shows players to import<br>- Import creates player records<br>- Success summary shown     |
| **Pass/Fail**       | ☐                                                                                                                              |

#### TEST-ADMIN-PLAYER-003: View Player Passport

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can view any player's passport                                                                    |
| **Preconditions**   | Players exist                                                                                                  |
| **Steps**           | 1. Navigate to player list<br>2. Click on a player<br>3. Review passport sections                              |
| **Expected Result** | - Player passport displayed<br>- Sections: Basic Info, Skills, Goals, Notes, Injuries<br>- Edit button visible |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ADMIN-PLAYER-004: Edit Player Information

| Field               | Value                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify admin can edit player details                                                                         |
| **Preconditions**   | Player exists                                                                                                |
| **Steps**           | 1. Navigate to player passport<br>2. Click "Edit Player"<br>3. Update name or other field<br>4. Save changes |
| **Expected Result** | - Edit form opens<br>- Changes save successfully<br>- Updated data displayed                                 |
| **Pass/Fail**       | ☐                                                                                                            |

---

### 4.5 Coach Management

#### TEST-ADMIN-COACH-001: View All Coaches

| Field               | Value                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can see all coaches                                                                      |
| **Preconditions**   | Coaches exist in organization                                                                         |
| **Steps**           | 1. Navigate to `/admin/coaches`<br>2. Review coach list                                               |
| **Expected Result** | - All coaches displayed<br>- Stats: Total, Active, Pending<br>- Each shows: name, teams, player count |
| **Pass/Fail**       | ☐                                                                                                     |

#### TEST-ADMIN-COACH-002: Edit Coach Team Assignments

| Field               | Value                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can modify coach team assignments                                                                                                 |
| **Preconditions**   | Coach exists, teams exist                                                                                                                      |
| **Steps**           | 1. Navigate to `/admin/coaches`<br>2. Find coach<br>3. Click to expand<br>4. Click "Edit Assignments"<br>5. Toggle team assignments<br>6. Save |
| **Expected Result** | - Team selection updates<br>- Green = assigned, Outline = available<br>- Changes saved successfully                                            |
| **Pass/Fail**       | ☐                                                                                                                                              |

#### TEST-ADMIN-COACH-003: Edit Coach Age Groups and Sport

| Field               | Value                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach sport/age group assignments                                                                                                             |
| **Preconditions**   | Coach exists                                                                                                                                         |
| **Steps**           | 1. Navigate to `/admin/coaches`<br>2. Expand coach card<br>3. Click "Edit Assignments"<br>4. Change primary sport<br>5. Toggle age groups<br>6. Save |
| **Expected Result** | - Sport dropdown works<br>- Age group toggles work<br>- Changes persist after save                                                                   |
| **Pass/Fail**       | ☐                                                                                                                                                    |

#### TEST-ADMIN-COACH-004: Deactivate Coach

| Field               | Value                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can deactivate a coach                                                                     |
| **Preconditions**   | Active coach exists                                                                                     |
| **Steps**           | 1. Navigate to `/admin/coaches`<br>2. Expand active coach<br>3. Click "Deactivate"<br>4. Confirm action |
| **Expected Result** | - Coach role changed to member<br>- No longer appears as active coach<br>- Can reactivate later         |
| **Pass/Fail**       | ☐                                                                                                       |

---

### 4.6 Organization Settings

#### TEST-ADMIN-SETTINGS-001: View Organization Settings

| Field               | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can access org settings                                                     |
| **Preconditions**   | Admin logged in                                                                          |
| **Steps**           | 1. Navigate to `/admin/settings`<br>2. Review available settings                         |
| **Expected Result** | - Settings page loads<br>- Organization info displayed<br>- Theme/color settings visible |
| **Pass/Fail**       | ☐                                                                                        |

#### TEST-ADMIN-SETTINGS-002: Update Organization Theme Colors

| Field               | Value                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify theme colors can be changed                                                               |
| **Preconditions**   | Admin or owner logged in                                                                         |
| **Steps**           | 1. Navigate to `/admin/settings`<br>2. Find color settings<br>3. Change primary color<br>4. Save |
| **Expected Result** | - Color picker works<br>- Changes apply to UI<br>- Persists after refresh                        |
| **Pass/Fail**       | ☐                                                                                                |

---

### 4.7 Benchmarks & Reference Data

#### TEST-ADMIN-BENCH-001: View NGB Benchmarks

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can view skill benchmarks                                                                   |
| **Preconditions**   | Benchmarks configured                                                                                    |
| **Steps**           | 1. Navigate to `/admin/benchmarks`<br>2. Select sport<br>3. Select age group<br>4. View benchmark values |
| **Expected Result** | - Benchmarks display by skill<br>- Shows skill name, benchmark value<br>- Source attribution visible     |
| **Pass/Fail**       | ☐                                                                                                        |

---

## 5. Coach Testing

### 5.1 Authentication & Dashboard Access

#### TEST-COACH-AUTH-001: Coach Login

| Field               | Value                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can log in and access coach dashboard                                                          |
| **Preconditions**   | Coach account with team assignments                                                                         |
| **Steps**           | 1. Navigate to `/login`<br>2. Enter coach credentials<br>3. Sign in<br>4. Navigate to `/orgs/[orgId]/coach` |
| **Expected Result** | - Login successful<br>- Coach dashboard accessible<br>- Assigned teams visible                              |
| **Pass/Fail**       | ☐                                                                                                           |

#### TEST-COACH-AUTH-002: Coach Access Restriction

| Field               | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| **Objective**       | Verify coach cannot access admin routes                                      |
| **Preconditions**   | Coach logged in (no admin role)                                              |
| **Steps**           | 1. Log in as coach<br>2. Manually navigate to `/admin/users`                 |
| **Expected Result** | - Access denied<br>- Redirect or error message<br>- Cannot see admin content |
| **Pass/Fail**       | ☐                                                                            |

---

### 5.2 Smart Coach Dashboard

#### TEST-COACH-DASH-001: View Assigned Team Players Only

| Field               | Value                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach sees ONLY assigned team players                                                                          |
| **Preconditions**   | Coach assigned to specific teams (e.g., U18 Girls with 15 players)                                                    |
| **Steps**           | 1. Log in as coach<br>2. Navigate to `/orgs/[orgId]/coach`<br>3. Count displayed players                              |
| **Expected Result** | - Only assigned team players visible<br>- Player count matches team assignment<br>- NO access to other teams' players |
| **Pass/Fail**       | ☐                                                                                                                     |

#### TEST-COACH-DASH-002: Filter Players by Team

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Objective**       | Verify team filter works correctly                                                    |
| **Preconditions**   | Coach assigned to multiple teams                                                      |
| **Steps**           | 1. Load coach dashboard<br>2. Click team card/filter<br>3. Observe player list change |
| **Expected Result** | - List filters to selected team<br>- Team card highlighted<br>- Player count updates  |
| **Pass/Fail**       | ☐                                                                                     |

#### TEST-COACH-DASH-003: Search Players

| Field               | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Objective**       | Verify player search works                                                         |
| **Preconditions**   | Players in assigned teams                                                          |
| **Steps**           | 1. Load coach dashboard<br>2. Type player name in search box<br>3. Observe results |
| **Expected Result** | - Real-time filtering<br>- Shows matching players<br>- Clears when search cleared  |
| **Pass/Fail**       | ☐                                                                                  |

#### TEST-COACH-DASH-004: Filter by Review Status

| Field               | Value                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Objective**       | Verify review status filters                                                                  |
| **Preconditions**   | Players with various review statuses                                                          |
| **Steps**           | 1. Load coach dashboard<br>2. Click "Overdue" or "Due Soon" badge<br>3. Observe filtered list |
| **Expected Result** | - Only matching players shown<br>- Badge count matches results<br>- Can clear filter          |
| **Pass/Fail**       | ☐                                                                                             |

#### TEST-COACH-DASH-005: Navigate to Player Passport

| Field               | Value                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can view player details                                                          |
| **Preconditions**   | Players in assigned teams                                                                     |
| **Steps**           | 1. From coach dashboard<br>2. Click player row or "View" button<br>3. Observe player passport |
| **Expected Result** | - Navigates to `/players/[playerId]`<br>- Full passport displayed<br>- All sections visible   |
| **Pass/Fail**       | ☐                                                                                             |

---

### 5.3 Skill Assessment

#### TEST-COACH-ASSESS-001: Navigate to Assessment Page

| Field               | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Objective**       | Verify coach can access assessment tools                                             |
| **Preconditions**   | Coach logged in with team assignments                                                |
| **Steps**           | 1. Navigate to `/orgs/[orgId]/coach/assess`<br>2. Review page layout                 |
| **Expected Result** | - Assessment page loads<br>- Shows assigned teams in header<br>- Player list visible |
| **Pass/Fail**       | ☐                                                                                    |

#### TEST-COACH-ASSESS-002: Select Player for Assessment

| Field               | Value                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| **Objective**       | Verify player selection works                                                     |
| **Preconditions**   | Players in assigned teams                                                         |
| **Steps**           | 1. Navigate to assessment page<br>2. Click on a player<br>3. Observe skill form   |
| **Expected Result** | - Player selected/highlighted<br>- Skills form appears<br>- Current ratings shown |
| **Pass/Fail**       | ☐                                                                                 |

#### TEST-COACH-ASSESS-003: Rate Player Skills

| Field               | Value                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify skill rating sliders work                                                                        |
| **Preconditions**   | Player selected for assessment                                                                          |
| **Steps**           | 1. Select player<br>2. Find skill rating slider (1-5 scale)<br>3. Adjust rating<br>4. Save assessment   |
| **Expected Result** | - Slider moves smoothly<br>- Value updates (1-5)<br>- Color coding indicates level<br>- Save successful |
| **Pass/Fail**       | ☐                                                                                                       |

#### TEST-COACH-ASSESS-004: Batch Assessment

| Field               | Value                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Objective**       | Verify multiple skills can be rated in one session                                            |
| **Preconditions**   | Player selected                                                                               |
| **Steps**           | 1. Select player<br>2. Rate multiple skills<br>3. Add assessment notes<br>4. Save all changes |
| **Expected Result** | - All ratings saved<br>- Notes attached<br>- Assessment date recorded<br>- History updated    |
| **Pass/Fail**       | ☐                                                                                             |

#### TEST-COACH-ASSESS-005: View Assessment History

| Field               | Value                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify assessment history displays                                                                 |
| **Preconditions**   | Player with previous assessments                                                                   |
| **Steps**           | 1. Select player<br>2. View "Recent Assessments" section                                           |
| **Expected Result** | - Last 5 assessments shown<br>- Shows skill name, rating, date<br>- Rating changes indicated (↑/↓) |
| **Pass/Fail**       | ☐                                                                                                  |

#### TEST-COACH-ASSESS-006: Sport Auto-Selection

| Field               | Value                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify sport auto-selects from team                                                                             |
| **Preconditions**   | Coach with team assignments                                                                                     |
| **Steps**           | 1. Navigate to assessment page<br>2. Observe sport dropdown<br>3. Change team filter<br>4. Observe sport change |
| **Expected Result** | - Sport auto-selected from team<br>- Updates when team changes<br>- "Auto-selected from team" hint shown        |
| **Pass/Fail**       | ☐                                                                                                               |

---

### 5.4 Development Goals

#### TEST-COACH-GOAL-001: View Player Goals

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can view player goals                                                    |
| **Preconditions**   | Player has development goals                                                          |
| **Steps**           | 1. Navigate to player passport<br>2. Find "Goals" section<br>3. Review goals          |
| **Expected Result** | - Goals displayed<br>- Shows goal title, target date<br>- Progress indicators visible |
| **Pass/Fail**       | ☐                                                                                     |

#### TEST-COACH-GOAL-002: Create Development Goal

| Field               | Value                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can create goals                                                                                                                                                 |
| **Preconditions**   | Player accessible to coach                                                                                                                                                    |
| **Steps**           | 1. Navigate to player passport or goals dashboard<br>2. Click "Add Goal"<br>3. Fill in: Title, Description, Target Date, Linked Skills<br>4. Set parent visibility<br>5. Save |
| **Expected Result** | - Goal created<br>- Appears in player's goals<br>- Target date set<br>- Visible to parent if enabled                                                                          |
| **Pass/Fail**       | ☐                                                                                                                                                                             |

#### TEST-COACH-GOAL-003: Update Goal Progress

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify goal progress can be updated                                                                                       |
| **Preconditions**   | Goal exists                                                                                                               |
| **Steps**           | 1. Find existing goal<br>2. Click to edit/update<br>3. Update progress notes<br>4. Add milestone if applicable<br>5. Save |
| **Expected Result** | - Progress updated<br>- Milestone added<br>- History maintained                                                           |
| **Pass/Fail**       | ☐                                                                                                                         |

#### TEST-COACH-GOAL-004: Complete Goal

| Field               | Value                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify goals can be marked complete                                                              |
| **Preconditions**   | Active goal exists                                                                               |
| **Steps**           | 1. Find active goal<br>2. Mark as complete<br>3. Confirm                                         |
| **Expected Result** | - Goal status changes to "Completed"<br>- Completion date recorded<br>- Removed from active list |
| **Pass/Fail**       | ☐                                                                                                |

---

### 5.5 Voice Notes & AI Insights

#### TEST-COACH-VOICE-001: Access Voice Notes Dashboard

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Objective**       | Verify voice notes page loads                                                 |
| **Preconditions**   | Coach logged in                                                               |
| **Steps**           | 1. Navigate to `/orgs/[orgId]/coach/voice-notes`                              |
| **Expected Result** | - Dashboard loads<br>- Recording controls visible<br>- Note history displayed |
| **Pass/Fail**       | ☐                                                                             |

#### TEST-COACH-VOICE-002: Record Voice Note

| Field               | Value                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify audio recording works                                                                                                                                            |
| **Preconditions**   | Browser has microphone permission                                                                                                                                       |
| **Steps**           | 1. Navigate to voice notes<br>2. Select note type (training/match/general)<br>3. Click "Record"<br>4. Speak for 10-15 seconds<br>5. Click "Stop"<br>6. Submit recording |
| **Expected Result** | - Recording indicator active<br>- Audio captured<br>- Processing status shown<br>- Note appears in history                                                              |
| **Pass/Fail**       | ☐                                                                                                                                                                       |

#### TEST-COACH-VOICE-003: Create Typed Note

| Field               | Value                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify typed notes work as alternative                                                                                                  |
| **Preconditions**   | Coach logged in                                                                                                                         |
| **Steps**           | 1. Navigate to voice notes<br>2. Switch to "Typed Note" input<br>3. Enter text with player mentions<br>4. Select note type<br>5. Submit |
| **Expected Result** | - Note saved<br>- AI analysis triggered<br>- Insights generated                                                                         |
| **Pass/Fail**       | ☐                                                                                                                                       |

#### TEST-COACH-VOICE-004: View AI Transcription

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Objective**       | Verify transcription displays                                                         |
| **Preconditions**   | Voice note recorded and processed                                                     |
| **Steps**           | 1. Find completed voice note<br>2. View transcription                                 |
| **Expected Result** | - Full transcription displayed<br>- Processing status: completed<br>- Timestamp shown |
| **Pass/Fail**       | ☐                                                                                     |

#### TEST-COACH-VOICE-005: Review AI Insights

| Field               | Value                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify AI-generated insights                                                                                        |
| **Preconditions**   | Voice note with insights generated                                                                                  |
| **Steps**           | 1. Find voice note with insights<br>2. Review insight cards                                                         |
| **Expected Result** | - Insights displayed<br>- Each shows: category, player match, recommended action<br>- Apply/Dismiss buttons visible |
| **Pass/Fail**       | ☐                                                                                                                   |

#### TEST-COACH-VOICE-006: Apply Insight to Player

| Field               | Value                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify insights can be applied                                                                          |
| **Preconditions**   | Pending insight exists                                                                                  |
| **Steps**           | 1. Find pending insight<br>2. Click "Apply"<br>3. Review where it's applied (injury, goal, note)        |
| **Expected Result** | - Insight marked as "Applied"<br>- Routes to correct area (injury form, goal, etc.)<br>- Data populated |
| **Pass/Fail**       | ☐                                                                                                       |

#### TEST-COACH-VOICE-007: Dismiss Insight

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Objective**       | Verify insights can be dismissed                                                       |
| **Preconditions**   | Pending insight exists                                                                 |
| **Steps**           | 1. Find pending insight<br>2. Click "Dismiss"                                          |
| **Expected Result** | - Insight marked as "Dismissed"<br>- Removed from pending list<br>- Can undo if needed |
| **Pass/Fail**       | ☐                                                                                      |

---

### 5.6 Injury Tracking

#### TEST-COACH-INJURY-001: View Player Injuries

| Field               | Value                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can see player injuries                                                              |
| **Preconditions**   | Player has injury record                                                                          |
| **Steps**           | 1. Navigate to player passport<br>2. Find injuries section<br>3. Or navigate to `/coach/injuries` |
| **Expected Result** | - Injuries displayed<br>- Shows: type, body part, severity, status<br>- Recovery notes visible    |
| **Pass/Fail**       | ☐                                                                                                 |

#### TEST-COACH-INJURY-002: Log New Injury

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can record injuries                                                                                          |
| **Preconditions**   | Player accessible                                                                                                         |
| **Steps**           | 1. Navigate to injuries section<br>2. Click "Add Injury"<br>3. Fill in: Type, Body Part, Severity, Date, Notes<br>4. Save |
| **Expected Result** | - Injury recorded<br>- Status set to "Active"<br>- Visible in player's profile                                            |
| **Pass/Fail**       | ☐                                                                                                                         |

#### TEST-COACH-INJURY-003: Update Injury Status

| Field               | Value                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Objective**       | Verify injury status can be updated                                                           |
| **Preconditions**   | Active injury exists                                                                          |
| **Steps**           | 1. Find active injury<br>2. Update status to "Recovering"<br>3. Add recovery notes<br>4. Save |
| **Expected Result** | - Status updated<br>- Notes saved<br>- Date tracked                                           |
| **Pass/Fail**       | ☐                                                                                             |

#### TEST-COACH-INJURY-004: Return-to-Play Protocol

| Field               | Value                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify return-to-play tracking                                                                                                |
| **Preconditions**   | Recovering injury exists                                                                                                      |
| **Steps**           | 1. Find recovering injury<br>2. View return-to-play protocol<br>3. Mark protocol steps complete<br>4. Clear player for return |
| **Expected Result** | - Protocol steps visible<br>- Can check off steps<br>- Final clearance marks injury as "Healed"                               |
| **Pass/Fail**       | ☐                                                                                                                             |

---

## 6. Adult Player Testing

### 6.1 Account & Self-Access

#### TEST-PLAYER-AUTH-001: Adult Player Login

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Objective**       | Verify adult player can log in                                                         |
| **Preconditions**   | Adult player account exists with self-access enabled                                   |
| **Steps**           | 1. Navigate to `/login`<br>2. Enter adult player credentials<br>3. Sign in             |
| **Expected Result** | - Login successful<br>- Redirect to organization dashboard<br>- Player view accessible |
| **Pass/Fail**       | ☐                                                                                      |

#### TEST-PLAYER-AUTH-002: Player Self-Access Verification

| Field               | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Objective**       | Verify self-access controls work                                                            |
| **Preconditions**   | Adult player with linked passport                                                           |
| **Steps**           | 1. Log in as adult player<br>2. Navigate to own passport                                    |
| **Expected Result** | - Own passport accessible<br>- Visibility settings respected<br>- Can view allowed sections |
| **Pass/Fail**       | ☐                                                                                           |

---

### 6.2 Player Passport Viewing

#### TEST-PLAYER-PASS-001: View Own Passport

| Field               | Value                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify player can view their passport                                                                         |
| **Preconditions**   | Adult player with passport data                                                                               |
| **Steps**           | 1. Log in as adult player<br>2. Navigate to own passport<br>3. Review all sections                            |
| **Expected Result** | - Basic info visible<br>- Skills and ratings visible<br>- Goals visible<br>- Coach notes visible (if allowed) |
| **Pass/Fail**       | ☐                                                                                                             |

#### TEST-PLAYER-PASS-002: View Skill Ratings

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Objective**       | Verify skill ratings display                                                          |
| **Preconditions**   | Player has skill assessments                                                          |
| **Steps**           | 1. Navigate to own passport<br>2. Find skills section                                 |
| **Expected Result** | - Skills listed by category<br>- Ratings displayed (1-5)<br>- Visual indicators shown |
| **Pass/Fail**       | ☐                                                                                     |

#### TEST-PLAYER-PASS-003: View Skill History

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Objective**       | Verify skill history accessible                                                            |
| **Preconditions**   | Player has assessment history                                                              |
| **Steps**           | 1. Navigate to skills section<br>2. Click on skill for history                             |
| **Expected Result** | - Historical ratings displayed<br>- Shows dates of assessments<br>- Progress trend visible |
| **Pass/Fail**       | ☐                                                                                          |

#### TEST-PLAYER-PASS-004: View Benchmark Comparison

| Field               | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Objective**       | Verify benchmarks display                                                                   |
| **Preconditions**   | Benchmarks configured for sport/age                                                         |
| **Steps**           | 1. Navigate to passport<br>2. Find benchmark comparison section                             |
| **Expected Result** | - Player rating vs benchmark shown<br>- Color coding (above/below/at)<br>- Status indicator |
| **Pass/Fail**       | ☐                                                                                           |

#### TEST-PLAYER-PASS-005: View Development Goals

| Field               | Value                                                           |
| ------------------- | --------------------------------------------------------------- |
| **Objective**       | Verify goals visible to player                                  |
| **Preconditions**   | Goals exist with player visibility                              |
| **Steps**           | 1. Navigate to passport<br>2. Find goals section                |
| **Expected Result** | - Goals displayed<br>- Shows target dates<br>- Progress visible |
| **Pass/Fail**       | ☐                                                               |

#### TEST-PLAYER-PASS-006: View Coach Notes (Public)

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Objective**       | Verify public coach notes visible                                                      |
| **Preconditions**   | Coach notes exist marked as player-visible                                             |
| **Steps**           | 1. Navigate to passport<br>2. Find notes section                                       |
| **Expected Result** | - Public notes displayed<br>- Private notes NOT visible<br>- Shows coach name and date |
| **Pass/Fail**       | ☐                                                                                      |

---

### 6.3 Injury & Medical

#### TEST-PLAYER-INJURY-001: View Own Injuries

| Field               | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| **Objective**       | Verify player can see own injuries                                         |
| **Preconditions**   | Player has injury records                                                  |
| **Steps**           | 1. Navigate to passport or injuries section<br>2. Review injury list       |
| **Expected Result** | - Current injuries shown<br>- Status displayed<br>- Recovery notes visible |
| **Pass/Fail**       | ☐                                                                          |

#### TEST-PLAYER-INJURY-002: Log Own Injury

| Field               | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Objective**       | Verify adult player can log injuries                                                      |
| **Preconditions**   | Adult player logged in                                                                    |
| **Steps**           | 1. Navigate to injuries section<br>2. Click "Add Injury"<br>3. Fill in details<br>4. Save |
| **Expected Result** | - Injury form accessible<br>- Can submit injury<br>- Record created                       |
| **Pass/Fail**       | ☐                                                                                         |

#### TEST-PLAYER-MEDICAL-001: View Own Medical Profile

| Field               | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| **Objective**       | Verify player can see medical info                                           |
| **Preconditions**   | Medical profile exists                                                       |
| **Steps**           | 1. Navigate to medical profile section                                       |
| **Expected Result** | - Allergies displayed<br>- Medications shown<br>- Emergency contacts visible |
| **Pass/Fail**       | ☐                                                                            |

#### TEST-PLAYER-MEDICAL-002: Update Emergency Contacts

| Field               | Value                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify adult player can manage contacts                                                                      |
| **Preconditions**   | Adult player logged in                                                                                       |
| **Steps**           | 1. Navigate to emergency contacts<br>2. Add/edit contact<br>3. Set ICE designation<br>4. Save                |
| **Expected Result** | - Contact form accessible<br>- Can add/edit contacts<br>- ICE designation works<br>- Priority ordering works |
| **Pass/Fail**       | ☐                                                                                                            |

---

### 6.4 Multi-Sport Access

#### TEST-PLAYER-MULTI-001: View Multi-Sport Passport

| Field               | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Objective**       | Verify player sees all sports                                                           |
| **Preconditions**   | Player registered in multiple sports                                                    |
| **Steps**           | 1. Navigate to player dashboard<br>2. Review sport cards                                |
| **Expected Result** | - All sports displayed<br>- Each shows organization/club<br>- Can switch between sports |
| **Pass/Fail**       | ☐                                                                                       |

#### TEST-PLAYER-MULTI-002: Switch Sport View

| Field               | Value                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify sport switching works                                                                       |
| **Preconditions**   | Player in multiple sports                                                                          |
| **Steps**           | 1. Click on different sport card<br>2. View sport-specific passport                                |
| **Expected Result** | - Navigates to correct sport passport<br>- Sport-specific skills shown<br>- Correct team displayed |
| **Pass/Fail**       | ☐                                                                                                  |

---

## 7. Parent Testing

### 7.1 Authentication & Access

#### TEST-PARENT-AUTH-001: Parent Login

| Field               | Value                                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can log in                                                          |
| **Preconditions**   | Parent account with linked children                                               |
| **Steps**           | 1. Navigate to `/login`<br>2. Enter parent credentials<br>3. Sign in              |
| **Expected Result** | - Login successful<br>- Redirect to organization<br>- Parent dashboard accessible |
| **Pass/Fail**       | ☐                                                                                 |

#### TEST-PARENT-AUTH-002: Access Denied Without Parent Role

| Field               | Value                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify non-parents cannot access parent dashboard                                                    |
| **Preconditions**   | User without parent role                                                                             |
| **Steps**           | 1. Log in as coach-only user<br>2. Navigate to `/orgs/[orgId]/parents`                               |
| **Expected Result** | - "Parent Access Required" message<br>- Instructions to request role<br>- Cannot view parent content |
| **Pass/Fail**       | ☐                                                                                                    |

---

### 7.2 Parent Dashboard

#### TEST-PARENT-DASH-001: View Linked Children

| Field               | Value                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent sees linked children                                                             |
| **Preconditions**   | Parent with linked children                                                                    |
| **Steps**           | 1. Navigate to `/orgs/[orgId]/parents`<br>2. Review children cards                             |
| **Expected Result** | - All linked children displayed<br>- Each shows: name, team, sport<br>- Click to view passport |
| **Pass/Fail**       | ☐                                                                                              |

#### TEST-PARENT-DASH-002: No Children Linked State

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Objective**       | Verify empty state for new parents                                                         |
| **Preconditions**   | Parent with no linked children                                                             |
| **Steps**           | 1. Log in as parent with no children<br>2. Navigate to parent dashboard                    |
| **Expected Result** | - "No children linked yet" message<br>- Instructions for linking<br>- Contact admin option |
| **Pass/Fail**       | ☐                                                                                          |

#### TEST-PARENT-DASH-003: Family Header Stats

| Field               | Value                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify summary statistics                                                                                          |
| **Preconditions**   | Parent with multiple children                                                                                      |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Review header section                                                        |
| **Expected Result** | - "Your Family's Journey" header<br>- Total children count<br>- Total sports count<br>- Organization context shown |
| **Pass/Fail**       | ☐                                                                                                                  |

#### TEST-PARENT-DASH-004: View Child Performance Score

| Field               | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Objective**       | Verify performance display on card                                                           |
| **Preconditions**   | Child with skill assessments                                                                 |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find child card<br>3. Review performance section       |
| **Expected Result** | - Overall score displayed<br>- Progress bar shown<br>- Comparison to previous (if available) |
| **Pass/Fail**       | ☐                                                                                            |

#### TEST-PARENT-DASH-005: View Top Strengths

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Objective**       | Verify top skills display                                                                  |
| **Preconditions**   | Child with skill ratings                                                                   |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find child card<br>3. Review "Top Strengths" section |
| **Expected Result** | - Top 3 skills shown<br>- Star ratings displayed<br>- Skill names visible                  |
| **Pass/Fail**       | ☐                                                                                          |

#### TEST-PARENT-DASH-006: View Attendance Summary

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Objective**       | Verify attendance display                                                             |
| **Preconditions**   | Child with attendance data                                                            |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find child card<br>3. Review attendance section |
| **Expected Result** | - Training attendance %<br>- Match attendance %<br>- Color coding (green/yellow/red)  |
| **Pass/Fail**       | ☐                                                                                     |

#### TEST-PARENT-DASH-007: View Development Goals

| Field               | Value                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| **Objective**       | Verify goals visible to parent                                                   |
| **Preconditions**   | Child has goals with parent visibility                                           |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find child card<br>3. Review goals section |
| **Expected Result** | - Goals displayed<br>- "How Parents Can Help" section<br>- Progress indicators   |
| **Pass/Fail**       | ☐                                                                                |

#### TEST-PARENT-DASH-008: View Injury Status

| Field               | Value                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify injury summary visible                                                                                        |
| **Preconditions**   | Child with injury records                                                                                            |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find child card<br>3. Review injury section                                    |
| **Expected Result** | - Active injuries count (red)<br>- Recovering count (yellow)<br>- Or "No injuries" (green)<br>- Link to full details |
| **Pass/Fail**       | ☐                                                                                                                    |

---

### 7.3 View Child's Passport

#### TEST-PARENT-PASSPORT-001: Navigate to Child Passport

| Field               | Value                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can view child's passport                                             |
| **Preconditions**   | Parent with linked child                                                            |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Click "View Full Passport" on child card      |
| **Expected Result** | - Navigates to passport page<br>- Full passport displayed<br>- All sections visible |
| **Pass/Fail**       | ☐                                                                                   |

#### TEST-PARENT-PASSPORT-002: View Child Skill Assessments

| Field               | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| **Objective**       | Verify parent sees assessments                                                  |
| **Preconditions**   | Child has assessments                                                           |
| **Steps**           | 1. Navigate to child's passport<br>2. Find skills section                       |
| **Expected Result** | - Skills displayed by category<br>- Ratings shown<br>- Assessment dates visible |
| **Pass/Fail**       | ☐                                                                               |

#### TEST-PARENT-PASSPORT-003: Cannot Edit Child Data

| Field               | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent has read-only access                                                          |
| **Preconditions**   | Parent viewing child passport                                                               |
| **Steps**           | 1. Navigate to child's passport<br>2. Look for "Edit" buttons                               |
| **Expected Result** | - No "Edit Player" button visible<br>- Cannot modify skill ratings<br>- Read-only view only |
| **Pass/Fail**       | ☐                                                                                           |

---

### 7.4 Coach Feedback

#### TEST-PARENT-FEEDBACK-001: View Coach Notes

| Field               | Value                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent sees coach feedback                                                               |
| **Preconditions**   | Child has coach notes                                                                           |
| **Steps**           | 1. Navigate to parent dashboard or child passport<br>2. Find coach feedback section             |
| **Expected Result** | - Notes displayed<br>- Shows coach name and team<br>- Date visible<br>- Only public notes shown |
| **Pass/Fail**       | ☐                                                                                               |

---

### 7.5 Child Self-Access Control

#### TEST-PARENT-ACCESS-001: Enable Child Self-Access

| Field               | Value                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify parent can enable child login                                                                                                                                     |
| **Preconditions**   | Child meets minimum age requirement                                                                                                                                      |
| **Steps**           | 1. Navigate to child management<br>2. Find "Enable Direct Access" option<br>3. Configure visibility settings<br>4. Choose login method (email invite/code)<br>5. Confirm |
| **Expected Result** | - Access enabled<br>- Visibility settings saved<br>- Login method configured<br>- Child can now access own passport                                                      |
| **Pass/Fail**       | ☐                                                                                                                                                                        |

#### TEST-PARENT-ACCESS-002: Configure Visibility Settings

| Field               | Value                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify visibility controls                                                                                    |
| **Preconditions**   | Child with self-access                                                                                        |
| **Steps**           | 1. Navigate to child access settings<br>2. Toggle visibility options<br>3. Save changes                       |
| **Expected Result** | - Can toggle: skill ratings, coach notes, goals, etc.<br>- Settings persist<br>- Child view respects settings |
| **Pass/Fail**       | ☐                                                                                                             |

#### TEST-PARENT-ACCESS-003: Revoke Child Access

| Field               | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can disable child access                                          |
| **Preconditions**   | Child has self-access enabled                                                   |
| **Steps**           | 1. Navigate to child access settings<br>2. Click "Disable Access"<br>3. Confirm |
| **Expected Result** | - Access disabled<br>- Child cannot log in<br>- Can re-enable later             |
| **Pass/Fail**       | ☐                                                                               |

#### TEST-PARENT-ACCESS-004: Notification Preferences

| Field               | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Objective**       | Verify notification settings                                                                |
| **Preconditions**   | Child has self-access                                                                       |
| **Steps**           | 1. Navigate to child access settings<br>2. Toggle "Notify on login"<br>3. Save              |
| **Expected Result** | - Setting saves<br>- Parent notified when child logs in (if enabled)<br>- Can toggle on/off |
| **Pass/Fail**       | ☐                                                                                           |

---

### 7.6 Multi-Sport Children

#### TEST-PARENT-MULTI-001: View Multi-Sport Child

| Field               | Value                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Objective**       | Verify multi-sport display                                                                      |
| **Preconditions**   | Child plays multiple sports                                                                     |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find multi-sport child card                               |
| **Expected Result** | - "Multi-sport" badge displayed<br>- All sports listed<br>- Separate passport buttons per sport |
| **Pass/Fail**       | ☐                                                                                               |

#### TEST-PARENT-MULTI-002: Navigate Between Sports

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify sport switching                                                                                     |
| **Preconditions**   | Child in multiple sports                                                                                   |
| **Steps**           | 1. Click "View [Sport] Passport" button<br>2. View sport-specific passport<br>3. Switch to different sport |
| **Expected Result** | - Each sport passport accessible<br>- Sport-specific data shown<br>- Can switch between sports             |
| **Pass/Fail**       | ☐                                                                                                          |

---

## 8. Cross-Role Testing Scenarios

### 8.1 Multi-Role User

#### TEST-MULTI-001: Role Switching

| Field               | Value                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify user can switch between roles                                                                                                             |
| **Preconditions**   | User with coach + parent roles                                                                                                                   |
| **Steps**           | 1. Log in as multi-role user<br>2. Find role switcher in navigation<br>3. Switch from coach to parent<br>4. Observe dashboard change             |
| **Expected Result** | - Role switcher visible<br>- Can switch between coach and parent views<br>- Dashboard updates accordingly<br>- Permissions correct for each role |
| **Pass/Fail**       | ☐                                                                                                                                                |

#### TEST-MULTI-002: Coach View Shows Only Assigned Teams

| Field               | Value                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach view scope                                                                                                 |
| **Preconditions**   | Multi-role user in coach mode                                                                                           |
| **Steps**           | 1. Switch to coach role<br>2. Navigate to coach dashboard<br>3. Review player list                                      |
| **Expected Result** | - Only assigned team players visible<br>- Cannot see own children unless in assigned teams<br>- Coach permissions apply |
| **Pass/Fail**       | ☐                                                                                                                       |

#### TEST-MULTI-003: Parent View Shows Only Linked Children

| Field               | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent view scope                                                                  |
| **Preconditions**   | Multi-role user in parent mode                                                            |
| **Steps**           | 1. Switch to parent role<br>2. Navigate to parent dashboard<br>3. Review children list    |
| **Expected Result** | - Only linked children visible<br>- Cannot see team players<br>- Parent permissions apply |
| **Pass/Fail**       | ☐                                                                                         |

---

### 8.2 Organization Join Workflow

#### TEST-JOIN-001: New User Registration

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Objective**       | Verify new user can register                                                  |
| **Preconditions**   | Email not previously registered                                               |
| **Steps**           | 1. Navigate to `/signup`<br>2. Fill in registration form<br>3. Submit         |
| **Expected Result** | - Account created<br>- Redirect to `/orgs/join`<br>- Can browse organizations |
| **Pass/Fail**       | ☐                                                                             |

#### TEST-JOIN-002: Browse Available Organizations

| Field               | Value                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Objective**       | Verify organization discovery                                                        |
| **Preconditions**   | User authenticated, no memberships                                                   |
| **Steps**           | 1. Navigate to `/orgs/join`<br>2. Browse organization list                           |
| **Expected Result** | - Organizations displayed<br>- Shows name, logo, member count<br>- Can search/filter |
| **Pass/Fail**       | ☐                                                                                    |

#### TEST-JOIN-003: Submit Coach Join Request

| Field               | Value                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach request flow                                                                                                                                        |
| **Preconditions**   | User not member of target org                                                                                                                                    |
| **Steps**           | 1. Navigate to `/orgs/join/[orgId]`<br>2. Select "Coach" role<br>3. Enter sport preferences<br>4. Enter team preferences<br>5. Add optional message<br>6. Submit |
| **Expected Result** | - Request submitted<br>- Success message<br>- Request shows as "Pending"<br>- Admin notified                                                                     |
| **Pass/Fail**       | ☐                                                                                                                                                                |

#### TEST-JOIN-004: Submit Parent Join Request

| Field               | Value                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent request flow                                                                                                                     |
| **Preconditions**   | User not member of target org                                                                                                                  |
| **Steps**           | 1. Navigate to `/orgs/join/[orgId]`<br>2. Select "Parent" role<br>3. Enter contact info<br>4. Add children info (name, age, team)<br>5. Submit |
| **Expected Result** | - Request submitted<br>- Children info recorded<br>- Success message<br>- Request shows as "Pending"                                           |
| **Pass/Fail**       | ☐                                                                                                                                              |

#### TEST-JOIN-005: Cancel Pending Request

| Field               | Value                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Objective**       | Verify request cancellation                                                                  |
| **Preconditions**   | User has pending request                                                                     |
| **Steps**           | 1. Navigate to `/orgs`<br>2. Find pending request<br>3. Click "Cancel Request"<br>4. Confirm |
| **Expected Result** | - Request cancelled<br>- Removed from list<br>- Can submit new request                       |
| **Pass/Fail**       | ☐                                                                                            |

---

### 8.3 Invitation Flow

#### TEST-INVITE-001: Accept Email Invitation

| Field               | Value                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify invitation acceptance                                                                                                                     |
| **Preconditions**   | Invitation email received                                                                                                                        |
| **Steps**           | 1. Click invitation link in email<br>2. Navigate to `/orgs/accept-invitation/[id]`<br>3. If not logged in, sign in first<br>4. Accept invitation |
| **Expected Result** | - Invitation accepted<br>- Added to organization<br>- Redirect to org dashboard<br>- Correct role assigned                                       |
| **Pass/Fail**       | ☐                                                                                                                                                |

#### TEST-INVITE-002: Expired Invitation

| Field         | Value                              |
| ------------- | ---------------------------------- |
| **Objective** | Verify expired invitation handling |
