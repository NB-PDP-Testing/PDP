import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

// ============================================================
// WHATSAPP WEBHOOK (TWILIO)
// ============================================================

/**
 * Twilio WhatsApp webhook handler
 * Receives incoming messages and triggers processing
 *
 * Twilio sends form-urlencoded POST requests with fields like:
 * - MessageSid: Unique message ID
 * - AccountSid: Twilio account ID
 * - From: "whatsapp:+1234567890"
 * - To: "whatsapp:+0987654321"
 * - Body: Text content (may be empty for media)
 * - NumMedia: Number of media attachments
 * - MediaUrl0, MediaContentType0: First media attachment
 */
http.route({
  path: "/whatsapp/incoming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("[WhatsApp Webhook] Received request");

    try {
      // Parse form data from Twilio
      const formData = await request.formData();

      const messageSid = formData.get("MessageSid") as string;
      const accountSid = formData.get("AccountSid") as string;
      const from = formData.get("From") as string;
      const to = formData.get("To") as string;
      const body = formData.get("Body") as string | null;
      const numMedia = Number.parseInt(
        (formData.get("NumMedia") as string) || "0",
        10
      );

      // Get first media attachment if present
      const mediaUrl =
        numMedia > 0 ? (formData.get("MediaUrl0") as string | null) : null;
      const mediaContentType =
        numMedia > 0
          ? (formData.get("MediaContentType0") as string | null)
          : null;

      console.log("[WhatsApp Webhook] Message from:", from);
      console.log("[WhatsApp Webhook] Body:", body?.substring(0, 100));
      console.log("[WhatsApp Webhook] NumMedia:", numMedia);

      // Validate required fields
      if (!(messageSid && accountSid && from && to)) {
        console.error("[WhatsApp Webhook] Missing required fields");
        return new Response("Missing required fields", { status: 400 });
      }

      // Optional: Validate Twilio signature
      // In production, verify X-Twilio-Signature header
      // For sandbox testing, we skip this

      // Process the message asynchronously
      await ctx.runAction(internal.actions.whatsapp.processIncomingMessage, {
        messageSid,
        accountSid,
        from,
        to,
        body: body || undefined,
        numMedia,
        mediaUrl: mediaUrl || undefined,
        mediaContentType: mediaContentType || undefined,
      });

      // Return TwiML response (empty response is fine for WhatsApp)
      // We send replies via the API instead of TwiML
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }
      );
    } catch (error) {
      console.error("[WhatsApp Webhook] Error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

/**
 * Twilio webhook verification (GET request)
 * Twilio may send a GET request to verify the endpoint
 */
http.route({
  path: "/whatsapp/incoming",
  method: "GET",
  handler: httpAction(
    async () =>
      new Response("WhatsApp webhook endpoint active", { status: 200 })
  ),
});

// ============================================================
// FEDERATION WEBHOOK
// ============================================================

/**
 * Federation webhook handler
 * Receives push notifications from federation systems when member data changes
 *
 * Expected payload:
 * {
 *   connectorId: string,
 *   federationOrgId: string,
 *   memberId: string,
 *   event: "created" | "updated" | "deleted",
 *   signature: string (HMAC-SHA256 of payload)
 * }
 */
http.route({
  path: "/webhooks/federation",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();

    console.log("[Federation Webhook] Received webhook request");

    try {
      // Parse JSON body
      const payload = await request.json();

      const { connectorId, federationOrgId, memberId, event, signature } =
        payload as {
          connectorId: string;
          federationOrgId: string;
          memberId: string;
          event: "created" | "updated" | "deleted";
          signature: string;
        };

      // Validate required fields
      if (!(connectorId && federationOrgId && memberId && event && signature)) {
        console.error("[Federation Webhook] Missing required fields", {
          hasConnectorId: Boolean(connectorId),
          hasFederationOrgId: Boolean(federationOrgId),
          hasMemberId: Boolean(memberId),
          hasEvent: Boolean(event),
          hasSignature: Boolean(signature),
        });
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate event type
      if (!["created", "updated", "deleted"].includes(event)) {
        console.error("[Federation Webhook] Invalid event type:", event);
        return new Response(JSON.stringify({ error: "Invalid event type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("[Federation Webhook] Processing webhook", {
        connectorId,
        federationOrgId,
        memberId,
        event,
      });

      // Process webhook asynchronously
      // This returns immediately (200 OK) to webhook sender
      // Actual processing happens in background action
      await ctx.runAction(internal.actions.federationWebhook.processWebhook, {
        connectorId,
        federationOrgId,
        memberId,
        event,
        signature,
        receivedAt: startTime,
      });

      console.log("[Federation Webhook] Webhook accepted and queued", {
        duration: Date.now() - startTime,
      });

      // Return 200 OK immediately
      return new Response(
        JSON.stringify({ status: "accepted", timestamp: startTime }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[Federation Webhook] Error processing webhook:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Federation webhook verification (GET request)
 * Allows federations to verify the endpoint is active
 */
http.route({
  path: "/webhooks/federation",
  method: "GET",
  handler: httpAction(
    async () =>
      new Response(
        JSON.stringify({
          status: "active",
          endpoint: "/webhooks/federation",
          methods: ["POST"],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
  ),
});

export default http;
