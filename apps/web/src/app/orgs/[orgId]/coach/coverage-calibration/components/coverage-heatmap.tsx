"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Player = {
  name: string;
  insights: number;
  quality: number;
  lastNote: number;
  quarter: string;
  status: "active" | "quiet" | "none";
};

export function CoverageHeatmap({
  players,
  color,
}: {
  players: Player[];
  color: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Coaching Coverage</CardTitle>
            <CardDescription>U12 Girls GAA — Last 30 days</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gray-100 text-gray-600" variant="outline">
              18 players
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table Header */}
        <div className="mb-2 grid grid-cols-[1fr_80px_120px_80px_80px_50px] items-center gap-2 border-b pb-2 font-medium text-gray-500 text-xs">
          <span>Player</span>
          <span className="text-center">Insights</span>
          <span>Quality (QWAS)</span>
          <span className="text-center">Last Note</span>
          <span className="text-center">Status</span>
          <span />
        </div>

        {/* Player Rows */}
        <div className="space-y-1">
          {players.map((player) => (
            <div
              className="grid grid-cols-[1fr_80px_120px_80px_80px_50px] items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
              key={player.name}
            >
              {/* Name */}
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full font-medium text-xs"
                  style={{
                    backgroundColor:
                      player.status === "active"
                        ? `${color}15`
                        : player.status === "quiet"
                          ? "#fef3c715"
                          : "#fee2e215",
                    color:
                      player.status === "active"
                        ? color
                        : player.status === "quiet"
                          ? "#b45309"
                          : "#dc2626",
                  }}
                >
                  {player.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <span className="font-medium text-gray-800 text-sm">
                  {player.name}
                </span>
              </div>

              {/* Insight Count */}
              <div className="text-center font-medium text-sm">
                {player.insights}
              </div>

              {/* Quality Bar */}
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${player.quality}%`,
                      backgroundColor:
                        player.quality >= 70
                          ? color
                          : player.quality >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  />
                </div>
                <span className="w-8 text-gray-500 text-xs">
                  {player.quality}
                </span>
              </div>

              {/* Last Note */}
              <div className="text-center text-sm">
                <span
                  className={
                    player.lastNote <= 7
                      ? "text-gray-500"
                      : player.lastNote <= 14
                        ? "text-amber-600"
                        : "font-medium text-red-500"
                  }
                >
                  {player.lastNote}d ago
                </span>
              </div>

              {/* Status */}
              <div className="flex justify-center">
                <StatusBadge status={player.status} />
              </div>

              {/* Action */}
              <div className="flex justify-center">
                <Button
                  className="h-7 w-7"
                  size="icon"
                  style={{ color }}
                  variant="ghost"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Quality Legend */}
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-4 text-gray-500 text-xs">
            <span className="flex items-center gap-1">
              <div
                className="h-2 w-6 rounded-full"
                style={{ backgroundColor: color }}
              />
              High quality
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-6 rounded-full bg-amber-500" />
              Moderate
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-6 rounded-full bg-red-400" />
              Needs depth
            </span>
          </div>
          <p className="text-gray-400 text-xs">
            Your Attention Balance: 66/100
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "active" | "quiet" | "none" }) {
  if (status === "active") {
    return (
      <Badge
        className="border-green-200 bg-green-50 text-green-700"
        variant="outline"
      >
        Active
      </Badge>
    );
  }
  if (status === "quiet") {
    return (
      <Badge
        className="border-amber-200 bg-amber-50 text-amber-700"
        variant="outline"
      >
        Quiet
      </Badge>
    );
  }
  return (
    <Badge className="border-red-200 bg-red-50 text-red-600" variant="outline">
      None
    </Badge>
  );
}
