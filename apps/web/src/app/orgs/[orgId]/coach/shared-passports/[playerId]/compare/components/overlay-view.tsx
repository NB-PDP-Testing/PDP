"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ComparisonRadarChart,
  ComparisonRadarChartByCategory,
} from "./comparison-radar-chart";

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

type OverlayViewProps = {
  comparisonData: ComparisonData;
  localOrgName: string;
  sharedOrgNames: string;
};

/**
 * Get color class for delta value
 */
function getDeltaColor(delta: number): string {
  if (delta <= 0.5) {
    return "text-green-600 bg-green-100";
  }
  if (delta <= 1.0) {
    return "text-yellow-600 bg-yellow-100";
  }
  return "text-red-600 bg-red-100";
}

/**
 * Overlay View
 *
 * Visual comparison view with overlaid radar charts and skill comparison table.
 * Provides both individual skill and category-based radar views.
 */
export function OverlayView({
  comparisonData,
  localOrgName,
  sharedOrgNames,
}: OverlayViewProps) {
  const [showByCategory, setShowByCategory] = useState(false);
  const [chartTab, setChartTab] = useState<"radar" | "table">("radar");

  const { local, shared, insights } = comparisonData;
  const hasSkillsData =
    shared.sharedElements.skillRatings && (shared.skills?.length || 0) > 0;

  // Build combined skill list for the table
  const allSkills = [...insights.agreements, ...insights.divergences].sort(
    (a, b) => b.delta - a.delta
  );

  return (
    <div className="space-y-6">
      {/* Chart Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Skills Comparison</CardTitle>
            <div className="flex items-center gap-4">
              {/* View mode switch */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={showByCategory}
                  id="category-mode"
                  onCheckedChange={setShowByCategory}
                />
                <Label className="text-sm" htmlFor="category-mode">
                  Group by Category
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="mb-4 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>{localOrgName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-dashed" />
              <span>{sharedOrgNames}</span>
            </div>
          </div>

          {hasSkillsData ? (
            <>
              {/* Tabs for chart/table view on mobile */}
              <div className="sm:hidden">
                <Tabs
                  onValueChange={(v) => setChartTab(v as "radar" | "table")}
                  value={chartTab}
                >
                  <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="radar">Chart</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                  </TabsList>
                  <TabsContent value="radar">
                    {showByCategory ? (
                      <ComparisonRadarChartByCategory
                        height={300}
                        localLabel={localOrgName}
                        localSkills={local.skills}
                        sharedLabel={sharedOrgNames}
                        sharedSkills={shared.skills || []}
                      />
                    ) : (
                      <ComparisonRadarChart
                        height={300}
                        localLabel={localOrgName}
                        localSkills={local.skills}
                        sharedLabel={sharedOrgNames}
                        sharedSkills={shared.skills || []}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="table">
                    <SkillsComparisonTable
                      localOrgName={localOrgName}
                      sharedOrgName={sharedOrgNames}
                      skills={allSkills}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Desktop: Show both chart and table */}
              <div className="hidden sm:block">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Radar Chart */}
                  <div>
                    {showByCategory ? (
                      <ComparisonRadarChartByCategory
                        height={400}
                        localLabel={localOrgName}
                        localSkills={local.skills}
                        sharedLabel={sharedOrgNames}
                        sharedSkills={shared.skills || []}
                      />
                    ) : (
                      <ComparisonRadarChart
                        height={400}
                        localLabel={localOrgName}
                        localSkills={local.skills}
                        sharedLabel={sharedOrgNames}
                        sharedSkills={shared.skills || []}
                      />
                    )}
                  </div>

                  {/* Skills Table */}
                  <div className="max-h-[450px] overflow-auto">
                    <SkillsComparisonTable
                      localOrgName={localOrgName}
                      sharedOrgName={sharedOrgNames}
                      skills={allSkills}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                Skill ratings are not available for comparison.
              </p>
              <p className="mt-2 text-muted-foreground text-sm">
                The parent may need to update sharing permissions to include
                skill ratings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {hasSkillsData && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 text-center">
              <div className="font-bold text-2xl text-green-700">
                {insights.agreementCount}
              </div>
              <div className="text-green-600 text-sm">Skills in Agreement</div>
              <div className="mt-1 text-green-500 text-xs">
                Difference &le; 1.0 point
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-center">
              <div className="font-bold text-2xl text-red-700">
                {insights.divergenceCount}
              </div>
              <div className="text-red-600 text-sm">Skills Diverging</div>
              <div className="mt-1 text-red-500 text-xs">
                Difference &gt; 1.0 point
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4 text-center">
              <div className="font-bold text-2xl text-blue-700">
                {insights.blindSpots.localOnly.length +
                  insights.blindSpots.sharedOnly.length}
              </div>
              <div className="text-blue-600 text-sm">Blind Spots</div>
              <div className="mt-1 text-blue-500 text-xs">
                Skills unique to one assessment
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Skills Comparison Table
 */
function SkillsComparisonTable({
  skills,
  localOrgName: _localOrgName,
  sharedOrgName: _sharedOrgName,
}: {
  skills: Array<{
    skillName: string;
    skillCode: string;
    localRating: number;
    sharedRating: number;
    delta: number;
  }>;
  localOrgName: string;
  sharedOrgName: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Skill</TableHead>
          <TableHead className="text-center text-green-700">You</TableHead>
          <TableHead className="text-center text-blue-700">Shared</TableHead>
          <TableHead className="text-center">Delta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {skills.map((skill) => (
          <TableRow key={skill.skillCode}>
            <TableCell className="font-medium">{skill.skillName}</TableCell>
            <TableCell className="text-center">
              <span className="font-mono">{skill.localRating.toFixed(1)}</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-mono">{skill.sharedRating.toFixed(1)}</span>
            </TableCell>
            <TableCell className="text-center">
              <Badge
                className={cn("font-mono", getDeltaColor(skill.delta))}
                variant="outline"
              >
                {skill.delta.toFixed(1)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
        {skills.length === 0 && (
          <TableRow>
            <TableCell
              className="py-4 text-center text-muted-foreground"
              colSpan={4}
            >
              No comparable skills found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
