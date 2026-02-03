"use client";

import { format } from "date-fns";
import { Calendar, Flag, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KeyDate = {
  date: number;
  title: string;
  type: "game" | "tournament" | "review" | "milestone";
};

type SeasonTimelineProps = {
  seasonStart: number | null;
  seasonEnd: number | null;
  keyDates: KeyDate[];
};

export function SeasonTimeline({
  seasonStart,
  seasonEnd,
  keyDates,
}: SeasonTimelineProps) {
  // If no season data, don't show timeline
  if (!(seasonStart || seasonEnd) && keyDates.length === 0) {
    return null;
  }

  const now = Date.now();

  // Calculate progress percentage
  let progressPercent = 0;
  if (seasonStart && seasonEnd) {
    const totalDuration = seasonEnd - seasonStart;
    const elapsed = now - seasonStart;
    progressPercent = Math.max(
      0,
      Math.min(100, (elapsed / totalDuration) * 100)
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5" />
          Season Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline Bar */}
        {seasonStart && seasonEnd && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>{format(seasonStart, "MMM d, yyyy")}</span>
              <span className="font-medium">
                {Math.round(progressPercent)}% Complete
              </span>
              <span>{format(seasonEnd, "MMM d, yyyy")}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Key Dates */}
        {keyDates.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Key Dates</h4>
            <div className="space-y-2">
              {keyDates.map((keyDate, index) => {
                const isPast = keyDate.date < now;
                const isUpcoming =
                  !isPast && keyDate.date <= now + 30 * 24 * 60 * 60 * 1000; // Within 30 days

                return (
                  <div
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      isPast ? "opacity-50" : ""
                    } ${isUpcoming ? "border-primary bg-primary/5" : ""}`}
                    key={`${keyDate.type}-${index}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {getIconForType(keyDate.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{keyDate.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(keyDate.date, "MMMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant={getBadgeVariant(keyDate.type)}>
                      {keyDate.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getBadgeVariant(
  type: KeyDate["type"]
): "default" | "destructive" | "secondary" | "outline" {
  if (type === "game") {
    return "default";
  }
  if (type === "tournament") {
    return "destructive";
  }
  if (type === "review") {
    return "secondary";
  }
  return "outline";
}

function getIconForType(type: KeyDate["type"]) {
  switch (type) {
    case "game":
      return <Trophy className="h-4 w-4 text-primary" />;
    case "tournament":
      return <Trophy className="h-4 w-4 text-primary" />;
    case "review":
      return <Target className="h-4 w-4 text-primary" />;
    case "milestone":
      return <Flag className="h-4 w-4 text-primary" />;
    default:
      return <Calendar className="h-4 w-4 text-primary" />;
  }
}
