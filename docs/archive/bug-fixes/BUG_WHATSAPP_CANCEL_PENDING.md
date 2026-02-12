## Bug Report

**Story:** US-VN-020 (WhatsApp Commands)
**Found during:** UAT Testing
**Severity:** Medium

## Description

When a user sends the `cancel` command via WhatsApp, the system correctly responds with:
> "Note discarded. Feel free to send a new one any time"

However, the cancelled/discarded voice note entries **still appear as pending** on the review microsite. Clicking the "review pending" link shows all entries including those that were explicitly cancelled by the user.

## Steps to Reproduce

1. Send a voice note via WhatsApp
2. When prompted, reply with `cancel`
3. Confirm the system responds with the discard confirmation message
4. Click the "review pending" link to open the review microsite
5. **Observe:** The cancelled entry still appears in the pending list

## Expected Behavior

Cancelled/discarded voice notes should be removed from the pending review list on the microsite. They should not require any further user action.

## Actual Behavior

The WhatsApp response confirms the note was discarded, but the backend record is not updated — the entry remains visible and actionable on the review microsite.

## Likely Root Cause

The `cancel` command handler is sending the correct user-facing response but is not updating the voice note record status in the database (e.g., setting status to `discarded` or `cancelled`), so the microsite query still picks it up as pending.
