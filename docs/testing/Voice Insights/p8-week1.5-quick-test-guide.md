# P8 Week 1.5 - Quick Testing Guide

**How to Review and Test Self-Service Access Control**

---

## Quick Start (10 minutes)

### 1. Setup Test Accounts

You need 3 accounts in the same organization:

| Account | How to Create | Purpose |
|---------|---------------|---------|
| **Platform Staff** | Add `isPlatformStaff: true` to existing user in Convex dashboard | Configure org flags |
| **Org Admin** | Invite user with role="admin" | Manage coaches |
| **Coach Level 2+** | Existing coach: `neil.B@blablablak.com` | Test self-service toggle |

### 2. Enable Features (Platform Staff)

Login as platform staff → `/orgs/{orgId}/admin/settings/features`

1. Enable "Allow Admin Delegation" ✅
2. Enable "Allow Coach Override Requests" ✅
3. Leave "Enable Trust Gates" ON ✅

---

## Test Scenario 1: Coach Hides/Shows Tab (5 min)

**What**: Coach can hide "Sent to Parents" tab and show it again

**Steps**:
1. Login as Coach Level 2+ (`neil.B@blablablak.com`)
2. Go to Voice Notes dashboard
3. Look for "Sent to Parents" tab → Click chevron (▼) next to it
4. Click "Hide this tab"
5. Confirm dialog → Tab disappears
6. Click green "Request Access" button that appears
7. Click "Submit Request" → Tab reappears immediately

**Expected**:
- ✅ Tab has dropdown menu with "Hide this tab" option
- ✅ Confirmation dialog before hiding
- ✅ Tab disappears after confirming
- ✅ Green "Request Access" button appears
- ✅ Clicking request button restores tab immediately (no admin approval needed)

**Why this works**: Coach already has access (Level 2+), so they're just toggling visibility on/off. The "Request Access" button is confusingly named but works as "Show Tab" for coaches with existing access.

---

## Test Scenario 2: Admin Blocks/Unblocks Coach (5 min)

**What**: Admin can block specific coach from accessing parent features

**Steps**:
1. Login as Org Admin
2. Go to `/orgs/{orgId}/admin/settings/features`
3. Scroll to "Individual Coach Access Control" table
4. Find coach with "✓ Active" status
5. Click "Block" button
6. Enter reason: "Testing block functionality"
7. Confirm → Coach status changes to "🚫 Blocked"
8. Switch to that coach's account → "Sent to Parents" tab is gone
9. Switch back to admin → Click "Unblock"
10. Switch to coach → Tab reappears

**Expected**:
- ✅ Admin sees table with all coaches
- ✅ Block dialog has reason field
- ✅ Toast confirmation appears
- ✅ Coach immediately loses tab when blocked
- ✅ Locked icon shows admin's reason
- ✅ Unblocking restores access

---

## Test Scenario 3: Admin Bulk Block All (5 min)

**What**: Admin blocks ALL coaches at once (even Level 2+)

**Steps**:
1. Verify Coach Level 2+ has "Sent to Parents" tab visible
2. Login as Org Admin → Features page
3. Find "Bulk Access Control" card
4. Enable "Block All Coaches" toggle
5. Switch to Coach Level 2+ → Tab is gone
6. Switch back to admin → Disable "Block All Coaches"
7. Switch to coach → Tab reappears

**Expected**:
- ✅ Toggle enables/disables instantly
- ✅ All coaches lose access when enabled (check multiple coaches)
- ✅ All coaches regain access when disabled
- ✅ Individual coach table shows "🚫 Blocked" for everyone

---

## Common Issues & Solutions

### Issue: "I don't see the admin controls"
**Solution**:
1. Check you're logged in as org admin (not just member)
2. Check platform staff enabled "Allow Admin Delegation"
3. Refresh page after enabling delegation

### Issue: "Request Access button doesn't work"
**Solution**:
1. Check platform staff enabled "Allow Coach Override Requests"
2. Check coach isn't admin blocked (should show locked icon, not green button)

### Issue: "Coach can't hide tab"
**Solution**:
1. Check coach has Trust Level 2+ (or has been granted override)
2. Check admin hasn't blocked them (blocked coaches can't toggle)
3. Check admin blanket block isn't enabled

### Issue: "Admin table is empty"
**Solution**:
1. Check organization has coaches (members with functionalRoles including "coach")
2. Check admin delegation is enabled
3. Check Convex logs for errors

---

## Quick Database Checks

### Verify Organization Flags (Convex Dashboard)
```
organization table → Find your org → Check:
- voiceNotesTrustGatesEnabled: true ✅
- allowAdminDelegation: true ✅
- allowCoachOverrides: true ✅
- adminBlanketBlock: false (or true if testing bulk block)
```

### Verify Coach Preferences (Convex Dashboard)
```
coachOrgPreferences table → Find coach record → Check:
- parentAccessEnabled: true (if coach enabled)
- adminBlocked: false (unless admin blocked)
- If both false → coach disabled themselves
- If adminBlocked true → check blockReason field
```

### Verify Trust Level (Convex Dashboard)
```
coachTrustLevels table → Find coach → Check:
- currentLevel: should be 0, 1, 2, or 3
- totalApprovals: number of approvals
- Level 2+ requires 10 approvals
```

---

## Priority Logic Quick Reference

The system checks access in this order (first match wins):

1. **Admin blanket block** → ❌ No access (nobody can override)
2. **Admin blocked individual coach** → ❌ No access (coach can't override)
3. **Coach self-disabled** → ❌ No access (but coach can re-enable)
4. **Gates disabled** → ✅ Access (everyone gets access)
5. **Admin blanket override** → ✅ Access (everyone gets access)
6. **Trust Level 2+** → ✅ Access (coach can toggle on/off)
7. **Individual override** → ✅ Access (coach can toggle on/off)
8. **Default** → ❌ No access (can request if overrides enabled)

---

## Visual Testing Checklist

### Coach Dashboard Elements
- [ ] "Sent to Parents" tab has chevron dropdown (▼) when coach has access
- [ ] Clicking chevron shows "Hide this tab" menu item with eye-off icon
- [ ] Green "Request Access" button appears when coach doesn't have access
- [ ] Locked icon appears when coach cannot request (admin blocked)
- [ ] Status badges on other tabs work normally

### Admin Features Page Elements
- [ ] "Bulk Access Control" card visible (if delegation enabled)
- [ ] Two toggles: "Grant All Coaches Access" and "Block All Coaches"
- [ ] "Individual Coach Access Control" table visible
- [ ] Table columns: Name, Trust Level, Status, Access Reason, Actions
- [ ] Status badges: 🚫 Blocked (red), 👤 Self-Off (gray), ✓ Active (green), No Access (outline)
- [ ] Block/Unblock buttons per coach
- [ ] "Active Override Details" table (if overrides exist)
- [ ] "Pending Override Requests" table (if requests exist)

### Platform Staff Page Elements
- [ ] Three feature flag toggles visible
- [ ] "Enable Trust Gates" toggle
- [ ] "Allow Admin Delegation" toggle
- [ ] "Allow Coach Override Requests" toggle
- [ ] Toast notifications on each toggle

---

## Performance Checks

### Load Times (should be fast)
- [ ] Admin coach table loads in < 3 seconds (even with 50+ coaches)
- [ ] Coach dashboard loads in < 2 seconds
- [ ] Bulk block toggle responds in < 1 second
- [ ] Access check query runs in < 100ms (check Convex logs)

### Real-Time Updates
- [ ] Coach hides tab → refreshing admin page shows "👤 Self-Off" status
- [ ] Admin blocks coach → refreshing coach page hides tab
- [ ] Admin bulk blocks → all open coach dashboards hide tab on refresh

---

## Next Steps After Testing

### If Everything Works ✅
1. Mark P8 Week 1.5 as complete
2. Deploy to production (merge PR)
3. Create user documentation
4. Train admins on new controls

### If Issues Found 🐛
1. Document issue in GitHub
2. Check Convex logs for errors
3. Verify database state matches expected
4. Check browser console for frontend errors
5. Report findings to dev team

---

## Getting Help

### Where to Look First
1. **Browser Console**: Frontend errors, network issues
2. **Convex Logs**: Backend errors, access check results
3. **Database State**: Check tables in Convex dashboard
4. **Network Tab**: Check API calls, responses

### Common Log Messages
```
// Success - Coach has access
✅ Access granted: Trust Level 2

// Blocked - Admin blocked coach
❌ Access denied: Admin blocked: Testing block functionality

// Disabled - Coach self-disabled
❌ Access denied: You disabled this feature

// Default - No access
❌ Access denied: Available at Trust Level 2
```

---

## Test Data Cleanup

After testing, reset state:
1. Admin → Disable "Block All Coaches" if enabled
2. Admin → Unblock all individually blocked coaches
3. Coach → Re-enable tab if disabled
4. Platform Staff → Leave delegation and overrides enabled (safe defaults)

Do NOT disable "Enable Trust Gates" - this is the system default.

---

**Quick Start Commands**

```bash
# Check current branch
git branch

# Should be on: ralph/coach-impact-visibility-p8-week1

# View recent commits
git log --oneline -3

# Expected:
# 3d22f737 feat: P8 Week 1.5 - Add org admin controls
# e8a26bce feat: P8 Week 1.5 - Add coach self-service controls
# 23225875 feat: US-P8-027 to US-P8-030 - Complete self-service access control

# Start dev server (if not running)
npm run dev

# Monitor Convex logs
npx -w packages/backend convex dev
```

**Test URLs** (replace {orgId} with your org ID):
- Admin: `http://localhost:3000/orgs/{orgId}/admin/settings/features`
- Coach: `http://localhost:3000/orgs/{orgId}/coach/voice-notes`

---

**End of Quick Test Guide**
