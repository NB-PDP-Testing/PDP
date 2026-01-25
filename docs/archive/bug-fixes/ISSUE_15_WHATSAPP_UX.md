## WhatsApp Voice Notes - UX Documentation

This update documents the WhatsApp voice notes UX flow and all response messages.

### Coach UX Flow

**Single-Org Coach:**
1. Coach sends voice note/text → "Voice note received. Transcribing..."
2. AI processes (15-30 seconds) → Results summary with auto-applied/pending

**Multi-Org Coach:**
1. Coach sends message → System attempts to detect org
2. If detected: "Note received for {Org Name}. Processing..."
3. If ambiguous: "Hi {Name}! You're a coach at multiple clubs..." → Coach replies with selection
4. After selection: "Got it! Recording for {Org}. Processing your note..."

### Response Message Tone

All messages follow these guidelines:
- **Brand**: Always "PlayerARC" (not "PlayerArc")
- **Settings reference**: "profile settings" (not "app settings")
- **Error tone**: Apologetic but actionable ("Sorry... Please try again")
- **Success tone**: Positive and informative

### Results Summary Format

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

**Display limits:**
- Auto-applied: First 5, then "...and N more"
- Needs review: First 3, then "...and N more"
- Unmatched: First 3, then "...and N more"

### Category Labels

| Internal Code | Display Label |
|--------------|---------------|
| skill_progress | Skill |
| skill_rating | Rating |
| performance | Performance |
| attendance | Attendance |
| team_culture | Team |
| todo | Task |
| injury | Injury |
| behavior | Behavior |

### Testing

- **UAT Plan**: `docs/testing/whatsapp-voice-notes-uat.md` (52 test scenarios)
- **Unit Tests**: `packages/backend/convex/__tests__/whatsapp-voice-notes.test.ts` (104 tests)

### All 15 Response Messages

Full documentation: `docs/archive/features/WHATSAPP_RESPONSE_MESSAGES.md`

---
**Commit**: Session work (January 24, 2026)
