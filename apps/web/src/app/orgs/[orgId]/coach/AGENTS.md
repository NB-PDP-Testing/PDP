# Coach Dashboard - Agent Guidelines

This directory contains coach-specific features and pages.

---

## Architecture Overview

**Route Structure:**
```
/orgs/[orgId]/coach/
├── dashboard/          # Coach dashboard (main landing)
├── voice-notes/        # Voice notes with insights
│   └── components/     # Voice note components
├── team-hub/           # NEW in Phase 9 - Team collaboration
│   └── components/     # Team Hub components
└── settings/           # Coach settings
```

---

## Key Patterns from Phase 8

### 1. Real-Time Data with useQuery

**ALWAYS use Convex useQuery for real-time updates:**

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function MyComponent() {
  const data = useQuery(api.models.myModel.getData, { id });

  if (data === undefined) {
    return <ListSkeleton rows={3} />;
  }

  return <div>{/* render data */}</div>;
}
```

### 2. Skeleton Loading (MANDATORY)

**ALWAYS show skeletons while loading.**

Phase 8 established 19 skeleton types. Common ones:
- `PageSkeleton` (with variants: dashboard, detail, list, form)
- `ListSkeleton` (rows=3 default)
- `CardSkeleton` (count=1 default)

**❌ BAD:**
```typescript
if (data === undefined) {
  return <div>Loading...</div>; // Generic spinner
}
```

**✅ GOOD:**
```typescript
import { ListSkeleton } from "@/components/ui/skeleton";

if (data === undefined) {
  return <ListSkeleton rows={5} />;
}
```

### 3. Organization Theming

**Use the `useOrgTheme` hook for branding:**

```typescript
import { useOrgTheme } from "@/hooks/use-org-theme";

export function MyComponent() {
  useOrgTheme(); // Applies CSS variables

  return (
    <div className="bg-[--org-primary] text-white">
      {/* Themed content */}
    </div>
  );
}
```

---

## Component Organization (Phase 8 Pattern)

**Feature-specific components stay in the same folder as page.tsx:**

```
voice-notes/
├── page.tsx                    # Main page
├── components/
│   ├── voice-note-card.tsx     # Feature-specific
│   ├── insight-card.tsx        # Feature-specific
│   └── comment-form.tsx        # Feature-specific
```

**Reusable components go in `@/components`:**
- `@/components/ui/` - shadcn/ui components (DON'T modify)
- `@/components/` - Reusable custom components

---

## Form Handling (Phase 8 Pattern)

**Use React Hook Form + Zod:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1, "Content required"),
});

export function CommentForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { content: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    // Submit to Convex mutation
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

---

## Visual Verification (REQUIRED for Phase 9)

**For ALL UI changes, use dev-browser skill:**

1. Dev server runs on http://localhost:3000 (usually already running)
2. Use Skill tool to invoke dev-browser
3. Login with: `neil.B@blablablak.com` / `lien1979`
4. Navigate to affected pages
5. Verify changes work as expected
6. Check for visual bugs, layout issues
7. Test on mobile viewport too

**Document in progress.txt:**
```
### Browser verification
- ✅ Verified on /orgs/[orgId]/coach/team-hub page
- ✅ Presence indicators render correctly
- ✅ No console errors
```

---

## Phase 9 Specific Guidelines

### Team Hub Components (NEW)

**New directory structure for Phase 9:**
```
team-hub/
├── page.tsx                       # Main Team Hub page
├── components/
│   ├── presence-indicators.tsx    # Week 1
│   ├── activity-feed-view.tsx     # Week 2
│   ├── insights-board-view.tsx    # Week 3
│   └── session-templates.tsx      # Week 3
```

### Real-Time Collaboration

**Phase 9 introduces real-time presence and comments. Key points:**

1. **Update presence on mount and navigation:**
   ```typescript
   useEffect(() => {
     updatePresence.mutate({
       userId,
       organizationId,
       teamId,
       currentView: "insights"
     });
   }, [pathname]);
   ```

2. **Subscribe to real-time updates:**
   ```typescript
   const presence = useQuery(api.models.teamCollaboration.getTeamPresence, {
     teamId,
     organizationId
   });
   // Automatically re-renders when data changes
   ```

---

## Common Mistakes to Avoid

1. **Not using skeletons** - Phase 8 standard is skeletons, not spinners
2. **Hardcoding organization colors** - Use CSS variables (`--org-primary`)
3. **Creating components in wrong location** - Feature-specific = same folder as page.tsx
4. **Not testing in browser** - Visual verification is REQUIRED
5. **Not using useQuery for real-time** - Convex subscriptions are automatic

---

**Last Updated:** January 30, 2026 (Phase 9 Week 1)
**Updated By:** Claude Sonnet 4.5
