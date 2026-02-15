"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ImportDetailsDialogProps = {
  sessionId: Id<"importSessions"> | null;
  onClose: () => void;
};

export function ImportDetailsDialog({
  sessionId,
  onClose,
}: ImportDetailsDialogProps) {
  const session = useQuery(
    api.models.importSessions.getSession,
    sessionId ? { sessionId } : "skip"
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

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && session && (
              <>
                {/* Import Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Import Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Import ID:</span>
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                        {session._id}
                      </code>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Started by:</span>
                      <span className="font-medium">{session.initiatedBy}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="text-muted-foreground">Started at:</span>
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
                                              : guardianConf.level === "medium"
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
              </>
            )}
          </div>
        </ScrollArea>

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
