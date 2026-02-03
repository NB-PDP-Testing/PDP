"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type UpcomingEventsWidgetProps = {
  teamId: string;
};

type Event = {
  eventId: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  type: "training" | "game" | "meeting" | "other";
};

export function UpcomingEventsWidget({ teamId }: UpcomingEventsWidgetProps) {
  const events = useQuery(api.models.teams.getUpcomingEvents, {
    teamId,
    limit: 3,
  }) as Event[] | undefined;

  if (!events) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "training":
        return <Badge variant="default">Training</Badge>;
      case "game":
        return <Badge variant="destructive">Game</Badge>;
      case "meeting":
        return <Badge variant="secondary">Meeting</Badge>;
      default:
        return <Badge variant="outline">Event</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <Empty className="py-8">
            <EmptyMedia>
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyContent>
              <EmptyTitle>No Upcoming Events</EmptyTitle>
              <EmptyDescription>
                Schedule your first training session or game to see it here.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                className="rounded-lg border border-border bg-card p-3"
                key={event.eventId}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{event.title}</span>
                      {getEventTypeBadge(event.type)}
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(event.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      {event.time && <span>{event.time}</span>}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
