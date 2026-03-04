"use client";

import { CheckCircle2, Mic, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Player = {
  name: string;
  insights: number;
  quality: number;
  lastNote: number;
  quarter: string;
  status: "active" | "quiet" | "none";
};

export function PostInsightNudge({
  players,
  metrics,
  color,
}: {
  players: Player[];
  metrics: { playersAssessed: number; totalPlayers: number };
  color: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const uncoveredPlayers = players
    .filter((p) => p.status === "none" || p.status === "quiet")
    .slice(0, 2);

  if (dismissed) {
    return (
      <Card className="border-gray-300 border-dashed bg-gray-50">
        <CardContent className="py-8 text-center">
          <p className="text-gray-400 text-sm">
            Nudge dismissed. Would reappear at next task boundary.
          </p>
          <Button
            className="mt-2"
            onClick={() => setDismissed(false)}
            size="sm"
            variant="ghost"
          >
            Show again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800 text-sm">
              Great work! {metrics.playersAssessed + 1} of{" "}
              {metrics.totalPlayers} players assessed this month.
            </p>
            <p className="mt-0.5 text-green-600 text-xs">
              Coverage:{" "}
              {Math.round(
                ((metrics.playersAssessed + 1) / metrics.totalPlayers) * 100
              )}
              % — improving!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Context Label */}
      <p className="text-center text-gray-500 text-xs">
        This appears after a coach submits a voice note
      </p>

      {/* The nudge card */}
      <Card className="overflow-hidden shadow-lg">
        <CardContent className="p-5">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" style={{ color }} />
              <p className="font-medium text-gray-900">
                Saved! {metrics.playersAssessed} of {metrics.totalPlayers}{" "}
                players assessed this month
              </p>
            </div>
            <Button
              className="h-6 w-6"
              onClick={() => setDismissed(true)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>

          {/* Uncovered players */}
          <div className="space-y-3">
            <p className="text-gray-600 text-sm">
              You haven&apos;t recorded insights about:
            </p>
            {uncoveredPlayers.map((player) => (
              <div
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                key={player.name}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 font-medium text-amber-700 text-sm">
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {player.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {player.lastNote} days since last note
                    </p>
                  </div>
                </div>
                <Button
                  className="gap-1"
                  onClick={() => setShowSuccess(true)}
                  size="sm"
                  style={{ color }}
                  variant="outline"
                >
                  <Mic className="h-3 w-3" />
                  Quick note?
                </Button>
              </div>
            ))}
          </div>

          {/* Dismiss */}
          <div className="mt-4 flex justify-end">
            <Button
              className="text-gray-400"
              onClick={() => setDismissed(true)}
              size="sm"
              variant="ghost"
            >
              Done for now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dismissal behavior note */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="py-3">
          <p className="text-center text-gray-500 text-xs">
            <span className="font-medium">Dismissal rules:</span> 1st = normal,
            2nd (same player) = reduce frequency, 3rd = stop for 30 days, 3
            consecutive = reduce all nudges by 50%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
