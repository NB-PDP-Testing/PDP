"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Eye, MessageSquare, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard, StatCardSkeleton } from "../stat-card";

export default function AdminMessagingPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const messages = useQuery(
    api.models.coachParentMessages.getOrganizationMessages,
    { organizationId: orgId }
  );

  const isLoading = messages === undefined;

  // Calculate stats
  const totalMessages = messages?.length || 0;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const messagesThisWeek =
    messages?.filter((msg) => msg.createdAt > oneWeekAgo).length || 0;

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "sent":
        return <Badge variant="default">Sent</Badge>;
      case "delivered":
        return <Badge className="bg-green-500 text-white">Delivered</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Messaging Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Monitor and review coach-to-parent communication
          </p>
        </div>
        <Button asChild>
          <Link href={`/orgs/${orgId}/admin/messaging/audit` as Route}>
            <Eye className="mr-2 h-4 w-4" />
            View Audit Log
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid auto-rows-min grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              description="All messages sent"
              icon={MessageSquare}
              title="Total Messages"
              value={totalMessages}
              variant="primary"
            />
            <StatCard
              description="Messages in the last 7 days"
              icon={MessageSquare}
              title="Messages This Week"
              value={messagesThisWeek}
              variant="secondary"
            />
            <StatCard
              description="View complete audit trail"
              href={`/orgs/${orgId}/admin/messaging/audit` as Route}
              icon={Eye}
              title="Audit Log"
              value="View"
              variant="tertiary"
            />
          </>
        )}
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>
            All messages sent by coaches to parents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoading) {
              return (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              );
            }

            if (messages.length === 0) {
              return (
                <Empty>
                  <EmptyMedia>
                    <MessageSquare className="h-12 w-12 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyContent>
                    <EmptyTitle>No messages yet</EmptyTitle>
                    <EmptyDescription>
                      Messages sent by coaches will appear here.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              );
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message._id}>
                      <TableCell className="font-medium">
                        {message.senderName}
                      </TableCell>
                      <TableCell>{message.playerName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {message.recipientCount}
                            {message.viewedCount > 0 &&
                              ` (${message.viewedCount} viewed)`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {message.sentAt
                          ? formatDate(message.sentAt)
                          : formatDate(message.createdAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
