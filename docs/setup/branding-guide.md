# PlayerARC Brand Guidelines

> **Version:** 2.0
> **Last Updated:** February 2026
> **Status:** Active

This is the canonical brand guidelines document for PlayerARC. It covers the brand identity, colour palette, typography, logo usage, tone of voice, and application guidelines for all digital and print materials.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Mission & Taglines](#2-mission--taglines)
3. [Colour Palette](#3-colour-palette)
4. [Typography](#4-typography)
5. [Logo System](#5-logo-system)
6. [Imagery & Iconography](#6-imagery--iconography)
7. [Tone of Voice](#7-tone-of-voice)
8. [Application Guidelines](#8-application-guidelines)
9. [Accessibility Standards](#9-accessibility-standards)
10. [Organization Theming (Multi-Tenant)](#10-organization-theming-multi-tenant)
11. [Presentation & Slide Templates](#11-presentation--slide-templates)
12. [Rebrand Reference (PDP to PlayerARC)](#12-rebrand-reference-pdp-to-playerarc)

---

## 1. Brand Identity

### Brand Name
- **Full name:** PlayerARC
- **Capitalisation:** "Player" in sentence case, "ARC" in all caps
- **Never:** "Playerarc", "playerARC", "Player Arc", "PLAYERARC", "Player-Arc"
- **Formerly:** PDP (Player Development Passport) - do not use in new materials

### What is PlayerARC?
PlayerARC is a comprehensive, player-centred, multi-sport digital platform that supports youth sports development. It connects coaches, parents, and clubs to track player development, prevent burnout, and help young athletes stay motivated and in love with their sport(s).

### Brand Personality
| Trait | Description |
|-------|-------------|
| **Supportive** | We champion every young athlete's journey, not just the elite |
| **Trustworthy** | Parents and coaches rely on us with sensitive player data |
| **Modern** | Clean, intuitive technology that doesn't get in the way |
| **Inclusive** | Multi-sport, multi-team, accessible to all abilities |
| **Warm** | Human-first approach - technology serves people, not the reverse |

---

## 2. Mission & Taglines

### Mission Statement
> *"As Many as Possible, For as Long as Possible."*

Our mission is to keep kids engaged in sports throughout their youth, building lifelong habits of movement, teamwork, and resilience.

### Primary Tagline
> **"Keeping young athletes engaged, healthy, and in love with their sport."**

### Alternative Taglines (approved for use)
- "Transforming Youth Sports Development"
- "The Digital Passport for Youth Sports"
- "Track Every Step of Their Journey"
- "A development pathway built around them, not just their sport(s)"

### Product Description (Short)
> "A flexible, player-centred multi-sport platform that adapts to every player's journey."

### Product Description (Full)
> "PlayerARC is the digital passport that travels with players throughout their sporting journey, connecting coaches, parents, and clubs to support their development, prevent burnout, and help players stay motivated and in love with their sport(s)."

---

## 3. Colour Palette

### 3.1 Primary Brand Colours

These are the core PlayerARC brand colours used across all platform-level materials.

| Colour | Name | Hex | RGB | Usage |
|--------|------|-----|-----|-------|
| ![#1E3A5F](https://via.placeholder.com/20/1E3A5F/1E3A5F) | **PlayerARC Navy** | `#1E3A5F` | `30, 58, 95` | Primary brand colour. Headers, hero backgrounds, nav bars, headings |
| ![#27AE60](https://via.placeholder.com/20/27AE60/27AE60) | **PlayerARC Green** | `#27AE60` | `39, 174, 96` | Secondary brand colour. CTAs, links, accents, the "human" in the logo |
| ![#F39C12](https://via.placeholder.com/20/F39C12/F39C12) | **PlayerARC Gold** | `#F39C12` | `243, 156, 18` | Tertiary accent. Demo CTAs, highlights, warmth |

### 3.2 Extended Brand Colours

| Colour | Name | Hex | RGB | Usage |
|--------|------|-----|-----|-------|
| ![#22C55E](https://via.placeholder.com/20/22C55E/22C55E) | **App Green** | `#22C55E` | `34, 197, 94` | In-app accent (CSS `--pdp-green`) |
| ![#0F1F35](https://via.placeholder.com/20/0F1F35/0F1F35) | **Deep Navy** | `#0F1F35` | `15, 31, 53` | Hero gradient dark end |
| ![#E67E22](https://via.placeholder.com/20/E67E22/E67E22) | **Dark Gold** | `#E67E22` | `230, 126, 34` | Gold hover/active state |

### 3.3 CSS Design Tokens

These are the CSS custom properties used in the platform codebase:

```css
/* Platform brand colours */
--pdp-navy: #1E3A5F;
--pdp-navy-rgb: 30, 58, 95;
--pdp-green: #22C55E;
--pdp-green-rgb: 34, 197, 94;

/* Default organization fallback colours */
--org-primary: #16A34A;       /* rgb(22, 163, 74) */
--org-secondary: #0EA5E9;     /* rgb(14, 165, 233) */
--org-tertiary: #F59E0B;      /* rgb(245, 158, 11) */
```

### 3.4 Neutral Palette

| Colour | Name | Hex | Usage |
|--------|------|-----|-------|
| ![#FFFFFF](https://via.placeholder.com/20/FFFFFF/FFFFFF) | White | `#FFFFFF` | Backgrounds, text on dark |
| ![#F8FAFC](https://via.placeholder.com/20/F8FAFC/F8FAFC) | Slate 50 | `#F8FAFC` | Light page backgrounds |
| ![#F1F5F9](https://via.placeholder.com/20/F1F5F9/F1F5F9) | Slate 100 | `#F1F5F9` | Card backgrounds |
| ![#E2E8F0](https://via.placeholder.com/20/E2E8F0/E2E8F0) | Slate 200 | `#E2E8F0` | Borders, dividers |
| ![#62748E](https://via.placeholder.com/20/62748E/62748E) | Slate 500 | `#62748E` | Secondary text, captions |
| ![#314158](https://via.placeholder.com/20/314158/314158) | Slate 700 | `#314158` | Primary body text |
| ![#0F172B](https://via.placeholder.com/20/0F172B/0F172B) | Slate 900 | `#0F172B` | Headings, emphasis |
| ![#030712](https://via.placeholder.com/20/030712/030712) | Near Black | `#030712` | Dark mode backgrounds |

### 3.5 Semantic / Status Colours

| Colour | Name | Hex | Usage |
|--------|------|-----|-------|
| ![#22C55E](https://via.placeholder.com/20/22C55E/22C55E) | Success Green | `#22C55E` | Success states, eligible |
| ![#EF4444](https://via.placeholder.com/20/EF4444/EF4444) | Danger Red | `#EF4444` | Errors, destructive actions, ineligible |
| ![#F59E0B](https://via.placeholder.com/20/F59E0B/F59E0B) | Warning Amber | `#F59E0B` | Warnings, requires attention |
| ![#0EA5E9](https://via.placeholder.com/20/0EA5E9/0EA5E9) | Info Blue | `#0EA5E9` | Informational, overrides |

### 3.6 Colour Hierarchy

When applying brand colours, follow this hierarchy:

1. **Navy** (`#1E3A5F`) - Dominant colour. Use for backgrounds, headers, and primary UI surfaces.
2. **Green** (`#27AE60`) - Active colour. Use for interactive elements, links, success states, and accents.
3. **Gold** (`#F39C12`) - Highlight colour. Use sparingly for CTAs, badges, and warm highlights.
4. **Neutrals** - Supporting. Use for text, borders, and structural elements.

### 3.7 Colour Don'ts

- Do NOT use navy text on dark backgrounds
- Do NOT pair green and gold as equal-weight elements (one should dominate)
- Do NOT use red as a brand colour - it is reserved for errors/destructive actions only
- Do NOT use colours at less than WCAG AA contrast ratio (4.5:1 for normal text)

---

## 4. Typography

### 4.1 Primary Typeface: Geist Sans

**Geist** is the primary font family used across the platform and all digital materials.

| Weight | CSS Value | Usage |
|--------|-----------|-------|
| Regular (400) | `font-weight: 400` | Body text, descriptions, paragraphs |
| Medium (500) | `font-weight: 500` | Labels, secondary headings, nav items |
| Semibold (600) | `font-weight: 600` | Subheadings, card titles, emphasis |
| Bold (700) | `font-weight: 700` | Page headings, hero text, CTAs |

### 4.2 Monospace: Geist Mono

Used for code snippets, data values, and technical content.

### 4.3 Fallback Stack

```css
font-family: "Inter", "Geist", ui-sans-serif, system-ui, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

### 4.4 Google Slides / Print Substitution

When Geist is unavailable (Google Slides, Word, print):
- **Primary substitute:** Inter (available in Google Fonts)
- **Secondary substitute:** Open Sans or system sans-serif

### 4.5 Type Scale

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 48-60px (3-3.75rem) | Bold | Hero headings |
| H2 | 36-48px (2.25-3rem) | Bold | Section headings |
| H3 | 24-30px (1.5-1.875rem) | Semibold | Card/panel headings |
| H4 | 18-20px (1.125-1.25rem) | Semibold | Sub-section headings |
| Body Large | 18px (1.125rem) | Regular | Lead paragraphs |
| Body | 16px (1rem) | Regular | Default body text |
| Body Small | 14px (0.875rem) | Regular | Captions, helper text |
| Caption | 12px (0.75rem) | Regular | Labels, metadata |

---

## 5. Logo System

### 5.1 Logo Variants

PlayerARC has multiple logo variants for different contexts:

| Variant | Filename | Best Used On |
|---------|----------|-------------|
| **Primary (Light BG)** | `PDP-Logo-NavyOrbit_GreenHuman.png` | White/light backgrounds |
| **Primary (Dark BG)** | `PDP-Logo-OffWhiteOrbit_GreenHuman.png` | Navy/dark backgrounds |
| **Navy Full** | `PDP-Logo-Navy.png` | Light backgrounds (monochrome) |
| **Green Full** | `PDP-Logo-Green.png` | Dark backgrounds (monochrome) |
| **Off-White Full** | `PDP-Logo-OffWhite.png` | Dark/photo backgrounds |
| **App Icon** | `icon.png` | Favicon, app icons |
| **App Logo Light** | `logo-light.png` | Light theme in-app |
| **App Logo Dark** | `logo-dark.png` | Dark theme in-app |

### 5.2 Logo Anatomy

The PlayerARC logo consists of two elements:
- **Orbit** - The circular arc representing the player's journey/pathway
- **Human** - The figure inside the orbit representing the player

Colour combinations:
- Navy Orbit + Green Human (primary for light backgrounds)
- Off-White Orbit + Green Human (primary for dark backgrounds)
- Green Orbit + Navy Human (alternative)

### 5.3 Special Variants

| Variant | Filename | Usage |
|---------|----------|-------|
| **Passport Brown** | `PDP-Logo-PassportBrown.png` | Player Passport feature branding |
| **Passport Gold** | `PDP-Logo-PassportGold.png` | Player Passport feature branding |
| **Orange** | `PDP-Logo-Orange.png` | Sport-specific or warm contexts |
| **Red** | `PDP-Logo-Red.png` | Use sparingly - alerts or sport contexts |
| **Teal** | `PDP-Logo-Teal.png` | Alternative accent contexts |

### 5.4 PWA / App Icons

| File | Size | Usage |
|------|------|-------|
| `icon-192.png` | 192x192 | Android home screen |
| `icon-512.png` | 512x512 | Splash screen, store listing |
| `icon-maskable-192.png` | 192x192 | Adaptive icon (Android) |
| `icon-maskable-512.png` | 512x512 | Adaptive icon (Android) |

### 5.5 Logo Clear Space

Maintain a minimum clear space equal to the height of the "human" figure on all sides of the logo. No other text, graphics, or visual elements should encroach on this space.

### 5.6 Logo Don'ts

- Do NOT rotate, skew, or distort the logo
- Do NOT change the colours of the orbit and human independently (use approved variants)
- Do NOT place the logo on busy or low-contrast backgrounds without a container
- Do NOT recreate the logo in a different typeface
- Do NOT add drop shadows, outlines, or effects to the logo
- Do NOT scale the logo below 32px height for digital use

### 5.7 Asset Locations

```
apps/web/public/
  logos/                    # App logos and icons
    logo-light.png
    logo-dark.png
    icon.png
    icon-192.png
    icon-512.png
    icon-maskable-192.png
    icon-maskable-512.png
  logos-landing/            # Marketing site colour variants
    PDP-Logo-Green.png
    PDP-Logo-GreenOrbit_NavyHuman.png
    PDP-Logo-GreenOrbit_NavyHumanDots.png
    PDP-Logo-Navy.png
    PDP-Logo-NavyOrbit_GreenHuman.png
    PDP-Logo-NavyOrbit_GreenHumanDots.png
    PDP-Logo-OffWhite.png
    PDP-Logo-OffWhiteOrbit_GreenHuman.png
    PDP-Logo-Orange.png
    PDP-Logo-PassportBrown.png
    PDP-Logo-PassportGold.png
    PDP-Logo-Red.png
    PDP-Logo-Teal.png
```

---

## 6. Imagery & Iconography

### 6.1 Icon Library

PlayerARC uses **Lucide Icons** throughout the application. These are consistent, clean, open-source SVG icons.

- Style: Outline (stroke), not filled
- Stroke width: 2px (default)
- Standard sizes: 16px, 20px, 24px
- Colour: Inherit from parent text colour or use brand colours

### 6.2 Photography Guidelines

When selecting imagery for marketing, presentations, or content:

- **Do:** Show diverse young athletes in action (multiple sports)
- **Do:** Include coaches, parents, and clubs interacting positively
- **Do:** Feature grassroots and community-level sport (not just elite)
- **Do:** Use natural, warm lighting
- **Don't:** Use overly staged or stock-looking photos
- **Don't:** Focus exclusively on competition/winning
- **Don't:** Exclude any age groups, genders, or ability levels

### 6.3 Illustration Style

If using custom illustrations:
- Clean, modern, minimal line art
- Use brand colour palette (navy, green, gold accents)
- Player-centred compositions
- Avoid overly childish or overly corporate styles

---

## 7. Tone of Voice

### 7.1 Core Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| **Player-first** | Always centre the young athlete | "Help players thrive" not "Manage your roster" |
| **Encouraging** | Supportive, never judgemental | "Track progress over time" not "Identify weaknesses" |
| **Clear** | Simple language, no jargon | "Add a player to the team" not "Enroll an identity entity" |
| **Inclusive** | All sports, all levels, all backgrounds | "Every player's journey" not "Elite athlete pathways" |
| **Warm** | Human, approachable, not corporate | "We're here to help" not "Please submit a support ticket" |

### 7.2 Writing Style

- Use **active voice** ("Coaches can track progress" not "Progress can be tracked")
- Use **second person** where possible ("Your team" not "The user's team")
- Keep sentences short and scannable
- Use title case for headings, sentence case for descriptions
- Avoid acronyms without first defining them

### 7.3 Terminology

| Use | Instead of |
|-----|-----------|
| Club | Organization (in UI) |
| Player | Athlete, participant |
| Guardian / Parent | Account holder |
| Coach | Instructor, trainer |
| Team | Squad, group |
| Player Passport | Player profile (formal name for the feature) |

---

## 8. Application Guidelines

### 8.1 Hero / Landing Sections

```
Background:  Gradient from #1E3A5F to #0F1F35
Text:        White (#FFFFFF)
CTA Primary: Gold (#F39C12) with white text
CTA Secondary: White outline or transparent with white text
Logo:        OffWhite Orbit + Green Human variant
```

### 8.2 Navigation / Headers

```
Background:  Navy (#1E3A5F) or org-primary on org pages
Text:        White (#FFFFFF)
Active Link: Green (#27AE60) underline or highlight
Logo:        Compact icon version
```

### 8.3 Content Sections (Light)

```
Background:  White (#FFFFFF) or Slate 50 (#F8FAFC)
Headings:    Navy (#1E3A5F)
Body Text:   Slate 700 (#314158)
Links:       Green (#27AE60)
Borders:     Slate 200 (#E2E8F0)
```

### 8.4 Cards & Panels

```
Background:  White (#FFFFFF)
Border:      Slate 200 (#E2E8F0) or 1px solid
Shadow:      Subtle, e.g. shadow-sm
Title:       Navy (#1E3A5F), Semibold
Content:     Slate 700 (#314158)
Accent:      Org colour or brand green for highlights
```

### 8.5 Footers

```
Background:  Slate 50 (#F8FAFC) or White
Headings:    Navy (#1E3A5F)
Links:       Slate 600, hover Green (#27AE60)
Copyright:   Slate 600, includes mission motto
Logo:        Navy Orbit + Green Human variant
```

### 8.6 Buttons

| Type | Background | Text | Border | Hover |
|------|-----------|------|--------|-------|
| Primary CTA | Gold `#F39C12` | White | None | `#E67E22` |
| Secondary CTA | Transparent | White | White 1px | White bg at 10% |
| In-App Primary | Org Primary | White | None | Darken 10% |
| In-App Secondary | Org Secondary | White | None | Darken 10% |
| Outline | Transparent | Org Primary | Org Primary 1px | Org Primary bg at 10% |
| Destructive | Red `#EF4444` | White | None | Darken Red |

### 8.7 Dark Mode

The platform supports system-level dark mode:

```
Background:  Near Black (#030712) or Slate 900 (#0F172B)
Cards:       Dark grey (oklch 0.205)
Text:        White/Slate 100
Borders:     White at 10% opacity
Brand Navy:  Lightened for visibility (use adjustForDarkMode utility)
Brand Green: Remains vibrant on dark backgrounds
```

---

## 9. Accessibility Standards

PlayerARC follows **WCAG 2.2 AA** as a minimum standard.

### 9.1 Colour Contrast Requirements

| Context | Minimum Ratio | Standard |
|---------|--------------|----------|
| Normal text (< 18px) | 4.5:1 | WCAG AA |
| Large text (>= 18px bold, >= 24px) | 3:1 | WCAG AA |
| Enhanced (all text) | 7:1 | WCAG AAA (target) |

### 9.2 Brand Colour Contrast Checks

| Combination | Ratio | Compliance |
|-------------|-------|-----------|
| Navy `#1E3A5F` on White `#FFFFFF` | 8.5:1 | AAA |
| White `#FFFFFF` on Navy `#1E3A5F` | 8.5:1 | AAA |
| Green `#27AE60` on White `#FFFFFF` | 2.9:1 | Large text only |
| White `#FFFFFF` on Green `#27AE60` | 2.9:1 | Large text only |
| Navy `#1E3A5F` on Gold `#F39C12` | 3.4:1 | Large text only |
| White `#FFFFFF` on Gold `#F39C12` | 2.1:1 | Fail - use navy text |
| Slate 700 `#314158` on White `#FFFFFF` | 7.8:1 | AAA |

**Key guideline:** When using Green or Gold as backgrounds, prefer navy or dark text for body copy. White text on Green/Gold only passes for large/bold text (18px+ bold or 24px+ regular).

### 9.3 Utility Functions

The codebase includes built-in accessibility utilities in `apps/web/src/lib/color-utils.ts`:

- `getContrastRatio(fg, bg)` - Calculate WCAG contrast ratio
- `getContrastColor(bg)` - Auto-select black or white text
- `meetsWCAG_AA(fg, bg)` - Validate AA compliance
- `meetsWCAG_AAA(fg, bg)` - Validate AAA compliance
- `getWCAGCompliance(fg, bg)` - Get compliance level with ratio

### 9.4 Touch Targets

All interactive elements must meet a minimum touch target of **44x44px** on mobile devices (enforced in CSS base layer).

### 9.5 Motion & Transitions

- Theme transitions use 200ms ease (feature-flagged)
- All animations respect `prefers-reduced-motion: reduce`
- No auto-playing animations without user control

---

## 10. Organization Theming (Multi-Tenant)

Each club/organization on PlayerARC can customise their interface with three brand colours.

### 10.1 How It Works

1. Colours stored in the database per organization: `[primary, secondary, tertiary]`
2. Applied dynamically via CSS custom properties when user navigates to org pages
3. Components read colours via `useOrgTheme()` hook or CSS variables

### 10.2 CSS Variables (Per-Organization)

```css
--org-primary: <hex>;
--org-primary-rgb: <r>, <g>, <b>;
--org-secondary: <hex>;
--org-secondary-rgb: <r>, <g>, <b>;
--org-tertiary: <hex>;
--org-tertiary-rgb: <r>, <g>, <b>;
```

### 10.3 Default Fallback Colours

When an organization has not set custom colours:

| Slot | Colour | Hex |
|------|--------|-----|
| Primary | Green | `#16A34A` |
| Secondary | Blue | `#0EA5E9` |
| Tertiary | Amber | `#F59E0B` |

### 10.4 Themed Components

- `OrgThemedButton` - Buttons with primary/secondary/tertiary/outline variants
- `OrgThemedGradient` - Gradient backgrounds using org colours
- `StatCard` - Dashboard cards with colour variants

### 10.5 For Designers

When designing org-specific materials, clubs should:
- Provide three hex colours that represent their brand
- Ensure their primary colour has sufficient contrast with white text (4.5:1 minimum)
- Test colours in both light and dark mode contexts

Full technical documentation: `docs/features/organization-theming.md`

---

## 11. Presentation & Slide Templates

### 11.1 Google Slides Colour Setup

When building PlayerARC branded presentations in Google Slides:

**Theme Colours to Set:**
| Slot | Colour | Hex |
|------|--------|-----|
| Primary / Dark | PlayerARC Navy | `#1E3A5F` |
| Accent 1 | PlayerARC Green | `#27AE60` |
| Accent 2 | PlayerARC Gold | `#F39C12` |
| Light Background | White | `#FFFFFF` |
| Alt Background | Slate 50 | `#F8FAFC` |
| Body Text | Slate 700 | `#314158` |
| Secondary Text | Slate 500 | `#62748E` |

### 11.2 Recommended Slide Layouts

**Title Slide:**
- Background: Navy `#1E3A5F` (solid or gradient to `#0F1F35`)
- Title text: White, Bold, 36-44pt
- Subtitle: White at 80% opacity, 18-24pt
- Logo: OffWhite Orbit + Green Human, bottom-right or centred
- Accent bar: Green `#27AE60` thin line

**Section Divider:**
- Background: Navy `#1E3A5F`
- Section title: White, Bold, 36pt
- Optional subtitle: Gold `#F39C12`, 18pt

**Content Slide (Light):**
- Background: White `#FFFFFF`
- Heading: Navy `#1E3A5F`, Bold, 28pt
- Body: Slate 700 `#314158`, Regular, 16-18pt
- Bullet accents: Green `#27AE60`
- Data highlights: Gold `#F39C12`

**Content Slide (Dark):**
- Background: Navy `#1E3A5F`
- Heading: White, Bold, 28pt
- Body: White at 90%, Regular, 16-18pt
- Bullet accents: Green `#27AE60`
- Data highlights: Gold `#F39C12`

**Data / Chart Slide:**
- Chart primary: Navy `#1E3A5F`
- Chart secondary: Green `#27AE60`
- Chart tertiary: Gold `#F39C12`
- Chart quaternary: Slate 400 `#99A1AF`
- Background: White
- Labels: Slate 700

**Quote / Testimonial Slide:**
- Background: Slate 50 `#F8FAFC`
- Quote text: Navy `#1E3A5F`, Italic, 24pt
- Attribution: Slate 500 `#62748E`, Regular, 14pt
- Accent: Green left border or quotation mark

**Closing Slide:**
- Background: Navy `#1E3A5F`
- Logo: OffWhite Orbit + Green Human, centred, large
- Mission: White, 20pt: "As Many as Possible, For as Long as Possible."
- Website / contact: Gold `#F39C12`, 16pt

### 11.3 Font Substitution for Slides

| Platform Font | Slide Substitute | Fallback |
|---------------|-----------------|----------|
| Geist Sans | **Inter** (Google Fonts) | Open Sans, Arial |
| Geist Mono | **JetBrains Mono** or **Fira Code** | Courier New |

### 11.4 Slide Do's and Don'ts

**Do:**
- Use navy backgrounds for impact slides and white for content
- Maintain generous whitespace / margins (minimum 40px from edges)
- Use the logo on opening and closing slides
- Include the mission motto on closing slides
- Use green for positive data and gold for highlighted callouts

**Don't:**
- Use more than 3 brand colours on a single slide
- Place body text smaller than 14pt
- Use gold as a background colour (low contrast with white text)
- Overload slides with text - aim for 6 lines maximum
- Use clip art or generic stock illustrations

---

## 12. Rebrand Reference (PDP to PlayerARC)

The platform was originally called **PDP** (Player Development Passport). The rebrand to **PlayerARC** was completed in late 2025.

### Key Changes Made

| Area | Old | New |
|------|-----|-----|
| Brand name | PDP / Player Development Passport | PlayerARC |
| Site title | "PDP - Player Development Passport" | "PlayerArc - Player Development Platform" |
| CSS tokens | `--pdp-navy`, `--pdp-green` | Retained (internal only) |
| Logo files | `PDP-Logo-*` | Filenames retained, referenced as PlayerARC |
| Domain | - | playerarc.io (redirects from playerarc.com) |

### Files Updated During Rebrand

- `apps/web/src/app/layout.tsx` - Metadata title & description
- `apps/web/src/components/landing/hero-section.tsx` - Hero text
- `apps/web/src/components/landing/floating-header.tsx` - Nav branding
- `apps/web/src/components/landing/landing-footer.tsx` - Footer & copyright
- `apps/web/src/components/landing/solution-section.tsx` - Product description
- `apps/web/src/components/sign-in-form.tsx` - Auth page branding
- `apps/web/src/components/sign-up-form.tsx` - Auth page branding
- `apps/web/src/data/blog-posts.ts` - Blog content references

### Internal CSS Token Note

The CSS variables `--pdp-navy` and `--pdp-green` retain the "pdp" prefix for backwards compatibility. These are internal implementation details and should not appear in any user-facing content.

---

## Quick Reference Card

```
BRAND:       PlayerARC
MISSION:     "As Many as Possible, For as Long as Possible."
TAGLINE:     "Keeping young athletes engaged, healthy, and in love with their sport."

COLOURS:
  Navy       #1E3A5F    Primary - backgrounds, headings
  Green      #27AE60    Accent - CTAs, links, interactive
  Gold       #F39C12    Highlight - warm accents, badges
  Slate 700  #314158    Body text
  White      #FFFFFF    Backgrounds, text on dark

FONTS:
  Digital    Geist Sans / Geist Mono
  Slides     Inter / JetBrains Mono
  Fallback   system-ui, sans-serif

LOGOS:
  Light BG   NavyOrbit_GreenHuman
  Dark BG    OffWhiteOrbit_GreenHuman

ACCESSIBILITY:
  Standard   WCAG 2.2 AA minimum
  Target     WCAG 2.2 AAA where possible
  Touch      44x44px minimum targets
```
