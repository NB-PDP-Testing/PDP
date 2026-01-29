"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Award, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  getColorForRating,
  getRatingLabel,
  RatingBar,
} from "@/components/rating-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SourceBadge } from "./source-badge";

// Regex patterns for camelCase formatting
const CAMEL_CASE_REGEX = /([A-Z])/g;
const FIRST_CHAR_REGEX = /^./;

type Props = {
  passportId: Id<"sportPassports">;
  orgId: string;
};

/**
 * Skill Assessments Section - Phase 8 Week 3 (US-P8-013)
 *
 * Displays individual skill assessments with source badges for voice note-created assessments.
 * Shows latest assessment for each skill with rating, assessor info, and source badge.
 */
export function SkillAssessmentsSection({ passportId, orgId }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get latest assessment for each skill
  const assessments = useQuery(
    api.models.skillAssessments.getLatestAssessmentsForPassport,
    { passportId }
  );

  if (assessments === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Skill Assessments
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

  if (!assessments || assessments.length === 0) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Skill Assessments
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
            <p className="text-muted-foreground text-sm">
              Latest assessments for each skill. Assessments from voice notes
              are marked with a badge.
            </p>
            <div className="space-y-4">
              {assessments.map((assessment) => {
                const color = getColorForRating(assessment.rating);
                const ratingLabel = getRatingLabel(assessment.rating);

                // Format skill code to display name
                const skillName = assessment.skillCode
                  .replace(CAMEL_CASE_REGEX, " $1")
                  .replace(FIRST_CHAR_REGEX, (str) => str.toUpperCase())
                  .trim();

                return (
                  <div
                    className="space-y-2 rounded-lg border p-3"
                    key={assessment._id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{skillName}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="font-semibold text-sm"
                            style={{ color }}
                          >
                            {assessment.rating} - {ratingLabel}
                          </span>
                          {assessment.assessedByName && (
                            <span className="text-muted-foreground text-xs">
                              by {assessment.assessedByName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Source Badge - US-P8-013 */}
                      <SourceBadge
                        date={assessment.assessmentDate}
                        orgId={orgId}
                        source={assessment.source}
                        voiceNoteId={assessment.voiceNoteId}
                      />
                    </div>

                    <RatingBar height="sm" value={assessment.rating} />

                    {assessment.notes && (
                      <p className="text-muted-foreground text-xs">
                        {assessment.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
