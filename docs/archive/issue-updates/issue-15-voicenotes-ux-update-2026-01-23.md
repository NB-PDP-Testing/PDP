# Issue #15 Update: Voice Notes UX Enhancements

**Date**: January 23, 2026
**Updated by**: Claude (via automated session)

---

## Current State Assessment

### Features from Original Issue

| Feature | Status | Notes |
|---------|--------|-------|
| Apply All / Reject All buttons | ❌ Not Started | Still needed |
| Edit insight before applying | ❌ Not Started | Still needed |
| Real-time transcription display | ❌ Not Started | Would improve UX |
| Search and filter notes | ❌ Not Started | Still needed |
| Export to CSV | ❌ Not Started | Still needed |

### What HAS Been Implemented (Related Work)

While the specific UX features in this issue haven't been built, significant voice notes functionality has been added:

#### UI Improvements Made
- **WhatsApp source indicator** - Green badge with WhatsApp icon on notes from WhatsApp
- **Insights organized by status** - Pending, Applied, Dismissed sections
- **Coach name display** - Shows which coach created each note
- **Date/time formatting** - Relative dates ("2 hours ago")
- **Processing status indicators** - Shows when transcription/insights are in progress

#### Backend Capabilities Added
- **Source tracking** - Notes now track origin (`app_recorded`, `app_typed`, `whatsapp_audio`, `whatsapp_text`)
- **Trust-based auto-apply** - Reduces manual work for trusted coaches
- **TODO insight handling** - Creates coach tasks from TODO insights
- **Team insight detection** - Auto-assigns team-related insights

---

## Recommendations for Implementation

### Priority 1: Bulk Actions
```
Apply All / Reject All buttons
```
- Add to Insights tab header
- Should respect trust levels (only show for appropriate categories)
- Consider "Apply All Safe" vs "Apply All" distinction

### Priority 2: Edit Before Apply
```
Modal to edit insight before applying
```
- Allow editing: title, description, player assignment, category
- Useful when AI makes minor mistakes
- Could include "suggest correction" to improve AI

### Priority 3: Search & Filter
```
Search transcriptions, filter by date/player/type/status
```
- Full-text search of transcriptions
- Filter dropdowns for: Note type, Date range, Player, Status
- Could leverage existing index: `by_orgId_and_coachId`

### Priority 4: Export
```
CSV download of note history
```
- Export fields: Date, Type, Transcription, Insights, Status, Player
- Useful for reporting and record-keeping

### Priority 5: Real-time Transcription
```
Show interim results while speaking
```
- Would require WebSocket or streaming connection
- OpenAI Whisper doesn't support streaming natively
- Could use local browser speech recognition for preview, then Whisper for final

---

## Related Features

This issue connects to:
- **#247** - VoiceNote Comprehensive Enhancement (parent feature)
- **#17** - Parent Notification System (triggers on insight apply)
- **#242** - Parent-Coach Communication (voice notes trigger parent alerts)

New capability added:
- **WhatsApp Integration** - Coaches can submit voice notes via WhatsApp
- Documentation: `docs/features/whatsapp-integration.md`

---

## Technical Notes

### Current UI Components
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/
├── page.tsx                    # Main page with tabs
├── components/
│   ├── record-tab.tsx         # Recording interface
│   ├── type-tab.tsx           # Text input interface
│   ├── insights-tab.tsx       # Pending insights management
│   └── history-tab.tsx        # Note history with WhatsApp badge
```

### Backend Endpoints
```
convex/models/voiceNotes.ts
- getAllVoiceNotes(orgId)
- getVoiceNotesByCoach(orgId, coachId)
- getPendingInsights(orgId)
- updateInsightStatus(noteId, insightId, status)
- deleteVoiceNote(noteId)
```

### Indexes Available
```
voiceNotes:
- by_orgId
- by_orgId_and_coachId
- by_status (if added)
```

For search, may need to add full-text search capability or use Convex's search feature.
