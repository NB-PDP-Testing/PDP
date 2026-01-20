"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SkillComparisonRowProps = {
  skillName: string;
  skillCode: string;
  localRating: number;
  sharedRating: number;
  delta: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

/**
 * Get color coding for the comparison based on delta
 */
function getComparisonStyle(delta: number): {
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
} {
  if (delta <= 0.5) {
    return {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-300",
      label: "Strong Agreement",
    };
  }
  if (delta <= 1.0) {
    return {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-300",
      label: "Minor Divergence",
    };
  }
  return {
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
    label: "Significant Divergence",
  };
}

/**
 * Skill Comparison Row
 *
 * Displays a single skill comparison between local and shared assessments.
 * Shows color-coded agreement/divergence indicators and rating bars.
 */
export function SkillComparisonRow({
  skillName,
  skillCode: _skillCode,
  localRating,
  sharedRating,
  delta,
  isExpanded,
  onToggleExpand,
}: SkillComparisonRowProps) {
  const style = getComparisonStyle(delta);
  const isLocalHigher = localRating > sharedRating;
  const isEqual = Math.abs(delta) < 0.1;

  const containerProps = onToggleExpand
    ? {
        onClick: onToggleExpand,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            onToggleExpand();
          }
        },
        role: "button" as const,
        tabIndex: 0,
      }
    : {};

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        style.bgColor,
        style.borderColor,
        onToggleExpand && "cursor-pointer hover:opacity-90"
      )}
      {...containerProps}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Skill name and indicator */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className={cn("shrink-0", style.textColor)}>
            {isEqual ? (
              <Minus className="h-4 w-4" />
            ) : isLocalHigher ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </div>
          <span className="truncate font-medium">{skillName}</span>
        </div>

        {/* Rating comparison */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Local rating */}
          <div className="text-center">
            <div className="font-semibold text-sm">
              {localRating.toFixed(1)}
            </div>
            <div className="text-muted-foreground text-xs">You</div>
          </div>

          {/* Visual bar comparison */}
          <div className="hidden w-24 flex-col gap-1 sm:flex">
            {/* Local bar */}
            <div className="flex items-center gap-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${(localRating / 5) * 100}%` }}
                />
              </div>
            </div>
            {/* Shared bar */}
            <div className="flex items-center gap-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(sharedRating / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Shared rating */}
          <div className="text-center">
            <div className="font-semibold text-sm">
              {sharedRating.toFixed(1)}
            </div>
            <div className="text-muted-foreground text-xs">Shared</div>
          </div>

          {/* Delta badge */}
          <Badge
            className={cn("shrink-0", style.textColor, style.bgColor)}
            variant="outline"
          >
            Δ {delta.toFixed(1)}
          </Badge>
        </div>
      </div>

      {/* Expanded details - mobile-friendly */}
      {isExpanded && (
        <div className="mt-3 border-gray-300 border-t pt-3">
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            {/* Mobile: Show bars vertically */}
            <div>
              <div className="mb-1 text-muted-foreground text-xs">
                Your Rating
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${(localRating / 5) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 text-muted-foreground text-xs">
                Shared Rating
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${(sharedRating / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-2 text-muted-foreground text-sm">
            {isEqual
              ? "Both assessments agree on this skill level."
              : isLocalHigher
                ? `You rated this skill ${delta.toFixed(1)} points higher than the shared data.`
                : `The shared data shows this skill ${delta.toFixed(1)} points higher than your assessment.`}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for lists without expand functionality
 */
export function SkillComparisonRowCompact({
  skillName,
  localRating,
  sharedRating,
  delta,
}: Omit<SkillComparisonRowProps, "isExpanded" | "onToggleExpand">) {
  const style = getComparisonStyle(delta);
  const isLocalHigher = localRating > sharedRating;
  const isEqual = Math.abs(delta) < 0.1;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2",
        style.bgColor
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("shrink-0", style.textColor)}>
          {isEqual ? (
            <Minus className="h-3 w-3" />
          ) : isLocalHigher ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
        </div>
        <span className="text-sm">{skillName}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-700">{localRating.toFixed(1)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-blue-700">{sharedRating.toFixed(1)}</span>
      </div>
    </div>
  );
}
