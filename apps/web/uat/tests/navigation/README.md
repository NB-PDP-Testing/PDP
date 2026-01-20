# Navigation Bar Tests

Comprehensive tests for all navigation links across different user roles and navbar modes.

## Overview

These tests verify that all navigation links work correctly for each user role (Owner, Admin, Coach, Parent) and handle both navbar display modes controlled by PostHog feature flags.

## Feature Flag Support

The tests automatically detect and handle two navbar modes:

### 1. **Sidebar Navigation** (Feature Flag: `ux_admin_nav_sidebar`)
- Collapsible groups
- Vertical sidebar layout
- Common in desktop views

### 2. **Horizontal Navigation** (Legacy/Default)
- Horizontal scrolling
- Flat link structure
- Traditional navbar layout

## Test Structure

```
navbar-comprehensive.spec.ts
├── Helper Functions
│   ├── detectNavMode()           # Detects active navbar mode
│   ├── getAllNavLinks()          # Extracts all nav links
│   ├── expandAllNavGroups()      # Expands collapsed groups
│   └── navigateAndVerify()       # Tests link + checks for errors
├── NAVBAR - Admin Navigation (14+ tests)
│   ├── NAVBAR-ADMIN-001: Mode detection
│   ├── NAVBAR-ADMIN-002: Overview link
│   ├── NAVBAR-ADMIN-003: Players link
│   ├── NAVBAR-ADMIN-004: Teams link
│   ├── NAVBAR-ADMIN-005: Coaches link
│   ├── NAVBAR-ADMIN-006: Guardians link
│   ├── NAVBAR-ADMIN-007: Users link
│   ├── NAVBAR-ADMIN-008: Approvals link
│   ├── NAVBAR-ADMIN-009: Settings link
│   ├── NAVBAR-ADMIN-010: Benchmarks link
│   ├── NAVBAR-ADMIN-011: Analytics link
│   ├── NAVBAR-ADMIN-012: Overrides link
│   ├── NAVBAR-ADMIN-013: Announcements link
│   ├── NAVBAR-ADMIN-014: Player Access link
│   └── NAVBAR-ADMIN-099: All links comprehensive test
├── NAVBAR - Coach Navigation (11+ tests)
│   ├── NAVBAR-COACH-001: Mode detection
│   ├── NAVBAR-COACH-002: Dashboard link
│   ├── NAVBAR-COACH-003: Assess link
│   ├── NAVBAR-COACH-004: Players link
│   ├── NAVBAR-COACH-005: Goals link
│   ├── NAVBAR-COACH-006: Voice Notes link
│   ├── NAVBAR-COACH-007: Session Plans link
│   ├── NAVBAR-COACH-008: Injuries link
│   ├── NAVBAR-COACH-009: Medical link
│   ├── NAVBAR-COACH-010: Match Day link
│   └── NAVBAR-COACH-099: All links comprehensive test
├── NAVBAR - Parent Navigation (2+ tests)
│   ├── NAVBAR-PARENT-001: Mode detection
│   └── NAVBAR-PARENT-099: All links comprehensive test
└── NAVBAR - Owner/Platform Navigation (3+ tests)
    ├── NAVBAR-OWNER-001: Admin navigation for owner
    ├── NAVBAR-OWNER-002: Coach navigation for owner
    └── NAVBAR-OWNER-003: Platform access
```

## What Each Test Does

### Individual Link Tests (NAVBAR-XXX-002 through NAVBAR-XXX-098)
Each test:
1. Navigates to the role's dashboard
2. Expands all navigation groups (if sidebar mode)
3. Clicks the specific navigation link
4. Verifies the page loads successfully
5. Checks for console errors
6. Checks for error messages on the page

### Comprehensive Tests (NAVBAR-XXX-099)
Each comprehensive test:
1. Navigates to the role's dashboard
2. Expands all navigation groups
3. Extracts ALL navigation links
4. Tests each link individually:
   - Navigates to the link
   - Verifies no errors
   - Returns to dashboard
5. Reports summary (pass/fail rate)
6. Requires 80%+ pass rate

## Running Tests

### Run all navigation tests
```bash
# From project root
npm run test:navbar -w web

# From apps/web
npm run test:navbar
```

### Run specific role tests
```bash
# Admin navigation only
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR - Admin"

# Coach navigation only
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR - Coach"

# Parent navigation only
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR - Parent"

# Owner/Platform navigation only
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR - Owner"
```

### Run individual tests
```bash
# Test specific link
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR-ADMIN-003"

# Test comprehensive suite
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR-ADMIN-099"
```

### Debug mode
```bash
# Run with visible browser
npx playwright test navbar-comprehensive.spec.ts --headed

# Debug specific test
npx playwright test navbar-comprehensive.spec.ts --grep "NAVBAR-ADMIN-003" --debug
```

## Error Detection

The tests automatically detect and report:

### ✅ **What's Checked**
- **Navigation success**: URL changes correctly
- **Page load**: Content loads without timeout
- **Console errors**: JavaScript errors in console
- **Page errors**: Uncaught exceptions
- **Error messages**: "Error", "Not Found", "Something went wrong" on page

### ⚠️ **What's Filtered Out**
- WebSocket HMR errors (development only)
- `ERR_CONNECTION_REFUSED` for webpack-hmr
- Other development-specific warnings

## Test Output

Each test provides detailed console output:

```
[NAVBAR-ADMIN-001] Navigation mode detected: sidebar
[NAVBAR-ADMIN-001] Found 14 navigation links

[NAVBAR-ADMIN-099] Testing 14 navigation links
  ✓ Overview: /orgs/jkc123abc/admin
  ✓ Players: /orgs/jkc123abc/admin/players
  ✓ Teams: /orgs/jkc123abc/admin/teams
  ✓ Coaches: /orgs/jkc123abc/admin/coaches
  ✗ Analytics: /orgs/jkc123abc/admin/analytics
    Error: Page displays error message

[NAVBAR-ADMIN-099] Summary: 13/14 links passed
[NAVBAR-ADMIN-099] Failed links:
  - Analytics: Page displays error message
```

## Expected Pages by Role

### Admin Navigation
- Overview (Dashboard)
- Players
- Teams
- Coaches
- Guardians
- Users
- Approvals (sub-page of Users)
- Settings
- Benchmarks
- Analytics
- Overrides
- Announcements
- Player Access

### Coach Navigation
- Dashboard
- Assess (Player assessment)
- Players
- Goals (Development goals)
- Voice Notes
- Session Plans
- Injuries
- Medical
- Match Day
- Todos (optional)

### Parent Navigation
- Dashboard/Overview
- Children
- Progress
- Messages
- Settings
- Profile
- Announcements
- Sharing
- Achievements (optional)

### Owner/Platform Navigation
- All Admin pages
- All Coach pages
- Platform management pages
- Organization switcher

## Handling Navbar Modes

### Sidebar Mode Detection
```typescript
const hasSidebar = await page.locator('[data-testid="admin-sidebar"]')
  .or(page.locator('aside nav'))
  .or(page.locator('[class*="sidebar"]'))
  .isVisible({ timeout: 3000 })
```

### Expanding Collapsed Groups
```typescript
// Finds all collapsed groups
const groupButtons = await page.locator('button[aria-expanded="false"]').all();

// Expands each one
for (const button of groupButtons) {
  await button.click();
  await page.waitForTimeout(300);
}
```

## Known Limitations

1. **Dynamic Navigation**: Some links may appear/disappear based on:
   - Feature flags
   - User permissions
   - Organization configuration

2. **Beta Features**: Pages marked as beta may have different layouts

3. **Mobile Navigation**: These tests focus on desktop navigation
   - For mobile tests, see `../mobile/mobile-viewport.spec.ts`

## Maintenance

### Adding New Links
When new navigation links are added to the app:

1. Add a specific test (e.g., `NAVBAR-ADMIN-015`)
2. Update the comprehensive test will automatically pick it up
3. Update the "Expected Pages by Role" section in this README

### Updating for New Navbar Modes
If new navbar modes are added:

1. Update `detectNavMode()` to recognize the new mode
2. Update `getAllNavLinks()` to extract links from new structure
3. Add mode-specific handling if needed

## Troubleshooting

### "Navigation mode detected: horizontal" when sidebar expected
- Check PostHog feature flag is enabled
- Verify user has correct permissions
- Check browser/cache issues

### "Found 0 navigation links"
- Verify user is logged in correctly
- Check navigation container selectors
- Ensure page loaded completely

### "Page displays error message"
- Check if page requires data (teams, players, etc.)
- Verify backend is running
- Check console for actual error

### Tests timing out
- Increase timeout in playwright.config.ts
- Check for slow network/database queries
- Verify app is in good state

## Related Tests

- **Admin Navigation**: `../admin/navigation.spec.ts` (older tests)
- **Mobile Navigation**: `../mobile/mobile-viewport.spec.ts`
- **Cross-Role**: `../cross-role/cross-role.spec.ts`

## Test Data

Uses standard UAT test users from `../../test-data.json`:
- **Owner**: owner_pdp@outlook.com
- **Admin**: adm1n_pdp@outlook.com
- **Coach**: coach_pdp@outlook.com
- **Parent**: parent_pdp@outlook.com
