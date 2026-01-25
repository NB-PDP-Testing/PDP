## WhatsApp Multi-Player Bug - Context Documentation

This documents the current WhatsApp message handling behavior related to Issue #316.

### Current Behavior

When a coach sends a WhatsApp message mentioning players from **different organizations**, the system:

1. Resolves the organization **once** at the start of message processing
2. All insights are created under that single organization
3. Players from other organizations appear as "unmatched"

### Example from Bug Report

Message: "Grange player did X. St. Mary's player did Y."

**Current result:**
- Org detected: Grange (first match wins)
- Player 1 (Grange): ✅ Matched correctly
- Player 2 (St. Mary's): ❌ Shows as "unmatched" because system is looking in Grange roster

### WhatsApp Response Message

The coach sees:
```
Analysis complete!

Auto-applied (1):
- John: Skill

Unmatched (1):
- 'Michael' not in roster

Review 1 pending: playerarc.com/insights
```

The "not in roster" message indicates the player wasn't found, but doesn't explain **why** (wrong org context).

### Potential Improvements

1. **Per-insight org detection** - Analyze each insight independently for org context
2. **Split messages** - If players from multiple orgs detected, ask coach to send separate messages
3. **Better unmatched message** - Show which org was used: "'Michael' not found in Grange FC roster"
4. **Warning message** - "Your message mentions players from multiple clubs. Please send separate notes for each club."

### Related Documentation

- Full WhatsApp messages: `docs/archive/features/WHATSAPP_RESPONSE_MESSAGES.md`
- Multi-org detection logic: `packages/backend/convex/models/whatsappMessages.ts`
- UAT tests: `docs/testing/whatsapp-voice-notes-uat.md`

### Current Multi-Org Detection Order

1. Single org (use immediately)
2. Explicit mention (`Grange:`, `@St. Mary's`)
3. Team name match
4. Age group match (`u12`, `under-14`)
5. Sport match (`soccer`, `hurling`)
6. Player name match
7. Coach name match
8. Session memory (2-hour window)
9. Ask for clarification

**Note**: Once org is resolved, ALL insights use that org. This is the root cause of #316.

---
**Commit**: Session work (January 24, 2026)
