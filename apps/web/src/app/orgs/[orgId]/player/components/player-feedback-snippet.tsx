"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowRight, MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const sensitivityBadge: Record<string, { label: string; className: string }> = {
  normal: { label: "General", className: "bg-gray-100 text-gray-700" },
  injury: { label: "Injury", className: "bg-amber-100 text-amber-800" },
  behavior: { label: "Behaviour", className: "bg-blue-100 text-blue-800" },
};

type PlayerFeedbackSnippetProps = {
  playerIdentityId: Id<"playerIdentities">;
  orgId: string;
};

export function PlayerFeedbackSnippet({
  playerIdentityId,
  orgId,
}: PlayerFeedbackSnippetProps) {
  const feedbackItems = useQuery(
    api.models.coachParentSummaries.getCoachFeedbackForPlayer,
    { playerIdentityId }
  );

  if (feedbackItems === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Latest Coach Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!feedbackItems || feedbackItems.length === 0) {
    return null;
  }

  const unacknowledgedCount = feedbackItems.filter(
    (f) => !f.acknowledgedAt
  ).length;
  const latest = feedbackItems.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Latest Coach Feedback
          </CardTitle>
          {unacknowledgedCount > 0 && (
            <Badge variant="default">{unacknowledgedCount} new</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {latest.map((item) => {
          const badge = sensitivityBadge[item.sensitivityCategory];
          const isNew = !item.acknowledgedAt;
          return (
            <div
              className={`rounded-lg border p-3 text-sm ${
                isNew
                  ? "border-l-4 border-l-[var(--org-primary,theme(colors.blue.500))] bg-muted/30"
                  : "bg-muted/10"
              }`}
              key={item._id}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {isNew && <Badge variant="secondary">New</Badge>}
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${badge?.className ?? ""}`}
                >
                  {badge?.label}
                </span>
                {item.coachName && (
                  <span className="text-muted-foreground text-xs">
                    From {item.coachName}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground text-xs">
                  {new Date(item.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {item.publicSummaryText}
              </p>
            </div>
          );
        })}

        <Button asChild className="w-full" size="sm" variant="ghost">
          <Link href={`/orgs/${orgId}/player/feedback` as Route}>
            See all feedback
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
