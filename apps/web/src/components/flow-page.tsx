"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PDPLogo } from "./pdp-logo";
import { Button } from "./ui/button";

interface FlowPageProps {
  flow: any;
  step: any;
}

export function FlowPage({ flow, step }: FlowPageProps) {
  const completeStep = useMutation(api.models.flows.completeFlowStep);
  const currentUser = useQuery(api.models.users.getCurrentUser);

  const handleContinue = async () => {
    await completeStep({ flowId: flow._id, stepId: step.id });
  };

  // Calculate progress
  const currentStepIndex = flow.steps.findIndex((s: any) => s.id === step.id);
  const totalSteps = flow.steps.length;

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <PDPLogo size="lg" />
          </div>
          <h1 className="font-bold text-4xl tracking-tight">{step.title}</h1>
          {flow.name && flow.name !== step.title && (
            <p className="mt-2 text-muted-foreground text-sm">{flow.name}</p>
          )}
        </div>

        {/* Progress Indicator */}
        {totalSteps > 1 && (
          <div className="flex justify-center gap-2">
            {flow.steps.map((s: any, index: number) => (
              <div
                className={`h-2 w-20 rounded-full transition-colors ${
                  index < currentStepIndex
                    ? "bg-green-500"
                    : index === currentStepIndex
                      ? "bg-blue-600"
                      : "bg-muted"
                }`}
                key={s.id}
              />
            ))}
          </div>
        )}

        {/* Content Card */}
        <div className="space-y-6 rounded-lg border bg-card p-8 shadow-lg">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown>{step.content}</ReactMarkdown>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center pt-4">
            <Button
              className="px-12"
              onClick={handleContinue}
              size="lg"
              style={{
                backgroundColor: "var(--pdp-navy)",
                color: "white",
              }}
            >
              {step.ctaText || "Continue"}
              {currentStepIndex < totalSteps - 1 ? (
                <ArrowRight className="ml-2 h-5 w-5" />
              ) : (
                <CheckCircle className="ml-2 h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Step Counter */}
        {totalSteps > 1 && (
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
