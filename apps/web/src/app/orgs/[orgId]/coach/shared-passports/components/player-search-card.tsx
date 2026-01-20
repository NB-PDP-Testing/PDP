"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { Calendar, MapPin, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { ContactOrganizationButton } from "./contact-organization-button";
import { RequestAccessModal } from "./request-access-modal";

type PlayerSearchCardProps = {
  player: {
    _id: string;
    firstName: string;
    lastName: string;
    ageGroup?: string;
    enrollmentCount?: number;
    organizationIds: string[];
    hasActivePassport?: boolean;
    hasExistingRequest?: boolean;
  };
  organizationId: string;
};

export function PlayerSearchCard({
  player,
  organizationId,
}: PlayerSearchCardProps) {
  const [showModal, setShowModal] = useState(false);

  // Get organization names
  const { data: organizations } = authClient.useListOrganizations();

  const orgNames = useMemo(() => {
    if (!organizations) return "";
    const nameMap = new Map(organizations.map((org) => [org.id, org.name]));
    return player.organizationIds.map((id) => nameMap.get(id) || id).join(", ");
  }, [organizations, player.organizationIds]);

  const playerName = `${player.firstName} ${player.lastName}`;

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">{playerName}</h3>
              <p className="text-muted-foreground text-sm">
                {player.ageGroup || "Age group not set"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {orgNames && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate" title={orgNames}>
                {orgNames}
              </span>
            </div>
          )}

          {player.enrollmentCount && player.enrollmentCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {player.enrollmentCount} enrollment
                {player.enrollmentCount === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {player.hasActivePassport && (
            <Badge
              className="border-green-600 text-green-600"
              variant="outline"
            >
              Passport Available
            </Badge>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={player.hasExistingRequest}
            onClick={() => setShowModal(true)}
          >
            {player.hasExistingRequest ? "Request Pending" : "Request Access"}
          </Button>
          {player.organizationIds.length > 0 && (
            <div className="flex w-full flex-wrap gap-1">
              {player.organizationIds.map((orgId) => (
                <ContactOrganizationButton
                  key={orgId}
                  organizationId={orgId}
                  playerIdentityId={player._id as Id<"playerIdentities">}
                  playerName={playerName}
                  size="sm"
                  variant="ghost"
                />
              ))}
            </div>
          )}
        </CardFooter>
      </Card>

      <RequestAccessModal
        onOpenChange={setShowModal}
        open={showModal}
        organizationId={organizationId}
        playerIdentityId={player._id}
        playerName={playerName}
      />
    </>
  );
}
