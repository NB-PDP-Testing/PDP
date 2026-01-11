# TEST-UXTESTING-008: Phase 8 - Touch Targets

## Test Objective
Verify all interactive elements meet minimum touch target sizes (44px mobile, 36px desktop).

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flag enabled: `ux_touch_targets_44px` = true
- [ ] Chrome DevTools for element inspection

## Test Steps

### Step 1: Button Sizes
Navigate to any page with buttons and measure heights:

**Mobile (< 768px):**
```javascript
// Run in console to check all buttons
document.querySelectorAll('button').forEach(btn => {
  const rect = btn.getBoundingClientRect();
  console.log(`Button "${btn.textContent?.slice(0,20)}": ${rect.height}px`);
  if (rect.height < 44) console.warn('⚠️ Too small for mobile!');
});
```

**Verification:**
- [ ] Default buttons are 44px height on mobile
- [ ] Small buttons are 40px height on mobile
- [ ] Large buttons are 48px height on mobile
- [ ] Icon buttons are 44px × 44px on mobile
- [ ] All buttons meet 44px minimum

**Desktop (> 1024px):**
- [ ] Default buttons are 36px height
- [ ] Small buttons are 32px height
- [ ] Large buttons are 40px height
- [ ] Icon buttons are 36px × 36px

### Step 2: Input Sizes
Navigate to any form page:

**Mobile (< 768px):**
- [ ] Text inputs are 48px height
- [ ] Select triggers are 48px height
- [ ] Textarea minimum height is 96px
- [ ] Easy to tap without precision

**Tablet (768-1024px):**
- [ ] Text inputs are 44px height
- [ ] Select triggers are 44px height

**Desktop (> 1024px):**
- [ ] Text inputs are 40px height
- [ ] Select triggers are 40px height

### Step 3: Checkbox & Radio Sizes
Navigate to a form with checkboxes/radios:

**Mobile:**
- [ ] Checkboxes are 20px × 20px (clickable area 44px)
- [ ] Radio buttons are 20px × 20px (clickable area 44px)
- [ ] Easy to tap accurately

**Desktop:**
- [ ] Checkboxes are 16px × 16px
- [ ] Radio buttons are 16px × 16px

### Step 4: Switch Sizes
Find a toggle switch in the app:

**Mobile:**
- [ ] Switch is 24px height, 44px width
- [ ] Easy to toggle with thumb

**Desktop:**
- [ ] Switch is 18px height, 32px width

### Step 5: Navigation Items
Check bottom nav and sidebar:

**Bottom Nav (Mobile):**
- [ ] Each nav item is at least 44px × 44px
- [ ] Easy to tap with thumb
- [ ] No accidental adjacent taps

**Sidebar Items (Desktop):**
- [ ] Each item is at least 36px height
- [ ] Easy to click with mouse

### Step 6: Table Row Actions
Navigate to admin players table:

**Mobile Cards:**
- [ ] Action buttons are 44px minimum
- [ ] Swipe actions are easy to trigger

**Desktop Table:**
- [ ] Row action buttons are 36px minimum
- [ ] Hover actions are 36px minimum

## Measurement Script
```javascript
// Comprehensive touch target audit
function auditTouchTargets(minSize = 44) {
  const interactive = document.querySelectorAll(
    'button, a, input, select, [role="button"], [tabindex]'
  );
  const issues = [];
  
  interactive.forEach(el => {
    const rect = el.getBoundingClientRect();
    const min = Math.min(rect.width, rect.height);
    if (min < minSize && min > 0) {
      issues.push({
        element: el.tagName,
        text: el.textContent?.slice(0, 30),
        width: rect.width,
        height: rect.height,
        minRequired: minSize
      });
    }
  });
  
  console.table(issues);
  return issues.length === 0;
}

// Run on mobile view
auditTouchTargets(44);

// Run on desktop view
auditTouchTargets(36);
```

## Verification Checklist
- [ ] Buttons meet size requirements
- [ ] Inputs meet size requirements
- [ ] Checkboxes/radios have adequate tap area
- [ ] Switches are appropriately sized
- [ ] Navigation items are tappable
- [ ] Table actions are accessible
- [ ] No console errors
- [ ] Audit script passes

## Devices Tested
| Device | Browser | Min Target | Result |
|--------|---------|------------|--------|
| iPhone SE (375px) | Safari | 44px | ⬜ Pass / ⬜ Fail |
| iPhone 14 (393px) | Safari | 44px | ⬜ Pass / ⬜ Fail |
| iPad (768px) | Safari | 40px | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Chrome | 36px | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All touch targets meet requirements
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- List elements that fail touch target requirements -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**