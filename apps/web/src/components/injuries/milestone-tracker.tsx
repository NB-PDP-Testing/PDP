"use client";

/**
 * MilestoneTracker - Display and manage recovery milestones
 * Phase 2 - Issue #261
 */

import { Check, Circle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface Milestone {
  id: string;
  description: string;
  targetDate?: string;
  completedDate?: string;
  completedBy?: string;
  notes?: string;
  order: number;
}

interface MilestoneTrackerProps {
  milestones: Milestone[];
  canEdit: boolean;
  canComplete: boolean;
  onComplete: (milestoneId: string, notes?: string) => Promise<void>;
  onAdd?: (description: string, targetDate?: string) => Promise<void>;
  onRemove?: (milestoneId: string) => Promise<void>;
  isLoading?: boolean;
}

export function MilestoneTracker({
  milestones,
  canEdit,
  canComplete,
  onComplete,
  onAdd,
  onRemove,
  isLoading = false,
}: MilestoneTrackerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [showNotesDialog, setShowNotesDialog] = useState(false);

  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);
  const completedCount = milestones.filter((m) => m.completedDate).length;
  const progress =
    milestones.length > 0
      ? Math.round((completedCount / milestones.length) * 100)
      : 0;

  const handleAddMilestone = async () => {
    if (!(newDescription.trim() && onAdd)) {
      return;
    }
    await onAdd(newDescription.trim(), newTargetDate || undefined);
    setNewDescription("");
    setNewTargetDate("");
    setShowAddDialog(false);
  };

  const handleComplete = (milestoneId: string) => {
    setCompletingId(milestoneId);
    setShowNotesDialog(true);
  };

  const confirmComplete = async () => {
    if (completingId) {
      await onComplete(completingId, completionNotes || undefined);
      setCompletingId(null);
      setCompletionNotes("");
      setShowNotesDialog(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return null;
    }
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recovery Milestones</CardTitle>
            <CardDescription>
              {completedCount} of {milestones.length} completed
            </CardDescription>
          </div>
          <Badge
            className="text-sm"
            variant={progress === 100 ? "default" : "secondary"}
          >
            {progress}%
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedMilestones.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No milestones set yet
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedMilestones.map((milestone) => (
              <li
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  milestone.completedDate
                    ? "border-green-200 bg-green-50"
                    : "bg-card"
                }`}
                key={milestone.id}
              >
                {canComplete && !milestone.completedDate ? (
                  <Checkbox
                    checked={false}
                    className="mt-0.5"
                    disabled={isLoading}
                    onCheckedChange={() => handleComplete(milestone.id)}
                  />
                ) : (
                  <div className="mt-0.5">
                    {milestone.completedDate ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      milestone.completedDate
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }`}
                  >
                    {milestone.description}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-muted-foreground text-xs">
                    {milestone.targetDate && !milestone.completedDate && (
                      <span>Target: {formatDate(milestone.targetDate)}</span>
                    )}
                    {milestone.completedDate && (
                      <span className="text-green-600">
                        Completed: {formatDate(milestone.completedDate)}
                      </span>
                    )}
                    {milestone.notes && (
                      <span className="italic">"{milestone.notes}"</span>
                    )}
                  </div>
                </div>
                {canEdit && onRemove && !milestone.completedDate && (
                  <Button
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={isLoading}
                    onClick={() => onRemove(milestone.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && onAdd && (
          <Dialog onOpenChange={setShowAddDialog} open={showAddDialog}>
            <DialogTrigger asChild>
              <Button className="mt-2 w-full" size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
                <DialogDescription>
                  Add a recovery milestone to track progress
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g., Can walk without pain"
                    value={newDescription}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Date (optional)</Label>
                  <Input
                    id="targetDate"
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    type="date"
                    value={newTargetDate}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setShowAddDialog(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!newDescription.trim()}
                  onClick={handleAddMilestone}
                >
                  Add Milestone
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Completion notes dialog */}
        <Dialog onOpenChange={setShowNotesDialog} open={showNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Milestone</DialogTitle>
              <DialogDescription>
                Add any notes about completing this milestone (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g., Walked to school and back without any discomfort"
                rows={3}
                value={completionNotes}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowNotesDialog(false);
                  setCompletingId(null);
                  setCompletionNotes("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={confirmComplete}>Mark Complete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
