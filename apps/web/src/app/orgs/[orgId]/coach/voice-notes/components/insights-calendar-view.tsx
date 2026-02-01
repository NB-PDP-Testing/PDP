"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CalendarDayPopover } from "./calendar-day-popover";

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

type InsightsCalendarViewProps = {
  insights: Insight[];
  onInsightUpdate?: () => void;
  orgId: string;
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  injury_risk: "bg-red-500",
  skill_development: "bg-blue-500",
  team_culture: "bg-purple-500",
  tactical_awareness: "bg-green-500",
  mental_wellbeing: "bg-amber-500",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function InsightsCalendarView({
  insights,
  orgId,
}: InsightsCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Navigate months
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Group insights by day
  const insightsByDay = new Map<string, Insight[]>();
  for (const insight of insights) {
    const insightDate = parseISO(insight.noteDate);
    const dayKey = format(insightDate, "yyyy-MM-dd");

    if (!insightsByDay.has(dayKey)) {
      insightsByDay.set(dayKey, []);
    }
    insightsByDay.get(dayKey)?.push(insight);
  }

  // Check if month has any insights
  const hasInsightsThisMonth = insights.length > 0;

  // Empty state - no insights this month
  if (!hasInsightsThisMonth) {
    return (
      <div className="w-full">
        {/* Month/Year Header with Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-bold text-2xl text-gray-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <Button onClick={handlePreviousMonth} size="sm" variant="outline">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={handleNextMonth} size="sm" variant="outline">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <Empty>
          <EmptyContent className="py-12">
            <EmptyMedia variant="icon">
              <Calendar className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>No insights recorded this month</EmptyTitle>
            <EmptyDescription>
              Insights from voice notes will appear on the calendar once they
              are created
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Month/Year Header with Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-bold text-2xl text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button onClick={handlePreviousMonth} size="sm" variant="outline">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={handleNextMonth} size="sm" variant="outline">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border bg-card">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-border border-b">
          {WEEKDAYS.map((day) => (
            <div
              className="border-border border-r p-2 text-center font-semibold text-muted-foreground text-sm last:border-r-0"
              key={day}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayInsights = insightsByDay.get(dayKey) || [];
            const isCurrentMonth =
              format(day, "yyyy-MM") === format(currentMonth, "yyyy-MM");
            const isTodayDate = isToday(day);

            return (
              <CalendarDayPopover
                date={day}
                insights={dayInsights}
                key={dayKey}
                orgId={orgId}
              >
                <div
                  className={`min-h-24 cursor-pointer border-border border-r border-b p-2 transition-colors last:border-r-0 hover:bg-muted/50 ${
                    isTodayDate ? "bg-blue-50" : ""
                  } ${isCurrentMonth ? "" : "bg-muted/20 text-muted-foreground"}`}
                >
                  {/* Date Number */}
                  <div
                    className={`mb-1 text-right text-sm ${
                      isTodayDate ? "font-bold text-blue-600" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Insight Dots */}
                  {dayInsights.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dayInsights.slice(0, 3).map((insight) => {
                        const dotColor =
                          CATEGORY_DOT_COLORS[insight.category || ""] ||
                          "bg-gray-400";
                        return (
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                            key={insight.id}
                            title={insight.title}
                          />
                        );
                      })}
                      {dayInsights.length > 3 && (
                        <span className="text-2xs text-muted-foreground">
                          +{dayInsights.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CalendarDayPopover>
            );
          })}
        </div>
      </div>
    </div>
  );
}
