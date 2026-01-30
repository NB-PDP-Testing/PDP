"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InsightCommentsProps {
  insightId: Id<"voiceNoteInsights">;
}

export function InsightComments({ insightId }: InsightCommentsProps) {
  const comments = useQuery(api.models.teamCollaboration.getInsightComments, {
    insightId,
  });

  if (!comments) {
    // Loading skeleton - 3 items
    return <ListSkeleton items={3} />;
  }

  if (comments.length === 0) {
    // Empty state
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No comments yet - be the first to share your thoughts!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const initials = comment.userName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2);

        // Format relative timestamp
        const relativeTime = formatDistanceToNow(comment._creationTime, {
          addSuffix: true,
        });

        return (
          <div className="flex gap-3" key={comment._id}>
            <Avatar className="h-8 w-8">
              <AvatarImage alt={comment.userName} src={comment.userAvatar} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm">{comment.userName}</span>
                <span className="text-muted-foreground text-xs">
                  {relativeTime}
                </span>
              </div>
              <p className="text-foreground text-sm">{comment.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
