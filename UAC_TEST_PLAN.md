# User Acceptance Testing (UAT) Plan

## PDP (Player Development Platform) / PlayerARC

**Version:** 1.1  
**Date:** January 4, 2026  
**Status:** GitHub Project Board Created - Ready for Execution  
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

## 4. First-Time Setup & Onboarding Testing

This section covers the critical first-time setup scenarios when an organization is being established for the first time.

### 4.0 Platform Staff - Organization Creation

#### TEST-SETUP-001: Platform Staff Creates First Organization

| Field               | Value                                                                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify platform staff can create a new organization from scratch                                                                                                                                                                                 |
| **Preconditions**   | Platform staff account exists with `isPlatformStaff: true` flag                                                                                                                                                                                 |
| **Steps**           | 1. Navigate to `/login`<br>2. Enter platform staff credentials<br>3. Sign in<br>4. Navigate to `/orgs/create`<br>5. Enter organization name: "New Club FC"<br>6. Set primary color and secondary color<br>7. Upload logo (optional)<br>8. Click "Create Organization" |
| **Expected Result** | - Organization creation form accessible only to platform staff<br>- All required fields validated<br>- Organization created successfully<br>- Platform staff becomes organization owner<br>- Redirect to new organization dashboard         |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                               |

#### TEST-SETUP-002: Non-Platform Staff Cannot Create Organizations

| Field               | Value                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify regular users cannot access organization creation                                                 |
| **Preconditions**   | Regular user account (no platform staff flag)                                                            |
| **Steps**           | 1. Log in as regular user<br>2. Manually navigate to `/orgs/create`                                      |
| **Expected Result** | - Access denied or redirected<br>- Cannot see organization creation form<br>- Error message displayed   |
| **Pass/Fail**       | ☐                                                                                                       |

### 4.0.1 Owner First-Time Setup

#### TEST-SETUP-003: Owner First Login Experience

| Field               | Value                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify what the organization owner sees on their very first login after organization creation                                                                                                                                         |
| **Preconditions**   | New organization just created, owner logging in for first time                                                                                                                                                                        |
| **Steps**           | 1. Log in as organization owner<br>2. Observe initial dashboard state<br>3. Review onboarding prompts/checklist                                                                                                                      |
| **Expected Result** | - Dashboard loads with empty state messaging<br>- Onboarding checklist or setup wizard displayed<br>- Clear guidance on next steps (create team, invite admin)<br>- Stats show 0 players, 0 teams, 0 coaches                       |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                    |

#### TEST-SETUP-004: Owner Creates First Team

| Field               | Value                                                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify owner can create the first team in a new organization                                                                                                                                                            |
| **Preconditions**   | New organization with no teams                                                                                                                                                                                          |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Observe empty state messaging<br>3. Click "Create Team" or "Add First Team"<br>4. Enter: Name: "U10 Boys", Sport: "GAA Football", Age Group: "U10", Gender: "Male"<br>5. Click "Create Team" |
| **Expected Result** | - Empty state shows "No teams yet" message<br>- Clear CTA to create first team<br>- Team creation form works<br>- Team created successfully<br>- Appears in team list<br>- Onboarding progress updates (if applicable) |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                      |

#### TEST-SETUP-005: Owner Invites First Admin

| Field               | Value                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify owner can invite the first administrator to help manage the organization                                                                                                                                                                    |
| **Preconditions**   | New organization with only owner as member                                                                                                                                                                                                         |
| **Steps**           | 1. Navigate to `/admin/users`<br>2. Observe single member (owner only)<br>3. Click "Invite Member"<br>4. Enter email: `newadmin@example.com`<br>5. Select role: "admin"<br>6. Add optional message<br>7. Click "Send Invitation"                   |
| **Expected Result** | - Member list shows owner only initially<br>- Can send invitation email<br>- Pending invitation appears in list<br>- Invitation email sent to recipient<br>- Success toast displayed                                                               |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                                 |

#### TEST-SETUP-006: First Admin Accepts Invitation

| Field               | Value                                                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify invited admin can accept invitation and set up their account                                                                                                                                                                  |
| **Preconditions**   | Invitation email sent, recipient has email access                                                                                                                                                                                    |
| **Steps**           | 1. Open invitation email<br>2. Click invitation link<br>3. If new user: complete registration<br>4. If existing user: sign in<br>5. Accept invitation on acceptance page<br>6. Observe assigned role                                |
| **Expected Result** | - Invitation link works correctly<br>- Can register new account or sign in existing<br>- Invitation accepted successfully<br>- User added to organization with admin role<br>- Redirect to organization dashboard with admin access |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                   |

#### TEST-SETUP-007: Owner Invites First Coach

| Field               | Value                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify owner/admin can invite the first coach and assign teams                                                                                                                                                                                        |
| **Preconditions**   | Organization has at least one team created                                                                                                                                                                                                            |
| **Steps**           | 1. Navigate to `/admin/users`<br>2. Click "Invite Member"<br>3. Enter email: `coach@example.com`<br>4. Select role: "coach"<br>5. (If available) Pre-assign teams: "U10 Boys"<br>6. Click "Send Invitation"                                           |
| **Expected Result** | - Can invite with coach role<br>- Team pre-assignment option available (or configured after acceptance)<br>- Invitation sent successfully<br>- Pending invitation visible                                                                            |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                                    |

#### TEST-SETUP-008: First Coach Accepts and Gets Team Assignment

| Field               | Value                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify coach invitation acceptance and team assignment workflow                                                                                                                                                           |
| **Preconditions**   | Coach invitation sent                                                                                                                                                                                                     |
| **Steps**           | 1. Coach clicks invitation link<br>2. Registers/signs in<br>3. Accepts invitation<br>4. Admin assigns teams (if not pre-assigned)<br>5. Coach navigates to `/coach` dashboard                                            |
| **Expected Result** | - Coach added to organization<br>- Teams assigned by admin<br>- Coach dashboard accessible<br>- Assigned teams visible<br>- Empty player state shown (no players yet)                                                    |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                        |

#### TEST-SETUP-009: Admin Creates First Players

| Field               | Value                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can add the first players to the organization                                                                                                                                                                                    |
| **Preconditions**   | Organization with team but no players                                                                                                                                                                                                         |
| **Steps**           | 1. Navigate to `/admin/players`<br>2. Observe empty state<br>3. Click "Add Player" or use GAA Import<br>4. Enter player details: Name, DOB, Gender<br>5. Assign to team: "U10 Boys"<br>6. Save                                                |
| **Expected Result** | - Empty state messaging shown initially<br>- Can add individual players<br>- Can bulk import via GAA wizard<br>- Player created and assigned to team<br>- Appears in player list<br>- Coach can now see player in their dashboard            |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                            |

#### TEST-SETUP-010: Owner Invites First Parent

| Field               | Value                                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent invitation and child linking workflow                                                                                                                                                                                |
| **Preconditions**   | Player exists in organization                                                                                                                                                                                                      |
| **Steps**           | 1. Navigate to player record<br>2. Find parent email field or invitation option<br>3. Enter parent email<br>4. Send invitation<br>5. Parent accepts invitation<br>6. Verify child linking                                         |
| **Expected Result** | - Can invite parent via player record or user management<br>- Parent receives invitation<br>- Upon acceptance, parent linked to child<br>- Parent dashboard shows linked child<br>- Smart matching suggestions work if applicable |
| **Pass/Fail**       | ☐                                                                                                                                                                                                                                 |

---

## 4.1 Platform Admin Testing

### 4.1.1 Authentication & Access

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

| Field               | Value                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| **Objective**       | Verify expired invitation handling                                               |
| **Preconditions**   | Invitation has expired                                                           |
| **Steps**           | 1. Click expired invitation link                                                 |
| **Expected Result** | - Error message displayed<br>- Cannot accept<br>- Contact admin instructions     |
| **Pass/Fail**       | ☐                                                                                |

---

## 9. Additional UAT Tests (Gap Analysis)

The following tests were identified through comprehensive code analysis as missing from the original test plan.

### 9.1 Platform Staff Features

#### TEST-PLATFORM-001: Platform Staff Dashboard Access

| Field               | Value                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Objective**       | Verify platform staff can access `/platform` routes                                                    |
| **Preconditions**   | User has `isPlatformStaff: true` flag                                                                  |
| **Steps**           | 1. Login as platform staff<br>2. Navigate to `/platform`<br>3. Review dashboard                        |
| **Expected Result** | - Platform dashboard accessible<br>- Shows platform-wide stats<br>- Navigation to sub-sections works   |
| **Pass/Fail**       | ☐                                                                                                      |

#### TEST-PLATFORM-002: Manage Sports

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify platform staff can create/edit/delete sports                                                       |
| **Preconditions**   | Platform staff logged in                                                                                  |
| **Steps**           | 1. Navigate to `/platform/sports`<br>2. Create new sport<br>3. Edit existing sport<br>4. Delete sport     |
| **Expected Result** | - CRUD operations work<br>- Sports list updates<br>- Validation enforced                                  |
| **Pass/Fail**       | ☐                                                                                                         |

#### TEST-PLATFORM-003: Manage Skill Categories

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify platform staff can manage skill categories per sport                                               |
| **Preconditions**   | Platform staff logged in, sports exist                                                                    |
| **Steps**           | 1. Navigate to `/platform/skills`<br>2. Select sport<br>3. Create/edit/delete skill categories            |
| **Expected Result** | - Categories organize under sports<br>- Can reorder categories<br>- Changes persist                       |
| **Pass/Fail**       | ☐                                                                                                         |

#### TEST-PLATFORM-004: Manage Skill Definitions

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify platform staff can manage individual skills                                                        |
| **Preconditions**   | Platform staff logged in, categories exist                                                                |
| **Steps**           | 1. Navigate to `/platform/skills`<br>2. Expand category<br>3. Create/edit/delete skills                   |
| **Expected Result** | - Skills linked to categories<br>- Age group applicability configured<br>- Assessment criteria defined    |
| **Pass/Fail**       | ☐                                                                                                         |

#### TEST-PLATFORM-005: Platform Staff Management

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify platform staff can be added/removed                                                                |
| **Preconditions**   | Platform staff logged in                                                                                  |
| **Steps**           | 1. Navigate to `/platform/staff`<br>2. Add new staff by email<br>3. Remove existing staff                 |
| **Expected Result** | - Can grant platform staff access<br>- Can revoke access<br>- Changes take effect immediately             |
| **Pass/Fail**       | ☐                                                                                                         |

#### TEST-PLATFORM-006: Bulk Skills Import

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify bulk import of skills via JSON/CSV                                                                 |
| **Preconditions**   | Platform staff logged in, valid import file                                                               |
| **Steps**           | 1. Navigate to skills page<br>2. Click bulk import<br>3. Upload file<br>4. Preview and confirm            |
| **Expected Result** | - File parsed correctly<br>- Preview shows items to import<br>- Import creates records<br>- Summary shown |
| **Pass/Fail**       | ☐                                                                                                         |

### 9.2 Player Management (Extended)

#### TEST-PLAYER-CREATE-001: Create Player (Admin)

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can create new player manually                                                                    |
| **Preconditions**   | Admin logged in                                                                                                |
| **Steps**           | 1. Navigate to `/admin/players`<br>2. Click "Add Player"<br>3. Fill form<br>4. Save                            |
| **Expected Result** | - Form validates required fields<br>- Player created<br>- Assigned to org<br>- Can assign to team              |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PLAYER-EDIT-001: Edit Player Basic Info

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin/coach can edit player details                                                                     |
| **Preconditions**   | Player exists, user has edit permission                                                                        |
| **Steps**           | 1. Navigate to player passport<br>2. Click edit<br>3. Update name, DOB, positions<br>4. Save                   |
| **Expected Result** | - Edit form loads current data<br>- Changes validate<br>- Updates persist<br>- Audit trail created             |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PLAYER-IMPORT-001: Bulk Player Import via CSV

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify bulk player import via CSV                                                                              |
| **Preconditions**   | Admin logged in, valid CSV file                                                                                |
| **Steps**           | 1. Navigate to `/admin/player-import`<br>2. Upload CSV<br>3. Map columns<br>4. Preview<br>5. Import            |
| **Expected Result** | - CSV parsed<br>- Column mapping works<br>- Preview shows players<br>- Import creates records                  |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PLAYER-TEAM-001: Player Team Assignment

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify player can be assigned to team                                                                          |
| **Preconditions**   | Player exists, teams exist                                                                                     |
| **Steps**           | 1. Navigate to player or team management<br>2. Assign player to team<br>3. Save                                |
| **Expected Result** | - Assignment created<br>- Player appears in team roster<br>- Coach sees player                                 |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PLAYER-MULTI-TEAM-001: Multi-Team Player

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify player can be on multiple teams                                                                         |
| **Preconditions**   | Player exists, multiple teams exist                                                                            |
| **Steps**           | 1. Assign player to Team A<br>2. Also assign to Team B<br>3. Verify both assignments                           |
| **Expected Result** | - Player on both teams<br>- Both coaches see player<br>- Core team identified                                  |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PLAYER-DELETE-001: Player Delete/Archive

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify player can be removed from org                                                                          |
| **Preconditions**   | Player exists                                                                                                  |
| **Steps**           | 1. Navigate to player<br>2. Click delete/archive<br>3. Confirm                                                 |
| **Expected Result** | - Player archived/deleted<br>- Removed from team rosters<br>- Historical data preserved (if archived)          |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.3 Skill Assessment (Extended)

#### TEST-ASSESS-BATCH-001: Batch Assessment

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can assess multiple players at once                                                               |
| **Preconditions**   | Multiple players in assigned team                                                                              |
| **Steps**           | 1. Navigate to assess page<br>2. Select multiple players<br>3. Rate common skill<br>4. Save all                |
| **Expected Result** | - Multiple players selected<br>- Single rating applied to all<br>- All assessments saved                       |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ASSESS-HISTORY-001: Assessment History

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify assessment history is viewable                                                                          |
| **Preconditions**   | Player with multiple assessments                                                                               |
| **Steps**           | 1. Navigate to player passport<br>2. Click on skill<br>3. View history                                         |
| **Expected Result** | - All assessments listed<br>- Shows date, assessor, rating<br>- Can see trend                                  |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ASSESS-STATUS-001: Assessment Triggers Review Status

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify assessment updates review status                                                                        |
| **Preconditions**   | Player with overdue review                                                                                     |
| **Steps**           | 1. Note player's review status<br>2. Complete assessment<br>3. Check review status                             |
| **Expected Result** | - Review date updated<br>- Status changes to "Completed"<br>- Next review date calculated                      |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.4 Team Management (Extended)

#### TEST-TEAM-CREATE-001: Create Team

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can create new team                                                                               |
| **Preconditions**   | Admin logged in                                                                                                |
| **Steps**           | 1. Navigate to `/admin/teams`<br>2. Click "Create Team"<br>3. Fill form<br>4. Save                             |
| **Expected Result** | - Team created<br>- Appears in list<br>- Can assign players/coaches                                            |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-TEAM-COACH-001: Assign Coach to Team

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can assign coach to team                                                                          |
| **Preconditions**   | Team exists, coach exists                                                                                      |
| **Steps**           | 1. Navigate to team or coach management<br>2. Assign coach to team<br>3. Save                                  |
| **Expected Result** | - Assignment created<br>- Coach sees team in dashboard<br>- Coach can access team players                      |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-TEAM-COACH-REMOVE-001: Remove Coach from Team

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach can be unassigned from team                                                                       |
| **Preconditions**   | Coach assigned to team                                                                                         |
| **Steps**           | 1. Navigate to coach assignments<br>2. Remove team<br>3. Save                                                  |
| **Expected Result** | - Assignment removed<br>- Coach no longer sees team<br>- Coach loses access to team players                    |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-TEAM-ELIGIBILITY-001: Player Eligibility Override

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify age group restrictions can be overridden                                                                |
| **Preconditions**   | Player outside team's age group                                                                                |
| **Steps**           | 1. Try to assign player to team<br>2. See warning<br>3. Apply override<br>4. Confirm                           |
| **Expected Result** | - Warning shown for mismatch<br>- Override option available<br>- Player assigned with override note            |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.5 Benchmark Features

#### TEST-BENCH-CREATE-001: Create Custom Benchmark

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify org can create custom benchmarks                                                                        |
| **Preconditions**   | Admin logged in                                                                                                |
| **Steps**           | 1. Navigate to `/admin/benchmarks`<br>2. Create custom benchmark<br>3. Set values<br>4. Save                   |
| **Expected Result** | - Custom benchmark created<br>- Appears alongside NGB<br>- Used in comparisons                                 |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-BENCH-COMPARE-001: Player vs Benchmark Compare

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify player skills compared to benchmark                                                                     |
| **Preconditions**   | Player has assessments, benchmarks configured                                                                  |
| **Steps**           | 1. Navigate to player passport<br>2. Find benchmark comparison section                                         |
| **Expected Result** | - Player rating vs benchmark shown<br>- Color coded (above/at/below)<br>- Gap analysis visible                 |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.6 Organization Settings (Extended)

#### TEST-ORG-EDIT-001: Edit Org Name/Logo

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify org details can be updated                                                                              |
| **Preconditions**   | Owner or admin logged in                                                                                       |
| **Steps**           | 1. Navigate to `/admin/settings`<br>2. Update org name<br>3. Upload new logo<br>4. Save                        |
| **Expected Result** | - Name updated<br>- Logo uploaded and displayed<br>- Changes reflected throughout app                          |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ORG-THEME-001: Theme Applied to UI

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify theme colors apply to UI components                                                                     |
| **Preconditions**   | Custom colors configured                                                                                       |
| **Steps**           | 1. Set custom primary/secondary colors<br>2. Navigate through app<br>3. Verify color application               |
| **Expected Result** | - Headers use theme colors<br>- Buttons styled correctly<br>- Consistent branding throughout                   |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ORG-SPORT-001: Sport Association

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify org can be associated with sports                                                                       |
| **Preconditions**   | Sports exist in platform                                                                                       |
| **Steps**           | 1. Navigate to settings<br>2. Select associated sports<br>3. Save                                              |
| **Expected Result** | - Sports linked to org<br>- Only relevant skills shown<br>- Team sports filtered                               |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.7 User Management (Extended)

#### TEST-USER-DISABLE-001: Disable Member Access

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can temporarily suspend member                                                                    |
| **Preconditions**   | Active member exists                                                                                           |
| **Steps**           | 1. Navigate to user management<br>2. Find member<br>3. Click "Disable"<br>4. Enter reason<br>5. Confirm        |
| **Expected Result** | - Member disabled<br>- Cannot log in to org<br>- Shows as disabled in list<br>- Reason recorded                |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-USER-ENABLE-001: Re-enable Member

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify disabled member can be restored                                                                         |
| **Preconditions**   | Disabled member exists                                                                                         |
| **Steps**           | 1. Find disabled member<br>2. Click "Enable"<br>3. Confirm                                                     |
| **Expected Result** | - Member re-enabled<br>- Can log in again<br>- Previous roles restored                                         |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-USER-REMOVE-001: Remove Member from Org

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify full removal with cascade                                                                               |
| **Preconditions**   | Member exists with data (coach assignments, etc.)                                                              |
| **Steps**           | 1. Find member<br>2. Click "Remove from Org"<br>3. Review impact preview<br>4. Confirm                         |
| **Expected Result** | - Impact preview shown<br>- Member removed<br>- Related data cleaned up<br>- Cannot access org                 |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-USER-TRANSFER-001: Transfer Org Ownership

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify owner can transfer ownership                                                                            |
| **Preconditions**   | Owner logged in, another admin exists                                                                          |
| **Steps**           | 1. Navigate to settings<br>2. Find ownership transfer<br>3. Select new owner<br>4. Confirm                     |
| **Expected Result** | - Ownership transferred<br>- Previous owner becomes admin<br>- New owner has full control                      |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.8 Invitation System (Extended)

#### TEST-INV-ROLES-001: Invitation with Roles

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify functional roles set on invite                                                                          |
| **Preconditions**   | Admin logged in                                                                                                |
| **Steps**           | 1. Create invitation<br>2. Select functional roles (coach/parent/admin)<br>3. Send                             |
| **Expected Result** | - Roles saved with invitation<br>- Applied when accepted<br>- Visible in pending list                          |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-INV-TEAMS-001: Invitation with Team Assignment

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify teams pre-assigned for coach invites                                                                    |
| **Preconditions**   | Teams exist                                                                                                    |
| **Steps**           | 1. Create coach invitation<br>2. Select teams<br>3. Send<br>4. Accept invitation                               |
| **Expected Result** | - Teams pre-selected<br>- Coach assignment created on acceptance<br>- Coach sees teams immediately             |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-INV-RESEND-001: Resend Invitation

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify invitation can be resent                                                                                |
| **Preconditions**   | Pending invitation exists                                                                                      |
| **Steps**           | 1. Find pending invitation<br>2. Click "Resend"<br>3. Confirm                                                  |
| **Expected Result** | - New email sent<br>- Resend count updated<br>- Expiry potentially extended                                    |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-INV-CANCEL-001: Cancel Invitation

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can cancel pending invite                                                                         |
| **Preconditions**   | Pending invitation exists                                                                                      |
| **Steps**           | 1. Find pending invitation<br>2. Click "Cancel"<br>3. Confirm                                                  |
| **Expected Result** | - Invitation cancelled<br>- Link no longer works<br>- Removed from pending list                                |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-INV-AUDIT-001: Invitation Audit Trail

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify invitation history is tracked                                                                           |
| **Preconditions**   | Invitation with events (created, resent, etc.)                                                                 |
| **Steps**           | 1. Find invitation<br>2. View history/audit trail                                                              |
| **Expected Result** | - All events logged<br>- Shows who, when, what action<br>- Chronological order                                 |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.9 Parent Features (Extended)

#### TEST-PARENT-SKILLS-001: View Child Skills

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can see child's skill assessments                                                                |
| **Preconditions**   | Child has skill assessments                                                                                    |
| **Steps**           | 1. Navigate to child passport<br>2. Review skills section                                                      |
| **Expected Result** | - Skills displayed by category<br>- Ratings visible<br>- Progress indicators shown                             |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PARENT-GOALS-001: View Child Goals

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can see development goals                                                                        |
| **Preconditions**   | Child has goals with parent visibility                                                                         |
| **Steps**           | 1. Navigate to child passport<br>2. Review goals section                                                       |
| **Expected Result** | - Goals displayed<br>- Progress shown<br>- "How parents can help" visible                                      |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PARENT-SCHEDULE-001: View Child Schedule

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can see training schedule                                                                        |
| **Preconditions**   | Schedule configured for team                                                                                   |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find schedule section                                                    |
| **Expected Result** | - Weekly schedule displayed<br>- Training times shown<br>- Match days highlighted                              |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PARENT-AI-001: AI Practice Assistant

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify AI practice recommendations work                                                                        |
| **Preconditions**   | Child has skill assessments                                                                                    |
| **Steps**           | 1. Navigate to parent dashboard<br>2. Find AI practice assistant<br>3. Request recommendations                 |
| **Expected Result** | - AI generates personalized drills<br>- Based on child's weaknesses<br>- Age-appropriate activities            |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PARENT-SETTINGS-001: Update Guardian Settings

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can update contact info                                                                          |
| **Preconditions**   | Parent logged in                                                                                               |
| **Steps**           | 1. Navigate to settings<br>2. Update phone/address<br>3. Update notification preferences<br>4. Save            |
| **Expected Result** | - Contact info updated<br>- Notification prefs saved<br>- Changes persist                                      |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-PARENT-MEDICAL-001: View Child Medical Info

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can see medical profile                                                                          |
| **Preconditions**   | Child has medical info                                                                                         |
| **Steps**           | 1. Navigate to child passport<br>2. Find medical section                                                       |
| **Expected Result** | - Allergies displayed<br>- Medications shown<br>- Emergency contacts listed                                    |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.10 Guardian/Parent Linking

#### TEST-GUARDIAN-BULK-001: Bulk Guardian Claim

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify parent can claim multiple children at once                                                              |
| **Preconditions**   | Multiple unclaimed children match parent email                                                                 |
| **Steps**           | 1. Login as parent<br>2. See unclaimed children prompt<br>3. Select children to claim<br>4. Confirm            |
| **Expected Result** | - Multiple children claimable<br>- All selected linked<br>- Appear in dashboard                                |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-GUARDIAN-ADMIN-001: Admin Links Parent to Player

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can manually link parent to child                                                                 |
| **Preconditions**   | Parent and player exist                                                                                        |
| **Steps**           | 1. Navigate to player or guardians management<br>2. Add guardian link<br>3. Specify relationship<br>4. Save    |
| **Expected Result** | - Link created<br>- Parent sees child<br>- Relationship recorded                                               |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-GUARDIAN-UNCLAIMED-001: View Unclaimed Guardians

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify admin can see unlinked guardians                                                                        |
| **Preconditions**   | Guardian identities exist without user links                                                                   |
| **Steps**           | 1. Navigate to `/admin/unclaimed-guardians`<br>2. Review list                                                  |
| **Expected Result** | - Unclaimed guardians listed<br>- Shows player associations<br>- Can send invitations                          |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.11 Player Self-Access

#### TEST-ACCESS-ADULT-001: Adult Player Self-Access

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify adult player can view own passport                                                                      |
| **Preconditions**   | Adult player (18+) with passport                                                                               |
| **Steps**           | 1. Login as adult player<br>2. Navigate to own passport                                                        |
| **Expected Result** | - Passport accessible<br>- All sections viewable<br>- Cannot edit (read-only for players)                      |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ACCESS-TOKEN-001: Player Access Token

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify shareable passport link generation                                                                      |
| **Preconditions**   | Player passport exists                                                                                         |
| **Steps**           | 1. Navigate to player passport<br>2. Click "Share"<br>3. Generate link<br>4. Copy and test                     |
| **Expected Result** | - Token generated<br>- Link shareable<br>- Expiry configurable<br>- Limited data exposure                      |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ACCESS-PUBLIC-001: Public Passport View

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify passport viewable via token                                                                             |
| **Preconditions**   | Valid share token exists                                                                                       |
| **Steps**           | 1. Open shared link (not logged in)<br>2. View passport                                                        |
| **Expected Result** | - Passport displays<br>- Limited data shown (configured sections)<br>- No edit capabilities                    |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.12 Analytics & Reporting

#### TEST-ANALYTICS-ADMIN-001: Admin Dashboard Stats

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify org-wide statistics display                                                                             |
| **Preconditions**   | Org has players, teams, assessments                                                                            |
| **Steps**           | 1. Navigate to admin dashboard<br>2. Review stat cards                                                         |
| **Expected Result** | - Player count accurate<br>- Team count accurate<br>- Assessment stats shown<br>- Trends displayed             |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ANALYTICS-COACH-001: Coach Analytics View

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify team performance analytics                                                                              |
| **Preconditions**   | Coach with team data                                                                                           |
| **Steps**           | 1. Navigate to coach dashboard<br>2. Click "Analytics"<br>3. Review team stats                                 |
| **Expected Result** | - Team averages shown<br>- Strengths/weaknesses identified<br>- Comparison charts available                    |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ANALYTICS-PROGRESS-001: Player Progress Over Time

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify historical skill progression                                                                            |
| **Preconditions**   | Player with multiple assessments over time                                                                     |
| **Steps**           | 1. Navigate to player passport<br>2. View progress charts                                                      |
| **Expected Result** | - Historical data plotted<br>- Trend lines shown<br>- Improvement/regression visible                           |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.13 Navigation & Multi-Org

#### TEST-NAV-ORG-001: Org Switcher

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify user can switch between organizations                                                                   |
| **Preconditions**   | User member of multiple orgs                                                                                   |
| **Steps**           | 1. Click org switcher in header<br>2. Select different org<br>3. Observe context change                        |
| **Expected Result** | - Org list shown<br>- Switch works<br>- Context updates (players, teams, etc.)                                 |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-NAV-ROLE-001: Role Switcher

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify active functional role switching                                                                        |
| **Preconditions**   | User with multiple functional roles                                                                            |
| **Steps**           | 1. Find role switcher<br>2. Switch from coach to parent<br>3. Observe navigation change                        |
| **Expected Result** | - Role options shown<br>- Active role changes<br>- Dashboard/nav updates accordingly                           |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-NAV-SIDEBAR-001: Sidebar Navigation

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify all sidebar links work                                                                                  |
| **Preconditions**   | User logged in with role                                                                                       |
| **Steps**           | 1. Click each sidebar link<br>2. Verify page loads                                                             |
| **Expected Result** | - All links functional<br>- Correct pages load<br>- No 404 errors                                              |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-NAV-BREADCRUMB-001: Breadcrumb Navigation

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify breadcrumbs show correct path                                                                           |
| **Preconditions**   | Deep navigation (e.g., org > admin > players > player)                                                         |
| **Steps**           | 1. Navigate deep into app<br>2. Check breadcrumbs<br>3. Click breadcrumb links                                 |
| **Expected Result** | - Path accurate<br>- Links work<br>- Can navigate back via breadcrumbs                                         |
| **Pass/Fail**       | ☐                                                                                                              |

### 9.14 Error Handling & Edge Cases

#### TEST-ERR-EMPTY-001: Empty State - No Players

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify coach dashboard with no players                                                                         |
| **Preconditions**   | Coach assigned to empty team                                                                                   |
| **Steps**           | 1. Login as coach<br>2. Navigate to dashboard                                                                  |
| **Expected Result** | - "No players" message shown<br>- Helpful guidance provided<br>- No errors                                     |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ERR-EMPTY-002: Empty State - No Teams

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify org with no teams configured                                                                            |
| **Preconditions**   | New org with no teams                                                                                          |
| **Steps**           | 1. Navigate to teams management                                                                                |
| **Expected Result** | - "No teams yet" message<br>- CTA to create team<br>- No errors                                                |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ERR-403-001: Permission Denied Page

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify unauthorized access handling                                                                            |
| **Preconditions**   | User without admin role                                                                                        |
| **Steps**           | 1. Manually navigate to `/admin/users`                                                                         |
| **Expected Result** | - Access denied message<br>- No data exposed<br>- Redirect or helpful message                                  |
| **Pass/Fail**       | ☐                                                                                                              |

#### TEST-ERR-404-001: 404 Not Found

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Objective**       | Verify invalid route/entity handling                                                                           |
| **Preconditions**   | None                                                                                                           |
| **Steps**           | 1. Navigate to invalid URL<br>2. Or try to access non-existent player ID                                       |
| **Expected Result** | - 404 page shown<br>- Helpful navigation options<br>- No sensitive info exposed                                |
| **Pass/Fail**       | ☐                                                                                                              |

---

## 10. Test Execution Status

### 10.1 GitHub Project Board Setup

**Board URL:** https://github.com/orgs/NB-PDP-Testing/projects/6/views/1

All 99 test cases from this UAT plan have been created as GitHub issues and added to a project board for tracking.

**Setup Completed:** January 4, 2026

### 10.2 Issue Format

Each test case was created as a GitHub issue with:
- **Title Format:** `NNN TEST-CATEGORY-NNN Test Name`
  - Example: `011 TEST-AUTH-001 Email Registration`
- **Description:** Full test steps from this document
- **Labels:** `test` + priority label (`high-priority`, `medium-priority`, `low-priority`)
- **Project Field:** Priority (P0, P1, P2)

### 10.3 Priority Distribution

| Priority | Count | Label | Categories |
|----------|-------|-------|------------|
| **P0 (High)** | ~40 | `high-priority` | SETUP, AUTH, ADMIN, ROLE, PLATFORM, PLAYER-MGMT, TEAM, USER-MGMT, PARENT-SKILLS |
| **P1 (Medium)** | ~40 | `medium-priority` | JOIN, COACH, PARENT, PASSPORT, ASSESS, BENCH, ORG, INV, PARENT-DASHBOARD, GUARDIAN, ACCESS, ANALYTICS |
| **P2 (Low)** | ~19 | `low-priority` | API, AUDIT, SEC, UX, PERF, RESIL, NAV, ERR |

### 10.4 Priority Rationale

Based on Section 9.4 of the USER_TESTING_PROCESS.md Risk-Based Prioritization:

1. **P0 - Critical Path Tests:**
   - Authentication flows (security foundation)
   - First-time setup & onboarding (user activation)
   - Admin approval workflows (user onboarding blocker)
   - Role permissions (data access control)
   - Core management features (platform, player, team, user)

2. **P1 - Core User Journey Tests:**
   - Organization join flows
   - Coach dashboard & assessments
   - Parent dashboard
   - Player passport viewing
   - Invitations & guardian linking

3. **P2 - Non-Functional & Edge Case Tests:**
   - Security edge cases (session expiry, cross-org access)
   - UX polish (loading states, skeletons)
   - Performance testing
   - Resilience testing
   - Error handling & empty states

### 10.5 Scripts Created

The following scripts were created in `.github/` for managing test issues:

| Script | Purpose |
|--------|---------|
| `create-test-issues.ps1` | Create GitHub issues from test plan |
| `rename-issues.ps1` | Rename issues to standard format |
| `set-remaining-priorities.ps1` | Add priority labels to unlabeled issues |
| `set-project-priority-v2.ps1` | Set Priority field values in project board |

### 10.6 Test Execution Workflow

1. **Test Execution:**
   - Testers work through issues in priority order (P0 → P1 → P2)
   - Move issues through project columns: `To Do` → `In Progress` → `Done`
   - Add comments with test results and evidence

2. **Bug Reporting:**
   - If test fails, create linked bug issue
   - Reference original test issue
   - Use bug report template from Section 9

3. **Progress Tracking:**
   - View project board for real-time status
   - Filter by priority or category labels
   - Monitor completion percentage
