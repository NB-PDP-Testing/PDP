"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ChevronDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type SkillChange = {
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  description: string;
  appliedAt: number;
  voiceNoteId: Id<"voiceNotes">;
  voiceNoteTitle: string;
  targetRecordId: string;
};

type Injury = {
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  category: string;
  description: string;
  recordedAt: number;
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
};

type AppliedInsightsSectionProps = {
  skillChanges: SkillChange[];
  injuries: Injury[];
  orgId: string;
};

export function AppliedInsightsSection({
  skillChanges,
  injuries,
  orgId,
}: AppliedInsightsSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "skills"
  );

  const totalCount = skillChanges.length + injuries.length;

  return (
    <div>
      <h3 className="mb-4 font-semibold text-lg">
        Applied to Player Profiles
        <Badge className="ml-2" variant="secondary">
          {totalCount} insights
        </Badge>
      </h3>

      <div className="space-y-3">
        {/* Skills Category */}
        <Collapsible
          onOpenChange={() =>
            setExpandedCategory(expandedCategory === "skills" ? null : "skills")
          }
          open={expandedCategory === "skills"}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Skills</p>
                <p className="text-muted-foreground text-sm">
                  {skillChanges.length} changes
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedCategory === "skills" && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 px-4">
            {skillChanges.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No skill changes yet
              </p>
            ) : (
              <>
                {skillChanges.slice(0, 5).map((skill) => (
                  <Card key={skill.targetRecordId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{skill.playerName}</p>
                          <p className="text-muted-foreground text-sm">
                            {skill.description}
                          </p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(skill.appliedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Link
                          href={`/orgs/${orgId}/players/${skill.playerIdentityId}/passport?tab=skills`}
                        >
                          <Button size="sm" variant="ghost">
                            View in Passport →
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {skillChanges.length > 5 && (
                  <Button className="w-full" size="sm" variant="outline">
                    View All {skillChanges.length} Skills
                  </Button>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Injuries Category */}
        <Collapsible
          onOpenChange={() =>
            setExpandedCategory(
              expandedCategory === "injuries" ? null : "injuries"
            )
          }
          open={expandedCategory === "injuries"}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Injuries</p>
                <p className="text-muted-foreground text-sm">
                  {injuries.length} recorded
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expandedCategory === "injuries" && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 px-4">
            {injuries.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No injuries recorded yet
              </p>
            ) : (
              <>
                {injuries.slice(0, 5).map((injury) => (
                  <Card key={injury.insightId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{injury.playerName}</p>
                          <p className="text-muted-foreground text-sm">
                            {injury.description}
                          </p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(injury.recordedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Link
                          href={`/orgs/${orgId}/players/${injury.playerIdentityId}/passport?tab=health`}
                        >
                          <Button size="sm" variant="ghost">
                            View in Passport →
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {injuries.length > 5 && (
                  <Button className="w-full" size="sm" variant="outline">
                    View All {injuries.length} Injuries
                  </Button>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
