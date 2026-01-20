"use node";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Get Anthropic client with API key from environment
 * Throws if ANTHROPIC_API_KEY is not configured
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is not set. Please configure it in Convex dashboard."
    );
  }
  return new Anthropic({ apiKey });
}
