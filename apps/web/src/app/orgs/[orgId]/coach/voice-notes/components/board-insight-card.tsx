"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Insight = {
  id: string;
  noteId: Id<"voiceNotes">;
  title: string;
  description?: string;
  category?: string;
  playerName?: string;
  playerIdentityId?: Id<"playerIdentities">;
  status: "pending" | "applied" | "dismissed" | "auto_applied";
  noteDate: string;
  teamName?: string;
  assigneeName?: string;
};

type BoardInsightCardProps = {
  insight: Insight;
  onUpdate?: () => void;
};

export function BoardInsightCard({ insight }: BoardInsightCardProps) {
  // Format timestamp
  const formattedDate = formatDistanceToNow(new Date(insight.noteDate), {
    addSuffix: true,
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: Insight["status"]) => {
    switch (status) {
      case "pending":
        return "default";
      case "applied":
        return "default";
      case "dismissed":
        return "secondary";
      default:
        return "default";
    }
  };

  // Get category badge color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "injury":
        return "bg-red-100 text-red-700";
      case "skill":
        return "bg-blue-100 text-blue-700";
      case "team_culture":
        return "bg-purple-100 text-purple-700";
      case "todo":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        {/* Title */}
        <h4 className="mb-2 line-clamp-2 font-medium text-gray-900 text-sm">
          {insight.title}
        </h4>

        {/* Badges */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {/* Status Badge */}
          <Badge
            className="text-xs"
            variant={getStatusBadgeVariant(insight.status)}
          >
            {insight.status}
          </Badge>

          {/* Category Badge */}
          {insight.category &&
            insight.category !== "team_culture" &&
            insight.category !== "todo" && (
              <Badge
                className={`text-xs ${getCategoryColor(insight.category)}`}
              >
                {insight.category}
              </Badge>
            )}

          {/* Player Badge */}
          {insight.playerName && (
            <Badge className="text-xs" variant="secondary">
              {insight.playerName}
            </Badge>
          )}

          {/* Team Badge */}
          {insight.category === "team_culture" && insight.teamName && (
            <Badge className="bg-purple-100 text-purple-700 text-xs">
              Team: {insight.teamName}
            </Badge>
          )}

          {/* TODO Badge */}
          {insight.category === "todo" && (
            <>
              <Badge className="bg-green-100 text-green-700 text-xs">
                TODO
              </Badge>
              {insight.assigneeName && (
                <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                  → {insight.assigneeName}
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Date */}
        <p className="text-gray-500 text-xs">{formattedDate}</p>
      </CardContent>
    </Card>
  );
}
