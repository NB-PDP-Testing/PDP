## Problem

When using voice notes via WhatsApp, the system remembers which organization/club the coach is associated with via a session cache. Once an organization is selected (either automatically or via user selection), there is **no way to manually reset it** — the coach must wait for the session to expire or use workarounds.

## How Organization Caching Works Today

### Session Storage

The system uses the `whatsappSessions` table to remember the selected organization per phone number. Sessions include:
- `phoneNumber` — Coach's normalized E.164 phone number
- `organizationId` / `organizationName` — The cached organization
- `resolvedVia` — How the org was determined (e.g., `single_org`, `explicit_mention`, `session_memory`, `user_selection`)
- `lastMessageAt` — Timestamp of last message
- **Session timeout: 2 hours** (`SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000`)

### Organization Detection Priority Chain

When a coach sends a WhatsApp message, the system resolves the organization using this hierarchy:

| Priority | Method | Description |
|----------|--------|-------------|
| 1 | **Single Org** | Coach belongs to only one org — auto-selected |
| 2 | **Explicit Mention** | Coach prefixes message with org name (e.g., `"Grange: ..."`, `"@Grange"`, `"for Grange"`) |
| 3 | **Content Detection** | Message uniquely matches a team name, age group, sport, player name, or coach name in one org |
| 4 | **Session Memory** | Active session from the last 2 hours — reuses the previously selected org |
| 5 | **Clarification** | Still ambiguous — sends numbered list of orgs for coach to pick |

### Current Workarounds (No Reset Command)

1. **Wait 2 hours** — Session auto-expires after 2 hours of inactivity
2. **Explicitly mention** a different org name in the next message (e.g., `"@OtherClub update on u14s"`)
3. **Mention something unique** to the target org — a player name, team name, age group, or sport only found in that org

## Not Planned in v2 PRD

The current `feat/voice-gateways-v2` PRD (Phase 7A) was reviewed and contains **no mention** of session reset or organization switching. Phase 7A focuses on:
- **US-VN-022**: Wiring in-app notes to the v2 artifact pipeline
- **US-VN-023**: Eliminating duplicate v1+v2 processing

Upcoming phases (7B–7D) cover draft confirmation UI, output bridging, and retiring v1 — still no session management.

## Proposed Solution

Add a **reset command** that coaches can text via WhatsApp to clear their cached session. For example:

- Coach texts **"reset"** or **"switch club"**
- System deletes the `whatsappSessions` entry for that phone number
- Next voice note triggers the full organization detection chain again (or asks if multi-org)

### Implementation Scope

- Add a `clearWhatsAppSession` mutation to `whatsappMessages.ts`
- Add keyword detection in the WhatsApp message handler for reset triggers (e.g., `reset`, `switch club`, `change club`)
- Delete the session row from `whatsappSessions` table
- Reply with confirmation: *"Session cleared. Your next message will ask you to select a club."*
- Estimated effort: Small (a few hours)

### Key Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/models/whatsappMessages.ts` | Session management, multi-org detection |
| `packages/backend/convex/actions/whatsapp.ts` | Message processing, org resolution |
| `packages/backend/convex/schema.ts` | `whatsappSessions` table definition |
