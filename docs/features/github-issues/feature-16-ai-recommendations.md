# AI Recommendations Enhancement & Analytics Integration

## Overview
Enhance and expand the AI recommendations system for coaches, integrating with PostHog for analytics tracking to measure effectiveness and user adoption. AI recommendations help coaches identify focus areas for their teams and individual players based on data analysis.

## Current State
- Basic AI recommendations exist in MVP
- Currently set up as a screen within coach's dashboard overview
- "Generate Session" AI feature exists
- No comprehensive tracking or analytics
- Not clear how recommendations are surfaced or acted upon

## Purpose
Provide coaches with AI-powered insights and recommendations that help them:
- Identify team strengths and weaknesses
- Suggest focus areas for upcoming training
- Highlight players who need additional attention
- Recommend development strategies based on data patterns
- Save time on planning and decision-making

## Key Features

### 1. Team-Level Recommendations
**AI analyzes team data to suggest:**
- Focus areas for next training session
  - "Your team's passing accuracy has dropped 15% over last 3 sessions - focus on passing drills"
- Player development priorities
  - "3 players are behind on speed development - consider group sprint training"
- Formation/lineup suggestions
  - "Based on recent performance, consider this lineup for upcoming match"
- Training session ideas
  - "Your team excels at defense but needs work on attacking - here are 5 attacking drills"

**Data Sources:**
- Recent assessment scores
- Training attendance patterns
- Match performance (if tracked)
- Development goal progress
- Voice note sentiment analysis

### 2. Player-Level Recommendations
**AI suggests for individual players:**
- Skill development priorities
  - "Player A has plateaued in shooting accuracy - recommend focused shooting practice"
- Playing time adjustments
  - "Player B has shown 20% improvement - consider more playing time"
- Position recommendations
  - "Player C's skills suggest they might excel as midfielder instead of forward"
- Motivational insights
  - "Player D hasn't received positive feedback in 2 weeks - acknowledge their effort"

### 3. Coach Dashboard Integration
**Where recommendations appear:**
- **Dashboard Widget**: "Today's AI Insights" card
- **Action Centre Integration**: Recommendations become actionable tasks
- **Planning Section**: Suggestions when planning training sessions
- **Player View**: Recommendations when viewing player profile

**Recommendation Types:**
1. **Urgent** - Needs immediate attention (e.g., player injury risk, team morale issue)
2. **Important** - Should address soon (e.g., skill gap, development delay)
3. **Opportunity** - Nice to have (e.g., advanced techniques, new drills)

### 4. AI-Generated Training Sessions
**"Generate Session" Enhancement:**
- Existing feature: AI generates training session outline
- Enhancements:
  - Personalized to team's current needs
  - Considers recent performance data
  - Adapts to available time and resources
  - Saves as editable template
  - Track which AI-generated sessions were used

**Session Generation Inputs:**
- Team skills assessment data
- Recent performance trends
- Upcoming match schedule
- Training objectives (set by coach)
- Available equipment and space
- Player availability

**Session Generation Outputs:**
- Warm-up exercises (10 min)
- Skill drills (30 min)
  - Drill name, description, diagram
  - Players involved, groups
  - Success criteria
- Scrimmage/game play (20 min)
- Cool-down (10 min)
- Focus areas and coaching points

### 5. Recommendation Feedback Loop
**Coach interactions with recommendations:**
- **Accept**: "Good idea, I'll do this" → Adds to Action Centre
- **Dismiss**: "Not relevant right now" → AI learns
- **Snooze**: "Remind me later" → Resurfaces after X days
- **Rate**: "This was helpful / not helpful" → Improves AI over time

**Tracking effectiveness:**
- Did coach act on recommendation?
- What was the outcome? (improved assessment scores, etc.)
- How long did it take to act?
- Which types of recommendations are most useful?

## PostHog Analytics Integration

### Events to Track

**Recommendation Generation:**
```javascript
posthog.capture('ai_recommendation_generated', {
  recommendation_type: 'team_focus_area',
  recommendation_priority: 'important',
  coach_id: user.id,
  team_id: team.id,
  organization_id: org.id,
})
```

**Recommendation Interaction:**
```javascript
posthog.capture('ai_recommendation_action', {
  action: 'accepted' | 'dismissed' | 'snoozed' | 'rated',
  recommendation_id: rec.id,
  recommendation_type: rec.type,
  time_to_action: timeElapsed, // seconds
  rating: 1-5, // if rated
})
```

**Session Generation:**
```javascript
posthog.capture('ai_session_generated', {
  session_type: 'training',
  team_id: team.id,
  coach_id: user.id,
  used_session: true/false, // tracked later
})
```

**Outcome Tracking:**
```javascript
posthog.capture('ai_recommendation_outcome', {
  recommendation_id: rec.id,
  outcome: 'positive' | 'neutral' | 'negative',
  improvement_metric: 'passing_accuracy',
  improvement_percentage: 12,
})
```

### PostHog Dashboards

**AI Recommendations Overview:**
- Total recommendations generated
- Acceptance rate (% accepted vs. dismissed)
- Average time to action
- Recommendations by type (team vs. player, focus area)
- Recommendations by priority

**Effectiveness Metrics:**
- Outcome tracking (positive outcomes percentage)
- Improvement metrics (skill score changes after acting on recommendations)
- Coach engagement (how often coaches interact with recommendations)
- Feature adoption (% of coaches using AI recommendations)

**Session Generation Metrics:**
- Sessions generated per week
- Sessions actually used by coaches
- Coach satisfaction with generated sessions
- Most popular session types

### A/B Testing Opportunities
- **Test 1**: Recommendation placement (dashboard widget vs. notification)
- **Test 2**: Recommendation frequency (daily vs. weekly)
- **Test 3**: Recommendation format (detailed vs. concise)
- **Test 4**: Personalization level (generic vs. highly specific)

## AI Recommendation Engine

### Data Inputs
1. **Assessment Data**
   - Player skill ratings over time
   - Trends (improving, declining, stagnant)
   - Gaps between current and target levels

2. **Voice Notes**
   - Sentiment analysis (positive, neutral, negative)
   - Frequency of mentions (players mentioned often)
   - Topic extraction (skills, behavior, performance)

3. **Attendance**
   - Training attendance rates
   - Pattern detection (declining attendance = potential issue)

4. **Development Goals**
   - Progress toward goals
   - Overdue milestones
   - Abandoned goals

5. **Team Context**
   - Upcoming matches (prepare for specific opponent)
   - Season phase (pre-season vs. competition)
   - Team size and composition

### AI Models
**Recommendation Types:**
1. **Rule-Based**: Simple if/then logic (e.g., if passing score drops > 10%, recommend passing drills)
2. **Pattern Recognition**: ML model identifies patterns in successful development
3. **Collaborative Filtering**: "Coaches with similar teams focused on X"
4. **Generative AI**: GPT-based recommendations with detailed explanations

**Model Architecture:**
```
Input Data → Feature Engineering → ML Model → Recommendations → Post-Processing → UI
```

### Recommendation Quality
**Criteria for good recommendations:**
- **Relevant**: Based on actual data, not generic
- **Actionable**: Coach can act on it immediately
- **Specific**: Names players, skills, drills
- **Timely**: Matches current team needs
- **Measurable**: Can track if it worked

**Quality Assurance:**
- Don't recommend the same thing repeatedly if dismissed
- Don't overwhelm coach (max 5 recommendations at a time)
- Prioritize urgent over nice-to-have
- Rotate types (don't only show skill recommendations)

## User Workflows

### Scenario 1: Coach Reviews Daily Recommendations
1. Coach opens dashboard in morning
2. Sees "AI Insights" widget with 3 recommendations:
   - 🔴 Urgent: "Player X showing signs of burnout - consider rest day"
   - 🟡 Important: "Team passing accuracy down - focus on passing drills"
   - 🟢 Opportunity: "Your team is ready for advanced defensive tactics"
3. Coach clicks on passing recommendation
4. Sees detailed analysis: "Passing accuracy: 72% (down from 85% 2 weeks ago). Affected players: A, B, C"
5. Coach accepts recommendation → Added to Action Centre: "Plan passing drills for next session"
6. Coach uses "Generate Session" to create passing-focused training
7. AI generates session outline
8. Coach reviews, edits, and saves
9. Conducts training session following AI plan
10. Next assessment: Passing accuracy improves to 80%
11. PostHog tracks: Recommendation accepted → Session generated → Positive outcome

### Scenario 2: Coach Dismisses Irrelevant Recommendation
1. Coach sees recommendation: "Consider playing Player Y as goalkeeper"
2. Coach knows Player Y has no interest in goalkeeping
3. Coach dismisses with reason: "Player preference doesn't match"
4. AI learns: Don't suggest position changes for Player Y
5. Future recommendations are more relevant

### Scenario 3: AI Suggests Player Needs Attention
1. AI analyzes voice notes and assessments
2. Detects: Player Z hasn't received positive feedback in 3 weeks AND skill scores declining
3. Generates recommendation: "Player Z may be losing confidence - provide encouragement"
4. Coach sees recommendation, realizes they've been focused on other players
5. Coach leaves positive voice note for Player Z after next training
6. Player Z's engagement improves (tracked through attendance and performance)
7. PostHog tracks: Recommendation led to positive intervention

## Technical Implementation

### Backend (Convex)
```typescript
// Generate recommendations
export const generateRecommendations = query({
  args: { teamId: v.id("team") },
  returns: v.array(v.object({
    id: v.string(),
    type: v.string(),
    priority: v.string(),
    title: v.string(),
    description: v.string(),
    actionable: v.boolean(),
    dataPoints: v.array(v.any()),
  })),
  handler: async (ctx, args) => {
    // Fetch team data
    const assessments = await getRecentAssessments(ctx, args.teamId)
    const voiceNotes = await getRecentVoiceNotes(ctx, args.teamId)
    const attendance = await getAttendance(ctx, args.teamId)

    // Run AI analysis
    const recommendations = await analyzeTeamData({
      assessments,
      voiceNotes,
      attendance,
    })

    return recommendations
  },
})

// Track recommendation interaction
export const trackRecommendationAction = mutation({
  args: {
    recommendationId: v.string(),
    action: v.union(v.literal("accepted"), v.literal("dismissed"), v.literal("snoozed")),
  },
  handler: async (ctx, args) => {
    // Save interaction
    await ctx.db.insert("recommendationInteractions", {
      recommendationId: args.recommendationId,
      action: args.action,
      timestamp: Date.now(),
      userId: ctx.auth.userId,
    })

    // Track in PostHog (via action)
    await ctx.scheduler.runAfter(0, internal.analytics.trackRecommendationAction, {
      ...args,
      userId: ctx.auth.userId,
    })
  },
})
```

### Frontend (Next.js)
```typescript
// Coach dashboard component
export function AIRecommendationsWidget() {
  const recommendations = useQuery(api.recommendations.generateRecommendations, { teamId })

  const handleAccept = (rec) => {
    trackRecommendationAction({ recommendationId: rec.id, action: "accepted" })
    posthog.capture('ai_recommendation_action', { action: 'accepted', recommendation_id: rec.id })
    // Add to action centre
    addTask({ title: rec.title, description: rec.description })
  }

  return (
    <Card>
      <CardHeader>Today's AI Insights</CardHeader>
      <CardContent>
        {recommendations?.map(rec => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onAccept={() => handleAccept(rec)}
            onDismiss={() => handleDismiss(rec)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
```

### PostHog Integration
```typescript
// apps/web/src/lib/analytics.ts
export const analytics = {
  trackRecommendation: (event: string, properties: object) => {
    if (typeof window !== 'undefined' && window.posthog) {
      posthog.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      })
    }
  },
}
```

## Success Metrics
- **Adoption**: 70%+ of active coaches view AI recommendations weekly
- **Engagement**: 40%+ acceptance rate for recommendations
- **Effectiveness**: 60%+ of accepted recommendations lead to positive outcomes
- **Satisfaction**: 4.5+ star coach rating for AI recommendations
- **Time Savings**: Coaches report 30%+ time savings on planning
- **Improvement**: Teams with high AI recommendation usage show better player development

## Implementation Phases

### Phase 1: Enhanced Recommendations
- Expand recommendation types (team + player)
- Improve recommendation quality
- Add feedback loop (accept/dismiss/rate)
- Basic PostHog tracking

### Phase 2: Dashboard Integration
- AI Insights widget on coach dashboard
- Integration with Action Centre
- Recommendation notification system
- A/B testing different placements

### Phase 3: Session Generation Enhancement
- Improve "Generate Session" with team data
- Save and reuse sessions
- Track session usage
- Analytics on session effectiveness

### Phase 4: Advanced AI
- ML model for pattern recognition
- Personalized recommendations per coach
- Predictive insights (future performance)
- Agentic capabilities (auto-execute simple tasks)

## References
- MVP AI recommendations implementation
- "Generate Session" feature (already exists)
- PostHog Analytics setup: `docs/setup/posthog-analytics.md`
- AI Cost Management (Feature #17)
- Action Centre (Feature #11)

## Open Questions
1. Should recommendations be per-team or per-coach (across all teams)?
2. How often to refresh recommendations? (daily, weekly, on-demand)
3. Should recommendations be sent via email/notification or only in-app?
4. Can coaches customize what types of recommendations they want to see?
5. Should there be AI recommendations for parents or admins too?
6. How do we prevent AI recommendation fatigue (too many recommendations)?
