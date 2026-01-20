# Passport Enquiry System - UAT Test Plan

**Feature:** Organization-to-Organization Communication via Passport Enquiries
**Date:** 2026-01-19
**Tester:** Claude
**Environment:** Development (localhost:3000)

## Test Accounts

| Email | Org ID | Roles | Password |
|-------|--------|-------|----------|
| neil.b@blablablak.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 | Coach, Parent | lien1979 |
| neiltest2@skfjkadsfdgsjdgsj.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 | Admin, Coach | lien1979 |
| neiltest3@skfjkadsfdgsjdgsj.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 | Parent | lien1979 |
| neiltesting@example.com | jh7f6k14jw7j4sj9rr9dfzekr97xm9j7 | Admin, Coach, Parent | lien1979 |

## Test Categories

### 1. Admin Settings Configuration (TC-001 to TC-006)
### 2. Coach Contact Features (TC-007 to TC-012)
### 3. Admin Enquiry Queue (TC-013 to TC-018)
### 4. Settings Synchronization (TC-019 to TC-020)
### 5. Access Control & Security (TC-021 to TC-024)

---

## TC-001: Configure Direct Contact Mode
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
3. Scroll to "Sharing Contact Settings" section
4. Select "Direct contact (name, email, phone)" radio option
5. Fill in:
   - Contact Name: "Test Coach"
   - Email: "coach@testclub.com"
   - Phone: "+353 123 456 789"
6. Click "Save Contact Settings"

**Expected:**
- ✅ Success toast: "Sharing contact settings updated successfully"
- ✅ Settings persist on page refresh
- ✅ Contact fields visible when "direct" mode selected

**Actual:** [PENDING]

---

## TC-002: Configure Enquiry Mode
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
3. Scroll to "Sharing Contact Settings" section
4. Select "Enquiry system (managed by admins)" radio option
5. Verify info message displays about enquiry queue
6. Click "Save Contact Settings"

**Expected:**
- ✅ Blue info box: "Enquiries will appear in your admin enquiry queue for review"
- ✅ Success toast: "Sharing contact settings updated successfully"
- ✅ No contact fields required
- ✅ Settings persist on page refresh

**Actual:** [PENDING]

---

## TC-003: Disable Contact (Default Mode)
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
3. Scroll to "Sharing Contact Settings" section
4. Select "No public contact (default)" radio option
5. Click "Save Contact Settings"

**Expected:**
- ✅ Success toast: "Sharing contact settings updated successfully"
- ✅ No contact fields displayed
- ✅ Settings persist on page refresh

**Actual:** [PENDING]

---

## TC-004: Validate Direct Contact - Missing Email/Phone
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
3. Select "Direct contact (name, email, phone)" radio option
4. Fill ONLY Contact Name: "Test Coach"
5. Leave Email and Phone empty
6. Click "Save Contact Settings"

**Expected:**
- ❌ Error toast: "Please provide at least an email or phone number for direct contact"
- ❌ Settings NOT saved

**Actual:** [PENDING]

---

## TC-005: Settings in Passport Sharing Admin Section
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/sharing`
3. Click "Settings" tab
4. Verify "Sharing Contact Settings" component displays
5. Configure enquiry mode
6. Save settings

**Expected:**
- ✅ Settings tab exists
- ✅ Same component as in `/admin/settings`
- ✅ Settings save successfully
- ✅ Settings sync with main settings page

**Actual:** [PENDING]

---

## TC-006: Settings Sync Between Two Locations
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
3. Set to "Direct contact" with test data
4. Save
5. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/sharing` → Settings tab
6. Verify same settings displayed
7. Change to "Enquiry system"
8. Save
9. Navigate back to `/admin/settings`
10. Verify enquiry mode is selected

**Expected:**
- ✅ Settings display correctly in both locations
- ✅ Changes in one location reflect in the other
- ✅ Real-time sync via Convex

**Actual:** [PENDING]

---

## TC-007: Coach Views Contact Button (Enquiry Mode)
**Role:** Coach
**Account:** neil.b@blablablak.com

**Prerequisites:** Admin has set enquiry mode for another organization

**Steps:**
1. Login as coach
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/coach/shared-passports`
3. Check "My Players" tab for players with other org enrollments
4. Check "Active" tab for shared passports
5. Check "Browse" tab and search for players
6. Verify "Contact" button displays next to organizations

**Expected:**
- ✅ "Contact" button visible where organizations have enquiry mode enabled
- ✅ Button displays in all three tabs (My Players, Active, Browse)
- ✅ No button if organization has no contact mode set

**Actual:** [PENDING]

---

## TC-008: Coach Submits Enquiry
**Role:** Coach
**Account:** neil.b@blablablak.com

**Prerequisites:** Admin has enabled enquiry mode

**Steps:**
1. Login as coach
2. Navigate to shared passports page
3. Click "Contact" button on an organization
4. Verify Enquiry Modal opens
5. Select subject: "Coordinate dual club commitments"
6. Enter message: "Hi, we'd like to coordinate training schedules for [Player Name] who plays for both our clubs."
7. Select contact preference: "Email me"
8. Click "Send Enquiry"

**Expected:**
- ✅ Modal opens with form
- ✅ Subject dropdown has predefined options
- ✅ Message textarea accepts input
- ✅ Radio buttons for email/phone
- ✅ Success toast: "Enquiry sent to [Org Name]"
- ✅ Modal closes automatically
- ✅ Enquiry created in database

**Actual:** [PENDING]

---

## TC-009: Coach Views Direct Contact Info
**Role:** Coach
**Account:** neil.b@blablablak.com

**Prerequisites:** Admin has set direct contact mode with email/phone

**Steps:**
1. Login as coach
2. Navigate to shared passports page
3. Click "Contact" button on organization with direct mode
4. Verify Direct Contact Dialog opens

**Expected:**
- ✅ Dialog displays organization name
- ✅ Contact person name displayed
- ✅ Email displayed as clickable mailto: link
- ✅ Phone displayed as clickable tel: link
- ✅ No form submission required

**Actual:** [PENDING]

---

## TC-010: Contact Button Hidden (No Mode Set)
**Role:** Coach
**Account:** neil.b@blablablak.com

**Prerequisites:** Admin has NOT set any contact mode (default)

**Steps:**
1. Login as coach
2. Navigate to shared passports page
3. Check for "Contact" buttons on organizations

**Expected:**
- ✅ No "Contact" button displays for organizations with no contact mode
- ✅ Clean UI with no broken/disabled buttons

**Actual:** [PENDING]

---

## TC-011: Enquiry Validation - Empty Fields
**Role:** Coach
**Account:** neil.b@blablablak.com

**Steps:**
1. Login as coach
2. Open Enquiry Modal
3. Leave subject empty
4. Click "Send Enquiry"

**Expected:**
- ❌ Error toast: "Please provide subject and message"
- ❌ Enquiry NOT created

**Actual:** [PENDING]

---

## TC-012: Enquiry Validation - Empty Message
**Role:** Coach
**Account:** neil.b@blablablak.com

**Steps:**
1. Login as coach
2. Open Enquiry Modal
3. Select subject
4. Leave message empty or whitespace only
5. Click "Send Enquiry"

**Expected:**
- ❌ Error toast: "Please provide subject and message"
- ❌ Enquiry NOT created

**Actual:** [PENDING]

---

## TC-013: Admin Views Enquiry Queue (Empty State)
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Prerequisites:** No enquiries in system

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/enquiries`

**Expected:**
- ✅ Page loads successfully
- ✅ Tabs display: All (0) / Open (0) / Processing (0) / Closed (0)
- ✅ Empty state message displayed

**Actual:** [PENDING]

---

## TC-014: Admin Views Open Enquiry
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Prerequisites:** At least one enquiry exists (from TC-008)

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/enquiries`
3. Verify "Open" tab shows enquiry count
4. Click "Open" tab
5. Verify enquiry card displays

**Expected:**
- ✅ Tab badge shows count: "Open (1)"
- ✅ Enquiry card displays:
  - Subject
  - Player name
  - Source user name and organization
  - Status badge: "Open"
  - Timestamp
- ✅ Card is clickable

**Actual:** [PENDING]

---

## TC-015: Admin Views Enquiry Details
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Navigate to enquiry queue
3. Click on an enquiry card
4. Verify Enquiry Detail Modal opens

**Expected:**
- ✅ Modal displays:
  - Subject
  - Player name
  - Source user name and email
  - Full message
  - Contact preference
  - Status dropdown (current status selected)
  - Timestamp

**Actual:** [PENDING]

---

## TC-016: Admin Marks Enquiry as Processing
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Open enquiry detail modal
3. Change status dropdown to "Processing"
4. Click "Update Status"

**Expected:**
- ✅ Success toast: "Enquiry marked as processing"
- ✅ Modal closes
- ✅ Enquiry moves to "Processing" tab
- ✅ Status badge updates to "Processing"
- ✅ "Processing" tab count increments
- ✅ "Open" tab count decrements

**Actual:** [PENDING]

---

## TC-017: Admin Closes Enquiry with Resolution
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Open enquiry detail modal
3. Change status to "Closed"
4. Verify resolution textarea appears
5. Enter resolution: "Contacted coach via email. Agreed on shared training schedule."
6. Click "Close Enquiry"

**Expected:**
- ✅ Resolution field appears when "Closed" selected
- ✅ Success toast: "Enquiry closed successfully"
- ✅ Modal closes
- ✅ Enquiry moves to "Closed" tab
- ✅ Resolution saved with admin name and timestamp
- ✅ Tab counts update correctly

**Actual:** [PENDING]

---

## TC-018: Admin Cannot Close Without Resolution
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as admin
2. Open enquiry detail modal
3. Change status to "Closed"
4. Leave resolution field empty
5. Click "Close Enquiry"

**Expected:**
- ❌ Error toast: "Resolution comment is required when closing an enquiry"
- ❌ Enquiry NOT closed
- ❌ Modal remains open

**Actual:** [PENDING]

---

## TC-019: Admin Overview Badge (No Enquiries)
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Prerequisites:** All enquiries closed

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin`

**Expected:**
- ✅ No enquiry badge/card displayed
- ✅ Clean overview without empty states

**Actual:** [PENDING]

---

## TC-020: Admin Overview Badge (Open Enquiries)
**Role:** Admin
**Account:** neiltest2@skfjkadsfdgsjdgsj.com

**Prerequisites:** At least one open enquiry exists

**Steps:**
1. Login as admin
2. Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin`
3. Verify "Open Enquiries" stat card displays

**Expected:**
- ✅ Stat card displays with warning/amber variant
- ✅ Shows count of open enquiries
- ✅ Includes icon (MessageSquare)
- ✅ Description: "Passport enquiries from other orgs"
- ✅ Clickable link to `/admin/enquiries`

**Actual:** [PENDING]

---

## TC-021: Non-Admin Cannot Access Settings
**Role:** Coach (no admin)
**Account:** neil.b@blablablak.com

**Steps:**
1. Login as coach (not admin)
2. Try to navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`

**Expected:**
- ❌ Access denied or redirect
- ❌ Cannot modify sharing contact settings
- ✅ Proper access control enforced

**Actual:** [PENDING]

---

## TC-022: Non-Admin Cannot Access Enquiry Queue
**Role:** Parent
**Account:** neiltest3@skfjkadsfdgsjdgsj.com

**Steps:**
1. Login as parent (not admin)
2. Try to navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/enquiries`

**Expected:**
- ❌ Access denied or redirect
- ❌ Cannot view enquiries
- ✅ Proper access control enforced

**Actual:** [PENDING]

---

## TC-023: Cross-Organization Enquiry
**Role:** Multiple users

**Setup:**
1. Create/use two different organizations
2. Set up shared passport between them
3. Configure enquiry mode on target org

**Steps:**
1. Coach from Org A sends enquiry about player to Org B
2. Admin from Org B views enquiry queue
3. Verify enquiry displays correctly

**Expected:**
- ✅ Enquiry correctly identifies source and target organizations
- ✅ Player identity preserved
- ✅ Contact preferences stored

**Actual:** [PENDING]

---

## TC-024: Data Persistence & Real-Time Updates
**Role:** Admin + Coach (concurrent)

**Steps:**
1. Login as admin in one browser
2. Login as coach in another browser
3. Coach submits enquiry
4. Admin refreshes enquiry queue (or wait for real-time update)
5. Verify enquiry appears immediately

**Expected:**
- ✅ Real-time updates via Convex subscriptions
- ✅ No page refresh needed
- ✅ Data persists correctly

**Actual:** [PENDING]

---

## Summary

**Total Test Cases:** 24
**Passed:** 1 (automated)
**Failed:** 0
**Blocked:** 0
**Not Executed:** 23 (require manual testing)

## Critical Issues
[None yet]

## Known Limitations
- MVP: One-way communication (admin responds outside system)
- No email notifications (future enhancement)
- No enquiry history for coaches (future enhancement)

## Notes
- Test with real player data
- Test with multiple organizations
- Verify mobile responsiveness (not covered in this test plan)
