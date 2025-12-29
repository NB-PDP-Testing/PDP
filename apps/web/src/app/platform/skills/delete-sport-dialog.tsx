"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeleteSportDialogProps = {
  sportId: Id<"sports"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function DeleteSportDialog({
  sportId,
  open,
  onOpenChange,
  onSuccess,
}: DeleteSportDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteSport = useMutation(api.models.referenceData.deleteSport);

  // Preview the impact of deletion
  const preview = useQuery(
    api.models.referenceData.previewSportDeletion,
    sportId ? { sportId } : "skip"
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setConfirmText("");
    }
  }, [open]);

  const handleDelete = async () => {
    if (!(sportId && preview)) {
      return;
    }

    setIsDeleting(true);
    try {
      const _result = await deleteSport({ sportId });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete sport:", error);
      alert(
        `Failed to delete sport: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmationMatches =
    preview && confirmText.toLowerCase() === preview.sportCode.toLowerCase();

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Sport Permanently
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {preview ? (
                <>
                  <div className="rounded-md border border-red-200 bg-red-50 p-4">
                    <p className="font-medium text-red-900">
                      You are about to permanently delete:
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded bg-white px-3 py-2">
                        <span className="text-gray-700">Sport:</span>
                        <span className="font-medium text-gray-900">
                          {preview.sportName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white px-3 py-2">
                        <span className="text-gray-700">Code:</span>
                        <span className="font-mono text-gray-900 text-sm">
                          {preview.sportCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white px-3 py-2">
                        <span className="text-gray-700">
                          Categories to delete:
                        </span>
                        <span className="font-bold text-red-600">
                          {preview.categoriesCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white px-3 py-2">
                        <span className="text-gray-700">Skills to delete:</span>
                        <span className="font-bold text-red-600">
                          {preview.skillsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                    <p className="font-medium text-amber-900 text-sm">
                      ⚠️ Warning: This action cannot be undone
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800 text-sm">
                      <li>
                        All {preview.categoriesCount} skill categories will be
                        permanently deleted
                      </li>
                      <li>
                        All {preview.skillsCount} skill definitions will be
                        permanently deleted
                      </li>
                      <li>The sport "{preview.sportName}" will be removed</li>
                      <li>
                        This may affect existing player assessments and records
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-text">
                      Type{" "}
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm">
                        {preview.sportCode}
                      </code>{" "}
                      to confirm deletion
                    </Label>
                    <Input
                      autoComplete="off"
                      className="font-mono"
                      id="confirm-text"
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={preview.sportCode}
                      value={confirmText}
                    />
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  <p className="mt-2 text-gray-500 text-sm">
                    Loading deletion preview...
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!confirmationMatches || isDeleting}
            onClick={handleDelete}
            variant="destructive"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
