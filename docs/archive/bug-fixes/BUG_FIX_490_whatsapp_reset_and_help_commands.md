# Bug Fix #490: WhatsApp RESET and HELP Commands

## Issue
**GitHub:** [#490](https://github.com/NB-PDP-Testing/PDP/issues/490)
**Title:** UAT - WHATSAPP has no current reset command

## Root Cause

The WhatsApp message handler had no way for a coach to clear their active session or get usage guidance. Once an organisation was cached in `whatsappSessions`, the coach had to wait 2 hours for it to expire before a different org could be selected. There was also no in-app reference for commands or example prompts.

## What Was Changed

### `packages/backend/convex/models/whatsappMessages.ts`

Added `clearSession` internalMutation. Finds and deletes the `whatsappSessions` row for a given phone number (by `by_phone` index). If no session exists, the call is a no-op.

### `packages/backend/convex/actions/whatsapp.ts`

Added two regex constants and a `HELP_MESSAGE` string at module level (before the webhook handler):

- `RESET_COMMAND_REGEX` — matches: `reset`, `switch club`, `change club`, `switch org` (case-insensitive, exact)
- `HELP_COMMAND_REGEX` — matches: `help` (case-insensitive, exact)
- `HELP_MESSAGE` — full WhatsApp-formatted guide (see below)

Inserted two early-exit checks at the top of `processIncomingMessage`, **before** the pending-message check:

1. **HELP**: sends `HELP_MESSAGE` and returns immediately. Works regardless of session or org state.
2. **RESET**: calls `clearSession`, then resolves any `awaiting_selection` pending message so the coach is not stuck in an org-selection loop. Replies with *"Session cleared ✓ Your next voice note will ask you to select a club."*

Both commands bypass message storage and deduplication — they are ephemeral administrative replies that do not need to appear in the message log.

### Help message content

```
*PlayerARC Coach Assistant* 🏆

PlayerARC captures your coaching observations via voice note or text and turns
them into player insights, team notes, and action items — automatically filed
to the right player's profile.

*📣 How to send a note*
...examples...

*⚡ Quick commands*
OK / R / SNOOZE / RESET / HELP

*🔗 Reviewing your notes*
...

Need help? Visit https://playerarc.io or contact your club administrator.
```

## Files Modified

- `packages/backend/convex/models/whatsappMessages.ts`
- `packages/backend/convex/actions/whatsapp.ts`
