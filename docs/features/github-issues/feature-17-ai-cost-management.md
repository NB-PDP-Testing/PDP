# AI Cost Management & Control System

## Overview
Implement a comprehensive AI cost management system to monitor, control, and optimize AI usage across the platform. As AI features expand (VoiceNote transcription, recommendations, session generation, agentic capabilities), we need foundational infrastructure to prevent runaway costs and ensure sustainable AI operations.

## Current State
- Two AI features already implemented:
  1. **Generate Session**: AI-generated training sessions
  2. **AI Recommendations**: Insights for coaches
- VoiceNote transcription uses AI
- No cost tracking or control mechanisms
- No caching or optimization strategies
- No visibility into AI spend
- Uncertainty about cost as platform scales

## Purpose
Build a foundation for responsible AI usage that:
- Tracks all AI API calls and associated costs
- Implements caching to reduce redundant AI requests
- Sets usage limits and alerts
- Provides visibility into AI spend by feature, user, organization
- Enables informed decisions about AI feature development
- Prevents budget overruns
- Scales sustainably as user base grows

## Strategic Importance
As mentioned in user requirements, we've implemented AI protection and caching on other projects (Grains fixtures website). This feature applies those learnings to PlayerARC before AI costs become a problem.

## Audit-First Approach

### Phase 1: Audit Existing AI Usage
**Inventory all current AI features:**
1. Generate Session (GPT-based training plan generation)
2. AI Recommendations (pattern analysis and suggestions)
3. VoiceNote Transcription (speech-to-text)
4. VoiceNote Insights (sentiment analysis, key points extraction)

**For each feature, document:**
- Which AI API/model is used (OpenAI GPT-4, Whisper, etc.)
- Average cost per request
- Request frequency (per user, per org, per day)
- Current monthly cost
- Cost projection at 100 users, 1,000 users, 10,000 users

**Audit Questions:**
1. Which feature has highest cost per user?
2. Which feature is used most frequently?
3. Are there redundant API calls that could be cached?
4. Are we using the most cost-effective models for each task?
5. What's our total current AI spend and projected growth?

### Phase 2: Build Based on Audit Findings
Based on audit results:
- Identify highest-cost features to optimize first
- Determine caching strategies that would have biggest impact
- Set realistic budgets and limits
- Build monitoring infrastructure

## Key Components

### 1. AI Cost Tracking

**Track every AI API call:**
```typescript
aiRequestLog {
  id: string
  feature: "voice_transcription" | "ai_recommendations" | "generate_session" | "voice_insights"
  model: "gpt-4" | "gpt-3.5-turbo" | "whisper"
  timestamp: number

  // Request details
  userId: Id<"user">
  organizationId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number

  // Cost calculation
  costPerToken: number
  totalCost: number // USD

  // Performance
  latency: number // ms
  cacheHit: boolean

  // Metadata
  requestId: string
  responseStatus: "success" | "error" | "cached"
}
```

**Aggregate metrics:**
- Total cost by feature
- Total cost by organization
- Total cost by user
- Daily/weekly/monthly trends
- Cost per active user

### 2. Intelligent Caching System

**Cache Strategy:**
- **VoiceNote Transcription**: Cache audio fingerprint → transcription
  - Same audio file uploaded twice = instant cached result
  - Saves expensive Whisper API calls

- **Generate Session**: Cache (team_id + focus_areas + recent_data_hash) → session plan
  - Similar training contexts = reuse cached sessions
  - Coach can customize cached session if needed

- **AI Recommendations**: Cache (team_id + data_snapshot_hash) → recommendations
  - Refresh only when underlying data changes significantly
  - Daily recommendations pull from cache if data unchanged

- **Voice Insights**: Cache (transcription_hash) → insights
  - Same transcription always produces same insights
  - No need to reprocess

**Cache Implementation:**
```typescript
aiCache {
  id: string
  feature: string
  cacheKey: string // Hash of input parameters
  cacheValue: object // Cached AI response
  createdAt: number
  expiresAt: number
  hitCount: number // How many times cache was used
  costSaved: number // Total cost saved by caching
}

// Example usage
async function generateSession(teamId, focus) {
  const cacheKey = hash({ teamId, focus, recentDataHash })

  // Check cache first
  const cached = await getCachedResponse(cacheKey)
  if (cached && !cached.isExpired) {
    logAIRequest({ feature: "generate_session", cacheHit: true, costSaved: 0.05 })
    return cached.value
  }

  // Cache miss - call AI
  const result = await callOpenAI(prompt)
  await cacheResponse(cacheKey, result, expiresIn: "24h")
  logAIRequest({ feature: "generate_session", cost: 0.05, tokens: result.tokens })

  return result
}
```

**Cache Invalidation:**
- Time-based expiry (recommendations: 24h, sessions: 7 days)
- Data-based invalidation (new assessments = invalidate recommendations)
- Manual purge (if AI model is updated)

### 3. Usage Limits & Alerts

**Rate Limits:**
- Per user: Max X AI requests per day
- Per organization: Max Y AI requests per month
- Per feature: Different limits for different features
- Platform-wide: Total daily/monthly budget cap

**Tiered Limits by Organization Plan:**
```typescript
orgAILimits {
  organizationId: string
  plan: "free" | "basic" | "premium" | "enterprise"

  // Limits per month
  voiceTranscriptionMinutes: number // 30 for free, 500 for premium
  aiRecommendations: number // 50 for free, unlimited for premium
  sessionGenerations: number // 10 for free, unlimited for premium

  // Current usage
  currentUsage: {
    voiceTranscriptionMinutes: number
    aiRecommendations: number
    sessionGenerations: number
  }

  // Alerts
  alertThreshold: number // % (e.g., 80%)
  alertsEnabled: boolean
}
```

**Alert System:**
- Notify org admin when approaching limit (80%, 90%, 100%)
- Notify platform staff when total spend approaches budget
- Daily/weekly cost summary emails
- Spike detection (unusual AI usage pattern)

**Graceful Degradation:**
- When limit reached: Show user-friendly message
- Offer upgrade path (if on free/basic plan)
- Suggest cache-based alternatives (show last cached result)
- Don't break user experience

### 4. Cost Dashboard (Platform Staff)

**Real-Time Metrics:**
- Current month AI spend
- Budget remaining
- Cost per feature (pie chart)
- Cost trend (line chart over time)
- Top spending organizations
- Top spending users

**Detailed Breakdown:**
- Cost by AI model (GPT-4 vs GPT-3.5 vs Whisper)
- Cache hit rate (% of requests served from cache)
- Cost savings from caching
- Average cost per active user
- ROI analysis (AI cost vs. value delivered)

**Alerts & Thresholds:**
- Set monthly budget
- Get alerts at 50%, 75%, 90%, 100%
- Spike detection (2x normal daily spend)
- Model-specific alerts (GPT-4 expensive, monitor closely)

### 5. AI Feature Toggle System

**Platform staff can:**
- Enable/disable AI features platform-wide
- Enable/disable per organization
- Switch between AI models (GPT-4 → GPT-3.5 for cost savings)
- Set priority (which features to keep if budget tight)

**Configuration:**
```typescript
aiFeatureConfig {
  feature: string
  enabled: boolean
  model: string // Which AI model to use
  fallbackModel: string // If primary fails or too expensive
  priority: number // 1-5, higher = more important
  costPerRequest: number
  allowedOrganizations: string[] // If feature is beta
}
```

**Use Cases:**
- Beta test expensive features with select orgs
- Degrade to cheaper models during budget crunch
- Disable non-critical features to preserve budget for critical ones
- A/B test GPT-4 vs GPT-3.5 to find cost/quality sweet spot

## AI Cost Optimization Strategies

### 1. Model Selection
- **Use smallest model that works**: GPT-3.5 vs GPT-4 (10x cost difference)
- **Batch requests**: Combine multiple small requests into one
- **Prompt optimization**: Shorter prompts = lower costs

### 2. Caching
- **Aggressive caching** for deterministic tasks
- **Partial caching**: Cache embeddings, not full responses
- **Shared caching**: Users with similar contexts share cached results

### 3. Pre-processing
- **Filter before AI**: Only send data that needs AI processing
- **Template-based**: Use templates when possible, AI for customization only
- **Rule-based first**: Try simple rules before calling AI

### 4. Request Optimization
- **Streaming**: Stream responses to show progress, potentially cheaper
- **Early stopping**: Stop generation when enough quality reached
- **Sample limiting**: Limit training examples in prompt

### 5. Alternative Approaches
- **Local models**: For simple tasks, run models locally (no API cost)
- **Smaller models**: Fine-tuned smaller models for specific tasks
- **Embeddings**: Use embeddings for search instead of full GPT calls

## Technical Implementation

### Middleware for AI Calls
```typescript
// packages/backend/convex/lib/ai.ts

export async function callAI(params: {
  feature: string
  model: string
  prompt: string
  userId: string
  organizationId: string
  cacheable?: boolean
  cacheKey?: string
  cacheExpiry?: number
}) {
  const startTime = Date.now()

  // 1. Check feature is enabled
  const config = await getAIFeatureConfig(params.feature)
  if (!config.enabled) {
    throw new Error(`AI feature ${params.feature} is disabled`)
  }

  // 2. Check usage limits
  const withinLimits = await checkUsageLimits(params.organizationId, params.feature)
  if (!withinLimits) {
    throw new Error("AI usage limit reached for this organization")
  }

  // 3. Check cache (if cacheable)
  if (params.cacheable && params.cacheKey) {
    const cached = await getCachedResponse(params.cacheKey)
    if (cached) {
      await logAIRequest({
        ...params,
        cacheHit: true,
        latency: Date.now() - startTime,
        costSaved: config.costPerRequest,
      })
      return cached.value
    }
  }

  // 4. Call AI API
  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: params.prompt }],
  })

  // 5. Calculate cost
  const cost = calculateCost(response.usage.total_tokens, config.model)

  // 6. Log request
  await logAIRequest({
    ...params,
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    totalCost: cost,
    latency: Date.now() - startTime,
    cacheHit: false,
  })

  // 7. Cache response (if cacheable)
  if (params.cacheable && params.cacheKey) {
    await cacheResponse(params.cacheKey, response.choices[0].message.content, params.cacheExpiry)
  }

  // 8. Increment usage counter
  await incrementUsage(params.organizationId, params.feature)

  return response.choices[0].message.content
}
```

### Cost Calculation
```typescript
function calculateCost(tokens: number, model: string): number {
  const pricing = {
    "gpt-4": { input: 0.03, output: 0.06 }, // per 1K tokens
    "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
    "whisper": { duration: 0.006 }, // per minute
  }

  // Simplified - actual calculation more complex
  return (tokens / 1000) * pricing[model].input
}
```

## User Experience

### For Coaches (No Change)
- AI features work seamlessly
- If limit reached: Friendly message + upgrade option
- Cached responses are instant (better UX)

### For Org Admins
- Dashboard showing AI usage for their org
- Option to upgrade plan for more AI capacity
- Notifications when approaching limit

### For Platform Staff
- Full visibility into costs
- Control over features and limits
- Alerts and reports

## Success Metrics
- **Cost Reduction**: 40%+ cost savings through caching
- **Cache Hit Rate**: 60%+ of requests served from cache
- **Budget Compliance**: Stay within monthly AI budget 100% of time
- **No Degradation**: User experience doesn't suffer from cost controls
- **Visibility**: Platform staff have real-time cost insights
- **Scalability**: Cost per user decreases as platform scales (due to caching)

## Implementation Phases

### Phase 1: Audit (2 weeks)
- Inventory all AI features
- Measure current costs
- Identify optimization opportunities
- Define budgets and limits
- Create audit report

### Phase 2: Tracking & Monitoring (2 weeks)
- Build AI request logging
- Create cost dashboard for platform staff
- Implement basic alerts
- Track key metrics

### Phase 3: Caching System (3 weeks)
- Design cache architecture
- Implement caching for high-cost features
- Measure cache hit rates
- Optimize cache invalidation

### Phase 4: Limits & Controls (2 weeks)
- Implement usage limits
- Build org-level quotas
- Create user-facing limit messages
- Test graceful degradation

### Phase 5: Optimization & Refinement (ongoing)
- A/B test model selection (GPT-4 vs GPT-3.5)
- Optimize prompts for cost
- Explore alternative approaches
- Continuous improvement

## References
- Grains fixtures website AI protection/caching (successful implementation)
- VoiceNote Enhancement (Feature #7) - Major AI cost driver
- AI Recommendations (Feature #16) - Another cost driver
- PostHog integration for analytics: `docs/setup/posthog-analytics.md`

## Open Questions
1. What's our acceptable monthly AI budget per user?
2. Should we charge extra for AI features or include in base plan?
3. What's the minimum cache TTL that doesn't hurt quality?
4. Should we build our own local models for some tasks?
5. How do we handle AI costs for free/trial users?
6. Should caching be transparent to users or visible (like "cached response")?

## Related Features
- VoiceNote Enhancement (Feature #7)
- AI Recommendations (Feature #16)
- Any future agentic AI features
