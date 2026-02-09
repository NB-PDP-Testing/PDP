# Voice Gateways v2 - Complete Plan Overview

**Project**: Voice Enhance Gating-WAPP v2
**Branch**: `feat/voice-gateways-v2`
**Issue**: [#423 - WhatsApp Quality Gates](https://github.com/NB-PDP-Testing/PDP/issues/423)
**Total Duration**: 26.5-31.5 days (6 phases)
**Total Stories**: 22 user stories
**Status**: Ready for execution ✅

---

## 🎯 Executive Summary

### The Problem
1. **Gibberish processed** - No quality gates, wasting ~5-10% of API calls ($50-100/month)
2. **Generic errors** - "Still processing..." doesn't help coaches understand failures
3. **Poor name matching** - "Shawn" doesn't find "Seán", "Neeve" doesn't find "Niamh"
4. **No coach control** - All AI categories always ON, no way to save costs

### The Solution
6-phase incremental implementation:
- **Phase 1**: Quality gates + fuzzy matching + AI preferences (4 days)
- **Phase 2**: Mobile quick review UI (5-7 days)
- **Phase 3-6**: v2 pipeline with claims, entity resolution, drafts (16 days)

### Expected Impact
- **Cost savings**: 25-40% reduction in processing costs
- **Better UX**: Specific feedback instead of generic errors
- **Coach control**: Toggle AI categories (save additional 20-40%)
- **Accurate matching**: Irish names and typos handled correctly

---

## 📊 All 6 Phases Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE GATEWAYS V2 ROADMAP                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1 (Week 1): Quality Gates + Fuzzy Matching + AI Prefs   │
│  ├─ Quality gates reject gibberish                             │
│  ├─ Fuzzy matching (Levenshtein for Irish names)              │
│  └─ Coach AI category preferences (NEW!)                       │
│                                                                 │
│  Phase 2 (Week 2): Mobile Quick Review UI                      │
│  ├─ Time-limited deep links (48h expiry)                       │
│  ├─ Fuzzy match suggestions for unmatched players              │
│  └─ Trust-adaptive WhatsApp messages                           │
│                                                                 │
│  Phase 3 (Week 3): v2 Artifacts Foundation                     │
│  ├─ New tables (artifacts, transcripts)                        │
│  ├─ Feature flags (multi-layered control)                      │
│  └─ Dual-path processing (v1 + v2 coexist)                    │
│                                                                 │
│  Phase 4 (Week 4): Claims Extraction                           │
│  ├─ GPT-4 segments transcripts into atomic claims              │
│  ├─ One claim per player mention                               │
│  └─ Category filtering (respects AI preferences!)              │
│                                                                 │
│  Phase 5 (Week 5): Entity Resolution & Disambiguation          │
│  ├─ Uses Phase 1 fuzzy matching for entities                   │
│  ├─ Auto-resolve high-confidence matches                       │
│  └─ Disambiguation UI for ambiguous matches                    │
│                                                                 │
│  Phase 6 (Week 6): Drafts & Confirmation Workflow              │
│  ├─ Create drafts instead of auto-applying                     │
│  ├─ WhatsApp commands (CONFIRM/CANCEL/EDIT)                   │
│  └─ Migration script (v1 → v2)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase 1: Quality Gates + Fuzzy Matching + AI Preferences

**Duration**: 4 days (parallel streams)
**Stories**: 7 (US-VN-001 to US-VN-006b)
**Approach**: Stream A and Stream B run in parallel, merge after both complete

### Stream A: Quality Gates (2 days)

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-001** | Text Message Quality Gate | 0.5 day | Rejects empty, too short, or gibberish text messages |
| **US-VN-002** | Transcript Quality Validation | 0.5 day | Validates audio transcripts, detects inaudible/noisy audio |
| **US-VN-003** | Duplicate Message Detection | 0.5 day | Prevents processing duplicate messages within 5 minutes |
| **US-VN-004** | Enhanced WhatsApp Feedback | 0.5 day | Sends specific error messages instead of generic "processing" |

**Total**: 2 days (sequential within stream)

### Stream B: Fuzzy Matching + AI Preferences (3.5 days)

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-005** | Levenshtein Fuzzy Matching | 1 day | Implements algorithm for typo/phonetic matching |
| **US-VN-006** | Find Similar Players Query | 1 day | Uses Levenshtein to suggest player matches (0.5+ similarity) |
| **US-VN-006b** | Coach AI Category Preferences | 1.5 days | Enables coaches to toggle AI categories (save 20-40% costs) |

**Total**: 3.5 days (sequential within stream)

### Parallel Execution
- Stream A and Stream B run **concurrently**
- Total calendar time: **3.5 days** (longer stream)
- Merge & integration: **0.5 day**
- **Phase 1 total: 4 days**

### What Gets Built

**Quality Gates**:
```typescript
// Text validation
validateTextMessage("hi") → rejected (too short)
validateTextMessage("John did well today") → accepted

// Transcript validation
validateTranscriptQuality("[inaudible] [music]") → rejected (70% uncertain)
validateTranscriptQuality("John improved in training") → accepted (sports context)

// Duplicate detection
checkForDuplicateMessage(phone, body, 5min) → prevents reprocessing
```

**Fuzzy Matching**:
```typescript
// Irish names work!
levenshteinSimilarity("Seán", "Shawn") → 0.85 (85% match)
levenshteinSimilarity("Niamh", "Neeve") → 0.60 (60% match)
levenshteinSimilarity("O'Brien", "O'Bryan") → 0.95 (95% match)

// Find candidates
findSimilarPlayers("Shawn", players) → [
  { name: "Seán", similarity: 0.85 },
  { name: "Shane", similarity: 0.75 },
  { name: "Shaun", similarity: 0.90 }
]
```

**AI Category Preferences** (NEW!):
```typescript
// Coach can toggle these in UI:
coachAIPreferences {
  autoDetectPlayerNames: true,    // Toggle to save API calls
  extractInjuryMentions: true,    // Toggle to skip injury processing
  skillProgressTracking: true     // Toggle to skip skill processing
}

// Processing respects preferences
if (!prefs.extractInjuryMentions) {
  // Skip injury extraction → save 30% costs!
}
```

### Success Criteria (16 items)
- ✅ Quality gates reject gibberish (5-10% messages)
- ✅ Detailed error messages (not generic)
- ✅ Duplicate detection (5-min window)
- ✅ Fuzzy matching finds candidates (similarity > 0.5)
- ✅ Irish names handled (Seán, Niamh, O'Brien, etc.)
- ✅ **Coach can toggle AI categories** (NEW!)
- ✅ **Insight extraction respects disabled categories** (NEW!)
- ✅ **Cost savings: 20-40% for selective coaches** (NEW!)
- ✅ All unit tests passing (100% coverage)
- ✅ Type check passes (0 errors)
- ✅ Manual UAT: 21 test cases passing (was 18, +3 for AI prefs)
- ✅ Performance: < 100ms for 1000 players
- ✅ No regressions

### Cost Savings
- **Quality gates**: 5-10% messages rejected → $40-80/month saved
- **AI preferences**: 20-40% for selective coaches → $60-80/month saved
- **Total Phase 1 savings**: $100-160/month (~35-45% reduction)

---

## 📋 Phase 2: Mobile Quick Review UI

**Duration**: 5-7 days
**Stories**: 6 (US-VN-007 to US-VN-012)
**Dependencies**: Phase 1 complete (uses fuzzy matching from US-VN-006)

### User Stories

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-007** | Review Links Backend | 1 day | Generates time-limited deep links (48h expiry) with unique codes |
| **US-VN-008** | Redirect Route | 0.5 day | Short URL route `/r/[code]` that validates and redirects |
| **US-VN-009** | Quick Review Page | 2 days | Mobile-optimized review page with collapsible sections |
| **US-VN-010** | Unmatched Player Cards | 1.5 days | Shows fuzzy match suggestions (uses Phase 1!) with similarity scores |
| **US-VN-011** | Trust-Adaptive Messages | 0.5 day | WhatsApp messages vary by coach trust level (TL0-3) |
| **US-VN-012** | Link Expiry & Cleanup | 0.5 day | Cron job deletes expired links (>7 days old) |

### What Gets Built

**WhatsApp Flow**:
```
Coach sends voice note
         ↓
Processing... (quality gates + extraction)
         ↓
WhatsApp: "✅ Analysis complete!

Quick review: app.playerarc.io/r/Ab3xK9mQ
(Link expires in 48 hours)"
         ↓
Coach taps link → Opens mobile-optimized review page
         ↓
Shows:
  - Voice note context (collapsible transcript)
  - Matched insights (approve/edit)
  - Unmatched players with fuzzy suggestions!
    → "Shawn" suggests: Seán (85%), Shane (75%), Shaun (90%)
  - Auto-applied insights (collapsed)
         ↓
Coach selects correct player or searches manually
         ↓
Done! ✅
```

**Trust-Adaptive Messages**:
```typescript
// TL0-1 (Low trust): Emphasize review needed
"⚠️ 4 insights need your review.
Quick review: app.playerarc.io/r/[code]"

// TL2 (Medium trust): Show both auto + pending
"✅ Auto-applied (2): John, Sarah
⚠️ Needs review (1): app.playerarc.io/r/[code]"

// TL3 (High trust): Emphasize success
"✅ All done! Auto-applied 3 insights.
John, Sarah, Emma

(Quick review if needed: app.playerarc.io/r/[code])"
```

### Key Integration
**Uses Phase 1 Fuzzy Matching**:
```typescript
// In UnmatchedPlayerCard component:
const suggestions = useQuery(
  api.models.orgPlayerEnrollments.findSimilarPlayers,  // From US-VN-006!
  { searchName: "Shawn", limit: 4 }
);

// Shows:
// ○ Seán O'Brien (U14) - 85% match
// ○ Shane Murphy (U16) - 75% match
// ○ Shaun Kelly (U14) - 90% match
// ○ Someone else...
```

### Success Criteria (10 items)
- ✅ Review link generated after processing
- ✅ Link expires after 48 hours
- ✅ Mobile-optimized layout (touch-friendly)
- ✅ Fuzzy suggestions shown for unmatched
- ✅ Similarity scores displayed (0-100%)
- ✅ Trust-adaptive messages working
- ✅ Expired link shows clear message
- ✅ Cron job cleans up old links (>7 days)

---

## 📋 Phase 3: v2 Artifacts Foundation

**Duration**: 3 days
**Stories**: 2 (US-VN-013 to US-VN-014)
**Dependencies**: Phase 2 deployed to production
**Goal**: Lay groundwork for v2 pipeline while v1 runs in production

### User Stories

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-013** | Artifacts & Transcripts Tables | 1.5 days | Creates v2 schema (source-agnostic, detailed transcripts) |
| **US-VN-014** | Dual-Path Processing | 1.5 days | Feature flags control v1 vs v2, both can run in parallel |

### What Gets Built

**New Tables**:
```typescript
// voiceNoteArtifacts - Source-agnostic record
{
  artifactId: string,
  sourceChannel: "whatsapp_audio" | "whatsapp_text" | "app_recorded" | "app_typed",
  senderUserId: string,
  status: "received" | "transcribing" | "transcribed" | "resolving" | "drafts_ready",
  voiceNoteId?: id  // Links to v1 for backwards compat
}

// voiceNoteTranscripts - Detailed transcription
{
  artifactId: id,
  fullText: string,
  segments: [
    { text: string, startTime: number, endTime: number, confidence: number }
  ],
  language: string,
  duration: number
}
```

**Feature Flag System** (Multi-layered):
```typescript
// Evaluation order: Platform → Org → Coach → PostHog → Default (v1)

async function shouldUseV2Pipeline(orgId, coachId) {
  // 1. Platform config (global on/off)
  const platform = await platformConfig.get("voice_notes_v2_enabled");
  if (platform === false) return false;
  if (platform === true) return true;

  // 2. Organization setting
  const org = await getOrg(orgId);
  if (org.settings?.voiceNotesVersion === "v2") return true;
  if (org.settings?.voiceNotesVersion === "v1") return false;

  // 3. Coach beta features
  const coach = await getCoach(coachId);
  if (coach.betaFeatures?.includes("voice_notes_v2")) return true;

  // 4. Default: v1
  return false;
}
```

**Dual-Path Processing**:
```typescript
// In processIncomingMessage:
const useV2 = await shouldUseV2Pipeline(orgId, coachId);

if (useV2) {
  // v2 path: Create artifact + transcript
  const artifactId = await createArtifact({ sourceChannel: "whatsapp_audio", ... });
  // Still create v1 voice note for backwards compat
  const voiceNoteId = await createVoiceNote({ ... });
  await linkArtifactToVoiceNote(artifactId, voiceNoteId);
} else {
  // v1 path: Existing flow (unchanged)
  const voiceNoteId = await createVoiceNote({ ... });
}
```

### Success Criteria
- ✅ v2 tables exist and indexed
- ✅ Dual-path works (v1 + v2 coexist)
- ✅ Feature flags control which path
- ✅ No breaking changes to v1
- ✅ v1 and v2 can run simultaneously

---

## 📋 Phase 4: Claims Extraction

**Duration**: 4 days
**Stories**: 2 (US-VN-015 to US-VN-016)
**Dependencies**: Phase 3 complete, **US-VN-006b** (AI preferences)
**Goal**: Segment transcripts into atomic claims (one per player)

### User Stories

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-015** | Claims Table & Extraction | 2 days | GPT-4 segments transcript, creates atomic claims |
| **US-VN-016** | Claim Processing Integration | 2 days | Hooks claims into v2 pipeline after transcription |

### What Gets Built

**New Table**:
```typescript
// voiceNoteClaims - Atomic units
{
  claimId: string,
  artifactId: id,
  sourceText: "John did well in training",  // Exact quote
  topic: "performance" | "injury" | "wellbeing" | "skill_progress" | ...,
  entityMentions: [
    { mentionType: "player_name", rawText: "John", position: 0 }
  ],
  extractionConfidence: 0.9,
  status: "extracted" | "resolved" | "pending_disambiguation"
}
```

**GPT-4 Extraction with AI Preferences** (NEW!):
```typescript
// Get coach AI preferences (from US-VN-006b!)
const aiPrefs = await getCoachAIPreferences(coachId, orgId);

// Build prompt based on ENABLED categories only
const enabledCategories = [];
if (aiPrefs.extractInjuryMentions) enabledCategories.push("injury");
if (aiPrefs.skillProgressTracking) enabledCategories.push("skill_progress");
if (aiPrefs.extractPerformanceNotes) enabledCategories.push("performance");

const prompt = `
  Extract claims from this transcript.
  ONLY extract claims in these categories: ${enabledCategories.join(", ")}

  Transcript: "John did well in training today but Sarah struggled with tackling"

  Return JSON array of atomic claims (one per player mention)...
`;

// Call GPT-4 with FILTERED prompt → saves tokens!
const claims = await openai.createChatCompletion({ ... });
```

**Example Output**:
```json
[
  {
    "sourceText": "John did well in training today",
    "topic": "performance",
    "entityMentions": [{ "mentionType": "player_name", "rawText": "John" }],
    "sentiment": "positive"
  },
  {
    "sourceText": "Sarah struggled with tackling",
    "topic": "skill_progress",
    "entityMentions": [{ "mentionType": "player_name", "rawText": "Sarah" }],
    "sentiment": "needs_improvement"
  }
]
```

### Cost Savings from AI Preferences
- If coach disables injuries: **Don't ask GPT-4 about injuries** → 30% fewer tokens
- If coach disables skills: **Don't ask GPT-4 about skills** → 30% fewer tokens
- **Expected savings**: 30-50% for selective coaches

### Success Criteria
- ✅ Claims table created
- ✅ GPT-4 segments transcripts correctly
- ✅ One claim per player mention
- ✅ **Respects coach AI preferences** (filters categories)
- ✅ **Token savings measured** (30-50% for selective)
- ✅ Claims viewer page (debug tool)

---

## 📋 Phase 5: Entity Resolution & Disambiguation

**Duration**: 4 days
**Stories**: 2 (US-VN-017 to US-VN-018)
**Dependencies**: Phase 4 complete, **US-VN-006** (fuzzy matching), **US-VN-006b** (AI prefs)
**Goal**: Resolve player mentions using Phase 1 fuzzy matching

### User Stories

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-017** | Entity Resolution Table | 2 days | Stores fuzzy match candidates for each entity mention |
| **US-VN-018** | Disambiguation UI | 2 days | Shows candidates in Mobile Quick Review for coach selection |

### What Gets Built

**New Table**:
```typescript
// voiceNoteEntityResolutions
{
  claimId: id,
  mentionIndex: 0,
  rawText: "Shawn",  // What coach said
  candidates: [
    { entityId: "player123", name: "Seán O'Brien", score: 0.85, matchReason: "fuzzy_match" },
    { entityId: "player456", name: "Shane Murphy", score: 0.75, matchReason: "fuzzy_match" },
    { entityId: "player789", name: "Shaun Kelly", score: 0.90, matchReason: "fuzzy_match" }
  ],
  status: "auto_resolved" | "needs_disambiguation" | "user_resolved",
  resolvedEntityId?: "player789"  // Coach selected Shaun
}
```

**Resolution Flow (Uses Phase 1 Fuzzy Matching!)**:
```typescript
// For each claim's entity mentions:
for (const mention of claim.entityMentions) {
  if (mention.mentionType === "player_name") {

    // Skip if autoDetectPlayerNames disabled (AI prefs!)
    if (!aiPrefs.autoDetectPlayerNames) {
      status = "skipped_by_preference";
      continue;
    }

    // USE PHASE 1 FUZZY MATCHING! (US-VN-006)
    const candidates = await findSimilarPlayers({
      searchName: mention.rawText,  // "Shawn"
      organizationId,
      coachUserId,
      limit: 5
    });

    // Auto-resolve if single high-confidence match
    if (candidates.length === 1 && candidates[0].similarity > 0.9) {
      status = "auto_resolved";
      resolvedEntityId = candidates[0].playerIdentityId;
    } else if (candidates.length > 1) {
      status = "needs_disambiguation";
      // Show in Mobile Quick Review UI
    } else {
      status = "unresolved";
    }
  }
}
```

**Disambiguation UI** (in Mobile Quick Review):
```
Unmatched: "Shawn"

Who did you mean?
○ Seán O'Brien (U14) - 90% match
○ Shane Murphy (U16) - 75% match
○ Shaun Kelly (U14) - 85% match
○ Someone else... (opens search)

[Confirm Selection]
```

### Success Criteria
- ✅ Entity resolution table created
- ✅ **Uses Phase 1 fuzzy matching** (US-VN-006)
- ✅ **Respects autoDetectPlayerNames preference** (US-VN-006b)
- ✅ Auto-resolves single high-confidence matches
- ✅ Disambiguation UI shows candidates
- ✅ Coach can select correct player
- ✅ "Split Claim" and "Merge Claims" actions work

---

## 📋 Phase 6: Drafts & Confirmation Workflow

**Duration**: 5 days
**Stories**: 3 (US-VN-019 to US-VN-021)
**Dependencies**: Phase 5 complete
**Goal**: Create drafts instead of auto-applying, add WhatsApp confirmation

### User Stories

| Story | Title | Effort | What It Does |
|-------|-------|--------|--------------|
| **US-VN-019** | Drafts Table & Creation | 2 days | Creates drafts (pending status) instead of applying immediately |
| **US-VN-020** | WhatsApp Confirmation Commands | 2 days | Parses CONFIRM/CANCEL/EDIT/TWINS commands from WhatsApp |
| **US-VN-021** | Migration Script | 1 day | Bulk migrate v1 voiceNotes to v2 structure (optional) |

### What Gets Built

**New Table**:
```typescript
// insightDrafts - Pending confirmation
{
  draftId: string,
  artifactId: id,
  claimId: id,
  playerIdentityId?: id,
  insightType: "injury" | "performance" | "skill" | ...,
  title: string,
  description: string,
  evidence: { transcriptSnippet: string, timestampStart?: number },
  aiConfidence: 0.9,
  resolutionConfidence: 0.85,
  overallConfidence: 0.875,
  requiresConfirmation: boolean,  // Based on confidence + trust level
  status: "pending" | "confirmed" | "rejected" | "applied"
}
```

**WhatsApp Confirmation Workflow**:
```
Coach sends voice note about 4 players
         ↓
System processes (quality gates → transcription → claims → resolution → drafts)
         ↓
WhatsApp: "✅ Got it. I captured 4 updates:
1. Ella - hamstring tightness ✅
2. Aoife - felt anxious ✅
3. Saoirse - missed training ✅
4. 'The twins' - ❓ I'm not sure which players

Reply:
• CONFIRM 1,2,3 to save those
• TWINS = Emma & Niamh to identify
• CANCEL to discard"
         ↓
Coach: "CONFIRM 1,2,3 TWINS = Emma and Niamh U12"
         ↓
System: Applies drafts 1,2,3 + resolves "the twins"
         ↓
WhatsApp: "✅ Saved 3 updates
✅ The twins = Emma & Niamh

Updated players: Ella, Aoife, Saoirse, Emma, Niamh"
```

**Command Parser**:
```typescript
function parseWhatsAppCommand(message: string) {
  // CONFIRM 1,2,3
  if (/^CONFIRM\s+[\d,\s]+$/i.test(message)) {
    const ids = message.match(/\d+/g).map(Number);
    return { action: "confirm", draftIds: ids };
  }

  // TWINS = Emma & Niamh
  if (/^(\w+)\s*=\s*(.+)$/i.test(message)) {
    const [, groupRef, players] = message.match(/^(\w+)\s*=\s*(.+)$/i);
    return { action: "resolve_group", groupRef, players };
  }

  // EDIT 2: Jake had ankle injury
  if (/^EDIT\s+\d+:\s*(.+)$/i.test(message)) {
    const [, draftId, newText] = message.match(/^EDIT\s+(\d+):\s*(.+)$/i);
    return { action: "edit", draftId: Number(draftId), newText };
  }

  // CANCEL
  if (/^CANCEL$/i.test(message)) {
    return { action: "cancel" };
  }
}
```

**Migration Script** (Optional):
```bash
# Bulk migrate all historical voice notes to v2
npm run migrate:voice-notes-to-v2

# What it does:
# - Creates artifacts from voiceNotes
# - Creates transcripts from voiceNotes.transcript
# - Creates claims from voiceNotes.insights (best effort)
# - Creates drafts for pending insights
# - Links everything via voiceNoteId
```

### Success Criteria
- ✅ Drafts created instead of auto-applying
- ✅ WhatsApp commands work (CONFIRM/CANCEL/EDIT/TWINS)
- ✅ Confirmation workflow complete
- ✅ Migration script successfully migrates historical data
- ✅ v1 pipeline still works (no breaking changes)

---

## 📊 Complete Phase Summary

| Phase | Duration | Stories | Key Deliverables | Dependencies |
|-------|----------|---------|------------------|--------------|
| **Phase 1** | 4 days | 7 | Quality gates + Fuzzy matching + AI prefs | None |
| **Phase 2** | 5-7 days | 6 | Mobile Quick Review UI | Phase 1 |
| **Phase 3** | 3 days | 2 | v2 Artifacts + Feature flags | Phase 2 |
| **Phase 4** | 4 days | 2 | Claims extraction (respects AI prefs) | Phase 3, US-VN-006b |
| **Phase 5** | 4 days | 2 | Entity resolution (uses Phase 1 fuzzy) | Phase 4, US-VN-006, US-VN-006b |
| **Phase 6** | 5 days | 3 | Drafts + WhatsApp commands + Migration | Phase 5 |
| **Total** | **26.5-31.5 days** | **22** | Complete v2 pipeline | Sequential |

---

## 💰 Cost Savings Analysis

### Phase 1 Savings (Immediate)

| Source | Mechanism | Savings | Impact |
|--------|-----------|---------|--------|
| **Quality Gates** | Reject 5-10% gibberish early | $40-80/month | Immediate |
| **AI Category Prefs** | Skip 20-40% for selective coaches | $60-80/month | Immediate |
| **Combined Phase 1** | Both mechanisms | **$100-160/month** | **35-45% reduction** |

### v2 Pipeline Savings (Phase 4+)

| Source | Mechanism | Savings | Impact |
|--------|-----------|---------|--------|
| **Claims Filtering** | GPT-4 prompt filtered by categories | 30-50% tokens | Phase 4+ |
| **Entity Resolution Skip** | Skip if autoDetectPlayerNames off | 20-30% processing | Phase 5+ |
| **Confirmation Workflow** | Prevent incorrect applications | Reduced manual fixes | Phase 6+ |
| **Combined v2** | All mechanisms | **Additional 20-30%** | **Total 50-60% reduction** |

### Total Projected Savings

**Current baseline**: $180/month (100 coaches × 50 notes/month × $0.036)

**After Phase 1**: $120-140/month (**$40-60/month saved, 25-35% reduction**)
**After Phase 6**: $70-90/month (**$90-110/month saved, 50-60% reduction**)

**Annual savings**: $1,080-1,320/year
**ROI**: Implementation cost (~1 month work) paid back in < 3 months

---

## 🎯 Success Criteria (All Phases)

### Phase 1 Complete ✅
- Quality gates reject gibberish (5-10% messages)
- Detailed error messages (not generic)
- Fuzzy matching works (Irish names, typos)
- **Coach AI preferences functional** (3 toggles)
- **Insight extraction respects preferences**
- All unit tests passing (100%)
- Manual UAT: 21 test cases passing

### Phase 2 Complete ✅
- Review links generated (48h expiry)
- Mobile-optimized UI (touch-friendly)
- Fuzzy suggestions shown (uses Phase 1)
- Trust-adaptive messages working
- Cron cleanup working

### Phase 3 Complete ✅
- v2 tables created and indexed
- Dual-path processing works
- Feature flags control v1/v2
- No breaking changes to v1

### Phase 4 Complete ✅
- Claims extracted correctly (GPT-4)
- One claim per player mention
- **Respects AI preferences** (filters categories)
- **Token savings measured** (30-50%)

### Phase 5 Complete ✅
- Entity resolution uses Phase 1 fuzzy matching
- **Respects autoDetectPlayerNames preference**
- Auto-resolves high-confidence matches
- Disambiguation UI functional

### Phase 6 Complete ✅
- Drafts created (not auto-applied)
- WhatsApp commands work
- Confirmation workflow complete
- Migration script functional
- Full v2 pipeline operational

---

## 🚀 Execution Plan

### Week 1: Phase 1
**Mon-Thu**: Execute Stream A and Stream B in parallel
**Fri**: Merge, integration testing, UAT (21 test cases)
**Deliverable**: Quality gates + Fuzzy matching + AI preferences live

### Week 2: Phase 2
**Mon-Wed**: Backend (review links, cron)
**Thu-Fri**: Frontend (mobile UI, unmatched cards)
**Mon (Week 3)**: Polish, testing, deploy
**Deliverable**: Mobile Quick Review live in production

### Week 3: Phase 3
**Mon-Tue**: v2 schema + feature flags
**Wed-Thu**: Dual-path processing + testing
**Fri**: Deploy, monitor (v1 and v2 coexist)
**Deliverable**: v2 foundation ready, gradual rollout begins

### Week 4: Phase 4
**Mon-Tue**: Claims table + GPT-4 extraction
**Wed-Thu**: Integration + AI prefs filtering
**Fri**: Testing + claims viewer
**Deliverable**: Claims extraction functional

### Week 5: Phase 5
**Mon-Tue**: Entity resolution table + fuzzy integration
**Wed-Thu**: Disambiguation UI
**Fri**: Testing + UAT
**Deliverable**: Entity resolution complete

### Week 6: Phase 6
**Mon-Tue**: Drafts table + creation logic
**Wed**: WhatsApp commands parser
**Thu**: Confirmation workflow + testing
**Fri**: Migration script + documentation
**Deliverable**: Full v2 pipeline operational

---

## 📁 Documentation Package

All documentation in `scripts/ralph/prds/voice-gateways-v2/`:

| File | Size | Purpose |
|------|------|---------|
| **PRD.json** | 85 KB | Master PRD with 22 stories |
| **COMPLETE_PLAN_OVERVIEW.md** | This file | Executive overview of all phases |
| **MAIN_CONTEXT.md** | 14 KB | Concepts, architecture, patterns |
| **PHASE1_QUALITY_GATES.md** | 50 KB | Detailed Phase 1 implementation |
| **PHASE2_MOBILE_REVIEW.md** | 7 KB | Phase 2 summary |
| **PHASE3_V2_MIGRATION.md** | 11 KB | Phases 3-6 overview |
| **AI_CATEGORY_SETTINGS_INTEGRATION.md** | 11 KB | AI preferences integration |
| **US-VN-006b_ADDED_SUMMARY.md** | 13 KB | US-VN-006b changes summary |
| **.ruler/voice-notes-validation-patterns.md** | 6 KB | Mandatory patterns |
| **quick-actions/*.sh** | 5 KB | Automated test scripts |
| **README.md** | 8 KB | Navigation guide |

**Total**: 12 files, ~210 KB of documentation

---

## ✅ Current Status

**Planning**: ✅ 100% Complete
**Documentation**: ✅ 100% Complete
**PRD Validation**: ✅ Valid JSON, all dependencies verified
**Ready for Execution**: ✅ YES

**Next Step**: Start Phase 1 execution (4 days)

---

## 🎉 Key Innovations

1. **Parallel Execution** (Phase 1): Stream A + B run concurrently → faster delivery
2. **AI Category Preferences** (NEW!): Coach control saves 20-40% costs immediately
3. **Fuzzy Matching Reuse**: Phase 1 work powers Phase 2 UI and Phase 5 resolution
4. **Coexistence Strategy**: v1 and v2 run side-by-side → zero-downtime migration
5. **Confirmation Workflow**: Drafts + WhatsApp commands → better accuracy
6. **Cost-Conscious**: Multiple layers of savings (quality gates, AI prefs, token filtering)

---

## 💡 Questions?

- **Phase 1 details**: See `PHASE1_QUALITY_GATES.md` (50 KB, ultra-detailed)
- **Phase 2 details**: See `PHASE2_MOBILE_REVIEW.md` + `docs/features/MOBILE_QUICK_REVIEW_PLAN.md`
- **Phases 3-6 details**: See `PHASE3_V2_MIGRATION.md` + `docs/architecture/voice-notes-pipeline-v2.md`
- **AI preferences**: See `AI_CATEGORY_SETTINGS_INTEGRATION.md`
- **Patterns**: See `.ruler/voice-notes-validation-patterns.md`

**Ready to start Phase 1!** 🚀
