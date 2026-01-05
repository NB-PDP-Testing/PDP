"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface FlowModalProps {
  flow: any;
  step: any;
}

export function FlowModal({ flow, step }: FlowModalProps) {
  const completeStep = useMutation(api.models.flows.completeFlowStep);
  const dismissFlow = useMutation(api.models.flows.dismissFlow);

  const handleContinue = async () => {
    await completeStep({ flowId: flow._id, stepId: step.id });
  };

  const handleDismiss = async () => {
    if (step.dismissible) {
      await dismissFlow({ flowId: flow._id });
    }
  };

  return (
    <Dialog
      onOpenChange={step.dismissible ? handleDismiss : undefined}
      open={true}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          {step.dismissible && (
            <button
              className="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
              onClick={handleDismiss}
              type="button"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{step.content}</ReactMarkdown>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          {step.dismissible && (
            <Button onClick={handleDismiss} variant="outline">
              Skip
            </Button>
          )}
          <Button onClick={handleContinue}>{step.ctaText || "Continue"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
