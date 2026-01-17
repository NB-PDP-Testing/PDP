"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { BookmarkCheck, Clock, Star, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type QuickAccessCardsProps = {
  onCardClick?: (filterType: string, planIds: string[] | undefined) => void;
};

export function QuickAccessCards({ onCardClick }: QuickAccessCardsProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Fetch quick access data
  const recentlyUsed = useQuery(
    api.models.sessionPlans.getRecentlyUsed,
    userId
      ? {
          organizationId: orgId,
          coachId: userId,
          limit: 5,
        }
      : "skip"
  );

  const mostPopular = useQuery(
    api.models.sessionPlans.getMostPopular,
    userId
      ? {
          organizationId: orgId,
          coachId: userId,
          limit: 5,
        }
      : "skip"
  );

  const yourBest = useQuery(
    api.models.sessionPlans.getYourBest,
    userId
      ? {
          organizationId: orgId,
          coachId: userId,
          limit: 5,
        }
      : "skip"
  );

  const topRated = useQuery(
    api.models.sessionPlans.getTopRated,
    userId
      ? {
          organizationId: orgId,
          limit: 5,
        }
      : "skip"
  );

  const handleCardClick = (
    filterType: string,
    planIds: string[] | undefined
  ) => {
    if (onCardClick) {
      onCardClick(filterType, planIds);
    }
  };

  const cards = [
    {
      title: "Recently Used",
      icon: Clock,
      count: recentlyUsed?.count ?? 0,
      description: "Plans used in the last 30 days",
      filterType: "recent",
      color: "text-blue-600",
      planIds: recentlyUsed?.plans?.map((p) => p._id),
    },
    {
      title: "Most Popular",
      icon: TrendingUp,
      count: mostPopular?.count ?? 0,
      description: "Your most frequently used plans",
      filterType: "popular",
      color: "text-green-600",
      planIds: mostPopular?.plans?.map((p) => p._id),
    },
    {
      title: "Your Best",
      icon: Star,
      count: yourBest?.count ?? 0,
      description: "Plans with 80%+ success rate",
      filterType: "best",
      color: "text-yellow-600",
      planIds: yourBest?.plans?.map((p) => p._id),
    },
    {
      title: "Top Rated",
      icon: BookmarkCheck,
      count: topRated?.count ?? 0,
      description: "Highest rated in club library",
      filterType: "topRated",
      color: "text-purple-600",
      planIds: topRated?.plans?.map((p) => p._id),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            key={card.filterType}
            onClick={() => handleCardClick(card.filterType, card.planIds)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{card.count}</div>
              <p className="text-muted-foreground text-xs">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
