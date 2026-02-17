"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
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

type CloneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: Id<"importTemplates">;
  templateName: string;
  createdBy: string;
  organizationId: string;
  isPlatformTemplate: boolean;
};

export function CloneDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
  createdBy,
  organizationId,
  isPlatformTemplate,
}: CloneDialogProps) {
  const [newName, setNewName] = useState(`Copy of ${templateName}`);
  const [isCloning, setIsCloning] = useState(false);
  const cloneTemplate = useMutation(api.models.importTemplates.cloneTemplate);

  const handleClone = async () => {
    if (!newName.trim()) {
      return;
    }
    setIsCloning(true);
    try {
      await cloneTemplate({
        templateId,
        newName: newName.trim(),
        createdBy,
        // If cloning a platform template, force scope to org
        ...(isPlatformTemplate
          ? { scope: "organization", organizationId }
          : {}),
      });
      toast.success("Template cloned successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to clone template");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPlatformTemplate ? "Clone to My Organization" : "Clone Template"}
          </DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{templateName}&quot;
            {isPlatformTemplate
              ? " as an organization template that you can customize."
              : " with a new name."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="clone-name">New Template Name</Label>
          <Input
            id="clone-name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleClone();
              }
            }}
            placeholder="Enter a name for the cloned template"
            value={newName}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={isCloning}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isCloning || !newName.trim()} onClick={handleClone}>
            {isCloning ? "Cloning..." : "Clone Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
