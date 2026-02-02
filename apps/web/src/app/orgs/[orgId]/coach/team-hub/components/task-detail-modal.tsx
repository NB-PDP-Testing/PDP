"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Mic,
  MoreVertical,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    _id: Id<"coachTasks">;
    text: string;
    status?: "open" | "in-progress" | "done";
    priority?: "low" | "medium" | "high";
    dueDate?: number;
    assignedToName?: string;
    voiceNoteId?: Id<"voiceNotes">;
    playerName?: string;
    createdAt: number;
    completedAt?: number;
  };
  currentUserId: string;
  currentUserName: string;
  organizationId: string;
};

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  currentUserId,
  currentUserName,
  organizationId,
}: TaskDetailModalProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTaskStatus = useMutation(api.models.coachTasks.updateTaskStatus);
  const deleteTask = useMutation(api.models.coachTasks.deleteTask);

  const handleStatusChange = async (
    newStatus: "open" | "in-progress" | "done"
  ) => {
    setIsUpdating(true);
    try {
      await updateTaskStatus({
        taskId: task._id,
        status: newStatus,
        actorId: currentUserId,
        actorName: currentUserName,
      });
      toast.success("Task status updated");
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ taskId: task._id });
      toast.success("Task deleted");
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task. Please try again.");
    }
  };

  const handleViewVoiceNote = () => {
    if (task.voiceNoteId) {
      onOpenChange(false);
      router.push(
        `/orgs/${organizationId}/coach/voice-notes?highlight=${task.voiceNoteId}`
      );
    }
  };

  // Calculate if task is overdue
  const isOverdue =
    task.status !== "done" && task.dueDate && task.dueDate < Date.now();

  // Priority badge colors
  const priorityVariants = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  } as const;

  const currentStatus = task.status || "open";

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <DialogTitle className="text-xl">{task.text}</DialogTitle>
                <DialogDescription>
                  Created{" "}
                  {formatDistanceToNow(task.createdAt, { addSuffix: true })}
                </DialogDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Update */}
            <div>
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="task-status"
              >
                Status
              </label>
              <Select
                disabled={isUpdating}
                onValueChange={(value) =>
                  handleStatusChange(value as "open" | "in-progress" | "done")
                }
                value={currentStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Open
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="done">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Done
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Task Details */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Priority</span>
                <Badge variant={priorityVariants[task.priority || "medium"]}>
                  {task.priority || "medium"}
                </Badge>
              </div>

              {task.assignedToName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Assigned To
                  </span>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.assignedToName}</span>
                  </div>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Due Date
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    {isOverdue && (
                      <Badge className="ml-2" variant="destructive">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {task.playerName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Related Player
                  </span>
                  <span className="text-sm">{task.playerName}</span>
                </div>
              )}

              {task.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Completed
                  </span>
                  <span className="text-sm">
                    {formatDistanceToNow(task.completedAt, { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>

            {/* Voice Note Link */}
            {task.voiceNoteId && (
              <Button
                className="w-full"
                onClick={handleViewVoiceNote}
                variant="outline"
              >
                <Mic className="mr-2 h-4 w-4" />
                View Source Voice Note
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              task "{task.text}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
