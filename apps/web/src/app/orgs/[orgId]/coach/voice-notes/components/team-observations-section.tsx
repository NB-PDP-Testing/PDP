"use client";

import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type Observation = {
  observationId: string;
  teamName?: string;
  teamId?: string;
  title: string;
  description: string;
  appliedAt: number;
  voiceNoteId: string;
};

type TeamObservationsSectionProps = {
  observations: Observation[];
};

export function TeamObservationsSection({
  observations,
}: TeamObservationsSectionProps) {
  if (observations.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <Users className="h-12 w-12" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No team observations yet</EmptyTitle>
          <EmptyDescription>
            Team-level insights from voice notes will appear here
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  const displayObservations = observations.slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Team Observations</h3>
        <Badge variant="secondary">{observations.length} observations</Badge>
      </div>

      <div className="space-y-3">
        {displayObservations.map((obs) => (
          <Card key={obs.observationId}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {obs.teamName || "General Observation"}
                    </p>
                    <Badge className="text-xs" variant="outline">
                      Team
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm">{obs.title}</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {obs.description}
                  </p>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(obs.appliedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {observations.length > 10 && (
        <Button className="mt-4 w-full" variant="outline">
          View All {observations.length} Observations
        </Button>
      )}
    </div>
  );
}
