import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route - Claude API Proxy for Passport Comparison Insights
 * Route: /api/comparison-insights
 *
 * This route generates AI-powered insights by analyzing the comparison
 * between a coach's local assessments and shared passport data from other organizations.
 *
 * Configuration (via environment variables):
 * - ANTHROPIC_MODEL_COMPARISON: Model to use (default: claude-3-5-haiku-20241022)
 * - ANTHROPIC_MAX_TOKENS_COMPARISON: Max tokens (default: 2000)
 * - ANTHROPIC_TEMPERATURE_COMPARISON: Temperature (default: 0.7)
 */

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TEMPERATURE = 0.7;

function getConfig() {
  return {
    model: process.env.ANTHROPIC_MODEL_COMPARISON || DEFAULT_MODEL,
    maxTokens: process.env.ANTHROPIC_MAX_TOKENS_COMPARISON
      ? Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS_COMPARISON, 10)
      : DEFAULT_MAX_TOKENS,
    temperature: process.env.ANTHROPIC_TEMPERATURE_COMPARISON
      ? Number.parseFloat(process.env.ANTHROPIC_TEMPERATURE_COMPARISON)
      : DEFAULT_TEMPERATURE,
  };
}

type ComparisonData = {
  playerName: string;
  playerAge?: string;
  localOrg: string;
  sharedOrgs: string[];
  localSport?: string;
  sharedSport?: string;
  sportsMatch: boolean;
  divergences: Array<{
    skillName: string;
    localRating: number;
    sharedRating: number;
    delta: number;
  }>;
  agreements: Array<{
    skillName: string;
    localRating: number;
    sharedRating: number;
    delta: number;
  }>;
  blindSpots: {
    localOnly: string[];
    sharedOnly: string[];
  };
  localSkillCount: number;
  sharedSkillCount: number;
};

function buildComparisonPrompt(data: ComparisonData): string {
  const divergencesList = data.divergences
    .map(
      (d) =>
        `- ${d.skillName}: You rated ${d.localRating.toFixed(1)}, shared data shows ${d.sharedRating.toFixed(1)} (Δ${d.delta.toFixed(1)})`
    )
    .join("\n");

  const agreementsList = data.agreements
    .slice(0, 5) // Limit for context
    .map(
      (a) =>
        `- ${a.skillName}: You rated ${a.localRating.toFixed(1)}, shared shows ${a.sharedRating.toFixed(1)}`
    )
    .join("\n");

  const sportContext = data.sportsMatch
    ? `Both assessments are for the same sport (${data.localSport || "Unknown"}).`
    : `Cross-sport comparison: Your assessment is for ${data.localSport || "Unknown"}, shared data is for ${data.sharedSport || "Unknown"}. Focus on transferable skills.`;

  return `You are an expert sports development coach analyzing skill assessment data to provide actionable insights for player development.

## Context
Player: ${data.playerName}${data.playerAge ? ` (${data.playerAge})` : ""}
Your Organization: ${data.localOrg}
Shared Data From: ${data.sharedOrgs.join(", ")}
${sportContext}

## Assessment Summary
- Your assessments: ${data.localSkillCount} skills evaluated
- Shared assessments: ${data.sharedSkillCount} skills evaluated
- Skills in agreement (Δ ≤ 1.0): ${data.agreements.length}
- Skills diverging (Δ > 1.0): ${data.divergences.length}

## Significant Divergences (Where assessments differ by more than 1 point)
${divergencesList || "No significant divergences found."}

## Areas of Agreement
${agreementsList || "No overlapping skills to compare."}

## Blind Spots
- Skills only you assessed: ${data.blindSpots.localOnly.length > 0 ? data.blindSpots.localOnly.join(", ") : "None"}
- Skills only in shared data: ${data.blindSpots.sharedOnly.length > 0 ? data.blindSpots.sharedOnly.join(", ") : "None"}

Based on this comparison data, provide coaching insights in the following JSON format:

{
  "summary": "A 2-3 sentence executive summary of the key findings from this comparison",
  "keyInsights": [
    {
      "title": "Brief insight title",
      "insight": "Detailed explanation of what this comparison reveals about the player",
      "actionable": "Specific action the coach can take based on this insight",
      "priority": "high" | "medium" | "low"
    }
  ],
  "developmentFocus": {
    "immediate": ["Skill or area to focus on right now based on divergences"],
    "shortTerm": ["Skills to develop over next few weeks"],
    "longTerm": ["Strategic development areas"]
  },
  "questions": [
    "Thoughtful questions the coach should investigate based on the data discrepancies"
  ],
  "positives": [
    "Encouraging observations about the player's consistent strengths"
  ]
}

Guidelines:
1. Be specific and actionable - reference actual skill names and ratings
2. Consider why ratings might differ (different contexts, training focus, observation opportunities)
3. Frame divergences as opportunities for discussion, not criticism
4. Highlight transferable skills if this is a cross-sport comparison
5. Provide 3-5 key insights, 2-3 questions, and 2-3 positives
6. Keep the tone constructive and development-focused

Return ONLY valid JSON, no additional text.`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
      return NextResponse.json(
        {
          error: "API key not configured",
          message:
            "ANTHROPIC_API_KEY environment variable is missing. Add it to apps/web/.env.local",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { comparisonData } = body;

    if (!comparisonData) {
      return NextResponse.json(
        { error: "comparisonData is required" },
        { status: 400 }
      );
    }

    const prompt = buildComparisonPrompt(comparisonData);

    // Get model configuration
    const config = getConfig();

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

    // Parse the response to extract the JSON content
    try {
      const content = data.content?.[0]?.text;
      if (content) {
        // Try to parse as JSON
        const insights = JSON.parse(content);
        return NextResponse.json({ insights, raw: data });
      }
    } catch (parseError) {
      // If parsing fails, return the raw response
      console.warn("Failed to parse AI response as JSON:", parseError);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in comparison-insights API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({
    message: "Comparison Insights API",
    status: "Function is deployed and working!",
    method: "POST required",
    description: "Generates AI-powered insights from passport comparison data",
    expectedBody: {
      comparisonData: {
        playerName: "string",
        localOrg: "string",
        sharedOrgs: ["string"],
        divergences: "array of skill comparisons",
        agreements: "array of skill comparisons",
        blindSpots: {
          localOnly: ["string"],
          sharedOnly: ["string"],
        },
      },
    },
  });
}
