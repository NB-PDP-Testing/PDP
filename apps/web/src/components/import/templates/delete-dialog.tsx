"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
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

type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: Id<"importTemplates">;
  templateName: string;
};

export function DeleteDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
}: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTemplate = useMutation(api.models.importTemplates.deleteTemplate);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTemplate({ templateId });
      toast.success("Template deleted successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{templateName}&quot;? The
            template will be deactivated and no longer available for new
            imports. Existing imports that used this template will not be
            affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
