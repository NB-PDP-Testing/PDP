"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Shield, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlayerEligibilityBadgeProps {
  playerIdentityId: Id<"playerIdentities">;
  teamId: string;
  organizationId: string;
  compact?: boolean;
}

export function PlayerEligibilityBadge({
  playerIdentityId,
  teamId,
  organizationId,
  compact = false,
}: PlayerEligibilityBadgeProps) {
  const eligibleTeams = useQuery(
    api.models.teamPlayerIdentities.getEligibleTeamsForPlayer,
    { playerIdentityId, organizationId }
  );

  if (!eligibleTeams) {
    return null;
  }

  const teamEligibility = eligibleTeams.find((t) => t.teamId === teamId);

  if (!teamEligibility) {
    return null;
  }

  const { eligibilityStatus, reason, isCoreTeam } = teamEligibility;

  // Core team badge (always show)
  if (isCoreTeam) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="gap-1" variant="default">
              <Shield className="h-3 w-3" />
              {!compact && "Core Team"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This is the player's core team (matches enrollment age group)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Eligibility status badges
  if (eligibilityStatus === "eligible") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className="gap-1 border-green-500 text-green-700"
              variant="outline"
            >
              <CheckCircle className="h-3 w-3" />
              {!compact && "Eligible"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{reason || "Meets age requirements"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (eligibilityStatus === "hasOverride") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className="gap-1 border-blue-500 text-blue-700"
              variant="secondary"
            >
              <Shield className="h-3 w-3" />
              {!compact && "Override"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{reason || "Admin override active"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (eligibilityStatus === "requiresOverride") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className="gap-1 border-yellow-500 text-yellow-700"
              variant="outline"
            >
              <AlertTriangle className="h-3 w-3" />
              {!compact && "Needs Approval"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{reason || "Requires admin approval to join this team"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (eligibilityStatus === "ineligible") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="gap-1" variant="destructive">
              <XCircle className="h-3 w-3" />
              {!compact && "Ineligible"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{reason || "Not eligible for this team"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}

export function usePlayerEligibility(
  playerIdentityId: Id<"playerIdentities"> | undefined,
  organizationId: string
) {
  return useQuery(
    api.models.teamPlayerIdentities.getEligibleTeamsForPlayer,
    playerIdentityId ? { playerIdentityId, organizationId } : "skip"
  );
}
