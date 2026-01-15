"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AccessAuditLogProps = {
  playerIdentityId: Id<"playerIdentities">;
  childName: string;
};

const PAGE_SIZE = 20;

export function AccessAuditLog({
  playerIdentityId,
  childName,
}: AccessAuditLogProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch access logs with pagination
  const logsData = useQuery(api.models.passportSharing.getAccessLogsForPlayer, {
    playerIdentityId,
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
  });

  // Format timestamp to readable date
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Format access type for display
  const formatAccessType = (accessType: string) =>
    accessType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (logsData?.hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (!logsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Access Audit Log - {childName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Loading access logs...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Access Audit Log - {childName}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          View who has accessed your child&apos;s shared passport data
        </p>
      </CardHeader>
      <CardContent>
        {logsData.total === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No access logs found. Access will be logged once someone views
              shared data.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>What</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-mono text-xs">
                        {formatDate(log.accessedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {log.accessedByName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {log.accessedByRole}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{log.accessedByOrgName}</TableCell>
                      <TableCell>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs">
                          {formatAccessType(log.accessType)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Showing {currentPage * PAGE_SIZE + 1} to{" "}
                {Math.min((currentPage + 1) * PAGE_SIZE, logsData.total)} of{" "}
                {logsData.total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={currentPage === 0}
                  onClick={handlePrevPage}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  disabled={!logsData.hasMore}
                  onClick={handleNextPage}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
