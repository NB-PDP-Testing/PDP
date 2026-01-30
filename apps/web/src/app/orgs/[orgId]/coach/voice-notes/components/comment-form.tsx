"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";

interface CommentFormProps {
  insightId: Id<"voiceNoteInsights">;
  organizationId: string;
}

export function CommentForm({ insightId, organizationId }: CommentFormProps) {
  const user = useCurrentUser();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addComment = useMutation(api.models.teamCollaboration.addComment);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

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
      });

      // Clear form on success
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      toast.success("Comment posted successfully");
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Textarea
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        ref={textareaRef}
        value={content}
      />
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
  );
}
