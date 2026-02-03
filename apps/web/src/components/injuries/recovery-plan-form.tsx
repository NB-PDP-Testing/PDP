"use client";

/**
 * RecoveryPlanForm - Create/edit recovery plans for injuries
 * Phase 2 - Issue #261
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface MilestoneInput {
  id: string;
  description: string;
  targetDate?: string;
}

interface RecoveryPlanFormProps {
  injuryId: Id<"playerInjuries">;
  existingPlan?: {
    estimatedRecoveryDays?: number;
    recoveryPlanNotes?: string;
    milestones?: Array<{
      id: string;
      description: string;
      targetDate?: string;
      order: number;
    }>;
    medicalClearanceRequired?: boolean;
  };
  updatedBy: string;
  updatedByName: string;
  updatedByRole: "guardian" | "coach" | "admin";
  onSave?: () => void;
}

export function RecoveryPlanForm({
  injuryId,
  existingPlan,
  updatedBy,
  updatedByName,
  updatedByRole,
  onSave,
}: RecoveryPlanFormProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [estimatedDays, setEstimatedDays] = useState(
    existingPlan?.estimatedRecoveryDays?.toString() || ""
  );
  const [notes, setNotes] = useState(existingPlan?.recoveryPlanNotes || "");
  const [clearanceRequired, setClearanceRequired] = useState(
    existingPlan?.medicalClearanceRequired ?? false
  );
  const [milestones, setMilestones] = useState<MilestoneInput[]>(
    existingPlan?.milestones?.map((m) => ({
      id: m.id,
      description: m.description,
      targetDate: m.targetDate,
    })) || []
  );

  const setRecoveryPlan = useMutation(
    api.models.playerInjuries.setRecoveryPlan
  );

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { id: crypto.randomUUID(), description: "", targetDate: "" },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (
    index: number,
    field: keyof MilestoneInput,
    value: string
  ) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validMilestones = milestones
        .filter((m) => m.description.trim())
        .map((m, index) => ({
          description: m.description.trim(),
          targetDate: m.targetDate || undefined,
          order: index,
        }));

      await setRecoveryPlan({
        injuryId,
        estimatedRecoveryDays: estimatedDays
          ? Number.parseInt(estimatedDays, 10)
          : undefined,
        recoveryPlanNotes: notes || undefined,
        milestones: validMilestones.length > 0 ? validMilestones : undefined,
        medicalClearanceRequired: clearanceRequired,
        updatedBy,
        updatedByName,
        updatedByRole,
      });

      toast.success("Recovery plan saved");
      setOpen(false);
      onSave?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save recovery plan");
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing =
    !!existingPlan?.recoveryPlanNotes || !!existingPlan?.milestones;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isEditing ? "outline" : "default"}>
          {isEditing ? "Edit Recovery Plan" : "Create Recovery Plan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Recovery Plan" : "Create Recovery Plan"}
          </DialogTitle>
          <DialogDescription>
            Set up milestones and track recovery progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estimated Recovery */}
          <div className="space-y-2">
            <Label htmlFor="estimatedDays">Estimated Recovery (days)</Label>
            <Input
              disabled={isSaving}
              id="estimatedDays"
              max="365"
              min="1"
              onChange={(e) => setEstimatedDays(e.target.value)}
              placeholder="e.g., 21"
              type="number"
              value={estimatedDays}
            />
          </div>

          {/* Recovery Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Recovery Notes</Label>
            <Textarea
              disabled={isSaving}
              id="notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Rest for week 1, light activity week 2, gradual return week 3"
              rows={3}
              value={notes}
            />
          </div>

          {/* Medical Clearance Required */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium" htmlFor="clearance">
                Medical Clearance Required
              </Label>
              <p className="text-muted-foreground text-xs">
                Player must provide medical clearance before returning
              </p>
            </div>
            <Switch
              checked={clearanceRequired}
              disabled={isSaving}
              id="clearance"
              onCheckedChange={setClearanceRequired}
            />
          </div>

          {/* Milestones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Recovery Milestones</Label>
              <Button
                disabled={isSaving}
                onClick={addMilestone}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {milestones.length === 0 ? (
              <p className="py-2 text-center text-muted-foreground text-sm">
                No milestones yet. Add milestones to track recovery progress.
              </p>
            ) : (
              <ul className="space-y-3">
                {milestones.map((milestone, index) => (
                  <li className="rounded-lg border p-3" key={milestone.id}>
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                        {index + 1}
                      </span>
                      <div className="flex-1 space-y-2">
                        <Input
                          disabled={isSaving}
                          onChange={(e) =>
                            updateMilestone(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="e.g., Can walk without pain"
                          value={milestone.description}
                        />
                        <Input
                          className="w-40"
                          disabled={isSaving}
                          onChange={(e) =>
                            updateMilestone(index, "targetDate", e.target.value)
                          }
                          type="date"
                          value={milestone.targetDate || ""}
                        />
                      </div>
                      <Button
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={isSaving}
                        onClick={() => removeMilestone(index)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSaving}
            onClick={() => setOpen(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * RecoveryPlanCard - Display existing recovery plan summary
 */
interface RecoveryPlanCardProps {
  estimatedRecoveryDays?: number;
  recoveryPlanNotes?: string;
  expectedReturn?: string;
  medicalClearanceRequired?: boolean;
  medicalClearanceReceived?: boolean;
}

export function RecoveryPlanCard({
  estimatedRecoveryDays,
  recoveryPlanNotes,
  expectedReturn,
  medicalClearanceRequired,
  medicalClearanceReceived,
}: RecoveryPlanCardProps) {
  const hasContent =
    estimatedRecoveryDays || recoveryPlanNotes || medicalClearanceRequired;

  if (!hasContent) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recovery Plan</CardTitle>
        {expectedReturn && (
          <CardDescription>
            Expected return: {new Date(expectedReturn).toLocaleDateString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {estimatedRecoveryDays && (
          <div>
            <p className="text-muted-foreground text-sm">Estimated Recovery</p>
            <p className="font-medium">{estimatedRecoveryDays} days</p>
          </div>
        )}

        {recoveryPlanNotes && (
          <div>
            <p className="text-muted-foreground text-sm">Notes</p>
            <p className="whitespace-pre-wrap text-sm">{recoveryPlanNotes}</p>
          </div>
        )}

        {medicalClearanceRequired && (
          <div className="flex items-center gap-2 rounded-lg border p-2">
            <div
              className={`h-2 w-2 rounded-full ${
                medicalClearanceReceived ? "bg-green-500" : "bg-amber-500"
              }`}
            />
            <span className="text-sm">
              Medical clearance{" "}
              {medicalClearanceReceived ? "received" : "required"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
