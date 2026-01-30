# Onboarding PRD - Ready for Development

## Executive Summary

After a comprehensive deep-dive into the codebase and detailed phase walkthroughs, the Universal Onboarding System PRD is now complete and ready for development handoff.

**Documents Created:**
- **PRD:** [`docs/features/onboarding-prd.md`](../features/onboarding-prd.md) (v2.0)
- **Implementation Plan:** [`docs/features/onboarding-implementation-plan.json`](../features/onboarding-implementation-plan.json)

## Key Findings

### Current Onboarding Pathways Identified

| # | Entry Type | Current Status |
|---|------------|----------------|
| 1 | Email invitation (new user) - Admin/Coach/Parent | Working but fragmented |
| 2 | Admin adds guardian to player | Working but no prompt shown (#293) |
| 3 | Existing user invited to new org | Working but double-dialog (#327) |
| 4 | Existing user granted new role (same org) | No notification (#335) |
| 5 | Player turns 18 (graduation) | NOT IMPLEMENTED (LOW PRIORITY) |
| 6 | First user (platform bootstrap) | NOT IMPLEMENTED |
| 7 | Join request (self-service) | Working |

### Root Cause of Current Bugs

The platform has **4+ separate onboarding mechanisms** that were built independently and don't communicate:

1. **Invitation Acceptance Flow** (`/orgs/accept-invitation/[id]`)
2. **Guardian Claim Flow** (`BulkClaimProvider`)
3. **First User Onboarding** (planned, not implemented)
4. **Role Addition Notifications** (partially implemented)

These systems **trigger independently**, causing:
- Double dialogs (#327, #335)
- Lost data (#297)
- Missing prompts (#293)

### Proposed Solution: Universal Onboarding Pipeline

A centralized **OnboardingOrchestrator** that:
1. Detects user entry context
2. Builds an ordered step queue based on what's needed
3. Presents steps **one at a time** (no overlapping dialogs)
4. Ensures data persistence between steps
5. Provides consistent UI regardless of entry type

### Steps in the Universal Pipeline

| Step | Trigger | UI Type |
|------|---------|---------|
| GDPR Consent | New user, consent not recorded | Modal (blocking) |
| Accept Invitation | Pending invitation exists | Modal (blocking) |
| Role Confirmation | New roles assigned (admin/coach) | **Toast only** |
| Child Linking | Parent role with pending links | Modal (blocking) |
| Welcome | First login to org | Toast |
| Setup Wizard | First user on platform | Page (blocking) |
| Player Graduation | Player turned 18 | Modal (blocking) |

## Implementation Recommendation

**Hybrid Approach** - Use flows for static steps (GDPR, welcome), custom components for dynamic steps (child linking).

## Phased Implementation Plan

| Phase | Name | Priority | Fixes Bugs |
|-------|------|----------|------------|
| **1** | Foundation & Bug Fixes | CRITICAL | #297, #327 |
| **1B** | Invitation Lifecycle (User) | CRITICAL | - |
| **2** | GDPR Consent | HIGH | - |
| **3** | Child Linking & Admin Tools | HIGH | #293 |
| **4** | Toast Notifications | MEDIUM | #335 |
| **5** | First User Onboarding | MEDIUM | - |
| **6** | Polish, Scheduled Jobs & Edge Cases | MEDIUM | - |
| **7** | Player Graduation | LOW | - |

### Key Features per Phase

**Phase 1: Foundation & Critical Bug Fixes**
- Fix `syncFunctionalRolesFromInvitation` to persist child links (#297)
- Create `OnboardingOrchestrator` skeleton
- Remove `BulkClaimProvider` (replaced by orchestrator)
- Ensure single dialog at a time

**Phase 1B: Invitation Lifecycle (User-Facing)**
- Update expired invitation page with clear messaging
- Add org settings for invitation expiration (default: 7 days)
- Add org setting for auto re-invite (default: OFF, opt-in)
- Create invitation request flow for user self-service
- Show org admin contact on expired page

**Phase 2: GDPR Consent System**
- Platform-wide, one-time acceptance
- Re-acceptance trigger capability for future updates
- Industry-standard GDPR content (placeholder included in PRD)

**Phase 3: Child Linking & Admin Invitation Tools**
- Single modal for all pending children
- Accept/decline per child + Accept All
- Cross-org sharing consent
- **Admin email notification option** (checkbox, default ON)
- **Admin decline notification** (dashboard badge + optional email)
- **Invitation management dashboard** (tabs: Active/Expiring/Expired/Requests)
- **Bulk re-invite** for expired invitations
- **Approve/deny** invitation requests

**Phase 4: Toast Notifications**
- Real-time notifications for logged-in users
- Toast-only for admin/coach roles (no modal)

**Phase 5: First User Onboarding**
- Auto-detect first user
- Platform Staff auto-assignment
- Setup wizard

**Phase 6: Polish, Scheduled Jobs & Edge Cases**
- Error handling, analytics, accessibility
- Scheduled job: Auto re-invite for enabled orgs
- Scheduled job: Admin expiration alerts
- Scheduled job: Archive invitations > 30 days
- Scheduled job: Cleanup archived > 90 days

**Phase 7: Player Dashboard & Graduation (LOW PRIORITY)**
- Basic player dashboard
- 18th birthday detection
- Account claiming flow

## Full Document

See [`docs/features/onboarding-prd.md`](../features/onboarding-prd.md) for:
- Complete pathway matrix (15 scenarios)
- Architecture diagrams
- UI mockups (GDPR, child linking, admin guardian dialog)
- Database schema changes
- API endpoint specifications
- GDPR placeholder content
- Decline notification options
- Success metrics
- Code location references

## Linked Bugs to be Fixed

- [x] #335 - Role Granting Notification (Phase 4)
- [x] #293 - Guardian Player Connection Bug (Phase 3)
- [x] #327 - New Parent Dialogue Window Error (Phase 1)
- [x] #297 - Parent Not Linked After Accepting (Phase 1)

## Design Decisions Made

1. **GDPR**: Platform-wide, one-time. Org-specific GDPR out of scope. Re-acceptance trigger supported.
2. **Email for guardian addition**: Admin checkbox (default ON) to send notification email
3. **Admin/Coach roles**: Toast notification only (no modal acceptance required)
4. **Player graduation**: LOW PRIORITY - moved to Phase 7
5. **Decline notification**: Admin receives dashboard badge + optional email (needs settings UI)
6. **Invitation expiration**: Default 7 days, configurable per organization
7. **Auto re-invite**: Opt-in (admin must explicitly enable per org)
8. **Request new invitation**: User can self-service request, depends on org setting
9. **Old invitations**: Archived after 30 days, deleted after 90 days

## Invitation Lifecycle Management (NEW)

### User Experience - Expired Links
- Clear error message with org name and original role
- "Request New Invitation" button (creates request for admin)
- Auto re-invite if org setting enabled (max 2 times)
- Org admin contact shown as fallback

### Admin Tools
- Tabbed invitation list: Active | Expiring Soon | Expired | Requests
- Bulk re-invite for expired invitations
- Approve/deny user requests for new invitations
- Badge counts for expired + pending requests
- Configurable notification settings

### Scheduled Jobs (Phase 6)
- Hourly: Mark expired invitations
- Daily 8 AM: Auto re-invite for enabled orgs
- Daily 9 AM: Admin expiration alerts
- Weekly: Archive invitations > 30 days
- Monthly: Cleanup archived > 90 days

## Implementation Plan (JSON)

A detailed JSON implementation plan has been created at [`docs/features/onboarding-implementation-plan.json`](../features/onboarding-implementation-plan.json).

**Summary:**
- **8 phases** (including 1B)
- **55 tasks** total
- **6 new database tables**
- **6 scheduled jobs**

Each task includes:
- Unique ID for tracking
- Description and acceptance criteria
- Files to create/modify
- Type (schema, feature, bugfix, testing, etc.)

## Phase 2 Clarifications

1. **IP Address Capture**: NOT required for GDPR consent
2. **Children Extension**: When children are added to a user who accepted GDPR without children, they see a lightweight acknowledgement (not full re-acceptance) as part of the Child Linking step

## Ready for Development

The PRD (v2.0) and JSON implementation plan are ready for Ralph to begin development. Start with Phase 1 (Critical) to fix the data loss bugs and establish the orchestrator foundation.
