# ADR-VNM-017: Responsive Design Breakpoints and Mobile-First Approach

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

The monitoring dashboard must work across desktop (>= 1024px), tablet (768-1023px), and mobile (< 768px) viewports, with a minimum test width of 375px (iPhone SE). The dashboard contains an SVG flow graph, a 6-card grid, and a scrollable activity feed. Each section needs a different responsive strategy.

## Decision Drivers

- PRD specifies three breakpoints: desktop >= 1024px, tablet 768-1023px, mobile < 768px
- Minimum test width: 375px (iPhone SE)
- Tailwind CSS is the project's styling system
- StatusCards: 3x2 desktop, 2x3 tablet, 1x6 mobile
- PipelineFlowGraph: horizontal desktop, vertical mobile
- Tab navigation: horizontal scroll on mobile
- Existing platform pages are mobile-responsive

## Considered Options

### Option 1: Tailwind CSS Responsive Classes (Mobile-First)

**Approach:** Use Tailwind's mobile-first responsive prefixes (`sm:`, `md:`, `lg:`) for all layout changes. SVG flow graph uses CSS media queries via Tailwind for orientation change.

**Pros:**
- Consistent with project styling approach
- No JavaScript-based responsive logic
- Mobile-first ensures base styles work at 375px
- Tailwind breakpoints align with PRD: md=768px, lg=1024px

**Cons:**
- SVG orientation change is complex with CSS alone (needs two SVG variants or conditional render)

**Complexity:** Low
**Performance:** Best (CSS-only)

### Option 2: useMediaQuery Hook + Conditional Rendering

**Approach:** Use a `useMediaQuery` React hook to detect viewport size and conditionally render different component variants.

**Pros:**
- Full control over what renders at each breakpoint
- Can render completely different SVGs for mobile vs desktop

**Cons:**
- JavaScript-based (runs after hydration)
- Flash of wrong layout on initial render
- Additional hook dependency
- Not SSR-friendly

**Complexity:** Medium
**Performance:** Slightly worse (layout shift risk)

## Decision Outcome

**Chosen Option:** Option 1 -- Tailwind CSS Responsive Classes, with one exception: the PipelineFlowGraph component uses two inline SVGs (horizontal and vertical) toggled via Tailwind `hidden`/`block` classes at the `md:` breakpoint. This avoids JavaScript-based detection while providing optimal layouts for both orientations.

**Rationale:**
CSS-only responsive design is faster, avoids hydration mismatches, and is consistent with the rest of the project. The "two SVG variants" approach for the flow graph is a simple and reliable way to handle the orientation change.

## Implementation Notes

### Breakpoint Mapping (Tailwind to PRD)

| PRD Breakpoint | Tailwind Prefix | Width |
|----------------|-----------------|-------|
| Mobile | (default) | < 768px |
| Tablet | `md:` | >= 768px |
| Desktop | `lg:` | >= 1024px |

### StatusCards Grid

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* 6 cards: 1-col mobile, 2-col tablet, 3-col desktop */}
</div>
```

### PipelineFlowGraph (Two SVG Variants)

```tsx
{/* Desktop/Tablet: Horizontal flow */}
<div className="hidden md:block">
  <svg viewBox="0 0 1200 300" className="w-full h-auto">
    {/* 5 stages laid out horizontally */}
  </svg>
</div>

{/* Mobile: Vertical flow */}
<div className="block md:hidden">
  <svg viewBox="0 0 300 900" className="w-full h-auto">
    {/* 5 stages laid out vertically */}
  </svg>
</div>
```

### Tab Navigation (Horizontal Scroll on Mobile)

```tsx
<nav className="overflow-x-auto border-b">
  <div className="flex min-w-max gap-1 px-4">
    {TABS.map(tab => (
      <Link
        key={tab.href}
        href={tab.href}
        className="whitespace-nowrap px-3 py-2 text-sm ..."
      >
        {tab.label}
      </Link>
    ))}
  </div>
</nav>
```

- `overflow-x-auto` enables horizontal scroll on mobile
- `min-w-max` prevents tab wrapping
- `whitespace-nowrap` keeps tab labels on one line

### ActivityFeed (Full Width, Scrollable)

```tsx
<ScrollArea className="h-[400px] md:h-[500px]">
  {/* Event list */}
</ScrollArea>
```

### Page Layout

```tsx
<div className="container mx-auto space-y-6 px-4 py-6">
  {/* Flow Graph */}
  <Card>
    <CardHeader>
      <CardTitle>Pipeline Flow</CardTitle>
    </CardHeader>
    <CardContent>
      <PipelineFlowGraph metrics={realTimeMetrics} />
    </CardContent>
  </Card>

  {/* Status Cards */}
  <StatusCards metrics={realTimeMetrics} alerts={activeAlerts} />

  {/* Activity Feed */}
  <Card>
    <CardHeader>
      <CardTitle>Recent Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <ActivityFeed events={recentEvents?.page} />
    </CardContent>
  </Card>
</div>
```

### Testing Checklist

- [ ] 375px (iPhone SE): All content visible, no horizontal overflow
- [ ] 768px (iPad): 2-column cards, horizontal flow graph
- [ ] 1024px (Desktop): 3-column cards, horizontal flow graph
- [ ] Tab navigation scrollable on 375px
- [ ] SVG flow graph readable at 375px (vertical orientation)
- [ ] Activity feed scrollable at all breakpoints

## Consequences

**Positive:**
- CSS-only responsive (no layout shift, no hydration mismatch)
- Mobile-first ensures base experience works at 375px
- Tailwind classes are readable and maintainable
- Two SVG variants provide optimal layouts without JavaScript

**Negative:**
- Two SVG elements in DOM (one hidden at each breakpoint) -- negligible overhead
- Slightly more markup for flow graph

**Risks:**
- SVG text readability at 375px width. Mitigation: Use larger font sizes in vertical variant.

## References

- PRD breakpoints: `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M5.json` (criticalPatterns.responsiveBreakpoints)
- Tailwind docs: https://tailwindcss.com/docs/responsive-design
- CLAUDE.md: "Consider mobile viewport. All dialog/modal/form changes must work at 375px width."
