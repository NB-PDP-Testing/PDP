## UX Issue — Misleading Duplicate Response Message

### The Core Problem

Even if the 2-minute deduplication window is intentional, the **message sent back to the user is misleading**. The current response says the message received is the same as the previous one — implying the user sent a duplicate. This is not good enough.

When a coach sends three completely different voice notes in quick succession, being told "we received this message 24 seconds ago" suggests the system thinks they sent the same thing twice. That's confusing and erodes trust in the platform.

### What Should Happen Instead

If the system enforces a 2-minute cooldown between audio messages, the response should be honest about that:

> "You've submitted a voice note within the last 2 minutes and we're still processing it. Please wait for that to complete before sending another."

This is transparent — it tells the user there's a processing window, rather than incorrectly claiming their distinct message is a duplicate.

### Summary

1. **Fix the dedup logic** so genuinely different voice messages aren't rejected (see root cause analysis above)
2. **Fix the response messaging** — if a cooldown is needed, tell the user it's a cooldown, don't tell them their message is the same as a previous one when it clearly isn't
