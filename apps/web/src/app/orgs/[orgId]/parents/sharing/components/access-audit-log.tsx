"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type AccessAuditLogProps = {
  playerIdentityId: Id<"playerIdentities">;
  childName: string;
};

const PAGE_SIZE = 20;

const ACCESS_TYPES = [
  { value: "all", label: "All Types" },
  { value: "view_summary", label: "View Summary" },
  { value: "view_skills", label: "View Skills" },
  { value: "view_goals", label: "View Goals" },
  { value: "view_notes", label: "View Notes" },
  { value: "view_medical", label: "View Medical" },
  { value: "view_contact", label: "View Contact" },
  { value: "export_pdf", label: "Export PDF" },
  { value: "view_insights", label: "View Insights" },
];

export function AccessAuditLog({
  playerIdentityId,
  childName,
}: AccessAuditLogProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [accessTypeFilter, setAccessTypeFilter] = useState("all");

  // Fetch access logs with pagination (fetch more than needed for client-side filtering)
  const logsData = useQuery(api.models.passportSharing.getAccessLogsForPlayer, {
    playerIdentityId,
    limit: 1000, // Fetch large set for client-side filtering
    offset: 0,
  });

  // Get unique organizations from logs
  const organizations = useMemo(() => {
    if (!logsData) {
      return [];
    }
    const orgs = new Set(logsData.logs.map((log) => log.accessedByOrgName));
    return Array.from(orgs).sort();
  }, [logsData]);

  // Apply filters to logs
  const filteredLogs = useMemo(() => {
    if (!logsData) {
      return [];
    }

    let filtered = logsData.logs;

    // Date range filter
    if (dateFrom) {
      const fromTimestamp = new Date(dateFrom).getTime();
      filtered = filtered.filter((log) => log.accessedAt >= fromTimestamp);
    }
    if (dateTo) {
      const toTimestamp = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => log.accessedAt <= toTimestamp);
    }

    // Organization filter
    if (organizationFilter !== "all") {
      filtered = filtered.filter(
        (log) => log.accessedByOrgName === organizationFilter
      );
    }

    // Access type filter
    if (accessTypeFilter !== "all") {
      filtered = filtered.filter((log) => log.accessType === accessTypeFilter);
    }

    return filtered;
  }, [logsData, dateFrom, dateTo, organizationFilter, accessTypeFilter]);

  // Paginate filtered logs
  const paginatedLogs = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentPage]);

  const totalFiltered = filteredLogs.length;
  const hasMore = currentPage * PAGE_SIZE + PAGE_SIZE < totalFiltered;

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
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(0);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      return;
    }

    // Create CSV header
    const headers = ["Date & Time", "Name", "Role", "Organization", "What"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log) =>
        [
          formatDate(log.accessedAt),
          `"${log.accessedByName}"`,
          `"${log.accessedByRole}"`,
          `"${log.accessedByOrgName}"`,
          `"${formatAccessType(log.accessType)}"`,
        ].join(",")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `access-audit-log-${childName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Access Audit Log - {childName}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              View who has accessed your child&apos;s shared passport data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button
              disabled={filteredLogs.length === 0}
              onClick={handleExportCSV}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters panel */}
        {showFilters && (
          <div className="mb-4 rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold text-sm">Filter Access Logs</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs" htmlFor="date-from">
                  From Date
                </Label>
                <Input
                  id="date-from"
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    handleFilterChange();
                  }}
                  type="date"
                  value={dateFrom}
                />
              </div>
              <div>
                <Label className="text-xs" htmlFor="date-to">
                  To Date
                </Label>
                <Input
                  id="date-to"
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    handleFilterChange();
                  }}
                  type="date"
                  value={dateTo}
                />
              </div>
              <div>
                <Label className="text-xs" htmlFor="organization">
                  Organization
                </Label>
                <Select
                  onValueChange={(value) => {
                    setOrganizationFilter(value);
                    handleFilterChange();
                  }}
                  value={organizationFilter}
                >
                  <SelectTrigger id="organization">
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org} value={org}>
                        {org}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs" htmlFor="access-type">
                  Access Type
                </Label>
                <Select
                  onValueChange={(value) => {
                    setAccessTypeFilter(value);
                    handleFilterChange();
                  }}
                  value={accessTypeFilter}
                >
                  <SelectTrigger id="access-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <Button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setOrganizationFilter("all");
                  setAccessTypeFilter("all");
                  handleFilterChange();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {totalFiltered === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {logsData.total === 0
                ? "No access logs found. Access will be logged once someone views shared data."
                : "No logs match the selected filters. Try adjusting your filter criteria."}
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
                  {paginatedLogs.map((log) => (
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
                {Math.min((currentPage + 1) * PAGE_SIZE, totalFiltered)} of{" "}
                {totalFiltered} entries
                {totalFiltered !== logsData.total && (
                  <span className="ml-1">
                    (filtered from {logsData.total} total)
                  </span>
                )}
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
                  disabled={!hasMore}
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
