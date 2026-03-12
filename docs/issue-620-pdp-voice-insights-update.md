# Issue #620 Update: PDP Voice Insights — Requirements & Design Decisions

> Comprehensive update from requirements gathering sessions. These decisions form the foundation for PRD development.

---

## 1. Voice Call Integration — Design Decisions

### Phone Call Flow: Straight to Voicemail (Minimal Friction)
- Coach calls a dedicated PlayerARC number → hears a beep → talks → hangs up
- **No IVR menus, no prompts, no agent interaction** — pure voicemail capture
- AI processes the recording asynchronously (context detection, player extraction)
- This maximizes adoption: coaches can call while driving, walking pitchside, etc.

### In-App Voice Notes
- Native voice recording within the PlayerARC app
- Context-aware: knows which session/team/match day the coach is in
- Supports quick tap-to-record during live training or matches

### Processing Pipeline: Full AI
- All voice inputs (phone + in-app) are auto-transcribed
- AI extracts: player mentions, sentiment, tactical observations, development notes
- Structured insights stored in database — never raw audio
- **Audio auto-deleted after processing** (privacy by design)

---

## 2. AI-Powered Player Linking

### Auto-Detection & Matching
- AI identifies player names from transcription and matches against the team roster
- Handles nicknames, partial names, jersey numbers mentioned in context
- Confidence scoring: high-confidence links are automatic, low-confidence flagged for coach review
- Supports multi-player mentions in a single voice note

---

## 3. Insight History & Browsing Model

### Dual-View Architecture
Both views are available, serving different use cases:

**Hierarchical Tree View**
```
Season 2025/26
  └── March 2026
       └── Match Day vs. Rovers (Mar 8)
            ├── Pre-match observations
            ├── First-half notes
            ├── Half-time adjustments
            └── Post-match reflections
       └── Training Session (Mar 6)
            ├── Warm-up observations
            └── Drill-specific notes
```

**Theme-Based Clusters**
```
Tommy O'Brien — Positioning
  ├── Mar 8: "Tommy drifting too wide again in second half"
  ├── Mar 3: "Better positioning today, holding the line"
  └── Feb 24: "Needs work on defensive positioning"

Sarah Chen — Leadership
  ├── Mar 8: "Sarah organized the backline brilliantly"
  └── Mar 1: "Starting to show vocal leadership in training"
```

This enables both chronological review (what happened at a session) and developmental tracking (how a player's skill has evolved over time).

---

## 4. Integration Points

### All Four Integration Paths Confirmed

| Integration | Description |
|---|---|
| **Session Reports** | Voice insights automatically feed into match/training session reports. AI generates summaries combining all coaches' observations |
| **Existing Assessments** | Voice insights inform and pre-populate player assessment forms. Historical voice data surfaces as context when coaches do formal evaluations |
| **AI Coaching Assistant** | The coaching assistant has full access to voice insight history. Can answer queries like "What have I said about Tommy's positioning over the last month?" |
| **Parent Updates** | AI generates parent-appropriate summaries from coach observations. **Text-only** (no audio access for parents). Filtered for constructive, development-focused language |

---

## 5. Multi-Coach Collaboration

### Session-Based Model
- A coach starts a **Match Day** or **Training Session** in the app
- Other coaches join the same session via the app
- All voice notes within a session are aggregated
- AI merges observations from multiple coaches into a unified session summary
- Attribution preserved: each observation tagged with the contributing coach

### How It Works
```
Match Day: U14 Boys vs Rovers (Mar 8)
  ├── Coach A (Head Coach): 4 voice notes
  ├── Coach B (Assistant): 2 voice notes
  └── Coach C (GK Coach): 1 voice note

→ AI Summary combines all 7 observations
→ Each coach can see others' contributions
→ Unified report generated for the session
```

---

## 6. AI Summary Timing

### Near Real-Time (Within 5 Minutes)
- After the last voice note in a burst, AI processing kicks in within ~5 minutes
- Intermediate summaries update as new notes arrive during a session
- Final comprehensive summary generated when session is marked complete
- This allows coaches to review insights shortly after a training/match ends

---

## 7. Privacy & Data Handling

### Audio Auto-Delete Policy
- Raw audio recordings are **deleted immediately after transcription and AI processing**
- Only structured text data (transcriptions, insights, tags, player links) is retained
- No audio storage = reduced privacy risk, lower storage costs

### Parent Access Controls
- Parents receive **text-only** summaries — no access to raw transcriptions
- Content is AI-filtered for constructive, development-focused language
- Parents see only insights relevant to their linked child(ren)
- Coach notes flagged as "internal" are excluded from parent views

---

## 8. Technical Architecture Considerations

### Voice Capture Layer
- **Phone calls**: Twilio Programmable Voice (voicemail capture)
- **In-app**: Web Audio API / React Native audio recording
- Both routes feed into the same processing pipeline

### AI Processing Pipeline
```
Voice Input → Transcription (Whisper/Deepgram)
  → Player Entity Detection (Claude/GPT)
  → Sentiment Analysis
  → Tag Extraction (tactical, fitness, mental, technical)
  → Structured Insight Storage (Convex)
  → Audio Deletion
```

### Data Model (Conceptual)
- `voiceInsights` — individual processed observations
- `insightSessions` — grouping of observations by match day/training
- `insightPlayerLinks` — junction table linking insights to players
- `insightThemes` — AI-generated thematic clusters

### Platform Considerations
- WhatsApp Business integration for voice notes (as mentioned in #444)
- RCS/SMS for US market reach
- Local LLM hardware for pitchside processing (as mentioned in #303)

---

## 9. Related Issues
- **#444** — WhatsApp/messaging platform integration
- **#303** — Live training/match monitoring with local LLM hardware

---

## Next Steps
1. **Draft formal PRD** with phased delivery plan
2. **Architecture design** — Convex schema, Twilio integration, AI pipeline
3. **Prototype** — Phone-to-insight flow (voicemail → transcription → structured insight)
4. **UI/UX design** — History tree + theme cluster views

---

*Updated: 2026-03-12 | Source: Requirements gathering sessions*
