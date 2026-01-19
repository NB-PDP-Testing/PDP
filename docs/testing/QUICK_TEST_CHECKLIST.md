# Quick Test Checklist - Passport Enquiry System

**IMPORTANT:** Run these tests in order. Some tests depend on earlier ones.

## Prerequisites
- Dev server running on `localhost:3000`
- Test accounts available (see below)
- At least one player with enrollments in multiple organizations

---

## Test Accounts

| Email | Role | Password |
|-------|------|----------|
| neiltest2@skfjkadsfdgsjdgsj.com | Admin & Coach | lien1979 |
| neil.b@blablablak.com | Coach & Parent | lien1979 |
| neiltest3@skfjkadsfdgsjdgsj.com | Parent | lien1979 |

**Org ID:** `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7`

---

## Part 1: Admin Settings (10 minutes)

### 1. Configure Enquiry Mode ✅
- [ ] Login as `neiltest2@skfjkadsfdgsjdgsj.com`
- [ ] Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
- [ ] Scroll to "Sharing Contact Settings"
- [ ] Select "Enquiry system (managed by admins)"
- [ ] Click "Save Sharing Contact"
- [ ] **VERIFY:** Success toast appears
- [ ] **VERIFY:** Refresh page, enquiry mode still selected

### 2. Configure Direct Contact Mode
- [ ] Select "Direct contact (name, email, phone)"
- [ ] Fill in:
  - Name: "Test Coach"
  - Email: "test@testclub.com"
  - Phone: "+353 123 456 789"
- [ ] Click "Save Sharing Contact"
- [ ] **VERIFY:** Success toast appears
- [ ] **VERIFY:** Refresh page, settings persist

### 3. Test Direct Contact Validation
- [ ] Select "Direct contact"
- [ ] Enter ONLY name, leave email/phone empty
- [ ] Click Save
- [ ] **VERIFY:** Error: "Please provide at least an email or phone number"
- [ ] **VERIFY:** Settings NOT saved

### 4. Test Settings Sync
- [ ] Set to "Enquiry system" and save
- [ ] Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/sharing`
- [ ] Click "Settings" tab
- [ ] **VERIFY:** Enquiry mode is selected
- [ ] Change to "Direct contact" with test data
- [ ] Save
- [ ] Navigate back to `/admin/settings`
- [ ] **VERIFY:** Direct contact mode selected with same data

---

## Part 2: Coach Features (15 minutes)

**Setup:** Make sure admin has set enquiry mode for the organization

### 5. Find Contact Buttons
- [ ] Logout, login as `neil.b@blablablak.com`
- [ ] Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/coach/shared-passports`
- [ ] Check "My Players" tab
- [ ] **VERIFY:** "Contact" buttons appear next to organizations (if players exist)
- [ ] Check "Active" tab
- [ ] **VERIFY:** "Contact" buttons appear (if shared passports exist)
- [ ] Check "Browse" tab
- [ ] **VERIFY:** Search works, contact buttons appear

### 6. Submit Enquiry
- [ ] Click any "Contact" button
- [ ] **VERIFY:** Enquiry Modal opens
- [ ] Select subject: "Coordinate dual club commitments"
- [ ] Enter message: "Hi, I'd like to discuss training schedules for [player name]."
- [ ] Select "Email me"
- [ ] Click "Send Enquiry"
- [ ] **VERIFY:** Success toast: "Enquiry sent to [Org Name]"
- [ ] **VERIFY:** Modal closes

### 7. Test Enquiry Validation
- [ ] Open Enquiry Modal again
- [ ] Leave subject empty
- [ ] Click "Send Enquiry"
- [ ] **VERIFY:** Error: "Please provide subject and message"
- [ ] Select subject, leave message empty
- [ ] Click "Send Enquiry"
- [ ] **VERIFY:** Error: "Please provide subject and message"

### 8. View Direct Contact Info
**Setup:** Admin should configure direct contact mode first

- [ ] Find organization with direct contact mode
- [ ] Click "Contact" button
- [ ] **VERIFY:** Direct Contact Dialog opens (not enquiry modal)
- [ ] **VERIFY:** Shows contact name, email, phone
- [ ] **VERIFY:** Email is clickable mailto: link
- [ ] **VERIFY:** Phone is clickable tel: link

---

## Part 3: Admin Enquiry Queue (20 minutes)

**Setup:** Complete Part 2 first to create enquiries

### 9. View Enquiry Queue
- [ ] Logout, login as `neiltest2@skfjkadsfdgsjdgsj.com`
- [ ] Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/enquiries`
- [ ] **VERIFY:** Page loads successfully
- [ ] **VERIFY:** Tabs show counts: All (1) / Open (1) / Processing (0) / Closed (0)
- [ ] Click "Open" tab
- [ ] **VERIFY:** Enquiry card displays with:
  - Subject
  - Player name
  - Source organization and user
  - "Open" status badge
  - Timestamp

### 10. View Enquiry Details
- [ ] Click on the enquiry card
- [ ] **VERIFY:** Enquiry Detail Modal opens
- [ ] **VERIFY:** Shows:
  - Full subject
  - Player name
  - Source user name and email
  - Full message
  - Contact preference
  - Status dropdown
  - Timestamp

### 11. Mark as Processing
- [ ] In detail modal, change status to "Processing"
- [ ] Click "Update Status"
- [ ] **VERIFY:** Success toast appears
- [ ] **VERIFY:** Modal closes
- [ ] **VERIFY:** Enquiry moved to "Processing" tab
- [ ] **VERIFY:** Tab counts updated: All (1) / Open (0) / Processing (1) / Closed (0)

### 12. Close Enquiry
- [ ] Click enquiry in "Processing" tab
- [ ] Change status to "Closed"
- [ ] **VERIFY:** Resolution textarea appears
- [ ] Try clicking without entering resolution
- [ ] **VERIFY:** Error: "Resolution comment is required"
- [ ] Enter resolution: "Contacted coach via email. Agreed on shared schedule."
- [ ] Click "Close Enquiry"
- [ ] **VERIFY:** Success toast appears
- [ ] **VERIFY:** Modal closes
- [ ] **VERIFY:** Enquiry moved to "Closed" tab
- [ ] **VERIFY:** Tab counts: All (1) / Open (0) / Processing (0) / Closed (1)

### 13. View Closed Enquiry
- [ ] Click "Closed" tab
- [ ] Click the closed enquiry
- [ ] **VERIFY:** Shows resolution comment
- [ ] **VERIFY:** Shows "Closed by [Admin Name]"
- [ ] **VERIFY:** Shows closed timestamp

---

## Part 4: Admin Overview Badge (5 minutes)

### 14. View Overview with Open Enquiry
**Setup:** Create a new enquiry (repeat step 6)

- [ ] Navigate to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin`
- [ ] **VERIFY:** "Open Enquiries" stat card displays
- [ ] **VERIFY:** Shows count: "1" (or higher)
- [ ] **VERIFY:** Has warning/amber styling
- [ ] **VERIFY:** Shows description: "Passport enquiries from other orgs"
- [ ] Click the stat card
- [ ] **VERIFY:** Navigates to `/admin/enquiries`

### 15. View Overview with No Open Enquiries
- [ ] Close all open enquiries (repeat step 12)
- [ ] Navigate back to `/admin` overview
- [ ] **VERIFY:** "Open Enquiries" stat card does NOT display
- [ ] **VERIFY:** Clean dashboard with no empty states

---

## Part 5: Access Control (5 minutes)

### 16. Non-Admin Cannot Access Settings
- [ ] Logout, login as `neil.b@blablablak.com` (coach, NOT admin)
- [ ] Try navigating to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/settings`
- [ ] **VERIFY:** Access denied or redirect
- [ ] **VERIFY:** Cannot see/modify sharing contact settings

### 17. Non-Admin Cannot Access Enquiry Queue
- [ ] Try navigating to `/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin/enquiries`
- [ ] **VERIFY:** Access denied or redirect
- [ ] **VERIFY:** Cannot view enquiries

---

## Part 6: Visual/Responsive Testing (10 minutes)

### 18. Mobile Responsive
- [ ] Open dev tools, toggle device emulation (iPhone 14)
- [ ] Navigate through all pages:
  - Admin settings
  - Enquiry queue
  - Coach shared passports
  - Enquiry modal
  - Direct contact dialog
- [ ] **VERIFY:** All layouts responsive
- [ ] **VERIFY:** Buttons/forms usable on mobile
- [ ] **VERIFY:** No horizontal scroll
- [ ] **VERIFY:** Text readable

### 19. Dark Mode (if enabled)
- [ ] Toggle dark mode
- [ ] Check all pages
- [ ] **VERIFY:** Proper contrast
- [ ] **VERIFY:** No broken colors
- [ ] **VERIFY:** Badges/status indicators visible

---

## Quick Verification Checklist

After completing all tests above:

- [ ] All TypeScript errors resolved: `npm run check-types`
- [ ] No linting errors: `npx ultracite fix`
- [ ] Production build succeeds: `npm run build`
- [ ] No console errors in browser
- [ ] All success toasts working
- [ ] All error toasts working
- [ ] Real-time updates working (enquiry appears immediately for admin)
- [ ] Settings persist across page reloads
- [ ] Settings sync between two locations

---

## Sign Off

**Tester Name:** ___________________________
**Date:** ___________________________
**Total Tests:** 19
**Passed:** _____ / 19
**Failed:** _____ / 19
**Notes:**

---

## If Issues Found

Document in this format:

**Issue #:**
**Test Case:**
**Expected:**
**Actual:**
**Severity:** Critical / High / Medium / Low
**Screenshots:**

---

**Estimated Total Time:** 65 minutes
**Status:** Ready for manual testing
