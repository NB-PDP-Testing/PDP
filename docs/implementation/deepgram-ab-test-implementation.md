# Deepgram A/B Test Implementation Guide

**Date**: February 9, 2026
**Goal**: A/B test Deepgram Nova-3 vs OpenAI Whisper for voice note transcription
**Timeline**: 4-6 weeks (1 week setup, 4 weeks testing, 1 week analysis)

---

## Phase 1: Setup (Week 1)

### Step 1: Get Deepgram Account & API Key

1. **Sign up for Deepgram**:
   - Go to https://console.deepgram.com/signup
   - Use your PlayerARC/company email
   - **Free credit**: $200 (enough for ~46,500 minutes of testing)

2. **Create API Key**:
   ```
   Deepgram Console → API Keys → Create New Key
   Name: "PlayerARC-Voice-Notes-Testing"
   Permissions: "Member" (read/write)
   Copy the key (starts with something like: "abcd1234...")
   ```

3. **Add to Environment Variables**:
   ```bash
   # .env.local (for local dev)
   DEEPGRAM_API_KEY=your_key_here

   # Vercel (for production)
   vercel env add DEEPGRAM_API_KEY
   # Paste key when prompted
   # Select: Production, Preview, Development (all environments)

   # Convex (backend)
   npx convex env set DEEPGRAM_API_KEY your_key_here
   ```

### Step 2: Install Deepgram SDK

```bash
npm install --workspace=packages/backend @deepgram/sdk
```

**Package**: `@deepgram/sdk` (official Deepgram Node.js SDK)

---

## Phase 2: Code Implementation

### File 1: Add Deepgram Integration

**Location**: `packages/backend/convex/actions/voiceNotes.ts`

**Add imports** (top of file, around line 10):

```typescript
import { createClient } from "@deepgram/sdk";
```

**Add Deepgram transcription function** (after existing `transcribeWithWhisper`, around line 150):

```typescript
/**
 * Transcribe audio using Deepgram Nova-3
 * Alternative to OpenAI Whisper for A/B testing
 */
async function transcribeWithDeepgram(
  audioUrl: string,
  audioStorageId: Id<"_storage">
): Promise<{
  fullText: string;
  segments: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  language: string;
  modelUsed: string;
  duration: number;
}> {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("DEEPGRAM_API_KEY environment variable not set");
  }

  const deepgram = createClient(deepgramApiKey);

  try {
    // Fetch audio file from Convex storage
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
    }
    const audioBuffer = await audioResponse.arrayBuffer();

    // Deepgram configuration
    const response = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      {
        model: "nova-3", // Latest model (2026)
        language: "en", // English (handles Irish accents better than en-IE)
        smart_format: true, // Auto punctuation, capitalization
        punctuate: true,
        paragraphs: false,
        utterances: true, // Word-level timestamps
        diarize: false, // Speaker detection (not needed for solo coach notes)

        // Custom keywords for GAA terminology
        keywords: [
          // GAA sports terms
          "hand pass:2", "solo run:2", "sideline ball:2", "free kick:2",
          "point:1", "goal:2", "mark:1", "tackle:1", "turnover:1",
          "hurling:2", "camogie:2", "Gaelic football:2", "GAA:3",

          // Common Irish player names (boost recognition)
          "Niamh:2", "Aoife:2", "Saoirse:2", "Sinéad:2", "Róisín:2",
          "Cian:2", "Oisín:2", "Tadhg:2", "Fionn:2", "Séan:2"
        ].join(","),

        // Advanced features
        tier: "nova", // Use Nova-3 tier (most accurate)
        detect_language: false, // Force English (faster)
      }
    );

    // Extract transcript
    const result = response.result;
    if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
      throw new Error("Deepgram returned empty transcript");
    }

    const transcript = result.results.channels[0].alternatives[0];
    const fullText = transcript.transcript;

    // Convert Deepgram words to PlayerARC segment format
    const segments =
      transcript.words?.map((word) => ({
        text: word.word,
        startTime: word.start,
        endTime: word.end,
        confidence: word.confidence,
      })) || [];

    // Calculate duration from last word
    const duration =
      segments.length > 0 ? segments[segments.length - 1].endTime : 0;

    return {
      fullText,
      segments,
      language: result.results.channels[0].detected_language || "en",
      modelUsed: "deepgram-nova-3",
      duration,
    };
  } catch (error) {
    console.error("[Deepgram] Transcription failed:", error);
    throw new Error(
      `Deepgram transcription error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

**Update transcription router** (find `transcribeAudio` action, around line 200):

```typescript
export const transcribeAudio = internalAction({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    audioStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get voice note
      const voiceNote = await ctx.runQuery(
        internal.models.voiceNotes.getVoiceNoteById,
        { noteId: args.voiceNoteId }
      );
      if (!voiceNote) {
        throw new Error(`Voice note ${args.voiceNoteId} not found`);
      }

      // Get audio URL
      const audioUrl = await ctx.storage.getUrl(args.audioStorageId);
      if (!audioUrl) {
        throw new Error("Audio file not found in storage");
      }

      // ⭐ NEW: Check which transcription provider to use
      const provider = await ctx.runQuery(
        internal.lib.featureFlags.getTranscriptionProvider,
        {
          organizationId: voiceNote.orgId,
          userId: voiceNote.createdBy,
        }
      );

      console.log(
        `[Transcription] Using provider: ${provider} for note ${args.voiceNoteId}`
      );

      // Route to appropriate transcription service
      let transcriptResult;
      let startTime = Date.now();

      if (provider === "deepgram_nova3") {
        transcriptResult = await transcribeWithDeepgram(
          audioUrl,
          args.audioStorageId
        );
      } else {
        // Default to Whisper
        transcriptResult = await transcribeWithWhisper(
          audioUrl,
          args.audioStorageId
        );
      }

      const latencyMs = Date.now() - startTime;

      // Store transcript (existing code continues...)
      await ctx.runMutation(
        internal.models.voiceNoteTranscripts.createTranscript,
        {
          artifactId: voiceNote.artifactId, // If v2 enabled
          fullText: transcriptResult.fullText,
          segments: transcriptResult.segments,
          modelUsed: transcriptResult.modelUsed,
          language: transcriptResult.language,
          duration: transcriptResult.duration,
        }
      );

      // ⭐ NEW: Log metrics for comparison
      await ctx.runMutation(
        internal.models.transcriptionMetrics.logMetric,
        {
          voiceNoteId: args.voiceNoteId,
          provider: transcriptResult.modelUsed,
          latencyMs,
          costUsd: calculateTranscriptionCost(
            transcriptResult.duration,
            provider
          ),
          wordCount: transcriptResult.segments.length,
          duration: transcriptResult.duration,
        }
      );

      // Continue with existing pipeline (quality gates, insights extraction, etc.)
      // ... rest of existing code
    } catch (error) {
      console.error("[transcribeAudio] Error:", error);
      throw error;
    }

    return null;
  },
});

/**
 * Calculate transcription cost based on provider and duration
 */
function calculateTranscriptionCost(
  durationSeconds: number,
  provider: string
): number {
  const durationMinutes = durationSeconds / 60;

  const rates: Record<string, number> = {
    whisper: 0.006, // $0.006/min
    "deepgram_nova3": 0.0043, // $0.0043/min
    "elevenlabs_scribe_v2": 0.0047, // $0.0047/min
    soniox: 0.0033, // $0.0033/min
  };

  return durationMinutes * (rates[provider] || rates.whisper);
}
```

---

### File 2: Feature Flag for Provider Selection

**Location**: `packages/backend/convex/lib/featureFlags.ts`

**Add new feature flag helper** (at end of file):

```typescript
/**
 * Get transcription provider for a user/org
 * Used for A/B testing different STT services
 *
 * Returns: "whisper" | "deepgram_nova3" | "elevenlabs_scribe_v2" | "soniox"
 */
export const getTranscriptionProvider = internalQuery({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.union(
    v.literal("whisper"),
    v.literal("deepgram_nova3"),
    v.literal("elevenlabs_scribe_v2"),
    v.literal("soniox")
  ),
  handler: async (ctx, args) => {
    // Check for org-level override
    const orgFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_org_and_flag", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("flagName", "transcription_provider")
      )
      .first();

    if (orgFlag?.value) {
      return orgFlag.value as "whisper" | "deepgram_nova3";
    }

    // Check for user-level override (for testing specific coaches)
    const userFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_user_and_flag", (q) =>
        q.eq("userId", args.userId).eq("flagName", "transcription_provider")
      )
      .first();

    if (userFlag?.value) {
      return userFlag.value as "whisper" | "deepgram_nova3";
    }

    // Default: Whisper (stable baseline)
    return "whisper";
  },
});
```

---

### File 3: Transcription Metrics Table

**Location**: `packages/backend/convex/schema.ts`

**Add new table** (after `voiceNoteClaims`, around line 4330):

```typescript
// ============================================================
// TRANSCRIPTION METRICS (A/B Testing)
// Track performance of different STT providers for comparison
// ============================================================
transcriptionMetrics: defineTable({
  voiceNoteId: v.id("voiceNotes"),
  provider: v.string(), // "whisper-1" | "deepgram-nova-3" | "elevenlabs-scribe-v2"
  latencyMs: v.number(), // Time to transcribe (milliseconds)
  costUsd: v.number(), // Calculated cost in USD
  wordCount: v.number(), // Number of words transcribed
  duration: v.number(), // Audio duration in seconds

  // Accuracy metrics (calculated post-extraction)
  playerNameMatchRate: v.optional(v.number()), // % of player names matched (0-1)
  claimCount: v.optional(v.number()), // Number of claims extracted

  // Quality scores (manual review)
  manualReviewScore: v.optional(v.number()), // 1-5 scale (human review)
  reviewNotes: v.optional(v.string()), // Reviewer comments
  irishAccentQuality: v.optional(v.number()), // 1-5 scale for Irish accent accuracy

  createdAt: v.number(),
})
  .index("by_voiceNote", ["voiceNoteId"])
  .index("by_provider", ["provider"])
  .index("by_provider_and_date", ["provider", "createdAt"]),
```

**Add new model file**: `packages/backend/convex/models/transcriptionMetrics.ts`

```typescript
import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Log transcription metrics for A/B testing comparison
 */
export const logMetric = internalMutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    provider: v.string(),
    latencyMs: v.number(),
    costUsd: v.number(),
    wordCount: v.number(),
    duration: v.number(),
  },
  returns: v.id("transcriptionMetrics"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("transcriptionMetrics", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update metrics with accuracy scores after extraction completes
 */
export const updateAccuracyMetrics = internalMutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    playerNameMatchRate: v.optional(v.number()),
    claimCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const metric = await ctx.db
      .query("transcriptionMetrics")
      .withIndex("by_voiceNote", (q) => q.eq("voiceNoteId", args.voiceNoteId))
      .first();

    if (metric) {
      await ctx.db.patch(metric._id, {
        playerNameMatchRate: args.playerNameMatchRate,
        claimCount: args.claimCount,
      });
    }

    return null;
  },
});

/**
 * Get aggregate metrics by provider (for dashboard comparison)
 */
export const getProviderMetrics = query({
  args: {
    provider: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    provider: v.string(),
    totalTranscriptions: v.number(),
    avgLatencyMs: v.number(),
    totalCostUsd: v.number(),
    avgWordCount: v.number(),
    avgPlayerNameMatchRate: v.number(),
    avgManualReviewScore: v.number(),
  }),
  handler: async (ctx, args) => {
    let query = ctx.db.query("transcriptionMetrics");

    if (args.provider) {
      query = query.withIndex("by_provider", (q) =>
        q.eq("provider", args.provider)
      );
    }

    const metrics = await query.collect();

    // Filter by date range if provided
    const filtered = metrics.filter((m) => {
      if (args.startDate && m.createdAt < args.startDate) return false;
      if (args.endDate && m.createdAt > args.endDate) return false;
      return true;
    });

    if (filtered.length === 0) {
      return {
        provider: args.provider || "all",
        totalTranscriptions: 0,
        avgLatencyMs: 0,
        totalCostUsd: 0,
        avgWordCount: 0,
        avgPlayerNameMatchRate: 0,
        avgManualReviewScore: 0,
      };
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);

    return {
      provider: args.provider || "all",
      totalTranscriptions: filtered.length,
      avgLatencyMs: avg(filtered.map((m) => m.latencyMs)),
      totalCostUsd: sum(filtered.map((m) => m.costUsd)),
      avgWordCount: avg(filtered.map((m) => m.wordCount)),
      avgPlayerNameMatchRate: avg(
        filtered
          .filter((m) => m.playerNameMatchRate !== undefined)
          .map((m) => m.playerNameMatchRate!)
      ),
      avgManualReviewScore: avg(
        filtered
          .filter((m) => m.manualReviewScore !== undefined)
          .map((m) => m.manualReviewScore!)
      ),
    };
  },
});

/**
 * Get comparison metrics for all providers
 */
export const getProviderComparison = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      provider: v.string(),
      totalTranscriptions: v.number(),
      avgLatencyMs: v.number(),
      totalCostUsd: v.number(),
      avgPlayerNameMatchRate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const metrics = await ctx.db.query("transcriptionMetrics").collect();

    // Filter by date range
    const filtered = metrics.filter((m) => {
      if (args.startDate && m.createdAt < args.startDate) return false;
      if (args.endDate && m.createdAt > args.endDate) return false;
      return true;
    });

    // Group by provider
    const grouped = filtered.reduce(
      (acc, m) => {
        if (!acc[m.provider]) {
          acc[m.provider] = [];
        }
        acc[m.provider].push(m);
        return acc;
      },
      {} as Record<string, typeof filtered>
    );

    // Calculate aggregates per provider
    return Object.entries(grouped).map(([provider, providerMetrics]) => {
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      const avg = (arr: number[]) => sum(arr) / arr.length;

      return {
        provider,
        totalTranscriptions: providerMetrics.length,
        avgLatencyMs: avg(providerMetrics.map((m) => m.latencyMs)),
        totalCostUsd: sum(providerMetrics.map((m) => m.costUsd)),
        avgPlayerNameMatchRate: avg(
          providerMetrics
            .filter((m) => m.playerNameMatchRate !== undefined)
            .map((m) => m.playerNameMatchRate!)
        ),
      };
    });
  },
});
```

---

## Phase 3: Enable A/B Testing

### Option A: Percentage-Based Rollout (Recommended)

Add random assignment logic to feature flags:

```typescript
export const getTranscriptionProvider = internalQuery({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.union(
    v.literal("whisper"),
    v.literal("deepgram_nova3")
  ),
  handler: async (ctx, args) => {
    // Check for explicit overrides first
    const orgFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_org_and_flag", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("flagName", "transcription_provider")
      )
      .first();

    if (orgFlag?.value) {
      return orgFlag.value as "whisper" | "deepgram_nova3";
    }

    // ⭐ NEW: Random assignment for A/B test
    // 50% Whisper, 50% Deepgram
    const hash = hashString(args.userId + args.organizationId);
    const bucket = hash % 100;

    if (bucket < 50) {
      return "whisper";
    } else {
      return "deepgram_nova3";
    }
  },
});

// Simple hash function for consistent bucketing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### Option B: Manual Assignment (Fine-Grained Control)

Create feature flags via Convex dashboard or mutations:

```typescript
// Enable Deepgram for specific org
await ctx.db.insert("featureFlags", {
  organizationId: "org_abc123",
  flagName: "transcription_provider",
  value: "deepgram_nova3",
  enabled: true,
  createdAt: Date.now(),
});

// Enable Deepgram for specific user
await ctx.db.insert("featureFlags", {
  userId: "user_xyz789",
  flagName: "transcription_provider",
  value: "deepgram_nova3",
  enabled: true,
  createdAt: Date.now(),
});
```

---

## Phase 4: Deploy & Monitor

### Step 1: Deploy Code

```bash
# 1. Run codegen
npx -w packages/backend convex codegen

# 2. Type check
npm run check-types

# 3. Commit changes
git add packages/backend/convex
git commit -m "feat: add Deepgram Nova-3 A/B testing for voice transcription

- Add Deepgram SDK integration with Nova-3 model
- Implement transcription provider feature flag system
- Add transcriptionMetrics table for performance tracking
- Support GAA terminology keyword boosting
- Calculate per-provider cost and latency metrics

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Push to production
git push origin main
```

### Step 2: Monitor Metrics

**Create dashboard page**: `apps/web/src/app/platform/transcription-metrics/page.tsx`

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TranscriptionMetricsPage() {
  const comparison = useQuery(api.models.transcriptionMetrics.getProviderComparison, {
    startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  });

  if (!comparison) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Transcription A/B Test Results</h1>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Provider</th>
            <th className="p-2 text-right">Transcriptions</th>
            <th className="p-2 text-right">Avg Latency</th>
            <th className="p-2 text-right">Total Cost</th>
            <th className="p-2 text-right">Name Match Rate</th>
          </tr>
        </thead>
        <tbody>
          {comparison.map((row) => (
            <tr key={row.provider} className="border-t">
              <td className="p-2 font-medium">{row.provider}</td>
              <td className="p-2 text-right">{row.totalTranscriptions}</td>
              <td className="p-2 text-right">{row.avgLatencyMs.toFixed(0)}ms</td>
              <td className="p-2 text-right">${row.totalCostUsd.toFixed(2)}</td>
              <td className="p-2 text-right">
                {(row.avgPlayerNameMatchRate * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Phase 5: Analyze & Decide (Week 5-6)

### Collect Data

**After 4 weeks**, run analysis query:

```typescript
const whisperMetrics = await ctx.runQuery(
  api.models.transcriptionMetrics.getProviderMetrics,
  { provider: "whisper-1" }
);

const deepgramMetrics = await ctx.runQuery(
  api.models.transcriptionMetrics.getProviderMetrics,
  { provider: "deepgram-nova-3" }
);

console.log("Whisper:", whisperMetrics);
console.log("Deepgram:", deepgramMetrics);
```

### Decision Criteria

```typescript
// Switch to Deepgram if:
const shouldSwitch = (
  // Cost savings
  deepgramMetrics.totalCostUsd < whisperMetrics.totalCostUsd * 0.9 &&

  // Latency improvement
  deepgramMetrics.avgLatencyMs < whisperMetrics.avgLatencyMs * 0.5 &&

  // Accuracy maintained (within 3%)
  deepgramMetrics.avgPlayerNameMatchRate >= whisperMetrics.avgPlayerNameMatchRate - 0.03 &&

  // No coach complaints
  coachComplaints === 0
);

if (shouldSwitch) {
  console.log("✅ Migrate to Deepgram");
} else {
  console.log("❌ Stay with Whisper");
}
```

### Manual Review

Sample 100 transcripts from each provider:

```sql
-- Query to get random sample for manual review
SELECT * FROM transcriptionMetrics
WHERE provider = 'deepgram-nova-3'
ORDER BY RANDOM()
LIMIT 100;
```

**Review checklist per transcript:**
- [ ] Irish accent handled correctly?
- [ ] GAA terminology accurate? (hand pass, solo run, etc.)
- [ ] Irish names correct? (Niamh, Aoife, Saoirse, etc.)
- [ ] Overall transcript quality (1-5 rating)

---

## Rollback Plan

### If Deepgram Underperforms

1. **Immediate rollback** (< 5 minutes):
   ```typescript
   // Set default provider back to Whisper in code
   export const getTranscriptionProvider = internalQuery({
     handler: async (ctx, args) => {
       return "whisper"; // Hard-coded fallback
     },
   });
   ```

2. **Deploy**:
   ```bash
   git commit -m "rollback: revert to Whisper transcription"
   git push origin main
   ```

3. **Analyze failure**:
   - Check metrics for specific failure patterns
   - Review coach feedback
   - Investigate Irish accent performance

---

## Estimated Timeline

| Week | Phase | Tasks | Deliverable |
|------|-------|-------|-------------|
| **1** | Setup | Sign up, integrate SDK, feature flags, deploy | Code in production |
| **2-5** | Testing | 50/50 traffic split, collect metrics | 1000+ transcripts per provider |
| **6** | Analysis | Manual review, metrics comparison, decision | Go/no-go report |
| **7+** | Migration | Gradual rollout if approved (25% → 100%) | Full migration or rollback |

---

## Cost Estimate

**Testing Phase (4 weeks at 20K min/month)**:
- Whisper (50%): 10K min × $0.006 = $60/month × 1 month = $60
- Deepgram (50%): 10K min × $0.0043 = $43/month × 1 month = $43
- **Total test cost**: ~$103/month (vs $120 baseline)

**Deepgram free credit**: $200 = 46,500 minutes free
**Covers**: 46.5K min / 10K per month = **4.6 months of testing for FREE**

---

## Success Metrics

Track these KPIs:

| Metric | Whisper Baseline | Deepgram Target | Status |
|--------|-----------------|----------------|--------|
| **Latency** | ~30s | <5s (6× faster) | 🟡 Measure |
| **Cost** | $120/month | $86/month (28% savings) | 🟡 Measure |
| **Name Match Rate** | ~87% | ≥85% | 🟡 Measure |
| **Irish Accent Score** | TBD | ≥4/5 | 🟡 Manual review |
| **Coach Complaints** | 0 | 0 | 🟡 Monitor |

---

## Next Steps

1. **Sign up for Deepgram** (get $200 credit): https://console.deepgram.com/signup
2. **Add API key** to Convex environment
3. **Copy code** from this guide into your codebase
4. **Deploy** and start A/B test
5. **Monitor** metrics dashboard
6. **Review** after 4 weeks
7. **Decide**: Migrate or stay with Whisper

---

## Questions?

Common issues and solutions:

**Q: Deepgram returning empty transcripts?**
- Check audio format (OGG/WebM supported)
- Verify API key is correct
- Check Deepgram console for error logs

**Q: Higher error rate with Deepgram?**
- Review error logs in Convex dashboard
- Check if audio files are corrupted
- Verify network connectivity to Deepgram API

**Q: Cost higher than expected?**
- Check if using correct model (nova-3 vs nova-2)
- Verify keyword list isn't too large (costs extra)
- Monitor via Deepgram usage dashboard

---

**END OF IMPLEMENTATION GUIDE**

Ready to start testing! 🚀
