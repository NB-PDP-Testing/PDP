# Parent Summary Agent

## Purpose

Transform coach voice notes into parent-friendly, positive sentiment summaries suitable for sharing with parents/guardians. This agent analyzes speech content for sentiment, extracts insights, and reframes observations constructively.

## Use Case

Coaches leave candid voice notes about player performance during training/matches. These notes often contain:
- Direct critiques ("struggling with first touch")
- Technical observations ("positioning was off")
- Areas of concern ("keeps losing the ball under pressure")
- Positive observations mixed with negatives

Parents need a constructive, encouraging version that:
- Highlights genuine positives
- Reframes development areas as growth opportunities
- Maintains honesty without being discouraging
- Supports the player's continued engagement

---

## Agent Flow

```
┌─────────────────┐
│  Voice Note     │
│  Transcription  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  1. Sentiment   │
│    Analysis     │
│  - Tone detection
│  - Positive/negative ratio
│  - Emotional markers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Insight     │
│   Extraction    │
│  - Player mentions
│  - Skills discussed
│  - Behaviors noted
│  - Performance areas
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Positive    │
│   Reframing     │
│  - Growth mindset language
│  - Constructive framing
│  - Highlight strengths
│  - Development opportunities
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parent-Ready   │
│    Summary      │
└─────────────────┘
```

---

## Input Schema

```typescript
interface VoiceNoteInput {
  transcription: string;        // Raw transcribed text from coach
  noteType: "training" | "match" | "general";
  playerContext?: {             // Optional player roster for matching
    playerIdentityId: string;
    firstName: string;
    lastName: string;
    ageGroup?: string;
  }[];
  coachName?: string;           // For personalization
}
```

---

## Output Schema

```typescript
interface ParentSummaryOutput {
  // Sentiment analysis of original
  sentimentAnalysis: {
    overall: "positive" | "neutral" | "negative" | "mixed";
    score: number;              // -1 (very negative) to 1 (very positive)
    positiveElements: string[]; // Direct quotes/paraphrases of positives
    areasForGrowth: string[];   // Constructively reframed negatives
  };

  // The main parent-friendly summary
  parentFriendlyText: string;

  // Per-player breakdowns (when multiple players mentioned)
  playerSummaries: {
    playerIdentityId?: string;
    playerName: string;
    summary: string;            // 2-3 sentence player-specific summary
    highlights: string[];       // Positive observations
    developmentFocus: string[]; // Growth areas (constructive framing)
  }[];

  // Metadata
  generatedAt: string;
}
```

---

## Transformation Examples

### Example 1: Critical Note → Encouraging Summary

**Original Coach Note:**
> "Jack was struggling today with his first touch. Kept losing the ball under pressure. His positioning was off too. Though he did show good effort in the second half and made a nice tackle."

**Sentiment Analysis:**
```json
{
  "overall": "mixed",
  "score": -0.2,
  "positiveElements": [
    "showed good effort in the second half",
    "made a nice tackle"
  ],
  "areasForGrowth": [
    "first touch under pressure",
    "positioning awareness"
  ]
}
```

**Parent-Friendly Summary:**
> "Jack showed great determination today, especially in the second half where his effort really shone through with some solid defensive work including a well-timed tackle. We're currently working on his ball control and spatial awareness - these are normal development areas that improve with regular practice. His attitude is exactly what we want to see, and that effort will translate to skill improvement over time."

---

### Example 2: Mostly Negative → Growth-Focused

**Original Coach Note:**
> "Sarah had a tough session. Wasn't listening to instructions, kept drifting out of position. Got frustrated when things didn't go her way and stopped trying in the last 10 minutes. Need to work on her attitude."

**Sentiment Analysis:**
```json
{
  "overall": "negative",
  "score": -0.6,
  "positiveElements": [],
  "areasForGrowth": [
    "focus and listening during instructions",
    "maintaining position",
    "managing frustration",
    "perseverance when challenged"
  ]
}
```

**Parent-Friendly Summary:**
> "Sarah is working through some important development areas that will serve her well both in sport and life. Today we focused on building concentration during team instructions and maintaining her position on the field. Like many young athletes, she's learning to manage the emotions that come with challenging sessions - this is a normal part of development. We'll be working with her on building resilience and staying engaged even when things feel difficult. These mental skills are just as important as the physical ones."

---

### Example 3: Already Positive → Enhanced

**Original Coach Note:**
> "Great session from Liam today. His passing was sharp, really connecting well with teammates. Showed good leadership organizing the back line. Scored two goals in the practice match."

**Sentiment Analysis:**
```json
{
  "overall": "positive",
  "score": 0.85,
  "positiveElements": [
    "passing was sharp",
    "connecting well with teammates",
    "showed good leadership",
    "organized the back line",
    "scored two goals"
  ],
  "areasForGrowth": []
}
```

**Parent-Friendly Summary:**
> "Liam had an excellent session today! His passing was sharp and he showed great awareness connecting with teammates across the field. What really stood out was his leadership - he took initiative organizing the defensive line, showing maturity beyond his years. He capped off the session with two goals in the practice match. It's wonderful to see his confidence growing and his teammates responding to his positive influence."

---

### Example 4: Multi-Player Note

**Original Coach Note:**
> "Mixed session today. Emma was excellent - best player on the pitch, her dribbling has really improved. Tom needs work on his shooting, kept blazing over the bar. New kid Alex did well for first day, bit shy but has good technique."

**Parent-Friendly Summary:**
> "Today's session showed great progress across the group with each player working on different aspects of their game."

**Player Summaries:**

**Emma:**
> "Emma was outstanding today and really stood out on the pitch. Her dribbling skills have noticeably improved - all that practice is paying off! She's becoming a real asset to the team."
> - Highlights: ["Outstanding performance", "Dribbling improvement", "Best player on pitch"]
> - Development Focus: []

**Tom:**
> "Tom is focusing on his shooting technique at the moment. He's got good power and isn't afraid to take shots - now we're fine-tuning his accuracy. This is a normal progression, and with practice, he'll start finding the target more consistently."
> - Highlights: ["Confident taking shots", "Good shooting power"]
> - Development Focus: ["Shot accuracy and technique"]

**Alex:**
> "Alex had a great first day with us! He's settling in well and already showing solid technical skills. As he gets more comfortable with the group, we expect to see even more from him. A promising start!"
> - Highlights: ["Good technique", "Positive first session", "Settling in well"]
> - Development Focus: ["Building confidence with new teammates"]

---

## Reframing Strategies

### Language Transformations

| Coach Language | Parent-Friendly Language |
|----------------|-------------------------|
| "struggling with" | "working on", "developing" |
| "can't do X" | "building skills in X" |
| "poor" | "an area we're focusing on" |
| "lazy" | "learning to maintain energy" |
| "not listening" | "developing focus and concentration" |
| "attitude problem" | "learning to manage emotions" |
| "worst on the team" | "has lots of room to grow" |
| "gave up" | "learning perseverance" |
| "clumsy" | "refining coordination" |
| "slow" | "building pace and agility" |

### Framing Principles

1. **Growth Mindset**: Frame everything as a journey, not a fixed state
2. **Effort Over Outcome**: Praise process and effort, not just results
3. **Specific Positives**: Find and highlight genuine positives, however small
4. **Constructive Development**: Present weaknesses as opportunities
5. **Age-Appropriate Context**: Acknowledge developmental norms
6. **Future-Focused**: Emphasize what comes next, not what went wrong

---

## System Prompt (Draft)

```
You are an expert at transforming coach feedback into parent-friendly communications. Your role is to:

1. ANALYZE the sentiment of coach voice note transcriptions
2. EXTRACT both positive observations and areas of concern
3. REFRAME the content for parents using growth-mindset language

RULES:
- Never fabricate positives that aren't there - find genuine ones, however small
- Never hide serious concerns (injuries, safety issues) - these must be communicated
- Always maintain the coach's core message while adjusting tone
- Use constructive, encouraging language without being dishonest
- Frame development areas as normal parts of athletic growth
- Acknowledge effort and attitude positively when present
- Keep summaries concise but warm (2-4 sentences per player)

TONE:
- Warm and supportive
- Professional but personable
- Encouraging without being unrealistic
- Honest but constructive

OUTPUT:
Provide structured JSON matching the ParentSummaryOutput schema.
```

---

## Edge Cases to Handle

1. **No positives at all**: Find effort, attendance, or participation to highlight
2. **Injury mentioned**: Flag for coach review, don't minimize
3. **Behavioral concerns**: Reframe but ensure message gets through
4. **Multiple players with same name**: Use context clues or flag for clarification
5. **Very short notes**: Generate proportionally brief summaries
6. **Technical jargon**: Translate to parent-friendly terms
7. **Sarcasm in original**: Detect and handle appropriately

---

## Implementation Notes

### Phase 1: Standalone Test
- Create a simple script to test the prompt with sample inputs
- Iterate on the system prompt based on output quality
- Build a test suite of diverse coach note examples

### Phase 2: Integration
- Add schema fields to `voiceNotes` table
- Create `generateParentSummary` action
- Add to the existing pipeline (after `buildInsights`)
- Create UI for coach to review before sharing

### Phase 3: Refinement
- Add coach feedback loop ("this reframing is good/needs adjustment")
- Learn from coach preferences over time
- Add organization-level tone settings

---

## Test Cases

### Test 1: Basic Negative → Positive
```
Input: "Tommy was terrible today. Couldn't pass, couldn't shoot, didn't try."
Expected: Mixed/negative sentiment detected, reframed to focus on development areas and the importance of continued practice.
```

### Test 2: Injury Mention (Should Flag)
```
Input: "Katie twisted her ankle during drills. Sat out the rest of session. Otherwise was doing well."
Expected: Injury flagged prominently, positive context preserved.
```

### Test 3: Behavior Issue
```
Input: "Mike was disruptive today, kept messing around and distracting others."
Expected: Reframed around focus and teamwork development, core message preserved.
```

### Test 4: Pure Positive (Enhancement)
```
Input: "Brilliant from Sophie. Everything she touched turned to gold."
Expected: Enhanced and specific, maintaining enthusiasm.
```

### Test 5: Multi-Player with Mixed Feedback
```
Input: "Good session. Dan was great, leading by example. Chris struggled but kept trying. New player Jamie looked lost."
Expected: Individual summaries with appropriate framing for each.
```

---

## Questions to Resolve

1. Should coaches be able to edit the generated summary before sharing?
2. Should there be different "tone levels" (more/less constructive)?
3. How to handle notes that mention sensitive topics (bullying, family issues)?
4. Should parents see both original and reframed, or just reframed?
5. What's the minimum content needed to generate a useful summary?

---

## Next Steps

1. [ ] Test the system prompt with GPT-4 using example inputs
2. [ ] Refine based on output quality
3. [ ] Define the exact schema additions needed
4. [ ] Build the Convex action
5. [ ] Add UI for coach review/share workflow
