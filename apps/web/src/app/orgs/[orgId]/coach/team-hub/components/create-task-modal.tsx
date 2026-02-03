"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Calendar, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CreateTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
};

export function CreateTaskModal({
  open,
  onOpenChange,
  teamId,
  organizationId,
  currentUserId,
  currentUserName,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get coaches assigned to this specific team
  const coaches = useQuery(api.models.coaches.getCoachesForTeam, {
    teamId,
    organizationId,
  });

  const createTask = useMutation(api.models.coachTasks.createTask);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please provide a task title");
      return;
    }

    if (!assigneeUserId) {
      toast.error("Please select an assignee");
      return;
    }

    setIsSubmitting(true);
    try {
      const assignee = coaches?.find(
        (c: { userId: string; name: string }) => c.userId === assigneeUserId
      );

      await createTask({
        text: title.trim(),
        organizationId,
        assignedToUserId: assigneeUserId,
        assignedToName: assignee?.name || "Unknown",
        createdByUserId: currentUserId,
        actorName: currentUserName,
        priority,
        dueDate: dueDate?.getTime(),
        status: "open",
        teamId,
      });

      toast.success("Task created successfully");
      onOpenChange(false);

      // Reset form
      setTitle("");
      setDescription("");
      setAssigneeUserId("");
      setPriority("medium");
      setDueDate(undefined);
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form on cancel
    setTitle("");
    setDescription("");
    setAssigneeUserId("");
    setPriority("medium");
    setDueDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a task to assign to a team member. Tasks help track team
            to-dos and responsibilities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review player assessments"
              value={title}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              className="resize-none"
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
              value={description}
            />
          </div>

          <div>
            <Label htmlFor="assignee">Assign To</Label>
            <Select onValueChange={setAssigneeUserId} value={assigneeUserId}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {coaches?.map(
                  (coach: { userId: string; name: string; role?: string }) => (
                    <SelectItem key={coach.userId} value={coach.userId}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {coach.name}
                      </div>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                onValueChange={(value) =>
                  setPriority(value as "low" | "medium" | "high")
                }
                value={priority}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="w-full justify-start text-left font-normal"
                    variant="outline"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <CalendarUI
                    initialFocus
                    mode="single"
                    onSelect={setDueDate}
                    selected={dueDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
