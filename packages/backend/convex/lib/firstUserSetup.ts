/**
 * First User Onboarding Setup
 * Creates the initial platform onboarding flow for the very first user
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Creates the default first-user onboarding flow
 * Should be called when the first user signs up
 * @param userId - The user ID of the first user (from better-auth)
 */
export async function createFirstUserOnboardingFlow(
  ctx: MutationCtx,
  userId: string
): Promise<Id<"flows">> {
  // Check if a first-user onboarding flow already exists
  const existingFlow = await ctx.db
    .query("flows")
    .withIndex("by_scope", (q) => q.eq("scope", "platform"))
    .filter((q) => q.eq(q.field("type"), "onboarding"))
    .first();

  if (existingFlow) {
    // Flow already exists, just return its ID
    return existingFlow._id;
  }

  // Create the first-user onboarding flow
  const flowId = await ctx.db.insert("flows", {
    name: "Welcome to PlayerARC",
    description:
      "Get started with PlayerARC by creating your first organization",
    type: "onboarding",
    priority: "blocking",
    scope: "platform",
    createdBy: userId,
    createdByRole: "platform_staff",
    triggers: [],
    steps: [
      {
        id: "welcome",
        type: "page",
        title: "Welcome to PlayerARC",
        content: `# Welcome! 🎉

You're the first user on this PlayerARC platform. Let's get you set up with your first organization.

PlayerARC is a comprehensive player development platform designed to help sports clubs manage their players, teams, and coaching staff efficiently.

**What you'll do in this setup:**
1. Create your organization (club)
2. Set up your first team
3. Start managing your players

Let's get started!`,
        ctaText: "Let's Go",
        dismissible: false,
      },
      {
        id: "create-organization",
        type: "page",
        title: "Create Your Organization",
        content: `# Create Your First Organization

An organization represents your sports club or academy. You'll be able to create teams, manage players, and invite coaches within your organization.

**What you'll need:**
- Organization name (e.g., "Springfield FC")
- Sport type (Football, Soccer, Rugby, etc.)

Click continue to go to the organization creation page.`,
        ctaText: "Create Organization",
        ctaAction: "/orgs/create",
        dismissible: false,
      },
      {
        id: "setup-complete",
        type: "page",
        title: "You're All Set!",
        content: `# Setup Complete! 🎉

Congratulations! You've successfully set up your PlayerARC platform.

**What's next?**
- Create your first team
- Invite coaches to your organization
- Add players to your teams
- Start tracking player development

**As Platform Staff, you can also:**
- Create additional organizations
- Manage platform-wide settings
- Send announcements to all users

Ready to get started?`,
        ctaText: "Go to Dashboard",
        ctaAction: "/orgs/current",
        dismissible: false,
      },
    ],
    startDate: undefined,
    endDate: undefined,
    active: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return flowId;
}
