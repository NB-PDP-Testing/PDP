"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TemplateCardProps = {
  plan: {
    _id: Id<"sessionPlans">;
    title?: string;
    coachName?: string;
    duration?: number;
    ageGroup?: string;
    sport?: string;
    extractedTags?: {
      categories: string[];
      skills: string[];
      equipment: string[];
      intensity?: "low" | "medium" | "high";
    };
    successRate?: number;
    timesUsed?: number;
    favorited?: boolean;
    pinnedByAdmin?: boolean;
    createdAt: number;
    visibility?: "private" | "club" | "platform";
    moderatedBy?: string;
    moderatedAt?: number;
    moderationNote?: string;
    likeCount?: number;
    dislikeCount?: number;
  };
  onView: (planId: Id<"sessionPlans">) => void;
  onToggleFavorite: (planId: Id<"sessionPlans">) => void;
};

export function TemplateCard({
  plan,
  onView,
  onToggleFavorite,
}: TemplateCardProps) {
  // Voting hooks
  const userVote = useQuery(api.models.sessionPlans.getUserVote, {
    planId: plan._id,
  });
  const votePlan = useMutation(api.models.sessionPlans.votePlan);

  const handleVote = async (
    voteType: "like" | "dislike",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      // If already voted the same way, remove vote
      const newVoteType = userVote === voteType ? "none" : voteType;
      await votePlan({ planId: plan._id, voteType: newVoteType });
    } catch (error) {
      console.error("Failed to vote:", error);
      toast.error("Failed to record your vote");
    }
  };

  const isNew = Date.now() - plan.createdAt < 7 * 24 * 60 * 60 * 1000; // 7 days
  const isTrending =
    (plan.timesUsed ?? 0) > 5 &&
    Date.now() - plan.createdAt < 30 * 24 * 60 * 60 * 1000; // Used 5+ times in last 30 days
  const isModerated = !!plan.moderatedBy;

  const getIntensityColor = (intensity?: "low" | "medium" | "high") => {
    switch (intensity) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get gradient top border based on intensity
  const getIntensityGradient = (intensity?: "low" | "medium" | "high") => {
    switch (intensity) {
      case "low":
        return "from-[#43e97b] to-[#38f9d7]"; // Green
      case "medium":
        return "from-[#f093fb] to-[#f5576c]"; // Pink/Red
      case "high":
        return "from-[#ff6b6b] to-[#feca57]"; // Red/Orange
      default:
        return "from-[#667eea] to-[#764ba2]"; // Purple (default)
    }
  };

  // Get background gradient based on visibility/status
  const getCardBackground = () => {
    if (plan.pinnedByAdmin) {
      return "bg-gradient-to-br from-amber-50/50 to-yellow-50/30"; // Featured - gold tint
    }
    if (plan.visibility === "club") {
      return "bg-gradient-to-br from-[#667eea]/5 to-[#764ba2]/5"; // Shared - purple tint
    }
    return "bg-gradient-to-br from-slate-50/50 to-gray-50/30"; // Private - subtle gray
  };

  const getVisibilityBadge = () => {
    switch (plan.visibility) {
      case "club":
        return (
          <Badge className="bg-blue-100 text-blue-800" variant="secondary">
            SHARED
          </Badge>
        );
      case "platform":
        return (
          <Badge className="bg-purple-100 text-purple-800" variant="secondary">
            PLATFORM
          </Badge>
        );
      case "private":
        return (
          <Badge className="bg-gray-100 text-gray-800" variant="secondary">
            PRIVATE
          </Badge>
        );
      default:
        return null;
    }
  };

  // Handle card click
  const handleCardClick = () => {
    onView(plan._id);
  };

  const intensityGradient = getIntensityGradient(plan.extractedTags?.intensity);
  const cardBackground = getCardBackground();

  return (
    <Card
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20 active:scale-[0.98] active:ring-primary/40 ${cardBackground}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Gradient top border - Option A */}
      <div className={`h-1 w-full bg-gradient-to-r ${intensityGradient}`} />

      {/* Header with badges */}
      <CardHeader className="pb-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {getVisibilityBadge()}
            {plan.pinnedByAdmin && (
              <Badge
                className="bg-amber-100 text-amber-800"
                variant="secondary"
              >
                <Star className="mr-1 h-3 w-3 fill-current" />
                FEATURED
              </Badge>
            )}
            {isNew && (
              <Badge
                className="bg-emerald-100 text-emerald-800"
                variant="secondary"
              >
                NEW
              </Badge>
            )}
            {isTrending && (
              <Badge
                className="bg-indigo-100 text-indigo-800"
                variant="secondary"
              >
                <TrendingUp className="mr-1 h-3 w-3" />
                TRENDING
              </Badge>
            )}
            {isModerated && (
              <Badge className="bg-red-100 text-red-800" variant="secondary">
                <AlertTriangle className="mr-1 h-3 w-3" />
                REMOVED
              </Badge>
            )}
          </div>

          {/* Favorite button */}
          <button
            className="ml-auto transition-colors hover:text-yellow-500"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(plan._id);
            }}
            type="button"
          >
            <Star
              className={`h-5 w-5 ${
                plan.favorited
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        </div>

        <CardTitle className="line-clamp-2 text-lg">
          {plan.title || "Untitled Session Plan"}
        </CardTitle>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex flex-1 flex-col pb-4">
        {/* Rejection Notice */}
        {isModerated && plan.moderationNote && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm">
            <div className="mb-1 font-medium text-red-900">
              Rejected from Club Library
            </div>
            <div className="text-red-700">{plan.moderationNote}</div>
            {plan.moderatedAt && (
              <div className="mt-1 text-red-600 text-xs">
                {new Date(plan.moderatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          {plan.ageGroup && <Badge variant="outline">{plan.ageGroup}</Badge>}
          {plan.sport && <Badge variant="outline">{plan.sport}</Badge>}
          {plan.duration && (
            <Badge variant="outline">{plan.duration} min</Badge>
          )}
          {plan.extractedTags?.intensity && (
            <Badge
              className={getIntensityColor(plan.extractedTags.intensity)}
              variant="secondary"
            >
              {plan.extractedTags.intensity}
            </Badge>
          )}
        </div>

        {/* Skills */}
        {plan.extractedTags?.skills && plan.extractedTags.skills.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {plan.extractedTags.skills.slice(0, 3).map((skill) => (
                <Badge
                  className="bg-slate-100 text-slate-700 text-xs"
                  key={skill}
                  variant="secondary"
                >
                  {skill}
                </Badge>
              ))}
              {plan.extractedTags.skills.length > 3 && (
                <Badge
                  className="bg-slate-100 text-slate-700 text-xs"
                  variant="secondary"
                >
                  +{plan.extractedTags.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Creator */}
        <div className="mt-auto mb-3 text-muted-foreground text-sm">
          <span>By {plan.coachName || "Unknown Coach"}</span>
        </div>

        {/* YouTube-style Like/Dislike - visible like count, hidden dislike */}
        <div className="flex items-center gap-3 border-t pt-3">
          {/* Like button */}
          <button
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
              userVote === "like"
                ? "bg-green-100 font-medium text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600"
            }`}
            onClick={(e) => handleVote("like", e)}
            title="I found this helpful"
            type="button"
          >
            <ThumbsUp
              className={`h-4 w-4 ${userVote === "like" ? "fill-current" : ""}`}
            />
            <span>{plan.likeCount || 0}</span>
          </button>

          {/* Dislike button (no count shown - YouTube style) */}
          <button
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
              userVote === "dislike"
                ? "bg-red-100 font-medium text-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
            onClick={(e) => handleVote("dislike", e)}
            title="Not helpful"
            type="button"
          >
            <ThumbsDown
              className={`h-4 w-4 ${userVote === "dislike" ? "fill-current" : ""}`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
