"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Inbox, Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SummaryApprovalCard } from "./summary-approval-card";

type ParentsTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function ParentsTab({ orgId, onSuccess, onError }: ParentsTabProps) {
  // Parent summary queries and mutations
  const pendingSummaries = useQuery(
    api.models.coachParentSummaries.getCoachPendingSummaries,
    { organizationId: orgId }
  );
  const approveSummary = useMutation(
    api.models.coachParentSummaries.approveSummary
  );
  const suppressSummary = useMutation(
    api.models.coachParentSummaries.suppressSummary
  );

  // State for summary approval
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [suppressingIds, setSuppressingIds] = useState<Set<string>>(new Set());

  const handleApproveSummary = async (summaryId: string) => {
    setApprovingIds((prev) => new Set(prev).add(summaryId));
    try {
      await approveSummary({
        summaryId: summaryId as Id<"coachParentSummaries">,
      });
      onSuccess("Summary approved and shared with parent");
    } catch (error) {
      console.error("Failed to approve summary:", error);
      onError("Failed to approve summary. Please try again.");
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(summaryId);
        return next;
      });
    }
  };

  const handleSuppressSummary = async (summaryId: string) => {
    setSuppressingIds((prev) => new Set(prev).add(summaryId));
    try {
      await suppressSummary({
        summaryId: summaryId as Id<"coachParentSummaries">,
      });
      onSuccess("Summary suppressed - will not be shared");
    } catch (error) {
      console.error("Failed to suppress summary:", error);
      onError("Failed to suppress summary. Please try again.");
    } finally {
      setSuppressingIds((prev) => {
        const next = new Set(prev);
        next.delete(summaryId);
        return next;
      });
    }
  };

  const isLoading = pendingSummaries === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (pendingSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Inbox className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No messages pending</EmptyTitle>
              <EmptyDescription>
                AI-generated parent summaries will appear here for your review
                before being shared.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Messages for Parents
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Review AI-generated summaries before sharing with parents.{" "}
          {pendingSummaries.length} pending.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {pendingSummaries.map((item) => (
          <SummaryApprovalCard
            isApproving={approvingIds.has(item._id)}
            isSuppressing={suppressingIds.has(item._id)}
            key={item._id}
            onApprove={() => handleApproveSummary(item._id)}
            onSuppress={() => handleSuppressSummary(item._id)}
            player={
              item.player
                ? {
                    firstName: item.player.firstName,
                    lastName: item.player.lastName,
                  }
                : { firstName: "Unknown", lastName: "Player" }
            }
            sport={item.sport ? { name: item.sport.name } : undefined}
            summary={{
              _id: item._id,
              publicSummary: item.publicSummary,
              privateInsight: item.privateInsight,
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
