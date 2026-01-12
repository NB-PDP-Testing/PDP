"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function ParentMessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as BetterAuthId<"organization">;
  const messageId = params.messageId as Id<"coachParentMessages">;

  const [acknowledgmentNote, setAcknowledgmentNote] = useState("");
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Fetch message
  const messageData = useQuery(api.models.coachParentMessages.getMessageById, {
    messageId,
  });

  // Mutations
  const markViewed = useMutation(
    api.models.coachParentMessages.markMessageViewed
  );
  const acknowledgeMessage = useMutation(
    api.models.coachParentMessages.acknowledgeMessage
  );

  // Mark as viewed on mount
  useEffect(() => {
    if (messageData?.isUnread) {
      markViewed({ messageId })
        .then(() => {
          // Success - message marked as viewed
        })
        .catch((error) => {
          console.error("Failed to mark message as viewed:", error);
        });
    }
  }, [messageData, messageId, markViewed]);

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await acknowledgeMessage({
        messageId,
        note: acknowledgmentNote || undefined,
      });
      toast.success("Message acknowledged");
      // Navigate back to messages list
      // @ts-expect-error - Route exists but Next.js types haven't regenerated
      router.push(`/orgs/${orgId as string}/parents/messages`);
    } catch (error) {
      console.error("Failed to acknowledge message:", error);
      toast.error("Failed to acknowledge message");
    } finally {
      setIsAcknowledging(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (messageData === undefined) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Loading message...</p>
      </div>
    );
  }

  if (messageData === null) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Message not found</p>
      </div>
    );
  }

  const { message, recipient } = messageData;
  const isAcknowledged = recipient?.acknowledgedAt !== undefined;

  return (
    <div className="container mx-auto py-6">
      {/* Back button */}
      <div className="mb-6">
        <Button asChild variant="ghost">
          {/* @ts-expect-error - Route exists but Next.js types haven't regenerated */}
          <Link href={`/orgs/${orgId as string}/parents/messages`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Messages
          </Link>
        </Button>
      </div>

      {/* Message Content */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="text-2xl">{message.subject}</CardTitle>
          <CardDescription className="mt-2">
            From {message.senderName} about {message.playerName}
          </CardDescription>
          <p className="text-muted-foreground text-sm">
            {formatDate(message.createdAt)}
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Message Body */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>

          {/* Context Info */}
          {message.context && (
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-2 font-semibold text-sm">Session Details</h3>
              <div className="space-y-1 text-muted-foreground text-sm">
                {message.context.sessionType && (
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    {message.context.sessionType}
                  </p>
                )}
                {message.context.sessionDate && (
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(
                      typeof message.context.sessionDate === "number"
                        ? message.context.sessionDate
                        : Date.now()
                    )}
                  </p>
                )}
                {message.context.developmentArea && (
                  <p>
                    <span className="font-medium">Development Area:</span>{" "}
                    {message.context.developmentArea}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Discussion Prompts */}
          {message.discussionPrompts &&
            message.discussionPrompts.length > 0 && (
              <div className="mt-6 rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                <h3 className="mb-3 font-semibold text-purple-900">
                  Discussion Points
                </h3>
                <ul className="space-y-2">
                  {message.discussionPrompts.map((prompt: string) => (
                    <li className="text-purple-800 text-sm" key={prompt}>
                      • {prompt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Action Items */}
          {message.actionItems && message.actionItems.length > 0 && (
            <div className="mt-6 rounded-lg border bg-blue-50 p-4">
              <h3 className="mb-3 font-semibold text-blue-900">Action Items</h3>
              <ul className="space-y-2">
                {message.actionItems.map((item: string) => (
                  <li className="flex items-start gap-2 text-sm" key={item}>
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <span className="text-blue-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acknowledgment Section */}
          <div className="mt-8 border-t pt-6">
            <h3 className="mb-4 font-semibold">Acknowledgment</h3>

            {isAcknowledged ? (
              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      You acknowledged this message
                    </p>
                    <p className="text-green-700 text-sm">
                      {recipient.acknowledgedAt &&
                        formatDate(recipient.acknowledgedAt)}
                    </p>
                    {recipient.acknowledgmentNote && (
                      <p className="mt-2 text-green-800 text-sm">
                        Your note: {recipient.acknowledgmentNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Let the coach know you've read and understood this message.
                  Optionally add a note.
                </p>
                <Textarea
                  onChange={(e) => setAcknowledgmentNote(e.target.value)}
                  placeholder="Optional note for the coach (e.g., 'Thanks for the update!' or 'We'll work on this at home.')"
                  rows={3}
                  value={acknowledgmentNote}
                />
                <Button
                  className="w-full sm:w-auto"
                  disabled={isAcknowledging}
                  onClick={handleAcknowledge}
                >
                  {isAcknowledging ? "Acknowledging..." : "Acknowledge Message"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
