"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { CheckCircle, Inbox, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BoardInsightCard } from "./board-insight-card";

type InsightStatus = "pending" | "applied" | "dismissed" | "auto_applied";

type Insight = {
  id: string;
  noteId: Id<"voiceNotes">;
  title: string;
  description?: string;
  category?: string;
  playerName?: string;
  playerIdentityId?: Id<"playerIdentities">;
  status: InsightStatus;
  noteDate: string;
  teamName?: string;
  assigneeName?: string;
};

type InsightsBoardViewProps = {
  insights: Insight[];
  onInsightUpdate?: () => void;
};

export function InsightsBoardView({
  insights,
  onInsightUpdate,
}: InsightsBoardViewProps) {
  // Group insights by status (treat auto_applied same as applied)
  const pendingInsights = insights.filter((i) => i.status === "pending");
  const appliedInsights = insights.filter(
    (i) => i.status === "applied" || i.status === "auto_applied"
  );
  const dismissedInsights = insights.filter((i) => i.status === "dismissed");

  // Column configuration
  const columns = [
    {
      title: "Pending",
      status: "pending" as const,
      icon: Inbox,
      insights: pendingInsights,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      title: "Applied",
      status: "applied" as const,
      icon: CheckCircle,
      insights: appliedInsights,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Dismissed",
      status: "dismissed" as const,
      icon: XCircle,
      insights: dismissedInsights,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  ];

  return (
    <div className="grid h-full gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {columns.map((column) => {
        const Icon = column.icon;
        return (
          <div className="flex h-full flex-col" key={column.status}>
            {/* Column Header */}
            <div className="mb-4 flex items-center gap-2">
              <Icon className={`h-5 w-5 ${column.color}`} />
              <h3 className="font-semibold text-gray-900 text-lg">
                {column.title}
              </h3>
              <Badge className="ml-auto" variant="secondary">
                {column.insights.length}
              </Badge>
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
              {column.insights.length === 0 ? (
                <Empty>
                  <EmptyContent className="py-8">
                    <EmptyMedia variant="icon">
                      <Icon className="h-8 w-8" />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">
                      No {column.title.toLowerCase()} insights
                    </EmptyTitle>
                    <EmptyDescription className="text-xs">
                      {column.status === "pending"
                        ? "New insights from voice notes will appear here"
                        : column.status === "applied"
                          ? "Applied insights will appear here"
                          : "Dismissed insights will appear here"}
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                column.insights.map((insight) => (
                  <BoardInsightCard
                    insight={insight}
                    key={insight.id}
                    onUpdate={onInsightUpdate}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
