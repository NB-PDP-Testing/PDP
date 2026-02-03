import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route - Claude API Proxy for Session Plans
 * Route: /api/session-plan
 *
 * This route acts as a server-side proxy to the Anthropic Claude API
 * to keep API keys secure and avoid CORS issues.
 *
 * Configuration (via environment variables):
 * - ANTHROPIC_MODEL_SESSION_PLAN: Model to use (default: claude-3-5-haiku-20241022)
 * - ANTHROPIC_MAX_TOKENS_SESSION_PLAN: Max tokens (default: 1200)
 * - ANTHROPIC_TEMPERATURE_SESSION_PLAN: Temperature (default: 0.7)
 */

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_TEMPERATURE = 0.7;

type TeamDataSkill = {
  skill: string;
  avg?: number;
};

type TeamData = {
  teamName: string;
  playerCount?: number;
  ageGroup?: string;
  strengths?: TeamDataSkill[];
  weaknesses?: TeamDataSkill[];
};

function getConfig() {
  return {
    model: process.env.ANTHROPIC_MODEL_SESSION_PLAN || DEFAULT_MODEL,
    maxTokens: process.env.ANTHROPIC_MAX_TOKENS_SESSION_PLAN
      ? Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS_SESSION_PLAN, 10)
      : DEFAULT_MAX_TOKENS,
    temperature: process.env.ANTHROPIC_TEMPERATURE_SESSION_PLAN
      ? Number.parseFloat(process.env.ANTHROPIC_TEMPERATURE_SESSION_PLAN)
      : DEFAULT_TEMPERATURE,
  };
}

function buildSessionPlanPrompt(teamData: TeamData, focus?: string): string {
  return `You are an expert GAA football coach creating a training session plan.

Team: ${teamData.teamName} (${teamData.playerCount || 0} players)
${focus ? `Focus Area: ${focus}` : "General training session"}

Team Strengths: ${(teamData.strengths || [])
    .map((s: TeamDataSkill) => s.skill)
    .join(", ")}
Team Weaknesses: ${(teamData.weaknesses || [])
    .map((w: TeamDataSkill) => w.skill)
    .join(", ")}

Create a detailed 90-minute training session plan that addresses the team's weaknesses while maintaining their strengths. Include:
- Warm-up (10 mins)
- Technical Skills (30 mins)
- Tactical Work (25 mins)
- Small-sided Games (20 mins)
- Cool-down (5 mins)

Make it practical, age-appropriate, and fun for ${teamData.ageGroup || "U12"} players.`;
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
    const { teamData, focus } = body;

    if (!teamData) {
      return NextResponse.json(
        { error: "teamData is required" },
        { status: 400 }
      );
    }

    // Build the prompt for Claude
    const prompt = buildSessionPlanPrompt(teamData, focus);

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
    console.error("Error in session-plan API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export function GET() {
  return NextResponse.json({
    message: "Session Plan API",
    status: "Function is deployed and working!",
    method: "POST required",
    expectedBody: {
      teamData: {
        teamName: "string",
        playerCount: "number",
        ageGroup: "string",
        strengths: "array",
        weaknesses: "array",
      },
      focus: "string (optional)",
    },
  });
}
