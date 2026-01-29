"use client";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WeeklyTrend = {
  week: string;
  sent: number;
  viewed: number;
};

type EngagementTrendsSectionProps = {
  weeklyTrends: WeeklyTrend[];
};

/**
 * Engagement Trends Section - Phase 8 Week 3 (US-P8-017)
 *
 * Displays line chart showing parent engagement trends over last 4 weeks.
 * Two lines:
 * - Blue: Summaries sent
 * - Green: Summaries viewed
 *
 * Empty state if less than 2 weeks of data.
 */
export function EngagementTrendsSection({
  weeklyTrends,
}: EngagementTrendsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Engagement Trends</CardTitle>
            <p className="text-muted-foreground text-sm">
              Parent summary activity over last 4 weeks
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weeklyTrends.length < 2 ? (
          <p className="text-muted-foreground text-sm">
            Not enough data yet. Keep sending summaries!
          </p>
        ) : (
          <ResponsiveContainer height={300} width="100%">
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line
                dataKey="sent"
                name="Sent"
                stroke="#3b82f6"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="viewed"
                name="Viewed"
                stroke="#10b981"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
