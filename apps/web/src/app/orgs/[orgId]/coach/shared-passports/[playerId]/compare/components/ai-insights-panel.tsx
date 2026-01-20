"use client";

import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Type for comparison data passed to the component
type ComparisonData = {
  player: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
  };
  local: {
    organizationName: string;
    sport?: string;
    skills: Array<{
      skillCode: string;
      skillName: string;
      rating: number;
    }>;
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
    }>;
  };
  insights: {
    sportsMatch: boolean;
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
  };
};

// AI insights response type
type AIInsights = {
  summary: string;
  keyInsights: Array<{
    title: string;
    insight: string;
    actionable: string;
    priority: "high" | "medium" | "low";
  }>;
  developmentFocus: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  questions: string[];
  positives: string[];
};

type AIInsightsPanelProps = {
  comparisonData: ComparisonData;
};

/**
 * AI Insights Panel
 *
 * Generates and displays AI-powered insights from passport comparison data.
 * Uses Claude to analyze divergences, agreements, and blind spots to provide
 * actionable coaching recommendations.
 */
export function AIInsightsPanel({ comparisonData }: AIInsightsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const generateInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare data for the API
      const apiData = {
        comparisonData: {
          playerName: `${comparisonData.player.firstName} ${comparisonData.player.lastName}`,
          playerAge: comparisonData.player.dateOfBirth
            ? calculateAge(comparisonData.player.dateOfBirth)
            : undefined,
          localOrg: comparisonData.local.organizationName,
          sharedOrgs: comparisonData.shared.sourceOrgs.map((o) => o.name),
          localSport: comparisonData.local.sport,
          sharedSport: comparisonData.shared.sport,
          sportsMatch: comparisonData.insights.sportsMatch,
          divergences: comparisonData.insights.divergences,
          agreements: comparisonData.insights.agreements,
          blindSpots: comparisonData.insights.blindSpots,
          localSkillCount: comparisonData.local.skills.length,
          sharedSkillCount: comparisonData.shared.skills?.length || 0,
        },
      };

      const response = await fetch("/api/comparison-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate insights");
      }

      const data = await response.json();

      if (data.insights) {
        setInsights(data.insights);
      } else if (data.content?.[0]?.text) {
        // Try to parse from raw Claude response
        try {
          const parsed = JSON.parse(data.content[0].text);
          setInsights(parsed);
        } catch {
          throw new Error("Failed to parse AI response");
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [comparisonData]);

  // Don't show if no skills to compare
  const hasData =
    comparisonData.insights.divergences.length > 0 ||
    comparisonData.insights.agreements.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-purple-100/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Sparkles className="h-5 w-5" />
                AI-Powered Insights
                <Badge className="bg-purple-600" variant="secondary">
                  Beta
                </Badge>
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
            {/* Not generated yet */}
            {!(insights || isLoading || error) && (
              <div className="py-4 text-center">
                <Brain className="mx-auto mb-3 h-12 w-12 text-purple-400" />
                <p className="mb-4 text-muted-foreground">
                  Get AI-powered analysis of this comparison to understand
                  divergences, identify development opportunities, and receive
                  actionable coaching recommendations.
                </p>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={generateInsights}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Insights
                </Button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-muted-foreground text-sm">
                  Analyzing comparison data...
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-700">
                  Failed to Generate Insights
                </AlertTitle>
                <AlertDescription className="text-red-600">
                  {error}
                  <Button
                    className="ml-4"
                    onClick={generateInsights}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Insights display */}
            {insights && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-gray-700">{insights.summary}</p>
                </div>

                {/* Key Insights */}
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-purple-700">
                    <Lightbulb className="h-4 w-4" />
                    Key Insights
                  </h4>
                  <div className="space-y-3">
                    {insights.keyInsights.map((insight, index) => (
                      <div
                        className={cn(
                          "rounded-lg border bg-white p-4",
                          insight.priority === "high" && "border-red-200",
                          insight.priority === "medium" && "border-amber-200",
                          insight.priority === "low" && "border-green-200"
                        )}
                        key={index}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <h5 className="font-medium">{insight.title}</h5>
                          <Badge
                            className={cn(
                              insight.priority === "high" && "bg-red-600",
                              insight.priority === "medium" && "bg-amber-500",
                              insight.priority === "low" && "bg-green-600"
                            )}
                            variant="secondary"
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="mb-2 text-gray-600 text-sm">
                          {insight.insight}
                        </p>
                        <div className="rounded-md bg-purple-50 p-2">
                          <p className="font-medium text-purple-700 text-sm">
                            Action: {insight.actionable}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Development Focus */}
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-purple-700">
                    <Target className="h-4 w-4" />
                    Development Focus
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {insights.developmentFocus.immediate.length > 0 && (
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="mb-2 font-medium text-red-700 text-sm">
                          Immediate
                        </p>
                        <ul className="space-y-1">
                          {insights.developmentFocus.immediate.map(
                            (item, i) => (
                              <li className="text-red-600 text-sm" key={i}>
                                • {item}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {insights.developmentFocus.shortTerm.length > 0 && (
                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="mb-2 font-medium text-amber-700 text-sm">
                          Short Term
                        </p>
                        <ul className="space-y-1">
                          {insights.developmentFocus.shortTerm.map(
                            (item, i) => (
                              <li className="text-amber-600 text-sm" key={i}>
                                • {item}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {insights.developmentFocus.longTerm.length > 0 && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="mb-2 font-medium text-green-700 text-sm">
                          Long Term
                        </p>
                        <ul className="space-y-1">
                          {insights.developmentFocus.longTerm.map((item, i) => (
                            <li className="text-green-600 text-sm" key={i}>
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Questions to Investigate */}
                {insights.questions.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-purple-700">
                      <HelpCircle className="h-4 w-4" />
                      Questions to Investigate
                    </h4>
                    <div className="space-y-2">
                      {insights.questions.map((question, i) => (
                        <div
                          className="flex items-start gap-2 rounded-lg bg-blue-50 p-3"
                          key={i}
                        >
                          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <p className="text-blue-700 text-sm">{question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positives */}
                {insights.positives.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-purple-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Positives
                    </h4>
                    <div className="space-y-2">
                      {insights.positives.map((positive, i) => (
                        <div
                          className="flex items-start gap-2 rounded-lg bg-green-50 p-3"
                          key={i}
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          <p className="text-green-700 text-sm">{positive}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate button */}
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={generateInsights}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Regenerate Insights
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Calculate age from date of birth string
 */
function calculateAge(dob: string): string {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return `${age} years old`;
}
