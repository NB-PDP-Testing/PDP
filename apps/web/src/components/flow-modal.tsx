"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface FlowModalProps {
  flow: any;
  step: any;
}

export function FlowModal({ flow, step }: FlowModalProps) {
  const router = useRouter();
  const startFlow = useMutation(api.models.flows.startFlow);
  const completeStep = useMutation(api.models.flows.completeFlowStep);
  const dismissFlow = useMutation(api.models.flows.dismissFlow);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarted, setIsStarted] = useState(!!flow.progress);

  // Start the flow if not already started
  const ensureFlowStarted = async () => {
    if (!(isStarted || flow.progress)) {
      try {
        await startFlow({ flowId: flow._id });
        setIsStarted(true);
      } catch (error) {
        console.error("Failed to start flow:", error);
        throw error;
      }
    }
  };

  const handleContinue = async () => {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    try {
      // Ensure flow is started before completing step
      await ensureFlowStarted();
      await completeStep({ flowId: flow._id, stepId: step.id });

      // Navigate to ctaAction if specified
      if (step.ctaAction) {
        router.push(step.ctaAction);
      }
    } catch (error) {
      console.error("Failed to complete flow step:", error);
      toast.error("Failed to continue. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    if (!step.dismissible || isProcessing) {
      return;
    }

    setIsProcessing(true);
    try {
      // Ensure flow is started before dismissing
      await ensureFlowStarted();
      await dismissFlow({ flowId: flow._id });
    } catch (error) {
      console.error("Failed to dismiss flow:", error);
      toast.error("Failed to dismiss. Please try again.");
      setIsProcessing(false);
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
            <Button
              disabled={isProcessing}
              onClick={handleDismiss}
              variant="outline"
            >
              Skip
            </Button>
          )}
          <Button disabled={isProcessing} onClick={handleContinue}>
            {isProcessing ? "Processing..." : step.ctaText || "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
