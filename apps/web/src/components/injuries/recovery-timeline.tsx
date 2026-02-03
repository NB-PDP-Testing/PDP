"use client";

/**
 * RecoveryTimeline - Visual timeline of recovery progress
 * Phase 2 - Issue #261
 */

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  FileText,
  MessageSquare,
  RefreshCw,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ProgressUpdate {
  _id: Id<"injuryProgressUpdates">;
  injuryId: Id<"playerInjuries">;
  updatedBy: string;
  updatedByName: string;
  updatedByRole: string;
  updateType: string;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
  milestoneId?: string;
  milestoneDescription?: string;
  documentId?: Id<"injuryDocuments">;
  createdAt: number;
}

interface RecoveryTimelineProps {
  updates: ProgressUpdate[];
  injuryDate: string;
  expectedReturn?: string;
  isLoading?: boolean;
}

const UPDATE_TYPE_CONFIG: Record<
  string,
  { icon: typeof MessageSquare; color: string; label: string }
> = {
  progress_note: {
    icon: MessageSquare,
    color: "text-blue-500",
    label: "Progress Note",
  },
  milestone_completed: {
    icon: CheckCircle,
    color: "text-green-500",
    label: "Milestone Completed",
  },
  status_change: {
    icon: RefreshCw,
    color: "text-purple-500",
    label: "Status Changed",
  },
  document_uploaded: {
    icon: FileText,
    color: "text-orange-500",
    label: "Document Uploaded",
  },
  clearance_received: {
    icon: Shield,
    color: "text-green-600",
    label: "Medical Clearance",
  },
  recovery_plan_created: {
    icon: ClipboardList,
    color: "text-indigo-500",
    label: "Recovery Plan Created",
  },
  recovery_plan_updated: {
    icon: ClipboardList,
    color: "text-indigo-500",
    label: "Recovery Plan Updated",
  },
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

export function RecoveryTimeline({
  updates,
  injuryDate,
  expectedReturn,
  isLoading = false,
}: RecoveryTimelineProps) {
  const sortedUpdates = [...updates].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recovery Timeline</CardTitle>
        <CardDescription>
          <span>Injury reported: {formatDate(injuryDate)}</span>
          {expectedReturn && (
            <span className="ml-2">
              | Expected return: {formatDate(expectedReturn)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : sortedUpdates.length === 0 ? (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">No updates yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-0 bottom-0 left-4 w-px bg-border" />

            <ul className="space-y-4">
              {sortedUpdates.map((update) => {
                const config = UPDATE_TYPE_CONFIG[update.updateType] || {
                  icon: MessageSquare,
                  color: "text-gray-500",
                  label: update.updateType,
                };
                const Icon = config.icon;

                return (
                  <li className="relative pl-10" key={update._id}>
                    {/* Timeline dot */}
                    <div
                      className={`absolute top-1 left-2 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background ${config.color.replace("text-", "border-")}`}
                    >
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </div>

                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{config.label}</p>
                          <p className="text-muted-foreground text-xs">
                            by {update.updatedByName} ({update.updatedByRole})
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-muted-foreground text-xs">
                          {formatTimeAgo(update.createdAt)}
                        </span>
                      </div>

                      {update.milestoneDescription && (
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Milestone:</span>{" "}
                          {update.milestoneDescription}
                        </p>
                      )}

                      {update.previousStatus && update.newStatus && (
                        <p className="mt-2 text-sm">
                          <span className="capitalize">
                            {update.previousStatus}
                          </span>
                          {" → "}
                          <span className="font-medium capitalize">
                            {update.newStatus}
                          </span>
                        </p>
                      )}

                      {update.notes && (
                        <p className="mt-2 text-muted-foreground text-sm italic">
                          "{update.notes}"
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}

              {/* Injury start marker */}
              <li className="relative pl-10">
                <div className="absolute top-1 left-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-red-500 bg-red-100">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="font-medium text-red-700 text-sm">
                    Injury Reported
                  </p>
                  <p className="text-red-600 text-xs">
                    {formatDate(injuryDate)}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
