# TEST-UXTESTING-003: Phase 3 - Forms & Inputs

## Test Objective
Verify responsive forms work correctly on mobile and desktop with proper sizing and keyboard shortcuts.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_responsive_forms` = true
- [ ] Test user account with permission to create/edit players

## Test Steps

### Step 1: Responsive Form Sizing (Mobile)
1. Navigate to create player form on mobile (< 768px)
2. Measure input heights

**Verification:**
- [ ] Input heights are 48px (comfortable touch)
- [ ] Labels are large enough to read (16px+)
- [ ] Adequate spacing between fields (24px+)
- [ ] Submit button is sticky at bottom
- [ ] Numeric inputs show number keyboard

### Step 2: Responsive Form Sizing (Desktop)
1. Navigate to create player form on desktop (> 1024px)
2. Measure input heights

**Verification:**
- [ ] Input heights are 40px (comfortable click)
- [ ] Side-by-side fields on wide screens
- [ ] Inline validation shows as you type
- [ ] Form has logical tab order

### Step 3: Keyboard Shortcuts (Desktop)
1. Fill out a form on desktop
2. Test keyboard shortcuts

**Verification:**
- [ ] `⌘S` (Mac) / `Ctrl+S` (Win) saves the form
- [ ] `Escape` cancels/closes the form
- [ ] Tab navigates between fields correctly
- [ ] Enter in single-line input doesn't submit prematurely

### Step 4: Mobile Sticky Submit
1. Open a long form on mobile
2. Scroll through the form

**Verification:**
- [ ] Submit button stays visible at bottom
- [ ] Button is always accessible
- [ ] No overlap with content

### Step 5: Form Validation
1. Submit form with invalid data
2. Check validation messages

**Mobile Verification:**
- [ ] Validation messages visible
- [ ] Invalid fields highlighted
- [ ] Easy to scroll to errors

**Desktop Verification:**
- [ ] Inline validation appears while typing
- [ ] Clear error messages
- [ ] Focus moves to first error

## Verification Checklist
- [ ] Mobile inputs are 48px height
- [ ] Desktop inputs are 40px height
- [ ] Sticky submit works on mobile
- [ ] Keyboard shortcuts work on desktop
- [ ] Form validation works correctly
- [ ] No console errors

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| iPhone SE (375px) | Safari | ⬜ Pass / ⬜ Fail |
| iPad (768px) | Safari | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Chrome | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All verification items checked
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any issues found during testing -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**