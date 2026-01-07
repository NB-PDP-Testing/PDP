# Master UAT Test Plan

**Version:** 1.0  
**Created:** January 7, 2026  
**Status:** Consolidated from 4 source documents  
**Total Tests:** 350+ test cases

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment](#2-test-environment)
3. [Authentication Tests](#3-authentication-tests)
4. [Onboarding Tests](#4-onboarding-tests)
5. [User Management Tests](#5-user-management-tests)
6. [Team Management Tests](#6-team-management-tests)
7. [Player Management Tests](#7-player-management-tests)
8. [Coach Management Tests](#8-coach-management-tests)
9. [Organization Settings Tests](#9-organization-settings-tests)
10. [Coach Role Tests](#10-coach-role-tests)
11. [Parent Role Tests](#11-parent-role-tests)
12. [Adult Player Role Tests](#12-adult-player-role-tests)
13. [Flow System Tests](#13-flow-system-tests)
14. [Identity System Tests](#14-identity-system-tests)
15. [Cross-Role & Integration Tests](#15-cross-role--integration-tests)
16. [Implementation Status](#16-implementation-status)

---

## 1. Overview

### 1.1 Purpose

This document consolidates all UAT test cases from multiple sources into a single master test plan. It serves as the authoritative reference for:
- Test planning and execution
- Progress tracking
- Implementation verification
- Sign-off requirements

### 1.2 Source Documents

| Document | Tests | Focus Area |
|----------|-------|------------|
| master-test-plan.md | 151+ | Comprehensive UAT coverage |
| role-based-test-cases.md | N/A | Role capabilities matrix |
| flow-system-tests.md | 67 | Flow/Wizard system |
| identity-migration-tests.md | ~100 | Identity system migration |

### 1.3 Test ID Convention

```
TEST-{CATEGORY}-{NUMBER}
```

Categories:
- `AUTH` - Authentication
- `ONBOARDING` - First-time setup
- `USER` - User management
- `TEAM` - Team management
- `PLAYER` - Player management
- `COACH-MGT` - Coach management (admin)
- `ORG` - Organization settings
- `COACH` - Coach role functionality
- `PARENT` - Parent role functionality
- `ADULT` - Adult player functionality
- `FLOW` - Flow system
- `IDENTITY` - Identity system
- `CROSS` - Cross-role tests
- `E2E` - End-to-end integration

### 1.4 Implementation Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented in Playwright |
| 🟡 | Partially implemented |
| ⬜ | Not yet implemented |
| 🔴 | Blocked/Issue |

---

## 2. Test Environment

### 2.1 Prerequisites

- [ ] Fresh Convex deployment OR test database
- [ ] Test user accounts configured
- [ ] Browser DevTools available
- [ ] Playwright test runner configured

### 2.2 Test User Accounts

| Role | Email | Config Key | Notes |
|------|-------|------------|-------|
| Platform Owner | `test-data.json` | `TEST_USERS.owner` | First user, platform staff |
| Admin | `test-data.json` | `TEST_USERS.admin` | Organization admin |
| Coach | `test-data.json` | `TEST_USERS.coach` | Assigned to teams |
| Parent | `test-data.json` | `TEST_USERS.parent` | Linked to players |

### 2.3 Test Data Files

```
apps/web/uat/
├── test-data.json          # All test data configuration
├── fixtures/
│   └── test-utils.ts       # Helper functions
└── tests/
    ├── onboarding.spec.ts  # ✅ Implemented
    ├── auth.spec.ts        # ✅ Implemented
    ├── admin.spec.ts       # ✅ Implemented
    └── coach.spec.ts       # ✅ Implemented
```

---

## 3. Authentication Tests

### 3.1 Email Registration

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-AUTH-001 | Display signup page correctly | ✅ | auth.spec.ts |
| TEST-AUTH-002 | Show error for duplicate email | ✅ | auth.spec.ts |
| TEST-AUTH-003 | Show validation error for weak password | ✅ | auth.spec.ts |

### 3.2 Login

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-AUTH-004 | Email/password login success | ✅ | auth.spec.ts |
| TEST-AUTH-005 | Email/password login failure (wrong password) | ⬜ | - |
| TEST-AUTH-006 | Email/password login failure (unknown email) | ⬜ | - |
| TEST-AUTH-007 | Google SSO button displayed | ✅ | auth.spec.ts (skipped) |
| TEST-AUTH-008 | Microsoft SSO button displayed | ⬜ | - |

### 3.3 Session Management

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-AUTH-009 | Session persistence after refresh | ✅ | auth.spec.ts |
| TEST-AUTH-010 | Logout redirects to login | ✅ | auth.spec.ts |
| TEST-AUTH-011 | Protected routes inaccessible after logout | ✅ | auth.spec.ts |

---

## 4. Onboarding Tests

### 4.1 First User Flow

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ONBOARDING-001 | First user signup - automatic platform staff | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-002 | First user prompted to create organization | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-003 | First user creates organization | ✅ | onboarding.spec.ts |

### 4.2 Non-Platform Staff Restrictions

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ONBOARDING-004 | Second user cannot create organizations | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-005 | Second user redirected to join page | ✅ | onboarding.spec.ts |

### 4.3 Owner Experience

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ONBOARDING-006 | Owner sees organization dashboard | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-007 | Owner accesses Admin Panel | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-008 | Owner views Pending Requests | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-009 | Owner views Total Members | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-010 | Owner views Teams | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-011 | Owner views Players | ✅ | onboarding.spec.ts |
| TEST-ONBOARDING-012 | Owner views Medical Profiles | ✅ | onboarding.spec.ts |

---

## 5. User Management Tests

### 5.1 Invitation System

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-USER-001 | Owner can invite admin | ✅ | onboarding.spec.ts |
| TEST-USER-002 | Owner can invite coach | ✅ | onboarding.spec.ts |
| TEST-USER-003 | Owner can invite parent with linked player | ✅ | onboarding.spec.ts |
| TEST-USER-004 | Admin accepts invitation | ✅ | onboarding.spec.ts |
| TEST-USER-005 | Coach accepts invitation | ✅ | onboarding.spec.ts |
| TEST-USER-006 | Parent accepts invitation | ✅ | onboarding.spec.ts |
| TEST-USER-007 | Invited user sees pending invitation | ✅ | onboarding.spec.ts |
| TEST-USER-008 | Invitation with multiple roles | ⬜ | - |

### 5.2 Role Assignment

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-USER-009 | Verify admin has admin role | ✅ | onboarding.spec.ts |
| TEST-USER-010 | Verify coach has coach role | ✅ | onboarding.spec.ts |
| TEST-USER-011 | Verify parent has parent role | ✅ | onboarding.spec.ts |
| TEST-USER-012 | Role modification by admin | ⬜ | - |
| TEST-USER-013 | Role removal by admin | ⬜ | - |

### 5.3 Approval Workflow

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-USER-014 | View pending requests | ✅ | admin.spec.ts |
| TEST-USER-015 | Approve coach with team assignment | 🟡 | admin.spec.ts (skipped) |
| TEST-USER-016 | Approve parent with smart matching | 🟡 | admin.spec.ts (skipped) |
| TEST-USER-017 | Reject request with reason | 🟡 | admin.spec.ts (skipped) |

### 5.4 Access Control

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-USER-018 | Non-admin cannot access admin pages | ✅ | admin.spec.ts |
| TEST-USER-019 | Coach cannot modify users | ⬜ | - |
| TEST-USER-020 | Parent cannot access admin pages | ⬜ | - |

---

## 6. Team Management Tests

### 6.1 Team Creation

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-TEAM-001 | Navigate to team management | ✅ | onboarding.spec.ts |
| TEST-TEAM-002 | Create team with required fields | ✅ | onboarding.spec.ts |
| TEST-TEAM-003 | Edit team details | ✅ | onboarding.spec.ts |
| TEST-TEAM-004 | Delete team | ⬜ | - |
| TEST-TEAM-005 | Team validation - name required | ⬜ | - |
| TEST-TEAM-006 | Team validation - sport required | ⬜ | - |
| TEST-TEAM-007 | Team validation - age group required | ⬜ | - |

### 6.2 Team Configuration

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-TEAM-008 | Set training schedule | ✅ | onboarding.spec.ts |
| TEST-TEAM-009 | Set home venue | ✅ | onboarding.spec.ts |
| TEST-TEAM-010 | Add team description | ✅ | onboarding.spec.ts |
| TEST-TEAM-011 | Change team sport | ⬜ | - |
| TEST-TEAM-012 | Change team age group | ⬜ | - |

### 6.3 Team Roster

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-TEAM-013 | Assign player to team | ✅ | onboarding.spec.ts |
| TEST-TEAM-014 | Assign player via team page | ✅ | onboarding.spec.ts |
| TEST-TEAM-015 | Verify players in team roster | ✅ | onboarding.spec.ts |
| TEST-TEAM-016 | Remove player from team | ⬜ | - |
| TEST-TEAM-017 | Player multi-team assignment | ⬜ | - |

---

## 7. Player Management Tests

### 7.1 Player Creation

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-PLAYER-001 | Navigate to player management | ✅ | onboarding.spec.ts |
| TEST-PLAYER-002 | Add player functionality exists | ✅ | onboarding.spec.ts |
| TEST-PLAYER-003 | Create player with required fields | ✅ | onboarding.spec.ts |
| TEST-PLAYER-004 | Player validation - name required | ⬜ | - |
| TEST-PLAYER-005 | Player validation - DOB required | ⬜ | - |
| TEST-PLAYER-006 | Player validation - gender required | ⬜ | - |

### 7.2 Player Import

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-PLAYER-007 | Bulk import option exists | ✅ | onboarding.spec.ts |
| TEST-PLAYER-008 | GAA Foireann import | ⬜ | - |
| TEST-PLAYER-009 | CSV import | ⬜ | - |
| TEST-PLAYER-010 | Import duplicate handling | ⬜ | - |

### 7.3 Player Profile

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-PLAYER-011 | View player profile | ⬜ | - |
| TEST-PLAYER-012 | Edit player details | ⬜ | - |
| TEST-PLAYER-013 | Delete player | ⬜ | - |
| TEST-PLAYER-014 | Player medical profile | ⬜ | - |

---

## 8. Coach Management Tests

### 8.1 Coach Assignment

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-COACH-MGT-001 | Coach management section exists | ✅ | onboarding.spec.ts |
| TEST-COACH-MGT-002 | Assign coach to team | ⬜ | - |
| TEST-COACH-MGT-003 | Remove coach from team | ⬜ | - |
| TEST-COACH-MGT-004 | Coach multi-team assignment | ⬜ | - |

---

## 9. Organization Settings Tests

### 9.1 General Settings

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ORG-001 | Navigate to settings | ✅ | onboarding.spec.ts |
| TEST-ORG-002 | Edit organization name | ✅ | onboarding.spec.ts |
| TEST-ORG-003 | Edit organization slug | ⬜ | - |
| TEST-ORG-004 | Save general settings | ✅ | onboarding.spec.ts |

### 9.2 Theme & Branding

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ORG-005 | Edit primary color | ✅ | onboarding.spec.ts |
| TEST-ORG-006 | Edit secondary color | ✅ | onboarding.spec.ts |
| TEST-ORG-007 | Save color settings | ✅ | onboarding.spec.ts |
| TEST-ORG-008 | Upload organization logo | ⬜ | - |

### 9.3 Sports Configuration

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ORG-009 | Add supported sport | ✅ | onboarding.spec.ts |
| TEST-ORG-010 | Remove supported sport | ⬜ | - |
| TEST-ORG-011 | Save sports settings | ✅ | onboarding.spec.ts |

### 9.4 Social Media

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ORG-012 | Edit website URL | ✅ | onboarding.spec.ts |
| TEST-ORG-013 | Edit social media links | ✅ | onboarding.spec.ts |
| TEST-ORG-014 | Save social settings | ✅ | onboarding.spec.ts |
| TEST-ORG-015 | Verify settings persisted | ✅ | onboarding.spec.ts |

### 9.5 Ownership

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ORG-016 | Transfer ownership available | ✅ | onboarding.spec.ts |
| TEST-ORG-017 | Transfer ownership to admin | ✅ | onboarding.spec.ts |
| TEST-ORG-018 | Verify new owner has privileges | ✅ | onboarding.spec.ts |
| TEST-ORG-019 | Verify old owner lost privileges | ✅ | onboarding.spec.ts |

---

## 10. Coach Role Tests

### 10.1 Dashboard

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-COACH-001 | View assigned teams | ✅ | coach.spec.ts |
| TEST-COACH-002 | Dashboard shows team players | ✅ | coach.spec.ts |
| TEST-COACH-003 | Filter players by team | ✅ | coach.spec.ts |
| TEST-COACH-004 | Filter by review status | ✅ | coach.spec.ts |

### 10.2 Player Assessment

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-COACH-005 | Navigate to player passport | ✅ | coach.spec.ts |
| TEST-COACH-006 | View player skills | ⬜ | - |
| TEST-COACH-007 | Record skill assessment | ⬜ | - |
| TEST-COACH-008 | View assessment history | ⬜ | - |
| TEST-COACH-009 | Edit previous assessment | ⬜ | - |

### 10.3 Goals

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-COACH-010 | Create player goal | ⬜ | - |
| TEST-COACH-011 | Edit player goal | ⬜ | - |
| TEST-COACH-012 | Mark goal complete | ⬜ | - |
| TEST-COACH-013 | Delete goal | ⬜ | - |

### 10.4 Voice Notes

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-COACH-014 | Record voice note | ⬜ | - |
| TEST-COACH-015 | Play voice note | ⬜ | - |
| TEST-COACH-016 | Delete voice note | ⬜ | - |
| TEST-COACH-017 | View voice note transcription | ⬜ | - |

### 10.5 Injuries

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-COACH-018 | Log player injury | ⬜ | - |
| TEST-COACH-019 | View injury history | ⬜ | - |
| TEST-COACH-020 | Update injury status | ⬜ | - |
| TEST-COACH-021 | Close injury record | ⬜ | - |

---

## 11. Parent Role Tests

### 11.1 Dashboard

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-PARENT-001 | View parent dashboard | ✅ | onboarding.spec.ts |
| TEST-PARENT-002 | See linked children | ✅ | onboarding.spec.ts |
| TEST-PARENT-003 | View child details | ⬜ | - |

### 11.2 Child Management

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-PARENT-004 | View child's progress | ⬜ | - |
| TEST-PARENT-005 | View child's goals | ⬜ | - |
| TEST-PARENT-006 | View child's assessments | ⬜ | - |

### 11.3 Profile Management

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-PARENT-007 | Update child medical info | ⬜ | - |
| TEST-PARENT-008 | Update emergency contacts | ⬜ | - |

---

## 12. Adult Player Role Tests

### 12.1 Profile

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ADULT-001 | View own passport | ⬜ | - |
| TEST-ADULT-002 | View own progress | ⬜ | - |
| TEST-ADULT-003 | View own goals | ⬜ | - |
| TEST-ADULT-004 | View own assessments | ⬜ | - |

### 12.2 Self-Management

| ID | Test | Status | Implementation |
|----|------|--------|----------------|
| TEST-ADULT-005 | Update personal info | ⬜ | - |
| TEST-ADULT-006 | Update emergency contacts | ⬜ | - |
| TEST-ADULT-007 | View injury history | ⬜ | - |

---

## 13. Flow System Tests

### 13.1 Platform Flow Management

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-FLOW-PLATFORM-001 | View platform flows list | ⬜ | Platform staff can see all flows |
| TEST-FLOW-PLATFORM-002 | Empty state display | ⬜ | Shows message when no flows |
| TEST-FLOW-PLATFORM-003 | Create simple announcement | ⬜ | Single-step flow creation |
| TEST-FLOW-PLATFORM-004 | Create multi-step wizard | ⬜ | Multi-step flow creation |
| TEST-FLOW-PLATFORM-005 | Flow validation | ⬜ | Required fields enforced |
| TEST-FLOW-PLATFORM-006 | Create blocking priority flow | ⬜ | Must-complete flows |
| TEST-FLOW-PLATFORM-007 | Edit existing flow | ⬜ | Modify flow details |
| TEST-FLOW-PLATFORM-008 | Add/remove steps in edit | ⬜ | Step management |
| TEST-FLOW-PLATFORM-009 | Toggle flow active/inactive | ⬜ | Activation control |
| TEST-FLOW-PLATFORM-010 | Delete flow | ⬜ | Flow removal |
| TEST-FLOW-PLATFORM-011 | Non-staff access denied | ⬜ | Access control |

### 13.2 Organization Announcements

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-FLOW-ORG-001 | View announcements dashboard | ⬜ | Admin sees announcements |
| TEST-FLOW-ORG-002 | Empty state | ⬜ | No announcements message |
| TEST-FLOW-ORG-003 | Create all-members announcement | ⬜ | Target all members |
| TEST-FLOW-ORG-004 | Create coach-only announcement | ⬜ | Target coaches |
| TEST-FLOW-ORG-005 | Create parent-only announcement | ⬜ | Target parents |
| TEST-FLOW-ORG-006 | Markdown formatting | ⬜ | Content formatting |
| TEST-FLOW-ORG-007 | Validation | ⬜ | Required fields |
| TEST-FLOW-ORG-008 | Admin-only access | ⬜ | Access control |

### 13.3 User Flow Experience

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-FLOW-USER-001 | Flow displays on login | ⬜ | Automatic interception |
| TEST-FLOW-USER-002 | Blocking flow prevents access | ⬜ | Must complete |
| TEST-FLOW-USER-003 | Priority ordering | ⬜ | Correct flow sequence |
| TEST-FLOW-USER-004 | Modal display type | ⬜ | Modal presentation |
| TEST-FLOW-USER-005 | Full page display type | ⬜ | Page takeover |
| TEST-FLOW-USER-006 | Banner display type | ⬜ | Top banner |
| TEST-FLOW-USER-007 | Toast display type | ⬜ | Toast notification |
| TEST-FLOW-USER-008 | Multi-step navigation | ⬜ | Step progression |
| TEST-FLOW-USER-009 | Progress indicator | ⬜ | Visual progress |
| TEST-FLOW-USER-010 | Complete flow | ⬜ | Completion tracking |
| TEST-FLOW-USER-011 | Dismiss flow | ⬜ | Dismissal tracking |
| TEST-FLOW-USER-012 | Resume partial flow | ⬜ | State persistence |

### 13.4 First User Onboarding Flow

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-FLOW-ONBOARD-001 | First user auto-detection | ⬜ | Platform staff assignment |
| TEST-FLOW-ONBOARD-002 | Second user not staff | ⬜ | Normal user |
| TEST-FLOW-ONBOARD-003 | Onboarding flow displays | ⬜ | Welcome wizard |
| TEST-FLOW-ONBOARD-004 | Welcome step | ⬜ | Introduction |
| TEST-FLOW-ONBOARD-005 | Create org step | ⬜ | Org creation |
| TEST-FLOW-ONBOARD-006 | Completion step | ⬜ | Finish wizard |

### 13.5 Flow Interception

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-FLOW-INTERCEPT-001 | Org announcement to members | ⬜ | Correct targeting |
| TEST-FLOW-INTERCEPT-002 | Coach-only to coaches | ⬜ | Role filtering |
| TEST-FLOW-INTERCEPT-003 | Parent-only to parents | ⬜ | Role filtering |
| TEST-FLOW-INTERCEPT-004 | Progress persists | ⬜ | Session survival |
| TEST-FLOW-INTERCEPT-005 | CTA navigation | ⬜ | Action handling |

### 13.6 Flow E2E

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-FLOW-E2E-001 | Full flow lifecycle | ⬜ | Create → display → complete |
| TEST-FLOW-E2E-002 | Multi-user announcement | ⬜ | All users receive |
| TEST-FLOW-E2E-003 | Concurrent flows | ⬜ | Platform + org flows |
| TEST-FLOW-E2E-004 | Performance (10 flows) | ⬜ | Query performance |
| TEST-FLOW-E2E-005 | Rapid login/logout | ⬜ | State consistency |
| TEST-FLOW-E2E-006 | Delete active flow | ⬜ | Error handling |
| TEST-FLOW-E2E-007 | Deactivate mid-session | ⬜ | Graceful handling |

---

## 14. Identity System Tests

### 14.1 Foundation Tables (Phase 1)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-1.1.1 | Schema compiles | ⬜ | Convex codegen |
| TEST-IDENTITY-1.1.2 | Types generated | ⬜ | DataModel types |
| TEST-IDENTITY-1.2.x | Sports table | ⬜ | 5 tests |
| TEST-IDENTITY-1.3.x | Age groups table | ⬜ | 5 tests |
| TEST-IDENTITY-1.4.x | Skill categories | ⬜ | 4 tests |
| TEST-IDENTITY-1.5.x | Skill definitions | ⬜ | 6 tests |

### 14.2 Guardian Identity (Phase 2)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-2.1.x | Schema tests | ⬜ | 3 tests |
| TEST-IDENTITY-2.2.x | Guardian CRUD | ⬜ | 6 tests |
| TEST-IDENTITY-2.3.x | Guardian queries | ⬜ | 5 tests |
| TEST-IDENTITY-2.4.x | Duplicate prevention | ⬜ | 4 tests |
| TEST-IDENTITY-2.5.x | User linking | ⬜ | 4 tests |
| TEST-IDENTITY-2.6.x | Org profiles | ⬜ | 5 tests |
| TEST-IDENTITY-2.7.x | Identity matching | ⬜ | 5 tests |

### 14.3 Player Identity (Phase 3)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-3.1.x | Schema tests | ⬜ | 4 tests |
| TEST-IDENTITY-3.2.x | Player CRUD | ⬜ | 5 tests |
| TEST-IDENTITY-3.3.x | Player queries | ⬜ | 4 tests |
| TEST-IDENTITY-3.4.x | Guardian-player links | ⬜ | 8 tests |
| TEST-IDENTITY-3.5.x | Enrollments | ⬜ | 7 tests |
| TEST-IDENTITY-3.6.x | Combined queries | ⬜ | 3 tests |
| TEST-IDENTITY-3.7.x | Age calculations | ⬜ | 4 tests |

### 14.4 Adult Player Support (Phase 4)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-4.1.x | Schema tests | ⬜ | 2 tests |
| TEST-IDENTITY-4.2.x | Adult player tests | ⬜ | 4 tests |
| TEST-IDENTITY-4.3.x | Emergency contacts | ⬜ | 7 tests |
| TEST-IDENTITY-4.4.x | Youth→Adult transition | ⬜ | 6 tests |

### 14.5 Data Migration (Phase 5)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-5.1.x | Pre-migration | ⬜ | 2 tests |
| TEST-IDENTITY-5.2.x | Clean slate | ⬜ | 4 tests |
| TEST-IDENTITY-5.3.x | Migration | ⬜ | 6 tests |
| TEST-IDENTITY-5.4.x | Post-migration | ⬜ | 3 tests |

### 14.6 Frontend Integration (Phase 6)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-6.1.x | Hook tests | ⬜ | 2 tests |
| TEST-IDENTITY-6.2.x | Parent dashboard | ⬜ | 4 tests |
| TEST-IDENTITY-6.3.x | Player passport | ⬜ | 3 tests |
| TEST-IDENTITY-6.4.x | Admin tests | ⬜ | 3 tests |
| TEST-IDENTITY-6.5.x | Import tests | ⬜ | 6 tests |
| TEST-IDENTITY-6.6.x | Cross-org tests | ⬜ | 2 tests |

### 14.7 Sport Passport (Phase 7)

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-7.1.x | Schema tests | ⬜ | 3 tests |
| TEST-IDENTITY-7.2.x | Passport CRUD | ⬜ | 6 tests |
| TEST-IDENTITY-7.3.x | Skill assessments | ⬜ | 6 tests |
| TEST-IDENTITY-7.4.x | Denormalization | ⬜ | 3 tests |
| TEST-IDENTITY-7.5.x | Progress calculation | ⬜ | 4 tests |

### 14.8 Identity E2E

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-IDENTITY-E2E-1 | New family joins | ⬜ | Full workflow |
| TEST-IDENTITY-E2E-2 | Child joins second club | ⬜ | Multi-org |
| TEST-IDENTITY-E2E-3 | Skill assessment flow | ⬜ | Coach workflow |
| TEST-IDENTITY-E2E-4 | Adult self-registers | ⬜ | Adult workflow |
| TEST-IDENTITY-E2E-5 | Youth turns 18 | ⬜ | Transition |
| TEST-IDENTITY-E2E-6 | Import workflow | ⬜ | Bulk import |

---

## 15. Cross-Role & Integration Tests

### 15.1 Multi-Role Access

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-CROSS-001 | Admin+Coach same user | ⬜ | Dual role access |
| TEST-CROSS-002 | Parent+Coach same user | ⬜ | Dual role access |
| TEST-CROSS-003 | Role switching | ⬜ | Context switching |

### 15.2 Data Visibility

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-CROSS-004 | Parent sees only own children | ⬜ | Data isolation |
| TEST-CROSS-005 | Coach sees only assigned teams | ⬜ | Data isolation |
| TEST-CROSS-006 | Admin sees all data | ⬜ | Full access |

### 15.3 Workflow Integration

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-CROSS-007 | Coach assess → Parent view | ⬜ | Data flow |
| TEST-CROSS-008 | Admin create → Coach access | ⬜ | Data flow |
| TEST-CROSS-009 | Invitation → Acceptance → Access | ⬜ | Full workflow |

### 15.4 Edge Cases

| ID | Test | Status | Description |
|----|------|--------|-------------|
| TEST-CROSS-010 | User with no roles | ⬜ | Default behavior |
| TEST-CROSS-011 | Deleted team impact | ⬜ | Cascading |
| TEST-CROSS-012 | Deleted player impact | ⬜ | Cascading |
| TEST-CROSS-013 | Organization deletion | ⬜ | Full cleanup |

---

## 16. Implementation Status

### 16.1 Summary

| Category | Total | Implemented | Partial | Not Started |
|----------|-------|-------------|---------|-------------|
| Authentication | 11 | 7 | 0 | 4 |
| Onboarding | 12 | 12 | 0 | 0 |
| User Management | 20 | 14 | 3 | 3 |
| Team Management | 17 | 10 | 0 | 7 |
| Player Management | 14 | 5 | 0 | 9 |
| Coach Management | 4 | 1 | 0 | 3 |
| Org Settings | 19 | 15 | 0 | 4 |
| Coach Role | 21 | 5 | 0 | 16 |
| Parent Role | 8 | 2 | 0 | 6 |
| Adult Player | 7 | 0 | 0 | 7 |
| Flow System | 47 | 0 | 0 | 47 |
| Identity System | ~100 | 0 | 0 | ~100 |
| Cross-Role | 13 | 0 | 0 | 13 |
| **TOTAL** | **~293** | **~71** | **3** | **~219** |

### 16.2 Implementation Priority

**Phase 1 - Core Flows (Current)**
- ✅ Authentication
- ✅ Onboarding  
- ✅ Basic Admin
- ✅ Basic Coach

**Phase 2 - Extended Functionality**
- Coach assessments and goals
- Parent child management
- Player profile management

**Phase 3 - Advanced Features**
- Flow system
- Voice notes
- Injury tracking

**Phase 4 - Backend Systems**
- Identity migration tests
- Performance tests
- E2E integration

### 16.3 Test Files to Create

| File | Tests | Priority |
|------|-------|----------|
| `parent.spec.ts` | Parent role tests | High |
| `player-passport.spec.ts` | Player profile tests | High |
| `assessment.spec.ts` | Coach assessment tests | High |
| `flow-system.spec.ts` | Flow system tests | Medium |
| `identity.spec.ts` | Identity system tests | Medium |
| `integration.spec.ts` | Cross-role tests | Medium |

---

## Appendix A: Role Capabilities Matrix

### Application Admin

| Capability | Status | Tests |
|------------|--------|-------|
| Create organizations | ✅ | TEST-ONBOARDING-003 |
| View all organizations | ✅ | - |
| Manage platform flows | ⬜ | TEST-FLOW-PLATFORM-* |
| View platform analytics | ⬜ | - |

### Organization Owner

| Capability | Status | Tests |
|------------|--------|-------|
| All admin capabilities | ✅ | Multiple |
| Transfer ownership | ✅ | TEST-ORG-017 |
| Delete organization | ⬜ | - |
| Manage billing | ⬜ | - |

### Organization Admin

| Capability | Status | Tests |
|------------|--------|-------|
| Manage users | ✅ | TEST-USER-* |
| Manage teams | ✅ | TEST-TEAM-* |
| Manage players | ✅ | TEST-PLAYER-* |
| Organization settings | ✅ | TEST-ORG-* |
| Create announcements | ⬜ | TEST-FLOW-ORG-* |

### Coach

| Capability | Status | Tests |
|------------|--------|-------|
| View assigned teams | ✅ | TEST-COACH-001 |
| Record assessments | ⬜ | TEST-COACH-007 |
| Manage goals | ⬜ | TEST-COACH-010-013 |
| Record voice notes | ⬜ | TEST-COACH-014-017 |
| Log injuries | ⬜ | TEST-COACH-018-021 |

### Parent/Guardian

| Capability | Status | Tests |
|------------|--------|-------|
| View linked children | ✅ | TEST-PARENT-002 |
| View child progress | ⬜ | TEST-PARENT-004 |
| Update medical info | ⬜ | TEST-PARENT-007 |

### Adult Player

| Capability | Status | Tests |
|------------|--------|-------|
| View own passport | ⬜ | TEST-ADULT-001 |
| Self-management | ⬜ | TEST-ADULT-005-007 |

---

## Appendix B: Test Execution Checklist

### Pre-Testing

- [ ] Test environment configured
- [ ] Database in known state
- [ ] Test data loaded
- [ ] All test users accessible

### Execution

- [ ] Authentication tests pass
- [ ] Onboarding tests pass
- [ ] User management tests pass
- [ ] Team management tests pass
- [ ] Player management tests pass
- [ ] Coach role tests pass
- [ ] Parent role tests pass
- [ ] Organization settings tests pass

### Post-Testing

- [ ] All failures documented
- [ ] Screenshots captured for failures
- [ ] Regression issues logged
- [ ] Sign-off obtained

---

## Appendix C: Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Product Owner | | | |
| Tech Lead | | | |

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-07 | Cline | Initial consolidation from 4 source documents |