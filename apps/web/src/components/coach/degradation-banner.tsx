"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type DegradationType =
  | "ai_fallback"
  | "rate_limited"
  | "budget_exceeded";

interface DegradationBannerProps {
  degradationType: DegradationType;
}

/**
 * Degradation Banner Component
 *
 * Displays a user-friendly warning when AI services are degraded or unavailable.
 * Uses amber styling and warning icon for visibility.
 *
 * Shown in coach interfaces when:
 * - Circuit breaker is open (AI service down)
 * - Rate limits exceeded
 * - Budget limits exceeded
 */
export function DegradationBanner({ degradationType }: DegradationBannerProps) {
  const messages = {
    ai_fallback: {
      title: "AI assistance temporarily unavailable",
      description:
        "Using simplified summaries. Service typically recovers within 5 minutes. Your insights are still being saved and shared with parents.",
    },
    rate_limited: {
      title: "AI rate limit reached",
      description:
        "Your organization has reached its AI usage limit for this period. Using simplified summaries until the limit resets. Contact your administrator if this happens frequently.",
    },
    budget_exceeded: {
      title: "AI budget limit reached",
      description:
        "Your organization has reached its AI spending budget for this period. Using simplified summaries until the budget resets. Contact your administrator to review budget settings.",
    },
  };

  const message = messages[degradationType];

  return (
    <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="ml-2">
        <span className="font-semibold">{message.title}:</span>{" "}
        {message.description}
      </AlertDescription>
    </Alert>
  );
}
