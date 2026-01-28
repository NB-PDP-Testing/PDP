"use client";

import { CheckCircle, Eye, Mic, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ImpactSummaryCardsProps = {
  data: {
    voiceNotesCreated: number;
    insightsApplied: number;
    summariesSent: number;
    parentViewRate: number;
  };
};

export function ImpactSummaryCards({ data }: ImpactSummaryCardsProps) {
  const cards = [
    {
      label: "Voice Notes",
      value: data.voiceNotesCreated,
      icon: Mic,
      colorClass: "bg-blue-100 text-blue-600",
    },
    {
      label: "Insights Applied",
      value: data.insightsApplied,
      icon: CheckCircle,
      colorClass: "bg-green-100 text-green-600",
    },
    {
      label: "Sent to Parents",
      value: data.summariesSent,
      icon: Send,
      colorClass: "bg-purple-100 text-purple-600",
    },
    {
      label: "Parent View Rate",
      value: `${data.parentViewRate.toFixed(1)}%`,
      icon: Eye,
      colorClass: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${card.colorClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className="font-bold text-2xl">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
