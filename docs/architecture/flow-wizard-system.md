# Modular Wizard & Alert Pipeline System

## Overview

A flexible, reusable system for intercepting user flows to present guided wizards, announcements, alerts, and updates. Built to be modular and extensible for various use cases.

---

## Core Concepts

### 1. **Flow Types**

Different types of interceptable flows:

- **Onboarding Flows** - Multi-step guided setup (e.g., first-user wizard)
- **Announcements** - Important messages (e.g., new features, policy updates)
- **Action Required** - Urgent tasks (e.g., payment failed, terms updated)
- **Feature Tours** - Guided tours of new features
- **System Alerts** - Platform-wide notifications (e.g., maintenance window)

### 2. **Trigger Conditions**

When flows are activated:

```typescript
type TriggerCondition =
  | { type: "first_login"; role?: "platform_staff" | "admin" | "coach" | "parent" }
  | { type: "feature_flag"; flag: string }
  | { type: "user_property"; property: string; value: any }
  | { type: "date_range"; startDate: Date; endDate: Date }
  | { type: "version_upgrade"; fromVersion: string; toVersion: string }
  | { type: "custom"; checker: (user: User) => boolean };
```

### 3. **Flow Priority**

Flows can have different priorities:

- **Blocking** - Must complete before accessing app (e.g., first-user setup)
- **High Priority** - Shows immediately but can be dismissed (e.g., critical announcement)
- **Medium Priority** - Shows on next login (e.g., feature tour)
- **Low Priority** - Shows as a badge/notification (e.g., tips & tricks)

---

## Architecture

### Database Schema

```typescript
// packages/backend/convex/schema.ts

export default defineSchema({
  // Flow definitions - configured by platform staff
  flows: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("onboarding"),
      v.literal("announcement"),
      v.literal("action_required"),
      v.literal("feature_tour"),
      v.literal("system_alert")
    ),
    priority: v.union(
      v.literal("blocking"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),

    // Trigger conditions
    triggers: v.array(v.any()), // Array of TriggerCondition objects

    // Target audience
    targetRoles: v.optional(v.array(v.string())), // ["platform_staff", "admin", "coach"]
    targetOrganizations: v.optional(v.array(v.id("organizations"))),

    // Flow configuration
    steps: v.array(v.object({
      id: v.string(),
      type: v.union(
        v.literal("page"), // Full page wizard step
        v.literal("modal"), // Modal overlay
        v.literal("banner"), // Top banner
        v.literal("toast") // Toast notification
      ),
      title: v.string(),
      content: v.string(), // Markdown or HTML
      ctaText: v.optional(v.string()),
      ctaAction: v.optional(v.string()), // Route or action
      dismissible: v.boolean(),
    })),

    // Scheduling
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),

    // Status
    active: v.boolean(),
    createdBy: v.id("user"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_type", ["type"]),

  // Track user progress through flows
  userFlowProgress: defineTable({
    userId: v.id("user"),
    flowId: v.id("flows"),

    // Progress tracking
    currentStepId: v.optional(v.string()),
    completedStepIds: v.array(v.string()),

    // Status
    status: v.union(
      v.literal("pending"),    // Not started
      v.literal("in_progress"), // Started but not completed
      v.literal("completed"),   // All steps completed
      v.literal("dismissed"),   // User dismissed without completing
      v.literal("expired")      // Flow expired before completion
    ),

    // Metadata
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),

    // Analytics
    timeSpent: v.optional(v.number()), // milliseconds
    interactionCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_flow", ["userId", "flowId"])
    .index("by_status", ["status"]),
});
```

---

## Backend Implementation

### Flow Management Queries

```typescript
// packages/backend/convex/models/flows.ts

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Get active flows for the current user
 * Evaluates trigger conditions and returns applicable flows
 */
export const getActiveFlowsForUser = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Get all active flows
    const allFlows = await ctx.db
      .query("flows")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Filter flows based on trigger conditions and target audience
    const applicableFlows = [];

    for (const flow of allFlows) {
      // Check if user matches target roles
      if (flow.targetRoles && flow.targetRoles.length > 0) {
        const userRoles = await getUserRoles(ctx, user._id);
        const hasMatchingRole = flow.targetRoles.some(role =>
          userRoles.includes(role)
        );
        if (!hasMatchingRole) continue;
      }

      // Check if within date range
      const now = Date.now();
      if (flow.startDate && now < flow.startDate) continue;
      if (flow.endDate && now > flow.endDate) continue;

      // Check trigger conditions
      const shouldTrigger = await evaluateTriggers(ctx, flow.triggers, user);
      if (!shouldTrigger) continue;

      // Check if user has already completed/dismissed this flow
      const progress = await ctx.db
        .query("userFlowProgress")
        .withIndex("by_user_and_flow", (q) =>
          q.eq("userId", user._id).eq("flowId", flow._id)
        )
        .first();

      if (progress?.status === "completed" || progress?.status === "dismissed") {
        continue;
      }

      applicableFlows.push({
        ...flow,
        progress: progress || null,
      });
    }

    // Sort by priority (blocking > high > medium > low)
    const priorityOrder = { blocking: 0, high: 1, medium: 2, low: 3 };
    applicableFlows.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return applicableFlows;
  },
});

/**
 * Start a flow for the current user
 */
export const startFlow = mutation({
  args: {
    flowId: v.id("flows"),
  },
  returns: v.id("userFlowProgress"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if progress already exists
    const existing = await ctx.db
      .query("userFlowProgress")
      .withIndex("by_user_and_flow", (q) =>
        q.eq("userId", user._id).eq("flowId", args.flowId)
      )
      .first();

    if (existing) {
      // Update existing progress
      await ctx.db.patch(existing._id, {
        status: "in_progress",
        startedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new progress
    return await ctx.db.insert("userFlowProgress", {
      userId: user._id,
      flowId: args.flowId,
      currentStepId: undefined,
      completedStepIds: [],
      status: "in_progress",
      startedAt: Date.now(),
      interactionCount: 0,
    });
  },
});

/**
 * Complete a step in a flow
 */
export const completeFlowStep = mutation({
  args: {
    flowId: v.id("flows"),
    stepId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const progress = await ctx.db
      .query("userFlowProgress")
      .withIndex("by_user_and_flow", (q) =>
        q.eq("userId", user._id).eq("flowId", args.flowId)
      )
      .first();

    if (!progress) throw new Error("Flow progress not found");

    // Add step to completed steps
    const completedStepIds = [...progress.completedStepIds, args.stepId];

    // Check if all steps are completed
    const flow = await ctx.db.get(args.flowId);
    if (!flow) throw new Error("Flow not found");

    const allStepsCompleted = flow.steps.every(step =>
      completedStepIds.includes(step.id)
    );

    await ctx.db.patch(progress._id, {
      completedStepIds,
      currentStepId: undefined,
      status: allStepsCompleted ? "completed" : "in_progress",
      completedAt: allStepsCompleted ? Date.now() : undefined,
      interactionCount: progress.interactionCount + 1,
    });

    return null;
  },
});

/**
 * Dismiss a flow without completing it
 */
export const dismissFlow = mutation({
  args: {
    flowId: v.id("flows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const progress = await ctx.db
      .query("userFlowProgress")
      .withIndex("by_user_and_flow", (q) =>
        q.eq("userId", user._id).eq("flowId", args.flowId)
      )
      .first();

    if (!progress) throw new Error("Flow progress not found");

    await ctx.db.patch(progress._id, {
      status: "dismissed",
      dismissedAt: Date.now(),
    });

    return null;
  },
});

// Helper functions

async function getUserRoles(ctx: any, userId: string): Promise<string[]> {
  const roles = [];

  const user = await ctx.db.get(userId);
  if (user?.isPlatformStaff) roles.push("platform_staff");

  // Check organization memberships
  const memberships = await ctx.runQuery(
    components.betterAuth.adapter.findMany,
    {
      model: "member",
      paginationOpts: { cursor: null, numItems: 100 },
      where: [{ field: "userId", value: userId, operator: "eq" }],
    }
  );

  for (const membership of memberships.page) {
    roles.push(membership.role); // "owner", "admin", etc.
  }

  return roles;
}

async function evaluateTriggers(
  ctx: any,
  triggers: any[],
  user: any
): Promise<boolean> {
  if (triggers.length === 0) return true;

  for (const trigger of triggers) {
    if (trigger.type === "first_login") {
      // Check if this is user's first login
      const progress = await ctx.db
        .query("userFlowProgress")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!progress) return true; // No flows completed = first login
    }

    if (trigger.type === "user_property") {
      if (user[trigger.property] === trigger.value) return true;
    }

    // Add more trigger evaluations as needed
  }

  return false;
}
```

---

## Frontend Implementation

### Flow Interceptor Component

```typescript
// apps/web/src/components/flow-interceptor.tsx

"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@pdp/backend/convex/_generated/api";
import { FlowModal } from "./flow-modal";
import { FlowBanner } from "./flow-banner";
import { FlowPage } from "./flow-page";

export function FlowInterceptor({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeFlows = useQuery(api.models.flows.getActiveFlowsForUser);
  const startFlow = useMutation(api.models.flows.startFlow);
  const [currentFlow, setCurrentFlow] = useState<any>(null);

  useEffect(() => {
    if (!activeFlows || activeFlows.length === 0) {
      setCurrentFlow(null);
      return;
    }

    // Get the highest priority flow
    const flow = activeFlows[0];

    // Skip if we're already in a flow route
    if (pathname.startsWith("/flow/") || pathname.startsWith("/setup/")) {
      return;
    }

    // Handle blocking flows
    if (flow.priority === "blocking") {
      // Start the flow if not already started
      if (!flow.progress) {
        startFlow({ flowId: flow._id });
      }

      // Redirect to flow page
      const firstStep = flow.steps[0];
      if (firstStep.type === "page") {
        router.push(`/flow/${flow._id}/${firstStep.id}`);
        return;
      }
    }

    setCurrentFlow(flow);
  }, [activeFlows, pathname, router, startFlow]);

  // Render flow based on type
  if (!currentFlow) {
    return <>{children}</>;
  }

  const currentStep = currentFlow.steps.find(
    (step: any) => step.id === currentFlow.progress?.currentStepId
  ) || currentFlow.steps[0];

  switch (currentStep.type) {
    case "modal":
      return (
        <>
          {children}
          <FlowModal flow={currentFlow} step={currentStep} />
        </>
      );

    case "banner":
      return (
        <>
          <FlowBanner flow={currentFlow} step={currentStep} />
          {children}
        </>
      );

    case "page":
      return <FlowPage flow={currentFlow} step={currentStep} />;

    default:
      return <>{children}</>;
  }
}
```

### Flow Components

```typescript
// apps/web/src/components/flow-modal.tsx

"use client";

import { useMutation } from "convex/react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "@pdp/backend/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

export function FlowModal({ flow, step }: { flow: any; step: any }) {
  const completeStep = useMutation(api.models.flows.completeFlowStep);
  const dismissFlow = useMutation(api.models.flows.dismissFlow);

  const handleContinue = async () => {
    await completeStep({ flowId: flow._id, stepId: step.id });
  };

  const handleDismiss = async () => {
    if (step.dismissible) {
      await dismissFlow({ flowId: flow._id });
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          {step.dismissible && (
            <button
              className="absolute top-4 right-4 opacity-70 hover:opacity-100"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </DialogHeader>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{step.content}</ReactMarkdown>
        </div>
        <div className="flex justify-end gap-2">
          {step.dismissible && (
            <Button variant="outline" onClick={handleDismiss}>
              Skip
            </Button>
          )}
          <Button onClick={handleContinue}>
            {step.ctaText || "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Integration in Root Layout

```typescript
// apps/web/src/app/layout.tsx

import { FlowInterceptor } from "@/components/flow-interceptor";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <FlowInterceptor>
            {children}
          </FlowInterceptor>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

---

## Platform Staff Admin UI

### Flow Management Dashboard

```typescript
// apps/web/src/app/platform/flows/page.tsx

"use client";

import { useQuery } from "convex/react";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { api } from "@pdp/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FlowsManagementPage() {
  const flows = useQuery(api.models.flows.getAllFlows);

  if (!flows) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Flow Management</h1>
          <p className="text-muted-foreground">
            Create and manage user flows, wizards, and announcements
          </p>
        </div>
        <Link href="/platform/flows/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Flow
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Target Roles</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flows.map((flow) => (
            <TableRow key={flow._id}>
              <TableCell className="font-medium">{flow.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{flow.type}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    flow.priority === "blocking"
                      ? "destructive"
                      : flow.priority === "high"
                        ? "default"
                        : "secondary"
                  }
                >
                  {flow.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={flow.active ? "success" : "secondary"}>
                  {flow.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {flow.targetRoles?.join(", ") || "All roles"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Link href={`/platform/flows/${flow._id}/preview`}>
                    <Button size="icon" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/platform/flows/${flow._id}/edit`}>
                    <Button size="icon" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button size="icon" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Use Cases & Examples

### 1. **First-User Onboarding** (Already Implemented!)

```typescript
const firstUserFlow = {
  name: "First User Onboarding",
  type: "onboarding",
  priority: "blocking",
  triggers: [
    { type: "first_login", role: "platform_staff" },
    { type: "user_property", property: "isPlatformStaff", value: true }
  ],
  targetRoles: ["platform_staff"],
  steps: [
    {
      id: "welcome",
      type: "page",
      title: "Welcome to PDP Platform Setup",
      content: "You're the first user! Let's set up your platform together.",
      ctaText: "Get Started",
      dismissible: false,
    },
    {
      id: "create_org",
      type: "page",
      title: "Create Your First Organization",
      content: "Set up your sports club or organization",
      ctaText: "Continue",
      dismissible: false,
    },
    {
      id: "complete",
      type: "page",
      title: "Setup Complete!",
      content: "Your platform is ready. Let's get started!",
      ctaText: "Go to Dashboard",
      dismissible: false,
    }
  ],
  active: true,
};
```

### 2. **New Feature Announcement**

```typescript
const newFeatureFlow = {
  name: "Voice Notes Feature Launch",
  type: "announcement",
  priority: "high",
  triggers: [
    { type: "date_range", startDate: new Date("2026-02-01"), endDate: new Date("2026-02-07") }
  ],
  targetRoles: ["coach", "admin"],
  steps: [
    {
      id: "announcement",
      type: "modal",
      title: "🎉 New Feature: Voice Notes!",
      content: `
        **Record your observations on the go!**

        Coaches can now record voice notes during training sessions and matches.
        AI automatically transcribes and extracts insights.

        Try it today in the Coach dashboard → Voice Notes
      `,
      ctaText: "Try Voice Notes",
      ctaAction: "/orgs/current/coach/voice-notes",
      dismissible: true,
    }
  ],
  active: true,
};
```

### 3. **Critical System Alert**

```typescript
const maintenanceAlert = {
  name: "Scheduled Maintenance Alert",
  type: "system_alert",
  priority: "high",
  triggers: [
    { type: "date_range", startDate: new Date("2026-02-14"), endDate: new Date("2026-02-15") }
  ],
  targetRoles: null, // All users
  steps: [
    {
      id: "alert",
      type: "banner",
      title: "Scheduled Maintenance",
      content: "⚠️ The platform will be under maintenance on Feb 15, 2-4 AM EST. Some features may be unavailable.",
      dismissible: true,
    }
  ],
  active: true,
};
```

### 4. **Feature Tour for Coaches**

```typescript
const coachTour = {
  name: "Coach Dashboard Tour",
  type: "feature_tour",
  priority: "medium",
  triggers: [
    { type: "first_login", role: "coach" }
  ],
  targetRoles: ["coach"],
  steps: [
    {
      id: "step1",
      type: "modal",
      title: "Welcome, Coach!",
      content: "Let's take a quick tour of your dashboard",
      ctaText: "Start Tour",
      dismissible: true,
    },
    {
      id: "step2",
      type: "modal",
      title: "Assess Your Players",
      content: "Track skill development with our assessment tools",
      ctaText: "Next",
      dismissible: true,
    },
    {
      id: "step3",
      type: "modal",
      title: "Set Goals",
      content: "Create personalized development goals for each player",
      ctaText: "Got It",
      dismissible: true,
    }
  ],
  active: true,
};
```

### 5. **Payment Reminder (Action Required)**

```typescript
const paymentFlow = {
  name: "Payment Update Required",
  type: "action_required",
  priority: "blocking",
  triggers: [
    { type: "user_property", property: "subscriptionStatus", value: "past_due" }
  ],
  targetRoles: ["owner", "admin"],
  steps: [
    {
      id: "payment",
      type: "modal",
      title: "Payment Required",
      content: `
        Your payment method has expired.
        Please update your payment information to continue using PDP.
      `,
      ctaText: "Update Payment",
      ctaAction: "/settings/billing",
      dismissible: false,
    }
  ],
  active: true,
};
```

---

## Advanced Features

### Analytics & Insights

Track flow performance:

```typescript
// Flow completion rates
const analytics = await ctx.db
  .query("userFlowProgress")
  .withIndex("by_status")
  .collect();

const completionRate = analytics.filter(p => p.status === "completed").length / analytics.length;
const dismissalRate = analytics.filter(p => p.status === "dismissed").length / analytics.length;
const avgTimeSpent = analytics.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / analytics.length;
```

### A/B Testing

Test different flow variations:

```typescript
const flowVariants = {
  flowId: "new_feature_tour",
  variants: [
    { id: "variant_a", weight: 0.5, steps: [...] },
    { id: "variant_b", weight: 0.5, steps: [...] },
  ]
};
```

### Multi-Organization Targeting

Target specific organizations:

```typescript
const orgSpecificFlow = {
  name: "Organization-Specific Training",
  targetOrganizations: ["org_123", "org_456"],
  // ... rest of flow
};
```

### Scheduled Flows

Set up flows for future dates:

```typescript
const scheduledFlow = {
  name: "New Year Feature Update",
  startDate: new Date("2027-01-01").getTime(),
  endDate: new Date("2027-01-07").getTime(),
  // ... rest of flow
};
```

---

## Organization-Level Announcements (Future Feature)

### Overview

Allow **organization admins** to create announcements and alerts for their organization members. This creates a powerful communication channel between club administrators and coaches/parents.

### Permission Levels

```typescript
type FlowScope =
  | "platform"      // Platform staff only - all organizations
  | "organization"  // Org admins - their organization only
  | "team";         // Team admins - their team only (future)
```

### Enhanced Schema

```typescript
// Add to flows table
flows: defineTable({
  // ... existing fields ...

  // Scope & Permissions
  scope: v.union(
    v.literal("platform"),
    v.literal("organization"),
    v.literal("team")
  ),

  // Who created this flow
  createdBy: v.id("user"),
  createdByRole: v.union(
    v.literal("platform_staff"),
    v.literal("org_admin"),
    v.literal("team_admin")
  ),

  // Organization context (null for platform-wide flows)
  organizationId: v.optional(v.id("organizations")),

  // Audience within organization
  targetAudience: v.optional(v.union(
    v.literal("all_members"),      // Everyone in org
    v.literal("coaches"),           // Only coaches
    v.literal("parents"),           // Only parents/guardians
    v.literal("admins"),            // Only org admins
    v.literal("specific_teams"),    // Specific teams
  )),

  // If targetAudience is "specific_teams"
  targetTeamIds: v.optional(v.array(v.id("teams"))),

  // ... rest of fields
})
  .index("by_organization", ["organizationId"])
  .index("by_scope", ["scope"]);
```

### Organization Admin Flow Creation

```typescript
// packages/backend/convex/models/flows.ts

/**
 * Create a flow (organization-scoped)
 * Organization admins can create flows for their org members
 */
export const createOrganizationFlow = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    type: v.union(
      v.literal("announcement"),
      v.literal("action_required"),
      v.literal("system_alert")
    ),
    priority: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    targetAudience: v.union(
      v.literal("all_members"),
      v.literal("coaches"),
      v.literal("parents"),
      v.literal("admins")
    ),
    targetTeamIds: v.optional(v.array(v.id("teams"))),
    steps: v.array(v.any()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.id("flows"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Verify user is admin of this organization
    const membership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: user._id, operator: "eq" },
          { field: "organizationId", value: args.organizationId, operator: "eq" },
        ],
      }
    );

    if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
      throw new Error("Only organization admins can create flows");
    }

    // Create the flow
    const flowId = await ctx.db.insert("flows", {
      name: args.name,
      type: args.type,
      priority: args.priority,
      scope: "organization",
      organizationId: args.organizationId,
      targetAudience: args.targetAudience,
      targetTeamIds: args.targetTeamIds,
      triggers: [
        { type: "organization_member", organizationId: args.organizationId }
      ],
      targetRoles: null, // Handled by targetAudience
      targetOrganizations: [args.organizationId],
      steps: args.steps,
      startDate: args.startDate,
      endDate: args.endDate,
      active: true,
      createdBy: user._id,
      createdByRole: membership.role === "owner" ? "org_admin" : "org_admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return flowId;
  },
});

/**
 * Get flows for user's current organization
 * Called when user is viewing a specific organization
 */
export const getOrganizationFlows = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Get organization-scoped flows
    const orgFlows = await ctx.db
      .query("flows")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Filter based on user's role in the organization
    const userMembership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: user._id, operator: "eq" },
          { field: "organizationId", value: args.organizationId, operator: "eq" },
        ],
      }
    );

    if (!userMembership) return [];

    // Filter flows based on targetAudience
    const applicableFlows = [];

    for (const flow of orgFlows) {
      // Check date range
      const now = Date.now();
      if (flow.startDate && now < flow.startDate) continue;
      if (flow.endDate && now > flow.endDate) continue;

      // Check target audience
      if (flow.targetAudience === "all_members") {
        applicableFlows.push(flow);
        continue;
      }

      if (flow.targetAudience === "admins") {
        if (userMembership.role === "admin" || userMembership.role === "owner") {
          applicableFlows.push(flow);
        }
        continue;
      }

      if (flow.targetAudience === "coaches") {
        // Check if user is a coach in this org
        const isCoach = await checkIfUserIsCoach(ctx, user._id, args.organizationId);
        if (isCoach) {
          applicableFlows.push(flow);
        }
        continue;
      }

      if (flow.targetAudience === "parents") {
        // Check if user is a parent/guardian in this org
        const isParent = await checkIfUserIsParent(ctx, user._id, args.organizationId);
        if (isParent) {
          applicableFlows.push(flow);
        }
        continue;
      }

      if (flow.targetAudience === "specific_teams" && flow.targetTeamIds) {
        // Check if user is member of any target teams
        const userTeams = await getUserTeams(ctx, user._id, args.organizationId);
        const hasMatchingTeam = flow.targetTeamIds.some(teamId =>
          userTeams.includes(teamId)
        );
        if (hasMatchingTeam) {
          applicableFlows.push(flow);
        }
        continue;
      }
    }

    // Filter out flows user has already completed/dismissed
    const applicableFlowsWithProgress = [];
    for (const flow of applicableFlows) {
      const progress = await ctx.db
        .query("userFlowProgress")
        .withIndex("by_user_and_flow", (q) =>
          q.eq("userId", user._id).eq("flowId", flow._id)
        )
        .first();

      if (progress?.status === "completed" || progress?.status === "dismissed") {
        continue;
      }

      applicableFlowsWithProgress.push({
        ...flow,
        progress: progress || null,
      });
    }

    return applicableFlowsWithProgress;
  },
});

// Helper functions
async function checkIfUserIsCoach(ctx: any, userId: string, orgId: string): Promise<boolean> {
  const assignments = await ctx.db
    .query("coachAssignments")
    .filter((q) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("organizationId"), orgId)
      )
    )
    .first();

  return !!assignments;
}

async function checkIfUserIsParent(ctx: any, userId: string, orgId: string): Promise<boolean> {
  const guardianIdentity = await ctx.db
    .query("guardianIdentities")
    .filter((q) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("organizationId"), orgId)
      )
    )
    .first();

  return !!guardianIdentity;
}

async function getUserTeams(ctx: any, userId: string, orgId: string): Promise<string[]> {
  // Check coach team assignments
  const coachAssignments = await ctx.db
    .query("coachAssignments")
    .filter((q) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("organizationId"), orgId)
      )
    )
    .collect();

  const teamIds = coachAssignments.map((a: any) => a.teamId);

  // TODO: Check if user is a parent of players in teams
  // const playerTeams = await getPlayerTeams(ctx, userId, orgId);

  return [...new Set(teamIds)];
}
```

### Organization Admin UI

```typescript
// apps/web/src/app/orgs/[orgId]/admin/announcements/page.tsx

"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Megaphone, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@pdp/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrganizationAnnouncementsPage({
  params,
}: {
  params: { orgId: string };
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const orgFlows = useQuery(api.models.flows.getOrganizationFlows, {
    organizationId: params.orgId,
  });
  const createFlow = useMutation(api.models.flows.createOrganizationFlow);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    type: "announcement" as const,
    priority: "medium" as const,
    targetAudience: "all_members" as const,
  });

  const handleCreateAnnouncement = async () => {
    try {
      await createFlow({
        organizationId: params.orgId,
        name: formData.name,
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        steps: [
          {
            id: "announcement",
            type: "modal",
            title: formData.name,
            content: formData.content,
            ctaText: "Got It",
            dismissible: true,
          },
        ],
      });

      toast.success("Announcement created successfully!");
      setShowCreateDialog(false);
      setFormData({
        name: "",
        content: "",
        type: "announcement",
        priority: "medium",
        targetAudience: "all_members",
      });
    } catch (error) {
      toast.error("Failed to create announcement");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Organization Announcements</h1>
          <p className="text-muted-foreground">
            Send announcements and alerts to your organization members
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Active Announcements
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {orgFlows?.filter((f) => f.active).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Reach</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">-</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Scheduled
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {orgFlows?.filter((f) => f.startDate && f.startDate > Date.now())
                .length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <div className="grid gap-4">
        {orgFlows?.map((flow) => (
          <Card key={flow._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{flow.name}</CardTitle>
                  <CardDescription>
                    Target: {flow.targetAudience.replace("_", " ")} •{" "}
                    Priority: {flow.priority}
                  </CardDescription>
                </div>
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {flow.steps[0]?.content.substring(0, 150)}...
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Announcement Title</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Season Schedule Update"
                value={formData.name}
              />
            </div>

            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea
                className="min-h-[150px]"
                id="content"
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Write your announcement here..."
                value={formData.content}
              />
              <p className="mt-1 text-muted-foreground text-xs">
                Supports Markdown formatting
              </p>
            </div>

            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Select
                onValueChange={(value: any) =>
                  setFormData({ ...formData, targetAudience: value })
                }
                value={formData.targetAudience}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_members">
                    All Organization Members
                  </SelectItem>
                  <SelectItem value="coaches">Coaches Only</SelectItem>
                  <SelectItem value="parents">Parents Only</SelectItem>
                  <SelectItem value="admins">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                onValueChange={(value: any) =>
                  setFormData({ ...formData, priority: value })
                }
                value={formData.priority}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    High (Shows immediately)
                  </SelectItem>
                  <SelectItem value="medium">
                    Medium (Shows on next login)
                  </SelectItem>
                  <SelectItem value="low">Low (Notification only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!formData.name || !formData.content}
                onClick={handleCreateAnnouncement}
              >
                Create Announcement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Use Cases - Organization-Level

#### 1. **Season Schedule Announcement**

```typescript
// Org admin creates announcement for all members
{
  name: "2026 Season Schedule Released",
  type: "announcement",
  priority: "high",
  targetAudience: "all_members",
  content: `
    # 2026 Season Schedule Now Available!

    The full season schedule has been released.

    **First Match**: March 15, 2026 vs. Westside FC
    **Home Games**: 8 games at St. Francis grounds
    **Away Games**: 6 games

    View the full schedule in the Teams section.
  `
}
```

#### 2. **Coach-Only Training Update**

```typescript
// Target coaches only
{
  name: "New Training Methodology Workshop",
  type: "announcement",
  priority: "medium",
  targetAudience: "coaches",
  content: `
    All coaches are invited to a training workshop on February 20th.

    **Topic**: Modern Player Development Techniques
    **Time**: 7:00 PM
    **Location**: Clubhouse

    Please confirm attendance by Friday.
  `
}
```

#### 3. **Parent Fee Reminder**

```typescript
// Target parents/guardians only
{
  name: "Registration Fee Due Reminder",
  type: "action_required",
  priority: "high",
  targetAudience: "parents",
  content: `
    Registration fees for the spring season are due by March 1st.

    **Amount**: €150 per player
    **Payment Methods**: Bank transfer or card

    Please complete payment to secure your child's place.
  `
}
```

#### 4. **Emergency Weather Alert**

```typescript
// All members, urgent
{
  name: "Training Cancelled - Weather Alert",
  type: "system_alert",
  priority: "high",
  targetAudience: "all_members",
  startDate: Date.now(),
  endDate: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  content: `
    ⚠️ All training sessions cancelled today due to severe weather.

    We'll resume normal schedule tomorrow.
    Stay safe!
  `
}
```

#### 5. **Team-Specific Announcement**

```typescript
// Target specific teams only
{
  name: "U12 Team - Tournament This Weekend",
  type: "announcement",
  priority: "high",
  targetAudience: "specific_teams",
  targetTeamIds: ["team_u12_boys"],
  content: `
    U12 Boys team - Tournament reminder!

    **Date**: Saturday, March 10th
    **Location**: City Sports Complex
    **Arrival**: 8:00 AM sharp
    **Bring**: Full kit, water bottle, snacks

    Good luck team!
  `
}
```

### Updated Flow Interceptor

```typescript
// apps/web/src/components/flow-interceptor.tsx

export function FlowInterceptor({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const orgId = extractOrgIdFromPath(pathname); // Helper to get current org

  // Get platform-wide flows
  const platformFlows = useQuery(api.models.flows.getActiveFlowsForUser);

  // Get organization-specific flows (if viewing an org)
  const orgFlows = useQuery(
    orgId ? api.models.flows.getOrganizationFlows : "skip",
    orgId ? { organizationId: orgId } : "skip"
  );

  // Combine and prioritize flows
  const allFlows = [...(platformFlows || []), ...(orgFlows || [])];

  // ... rest of interceptor logic
}
```

### Permission Matrix

| Role | Platform Flows | Org Flows (Own Org) | Org Flows (Other Orgs) |
|------|----------------|---------------------|------------------------|
| **Platform Staff** | Create, Edit, Delete | View, Edit | View, Edit |
| **Org Owner** | View (if targeted) | Create, Edit, Delete | View (if targeted) |
| **Org Admin** | View (if targeted) | Create, Edit, Delete | View (if targeted) |
| **Coach** | View (if targeted) | View (if targeted) | View (if targeted) |
| **Parent** | View (if targeted) | View (if targeted) | View (if targeted) |

---

## Migration Path

### Phase 1: Refactor Existing First-User Wizard

1. Keep existing `/setup/*` pages as-is
2. Create a "First User Onboarding" flow in the database
3. Update `FlowInterceptor` to recognize and redirect to existing pages
4. No breaking changes

### Phase 2: Build Flow Management UI

1. Create platform admin pages at `/platform/flows/*`
2. Allow platform staff to create/edit flows
3. Add flow preview functionality

### Phase 3: Implement New Flow Types

1. Start with announcements (modal type)
2. Add banner type for alerts
3. Gradually migrate features to the modular system

### Phase 4: Advanced Features

1. Add A/B testing
2. Add analytics dashboard
3. Add flow templates library

---

## Benefits

✅ **Reusable** - One system for onboarding, announcements, tours, alerts
✅ **Flexible** - Multiple display types (page, modal, banner, toast)
✅ **Targeted** - Role-based, org-based, date-based targeting
✅ **Prioritized** - Blocking vs. dismissible flows
✅ **Tracked** - Full analytics on flow performance
✅ **No Code** - Platform staff can create flows without developer help
✅ **Future-Proof** - Easy to extend for new use cases

---

## Example: Platform Staff Login Interception

When a platform staff member logs in:

1. **FlowInterceptor** checks for active flows
2. Finds "Critical Security Update" announcement (high priority, modal)
3. Shows modal overlay with update details
4. After dismissal, checks for "New Analytics Dashboard" feature tour (medium priority)
5. Shows banner at top of page with "Take a Tour" CTA
6. Platform staff can dismiss or engage with flows
7. All interactions tracked for analytics

This creates a non-intrusive but effective communication channel!

---

## Next Steps

Would you like me to:

1. **Implement the core flow system** (schema + backend queries)?
2. **Refactor the existing first-user wizard** to use this system?
3. **Create the platform staff admin UI** for flow management?
4. **Build flow components** (modal, banner, page templates)?
5. **Set up analytics tracking** for flow performance?

Let me know which direction you'd like to explore first!
