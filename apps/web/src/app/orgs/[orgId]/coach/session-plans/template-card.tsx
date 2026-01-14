"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  Eye,
  Heart,
  Play,
  Star,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  };
  onPreview: (planId: Id<"sessionPlans">) => void;
  onUseTemplate: (planId: Id<"sessionPlans">) => void;
  onToggleFavorite: (planId: Id<"sessionPlans">) => void;
};

export function TemplateCard({
  plan,
  onPreview,
  onUseTemplate,
  onToggleFavorite,
}: TemplateCardProps) {
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

  return (
    <Card className="group relative flex h-full flex-col transition-shadow hover:shadow-lg">
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
            className="ml-auto transition-colors hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(plan._id);
            }}
            type="button"
          >
            <Heart
              className={`h-5 w-5 ${
                plan.favorited
                  ? "fill-red-500 text-red-500"
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

        {/* Creator & Usage */}
        <div className="mt-auto mb-3 flex items-center justify-between text-muted-foreground text-sm">
          <span>By {plan.coachName || "Unknown Coach"}</span>
          {plan.timesUsed !== undefined && plan.timesUsed > 0 && (
            <span>{plan.timesUsed} uses</span>
          )}
        </div>

        {/* Success Rate */}
        {plan.successRate !== undefined && plan.successRate > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-medium">{plan.successRate}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-green-500"
                style={{ width: `${plan.successRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(plan._id);
            }}
            size="sm"
            variant="outline"
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
          <Button
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onUseTemplate(plan._id);
            }}
            size="sm"
          >
            <Play className="mr-1.5 h-4 w-4" />
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
