"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UndoImportDialogProps = {
  sessionId: Id<"importSessions"> | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function UndoImportDialog({
  sessionId,
  onClose,
  onSuccess,
}: UndoImportDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch eligibility status
  const eligibility = useQuery(
    api.models.importSessions.checkUndoEligibility,
    sessionId ? { sessionId } : "skip"
  );

  // Undo mutation
  const undoImport = useMutation(api.models.importSessions.undoImport);

  // Reset state when dialog closes/opens
  useEffect(() => {
    if (!sessionId) {
      setReason("");
      setIsSubmitting(false);
    }
  }, [sessionId]);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!eligibility?.expiresAt) {
      return null;
    }
    const now = Date.now();
    const remaining = eligibility.expiresAt - now;
    if (remaining <= 0) {
      return "Expired";
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const handleUndo = async () => {
    if (!sessionId) {
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await undoImport({
        sessionId,
        reason: reason.trim(),
      });

      if (result.success) {
        toast.success(
          `Import undone successfully! Removed ${result.rollbackStats.playersRemoved} players, ${result.rollbackStats.guardiansRemoved} guardians, ${result.rollbackStats.enrollmentsRemoved} enrollments, ${result.rollbackStats.passportsRemoved} passports, ${result.rollbackStats.assessmentsRemoved} assessments.`
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(
          `Cannot undo import: ${result.ineligibilityReasons.join(", ")}`
        );
      }
    } catch (error) {
      console.error("Error undoing import:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to undo import"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sessionId) {
    return null;
  }

  const timeRemaining = getTimeRemaining();
  const isEligible = eligibility?.eligible ?? false;
  const stats = eligibility?.stats;

  return (
    <AlertDialog onOpenChange={(open) => !open && onClose()} open={!!sessionId}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Undo Import
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All records created by this import
            will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Countdown Timer */}
          {timeRemaining && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-900 text-sm dark:bg-amber-950 dark:text-amber-100">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{timeRemaining}</span>
            </div>
          )}

          {/* Impact Preview */}
          {stats && (
            <div className="rounded-md border p-4">
              <p className="mb-2 font-medium text-sm">
                This will permanently delete:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Players:</span>
                  <span className="ml-2 font-medium">{stats.playerCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Guardians:</span>
                  <span className="ml-2 font-medium">
                    {stats.guardianCount}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Enrollments:</span>
                  <span className="ml-2 font-medium">
                    {stats.enrollmentCount}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Passports:</span>
                  <span className="ml-2 font-medium">
                    {stats.passportCount}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Assessments:</span>
                  <span className="ml-2 font-medium">
                    {stats.assessmentCount}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Links:</span>
                  <span className="ml-2 font-medium">
                    {stats.guardianLinkCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ineligibility Reasons */}
          {!isEligible && eligibility && eligibility.reasons.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-2 font-medium">Cannot undo this import:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {eligibility.reasons.map((reasonText) => (
                    <li key={reasonText}>{reasonText}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Input */}
          {isEligible && (
            <div className="space-y-2">
              <Label htmlFor="undo-reason">
                Reason for undo <span className="text-destructive">*</span>
              </Label>
              <Input
                className="w-full"
                disabled={isSubmitting}
                id="undo-reason"
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Imported wrong file, incorrect data mapping..."
                value={reason}
              />
              <p className="text-muted-foreground text-xs">
                Minimum 10 characters required
              </p>
            </div>
          )}

          {/* Loading State */}
          {!eligibility && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          {isEligible && (
            <Button
              disabled={
                isSubmitting || reason.trim().length < 10 || !eligibility
              }
              onClick={handleUndo}
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Undoing...
                </>
              ) : (
                "Undo Import"
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
