"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, Calendar, CheckSquare, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type QuickStatsPanelProps = {
  teamId: string;
  organizationId: string;
};

export function QuickStatsPanel({
  teamId,
  organizationId,
}: QuickStatsPanelProps) {
  const stats = useQuery(api.models.teams.getTeamOverviewStats, {
    teamId,
    organizationId,
  });

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Players",
      value: stats.totalPlayers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Injuries",
      value: stats.activeInjuries,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Open Tasks",
      value: stats.openTasks || 0,
      subtitle:
        stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : undefined,
      icon: CheckSquare,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEventsCount,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <div className="text-muted-foreground text-sm">
                    {stat.title}
                  </div>
                  <div className="mt-1 font-bold text-2xl">{stat.value}</div>
                  {"subtitle" in stat && stat.subtitle && (
                    <div className="mt-1 text-muted-foreground text-xs">
                      {stat.subtitle}
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
