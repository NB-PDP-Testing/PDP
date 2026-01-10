# TEST-UXTESTING-011: Phase 11 - PWA & Offline

## Test Objective
Verify PWA functionality including installation, service worker, offline support, and update prompts.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_service_worker` = true
  - `ux_offline_support` = true
  - `ux_pwa_update_prompt` = true
- [ ] Chrome browser (best PWA support)
- [ ] Real mobile device for install testing (optional)

## Test Steps

### Step 1: PWA Manifest Verification
1. Open app in Chrome
2. Open DevTools > Application > Manifest

**Verification:**
- [ ] Manifest loads without errors
- [ ] App name: "PlayerARC"
- [ ] Short name: "PlayerARC"
- [ ] Theme color matches branding
- [ ] Background color set
- [ ] Display mode: "standalone"
- [ ] Start URL configured
- [ ] All icon sizes present (192px, 512px)

### Step 2: Service Worker Registration
**Enable:** `ux_service_worker` = true

1. Open DevTools > Application > Service Workers
2. Check registration status

**Verification:**
- [ ] Service worker registered
- [ ] Status: "activated and running"
- [ ] Source shows `sw.js`
- [ ] No registration errors

### Step 3: Cache Storage
1. Open DevTools > Application > Cache Storage
2. Inspect cached content

**Verification:**
- [ ] Static cache exists
- [ ] JS/CSS files cached
- [ ] Images cached
- [ ] API responses cached (optional)

### Step 4: PWA Installation (Desktop Chrome)
1. Look for install icon in address bar (or ⋮ menu)
2. Click "Install PlayerARC"

**Verification:**
- [ ] Install prompt appears
- [ ] App icon shown
- [ ] App name shown
- [ ] "Install" button works
- [ ] App opens in standalone window
- [ ] No browser chrome visible
- [ ] App appears in system apps/programs

### Step 5: PWA Installation (Mobile)
**iOS Safari:**
1. Open app in Safari
2. Tap Share icon
3. Select "Add to Home Screen"

**Android Chrome:**
1. Open app in Chrome
2. Look for "Add to Home Screen" banner
3. Or use ⋮ menu > "Install app"

**Verification:**
- [ ] App icon added to home screen
- [ ] Icon looks correct
- [ ] Tapping opens in standalone mode
- [ ] No browser navigation visible

### Step 6: Offline Support - Cached Pages
**Enable:** `ux_offline_support` = true

1. Navigate to several pages (dashboard, players, teams)
2. Open DevTools > Network > set "Offline"
3. Navigate to cached pages

**Verification:**
- [ ] Dashboard loads offline (if visited)
- [ ] Player list loads offline (if visited)
- [ ] Static assets load (CSS, images)
- [ ] Navigation works between cached pages

### Step 7: Offline Support - Uncached Pages
1. While offline, navigate to a page not previously visited
2. Observe behavior

**Verification:**
- [ ] Offline page displayed
- [ ] Friendly message shown
- [ ] "Retry" or "Go back" button available
- [ ] No error screens or crashes

### Step 8: Coming Back Online
1. Re-enable network in DevTools
2. Observe behavior

**Verification:**
- [ ] "Back online" toast appears
- [ ] Click retry on offline page → loads correctly
- [ ] Data syncs/refreshes
- [ ] No stuck states

### Step 9: Update Prompt
**Enable:** `ux_pwa_update_prompt` = true

To test updates (simulated):
1. Open DevTools > Application > Service Workers
2. Click "Update" to simulate new SW
3. Or check "Update on reload"

**Verification:**
- [ ] Update available toast appears
- [ ] Shows "Update available" message
- [ ] "Refresh" button present
- [ ] "Later" dismiss option
- [ ] Clicking refresh updates the app
- [ ] Page reloads with new version

### Step 10: Offline Indicator
1. Go offline (DevTools > Network > Offline)
2. Check for indicator

**Verification:**
- [ ] Offline banner/indicator appears
- [ ] Clear "You're offline" message
- [ ] Positioned consistently
- [ ] Dismisses when back online

## Analytics Events to Verify
Check PostHog for these events:
- [ ] `SERVICE_WORKER_REGISTERED`
- [ ] `SERVICE_WORKER_UPDATE_FOUND`
- [ ] `SERVICE_WORKER_UPDATE_ACTIVATED`
- [ ] `OFFLINE_PAGE_VIEWED`
- [ ] `CACHE_HIT` (if implemented)
- [ ] `CACHE_MISS` (if implemented)

## Verification Checklist
- [ ] Manifest loads correctly
- [ ] Service worker registers
- [ ] Cache storage populated
- [ ] Desktop install works
- [ ] Mobile install works (iOS/Android)
- [ ] Cached pages load offline
- [ ] Offline page shows for uncached
- [ ] Online recovery works
- [ ] Update prompt appears
- [ ] Offline indicator works
- [ ] No console errors

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| iPhone (real device) | Safari | ⬜ Pass / ⬜ Fail |
| Android (real device) | Chrome | ⬜ Pass / ⬜ Fail |
| Desktop | Chrome | ⬜ Pass / ⬜ Fail |
| Desktop | Edge | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All verification items checked
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any issues found during testing -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**