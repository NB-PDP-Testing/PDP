"use client";

import { Activity, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PlayerData = {
  positions?: {
    favourite?: string;
    leastFavourite?: string;
    coachesPref?: string;
    dominantSide?: string;
    goalkeeper?: string;
  };
  fitness?: {
    speed?: string;
    agility?: string;
    strength?: string;
    endurance?: string;
    notes?: string;
  };
};

type Props = {
  player: PlayerData;
};

export function PositionsFitnessSection({ player }: Props) {
  const [isPositionsExpanded, setIsPositionsExpanded] = useState(true);
  const [isFitnessExpanded, setIsFitnessExpanded] = useState(true);

  const hasPositions =
    player.positions && Object.keys(player.positions).length > 0;
  const hasFitness = player.fitness && Object.keys(player.fitness).length > 0;

  if (!(hasPositions || hasFitness)) {
    return null;
  }

  return (
    <>
      {/* Positions Section */}
      {hasPositions && (
        <Collapsible
          onOpenChange={setIsPositionsExpanded}
          open={isPositionsExpanded}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Preferred Positions
                  </CardTitle>
                  {isPositionsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {player.positions?.favourite && (
                    <PositionField
                      isPrimary
                      label="Favourite Position"
                      value={player.positions?.favourite}
                    />
                  )}
                  {player.positions?.coachesPref && (
                    <PositionField
                      label="Coach's Preferred Position"
                      value={player.positions?.coachesPref}
                    />
                  )}
                  {player.positions?.leastFavourite && (
                    <PositionField
                      label="Least Favourite Position"
                      value={player.positions?.leastFavourite}
                    />
                  )}
                  {player.positions?.dominantSide && (
                    <PositionField
                      label="Dominant Side"
                      value={player.positions?.dominantSide}
                    />
                  )}
                  {player.positions?.goalkeeper && (
                    <PositionField
                      label="Goalkeeper"
                      value={player.positions?.goalkeeper}
                    />
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Fitness Section */}
      {hasFitness && (
        <Collapsible
          onOpenChange={setIsFitnessExpanded}
          open={isFitnessExpanded}
        >
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Physical Fitness Assessment
                  </CardTitle>
                  {isFitnessExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {player.fitness?.speed && (
                    <FitnessMetric
                      label="Speed"
                      value={player.fitness?.speed}
                    />
                  )}
                  {player.fitness?.agility && (
                    <FitnessMetric
                      label="Agility"
                      value={player.fitness?.agility}
                    />
                  )}
                  {player.fitness?.strength && (
                    <FitnessMetric
                      label="Strength"
                      value={player.fitness?.strength}
                    />
                  )}
                  {player.fitness?.endurance && (
                    <FitnessMetric
                      label="Endurance"
                      value={player.fitness?.endurance}
                    />
                  )}
                </div>

                {player.fitness?.notes && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                      Fitness Notes
                    </h4>
                    <p className="text-sm">{player.fitness?.notes}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </>
  );
}

function PositionField({
  label,
  value,
  isPrimary,
}: {
  label: string;
  value: string;
  isPrimary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-muted-foreground text-sm">{label}</span>
      <Badge className="text-sm" variant={isPrimary ? "default" : "secondary"}>
        {value}
      </Badge>
    </div>
  );
}

function FitnessMetric({ label, value }: { label: string; value: string }) {
  // Parse rating from value (e.g., "Good", "Excellent", etc.)
  const getRatingLevel = (val: string): number => {
    const lower = val.toLowerCase();
    if (lower.includes("excellent") || lower.includes("5")) {
      return 5;
    }
    if (lower.includes("very good") || lower.includes("4")) {
      return 4;
    }
    if (lower.includes("good") || lower.includes("3")) {
      return 3;
    }
    if (lower.includes("fair") || lower.includes("2")) {
      return 2;
    }
    if (lower.includes("poor") || lower.includes("1")) {
      return 1;
    }
    return 3; // default
  };

  const level = getRatingLevel(value);
  const percentage = (level / 5) * 100;

  const getColor = (): string => {
    if (level === 5) {
      return "bg-blue-500";
    }
    if (level === 4) {
      return "bg-green-500";
    }
    if (level === 3) {
      return "bg-yellow-500";
    }
    if (level === 2) {
      return "bg-orange-500";
    }
    return "bg-red-500";
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <span className="font-semibold text-muted-foreground text-sm">
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
