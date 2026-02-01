# Phase 9 Week 3 - Testing Guide

**Date:** 2026-02-01
**Branch:** ralph/team-collaboration-hub-p9
**Login:** neil.b@blablablak.com / lien1979

---

## 🚀 Quick Start

1. **Dev server should be running on:** http://localhost:3000
2. **Login as:** neil.b@blablablak.com
3. **Navigate to:** Coach section of your organization

---

## ✅ Feature Testing Checklist

### 1. Command Palette (US-P9-031)
**Location:** Available globally in coach section

**How to Test:**
- Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- Command palette should appear as a modal overlay
- Type to search for commands/actions
- Should show quick navigation options

**File:** `apps/web/src/components/coach/command-palette.tsx`
**Integration:** `apps/web/src/app/orgs/[orgId]/coach/layout.tsx`

---

### 2. Keyboard Shortcuts (US-P9-032, US-P9-033)
**Location:** Available globally in coach section

**How to Test:**
- Press `?` key to open keyboard shortcuts help
- Should show modal with all available shortcuts
- Try keyboard shortcuts:
  - `Cmd/Ctrl+K` - Command palette
  - `?` - Keyboard shortcuts help
  - `n` - New note (if on voice notes page)
  - `Esc` - Close modals

**Files:**
- `apps/web/src/components/coach/keyboard-shortcuts-help.tsx`
- `apps/web/src/hooks/use-command-palette.ts`

---

### 3. Insights Board View (US-P9-019, US-P9-020)
**Location:** Coach → Voice Notes → Insights Tab

**How to Test:**
1. Navigate to: `/orgs/[orgId]/coach/voice-notes`
2. Click on **"Insights"** tab
3. Look for **view switcher** (List/Board/Calendar toggle)
4. Click **"Board"** view
5. Should see Kanban-style board with columns:
   - **To Review** (pending insights)
   - **Applied** (approved insights)
   - **Dismissed** (rejected insights)

**What to Look For:**
- Cards grouped by status
- Drag-and-drop between columns (if implemented)
- Visual distinction between columns
- Player names on insight cards

**Files:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-view-container.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-board-view.tsx`

**Path:** http://localhost:3000/orgs/[orgId]/coach/voice-notes (Insights tab)

---

### 4. Mobile Swipe Gestures (US-P9-045, US-P9-046, US-P9-047)
**Location:** Voice Notes → Insights/Review/Team Insights tabs (mobile only)

**How to Test:**
1. **Open dev tools:** Press `F12`
2. **Enable mobile view:** Click device toggle icon (Cmd+Shift+M)
3. **Select device:** iPhone or Android (width < 768px)
4. Navigate to: `/orgs/[orgId]/coach/voice-notes`
5. Go to **Insights**, **Review**, or **Team Insights** tab
6. Try swiping insight cards:
   - **Swipe right** → Apply insight (green indicator)
   - **Swipe left** → Dismiss insight (red indicator)

**What to Look For:**
- Swipe gestures only work on mobile (<768px)
- Visual feedback during swipe (color indicators)
- Haptic-like animation
- Action executes after threshold (100px)

**Files:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/swipeable-insight-card.tsx`
- Integrated in: insights-tab.tsx, review-tab.tsx, team-insights-tab.tsx

---

### 5. Real-Time Collaboration (US-P9-025b)
**Location:** Coach → Session Plans → [Any Plan]

**How to Test (Need 2 Browser Windows):**
1. **Window 1:** Login as coach 1
2. **Window 2:** Login as coach 2 (or use incognito)
3. Navigate both to same session plan: `/orgs/[orgId]/coach/session-plans/[planId]`
4. **In Window 1:** Start editing the plan
5. **In Window 2:** You should see:
   - Avatar/presence indicator of coach 1
   - Toast notification: "Coach Name is now viewing this plan"
   - Warning about "last write wins"

**What to Look For:**
- Presence avatars at top of page
- Real-time presence updates (every 30s)
- Auto-save indicator ("Saving..." → "Saved ✓")
- Toast notification when other coaches join
- Warning before navigating with unsaved changes

**File:** `apps/web/src/app/orgs/[orgId]/coach/session-plans/[planId]/page.tsx`

---

### 6. Comment Threading (US-P9-030)
**Location:** Voice Notes → Insights → Comment on any insight

**How to Test:**
1. Go to: `/orgs/[orgId]/coach/voice-notes`
2. Click **Insights** tab
3. Find an insight card
4. Click **comment icon** or **"Add comment"**
5. Add a comment
6. Click **"Reply"** on existing comment
7. Should see threaded/nested comment structure

**What to Look For:**
- Reply button on comments
- Indented/nested replies
- Visual thread indicator (line or indentation)
- Correct parent-child relationship

**Backend:** `packages/backend/convex/models/insightComments.ts`
**Schema:** `insightComments.parentCommentId` field

---

### 7. Team Decisions & Voting (US-P9-026, US-P9-027, US-P9-028, US-P9-029)
**Location:** Team Hub → Decisions (if integrated)

**How to Test:**
1. Navigate to Team Hub
2. Look for **"Decisions"** or **"Vote"** section
3. Create a new team decision
4. Other coaches should be able to vote
5. See real-time vote counts

**What to Look For:**
- Create decision form
- Vote buttons (Approve/Reject/Abstain)
- Real-time vote tallies
- Decision status (pending/approved/rejected)
- Voting deadline

**Backend Schema:** `teamDecisions` table
**Files:** Check `/coach/team-hub/` components

---

## 🔍 Visual Verification Tips

### Using dev-browser (if available)
```bash
# Start dev-browser server
~/.claude/skills/dev-browser/server.sh &

# Then use dev-browser tool to navigate and screenshot features
```

### Manual Browser Testing
1. **Desktop Features:** Test at 1920x1080
2. **Mobile Features:** Test at 375x667 (iPhone SE)
3. **Responsive:** Test breakpoints (768px, 1024px, 1280px)

---

## 🐛 Common Issues

### "Can't see feature in UI"
- Check you're logged in as a **coach** (not parent/player)
- Verify you're in the correct route
- Check browser console for errors (F12)
- Ensure dev server is running on port 3000

### Command Palette Not Opening
- Make sure you're focused on the coach section
- Try clicking in the page first, then press Cmd+K
- Check browser console for keyboard hook errors

### Swipe Gestures Not Working
- Must be in mobile view (<768px width)
- Try in Chrome DevTools device mode
- Swipe threshold is 100px - swipe far enough

### Presence Not Showing
- Need 2 different browser sessions (or incognito)
- Wait up to 30 seconds for presence update
- Check if sessionPlanPresence mutation is being called

---

## 📊 Quick Checklist

- [ ] Command palette opens with Cmd+K
- [ ] Keyboard shortcuts help opens with ?
- [ ] Insights board view shows Kanban columns
- [ ] Mobile swipe gestures work (<768px)
- [ ] Real-time presence shows other coaches
- [ ] Auto-save works in session plans
- [ ] Comment threading allows replies
- [ ] Team decisions voting interface exists

---

## 🚨 If Features Are Missing

If you can't find a feature:

1. **Check file exists:**
   ```bash
   find apps/web/src -name "*component-name*"
   ```

2. **Check if imported:**
   ```bash
   grep -r "ComponentName" apps/web/src/app/orgs/[orgId]/coach/
   ```

3. **Check route:**
   - Look at folder structure in `apps/web/src/app/orgs/[orgId]/coach/`
   - Verify page.tsx exists for the route

4. **Check console:**
   - F12 → Console tab
   - Look for import errors or component rendering errors

---

## 📝 Test Data

**Test Account:** neil.b@blablablak.com
**Password:** lien1979

**To Create Test Data:**
- Voice notes with insights
- Session plans (for collaboration testing)
- Team decisions (for voting testing)

---

## ✅ Success Criteria

All features should:
- Load without console errors
- Respond to user interactions
- Show proper visual feedback
- Work across specified breakpoints
- Persist data correctly

If any feature is completely missing from the UI, check:
1. Component files exist (✓ confirmed above)
2. Component is imported and rendered
3. Route/navigation is correct
4. Conditional rendering logic (role checks, etc.)
