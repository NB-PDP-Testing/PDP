"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, Check, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type Session = {
  _id: string;
  title?: string;
  teamName: string;
  coachName?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  usedInSession: boolean;
  duration?: number;
  focusArea?: string;
};

type SessionPlanListProps = {
  sessions: Session[];
  isLoading: boolean;
  organizationId: string;
};

export function SessionPlanList({
  sessions,
  isLoading,
  organizationId,
}: SessionPlanListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loaders
          <Card key={`skeleton-${i}`}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <FileText className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No Session Plans</EmptyTitle>
          <EmptyDescription>
            Create your first session plan to get started with training
            schedules.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  const now = Date.now();
  const upcoming = sessions.filter((s) => s.createdAt >= now);
  const past = sessions.filter((s) => s.createdAt < now);

  return (
    <div className="space-y-6">
      {/* Upcoming Sessions */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground text-sm">
            Upcoming Sessions ({upcoming.length})
          </h3>
          {upcoming.map((session) => (
            <SessionCard
              key={session._id}
              organizationId={organizationId}
              session={session}
            />
          ))}
        </div>
      )}

      {/* Past Sessions */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground text-sm">
            Past Sessions ({past.length})
          </h3>
          {past.map((session) => (
            <SessionCard
              key={session._id}
              organizationId={organizationId}
              session={session}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type SessionCardProps = {
  session: Session;
  organizationId: string;
};

function SessionCard({ session, organizationId }: SessionCardProps) {
  const isToday =
    new Date(session.createdAt).toDateString() === new Date().toDateString();

  return (
    <Link
      className="block"
      href={`/orgs/${organizationId}/coach/session-plans/${session._id}`}
    >
      <Card
        className={`transition-all hover:border-primary hover:shadow-md ${
          isToday ? "border-primary bg-primary/5" : ""
        }`}
      >
        <CardContent className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-medium leading-none">
                  {session.title || "Untitled Session"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(session.createdAt, { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {session.usedInSession && (
                  <Badge className="gap-1" variant="secondary">
                    <Check className="h-3 w-3" />
                    Completed
                  </Badge>
                )}
                {isToday && (
                  <Badge className="bg-primary" variant="default">
                    Today
                  </Badge>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
              {session.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{session.duration} min</span>
                </div>
              )}
              {session.focusArea && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{session.focusArea}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
