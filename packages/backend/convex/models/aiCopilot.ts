/**
 * AI Copilot Backend Model
 * Provides smart suggestions and context-aware recommendations
 * Phase 9 Week 2: AI-powered coaching assistance
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

/**
 * Get smart suggestions based on current context
 * Implemented in US-P9-042 (insight context) and US-P9-043 (session planning)
 */
export const getSmartSuggestions = query({
  args: {
    context: v.union(
      v.literal("viewing_insight"),
      v.literal("creating_session"),
      v.literal("viewing_activity"),
      v.literal("viewing_player_passport")
    ),
    contextId: v.string(), // ID of the insight, session, etc.
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      type: v.union(
        v.literal("apply_insight"),
        v.literal("mention_coach"),
        v.literal("add_to_session"),
        v.literal("create_task"),
        v.literal("link_observation")
      ),
      title: v.string(),
      description: v.string(),
      reasoning: v.string(), // Why this suggestion is being made
      action: v.string(), // Action identifier for frontend to execute
      confidence: v.number(), // 0-1 confidence score
    })
  ),
  handler: async (ctx, args) => {
    // Route to appropriate suggestion generator based on context
    if (args.context === "viewing_insight") {
      return await generateInsightSuggestions(ctx, args);
    }

    if (args.context === "creating_session") {
      return await generateSessionSuggestions(ctx, args);
    }

    // Other contexts not implemented yet
    return [];
  },
});

/**
 * Generate smart suggestions when viewing an insight
 * US-P9-042: Insight context suggestions
 */
async function generateInsightSuggestions(
  ctx: any,
  args: {
    contextId: string;
    userId: string;
    organizationId: string;
  }
) {
  // Get insight details
  const insight = await ctx.db.get(args.contextId as Id<"voiceNoteInsights">);
  if (!insight) {
    return [];
  }

  const suggestions: Array<{
    type:
      | "apply_insight"
      | "mention_coach"
      | "add_to_session"
      | "create_task"
      | "link_observation";
    title: string;
    description: string;
    reasoning: string;
    action: string;
    confidence: number;
  }> = [];

  // Suggestion 1: If injury/medical category → suggest medical staff mention
  if (insight.category === "injury" || insight.category === "medical") {
    // Get coaches with medical/first-aid roles
    const members = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      where: [
        {
          field: "organizationId",
          value: args.organizationId as any,
          operator: "eq",
        },
      ],
      paginationOpts: {
        cursor: null,
        numItems: 100,
      },
    });

    const medicalCoaches = members.data.filter(
      (m: any) =>
        m.activeFunctionalRole === "medical" ||
        m.activeFunctionalRole === "first_aid"
    );

    if (medicalCoaches.length > 0) {
      suggestions.push({
        type: "mention_coach",
        title: "Notify Medical Staff",
        description: `Alert medical staff about this ${insight.category} observation`,
        reasoning:
          "Injury/medical insights should be reviewed by qualified medical staff immediately",
        action: "mention:medical",
        confidence: 0.9,
      });
    }
  }

  // Suggestion 2: If skill category → suggest add to session plan
  if (insight.category === "skill") {
    suggestions.push({
      type: "add_to_session",
      title: "Add to Next Session",
      description: `Include ${insight.title} in upcoming training plan`,
      reasoning:
        "Skill development insights should be incorporated into training sessions for targeted improvement",
      action: `add_to_session:${args.contextId}`,
      confidence: 0.8,
    });
  }

  // Suggestion 3: If unread by teammates → suggest mention coaches
  // Check if there are comments - if not, suggest engaging team
  const comments = await ctx.db
    .query("insightComments")
    .withIndex("by_insight", (q: any) =>
      q.eq("insightId", args.contextId as Id<"voiceNoteInsights">)
    )
    .collect();

  if (comments.length === 0) {
    suggestions.push({
      type: "mention_coach",
      title: "Engage Your Team",
      description: "Tag relevant coaches to get their input on this insight",
      reasoning:
        "No comments yet - getting team feedback can provide valuable perspectives",
      action: "mention:team",
      confidence: 0.7,
    });
  }

  // Suggestion 4: If applied status → suggest creating follow-up task
  if (insight.status === "applied") {
    suggestions.push({
      type: "create_task",
      title: "Create Follow-up Task",
      description: "Track progress on this applied insight",
      reasoning:
        "Applied insights benefit from follow-up tasks to ensure consistent progress tracking",
      action: `create_task:${args.contextId}`,
      confidence: 0.65,
    });
  }

  // Suggestion 5: Always suggest applying insight if pending
  if (insight.status === "pending") {
    suggestions.push({
      type: "apply_insight",
      title: "Apply This Insight",
      description: `Mark this ${insight.category} insight as applied`,
      reasoning:
        "Pending insights should be reviewed and marked as applied to track coaching effectiveness",
      action: `apply:${args.contextId}`,
      confidence: 0.75,
    });
  }

  // Sort by confidence descending and return top 4
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

/**
 * Generate smart suggestions when creating a session plan
 * US-P9-043: Session planning suggestions
 */
async function generateSessionSuggestions(
  ctx: any,
  args: {
    contextId: string;
    userId: string;
    organizationId: string;
  }
) {
  const suggestions: Array<{
    type:
      | "apply_insight"
      | "mention_coach"
      | "add_to_session"
      | "create_task"
      | "link_observation";
    title: string;
    description: string;
    reasoning: string;
    action: string;
    confidence: number;
  }> = [];

  // Get recent insights for the organization (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentInsights = await ctx.db
    .query("voiceNoteInsights")
    .withIndex("by_org", (q: any) =>
      q.eq("organizationId", args.organizationId)
    )
    .filter((q: any) => q.gte(q.field("_creationTime"), sevenDaysAgo))
    .collect();

  // Check for recent injuries
  const hasRecentInjuries = recentInsights.some(
    (insight: any) =>
      insight.category === "injury" && insight.status !== "dismissed"
  );

  if (hasRecentInjuries) {
    suggestions.push({
      type: "create_task",
      title: "Include Injury Status Checks",
      description:
        "Recent injuries reported - add status check to session plan",
      reasoning:
        "Recent injury reports indicate players may need modified activity levels",
      action: "check_injuries",
      confidence: 0.9,
    });
  }

  // Check for skill gaps
  const hasSkillGaps = recentInsights.some(
    (insight: any) =>
      insight.category === "skill" &&
      insight.description.toLowerCase().includes("improve")
  );

  if (hasSkillGaps) {
    suggestions.push({
      type: "add_to_session",
      title: "Add Focused Skill Drills",
      description:
        "Skill gaps identified - include targeted training exercises",
      reasoning:
        "Coaches have identified areas for improvement that need focused practice",
      action: "add_drills",
      confidence: 0.8,
    });
  }

  // Check for equipment mentions
  const hasEquipmentMentions = recentInsights.some(
    (insight: any) =>
      insight.description.toLowerCase().includes("equipment") ||
      insight.description.toLowerCase().includes("gear") ||
      insight.description.toLowerCase().includes("ball")
  );

  if (hasEquipmentMentions) {
    suggestions.push({
      type: "create_task",
      title: "Prepare Equipment List",
      description: "Equipment mentioned in recent insights - create checklist",
      reasoning:
        "Equipment requirements noted in recent observations should be prepared in advance",
      action: "equipment_list",
      confidence: 0.7,
    });
  }

  // Sort by confidence descending and return top 3
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}
