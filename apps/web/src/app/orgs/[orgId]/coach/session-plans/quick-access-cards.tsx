"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Clock, Heart, Star, ThumbsUp } from "lucide-react";
import { useParams } from "next/navigation";
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
      gradient: "from-[#667eea] to-[#764ba2]",
      planIds: recentlyCreated?.map((p: { _id: string }) => p._id),
    },
    {
      title: "Favorites",
      icon: Star,
      count: favorites?.length ?? 0,
      description: "Plans you've starred",
      filterType: "favorites",
      gradient: "from-[#f093fb] to-[#f5576c]",
      planIds: favorites?.map((p: { _id: string }) => p._id),
    },
    {
      title: "Your Most Liked",
      icon: Heart,
      count: yourMostLiked?.count ?? 0,
      description: "Your plans others liked",
      filterType: "yourLiked",
      gradient: "from-[#4facfe] to-[#00f2fe]",
      planIds: yourMostLiked?.plans?.map((p: { _id: string }) => p._id),
    },
    {
      title: "Club Top Picks",
      icon: ThumbsUp,
      count: clubMostLiked?.count ?? 0,
      description: "Most liked in club library",
      filterType: "clubLiked",
      gradient: "from-[#43e97b] to-[#38f9d7]",
      planIds: clubMostLiked?.plans?.map((p: { _id: string }) => p._id),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            className={`group relative cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} p-4 text-left text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:p-6`}
            key={card.filterType}
            onClick={() => handleCardClick(card.filterType, card.planIds)}
            type="button"
          >
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <Icon className="h-6 w-6 opacity-90 sm:h-8 sm:w-8" />
              <div className="rounded-full bg-white/20 px-2 py-0.5 font-bold text-xl backdrop-blur-sm sm:px-3 sm:py-1 sm:text-2xl">
                {card.count}
              </div>
            </div>
            <h3 className="mb-0.5 font-semibold text-base sm:mb-1 sm:text-lg">
              {card.title}
            </h3>
            <p className="text-xs opacity-90 sm:text-sm">{card.description}</p>
            <div className="-bottom-2 -right-2 absolute h-16 w-16 rounded-full bg-white/10 transition-transform group-hover:scale-110 sm:h-24 sm:w-24" />
          </button>
        );
      })}
    </div>
  );
}
