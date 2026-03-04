"use client";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Player = {
  name: string;
  insights: number;
  quality: number;
  lastNote: number;
  quarter: string;
  status: "active" | "quiet" | "none";
};

export function BirthQuarterOverlay({
  players,
  color,
}: {
  players: Player[];
  color: string;
}) {
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const totalInsights = players.reduce((sum, p) => sum + p.insights, 0);

  const quarterData = quarters.map((q) => {
    const qPlayers = players.filter((p) => p.quarter === q);
    const qInsights = qPlayers.reduce((sum, p) => sum + p.insights, 0);
    const percentage =
      totalInsights > 0 ? Math.round((qInsights / totalInsights) * 100) : 0;
    return {
      quarter: q,
      label: getQuarterLabel(q),
      playerCount: qPlayers.length,
      insightCount: qInsights,
      percentage,
      avgQuality:
        qPlayers.length > 0
          ? Math.round(
              qPlayers.reduce((sum, p) => sum + p.quality, 0) / qPlayers.length
            )
          : 0,
    };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Distribution Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Coaching Coverage by Birth Quarter</CardTitle>
              <CardDescription>
                Attention distribution vs expected 25% each
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-xs">
                  The Relative Age Effect (RAE) shows coaches naturally give
                  more attention to earlier-born players, who are often
                  physically bigger at youth level. Research: Q1 players are 5x
                  more likely to be selected than Q4 in youth sports.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {quarterData.map((q) => (
            <div className="space-y-1" key={q.quarter}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {q.quarter} ({q.label})
                </span>
                <span className="text-gray-500">
                  {q.percentage}% of insights ({q.insightCount})
                </span>
              </div>
              <div className="relative h-8 overflow-hidden rounded-lg bg-gray-100">
                <div
                  className="flex h-full items-center rounded-lg px-2 transition-all"
                  style={{
                    width: `${Math.max(q.percentage * 1.5, 5)}%`,
                    backgroundColor:
                      Math.abs(q.percentage - 25) <= 5
                        ? `${color}cc`
                        : q.percentage > 30
                          ? "#f59e0bcc"
                          : "#ef4444cc",
                  }}
                >
                  <span className="font-medium text-white text-xs">
                    {q.playerCount} players
                  </span>
                </div>
                {/* Expected line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                  style={{ left: `${25 * 1.5}%` }}
                />
              </div>
            </div>
          ))}

          {/* Expected marker legend */}
          <div className="flex items-center gap-2 border-t pt-3 text-gray-500 text-xs">
            <div className="h-4 w-0.5 bg-gray-400" />
            <span>Expected distribution: ~25% each quarter</span>
          </div>

          {/* Interpretation */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-blue-800 text-sm">
              Your Q1 (Jan-Mar) born players receive{" "}
              <span className="font-semibold">
                {quarterData[0]?.percentage}%
              </span>{" "}
              of coaching attention while Q4 (Oct-Dec) receive only{" "}
              <span className="font-semibold">
                {quarterData[3]?.percentage}%
              </span>
              . This is a common pattern — earlier-born players are often
              physically bigger at youth level.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quality by Quarter */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Quality by Birth Quarter</CardTitle>
          <CardDescription>
            Average QWAS score per birth quarter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quarterData.map((q) => (
            <div className="space-y-2" key={q.quarter}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    className="font-mono"
                    style={{
                      backgroundColor: `${color}15`,
                      color,
                      borderColor: `${color}30`,
                    }}
                    variant="outline"
                  >
                    {q.quarter}
                  </Badge>
                  <span className="text-gray-600 text-sm">{q.label}</span>
                </div>
                <span className="font-medium text-gray-900 text-sm">
                  {q.avgQuality}/100
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${q.avgQuality}%`,
                    backgroundColor:
                      q.avgQuality >= 70
                        ? color
                        : q.avgQuality >= 40
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                />
              </div>
              <p className="text-gray-400 text-xs">
                {q.playerCount} players, {q.insightCount} insights
              </p>
            </div>
          ))}

          {/* Key Finding */}
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="font-medium text-gray-700 text-sm">Key Finding</p>
            <p className="mt-1 text-gray-600 text-xs">
              Later-born players (Q3-Q4) receive fewer insights AND lower
              quality feedback. This double disparity is the pattern most
              strongly associated with the Pygmalion Effect in coaching
              research.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getQuarterLabel(q: string): string {
  switch (q) {
    case "Q1":
      return "Jan-Mar";
    case "Q2":
      return "Apr-Jun";
    case "Q3":
      return "Jul-Sep";
    case "Q4":
      return "Oct-Dec";
    default:
      return "";
  }
}
