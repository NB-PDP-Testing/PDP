# Wellness Checks for Senior/Elite Players

## Overview
Implement a wellness check system for senior and elite players, allowing coaches to collect daily or weekly check-ins about players' physical, mental, and emotional state. This feature supports player wellbeing, helps coaches adjust training loads, and identifies players who may need additional support.

## Current State
- No wellness check system exists
- Feature identified by John as valuable for senior teams
- Industry examples exist (elite sports teams use wellness apps)
- Not currently implemented in platform

## Purpose
Enable coaches of senior/elite teams to:
- Monitor player wellbeing on a regular basis
- Identify players who may be fatigued, stressed, or injured
- Adjust training intensity based on wellness data
- Provide early intervention for at-risk players
- Support mental health and overall athlete wellbeing

Enable players to:
- Reflect on their own wellbeing
- Communicate with coaches about concerns
- Feel supported by their coaching staff
- Track their own wellness over time

## Industry Context

### Who Uses Wellness Checks
- **Elite Sports**: Professional teams in soccer, rugby, football, basketball
- **Olympic Teams**: National team programs
- **Collegiate Sports**: NCAA Division I teams
- **High-Performance Programs**: Academies and development programs

### What They Track
- **Physical**: Muscle soreness, fatigue, sleep quality, energy levels
- **Mental**: Stress, motivation, mood
- **Illness**: Signs of sickness or injury
- **Training Load**: Perceived exertion, readiness to train

### Example Apps/Systems
- **Teamworks**: Wellness check-ins for pro/college teams
- **Kinduct**: Athlete management system with wellness tracking
- **FitBod/TrainHeroic**: Athlete monitoring platforms
- **Whoop/Oura**: Wearable-based wellness tracking

## Key Features

### 1. Daily/Weekly Wellness Survey

**Configurable by Coach:**
- Frequency: Daily, weekly, or custom schedule
- Questions: Select from template or create custom
- Players: Choose which players must complete (all team or specific individuals)
- Timing: Morning check-in before training, evening recovery check, etc.

**Standard Wellness Questions:**
1. **Sleep Quality** (1-5 scale)
   - "How well did you sleep last night?"
   - Poor / Fair / Average / Good / Excellent

2. **Muscle Soreness** (1-5 scale)
   - "How sore are your muscles?"
   - Not sore / Slightly / Moderate / Very / Extremely

3. **Fatigue** (1-5 scale)
   - "How tired/fatigued do you feel?"
   - Very fatigued / Tired / Average / Fresh / Very fresh

4. **Stress/Mood** (1-5 scale)
   - "How is your mood/stress level?"
   - Very stressed / Stressed / Neutral / Good / Great

5. **Readiness to Train** (1-10 scale)
   - "How ready do you feel to train today?"
   - 1 (not at all) → 10 (completely ready)

6. **Illness/Injury** (Yes/No + details)
   - "Are you feeling sick or have new pain/injury?"
   - If yes: text box for details

7. **Open Comment** (Optional)
   - "Anything else you want your coach to know?"

### 2. Player Check-In Experience

**Morning Notification:**
- Push notification or email: "Good morning! Please complete your wellness check-in for today."
- Opens quick form (< 2 minutes to complete)
- Simple sliders and buttons (mobile-optimized)
- Submit → "Thanks! Your coach will review your check-in."

**Check-In History:**
- Players can view their own check-in history
- See trends over time (am I getting more fatigued?)
- Insights: "Your sleep quality has improved over the past 2 weeks"

**Privacy:**
- Player can mark check-in as "private" (coach sees alert but not details - prompts 1-on-1 conversation)
- Coaches respect player confidentiality
- Check-ins are not shared with teammates

### 3. Coach Dashboard

**Wellness Overview (Team Level):**
- Today's check-ins: 18/22 completed
- Average scores:
  - Sleep: 3.8/5
  - Soreness: 2.9/5
  - Fatigue: 3.2/5
  - Readiness: 7.1/10
- Alerts: 3 players with red flags

**Individual Player View:**
- Click on player to see their check-in details
- Trends over past week, month, season
- Comparison to their baseline
- Flags: Low readiness, high fatigue, illness/injury reported

**Red Flags:**
- Player scores below threshold (e.g., readiness < 5/10)
- Multiple consecutive days of poor sleep
- Player reports illness/injury
- Significant drop from baseline (player usually 8/10, now 4/10)

**Actions Coach Can Take:**
- View player details and check-in history
- Adjust training load for that player today
- Send private message to player: "I saw your check-in. Let's chat."
- Excuse player from intense training (rest day or light activity)
- Refer to medical staff or support services

### 4. Trends & Analytics

**Team Wellness Trends:**
- Line chart: Average team readiness over season
- Identify patterns: "Team fatigue spikes after matches"
- Compare to performance: "Team performs better when average readiness > 7"

**Individual Player Trends:**
- Player's wellness over time (line charts)
- Correlation with performance (high readiness → better performance?)
- Identify chronic issues (player always reports high soreness → needs assessment)

**Predictive Insights (AI):**
- "Player X showing signs of burnout - consider rest"
- "Team readiness declining - adjust training load"
- "Player Y has consistent poor sleep - may need support"

### 5. Org-Level Controls (Enable/Disable)

**Organization Admins Can:**
- Enable wellness checks for specific teams (senior teams, elite squads)
- Disable for youth teams (likely not needed for U10 players)
- Set organization-wide wellness check templates
- Customize questions for their sport/culture

**Why Toggle?**
- Not all teams need wellness checks (youth teams don't)
- Some coaches may not want to use this feature
- Org can enable as they scale to senior/elite programs
- Avoids overwhelming coaches with unused features

## User Workflows

### Scenario 1: Player Completes Morning Check-In
1. Wake up at 7 AM, see notification: "Wellness check-in for today"
2. Open app, takes 90 seconds to complete form:
   - Sleep: 4/5 (Good)
   - Soreness: 3/5 (Moderate - legs sore from yesterday)
   - Fatigue: 3/5 (Average)
   - Readiness: 7/10
   - Injury: No
   - Comment: "Legs are a bit sore but feel okay"
3. Submits check-in
4. Sees confirmation: "Thanks! Coach will review before training."

### Scenario 2: Coach Reviews Check-Ins Before Training
1. Coach opens app 1 hour before training
2. Navigates to Wellness Check-ins
3. Sees: 18/22 players completed check-ins
4. Reviews summary:
   - Team average readiness: 7.1/10 (good)
   - Red flags: 2 players
     - Player A: Readiness 3/10, reported poor sleep
     - Player B: Reported new knee pain
5. Takes action:
   - Sends message to Player A: "I saw you're feeling tired. Take it easy today, no sprints."
   - Pulls Player B aside before training: "Tell me about your knee pain."
6. Adjusts training plan: Less high-intensity, more recovery drills

### Scenario 3: Coach Identifies Burnout Trend
1. Coach notices Player X has declining check-ins over 2 weeks
2. Reviews Player X's history:
   - Week 1: Average readiness 8/10
   - Week 2: Average readiness 6/10
   - Week 3: Average readiness 4/10
   - Recent comments: "Feeling tired", "Stressed about school"
3. Coach schedules 1-on-1 meeting with Player X
4. Conversation reveals: Overwhelmed with school + training + part-time job
5. Coach adjusts Player X's schedule: Reduce training load temporarily
6. Player X's wellness improves over next 2 weeks

### Scenario 4: Team Wellness Analysis
1. After a tough match weekend, coach reviews wellness data
2. Notices: Team average readiness dropped from 7.5 to 5.2
3. Plans lighter training week to allow recovery
4. By end of week, team readiness back up to 7.8
5. Next match, team performs well
6. Coach notes: "Monitoring wellness helps me avoid overtraining"

### Scenario 5: Organization Enables Wellness Checks
1. Club has just launched senior men's team (competitive)
2. Admin navigates to Organization Settings → Wellness Checks
3. Toggles on: "Enable wellness checks"
4. Selects teams: Senior Men's Team, Senior Women's Team
5. Chooses template: "Standard Elite Wellness Check"
6. Saves settings
7. Coaches of those teams receive notification: "Wellness checks enabled for your team"
8. Coaches configure frequency and start collecting check-ins

## Technical Implementation

### Database Schema

```typescript
wellnessCheckConfigs {
  id: string
  organizationId: string
  teamId: Id<"team">
  enabled: boolean
  frequency: "daily" | "weekly" | "custom"
  scheduleDays?: string[] // ["monday", "wednesday", "friday"]
  scheduleTime?: string // "09:00" (24h format)

  // Questions (customizable)
  questions: {
    id: string
    text: string
    type: "scale" | "boolean" | "text"
    scaleMin?: number
    scaleMax?: number
    required: boolean
    order: number
  }[]

  createdBy: Id<"user">
  createdAt: number
}

wellnessCheckResponses {
  id: string
  playerId: Id<"orgPlayerEnrollments">
  teamId: Id<"team">
  organizationId: string
  checkDate: number // Date for this check-in
  submittedAt: number

  // Responses to questions
  responses: {
    questionId: string
    value: number | boolean | string
  }[]

  // Flags
  isPrivate: boolean // Player marked as private
  hasConcerns: boolean // Any red flags detected
}

wellnessCheckAnalytics {
  // Aggregated data for analytics
  teamId: Id<"team">
  date: number
  averageScores: {
    [questionId: string]: number
  }
  completionRate: number
  flaggedPlayers: Id<"orgPlayerEnrollments">[]
}
```

### Scheduled Job: Send Wellness Check Reminders
```typescript
// Run every morning at configured time
export const sendWellnessCheckReminders = internalMutation({
  handler: async (ctx) => {
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    // Find all teams with wellness checks enabled for today
    const configs = await ctx.db
      .query("wellnessCheckConfigs")
      .filter(q => q.eq(q.field("enabled"), true))
      .collect()

    for (const config of configs) {
      // Check if today is a check-in day
      if (shouldSendCheckInToday(config, now)) {
        // Get all players on team
        const players = await getTeamPlayers(ctx, config.teamId)

        for (const player of players) {
          // Check if player has already completed today's check-in
          const existingResponse = await ctx.db
            .query("wellnessCheckResponses")
            .withIndex("by_player_and_date", q =>
              q.eq("playerId", player._id).eq("checkDate", today)
            )
            .first()

          if (!existingResponse) {
            // Send reminder notification
            await sendNotification(player.userId, {
              type: "wellness_check_reminder",
              message: "Please complete your wellness check-in for today",
              teamId: config.teamId,
            })
          }
        }
      }
    }
  },
})
```

## Privacy & Mental Health Considerations

### Privacy
- Wellness check responses are confidential (coach-only)
- Not shared with teammates or parents
- Player can mark check-in as "private" for sensitive issues
- Audit log of who accessed wellness data

### Mental Health Support
- If player reports severe stress/mental health concern, coach can:
  - Refer to mental health professional
  - Connect player with support resources
  - Check in regularly
- Platform includes mental health resources (links, contacts)

### Not a Medical Tool
- Wellness checks are for monitoring, not diagnosis
- Coaches are not medical professionals
- Serious concerns should be referred to appropriate professionals
- Terms of use clarify this is not a medical device

## Success Criteria
- **Adoption**: 80%+ of senior/elite teams use wellness checks
- **Completion Rate**: 85%+ of players complete check-ins when prompted
- **Coach Value**: 4.5+ star rating for wellness check feature
- **Player Wellbeing**: Fewer burnout cases, better injury prevention
- **Early Intervention**: Coaches report identifying issues earlier
- **Performance**: Teams using wellness checks show better performance outcomes

## Implementation Phases

### Phase 1: Core Wellness Checks
- Basic check-in form (standard questions)
- Daily/weekly scheduling
- Coach dashboard with responses
- Player notification system

### Phase 2: Analytics & Trends
- Historical data visualization
- Team and individual trends
- Red flag detection
- Completion rate tracking

### Phase 3: Advanced Features
- AI-powered insights and predictions
- Customizable questions per team
- Integration with Action Centre (coach tasks from red flags)
- Mental health resource library

### Phase 4: Integrations
- Wearable device integration (Whoop, Oura, Fitbit)
- Export data for sports science analysis
- Integration with injury tracking (Feature #19)

## References
- Industry wellness check apps (Teamworks, Kinduct)
- Sports science research on athlete monitoring
- Mental health resources for athletes
- Action Centre integration (Feature #11)

## Open Questions
1. Should parents of under-18 senior players see wellness check responses?
2. Can wellness checks be anonymous (for team mental health surveys)?
3. Should there be integration with wearables (Whoop, Oura)?
4. What mental health resources should be included?
5. Should wellness checks be mandatory or optional for players?
6. Can coaches customize questions per sport (e.g., swimmers ask about pool time)?
