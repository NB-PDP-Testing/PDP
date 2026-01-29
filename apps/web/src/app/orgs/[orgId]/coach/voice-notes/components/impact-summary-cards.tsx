"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Eye,
  Mic,
  Minus,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ImpactSummaryCardsProps = {
  data: {
    voiceNotesCreated: number;
    insightsApplied: number;
    summariesSent: number;
    parentViewRate: number;
    previousPeriodStats?: {
      voiceNotesCreated: number;
      insightsApplied: number;
      summariesSent: number;
      parentViewRate: number;
    };
  };
};

export function ImpactSummaryCards({ data }: ImpactSummaryCardsProps) {
  // Calculate comparison with previous period (US-P8-019)
  const getComparison = (
    current: number,
    previous?: number
  ): { diff: number; trend: "up" | "down" | "same" } => {
    if (!previous && previous !== 0) {
      return { diff: 0, trend: "same" };
    }
    const diff = current - previous;
    if (diff > 0) {
      return { diff, trend: "up" };
    }
    if (diff < 0) {
      return { diff: Math.abs(diff), trend: "down" };
    }
    return { diff: 0, trend: "same" };
  };

  const cards = [
    {
      label: "Voice Notes",
      value: data.voiceNotesCreated,
      icon: Mic,
      colorClass: "bg-blue-100 text-blue-600",
      comparison: getComparison(
        data.voiceNotesCreated,
        data.previousPeriodStats?.voiceNotesCreated
      ),
    },
    {
      label: "Insights Applied",
      value: data.insightsApplied,
      icon: CheckCircle,
      colorClass: "bg-green-100 text-green-600",
      comparison: getComparison(
        data.insightsApplied,
        data.previousPeriodStats?.insightsApplied
      ),
    },
    {
      label: "Sent to Parents",
      value: data.summariesSent,
      icon: Send,
      colorClass: "bg-purple-100 text-purple-600",
      comparison: getComparison(
        data.summariesSent,
        data.previousPeriodStats?.summariesSent
      ),
    },
    {
      label: "Parent View Rate",
      value: `${data.parentViewRate.toFixed(1)}%`,
      icon: Eye,
      colorClass: "bg-amber-100 text-amber-600",
      comparison: getComparison(
        Math.round(data.parentViewRate),
        data.previousPeriodStats
          ? Math.round(data.previousPeriodStats.parentViewRate)
          : undefined
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const { diff, trend } = card.comparison;
        const ComparisonIcon =
          trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
        const comparisonColorClass =
          trend === "up"
            ? "text-green-600"
            : trend === "down"
              ? "text-red-600"
              : "text-gray-400";

        return (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${card.colorClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className="font-bold text-2xl">{card.value}</p>
                  {data.previousPeriodStats && (
                    <div
                      className={`mt-1 flex items-center gap-1 text-xs ${comparisonColorClass}`}
                    >
                      <ComparisonIcon className="h-3 w-3" />
                      <span>
                        {trend === "same"
                          ? "No change"
                          : `${diff} vs previous period`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
