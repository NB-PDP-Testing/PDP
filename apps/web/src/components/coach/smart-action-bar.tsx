"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  CalendarPlus,
  CheckSquare,
  Lightbulb,
  Link,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SmartActionBarProps = {
  context:
    | "viewing_insight"
    | "creating_session"
    | "viewing_activity"
    | "viewing_player_passport";
  contextId: string;
  userId: string;
  organizationId: string;
  onActionClick?: (action: string) => void;
};

type SuggestionType =
  | "apply_insight"
  | "mention_coach"
  | "add_to_session"
  | "create_task"
  | "link_observation";

const suggestionIcons: Record<
  SuggestionType,
  { icon: React.ReactNode; color: string }
> = {
  apply_insight: {
    icon: <Lightbulb className="h-4 w-4" />,
    color: "text-yellow-600",
  },
  mention_coach: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: "text-blue-600",
  },
  add_to_session: {
    icon: <CalendarPlus className="h-4 w-4" />,
    color: "text-green-600",
  },
  create_task: {
    icon: <CheckSquare className="h-4 w-4" />,
    color: "text-purple-600",
  },
  link_observation: {
    icon: <Link className="h-4 w-4" />,
    color: "text-indigo-600",
  },
};

export function SmartActionBar({
  context,
  contextId,
  userId,
  organizationId,
  onActionClick,
}: SmartActionBarProps) {
  const suggestions = useQuery(api.models.aiCopilot.getSmartSuggestions, {
    context,
    contextId,
    userId,
    organizationId,
  });

  if (suggestions === undefined) {
    // Loading state
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {[1, 2, 3].map((i) => (
          <div
            className="h-10 w-full animate-pulse rounded-md bg-muted sm:w-32"
            key={i}
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      {suggestions.map((suggestion) => {
        const config = suggestionIcons[suggestion.type];
        const confidencePercent = Math.round(suggestion.confidence * 100);

        return (
          <TooltipProvider key={suggestion.action}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    "flex items-center gap-2",
                    "w-full sm:w-auto",
                    config.color
                  )}
                  onClick={() => {
                    if (onActionClick) {
                      onActionClick(suggestion.action);
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  {config.icon}
                  <span className="font-medium text-sm">
                    {suggestion.title}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
                    {confidencePercent}%
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{suggestion.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {suggestion.description}
                  </p>
                  {suggestion.reasoning && (
                    <p className="mt-1 text-muted-foreground text-xs italic">
                      Why: {suggestion.reasoning}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
