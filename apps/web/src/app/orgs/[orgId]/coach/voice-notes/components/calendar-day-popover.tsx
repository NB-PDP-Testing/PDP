"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

type CalendarDayPopoverProps = {
  date: Date;
  insights: Insight[];
  children: React.ReactNode;
  orgId: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  injury_risk: "bg-red-500 text-white",
  skill_development: "bg-blue-500 text-white",
  team_culture: "bg-purple-500 text-white",
  tactical_awareness: "bg-green-500 text-white",
  mental_wellbeing: "bg-amber-500 text-white",
};

export function CalendarDayPopover({
  date,
  insights,
  children,
  orgId,
}: CalendarDayPopoverProps) {
  const MAX_VISIBLE_INSIGHTS = 10;
  const visibleInsights = insights.slice(0, MAX_VISIBLE_INSIGHTS);
  const hasMoreInsights = insights.length > MAX_VISIBLE_INSIGHTS;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        {/* Date Header */}
        <div className="mb-3 border-border border-b pb-2">
          <h4 className="font-semibold text-gray-900 text-sm">
            {format(date, "EEEE, MMMM d, yyyy")}
          </h4>
          <p className="text-muted-foreground text-xs">
            {insights.length} insight{insights.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Insights List */}
        {insights.length === 0 ? (
          <Empty>
            <EmptyContent className="py-4">
              <EmptyMedia variant="icon">
                <Calendar className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle className="text-xs">
                No insights on this day
              </EmptyTitle>
              <EmptyDescription className="text-2xs">
                Insights from voice notes will appear here
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-2">
            {visibleInsights.map((insight) => (
              <div
                className="rounded-lg border bg-card p-2 hover:bg-muted/50"
                key={insight.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-xs">
                      {insight.title}
                    </p>
                    {insight.playerName && (
                      <p className="text-2xs text-muted-foreground">
                        {insight.playerName}
                      </p>
                    )}
                  </div>
                  {insight.category && (
                    <Badge
                      className={`text-2xs ${CATEGORY_COLORS[insight.category] || "bg-gray-500 text-white"}`}
                      variant="secondary"
                    >
                      {insight.category.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {/* Show More Link */}
            {hasMoreInsights && (
              <p className="text-center text-muted-foreground text-xs">
                +{insights.length - MAX_VISIBLE_INSIGHTS} more insights
              </p>
            )}

            {/* View in List Link */}
            <Link
              className="mt-3 flex items-center justify-center gap-1 text-primary text-xs hover:underline"
              href={`/orgs/${orgId}/coach/voice-notes?view=list`}
            >
              <ExternalLink className="h-3 w-3" />
              View all in List
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
