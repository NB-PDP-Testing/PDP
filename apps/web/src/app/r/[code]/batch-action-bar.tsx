"use client";

/**
 * BatchActionBar - Batch operations for review microsite
 *
 * US-RMS-003: Batch Actions Enhancement
 *
 * Provides batch dismiss and "clear reviewed" actions with confirmation dialogs.
 * Shows success/error toasts with counts for user feedback.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";

type BatchItem = {
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
};

type BatchActionBarProps = {
  code: string;
  items: BatchItem[];
  variant: "dismiss" | "clear-reviewed";
  label?: string;
  disabled?: boolean;
};

export function BatchActionBar({
  code,
  items,
  variant,
  label,
  disabled = false,
}: BatchActionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const batchDismiss = useMutation(
    api.models.whatsappReviewLinks.batchDismissInsightsFromReview
  );
  const batchApply = useMutation(
    api.models.whatsappReviewLinks.batchApplyInsightsFromReview
  );

  const handleConfirm = async () => {
    if (items.length === 0) {
      return;
    }

    setProcessing(true);
    try {
      let result: { successCount: number; failCount: number };
      if (variant === "dismiss" || variant === "clear-reviewed") {
        result = await batchDismiss({ code, items });
      } else {
        result = await batchApply({ code, items });
      }

      const { successCount, failCount } = result;

      if (successCount > 0) {
        toast.success(
          variant === "clear-reviewed"
            ? `Cleared ${successCount} reviewed insight${successCount === 1 ? "" : "s"}`
            : `Dismissed ${successCount} insight${successCount === 1 ? "" : "s"}`,
          {
            icon: <CheckCircle2 className="h-4 w-4" />,
          }
        );
      }

      if (failCount > 0) {
        toast.error(
          `Failed to process ${failCount} insight${failCount === 1 ? "" : "s"}`,
          {
            description: "Some insights may have already been reviewed.",
          }
        );
      }
    } catch (error) {
      toast.error("Operation failed", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setProcessing(false);
      setConfirmOpen(false);
    }
  };

  const buttonLabel =
    label ||
    (variant === "clear-reviewed"
      ? `Clear Reviewed (${items.length})`
      : `Dismiss All (${items.length})`);

  const dialogTitle =
    variant === "clear-reviewed"
      ? "Clear Reviewed Insights?"
      : "Dismiss All Insights?";

  const dialogDescription =
    variant === "clear-reviewed"
      ? `This will remove ${items.length} reviewed insight${items.length === 1 ? "" : "s"} from your review queue. You can still view them in the main app.`
      : `This will dismiss ${items.length} pending insight${items.length === 1 ? "" : "s"}. You can undo this later in the main app if needed.`;

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        className="min-h-[40px]"
        disabled={disabled || processing}
        onClick={() => setConfirmOpen(true)}
        size="sm"
        variant={variant === "clear-reviewed" ? "ghost" : "outline"}
      >
        {processing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : variant === "clear-reviewed" ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        {buttonLabel}
      </Button>

      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-w-[100px]"
              disabled={processing}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
