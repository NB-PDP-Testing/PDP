# Issue #247 Update: VoiceNote Comprehensive Enhancement

**Date**: January 23, 2026
**Updated by**: Claude (via automated session)

---

## Progress Summary

Significant progress has been made on the VoiceNote system. The following features are now implemented and working:

### Phase 1: Core VoiceNote Enhancement - LARGELY COMPLETE

#### Recording Experience
- [x] Quick-start recording (minimal UI friction)
- [x] Audio visualization during recording
- [x] Review before saving
- [x] Mobile-optimized interface

#### AI Processing
- [x] Transcription via OpenAI Whisper (`whisper-1` model)
- [x] Automatic tagging (player names, skills, events)
- [x] Sentiment/category analysis (injury, skill_progress, behavior, etc.)
- [x] Team insight detection and assignment
- [x] TODO insight detection with coach assignment

#### Organization & Retrieval
- [x] Voice notes attached to specific players/teams
- [x] Category tagging (training, match, general)
- [x] Filter by date, player, team
- [x] Timeline view of all notes

#### Privacy & Access Control
- [x] Coaches see their own notes and team notes
- [x] Organization-scoped data isolation
- [x] Role-based access via functional roles

### NEW: WhatsApp Integration (Jan 2026)

A major new capability has been added:

**Coaches can now submit voice notes via WhatsApp!**

Features:
- Phone number matching to coach accounts
- Voice note and text message support
- Automatic processing through AI pipeline
- Trust-based auto-apply logic
- WhatsApp response messages with processing summary
- Source tracking in UI (WhatsApp badge)

Documentation: `docs/features/whatsapp-integration.md`

Key files:
- `packages/backend/convex/http.ts` - Webhook handler
- `packages/backend/convex/actions/whatsapp.ts` - Message processing
- `packages/backend/convex/models/whatsappMessages.ts` - Phone lookup, storage

### Phase 2: Insights & Analytics - PARTIALLY COMPLETE

#### Automated Insights
- [x] Category detection (skill_rating, skill_progress, injury, behavior, performance, attendance, team_culture, todo)
- [x] Player name matching to roster
- [x] Team name matching
- [x] Coach assignment for TODO insights
- [ ] Trend detection (multiple notes over time) - NOT YET
- [ ] Early warning detection - NOT YET

#### Coach Dashboard Enhancements
- [x] Insights tab with pending/applied/dismissed sections
- [x] History tab with full note listing
- [x] WhatsApp source indicator
- [x] Coach name display on insights
- [ ] "Notes to Review" queue - PARTIAL (insights tab serves this)
- [ ] Pattern recognition across players - NOT YET

#### Parent Notifications
- [x] Coach Parent Summaries system (separate feature)
- [x] Acknowledgment system for parents
- [ ] Weekly digest - NOT YET
- [ ] WhatsApp delivery to parents - NOT YET

### Trust Level System - COMPLETE

The coach trust level system controls auto-apply behavior:

| Level | Name | Behavior |
|-------|------|----------|
| 0 | New Coach | No auto-apply, all manual review |
| 1 | Building Trust | No auto-apply, all manual review |
| 2 | Trusted | Auto-apply safe categories (no parent summaries) |
| 3 | Highly Trusted | Auto-apply + trigger parent summaries |

Safe categories (auto-apply at level 2+): `skill_progress`, `performance`, `attendance`, `team_culture`, `todo`
Never auto-apply: `injury`, `behavior` (always require human review)

---

## Technical Implementation Details

### Transcription Model Analysis

Research was conducted on transcription models (Jan 2026):

| Model | WER | Cost | WhatsApp Support | Status |
|-------|-----|------|------------------|--------|
| whisper-1 | 10.6% | $0.006/min | ✅ Works | **Current** |
| gpt-4o-mini-transcribe | 13.2% | $0.003/min | ❌ Issues | Not recommended |
| gpt-4o-transcribe | 8.9% | $0.006/min | ❌ Issues | Not recommended |
| Deepgram Nova-3 | 12.8% | $0.0043/min | ✅ Good | Future consideration |
| ElevenLabs Scribe v2 | ~9-10% | $0.004/min | ✅ Good | Future consideration |

**Key Finding**: The newer GPT-4o transcribe models have format compatibility issues with WhatsApp's OGG/Opus audio. `whisper-1` remains the most reliable choice.

**OpenRouter Note**: OpenRouter does NOT provide speech-to-text APIs. It's for LLM text generation routing only. Could potentially be used for the insights extraction step (not transcription).

### Key Code Files

| File | Purpose |
|------|---------|
| `convex/models/voiceNotes.ts` | Core CRUD, insight management |
| `convex/actions/voiceNotes.ts` | Transcription, AI insights extraction |
| `convex/actions/whatsapp.ts` | WhatsApp message processing |
| `convex/models/whatsappMessages.ts` | Phone lookup, message storage |
| `convex/models/coachTrustLevels.ts` | Trust level management |
| `convex/models/coachTasks.ts` | TODO task creation from insights |
| `convex/actions/coachParentSummaries.ts` | Parent summary generation |

---

## Outstanding Work

### High Priority
1. **Production WhatsApp** - Currently using Twilio sandbox, need WhatsApp Business API
2. **Custom vocabulary for transcription** - Player names often misspelled
3. **Trend detection** - Track patterns across multiple notes

### Medium Priority
4. **Real-time transcription display** - Show interim results while speaking
5. **Search and filter** - Full-text search of transcriptions
6. **Export to CSV** - Download note history

### Lower Priority
7. **Multi-coach collaboration** - Reply to voice notes
8. **Templates & prompts** - Guided voice note capture
9. **Video notes** - Rich media support

---

## Related Issues

- **#15** - Voice Notes UX Enhancements (bulk actions, edit, search)
- **#17** - Parent Notification System (alerts when insights applied)
- **#242** - Parent-Coach Communication (bidirectional messaging)

---

## Files Changed (Recent Commits)

```
packages/backend/convex/http.ts              - WhatsApp webhook
packages/backend/convex/actions/whatsapp.ts  - WhatsApp processing
packages/backend/convex/models/whatsappMessages.ts - Phone lookup
packages/backend/convex/models/voiceNotes.ts - Source field added
packages/backend/convex/schema.ts            - whatsappMessages table, source field
apps/web/.../voice-notes/components/history-tab.tsx - WhatsApp badge
docs/features/whatsapp-integration.md        - New documentation
```
