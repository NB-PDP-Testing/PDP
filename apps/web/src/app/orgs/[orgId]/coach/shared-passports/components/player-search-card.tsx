"use client";

import { Calendar, MapPin, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { RequestAccessModal } from "./request-access-modal";

type PlayerSearchCardProps = {
  player: {
    _id: string;
    firstName: string;
    lastName: string;
    ageGroup?: string;
    organizationName?: string;
    enrollmentCount?: number;
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

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">
                {player.firstName} {player.lastName}
              </h3>
              <p className="text-muted-foreground text-sm">
                {player.ageGroup || "Age group not set"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {player.organizationName && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{player.organizationName}</span>
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

        <CardFooter>
          <Button
            className="w-full"
            disabled={player.hasExistingRequest}
            onClick={() => setShowModal(true)}
          >
            {player.hasExistingRequest ? "Request Pending" : "Request Access"}
          </Button>
        </CardFooter>
      </Card>

      <RequestAccessModal
        onOpenChange={setShowModal}
        open={showModal}
        organizationId={organizationId}
        playerIdentityId={player._id}
        playerName={`${player.firstName} ${player.lastName}`}
      />
    </>
  );
}
