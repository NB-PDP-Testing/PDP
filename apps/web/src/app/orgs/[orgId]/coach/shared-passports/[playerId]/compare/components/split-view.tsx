"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";

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

type SplitViewProps = {
  comparisonData: ComparisonData;
  playerName: string;
};

/**
 * Rating bar component for skill display
 */
function RatingBar({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${(rating / 5) * 100}%` }}
        />
      </div>
      <span className="font-medium text-sm">{rating.toFixed(1)}</span>
    </div>
  );
}

/**
 * Local Panel Content
 */
function LocalPanel({ data }: { data: ComparisonData["local"] }) {
  // Group skills by category
  const skillsByCategory = data.skills.reduce(
    (acc, skill) => {
      const category = skill.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, typeof data.skills>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{data.organizationName}</h3>
          <Badge className="bg-green-600" variant="secondary">
            Your Assessment
          </Badge>
        </div>
        {data.sport && (
          <p className="mt-1 text-muted-foreground text-sm">
            Sport: {data.sport}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
        </p>
      </div>

      {/* Skills */}
      {data.skills.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Skills ({data.skills.length})</h4>
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {skills.map((skill) => (
                  <div
                    className="flex items-center justify-between"
                    key={skill.skillCode}
                  >
                    <span className="text-sm">{skill.skillName}</span>
                    <RatingBar color="bg-green-500" rating={skill.rating} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-muted-foreground">
          No skill assessments recorded yet.
        </p>
      )}

      {/* Goals */}
      {data.goals.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Goals ({data.goals.length})</h4>
          <div className="space-y-2">
            {data.goals.map((goal) => (
              <Card key={goal.goalId}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{goal.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {goal.category} • {goal.status}
                      </p>
                    </div>
                    <Badge variant="outline">{goal.progress}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shared Panel Content
 */
function SharedPanel({ data }: { data: ComparisonData["shared"] }) {
  const sourceOrgNames = data.sourceOrgs.map((o) => o.name).join(", ");

  // Group skills by category
  const skillsByCategory = (data.skills || []).reduce(
    (acc, skill) => {
      const category = skill.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, NonNullable<typeof data.skills>>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{sourceOrgNames}</h3>
          <Badge className="bg-blue-600" variant="secondary">
            Shared Data
          </Badge>
        </div>
        {data.sport && (
          <p className="mt-1 text-muted-foreground text-sm">
            Sport: {data.sport}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
        </p>
      </div>

      {/* Skills */}
      {data.sharedElements.skillRatings &&
      data.skills &&
      data.skills.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Skills ({data.skills.length})</h4>
          {Object.entries(skillsByCategory).map(([category, skills]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {skills.map((skill) => (
                  <div
                    className="flex items-center justify-between"
                    key={skill.skillCode}
                  >
                    <span className="text-sm">{skill.skillName}</span>
                    <RatingBar color="bg-blue-500" rating={skill.rating} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-muted-foreground">
          {data.sharedElements.skillRatings
            ? "No skill assessments available in shared data."
            : "Skill ratings are not included in the shared data."}
        </p>
      )}

      {/* Goals */}
      {data.sharedElements.developmentGoals &&
        data.goals &&
        data.goals.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Goals ({data.goals.length})</h4>
            <div className="space-y-2">
              {data.goals.map((goal) => (
                <Card key={goal.goalId}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{goal.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {goal.category} • {goal.status}
                        </p>
                      </div>
                      <Badge variant="outline">{goal.progress}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      {/* Shared Elements Summary */}
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="mb-2 font-medium text-blue-700 text-sm">
          Shared Elements
        </p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(data.sharedElements)
            .filter(([_, value]) => value)
            .map(([key]) => (
              <Badge
                className="bg-blue-100 text-blue-700 text-xs"
                key={key}
                variant="outline"
              >
                {key.replace(/([A-Z])/g, " $1").trim()}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Split View
 *
 * Side-by-side comparison view:
 * - Desktop: Resizable panels with your assessment on the left, shared data on the right
 * - Mobile: Tab-based switching between views
 */
export function SplitView({
  comparisonData,
  playerName: _playerName,
}: SplitViewProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<"local" | "shared">("local");

  // Mobile: Tab-based view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <Tabs
          onValueChange={(v) => setActiveTab(v as "local" | "shared")}
          value={activeTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">Your Assessment</TabsTrigger>
            <TabsTrigger value="shared">Shared Data</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-4" value="local">
            <LocalPanel data={comparisonData.local} />
          </TabsContent>
          <TabsContent className="mt-4" value="shared">
            <SharedPanel data={comparisonData.shared} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Desktop: Resizable panels
  return (
    <div className="h-[calc(100vh-300px)] min-h-[500px]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full pr-4">
            <LocalPanel data={comparisonData.local} />
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <ScrollArea className="h-full pl-4">
            <SharedPanel data={comparisonData.shared} />
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
