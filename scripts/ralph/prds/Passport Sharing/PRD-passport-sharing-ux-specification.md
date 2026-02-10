# Passport Sharing - UX Specification

**Document Version:** 1.0
**Date:** January 14, 2026
**Status:** Draft for Review
**Related PRD:** `PRD-passport-sharing.md`

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System Alignment](#2-design-system-alignment)
3. [User Flows](#3-user-flows)
4. [Component Specifications](#4-component-specifications)
5. [Mobile-First Responsive Design](#5-mobile-first-responsive-design)
6. [Accessibility Requirements](#6-accessibility-requirements)
7. [Error States & Edge Cases](#7-error-states--edge-cases)
8. [Micro-interactions & Feedback](#8-micro-interactions--feedback)
9. [Onboarding & Education](#9-onboarding--education)
10. [Information Architecture](#10-information-architecture)

---

## 1. Design Philosophy

### 1.1 Core UX Principles

This feature must adhere to these non-negotiable UX principles:

| Principle | Application |
|-----------|-------------|
| **Trust Through Transparency** | Every sharing action shows exactly what will happen; no hidden data flows |
| **Progressive Disclosure** | Show essential info first, reveal complexity only when needed |
| **Reversibility & Control** | Every action can be undone; users always feel in control |
| **Mobile-First** | All flows optimized for mobile screens as primary use case |
| **Contextual Consent** | Request consent at the moment it's needed, with clear value explanation |
| **Minimal Cognitive Load** | One clear action per screen; no overwhelming choices |
| **Instant Feedback** | Every action gets immediate visual confirmation |

### 1.2 Design Goals

**For Parents:**
- Feel confident and in control of their child's data
- Understand sharing implications without reading legal documents
- Complete sharing setup in under 2 minutes
- Easily find and modify sharing settings anytime

**For Coaches:**
- Discover shared data naturally within existing workflows
- Quickly understand what's their data vs. shared data
- Get value from cross-sport insights without extra effort
- Never feel blocked by privacy controls

**For Administrators:**
- Monitor sharing at a glance without micromanaging
- Generate compliance reports effortlessly
- Support parents without overstepping authority

### 1.3 Anti-Patterns to Avoid

Based on regulatory guidance and UX best practices:

| Dark Pattern | Our Approach |
|--------------|--------------|
| Pre-ticked checkboxes | All sharing is opt-in with active selection |
| Confusing language | Plain English, no legal jargon |
| Hidden revocation | Revoke button always prominent |
| All-or-nothing consent | Granular element-by-element control |
| Consent fatigue | Smart defaults with easy customization |
| Buried settings | Sharing controls in consistent, findable location |
| Asymmetric effort | Disabling as easy as enabling |

---

## 2. Design System Alignment

### 2.1 Component Library Usage

All components must use existing shadcn/ui components from `/apps/web/src/components/ui/`:

| Component Type | shadcn/ui Component | Usage in Sharing Feature |
|---------------|---------------------|-------------------------|
| Dialogs | `ResponsiveDialog` | Consent flows, confirmations |
| Cards | `Card`, `CardHeader`, `CardContent` | Sharing status, child cards |
| Toggles | `Switch` | Element-level sharing controls |
| Selections | `Checkbox`, `RadioGroup` | Multi-org selection, element selection |
| Buttons | `Button` (all variants) | Actions, navigation |
| Badges | `Badge` | Status indicators, org labels |
| Tabs | `Tabs`, `TabsList` | Dashboard sections |
| Forms | `Form`, `Input`, `Label` | Settings, configuration |
| Feedback | `Sonner` toasts | Action confirmations |

### 2.2 Color Coding System

Align with existing PlayerARC patterns:

```
Sharing Status Colors:
├─ Active sharing:    bg-green-100 text-green-700 (badge)
├─ Pending renewal:   bg-yellow-100 text-yellow-700 (badge)
├─ Expired/Revoked:   bg-red-100 text-red-700 (badge)
├─ No sharing:        bg-gray-100 text-gray-500 (badge)

Information Boxes:
├─ Informational:     bg-blue-50 text-blue-800 border-blue-200
├─ Warning:           bg-amber-50 text-amber-800 border-amber-200
├─ Success:           bg-green-50 text-green-800 border-green-200
├─ Privacy/Security:  bg-purple-50 text-purple-800 border-purple-200

Data Source Indicators:
├─ Own org data:      No special indicator (default)
├─ Shared data:       bg-blue-50 border-blue-200 with "Shared" badge
├─ Multiple sources:  Distinct color per source org
```

### 2.3 Typography Hierarchy

Follow existing patterns:

```
Page Titles:         font-bold text-3xl (h1)
Section Headers:     font-semibold text-xl mb-4 (h2)
Card Titles:         font-semibold text-base (h3)
Subsection Labels:   font-medium text-sm (h4)
Body Text:           text-sm (p)
Helper Text:         text-xs text-muted-foreground
```

### 2.4 Spacing System

```
Container:           max-w-5xl mx-auto px-4 py-8
Card Padding:        p-4 (content), p-6 (header)
Section Spacing:     space-y-6 (between sections)
Element Spacing:     space-y-4 (within sections)
Button Groups:       gap-3
Inline Elements:     gap-2
```

### 2.5 Icon Usage

From Lucide Icons, consistent with codebase:

```
Sharing/Export:      Share2, ExternalLink
Privacy/Security:    Shield, Lock, Eye, EyeOff
Status:              Check, AlertCircle, AlertTriangle, Clock
People:              Users, User, UserCheck
Organizations:       Building, Building2
Data/Info:           FileText, Info, HelpCircle
Actions:             Settings, Trash2, Edit, Plus, X
Navigation:          ChevronRight, ChevronDown, ArrowLeft
```

---

## 3. User Flows

### 3.1 Parent: Enable Sharing Flow

#### Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENABLE SHARING FLOW                          │
│                      (6-7 screens)                              │
└─────────────────────────────────────────────────────────────────┘

Entry Points:
├─ Parent Dashboard → "Manage Sharing" button on child card
├─ Parent Dashboard → "Sharing" tab/section
├─ Child Detail → "Share Passport" action button
└─ Notification → "Enable sharing" prompt

Flow Steps:
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ 1. Info │ → │ 2. Orgs │ → │3.Elements│ → │4.Duration│
│ Screen  │   │ Select  │   │ Select   │   │ Select  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
              ┌─────────┐   ┌─────────┐
              │5.Review │ → │6.Success │
              │& Confirm│   │ Screen   │
              └─────────┘   └─────────┘
```

#### Screen 1: Information Screen

**Purpose:** Educate and build trust before asking for consent

**Layout (Mobile-First):**
```
┌─────────────────────────────────────────┐
│ ← Back                        [X Close] │
├─────────────────────────────────────────┤
│                                         │
│        [Shield Icon - h-16 w-16]        │
│              text-blue-600              │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Passport Sharing                       │
│  font-bold text-2xl text-center         │
│                                         │
│  Share Jamie's development progress     │
│  with coaches at other clubs.           │
│  text-muted-foreground text-center      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✓ You control what is shared    │   │
│  │   text-sm with Check icon       │   │
│  ├─────────────────────────────────┤   │
│  │ ✓ You choose who can see it     │   │
│  ├─────────────────────────────────┤   │
│  │ ✓ You can stop sharing anytime  │   │
│  ├─────────────────────────────────┤   │
│  │ ✓ You see who accessed data     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ bg-blue-50 rounded-lg p-4       │   │
│  │                                 │   │
│  │ Why share?                      │   │
│  │ font-medium text-sm             │   │
│  │                                 │   │
│  │ Multi-sport athletes benefit    │   │
│  │ when coaches understand their   │   │
│  │ full development picture...     │   │
│  │ text-xs text-blue-700           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Learn More] (link, optional)          │
│                                         │
├─────────────────────────────────────────┤
│ [Continue →]                            │
│ Button variant="default" w-full         │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Use `ResponsiveDialog` (drawer on mobile, modal on desktop)
- Max width: `sm:max-w-[500px]`
- Benefits list: Custom component with Check icons (text-green-600)
- Info box: `bg-blue-50 border border-blue-200 rounded-lg p-4`
- Continue button: `variant="default"` full width

#### Screen 2: Organization Selection

**Purpose:** Choose which organizations can see shared data

**Layout:**
```
┌─────────────────────────────────────────┐
│ ← Back                        [X Close] │
├─────────────────────────────────────────┤
│                                         │
│  Step 2 of 5                            │
│  text-xs text-muted-foreground          │
│                                         │
│  Who can see Jamie's passport?          │
│  font-semibold text-lg                  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ○ All clubs Jamie is enrolled   │   │
│  │   RadioGroup option             │   │
│  │                                 │   │
│  │   Currently:                    │   │
│  │   • St. Mary's GAA              │   │
│  │   • FC United                   │   │
│  │   text-xs text-muted-foreground │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ○ Only specific clubs           │   │
│  │   RadioGroup option             │   │
│  │                                 │   │
│  │   (When selected, show:)        │   │
│  │   ┌───────────────────────────┐ │   │
│  │   │ ☑ St. Mary's GAA          │ │   │
│  │   │ ☐ FC United               │ │   │
│  │   └───────────────────────────┘ │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ bg-amber-50 text-amber-800      │   │
│  │ p-3 rounded-lg flex gap-2       │   │
│  │                                 │   │
│  │ [AlertCircle] Sharing is        │   │
│  │ bi-directional...               │   │
│  │ text-xs                         │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ [← Back]        [Continue →]            │
│ variant=outline  variant=default        │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Use `RadioGroup` for mode selection
- Use `Checkbox` group for specific org selection (revealed conditionally)
- Org list: Cards with Building2 icon + org name
- Warning info box for bi-directional explanation
- Navigation: Two buttons at bottom with gap-3

#### Screen 3: Element Selection

**Purpose:** Granular control over what data is shared

**Layout:**
```
┌─────────────────────────────────────────┐
│ ← Back                        [X Close] │
├─────────────────────────────────────────┤
│                                         │
│  Step 3 of 5                            │
│  What would you like to share?          │
│  font-semibold text-lg                  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [✓] Share full passport         │   │
│  │     (Recommended)               │   │
│  │     Switch toggle - checked     │   │
│  │                                 │   │
│  │     Includes all development    │   │
│  │     data for best insights      │   │
│  │     text-xs muted-foreground    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─ OR customize: ─                      │
│  Separator with text                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ STANDARD INFORMATION            │   │
│  │ text-xs font-medium muted       │   │
│  │                                 │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ Basic profile             │   │   │
│  │ │ Name, age group, photo   │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ Skill ratings             │   │   │
│  │ │ Current assessments      │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ Development goals         │   │   │
│  │ │ Goals & milestones       │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ Coach notes               │   │   │
│  │ │ Public notes only        │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ Benchmark data            │   │   │
│  │ │ Age group comparisons    │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ Attendance records        │   │   │
│  │ │ Training & match stats   │   │   │
│  │ └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ SENSITIVE INFORMATION ⚠️        │   │
│  │ text-xs font-medium amber       │   │
│  │                                 │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ 🏥 Injury history         │   │   │
│  │ │ Past & current injuries  │   │   │
│  │ │ text-amber-600 icon      │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ 🏥 Medical summary        │   │   │
│  │ │ Allergies, conditions    │   │   │
│  │ └──────────────────────────┘   │   │
│  │ ┌─ Switch ─────────────────┐   │   │
│  │ │ 📞 Contact information    │   │   │
│  │ │ For coach coordination   │   │   │
│  │ │ text-blue-600 icon       │   │   │
│  │ └──────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ [← Back]        [Continue →]            │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Master "Share full passport" switch at top (default ON)
- When master switch is ON, individual switches are disabled/grayed
- When master switch is OFF, individual switches become interactive
- Sensitive elements grouped separately with warning color
- Each switch row: `flex items-center justify-between` with label + description
- Use `Switch` component for each element

#### Screen 4: Duration Selection

**Purpose:** Set time-limited consent

**Layout:**
```
┌─────────────────────────────────────────┐
│ ← Back                        [X Close] │
├─────────────────────────────────────────┤
│                                         │
│  Step 4 of 5                            │
│  How long should sharing last?          │
│  font-semibold text-lg                  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ○ Until end of season           │   │
│  │   March 2026 (3 months)         │   │
│  │   text-xs muted                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ● 1 year (Recommended)          │   │
│  │   January 2027                  │   │
│  │   text-xs muted                 │   │
│  │                                 │   │
│  │   [Badge: Most common]          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ○ 6 months                      │   │
│  │   July 2026                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ○ Custom date                   │   │
│  │   [Date picker when selected]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ bg-blue-50 p-3 rounded-lg       │   │
│  │                                 │   │
│  │ [Info icon] You'll get a        │   │
│  │ reminder 2 weeks before expiry  │   │
│  │ to renew or let it end.         │   │
│  │ text-xs text-blue-700           │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ [← Back]        [Continue →]            │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Use `RadioGroup` for duration options
- Each option as a Card-like container with radio
- Custom date: Reveal `DatePicker` when selected
- Info box about reminder
- Pre-select "1 year (Recommended)"

#### Screen 5: Review & Confirm

**Purpose:** Final review before consent

**Layout:**
```
┌─────────────────────────────────────────┐
│ ← Back                        [X Close] │
├─────────────────────────────────────────┤
│                                         │
│  Step 5 of 5                            │
│  Review & Confirm                       │
│  font-semibold text-lg                  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ SUMMARY                         │   │
│  │ bg-gray-50 rounded-lg p-4       │   │
│  │                                 │   │
│  │ 👦 Player                       │   │
│  │    Jamie Smith                  │   │
│  │                                 │   │
│  │ 🏢 Sharing with                 │   │
│  │    St. Mary's GAA               │   │
│  │                                 │   │
│  │ 📋 Elements                     │   │
│  │    Full passport (9 items)      │   │
│  │    [View details] link          │   │
│  │                                 │   │
│  │ ⏱️ Duration                     │   │
│  │    Until January 14, 2027       │   │
│  │    (1 year)                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ By enabling sharing:            │   │
│  │                                 │   │
│  │ • Coaches at St. Mary's GAA     │   │
│  │   can view Jamie's data         │   │
│  │ • You can revoke access anytime │   │
│  │ • All access will be logged     │   │
│  │                                 │   │
│  │ text-sm space-y-2               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [View Terms of Sharing]         │   │
│  │ text-sm text-blue-600 underline │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ [← Back]    [Enable Sharing ✓]          │
│              variant=default            │
│              with Check icon            │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Summary card with all selections
- Bullet point confirmation of what will happen
- Link to full terms (opens in new tab or expandable)
- Final button with checkmark icon
- No pre-checked consent checkbox (button click = consent)

#### Screen 6: Success Screen

**Purpose:** Confirmation and next steps

**Layout:**
```
┌─────────────────────────────────────────┐
│                              [X Close]  │
├─────────────────────────────────────────┤
│                                         │
│        ┌─────────────────────┐          │
│        │ [Check icon - h-16] │          │
│        │ bg-green-100        │          │
│        │ rounded-full p-4    │          │
│        │ text-green-600      │          │
│        └─────────────────────┘          │
│                                         │
│  Sharing Enabled!                       │
│  font-bold text-2xl text-center         │
│  text-green-700                         │
│                                         │
│  Jamie's passport can now be viewed     │
│  by coaches at St. Mary's GAA.          │
│  text-center text-muted-foreground      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  What happens next:                     │
│  font-medium text-sm                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✓ Coaches will see shared data  │   │
│  │ ✓ You'll be notified on access  │   │
│  │ ✓ Review history anytime        │   │
│  │                                 │   │
│  │ text-sm space-y-2               │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│ [View Sharing Dashboard]                │
│ variant=outline w-full                  │
│                                         │
│ [Done]                                  │
│ variant=default w-full                  │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Large success icon (animated check)
- Green color scheme for success state
- "What happens next" section for clarity
- Two CTAs: View dashboard (secondary) and Done (primary)

### 3.2 Parent: Revoke Sharing Flow

**Entry Point:** Sharing dashboard → specific share → "Stop Sharing" button

**Flow:** Single confirmation dialog

```
┌─────────────────────────────────────────┐
│ Stop Sharing?                           │
│ AlertDialog                             │
├─────────────────────────────────────────┤
│                                         │
│  Are you sure you want to stop sharing  │
│  Jamie's passport with St. Mary's GAA?  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  What happens:                          │
│  • Coaches lose access immediately      │
│  • Your audit history is preserved      │
│  • You can re-enable anytime            │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Optional: Tell us why                  │
│  (helps us improve)                     │
│                                         │
│  ○ No longer needed                     │
│  ○ Privacy concerns                     │
│  ○ Child left the club                  │
│  ○ Other                                │
│                                         │
├─────────────────────────────────────────┤
│ [Cancel]           [Stop Sharing]       │
│ variant=outline    variant=destructive  │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Use `AlertDialog` for destructive action
- `variant="destructive"` for stop button
- Optional radio group for reason (not required)
- Toast confirmation after action: "Sharing stopped"

### 3.3 Parent: Renewal Flow

**Entry Point:** Notification or expiry warning in dashboard

**Flow:** Streamlined 2-step process

```
Step 1: Review current settings
┌─────────────────────────────────────────┐
│ Renew Passport Sharing                  │
├─────────────────────────────────────────┤
│                                         │
│  Your sharing with St. Mary's GAA       │
│  expires in 14 days.                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Current settings:               │   │
│  │ • Player: Jamie Smith           │   │
│  │ • Elements: Full passport       │   │
│  │ • Access count: 12 views        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Renew for:                             │
│  ○ 6 months                             │
│  ● 1 year (Recommended)                 │
│  ○ Custom                               │
│                                         │
├─────────────────────────────────────────┤
│ [Modify Settings]  [Renew →]            │
└─────────────────────────────────────────┘

Step 2: Confirmation
┌─────────────────────────────────────────┐
│ ✅ Sharing Renewed!                      │
│                                         │
│ Sharing will continue until             │
│ January 14, 2028.                       │
│                                         │
│ [Done]                                  │
└─────────────────────────────────────────┘
```

### 3.4 Coach: View Shared Passport Flow

**Entry Point:** Coach dashboard → Player with shared badge → Click to view

**No explicit consent needed from coach** - they're viewing data already authorized by parent

```
Player List (Coach Dashboard):
┌─────────────────────────────────────────┐
│ Player         │ Age  │ Rating │ 📤     │
├─────────────────────────────────────────┤
│ Jamie Smith    │ 12   │ ⭐⭐⭐⭐  │ [badge]│
│                                         │
│ [Badge: "FC United" bg-blue-100]        │
│ Indicates shared data available         │
└─────────────────────────────────────────┘

Click → Player Profile with Cross-Sport Tab:
┌─────────────────────────────────────────┐
│ Jamie Smith                             │
├─────────────────────────────────────────┤
│ [Overview][Skills][Goals][📤 Cross-Sport]│
│           ↑ New tab for shared data     │
├─────────────────────────────────────────┤
│                                         │
│ When on Cross-Sport tab:                │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ 📤 SHARED FROM FC UNITED        │    │
│ │ bg-blue-50 border-blue-200      │    │
│ │                                 │    │
│ │ Parent authorized • Read-only   │    │
│ │ Last updated: Jan 12, 2026      │    │
│ │                                 │    │
│ │ [Skills section - read only]    │    │
│ │ [Goals section - read only]     │    │
│ │ [Notes section - read only]     │    │
│ └─────────────────────────────────┘    │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ 🔮 AI INSIGHTS                   │    │
│ │ bg-purple-50                    │    │
│ │                                 │    │
│ │ [Training load card]            │    │
│ │ [Skill transfer card]           │    │
│ │ [Recommendations card]          │    │
│ └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**Component Spec:**
- Badge on player list indicates shared data available
- Separate tab for cross-sport/shared data (keeps main view clean)
- Clear visual distinction: blue background, "Shared from X" header
- Read-only indicators on all shared content
- AI insights in separate card section

### 3.5 Admin: View Sharing Statistics Flow

**Entry Point:** Admin sidebar → "Data Sharing" menu item

```
Admin Sharing Dashboard:
┌─────────────────────────────────────────┐
│ 📤 Data Sharing                         │
├─────────────────────────────────────────┤
│                                         │
│ [Tab: Overview] [Tab: Outgoing] [Tab: Incoming]
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ OVERVIEW TAB:                           │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │   142   │ │   34    │ │   87    │    │
│ │ Players │ │Outgoing │ │Incoming │    │
│ │  total  │ │ shares  │ │ shares  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ [Progress bar: 61% sharing enabled]     │
│                                         │
│ Recent Activity:                        │
│ • +3 new shares this week              │
│ • 2 shares expiring soon               │
│ • 45 access events logged              │
│                                         │
│ [Generate GDPR Report] button           │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ OUTGOING TAB:                           │
│ Table with: Player, To Org, Elements,   │
│ Since, Status, Actions                  │
│                                         │
│ INCOMING TAB:                           │
│ Table with: Player, From Org, Accessed, │
│ Views, Last Viewed                      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. Component Specifications

### 4.1 ShareStatusBadge

**Purpose:** Indicate sharing status at a glance

```tsx
// Usage
<ShareStatusBadge status="active" />
<ShareStatusBadge status="expiring" daysLeft={14} />
<ShareStatusBadge status="expired" />
<ShareStatusBadge status="revoked" />
<ShareStatusBadge status="none" />

// Visual
active:   [🟢 Sharing Active]     bg-green-100 text-green-700
expiring: [🟡 Expires in 14d]     bg-yellow-100 text-yellow-700
expired:  [⚪ Expired]            bg-gray-100 text-gray-500
revoked:  [🔴 Revoked]            bg-red-100 text-red-700
none:     [📤 Enable Sharing]     bg-blue-100 text-blue-700 (CTA)
```

### 4.2 SharedDataSourceIndicator

**Purpose:** Show where shared data comes from

```tsx
// Usage (on shared data sections)
<SharedDataSourceIndicator
  orgName="FC United"
  lastUpdated="2026-01-12"
/>

// Visual
┌─────────────────────────────────────────┐
│ 📤 Shared from FC United                │
│ bg-blue-50 border-l-4 border-blue-400   │
│                                         │
│ [Building2 icon] FC United              │
│ Last updated: Jan 12, 2026              │
│ [Eye icon] Read-only                    │
└─────────────────────────────────────────┘
```

### 4.3 SharingElementToggle

**Purpose:** Individual element toggle in consent flow

```tsx
// Usage
<SharingElementToggle
  id="skillRatings"
  label="Skill ratings"
  description="Current assessments"
  checked={true}
  onChange={handleChange}
  sensitive={false}
/>

// Visual
┌─────────────────────────────────────────┐
│ [Label]                    [Switch]     │
│ [Description - muted]                   │
└─────────────────────────────────────────┘

// Sensitive variant (amber styling)
┌─────────────────────────────────────────┐
│ [⚠️ Label]                  [Switch]    │
│ [Description - amber muted]             │
│ border-amber-200 bg-amber-50/30         │
└─────────────────────────────────────────┘
```

### 4.4 AccessLogEntry

**Purpose:** Display a single access event

```tsx
// Usage
<AccessLogEntry
  accessor={{ name: "Michael O'Brien", role: "Coach" }}
  organization="St. Mary's GAA"
  accessType="view_skills"
  timestamp="2026-01-12T14:32:00Z"
  duration="3m 42s"
/>

// Visual
┌─────────────────────────────────────────┐
│ January 12, 2026 at 14:32               │
│ text-xs text-muted-foreground           │
│                                         │
│ 👤 Michael O'Brien                      │
│ Role: Head Coach                        │
│ Organization: St. Mary's GAA            │
│                                         │
│ Accessed: Skill ratings, Goals          │
│ Duration: 3 minutes 42 seconds          │
└─────────────────────────────────────────┘
```

### 4.5 CrossSportInsightCard

**Purpose:** Display AI-generated insight

```tsx
// Usage
<CrossSportInsightCard
  type="training_load"
  title="Training Load Alert"
  content="Jamie has 8+ sessions this week..."
  confidence={0.85}
  actionable={true}
  onDismiss={handleDismiss}
  onFeedback={handleFeedback}
/>

// Visual
┌─────────────────────────────────────────┐
│ 📊 Training Load Alert           [✕]   │
│ bg-amber-50 border-amber-200            │
│                                         │
│ Jamie has 8+ training sessions this     │
│ week across GAA (4) and Soccer (4).     │
│ Monitor for fatigue.                    │
│                                         │
│ [View Details]           [Was this helpful?]
│                          👍 👎          │
└─────────────────────────────────────────┘

// Types with colors:
training_load:    bg-amber-50  border-amber-200
skill_transfer:   bg-green-50  border-green-200
goal_synergy:     bg-blue-50   border-blue-200
overtraining:     bg-red-50    border-red-200
```

### 4.6 SharingConsentStepper

**Purpose:** Show progress through consent flow

```tsx
// Usage
<SharingConsentStepper currentStep={3} totalSteps={5} />

// Visual (Mobile - text only)
Step 3 of 5
text-xs text-muted-foreground

// Visual (Desktop - with step indicators)
┌─────────────────────────────────────────┐
│ ● ─── ● ─── ◉ ─── ○ ─── ○              │
│ 1     2     3     4     5               │
│                                         │
│ ●=completed  ◉=current  ○=pending       │
└─────────────────────────────────────────┘
```

---

## 5. Mobile-First Responsive Design

### 5.1 Breakpoint Strategy

```
Mobile:  < 640px  - Single column, bottom sheet dialogs, larger touch targets
Tablet:  640-1024px - Two column where appropriate, modal dialogs
Desktop: > 1024px - Full dashboard layouts, side-by-side comparisons
```

### 5.2 Touch Target Sizes

All interactive elements follow existing PlayerARC responsive patterns:

```
Element          Mobile    Tablet    Desktop
─────────────────────────────────────────────
Buttons          48px      44px      40px
Switches         24px      22px      18px
Checkboxes       44px tap  40px      36px
Radio buttons    44px tap  40px      36px
List items       56px      48px      44px
```

### 5.3 Dialog Behavior

Using existing `ResponsiveDialog` pattern:

```
Mobile:  Bottom sheet drawer
         - Slides up from bottom
         - Drag handle at top
         - Max height 90vh with scroll
         - Full width

Desktop: Centered modal
         - Centered on screen
         - Max width sm:max-w-[500px] or sm:max-w-[600px]
         - Backdrop blur
```

### 5.4 Navigation Patterns

**Mobile:**
- Bottom navigation remains unchanged
- Sharing accessed via child card actions or tab
- Back button always visible in flows

**Desktop:**
- Sidebar navigation with "Data Sharing" menu item (admin)
- Tab navigation within dashboards
- Breadcrumbs for deep navigation

### 5.5 Data Display Responsiveness

**Tables (Admin reports):**
```
Mobile:  Card-based list view (stack vertically)
         Each row becomes a card
         Key info at top, details collapsed

Tablet+: Traditional table layout
         Horizontal scroll if needed
         Sticky headers
```

**Sharing Dashboard:**
```
Mobile:  Stats stacked vertically (1 column)
         Tabs for Incoming/Outgoing
         Cards for each share arrangement

Desktop: Stats in 3-4 column grid
         Side-by-side panels possible
         Tables for detailed views
```

---

## 6. Accessibility Requirements

### 6.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Color Contrast** | All text meets 4.5:1 ratio; use existing PlayerARC colors which are compliant |
| **Focus Indicators** | Use existing `focus-visible:ring-[3px]` pattern |
| **Keyboard Navigation** | All flows completable via keyboard; tab order logical |
| **Screen Reader** | ARIA labels on all interactive elements |
| **Touch Targets** | Minimum 44x44px on mobile (existing pattern) |
| **Motion** | Respect `prefers-reduced-motion`; provide alternatives |

### 6.2 Semantic HTML

```html
<!-- Consent flow -->
<form role="form" aria-label="Passport sharing consent">
  <fieldset>
    <legend>Select organizations to share with</legend>
    <!-- Radio group -->
  </fieldset>
</form>

<!-- Status indicators -->
<div role="status" aria-live="polite">
  Sharing enabled successfully
</div>

<!-- Access log -->
<article aria-label="Access log entry">
  <time datetime="2026-01-12T14:32:00Z">January 12, 2026</time>
  <!-- Entry content -->
</article>
```

### 6.3 Screen Reader Announcements

Key announcements via `aria-live`:

```
"Step 2 of 5: Organization selection"
"Sharing enabled for Jamie Smith"
"Access revoked successfully"
"New insight available: Training load alert"
```

### 6.4 Error Handling for Accessibility

```html
<div role="alert" aria-live="assertive">
  <p>Unable to enable sharing. Please try again.</p>
</div>
```

---

## 7. Error States & Edge Cases

### 7.1 Network Errors

```
┌─────────────────────────────────────────┐
│ [AlertTriangle icon - amber]            │
│                                         │
│ Connection Error                        │
│ font-semibold                           │
│                                         │
│ Unable to save your sharing settings.   │
│ Your changes have not been applied.     │
│ text-muted-foreground                   │
│                                         │
│ [Try Again]        [Cancel]             │
└─────────────────────────────────────────┘
```

### 7.2 Consent Already Exists

When parent tries to enable sharing that's already active:

```
┌─────────────────────────────────────────┐
│ Sharing Already Active                  │
│                                         │
│ Jamie's passport is already shared      │
│ with St. Mary's GAA.                    │
│                                         │
│ [View Current Settings]   [Cancel]      │
└─────────────────────────────────────────┘
```

### 7.3 Player Inactive at Organization

```
┌─────────────────────────────────────────┐
│ [AlertCircle - amber]                   │
│                                         │
│ Player Inactive                         │
│                                         │
│ Jamie is no longer active at FC United. │
│ Sharing from this organization is not   │
│ available.                              │
│                                         │
│ [OK]                                    │
└─────────────────────────────────────────┘
```

### 7.4 No Organizations to Share With

```
┌─────────────────────────────────────────┐
│ No Clubs Available                      │
│                                         │
│ Jamie is only enrolled at one club.     │
│ Sharing requires enrollment at          │
│ multiple organizations.                 │
│                                         │
│ [Got it]                                │
└─────────────────────────────────────────┘
```

### 7.5 Expired Session During Flow

If auth session expires mid-flow:

```
┌─────────────────────────────────────────┐
│ Session Expired                         │
│                                         │
│ Your session has expired. Please log    │
│ in again to continue.                   │
│                                         │
│ Your progress has been saved.           │
│                                         │
│ [Log In]                                │
└─────────────────────────────────────────┘
```

### 7.6 Empty States

**No shared passports (Coach view):**
```
┌─────────────────────────────────────────┐
│ [Users icon - muted]                    │
│                                         │
│ No Shared Passports                     │
│                                         │
│ None of your players have shared        │
│ passport data from other clubs.         │
│                                         │
│ Parents can enable sharing from their   │
│ dashboard.                              │
│                                         │
│ [Learn More]                            │
└─────────────────────────────────────────┘
```

**No access history (Parent view):**
```
┌─────────────────────────────────────────┐
│ [Eye icon - muted]                      │
│                                         │
│ No Access Yet                           │
│                                         │
│ No one has viewed Jamie's shared        │
│ passport yet.                           │
│                                         │
│ You'll see a log here when coaches      │
│ view the shared data.                   │
└─────────────────────────────────────────┘
```

---

## 8. Micro-interactions & Feedback

### 8.1 Toast Notifications

Follow existing Sonner patterns:

```typescript
// Success
toast.success("Sharing enabled", {
  description: "Coaches at St. Mary's GAA can now view Jamie's passport"
});

// Revocation
toast.success("Sharing stopped", {
  description: "Access has been revoked"
});

// Error
toast.error("Unable to enable sharing", {
  description: "Please check your connection and try again"
});

// Info (renewal reminder)
toast.info("Sharing expires soon", {
  description: "Jamie's sharing with FC United expires in 14 days",
  action: {
    label: "Renew",
    onClick: () => navigateToRenewal()
  }
});
```

### 8.2 Loading States

**Button loading:**
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Enabling...
    </>
  ) : (
    <>
      <Check className="mr-2 h-4 w-4" />
      Enable Sharing
    </>
  )}
</Button>
```

**Section loading:**
```tsx
// Use Skeleton components for content areas
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-32" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </CardContent>
</Card>
```

### 8.3 Success Animations

**Enable sharing success:**
- Check icon scales up with spring animation
- Green pulse effect
- Duration: 600ms

**Revoke success:**
- Subtle fade transition
- No celebratory animation (neutral action)
- Duration: 300ms

### 8.4 Switch Toggle Feedback

```
Toggle ON:  → Immediate visual change
            → Toast: "[Element] will be shared"
            → If sensitive: Additional confirmation micro-modal

Toggle OFF: → Immediate visual change
            → Toast: "[Element] will not be shared"
```

### 8.5 Real-time Updates

When viewing access log:
```
New access event detected
↓
Subtle highlight animation on new entry
↓
"New" badge appears briefly
↓
Auto-scrolls to show new entry (if user at top)
```

---

## 9. Onboarding & Education

### 9.1 First-Time User Education

**For Parents (First enable):**

Show educational overlay on first visit to sharing section:

```
┌─────────────────────────────────────────┐
│ [X Close]                               │
│                                         │
│ 🔐 You're in Control                    │
│                                         │
│ Passport Sharing lets you decide        │
│ which clubs can see your child's        │
│ development data.                       │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ [Animation showing data flow    │    │
│ │  with parent as gatekeeper]     │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Key things to know:                     │
│ • You choose what's shared             │
│ • You see who accessed data            │
│ • You can stop sharing anytime         │
│                                         │
│ [Got it, let's start]                   │
└─────────────────────────────────────────┘
```

**For Coaches (First shared player):**

```
┌─────────────────────────────────────────┐
│ 📤 Shared Passport Data                 │
│                                         │
│ Jamie's parent has shared their         │
│ development data from FC United.        │
│                                         │
│ This means you can see:                 │
│ • Their progress in other sports       │
│ • AI-powered cross-sport insights      │
│                                         │
│ Remember:                               │
│ • This data is read-only               │
│ • Parent can revoke access anytime     │
│ • Respect their trust                  │
│                                         │
│ [View Shared Data]                      │
└─────────────────────────────────────────┘
```

### 9.2 Contextual Help

**Tooltips on key elements:**

```tsx
// On "Sensitive Information" section header
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent>
      <p>Medical and contact info require extra consideration.</p>
      <p>Only share if coaches need this for safety.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 9.3 Help Links

Consistent placement of "Learn more" links:

```
┌─────────────────────────────────────────┐
│ Duration Options                        │
│                                         │
│ ○ 1 year (Recommended)                  │
│ ○ 6 months                              │
│ ○ Until end of season                   │
│                                         │
│ [HelpCircle] Why does sharing expire?   │
│ → Opens help article in side panel      │
└─────────────────────────────────────────┘
```

### 9.4 Progressive Feature Discovery

**Badge on parent dashboard:**
```
When child has multi-sport enrollments but no sharing:

┌─────────────────────────────────────────┐
│ 👦 Jamie Smith                          │
│                                         │
│ 🏈 GAA  ⚽ Soccer                        │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ 💡 Tip: Enable passport sharing │    │
│ │    so coaches can see Jamie's   │    │
│ │    full development picture.    │    │
│ │                                 │    │
│ │ [Enable Sharing] [Dismiss]      │    │
│ │ bg-blue-50 border-blue-200      │    │
│ └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 10. Information Architecture

### 10.1 Navigation Structure

**Parent Navigation:**
```
Parent Dashboard
├── My Children
│   └── [Child Card]
│       ├── View Passport → existing player page
│       └── Manage Sharing → sharing settings for this child
├── Sharing (new section)
│   ├── Overview (all children's sharing status)
│   ├── Access Log (who accessed what)
│   └── Settings (notification preferences)
└── Settings
    └── Privacy → links to sharing settings
```

**Coach Navigation:**
```
Coach Dashboard
├── My Teams
│   └── [Team]
│       └── Players
│           └── [Player with 📤 badge]
│               ├── Overview tab
│               ├── Skills tab
│               ├── Goals tab
│               ├── Notes tab
│               └── 📤 Cross-Sport tab (new)
└── (No dedicated sharing section - integrated into player view)
```

**Admin Navigation:**
```
Admin Panel
├── Members
├── Teams
├── Settings
└── Data Sharing (new)
    ├── Overview (stats)
    ├── Outgoing (data shared from club)
    ├── Incoming (data received by club)
    └── Compliance (reports)
```

### 10.2 URL Structure

```
Parent Sharing:
/parents/sharing                    # Cross-org sharing dashboard
/parents/sharing/[childId]          # Specific child's sharing settings
/parents/sharing/[childId]/enable   # Enable sharing flow
/parents/sharing/[childId]/log      # Access log for child

Coach Cross-Sport View:
/orgs/[orgId]/players/[playerId]?tab=cross-sport

Admin Sharing:
/orgs/[orgId]/admin/sharing         # Sharing dashboard
/orgs/[orgId]/admin/sharing/outgoing
/orgs/[orgId]/admin/sharing/incoming
/orgs/[orgId]/admin/sharing/compliance
```

### 10.3 State Management

**Sharing Consent State:**
```typescript
interface SharingConsentState {
  // Flow state
  currentStep: number;
  isComplete: boolean;

  // Selections
  selectedOrgs: string[];
  orgMode: 'all_enrolled' | 'specific_orgs';
  sharedElements: {
    basicProfile: boolean;
    skillRatings: boolean;
    // ... all elements
  };
  useFullPassport: boolean;
  duration: 'season' | '6months' | '1year' | 'custom';
  customDate?: Date;

  // UI state
  isLoading: boolean;
  error: string | null;
}
```

**Coach Shared Data State:**
```typescript
interface SharedPlayerDataState {
  playerIdentityId: string;
  hasSharedData: boolean;
  sharedSources: Array<{
    orgId: string;
    orgName: string;
    elements: string[];
    lastUpdated: Date;
  }>;
  insights: Array<Insight>;
  isLoadingInsights: boolean;
}
```

---

## Appendix A: Component Inventory

| Component | Location | New/Existing | Priority |
|-----------|----------|--------------|----------|
| ShareStatusBadge | `/components/sharing/` | New | P0 |
| SharedDataSourceIndicator | `/components/sharing/` | New | P0 |
| SharingElementToggle | `/components/sharing/` | New | P0 |
| AccessLogEntry | `/components/sharing/` | New | P1 |
| CrossSportInsightCard | `/components/sharing/` | New | P1 |
| SharingConsentStepper | `/components/sharing/` | New | P0 |
| SharingConsentFlow | `/components/sharing/` | New | P0 |
| ParentSharingDashboard | `/app/parents/sharing/` | New | P0 |
| CoachCrossSportTab | `/app/orgs/[orgId]/players/[playerId]/` | New | P0 |
| AdminSharingDashboard | `/app/orgs/[orgId]/admin/sharing/` | New | P1 |

---

## Appendix B: Design Tokens

```css
/* Sharing-specific tokens (extend existing) */
--sharing-active: theme('colors.green.100');
--sharing-active-text: theme('colors.green.700');
--sharing-expiring: theme('colors.yellow.100');
--sharing-expiring-text: theme('colors.yellow.700');
--sharing-expired: theme('colors.gray.100');
--sharing-expired-text: theme('colors.gray.500');
--sharing-revoked: theme('colors.red.100');
--sharing-revoked-text: theme('colors.red.700');

--shared-data-bg: theme('colors.blue.50');
--shared-data-border: theme('colors.blue.200');
--shared-data-text: theme('colors.blue.800');

--insight-training: theme('colors.amber.50');
--insight-skills: theme('colors.green.50');
--insight-goals: theme('colors.blue.50');
--insight-warning: theme('colors.red.50');
```

---

## Appendix C: Interaction Timing

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Toggle switch | 150ms | ease-out |
| Modal open | 200ms | ease-out |
| Modal close | 150ms | ease-in |
| Toast appear | 300ms | spring |
| Toast dismiss | 200ms | ease-in |
| Success check animation | 600ms | spring |
| Skeleton pulse | 1.5s | linear (infinite) |
| Focus ring | 150ms | ease-out |

---

**End of UX Specification Document**
