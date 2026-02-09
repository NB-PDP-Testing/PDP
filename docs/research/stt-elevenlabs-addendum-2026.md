# ElevenLabs Scribe v2 Analysis - Addendum to STT Research

**Date**: February 9, 2026
**Status**: Additional research requested
**Previous Report**: `stt-alternatives-analysis-2026.md`

---

## Executive Summary

**ElevenLabs Scribe v2 is a STRONG contender** and potentially the best alternative to Whisper:

- ✅ **Cheaper than Whisper**: $0.0047/min vs $0.006/min (22% savings)
- ✅ **Higher claimed accuracy**: 96.7% for English vs Whisper's undisclosed rate
- ✅ **Real-time capable**: 150ms latency (Scribe v2 Realtime) vs Whisper's batch processing
- ✅ **Competitive with Deepgram**: Similar latency, higher accuracy claims, slightly more expensive
- ⚠️ **No Irish accent benchmarks**: Same problem as all other providers
- ✅ **90+ languages supported**: Excellent multilingual capability

**Revised Recommendation**: A/B test **ElevenLabs Scribe v2** alongside Whisper (stronger case than Deepgram)

---

## Detailed Analysis

### 1. Pricing Comparison

| Provider | Per Minute | Per Hour | Savings vs Whisper |
|----------|-----------|----------|-------------------|
| **Whisper** | $0.0060 | $0.36 | Baseline |
| **ElevenLabs Scribe v2** | $0.0047 | $0.28 | **22% cheaper** ✅ |
| **Deepgram Nova-2** | $0.0043 | $0.26 | 28% cheaper |
| **AssemblyAI** | $0.0062 | $0.37 | 3% more expensive |

**Sources:**
- [ElevenLabs pricing (X post)](https://x.com/elevenlabsio/status/1894821482104266874?lang=en)
- [ElevenLabs pricing breakdown](https://flexprice.io/blog/elevenlabs-pricing-breakdown)

**Cost at Estimated Volume (20K min/month)**:
- Whisper: $120/month
- ElevenLabs: $94/month → **Saves $26/month ($312/year)**
- Deepgram: $86/month → Saves $34/month

**Analysis**: ElevenLabs falls between Whisper and Deepgram on price. Savings are modest but combined with accuracy/latency claims make it attractive.

---

### 2. Accuracy & Performance

#### Claimed Accuracy
- **96.7% accuracy for English** (industry-leading claim)
- **93.5% accuracy on FLEURS multilingual benchmark** (30 languages)
- **Lowest Word Error Rate (WER)** on industry-standard benchmarks
- Internal benchmarks: Best performance on "challenging English conversation samples featuring poor audio quality, diverse accents, and filler words"

**Sources:**
- [ElevenLabs Scribe v2 Realtime launch](https://elevenlabs.io/blog/introducing-scribe-v2-realtime)
- [Scribe v2 accuracy claims](https://www.genmedialab.com/news/elevenlabs-scribe-v2-speech-to-text/)
- [Medium comparison article](https://girishkurup21.medium.com/heres-a-detailed-comparison-of-deepgram-whisper-and-elevenlabs-across-various-aspects-c200512d8b23)

#### Comparison to Competitors
| Provider | Accuracy Claim | WER | Notes |
|----------|---------------|-----|-------|
| **ElevenLabs Scribe v2** | 96.7% (English) | Lowest (claimed) | Best for "diverse accents" |
| **Deepgram Nova-3** | 90%+ (noisy audio) | Not disclosed | Good for challenging audio |
| **Whisper** | Not disclosed | Not disclosed | Robust across languages |

**Critical Gap**: No Irish accent specific benchmarks (same as all providers)

---

### 3. Latency & Real-Time Capability

#### ElevenLabs Scribe v2 Realtime
- **Sub-150ms latency** (industry-leading for real-time)
- WebSocket streaming API for real-time transcription
- Up to 5 multichannel audio streams with speaker diarization

#### Comparison
| Provider | Latency | Real-Time? | Streaming API? |
|----------|---------|-----------|---------------|
| **ElevenLabs Scribe v2 RT** | <150ms | ✅ Yes | ✅ WebSocket |
| **Deepgram Nova-2** | 150-184ms | ✅ Yes | ✅ WebSocket |
| **Whisper** | Batch (30s-5min) | ❌ No | ❌ No |
| **AssemblyAI** | 250-300ms | ✅ Yes | ✅ WebSocket |

**Sources:**
- [Scribe v2 Realtime feature page](https://elevenlabs.io/realtime-speech-to-text)
- [Softcery STT/TTS comparison guide](https://softcery.com/lab/how-to-choose-stt-tts-for-ai-voice-agents-in-2025-a-comprehensive-guide)

**PlayerARC Relevance**: Currently using batch processing (WhatsApp audio files), so real-time isn't required BUT:
- Faster processing = quicker coach feedback
- Enables future real-time features (live transcription during training sessions)
- Better user experience (instant insights vs 30-60 second wait)

---

### 4. Language & Accent Support

#### Languages Supported
- **90+ languages** (comprehensive multilingual support)
- English variants: US, UK, Australian, etc.
- **No explicit "Irish" language/accent listing** ⚠️

#### Irish Accent Gap (CRITICAL)
Same problem as all competitors:
- ❌ No Irish accent benchmarks published
- ❌ No `en-IE` locale specifically mentioned
- ✅ Generic claim: "diverse accents" handled well
- ✅ "Challenging English conversation samples" tested

**Conclusion**: Must test with real PlayerARC GAA coach audio to validate Irish accent performance.

---

### 5. Features Relevant to PlayerARC

| Feature | ElevenLabs | PlayerARC Usage |
|---------|-----------|----------------|
| **Word-level timestamps** | ✅ Yes | Used for evidence snippets, audio clip generation |
| **Character-level timestamps** | ✅ Yes | Enhanced precision for claim extraction |
| **Speaker diarization** | ✅ Yes (5 channels) | Not currently used but useful for group coaching sessions |
| **Custom vocabulary** | ✅ Yes (keyterm prompting) | GAA terminology, Irish player names |
| **Entity detection** | ✅ Yes (PII, PHI, etc.) | Useful for sensitive info flagging |
| **Multichannel audio** | ✅ Yes (5 streams) | Not currently used |

**Sources:**
- [ElevenLabs STT documentation](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)
- [Speech to Text quickstart guide](https://elevenlabs.io/docs/developers/guides/cookbooks/speech-to-text/quickstart)

**Key Advantages**:
1. **Keyterm prompting** - Can boost GAA sports terms like "hand pass", "solo run", "point", "goal"
2. **Entity detection** - Automatically flag sensitive medical/injury information
3. **Character-level timestamps** - More precise evidence extraction for claims

---

### 6. Integration Complexity

#### API Structure
```typescript
// ElevenLabs Scribe v2 API (batch)
POST https://api.elevenlabs.io/v1/speech-to-text

// Request
{
  "audio": "<base64_audio_data>",
  "model_id": "scribe_v2",
  "keywords": ["hand pass", "solo run", "Niamh", "Aoife"] // Optional
}

// Response
{
  "text": "Full transcript...",
  "words": [
    {
      "text": "Niamh",
      "start": 1.23,
      "end": 1.56,
      "confidence": 0.98
    }
  ],
  "entities": [
    // PII/PHI detection
  ]
}
```

#### Migration Effort
**Low to Medium** (similar to Whisper integration):
- Similar REST API structure
- Handles audio file upload (no streaming required for batch)
- Feature flag for gradual rollout
- Estimated: **2-3 days** for full integration + testing

**Source**: [ElevenLabs API documentation](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)

---

### 7. Comparison Matrix: Top 3 Contenders

| Criterion | Whisper (Current) | ElevenLabs Scribe v2 | Deepgram Nova-2 |
|-----------|-------------------|---------------------|-----------------|
| **Cost/min** | $0.006 | $0.0047 (22% cheaper) ✅ | $0.0043 (28% cheaper) ✅ |
| **Accuracy** | Undisclosed | 96.7% (English) ✅ | 90%+ (noisy audio) |
| **Latency** | Batch (30s+) | <150ms ✅ | 150-184ms ✅ |
| **Irish accent** | ❌ No data | ❌ No data | ❌ No data |
| **GAA terms** | Via fuzzy match | Keyterm prompting ✅ | Keyword boosting ✅ |
| **Word timestamps** | ✅ Yes | ✅ Yes + char-level | ✅ Yes |
| **Real-time** | ❌ No | ✅ Yes | ✅ Yes |
| **Integration** | ✅ Simple | Easy | Easy |
| **Stability** | ✅ Proven | New (2025) ⚠️ | ✅ Proven |
| **Same provider as GPT** | ✅ Yes | ❌ No | ❌ No |

**Legend**: ✅ Strong advantage | ⚠️ Minor concern | ❌ Gap or disadvantage

---

### 8. Risk Assessment

#### ElevenLabs Risks

**Medium Risk**:
1. **New model** - Scribe v2 launched late 2025, less battle-tested than Whisper
2. **No Irish accent validation** - Same as all competitors, requires testing
3. **Different provider** - Adds dependency (currently OpenAI for everything)
4. **API stability** - Newer service, potential for breaking changes
5. **Volume limits** - Unknown concurrency/rate limits at scale

**Low Risk**:
- Cost increase risk: Actually cheaper than current
- Accuracy degradation risk: Claims higher accuracy (verify via testing)
- Integration complexity: Similar API structure to Whisper

---

### 9. Revised Recommendation

**UPGRADE RECOMMENDATION: A/B Test ElevenLabs Scribe v2**

ElevenLabs presents a **stronger case than Deepgram** for the following reasons:

#### Why ElevenLabs Over Deepgram?
1. **Higher accuracy claims**: 96.7% vs 90%+ (6-7% potential improvement)
2. **Better accent handling claims**: Explicitly tested on "diverse accents"
3. **Comparable latency**: 150ms vs 150-184ms (equally fast)
4. **Similar cost**: $0.0047 vs $0.0043/min (only $0.0004 difference)
5. **Richer features**: Character-level timestamps, entity detection, keyterm prompting

#### Why Consider Switching from Whisper?
1. **Cost savings**: 22% cheaper ($26/month)
2. **Speed**: 150ms vs 30+ seconds (200× faster)
3. **Accuracy**: Claims 96.7% (likely improvement over Whisper)
4. **Features**: Keyterm prompting for GAA terminology
5. **Real-time ready**: Enables future live transcription features

#### Why Still Test Before Full Switch?
1. ⚠️ **Irish accent performance unknown** - MUST validate
2. ⚠️ **GAA terminology handling** - Must verify keyterm prompting effectiveness
3. ⚠️ **New model** - Less proven at scale than Whisper
4. ⚠️ **Different provider** - Adds operational complexity

---

### 10. A/B Testing Strategy (Revised)

#### Phase 1: Parallel Testing (4 weeks)

**Traffic Split**:
- 45% Whisper (control)
- 45% ElevenLabs Scribe v2 (primary test)
- 10% Deepgram Nova-2 (secondary comparison)

**Test Configuration**:
```typescript
// Feature flag in featureFlags.ts
export const getTranscriptionProvider = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
  userId: string
): Promise<"whisper" | "elevenlabs_scribe_v2" | "deepgram_nova2"> => {
  const flag = await getFeatureFlag(ctx, "transcription_provider", organizationId, userId);
  return flag?.value || "whisper"; // Default to Whisper
};
```

**Metrics to Track**:
| Metric | Target | Whisper Baseline | Test Threshold |
|--------|--------|-----------------|----------------|
| **Word Error Rate (WER)** | <10% | Measure first | ±3% acceptable |
| **Player Name Match Rate** | >85% | ~87% (estimated) | >82% acceptable |
| **Avg Latency** | <5s | ~30s | Must improve |
| **Cost per transcript** | <$0.006 | $0.006 | Lower is better |
| **Coach complaints** | 0 | 0 | 0 tolerance |
| **Irish name accuracy** | >80% | Measure first | ±5% acceptable |

**Manual Review**:
- 100 transcripts/week per provider (300 total)
- Focus on: Irish accents, GAA terminology, player names
- Coach feedback survey after 2 weeks

**Rollback Triggers**:
- WER increases >5% vs Whisper
- Player name match rate drops >10%
- Any coach complaints about transcription quality
- Cost per transcript increases >20%

#### Phase 2: Winner Analysis (1 week)

**Decision Matrix**:
```
IF ElevenLabs WER <= Whisper WER + 2%
AND ElevenLabs latency < 10s
AND ElevenLabs cost < Whisper cost
AND ElevenLabs name_match >= Whisper name_match - 3%
THEN recommend full migration to ElevenLabs

ELSE IF Deepgram WER < ElevenLabs WER - 3%
THEN recommend Deepgram instead

ELSE stay with Whisper
```

#### Phase 3: Gradual Rollout (4 weeks)

If ElevenLabs wins:
1. Week 1: 25% traffic
2. Week 2: 50% traffic
3. Week 3: 75% traffic
4. Week 4: 100% migration, deprecate Whisper

Monitor continuously, rollback capability maintained for 2 months.

---

### 11. Implementation Plan

#### Code Changes Required

**1. Add ElevenLabs Scribe v2 Integration** (`actions/voiceNotes.ts`):

```typescript
import ElevenLabs from "elevenlabs";

// Existing Whisper integration
async function transcribeWithWhisper(audioUrl: string): Promise<TranscriptResult> {
  // ... existing code
}

// NEW: ElevenLabs Scribe v2 integration
async function transcribeWithElevenLabs(audioUrl: string): Promise<TranscriptResult> {
  const client = new ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  // Fetch audio file
  const audioResponse = await fetch(audioUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString('base64');

  // Custom keywords for GAA terminology
  const gaaKeywords = [
    "hand pass", "solo run", "sideline ball", "free kick",
    "point", "goal", "mark", "tackle", "turnover",
    // Irish player names
    "Niamh", "Aoife", "Saoirse", "Cian", "Oisín", "Sinéad"
  ];

  const response = await client.speechToText.convert({
    audio: audioBase64,
    model_id: "scribe_v2",
    keywords: gaaKeywords,
    entity_detection: ["pii", "phi"], // Flag sensitive info
  });

  return {
    fullText: response.text,
    segments: response.words.map(word => ({
      text: word.text,
      startTime: word.start,
      endTime: word.end,
      confidence: word.confidence,
    })),
    language: "en",
    modelUsed: "elevenlabs_scribe_v2",
    duration: response.words[response.words.length - 1]?.end || 0,
  };
}

// Router function based on feature flag
async function transcribeAudio(ctx, audioUrl, organizationId, userId) {
  const provider = await getTranscriptionProvider(ctx, organizationId, userId);

  switch (provider) {
    case "elevenlabs_scribe_v2":
      return transcribeWithElevenLabs(audioUrl);
    case "deepgram_nova2":
      return transcribeWithDeepgram(audioUrl);
    case "whisper":
    default:
      return transcribeWithWhisper(audioUrl);
  }
}
```

**2. Feature Flag Configuration** (`featureFlags.ts`):

```typescript
// Add to schema
transcriptionProvider: v.optional(
  v.union(
    v.literal("whisper"),
    v.literal("elevenlabs_scribe_v2"),
    v.literal("deepgram_nova2")
  )
),

// Helper function
export const getTranscriptionProvider = internalQuery({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.union(
    v.literal("whisper"),
    v.literal("elevenlabs_scribe_v2"),
    v.literal("deepgram_nova2")
  ),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_org_and_flag", q =>
        q.eq("organizationId", args.organizationId)
         .eq("flagName", "transcription_provider")
      )
      .first();

    return flag?.value || "whisper";
  },
});
```

**3. Metrics Tracking** (new table):

```typescript
// schema.ts
transcriptionMetrics: defineTable({
  voiceNoteId: v.id("voiceNotes"),
  provider: v.string(), // "whisper" | "elevenlabs_scribe_v2" | "deepgram_nova2"
  latencyMs: v.number(),
  costUsd: v.number(),
  wordCount: v.number(),
  duration: v.number(),
  playerNameMatchRate: v.optional(v.number()), // Calculated post-extraction
  manualReviewScore: v.optional(v.number()), // 1-5 scale
  createdAt: v.number(),
})
  .index("by_provider", ["provider"])
  .index("by_voiceNote", ["voiceNoteId"]);
```

**Estimated Development Time**:
- ElevenLabs integration: 1 day
- Feature flag + routing: 0.5 days
- Metrics tracking: 0.5 days
- Testing (manual + E2E): 1 day
- **Total: 3 days**

---

### 12. Cost-Benefit Analysis (Revised)

#### Scenario: Switch to ElevenLabs

**Assumptions**:
- Current volume: 20,000 minutes/month
- Growth: 15% per year
- Testing phase: 4 weeks
- Full migration: 8 weeks

**Year 1 Costs**:
```
Whisper baseline:     $120/month × 12 = $1,440/year
ElevenLabs:           $94/month × 12 = $1,128/year
Testing costs:        $50 (Deepgram trial)
Development:          3 days × $150/hr × 6hr = $2,700
Monitoring tools:     $0 (use existing PostHog + Convex logs)

Total Year 1 cost:    $1,128 + $50 + $2,700 = $3,878
vs Whisper:           $1,440
Year 1 NET COST:      +$2,438 (investment)

Year 2+ savings:      $312/year (recurring)
Break-even:           7.8 years
```

**Non-Monetary Benefits**:
- ✅ 200× faster transcription (150ms vs 30s)
- ✅ Better user experience (instant insights)
- ✅ Enables real-time features (future-proofing)
- ✅ Higher accuracy (96.7% vs undisclosed)
- ✅ Better GAA terminology handling (keyterm prompting)

**Conclusion**: **Break-even is 7.8 years** on cost alone, but UX/speed improvements may justify switch regardless.

#### Alternative Scenario: A/B Test Only (No Migration)

**Costs**:
```
Testing (4 weeks):    ~$30 (10% of 5K minutes on ElevenLabs)
Development:          1 day × $150/hr × 6hr = $900
Total:                $930
```

**Value**:
- ✅ Validate accuracy claims for Irish accents
- ✅ Benchmark against current system
- ✅ Data-driven decision (vs speculation)
- ❌ No production benefits if staying with Whisper

**Conclusion**: **$930 investment for validated data** - worth it to derisk decision.

---

### 13. Final Recommendation (Updated)

**Option A: Conservative - A/B Test First** ⭐ **RECOMMENDED**

1. Run 4-week A/B test (45% Whisper, 45% ElevenLabs, 10% Deepgram)
2. Invest $930 for validated data
3. Decision after 4 weeks:
   - **IF** ElevenLabs proves superior → full migration
   - **IF** no clear winner → stay with Whisper
4. No commitment, low risk, high learning

**Option B: Bold - Direct Migration**

1. Migrate to ElevenLabs Scribe v2 immediately
2. Invest $2,700 upfront (3 days dev)
3. Realize immediate UX benefits (200× faster)
4. Risk: Unproven Irish accent performance
5. Break-even in 7.8 years on cost alone

**Option C: Status Quo - Stay with Whisper**

1. No changes, no investment
2. Known performance, stable
3. Miss out on potential accuracy/speed gains
4. No future real-time capability

---

### 14. Next Steps

**If proceeding with A/B test (Option A)**:

**Week 1: Setup**
- [ ] Add ELEVENLABS_API_KEY to environment
- [ ] Implement transcribeWithElevenLabs() function
- [ ] Add transcription_provider feature flag
- [ ] Create transcriptionMetrics table
- [ ] Deploy to dev/staging

**Week 2: Testing**
- [ ] Enable for 5% of traffic (internal testing)
- [ ] Manual review 50 transcripts (25 Whisper, 25 ElevenLabs)
- [ ] Verify Irish accent handling
- [ ] Check GAA terminology accuracy

**Week 3-6: A/B Test**
- [ ] Ramp to 45% ElevenLabs, 10% Deepgram, 45% Whisper
- [ ] Collect metrics (WER, latency, cost, match rate)
- [ ] Weekly coach feedback surveys
- [ ] Manual review 100 transcripts/week

**Week 7: Analysis**
- [ ] Compare metrics across all providers
- [ ] Calculate cost projections
- [ ] Stakeholder review of findings
- [ ] Go/no-go decision

**Week 8+: Migration (if approved)**
- [ ] Gradual rollout (25% → 50% → 75% → 100%)
- [ ] Continuous monitoring
- [ ] Rollback capability for 2 months
- [ ] Deprecate Whisper integration

---

### 15. Key Takeaways

1. **ElevenLabs Scribe v2 is a strong contender** - better than Deepgram on paper (higher accuracy, similar cost/latency)

2. **Cost savings are modest** ($26/month) but UX improvements are significant (200× faster)

3. **Irish accent support is unknown** (same as all providers) - MUST validate via testing

4. **A/B testing is low-risk, high-value** ($930 for validated data)

5. **Real-time capability future-proofs** the platform for live coaching session transcription

6. **7.8 year break-even** on cost alone, but speed/accuracy benefits may justify earlier adoption

7. **Don't switch blindly** - run the test first, make data-driven decision

---

### 16. Sources

**Pricing & Features:**
- [ElevenLabs STT pricing (X post)](https://x.com/elevenlabsio/status/1894821482104266874?lang=en)
- [ElevenLabs pricing breakdown](https://flexprice.io/blog/elevenlabs-pricing-breakdown)
- [ElevenLabs API pricing page](https://elevenlabs.io/pricing/api)
- [ElevenLabs STT documentation](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)

**Accuracy & Performance:**
- [Scribe v2 Realtime launch blog](https://elevenlabs.io/blog/introducing-scribe-v2-realtime)
- [Scribe v2 accuracy announcement](https://www.genmedialab.com/news/elevenlabs-scribe-v2-speech-to-text/)
- [ElevenLabs vs competitors (Medium)](https://girishkurup21.medium.com/heres-a-detailed-comparison-of-deepgram-whisper-and-elevenlabs-across-various-aspects-c200512d8b23)
- [Realtime STT feature page](https://elevenlabs.io/realtime-speech-to-text)

**Comparisons:**
- [Deepgram vs ElevenLabs](https://deepgram.com/learn/deepgram-vs-elevenlabs)
- [STT/TTS comparison guide](https://softcery.com/lab/how-to-choose-stt-tts-for-ai-voice-agents-in-2025-a-comprehensive-guide)
- [Best STT models 2025](https://nextlevel.ai/best-speech-to-text-models/)
- [Which STT model to use](https://datarootlabs.com/blog/speech-to-text-models)

---

**END OF ELEVENLABS ADDENDUM**

*Cross-reference with main STT analysis report for complete context.*
