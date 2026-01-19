"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CoachMessagesPage() {
  const params = useParams();
  const orgId = params.orgId as BetterAuthId<"organization">;

  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );

  // Fetch messages from backend
  const messages = useQuery(api.models.coachParentMessages.getMyMessages, {
    organizationId: orgId,
    status: statusFilter,
    limit: 50,
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "sent":
        return <Badge variant="default">Sent</Badge>;
      case "delivered":
        return <Badge className="bg-green-500">Delivered</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Messages</h1>
          <p className="text-muted-foreground">
            View and manage messages sent to parents
          </p>
        </div>
        <Button asChild>
          <Link href={`/orgs/${orgId as string}/coach/messages/compose`}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Link>
        </Button>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <Select
          onValueChange={(value) =>
            setStatusFilter(value === "all" ? undefined : value)
          }
          value={statusFilter || "all"}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
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
              Start sending messages to parents about their children's
              development.
            </EmptyDescription>
          </EmptyContent>
          <Button asChild>
            <Link href={`/orgs/${orgId as string}/coach/messages/compose`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Message
            </Link>
          </Button>
        </Empty>
      )}

      {messages && messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((message) => (
            <Link
              href={`/orgs/${orgId as string}/coach/messages/${message._id as string}`}
              key={message._id}
            >
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {message.subject}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        To parents of {message.playerName}
                      </CardDescription>
                    </div>
                    {getStatusBadge(message.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-muted-foreground text-sm">
                    <div className="flex items-center gap-4">
                      <span>{formatDate(message.createdAt)}</span>
                      <span>
                        {message.recipientCount}{" "}
                        {message.recipientCount === 1
                          ? "recipient"
                          : "recipients"}
                      </span>
                      {message.viewedCount > 0 && (
                        <span className="text-green-600">
                          {message.viewedCount} viewed
                        </span>
                      )}
                    </div>
                    {message.priority === "high" && (
                      <Badge variant="destructive">High Priority</Badge>
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
