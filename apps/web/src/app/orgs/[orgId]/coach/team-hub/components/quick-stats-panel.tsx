"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, CheckSquare, Lightbulb, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

type QuickStatsPanelProps =
  | { teamId: string; teamIds?: never; organizationId: string }
  | { teamIds: string[]; teamId?: never; organizationId: string };

export function QuickStatsPanel({
  teamId,
  teamIds,
  organizationId,
}: QuickStatsPanelProps) {
  const user = useCurrentUser();

  const singleStats = useQuery(
    api.models.teams.getTeamOverviewStats,
    teamId ? { teamId, organizationId, userId: user?._id } : "skip"
  );

  const multiStats = useQuery(
    api.models.teams.getTeamOverviewStatsForTeams,
    teamIds ? { teamIds, organizationId, userId: user?._id } : "skip"
  );

  const stats = teamIds ? multiStats : singleStats;

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
      cardBg: "border-blue-200 bg-blue-50",
    },
    {
      title: "Active Injuries",
      value: stats.activeInjuries,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      cardBg: "border-red-200 bg-red-50",
    },
    {
      title: "Open Tasks",
      value: stats.openTasks || 0,
      subtitle:
        stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : undefined,
      icon: CheckSquare,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      cardBg: "border-orange-200 bg-orange-50",
    },
    {
      title: "Unread Insights",
      value: stats.unreadInsights || 0,
      subtitle:
        stats.highPriorityInsights > 0
          ? `${stats.highPriorityInsights} priority`
          : undefined,
      icon: Lightbulb,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      cardBg: "border-purple-200 bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            className={`pt-0 transition-all duration-200 hover:shadow-lg ${stat.cardBg}`}
            key={stat.title}
          >
            <CardContent className="pt-6">
              <div className="mb-2 flex items-center justify-between">
                <Icon className={stat.color} size={20} />
                <div className="font-bold text-gray-800 text-xl md:text-2xl">
                  {stat.value}
                </div>
              </div>
              <div className="font-medium text-gray-600 text-xs md:text-sm">
                {stat.title}
              </div>
              {"subtitle" in stat && stat.subtitle && (
                <div className="mt-1 text-gray-500 text-xs">
                  {stat.subtitle}
                </div>
              )}
              <div className={`mt-2 h-1 w-full rounded-full ${stat.bgColor}`}>
                <div
                  className={`h-1 rounded-full ${stat.color.replace("text-", "bg-")}`}
                  style={{ width: stat.value > 0 ? "100%" : "0%" }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
