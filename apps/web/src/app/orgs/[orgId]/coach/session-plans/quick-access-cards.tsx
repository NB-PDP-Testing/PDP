"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Clock, Heart, Star, ThumbsUp } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type QuickAccessCardsProps = {
  onCardClick?: (filterType: string, planIds: string[] | undefined) => void;
};

export function QuickAccessCards({ onCardClick }: QuickAccessCardsProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Fetch quick access data - using reliable signals only
  const recentlyCreated = useQuery(
    api.models.sessionPlans.getFilteredPlans,
    userId
      ? {
          organizationId: orgId,
          limit: 5,
        }
      : "skip"
  );

  const favorites = useQuery(
    api.models.sessionPlans.getFilteredPlans,
    userId
      ? {
          organizationId: orgId,
          favoriteOnly: true,
          limit: 5,
        }
      : "skip"
  );

  const yourMostLiked = useQuery(
    api.models.sessionPlans.getYourMostLiked,
    userId
      ? {
          organizationId: orgId,
          coachId: userId,
          limit: 5,
        }
      : "skip"
  );

  const clubMostLiked = useQuery(
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
      title: "Recently Created",
      icon: Clock,
      count: recentlyCreated?.length ?? 0,
      description: "Your latest session plans",
      filterType: "recent",
      planIds: recentlyCreated?.map((p: { _id: string }) => p._id),
    },
    {
      title: "Favorites",
      icon: Star,
      count: favorites?.length ?? 0,
      description: "Plans you've starred",
      filterType: "favorites",
      planIds: favorites?.map((p: { _id: string }) => p._id),
    },
    {
      title: "Your Most Liked",
      icon: Heart,
      count: yourMostLiked?.count ?? 0,
      description: "Your plans others liked",
      filterType: "yourLiked",
      planIds: yourMostLiked?.plans?.map((p: { _id: string }) => p._id),
    },
    {
      title: "Club Top Picks",
      icon: ThumbsUp,
      count: clubMostLiked?.count ?? 0,
      description: "Most liked in club library",
      filterType: "clubLiked",
      planIds: clubMostLiked?.plans?.map((p: { _id: string }) => p._id),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            className="cursor-pointer transition-all hover:shadow-md"
            key={card.filterType}
            onClick={() => handleCardClick(card.filterType, card.planIds)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="mb-1 font-medium text-sm">{card.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {card.description}
                  </p>
                </div>
                <div className="ml-3 flex flex-col items-center gap-1">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <span className="font-bold text-lg">{card.count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
