"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type DeclineReason =
  | "not_my_child"
  | "wrong_person"
  | "none_are_mine"
  | "other";

type DeclineReasonDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: DeclineReason, reasonText?: string) => void;
  childName?: string;
};

export function DeclineReasonDialog({
  isOpen,
  onClose,
  onSubmit,
  childName,
}: DeclineReasonDialogProps) {
  const [selectedReason, setSelectedReason] =
    useState<DeclineReason>("not_my_child");
  const [customReasonText, setCustomReasonText] = useState("");

  const handleSubmit = () => {
    const reasonText =
      selectedReason === "other" ? customReasonText : undefined;
    onSubmit(selectedReason, reasonText);
    onClose();
    // Reset state
    setSelectedReason("not_my_child");
    setCustomReasonText("");
  };

  const handleCancel = () => {
    onClose();
    // Reset state
    setSelectedReason("not_my_child");
    setCustomReasonText("");
  };

  return (
    <Dialog onOpenChange={handleCancel} open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Why is this incorrect?</DialogTitle>
          <DialogDescription>
            {childName
              ? `Please let us know why ${childName} is not your child.`
              : "Please let us know why this child assignment is incorrect."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            onValueChange={(value) => setSelectedReason(value as DeclineReason)}
            value={selectedReason}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="not_my_child" value="not_my_child" />
              <Label
                className="cursor-pointer font-normal"
                htmlFor="not_my_child"
              >
                This is not my child
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem id="wrong_person" value="wrong_person" />
              <Label
                className="cursor-pointer font-normal"
                htmlFor="wrong_person"
              >
                You've got the wrong person
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem id="none_are_mine" value="none_are_mine" />
              <Label
                className="cursor-pointer font-normal"
                htmlFor="none_are_mine"
              >
                None of these children are mine
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem id="other" value="other" />
              <Label className="cursor-pointer font-normal" htmlFor="other">
                Other (please specify)
              </Label>
            </div>
          </RadioGroup>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Please explain</Label>
              <Textarea
                id="custom-reason"
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="Please provide more details..."
                rows={3}
                value={customReasonText}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={selectedReason === "other" && !customReasonText.trim()}
            onClick={handleSubmit}
            variant="destructive"
          >
            Submit Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
