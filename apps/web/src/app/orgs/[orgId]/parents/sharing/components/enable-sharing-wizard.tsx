"use client";

import { Shield, User } from "lucide-react";
import { useState } from "react";
import { ResponsiveDialog } from "@/components/interactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/**
 * Child data structure from parent dashboard
 */
export type ChildForSharing = {
  _id: string;
  firstName: string;
  lastName: string;
  sport?: string;
  ageGroup?: string;
  photoUrl?: string;
};

/**
 * Props for EnableSharingWizard component
 */
export type EnableSharingWizardProps = {
  /** Whether wizard dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** List of children available for sharing */
  childrenList: ChildForSharing[];
  /** Organization ID */
  orgId: string;
};

/**
 * Wizard steps
 */
type WizardStep =
  | "child-selection"
  | "org-selection"
  | "element-selection"
  | "duration"
  | "review"
  | "success";

/**
 * EnableSharingWizard - Multi-step wizard for enabling passport sharing
 *
 * Step 1 (US-025): Child selection
 * Step 2 (US-026): Element selection (what to share)
 * Step 3 (US-027): Organization selection (who can see it)
 * Step 4 (US-028): Duration selection (how long)
 * Step 5 (US-029): Review and confirm
 * Step 6 (US-029): Success screen
 */
export function EnableSharingWizard({
  open,
  onOpenChange,
  childrenList,
  orgId: _orgId,
}: EnableSharingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("child-selection");
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Reset wizard state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep("child-selection");
      setSelectedChildId("");
    }
    onOpenChange(newOpen);
  };

  // Handle step navigation
  const handleNext = () => {
    // For now, only child-selection step is implemented
    if (currentStep === "child-selection") {
      // TODO: Move to next step (US-026)
      // setCurrentStep("element-selection");
    }
  };

  const handleBack = () => {
    // For now, close dialog on back from first step
    if (currentStep === "child-selection") {
      handleOpenChange(false);
    }
  };

  // Get selected child data (will be used in future steps)
  const _selectedChild = childrenList.find(
    (child) => child._id === selectedChildId
  );

  // Determine if user can proceed
  const canProceed =
    currentStep === "child-selection" && selectedChildId !== "";

  // Get step number for progress indicator
  const getStepNumber = (step: WizardStep): number => {
    const stepMap: Record<WizardStep, number> = {
      "child-selection": 1,
      "org-selection": 2,
      "element-selection": 3,
      duration: 4,
      review: 5,
      success: 6,
    };
    return stepMap[step];
  };

  const currentStepNumber = getStepNumber(currentStep);
  const totalSteps = 5; // Don't count success screen in progress

  return (
    <ResponsiveDialog
      contentClassName="sm:max-w-lg"
      onOpenChange={handleOpenChange}
      open={open}
    >
      <div className="space-y-6">
        {/* Header with progress indicator */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Shield className="h-4 w-4" />
            <span>
              Step {currentStepNumber} of {totalSteps}
            </span>
          </div>
          <h2 className="font-semibold text-lg">
            {currentStep === "child-selection" && "Select Child"}
          </h2>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {currentStep === "child-selection" && (
          <ChildSelectionStep
            childrenList={childrenList}
            onSelectChild={setSelectedChildId}
            selectedChildId={selectedChildId}
          />
        )}

        {/* Navigation buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button onClick={handleBack} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={!canProceed} onClick={handleNext} type="button">
            Continue
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

/**
 * Step 1: Child Selection
 */
type ChildSelectionStepProps = {
  childrenList: ChildForSharing[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
};

function ChildSelectionStep({
  childrenList,
  selectedChildId,
  onSelectChild,
}: ChildSelectionStepProps) {
  // Single child: auto-select and show confirmation
  if (childrenList.length === 1) {
    const child = childrenList[0];
    if (!selectedChildId) {
      onSelectChild(child._id);
    }

    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          You're enabling passport sharing for:
        </p>
        <Card className="border-2 border-primary">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {child.firstName} {child.lastName}
              </p>
              {(child.sport || child.ageGroup) && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {child.sport && (
                    <Badge className="text-xs" variant="secondary">
                      {child.sport}
                    </Badge>
                  )}
                  {child.ageGroup && (
                    <Badge className="text-xs" variant="secondary">
                      {child.ageGroup}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multiple children: show selection UI
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Select which child you want to enable passport sharing for:
      </p>
      <RadioGroup onValueChange={onSelectChild} value={selectedChildId}>
        <div className="space-y-3">
          {childrenList.map((child) => (
            <Card
              className={`cursor-pointer transition-colors hover:border-primary/50 ${
                selectedChildId === child._id ? "border-2 border-primary" : ""
              }`}
              key={child._id}
              onClick={() => onSelectChild(child._id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <RadioGroupItem id={child._id} value={child._id} />
                <Label
                  className="flex flex-1 cursor-pointer items-center gap-3"
                  htmlFor={child._id}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {child.firstName} {child.lastName}
                    </p>
                    {(child.sport || child.ageGroup) && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {child.sport && (
                          <Badge className="text-xs" variant="secondary">
                            {child.sport}
                          </Badge>
                        )}
                        {child.ageGroup && (
                          <Badge className="text-xs" variant="secondary">
                            {child.ageGroup}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Label>
              </CardContent>
            </Card>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
