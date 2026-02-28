# Meta WhatsApp Flows Setup Guide

This guide covers the end-to-end setup for the PlayerARC Daily Wellness Check WhatsApp Flow.

## Overview

PlayerARC uses the Meta WhatsApp Business Cloud API to deliver an interactive wellness check-in form directly inside WhatsApp. Players tap "Start Check-In" in a WhatsApp message and complete a multi-question form without leaving the app.

This runs **alongside** the existing Twilio SMS/conversational channel. Players who have WhatsApp installed receive the Flow; SMS-only players use the conversational path.

---

## Prerequisites

- A Meta Business Manager account
- A WhatsApp Business Account (WABA) registered and approved
- A dedicated phone number registered with the WABA
- The PlayerARC backend deployed to Convex
- An RSA key pair (2048-bit minimum) for Flows data exchange encryption

---

## Required Environment Variables

Set all of these in the Convex dashboard (`npx convex env set <NAME> <VALUE>`):

| Variable | Description |
|---|---|
| `META_GRAPH_API_TOKEN` | Long-lived system user token from Meta Business Manager |
| `META_PHONE_NUMBER_ID` | The WhatsApp Business phone number ID (from WABA settings) |
| `META_WABA_ID` | WhatsApp Business Account ID |
| `META_FLOWS_WELLNESS_ID` | ID of the registered + published wellness Flow (obtained in Step 3) |
| `META_WEBHOOK_VERIFY_TOKEN` | A random secret you choose — used to verify Meta webhook GET challenge |
| `META_APP_SECRET` | Meta app secret — used to verify `X-Hub-Signature-256` on incoming webhooks |
| `META_PRIVATE_KEY` | PEM-encoded RSA private key for decrypting Flows data exchange requests |
| `WELLNESS_TEMPLATE_NAME` | Name of the approved message template (e.g. `playerarc_wellness_check`) |

---

## Step 1: Generate an RSA Key Pair

The Flows data exchange endpoint uses RSA-OAEP-SHA256 encryption. Generate a key pair and register the public key with Meta.

```bash
# Generate private key (2048-bit)
openssl genrsa -out wellness_private.pem 2048

# Extract public key
openssl rsa -in wellness_private.pem -pubout -out wellness_public.pem
```

Store the private key content in `META_PRIVATE_KEY` (include the full PEM including headers):

```bash
npx -w packages/backend convex env set META_PRIVATE_KEY "$(cat wellness_private.pem)"
```

Register the public key with Meta:
1. Go to Meta Business Manager → WhatsApp → Flows
2. Select your Flow (after creation in Step 3)
3. Under "Encryption", paste the contents of `wellness_public.pem`
4. Save

---

## Step 2: Configure Meta Webhook

In Meta Business Manager → App → Webhooks:

1. Set the webhook URL to: `https://<your-convex-deployment>.convex.site/whatsapp/meta/webhook`
2. Set the verify token to the value you chose for `META_WEBHOOK_VERIFY_TOKEN`
3. Subscribe to the `messages` field under `whatsapp_business_account`

Verify the webhook responds correctly — Meta will send a GET request with a `hub.challenge`. The PlayerARC handler at `GET /whatsapp/meta/webhook` will automatically verify the token and echo the challenge.

---

## Step 3: Register the WhatsApp Flow

The Flow JSON is defined at `packages/backend/convex/flows/wellness-check-flow.json`.

### Option A: Register via Convex Dashboard (Recommended)

Run the `registerFlow` internal action from the Convex dashboard:

1. Open the Convex dashboard
2. Go to Functions → `actions/metaWhatsapp` → `registerFlow`
3. Click "Run Function" with empty args `{}`
4. The action will POST the Flow JSON to Meta and log the resulting Flow ID
5. Set `META_FLOWS_WELLNESS_ID` to the returned Flow ID:
   ```bash
   npx -w packages/backend convex env set META_FLOWS_WELLNESS_ID <flow-id>
   ```

### Option B: Register via cURL

```bash
export META_GRAPH_API_TOKEN="your-token"
export META_WABA_ID="your-waba-id"

curl -X POST "https://graph.facebook.com/v18.0/${META_WABA_ID}/flows" \
  -H "Authorization: Bearer ${META_GRAPH_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PlayerARC Daily Wellness Check",
    "categories": ["SURVEY"],
    "flow_json": '"$(cat packages/backend/convex/flows/wellness-check-flow.json | jq -c . | jq -R .)"'
  }'
```

The response will include the Flow `id`. Set `META_FLOWS_WELLNESS_ID` to this value.

---

## Step 4: Configure the Data Exchange Endpoint

Register the data exchange endpoint with Meta so the Flow can receive dynamic screen data:

1. In Meta Business Manager → Flows → your Flow → Edit
2. Under "Data Exchange Endpoint", enter: `https://<your-convex-deployment>.convex.site/whatsapp/flows/exchange`
3. Register the public key (from Step 1) in the Encryption section
4. Save and validate

Meta will send a `ping` action to verify the endpoint is live. The PlayerARC handler at `POST /whatsapp/flows/exchange` responds to pings automatically.

---

## Step 5: Publish the Flow

Flows must be published before they can be used in templates.

### Via API:

```bash
export FLOW_ID="your-flow-id"
export META_GRAPH_API_TOKEN="your-token"

curl -X POST "https://graph.facebook.com/v18.0/${FLOW_ID}/publish" \
  -H "Authorization: Bearer ${META_GRAPH_API_TOKEN}"
```

### Via Meta Business Manager:

1. Go to WhatsApp → Flows → select your Flow
2. Click "Publish"

Note: Once published, the Flow JSON cannot be modified. To update, create a new Flow and update `META_FLOWS_WELLNESS_ID`.

---

## Step 6: Create the Message Template

Create an interactive message template that includes a Flow button.

In Meta Business Manager → WhatsApp → Message Templates → Create:

- **Template Name**: `playerarc_wellness_check` (set as `WELLNESS_TEMPLATE_NAME`)
- **Category**: Utility
- **Language**: English
- **Header**: `🏃 Daily Wellness Check` (Text)
- **Body**: `Good morning {{1}}! Time for your {{2}} wellness check. It takes under a minute.`
  - Parameter 1: player's first name
  - Parameter 2: club/org name
- **Footer**: `PlayerARC`
- **Button**: Interactive → Flow
  - Button text: `Start Check-In`
  - Flow: select the Flow registered in Step 3

Submit for approval. Meta typically reviews templates within 24–48 hours.

Set the template name:
```bash
npx -w packages/backend convex env set WELLNESS_TEMPLATE_NAME playerarc_wellness_check
```

---

## Step 7: Set Remaining Environment Variables

```bash
npx -w packages/backend convex env set META_GRAPH_API_TOKEN "your-long-lived-system-user-token"
npx -w packages/backend convex env set META_PHONE_NUMBER_ID "your-phone-number-id"
npx -w packages/backend convex env set META_WABA_ID "your-waba-id"
npx -w packages/backend convex env set META_WEBHOOK_VERIFY_TOKEN "your-random-secret"
npx -w packages/backend convex env set META_APP_SECRET "your-app-secret"
```

---

## Development & Sandbox Testing

Meta provides sandbox testing without template approval:

1. In Meta Business Manager, add test phone numbers under "WhatsApp → API Setup → Test Numbers"
2. Send test messages to these numbers without template approval
3. Use the Meta WhatsApp Business API sandbox to test Flow interactions
4. The `/whatsapp/flows/exchange` endpoint works in sandbox mode — Meta sends real encrypted requests

For local development, use `npx convex dev` and expose the local Convex deployment URL via the Convex Cloud dashboard.

---

## Updating the Flow JSON

If the wellness dimensions or form layout needs to change:

1. Edit `packages/backend/convex/flows/wellness-check-flow.json`
2. Create a new Flow via `registerFlow` action (cannot update a published Flow in-place)
3. Update `META_FLOWS_WELLNESS_ID` with the new Flow ID
4. Re-register the public key and data exchange endpoint with the new Flow
5. Publish the new Flow
6. Update the message template to reference the new Flow ID

---

## Troubleshooting

### Webhook verification fails (403 on GET)
- Ensure `META_WEBHOOK_VERIFY_TOKEN` matches the token in Meta Business Manager exactly
- Check the Convex deployment URL is accessible from Meta's servers

### Flow completion not received (POST /whatsapp/meta/webhook)
- Verify `META_APP_SECRET` is set correctly — all webhooks are rejected without valid signature
- Check Convex function logs for `[metaWhatsapp]` entries

### Data exchange fails (POST /whatsapp/flows/exchange)
- Ensure `META_PRIVATE_KEY` is set with the full PEM content including headers
- Verify the public key registered with Meta matches the private key
- Check that the data exchange endpoint URL is registered correctly in Meta Business Manager

### Flow not appearing in WhatsApp
- Confirm the Flow is published (not just created)
- Confirm the message template is approved (status: Approved)
- Confirm `META_FLOWS_WELLNESS_ID` matches the published Flow ID

---

## GDPR & Legal Requirements

Before going live:

1. Complete a **Data Protection Impact Assessment (DPIA)** — mandatory under GDPR Article 35 for large-scale health data processing
2. Accept Meta's **Data Processing Agreement** at [whatsapp.com/legal/business-data-processing-terms](https://www.whatsapp.com/legal/business-data-processing-terms)
3. Accept the **Standard Contractual Clauses** via the Business Data Transfer Addendum
4. Ensure your WhatsApp Business Solution Provider (BSP) has EU/EEA data residency
5. The player opt-in UI (US-P8-005) includes mandatory GDPR Article 9(2)(a) explicit consent disclosure — do not modify this wording without legal review
