"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SETUP_STEPS = [
  { id: "gdpr", label: "Privacy" },
  { id: "welcome", label: "Welcome" },
  { id: "create-org", label: "Create Club" },
  { id: "create-team", label: "First Team" },
  { id: "invite", label: "Invite" },
  { id: "complete", label: "Done" },
] as const;

interface SetupProgressProps {
  currentStep: string;
}

/**
 * Horizontal stepper showing setup wizard progress
 * - Current step is highlighted
 * - Completed steps show checkmark
 * - Future steps show numbers
 */
export function SetupProgress({ currentStep }: SetupProgressProps) {
  const currentIndex = SETUP_STEPS.findIndex((step) => step.id === currentStep);
  const progressPercentage = Math.round(
    (currentIndex / (SETUP_STEPS.length - 1)) * 100
  );

  return (
    <div className="border-b bg-background" data-testid="setup-progress">
      <div className="container mx-auto max-w-4xl py-6">
        {/* Progress bar for accessibility */}
        <div
          aria-label="Setup progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercentage}
          aria-valuetext={`Step ${currentIndex + 1} of ${SETUP_STEPS.length}`}
          className="sr-only"
          role="progressbar"
        />
        <nav aria-label="Setup progress" data-testid="wizard-step-indicator">
          <ol className="flex items-center justify-between">
            {SETUP_STEPS.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <li
                  aria-current={isCurrent ? "step" : undefined}
                  className="flex items-center"
                  key={step.id}
                >
                  <div className="flex flex-col items-center gap-2">
                    {/* Step indicator */}
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium text-sm transition-colors",
                        isCompleted &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-primary bg-primary/10 text-primary",
                        !(isCompleted || isCurrent) &&
                          "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* Step label */}
                    <span
                      className={cn(
                        "font-medium text-xs",
                        isCurrent && "text-primary",
                        isCompleted && "text-primary",
                        !(isCompleted || isCurrent) && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector line (not after last step) */}
                  {index < SETUP_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 hidden h-0.5 w-12 sm:block md:w-20 lg:w-28",
                        index < currentIndex
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
