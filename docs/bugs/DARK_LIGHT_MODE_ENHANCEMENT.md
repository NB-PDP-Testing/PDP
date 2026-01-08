# Dark/Light Mode Enhancement Report

**Date:** 2026-01-08
**Priority:** Medium
**Type:** Bug Fix + Feature Enhancement
**Affects:** All authenticated users, Org Admins

---

## Executive Summary

The current dark/light mode implementation uses `next-themes` with a two-layer approach: system dark/light mode + organization brand colors. While functional, several UX issues and gaps need addressing to align with industry best practices and the new UX feature flag system.

---

## Industry Best Practices Research

### Key Statistics & Trends (2025-2026)

- **75% of users** prefer apps that adapt to their device settings ([UX Trends 2025](https://altersquare.medium.com/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025-5cbdaf4e5366))
- **Color contrast is the #1 accessibility violation** on the web - affecting 83.6% of websites ([WebAIM 2024](https://webaim.org/articles/contrast/))
- **4,605 ADA lawsuits** filed in 2024; European Accessibility Act in force since June 2025 ([AllAccessible](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025))
- Dark mode is now a **UX standard**, not just a feature ([AlterSquare](https://www.altersquare.io/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025/))

### Google Material Design Guidelines

| Guideline | Specification |
|-----------|---------------|
| Surface color | `#121212` dark gray (not pure black) |
| Text contrast | Minimum 15.8:1 against background |
| Elevation | Lighter surfaces = higher elevation |
| Saturated colors | Avoid on dark backgrounds (causes "vibration") |
| "On" colors | Default white `#FFFFFF` or black `#000000` for text |

> "Dark gray surfaces can express a wider range of color, elevation, and depth because it's easier to see shadows on gray instead of true black." — [Material Design](https://design.google/library/material-design-dark-theme)

### Apple Human Interface Guidelines

| Guideline | Specification |
|-----------|---------------|
| Base color | Pure black `#000000` (differs from Google) |
| Adaptive colors | Respond to light/dark environments |
| System integration | Honor `prefers-color-scheme` |
| User control | Allow explicit override of system setting |

> "Dark Mode is a systemwide appearance setting that uses a dark color palette to provide a comfortable viewing experience tailored for low-light environments." — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/dark-mode)

### WCAG 2.2 Contrast Requirements

| Level | Normal Text | Large Text | UI Components |
|-------|-------------|------------|---------------|
| **AA (minimum)** | 4.5:1 | 3:1 | 3:1 |
| **AAA (enhanced)** | 7:1 | 4.5:1 | — |

> "Offering a dark mode doesn't satisfy WCAG Color Contrast Requirements. The default design must meet WCAG standards." — [BOIA](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements)

### How Industry Leaders Implement Dark Mode

#### Slack's Approach
- Complete rewrite with CSS custom properties via LESS plugin
- Single `localStorage` key across all workspaces
- Built Storybook + Figma plugins for dark mode testing
- "Audited every square inch of the app" for QA

> "The overarching question: how can we build sustainable and maintainable support for themes?" — [Slack Engineering](https://slack.engineering/building-dark-mode-on-desktop/)

#### Figma's Approach
- CSS custom variables injected into web app
- Differentiated between surfaces that shift vs. always-dark surfaces
- Dedicated Slack channel for testing
- Fixed ~100 polish tasks with company-wide help

> "The biggest challenge was creating a set of variables to re-theme the app in dark mode." — [Figma Blog](https://www.figma.com/blog/illuminating-dark-mode/)

#### Google Products
- **Calendar**: New expressive color system for dark mode
- **Android Auto**: Prioritizes glanceability
- **Photos**: Low-contrast approach with dark gray (not black) to let photos shine

### Accessible Toggle Button Best Practices

Per [React accessibility guidelines](https://dev.to/abbeyperini/an-accessible-dark-mode-toggle-in-react-aop) and [WAI-ARIA patterns](https://medium.com/@natalia.sokolova.ca/a-practical-guide-to-developing-an-accessible-toggle-button-component-in-react-3d3638c2f135):

```tsx
// Recommended pattern
<button
  aria-pressed={isDarkMode}
  aria-label={`Dark mode is ${isDarkMode ? 'on' : 'off'}. Click to toggle.`}
  onClick={toggleTheme}
>
  <span aria-hidden="true">{isDarkMode ? '🌙' : '☀️'}</span>
</button>
```

| Requirement | Implementation |
|-------------|----------------|
| Use semantic `<button>` | Not `<div>` with click handler |
| `aria-pressed` attribute | Communicates toggle state |
| Descriptive `aria-label` | Announces current state + action |
| `aria-hidden` on icons | Prevents screen readers announcing decorative elements |
| Keyboard support | Enter and Space activation |
| Visual feedback | Clear indication of current state |

---

## Current Implementation Analysis

### Architecture
```
Layer 1: System Theme (next-themes)
├── Light mode (:root CSS variables)
├── Dark mode (.dark CSS variables)
└── System mode (prefers-color-scheme)

Layer 2: Organization Colors (useOrgTheme hook)
├── --org-primary, --org-secondary, --org-tertiary
└── Applied via document.documentElement.style
```

### Key Files
| File | Purpose |
|------|---------|
| `components/mode-toggle.tsx` | Theme toggle dropdown (Sun/Moon icons) |
| `components/theme-provider.tsx` | next-themes wrapper |
| `hooks/use-org-theme.ts` | Org color CSS variable management |
| `index.css` | CSS variables for light/dark modes |
| `providers.tsx` | ThemeProvider configuration |

### Current Configuration
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  disableTransitionOnChange  // ⚠️ Jarring transitions
  enableSystem
>
```

---

## Issues Identified

### 0. CRITICAL: Theme Toggle Missing on Coach/Admin Pages

**Bug: ModeToggle Not Present in Coach/Admin Layouts**

The Coach and Admin dashboards have their **own custom headers** that do NOT include the ModeToggle component.

**Evidence from screenshots:**
- Desktop (Coach page): Header shows "Coach Dashboard" + "Back to App" button - NO theme toggle
- Mobile (Coach page): Same issue - NO theme toggle visible

**Root Cause:**
- Main `Header` component includes `<ModeToggle />` at line 215
- But `coach/layout.tsx` has its own header (lines 52-89) without ModeToggle
- Same issue in `admin/layout.tsx`

**Impact:**
- Users on Coach/Admin dashboards cannot change theme
- Inconsistent UX across the application
- Users must navigate away from dashboard to change theme

**Fix Required:**
```tsx
// coach/layout.tsx - add ModeToggle to header
import { ModeToggle } from "@/components/mode-toggle";

<div className="flex items-center gap-2">
  <Link href={`/orgs/${orgId}` as Route}>
    <Button size="sm" variant="outline">
      Back to App
    </Button>
  </Link>
  <ModeToggle />  {/* ADD THIS */}
</div>
```

---

### 1. Mode Toggle UX Problems

**Bug: No Visual Indicator of Current Theme**
- The dropdown shows "Light", "Dark", "System" options
- **No checkmark or highlight** indicates which is currently active
- Users must guess their current setting

**Bug: Ambiguous Icon State**
- Sun/Moon icon animation doesn't clearly indicate "System" mode
- When in system mode matching light theme, icon shows Sun but user doesn't know if it's explicit "Light" or "System"

**Violation of Best Practice:**
- Apple, Google, GitHub, Slack all show checkmark/radio on current selection
- Should show resolved theme + explicit preference (e.g., "System (Dark)")

### 2. Organization Colors + Dark Mode Conflict

**Bug: Org Colors Ignore Dark Mode Context**

In `use-org-theme.ts:148-151`:
```tsx
return {
  backgroundColor: `var(${varName})`,
  color: "white",  // ⚠️ Always white, ignores dark/light mode
};
```

**Problems:**
- If org picks a light color (e.g., yellow `#fef08a`), white text is unreadable
- Violates WCAG 4.5:1 contrast requirement
- No automatic contrast calculation like Material Design's "on" colors

**Bug: No Dark Mode Preview for Org Admins**
- Settings page shows color picker but no dark mode preview
- Admin picks colors in their current theme, unaware how it looks in the other
- Figma and Slack both provide dark/light previews before saving

### 3. Technical Issues

**Bug: Jarring Theme Transitions**
- `disableTransitionOnChange` causes instant, jarring color switches
- Material Design recommends smooth transitions
- Industry standard is 150-200ms ease transition

**Bug: Not Using Semantic Color Tokens**
- Material Design and IBM Carbon use semantic tokens (e.g., `color-primary`, `color-on-primary`)
- Current implementation uses raw color values
- Harder to maintain accessibility across themes

**Bug: Pure Black in Dark Mode**
- Current dark background: `oklch(0.145 0 0)` (very dark gray) ✓
- This aligns with Material Design (avoid pure black)
- But org colors may conflict with this approach

### 4. Accessibility Issues

**Bug: Missing ARIA Attributes**

Current toggle (`mode-toggle.tsx:18-24`):
```tsx
<Button size="icon" variant="outline">
  <Sun className="..." />
  <Moon className="..." />
  <span className="sr-only">Toggle theme</span>  // Generic label
</Button>
```

**Violations:**
- Screen reader just says "Toggle theme" - doesn't announce current state
- Missing `aria-pressed` for toggle state
- Icons should have `aria-hidden="true"`
- Should announce: "Theme: Light. Click to change to Dark."

**Bug: No Theme Change Announcements**
- When theme changes, screen readers aren't notified
- Should use live region announcements (`aria-live="polite"`)

**Bug: Color Contrast Not Validated**
- Org admins can pick any color combination
- No WCAG contrast ratio checking (4.5:1 minimum)
- Could create legally non-compliant interfaces

### 5. Gap Analysis vs Industry Standards

| Feature | Current | Material Design | Apple HIG | Slack/Figma |
|---------|---------|-----------------|-----------|-------------|
| Current selection indicator | ❌ None | ✅ Checkmark | ✅ Checkmark | ✅ Checkmark |
| Theme transition | ❌ Instant | ✅ Smooth | ✅ Smooth | ✅ Smooth |
| Semantic color tokens | ❌ Raw values | ✅ Tokens | ✅ Adaptive | ✅ Variables |
| Auto contrast text | ❌ Always white | ✅ On colors | ✅ Adaptive | ✅ Calculated |
| WCAG validation | ❌ None | ✅ Built-in | ✅ Guidelines | ✅ QA'd |
| Both-theme preview | ❌ None | ✅ Recommended | ✅ Recommended | ✅ Implemented |
| Cross-tab sync | ❌ None | — | — | ✅ localStorage |
| Reduced motion | ⚠️ Partial | ✅ Full | ✅ Full | ✅ Full |
| `aria-pressed` toggle | ❌ Missing | ✅ Required | ✅ Required | ✅ Implemented |

---

## Recommended Improvements

### Phase 1: Quick Fixes (Low Effort, High Impact)

#### 1.1 Add Current Theme Indicator (Per Industry Standard)
```tsx
// mode-toggle.tsx enhancement
import { Check } from "lucide-react";

const { theme, setTheme, resolvedTheme } = useTheme();

<DropdownMenuItem onClick={() => setTheme("light")}>
  <Check className={cn("mr-2 h-4 w-4", theme !== "light" && "invisible")} />
  Light
</DropdownMenuItem>
<DropdownMenuItem onClick={() => setTheme("dark")}>
  <Check className={cn("mr-2 h-4 w-4", theme !== "dark" && "invisible")} />
  Dark
</DropdownMenuItem>
<DropdownMenuItem onClick={() => setTheme("system")}>
  <Check className={cn("mr-2 h-4 w-4", theme !== "system" && "invisible")} />
  System {theme === "system" && `(${resolvedTheme})`}
</DropdownMenuItem>
```

#### 1.2 Enable Smooth Transitions (Material Design Standard)
```tsx
// providers.tsx - remove disableTransitionOnChange
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  // Removed: disableTransitionOnChange
>
```

```css
/* index.css - add transition for theme changes */
:root {
  transition: background-color 200ms ease, color 200ms ease;
}

.dark {
  transition: background-color 200ms ease, color 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  :root, .dark {
    transition: none;
  }
}
```

#### 1.3 Fix Accessibility (ARIA Best Practices)
```tsx
// mode-toggle.tsx - proper ARIA implementation
const { theme, resolvedTheme } = useTheme();

<DropdownMenuTrigger asChild>
  <Button
    size="icon"
    variant="outline"
    aria-label={`Theme: ${resolvedTheme}. Click to change.`}
    aria-haspopup="menu"
  >
    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
  </Button>
</DropdownMenuTrigger>
```

### Phase 2: Org Color Enhancements (Medium Effort)

#### 2.1 Add Contrast-Aware Text Color (Material Design "On" Colors)
```tsx
// use-org-theme.ts - calculate appropriate text color per WCAG
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex).split(', ').map(Number);
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastColor(hexColor: string): string {
  const luminance = getLuminance(hexColor);
  // WCAG recommends 4.5:1 minimum contrast
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

// Apply in useEffect
document.documentElement.style.setProperty(
  "--org-primary-contrast",
  getContrastColor(theme.primary)
);
```

#### 2.2 Generate Dark Mode Variants (Per Google Photos Approach)
```tsx
// Lighten colors for dark mode, darken for light mode hover states
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Set variants
document.documentElement.style.setProperty("--org-primary-light", adjustColor(theme.primary, 20));
document.documentElement.style.setProperty("--org-primary-dark", adjustColor(theme.primary, -20));
```

#### 2.3 Add Dark Mode Preview in Settings (Per Figma/Slack)
```tsx
// Admin settings - show side-by-side preview like Figma does
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card className="bg-white border">
    <CardHeader>
      <CardTitle className="text-sm text-gray-900">Light Mode Preview</CardTitle>
    </CardHeader>
    <CardContent>
      <ColorPreview colors={previewColors} mode="light" />
    </CardContent>
  </Card>
  <Card className="bg-gray-900 border-gray-700">
    <CardHeader>
      <CardTitle className="text-sm text-white">Dark Mode Preview</CardTitle>
    </CardHeader>
    <CardContent>
      <ColorPreview colors={previewColors} mode="dark" />
    </CardContent>
  </Card>
</div>
```

### Phase 3: Advanced Features (Higher Effort)

#### 3.1 WCAG Contrast Validation (Legal Compliance)
```tsx
// Calculate contrast ratio per WCAG 2.2
function getContrastRatio(fg: string, bg: string): number {
  const fgLum = getLuminance(fg);
  const bgLum = getLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkWCAG(foreground: string, background: string) {
  const ratio = getContrastRatio(foreground, background);
  return {
    ratio: ratio.toFixed(2),
    passesAA: ratio >= 4.5,      // Normal text
    passesAALarge: ratio >= 3,   // Large text (18px+)
    passesAAA: ratio >= 7,       // Enhanced
  };
}

// Show warning in settings (per BOIA recommendation)
{!contrastCheck.passesAA && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Contrast ratio {contrastCheck.ratio}:1 may not meet WCAG AA requirements (4.5:1 minimum).
      This could affect accessibility compliance.
    </AlertDescription>
  </Alert>
)}
```

#### 3.2 Cross-Tab Theme Sync (Per Slack Pattern)
```tsx
// theme-provider.tsx - sync across all tabs like Slack does
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'theme' && e.newValue) {
      // Theme changed in another tab
      setTheme(e.newValue);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [setTheme]);
```

#### 3.3 Create Feature Flags (Align with UX System)
```json
// Add to ux-feature-flags.json
{
  "key": "ux_enhanced_theme_toggle",
  "name": "Enhanced theme toggle",
  "phase": 5,
  "description": "New theme toggle with current state indicator and accessibility improvements"
},
{
  "key": "ux_org_color_variants",
  "name": "Org color dark variants",
  "phase": 5,
  "description": "Auto-generate light/dark variants of org colors"
},
{
  "key": "ux_contrast_validation",
  "name": "WCAG contrast validation",
  "phase": 12,
  "description": "Warn admins when org colors don't meet WCAG AA contrast requirements"
}
```

---

## Implementation Priority

| Item | Priority | Effort | Impact | Industry Reference |
|------|----------|--------|--------|-------------------|
| **0. Add ModeToggle to Coach/Admin** | **CRITICAL** | Low | **Critical** | Basic functionality |
| 1.1 Current theme indicator | **High** | Low | High | All major apps |
| 1.2 Smooth transitions | **High** | Low | Medium | Material Design |
| 1.3 ARIA accessibility | **High** | Low | Medium | WCAG 2.2 |
| 2.1 Contrast-aware text | **High** | Medium | High | Material "On" colors |
| 2.2 Dark mode variants | Medium | Medium | Medium | Google Photos |
| 2.3 Settings preview | Medium | Medium | High | Figma, Slack |
| 3.1 WCAG validation | Medium | High | High | Legal compliance |
| 3.2 Cross-tab sync | Low | Low | Low | Slack |
| 3.3 Feature flags | Low | Low | Medium | Internal alignment |

---

## Success Criteria

1. **Usability:** Users can clearly see their current theme selection (checkmark indicator)
2. **Accessibility:** WCAG 2.2 AA compliance for theme toggle and org colors
3. **Consistency:** Org colors have appropriate contrast in both light and dark modes
4. **Performance:** Theme transitions are smooth (200ms) without layout shift
5. **Legal:** Default color combinations meet WCAG 4.5:1 contrast requirement
6. **Compatibility:** Works with existing UX feature flag system

---

## Testing Requirements

- [ ] Manual: Verify theme indicator shows correct selection
- [ ] Manual: Test org colors with various dark/light color combinations
- [ ] Manual: Verify transitions respect `prefers-reduced-motion`
- [ ] Automated: Contrast ratio tests for default color combinations
- [ ] Accessibility: Screen reader testing (VoiceOver, NVDA) for theme announcements
- [ ] Accessibility: Keyboard-only navigation of theme toggle
- [ ] Cross-browser: Safari, Chrome, Firefox theme persistence
- [ ] Mobile: iOS/Android system theme detection
- [ ] Legal: Audit against WCAG 2.2 AA requirements

---

## References

### Official Guidelines
- [Apple HIG - Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Material Design - Dark Theme](https://design.google/library/material-design-dark-theme)
- [WCAG 2.2 Contrast Requirements](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WebAIM Contrast Guide](https://webaim.org/articles/contrast/)

### Industry Implementation Case Studies
- [Figma - Illuminating Dark Mode](https://www.figma.com/blog/illuminating-dark-mode/)
- [Slack Engineering - Building Dark Mode](https://slack.engineering/building-dark-mode-on-desktop/)
- [UX Design Institute - Dark Mode Practical Guide](https://www.uxdesigninstitute.com/blog/dark-mode-design-practical-guide/)

### 2025-2026 Best Practices
- [AlterSquare - Complete UX Guide 2025](https://www.altersquare.io/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025/)
- [Dark Mode Best Practices 2026](https://medium.com/@social_7132/dark-mode-done-right-best-practices-for-2026-c223a4b92417)
- [10 Dark Mode UI Best Practices 2025](https://www.designstudiouiux.com/blog/dark-mode-ui-design-best-practices/)

### Accessibility Resources
- [Accessible Toggle Buttons in React](https://dev.to/abbeyperini/an-accessible-dark-mode-toggle-in-react-aop)
- [BOIA - Dark Mode and WCAG](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements)
- [AllAccessible - Color Contrast Guide 2025](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025)

### Technical Documentation
- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [React Aria Accessibility](https://react-spectrum.adobe.com/react-aria/accessibility.html)

---

## Appendix: Current Theme Toggle Location

The mode toggle appears in the header navigation. To locate it:
- Desktop: Top-right corner, next to user avatar
- Mobile: In the mobile menu drawer

Command palette (Cmd+K) also includes theme toggle option.
