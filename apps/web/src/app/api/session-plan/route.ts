import { api } from "@pdp/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route - Claude API Proxy for Session Plans
 * Route: /api/session-plan
 *
 * This route acts as a server-side proxy to the Anthropic Claude API
 * to keep API keys secure and avoid CORS issues.
 *
 * Configuration: reads from Convex aiModelConfig table (feature: "session_plan")
 * Falls back to defaults if unavailable.
 */

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_TEMPERATURE = 0.7;

async function getModelConfig() {
  let modelConfig = {
    model: DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    fallbackModel: undefined as string | undefined,
  };
  try {
    const dbConfig = await fetchQuery(
      api.models.aiModelConfig.getConfigForFeature,
      { feature: "session_plan" }
    );
    if (dbConfig) {
      modelConfig = {
        model: dbConfig.modelId,
        maxTokens: dbConfig.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: dbConfig.temperature ?? DEFAULT_TEMPERATURE,
        fallbackModel:
          dbConfig.fallbackModelId ?? dbConfig.platformDefaultFallbackModelId,
      };
    }
  } catch (e) {
    console.warn(
      "Could not fetch AI config for session_plan, using defaults:",
      e
    );
  }
  return modelConfig;
}

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

    // Get model configuration from Convex (with fallback to defaults)
    const config = await getModelConfig();

    // Capture after guard so TS knows it's a string inside closures
    const resolvedApiKey: string = apiKey;

    function callClaude(modelId: string) {
      return fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": resolvedApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    }

    let response = await callClaude(config.model);

    if (!response.ok && config.fallbackModel) {
      console.warn(
        `[SessionPlan] Primary model ${config.model} failed (${response.status}), retrying with fallback ${config.fallbackModel}`
      );
      response = await callClaude(config.fallbackModel);
    }

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
