# ADR-VNM-019: Tab Navigation with Next.js Routing

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

The voice monitoring dashboard has 7 tab pages (Overview, Artifacts, Metrics, Events, Pipeline, Alerts, Settings). Each tab corresponds to a separate Next.js route. The tabs need to be rendered in a shared layout that persists across route changes, with the active tab highlighted based on the current URL.

## Decision Drivers

- 7 tabs with distinct URL routes (not in-page tab switching)
- Active tab must reflect current URL path
- Tab bar must persist across route changes (no re-render)
- Mobile: horizontal scroll, no wrapping
- Next.js App Router nested layouts handle persistence
- shadcn/ui Tabs component is available but designed for in-page state

## Considered Options

### Option 1: shadcn/ui Tabs with onValueChange + router.push

**Approach:** Use shadcn/ui `Tabs` component with `value` controlled by `usePathname()` and `onValueChange` calling `router.push()`.

**Pros:**
- Uses existing UI component
- Built-in styling for active/inactive states

**Cons:**
- shadcn/ui Tabs manages internal state -- fighting against its design
- `onValueChange` fires state update + router push (two state changes)
- Potential flash when tab state and URL temporarily disagree
- `TabsContent` expects content inline, not in child routes

**Complexity:** Medium (working against component design)

### Option 2: Custom Tab Bar with Link Components

**Approach:** Build a custom tab navigation bar using Next.js `Link` components and `usePathname()` for active state detection. Style using Tailwind classes to match the design system.

**Pros:**
- Direct URL navigation (no intermediate state)
- `Link` prefetches routes automatically
- Active state derived from URL (single source of truth)
- No fighting against component design
- Full control over mobile scroll behavior
- Matches how other apps implement URL-based tabs

**Cons:**
- Must implement active tab styling manually
- Slightly more code than shadcn/ui Tabs

**Complexity:** Low

### Option 3: Next.js Parallel Routes

**Approach:** Use Next.js parallel routes (slots) for tab content.

**Pros:**
- Framework-native approach

**Cons:**
- Overkill for simple tab navigation
- Complex slot/default file structure
- No established pattern in this project

**Complexity:** High

## Decision Outcome

**Chosen Option:** Option 2 -- Custom Tab Bar with Link Components

**Rationale:**
URL-based navigation should use `Link` components, not stateful UI components. shadcn/ui `Tabs` is designed for in-page tab switching where content is rendered inline via `TabsContent`. Our tabs correspond to separate routes with separate `page.tsx` files. Using `Link` + `usePathname()` is simpler, more correct, and avoids the state synchronization issues of Option 1.

## Implementation Notes

### Tab Bar Component (in layout.tsx)

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/platform/voice-monitoring" },
  { label: "Artifacts", href: "/platform/voice-monitoring/artifacts" },
  { label: "Metrics", href: "/platform/voice-monitoring/metrics" },
  { label: "Events", href: "/platform/voice-monitoring/events" },
  { label: "Pipeline", href: "/platform/voice-monitoring/pipeline" },
  { label: "Alerts", href: "/platform/voice-monitoring/alerts" },
  { label: "Settings", href: "/platform/voice-monitoring/settings" },
] as const;

function TabNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/platform/voice-monitoring") {
      return pathname === href; // Exact match for Overview
    }
    return pathname.startsWith(href); // Prefix match for sub-routes
  };

  return (
    <nav className="overflow-x-auto border-b bg-background">
      <div className="flex min-w-max gap-1 px-4">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive(tab.href)
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

### Active State Logic

- **Overview tab**: Exact match (`pathname === href`) to prevent matching all sub-routes
- **All other tabs**: Prefix match (`pathname.startsWith(href)`) to highlight parent when on nested routes (e.g., `/artifacts/[artifactId]`)

### Mobile Scroll Behavior

- `overflow-x-auto` on `<nav>`: enables horizontal scroll
- `min-w-max` on inner `<div>`: prevents tab wrapping
- `whitespace-nowrap` on each `<Link>`: keeps labels on one line
- No scrollbar styling needed (native behavior is sufficient)

### Breadcrumb

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

<Breadcrumb className="px-4 py-3">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/platform">Platform</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Voice Monitoring</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Placeholder Pages for Future Tabs

For tabs without M5 content (Artifacts, Metrics, Events, Pipeline, Alerts, Settings), create minimal placeholder pages:

```typescript
// apps/web/src/app/platform/voice-monitoring/artifacts/page.tsx
export default function ArtifactsPage() {
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h2 className="text-lg font-semibold text-muted-foreground">
        Artifacts Grid
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">Coming in Phase M6</p>
    </div>
  );
}
```

This ensures all tabs are clickable and navigable from day one.

## Consequences

**Positive:**
- Clean URL-based navigation with Link prefetching
- Active state derived from URL (single source of truth)
- Horizontal scroll works natively on mobile
- Breadcrumb provides navigation context
- Placeholder pages prevent 404s for future tabs

**Negative:**
- Custom styling instead of shadcn/ui Tabs (acceptable, minimal code)

**Risks:**
- Tab count (7) may feel crowded at 375px. Mitigation: Horizontal scroll ensures all tabs are accessible.

## References

- Next.js Link: https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating
- shadcn/ui Breadcrumb: `apps/web/src/components/ui/breadcrumb.tsx`
- PRD tab list: `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M5.json`
