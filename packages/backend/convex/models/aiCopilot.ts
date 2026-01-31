/**
 * AI Copilot Backend Model
 * Provides smart suggestions and context-aware recommendations
 * Phase 9 Week 2: AI-powered coaching assistance
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get smart suggestions based on current context
 * Placeholder implementation - returns empty array for now
 * Will be implemented in US-P9-042 and US-P9-043
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
      action: v.string(), // Action identifier for frontend to execute
      confidence: v.number(), // 0-1 confidence score
    })
  ),
  handler: (_ctx, _args) => {
    // Placeholder implementation (US-P9-041)
    // Will be implemented in:
    // - US-P9-042: Insight context suggestions
    // - US-P9-043: Session planning suggestions
    return [];
  },
});
