"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Flag, Star, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

type InsightReactionsProps = {
  insightId: Id<"voiceNoteInsights">;
  organizationId: string;
};

type ReactionType = "like" | "helpful" | "flag";

type ReactionConfig = {
  type: ReactionType;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
  hoverColor: string;
};

const reactionConfigs: ReactionConfig[] = [
  {
    type: "like",
    icon: <ThumbsUp className="h-4 w-4" />,
    label: "Like",
    activeColor: "bg-blue-500 text-white hover:bg-blue-600",
    hoverColor: "hover:bg-blue-50 hover:text-blue-600",
  },
  {
    type: "helpful",
    icon: <Star className="h-4 w-4" />,
    label: "Helpful",
    activeColor: "bg-yellow-500 text-white hover:bg-yellow-600",
    hoverColor: "hover:bg-yellow-50 hover:text-yellow-600",
  },
  {
    type: "flag",
    icon: <Flag className="h-4 w-4" />,
    label: "Flag",
    activeColor: "bg-red-500 text-white hover:bg-red-600",
    hoverColor: "hover:bg-red-50 hover:text-red-600",
  },
];

export function InsightReactions({
  insightId,
  organizationId,
}: InsightReactionsProps) {
  const user = useCurrentUser();
  const reactions = useQuery(api.models.teamCollaboration.getReactions, {
    insightId,
  });
  const toggleReaction = useMutation(
    api.models.teamCollaboration.toggleReaction
  );

  // Optimistic updates state
  const [optimisticReactions, setOptimisticReactions] = useState<{
    [key in ReactionType]?: number;
  }>({});

  if (!user) {
    return null;
  }

  const handleReactionClick = async (type: ReactionType) => {
    try {
      // Optimistic update: predict the new count
      const currentCount = reactions?.[type] ?? 0;
      const hasReacted = reactions?.userReactions.some(
        (r) => r.userId === user._id && r.type === type
      );

      // Update optimistic state
      setOptimisticReactions((prev) => ({
        ...prev,
        [type]: hasReacted ? currentCount - 1 : currentCount + 1,
      }));

      // Call mutation
      const result = await toggleReaction({
        insightId,
        type,
        userId: user._id,
        organizationId,
      });

      // Clear optimistic state after mutation completes
      setOptimisticReactions((prev) => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });

      // Show toast
      toast.success(
        result.action === "added" ? "Reaction added" : "Reaction removed"
      );
    } catch (_error) {
      // Clear optimistic state on error
      setOptimisticReactions((prev) => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });

      toast.error("Failed to update reaction");
    }
  };

  // Get users who reacted for tooltip
  const getUsersWhoReacted = (type: ReactionType): string[] => {
    if (!reactions?.userReactions) {
      return [];
    }
    return reactions.userReactions
      .filter((r) => r.type === type)
      .map((r) => r.userId);
  };

  return (
    <div className="flex items-center gap-2">
      {reactionConfigs.map((config) => {
        const count =
          optimisticReactions[config.type] ?? reactions?.[config.type] ?? 0;
        const hasReacted = reactions?.userReactions.some(
          (r) => r.userId === user._id && r.type === config.type
        );
        const usersWhoReacted = getUsersWhoReacted(config.type);

        return (
          <TooltipProvider key={config.type}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    hasReacted ? config.activeColor : config.hoverColor
                  )}
                  onClick={() => handleReactionClick(config.type)}
                  size="sm"
                  variant="outline"
                >
                  {config.icon}
                  <span className="font-medium text-sm">{count}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {usersWhoReacted.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-medium">{config.label}</p>
                    <div className="text-muted-foreground text-xs">
                      {usersWhoReacted.length}{" "}
                      {usersWhoReacted.length === 1 ? "person" : "people"}
                    </div>
                  </div>
                ) : (
                  <p>{config.label}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
