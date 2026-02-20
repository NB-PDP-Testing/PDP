## Summary

When sending multiple WhatsApp voice messages in quick succession (back-to-back), the system incorrectly identifies subsequent messages as duplicates of the first. The user receives a response saying "We received this message 24 seconds ago and it's currently being processed" — even though each message is completely different in content.

## Steps to Reproduce

1. Send a WhatsApp voice message to the system (Message A - any topic)
2. Immediately send a second, completely different voice message (Message B - different topic)
3. Immediately send a third, completely different voice message (Message C - different topic)
4. Observe the WhatsApp responses for Messages B and C

## Expected Behavior

Each voice message should be treated as a unique, independent submission. All three messages should be accepted, processed, and transcribed separately.

## Actual Behavior

The first message is accepted and begins processing. The second and third messages are rejected with a response along the lines of: "We received this message 24 seconds ago and it's currently being processed." The system treats distinct messages as duplicates based on timing proximity rather than content.

## Likely Root Cause

The duplicate detection logic is likely keyed on the sender (phone number/WhatsApp ID) and a time window, rather than on the actual message content or media ID. When multiple messages arrive from the same sender within a short window, they are incorrectly flagged as duplicate submissions.

## Investigation Areas

- Check the WhatsApp webhook handler for duplicate detection logic
- Look for deduplication based on sender ID + time window
- Verify whether the system checks the actual media ID or message ID from WhatsApp (each voice message has a unique media ID)
- Review any rate-limiting or throttling that could be collapsing distinct messages

## Impact

Coaches who batch-record observations (e.g. one voice note per player or per drill in quick succession) will lose messages. This makes the WhatsApp voice workflow unreliable for real-world usage patterns where coaches naturally send multiple notes in a row.
