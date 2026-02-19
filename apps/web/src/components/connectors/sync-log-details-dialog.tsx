"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Download, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  syncHistoryId: Id<"syncHistory"> | null;
  isOpen: boolean;
  onClose: () => void;
};

// Helper to format duration
function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt) {
    return "Still running...";
  }
  const durationMs = completedAt - startedAt;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Helper to get status badge variant
function getStatusBadgeVariant(
  status: "completed" | "failed"
): "default" | "destructive" {
  return status === "completed" ? "default" : "destructive";
}

// Helper to get resolution color
function getResolutionColor(
  strategy: string
): "text-green-600" | "text-yellow-600" | "text-red-600" {
  if (strategy === "merge") {
    return "text-yellow-600";
  }
  if (strategy.includes("overwrite")) {
    return "text-red-600";
  }
  return "text-green-600";
}

export function SyncLogDetailsDialog({
  syncHistoryId,
  isOpen,
  onClose,
}: Props) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set()
  );

  // Fetch sync history details
  const syncDetails = useQuery(
    api.models.syncHistory.getSyncHistoryDetails,
    syncHistoryId ? { historyId: syncHistoryId } : "skip"
  );

  // Export sync details as JSON
  const handleExport = () => {
    if (!syncDetails) {
      return;
    }

    const dataStr = JSON.stringify(syncDetails, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sync-details-${syncDetails._id}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Sync details exported successfully");
  };

  // Handle retry sync
  const handleRetry = () => {
    // TODO: Wire up retry mutation when available
    toast.info("Retry functionality coming soon");
  };

  // Toggle conflict expansion
  const toggleConflict = (playerId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId);
    } else {
      newExpanded.add(playerId);
    }
    setExpandedConflicts(newExpanded);
  };

  if (!syncDetails) {
    return (
      <Dialog onOpenChange={onClose} open={isOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sync Details</DialogTitle>
            <DialogDescription>Loading sync details...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Sync Details - {syncDetails.organizationId}</DialogTitle>
          <DialogDescription>
            {format(syncDetails.startedAt, "PPpp")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Sync Metadata */}
            <section>
              <h3 className="mb-3 font-semibold text-lg">Sync Metadata</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Sync ID:</span>
                  <span className="ml-2 font-mono text-xs">
                    {syncDetails._id}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Connector:</span>
                  <span className="ml-2">{syncDetails.connectorId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Organization:</span>
                  <span className="ml-2">{syncDetails.organizationId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sync Type:</span>
                  <span className="ml-2 capitalize">
                    {syncDetails.syncType}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Started:</span>
                  <span className="ml-2">
                    {format(syncDetails.startedAt, "PPpp")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <span className="ml-2">
                    {syncDetails.completedAt
                      ? format(syncDetails.completedAt, "PPpp")
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="ml-2">
                    {formatDuration(
                      syncDetails.startedAt,
                      syncDetails.completedAt
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <Badge
                    className="ml-2"
                    variant={getStatusBadgeVariant(syncDetails.status)}
                  >
                    {syncDetails.status}
                  </Badge>
                </div>
              </div>
            </section>

            {/* Stats Section */}
            <section>
              <h3 className="mb-3 font-semibold text-lg">Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="font-bold text-2xl text-blue-600">
                    {syncDetails.stats.playersCreated}
                  </div>
                  <div className="text-gray-600 text-sm">Players Created</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="font-bold text-2xl text-green-600">
                    {syncDetails.stats.playersUpdated}
                  </div>
                  <div className="text-gray-600 text-sm">Players Updated</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="font-bold text-2xl text-gray-600">
                    {syncDetails.stats.playersProcessed}
                  </div>
                  <div className="text-gray-600 text-sm">Total Processed</div>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3">
                  <div className="font-bold text-2xl text-yellow-600">
                    {syncDetails.stats.conflictsDetected}
                  </div>
                  <div className="text-gray-600 text-sm">
                    Conflicts Detected
                  </div>
                </div>
                <div className="rounded-lg bg-orange-50 p-3">
                  <div className="font-bold text-2xl text-orange-600">
                    {syncDetails.stats.conflictsResolved}
                  </div>
                  <div className="text-gray-600 text-sm">
                    Conflicts Resolved
                  </div>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <div className="font-bold text-2xl text-red-600">
                    {syncDetails.stats.errors}
                  </div>
                  <div className="text-gray-600 text-sm">Errors</div>
                </div>
              </div>
            </section>

            {/* Conflicts Section */}
            {syncDetails.conflictDetails.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-lg">
                  Conflicts ({syncDetails.conflictDetails.length})
                </h3>
                <div className="space-y-2">
                  {syncDetails.conflictDetails.map((conflict) => {
                    const isExpanded = expandedConflicts.has(conflict.playerId);
                    return (
                      <div
                        className="rounded-lg border border-gray-200"
                        key={conflict.playerId}
                      >
                        <button
                          className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50"
                          onClick={() => toggleConflict(conflict.playerId)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {conflict.playerName}
                            </span>
                            <Badge variant="outline">
                              {conflict.conflicts.length} conflicts
                            </Badge>
                          </div>
                          <span className="text-gray-400">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="space-y-2 px-4 pt-2 pb-4">
                            {conflict.conflicts.map((c, idx) => (
                              <div
                                className="rounded bg-gray-50 p-3 text-sm"
                                key={`${c.field}-${idx.toString()}`}
                              >
                                <div className="mb-1 font-semibold">
                                  {c.field}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <div className="text-gray-500">
                                      Federation:
                                    </div>
                                    <div>{c.federationValue || "N/A"}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Local:</div>
                                    <div>{c.localValue || "N/A"}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">
                                      Resolved:
                                    </div>
                                    <div
                                      className={getResolutionColor(c.strategy)}
                                    >
                                      {c.resolvedValue || "N/A"}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1 text-gray-500">
                                  Strategy:{" "}
                                  <span className="font-medium">
                                    {c.strategy}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Errors Section */}
            {syncDetails.errors && syncDetails.errors.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-lg">
                  Errors ({syncDetails.errors.length})
                </h3>
                <ScrollArea className="h-48 rounded-lg border border-gray-200">
                  <div className="space-y-2 p-4">
                    {syncDetails.errors.map((error, idx) => (
                      <div
                        className="border-red-500 border-l-4 bg-red-50 p-3 text-sm"
                        key={idx.toString()}
                      >
                        <div className="font-semibold text-red-700">
                          {error.playerName
                            ? `${error.playerName} (${error.playerId || "unknown"})`
                            : "System Error"}
                        </div>
                        <div className="mt-1 text-red-600">{error.error}</div>
                        <div className="mt-1 text-gray-500 text-xs">
                          {format(error.timestamp, "PPpp")}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex gap-2">
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Details
            </Button>
            {syncDetails.status === "failed" && (
              <Button onClick={handleRetry} size="sm" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Sync
              </Button>
            )}
          </div>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
