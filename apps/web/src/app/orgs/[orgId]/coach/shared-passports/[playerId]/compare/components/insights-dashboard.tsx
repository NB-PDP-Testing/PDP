"use client";

import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AIInsightsPanel } from "./ai-insights-panel";
import { RecommendationCard } from "./recommendation-card";
import { SkillComparisonRow } from "./skill-comparison-row";

// Type for comparison data from the backend query
type ComparisonData = {
  player: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
  };
  local: {
    organizationName: string;
    sport?: string;
    skills: Array<{
      skillCode: string;
      skillName: string;
      rating: number;
      assessmentDate?: string;
      category?: string;
    }>;
    goals: Array<{
      goalId: string;
      title: string;
      description?: string;
      status: string;
      category: string;
      progress: number;
    }>;
    lastUpdated: number;
  };
  shared: {
    sourceOrgs: Array<{
      id: string;
      name: string;
      sport?: string;
    }>;
    sport?: string;
    skills?: Array<{
      skillCode: string;
      skillName: string;
      rating: number;
      assessmentDate?: string;
      category?: string;
    }>;
    goals?: Array<{
      goalId: string;
      title: string;
      description?: string;
      status: string;
      category: string;
      progress: number;
    }>;
    sharedElements: {
      basicProfile: boolean;
      skillRatings: boolean;
      skillHistory: boolean;
      developmentGoals: boolean;
      coachNotes: boolean;
      benchmarkData: boolean;
      attendanceRecords: boolean;
      injuryHistory: boolean;
      medicalSummary: boolean;
      contactInfo: boolean;
    };
    lastUpdated: number;
  };
  insights: {
    sportsMatch: boolean;
    agreementCount: number;
    divergenceCount: number;
    agreements: Array<{
      skillName: string;
      skillCode: string;
      localRating: number;
      sharedRating: number;
      delta: number;
    }>;
    divergences: Array<{
      skillName: string;
      skillCode: string;
      localRating: number;
      sharedRating: number;
      delta: number;
    }>;
    blindSpots: {
      localOnly: string[];
      sharedOnly: string[];
    };
    recommendations: Array<{
      type: "investigate" | "align" | "leverage" | "explore";
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      skillCode?: string;
    }>;
  };
};

type InsightsDashboardProps = {
  comparisonData: ComparisonData;
};

/**
 * Insights Dashboard
 *
 * The primary view for coach passport comparison. Displays:
 * - Summary statistics (agreement %, divergence count)
 * - Divergences section (expanded by default, highlighted)
 * - Agreements section (collapsed by default)
 * - Blind spots (skills only in one assessment)
 * - Actionable recommendations
 */
export function InsightsDashboard({ comparisonData }: InsightsDashboardProps) {
  const { insights, local, shared } = comparisonData;
  const [isDivergencesOpen, setIsDivergencesOpen] = useState(true);
  const [isAgreementsOpen, setIsAgreementsOpen] = useState(false);
  const [isBlindSpotsOpen, setIsBlindSpotsOpen] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  // Calculate agreement percentage
  const totalCompared = insights.agreementCount + insights.divergenceCount;
  const agreementPercentage =
    totalCompared > 0
      ? Math.round((insights.agreementCount / totalCompared) * 100)
      : 0;

  // Determine if skills data is available
  const hasSkillsData =
    shared.sharedElements.skillRatings && (shared.skills?.length || 0) > 0;

  // Format last updated dates
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString();

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Summary
            {insights.sportsMatch ? (
              <Badge className="bg-green-600" variant="secondary">
                Same Sport
              </Badge>
            ) : (
              <Badge className="bg-amber-600" variant="secondary">
                Cross-Sport
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Agreement Rate */}
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="font-bold text-3xl text-green-700">
                {agreementPercentage}%
              </div>
              <div className="text-green-600 text-sm">Agreement Rate</div>
              <div className="mt-1 text-green-500 text-xs">
                {insights.agreementCount} of {totalCompared} skills
              </div>
            </div>

            {/* Divergences */}
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 font-bold text-3xl text-red-700">
                {insights.divergenceCount}
                {insights.divergenceCount > 0 && (
                  <TrendingDown className="h-6 w-6" />
                )}
              </div>
              <div className="text-red-600 text-sm">Divergences</div>
              <div className="mt-1 text-red-500 text-xs">Needs attention</div>
            </div>

            {/* Your Skills */}
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <div className="font-bold text-3xl text-blue-700">
                {local.skills.length}
              </div>
              <div className="text-blue-600 text-sm">Your Assessments</div>
              <div className="mt-1 text-blue-500 text-xs">
                Updated {formatDate(local.lastUpdated)}
              </div>
            </div>

            {/* Shared Skills */}
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 font-bold text-3xl text-purple-700">
                {shared.skills?.length || 0}
                {(shared.skills?.length || 0) > local.skills.length && (
                  <TrendingUp className="h-6 w-6" />
                )}
              </div>
              <div className="text-purple-600 text-sm">Shared Assessments</div>
              <div className="mt-1 text-purple-500 text-xs">
                From {shared.sourceOrgs.map((o) => o.name).join(", ")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Insights */}
      {hasSkillsData && <AIInsightsPanel comparisonData={comparisonData} />}

      {/* Divergences Section (Expanded by default) */}
      {hasSkillsData && insights.divergences.length > 0 && (
        <Collapsible
          onOpenChange={setIsDivergencesOpen}
          open={isDivergencesOpen}
        >
          <Card className="border-red-200">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer transition-colors hover:bg-red-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <TrendingDown className="h-5 w-5" />
                    Divergences
                    <Badge className="bg-red-600" variant="secondary">
                      {insights.divergences.length}
                    </Badge>
                  </CardTitle>
                  {isDivergencesOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                <p className="mb-4 text-muted-foreground text-sm">
                  These skills show significant differences between your
                  assessment and the shared data. Consider investigating these
                  areas.
                </p>
                {insights.divergences.map((divergence) => (
                  <SkillComparisonRow
                    delta={divergence.delta}
                    isExpanded={expandedSkill === divergence.skillCode}
                    key={divergence.skillCode}
                    localRating={divergence.localRating}
                    onToggleExpand={() =>
                      setExpandedSkill(
                        expandedSkill === divergence.skillCode
                          ? null
                          : divergence.skillCode
                      )
                    }
                    sharedRating={divergence.sharedRating}
                    skillCode={divergence.skillCode}
                    skillName={divergence.skillName}
                  />
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Agreements Section (Collapsed by default) */}
      {hasSkillsData && insights.agreements.length > 0 && (
        <Collapsible onOpenChange={setIsAgreementsOpen} open={isAgreementsOpen}>
          <Card className="border-green-200">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer transition-colors hover:bg-green-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-5 w-5" />
                    Agreements
                    <Badge className="bg-green-600" variant="secondary">
                      {insights.agreements.length}
                    </Badge>
                  </CardTitle>
                  {isAgreementsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                <p className="mb-4 text-muted-foreground text-sm">
                  These skills show consistent ratings across assessments,
                  indicating reliable data points for development planning.
                </p>
                {insights.agreements.map((agreement) => (
                  <SkillComparisonRow
                    delta={agreement.delta}
                    isExpanded={expandedSkill === agreement.skillCode}
                    key={agreement.skillCode}
                    localRating={agreement.localRating}
                    onToggleExpand={() =>
                      setExpandedSkill(
                        expandedSkill === agreement.skillCode
                          ? null
                          : agreement.skillCode
                      )
                    }
                    sharedRating={agreement.sharedRating}
                    skillCode={agreement.skillCode}
                    skillName={agreement.skillName}
                  />
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Blind Spots Section */}
      {(insights.blindSpots.localOnly.length > 0 ||
        insights.blindSpots.sharedOnly.length > 0) && (
        <Collapsible onOpenChange={setIsBlindSpotsOpen} open={isBlindSpotsOpen}>
          <Card className="border-blue-200">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer transition-colors hover:bg-blue-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    Blind Spots
                    <Badge className="bg-blue-600" variant="secondary">
                      {insights.blindSpots.localOnly.length +
                        insights.blindSpots.sharedOnly.length}
                    </Badge>
                  </CardTitle>
                  {isBlindSpotsOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Skills you have that shared doesn't */}
                  {insights.blindSpots.localOnly.length > 0 && (
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h4 className="mb-2 font-medium text-blue-700">
                        Only in Your Assessment
                      </h4>
                      <p className="mb-3 text-blue-600 text-sm">
                        Skills you've assessed that aren't in the shared data.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {insights.blindSpots.localOnly.map((skill) => (
                          <Badge
                            className="bg-blue-100 text-blue-700"
                            key={skill}
                            variant="outline"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills shared has that you don't */}
                  {insights.blindSpots.sharedOnly.length > 0 && (
                    <div className="rounded-lg bg-purple-50 p-4">
                      <h4 className="mb-2 font-medium text-purple-700">
                        Only in Shared Data
                      </h4>
                      <p className="mb-3 text-purple-600 text-sm">
                        Skills assessed elsewhere that you haven't evaluated
                        yet.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {insights.blindSpots.sharedOnly.map((skill) => (
                          <Badge
                            className="bg-purple-100 text-purple-700"
                            key={skill}
                            variant="outline"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Recommendations Section */}
      {insights.recommendations.length > 0 && (
        <div>
          <h2 className="mb-4 font-semibold text-lg">Recommendations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {insights.recommendations.map((rec, index) => (
              <RecommendationCard
                description={rec.description}
                key={`${rec.type}-${index}`}
                priority={rec.priority}
                skillCode={rec.skillCode}
                title={rec.title}
                type={rec.type}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Skills Data Notice */}
      {!hasSkillsData && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Skill ratings have not been shared or no assessments are available
              for comparison.
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              The parent may need to update sharing permissions to include skill
              ratings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
