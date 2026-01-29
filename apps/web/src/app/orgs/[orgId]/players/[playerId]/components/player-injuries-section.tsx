"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SourceBadge } from "./source-badge";

type Props = {
  playerIdentityId: Id<"playerIdentities">;
  orgId: string;
};

/**
 * Player Injuries Section - Phase 8 Week 3 (US-P8-014)
 *
 * Displays player injuries with source badges for voice note-created injury records.
 * Shows active and recovering injuries with details and source badges.
 */
export function PlayerInjuriesSection({ playerIdentityId, orgId }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get active and recovering injuries (exclude healed)
  const injuries = useQuery(api.models.playerInjuries.getInjuriesForPlayer, {
    playerIdentityId,
    includeHealed: false,
  });

  if (injuries === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Injury Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!injuries || injuries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Injury Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No active injuries recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Injury Status
                <Badge variant="outline">{injuries.length}</Badge>
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {injuries.map((injury) => {
              const severityColor = {
                minor: "bg-yellow-100 text-yellow-800 border-yellow-300",
                moderate: "bg-orange-100 text-orange-800 border-orange-300",
                severe: "bg-red-100 text-red-800 border-red-300",
                long_term: "bg-purple-100 text-purple-800 border-purple-300",
              }[injury.severity];

              const statusColor = {
                active: "bg-red-100 text-red-800 border-red-300",
                recovering: "bg-blue-100 text-blue-800 border-blue-300",
                cleared: "bg-green-100 text-green-800 border-green-300",
                healed: "bg-gray-100 text-gray-800 border-gray-300",
              }[injury.status];

              return (
                <div
                  className="space-y-3 rounded-lg border p-4"
                  key={injury._id}
                >
                  {/* Header with injury type and source badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">
                        {injury.bodyPart} - {injury.injuryType}
                        {injury.side && (
                          <span className="ml-2 text-muted-foreground text-sm capitalize">
                            ({injury.side})
                          </span>
                        )}
                      </h4>
                    </div>

                    {/* Source Badge - US-P8-014 */}
                    <SourceBadge
                      date={injury.dateOccurred}
                      orgId={orgId}
                      source={injury.source}
                      voiceNoteId={injury.voiceNoteId}
                    />
                  </div>

                  {/* Severity and Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={cn("capitalize", severityColor)}
                      variant="outline"
                    >
                      {injury.severity.replace("_", " ")}
                    </Badge>
                    <Badge
                      className={cn("capitalize", statusColor)}
                      variant="outline"
                    >
                      {injury.status}
                    </Badge>
                    {injury.occurredDuring && (
                      <Badge className="capitalize" variant="outline">
                        {injury.occurredDuring.replace("_", " ")}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {injury.description && (
                    <p className="text-muted-foreground text-sm">
                      {injury.description}
                    </p>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Occurred:</span>
                      <p className="font-medium">
                        {format(new Date(injury.dateOccurred), "MMM d, yyyy")}
                      </p>
                    </div>
                    {injury.expectedReturn && (
                      <div>
                        <span className="text-muted-foreground">
                          Expected Return:
                        </span>
                        <p className="font-medium">
                          {format(
                            new Date(injury.expectedReturn),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Treatment */}
                  {injury.treatment && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Treatment:</span>
                      <p className="mt-1 font-medium">{injury.treatment}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
