"use client";

import { Calendar, Clock } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WeeklyScheduleProps = {
  playerData: Array<{
    player: {
      firstName: string;
      lastName: string;
    };
    enrollment?: {
      sport?: string;
    };
  }>;
};

// Mock schedule data - will be replaced with real data when schedule tables are implemented
const generateMockSchedule = (
  playerData: WeeklyScheduleProps["playerData"]
) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  const events: Array<{
    day: string;
    date: string;
    events: Array<{
      childName: string;
      sport: string;
      type: "training" | "match";
      time: string;
    }>;
  }> = [];

  days.forEach((day, idx) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + idx);
    const dayEvents: Array<{
      childName: string;
      sport: string;
      type: "training" | "match";
      time: string;
    }> = [];

    // Add mock training sessions (Tue, Thu for each child)
    if (idx === 1 || idx === 3) {
      for (const child of playerData) {
        const sport = child.enrollment?.sport || "GAA";
        dayEvents.push({
          childName: child.player.firstName,
          sport: sport.toUpperCase(),
          type: "training",
          time: "18:00",
        });
      }
    }

    // Add mock match (Sat for first child)
    if (idx === 5 && playerData.length > 0) {
      const sport = playerData[0].enrollment?.sport || "GAA";
      dayEvents.push({
        childName: playerData[0].player.firstName,
        sport: sport.toUpperCase(),
        type: "match",
        time: "10:30",
      });
    }

    events.push({
      day,
      date: date.toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
      }),
      events: dayEvents,
    });
  });

  return events;
};

export function WeeklySchedule({ playerData }: WeeklyScheduleProps) {
  const schedule = useMemo(
    () => generateMockSchedule(playerData),
    [playerData]
  );

  const totalTraining = schedule.reduce(
    (acc, day) => acc + day.events.filter((e) => e.type === "training").length,
    0
  );
  const totalMatches = schedule.reduce(
    (acc, day) => acc + day.events.filter((e) => e.type === "match").length,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          Weekly Schedule
        </CardTitle>
        <CardDescription>
          Upcoming training sessions and matches
        </CardDescription>
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700">{totalTraining}</Badge>
            <span className="text-muted-foreground text-sm">Training</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700">
              {totalMatches}
            </Badge>
            <span className="text-muted-foreground text-sm">Matches</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop: Horizontal 7-day grid */}
        <div className="hidden md:grid md:grid-cols-7 md:gap-2">
          {schedule.map((day) => (
            <div className="min-h-[120px] rounded-lg border p-2" key={day.day}>
              <div className="mb-2 text-center">
                <div className="font-medium text-sm">{day.day}</div>
                <div className="text-muted-foreground text-xs">{day.date}</div>
              </div>
              <div className="space-y-1">
                {day.events.map((event, idx) => (
                  <div
                    className={`rounded p-1.5 text-xs ${
                      event.type === "training"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                    key={`${day.day}-${idx}`}
                  >
                    <div className="truncate font-medium">
                      {event.childName}
                    </div>
                    <div className="truncate font-medium">
                      {event.sport}{" "}
                      {event.type === "training" ? "Training" : "Match"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Vertical list */}
        <div className="space-y-2 md:hidden">
          {schedule.map((day) => (
            <div
              className={`rounded-lg border p-3 ${day.events.length > 0 ? "" : "opacity-50"}`}
              key={day.day}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">{day.day}</div>
                <div className="text-muted-foreground text-sm">{day.date}</div>
              </div>
              {day.events.length > 0 ? (
                <div className="space-y-2">
                  {day.events.map((event, idx) => (
                    <div
                      className={`flex items-center justify-between rounded-lg p-2 ${
                        event.type === "training"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                      key={`${day.day}-${idx}`}
                    >
                      <div>
                        <div className="font-medium">{event.childName}</div>
                        <div className="text-sm">
                          {event.sport}{" "}
                          {event.type === "training" ? "Training" : "Match"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4" />
                        {event.time}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  No events
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-muted-foreground text-xs">
          📅 Schedule integration coming soon - showing sample data
        </p>
      </CardContent>
    </Card>
  );
}
