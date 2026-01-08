# TEST-UXTESTING-012: Phase 12 - Accessibility

## Test Objective
Verify WCAG AA compliance including skip links, focus management, screen reader support, and reduced motion.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_skip_links` = true
  - `ux_focus_visible` = true
  - `ux_reduced_motion` = true
  - `ux_announcer` = true
- [ ] Screen reader available (VoiceOver, NVDA, or ChromeVox)
- [ ] Keyboard only (no mouse for testing)

## Test Steps

### Step 1: Skip Links
**Enable:** `ux_skip_links` = true

1. Load any page
2. Press Tab immediately after page loads

**Verification:**
- [ ] "Skip to main content" link appears
- [ ] Link is first focusable element
- [ ] Link is visually hidden until focused
- [ ] Press Enter → focus moves to main content
- [ ] Focus visible in main content area
- [ ] Tab continues from main content

### Step 2: Focus Visible Indicators
**Enable:** `ux_focus_visible` = true

1. Navigate using Tab key only
2. Check all interactive elements

**Verification:**
- [ ] All buttons show focus ring when focused
- [ ] All links show focus ring when focused
- [ ] All inputs show focus ring when focused
- [ ] Focus ring is clearly visible (good contrast)
- [ ] Focus ring style is consistent
- [ ] No elements "disappear" from focus order

### Step 3: Keyboard Navigation - Basic
Navigate the entire app using only keyboard:

**Tab Navigation:**
- [ ] Tab moves forward through elements
- [ ] Shift+Tab moves backward
- [ ] Focus order is logical (top→bottom, left→right)
- [ ] No focus traps (can always Tab out)

**Element Activation:**
- [ ] Enter activates buttons
- [ ] Enter activates links
- [ ] Space toggles checkboxes
- [ ] Space toggles switches
- [ ] Space/Enter opens selects

**Menu Navigation:**
- [ ] Arrow keys navigate dropdown options
- [ ] Escape closes menus/modals
- [ ] Enter selects current option

### Step 4: Modal Focus Trapping
1. Open any modal/dialog
2. Try to Tab out of modal

**Verification:**
- [ ] Focus trapped inside modal
- [ ] Tab cycles through modal elements only
- [ ] Cannot Tab to background content
- [ ] Escape closes modal
- [ ] Focus returns to trigger element

### Step 5: Screen Reader Announcements
**Enable:** `ux_announcer` = true

1. Enable screen reader:
   - macOS: `⌘+F5` for VoiceOver
   - Windows: Install NVDA (free)
   - Chrome: ChromeVox extension
2. Perform common actions

**Verification:**
- [ ] Page title announced on navigation
- [ ] Button labels read correctly
- [ ] Form labels read with inputs
- [ ] Success messages announced ("Changes saved")
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] No duplicate announcements

### Step 6: Live Region Announcements
Test dynamic content updates:

1. Save a form
2. Delete an item
3. Navigate to new page

**Verification:**
- [ ] Save action announces "Changes saved"
- [ ] Delete announces "Item deleted"
- [ ] No visual disruption
- [ ] Announcements are timely

### Step 7: Reduced Motion
**Enable:** `ux_reduced_motion` = true

Enable reduced motion in OS:
- **macOS:** System Preferences > Accessibility > Display > Reduce motion
- **Windows:** Settings > Ease of Access > Display > Show animations

**Verification:**
- [ ] Page transitions are instant (no slide)
- [ ] No bouncing animations
- [ ] No parallax effects
- [ ] Loading spinners still work
- [ ] Essential animations preserved
- [ ] UI remains functional

### Step 8: Color Contrast
Use Chrome DevTools accessibility audit:

1. Open DevTools > Lighthouse
2. Run Accessibility audit
3. Check contrast issues

**Verification:**
- [ ] No contrast failures on text
- [ ] No contrast failures on interactive elements
- [ ] Warning text (orange) still readable
- [ ] Error text (red) still readable
- [ ] Focus rings have good contrast

### Step 9: Form Accessibility
Navigate to any form:

**Verification:**
- [ ] All inputs have labels
- [ ] Labels associated with inputs (clicking label focuses input)
- [ ] Required fields indicated
- [ ] Error messages linked to fields (`aria-describedby`)
- [ ] Form submission via Enter key works

### Step 10: Image Alt Text
Check images throughout the app:

**Verification:**
- [ ] All images have alt text
- [ ] Decorative images have `alt=""`
- [ ] Icons have accessible names
- [ ] Avatar images have descriptive alt

## Accessibility Audit Script
Run Lighthouse accessibility audit:
```bash
# CLI
npx lighthouse http://localhost:3000 --only-categories=accessibility --view

# Or in Chrome DevTools > Lighthouse > Accessibility
```

## WCAG Checklist Summary

| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 2.4.1 | Skip links | ⬜ |
| 2.4.3 | Focus order | ⬜ |
| 2.4.7 | Focus visible | ⬜ |
| 2.1.1 | Keyboard accessible | ⬜ |
| 2.1.2 | No keyboard trap | ⬜ |
| 4.1.3 | Status messages | ⬜ |
| 2.3.3 | Animation from interactions | ⬜ |
| 1.4.3 | Color contrast (AA) | ⬜ |
| 1.3.1 | Info and relationships | ⬜ |
| 3.3.2 | Labels or instructions | ⬜ |

## Verification Checklist
- [ ] Skip links work
- [ ] Focus visible on all elements
- [ ] Keyboard navigation complete
- [ ] Modal focus trapping works
- [ ] Screen reader announces correctly
- [ ] Live regions work
- [ ] Reduced motion respected
- [ ] Color contrast passes
- [ ] Forms are accessible
- [ ] Images have alt text
- [ ] Lighthouse accessibility score > 90

## Devices/Tools Tested
| Tool | Version | Result |
|------|---------|--------|
| VoiceOver (macOS) | - | ⬜ Pass / ⬜ Fail |
| NVDA (Windows) | - | ⬜ Pass / ⬜ Fail |
| ChromeVox | - | ⬜ Pass / ⬜ Fail |
| Lighthouse | - | ⬜ Pass / ⬜ Fail |
| axe DevTools | - | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - Lighthouse > 90, all checks pass
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any accessibility issues -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**