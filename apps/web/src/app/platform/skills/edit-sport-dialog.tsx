"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type EditSportDialogProps = {
  sportId: Id<"sports"> | null;
  initialData?: {
    code: string;
    name: string;
    description?: string;
    governingBody?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditSportDialog({
  sportId,
  initialData,
  open,
  onOpenChange,
  onSuccess,
}: EditSportDialogProps) {
  const [code, setCode] = useState(initialData?.code ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [governingBody, setGoverningBody] = useState(
    initialData?.governingBody ?? ""
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateSport = useMutation(api.models.referenceData.updateSport);

  // Preview the impact of code change
  const codePreview = useQuery(
    api.models.referenceData.previewSportCodeChange,
    sportId && code !== initialData?.code ? { sportId, newCode: code } : "skip"
  );

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open && initialData) {
      setCode(initialData.code);
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setGoverningBody(initialData.governingBody ?? "");
    }
  }, [open, initialData]);

  const hasChanges =
    code !== initialData?.code ||
    name !== initialData?.name ||
    description !== (initialData?.description ?? "") ||
    governingBody !== (initialData?.governingBody ?? "");

  const codeChanged = code !== initialData?.code;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sportId) {
      return;
    }

    // If code changed, show confirmation dialog
    if (codeChanged) {
      setShowConfirmation(true);
      return;
    }

    // Otherwise, proceed with update
    await executeUpdate();
  };

  const executeUpdate = async () => {
    if (!sportId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSport({
        sportId,
        code: code !== initialData?.code ? code : undefined,
        name: name !== initialData?.name ? name : undefined,
        description:
          description !== (initialData?.description ?? "")
            ? description
            : undefined,
        governingBody:
          governingBody !== (initialData?.governingBody ?? "")
            ? governingBody
            : undefined,
      });

      onSuccess?.();
      onOpenChange(false);
      setShowConfirmation(false);
    } catch (error) {
      console.error("Failed to update sport:", error);
      alert(
        `Failed to update sport: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Sport</DialogTitle>
            <DialogDescription>
              Update the details of this sport. Changes will be reflected
              throughout the system.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="code">
                Sport Code <span className="text-red-500">*</span>
              </Label>
              <Input
                className="font-mono"
                id="code"
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., gaa_football"
                required
                value={code}
              />
              {codeChanged && codePreview && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    {codePreview.wouldConflict ? (
                      <>
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-red-700">
                            Code Conflict
                          </p>
                          <p className="mt-1 text-red-600">
                            The code <code className="font-mono">{code}</code>{" "}
                            is already used by sport "
                            {codePreview.conflictingSportName}". Please choose a
                            different code.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-amber-800">
                            Impact Preview
                          </p>
                          <p className="mt-1 text-amber-700">
                            Changing the sport code will automatically update:
                          </p>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-700">
                            <li>
                              <strong>{codePreview.categoriesAffected}</strong>{" "}
                              skill{" "}
                              {codePreview.categoriesAffected === 1
                                ? "category"
                                : "categories"}
                            </li>
                            <li>
                              <strong>{codePreview.skillsAffected}</strong>{" "}
                              skill{" "}
                              {codePreview.skillsAffected === 1
                                ? "definition"
                                : "definitions"}
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Sport Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., GAA Football"
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="governingBody">Governing Body</Label>
              <Input
                id="governingBody"
                onChange={(e) => setGoverningBody(e.target.value)}
                placeholder="e.g., GAA"
                value={governingBody}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this sport..."
                rows={3}
                value={description}
              />
            </div>

            <DialogFooter>
              <Button
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !hasChanges ||
                  isSubmitting ||
                  (codeChanged && codePreview?.wouldConflict)
                }
                type="submit"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {codeChanged ? "Review Changes" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Code Changes */}
      <AlertDialog onOpenChange={setShowConfirmation} open={showConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Sport Code Change
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to change the sport code from{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                    {initialData?.code}
                  </code>{" "}
                  to{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                    {code}
                  </code>
                  .
                </p>
                {codePreview && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="font-medium text-amber-900 text-sm">
                      This will automatically update:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800 text-sm">
                      <li>
                        <strong>{codePreview.categoriesAffected}</strong> skill{" "}
                        {codePreview.categoriesAffected === 1
                          ? "category"
                          : "categories"}
                      </li>
                      <li>
                        <strong>{codePreview.skillsAffected}</strong> skill{" "}
                        {codePreview.skillsAffected === 1
                          ? "definition"
                          : "definitions"}
                      </li>
                    </ul>
                  </div>
                )}
                <p className="font-medium text-sm">
                  Are you sure you want to proceed?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => setShowConfirmation(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isSubmitting}
              onClick={executeUpdate}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Update
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
