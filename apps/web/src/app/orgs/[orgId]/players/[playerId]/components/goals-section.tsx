"use client";

import { Calendar, ChevronDown, ChevronUp, Target, Users } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlayerData {
  actions?: string;
}

interface Props {
  player: PlayerData;
}

export function GoalsSection({ player }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse goals from actions field (MVP format: "🎯 GOAL...")
  const parseGoals = () => {
    if (!player.actions) return [];

    return player.actions
      .split("🎯")
      .filter((g) => g.trim())
      .map((goal, idx) => {
        const hasParentHelp = goal.includes("👨‍👩‍👧 HOW PARENTS CAN HELP");
        const goalContent = hasParentHelp
          ? goal.split("👨‍👩‍👧 HOW PARENTS CAN HELP")[0]
          : goal;
        const parentContent = hasParentHelp
          ? goal.split("👨‍👩‍👧 HOW PARENTS CAN HELP:")[1]
          : "";

        // Extract progress if available
        const progressMatch = goalContent.match(/Progress:\s*(\d+)%/);
        const progress = progressMatch ? Number.parseInt(progressMatch[1]) : 0;

        // Extract target date
        const targetDateMatch = goalContent.match(/Target Date:([^|]+)/);
        const targetDate = targetDateMatch ? targetDateMatch[1].trim() : null;

        // Extract goal title (first line)
        const title = goalContent.split("\n")[0].replace("GOAL", "Goal").trim();

        // Extract description (other lines)
        const description = goalContent
          .split("\n")
          .slice(1)
          .filter(
            (line) =>
              line.trim() &&
              !line.includes("Progress:") &&
              !line.includes("Target Date:")
          )
          .map((line) => line.replace("•", "").trim())
          .filter((line) => line);

        // Extract parent help items
        const parentHelp = parentContent
          ? parentContent
              .split("\n")
              .filter((line) => line.trim().startsWith("•"))
              .map((line) => line.replace("•", "").trim())
          : [];

        return {
          id: idx,
          title,
          description,
          progress,
          targetDate,
          parentHelp,
        };
      });
  };

  const goals = parseGoals();

  if (goals.length === 0) {
    return (
      <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Development Goals & Actions
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
            <CardContent>
              <p className="text-muted-foreground text-sm italic">
                No development goals set yet. Coach will add these during the
                next review.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Development Goals & Actions
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
            {goals.map((goal) => (
              <Card className="overflow-hidden border" key={goal.id}>
                {/* Goal Header */}
                <div className="border-l-4 border-l-blue-500 bg-blue-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900 text-sm">
                        <Target className="h-4 w-4" />
                        {goal.title}
                      </h4>
                      <div className="space-y-1 text-gray-700 text-xs">
                        {goal.description.map((line, i) => (
                          <div className="flex items-start gap-2" key={i}>
                            <span className="font-bold text-blue-600">→</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progress indicator */}
                    {goal.progress > 0 && (
                      <div className="min-w-[60px] text-center">
                        <div className="font-bold text-2xl text-blue-600">
                          {goal.progress}%
                        </div>
                        <div className="text-gray-600 text-xs">Complete</div>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {goal.progress > 0 && (
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            goal.progress >= 75
                              ? "bg-green-500"
                              : goal.progress >= 50
                                ? "bg-blue-500"
                                : goal.progress >= 25
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Target date */}
                  {goal.targetDate && (
                    <div className="mt-2 flex items-center gap-1 text-gray-600 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>Target: {goal.targetDate}</span>
                    </div>
                  )}
                </div>

                {/* Parent Help Section */}
                {goal.parentHelp.length > 0 && (
                  <div className="border-l-4 border-l-green-500 bg-green-50 p-4">
                    <h5 className="mb-2 flex items-center gap-2 font-semibold text-green-900 text-xs uppercase tracking-wide">
                      <Users className="h-4 w-4" />
                      How Parents Can Help
                    </h5>
                    <div className="space-y-1 text-gray-700 text-xs">
                      {goal.parentHelp.map((item, i) => (
                        <div className="flex items-start gap-2" key={i}>
                          <span className="font-bold text-green-600">✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
