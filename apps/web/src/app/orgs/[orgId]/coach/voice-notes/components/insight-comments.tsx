"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommentForm } from "./comment-form";

type InsightCommentsProps = {
  insightId: Id<"voiceNoteInsights">;
  organizationId: string;
  insightCategory?: string;
  playerIdentityId?: Id<"playerIdentities">;
  teamId?: string;
};

type Comment = {
  _id: Id<"insightComments">;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  priority: "critical" | "important" | "normal";
  parentCommentId?: Id<"insightComments">;
  _creationTime: number;
};

type CommentItemProps = {
  comment: Comment;
  depth: number;
  maxDepth: number;
  onReply: (commentId: Id<"insightComments">, userName: string) => void;
  children?: React.ReactNode;
};

function CommentItem({
  comment,
  depth,
  maxDepth,
  onReply,
  children,
}: CommentItemProps) {
  const initials = comment.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const relativeTime = formatDistanceToNow(comment._creationTime, {
    addSuffix: true,
  });

  const canReply = depth < maxDepth;

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage alt={comment.userName} src={comment.userAvatar} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{comment.userName}</span>
          <span className="text-muted-foreground text-xs">{relativeTime}</span>
        </div>
        <p className="text-foreground text-sm">{comment.content}</p>
        {canReply && (
          <Button
            className="h-auto p-0 text-muted-foreground text-xs hover:text-foreground"
            onClick={() => onReply(comment._id, comment.userName)}
            size="sm"
            variant="ghost"
          >
            <MessageSquare className="mr-1 h-3 w-3" />
            Reply
          </Button>
        )}
        {children && <div className="mt-3 space-y-3">{children}</div>}
      </div>
    </div>
  );
}

export function InsightComments({
  insightId,
  organizationId,
  insightCategory,
  playerIdentityId,
  teamId,
}: InsightCommentsProps) {
  const [replyingTo, setReplyingTo] = useState<{
    commentId: Id<"insightComments">;
    userName: string;
  } | null>(null);

  const comments = useQuery(api.models.teamCollaboration.getInsightComments, {
    insightId,
  });

  if (!comments) {
    return <ListSkeleton items={3} />;
  }

  if (comments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No comments yet - be the first to share your thoughts!
          </p>
        </div>
        <CommentForm
          insightCategory={insightCategory}
          insightId={insightId}
          organizationId={organizationId}
          playerIdentityId={playerIdentityId}
          teamId={teamId}
        />
      </div>
    );
  }

  const MAX_DEPTH = 3;

  // Build comment tree from flat list
  const buildCommentTree = (
    parentId?: Id<"insightComments">,
    _depth = 0
  ): Comment[] => comments.filter((c) => c.parentCommentId === parentId);

  const renderComment = (comment: Comment, depth: number): React.ReactNode => {
    const replies = buildCommentTree(comment._id, depth + 1);
    const indentStyle =
      depth > 0
        ? {
            marginLeft: "16px",
            borderLeft: "2px solid hsl(var(--muted))",
            paddingLeft: "16px",
          }
        : {};

    return (
      <div key={comment._id} style={indentStyle}>
        <CommentItem
          comment={comment}
          depth={depth}
          maxDepth={MAX_DEPTH}
          onReply={(commentId, userName) => {
            setReplyingTo({ commentId, userName });
          }}
        >
          {replies.length > 0 &&
            replies.map((reply) => renderComment(reply, depth + 1))}
        </CommentItem>
      </div>
    );
  };

  // Get top-level comments (no parent)
  const topLevelComments = buildCommentTree(undefined, 0);

  return (
    <div className="space-y-4">
      {topLevelComments.map((comment) => renderComment(comment, 0))}
      <div className="border-t pt-4">
        <CommentForm
          insightCategory={insightCategory}
          insightId={insightId}
          onCancelReply={() => setReplyingTo(null)}
          organizationId={organizationId}
          playerIdentityId={playerIdentityId}
          replyingTo={replyingTo}
          teamId={teamId}
        />
      </div>
    </div>
  );
}
