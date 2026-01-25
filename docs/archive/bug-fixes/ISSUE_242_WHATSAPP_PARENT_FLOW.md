## WhatsApp Integration - Parent Notification Flow

This update documents how WhatsApp voice notes connect to parent notifications.

### Parent Notification Trigger

When a coach sends a WhatsApp message that generates insights:

1. **Trust Level 3 coaches** - Insights are auto-applied AND parent summaries are queued
2. **Trust Level 2 coaches** - Insights are auto-applied, but no automatic parent notification
3. **Trust Level 0-1 coaches** - All insights need manual review before parents are notified

### Results Message Indicator

The WhatsApp results summary shows when parent notifications will be sent:

```
Auto-applied (2):
- John: Skill -> Parent    ← Parent will be notified
- Sarah: Rating -> Parent  ← Parent will be notified
```

The `-> Parent` indicator only appears for Trust Level 3 coaches with player-specific insights.

### Sensitive Categories

Injury and behavior insights **NEVER** auto-apply or trigger parent notifications automatically. They always require coach review:

```
Needs review (1):
- Jake: Injury  ← Coach must review before any parent sees this
```

### Unmatched Players

If a player name isn't recognized, parents cannot be notified:

```
Unmatched (1):
- 'Michael' not in roster  ← No player match, no parent notification
```

Coaches should review unmatched insights in the app and manually assign them to players.

### Multi-Org Relevance

For coaches at multiple clubs, the system correctly routes insights to the right organization's parents. Detection methods include:
- Explicit org mentions
- Team/player name matching
- Age group/sport keywords
- Session memory (2-hour window)

### Documentation

- Full WhatsApp messages reference: `docs/archive/features/WHATSAPP_RESPONSE_MESSAGES.md`
- Related: Issue #247 (VoiceNote Enhancement), Issue #17 (Parent Notification System)

---
**Commit**: Session work (January 24, 2026)
