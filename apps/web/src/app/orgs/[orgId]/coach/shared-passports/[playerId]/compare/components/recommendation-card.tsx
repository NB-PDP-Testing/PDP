"use client";

import {
  AlertCircle,
  Eye,
  Lightbulb,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RecommendationType = "investigate" | "align" | "leverage" | "explore";
type Priority = "high" | "medium" | "low";

type RecommendationCardProps = {
  type: RecommendationType;
  title: string;
  description: string;
  priority: Priority;
  skillCode?: string;
};

/**
 * Get styling and icon for recommendation type
 */
function getRecommendationStyle(type: RecommendationType): {
  icon: typeof AlertCircle;
  bgColor: string;
  borderColor: string;
  iconColor: string;
} {
  switch (type) {
    case "investigate":
      return {
        icon: AlertCircle,
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        iconColor: "text-red-600",
      };
    case "align":
      return {
        icon: RefreshCw,
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        iconColor: "text-amber-600",
      };
    case "leverage":
      return {
        icon: TrendingUp,
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        iconColor: "text-green-600",
      };
    case "explore":
      return {
        icon: Eye,
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        iconColor: "text-blue-600",
      };
    default:
      return {
        icon: Lightbulb,
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        iconColor: "text-gray-600",
      };
  }
}

/**
 * Get styling for priority badge
 */
function getPriorityStyle(priority: Priority): {
  variant: "default" | "secondary" | "outline";
  className: string;
} {
  switch (priority) {
    case "high":
      return {
        variant: "default",
        className: "bg-red-600",
      };
    case "medium":
      return {
        variant: "secondary",
        className: "bg-amber-500 text-white",
      };
    case "low":
      return {
        variant: "outline",
        className: "",
      };
    default:
      return {
        variant: "outline",
        className: "",
      };
  }
}

/**
 * Recommendation Card
 *
 * Displays an actionable recommendation based on comparison insights.
 * Different types have different visual treatments:
 * - investigate: Red - needs attention
 * - align: Amber - consider aligning
 * - leverage: Green - build on strengths
 * - explore: Blue - new information available
 */
export function RecommendationCard({
  type,
  title,
  description,
  priority,
  skillCode,
}: RecommendationCardProps) {
  const style = getRecommendationStyle(type);
  const priorityStyle = getPriorityStyle(priority);
  const Icon = style.icon;

  return (
    <Card
      className={cn(
        "border transition-colors",
        style.bgColor,
        style.borderColor
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5 shrink-0", style.iconColor)} />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge
            className={priorityStyle.className}
            variant={priorityStyle.variant}
          >
            {priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{description}</p>
        {skillCode && (
          <p className="mt-2 text-muted-foreground text-xs">
            Related skill: <code className="font-mono">{skillCode}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact recommendation for lists
 */
export function RecommendationCompact({
  type,
  title,
  description,
  priority,
}: Omit<RecommendationCardProps, "skillCode">) {
  const style = getRecommendationStyle(type);
  const priorityStyle = getPriorityStyle(priority);
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        style.bgColor,
        style.borderColor
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconColor)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{title}</span>
          <Badge
            className={cn("shrink-0 text-xs", priorityStyle.className)}
            variant={priorityStyle.variant}
          >
            {priority}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
          {description}
        </p>
      </div>
    </div>
  );
}
