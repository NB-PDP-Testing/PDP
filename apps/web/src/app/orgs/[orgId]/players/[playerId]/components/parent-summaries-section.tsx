"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ParentSummary = {
  _id: Id<"coachParentSummaries">;
  _creationTime: number;
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
  coachId: string;
  coachName: string;
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
  sportId: Id<"sports">;
  privateInsight: {
    title: string;
    description: string;
    category: string;
    sentiment: "positive" | "neutral" | "concern";
  };
  publicSummary: {
    content: string;
    confidenceScore: number;
    generatedAt: number;
  };
  sensitivityCategory: "normal" | "injury" | "behavior";
  status:
    | "pending_review"
    | "approved"
    | "suppressed"
    | "auto_approved"
    | "delivered"
    | "viewed";
  createdAt: number;
  approvedAt?: number;
  deliveredAt?: number;
  viewedAt?: number;
};

type Props = {
  playerIdentityId: Id<"playerIdentities">;
  orgId: string;
};

export function ParentSummariesSection({ playerIdentityId, orgId }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Query parent summaries for all children
  const allSummaries = useQuery(
    api.models.coachParentSummaries.getParentSummariesByChildAndSport,
    { organizationId: orgId }
  );

  // Filter to only this player's approved summaries
  const playerSummaries = useMemo(() => {
    if (!allSummaries) {
      return null;
    }

    const summaries: Array<ParentSummary & { sportName?: string }> = [];

    for (const child of allSummaries) {
      if (child.player._id !== playerIdentityId) {
        continue;
      }

      for (const sportGroup of child.sportGroups) {
        for (const summary of sportGroup.summaries) {
          // Only show approved/delivered/viewed summaries to parents
          if (
            summary.status === "approved" ||
            summary.status === "delivered" ||
            summary.status === "viewed"
          ) {
            summaries.push({
              ...summary,
              sportName: sportGroup.sport?.name,
            });
          }
        }
      }
    }

    // Sort by most recent
    return summaries.sort((a, b) => b.createdAt - a.createdAt);
  }, [allSummaries, playerIdentityId]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!playerSummaries) {
      return { total: 0, new: 0, read: 0 };
    }

    const total = playerSummaries.length;
    const read = playerSummaries.filter((s) => s.viewedAt).length;
    const newCount = playerSummaries.filter(
      (s) => !s.viewedAt && s.status === "delivered"
    ).length;

    return { total, new: newCount, read };
  }, [playerSummaries]);

  // Group summaries by coach
  const summariesByCoach = useMemo(() => {
    if (!playerSummaries) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        coachId: string;
        coachName: string;
        summaries: typeof playerSummaries;
      }
    >();

    for (const summary of playerSummaries) {
      const coachId = summary.coachId || "unknown";
      const coachName = summary.coachName || "Unknown Coach";

      if (!grouped.has(coachId)) {
        grouped.set(coachId, {
          coachId,
          coachName,
          summaries: [],
        });
      }

      const coachGroup = grouped.get(coachId);
      if (coachGroup) {
        coachGroup.summaries.push(summary);
      }
    }

    // Sort coaches by most recent summary
    return Array.from(grouped.values()).sort((a, b) => {
      const aLatest = Math.max(...a.summaries.map((s) => s.createdAt));
      const bLatest = Math.max(...b.summaries.map((s) => s.createdAt));
      return bLatest - aLatest;
    });
  }, [playerSummaries]);

  // Get sentiment icon
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <Sparkles className="h-4 w-4 text-green-600" />;
      case "concern":
        return <Heart className="h-4 w-4 text-yellow-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const categoryMap: Record<string, string> = {
      skill_rating: "bg-blue-100 text-blue-800",
      skill_progress: "bg-green-100 text-green-800",
      injury: "bg-red-100 text-red-800",
      behavior: "bg-red-100 text-red-800", // Red for behavioral insights (require manual interaction)
      performance: "bg-purple-100 text-purple-800",
      attendance: "bg-orange-100 text-orange-800",
    };
    return categoryMap[category] || "bg-gray-100 text-gray-800";
  };

  // Loading state
  if (playerSummaries === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coach Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (playerSummaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coach Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">
              No coach updates have been shared yet.
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Your child's coaches will share progress updates here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render summaries
  const renderSummaries = () => {
    if (summariesByCoach.length <= 1) {
      // Single coach or all summaries - flat list
      return (
        <div className="space-y-3">
          {playerSummaries.map((summary) => (
            <Card className="overflow-hidden" key={summary._id}>
              <CardContent className="space-y-3 p-4">
                {/* Header: Category & Date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${getCategoryColor(summary.privateInsight.category)}`}
                    >
                      {summary.privateInsight.category
                        .replace(/_/g, " ")
                        .toUpperCase()}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(summary.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {summary.sportName && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground text-xs">
                          {summary.sportName}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getSentimentIcon(summary.privateInsight.sentiment)}
                    {summary.viewedAt && (
                      <Badge className="text-xs" variant="outline">
                        Read
                      </Badge>
                    )}
                    {!summary.viewedAt && summary.status === "delivered" && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Parent-Safe Content */}
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {summary.publicSummary.content}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    From Coach {summary.coachName}
                  </span>
                  {summary.deliveredAt && (
                    <span className="text-muted-foreground">
                      Shared{" "}
                      {new Date(summary.deliveredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Multiple coaches - use tabs
    return (
      <Tabs className="w-full" defaultValue={summariesByCoach[0].coachId}>
        <TabsList>
          {summariesByCoach.map((coach) => (
            <TabsTrigger key={coach.coachId} value={coach.coachId}>
              {coach.coachName} ({coach.summaries.length})
            </TabsTrigger>
          ))}
        </TabsList>

        {summariesByCoach.map((coach) => (
          <TabsContent
            className="mt-4 space-y-3"
            key={coach.coachId}
            value={coach.coachId}
          >
            {coach.summaries.map((summary) => (
              <Card className="overflow-hidden" key={summary._id}>
                <CardContent className="space-y-3 p-4">
                  {/* Header: Category & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${getCategoryColor(summary.privateInsight.category)}`}
                      >
                        {summary.privateInsight.category
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(summary.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                      {summary.sportName && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground text-xs">
                            {summary.sportName}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getSentimentIcon(summary.privateInsight.sentiment)}
                      {summary.viewedAt && (
                        <Badge className="text-xs" variant="outline">
                          Read
                        </Badge>
                      )}
                      {!summary.viewedAt && summary.status === "delivered" && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Parent-Safe Content */}
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {summary.publicSummary.content}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      From {coach.coachName}
                    </span>
                    {summary.deliveredAt && (
                      <span className="text-muted-foreground">
                        Shared{" "}
                        {new Date(summary.deliveredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Coach Updates
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                  {playerSummaries.length}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Info Notice */}
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your child's coaches share important updates about progress,
                development, and achievements here.
              </AlertDescription>
            </Alert>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="font-bold text-blue-700 text-lg">
                  {stats.total}
                </div>
                <div className="text-muted-foreground text-xs">Total</div>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <div className="font-bold text-green-700 text-lg">
                  {stats.new}
                </div>
                <div className="text-muted-foreground text-xs">New</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="font-bold text-gray-700 text-lg">
                  {stats.read}
                </div>
                <div className="text-muted-foreground text-xs">Read</div>
              </div>
            </div>

            {/* Summaries Display */}
            {renderSummaries()}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
