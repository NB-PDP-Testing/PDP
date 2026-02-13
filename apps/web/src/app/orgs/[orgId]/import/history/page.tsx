"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";

type ImportSession = {
  _id: string;
  _creationTime: number;
  organizationId: string;
  status:
    | "uploading"
    | "mapping"
    | "selecting"
    | "reviewing"
    | "importing"
    | "completed"
    | "failed"
    | "cancelled"
    | "undone";
  sourceInfo: {
    type: "file" | "paste" | "api";
    fileName?: string;
    fileSize?: number;
    rowCount: number;
    columnCount: number;
  };
  stats: {
    totalRows: number;
    selectedRows: number;
    validRows: number;
    errorRows: number;
    duplicateRows: number;
    playersCreated: number;
    playersUpdated: number;
    playersSkipped: number;
    guardiansCreated: number;
    guardiansLinked: number;
    teamsCreated: number;
    passportsCreated: number;
    benchmarksApplied: number;
  };
  startedAt: number;
  completedAt?: number;
  undoneAt?: number;
  undoneBy?: string;
  undoReason?: string;
};

export default function ImportHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set()
  );

  // Check if the user has org:admin permission (same pattern as admin/layout.tsx)
  useEffect(() => {
    const checkAccess = async () => {
      try {
        await authClient.organization.setActive({ organizationId: orgId });
        const { data: member } =
          await authClient.organization.getActiveMember();

        if (!member) {
          setHasAccess(false);
          return;
        }

        const functionalRoles = (member as any).functionalRoles || [];
        const hasAdminFunctionalRole = functionalRoles.includes("admin");
        const hasBetterAuthAdminRole =
          member.role === "admin" || member.role === "owner";

        setHasAccess(hasAdminFunctionalRole || hasBetterAuthAdminRole);
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [orgId]);

  // Redirect if no access
  useEffect(() => {
    if (hasAccess === false) {
      router.replace("/orgs");
    }
  }, [hasAccess, router]);

  // Fetch import sessions
  const sessions = useQuery(api.models.importSessions.listSessionsByOrg, {
    organizationId: orgId,
  });

  if (hasAccess === null || !sessions) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground text-sm">
            Loading import history...
          </p>
        </div>
      </div>
    );
  }

  const toggleExpanded = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const getStatusBadge = (
    status: ImportSession["status"]
  ): { variant: "default" | "destructive" | "secondary"; label: string } => {
    switch (status) {
      case "completed":
        return { variant: "default", label: "Completed" };
      case "failed":
        return { variant: "destructive", label: "Failed" };
      case "cancelled":
        return { variant: "secondary", label: "Cancelled" };
      case "undone":
        return { variant: "secondary", label: "Undone" };
      case "importing":
        return { variant: "default", label: "Importing..." };
      default:
        return { variant: "secondary", label: status };
    }
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const isWithin24Hours = (completedAt: number | undefined) => {
    if (!completedAt) {
      return false;
    }
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    return now - completedAt < TWENTY_FOUR_HOURS_MS;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-3xl">Import History</h1>
        <p className="text-muted-foreground">
          View all past player imports and their status
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Rows Imported</TableHead>
              <TableHead className="text-right">Players Created</TableHead>
              <TableHead className="text-right">Guardians Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center" colSpan={8}>
                  <p className="text-muted-foreground">
                    No import history found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const statusBadge = getStatusBadge(session.status);
                const isExpanded = expandedSessions.has(session._id);
                const canUndo =
                  session.status === "completed" &&
                  isWithin24Hours(session.completedAt);

                return (
                  <>
                    <TableRow key={session._id}>
                      <TableCell>
                        <Button
                          onClick={() => toggleExpanded(session._id)}
                          size="sm"
                          variant="ghost"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>{formatDate(session.startedAt)}</TableCell>
                      <TableCell>
                        {session.sourceInfo.fileName || "Manual paste"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {session.stats.totalRows}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.stats.playersCreated}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.stats.guardiansCreated}
                      </TableCell>
                      <TableCell className="text-right">
                        {canUndo && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Undo2 className="mr-2 h-4 w-4" />
                                  Undo
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Undo this import within 24 hours</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell className="bg-muted/50" colSpan={8}>
                          <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
                            <div>
                              <p className="font-medium text-sm">
                                Players Updated
                              </p>
                              <p className="font-bold text-2xl">
                                {session.stats.playersUpdated}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                Guardians Linked
                              </p>
                              <p className="font-bold text-2xl">
                                {session.stats.guardiansLinked}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                Passports Created
                              </p>
                              <p className="font-bold text-2xl">
                                {session.stats.passportsCreated}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                Benchmarks Applied
                              </p>
                              <p className="font-bold text-2xl">
                                {session.stats.benchmarksApplied}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Error Rows</p>
                              <p className="font-bold text-2xl text-destructive">
                                {session.stats.errorRows}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                Duplicate Rows
                              </p>
                              <p className="font-bold text-2xl text-amber-600">
                                {session.stats.duplicateRows}
                              </p>
                            </div>
                            {session.undoneAt && (
                              <>
                                <div className="col-span-2">
                                  <p className="font-medium text-sm">
                                    Undone At
                                  </p>
                                  <p className="text-sm">
                                    {formatDate(session.undoneAt)}
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <p className="font-medium text-sm">
                                    Undo Reason
                                  </p>
                                  <p className="text-sm">
                                    {session.undoReason || "No reason provided"}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No import history found</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => {
            const statusBadge = getStatusBadge(session.status);
            const isExpanded = expandedSessions.has(session._id);
            const canUndo =
              session.status === "completed" &&
              isWithin24Hours(session.completedAt);

            return (
              <Card key={session._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {session.sourceInfo.fileName || "Manual paste"}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {formatDate(session.startedAt)}
                      </p>
                    </div>
                    <Badge variant={statusBadge.variant}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Rows Imported
                        </p>
                        <p className="font-bold text-xl">
                          {session.stats.totalRows}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Players</p>
                        <p className="font-bold text-xl">
                          {session.stats.playersCreated}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Guardians
                        </p>
                        <p className="font-bold text-xl">
                          {session.stats.guardiansCreated}
                        </p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 border-t pt-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Updated</p>
                            <p className="font-medium">
                              {session.stats.playersUpdated}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Linked</p>
                            <p className="font-medium">
                              {session.stats.guardiansLinked}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Passports</p>
                            <p className="font-medium">
                              {session.stats.passportsCreated}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Benchmarks</p>
                            <p className="font-medium">
                              {session.stats.benchmarksApplied}
                            </p>
                          </div>
                        </div>
                        {session.undoneAt && (
                          <div className="mt-2 border-t pt-2">
                            <p className="font-medium text-sm">Undo Details</p>
                            <p className="text-muted-foreground text-xs">
                              {formatDate(session.undoneAt)}
                            </p>
                            <p className="text-sm">
                              {session.undoReason || "No reason provided"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => toggleExpanded(session._id)}
                        size="sm"
                        variant="outline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-2 h-4 w-4" />
                            View Details
                          </>
                        )}
                      </Button>
                      {canUndo && (
                        <Button className="flex-1" size="sm" variant="outline">
                          <Undo2 className="mr-2 h-4 w-4" />
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
