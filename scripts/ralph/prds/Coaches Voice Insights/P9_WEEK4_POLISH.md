# Phase 9 Week 4: Personalization & Polish

**Branch:** `ralph/team-collaboration-hub-p9`
**Stories:** 7 stories (US-P9-034 to US-P9-040)
**Effort:** ~18 hours
**Prerequisite:** Week 3 complete

---

## Week 4 Deliverables

- Tone controls for parent summaries (Warm/Professional/Brief)
- Frequency controls (Every insight/Daily/Weekly)
- Audio playback in voice note detail
- Inline editing components
- Smart notification digests (email summaries)
- **Unified Team Hub page** bringing all features together

---

## User Stories

### US-P9-034: Extend coachOrgPreferences (Parent Comms) (1h)
- Add parentSummaryPreferences field (tone, verbosity)
- Add parentCommunicationPreferences field (frequency, digestTime)

### US-P9-035: Add Tone Controls to Settings (2h)
- Dropdown: Warm, Professional, Brief
- Preview card showing example summary
- Preview updates on selection

### US-P9-036: Add Frequency Controls to Settings (2h)
- Radio buttons: Every insight, Daily digest, Weekly digest
- Time picker (if digest selected)
- Preview text

### US-P9-037: Add Audio Playback to Voice Note Detail (1h)
- HTML5 audio player above transcript
- Play/pause, scrubbing, volume controls
- Download button

### US-P9-038: Create Inline Editing Components (3h)
- `editable-text.tsx` and `editable-description.tsx`
- Click to edit
- Cmd+Enter to save, Esc to cancel
- Auto-save on blur
- Optimistic UI updates

### US-P9-039: Create Smart Notification Digest Backend (4h)
- Cron job runs daily at coach's digestTime
- Query unread activities
- Group by priority
- Generate summary text
- Send email via action
- Mark activities as digested

### US-P9-040: Create Team Hub Page (3h)
- **FINAL INTEGRATION PAGE**
- Team selector dropdown
- Tab navigation: Insights, Tasks, Planning, Activity
- Presence indicators in header
- Notification center in header
- URL persistence: ?team=[teamId]&tab=insights

---

## Team Hub Page Structure

```
┌───────────────────────────────────────────────────────────┐
│ Team Hub - U14 Girls GAA                     [Team ▼]    │
│                                                            │
│ 🟢 Coach Sarah • 🟢 Coach Michael              🔔 (3)    │
├───────────────────────────────────────────────────────────┤
│ [Insights] [Tasks] [Planning] [Activity]                 │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ INSIGHTS TAB ─────────────────────────────────────┐   │
│ │ [List] [Board] [Calendar] [Players]                │   │
│ │                                                     │   │
│ │ All Week 3 features integrated here                │   │
│ └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Success Criteria

Week 4 complete when:
- ✅ Tone/frequency controls work with previews
- ✅ Audio player plays voice notes
- ✅ Inline editing works
- ✅ Notification digest emails send
- ✅ **Team Hub page unifies all features**
- ✅ All 48 stories have `passes: true`

---

## Phase 9 COMPLETE

All 48 stories implemented. PlayerARC is now a **best-in-class team collaboration platform**:

✅ Real-time presence
✅ Comments & reactions
✅ @Mentions with autocomplete
✅ AI Copilot smart suggestions
✅ Mobile gesture controls
✅ 4 view layouts
✅ Session templates
✅ Democratic voting
✅ Priority notifications
✅ Unified Team Hub

**No competitor has ANY of these features.**

---

**Document Version:** 1.0
**Created:** January 30, 2026
