## WhatsApp Voice Notes - Parent Notification Integration

This documents how WhatsApp voice notes connect to the parent notification system.

### Trust Level & Parent Notifications

| Trust Level | Auto-Apply? | Parent Notified? |
|-------------|-------------|------------------|
| 0-1 (New coach) | ❌ No | ❌ No (needs manual review) |
| 2 (Established) | ✅ Safe categories | ❌ No (applied but no notification) |
| 3 (Trusted) | ✅ Safe categories | ✅ Yes (auto-notifies parents) |

### WhatsApp Results Message

When a Trust Level 3 coach's insights are auto-applied with parent notification:

```
Auto-applied (2):
- John: Skill -> Parent    ← Parent will be notified
- Sarah: Rating -> Parent  ← Parent will be notified
```

The `-> Parent` indicator shows which insights will trigger parent notifications.

### Categories That Can Auto-Notify

| Category | Can Auto-Notify at Trust 3? |
|----------|----------------------------|
| skill_progress | ✅ Yes |
| skill_rating | ✅ Yes |
| performance | ✅ Yes |
| attendance | ✅ Yes |
| team_culture | ❌ No (team-level, no player) |
| todo | ✅ Yes (if has player) |
| injury | ❌ Never (sensitive) |
| behavior | ❌ Never (sensitive) |

### Sensitive Categories

Injury and behavior insights **NEVER** auto-notify parents:

```
Needs review (1):
- Jake: Injury
```

These always require coach review before parents can see them.

### Unmatched = No Parent Notification

If a player isn't matched, parents cannot be notified:

```
Unmatched (1):
- 'Michael' not in roster
```

Coach must manually match in the app before parent can see the insight.

### Related Documentation

- WhatsApp messages: `docs/archive/features/WHATSAPP_RESPONSE_MESSAGES.md`
- Parent-Coach Communication: Issue #242
- VoiceNote Enhancement: Issue #247

---
**Commit**: Session work (January 24, 2026)
