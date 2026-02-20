"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  Clock,
  Eye,
  MoreVertical,
  Pin,
  PinOff,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminPlanCardProps = {
  plan: {
    _id: Id<"sessionPlans">;
    title?: string;
    coachName?: string;
    teamName: string;
    duration?: number;
    ageGroup?: string;
    sport?: string;
    visibility?: "private" | "club" | "platform";
    pinnedByAdmin?: boolean;
    moderatedBy?: string;
    moderatedAt?: number;
    moderationNote?: string;
    createdAt: number;
    timesUsed?: number;
    successRate?: number;
    status?: string;
    likeCount?: number;
    dislikeCount?: number;
    extractedTags?: {
      categories: string[];
      skills: string[];
      equipment: string[];
      intensity?: "low" | "medium" | "high";
    };
  };
  onView: (planId: Id<"sessionPlans">) => void;
  onPinToggle: (planId: Id<"sessionPlans">, isPinned: boolean) => void;
  onReject: (planId: Id<"sessionPlans">) => void;
};

export function AdminPlanCard({
  plan,
  onView,
  onPinToggle,
  onReject,
}: AdminPlanCardProps) {
  const isNew = Date.now() - plan.createdAt < 7 * 24 * 60 * 60 * 1000; // 7 days
  const isTrending =
    (plan.timesUsed ?? 0) > 5 &&
    Date.now() - plan.createdAt < 30 * 24 * 60 * 60 * 1000;
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

  // Get border color based on status/visibility
  const getBorderClass = () => {
    if (plan.pinnedByAdmin) {
      return "border-l-4 border-l-amber-500"; // Featured - amber border
    }
    if (isModerated) {
      return "border-l-4 border-l-red-500"; // Rejected - red border
    }
    return ""; // Default - no special border
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

  // Format date as "Shared X days ago"
  const formatSharedDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) {
      return "Shared today";
    }
    if (days === 1) {
      return "Shared yesterday";
    }
    if (days < 7) {
      return `Shared ${days} days ago`;
    }
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `Shared ${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    }
    const months = Math.floor(days / 30);
    return `Shared ${months} month${months !== 1 ? "s" : ""} ago`;
  };

  // Handle card click
  const handleCardClick = () => {
    onView(plan._id);
  };

  const borderClass = getBorderClass();

  return (
    <Card
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all hover:shadow-md ${borderClass}`}
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
            {isNew && !plan.pinnedByAdmin && !isModerated && (
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
                REJECTED
              </Badge>
            )}
          </div>

          {/* 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                size="icon"
                variant="ghost"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView(plan._id);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Full Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPinToggle(plan._id, !!plan.pinnedByAdmin);
                }}
              >
                {plan.pinnedByAdmin ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    Unpin Plan
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Feature Plan
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(plan._id);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Remove from Library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardTitle className="line-clamp-2 text-lg">
          {plan.title || "Untitled Session Plan"}
        </CardTitle>

        <div className="mt-2 text-muted-foreground text-sm">
          By {plan.coachName || "Unknown Coach"} • {plan.teamName}
        </div>

        <div className="mt-2 flex items-center gap-3 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatSharedDate(plan.createdAt)}
          </div>
          {plan.timesUsed !== undefined && plan.timesUsed > 0 && (
            <div>
              • {plan.timesUsed} use
              {plan.timesUsed !== 1 ? "s" : ""}
            </div>
          )}
        </div>
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

        {/* Thumbs Up / Thumbs Down */}
        <div className="mt-auto flex items-center gap-4 border-t pt-3 text-sm">
          <div className="flex items-center gap-1.5 text-green-600">
            <ThumbsUp className="h-4 w-4" />
            <span className="font-medium">{plan.likeCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-500">
            <ThumbsDown className="h-4 w-4" />
            <span className="font-medium">{plan.dislikeCount ?? 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
