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

// ============================================================
// META WHATSAPP WEBHOOK
// ============================================================

/**
 * Meta webhook verification (GET request)
 * Meta sends: GET /whatsapp/meta/webhook?hub.mode=subscribe&hub.challenge=NONCE&hub.verify_token=TOKEN
 * Respond with hub.challenge if token matches META_WEBHOOK_VERIFY_TOKEN env var.
 */
http.route({
  path: "/whatsapp/meta/webhook",
  method: "GET",
  handler: httpAction((_ctx, request) => {
    const url = new URL(request.url);
    const hubMode = url.searchParams.get("hub.mode");
    const hubChallenge = url.searchParams.get("hub.challenge");
    const hubVerifyToken = url.searchParams.get("hub.verify_token");

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (!verifyToken) {
      console.error("[Meta Webhook] META_WEBHOOK_VERIFY_TOKEN not set");
      return Promise.resolve(
        new Response("Service misconfigured", { status: 500 })
      );
    }

    if (hubMode === "subscribe" && hubVerifyToken === verifyToken) {
      console.log("[Meta Webhook] Verification successful");
      return Promise.resolve(new Response(hubChallenge ?? "", { status: 200 }));
    }

    console.warn("[Meta Webhook] Verification failed — invalid token");
    return Promise.resolve(new Response("Forbidden", { status: 403 }));
  }),
});

/**
 * Meta webhook events (POST request)
 * Receives Flow completion events and status updates from Meta Cloud API.
 * Verifies X-Hub-Signature-256 before processing.
 * Returns 200 quickly — processing happens asynchronously.
 */
http.route({
  path: "/whatsapp/meta/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-hub-signature-256") ?? "";

    // Verify signature using HMAC-SHA256 (delegated to "use node" action)
    const isValid = await ctx.runAction(
      internal.actions.metaWhatsapp.verifyMetaSignatureAction,
      { rawBody, signatureHeader }
    );

    if (!isValid) {
      console.warn("[Meta Webhook] Invalid signature — rejecting");
      return new Response("Forbidden", { status: 403 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Route based on change field and message type
    const p = payload as {
      entry?: Array<{
        changes?: Array<{
          field?: string;
          value?: {
            messages?: Array<{
              interactive?: { type?: string };
            }>;
          };
        }>;
      }>;
    };

    const change = p.entry?.[0]?.changes?.[0];
    const field = change?.field;
    const msgType = change?.value?.messages?.[0]?.interactive?.type;

    if (field === "messages" && msgType === "nfm_reply") {
      // WhatsApp Flow completion — process asynchronously
      await ctx.runAction(
        internal.actions.metaWhatsapp.processFlowCompletionWebhook,
        { payload }
      );
    } else {
      // Status updates, delivery receipts, etc. — no-op
      console.log("[Meta Webhook] Non-Flow event received, field:", field);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================
// META WHATSAPP FLOWS DATA EXCHANGE
// ============================================================

/**
 * WhatsApp Flows data exchange endpoint (POST request)
 * Called by Meta's servers when a player opens the wellness Flow.
 * Decrypts the request, resolves the player's enabled dimensions,
 * and returns an encrypted dynamic screen payload.
 *
 * Encryption uses RSA-OAEP-SHA256 + AES-128-GCM per Meta's Flows spec.
 * Requires META_PRIVATE_KEY env var (PEM-encoded RSA private key).
 */
http.route({
  path: "/whatsapp/flows/exchange",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();

    const result = await ctx.runAction(
      internal.actions.metaWhatsapp.handleFlowsExchange,
      { rawBody }
    );

    if (!result.success) {
      console.error("[Flows Exchange] Failed:", result.error);
      return new Response("Internal Server Error", { status: 500 });
    }

    return new Response(result.encryptedResponse, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }),
});

export default http;
