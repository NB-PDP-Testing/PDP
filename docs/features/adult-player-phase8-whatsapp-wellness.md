# Adult Player Lifecycle — Phase 8: WhatsApp Wellness Check Integration (Dual-Channel)

> Auto-generated documentation - Last updated: 2026-02-28 10:26

## Status

- **Branch**: `ralph/adult-player-phase8-whatsapp-wellness`
- **Progress**: 10 / 10 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P8-001: Backend: Dual-Channel Schema, Meta API Setup & Channel Abstraction Service

As a backend developer, I need the schema changes, Meta API integration scaffolding, and the channel abstraction service so that both delivery channels share a common interface and are independently swappable.

**Acceptance Criteria:**
- SCHEMA CHANGES — add to packages/backend/convex/schema.ts:
-   whatsappWellnessSessions table (for conversational/SMS channel only): playerIdentityId (v.id), organizationId (string), sessionDate (string YYYY-MM-DD), status (v.union 'pending'|'in_progress'|'completed'|'abandoned'), enabledDimensions (v.array v.string()), currentDimensionIndex (number), collectedResponses (v.any()), phoneNumber (string E.164), channel (v.literal('sms_conversational')), sentAt (number), optional startedAt, optional completedAt, expiresAt (sentAt + 8h), optional dailyHealthCheckId (v.id), invalidReplyCount (number). Indexes: by_phone_and_date [phoneNumber, sessionDate], by_player_and_date [playerIdentityId, sessionDate]
-   Add to playerWellnessSettings: wellnessChannel (v.optional(v.union(v.literal('whatsapp_flows'), v.literal('sms_conversational')))), whatsappNumber (v.optional(v.string()) E.164), whatsappOptIn (v.optional(v.boolean())), whatsappOptedInAt (v.optional(v.number())). Add index by_whatsapp_number [whatsappNumber].
-   Add source field to dailyPlayerHealthChecks: v.optional(v.union(v.literal('app'), v.literal('whatsapp_flows'), v.literal('whatsapp_conversational'), v.literal('sms'))). Existing records default to null (treated as 'app').
- ENV VARS — document all new required env vars in a comment block at the top of packages/backend/convex/actions/metaWhatsapp.ts:
-   META_GRAPH_API_TOKEN — Meta app access token (long-lived system user token)
-   META_PHONE_NUMBER_ID — the WhatsApp Business phone number ID from Meta Business Manager
-   META_WABA_ID — WhatsApp Business Account ID
-   META_FLOWS_WELLNESS_ID — ID of the published wellness Flow (obtained after registering the Flow with Meta)
-   META_WEBHOOK_VERIFY_TOKEN — a random secret token used to verify Meta webhook GET challenge
-   META_APP_SECRET — Meta app secret used to verify X-Hub-Signature-256 on incoming Meta webhooks
- Create packages/backend/convex/actions/metaWhatsapp.ts ('use node' action file) with the following functions:
-   checkWhatsappAvailability(phoneNumber: string): calls Meta Contacts API (POST graph.facebook.com/v18.0/{phone-number-id}/contacts) to check if a number has WhatsApp. Returns { isWhatsapp: boolean, waId: string | null }.
-   sendFlowMessage(toPhoneNumber: string, playerName: string, orgName: string): sends a Meta interactive Flow template message to the player using META_FLOWS_WELLNESS_ID. Uses Bearer META_GRAPH_API_TOKEN auth. Logs the response messageId.
-   verifyMetaSignature(rawBody: string, signatureHeader: string): HMAC-SHA256 verification of X-Hub-Signature-256 using META_APP_SECRET. Returns boolean. Call this on EVERY incoming Meta webhook.
-   processFlowCompletion(payload: object): parses the Flow completion payload, extracts dimension answers, returns { playerWaId, answers: Record<string, number>, submittedAt }.
- Create packages/backend/convex/lib/wellnessDispatchService.ts:
-   sendWellnessCheck(ctx, player: { playerIdentityId, phoneNumber, playerName, orgName, wellnessChannel, enabledDimensions, organizationId }): async function that dispatches based on wellnessChannel. 'whatsapp_flows' → calls ctx.runAction(internal.actions.metaWhatsapp.sendFlowMessage, ...). 'sms_conversational' → creates whatsappWellnessSessions record then calls ctx.runAction(internal.actions.whatsapp.sendConversationalQuestion, ...). Returns { sent: boolean, channel, messageId? }.
- Add queries/mutations to packages/backend/convex/models/playerHealthChecks.ts (or whatsappWellness.ts):
-   getActiveWellnessSession(phoneNumber), createWellnessSession, recordWellnessAnswer, completeWellnessSession, abandonWellnessSession, registerPlayerChannel, deregisterPlayerChannel — same as original Phase 8 design but the channel field is now tracked.
- Run npx -w packages/backend convex codegen — all types pass.
- npm run check-types passes.

### US-P8-002: Meta Webhook Endpoints — Flow Completion & Data Exchange

As a backend developer, I need the Meta webhook endpoints for Flow completion callbacks and the data exchange endpoint so that WhatsApp Flows can deliver dynamic forms and return completed answers.

**Acceptance Criteria:**
- Add three new routes to packages/backend/convex/http.ts (do NOT modify the existing /whatsapp/incoming route):
- ROUTE 1 — Meta Webhook Verification (GET /whatsapp/meta/webhook):
-   Meta sends: GET /whatsapp/meta/webhook?hub.mode=subscribe&hub.challenge=NONCE&hub.verify_token=TOKEN
-   Verify hub.verify_token === META_WEBHOOK_VERIFY_TOKEN env var
-   If valid: return Response(hub.challenge, { status: 200 })
-   If invalid: return 403
- ROUTE 2 — Meta Webhook Events (POST /whatsapp/meta/webhook):
-   Verify X-Hub-Signature-256 header using verifyMetaSignature() BEFORE processing body. Return 403 if invalid.
-   Parse JSON body. Route based on entry[0].changes[0].field:
-     'messages' with interactive.type 'nfm_reply' (Flow completion) → call ctx.runAction(internal.actions.metaWhatsapp.processFlowCompletionWebhook, payload)
-     All other event types (message status updates, etc.) → log and return 200 (no-op for now)
-   Always return 200 quickly (Meta expects < 5 seconds). Process asynchronously via ctx.runAction.
- ROUTE 3 — Flows Data Exchange (POST /whatsapp/flows/exchange):
-   Called by Meta's servers when a player opens the wellness Flow.
-   Verify the request using Meta's Flows data exchange signature verification (different from webhook signature — uses AES encryption. See Meta Flows documentation for decryption algorithm.)
-   Parse the decrypted payload to get the player's wa_id (WhatsApp user ID).
-   Resolve wa_id to playerIdentityId immediately using by_whatsapp_number index (query playerWellnessSettings). Do NOT store wa_id in any intermediate table or log — it is personal data (GDPR) and must be pseudonymized on receipt. All subsequent processing uses playerIdentityId only.
-   Fetch player's enabledDimensions from getWellnessSettings(playerIdentityId).
-   Build and return the dynamic Flow screen payload containing only enabled dimensions as RadioButtonsGroup fields:
-     Each dimension becomes a RadioButtonsGroup with name=[dimensionKey], label=[question text], required: true, data-source: [{id:'1',title:'😢 Very Poor'},{id:'2',title:'😕 Poor'},{id:'3',title:'😐 Neutral'},{id:'4',title:'🙂 Good'},{id:'5',title:'😁 Great'}]
-   Dimension order: sleepQuality, energyLevel, foodIntake, waterIntake, mood, motivation, physicalFeeling, muscleRecovery (skip any not in enabledDimensions)
-   Response must be AES-encrypted per Meta's data exchange response format
-   Include a SUBMIT footer button labelled 'Submit my check-in'
- Create internal action internal.actions.metaWhatsapp.processFlowCompletionWebhook(payload):
-   Parse completion payload: extract wa_id, flow_token, answers (each dimension key → number value)
-   Immediately resolve wa_id to playerIdentityId using by_whatsapp_number index. Do NOT log or store the wa_id — it is personal data (GDPR Article 9) and must be pseudonymized on first use.
-   Check for existing dailyPlayerHealthChecks record today (idempotency) — if exists, log and return
-   Call submitDailyHealthCheck with source: 'whatsapp_flows'
-   Send confirmation WhatsApp message back to player via Meta API: '✅ Wellness check complete! 🎉\n\nYour score today: [score]/5\n[interpretation]\n\nView your trends in the PlayerARC app.'
- npm run check-types passes.

### US-P8-003: Meta WhatsApp Flows Template — Design & Registration

As a developer, I need the WhatsApp Flow and message template registered with Meta so that the wellness check can be sent as an interactive form to WhatsApp users.

**Acceptance Criteria:**
- Create the Flow JSON definition file at packages/backend/convex/flows/wellness-check-flow.json:
-   version: '3.1'
-   data_api_version: '3.0'
-   routing_model: {} (all screens accessible via data exchange)
-   screens array with a single screen id 'WELLNESS_SCREEN':
-     title: 'Daily Wellness Check'
-     data: {} (populated dynamically by data exchange endpoint)
-     layout children: 8 RadioButtonsGroup components (one per possible dimension), each marked required: false (data exchange controls which are shown)
-     footer: Submit button
- Register the Flow with Meta via the Graph API: POST graph.facebook.com/v18.0/{waba-id}/flows with name 'PlayerARC Daily Wellness Check' and the Flow JSON. Document the resulting Flow ID — this becomes META_FLOWS_WELLNESS_ID env var.
- Publish the Flow (POST /{flow-id}/publish) — Flows must be published before use.
- Create the message template in Meta Business Manager: interactive template with header ('🏃 Daily Wellness Check'), body ('Good morning {{1}}! Time for your {{2}} wellness check. It takes under a minute.'), footer ('PlayerARC'), and a Flow button ('Start Check-In') referencing META_FLOWS_WELLNESS_ID.
- Submit template for Meta approval (typically 24–48h). Document the template name as WELLNESS_TEMPLATE_NAME env var.
- Create a setup documentation file at docs/meta-whatsapp-flows-setup.md documenting: Meta Business Manager steps, required env vars, Flow registration commands, template approval process, and how to re-register after Flow JSON changes.
- Add a Convex function internal.actions.metaWhatsapp.registerFlow that can be run manually to re-register/update the Flow with Meta when the Flow JSON changes.
- Note: In development/sandbox mode, Meta templates and Flows can be tested without approval using a Meta test phone number. Document how to set this up.

### US-P8-004: Twilio Conversational/SMS Channel (Retained & Updated)

As a player without WhatsApp (or who prefers SMS), I want to receive and complete my wellness check via a sequential text conversation so that I can participate regardless of which messaging app I use.

**Acceptance Criteria:**
- This story retains and formalises the original conversational channel design. The implementation is now channel-aware.
- EXTEND packages/backend/convex/actions/whatsapp.ts processIncomingMessage:
-   Step 1: normalizePhoneNumber(from)
-   Step 2: call getActiveWellnessSession(normalizedPhone) — check whatsappWellnessSessions
-   Step 3: if active session found AND session.channel === 'sms_conversational' → call handleWellnessReply(session, messageBody) → RETURN
-   Step 4: existing coach voice note processing (unchanged)
- Add sendConversationalQuestion(phoneNumber, question, dimensionNumber, totalDimensions) as an internal action that uses the existing Twilio REST pattern to send:
-   'Question [N] of [Total]: [Question text]\n\nReply with:\n1️⃣ Very Poor\n2️⃣ Poor\n3️⃣ Neutral\n4️⃣ Good\n5️⃣ Great'
- Add handleWellnessReply(session, messageBody) function:
-   Parse reply: valid if '1'–'5'. Invalid: increment invalidReplyCount, resend question. If invalidReplyCount >= 3: abandon session.
-   On valid reply: call recordWellnessAnswer. Check if next dimension exists.
-     YES: send next question via sendConversationalQuestion
-     NO: all answered → call submitDailyHealthCheck with source: 'whatsapp_conversational' or 'sms' based on whether message came via WhatsApp or SMS → call completeWellnessSession → send completion message
- Completion message (SMS/conversational): '✅ Done! Your score: [score]/5\n[interpretation]\nView trends in the PlayerARC app.'
- COMMANDS (add to whatsappCommandHandler.ts):
-   SKIP: abandon session with 'No problem! Check in via the app anytime.'
-   WELLNESSSTOP: deregister from wellness channel. Confirmation message must be EXACTLY: 'You have been removed from wellness check-ins. Reply WELLNESS to re-subscribe.' (Meta Business Policy compliance requirement — this specific phrasing is not optional.)
-   WELLNESS: if no active session, create one and send first question on demand
- Session expiry: if player replies after expiresAt, respond 'This wellness session has expired. Next check tomorrow.' and abandon.
- npm run check-types passes.

### US-P8-005: Player Channel Registration & Phone Verification (Settings UI)

As a player, I want to register my phone number for wellness check-ins, see which channel I'll use (WhatsApp Flows or SMS), and verify my number so that messages are sent correctly and with my consent.

**Acceptance Criteria:**
- Add 'Wellness Check-In Notifications' section to player settings page (/orgs/[orgId]/player/settings)
- Section shows: phone number input (E.164 with country code prefix, default +353 for Ireland), 'Verify Number' button
- VERIFICATION FLOW: On 'Verify Number': call Twilio (not Meta) to send a 6-digit PIN via SMS to the entered number. Player enters PIN in a 4-field input below. PIN valid for 10 minutes. On correct PIN → automatically call checkWhatsappAvailability(phoneNumber) Meta Contacts API.
- CHANNEL AUTO-DETECTION RESULT:
-   If WhatsApp available: show '✅ WhatsApp detected — you'll receive a native WhatsApp Flows form for the best experience.' Set wellnessChannel to 'whatsapp_flows'.
-   If WhatsApp not available: show '📱 SMS will be used — you'll receive questions one at a time via text.' Set wellnessChannel to 'sms_conversational'.
-   Player can manually override channel with a toggle: 'Prefer SMS instead of WhatsApp Flows' — switching to sms_conversational even if WhatsApp is available.
- After verification, show opt-in toggle: 'Enable daily wellness check-ins'. Toggle ON = whatsappOptIn: true. Toggle OFF = deregister.
- GDPR Article 9 opt-in disclosure (MANDATORY — must use this exact wording or equivalent): 'I consent to [org name] processing my daily wellness responses (sleep quality, energy level, mood, motivation, and physical feeling) as special category health data under GDPR Article 9(2)(a). My responses will be used only for player development and coaching support. I can withdraw this consent at any time by toggling off or replying WELLNESSSTOP.' This must be displayed as a clearly labelled, non-pre-ticked consent statement above the enable toggle — not buried in a terms link. A generic 'consent to receive messages' phrasing is not compliant for Article 9 health data.
- Verified number shown masked: '+353 87 *** 4567'. 'Change number' link restarts verification and clears opt-in.
- If player is opted-in via WhatsApp Flows: show 'How it works: At [configured time], you'll receive a WhatsApp message. Tap 'Start Check-In' to open a quick form — takes under 60 seconds.'
- If opted-in via SMS: show 'How it works: At [configured time], you'll receive a text message. Reply with numbers 1–5 for each question.'
- npm run check-types passes.

### US-P8-006: Admin WhatsApp Wellness Scheduling Configuration

As an org admin, I want to configure the daily wellness dispatch — time, timezone, target teams, and which channels are enabled — so that messages go out correctly for my organisation.

**Acceptance Criteria:**
- Extend the Wellness Reminders section in admin settings (Phase 4) with a 'Push Notifications' subsection for WhatsApp/SMS
- Master toggle: 'Enable WhatsApp/SMS wellness check-ins'. Only shown if TWILIO_WHATSAPP_FROM or META_PHONE_NUMBER_ID env vars are set.
- When enabled, show:
-   Send time: time picker (HH:MM 24h, 15-min increments). Default: 08:00.
-   Timezone: IANA timezone dropdown. Default: Europe/Dublin.
-   Active days: checkboxes Mon–Sun. Presets: Every Day / Weekdays / Training Days (if schedule data available).
-   Target teams: multi-select. Default: all teams.
-   Channel display (read-only info): 'Players with WhatsApp: [N] will receive WhatsApp Flows. Players with SMS only: [M] will receive text messages. Players not registered: [K].' (counts from playerWellnessSettings query).
-   WhatsApp Flows status indicator: '✅ WhatsApp Flows active' (if META_FLOWS_WELLNESS_ID is set and Flow is published) or '⚠️ WhatsApp Flows not configured — only SMS will be used' (if Meta env vars missing).
- Save button: upsert org wellness dispatch config (find or create appropriate org settings table).
- Preview: 'Next dispatch: [day] [date] at [time] [tz] to [N] opted-in players'.
- npm run check-types passes.

### US-P8-007: Daily Dispatch Cron — Channel-Aware

As a system, I need the daily dispatch cron to send wellness check messages to all opted-in players via their correct channel at the configured time each day.

**Acceptance Criteria:**
- Create a Convex scheduled function that runs every 15 minutes (find existing cron patterns in jobs/ directory and follow the same pattern).
- Every 15 minutes: query all orgs with WhatsApp wellness enabled. For each org: check if current UTC time (converted to org's configured timezone) matches the send time window (within 15 minutes). If YES: trigger dispatch for that org.
- Per-org dispatch (Convex action):
-   1. Query all opted-in players (whatsappOptIn: true, wellnessChannel set) in target teams.
-   2. For each player: check dailyPlayerHealthChecks by_player_and_date → if record exists for today, SKIP (already checked in).
-   3. For whatsapp_flows players: check if a Flow message was already sent today (add sentToday flag or check a sent log). If already sent, SKIP.
-   4. For sms_conversational players: check whatsappWellnessSessions by_player_and_date → if session exists, SKIP.
-   5. For each unsent player: fetch their enabledDimensions via getWellnessSettings.
-   6. Call WellnessDispatchService.sendWellnessCheck(player) → routes to correct channel.
-   7. Log the dispatch result (sent / skipped-already-done / failed) for admin monitoring.
- Error handling: if sendFlowMessage fails for a whatsapp_flows player, fall back to sendConversationalQuestion via Twilio for that player. Log the fallback. Do NOT fail the entire batch.
- Rate limiting: send to max 50 players per minute to avoid Twilio/Meta rate limits. Use ctx.scheduler.runAfter() staggered dispatches if batch > 50.
- npm run check-types passes.

### US-P8-008: App Sync, Completion UX & Channel Source Tracking

As a player, I want completed wellness check-ins (from any channel) to appear correctly in my app with the right source indicator so that my full history is visible in one place.

**Acceptance Criteria:**
- Both WhatsApp Flows and SMS/conversational channels call submitDailyHealthCheck with the appropriate source field value.
- In the player's health-check page (app): wellness history shows a channel icon next to each record:
-   source 'app' or null: no icon (default)
-   source 'whatsapp_flows': WhatsApp logo icon + 'Via WhatsApp' tooltip
-   source 'whatsapp_conversational': WhatsApp logo icon + 'Via WhatsApp chat' tooltip
-   source 'sms': SMS/phone icon + 'Via SMS' tooltip
- Streak counter (Phase 4): all sources count toward the streak — query is source-agnostic.
- Coach wellness dashboard (Phase 4): all sources display identically — coaches see aggregate score only, source not shown.
- Overview card (Phase 1): if today's check-in was via WhatsApp, the green 'Wellness checked in today ✓' card appears — source-agnostic.
- WHATSAPP FLOWS COMPLETION: after submitDailyHealthCheck succeeds, send a confirmation message via Meta API to the player's WhatsApp. Message includes aggregate score, score interpretation text, and a link to view trends in the app.
- SMS/CONVERSATIONAL COMPLETION: send Twilio SMS/WhatsApp reply with aggregate score and interpretation.
- Score interpretation: ≤2.0 = 'Listen to your body today 💙', 2.1–3.5 = 'Moderate day — recover well 🟡', 3.6–4.5 = 'Good energy — great session ahead! 🟢', 4.6+ = 'Excellent — you're feeling great! 🔥'
- IMPORTANT — WhatsApp Flows idempotency: before calling submitDailyHealthCheck in processFlowCompletionWebhook, always check if a record already exists for that player+date. Meta may resend completion webhooks on timeout retries. If record exists: skip insert, still send the confirmation message.
- npm run check-types passes.

### US-P8-009: Admin WhatsApp Wellness Monitoring Dashboard

As an org admin, I want to see which players received and completed wellness checks via each channel so that I can track engagement and troubleshoot delivery issues.

**Acceptance Criteria:**
- Add 'Notifications' tab/section to admin wellness analytics (Phase 4 US-P4-009)
- Today's summary: '✅ WhatsApp Flows: X sent, Y completed (Z%) | 📱 SMS: A sent, B completed (C%) | ⏭️ Skipped (already checked in via app): D'
- Player table: Name, Team, Channel (WhatsApp Flows / SMS / App / Not registered), Status (Sent / Completed / Abandoned / Skipped), Completion time, Score
- Not-registered section: players in target teams without a phone registered — count shown with option to send in-app nudge
- Channel breakdown chart: over last 30 days, stacked bar chart showing daily check-in counts by source (app / whatsapp_flows / sms / not-checked-in)
- Error log: any failed dispatch attempts in the last 7 days (player name, channel, error reason, timestamp)
- Fallback events: list of times the cron fell back from WhatsApp Flows to SMS due to Meta API errors
- npm run check-types passes.

### US-P8-UAT: Phase 8 Dual-Channel Wellness E2E Tests

As a developer, I want comprehensive tests for both the WhatsApp Flows and SMS conversational channels so that dispatch, completion, app sync, and error handling all work correctly.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/whatsapp-wellness-phase8.spec.ts (UI tests) and manual test protocol below
- UI Test: player settings shows phone number input, verify button, channel indicator after verification
- UI Test: WhatsApp-available number shows 'WhatsApp Flows' channel label
- UI Test: SMS-only number shows 'SMS' channel label
- UI Test: admin config shows channel count breakdown
- UI Test: app health-check history shows WhatsApp icon for whatsapp_flows records
- Backend test: getActiveWellnessSession returns null when no session, returns session when active (conversational only)
- Backend test: submitDailyHealthCheck idempotency — second call with same player+date does not create duplicate
- WHATSAPP FLOWS MANUAL TESTS:
- Manual test 1: Register a WhatsApp number in player settings → verify PIN → confirm channel detected as 'whatsapp_flows' → enable opt-in
- Manual test 2: Trigger dispatch (admin sets send time 2 min from now) → confirm WhatsApp Flows message received on device → confirm message has 'Start Check-In' button
- Manual test 3: Tap 'Start Check-In' → confirm Flow form opens inside WhatsApp with only player's ENABLED dimensions (not all 8 if some are disabled)
- Manual test 4: Fill in all dimension values → tap 'Submit my check-in' → confirm completion message received with aggregate score
- Manual test 5: Check Convex DB → confirm dailyPlayerHealthChecks record created with source: 'whatsapp_flows' and correct values
- Manual test 6: Open app health-check page → confirm WhatsApp icon shown on today's record
- Manual test 7: Send the Flow completion webhook twice (simulate Meta retry) → confirm only ONE dailyPlayerHealthChecks record exists
- SMS / CONVERSATIONAL MANUAL TESTS:
- Manual test 8: Register an SMS-only number → verify detected as 'sms_conversational' → enable opt-in
- Manual test 9: Trigger dispatch → confirm SMS received with first question → reply '4' → confirm next question arrives → complete all questions → confirm completion SMS received
- Manual test 10: Inspect DB → confirm record with source: 'sms' and correct values
- Manual test 11: Reply with 'abc' → confirm 'Please reply 1–5' resent → reply invalid twice more → confirm session abandoned message
- Manual test 12: Reply 'SKIP' → confirm polite skip message → no record created
- FALLBACK & EDGE CASE TESTS:
- Manual test 13: Simulate Meta API being down (invalid META_GRAPH_API_TOKEN temporarily) → trigger dispatch for a whatsapp_flows player → confirm cron falls back to SMS → confirm fallback logged in admin dashboard
- Manual test 14: Submit wellness via app BEFORE dispatch time → confirm WhatsApp/SMS is NOT sent for that player
- Manual test 15: Coach who is also a player (same phone) with active wellness session → send coach voice note from that number → confirm wellness session intercepts it and treats it as a wellness answer
- Manual test 16: Send 'WELLNESS' command outside session hours → confirm on-demand session created (SMS channel)


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- httpAction handlers without async must use `Promise.resolve(new Response(...))` — Biome `useAwait` rejects async without await
- Biome `noBitwiseOperators` blocks `~x` — use `255 - x` for byte flipping (equivalent for uint8)
- http.ts can access `process.env` without "use node" — works in all Convex function types
- For Node.js crypto in http.ts, delegate to "use node" internalAction via ctx.runAction
- Meta Flows data exchange algorithm: RSA-PKCS1-OAEP-SHA256 to decrypt AES key, AES-128-GCM to decrypt body, AES-128-GCM with flipped IV (255 - original_byte) for response
- handleFlowsExchange returns discriminated union — use `success: true as const` / `false as const`
- `~` bitwise NOT blocked by Biome — use `255 - x` for byte values
- GET webhook handler must be non-async with Promise.resolve returns
--
- US-P8-003 is primarily documentation + JSON artifact — registerFlow already existed from US-P8-001

**Gotchas encountered:**
- `~` bitwise NOT blocked by Biome — use `255 - x` for byte values
- GET webhook handler must be non-async with Promise.resolve returns
- META_PRIVATE_KEY must be set in Convex dashboard before /whatsapp/flows/exchange works
---

### Files Changed

- packages/backend/convex/schema.ts (+60)
- packages/backend/convex/actions/metaWhatsapp.ts (new, ~620 lines)
- packages/backend/convex/lib/wellnessDispatchService.ts (new, ~180 lines)
- packages/backend/convex/models/whatsappWellness.ts (new, ~540 lines)
- packages/backend/convex/models/playerHealthChecks.ts (+130)
- Type check: passed (no errors in new/modified files)
- Linting: passed biome check
- Codegen: succeeded
- Commit: pre-commit hook passed
- submitDailyHealthCheckInternal exists for webhook use (no auth) -- always use this from internal actions
- getSettingsByWhatsappNumber for wa_id pseudonymization pattern
- sendConversationalQuestion has @ts-expect-error in dispatch service -- added in US-P8-004
- `v` cannot be used as variable name (shadows Convex v import)
--
- packages/backend/convex/actions/metaWhatsapp.ts (+280 lines)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
