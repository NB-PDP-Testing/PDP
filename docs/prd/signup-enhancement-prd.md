# PRD: Enhanced Sign-Up for Better Parent-Child Matching

**Document ID:** PRD-375-SIGNUP
**Related Issue:** https://github.com/NB-PDP-Testing/PDP/issues/375
**Status:** Draft - Pending Review
**Author:** Claude Code
**Created:** January 29, 2026
**Last Updated:** January 29, 2026

---

## 1. Executive Summary

This PRD describes enhancements to the user sign-up process and profile verification that will improve automatic parent-child matching. By collecting additional information during registration, immediately after, and through admin-triggered verification for existing users, we can leverage the existing multi-signal matching algorithm to connect parents with their children's records more effectively.

**Key Changes:**
- Split "Full Name" into separate First Name and Last Name fields
- Add optional Phone and Postcode fields for matching signals
- Add post-registration step to collect children's information
- Integrate with existing `getSmartMatchesForGuardian` scoring algorithm
- **Admin-triggered verification:** Allow admins to request existing users verify/update their profile information

---

## 2. Problem Statement

### Current State
- Sign-up form collects only: Full Name, Email, Password
- Parent-child matching relies on email-only lookup (maximum 50 points)
- Many parents fail to be matched to their children's records because:
  - Email addresses differ between import data and sign-up
  - No fallback matching signals are available

### Impact
- Parents must manually request to be linked to their children
- Admins spend time processing avoidable matching requests
- User experience is degraded for parents who expect automatic matching

### Root Cause
A robust multi-signal matching system exists (`getSmartMatchesForGuardian`) but is underutilized during sign-up because we don't collect the necessary matching signals.

---

## 3. Goals and Non-Goals

### Goals
1. Increase automatic parent-child match rate by collecting additional signals
2. Maintain low sign-up friction by keeping extra fields optional
3. Leverage existing matching algorithm without modification
4. Provide clear value proposition to users for sharing optional information
5. Enable admins to retroactively improve matching data for existing users
6. Provide visibility into verification completion rates

### Non-Goals
- Modifying the core matching algorithm (already robust)
- Requiring additional fields (must remain optional)
- Building new admin approval workflows for matches
- Cross-organization matching enhancements (separate initiative)

---

## 4. User Stories

### US-1: Parent Sign-Up with Enhanced Matching
**As a** parent signing up for the platform
**I want** the option to provide additional information (phone, postcode)
**So that** I can be automatically matched with my children's records even if my email differs

**Acceptance Criteria:**
- [ ] Sign-up form shows optional Phone and Postcode fields
- [ ] Helper text explains why these fields help with matching
- [ ] Form submits successfully with or without optional fields
- [ ] User record stores phone and postcode when provided

### US-2: First/Last Name Split
**As a** parent signing up
**I want** to enter my first and last name separately
**So that** surname matching can work correctly

**Acceptance Criteria:**
- [ ] Sign-up form has separate First Name and Last Name fields
- [ ] Both fields are required
- [ ] Full name is constructed as "First Last" for display purposes

### US-3: Children Information Collection
**As a** newly registered parent
**I want** to provide my children's names and birth dates
**So that** I can be matched with their existing records

**Acceptance Criteria:**
- [ ] Post-registration step asks "Do you have children at a sports club?"
- [ ] If "Yes", shows form to enter child name(s) and DOB(s)
- [ ] User can add multiple children
- [ ] User can skip this step
- [ ] Information is used for matching, not record creation

### US-4: OAuth Sign-Up Flow
**As a** parent signing up via Google/Microsoft OAuth
**I want** to be prompted for additional matching information
**So that** I can still benefit from enhanced matching

**Acceptance Criteria:**
- [ ] After OAuth sign-up, user sees "Complete Your Profile" step
- [ ] Step collects: Phone (optional), Postcode (optional)
- [ ] Children info step follows as normal

### US-5: Admin Triggers Verification Request
**As an** organization admin
**I want** to request that users verify/update their profile information
**So that** I can improve matching data for existing users who signed up before these fields existed

**Acceptance Criteria:**
- [ ] Admin can target: all users, specific users, or users by role
- [ ] Admin can select which fields to include in verification request
- [ ] Users receive email notification about the request
- [ ] Users see verification modal on next login
- [ ] Users can skip/dismiss the verification (optional, not mandatory)

### US-6: User Completes Admin-Triggered Verification
**As a** user who received a verification request
**I want** to review and update my profile information
**So that** I can improve my matching with club records

**Acceptance Criteria:**
- [ ] Modal displays on next login after admin triggers request
- [ ] Pre-populated with existing data where available
- [ ] User can update selected fields
- [ ] User can skip without completing
- [ ] Completion status tracked

### US-7: Admin Tracks Verification Completion
**As an** organization admin
**I want** to see who has completed verification requests
**So that** I can send reminders to those who haven't

**Acceptance Criteria:**
- [ ] Dashboard shows completion statistics (completed/pending/skipped)
- [ ] Can view list of users who haven't completed
- [ ] Can send reminder to individual users or all pending
- [ ] Can see when each user completed (timestamp)

---

## 5. Functional Requirements

### 5.1 Sign-Up Form Changes

| Field | Current | Proposed | Required |
|-------|---------|----------|----------|
| Name | Single "Full Name" | Split: First Name + Last Name | Yes |
| Email | Collected | No change | Yes |
| Password | Collected | No change | Yes |
| Phone | Not collected | New field | No |
| Postcode | Not collected | New field | No |

**Visual Section:**
Add a collapsible or separator section titled "Help us find your records" with helper text:
- Phone: "Helps connect you to club records"
- Postcode/Eircode: "Used for household matching"

### 5.2 Post-Registration Flow

**Step 1: Children Inquiry**
- Radio selection: "Yes, I have children at a sports club" / "No, I'm joining as a coach/other"
- If "No" selected, skip to normal onboarding

**Step 2: Children Details** (if "Yes")
- For each child:
  - First Name (required if adding)
  - Date of Birth (required if adding)
- "Add another child" button
- "Skip - I'll do this later" option
- "Continue" to proceed with matching

### 5.3 Matching Integration

Use existing `getSmartMatchesForGuardian` function with collected signals:

| Signal | Points | Source |
|--------|--------|--------|
| Email match | 50 | Sign-up email |
| Surname match | 25 | Last name field |
| Child name exact (first + last) | 40 | Children info step |
| Age confirmation (±1 year) | +20 | Children info DOB |
| Phone match | 15 | Phone field (optional) |
| Postcode match | 20 | Postcode field (optional) |
| **Maximum Total** | **170** | |

### 5.4 Confidence Thresholds

| Score | Confidence | Action |
|-------|------------|--------|
| 60+ | High | Auto-show in claim modal |
| 30-59 | Medium | Show with lower prominence |
| 10-29 | Low | Show as "possible match" |
| <10 | None | Don't show |

### 5.5 Admin-Triggered Verification (Existing Users)

This feature allows admins to request that existing users verify and update their profile information, improving matching data retrospectively.

#### 5.5.1 Admin Controls

**Targeting Options:**
| Target Type | Description |
|-------------|-------------|
| All users | Send to every user in the organization |
| Specific users | Admin selects individual users from a list |
| By role | Filter by functional role (e.g., parents only, coaches only) |

**Field Selection:**
Admin chooses which fields to include in the verification request:
- [ ] First Name / Last Name
- [ ] Phone Number
- [ ] Postcode/Eircode
- [ ] Children Information (name + DOB)

**Request Options:**
- Custom message/reason (optional)
- Request is skippable (users can dismiss)
- Expiry date (admin sets when request expires)
- Reminder limit (admin configures max reminders per user)

#### 5.5.2 User Experience

**Delivery:**
1. **Email notification** - Sent when admin creates request
   - Subject: "Please verify your information - [Organization Name]"
   - Body: Explains why, link to platform
2. **Modal on next login** - Appears automatically
   - Shows selected fields pre-populated with existing data
   - "Update" and "Skip" buttons

**Modal Behavior:**
- Displays once per request (doesn't repeat if skipped)
- Pre-fills existing values where available
- Validates input before submission
- Shows success confirmation on completion

#### 5.5.3 Admin Tracking Dashboard

**Statistics View:**
| Metric | Description |
|--------|-------------|
| Total Sent | Number of users who received the request |
| Completed | Users who submitted updated information |
| Skipped | Users who dismissed without completing |
| Pending | Users who haven't seen the request yet |

**User List View:**
- Sortable by status, name, date
- Filter by completion status
- Individual "Send Reminder" button
- Bulk "Remind All Pending" action

**Reminder Functionality:**
- Re-sends email notification
- Does NOT re-trigger modal (modal shows on first login only)
- Tracks reminder count per user
- Respects admin-configured reminder limit (button disabled when limit reached)
- Shows "Expired" status for requests past expiry date

#### 5.5.4 Integration with Flow System

This feature extends the existing Flow system (`flows` table):

**New Flow Type:** `verification_request`

**Flow Properties:**
```typescript
{
  type: "verification_request",
  organizationId: string,
  createdBy: string,           // Admin who created
  targetType: "all" | "specific" | "role",
  targetUserIds?: string[],    // If specific
  targetRole?: string,         // If role-based
  fields: string[],            // Fields to verify
  customMessage?: string,
  expiresAt?: number,          // Admin-set expiry timestamp
  maxReminders: number,        // Admin-configured reminder limit
  createdAt: number,
}
```

**User Progress Tracking:**
Uses existing `userFlowProgress` table:
```typescript
{
  flowId: string,
  userId: string,
  status: "pending" | "completed" | "skipped",
  completedAt?: number,
  skippedAt?: number,
  reminderCount: number,
  lastReminderAt?: number,
}
```

---

## 6. Technical Requirements

### 6.1 Schema Changes

**File:** `packages/backend/convex/schema.ts`

Add to user table (Better Auth extensions):
```typescript
phone: v.optional(v.string()),
postcode: v.optional(v.string()),
```

### 6.2 Files to Modify

| File | Changes |
|------|---------|
| `packages/backend/convex/schema.ts` | Add phone, postcode to user schema |
| `apps/web/src/components/sign-up-form.tsx` | Split name, add phone/postcode fields |
| `packages/backend/convex/auth.ts` | Store phone/postcode on user creation |
| `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` | Add children info step |
| `packages/backend/convex/models/guardianIdentities.ts` | Pass additional signals to matching |
| `packages/backend/convex/models/flows.ts` | Add verification_request flow type and mutations |
| `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` | Add "Request Verification" admin UI |
| `apps/web/src/components/verification-request-modal.tsx` | New modal for user verification flow |

### 6.3 API Changes

Update `checkForClaimableIdentity` query to accept additional parameters:
```typescript
args: {
  email: v.string(),
  name: v.optional(v.string()),
  phone: v.optional(v.string()),      // NEW
  postcode: v.optional(v.string()),   // NEW
  children: v.optional(v.string()),   // NEW - JSON array
}
```

---

## 7. UI/UX Specifications

### 7.1 Enhanced Sign-Up Form

```
┌─────────────────────────────────────────┐
│           Create Account                │
├─────────────────────────────────────────┤
│ First Name *         [_______________]  │
│ Last Name *          [_______________]  │
│ Email *              [_______________]  │
│ Password *           [_______________]  │
│                                         │
│ ─── Help us find your records ───       │
│     (Optional)                          │
│                                         │
│ Phone Number         [_______________]  │
│   Helps connect you to club records     │
│                                         │
│ Postcode/Eircode     [_______________]  │
│   Used for household matching           │
│                                         │
│         [Create Account]                │
└─────────────────────────────────────────┘
```

### 7.2 Children Info Step

```
┌─────────────────────────────────────────┐
│    Do you have children at a club?      │
├─────────────────────────────────────────┤
│ This helps us connect you to their      │
│ records automatically.                  │
│                                         │
│ ○ Yes, I have children at a sports club │
│ ○ No, I'm joining as a coach/other      │
│                                         │
│ [Continue]                              │
└─────────────────────────────────────────┘

         ↓ (If "Yes")

┌─────────────────────────────────────────┐
│      Tell us about your children        │
├─────────────────────────────────────────┤
│ This information is used only to match  │
│ you with existing club records.         │
│                                         │
│ Child 1                                 │
│   First Name    [_______________]       │
│   Date of Birth [____/____/______]      │
│                                         │
│ [+ Add another child]                   │
│                                         │
│ [Continue]  [Skip - I'll do this later] │
└─────────────────────────────────────────┘
```

### 7.3 Admin: Create Verification Request

```
┌─────────────────────────────────────────────────────────┐
│         Request Profile Verification                    │
├─────────────────────────────────────────────────────────┤
│ Send verification requests to users to update their    │
│ profile information for better matching.               │
│                                                         │
│ Target Users                                            │
│ ○ All users in organization                            │
│ ○ Specific users  [Select users...]                    │
│ ○ Users by role   [Select role ▼]                      │
│                                                         │
│ Fields to Verify                                        │
│ ☑ Name (First / Last)                                  │
│ ☑ Phone Number                                         │
│ ☑ Postcode/Eircode                                     │
│ ☐ Children Information                                 │
│                                                         │
│ Custom Message (Optional)                              │
│ ┌─────────────────────────────────────────────────┐   │
│ │ We're updating our records to better connect    │   │
│ │ parents with their children's profiles...       │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│              [Cancel]  [Send Request]                   │
└─────────────────────────────────────────────────────────┘
```

### 7.4 Admin: Verification Tracking Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Verification Requests                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Request: Jan 29, 2026 - All Parents                 ││
│ │ Fields: Phone, Postcode, Children                   ││
│ │                                                     ││
│ │  ████████████░░░░░░░░  45% Complete                ││
│ │                                                     ││
│ │  Completed: 23  │  Skipped: 8  │  Pending: 20      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [View Details]  [Remind All Pending]                   │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ User                  Status      Completed     Actions │
│ ─────────────────────────────────────────────────────  │
│ John Smith           ✓ Done      Jan 29, 14:32   -     │
│ Mary O'Brien         ○ Pending   -              [Remind]│
│ Pat Murphy           ✗ Skipped   Jan 29, 10:15   -     │
│ Sarah Walsh          ○ Pending   -              [Remind]│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.5 User: Verification Modal

```
┌─────────────────────────────────────────────────────────┐
│         Please Verify Your Information                  │
├─────────────────────────────────────────────────────────┤
│ [Club Name] has requested that you verify your profile │
│ information to help connect you with club records.     │
│                                                         │
│ "We're updating our records to better connect          │
│  parents with their children's profiles."              │
│                                                         │
│ First Name           [John______________]              │
│ Last Name            [Smith_____________]              │
│                                                         │
│ Phone Number         [087-123-4567______]              │
│   Helps connect you to club records                    │
│                                                         │
│ Postcode/Eircode     [D12_AB34__________]              │
│   Used for household matching                          │
│                                                         │
│ ─── Your Children ───                                  │
│                                                         │
│ Child 1                                                │
│   First Name    [Emma______________]                   │
│   Date of Birth [15/03/2015________]                   │
│                                                         │
│ [+ Add another child]                                  │
│                                                         │
│              [Skip]  [Update Information]              │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Testing Requirements

### 8.1 Sign-Up Form Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SUE-01 | Submit with all required fields only | Account created successfully |
| SUE-02 | Submit with phone number | Phone stored in user record |
| SUE-03 | Submit with postcode | Postcode stored in user record |
| SUE-04 | Submit with all fields | All fields stored correctly |
| SUE-05 | Invalid phone format | Validation error shown |
| SUE-06 | Invalid postcode format | Validation error shown |

### 8.2 Children Info Step Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CIS-01 | Select "No" option | Skip to normal onboarding |
| CIS-02 | Add one child | Child info captured for matching |
| CIS-03 | Add multiple children | All children info captured |
| CIS-04 | Click "Skip" | Continue without child info |
| CIS-05 | Invalid DOB (future date) | Validation error shown |

### 8.3 Matching Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| MAT-01 | Email match only | 50 points, shown in modal |
| MAT-02 | Email + surname match | 75 points, high confidence |
| MAT-03 | Email + child name + DOB | 110+ points, high confidence |
| MAT-04 | Phone + surname (no email) | 40 points, medium confidence |
| MAT-05 | No matching signals | No matches shown |

### 8.4 OAuth Flow Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| OAU-01 | Google sign-up | Profile completion step shown |
| OAU-02 | Microsoft sign-up | Profile completion step shown |
| OAU-03 | Complete profile with phone | Phone stored, matching runs |

### 8.5 Admin Verification Request Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| AVR-01 | Create request targeting all users | Request created, emails sent to all |
| AVR-02 | Create request targeting specific users | Only selected users receive request |
| AVR-03 | Create request targeting role (parents) | Only users with parent role receive |
| AVR-04 | Select subset of fields | Modal shows only selected fields |
| AVR-05 | Add custom message | Message appears in email and modal |
| AVR-06 | View tracking dashboard | Statistics display correctly |
| AVR-07 | Send reminder to pending user | User receives reminder email |
| AVR-08 | Bulk remind all pending | All pending users receive reminder |

### 8.6 User Verification Modal Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| UVM-01 | Modal appears on login after request | Modal displays with correct fields |
| UVM-02 | Existing data pre-populated | Fields show current user data |
| UVM-03 | Submit updated information | Data saved, status marked complete |
| UVM-04 | Skip verification | Status marked skipped, modal closes |
| UVM-05 | Modal doesn't reappear after skip | User not prompted again for same request |
| UVM-06 | Add child information | Child data captured for matching |
| UVM-07 | Invalid phone format | Validation error shown |

---

## 9. Success Metrics

| Metric | Current Baseline | Target |
|--------|------------------|--------|
| Auto-match rate for new parents | ~30% (email-only) | 60%+ |
| Manual link requests from new users | High | 50% reduction |
| Sign-up completion rate | TBD | No degradation |
| Optional field completion rate | N/A | 40%+ |
| Admin verification completion rate | N/A | 50%+ of recipients |
| Existing user match improvement | N/A | 30% increase after verification |

---

## 10. Rollout Plan

### Phase 1: Sign-Up Form Updates
- Split name field
- Add optional phone/postcode
- Store in user record

### Phase 2: Children Info Step
- Add post-registration step
- Integrate with onboarding flow

### Phase 3: Matching Integration
- Pass new signals to existing matching
- Update claim modal display

### Phase 4: OAuth Flow
- Add profile completion step for OAuth users

### Phase 5: Admin Verification Request
- Add verification_request flow type
- Build admin UI for creating requests
- Implement user verification modal
- Build tracking dashboard
- Email notification integration

### Phase 6: Reminder System
- Implement reminder functionality
- Add bulk reminder capability
- Track reminder history

---

## 11. Decisions

| Question | Decision |
|----------|----------|
| Phone validation | **Any format accepted** - No strict validation, users can enter in their preferred format |
| Postcode lookup | **Future enhancement** - Design with auto-complete in mind, implement as separate initiative |
| Analytics | **Yes, track completion rates** - Track which optional fields are filled during sign-up |
| Reminder limits | **Admin configurable** - Org admins can set their own reminder limit per request |
| Request expiry | **Admin sets expiry** - Admin chooses expiry date when creating verification request |
| Email service | **Resend** - Use Resend email service for verification notifications |

## 12. Open Questions

None - all questions resolved.

---

## 13. Appendix

### A. Related Documentation
- Design Document: `docs/features/signup-enhancement-design.md`
- Matching Algorithm: `packages/backend/convex/models/guardianPlayerLinks.ts` (lines 1436-1661)
- Full Implementation Plan: `/Users/jkobrien/.claude/plans/composed-nibbling-quasar.md`

### B. Related Issues
- GitHub Issue #375: https://github.com/NB-PDP-Testing/PDP/issues/375

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | Pending |
| Technical Lead | | | Pending |
| UX Lead | | | Pending |
