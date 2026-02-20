"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { CheckSquare } from "lucide-react";
import { ListSkeleton } from "@/components/loading";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { VotingCard } from "./voting-card";

type VotingListProps = {
  teamId: string;
  organizationId: string;
  currentUserId: string;
  isHeadCoach: boolean;
};

export function VotingList({
  teamId,
  organizationId,
  currentUserId,
  isHeadCoach,
}: VotingListProps) {
  // Query all decisions for the team
  const decisions = useQuery(api.models.teamDecisions.getTeamDecisions, {
    teamId,
    status: undefined, // Get all statuses
  });

  // Loading state
  if (decisions === undefined) {
    return <ListSkeleton items={3} />;
  }

  // Empty state
  if (decisions.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <CheckSquare className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>No team decisions yet</EmptyTitle>
        <EmptyDescription>
          Team decisions will appear here once they are created.
        </EmptyDescription>
      </Empty>
    );
  }

  // Render decisions
  return (
    <div className="space-y-4">
      {decisions.map((decision) => (
        <VotingCard
          currentUserId={currentUserId}
          decisionId={decision._id}
          isHeadCoach={isHeadCoach}
          key={decision._id}
          organizationId={organizationId}
        />
      ))}
    </div>
  );
}
