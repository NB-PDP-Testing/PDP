// @ts-nocheck
"use node";

/**
 * Federation Webhook Processor
 *
 * Handles incoming webhook notifications from federation systems.
 * Validates signatures, enforces rate limits, and processes events asynchronously.
 */

import crypto from "node:crypto";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

/**
 * Process incoming federation webhook
 *
 * Flow:
 * 1. Validate webhook signature (HMAC-SHA256)
 * 2. Check rate limits (max 100 webhooks/min per connector)
 * 3. Process event based on type:
 *    - created/updated: enqueue sync job for specific member
 *    - deleted: mark player as inactive (preserve audit trail)
 * 4. Log webhook event for debugging
 */
export const processWebhook = internalAction({
  args: {
    connectorId: v.string(),
    federationOrgId: v.string(),
    memberId: v.string(),
    event: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deleted")
    ),
    signature: v.string(),
    receivedAt: v.number(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      message: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const startTime = Date.now();

    console.log("[Webhook Processor] Processing webhook", {
      connectorId: args.connectorId,
      federationOrgId: args.federationOrgId,
      memberId: args.memberId,
      event: args.event,
    });

    try {
      // ===== STEP 1: Get connector and validate webhook secret =====

      const connector = await ctx.runQuery(
        api.models.federationConnectors.getConnector,
        { connectorId: args.connectorId as Id<"federationConnectors"> }
      );

      if (!connector) {
        console.error(
          `[Webhook Processor] Connector not found: ${args.connectorId}`
        );
        return {
          success: false,
          error: "Connector not found",
        };
      }

      if (!connector.webhookSecret) {
        console.error(
          `[Webhook Processor] Connector ${args.connectorId} has no webhook secret configured`
        );
        return {
          success: false,
          error: "Webhook secret not configured",
        };
      }

      // ===== STEP 2: Validate webhook signature =====

      const isValid = validateWebhookSignature({
        payload: {
          connectorId: args.connectorId,
          federationOrgId: args.federationOrgId,
          memberId: args.memberId,
          event: args.event,
        },
        signature: args.signature,
        secret: connector.webhookSecret,
      });

      if (!isValid) {
        console.error(
          "[Webhook Processor] Invalid webhook signature - rejecting"
        );
        // Log security event
        await ctx.runMutation(
          internal.models.federationConnectors.logWebhookSecurityEvent,
          {
            connectorId: args.connectorId as Id<"federationConnectors">,
            event: "invalid_signature",
            details: {
              federationOrgId: args.federationOrgId,
              memberId: args.memberId,
              timestamp: args.receivedAt,
            },
          }
        );
        return {
          success: false,
          error: "Invalid signature",
        };
      }

      console.log("[Webhook Processor] Signature validated successfully");

      // ===== STEP 3: Check rate limits =====

      const rateLimitOk = await ctx.runMutation(
        internal.models.federationConnectors.checkWebhookRateLimit,
        {
          connectorId: args.connectorId as Id<"federationConnectors">,
          limit: 100, // max 100 webhooks per minute
          windowMs: 60_000, // 1 minute window
        }
      );

      if (!rateLimitOk) {
        console.warn(
          `[Webhook Processor] Rate limit exceeded for connector ${args.connectorId}`
        );
        // Log security event
        await ctx.runMutation(
          internal.models.federationConnectors.logWebhookSecurityEvent,
          {
            connectorId: args.connectorId as Id<"federationConnectors">,
            event: "rate_limit_exceeded",
            details: {
              federationOrgId: args.federationOrgId,
              timestamp: args.receivedAt,
            },
          }
        );
        return {
          success: false,
          error: "Rate limit exceeded",
        };
      }

      // ===== STEP 4: Find organization by federationOrgId =====

      const connectedOrg = connector.connectedOrganizations.find(
        (org: {
          organizationId: string;
          federationOrgId: string;
          enabledAt: number;
          lastSyncAt?: number;
        }) => org.federationOrgId === args.federationOrgId
      );

      if (!connectedOrg) {
        console.error(
          `[Webhook Processor] Organization not found for federationOrgId: ${args.federationOrgId}`
        );
        return {
          success: false,
          error: "Organization not connected",
        };
      }

      // ===== STEP 5: Process event based on type =====

      switch (args.event) {
        case "created":
        case "updated": {
          // Enqueue sync job for specific member
          console.log(
            `[Webhook Processor] Enqueueing sync for ${args.event} member ${args.memberId}`
          );

          const jobId = await ctx.runMutation(
            api.models.syncQueue.enqueueSyncJob,
            {
              organizationId: connectedOrg.organizationId,
              connectorId: args.connectorId as Id<"federationConnectors">,
              syncType: "webhook",
            }
          );

          if (!jobId) {
            console.warn(
              "[Webhook Processor] Sync already in progress - webhook processed but sync not queued"
            );
            return {
              success: true,
              message: "Sync already in progress",
            };
          }

          console.log(`[Webhook Processor] Sync job queued: ${jobId}`);

          // Trigger sync asynchronously
          // Don't wait for sync to complete - just queue it
          ctx.runAction(api.actions.federationSyncEngine.syncWithQueue, {
            connectorId: args.connectorId as Id<"federationConnectors">,
            organizationId: connectedOrg.organizationId,
            syncType: "webhook",
          });

          break;
        }

        case "deleted": {
          // Mark player as inactive (preserve audit trail)
          console.log(
            `[Webhook Processor] Marking member ${args.memberId} as inactive`
          );

          // Find player by externalIds.foireann
          const player = await ctx.runQuery(
            api.models.playerIdentities.findByExternalId,
            {
              organizationId: connectedOrg.organizationId,
              externalIdType: "foireann",
              externalIdValue: args.memberId,
            }
          );

          if (player) {
            // Mark as inactive
            await ctx.runMutation(
              api.models.playerIdentities.markPlayerInactive,
              {
                playerIdentityId: player._id,
                reason: "Deleted from federation (webhook event)",
              }
            );

            console.log(
              `[Webhook Processor] Player ${player._id} marked as inactive`
            );
          } else {
            console.warn(
              `[Webhook Processor] Player not found for memberId: ${args.memberId}`
            );
          }

          break;
        }

        default: {
          // Should never happen due to validation earlier, but required by linter
          console.error(
            `[Webhook Processor] Unknown event type: ${args.event}`
          );
          return {
            success: false,
            error: "Unknown event type",
          };
        }
      }

      // ===== STEP 6: Log webhook event =====

      await ctx.runMutation(internal.models.federationConnectors.logWebhook, {
        connectorId: args.connectorId as Id<"federationConnectors">,
        organizationId: connectedOrg.organizationId,
        event: args.event,
        memberId: args.memberId,
        federationOrgId: args.federationOrgId,
        receivedAt: args.receivedAt,
        processedAt: Date.now(),
        success: true,
      });

      const duration = Date.now() - startTime;

      console.log("[Webhook Processor] Webhook processed successfully", {
        event: args.event,
        duration,
      });

      return {
        success: true,
        message: `Webhook processed: ${args.event} for member ${args.memberId}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error("[Webhook Processor] Error processing webhook:", error);

      // Log failed webhook
      try {
        await ctx.runMutation(internal.models.federationConnectors.logWebhook, {
          connectorId: args.connectorId as Id<"federationConnectors">,
          organizationId: args.federationOrgId, // Use federationOrgId as fallback
          event: args.event,
          memberId: args.memberId,
          federationOrgId: args.federationOrgId,
          receivedAt: args.receivedAt,
          processedAt: Date.now(),
          success: false,
          error: errorMessage,
        });
      } catch (logError) {
        console.error(
          "[Webhook Processor] Failed to log webhook error:",
          logError
        );
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

// ===== Helper Functions =====

/**
 * Validate webhook signature using HMAC-SHA256
 */
function validateWebhookSignature(options: {
  payload: {
    connectorId: string;
    federationOrgId: string;
    memberId: string;
    event: string;
  };
  signature: string;
  secret: string;
}): boolean {
  try {
    // Create canonical string from payload (sorted keys for consistency)
    const canonicalString = JSON.stringify(
      options.payload,
      Object.keys(options.payload).sort()
    );

    // Compute HMAC-SHA256
    const hmac = crypto.createHmac("sha256", options.secret);
    hmac.update(canonicalString);
    const expectedSignature = hmac.digest("hex");

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(options.signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[Webhook Validator] Error validating signature:", error);
    return false;
  }
}
