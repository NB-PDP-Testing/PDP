"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * AI-powered session plan generation
 *
 * This action generates session plan content using AI based on:
 * - Team age group
 * - Player count
 * - Focus area
 * - Duration
 * - Sport type
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

// Top-level regex constants
const RE_HEADING2 = /^##\s+(.+)/;
const RE_HEADING3 = /^###\s+(.+)/;
const RE_BULLET = /^[-*]\s+(.+)/;
const RE_DURATION = /\((\d+)\s*min/i;
const RE_JSON_BLOCK = /\{[\s\S]*\}/;
const RE_WARMUP = /warm.?up/i;
const RE_TECHNICAL = /technical|skill/i;
const RE_TACTICAL = /tactical|tactic/i;
const RE_GAMES = /game|match|small.?sided/i;
const RE_COOLDOWN = /cool.?down/i;

type SectionType =
  | "warmup"
  | "technical"
  | "tactical"
  | "games"
  | "cooldown"
  | "custom";

type ActivityType =
  | "drill"
  | "game"
  | "exercise"
  | "demonstration"
  | "discussion"
  | "rest";

type Activity = {
  id: string;
  name: string;
  description: string;
  duration?: number;
  order: number;
  activityType: ActivityType;
};

type Section = {
  id: string;
  type: SectionType;
  title: string;
  duration: number;
  order: number;
  activities: Activity[];
};

function detectSectionType(title: string): SectionType {
  if (RE_WARMUP.test(title)) {
    return "warmup";
  }
  if (RE_TECHNICAL.test(title)) {
    return "technical";
  }
  if (RE_TACTICAL.test(title)) {
    return "tactical";
  }
  if (RE_GAMES.test(title)) {
    return "games";
  }
  if (RE_COOLDOWN.test(title)) {
    return "cooldown";
  }
  return "custom";
}

function sectionActivityType(type: SectionType): ActivityType {
  if (type === "warmup" || type === "cooldown") {
    return "exercise";
  }
  if (type === "games") {
    return "game";
  }
  return "drill";
}

function extractDuration(heading: string): number {
  const match = heading.match(RE_DURATION);
  return match ? Number.parseInt(match[1], 10) : 15;
}

function buildSessionPlanPrompt(plan: {
  teamName: string;
  playerCount?: number;
  ageGroup?: string;
  focusArea?: string;
  duration?: number;
  sport?: string;
}): string {
  const duration = plan.duration ?? 90;
  const ageGroup = plan.ageGroup ?? "U12";
  const playerCount = plan.playerCount ?? 20;
  const sport = plan.sport ?? "GAA Football";

  return `You are an expert ${sport} coach creating a training session plan.

Team: ${plan.teamName} (${playerCount} players, ${ageGroup})
Duration: ${duration} minutes
${plan.focusArea ? `Focus Area: ${plan.focusArea}` : "General training session"}

Create a detailed training session plan with appropriate time allocations for ${duration} minutes total. Include:
- Warm-Up section
- Technical Skills section
- Tactical Work section
- Small-sided Games or Full Game section
- Cool-Down section

Make it practical, age-appropriate, and engaging for ${ageGroup} players. Use markdown formatting with clear headings (##) and sub-headings (###) and bullet points. Include coaching points, equipment needed, and safety considerations.`;
}

function buildMetadataPrompt(rawContent: string): string {
  return `Analyze this training session plan and extract structured metadata as JSON.

SESSION PLAN:
${rawContent}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "categories": ["string array of 1-3 training categories like Technical Training, Tactical Work, Game-Based, Fitness, etc."],
  "skills": ["string array of 2-5 specific skills covered like Passing, Ball Control, Shooting, Defensive Shape, etc."],
  "equipment": ["string array of equipment needed like Balls, Cones, Bibs, Goals, etc."],
  "intensity": "low" or "medium" or "high"
}`;
}

async function callClaudeAPI(
  apiKey: string,
  prompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Claude API request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error("No content returned from Claude API");
  }
  return text;
}

/**
 * Parse a single heading2 line into a new section
 */
function createSection(title: string, order: number): Section {
  const type = detectSectionType(title);
  return {
    id: `section-${order}`,
    type,
    title,
    duration: extractDuration(title),
    order,
    activities: [],
  };
}

/**
 * Append a bullet item to the last activity of a section, or create a new activity
 */
function appendBulletToSection(section: Section, text: string): void {
  const last = section.activities.at(-1);
  if (last) {
    last.description = last.description ? `${last.description}\n${text}` : text;
  } else {
    const order = section.activities.length + 1;
    section.activities.push({
      id: `activity-${section.order}-${order}`,
      name: text.slice(0, 50),
      description: text,
      order,
      activityType: sectionActivityType(section.type),
    });
  }
}

/**
 * Parse AI-generated markdown content into structured sections
 */
function parseSectionsFromContent(content: string): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const line of content.split("\n")) {
    const h2 = line.match(RE_HEADING2);
    const h3 = line.match(RE_HEADING3);
    const bullet = line.match(RE_BULLET);

    if (h2) {
      currentSection = createSection(h2[1].trim(), sections.length + 1);
      sections.push(currentSection);
    } else if (h3 && currentSection) {
      const order = currentSection.activities.length + 1;
      currentSection.activities.push({
        id: `activity-${currentSection.order}-${order}`,
        name: h3[1].trim(),
        description: "",
        order,
        activityType: currentSection.type === "games" ? "game" : "drill",
      });
    } else if (bullet && currentSection) {
      appendBulletToSection(currentSection, bullet[1].trim());
    }
  }

  return sections;
}

/**
 * Generate session plan content using AI (Claude API)
 * Internal action - called by generateAndSave mutation
 */
export const generatePlanContent = internalAction({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const plan = await ctx.runQuery(
        internal.models.sessionPlans.getPlanByIdInternal,
        { planId: args.planId }
      );

      if (!plan) {
        console.error("[SessionPlan] Plan not found:", args.planId);
        return null;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY not configured in Convex environment"
        );
      }

      const prompt = buildSessionPlanPrompt({
        teamName: plan.teamName,
        playerCount: plan.playerCount,
        ageGroup: plan.ageGroup,
        focusArea: plan.focusArea,
        duration: plan.duration,
        sport: plan.sport,
      });

      console.log(
        `[SessionPlan] Calling Claude API for plan ${args.planId}...`
      );

      const rawContent = await callClaudeAPI(apiKey, prompt, 1500);

      console.log(`[SessionPlan] Plan generated (${rawContent.length} chars)`);

      const sections = parseSectionsFromContent(rawContent);

      await ctx.runMutation(internal.models.sessionPlans.updatePlanContent, {
        planId: args.planId,
        title: `Session Plan - ${plan.teamName}`,
        rawContent,
        sections,
        status: "saved",
      });

      await ctx.runAction(internal.actions.sessionPlans.extractMetadata, {
        planId: args.planId,
      });
    } catch (error) {
      console.error("[SessionPlan] Failed to generate session plan:", error);

      await ctx.runMutation(internal.models.sessionPlans.updatePlanContent, {
        planId: args.planId,
        title: "Failed to Generate",
        rawContent:
          "An error occurred while generating this session plan. Please try again.",
        sections: [],
        status: "draft",
      });
    }

    return null;
  },
});

/**
 * Extract metadata tags from session plan content using AI (Claude API)
 * Internal action - called after plan content is generated
 */
export const extractMetadata = internalAction({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const plan = await ctx.runQuery(
        internal.models.sessionPlans.getPlanByIdInternal,
        { planId: args.planId }
      );

      if (!plan?.rawContent) {
        console.error(
          "[SessionPlan] Plan not found or has no content:",
          args.planId
        );
        return null;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error(
          "[SessionPlan] ANTHROPIC_API_KEY not set in Convex environment"
        );
        return null;
      }

      console.log(
        `[SessionPlan] Extracting metadata for plan ${args.planId}...`
      );

      const rawJson = await callClaudeAPI(
        apiKey,
        buildMetadataPrompt(plan.rawContent),
        300
      );

      let parsed: {
        categories?: string[];
        skills?: string[];
        equipment?: string[];
        intensity?: string;
      };

      try {
        const jsonMatch = rawJson.match(RE_JSON_BLOCK);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson);
      } catch {
        console.error("[SessionPlan] Failed to parse metadata JSON:", rawJson);
        return null;
      }

      const validIntensities = ["low", "medium", "high"] as const;
      const intensity = validIntensities.includes(
        parsed.intensity as (typeof validIntensities)[number]
      )
        ? (parsed.intensity as "low" | "medium" | "high")
        : "medium";

      const extractedTags = {
        categories: parsed.categories?.slice(0, 5) ?? [],
        skills: parsed.skills?.slice(0, 8) ?? [],
        equipment: parsed.equipment?.slice(0, 8) ?? [],
        intensity,
        playerCountRange: {
          min: plan.playerCount ? Math.max(8, plan.playerCount - 4) : 12,
          max: plan.playerCount ? plan.playerCount + 4 : 20,
          optimal: plan.playerCount ?? 16,
        },
      };

      console.log(
        `[SessionPlan] Metadata extracted: ${JSON.stringify(extractedTags)}`
      );

      await ctx.runMutation(internal.models.sessionPlans.updatePlanMetadata, {
        planId: args.planId,
        extractedTags,
      });

      return null;
    } catch (error) {
      console.error("[SessionPlan] Error extracting metadata:", error);
      return null;
    }
  },
});
