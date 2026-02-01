"use client";

import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { ActivityFeedView } from "./activity-feed-view";

type ActivityTabProps = {
  organizationId: BetterAuthId<"organization">;
  teamId: string;
};

export function ActivityTab({ organizationId, teamId }: ActivityTabProps) {
  return <ActivityFeedView organizationId={organizationId} teamId={teamId} />;
}
