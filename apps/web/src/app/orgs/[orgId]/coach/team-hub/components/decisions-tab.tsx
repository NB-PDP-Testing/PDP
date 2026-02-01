"use client";

import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { VotingList } from "./voting-list";

type DecisionsTabProps = {
  organizationId: BetterAuthId<"organization">;
  teamId: string;
  currentUserId: string;
  isHeadCoach: boolean;
};

export function DecisionsTab({
  organizationId,
  teamId,
  currentUserId,
  isHeadCoach,
}: DecisionsTabProps) {
  return (
    <VotingList
      currentUserId={currentUserId}
      isHeadCoach={isHeadCoach}
      organizationId={organizationId}
      teamId={teamId}
    />
  );
}
