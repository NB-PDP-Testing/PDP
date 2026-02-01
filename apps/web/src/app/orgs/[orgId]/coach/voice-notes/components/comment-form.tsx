"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";

type CommentFormProps = {
  insightId: Id<"voiceNoteInsights">;
  organizationId: string;
  insightCategory?: string; // For smart mention ranking
  playerIdentityId?: Id<"playerIdentities">; // For contextual coach suggestions
  teamId?: string; // For team coach filtering
  replyingTo?: {
    commentId: Id<"insightComments">;
    userName: string;
  } | null;
  onCancelReply?: () => void;
};

type Coach = {
  userId: string;
  name: string;
  avatar?: string;
  role?: string;
  relevanceScore?: number; // For smart mentions
};

export function CommentForm({
  insightId,
  organizationId,
  insightCategory,
  playerIdentityId,
  teamId,
  replyingTo,
  onCancelReply,
}: CommentFormProps) {
  const user = useCurrentUser();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addComment = useMutation(api.models.teamCollaboration.addComment);

  // Fetch coaches for mentions with smart ranking
  // When context (category/player/team) is provided, ranking is contextual
  // When no context, falls back to alphabetical sorting
  const coaches = useQuery(api.models.teamCollaboration.getSmartCoachMentions, {
    organizationId,
    insightCategory,
    playerIdentityId,
    teamId,
  });

  // Filter coaches based on mention query
  const filteredCoaches =
    coaches?.filter((coach: Coach) =>
      coach.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ) || [];

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  // Detect @ typing and show mention dropdown
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    setContent(newContent);
    setCursorPosition(newCursorPosition);

    // Find @ before cursor
    const textBeforeCursor = newContent.slice(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Check if there's no space between @ and cursor
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt);
        setShowMentionDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowMentionDropdown(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown || filteredCoaches.length === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCoaches.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        insertMention(filteredCoaches[selectedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setShowMentionDropdown(false);
        break;
      default:
        break;
    }
  };

  // Insert mention into textarea
  const insertMention = (coach: Coach) => {
    if (!textareaRef.current) {
      return;
    }

    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
      return;
    }

    const mentionText = `@${coach.name}`;
    const newContent = `${content.slice(0, lastAtIndex) + mentionText} ${textAfterCursor}`;
    const newCursorPosition = lastAtIndex + mentionText.length + 1;

    setContent(newContent);
    setShowMentionDropdown(false);
    setMentionQuery("");

    // Restore focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !textareaRef.current?.contains(event.target as Node)
      ) {
        setShowMentionDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(content.trim() && user)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await addComment({
        insightId,
        content: content.trim(),
        userId: user._id,
        organizationId,
        parentCommentId: replyingTo?.commentId,
      });

      // Clear form on success
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Clear reply state if set
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }

      toast.success(
        replyingTo ? "Reply posted successfully" : "Comment posted successfully"
      );
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <form className="space-y-3" onSubmit={handleSubmit}>
        {replyingTo && (
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Replying to{" "}
              <span className="font-medium">@{replyingTo.userName}</span>
            </span>
            {onCancelReply && (
              <Button
                className="h-auto p-0"
                onClick={onCancelReply}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <Textarea
          className="min-h-[80px] resize-none"
          disabled={isSubmitting}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={
            replyingTo
              ? "Write your reply... (type @ to mention a coach)"
              : "Add a comment... (type @ to mention a coach)"
          }
          ref={textareaRef}
          value={content}
        />

        {/* Mention dropdown */}
        {showMentionDropdown && filteredCoaches.length > 0 && (
          <div
            className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border bg-popover p-2 shadow-md"
            ref={dropdownRef}
          >
            <div className="max-h-60 overflow-y-auto">
              {filteredCoaches.map((coach: Coach, index: number) => (
                <button
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  key={coach.userId}
                  onClick={() => insertMention(coach)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  type="button"
                >
                  <Avatar className="size-8">
                    {coach.avatar && (
                      <AvatarImage alt={coach.name} src={coach.avatar} />
                    )}
                    <AvatarFallback className="text-xs">
                      {coach.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{coach.name}</div>
                    {coach.role && (
                      <div className="truncate text-muted-foreground text-xs">
                        {coach.role}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            disabled={!content.trim() || isSubmitting}
            size="sm"
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Comment"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
