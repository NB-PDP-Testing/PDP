import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * PostHog Analytics Event Constants
 * Centralized event naming for backend tracking
 * Keep in sync with apps/web/src/lib/analytics.ts
 */
export const AnalyticsEvents = {
  // Authentication events
  USER_SIGNED_UP: "user_signed_up",
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
  USER_INVITED: "user_invited",
  INVITATION_ACCEPTED: "invitation_accepted",

  // Organization events
  ORG_CREATED: "organization_created",
  ORG_JOINED: "organization_joined",
  ORG_SETTINGS_UPDATED: "organization_settings_updated",
  ORG_DELETION_REQUESTED: "organization_deletion_requested",

  // Join request events
  JOIN_REQUEST_CREATED: "join_request_created",
  JOIN_REQUEST_APPROVED: "join_request_approved",
  JOIN_REQUEST_REJECTED: "join_request_rejected",

  // Team events
  TEAM_CREATED: "team_created",
  TEAM_UPDATED: "team_updated",
  TEAM_DELETED: "team_deleted",

  // Player events
  PLAYER_ENROLLED: "player_enrolled",
  PLAYERS_BULK_IMPORTED: "players_bulk_imported",
  PLAYER_UPDATED: "player_updated",
  PLAYER_DELETED: "player_deleted",

  // Voice note & AI events
  VOICE_NOTE_RECORDED: "voice_note_recorded",
  VOICE_NOTE_TRANSCRIBED: "voice_note_transcribed",
  AI_INSIGHT_GENERATED: "ai_insight_generated",
  AI_INSIGHT_APPLIED: "ai_insight_applied",

  // Skill assessment events
  SKILL_ASSESSMENT_STARTED: "skill_assessment_started",
  SKILL_ASSESSMENT_COMPLETED: "skill_assessment_completed",
  ASSESSMENTS_BATCH_RECORDED: "assessments_batch_recorded",

  // Goal events
  GOAL_CREATED: "goal_created",
  GOAL_UPDATED: "goal_updated",
  GOAL_STATUS_CHANGED: "goal_status_changed",
  GOAL_MILESTONE_COMPLETED: "goal_milestone_completed",
  GOAL_DELETED: "goal_deleted",

  // Injury events
  INJURY_REPORTED: "injury_reported",
  INJURY_STATUS_UPDATED: "injury_status_updated",
  INJURY_CLEARED: "injury_cleared",
  INJURY_DELETED: "injury_deleted",

  // Guardian/parent events
  GUARDIAN_LINKED_TO_PLAYER: "guardian_linked_to_player",
  GUARDIAN_INVITE_SENT: "guardian_invite_sent",
  GUARDIAN_ACCEPTED_LINK: "guardian_accepted_link",

  // Feature usage
  PARENT_DASHBOARD_ACCESSED: "parent_dashboard_accessed",
  BULK_IMPORT_STARTED: "bulk_import_started",
  BULK_IMPORT_COMPLETED: "bulk_import_completed",
  EXPORT_INITIATED: "export_initiated",
} as const;

/**
 * Track event from backend mutation/query
 * Sends event to PostHog and logs for debugging
 */
export function trackEvent(
  _ctx: MutationCtx | QueryCtx,
  event: {
    event: string;
    userId?: string;
    properties?: Record<string, any>;
  }
) {
  // Log to console for debugging (remove in production if needed)
  console.log("[Analytics]", event.event, event.properties || {});

  // TODO: Send to PostHog via API
  // For now, events are captured automatically via frontend
  // Backend tracking via PostHog API can be added later if needed

  // Optional: Store in analytics table for audit/backup
  // Uncomment if you create an analyticsEvents table
  /*
  try {
    await _ctx.db.insert("analyticsEvents", {
      event: event.event,
      userId: event.userId,
      properties: event.properties || {},
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to store analytics event:", error);
  }
  */
}

/**
 * Get current user ID from auth context
 */
export async function getUserId(
  ctx: MutationCtx | QueryCtx
): Promise<string | undefined> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject;
}

/**
 * Helper to track event with automatic user ID extraction
 */
export async function track(
  ctx: MutationCtx | QueryCtx,
  event: string,
  properties?: Record<string, any>
) {
  await trackEvent(ctx, {
    event,
    userId: await getUserId(ctx),
    properties,
  });
}
