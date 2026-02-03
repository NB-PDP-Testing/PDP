"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Mic, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Insight = {
  _id: string;
  type: "voice-note" | "ai-generated" | "manual";
  title: string;
  summary: string;
  topic: "technical" | "tactical" | "fitness" | "behavioral" | "other";
  priority: "high" | "medium" | "low";
  createdBy: string;
  createdAt: number;
  playerNames: string[];
  creatorName: string;
  voiceNote?: {
    title: string;
  };
};

type InsightCardProps = {
  insight: Insight;
  onClick: () => void;
  isUnread: boolean;
};

export function InsightCard({ insight, onClick, isUnread }: InsightCardProps) {
  const initials = insight.creatorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const relativeTime = formatDistanceToNow(insight.createdAt, {
    addSuffix: true,
  });

  // Get type icon
  const typeConfig = {
    "voice-note": { icon: Mic, label: "Voice Note", color: "bg-blue-500" },
    "ai-generated": {
      icon: Sparkles,
      label: "AI Generated",
      color: "bg-purple-500",
    },
    manual: { icon: FileText, label: "Manual", color: "bg-gray-500" },
  };

  const config = typeConfig[insight.type];
  const TypeIcon = config.icon;

  // Get topic color
  const topicColors: Record<string, string> = {
    technical: "bg-blue-100 text-blue-700",
    tactical: "bg-green-100 text-green-700",
    fitness: "bg-orange-100 text-orange-700",
    behavioral: "bg-purple-100 text-purple-700",
    other: "bg-gray-100 text-gray-700",
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:border-primary hover:shadow-md",
        isUnread && "border-primary/50 bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Creator Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={cn("rounded-full p-1.5", config.color)}>
                  <TypeIcon className="h-3 w-3 text-white" />
                </div>
                <h3 className="font-semibold text-sm">{insight.title}</h3>
              </div>
              {insight.priority === "high" && (
                <Badge className="flex-shrink-0" variant="destructive">
                  Priority
                </Badge>
              )}
            </div>

            {/* Summary */}
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {insight.summary}
            </p>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <span>{insight.creatorName}</span>
              <span>•</span>
              <span>{relativeTime}</span>

              {/* Topic badge */}
              <Badge className={topicColors[insight.topic]} variant="secondary">
                {insight.topic.charAt(0).toUpperCase() + insight.topic.slice(1)}
              </Badge>

              {/* Voice note badge */}
              {insight.voiceNote && (
                <Badge className="bg-blue-50 text-blue-700" variant="secondary">
                  <Mic className="mr-1 h-3 w-3" />
                  Voice Note
                </Badge>
              )}

              {/* Player badges */}
              {insight.playerNames.length > 0 && (
                <Badge variant="outline">
                  {insight.playerNames.length}{" "}
                  {insight.playerNames.length === 1 ? "player" : "players"}
                </Badge>
              )}

              {/* Unread indicator */}
              {isUnread && (
                <Badge
                  className="bg-primary/10 text-primary"
                  variant="secondary"
                >
                  New
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
