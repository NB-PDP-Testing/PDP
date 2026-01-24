## WhatsApp Voice Notes - Response Messages Documentation

This update documents all WhatsApp response messages sent by PlayerARC to coaches, which is a critical part of the VoiceNote feature's UX.

### Complete Message Reference

We have **15 distinct response messages** that coaches may receive when interacting via WhatsApp:

| # | Scenario | Message Summary |
|---|----------|-----------------|
| 1 | Phone not linked | "Your phone number isn't linked to a coach account in PlayerARC..." |
| 2 | Multi-org clarification | "Hi {name}! You're a coach at multiple clubs..." |
| 3 | Voice note ack (single org) | "Voice note received. Transcribing..." |
| 4 | Voice note ack (multi org) | "Voice note received for {Org}. Transcribing..." |
| 5 | Text note ack (single org) | "Note received. Processing..." |
| 6 | Text note ack (multi org) | "Note received for {Org}. Processing..." |
| 7 | Unsupported type | "Sorry, I can only process text messages and voice notes..." |
| 8 | Processing error | "Sorry, there was an error... try directly in PlayerARC." |
| 9 | Invalid org selection | "Sorry, I didn't understand. Please reply with the number..." |
| 10 | Org confirmed | "Got it! Recording for {Org}. Processing your note..." |
| 11 | Pending message error | "Sorry, there was an error processing your note..." |
| 12 | Voice note not found | "There was an error processing your note..." |
| 13 | AI analysis failed | "Your note was saved but AI analysis failed..." |
| 14 | Still processing | "Your note is still being processed..." |
| 15 | Results summary | Dynamic message showing auto-applied, needs review, unmatched |

### Results Summary Format

The final message coaches receive shows categorized results:

```
Analysis complete!

Auto-applied (2):
- John: Skill
- Sarah: Rating -> Parent

Needs review (1):
- Jake: Injury

Unmatched (1):
- 'Michael' not in roster

Review 2 pending: playerarc.com/insights
```

### Trust-Based Auto-Apply

| Category | Auto-Applies at Trust 2+? |
|----------|--------------------------|
| skill_progress, skill_rating, performance, attendance | ✅ Yes |
| team_culture | ✅ Yes (team-level insights) |
| todo | ✅ Only if has assignee |
| injury, behavior | ❌ Never (sensitive) |

### Multi-Org Detection

For coaches at multiple clubs, the system detects the correct org via:
1. Explicit mention (`Grange:`, `@St. Mary's`)
2. Team name match
3. Age group patterns (`u12`, `under-14`, `the twelves`)
4. Sport keywords (`soccer`, `hurling`, `GAA`)
5. Player/coach name match
6. Session memory (2-hour window)
7. Ask for clarification if ambiguous

### Documentation

- Full reference: `docs/archive/features/WHATSAPP_RESPONSE_MESSAGES.md`
- UAT test plan: `docs/testing/whatsapp-voice-notes-uat.md` (52 scenarios)
- Unit tests: `packages/backend/convex/__tests__/whatsapp-voice-notes.test.ts` (104 tests)

---
**Commit**: Session work (January 24, 2026)
