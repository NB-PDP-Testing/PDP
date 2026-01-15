"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  AlertCircle,
  Building2,
  Calendar as CalendarIcon,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { ResponsiveDialog } from "@/components/interactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  // Organization selection state
  const [sourceOrgMode, setSourceOrgMode] = useState<
    "all_enrolled" | "specific_orgs"
  >("all_enrolled");
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  // Duration selection state
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);

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
      // Reset org selection
      setSourceOrgMode("all_enrolled");
      setSelectedOrgIds([]);
      // Reset duration
      setExpiresAt(undefined);
    }
    onOpenChange(newOpen);
  };

  // Handle step navigation
  const handleNext = () => {
    if (currentStep === "child-selection") {
      setCurrentStep("element-selection");
    } else if (currentStep === "element-selection") {
      setCurrentStep("org-selection");
    } else if (currentStep === "org-selection") {
      setCurrentStep("duration");
    } else if (currentStep === "duration") {
      // TODO: Move to review (US-029)
      // setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "child-selection") {
      handleOpenChange(false);
    } else if (currentStep === "element-selection") {
      setCurrentStep("child-selection");
    } else if (currentStep === "org-selection") {
      setCurrentStep("element-selection");
    } else if (currentStep === "duration") {
      setCurrentStep("org-selection");
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
    if (currentStep === "org-selection") {
      // If specific_orgs mode, at least one org must be selected
      if (sourceOrgMode === "specific_orgs") {
        return selectedOrgIds.length > 0;
      }
      // all_enrolled mode is always valid
      return true;
    }
    if (currentStep === "duration") {
      // Must have a valid expiry date selected
      return expiresAt !== undefined;
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

        {currentStep === "org-selection" && (
          <OrganizationSelectionStep
            onSelectMode={setSourceOrgMode}
            onSelectOrgs={setSelectedOrgIds}
            playerIdentityId={selectedChildId as Id<"playerIdentities">}
            selectedOrgIds={selectedOrgIds}
            sourceOrgMode={sourceOrgMode}
          />
        )}

        {currentStep === "duration" && (
          <DurationSelectionStep
            expiresAt={expiresAt}
            onSelectDate={setExpiresAt}
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

/**
 * Step 3: Organization Selection
 */
type OrganizationSelectionStepProps = {
  playerIdentityId: Id<"playerIdentities">;
  sourceOrgMode: "all_enrolled" | "specific_orgs";
  onSelectMode: (mode: "all_enrolled" | "specific_orgs") => void;
  selectedOrgIds: string[];
  onSelectOrgs: (orgIds: string[]) => void;
};

function OrganizationSelectionStep({
  playerIdentityId,
  sourceOrgMode,
  onSelectMode,
  selectedOrgIds,
  onSelectOrgs,
}: OrganizationSelectionStepProps) {
  // Fetch all enrollments for this player
  const enrollments = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForPlayer,
    { playerIdentityId }
  );

  // Loading state
  if (!enrollments) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Loading organizations...
        </p>
      </div>
    );
  }

  // Get unique enrolled organizations
  // Note: We fetch org names inline below using dynamic queries
  type Enrollment = FunctionReturnType<
    typeof api.models.orgPlayerEnrollments.getEnrollmentsForPlayer
  >[number];
  const enrolledOrgs = enrollments.map((enrollment: Enrollment) => ({
    id: enrollment.organizationId,
    ageGroup: enrollment.ageGroup,
    status: enrollment.status,
  }));

  // Toggle organization selection
  const toggleOrganization = (orgId: string) => {
    if (selectedOrgIds.includes(orgId)) {
      onSelectOrgs(selectedOrgIds.filter((id) => id !== orgId));
    } else {
      onSelectOrgs([...selectedOrgIds, orgId]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Choose which organizations can view the shared data.
      </p>

      {/* Mode selection */}
      <RadioGroup
        onValueChange={(value) => {
          onSelectMode(value as "all_enrolled" | "specific_orgs");
        }}
        value={sourceOrgMode}
      >
        <div className="space-y-3">
          {/* All enrolled organizations */}
          <Card
            className={`cursor-pointer transition-colors hover:border-primary/50 ${
              sourceOrgMode === "all_enrolled" ? "border-2 border-primary" : ""
            }`}
            onClick={() => {
              onSelectMode("all_enrolled");
            }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem id="all_enrolled" value="all_enrolled" />
              <Label
                className="flex flex-1 cursor-pointer flex-col gap-2"
                htmlFor="all_enrolled"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">
                    All Enrolled Organizations
                  </span>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  Share data from all organizations where your child is
                  currently enrolled ({enrolledOrgs.length}{" "}
                  {enrolledOrgs.length === 1 ? "organization" : "organizations"}
                  ). This provides the most complete picture and is updated
                  automatically if your child joins new organizations.
                </p>
              </Label>
            </CardContent>
          </Card>

          {/* Specific organizations */}
          <Card
            className={`cursor-pointer transition-colors hover:border-primary/50 ${
              sourceOrgMode === "specific_orgs" ? "border-2 border-primary" : ""
            }`}
            onClick={() => {
              onSelectMode("specific_orgs");
            }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem id="specific_orgs" value="specific_orgs" />
              <Label
                className="flex flex-1 cursor-pointer flex-col gap-2"
                htmlFor="specific_orgs"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">
                    Specific Organizations Only
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Choose exactly which organizations to share data from. This
                  gives you more control but requires manual updates if your
                  child changes organizations.
                </p>
              </Label>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      {/* Organization selection (only shown for specific_orgs mode) */}
      {sourceOrgMode === "specific_orgs" && (
        <div className="space-y-3">
          <p className="font-medium text-sm">
            Select Organizations ({selectedOrgIds.length} selected)
          </p>
          {enrolledOrgs.map(
            (org: {
              id: string;
              ageGroup: string;
              status: "active" | "inactive" | "pending" | "suspended";
            }) => (
              <OrganizationCheckbox
                ageGroup={org.ageGroup}
                isSelected={selectedOrgIds.includes(org.id)}
                key={org.id}
                onToggle={() => {
                  toggleOrganization(org.id);
                }}
                organizationId={org.id}
                status={org.status}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper component to fetch and display organization checkbox
 */
type OrganizationCheckboxProps = {
  organizationId: string;
  ageGroup: string;
  status: string;
  isSelected: boolean;
  onToggle: () => void;
};

function OrganizationCheckbox({
  organizationId,
  ageGroup,
  status,
  isSelected,
  onToggle,
}: OrganizationCheckboxProps) {
  // biome-ignore lint/correctness/useHookAtTopLevel: Dynamic organization fetch per enrollment
  const organization = useQuery(api.models.organizations.getOrganization, {
    organizationId,
  });

  if (!organization) {
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <Checkbox
        checked={isSelected}
        className="mt-0.5"
        id={organizationId}
        onCheckedChange={onToggle}
      />
      <div className="flex-1">
        <Label
          className="cursor-pointer font-medium text-sm"
          htmlFor={organizationId}
        >
          {organization.name}
        </Label>
        <div className="mt-1 flex flex-wrap gap-2">
          <Badge className="text-xs" variant="secondary">
            {ageGroup}
          </Badge>
          <Badge className="text-xs" variant="secondary">
            {status}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 4: Duration Selection
 */
type DurationSelectionStepProps = {
  expiresAt: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
};

function DurationSelectionStep({
  expiresAt,
  onSelectDate,
}: DurationSelectionStepProps) {
  // Preset duration options
  type DurationType = "season_end" | "6_months" | "1_year" | "custom";
  const [durationType, setDurationType] = useState<DurationType | undefined>(
    undefined
  );

  // Calculate preset dates
  const calculatePresetDate = (type: DurationType): Date | undefined => {
    const now = new Date();

    if (type === "season_end") {
      // Default season end: June 30th of current year, or next year if we're past June
      const currentYear = now.getFullYear();
      const seasonEnd = new Date(currentYear, 5, 30); // June is month 5 (0-indexed)

      // If we're past June 30th, use next year's June 30th
      if (now > seasonEnd) {
        return new Date(currentYear + 1, 5, 30);
      }
      return seasonEnd;
    }

    if (type === "6_months") {
      const sixMonthsFromNow = new Date(now);
      sixMonthsFromNow.setMonth(now.getMonth() + 6);
      return sixMonthsFromNow;
    }

    if (type === "1_year") {
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      return oneYearFromNow;
    }

    return;
  };

  // Handle duration type selection
  const handleDurationTypeChange = (type: DurationType) => {
    setDurationType(type);

    if (type === "custom") {
      // Don't set a date yet - user will pick from calendar
      onSelectDate(undefined);
    } else {
      // Calculate and set preset date
      const presetDate = calculatePresetDate(type);
      onSelectDate(presetDate);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        How long should this sharing consent remain active?
      </p>

      {/* Duration type selection */}
      <RadioGroup
        onValueChange={(value) => {
          handleDurationTypeChange(value as DurationType);
        }}
        value={durationType}
      >
        <div className="space-y-3">
          {/* Season end option */}
          <Card
            className={`cursor-pointer transition-colors hover:border-primary/50 ${
              durationType === "season_end" ? "border-2 border-primary" : ""
            }`}
            onClick={() => {
              handleDurationTypeChange("season_end");
            }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem id="season_end" value="season_end" />
              <Label
                className="flex flex-1 cursor-pointer flex-col gap-1"
                htmlFor="season_end"
              >
                <span className="font-medium">Until Season End</span>
                <p className="text-muted-foreground text-xs">
                  {(() => {
                    const date = calculatePresetDate("season_end");
                    return date ? `Expires: ${formatDate(date)}` : null;
                  })()}
                </p>
              </Label>
            </CardContent>
          </Card>

          {/* 6 months option */}
          <Card
            className={`cursor-pointer transition-colors hover:border-primary/50 ${
              durationType === "6_months" ? "border-2 border-primary" : ""
            }`}
            onClick={() => {
              handleDurationTypeChange("6_months");
            }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem id="6_months" value="6_months" />
              <Label
                className="flex flex-1 cursor-pointer flex-col gap-1"
                htmlFor="6_months"
              >
                <span className="font-medium">6 Months</span>
                <p className="text-muted-foreground text-xs">
                  {(() => {
                    const date = calculatePresetDate("6_months");
                    return date ? `Expires: ${formatDate(date)}` : null;
                  })()}
                </p>
              </Label>
            </CardContent>
          </Card>

          {/* 1 year option */}
          <Card
            className={`cursor-pointer transition-colors hover:border-primary/50 ${
              durationType === "1_year" ? "border-2 border-primary" : ""
            }`}
            onClick={() => {
              handleDurationTypeChange("1_year");
            }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem id="1_year" value="1_year" />
              <Label
                className="flex flex-1 cursor-pointer flex-col gap-1"
                htmlFor="1_year"
              >
                <span className="font-medium">1 Year</span>
                <p className="text-muted-foreground text-xs">
                  {(() => {
                    const date = calculatePresetDate("1_year");
                    return date ? `Expires: ${formatDate(date)}` : null;
                  })()}
                </p>
              </Label>
            </CardContent>
          </Card>

          {/* Custom date option */}
          <Card
            className={`cursor-pointer transition-colors hover:border-primary/50 ${
              durationType === "custom" ? "border-2 border-primary" : ""
            }`}
            onClick={() => {
              handleDurationTypeChange("custom");
            }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem id="custom" value="custom" />
              <Label
                className="flex flex-1 cursor-pointer flex-col gap-1"
                htmlFor="custom"
              >
                <span className="font-medium">Custom Date</span>
                <p className="text-muted-foreground text-xs">
                  Choose a specific expiry date
                </p>
              </Label>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      {/* Custom date picker (only shown when custom is selected) */}
      {durationType === "custom" && (
        <div className="space-y-3">
          <p className="font-medium text-sm">Select Expiry Date</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="w-full justify-start text-left font-normal"
                type="button"
                variant="outline"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiresAt ? formatDate(expiresAt) : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                disabled={(date) => {
                  // Disable past dates (must be future)
                  return date < new Date();
                }}
                mode="single"
                onSelect={(date) => {
                  onSelectDate(date);
                }}
                selected={expiresAt}
              />
            </PopoverContent>
          </Popover>
          {expiresAt && (
            <p className="text-muted-foreground text-xs">
              Sharing consent will expire on {formatDate(expiresAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
