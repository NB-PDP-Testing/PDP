interface TeamData {
  teamName: string;
  players?: any[]; // Optional - only used for recommendations
  playerCount?: number; // For session plans
  ageGroup?: string; // For session plans
  avgSkillLevel: number;
  strengths: Array<{ skill: string; avg: number }>;
  weaknesses: Array<{ skill: string; avg: number }>;
  attendanceIssues: number;
  overdueReviews: number;
}

export interface AIRecommendation {
  priority: number;
  title: string;
  description: string;
  actionItems: string[];
  playersAffected: string[];
}

export interface AIResponse {
  recommendations: AIRecommendation[];
  usedRealAI: boolean; // Track if real AI was used or fell back
}

// Use backend proxy (API route) to keep API key secure
// Try real AI by default - fall back to simulated if API key not configured or request fails
const USE_REAL_AI = process.env.NEXT_PUBLIC_USE_REAL_AI !== "false"; // Default to true unless explicitly disabled

export async function generateCoachingRecommendations(
  teamData: TeamData
): Promise<AIResponse> {
  // If explicitly disabled, use simulated
  if (process.env.NEXT_PUBLIC_USE_REAL_AI === "false") {
    console.log("🤖 Using simulated AI recommendations (explicitly disabled)");
    return {
      recommendations: generateSimulatedRecommendations(teamData),
      usedRealAI: false,
    };
  }

  // Try real AI first - will fall back to simulated if it fails
  try {
    // Track response time
    const startTime = performance.now();
    console.log("📡 Calling AI backend...");

    // Call our backend proxy function with timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teamData }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ AI response received in ${elapsed}s`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(
        "⚠️ Backend API error:",
        response.status,
        errorData,
        "- using simulated AI"
      );
      console.warn(
        "💡 Tip: Make sure ANTHROPIC_API_KEY is set in your .env.local file"
      );
      return {
        recommendations: generateSimulatedRecommendations(teamData),
        usedRealAI: false,
      };
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Parse AI response into structured recommendations
    console.log(`✅ Successfully used Real Claude AI (${elapsed}s)`);
    return {
      recommendations: parseAIRecommendations(aiResponse, teamData),
      usedRealAI: true,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("⏱️ AI request timed out after 30s - using simulated AI");
    } else {
      console.error(
        "❌ Error calling backend API:",
        error,
        "- falling back to simulated AI"
      );
      console.error(
        "💡 Troubleshooting:",
        "\n  1. Check that ANTHROPIC_API_KEY is set in apps/web/.env.local",
        "\n  2. Restart your dev server after adding the API key",
        "\n  3. Check browser console and server logs for detailed errors"
      );
    }
    return {
      recommendations: generateSimulatedRecommendations(teamData),
      usedRealAI: false,
    };
  }
}

function parseAIRecommendations(
  aiResponse: string,
  teamData: TeamData
): AIRecommendation[] {
  try {
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response");
      return generateSimulatedRecommendations(teamData);
    }

    const recommendations = JSON.parse(jsonMatch[0]);
    return recommendations;
  } catch (error) {
    console.error("Error parsing AI recommendations:", error);
    return generateSimulatedRecommendations(teamData);
  }
}

// Fallback simulated recommendations
function generateSimulatedRecommendations(
  teamData: TeamData
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];

  // Priority 1: Biggest weakness
  if (teamData.weaknesses.length > 0) {
    const weakness = teamData.weaknesses[0];
    const affectedPlayers = (teamData.players || [])
      .filter((p) => {
        const skillValue = (p.skills as any)[toCamelCase(weakness.skill)];
        return typeof skillValue === "number" && skillValue < 3;
      })
      .map((p) => p.name)
      .slice(0, 5);

    recommendations.push({
      priority: 1,
      title: `Skill Development: ${weakness.skill}`,
      description: `Team average for ${weakness.skill} is ${weakness.avg.toFixed(1)}/5, significantly below target. This weakness is affecting overall team performance and limiting tactical options.`,
      actionItems: [
        `Dedicate 15-20 minutes per training session to ${weakness.skill.toLowerCase()} drills`,
        "Use progression-based exercises: basic technique → pressure situations → game scenarios",
        "Implement peer coaching by pairing stronger players with those needing improvement",
        "Video analysis of proper technique and common mistakes",
      ],
      playersAffected: affectedPlayers,
    });
  }

  // Priority 2: Attendance issues
  if (teamData.attendanceIssues > 0) {
    const lowAttendancePlayers = (teamData.players || [])
      .filter(
        (p) =>
          p.attendance && Number.parseInt(p.attendance.training || "100") < 70
      )
      .map((p) => p.name);

    recommendations.push({
      priority: 2,
      title: "Attendance Intervention Required",
      description: `${teamData.attendanceIssues} player${teamData.attendanceIssues > 1 ? "s have" : " has"} training attendance below 70%. Research shows strong correlation between attendance and skill development - low attendance leads to skill stagnation.`,
      actionItems: [
        "Schedule one-on-one meetings with parents to understand barriers to attendance",
        "Offer flexible training times if scheduling conflicts exist",
        "Implement a buddy system where teammates encourage each other",
        "Recognize and celebrate attendance improvements publicly",
      ],
      playersAffected: lowAttendancePlayers,
    });
  }

  // Priority 3: Leverage strengths
  if (teamData.strengths.length > 0) {
    const strength = teamData.strengths[0];
    const topPerformers = (teamData.players || [])
      .filter((p) => {
        const skillValue = (p.skills as any)[toCamelCase(strength.skill)];
        return typeof skillValue === "number" && skillValue >= 4;
      })
      .map((p) => p.name)
      .slice(0, 3);

    recommendations.push({
      priority: 3,
      title: `Build Tactics Around Team Strength: ${strength.skill}`,
      description: `Team excels at ${strength.skill} (avg ${strength.avg.toFixed(1)}/5). This is a significant competitive advantage that should be leveraged in game strategy and training focus.`,
      actionItems: [
        `Design game strategies and set plays that emphasize ${strength.skill.toLowerCase()}`,
        "Use this strength as a confidence-builder in training sessions",
        "Develop advanced techniques in this area to maintain competitive edge",
        "Consider positional assignments that maximize this team strength",
      ],
      playersAffected: topPerformers,
    });
  }

  return recommendations.slice(0, 3);
}

function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

export async function generateSessionPlan(
  teamData: TeamData,
  focus?: string
): Promise<string> {
  // If explicitly disabled, use simulated
  if (process.env.NEXT_PUBLIC_USE_REAL_AI === "false") {
    console.log("🤖 Using simulated session plan (explicitly disabled)");
    return generateSimulatedSessionPlan(teamData, focus);
  }

  // Try real AI first - will fall back to simulated if it fails
  try {
    // Track response time and payload size
    const startTime = performance.now();
    const payload = JSON.stringify({ teamData, focus });
    const payloadSizeKB = (new Blob([payload]).size / 1024).toFixed(2);

    console.log("📡 Generating session plan with AI...");
    console.log(`   📦 Payload size: ${payloadSizeKB} KB (optimized)`);
    console.log(
      `   🎯 Team: ${teamData.teamName}, Players: ${teamData.playerCount}, Focus: ${focus || "General"}`
    );

    // Call our backend proxy function with timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch("/api/session-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(
        `⚠️ Session plan API error (${elapsed}s):`,
        response.status,
        errorData,
        "- using simulated plan"
      );
      console.warn(
        "💡 Tip: Make sure ANTHROPIC_API_KEY is set in your .env.local file"
      );
      return generateSimulatedSessionPlan(teamData, focus);
    }

    const data = await response.json();
    const outputLength = data.content[0].text.length;
    console.log(
      `✅ Session plan generated in ${elapsed}s (${outputLength} characters)`
    );
    return data.content[0].text;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        "⏱️ Session plan request timed out after 30s - using simulated plan"
      );
    } else {
      console.error("❌ Error generating session plan:", error);
      console.error(
        "💡 Troubleshooting:",
        "\n  1. Check that ANTHROPIC_API_KEY is set in apps/web/.env.local",
        "\n  2. Restart your dev server after adding the API key",
        "\n  3. Check browser console and server logs for detailed errors"
      );
    }
    return generateSimulatedSessionPlan(teamData, focus);
  }
}

function generateSimulatedSessionPlan(
  teamData: TeamData,
  focus?: string
): string {
  const weakness = teamData.weaknesses[0]?.skill || "Skills";

  return `# Training Session Plan - ${teamData.teamName}
${focus ? `**Focus: ${focus}**\n` : ""}

## Warm-up (10 minutes)
- Dynamic stretching and light jogging
- Ball familiarization exercises
- Fun possession games (3v1, 4v2)

## Technical Skills (30 minutes)
**Focus on ${weakness}:**
- Demonstrate proper technique
- Individual practice (5 mins)
- Partner drills with progression (10 mins)
- Pressure situations (10 mins)
- Group feedback and correction (5 mins)

## Tactical Work (25 minutes)
- Position-specific drills
- Game scenarios emphasizing ${weakness}
- Decision-making under pressure
- Review team shape and movement

## Small-sided Games (20 minutes)
- 7v7 or 9v9 games
- Condition: Extra points for using ${weakness.toLowerCase()}
- Rotate positions every 5 minutes
- Coach feedback during natural breaks

## Cool-down (5 minutes)
- Light stretching
- Team huddle: Review session goals
- Positive reinforcement
- Preview next session

**Equipment Needed:** Balls, cones, bibs, goals
**Key Coaching Points:** Encouragement, technique correction, game understanding`;
}
