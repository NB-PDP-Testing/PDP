"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChevronRight, MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CoachFeedbackSnapshotProps = {
  orgId: string;
};

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

export function CoachFeedbackSnapshot({ orgId }: CoachFeedbackSnapshotProps) {
  // Fetch AI-generated summaries grouped by child and sport
  const summariesData = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    {
      organizationId: orgId,
    }
  );

  // Flatten summaries and take most recent 3-4 items
  const recentFeedback = summariesData
    ?.flatMap((childData) =>
      childData.sportGroups.flatMap((sportGroup) =>
        sportGroup.summaries.map((summary) => ({
          ...summary,
          childName: `${childData.player.firstName} ${childData.player.lastName}`,
          sportName: sportGroup.sport?.name || "General",
        }))
      )
    )
    .sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0))
    .slice(0, 4);

  const hasFeedback = recentFeedback && recentFeedback.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Latest Coach Feedback
            </CardTitle>
            <CardDescription>Recent updates from your coaches</CardDescription>
          </div>
          {hasFeedback && (
            <Link
              className="flex items-center gap-1 font-medium text-blue-600 text-sm hover:text-blue-800"
              href={`/orgs/${orgId}/parents/coach-feedback` as Route}
            >
              See All
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasFeedback ? (
          <div className="space-y-3">
            {recentFeedback.map((feedback) => (
              <div
                className="border-blue-500 border-l-4 py-2 pl-4"
                key={feedback._id}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800">
                    {feedback.childName}{" "}
                    <span className="font-normal text-gray-500">
                      ({feedback.sportName})
                    </span>
                  </p>
                  <span className="text-gray-500 text-xs">
                    {formatRelativeTime(feedback._creationTime)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-gray-600 text-sm">
                  "{feedback.publicSummary.content}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-300 border-dashed bg-gray-50 p-6 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 font-medium text-gray-600">No feedback yet</p>
            <p className="mt-1 text-gray-500 text-sm">
              Coach messages and feedback about your children will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
