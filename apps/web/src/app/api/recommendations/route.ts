import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route - Claude API Proxy for Coaching Recommendations
 * Route: /api/recommendations
 *
 * This route acts as a server-side proxy to the Anthropic Claude API
 * to keep API keys secure and avoid CORS issues.
 *
 * Configuration (via environment variables):
 * - ANTHROPIC_MODEL_RECOMMENDATIONS: Model to use (default: claude-3-5-haiku-20241022)
 * - ANTHROPIC_MAX_TOKENS_RECOMMENDATIONS: Max tokens (default: 1500)
 * - ANTHROPIC_TEMPERATURE_RECOMMENDATIONS: Temperature (default: 0.7)
 */

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 1500;
const DEFAULT_TEMPERATURE = 0.7;

interface TeamDataPlayer {
  name: string;
  ageGroup?: string;
  attendance?: { training?: string | number };
  skills?: Record<string, unknown>;
  reviewStatus?: string;
}

interface TeamDataSkill {
  skill: string;
  avg?: number;
}

interface TeamData {
  teamName: string;
  playerCount?: number;
  avgSkillLevel?: number;
  strengths?: TeamDataSkill[];
  weaknesses?: TeamDataSkill[];
  attendanceIssues?: number;
  overdueReviews?: number;
  players?: TeamDataPlayer[];
}

function getConfig() {
  return {
    model: process.env.ANTHROPIC_MODEL_RECOMMENDATIONS || DEFAULT_MODEL,
    maxTokens: process.env.ANTHROPIC_MAX_TOKENS_RECOMMENDATIONS
      ? Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS_RECOMMENDATIONS, 10)
      : DEFAULT_MAX_TOKENS,
    temperature: process.env.ANTHROPIC_TEMPERATURE_RECOMMENDATIONS
      ? Number.parseFloat(process.env.ANTHROPIC_TEMPERATURE_RECOMMENDATIONS)
      : DEFAULT_TEMPERATURE,
  };
}

function buildCoachingPrompt(teamData: TeamData): string {
  const playerSummaries = (teamData.players || [])
    .map((p: TeamDataPlayer) => {
      const skillValues = Object.values(p.skills || {}).filter(
        (v) => typeof v === "number"
      );
      const avgSkill =
        skillValues.length > 0
          ? skillValues.reduce((a: number, b: number) => a + Number(b), 0) /
            skillValues.length
          : 0;

      return `- ${p.name}: ${p.ageGroup || "Unknown"}, Attendance: ${
        p.attendance?.training || "N/A"
      }, Avg Skill: ${avgSkill.toFixed(1)}/5, Review: ${
        p.reviewStatus || "Unknown"
      }`;
    })
    .join("\n");

  return `You are an expert GAA (Gaelic Athletic Association) football coach analyzing team data to provide actionable coaching recommendations.

Team: ${teamData.teamName}
Players: ${teamData.playerCount || 0}
Average Team Skill Level: ${teamData.avgSkillLevel?.toFixed(1) || "0"}/5

Team Strengths:
${(teamData.strengths || [])
  .map((s: TeamDataSkill) => `- ${s.skill}: ${s.avg?.toFixed(1) || "0"}/5`)
  .join("\n")}

Team Weaknesses:
${(teamData.weaknesses || [])
  .map((w: TeamDataSkill) => `- ${w.skill}: ${w.avg?.toFixed(1) || "0"}/5`)
  .join("\n")}

Issues:
- ${teamData.attendanceIssues || 0} players with attendance below 70%
- ${teamData.overdueReviews || 0} overdue passport reviews

Player Details:
${playerSummaries || "No player details available"}

Based on this data, provide exactly 3 prioritized coaching recommendations in JSON format. Each recommendation should have:
- priority (1-3, where 1 is highest)
- title (brief, specific)
- description (2-3 sentences explaining the issue and its impact)
- actionItems (array of 3-4 specific, actionable steps the coach can take)
- playersAffected (array of player names who need this intervention)

Focus on:
1. Most critical skill gaps that affect team performance
2. Attendance/engagement issues impacting development
3. Tactical opportunities to leverage team strengths

Return ONLY valid JSON in this format:
[
  {
    "priority": 1,
    "title": "...",
    "description": "...",
    "actionItems": ["...", "...", "..."],
    "playersAffected": ["Player Name", "..."]
  }
]`;
}

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
      console.error(
        "💡 Add ANTHROPIC_API_KEY=sk-ant-... to apps/web/.env.local"
      );
      return NextResponse.json(
        {
          error: "API key not configured",
          message:
            "ANTHROPIC_API_KEY environment variable is missing. Add it to apps/web/.env.local",
        },
        { status: 500 }
      );
    }

    console.log(
      "✅ API key found, calling Claude API...",
      `${apiKey.substring(0, 10)}...`
    );

    // Get request body (team data)
    const body = await request.json();
    const { teamData } = body;

    if (!teamData) {
      return NextResponse.json(
        { error: "teamData is required" },
        { status: 400 }
      );
    }

    // Build the prompt for Claude
    const prompt = buildCoachingPrompt(teamData);

    // Get model configuration
    const config = getConfig();

    // Call Claude API from server-side (no CORS issues)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Claude API request failed",
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the AI response
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in recommendations API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export function GET() {
  return NextResponse.json({
    message: "Recommendations API",
    status: "Function is deployed and working!",
    method: "POST required",
    expectedBody: {
      teamData: {
        teamName: "string",
        players: "array",
        avgSkillLevel: "number",
        strengths: "array",
        weaknesses: "array",
        attendanceIssues: "number",
        overdueReviews: "number",
      },
    },
  });
}
