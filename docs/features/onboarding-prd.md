# Universal Onboarding System - Product Requirements Document

**Document Version:** 2.0
**Created:** January 28, 2026
**Updated:** January 28, 2026
**Author:** Product Management
**Status:** Draft - Awaiting Review
**Related Issues:** [#371](https://github.com/NB-PDP-Testing/PDP/issues/371), [#335](https://github.com/NB-PDP-Testing/PDP/issues/335), [#293](https://github.com/NB-PDP-Testing/PDP/issues/293), [#327](https://github.com/NB-PDP-Testing/PDP/issues/327), [#297](https://github.com/NB-PDP-Testing/PDP/issues/297)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Current State Analysis](#current-state-analysis)
4. [User Entry Pathways](#user-entry-pathways)
5. [Identified Issues & Bugs](#identified-issues--bugs)
6. [Proposed Solution](#proposed-solution)
7. [Implementation Options](#implementation-options)
8. [Recommendation](#recommendation)
9. [Phased Implementation Plan](#phased-implementation-plan)
10. [Success Metrics](#success-metrics)
11. [Appendices](#appendices)

---

## Executive Summary

### The Problem
PlayerARC currently has **multiple fragmented onboarding workflows** that operate independently, overlap, and sometimes conflict with each other. When a user enters the system, they may encounter:
- Multiple dialog windows appearing in sequence or simultaneously
- Lost data during the handoff between workflows
- Incomplete role assignments
- Missing parent-child linkages
- No visibility of pending actions

### The Solution
Implement a **Universal Onboarding Pipeline** that:
- Provides a single, consistent onboarding experience regardless of how the user enters
- Consolidates all onboarding steps into one coordinated flow
- Includes GDPR consent (platform-wide, one-time, with re-acceptance capability)
- Handles role acceptance, parent-child linking, and welcome messaging in a unified manner
- Supports all user types: new users, existing users, and role additions

### Business Impact
| Metric | Current | Target |
|--------|---------|--------|
| Parent onboarding completion | ~60% (data loss issues) | >95% |
| User confusion reports | Multiple tickets/week | Near zero |
| Time to first value | Varies (multiple dialogs) | <2 minutes |
| Support tickets for onboarding | High | Minimal |

---

## Problem Statement

### Core Issue
The platform evolved organically, resulting in **4+ separate onboarding mechanisms** that were built independently:

1. **Invitation Acceptance Flow** (`/orgs/accept-invitation/[id]`)
2. **Guardian Claim Flow** (`BulkClaimProvider`)
3. **First User Onboarding** (planned, not implemented)
4. **Join Request Flow** (`/orgs/join`)
5. **Role Addition Notifications** (partially implemented)

These systems do not communicate with each other, leading to:
- **Sequential dialogs** - User accepts org, then immediately sees guardian claim dialog (#327)
- **Data loss** - Children linked during invitation disappear after acceptance (#297)
- **Missing prompts** - Pending guardian links don't show accept/decline (#293)
- **No notifications** - Existing users granted new roles get no feedback (#335)

### User Impact
> *"I invited a parent to the system. They signed up, accepted the invitation, but when they got to their dashboard it said 'No children linked'. The children I assigned during the invite were gone."* - Bug #297

> *"A new parent gets two pop-ups: one saying 'Welcome, you've joined the org' and then immediately another saying 'Accept these children'. It's confusing and feels broken."* - Bug #327

---

## Current State Analysis

### Onboarding Pathways Identified

Based on comprehensive codebase analysis, the following user entry pathways exist:

#### Pathway 1: Brand New User - Email Invitation
```
Admin invites user@email.com
         ↓
User receives email with invite link
         ↓
User clicks link → /orgs/accept-invitation/[id]
         ↓
User not logged in → Redirected to /login?redirect=...
         ↓
User signs up (creates account)
         ↓
Redirected back to accept-invitation page
         ↓
Invitation accepted → syncFunctionalRolesFromInvitation()
         ↓
Redirected to org dashboard
         ↓
BulkClaimProvider triggers → SECOND dialog appears ❌
```

**Current Issues:**
- Two separate dialog systems trigger independently
- `syncFunctionalRolesFromInvitation` may not persist parent-child links correctly
- No GDPR consent captured
- Confusing multi-step experience

#### Pathway 2: Brand New User - Admin Adds Guardian to Player
```
Admin goes to player → Clicks "Add Guardian"
         ↓
Enters parent email → Creates guardianIdentity + guardianPlayerLink
         ↓
guardianPlayerLink created with acknowledgedByParentAt = undefined
         ↓
Email sent to parent (if configured)
         ↓
Parent signs up and logs in
         ↓
BulkClaimProvider checks for claimable identities
         ↓
Shows bulk claim dialog (sometimes) ❌
```

**Current Issues:**
- Parent may not see any prompt if claiming flow fails (#293)
- No coordination with any existing invitation
- Link remains in "pending" state indefinitely

#### Pathway 3: Existing User (Different Org) - Invited
```
User already has account in OrgA
         ↓
Admin from OrgB invites user
         ↓
User receives email → Clicks link
         ↓
Already logged in → Checks email match
         ↓
Accepts invitation → Joins OrgB
         ↓
If parent role: BulkClaimProvider may trigger
```

**Current Issues:**
- Same dual-dialog problem
- No toast notification for "You've been added to a new organization"

#### Pathway 4: Existing Org Member - New Role Added
```
User is already member of OrgA (e.g., as Coach)
         ↓
Admin grants "Parent" functional role
         ↓
Admin links children to user
         ↓
??? (No notification system)
```

**Current Issues:**
- No toast message appears (#335)
- No prompt to accept children
- User discovers new role accidentally

#### Pathway 5: Player Turns 18 (Graduation)
```
Youth player (managed by guardian) turns 18
         ↓
System should detect birthday
         ↓
Player should be prompted to claim their own account
         ↓
Player dashboard access enabled
```

**Current Issues:**
- NOT IMPLEMENTED
- No age detection
- No graduation flow

#### Pathway 6: First User (Platform Bootstrap)
```
Fresh deployment, no users
         ↓
First user signs up
         ↓
Should auto-detect and grant Platform Staff
         ↓
Setup wizard to create first org
```

**Current Issues:**
- PLANNED but not implemented (docs/features/first-user-onboarding.md)
- Currently: First user stuck on "Join an Organization" page

### Current System Components

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| Invitation Acceptance | `/orgs/accept-invitation/[id]` | Accept org invitations | Working but incomplete |
| BulkClaimProvider | `components/bulk-claim-provider.tsx` | Detect & claim guardian identities | Working but conflicts with invitations |
| BulkGuardianClaimDialog | `components/bulk-guardian-claim-dialog.tsx` | UI for claiming guardians | Working |
| Flow System | `convex/models/flows.ts` | Announcements, alerts, tours | Working but NOT used for onboarding |
| First User Wizard | `/setup/*` | Platform bootstrap | NOT IMPLEMENTED |
| Role Notifications | N/A | Toast for new roles | NOT IMPLEMENTED |
| GDPR Consent | N/A | Platform-wide consent | NOT IMPLEMENTED |

---

## User Entry Pathways

### Complete Pathway Matrix

| # | Entry Type | User Status | Invited As | Key Steps Required |
|---|------------|-------------|------------|-------------------|
| 1 | Email invitation | Brand new | Admin | GDPR → Accept invite → Role confirmation |
| 2 | Email invitation | Brand new | Coach | GDPR → Accept invite → Team confirmation |
| 3 | Email invitation | Brand new | Parent | GDPR → Accept invite → Child linking accept/decline |
| 4 | Email invitation | Brand new | Platform Staff | GDPR → Accept invite → Role confirmation |
| 5 | Admin adds guardian | Brand new | Parent | GDPR → Claim identity → Child linking accept/decline |
| 6 | Email invitation | Existing (other org) | Admin | Accept invite → Role confirmation |
| 7 | Email invitation | Existing (other org) | Coach | Accept invite → Team confirmation |
| 8 | Email invitation | Existing (other org) | Parent | Accept invite → Child linking accept/decline |
| 9 | Role addition | Existing (same org) | Admin | Toast notification |
| 10 | Role addition | Existing (same org) | Coach | Toast notification |
| 11 | Role addition | Existing (same org) | Parent | Child linking accept/decline |
| 12 | Player graduation | Youth player → Adult | Player | Claim account → Accept T&Cs → Dashboard access |
| 13 | First user | Brand new | Platform Staff | GDPR → Auto-assign → Setup wizard |
| 14 | Join request | Brand new | Varies | GDPR → Submit request → Wait for approval |
| 15 | Join request | Existing | Varies | Submit request → Wait for approval |

### Required Onboarding Steps by Scenario

```
                              GDPR  Accept  Role   Child   Toast  Setup
                              Consent Invite Confirm Link   Notify Wizard
                              ────── ────── ────── ────── ────── ──────
New user, invited as admin    ✓      ✓      ✓      -      -      -
New user, invited as coach    ✓      ✓      ✓      -      -      -
New user, invited as parent   ✓      ✓      ✓      ✓      -      -
New user, guardian added      ✓      -      -      ✓      -      -
Existing user, new org        -      ✓      ✓      ✓*     -      -
Existing user, new role       -      -      ✓      ✓*     ✓      -
Player turning 18             ✓      -      -      -      -      -
First user (platform)         ✓      -      -      -      -      ✓

* Only if parent role
```

---

## Identified Issues & Bugs

### Bug #335: Role Granting Notification
**Summary:** Multiple conflicting workflows for onboarding new vs existing users.

**Root Cause:** No unified orchestration layer. Each flow was built independently:
- Invitation acceptance: `accept-invitation/[id]/page.tsx`
- Guardian claiming: `BulkClaimProvider` + `BulkGuardianClaimDialog`
- Role notifications: Not implemented

**Impact:**
- New users see two dialogs in sequence
- Existing users get no feedback when granted new roles
- Inconsistent experience across entry types

### Bug #293: Guardian Player Connection Bug
**Summary:** Parent doesn't see "Accept" or "Review Pending Connection" after admin adds guardian.

**Root Cause:**
- `guardianPlayerLinks.acknowledgedByParentAt` field not being checked in all flows
- `BulkClaimProvider` only triggers for unclaimed guardian identities, not pending child links
- Missing query for `findPendingChildrenForClaimedGuardian`

**Impact:**
- Parents don't know children are linked to them
- Links remain in "pending" state forever
- Admin confusion about status

### Bug #327: New Parent Dialogue Window Error
**Summary:** New parent user gets two separate prompts (org join + guardian claim).

**Root Cause:**
- `accept-invitation` page and `BulkClaimProvider` operate independently
- No communication between systems
- Both trigger on same user session

**Impact:**
- Confusing user experience
- Perception of broken system
- Some users abandon onboarding

### Bug #297: Parent Not Linked After Accepting Invitation
**Summary:** Children selected during invitation are not linked after parent signs up.

**Root Cause:**
- `syncFunctionalRolesFromInvitation` function failing silently or not persisting links
- Possible race condition between invitation acceptance and membership creation
- `suggestedPlayerLinks` in invitation metadata not being processed

**Impact:**
- Parents complete onboarding but see "No children linked"
- Manual re-linking required by admin
- Trust erosion

---

## Proposed Solution

### Universal Onboarding Pipeline Architecture

Replace the current fragmented system with a **centralized onboarding orchestrator** that:

1. **Detects user entry context** (invitation, guardian claim, role addition, etc.)
2. **Builds a step queue** based on what's needed
3. **Presents steps sequentially** in a single, cohesive flow
4. **Ensures data persistence** between steps
5. **Provides consistent UI** regardless of entry type

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ENTRY POINTS                            │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────────┤
│ Sign Up │ Accept  │ Guardian│ Role    │ Player  │ First User   │
│ (OAuth/ │ Invite  │ Claim   │ Addition│ 18th    │ Bootstrap    │
│ Email)  │ Link    │ Link    │ (Admin) │ Birthday│              │
└────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴──────┬───────┘
     │         │         │         │         │           │
     └─────────┴─────────┴─────────┴─────────┴───────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ONBOARDING ORCHESTRATOR                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step Builder                                             │   │
│  │ - Evaluates user context                                 │   │
│  │ - Checks GDPR consent status                             │   │
│  │ - Checks pending invitations                             │   │
│  │ - Checks pending guardian claims                         │   │
│  │ - Checks pending child acknowledgements                  │   │
│  │ - Builds ordered step queue                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step Queue (example)                                     │   │
│  │ 1. GDPR Consent (if new user, not accepted)              │   │
│  │ 2. Invitation Acceptance (if pending invitation)         │   │
│  │ 3. Role Confirmation (if new roles assigned)             │   │
│  │ 4. Child Linking (if parent role with pending children)  │   │
│  │ 5. Welcome Message (final step)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Step Executor                                            │   │
│  │ - Presents current step UI                               │   │
│  │ - Handles step completion                                │   │
│  │ - Persists data                                          │   │
│  │ - Advances to next step                                  │   │
│  │ - Triggers toast for completed actions                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER DASHBOARD                               │
│                    (Role-appropriate landing)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Step Types

| Step ID | Name | Trigger | UI Type | Dismissible |
|---------|------|---------|---------|-------------|
| `gdpr_consent` | GDPR Acceptance | New user, consent not recorded | Modal | No (blocking) |
| `accept_invitation` | Accept Organization Invite | Pending invitation exists | Modal | No (blocking) |
| `role_confirmation` | Confirm New Role | New roles assigned (admin/coach) | Toast | Yes (auto-dismiss) |
| `child_linking` | Accept/Decline Children | Parent role with pending links | Modal | No (blocking) |
| `welcome` | Welcome Message | First login to org | Toast | Yes (auto-dismiss) |
| `setup_wizard` | Platform Setup | First user on platform | Page | No (blocking) |
| `player_graduation` | Claim Adult Account | Player turned 18 | Modal | No (blocking) |

**Note on Role Confirmation:**
- Admin and Coach role grants use **toast notifications only** (no modal acceptance required)
- Parent role grants trigger the `child_linking` modal for child acceptance
- Toast auto-dismisses after 5 seconds but includes link to relevant dashboard

### GDPR Consent Implementation

**Requirements:**
- One-time platform-wide acceptance
- Covers data processing for the entire platform
- Organization-specific GDPR is OUT OF SCOPE
- Must support future re-acceptance triggers

**Schema Addition:**
```typescript
// Add to user table
gdprConsentVersion: v.optional(v.number()),    // Version accepted (e.g., 1, 2, 3)
gdprConsentedAt: v.optional(v.number()),       // Timestamp of consent
// Note: IP address capture is NOT required for GDPR consent

// Add new table for consent version tracking
gdprVersions: defineTable({
  version: v.number(),
  effectiveDate: v.number(),
  summary: v.string(),
  fullText: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
})
```

**Re-acceptance Trigger:**
- Platform staff can create new GDPR version
- System compares user's `gdprConsentVersion` with current version
- If user's version < current version, `gdpr_consent` step added to queue

**Children Extension Acknowledgement:**
When children are added to a user who has already accepted GDPR (without children):
- User does NOT need full GDPR re-acceptance
- User sees a lightweight acknowledgement prompt: "Your privacy consent now extends to [Child Name]"
- This is handled as part of the Child Linking step (Phase 3), not a separate GDPR step
- The acknowledgement confirms their existing consent applies to the newly added children

#### GDPR Consent Content (Placeholder)

The GDPR consent modal should present the following information. This is placeholder content based on industry standards for sports management platforms handling children's data.

**Modal Title:** Data Protection & Privacy Consent

**Summary Section (Always Visible):**
```
By using PlayerARC, you agree to our processing of your personal data
as described below. We take your privacy seriously and are committed
to protecting the personal information of all users, especially children.
```

**Key Points (Bullet Summary):**
```
We collect and process:
• Your account information (name, email, phone)
• Player profiles (name, date of birth, photos, performance data)
• Health and medical information (allergies, injuries, emergency contacts)
• Communication records between coaches, parents, and administrators

We use this data to:
• Enable player development tracking and assessments
• Facilitate communication between coaches and parents
• Maintain health and safety records for players
• Generate performance insights and development reports

Your rights under GDPR:
• Access your personal data at any time
• Request correction of inaccurate data
• Request deletion of your data (right to be forgotten)
• Export your data in a portable format
• Withdraw consent at any time
```

**Expandable Full Text Section:**
```
PLAYERARC DATA PROTECTION POLICY

1. DATA CONTROLLER
PlayerARC ("we", "us", "our") acts as a data processor on behalf of
sports organizations (the data controllers) who use our platform.

2. CATEGORIES OF PERSONAL DATA
We process the following categories of personal data:

Identity Data: First name, last name, date of birth, gender
Contact Data: Email address, phone number, postal address
Profile Data: Player photos, team assignments, position preferences
Performance Data: Skill assessments, coach feedback, development goals
Health Data: Medical conditions, allergies, injuries, emergency contacts
Communication Data: Messages between platform users
Technical Data: IP address, browser type, device information

3. SPECIAL CATEGORY DATA (CHILDREN)
We process data relating to children (under 18) for legitimate sports
management purposes. This includes:
- Performance tracking and skill development
- Health and safety management
- Emergency contact information

Parental/guardian consent is required for all children's data.

4. LEGAL BASIS FOR PROCESSING
We process personal data based on:
- Consent (this agreement)
- Legitimate interests (sports organization management)
- Legal obligations (health and safety requirements)

5. DATA RETENTION
- Active account data: Retained while account is active
- Player development data: Retained for 7 years after last activity
- Health records: Retained per legal requirements (typically 7 years)
- Deleted accounts: Data removed within 30 days of deletion request

6. DATA SHARING
We may share data with:
- The sports organization(s) you belong to
- Other organizations (only with explicit cross-org sharing consent)
- Third-party service providers (hosting, email, analytics)
- Legal authorities when required by law

We do NOT sell personal data to third parties.

7. INTERNATIONAL TRANSFERS
Data may be processed in countries outside the EEA. We ensure
appropriate safeguards (Standard Contractual Clauses) are in place.

8. YOUR RIGHTS
Under GDPR, you have the right to:
- Access your personal data (Subject Access Request)
- Rectify inaccurate personal data
- Erase your personal data ("right to be forgotten")
- Restrict processing of your personal data
- Data portability (receive data in machine-readable format)
- Object to processing based on legitimate interests
- Withdraw consent at any time

To exercise these rights, contact: privacy@playerarc.com

9. DATA SECURITY
We implement appropriate technical and organizational measures:
- Encryption of data in transit and at rest
- Access controls and authentication
- Regular security assessments
- Staff training on data protection

10. UPDATES TO THIS POLICY
We may update this policy periodically. Material changes will
require re-acceptance of consent.

Last updated: [DATE]
Version: 1.0
```

**Consent Checkboxes:**
```
☐ I have read and agree to the Data Protection & Privacy Policy (Required)

☐ I understand that PlayerARC processes children's personal data for
  sports management purposes and confirm I have authority to consent
  on behalf of any children in my care (Required for parents/guardians)

☐ I agree to receive platform updates and announcements via email (Optional)
```

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🔒 Data Protection & Privacy Consent                          │
│                                                                 │
│  By using PlayerARC, you agree to our processing of your        │
│  personal data as described below.                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ We collect and process:                                  │   │
│  │ • Your account information (name, email, phone)          │   │
│  │ • Player profiles (name, DOB, photos, performance)       │   │
│  │ • Health and medical information                         │   │
│  │ • Communication records                                  │   │
│  │                                                          │   │
│  │ Your rights: Access, correct, delete, export your data   │   │
│  │                                                          │   │
│  │ [▼ View Full Privacy Policy]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☐ I have read and agree to the Privacy Policy *               │
│                                                                 │
│  ☐ I confirm I have authority to consent for children          │
│    in my care *                                                 │
│                                                                 │
│  ☐ I agree to receive platform updates (optional)              │
│                                                                 │
│  [         Accept & Continue         ]                          │
│                                                                 │
│  * Required                                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Child Linking Step

**Requirements:**
- Show list of children pending acknowledgement
- Each child has "Accept" and "This Isn't Me" buttons
- "Accept All" option at bottom
- Cross-org sharing consent checkbox
- On decline: Remove link, set pending request to declined, allow admin resend

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                            [X]  │
│  Children Linked to Your Account                                │
│                                                                 │
│  The following children have been linked to your account.       │
│  Please confirm each one.                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  John Doe (Age 12)                                       │   │
│  │  Relationship: Father                                    │   │
│  │  Organization: St. Francis FC                            │   │
│  │                                                          │   │
│  │  [  Accept  ]  [ This Isn't Me ]                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Jane Doe (Age 10)                                       │   │
│  │  Relationship: Father                                    │   │
│  │  Organization: St. Francis FC                            │   │
│  │                                                          │   │
│  │  [  Accept  ]  [ This Isn't Me ]                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☐ Allow sharing of my children's information across orgs      │
│                                                                 │
│  [        Accept All Children        ]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Admin Guardian Addition - Email Notification Option

When an admin adds a guardian to a player, they should have the option to send an email notification.

**Requirements:**
- Checkbox to control email notification (default: CHECKED)
- If checked, email is sent to guardian with link to claim/acknowledge
- If unchecked, no email is sent (guardian will see prompt on next login)
- Admin can update email and resend later if needed

**Admin UI Mockup (Add Guardian Dialog):**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Add Guardian to [Player Name]                                  │
│                                                                 │
│  Guardian Email *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ parent@email.com                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Relationship *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Father                                              [▼] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☑ Send email notification to guardian                          │
│    (Guardian will receive an email to accept this link)         │
│                                                                 │
│  [  Cancel  ]                    [  Add Guardian  ]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Email Template (when checkbox is checked):**
```
Subject: You've been added as a guardian on PlayerARC

Hi,

[Admin Name] from [Organization Name] has added you as a guardian
for [Child Name] on PlayerARC.

Please click the link below to confirm this connection:
[Accept Link]

If you don't recognize this request, you can decline it after
logging in.

Best regards,
The PlayerARC Team
```

### Decline Notification to Admin

**Discussion Required:** When a parent declines a child link, should the admin be notified?

**Option 1: Real-time Toast (Recommended for logged-in admins)**
- If admin is logged in, show toast: "Parent declined link to [Child]"
- Pros: Immediate awareness
- Cons: Admin may not be logged in

**Option 2: Dashboard Notification Badge**
- Show badge on admin dashboard: "1 declined guardian link"
- Click to view details and take action
- Pros: Always visible, admin can address when convenient
- Cons: May be ignored

**Option 3: Email Notification**
- Send email to admin when parent declines
- Pros: Works even if admin not logged in
- Cons: May create email fatigue

**Option 4: Combination (Recommended)**
- Dashboard notification badge (always)
- Optional email notification (admin preference setting)
- Toast if admin happens to be logged in

**Proposed Implementation:**
```
Admin Settings:
☑ Notify me when a guardian declines a player link
  ○ Dashboard notification only (Recommended)
  ○ Dashboard + Email notification
```

**Decline Notification Content:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Guardian Link Declined                                       │
│                                                                 │
│ [Parent Email] has declined the guardian link to:               │
│ • Player: John Doe                                              │
│ • Reason: "This isn't my child" / "Wrong person" / [Other]      │
│                                                                 │
│ Actions:                                                        │
│ [  Update Email & Resend  ]  [  Delete Link  ]  [  Dismiss  ]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Role Notification (Toast Only)

**Clarification:** For admin and coach role grants (without child linking), a simple toast notification is sufficient - no modal required.

**Toast Examples:**
```
✓ You've been granted the Admin role for St. Francis FC

✓ You've been granted the Coach role for St. Francis FC
  You can now access the coach dashboard.
```

**Requirements:**
- Toast appears immediately if user is logged in
- If user not logged in, toast appears on next login
- Toast auto-dismisses after 5 seconds
- Toast includes link to relevant dashboard

---

### Invitation Lifecycle Management

Comprehensive handling of invitation expiration, re-invitation, and bulk management.

#### Configuration

**Organization Settings:**
```typescript
// Add to organization table
invitationExpirationDays: v.optional(v.number()),      // Default: 7
autoReInviteOnExpiration: v.optional(v.boolean()),     // Default: false (opt-in)
maxAutoReInvitesPerInvitation: v.optional(v.number()), // Default: 2
```

**Defaults:**
| Setting | Default | Description |
|---------|---------|-------------|
| Expiration Period | 7 days | Configurable per organization |
| Auto Re-invite | OFF (opt-in) | Admin must explicitly enable |
| Max Auto Re-invites | 2 | Prevents infinite re-invite loops |

#### User Experience: Expired Invitation Link

When a user clicks an expired invitation link, the experience depends on org settings:

**Scenario A: Auto Re-invite DISABLED (default)**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️ Invitation Expired                                         │
│                                                                 │
│  Your invitation to join St. Francis FC has expired.            │
│                                                                 │
│  You were invited as: Parent                                    │
│  Children: John Doe, Jane Doe                                   │
│  Original invitation: January 15, 2026                          │
│  Expired: January 22, 2026                                      │
│                                                                 │
│  [     Request New Invitation     ]                             │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Or contact the organization directly:                          │
│  📧 admin@stfrancisfc.com                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Scenario B: Auto Re-invite ENABLED**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ✓ New Invitation Sent!                                        │
│                                                                 │
│  Your previous invitation to St. Francis FC had expired.        │
│                                                                 │
│  We've automatically sent a new invitation to:                  │
│  📧 parent@email.com                                            │
│                                                                 │
│  Please check your email (including spam folder).               │
│                                                                 │
│  [     Check Email & Continue     ]                             │
│                                                                 │
│  Didn't receive it? [Request Manual Resend]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Scenario C: Auto Re-invite ENABLED but limit reached**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️ Invitation Expired                                         │
│                                                                 │
│  Your invitation has expired and automatic re-invites have      │
│  been exhausted.                                                │
│                                                                 │
│  Please contact the organization to request a new invitation:   │
│  📧 admin@stfrancisfc.com                                       │
│                                                                 │
│  [     Request New Invitation     ]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Invitation Request Flow (User Self-Service)

When user clicks "Request New Invitation":

**Schema Addition:**
```typescript
invitationRequests: defineTable({
  originalInvitationId: v.string(),
  organizationId: v.string(),
  userEmail: v.string(),
  requestedAt: v.number(),
  requestNumber: v.number(),            // 1, 2, or 3 (max 3 per invitation)
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("denied")
  ),
  processedAt: v.optional(v.number()),
  processedBy: v.optional(v.string()),
  denyReason: v.optional(v.string()),
  newInvitationId: v.optional(v.string()), // Created when approved
})
  .index("by_organization_status", ["organizationId", "status"])
  .index("by_email", ["userEmail"])
  .index("by_original_invitation", ["originalInvitationId"])
```

**Rate Limiting:**
- Maximum 3 requests per original invitation
- After 3 requests, user sees "Contact admin directly" message
- Count tracks across all requests (pending, approved, denied)

**Admin Notification Settings (add to organization):**
```typescript
// Add to organization table
notifyAdminsOnInvitationRequest: v.optional(v.boolean()),  // Default: true
```

When enabled, org admins receive email notification when user requests new invitation.

**User Confirmation:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ✓ Request Submitted                                           │
│                                                                 │
│  Your request for a new invitation has been sent to the         │
│  organization administrators.                                   │
│                                                                 │
│  You'll receive an email when your request is processed.        │
│                                                                 │
│  [     Done     ]                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Admin Dashboard: Invitation Management

**Invitation List with Tabs:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Invitations                                        [+ Invite]  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Active (12) │ Expiring Soon (3) ⚠️ │ Expired (5) │ Requests (2) 🔴 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Expired Tab Selected]                                         │
│                                                                 │
│  ☐ Select All                              [Actions ▼]          │
│                                                                 │
│  ☑ parent1@email.com                                            │
│    Role: Parent │ Children: John, Jane                          │
│    Expired: 2 days ago │ Resends: 0                             │
│    [Re-invite] [Cancel]                                         │
│                                                                 │
│  ☐ coach2@email.com                                             │
│    Role: Coach │ Teams: U12 Boys                                │
│    Expired: 5 days ago │ Resends: 1                             │
│    [Re-invite] [Cancel]                                         │
│                                                                 │
│  ☑ parent3@email.com                                            │
│    Role: Parent │ Children: Mike                                │
│    Expired: 1 day ago │ Resends: 0                              │
│    [Re-invite] [Cancel]                                         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  2 selected                                                     │
│  [  Re-invite Selected  ]  [  Cancel Selected  ]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Bulk Actions Available:**
| Action | Scope | Description |
|--------|-------|-------------|
| Re-invite Selected | Checked items | Create new invitations for selected |
| Re-invite All Expired | All in Expired tab | Bulk re-invite (with confirmation) |
| Cancel Selected | Checked items | Cancel invitations |
| Resend Expiring | Expiring Soon tab | Reminder email for expiring invitations |
| Export CSV | All tabs | Download for reporting |

**Invitation Requests Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Requests Tab Selected]                              2 pending │
│                                                                 │
│  parent1@email.com                                              │
│  Originally invited as: Parent                                  │
│  Requested: 2 hours ago                                         │
│  Original invite expired: January 22, 2026                      │
│                                                                 │
│  [  Approve & Send  ]  [  Deny  ]                               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  coach2@email.com                                               │
│  Originally invited as: Coach (U12 Boys)                        │
│  Requested: 1 day ago                                           │
│  Original invite expired: January 20, 2026                      │
│                                                                 │
│  [  Approve & Send  ]  [  Deny  ]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Admin Notification Settings

```
Organization Settings > Notifications

Invitation Notifications:
☑ Notify admins when invitations expire
  ○ Daily summary at 9:00 AM (Recommended)
  ○ Immediately (each expiration)

☑ Notify admins when users request new invitations
  (Always immediate)

☑ Show badge count on Users menu for:
  ☑ Expired invitations
  ☑ Pending requests
  ☑ Expiring soon (< 48 hours)
```

#### Scheduled Jobs

| Job | Frequency | Action |
|-----|-----------|--------|
| Mark Expired | Hourly | Update invitation status to "expired" |
| Auto Re-invite | Daily 8 AM | For orgs with setting enabled, resend expiring |
| Expiration Alert | Daily 9 AM | Email admins with expiring/expired summary |
| Archive Old | Weekly | Archive invitations expired > 30 days |
| Cleanup Archived | Monthly | Delete archived invitations > 90 days |

#### Archive Behavior

**Invitations older than 30 days (expired):**
- Moved to `archivedInvitations` table
- Not shown in admin UI by default
- Can be viewed via "Show Archived" toggle
- Cannot be re-invited (must create fresh invitation)

**Schema:**
```typescript
archivedInvitations: defineTable({
  originalInvitationId: v.string(),
  organizationId: v.string(),
  email: v.string(),
  role: v.string(),
  metadata: v.any(),
  createdAt: v.number(),
  expiredAt: v.number(),
  archivedAt: v.number(),
  archivedReason: v.union(
    v.literal("expired_30_days"),
    v.literal("manual_archive"),
    v.literal("user_cancelled")
  ),
})
  .index("by_organization", ["organizationId"])
  .index("by_archived_at", ["archivedAt"])
```

---

## Implementation Options

### Option A: Extend Existing Flow System

**Approach:** Repurpose the existing `flows` and `userFlowProgress` tables to handle onboarding.

**How It Works:**
1. Create predefined "onboarding flows" for each scenario
2. On user entry, evaluate which flows apply
3. Flow Interceptor handles display
4. Leverage existing priority/step/progress tracking

**Pros:**
- Uses existing infrastructure
- Less new code to write
- Consistent with future announcements/alerts
- Analytics already built in

**Cons:**
- Flow system designed for static content, not dynamic data
- Would need significant modification for child linking (dynamic list)
- May be over-engineered for onboarding use case
- Current flow system has known issues

**Effort:** Medium-High (modify existing system)

### Option B: New Dedicated Onboarding System

**Approach:** Build a purpose-built onboarding orchestrator separate from flows.

**How It Works:**
1. New `OnboardingProvider` component wraps app
2. On mount, queries backend for pending onboarding tasks
3. Backend evaluates user context, returns ordered steps
4. Frontend presents steps via new `OnboardingModal` component
5. Steps can include dynamic data (children list, roles, etc.)

**Pros:**
- Purpose-built for onboarding use case
- Clean separation of concerns
- Easier to handle dynamic content
- Won't break existing flow system

**Cons:**
- More code to write
- Two systems that could overlap (flows + onboarding)
- Need to ensure they don't conflict

**Effort:** Medium-High (new system)

### Option C: Hybrid Approach (RECOMMENDED)

**Approach:** Use flows for static steps (GDPR, welcome), custom components for dynamic steps (child linking).

**How It Works:**
1. Create new `OnboardingOrchestrator` component
2. Orchestrator checks multiple sources:
   - Flow system for pending static flows
   - Custom queries for pending invitations
   - Custom queries for pending child acknowledgements
3. Builds unified step queue
4. Static steps use flow system UI
5. Dynamic steps use custom modals
6. Single coordinator ensures no overlaps

**Pros:**
- Best of both worlds
- Leverages existing flow system where appropriate
- Custom handling for complex scenarios
- Clear separation of static vs dynamic content

**Cons:**
- Complexity of coordinating two systems
- Need clear rules for what goes where

**Effort:** Medium

---

## Recommendation

### Recommended: Option C - Hybrid Approach

**Rationale:**
1. **Leverages existing investment** - Flow system already built and tested
2. **Handles complexity** - Child linking needs custom UI with dynamic data
3. **Future-proof** - Static announcements use flows, custom features use dedicated components
4. **Pragmatic** - Fix current bugs while building toward unified system

### Key Architectural Decisions

1. **Single Orchestrator**: New `OnboardingOrchestrator` replaces `BulkClaimProvider`
2. **Step Queue**: Backend returns ordered list of pending tasks
3. **No Simultaneous Dialogs**: Only one step shown at a time
4. **Data Persistence**: All data committed before advancing to next step
5. **Consistent UI**: Same modal style for all steps
6. **Toast Fallback**: Non-blocking steps (role confirmation, welcome) use toasts

### Data Flow

```
User Logs In / Signs Up
         │
         ▼
OnboardingOrchestrator.checkPendingTasks()
         │
         ▼
Backend evaluates:
├── GDPR consent status (user.gdprConsentVersion < currentVersion)
├── Pending invitations (invitations where email = user.email, status = pending)
├── Pending guardian claims (guardianIdentities where email = user.email, userId = null)
├── Pending child acknowledgements (guardianPlayerLinks where acknowledgedByParentAt = null)
├── New role notifications (check recent member.functionalRoles changes)
└── First user status (total users = 1)
         │
         ▼
Returns ordered step queue:
[
  { type: "gdpr_consent", data: { version: 2, summary: "..." } },
  { type: "accept_invitation", data: { invitationId: "...", orgName: "..." } },
  { type: "child_linking", data: { children: [...] } },
  { type: "welcome", data: { orgName: "...", role: "..." } }
]
         │
         ▼
Frontend presents steps one at a time
         │
         ▼
On step completion, remove from queue, show next
         │
         ▼
When queue empty, route to appropriate dashboard
```

---

## Phased Implementation Plan

### Phase Summary

| Phase | Name | Priority | Bugs Fixed | Key Deliverables |
|-------|------|----------|------------|------------------|
| **1** | Foundation & Bug Fixes | CRITICAL | #297, #327 | Fix data loss, single dialog, orchestrator skeleton |
| **1B** | Invitation Lifecycle (User) | CRITICAL | - | Expired link UX, request new invitation |
| **2** | GDPR Consent | HIGH | - | Platform-wide consent, re-acceptance trigger |
| **3** | Child Linking & Admin Tools | HIGH | #293 | Unified accept/decline, invitation management dashboard |
| **4** | Toast Notifications | MEDIUM | #335 | Real-time role notifications |
| **5** | First User Onboarding | MEDIUM | - | Platform bootstrap, setup wizard |
| **6** | Polish & Edge Cases | MEDIUM | - | Error handling, analytics, accessibility, scheduled jobs |
| **7** | Player Graduation | LOW | - | Player dashboard, 18th birthday flow |

---

### Phase 1: Foundation & Critical Bug Fixes
**Goal:** Fix data loss bugs, establish orchestrator skeleton

**Deliverables:**
1. Fix `syncFunctionalRolesFromInvitation` to properly persist child links (#297)
2. Create `OnboardingOrchestrator` component (skeleton)
3. Create backend `getOnboardingTasks` query
4. Remove `BulkClaimProvider` (replaced by orchestrator)
5. Ensure single dialog at a time

**Implementation Sequence:**
1. Debug and fix `syncFunctionalRolesFromInvitation` - trace data flow, identify where child links are lost
2. Create `getOnboardingTasks` query that evaluates all pending tasks for a user
3. Build `OnboardingOrchestrator` component that wraps the app and presents steps one at a time
4. Migrate `BulkClaimProvider` logic into orchestrator
5. Remove `BulkClaimProvider` and update imports
6. Test all existing invitation flows still work

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/models/members.ts` | Modify | Fix syncFunctionalRolesFromInvitation |
| `packages/backend/convex/models/onboarding.ts` | Create | getOnboardingTasks query |
| `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` | Create | Main orchestrator component |
| `apps/web/src/components/bulk-claim-provider.tsx` | Delete | Replaced by orchestrator |
| `apps/web/src/app/orgs/[orgId]/layout.tsx` | Modify | Add OnboardingOrchestrator wrapper |

**Backend Queries/Mutations:**
```typescript
// Query: Returns ordered list of pending onboarding tasks
getOnboardingTasks(userId: string): OnboardingTask[]

// Task structure
type OnboardingTask = {
  type: "gdpr_consent" | "accept_invitation" | "child_linking" | "welcome";
  priority: number;
  data: Record<string, any>;
}
```

**Acceptance Criteria:**
- [ ] Children linked during invitation persist after acceptance
- [ ] No more dual-dialog issue
- [ ] All existing functionality preserved
- [ ] Orchestrator correctly sequences multiple pending tasks

**Testing Scenarios:**
1. Invite new parent with children → Sign up → Verify children linked
2. Invite existing user as parent → Accept → Verify no double dialog
3. User with multiple pending tasks → Sees them one at a time
4. Regression: All existing invitation flows still work

---

### Phase 1B: Invitation Lifecycle (User-Facing)
**Goal:** Improve user experience when invitation links expire

**Deliverables:**
1. Update expired invitation page with clear messaging and options
2. Add organization settings for invitation expiration (default: 7 days)
3. Add organization setting for auto re-invite (default: OFF)
4. Create `invitationRequests` table for user self-service
5. Implement "Request New Invitation" flow
6. Show org admin contact on expired page

**Implementation Sequence:**
1. Add org settings fields to organization table in schema
2. Create `invitationRequests` table with proper indexes
3. Update `/orgs/accept-invitation/[invitationId]/page.tsx` to detect expired status
4. Create `ExpiredInvitationView` component with appropriate UI
5. Implement `createInvitationRequest` mutation with rate limiting
6. Implement `processAutoReInvite` mutation for auto re-invite logic
7. Add admin email notification when request submitted (if setting enabled)

**Schema Changes:**
```typescript
// Organization settings (add to organization table)
invitationExpirationDays: v.optional(v.number()),      // Default: 7
autoReInviteOnExpiration: v.optional(v.boolean()),     // Default: false
maxAutoReInvitesPerInvitation: v.optional(v.number()), // Default: 2
adminContactEmail: v.optional(v.string()),
notifyAdminsOnInvitationRequest: v.optional(v.boolean()), // Default: true

// New table
invitationRequests: defineTable({
  originalInvitationId: v.string(),
  organizationId: v.string(),
  userEmail: v.string(),
  requestedAt: v.number(),
  requestNumber: v.number(),            // 1, 2, or 3 (max 3 per invitation)
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("denied")
  ),
  processedAt: v.optional(v.number()),
  processedBy: v.optional(v.string()),
  denyReason: v.optional(v.string()),
  newInvitationId: v.optional(v.string()),
})
  .index("by_organization_status", ["organizationId", "status"])
  .index("by_email", ["userEmail"])
  .index("by_original_invitation", ["originalInvitationId"])
```

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/schema.ts` | Modify | Add org settings, invitationRequests table |
| `packages/backend/convex/models/invitations.ts` | Modify | Add createInvitationRequest, processAutoReInvite |
| `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx` | Modify | Expired link handling |
| `apps/web/src/components/expired-invitation-view.tsx` | Create | Expired state UI |
| `apps/web/src/components/request-invitation-confirmation.tsx` | Create | Post-request confirmation |

**Backend Queries/Mutations:**
```typescript
// Mutations
createInvitationRequest({ originalInvitationId, userEmail })
processAutoReInvite({ invitationId })

// Internal helpers
checkInvitationRequestLimit({ originalInvitationId }) // Max 3 per invitation
```

**Acceptance Criteria:**
- [ ] User clicking expired link sees clear message with org name and role
- [ ] User can request new invitation (max 3 times per invitation)
- [ ] Auto re-invite works when org setting enabled (max 2 auto re-invites)
- [ ] After 3 requests, user sees "Contact admin directly" message
- [ ] Org admin contact displayed as fallback
- [ ] Admin notification setting controls whether email is sent on request

**Testing Scenarios:**
1. Click expired link (auto re-invite OFF) → See expired message with request button
2. Click expired link (auto re-invite ON) → New invite sent automatically
3. Request new invitation → Request appears in admin dashboard (Phase 3)
4. Request 3 times → Fourth attempt shows "Contact admin directly"
5. Admin notification ON → Admin receives email when request submitted
6. Admin notification OFF → No email sent

---

### Phase 2: GDPR Consent System
**Goal:** Implement platform-wide GDPR consent with re-acceptance capability

**Deliverables:**
1. Add GDPR fields to user schema
2. Create `gdprVersions` table
3. Create GDPR consent modal UI
4. Add GDPR step to orchestrator
5. Create platform staff UI for managing GDPR versions

**Implementation Sequence:**
1. Add GDPR fields to user table in schema
2. Create `gdprVersions` table
3. Seed initial GDPR version (version 1) with placeholder content
4. Create `getCurrentGdprVersion` and `checkUserGdprStatus` queries
5. Create `acceptGdpr` mutation
6. Build `GdprConsentStep` modal component
7. Integrate GDPR check into orchestrator (always first step)
8. Build platform staff UI for version management

**Schema Changes:**
```typescript
// Add to user table
gdprConsentVersion: v.optional(v.number()),    // Version accepted (e.g., 1, 2, 3)
gdprConsentedAt: v.optional(v.number()),       // Timestamp of consent

// New table
gdprVersions: defineTable({
  version: v.number(),
  effectiveDate: v.number(),
  summary: v.string(),
  fullText: v.string(),
  createdBy: v.string(),
  createdAt: v.number(),
})
  .index("by_version", ["version"])
  .index("by_effective_date", ["effectiveDate"])
```

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/schema.ts` | Modify | Add user GDPR fields, gdprVersions table |
| `packages/backend/convex/models/gdpr.ts` | Create | All GDPR queries/mutations |
| `apps/web/src/components/onboarding/gdpr-consent-step.tsx` | Create | Consent modal |
| `apps/web/src/components/onboarding/gdpr-policy-viewer.tsx` | Create | Expandable policy text |
| `apps/web/src/app/platform-admin/gdpr/page.tsx` | Create | Platform staff version management |

**Backend Queries/Mutations:**
```typescript
// Queries
getCurrentGdprVersion(): GdprVersion
checkUserGdprStatus(userId): { needsConsent: boolean, currentVersion: number }

// Mutations
acceptGdpr({ version, consentedToMarketing })
createGdprVersion({ summary, fullText, effectiveDate }) // Platform Staff only
```

**Consent Checkbox Logic:**
- Required: "I have read and agree to the Privacy Policy"
- Required (if parent role): "I confirm I have authority for children in my care"
- Optional: "I agree to receive platform updates" (marketing consent)

**Acceptance Criteria:**
- [ ] New users see GDPR consent before any other step
- [ ] GDPR modal cannot be dismissed without accepting
- [ ] GDPR acceptance recorded with timestamp and version
- [ ] Platform staff can create new GDPR version
- [ ] Users with old version see re-acceptance prompt on login
- [ ] Marketing consent is optional and stored separately
- [ ] Children authority checkbox shown for parent role users

**Testing Scenarios:**
1. New user signup → GDPR modal appears first → Cannot proceed without accepting
2. Accept GDPR → Version and timestamp recorded
3. Platform staff creates version 2 → Existing user logs in → Sees re-consent modal
4. Parent user → Sees additional "children authority" checkbox
5. Marketing checkbox unchecked → Still can proceed → Preference recorded correctly

---

### Phase 3: Child Linking & Admin Invitation Tools
**Goal:** Unified child linking + comprehensive invitation management for admins

#### Part A: Child Linking

**Deliverables:**
1. Create `ChildLinkingStep` component
2. Implement accept/decline per child
3. Implement "Accept All" functionality
4. Implement cross-org sharing consent
5. Handle declined links properly (mark as declined, allow resend)
6. Admin notification when parent declines (dashboard badge + optional email)
7. Integrate with orchestrator

**Implementation Sequence:**
1. Add status/declinedAt fields to guardianPlayerLinks table
2. Create `getPendingChildLinks` query
3. Create `acceptChildLink`, `declineChildLink`, `acceptAllChildLinks` mutations
4. Build `ChildLinkingStep` modal component with privacy extension acknowledgement
5. Integrate into orchestrator
6. Add admin notification on decline (badge + optional email)
7. Create admin UI to view/resend declined links

**Schema Changes:**
```typescript
// Add to guardianPlayerLinks table
status: v.optional(v.union(
  v.literal("pending"),      // Awaiting parent acknowledgement
  v.literal("active"),       // Parent accepted
  v.literal("declined")      // Parent declined
)),
declinedAt: v.optional(v.number()),
```

**Backend Queries/Mutations (Child Linking):**
```typescript
// Queries
getPendingChildLinks(userId): ChildLink[]
getDeclinedChildLinks(orgId): ChildLink[]  // Admin view

// Mutations
acceptChildLink({ linkId, consentToSharing })
declineChildLink({ linkId })
acceptAllChildLinks({ guardianIdentityId, consentToSharing })
resendChildLink({ linkId })    // Admin resends declined
removeChildLink({ linkId })    // Admin permanently removes
```

**Privacy Extension Acknowledgement:**
When children are added to a user who previously accepted GDPR without children, the modal shows:
> "Your privacy consent now extends to the children below"

This is NOT a full GDPR re-acceptance, just acknowledgement handled within the Child Linking step.

#### Part B: Admin Invitation Tools

**Deliverables:**
8. Create tabbed invitation list (Active / Expiring Soon / Expired / Requests)
9. Implement bulk selection UI
10. Implement bulk re-invite for expired invitations
11. Implement bulk cancel for unwanted invitations
12. Show invitation request queue with approve/deny actions
13. Add admin notification settings for invitations
14. Add email checkbox for guardian addition (default: checked)

**Implementation Sequence:**
1. Create invitation management page at `/orgs/[orgId]/admin/invitations`
2. Build tabbed interface component
3. Implement `getInvitationsByStatus` query with counts for badges
4. Build invitation list with bulk selection
5. Implement bulk mutations (resend, cancel, archive)
6. Build invitation request queue UI
7. Implement approve/deny mutations
8. Add notification settings to org settings page
9. Update add guardian dialog with email checkbox

**Backend Queries/Mutations (Invitation Management):**
```typescript
// Queries
getInvitationsByStatus(orgId, status): Invitation[]
getInvitationRequests(orgId): InvitationRequest[]
getInvitationStats(orgId): { active, expiringSoon, expired, requests }

// Mutations
resendInvitation({ invitationId })
cancelInvitation({ invitationId })
bulkResendInvitations({ invitationIds })
bulkCancelInvitations({ invitationIds })
archiveInvitation({ invitationId })
approveInvitationRequest({ requestId })
denyInvitationRequest({ requestId })
```

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/schema.ts` | Modify | Add status/declinedAt to guardianPlayerLinks |
| `packages/backend/convex/models/guardianPlayerLinks.ts` | Modify | Add accept/decline mutations |
| `packages/backend/convex/models/invitations.ts` | Modify | Bulk operations, request handling |
| `apps/web/src/components/onboarding/child-linking-step.tsx` | Create | Parent child linking modal |
| `apps/web/src/app/orgs/[orgId]/admin/invitations/page.tsx` | Create | Invitation management dashboard |
| `apps/web/src/components/admin/invitation-tabs.tsx` | Create | Tabbed invitation list |
| `apps/web/src/components/admin/invitation-request-card.tsx` | Create | Request approve/deny UI |
| `apps/web/src/components/admin/add-guardian-dialog.tsx` | Modify | Add email checkbox |

**Acceptance Criteria (Child Linking):**
- [ ] Parent sees all pending children in one modal
- [ ] Privacy extension acknowledgement shown at top of modal
- [ ] Can accept/decline individually or all at once
- [ ] Cross-org sharing consent checkbox works
- [ ] Declined links marked as "declined" (not deleted)
- [ ] Admin sees badge when parent declines
- [ ] Admin can resend declined links
- [ ] Sharing consent recorded

**Acceptance Criteria (Invitation Management):**
- [ ] Admin sees four tabs: Active/Expiring Soon/Expired/Requests
- [ ] Badge counts accurate on each tab
- [ ] Bulk selection works
- [ ] Bulk re-invite creates new invitations
- [ ] Bulk archive moves to archived table
- [ ] Can approve/deny invitation requests
- [ ] Email checkbox visible when adding guardian (default checked)

**Testing Scenarios:**
1. Admin adds guardian with 3 children → Parent logs in → Sees modal with all 3
2. Parent accepts 2, declines 1 → Dashboard shows 2 children → Admin sees declined badge
3. Admin resends declined → Parent sees that child in modal again
4. Parent accepts all → All children linked, modal closes
5. 5 invitations expire → Admin sees "Expired (5)" tab → Bulk re-invite → 5 new emails sent
6. User requests new invitation → Admin sees "Requests (1)" → Approve → User gets email
7. Add guardian with email checkbox ON → Email sent
8. Add guardian with email checkbox OFF → No email → Prompt on parent's next login

---

### Phase 4: Toast Notifications for Existing Users
**Goal:** Real-time notifications when roles are granted to logged-in users

**Key Principle:** Admin and Coach role grants use **toast notifications only** - no modal required. Parent role grants trigger the Child Linking modal (Phase 3).

**Deliverables:**
1. Create notification tracking in database
2. Implement real-time subscription for notifications
3. Create toast component for role notifications
4. Integrate with orchestrator

**Implementation Sequence:**
1. Create `notifications` table in schema
2. Create notification queries (getUnseenNotifications, getRecentNotifications)
3. Create notification mutations (markSeen, dismiss)
4. Build `NotificationProvider` component with real-time subscription
5. Build `NotificationToast` component
6. Update role grant mutations to create notifications
7. Integrate provider into app layout

**Schema Changes:**
```typescript
// New table
notifications: defineTable({
  userId: v.string(),
  organizationId: v.string(),
  type: v.union(
    v.literal("role_granted"),
    v.literal("team_assigned"),
    v.literal("team_removed"),
    v.literal("child_declined"),      // For admins
    v.literal("invitation_request")   // For admins
  ),
  title: v.string(),
  message: v.string(),
  link: v.optional(v.string()),       // Optional deep link
  createdAt: v.number(),
  seenAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
})
  .index("by_user_unseen", ["userId", "seenAt"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_org_type", ["organizationId", "type"])
```

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/schema.ts` | Modify | Add notifications table |
| `packages/backend/convex/models/notifications.ts` | Create | Notification CRUD |
| `packages/backend/convex/models/members.ts` | Modify | Trigger notifications on role grant |
| `packages/backend/convex/models/coachAssignments.ts` | Modify | Trigger notifications on team assign |
| `apps/web/src/components/notification-provider.tsx` | Create | Real-time notification handling |
| `apps/web/src/components/notification-toast.tsx` | Create | Toast component |

**Backend Queries/Mutations:**
```typescript
// Queries
getUnseenNotifications(userId): Notification[]
getRecentNotifications(userId, limit): Notification[]

// Mutations
markNotificationSeen(notificationId)
markAllNotificationsSeen(userId)
dismissNotification(notificationId)
createNotification({ userId, orgId, type, title, message, link }) // Internal
```

**Trigger Points:**
| Action | Notification Type | Recipient |
|--------|-------------------|-----------|
| `grantFunctionalRole` (admin/coach) | `role_granted` | User receiving role |
| `assignCoachToTeam` | `team_assigned` | Coach being assigned |
| `removeCoachFromTeam` | `team_removed` | Coach being removed |
| `declineChildLink` | `child_declined` | Org admins |
| `createInvitationRequest` | `invitation_request` | Org admins |

**Toast Behavior:**
- If user online: Toast appears immediately via real-time Convex subscription
- If user offline: Notification stored, toast appears on next login
- Auto-dismisses after 5 seconds
- Includes link to relevant dashboard
- Marked as "seen" after display

**Acceptance Criteria:**
- [ ] Logged-in user sees toast immediately when granted new role
- [ ] Toast shows role and organization name
- [ ] Toast includes link to relevant dashboard
- [ ] If user logs in later, notification shown on login
- [ ] Notifications marked as seen after display
- [ ] Multiple notifications shown staggered (not all at once)
- [ ] Admins receive toast when parent declines child link
- [ ] Admins receive toast when user requests new invitation

**Testing Scenarios:**
1. User A logged in → Admin grants Coach role → Toast appears immediately
2. User A logged out → Admin grants Coach role → User A logs in → Toast appears
3. Grant 3 roles while user offline → User logs in → 3 toasts appear (staggered)
4. Parent declines child → Admin (if online) sees toast
5. Click "View Dashboard" in toast → Navigates to correct dashboard

---

### Phase 5: First User Onboarding
**Goal:** Auto-detect first user and guide through platform setup

**Note:** Detailed plan already exists in `docs/features/first-user-onboarding.md`

**Deliverables:**
1. Implement first-user detection
2. Auto-assign Platform Staff role
3. Create setup wizard pages (5 steps)
4. Integrate with orchestrator

**Implementation Sequence:**
1. Create `isFirstUser` helper function
2. Add post-signup hook to check first user status
3. Auto-grant `isPlatformStaff = true` for first user
4. Add `setupComplete` and `setupStep` fields to user table
5. Create `/setup/*` route structure with layout protection
6. Build wizard pages: GDPR → Welcome → Create Org → Invite (optional) → Complete
7. Create setup mutations for org creation
8. Implement redirect logic after setup complete

**Setup Wizard Steps:**
| Step | Route | Purpose |
|------|-------|---------|
| 1 | `/setup` | GDPR consent (reuses Phase 2 component) |
| 2 | `/setup/welcome` | Platform overview, what to expect |
| 3 | `/setup/create-org` | Create first organization |
| 4 | `/setup/invite` | Invite initial team members (skip option) |
| 5 | `/setup/complete` | Success message, redirect to dashboard |

**Schema Changes:**
```typescript
// Add to user table
setupComplete: v.optional(v.boolean()),  // True after first user completes wizard
setupStep: v.optional(v.string()),       // Current step in setup wizard
```

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/models/setup.ts` | Create | Setup wizard queries/mutations |
| `packages/backend/convex/lib/firstUser.ts` | Create | First user detection helper |
| `apps/web/src/app/setup/layout.tsx` | Create | Setup wizard layout with protection |
| `apps/web/src/app/setup/page.tsx` | Create | Step 1: GDPR |
| `apps/web/src/app/setup/welcome/page.tsx` | Create | Step 2: Welcome |
| `apps/web/src/app/setup/create-org/page.tsx` | Create | Step 3: Create organization |
| `apps/web/src/app/setup/invite/page.tsx` | Create | Step 4: Invite team |
| `apps/web/src/app/setup/complete/page.tsx` | Create | Step 5: Completion |
| `apps/web/src/components/setup/setup-progress.tsx` | Create | Progress indicator |

**Backend Queries/Mutations:**
```typescript
// Queries
isFirstUser(): boolean
getSetupProgress(userId): { step, isComplete }

// Mutations
completeSetupStep({ step, data })
createFirstOrganization({ name, type, sport, colors })
```

**Route Protection:**
- `/setup/*` routes only accessible to users with `isPlatformStaff = true`
- Only accessible if no organizations exist OR setup not complete
- Redirect to `/orgs` if setup already complete

**Edge Cases:**
1. User refreshes during setup → `setupStep` tracks current step, returns to last incomplete
2. User abandons setup mid-way → On next login, redirect back to setup
3. Second user signs up during first user's setup → Gets normal flow (not wizard)

**Acceptance Criteria:**
- [ ] First user on fresh deployment gets Platform Staff automatically
- [ ] First user redirected to `/setup` after signup
- [ ] Setup wizard has 5 steps with progress indicator
- [ ] GDPR consent captured in step 1
- [ ] Organization created with user as Owner
- [ ] Optional team invitation works
- [ ] "Skip" on invite step proceeds to completion
- [ ] Second user gets normal flow (not setup wizard)
- [ ] Setup wizard protected from non-Platform Staff users
- [ ] Abandoning setup and returning works correctly

**Testing Scenarios:**
1. Fresh deployment → Sign up → Granted Platform Staff → Redirected to /setup
2. Complete all steps → Organization created → Dashboard loads
3. Second user signs up after first completes → Normal flow (no wizard)
4. First user completes step 2, closes browser → Logs in again → Returns to step 3
5. Click "Skip" on invite step → Proceeds to completion without sending invites

---

### Phase 6: Polish, Scheduled Jobs & Edge Cases
**Goal:** Handle all edge cases, automation, improve UX, comprehensive testing

#### Part A: Polish

**Deliverables:**
1. Timeout/error handling for all steps
2. "Skip for now" vs "Dismiss" logic
3. Analytics tracking for onboarding funnel
4. Help/support links in modals
5. Accessibility review
6. Mobile responsiveness
7. Comprehensive test suite

**Error Handling:**
- Network errors: Show retry option with user-friendly message
- Validation errors: Inline field validation, don't clear form
- Server errors: Log to error tracking, show support contact option

**Skip Behavior by Step:**
| Step | Skippable? | Behavior |
|------|------------|----------|
| GDPR Consent | No | Blocking, cannot proceed |
| Accept Invitation | No | Blocking, must accept or decline |
| Child Linking | Partial | Can skip, re-appears on next login (max 3 skips) |
| Welcome Toast | Yes | Auto-dismisses, never shown again |
| Role Toast | Yes | Auto-dismisses, never shown again |
| Setup Wizard | No | Blocking until complete |

**Analytics Events:**
| Event | Properties |
|-------|------------|
| `onboarding_started` | `entry_type`, `user_type` |
| `onboarding_step_shown` | `step_id`, `step_number` |
| `onboarding_step_completed` | `step_id`, `duration_seconds` |
| `onboarding_step_skipped` | `step_id`, `skip_count` |
| `onboarding_step_error` | `step_id`, `error_type` |
| `onboarding_completed` | `total_duration`, `steps_completed` |
| `onboarding_abandoned` | `last_step`, `duration_before_abandon` |

**Accessibility Requirements:**
- All modals keyboard navigable (Tab, Enter, Escape)
- Focus trapped within modal
- Screen reader announcements for step changes
- ARIA labels on all interactive elements
- Color contrast meets WCAG AA
- Error messages announced to screen readers

**Mobile Responsiveness:**
- Modals become full-screen on small viewports (<640px)
- Touch-friendly button sizes (min 44x44px)
- Scrollable content areas
- No horizontal scrolling

#### Part B: Scheduled Jobs

**Deliverables:**
8. Implement hourly job: Mark expired invitations
9. Implement daily job: Auto re-invite for enabled orgs (8 AM UTC)
10. Implement daily job: Admin expiration alerts (9 AM UTC)
11. Implement weekly job: Archive invitations expired > 30 days
12. Implement monthly job: Cleanup archived invitations > 90 days
13. Create `archivedInvitations` table

**Scheduled Jobs Configuration:**
```typescript
// packages/backend/convex/crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.hourly("mark-expired-invitations", { minuteUTC: 0 }, internal.jobs.markExpiredInvitations);
crons.daily("auto-reinvite", { hourUTC: 8, minuteUTC: 0 }, internal.jobs.processAutoReInvites);
crons.daily("admin-expiration-alerts", { hourUTC: 9, minuteUTC: 0 }, internal.jobs.sendExpirationAlerts);
crons.weekly("archive-old-invitations", { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 }, internal.jobs.archiveOldInvitations);
crons.monthly("cleanup-archived", { day: 1, hourUTC: 3, minuteUTC: 0 }, internal.jobs.cleanupArchivedInvitations);

export default crons;
```

**Job Summary:**
| Job | Frequency | Time (UTC) | Action |
|-----|-----------|------------|--------|
| Mark Expired | Hourly | :00 | Update status to "expired" |
| Auto Re-invite | Daily | 8:00 AM | Resend for orgs with setting enabled |
| Admin Alerts | Daily | 9:00 AM | Email summary to org admins |
| Archive Old | Weekly | Sun 2:00 AM | Move expired > 30 days to archive |
| Cleanup Archived | Monthly | 1st 3:00 AM | Delete archived > 90 days |

**Schema Addition:**
```typescript
archivedInvitations: defineTable({
  originalInvitationId: v.string(),
  organizationId: v.string(),
  email: v.string(),
  role: v.string(),
  metadata: v.any(),
  createdAt: v.number(),
  expiredAt: v.number(),
  archivedAt: v.number(),
  archivedReason: v.union(
    v.literal("expired_30_days"),
    v.literal("manual_archive"),
    v.literal("user_cancelled")
  ),
})
  .index("by_organization", ["organizationId"])
  .index("by_archived_at", ["archivedAt"])
```

#### Part C: Edge Cases

**Edge Cases to Handle:**
1. **User signs up with different email than invited** - Show "No pending invitations" with suggestion
2. **Multiple pending invitations** - Show one at a time, ordered by date
3. **Invitation accepted on different device** - First acceptance wins
4. **User deletes account mid-onboarding** - Invitations remain (by email)
5. **Organization deleted during onboarding** - Show error, redirect to org selection
6. **Concurrent role changes** - Real-time subscription updates state
7. **Session timeout during onboarding** - Redirect to login with return URL
8. **Rate limiting** - Max 1 invitation request per minute, max 3 total per invitation

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/crons.ts` | Create | Define all scheduled jobs |
| `packages/backend/convex/jobs/invitations.ts` | Create | Invitation job handlers |
| `packages/backend/convex/jobs/notifications.ts` | Create | Alert job handlers |
| `packages/backend/convex/schema.ts` | Modify | Add archivedInvitations table |
| `apps/web/src/lib/analytics.ts` | Modify | Add onboarding events |
| `apps/web/src/components/onboarding/error-boundary.tsx` | Create | Error handling wrapper |
| `apps/web/src/components/onboarding/help-footer.tsx` | Create | Help links component |
| E2E test files | Create | Playwright tests for all flows |

**E2E Tests to Create:**
| Test | Description |
|------|-------------|
| `new-user-parent-flow.spec.ts` | New user invited as parent, full flow |
| `existing-user-new-org.spec.ts` | Existing user joins new org |
| `first-user-setup.spec.ts` | Platform bootstrap flow |
| `expired-invitation.spec.ts` | Click expired link, request new |
| `child-linking.spec.ts` | Accept/decline children scenarios |
| `gdpr-reacceptance.spec.ts` | GDPR version update, re-consent |

**Acceptance Criteria:**
- [ ] All errors show user-friendly messages with retry option
- [ ] Skip behavior works correctly per step type
- [ ] Analytics events fire at each step
- [ ] Help links present in all modals
- [ ] Keyboard navigation works throughout
- [ ] Screen reader tested and working
- [ ] Mobile responsive on all screen sizes
- [ ] All scheduled jobs running on time
- [ ] Expired invitations auto-archived after 30 days
- [ ] Archived invitations deleted after 90 days
- [ ] Admins receive daily summary of expiring invitations
- [ ] All edge cases handled gracefully

**Testing Scenarios:**
1. Network error during step → Retry button works
2. Skip child linking → Re-appears on next login → After 3 skips, stops showing
3. Complete onboarding → Analytics shows full funnel
4. Use with screen reader → All steps announced correctly
5. Mobile viewport → Modals display correctly
6. Scheduled job: Mark expired runs hourly → Invitations updated
7. Scheduled job: Admin alert at 9 AM → Email received

---

### Phase 7: Player Dashboard & Graduation Flow (LOW PRIORITY)
**Goal:** Basic player dashboard and 18th birthday graduation

**Priority:** LOW - Implement last, after core onboarding is stable

**Deliverables:**
1. Create basic player dashboard (`/orgs/[orgId]/player`)
2. Implement age calculation helper
3. Create birthday detection scheduled job
4. Create graduation flow UI
5. Implement account claiming for adult players

**Implementation Sequence:**
1. Add `userId`, `claimedAt` fields to playerIdentities table
2. Create `playerGraduations` and `playerClaimTokens` tables
3. Create birthday detection scheduled job (daily 6 AM UTC)
4. Build guardian prompt modal for graduation
5. Create `/claim-account/[token]` route and wizard
6. Build player dashboard page
7. Implement claim mutations
8. Add emergency contact conversion logic

**Graduation Flow:**
```
Player turns 18
         │
         ▼
Scheduled job detects birthday → Creates graduation record (status: pending)
         │
         ▼
Guardian logs in → Sees prompt: "[Player] has turned 18!"
         │
         ├─► Guardian sends invitation to player's email
         │
         └─► Player signs up and claims identity via token

         │
         ▼
Player completes claim wizard:
1. Welcome
2. Account setup (signup/login)
3. GDPR consent
4. Review profile & confirm
         │
         ▼
Account claimed → Player has dashboard access → Guardian notified
```

**Schema Changes:**
```typescript
// Add to playerIdentities table
userId: v.optional(v.string()),           // Set when player claims account
claimedAt: v.optional(v.number()),        // Timestamp of claim
claimInvitedBy: v.optional(v.string()),   // Guardian who initiated

// New table: graduation tracking
playerGraduations: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  dateOfBirth: v.number(),
  turnedEighteenAt: v.number(),
  status: v.union(
    v.literal("pending"),          // Detected, not yet actioned
    v.literal("invitation_sent"),  // Guardian sent invite
    v.literal("claimed"),          // Player claimed account
    v.literal("dismissed")         // Guardian dismissed prompt
  ),
  invitationSentAt: v.optional(v.number()),
  invitationSentBy: v.optional(v.string()),
  claimedAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
  dismissedBy: v.optional(v.string()),
})
  .index("by_status", ["status"])
  .index("by_player", ["playerIdentityId"])

// New table: claim tokens
playerClaimTokens: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  token: v.string(),
  email: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),           // 30 days validity
  usedAt: v.optional(v.number()),
})
  .index("by_token", ["token"])
  .index("by_player", ["playerIdentityId"])
```

**Scheduled Job - Birthday Detection:**
```typescript
// Daily at 6:00 AM UTC
crons.daily("detect-player-birthdays", { hourUTC: 6, minuteUTC: 0 }, internal.jobs.detectPlayerGraduations);
```

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/schema.ts` | Modify | Add graduation tables |
| `packages/backend/convex/models/playerGraduations.ts` | Create | Graduation logic |
| `packages/backend/convex/models/playerClaims.ts` | Create | Claim token handling |
| `packages/backend/convex/jobs/graduations.ts` | Create | Birthday detection job |
| `apps/web/src/app/claim-account/[token]/page.tsx` | Create | Claim flow pages |
| `apps/web/src/app/orgs/[orgId]/player/page.tsx` | Create | Player dashboard |
| `apps/web/src/components/graduation/guardian-prompt.tsx` | Create | Guardian modal |
| `apps/web/src/components/graduation/claim-wizard.tsx` | Create | Claim flow wizard |
| `apps/web/src/components/player/player-dashboard.tsx` | Create | Dashboard component |

**Backend Queries/Mutations:**
```typescript
// Queries
getPendingGraduations(guardianUserId): Graduation[]
getPlayerClaimStatus(token): ClaimStatus
getPlayerDashboard(userId): PlayerDashboardData

// Mutations
sendGraduationInvite({ playerIdentityId, playerEmail })
dismissGraduationPrompt({ playerIdentityId })
claimPlayerAccount({ token, userId, keepEmergencyContacts: string[] })
```

**Player Dashboard Features (Basic):**
- View personal profile
- View development history
- View assessments and feedback
- View and track development goals
- Manage emergency contacts
- Privacy settings

**NOT in scope for Phase 7:**
- Player editing their own profile
- Player creating content
- Player-to-player features
- Advanced analytics

**Edge Cases:**
1. **Player already has platform account** - Link to existing account during claim
2. **Multiple guardians** - Any guardian can initiate, first invite wins
3. **Player in multiple orgs** - Single graduation covers all orgs
4. **Guardian dismisses prompt** - Hidden for that guardian, others still see it
5. **Claim token expires (30 days)** - Guardian can resend from dashboard
6. **Player is already 18+ at signup** - Immediate graduation prompt

**Acceptance Criteria:**
- [ ] Scheduled job detects players turning 18
- [ ] Guardian sees graduation prompt on login
- [ ] Guardian can send invitation to player
- [ ] Player receives claim email with link
- [ ] Player can create account and claim profile
- [ ] GDPR consent captured during claim
- [ ] Player can choose which guardians remain as emergency contacts
- [ ] Player dashboard shows basic profile info
- [ ] Guardian notified when player claims account
- [ ] Claim tokens expire after 30 days

**Testing Scenarios:**
1. Create player with DOB = 18 years ago → Run job → Guardian sees prompt
2. Guardian sends invitation → Player receives email → Claims account
3. Player already has account → Claims without new signup
4. Multiple guardians → One sends invite → Others see "Already invited"
5. Guardian dismisses → Player can still claim if another guardian invites
6. Claim token expires → Guardian can resend

---

## Success Metrics

### Quantitative
| Metric | Current | Phase 1 | Phase 3 | Final |
|--------|---------|---------|---------|-------|
| Parent-child link success rate | ~60% | 95% | 99% | 99% |
| Onboarding completion rate | Unknown | Measured | 85% | 95% |
| Avg onboarding time | Unknown | Measured | <3 min | <2 min |
| Support tickets (onboarding) | High | -50% | -80% | -95% |
| Double-dialog occurrences | Regular | 0 | 0 | 0 |

### Qualitative
- User feedback: "Clear and easy to understand"
- Admin feedback: "Parents are properly linked now"
- No user complaints about confusing prompts

---

## Appendices

### Appendix A: Current Code Locations

| Component | File Path |
|-----------|-----------|
| Invitation acceptance | `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx` |
| Guardian claim provider | `apps/web/src/components/bulk-claim-provider.tsx` |
| Guardian claim dialog | `apps/web/src/components/bulk-guardian-claim-dialog.tsx` |
| Sync functional roles | `packages/backend/convex/models/members.ts:syncFunctionalRolesFromInvitation` |
| Guardian identities | `packages/backend/convex/models/guardianIdentities.ts` |
| Guardian-player links | `packages/backend/convex/models/guardianPlayerLinks.ts` |
| Flow system | `packages/backend/convex/models/flows.ts` |
| Flow interceptor | `apps/web/src/components/flow-interceptor.tsx` |
| Flow system docs | `docs/architecture/flow-wizard-system.md` |
| First user docs | `docs/features/first-user-onboarding.md` |

### Appendix B: Database Tables Involved

**Existing Tables (Modify):**
| Table | Changes |
|-------|---------|
| `user` | Add: `gdprConsentVersion`, `gdprConsentedAt`, `setupComplete`, `setupStep` |
| `organization` | Add: `invitationExpirationDays`, `autoReInviteOnExpiration`, `maxAutoReInvitesPerInvitation`, `adminContactEmail`, `notifyAdminsOnInvitationRequest` |
| `guardianPlayerLinks` | Add: `status` (pending/active/declined), `declinedAt` |
| `playerIdentities` | Add: `userId`, `claimedAt`, `claimInvitedBy` |

**New Tables (Create):**
| Table | Purpose | Phase |
|-------|---------|-------|
| `gdprVersions` | GDPR policy version tracking | 2 |
| `invitationRequests` | User requests for new invitations | 1B |
| `archivedInvitations` | Archived expired invitations (>30 days) | 6 |
| `notifications` | Real-time notifications | 4 |
| `playerGraduations` | Player 18th birthday tracking | 7 |
| `playerClaimTokens` | Tokens for player account claiming | 7 |

**Reference Tables (No Changes):**
| Table | Purpose |
|-------|---------|
| `member` | Org membership + functionalRoles |
| `invitation` | Pending invitations with metadata |
| `guardianIdentities` | Platform-level guardian records |
| `flows` | Flow definitions (announcements, alerts) |
| `userFlowProgress` | User progress through flows |

### Appendix C: API Endpoints Needed (Complete List)

**Onboarding Core:**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `getOnboardingTasks` | Query | Returns ordered list of pending tasks for user |
| `completeOnboardingStep` | Mutation | Marks step as complete, persists data |

**GDPR (Phase 2):**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `getCurrentGdprVersion` | Query | Returns latest GDPR version |
| `checkUserGdprStatus` | Query | Check if user needs consent |
| `acceptGdpr` | Mutation | Records GDPR consent |
| `createGdprVersion` | Mutation | Platform staff creates new version |

**Child Linking (Phase 3):**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `getPendingChildLinks` | Query | Get children awaiting acknowledgement |
| `getDeclinedChildLinks` | Query | Admin: view declined links |
| `acceptChildLink` | Mutation | Parent accepts single child |
| `declineChildLink` | Mutation | Parent declines child link |
| `acceptAllChildLinks` | Mutation | Parent accepts all children |
| `resendChildLink` | Mutation | Admin resends declined link |
| `removeChildLink` | Mutation | Admin permanently removes link |

**Invitation Management (Phase 1B, 3):**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `getInvitationsByStatus` | Query | Get invitations filtered by status |
| `getInvitationRequests` | Query | Get pending user requests |
| `getInvitationStats` | Query | Get counts for badges |
| `createInvitationRequest` | Mutation | User requests new invitation |
| `processAutoReInvite` | Mutation | Auto re-invite logic |
| `resendInvitation` | Mutation | Resend single invitation |
| `cancelInvitation` | Mutation | Cancel invitation |
| `bulkResendInvitations` | Mutation | Bulk resend |
| `bulkCancelInvitations` | Mutation | Bulk cancel |
| `archiveInvitation` | Mutation | Archive old invitation |
| `approveInvitationRequest` | Mutation | Admin approves request |
| `denyInvitationRequest` | Mutation | Admin denies request |

**Notifications (Phase 4):**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `getUnseenNotifications` | Query | Get unseen notifications |
| `getRecentNotifications` | Query | Get notification history |
| `markNotificationSeen` | Mutation | Mark as seen |
| `markAllNotificationsSeen` | Mutation | Mark all seen |
| `dismissNotification` | Mutation | Dismiss notification |
| `createNotification` | Mutation | Internal: create notification |

**First User Setup (Phase 5):**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `isFirstUser` | Query | Check if first user |
| `getSetupProgress` | Query | Get current setup step |
| `completeSetupStep` | Mutation | Complete wizard step |
| `createFirstOrganization` | Mutation | Create org during setup |

**Player Graduation (Phase 7):**
| Endpoint | Type | Purpose |
|----------|------|---------|
| `getPendingGraduations` | Query | Get players turning 18 |
| `getPlayerClaimStatus` | Query | Check claim token status |
| `getPlayerDashboard` | Query | Get player's dashboard data |
| `sendGraduationInvite` | Mutation | Guardian sends invite |
| `dismissGraduationPrompt` | Mutation | Guardian dismisses |
| `claimPlayerAccount` | Mutation | Player claims account |

### Appendix D: UI Components Needed (Complete List)

**Core Onboarding (Phase 1):**
| Component | File | Purpose |
|-----------|------|---------|
| `OnboardingOrchestrator` | `components/onboarding/onboarding-orchestrator.tsx` | Wraps app, coordinates all steps |
| `OnboardingModal` | `components/onboarding/onboarding-modal.tsx` | Container for step modals |

**Invitation Lifecycle (Phase 1B):**
| Component | File | Purpose |
|-----------|------|---------|
| `ExpiredInvitationView` | `components/expired-invitation-view.tsx` | Expired link UI |
| `RequestInvitationConfirmation` | `components/request-invitation-confirmation.tsx` | Post-request confirmation |

**GDPR (Phase 2):**
| Component | File | Purpose |
|-----------|------|---------|
| `GdprConsentStep` | `components/onboarding/gdpr-consent-step.tsx` | GDPR acceptance modal |
| `GdprPolicyViewer` | `components/onboarding/gdpr-policy-viewer.tsx` | Expandable policy text |
| `GdprAdminPanel` | `app/platform-admin/gdpr/page.tsx` | Version management |

**Child Linking (Phase 3):**
| Component | File | Purpose |
|-----------|------|---------|
| `ChildLinkingStep` | `components/onboarding/child-linking-step.tsx` | Accept/decline children |
| `InvitationTabs` | `components/admin/invitation-tabs.tsx` | Tabbed invitation list |
| `InvitationRequestCard` | `components/admin/invitation-request-card.tsx` | Request approve/deny |
| `AddGuardianDialog` | `components/admin/add-guardian-dialog.tsx` | Guardian addition (modify) |

**Notifications (Phase 4):**
| Component | File | Purpose |
|-----------|------|---------|
| `NotificationProvider` | `components/notification-provider.tsx` | Real-time subscription |
| `NotificationToast` | `components/notification-toast.tsx` | Toast display |
| `NotificationBell` | `components/notification-bell.tsx` | Header icon (optional) |

**First User Setup (Phase 5):**
| Component | File | Purpose |
|-----------|------|---------|
| `SetupProgress` | `components/setup/setup-progress.tsx` | Progress indicator |
| `SetupWelcome` | `app/setup/welcome/page.tsx` | Welcome step |
| `SetupCreateOrg` | `app/setup/create-org/page.tsx` | Create org step |
| `SetupInvite` | `app/setup/invite/page.tsx` | Invite team step |
| `SetupComplete` | `app/setup/complete/page.tsx` | Completion step |

**Polish (Phase 6):**
| Component | File | Purpose |
|-----------|------|---------|
| `OnboardingErrorBoundary` | `components/onboarding/error-boundary.tsx` | Error handling |
| `HelpFooter` | `components/onboarding/help-footer.tsx` | Help links |

**Player Graduation (Phase 7):**
| Component | File | Purpose |
|-----------|------|---------|
| `GuardianGraduationPrompt` | `components/graduation/guardian-prompt.tsx` | Guardian modal |
| `ClaimWizard` | `components/graduation/claim-wizard.tsx` | Player claim flow |
| `PlayerDashboard` | `components/player/player-dashboard.tsx` | Player's dashboard |

### Appendix E: References

- Bug #335: Role Granting Notification
- Bug #293: Guardian Player Connection Bug
- Bug #327: New Parent Dialogue Window Error
- Bug #297: Parent Not Linked After Accepting Invitation
- Doc: `docs/architecture/flow-wizard-system.md`
- Doc: `docs/features/first-user-onboarding.md`
- Doc: `docs/features/organization-join-requests.md`
- Doc: `docs/features/invitations.md`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | PM | Initial draft |
| 1.1 | 2026-01-28 | PM | Added GDPR placeholder content, email notification option for guardian addition, decline notification discussion, reordered phases (player graduation to Phase 7), clarified toast-only for admin/coach roles |
| 1.2 | 2026-01-28 | PM | Added comprehensive Invitation Lifecycle Management section (expiration handling, user self-service, admin bulk tools, scheduled jobs, archiving). Added Phase 1B for user-facing expired link improvements. Updated Phase 3 to include invitation management dashboard. Updated Phase 6 to include scheduled jobs. |
| 1.3 | 2026-01-28 | PM | Phase 2 clarifications: IP address capture not required for GDPR. Added Children Extension Acknowledgement flow - when children added to existing user, lightweight acknowledgement (not full re-acceptance) handled in Child Linking step. |
| 2.0 | 2026-01-28 | PM | **Major Update:** Added comprehensive implementation details for all phases including: implementation sequences, files to create/modify, backend queries/mutations, schema changes, edge cases, and detailed testing scenarios. Expanded appendices with complete API endpoint list and UI component inventory. Ready for development handoff. |

---

**Next Steps:**
1. ~~Review this document with stakeholders~~ ✓ Completed
2. ~~Approve phased implementation plan~~ ✓ Completed
3. Begin Phase 1 development - See `docs/features/onboarding-implementation-plan.json`
