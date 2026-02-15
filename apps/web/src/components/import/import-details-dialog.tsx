"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ImportDetailsDialogProps = {
  sessionId: Id<"importSessions"> | null;
  onClose: () => void;
};

export function ImportDetailsDialog({
  sessionId,
  onClose,
}: ImportDetailsDialogProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const session = useQuery(
    api.models.importSessions.getSession,
    sessionId ? { sessionId } : "skip"
  );

  const playersDetailed = useQuery(
    api.models.playerImport.getImportSessionPlayersDetailed,
    sessionId ? { sessionId } : "skip"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "dob" | "status" | null>(
    null
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 50;

  const handleSort = (field: "name" | "dob" | "status") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedPlayers = useMemo(() => {
    if (!playersDetailed) {
      return [];
    }

    let filtered = playersDetailed;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
          p.guardianName?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let compareValue = 0;

        if (sortField === "name") {
          const aName = `${a.firstName} ${a.lastName}`;
          const bName = `${b.firstName} ${b.lastName}`;
          compareValue = aName.localeCompare(bName);
        } else if (sortField === "dob") {
          compareValue = a.dateOfBirth.localeCompare(b.dateOfBirth);
        } else if (sortField === "status") {
          compareValue = a.enrollmentStatus.localeCompare(b.enrollmentStatus);
        }

        return sortDirection === "asc" ? compareValue : -compareValue;
      });
    }

    return filtered;
  }, [playersDetailed, searchQuery, sortField, sortDirection]);

  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    return filteredAndSortedPlayers.slice(startIndex, endIndex);
  }, [filteredAndSortedPlayers, currentPage]);

  const totalPages = Math.ceil(
    filteredAndSortedPlayers.length / playersPerPage
  );

  const handleExportDetails = () => {
    if (!session) {
      return;
    }

    const exportData = {
      importId: session._id,
      startedAt: new Date(session.startedAt).toISOString(),
      completedAt: session.completedAt
        ? new Date(session.completedAt).toISOString()
        : null,
      status: session.status,
      sourceInfo: session.sourceInfo,
      stats: session.stats,
      errors: session.errors,
      duplicates: session.duplicates,
      initiatedBy: session.initiatedBy,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-${session._id}-details.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Import details exported");
  };

  const duration = useMemo(() => {
    if (!session?.completedAt) {
      return null;
    }
    const durationMs = session.completedAt - session.startedAt;
    const minutes = Math.floor(durationMs / 60_000);
    const seconds = Math.floor((durationMs % 60_000) / 1000);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${seconds !== 1 ? "s" : ""}`;
  }, [session]);

  if (!sessionId) {
    return null;
  }

  const isLoading = session === undefined;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={!!sessionId}>
      <DialogContent className="max-h-[90vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Import Details -{" "}
            {session
              ? new Date(session.startedAt).toLocaleString()
              : "Loading..."}
          </DialogTitle>
          <DialogDescription>
            Comprehensive information about this import session
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && session && (
          <Tabs className="flex-1" defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">
                Players ({filteredAndSortedPlayers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ScrollArea className="max-h-[calc(90vh-200px)]">
                <div className="space-y-6 pr-4">
                  {/* Import Metadata */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Import Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                          Import ID:
                        </span>
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                          {session._id}
                        </code>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                          Started by:
                        </span>
                        <span className="font-medium">
                          {session.initiatedBy}
                        </span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                          Started at:
                        </span>
                        <span>
                          {new Date(session.startedAt).toLocaleString()}
                        </span>
                      </div>
                      {session.completedAt && (
                        <>
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-muted-foreground">
                              Completed at:
                            </span>
                            <span>
                              {new Date(session.completedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-muted-foreground">
                              Duration:
                            </span>
                            <span>{duration}</span>
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">Template:</span>
                        <span>
                          {session.templateId ? session.templateId : "Custom"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted-foreground">
                          Source file:
                        </span>
                        <span>
                          {session.sourceInfo.fileName || "Unknown file"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Statistics Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">
                            Total rows processed:
                          </span>
                          <p className="mt-1 font-semibold text-lg">
                            {session.stats.totalRows}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Selected rows:
                          </span>
                          <p className="mt-1 font-semibold text-lg">
                            {session.stats.selectedRows}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Players created:
                          </span>
                          <span className="font-medium">
                            {session.stats.playersCreated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Players updated:
                          </span>
                          <span className="font-medium">
                            {session.stats.playersUpdated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Players skipped:
                          </span>
                          <span className="font-medium">
                            {session.stats.playersSkipped}
                          </span>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Guardians created:
                          </span>
                          <span className="font-medium">
                            {session.stats.guardiansCreated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Guardians linked:
                          </span>
                          <span className="font-medium">
                            {session.stats.guardiansLinked}
                          </span>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Enrollments created:
                          </span>
                          <span className="font-medium">
                            {session.stats.playersCreated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Sport passports:
                          </span>
                          <span className="font-medium">
                            {session.stats.passportsCreated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Benchmarks applied:
                          </span>
                          <span className="font-medium">
                            {session.stats.benchmarksApplied}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Errors Section */}
                  {session.errors.length > 0 && (
                    <Card className="border-destructive/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <XCircle className="h-4 w-4 text-destructive" />
                            Errors
                          </CardTitle>
                          <Badge variant="destructive">
                            {session.errors.length} error
                            {session.errors.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {session.errors.map((error) => (
                              <div
                                className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
                                key={`error-${error.rowNumber}-${error.field}`}
                              >
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                  <div className="flex-1">
                                    <p className="font-medium">
                                      Row {error.rowNumber}: {error.field}
                                    </p>
                                    <p className="mt-1 text-muted-foreground text-xs">
                                      {error.error}
                                    </p>
                                    {error.value && (
                                      <code className="mt-1 block rounded bg-muted px-2 py-1 font-mono text-xs">
                                        Value: {error.value}
                                      </code>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Duplicates Section */}
                  {session.duplicates.length > 0 && (
                    <Card className="border-yellow-500/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4 text-yellow-600" />
                            Duplicate Guardians
                          </CardTitle>
                          <Badge className="bg-yellow-500 text-black">
                            {session.duplicates.length} duplicate
                            {session.duplicates.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-3">
                            {session.duplicates.map((duplicate) => {
                              const guardianConf = (
                                duplicate as {
                                  guardianConfidence?: {
                                    score: number;
                                    level: "high" | "medium" | "low";
                                    matchReasons: string[];
                                  };
                                }
                              ).guardianConfidence;

                              return (
                                <div
                                  className="rounded-md border border-yellow-500/30 bg-yellow-50 p-3 dark:bg-yellow-950/20"
                                  key={`duplicate-${duplicate.rowNumber}-${duplicate.existingPlayerId}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 text-sm">
                                      <p className="font-medium">
                                        Row {duplicate.rowNumber}
                                      </p>
                                      <p className="mt-1 text-muted-foreground text-xs">
                                        Resolution:{" "}
                                        <span className="capitalize">
                                          {duplicate.resolution}
                                        </span>
                                      </p>
                                      {guardianConf && (
                                        <div className="mt-2 flex items-center gap-2">
                                          <Badge
                                            variant={
                                              guardianConf.level === "high"
                                                ? "default"
                                                : guardianConf.level ===
                                                    "medium"
                                                  ? "secondary"
                                                  : "outline"
                                            }
                                          >
                                            {guardianConf.level} confidence (
                                            {guardianConf.score}%)
                                          </Badge>
                                        </div>
                                      )}
                                      {guardianConf?.matchReasons && (
                                        <ul className="mt-2 space-y-1 text-xs">
                                          {guardianConf.matchReasons.map(
                                            (reason: string) => (
                                              <li
                                                className="flex items-center gap-1"
                                                key={reason}
                                              >
                                                <CheckCircle className="h-3 w-3 text-green-600" />
                                                {reason}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="players">
              <div className="space-y-4">
                {/* Search input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search players or guardians..."
                      value={searchQuery}
                    />
                  </div>
                </div>

                {/* Result count */}
                <div className="text-muted-foreground text-sm">
                  Showing {filteredAndSortedPlayers.length} of{" "}
                  {playersDetailed?.length || 0} players
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <ScrollArea className="max-h-[calc(90vh-300px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button
                              className="h-auto p-0 font-medium hover:bg-transparent"
                              onClick={() => handleSort("name")}
                              variant="ghost"
                            >
                              Name
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              className="h-auto p-0 font-medium hover:bg-transparent"
                              onClick={() => handleSort("dob")}
                              variant="ghost"
                            >
                              DOB
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Guardian</TableHead>
                          <TableHead>
                            <Button
                              className="h-auto p-0 font-medium hover:bg-transparent"
                              onClick={() => handleSort("status")}
                              variant="ghost"
                            >
                              Status
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>Teams</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPlayers.length === 0 ? (
                          <TableRow>
                            <TableCell className="text-center" colSpan={6}>
                              No players in this import
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedPlayers.map((player) => (
                            <TableRow key={player._id}>
                              <TableCell>
                                <Link
                                  className="font-medium hover:underline"
                                  href={`/orgs/${orgId}/players/${player._id}`}
                                >
                                  {player.firstName} {player.lastName}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  player.dateOfBirth
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="capitalize">
                                {player.gender}
                              </TableCell>
                              <TableCell>
                                {player.guardianName || "No Guardian"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    player.enrollmentStatus === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {player.enrollmentStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {player.teamCount > 0 ? (
                                  <Badge variant="outline">
                                    {player.teamCount} team
                                    {player.teamCount !== 1 ? "s" : ""}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    No teams
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden">
                  <ScrollArea className="max-h-[calc(90vh-300px)]">
                    <div className="space-y-3">
                      {paginatedPlayers.length === 0 ? (
                        <div className="rounded-md border p-8 text-center">
                          <p className="text-muted-foreground">
                            No players in this import
                          </p>
                        </div>
                      ) : (
                        paginatedPlayers.map((player) => (
                          <Link
                            href={`/orgs/${orgId}/players/${player._id}`}
                            key={player._id}
                          >
                            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {player.firstName} {player.lastName}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      DOB:{" "}
                                      {new Date(
                                        player.dateOfBirth
                                      ).toLocaleDateString()}
                                    </p>
                                    <p className="text-muted-foreground text-xs capitalize">
                                      {player.gender}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      Guardian:{" "}
                                      {player.guardianName || "No Guardian"}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge
                                      variant={
                                        player.enrollmentStatus === "active"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {player.enrollmentStatus}
                                    </Badge>
                                    {player.teamCount > 0 && (
                                      <Badge variant="outline">
                                        {player.teamCount} team
                                        {player.teamCount !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-muted-foreground text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        size="sm"
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        size="sm"
                        variant="outline"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-between border-t pt-4">
          <Button onClick={handleExportDetails} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Details
          </Button>
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
