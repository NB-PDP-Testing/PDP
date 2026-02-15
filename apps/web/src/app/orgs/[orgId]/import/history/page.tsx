"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Undo2,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/loader";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatusFilter = "all" | "success" | "partial" | "failed";
type DateRangeFilter = "7days" | "30days" | "all";

export default function ImportHistoryPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] =
    useState<DateRangeFilter>("30days");
  const [currentPage, setCurrentPage] = useState(0);

  const pageSize = 20;

  // Fetch import history
  const historyData = useQuery(api.models.importAnalytics.getOrgImportHistory, {
    organizationId: orgId as any,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  // Filter imports by status and date range
  const filteredImports = historyData?.imports.filter((imp) => {
    // Status filter
    if (
      statusFilter === "success" &&
      (imp.status !== "completed" || imp.errors.length > 0)
    ) {
      return false;
    }
    if (
      statusFilter === "partial" &&
      (imp.status !== "completed" || imp.errors.length === 0)
    ) {
      return false;
    }
    if (statusFilter === "failed" && imp.status !== "failed") {
      return false;
    }

    // Date range filter
    if (dateRangeFilter !== "all") {
      const now = Date.now();
      const cutoff =
        dateRangeFilter === "7days"
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;
      if (imp._creationTime < cutoff) {
        return false;
      }
    }

    return true;
  });

  const getStatusBadge = (
    status: string,
    errors: string[]
  ): { variant: "default" | "destructive" | "secondary"; label: string } => {
    if (status === "failed") {
      return { variant: "destructive", label: "Failed" };
    }
    if (status === "completed" && errors.length === 0) {
      return { variant: "default", label: "Success" };
    }
    return { variant: "secondary", label: "Partial" };
  };

  if (!historyData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  const totalPages = Math.ceil((historyData.totalCount || 0) / pageSize);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Import History</h1>
          <p className="text-muted-foreground">
            View and manage all player imports for your organization
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Select
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              value={statusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                setDateRangeFilter(value as DateRangeFilter)
              }
              value={dateRangeFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{historyData.successCount} Success</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span>{historyData.failureCount} Failed</span>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>
              {filteredImports && filteredImports.length > 0
                ? `Showing ${filteredImports.length} of ${historyData.totalCount} imports`
                : "No imports found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredImports && filteredImports.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Imported By</TableHead>
                        <TableHead className="text-right">Players</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredImports.map((imp) => {
                        const statusBadge = getStatusBadge(
                          imp.status,
                          imp.errors
                        );
                        return (
                          <TableRow key={imp._id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {new Date(imp._creationTime).toLocaleString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {imp.importedBy?.name ||
                                imp.importedBy?.email ||
                                "Unknown"}
                            </TableCell>
                            <TableCell className="text-right">
                              {imp.playersImported}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {imp.templateUsed || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button disabled size="sm" variant="outline">
                                  <FileText className="mr-1 h-3 w-3" />
                                  Details
                                </Button>
                                <Button disabled size="sm" variant="outline">
                                  <Undo2 className="mr-1 h-3 w-3" />
                                  Undo
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Page {currentPage + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        size="sm"
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        size="sm"
                        variant="outline"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">
                  No imports found
                </p>
                <p className="text-muted-foreground text-sm">
                  Try adjusting your filters or create a new import
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Card View */}
        <div className="space-y-4 sm:hidden">
          {filteredImports && filteredImports.length > 0 ? (
            filteredImports.map((imp) => {
              const statusBadge = getStatusBadge(imp.status, imp.errors);
              return (
                <Card key={imp._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {imp.playersImported} Players
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {new Date(imp._creationTime).toLocaleString()}
                          </div>
                        </CardDescription>
                      </div>
                      <Badge variant={statusBadge.variant}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Imported by:
                        </span>
                        <span className="font-medium">
                          {imp.importedBy?.name ||
                            imp.importedBy?.email ||
                            "Unknown"}
                        </span>
                      </div>
                      {imp.templateUsed && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Template:
                          </span>
                          <span className="font-medium">
                            {imp.templateUsed}
                          </span>
                        </div>
                      )}
                      {imp.errors.length > 0 && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          <span className="text-destructive text-xs">
                            {imp.errors.length} error
                            {imp.errors.length !== 1 ? "s" : ""} occurred
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled
                        size="sm"
                        variant="outline"
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        Details
                      </Button>
                      <Button
                        className="flex-1"
                        disabled
                        size="sm"
                        variant="outline"
                      >
                        <Undo2 className="mr-1 h-3 w-3" />
                        Undo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">
                  No imports found
                </p>
                <p className="text-muted-foreground text-sm">
                  Try adjusting your filters or create a new import
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
