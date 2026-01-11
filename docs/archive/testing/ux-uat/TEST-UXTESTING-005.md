# TEST-UXTESTING-005: Phase 5 - Polish & Platform Features

## Test Objective
Verify all polish features including keyboard shortcuts, density toggle, offline indicator, and PWA prompt.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_keyboard_shortcuts_overlay` = true
  - `ux_density_toggle` = true
  - `ux_offline_indicator` = true
  - `ux_pwa_install_prompt` = true
  - `ux_resizable_sidebar` = true
  - `ux_pinned_favorites` = true
  - `ux_recent_items` = true
- [ ] Test user account logged in

## Test Steps

### Step 1: Keyboard Shortcuts Overlay (Desktop)
**Enable:** `ux_keyboard_shortcuts_overlay` = true

1. Open app on desktop
2. Press `?` key

**Verification:**
- [ ] Overlay appears showing all shortcuts
- [ ] Shortcuts organized by category
- [ ] Press `?` again or `Esc` to close
- [ ] All listed shortcuts are functional

**Test Shortcuts:**
- [ ] `g h` → Go to Home
- [ ] `g p` → Go to Players
- [ ] `⌘K` → Command palette
- [ ] `⌘D` → Toggle density

### Step 2: Density Toggle (Desktop)
**Enable:** `ux_density_toggle` = true

1. Find density toggle (header or settings)
2. Or press `⌘D` if shortcuts enabled

**Verification:**
- [ ] Three options available: Compact, Comfortable, Spacious
- [ ] Changing density updates UI immediately
- [ ] Table row heights change
- [ ] Card padding changes
- [ ] Form spacing changes
- [ ] Preference persists after page reload

### Step 3: Offline Indicator
**Enable:** `ux_offline_indicator` = true

1. Open DevTools > Network tab
2. Select "Offline" preset
3. Observe the indicator

**Verification:**
- [ ] Banner appears showing "You're offline"
- [ ] Positioned consistently (top or bottom)
- [ ] Re-enable network → banner disappears
- [ ] Smooth transition animations

### Step 4: PWA Install Prompt
**Enable:** `ux_pwa_install_prompt` = true

1. Open app in Chrome (desktop or Android)
2. Visit multiple times or use DevTools > Application > Service Workers > bypass

**Verification:**
- [ ] Install prompt appears (Chrome/Edge)
- [ ] Or check for install icon in address bar
- [ ] Clicking installs the app
- [ ] Installed app opens standalone

### Step 5: Resizable Sidebar (Desktop)
**Enable:** `ux_resizable_sidebar` = true

1. Open app on desktop with sidebar visible
2. Drag the sidebar edge

**Verification:**
- [ ] Sidebar edge is draggable
- [ ] Width changes smoothly while dragging
- [ ] Minimum width enforced (200px)
- [ ] Maximum width enforced
- [ ] Width persists after page reload

### Step 6: Pinned Favorites
**Enable:** `ux_pinned_favorites` = true

1. Navigate to a page
2. Click "Pin" or star icon

**Verification:**
- [ ] Page added to favorites
- [ ] Favorites visible in sidebar/nav
- [ ] Can remove from favorites
- [ ] Favorites persist after reload
- [ ] Maximum favorites enforced (10)

### Step 7: Recent Items
**Enable:** `ux_recent_items` = true

1. Navigate to several pages
2. Check recent items section

**Verification:**
- [ ] Recent pages tracked
- [ ] Shows last 10 items
- [ ] Click to navigate
- [ ] Persists after reload
- [ ] Oldest items removed automatically

## Verification Checklist
- [ ] Keyboard shortcuts overlay works
- [ ] Density toggle changes UI
- [ ] Offline indicator shows correctly
- [ ] PWA install prompt appears
- [ ] Sidebar is resizable
- [ ] Favorites can be pinned
- [ ] Recent items are tracked
- [ ] No console errors

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| Desktop (1280px) | Chrome | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Firefox | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Safari | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All verification items checked
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any issues found during testing -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**