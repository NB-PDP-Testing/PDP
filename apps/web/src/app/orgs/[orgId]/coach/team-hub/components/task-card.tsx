"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertCircle,
  CheckCircle,
  Circle,
  Clock,
  Mic,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TaskStatus = "open" | "in-progress" | "done";
type TaskPriority = "low" | "medium" | "high";

type TaskCardProps = {
  taskId: Id<"coachTasks">;
  text: string;
  status: TaskStatus | undefined;
  priority: TaskPriority | undefined;
  dueDate: number | undefined;
  assignedToName: string | undefined;
  playerName: string | undefined;
  voiceNoteId: Id<"voiceNotes"> | undefined;
  onTaskClick: (taskId: Id<"coachTasks">) => void;
};

/**
 * Task card for Tasks Tab
 * Shows task details, status, priority, assignee, due date
 * Click to open task detail modal
 */
export function TaskCard({
  taskId,
  text,
  status = "open",
  priority = "medium",
  dueDate,
  assignedToName,
  playerName,
  voiceNoteId,
  onTaskClick,
}: TaskCardProps) {
  const now = Date.now();
  const isOverdue = dueDate && dueDate < now && status !== "done";

  // Status config
  const statusConfig = {
    open: {
      icon: Circle,
      label: "Open",
      className: "bg-blue-100 text-blue-700",
    },
    "in-progress": {
      icon: Clock,
      label: "In Progress",
      className: "bg-amber-100 text-amber-700",
    },
    done: {
      icon: CheckCircle,
      label: "Done",
      className: "bg-green-100 text-green-700",
    },
  };

  // Priority config
  const priorityConfig = {
    low: {
      label: "Low",
      variant: "secondary" as const,
      className: "bg-slate-100 text-slate-700",
    },
    medium: {
      label: "Medium",
      variant: "default" as const,
      className: "bg-blue-100 text-blue-700",
    },
    high: {
      label: "High",
      variant: "destructive" as const,
      className: "bg-red-100 text-red-700",
    },
  };

  const StatusIcon = statusConfig[status].icon;
  const statusCfg = statusConfig[status];
  const priorityCfg = priorityConfig[priority];

  // Format due date
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  // Get assignee initials
  const assigneeInitials = assignedToName
    ? assignedToName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Card
      className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
      onClick={() => onTaskClick(taskId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick(taskId);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Assignee Avatar */}
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
              {assigneeInitials}
            </div>
          </div>

          {/* Task Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-semibold text-sm transition-colors group-hover:text-primary">
                  {text}
                </h3>
                {assignedToName && (
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {assignedToName}
                  </p>
                )}
              </div>

              {/* Due date watermark (large, right side) */}
              {dueDateFormatted && (
                <div
                  className={cn(
                    "flex-shrink-0 font-bold text-xl",
                    isOverdue ? "text-red-500/40" : "text-muted-foreground/30"
                  )}
                >
                  {dueDateFormatted}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {/* Status Badge */}
              <Badge
                className={cn("gap-1 text-xs", statusCfg.className)}
                variant="secondary"
              >
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </Badge>

              {/* Priority Badge */}
              <Badge
                className={cn("text-xs", priorityCfg.className)}
                variant={priorityCfg.variant}
              >
                {priorityCfg.label}
              </Badge>

              {/* Overdue Badge */}
              {isOverdue && (
                <Badge
                  className="gap-1 bg-red-100 text-red-700 text-xs"
                  variant="destructive"
                >
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}

              {/* Voice Note Badge */}
              {voiceNoteId && (
                <Badge className="gap-1 text-xs" variant="outline">
                  <Mic className="h-3 w-3" />
                  Voice Note
                </Badge>
              )}

              {/* Player Badge */}
              {playerName && (
                <Badge className="gap-1 text-xs" variant="outline">
                  <User className="h-3 w-3" />
                  {playerName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
