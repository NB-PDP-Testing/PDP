# Phase 4 Manual Testing Guide

**Features to Test**: Enhanced Parent Experience (Browser notifications, shareable images, passport links)

---

## Prerequisites

**Test Account**: 
- Email: `neilparent@skfjkadsfdgsjdgsj.com` or `neiltest3@skfjkadsfdgsjdgsj.com`
- Password: `lien1979`
- Role: Parent
- Org: `jh7f6k14jw7j4sj9rr9dfzekr97xm9j7`

**Setup**:
1. Dev server should be running on http://localhost:3000
2. You should have at least one coach-parent summary to test with

---

## Test 1: Browser Tab Notifications (US-004, US-005, US-006)

### What to Test
Tab title should show unread count for parents only

### Steps
1. Login as parent account
2. Navigate to parent dashboard
3. Check browser tab title:
   - Should show `(N) Messages | PlayerARC` if you have unread summaries
   - N = number of unread summaries
4. Mark a summary as read
5. Tab title should update automatically (decrease count)

### Expected Results
- ✅ Tab shows unread count
- ✅ Count updates in real-time when summaries are read
- ✅ Only works for parent role (not coaches/admins)

### How to Verify US-005 Fix
Login as coach/admin - tab should NOT show message count (proper role check)

---

## Test 2: Passport Deep Links (US-003, US-007, US-008, US-009)

### What to Test
"View in Passport" button routes to correct passport section

### Steps
1. Login as parent
2. Navigate to Messages/Coach Feedback page
3. Find a summary card
4. Click "View in Passport" button
5. Should navigate to child's passport at relevant section

### Expected Results
- ✅ Button shows with arrow icon
- ✅ Clicking navigates to passport
- ✅ Lands on correct section:
  - Skill summaries → "skills" tab
  - Goal updates → "goals" tab
  - Injury notes → "medical" tab
  - Behavior feedback → "overview" tab

### Test Cases
Try with different summary types to verify routing logic

---

## Test 3: Shareable Images - Generation (US-010, US-011, US-012, US-013)

### What to Test
Image generation using satori + resvg

### Steps
1. Login as parent
2. Navigate to Messages
3. Click share button (Share2 icon) on any summary card
4. Modal should open and start generating image
5. Wait for image to load

### Expected Results
- ✅ Loading spinner shows while generating
- ✅ Image appears (1200x630 OG card format)
- ✅ Image shows:
  - PlayerARC branding
  - Player name
  - Summary content
  - Coach name + organization
  - Date
  - Gradient background (blue to purple)

### Verify Backend
Check Convex dashboard - should see image stored in storage

---

## Test 4: Share Modal - Download (US-014, US-015, US-016)

### What to Test
Download functionality

### Steps
1. Open share modal (from Test 3)
2. Wait for image to generate
3. Click "Download Image" button
4. Check your downloads folder

### Expected Results
- ✅ Image downloads successfully
- ✅ Filename format: `playerarc-feedback-YYYY-MM-DD.png`
- ✅ Image quality is good (1200x630)
- ✅ Toast notification appears confirming download

---

## Test 5: Share Modal - Native Share (US-017, US-018)

### What to Test
Native share (Web Share API)

### Steps
1. Open share modal
2. Look for "Share" button
   - **Desktop**: May not appear (not all browsers support it)
   - **Mobile**: Should appear
3. Click "Share" button (if available)
4. Native share sheet should appear
5. Choose an app to share to

### Expected Results
- ✅ Share button only shows if `navigator.share` available
- ✅ Clicking opens native share sheet
- ✅ Image can be shared to supported apps
- ✅ Toast notification on success

### Test on Mobile
Best tested on iOS Safari or Android Chrome for full native share experience

---

## Test 6: Sport Icons (US-019)

### What to Test
Visual sport icons in parent dashboard

### Steps
1. Login as parent
2. Navigate to Messages/Coach Feedback
3. Look at sport section headers
4. Each sport should have an icon

### Expected Results
- ✅ Icons appear next to sport names
- ✅ GAA → Trophy icon
- ✅ Soccer/Football → Trophy icon
- ✅ Basketball → Dumbbell icon
- ✅ Unknown sports → Activity icon (fallback)

---

## Test 7: Unread Badges (US-020)

### What to Test
Visual unread count badges per sport

### Steps
1. Login as parent with unread summaries
2. Navigate to Messages
3. Look at sport section headers

### Expected Results
- ✅ Red badge shows unread count next to sport name
- ✅ Badge only appears if count > 0
- ✅ Badge uses destructive variant (red for visibility)
- ✅ Count matches actual unread summaries for that sport

---

## Test 8: Share Event Tracking (US-001, US-002)

### What to Test
Backend tracking of share events

### Steps
1. Share an image (download or native share)
2. Check Convex dashboard
3. Look at `summaryShares` table

### Expected Results
- ✅ New record created in summaryShares table
- ✅ Fields populated:
  - summaryId (correct summary)
  - guardianIdentityId (your parent identity)
  - sharedAt (timestamp)
  - shareDestination (download/native_share/copy_link)

---

## Quick Smoke Test (All Features)

**5-Minute Test Flow**:
1. Login as parent → Check tab shows unread count
2. Go to Messages → See sport icons and unread badges
3. Click "View in Passport" → Verify routing
4. Click share button → See image generate
5. Download image → Check downloads folder
6. Check Convex dashboard → Verify share event tracked

**Pass Criteria**: All 6 steps complete without errors

---

## Known Limitations / Expected Behavior

### Tab Notifications
- Only updates when on parent pages
- Won't show for coaches/admins (by design)

### Shareable Images
- First generation may be slow (~2-3 seconds)
- Subsequent generations cached

### Native Share
- Desktop: Limited browser support
- Mobile: Best on iOS Safari / Android Chrome

### Sport Icons
- Fallback to generic Activity icon for unknown sports
- Lucide icons library limitations

---

## Troubleshooting

### "Share" button doesn't appear
- Normal on desktop browsers (limited Web Share API support)
- Test on mobile for full native share

### Image won't generate
- Check Convex logs for errors
- Verify satori/resvg installed: `npm ls satori @resvg/resvg-js`

### Tab count not updating
- Refresh page
- Check you're logged in as parent role
- Verify summaries exist in database

### Passport link goes to wrong section
- Check summary's `privateInsight.category` field
- Verify mapping in getPassportLinkForSummary query

---

## Success Criteria

✅ **All 20 stories testable and working**  
✅ **No console errors**  
✅ **Smooth user experience**  
✅ **Images generate correctly**  
✅ **Share tracking works**

If all tests pass → Ready for production! 🚀
