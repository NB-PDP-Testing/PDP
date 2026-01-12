"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Eye } from "lucide-react";
import type { Route } from "next";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type AuditEntry = {
  _id: Id<"messageAuditLog">;
  messageId: Id<"coachParentMessages">;
  organizationId: string;
  action:
    | "created"
    | "edited"
    | "sent"
    | "viewed"
    | "acknowledged"
    | "deleted"
    | "exported"
    | "flagged"
    | "reviewed";
  actorId: string;
  actorType: "coach" | "parent" | "admin" | "system";
  actorName: string;
  details?: {
    previousContent?: string;
    newContent?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  timestamp: number;
};

export default function AuditLogPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const auditLog = useQuery(api.models.coachParentMessages.getMessageAuditLog, {
    organizationId: orgId,
  });

  const isLoading = auditLog === undefined;

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return <Badge variant="outline">Created</Badge>;
      case "sent":
        return <Badge variant="default">Sent</Badge>;
      case "viewed":
        return <Badge className="bg-blue-500 text-white">Viewed</Badge>;
      case "acknowledged":
        return <Badge className="bg-green-500 text-white">Acknowledged</Badge>;
      case "edited":
        return <Badge className="bg-yellow-500 text-white">Edited</Badge>;
      case "deleted":
        return <Badge variant="destructive">Deleted</Badge>;
      case "flagged":
        return <Badge variant="destructive">Flagged</Badge>;
      case "reviewed":
        return <Badge className="bg-purple-500 text-white">Reviewed</Badge>;
      case "exported":
        return <Badge variant="outline">Exported</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getActorTypeBadge = (actorType: string) => {
    switch (actorType) {
      case "coach":
        return <Badge variant="default">Coach</Badge>;
      case "parent":
        return <Badge className="bg-blue-500 text-white">Parent</Badge>;
      case "admin":
        return <Badge className="bg-purple-500 text-white">Admin</Badge>;
      case "system":
        return <Badge variant="outline">System</Badge>;
      default:
        return <Badge variant="outline">{actorType}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/orgs/${orgId}/admin/messaging` as Route}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="mt-2 font-bold text-3xl tracking-tight">
            Message Audit Log
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete audit trail of all messaging activity
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            All message-related actions tracked for compliance
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

            if (auditLog.length === 0) {
              return (
                <Empty>
                  <EmptyMedia>
                    <Eye className="h-12 w-12 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyContent>
                    <EmptyTitle>No audit entries yet</EmptyTitle>
                    <EmptyDescription>
                      Audit trail will appear here as messages are sent and
                      viewed.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              );
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Actor Type</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      key={entry._id}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell className="font-mono text-sm">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell>{getActionBadge(entry.action)}</TableCell>
                      <TableCell className="font-medium">
                        {entry.actorName}
                      </TableCell>
                      <TableCell>
                        {getActorTypeBadge(entry.actorType)}
                      </TableCell>
                      <TableCell>
                        {entry.details && (
                          <Button size="sm" variant="outline">
                            <Eye className="mr-2 h-3 w-3" />
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
          }
        }}
        open={selectedEntry !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              Full details of this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm">Timestamp</p>
                <p className="font-mono text-muted-foreground text-sm">
                  {formatTimestamp(selectedEntry.timestamp)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm">Action</p>
                <div className="mt-1">
                  {getActionBadge(selectedEntry.action)}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Actor</p>
                <p className="text-sm">{selectedEntry.actorName}</p>
                <div className="mt-1">
                  {getActorTypeBadge(selectedEntry.actorType)}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Actor ID</p>
                <p className="font-mono text-muted-foreground text-xs">
                  {selectedEntry.actorId}
                </p>
              </div>
              <div>
                <p className="font-semibold text-sm">Message ID</p>
                <p className="font-mono text-muted-foreground text-xs">
                  {selectedEntry.messageId}
                </p>
              </div>
              {selectedEntry.details && (
                <div>
                  <p className="font-semibold text-sm">Additional Details</p>
                  <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
                    {selectedEntry.details.reason && (
                      <div>
                        <p className="font-medium text-xs">Reason:</p>
                        <p className="text-muted-foreground text-xs">
                          {selectedEntry.details.reason}
                        </p>
                      </div>
                    )}
                    {selectedEntry.details.previousContent && (
                      <div>
                        <p className="font-medium text-xs">Previous Content:</p>
                        <p className="text-muted-foreground text-xs">
                          {selectedEntry.details.previousContent}
                        </p>
                      </div>
                    )}
                    {selectedEntry.details.newContent && (
                      <div>
                        <p className="font-medium text-xs">New Content:</p>
                        <p className="text-muted-foreground text-xs">
                          {selectedEntry.details.newContent}
                        </p>
                      </div>
                    )}
                    {selectedEntry.details.ipAddress && (
                      <div>
                        <p className="font-medium text-xs">IP Address:</p>
                        <p className="font-mono text-muted-foreground text-xs">
                          {selectedEntry.details.ipAddress}
                        </p>
                      </div>
                    )}
                    {selectedEntry.details.userAgent && (
                      <div>
                        <p className="font-medium text-xs">User Agent:</p>
                        <p className="font-mono text-muted-foreground text-xs">
                          {selectedEntry.details.userAgent}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
