"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { ContactOrganizationButton } from "./contact-organization-button";
import { RequestAccessModal } from "./request-access-modal";

type MyPlayersTabProps = {
  organizationId: string;
  userId: string | undefined;
};

type EnrollmentStatusBadgeProps = {
  enrollment: {
    hasActiveShare: boolean;
    hasExistingRequest: boolean;
    isDiscoverable: boolean;
    organizationId: string;
  };
  player: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  onRequestAccess: (playerId: string, playerName: string) => void;
};

function EnrollmentStatusBadge({
  enrollment,
  player,
  onRequestAccess,
}: EnrollmentStatusBadgeProps) {
  if (enrollment.hasActiveShare) {
    return (
      <Badge className="bg-green-600" variant="default">
        <CheckCircle className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }

  if (enrollment.hasExistingRequest) {
    return (
      <Badge className="bg-amber-600" variant="default">
        Pending
      </Badge>
    );
  }

  if (enrollment.isDiscoverable) {
    return (
      <Button
        onClick={() => {
          onRequestAccess(player._id, `${player.firstName} ${player.lastName}`);
        }}
        size="sm"
        variant="outline"
      >
        Request
      </Button>
    );
  }

  return (
    <Badge variant="secondary">
      <ExternalLink className="mr-1 h-3 w-3" />
      Not Available
    </Badge>
  );
}

export function MyPlayersTab({ organizationId, userId }: MyPlayersTabProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Get team players with cross-org passports
  const teamPlayers = useQuery(
    api.models.playerIdentities.getTeamPlayersWithCrossOrgPassports,
    userId ? { userId, organizationId } : "skip"
  );

  // Get organizations for name resolution
  const { data: organizations } = authClient.useListOrganizations();

  const orgNameMap = useMemo(() => {
    if (!organizations) {
      return new Map<string, string>();
    }
    return new Map(organizations.map((org) => [org.id, org.name]));
  }, [organizations]);

  const handleRequestAccess = (playerId: string, playerName: string) => {
    setSelectedPlayer({ id: playerId, name: playerName });
    setShowRequestModal(true);
  };

  if (teamPlayers === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-green-600 border-b-2" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-600" />
        <p className="text-amber-800">
          User session not found. Please refresh the page.
        </p>
      </div>
    );
  }

  if (teamPlayers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="font-medium text-gray-700">No Cross-Org Opportunities</p>
        <p className="mt-2 text-gray-600 text-sm">
          None of your team players currently have enrollments at other
          organizations.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-blue-800 text-sm">
            <strong>Tip:</strong> These are players on your teams who are also
            enrolled at other organizations. You can request access to their
            passports from those organizations to get a complete view of their
            development.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {teamPlayers.map((player) => {
            const hasAnyDiscoverable = player.otherOrgEnrollments.some(
              (e) => e.isDiscoverable
            );

            return (
              <Card key={player._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <Link
                        className="hover:underline"
                        href={`/orgs/${organizationId}/players/${player._id}`}
                      >
                        {player.firstName} {player.lastName}
                      </Link>
                      <p className="mt-1 font-normal text-muted-foreground text-sm">
                        {player.teamNames.join(", ")}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      Also enrolled at {player.otherOrgEnrollments.length} other{" "}
                      {player.otherOrgEnrollments.length === 1
                        ? "organization"
                        : "organizations"}
                      :
                    </p>

                    {player.otherOrgEnrollments.map((enrollment) => (
                      <div
                        className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                        key={enrollment.organizationId}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {orgNameMap.get(enrollment.organizationId) ||
                              enrollment.organizationId}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {enrollment.sportCode && (
                              <Badge className="text-xs" variant="outline">
                                {enrollment.sportCode}
                              </Badge>
                            )}
                            {enrollment.ageGroup && (
                              <Badge className="text-xs" variant="outline">
                                {enrollment.ageGroup}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="ml-3 flex gap-2">
                          <EnrollmentStatusBadge
                            enrollment={enrollment}
                            onRequestAccess={handleRequestAccess}
                            player={player}
                          />
                          <ContactOrganizationButton
                            organizationId={enrollment.organizationId}
                            playerIdentityId={
                              player._id as Id<"playerIdentities">
                            }
                            playerName={`${player.firstName} ${player.lastName}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {!hasAnyDiscoverable && (
                    <p className="text-muted-foreground text-xs">
                      Parent has not enabled passport sharing for this player
                      yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedPlayer && (
        <RequestAccessModal
          onOpenChange={setShowRequestModal}
          open={showRequestModal}
          organizationId={organizationId}
          playerIdentityId={selectedPlayer.id as Id<"playerIdentities">}
          playerName={selectedPlayer.name}
        />
      )}
    </>
  );
}
