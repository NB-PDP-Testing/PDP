"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ParentMessagesPage() {
  const params = useParams();
  const orgId = params.orgId as BetterAuthId<"organization">;

  const [unreadOnly, setUnreadOnly] = useState(false);

  // Fetch messages from backend
  const messages = useQuery(
    api.models.coachParentMessages.getMessagesForParent,
    {
      organizationId: orgId,
      unreadOnly,
      limit: 50,
    }
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Messages</h1>
          <p className="text-muted-foreground">
            View messages from coaches about your children
          </p>
        </div>
      </div>

      {/* Unread Filter */}
      <div className="mb-6">
        <Button
          onClick={() => setUnreadOnly(!unreadOnly)}
          variant={unreadOnly ? "default" : "outline"}
        >
          {unreadOnly ? "Show All Messages" : "Show Unread Only"}
        </Button>
      </div>

      {/* Messages List */}
      {messages === undefined && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      )}

      {messages?.length === 0 && (
        <Empty>
          <EmptyMedia>
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No messages yet</EmptyTitle>
            <EmptyDescription>
              Coaches will send updates about your children here.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {messages && messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((item) => (
            <Link
              href={
                `/orgs/${orgId as string}/parents/messages/${item.message._id as string}` as Route
              }
              key={item.message._id}
            >
              <Card
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  item.isUnread ? "border-l-4 border-l-blue-500 shadow-md" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      {item.isUnread && (
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {item.message.subject}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          From {item.message.senderName} about{" "}
                          {item.message.playerName}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-muted-foreground text-sm">
                    <span>{formatDate(item.message.createdAt)}</span>
                    {item.recipient.acknowledgedAt && (
                      <span className="text-green-600">Acknowledged</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
