# WhatsApp Response Messages - Complete Reference

**Feature**: WhatsApp Voice Notes Integration
**Last Updated**: January 24, 2026
**Status**: Production Ready

---

## Overview

This document details all WhatsApp response messages sent by PlayerARC to coaches when they interact via WhatsApp. These messages are critical for coach UX and should be reviewed carefully before any changes.

---

## Message Reference

### 1. Phone Number Not Linked

**Trigger**: Coach's phone number not found in system

**Message**:
```
Your phone number isn't linked to a coach account in PlayerARC. Please add your phone number in your profile settings, or contact your club administrator.
```

**Location**: `whatsapp.ts:133-136`

---

### 2. Multi-Org Clarification Request

**Trigger**: Multi-org coach sends message without clear org context

**Message**:
```
Hi {coachName}! You're a coach at multiple clubs. Which one is this note for?

1. {Org1 Name}
2. {Org2 Name}

Reply with the number (1, 2, etc.) or club name.
```

**Location**: `whatsapp.ts:186-189`

---

### 3. Acknowledgment - Voice Note (Single Org)

**Trigger**: Audio message received from single-org coach

**Message**:
```
Voice note received. Transcribing...
```

**Location**: `whatsapp.ts:224-225`

---

### 4. Acknowledgment - Voice Note (Multi-Org)

**Trigger**: Audio message received from multi-org coach (org resolved)

**Message**:
```
Voice note received for {Organization Name}. Transcribing...
```

**Location**: `whatsapp.ts:224-225`

---

### 5. Acknowledgment - Text Note (Single Org)

**Trigger**: Text message received from single-org coach

**Message**:
```
Note received. Processing...
```

**Location**: `whatsapp.ts:226`

---

### 6. Acknowledgment - Text Note (Multi-Org)

**Trigger**: Text message received from multi-org coach (org resolved)

**Message**:
```
Note received for {Organization Name}. Processing...
```

**Location**: `whatsapp.ts:226`

---

### 7. Unsupported Message Type

**Trigger**: Coach sends image, video, or document

**Message**:
```
Sorry, I can only process text messages and voice notes. Images and videos aren't supported yet.
```

**Location**: `whatsapp.ts:255-258`

---

### 8. General Processing Error

**Trigger**: Error during message processing

**Message**:
```
Sorry, there was an error processing your message. Please try again or try directly in PlayerARC.
```

**Location**: `whatsapp.ts:275-278`

---

### 9. Invalid Org Selection

**Trigger**: Multi-org coach replies with unrecognized selection

**Message**:
```
Sorry, I didn't understand. Please reply with the number (1, 2, etc.) or club name:

1. {Org1 Name}
2. {Org2 Name}
```

**Location**: `whatsapp.ts:321-324`

---

### 10. Org Selection Confirmed

**Trigger**: Multi-org coach successfully selects organization

**Message**:
```
Got it! Recording for {Organization Name}. Processing your note...
```

**Location**: `whatsapp.ts:368-371`

---

### 11. Pending Message Processing Error

**Trigger**: Error processing the held message after org selection

**Message**:
```
Sorry, there was an error processing your note. Please try again.
```

**Location**: `whatsapp.ts:452-455`

---

### 12. Voice Note Not Found Error

**Trigger**: Voice note record missing during auto-apply check

**Message**:
```
There was an error processing your note. Please try again.
```

**Location**: `whatsapp.ts:678-681`

---

### 13. AI Analysis Failed

**Trigger**: Insights generation failed after max retries

**Message**:
```
Your note was saved but AI analysis failed. You can view it in the app.
```

**Location**: `whatsapp.ts:701-705`

---

### 14. Still Processing (Timeout)

**Trigger**: Insights still processing after max retries (80+ seconds)

**Message**:
```
Your note is still being processed. Check the app for updates.
```

**Location**: `whatsapp.ts:707-710`

---

### 15. Results Summary (Dynamic)

**Trigger**: Insights completed successfully

**Location**: `whatsapp.ts:960-1018`

**Example with mixed results:**
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

**Example - All applied:**
```
Analysis complete!

Auto-applied (3):
- John: Skill
- Sarah: Rating
- Emma: Attendance

All insights applied!
```

**Example - Nothing actionable:**
```
Analysis complete!

No actionable insights found.
```

---

## Key Design Decisions

### Branding
- Always use "PlayerARC" (not "PlayerArc" or "the app")
- Reference "profile settings" for account configuration
- Use "playerarc.com/insights" for review links

### Tone
- Professional but friendly
- Apologetic for errors ("Sorry, there was an error...")
- Informative for status updates
- Actionable where possible ("Please try again", "Check the app")

### Trust-Based Auto-Apply Categories

| Category | Auto-Apply at Trust 2+? | Notes |
|----------|------------------------|-------|
| skill_progress | ✅ Yes | Safe category |
| skill_rating | ✅ Yes | Safe category |
| performance | ✅ Yes | Safe category |
| attendance | ✅ Yes | Safe category |
| team_culture | ✅ Yes | Safe category (team-level) |
| todo | ✅ Conditional | Only if has assignee |
| injury | ❌ Never | Sensitive - always needs review |
| behavior | ❌ Never | Sensitive - always needs review |

### Result Display Limits
- Auto-applied: Show first 5, then "...and N more"
- Needs review: Show first 3, then "...and N more"
- Unmatched: Show first 3, then "...and N more"

---

## Multi-Org Detection Priority

When a coach belongs to multiple organizations, the system attempts to detect the correct org in this order:

1. **Single Org** - If coach only has 1 org, use it immediately
2. **Explicit Mention** - Patterns like `Grange:`, `@St. Mary's`, `for Grange`
3. **Team Name Match** - Message contains team name unique to one org
4. **Age Group Match** - Patterns like `u12`, `under-14`, `the twelves`
5. **Sport Match** - Keywords like `soccer`, `hurling`, `GAA`
6. **Player Name Match** - Player name unique to coach's teams in one org
7. **Coach Name Match** - Other coach's name unique to one org
8. **Session Memory** - Previous org used within 2 hours
9. **Ask for Clarification** - If all else fails

---

## Files Reference

| File | Purpose |
|------|---------|
| `packages/backend/convex/actions/whatsapp.ts` | Main WhatsApp processing logic |
| `packages/backend/convex/models/whatsappMessages.ts` | Multi-org detection, sessions, pending messages |
| `docs/testing/whatsapp-voice-notes-uat.md` | UAT test plan (52 scenarios) |
| `packages/backend/convex/__tests__/whatsapp-voice-notes.test.ts` | Unit tests (104 tests) |

---

## Related Issues

- #247 - VoiceNote Comprehensive Enhancement
- #242 - Parent-Coach Communication Enhancement
- #15 - Voice Notes UX Enhancements
- #315 - WhatsApp Filtering Bug (CLOSED - Fixed)
- #316 - WhatsApp Multiple Players Bug

---

*Generated by Claude Code - January 24, 2026*
