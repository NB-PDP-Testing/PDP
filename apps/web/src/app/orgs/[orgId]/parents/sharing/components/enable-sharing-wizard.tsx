"use client";

import { AlertCircle, Shield, User } from "lucide-react";
import { useState } from "react";
import { ResponsiveDialog } from "@/components/interactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
 * Shared passport elements structure (matches backend schema)
 */
export type SharedElements = {
  basicProfile: boolean; // Name, age group, photo
  skillRatings: boolean; // Skill assessments
  skillHistory: boolean; // Historical ratings
  developmentGoals: boolean; // Goals & milestones
  coachNotes: boolean; // Public coach notes
  benchmarkData: boolean; // Benchmark comparisons
  attendanceRecords: boolean; // Training/match attendance
  injuryHistory: boolean; // Injury records (safety-critical)
  medicalSummary: boolean; // Medical profile summary
  contactInfo: boolean; // Guardian/coach contact for coordination
};

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

  // Default: all elements selected
  const [sharedElements, setSharedElements] = useState<SharedElements>({
    basicProfile: true,
    skillRatings: true,
    skillHistory: true,
    developmentGoals: true,
    coachNotes: true,
    benchmarkData: true,
    attendanceRecords: true,
    injuryHistory: true,
    medicalSummary: true,
    contactInfo: true,
  });

  // Reset wizard state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep("child-selection");
      setSelectedChildId("");
      // Reset shared elements to all selected
      setSharedElements({
        basicProfile: true,
        skillRatings: true,
        skillHistory: true,
        developmentGoals: true,
        coachNotes: true,
        benchmarkData: true,
        attendanceRecords: true,
        injuryHistory: true,
        medicalSummary: true,
        contactInfo: true,
      });
    }
    onOpenChange(newOpen);
  };

  // Handle step navigation
  const handleNext = () => {
    if (currentStep === "child-selection") {
      setCurrentStep("element-selection");
    } else if (currentStep === "element-selection") {
      // TODO: Move to org-selection (US-027)
      // setCurrentStep("org-selection");
    }
  };

  const handleBack = () => {
    if (currentStep === "child-selection") {
      handleOpenChange(false);
    } else if (currentStep === "element-selection") {
      setCurrentStep("child-selection");
    }
  };

  // Get selected child data (will be used in future steps)
  const _selectedChild = childrenList.find(
    (child) => child._id === selectedChildId
  );

  // Determine if user can proceed
  const canProceed = (() => {
    if (currentStep === "child-selection") {
      return selectedChildId !== "";
    }
    if (currentStep === "element-selection") {
      // At least one element must be selected
      return Object.values(sharedElements).some((value) => value);
    }
    return false;
  })();

  // Get step number for progress indicator
  const getStepNumber = (step: WizardStep): number => {
    const stepMap: Record<WizardStep, number> = {
      "child-selection": 1,
      "element-selection": 2,
      "org-selection": 3,
      duration: 4,
      review: 5,
      success: 6,
    };
    return stepMap[step];
  };

  // Get step title
  const getStepTitle = (step: WizardStep): string => {
    const titleMap: Record<WizardStep, string> = {
      "child-selection": "Select Child",
      "element-selection": "What to Share",
      "org-selection": "Who Can See",
      duration: "How Long",
      review: "Review & Confirm",
      success: "Success",
    };
    return titleMap[step];
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
          <h2 className="font-semibold text-lg">{getStepTitle(currentStep)}</h2>
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

        {currentStep === "element-selection" && (
          <ElementSelectionStep
            onUpdateElements={setSharedElements}
            sharedElements={sharedElements}
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

/**
 * Step 2: Element Selection
 */
type ElementSelectionStepProps = {
  sharedElements: SharedElements;
  onUpdateElements: (elements: SharedElements) => void;
};

function ElementSelectionStep({
  sharedElements,
  onUpdateElements,
}: ElementSelectionStepProps) {
  // Element metadata with labels and descriptions
  const elements: Array<{
    key: keyof SharedElements;
    label: string;
    description: string;
    isSensitive?: boolean;
  }> = [
    {
      key: "basicProfile",
      label: "Basic Profile",
      description: "Name, age group, photo",
    },
    {
      key: "skillRatings",
      label: "Skill Ratings",
      description: "Current skill assessments",
    },
    {
      key: "skillHistory",
      label: "Skill History",
      description: "Historical skill development",
    },
    {
      key: "developmentGoals",
      label: "Development Goals",
      description: "Goals and milestones",
    },
    {
      key: "coachNotes",
      label: "Coach Notes",
      description: "Public coach observations",
    },
    {
      key: "benchmarkData",
      label: "Benchmark Data",
      description: "Performance comparisons",
    },
    {
      key: "attendanceRecords",
      label: "Attendance Records",
      description: "Training and match attendance",
    },
    {
      key: "injuryHistory",
      label: "Injury History",
      description: "Past injuries and recovery",
      isSensitive: true,
    },
    {
      key: "medicalSummary",
      label: "Medical Summary",
      description: "Medical profile information",
      isSensitive: true,
    },
    {
      key: "contactInfo",
      label: "Contact Information",
      description: "Guardian and coach contact details",
      isSensitive: true,
    },
  ];

  // Check if any sensitive elements are selected
  const hasSensitiveSelected =
    sharedElements.injuryHistory ||
    sharedElements.medicalSummary ||
    sharedElements.contactInfo;

  // Toggle element
  const toggleElement = (key: keyof SharedElements) => {
    onUpdateElements({
      ...sharedElements,
      [key]: !sharedElements[key],
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Select which passport elements you want to share. All elements are
        selected by default.
      </p>

      {/* Element checkboxes */}
      <div className="space-y-3">
        {elements.map((element) => (
          <div
            className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            key={element.key}
          >
            <Checkbox
              checked={sharedElements[element.key]}
              className="mt-0.5"
              id={element.key}
              onCheckedChange={() => {
                toggleElement(element.key);
              }}
            />
            <div className="flex-1">
              <Label
                className="cursor-pointer font-medium text-sm"
                htmlFor={element.key}
              >
                {element.label}
                {element.isSensitive && (
                  <Badge className="ml-2" variant="secondary">
                    Sensitive
                  </Badge>
                )}
              </Label>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {element.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Sensitive data warning */}
      {hasSensitiveSelected && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1 text-xs">
            <p className="font-medium">Sensitive Information Selected</p>
            <p>
              Medical and contact information should only be shared when
              necessary. You can revoke access at any time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
