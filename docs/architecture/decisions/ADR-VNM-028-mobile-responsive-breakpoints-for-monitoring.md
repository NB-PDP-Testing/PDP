# ADR-VNM-028: Mobile Responsive Breakpoints for Monitoring Pages

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phases M6-M9, All Frontend Stories

## Context and Problem Statement

The PRD requires mobile testing at 375px minimum. However, the architecture doc (Section 11) states "Mobile-optimized monitoring -- Admin tooling, desktop-primary" is out of scope. Need to resolve this conflict and define what "mobile responsive" means for admin monitoring pages.

## Decision Drivers

- Primary users are platform staff (desktop)
- Architecture doc explicitly defers mobile optimization
- M9 acceptance criteria includes "Mobile responsive audit: test all pages at 375px width"
- Tables with 11 columns do not fit on 375px screens
- Charts need minimum width to be readable

## Decision Outcome

### Pragmatic Approach: Functional at 375px, Optimized for 768px+

The monitoring pages should be **functional** (no broken layout, no overlapping elements, scrollable) at 375px, but **optimized** for desktop (768px+).

### Breakpoint Patterns

| Screen Size | Layout Behavior |
|---|---|
| **375px-640px** (mobile) | Single column, horizontal scroll for tables, filter collapse |
| **640px-768px** (tablet) | 2-column grid for cards, filter bar visible |
| **768px-1024px** (small desktop) | 3-column grid, full table, all features visible |
| **1024px+** (desktop) | Full layout, max-width container |

### Table Responsive Pattern

Wide tables (artifacts grid, events log) use horizontal scroll on mobile:

```tsx
<div className="overflow-x-auto">
  <Table className="min-w-[800px]"> {/* Forces scroll on mobile */}
    {/* Table content */}
  </Table>
</div>
```

### Card Grid Pattern

Status cards and metric cards use responsive grid:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>
```

### Chart Pattern

Charts have minimum height but flexible width:

```tsx
<div className="min-h-[200px] w-full">
  {/* CSS bar chart or inline SVG */}
</div>
```

### Pipeline Flow Graph

The SVG pipeline flow graph should either:
- Scroll horizontally on mobile (wrap in `overflow-x-auto`)
- Stack vertically on mobile (change direction)

Recommendation: horizontal scroll (simpler, maintains visual meaning)

## Implementation Notes

1. All pages should use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
2. No custom CSS media queries -- Tailwind only
3. Filter bars: collapsible on mobile (see ADR-VNM-025)
4. Tables: `overflow-x-auto` wrapper for horizontal scroll
5. Pipeline flow graph: horizontal scroll container
6. Alert cards: single column stack on mobile
7. Chart section: full width, no minimum width constraint

## Testing

During M9 polish, verify at 375px:
- [ ] No elements overflow the viewport
- [ ] All tables are scrollable horizontally
- [ ] All filters are accessible (via collapse toggle)
- [ ] All buttons are tappable (minimum 44px touch target)
- [ ] All text is readable (no text overlap)
- [ ] Navigation tabs scroll horizontally (already implemented in layout.tsx)
