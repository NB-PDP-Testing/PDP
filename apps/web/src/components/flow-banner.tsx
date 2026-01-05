"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { AlertCircle, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";

interface FlowBannerProps {
  flow: any;
  step: any;
}

export function FlowBanner({ flow, step }: FlowBannerProps) {
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

  // Determine banner color based on flow type and priority
  const getBannerStyles = () => {
    if (flow.type === "system_alert" || flow.priority === "blocking") {
      return "bg-destructive text-destructive-foreground border-destructive";
    }
    if (flow.priority === "high") {
      return "bg-orange-500/10 text-orange-900 dark:text-orange-100 border-orange-500/20";
    }
    return "bg-blue-500/10 text-blue-900 dark:text-blue-100 border-blue-500/20";
  };

  return (
    <div className={`border-b ${getBannerStyles()} px-4 py-3`}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="font-semibold">{step.title}</div>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0">
              <ReactMarkdown>{step.content}</ReactMarkdown>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step.ctaText && (
            <Button
              onClick={handleContinue}
              size="sm"
              variant={flow.priority === "blocking" ? "secondary" : "default"}
            >
              {step.ctaText}
            </Button>
          )}
          {step.dismissible && (
            <button
              className="p-1 opacity-70 transition-opacity hover:opacity-100"
              onClick={handleDismiss}
              type="button"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
