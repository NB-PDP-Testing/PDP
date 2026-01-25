"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  Check,
  ChevronDown,
  Info,
  Loader2,
  MessageSquare,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/interactions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Trust Level Labels and Descriptions
 */
const TRUST_LEVELS = [
  {
    level: 0,
    label: "New",
    description: "Manual review required for all parent summaries",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: Shield,
    milestone: "Approve 10 summaries to reach Level 1",
  },
  {
    level: 1,
    label: "Learning",
    description: "Quick review with AI suggestions",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Sparkles,
    milestone: "Approve 50 summaries to reach Level 2 and unlock auto-send",
  },
  {
    level: 2,
    label: "Trusted",
    description: "Auto-approve normal summaries, review sensitive",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: Award,
    milestone: "Approve 200 summaries to reach Level 3 (Expert)",
  },
  {
    level: 3,
    label: "Expert",
    description: "Full automation (opt-in required)",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Award,
    milestone: null,
  },
];

/**
 * Coach Settings Dialog
 *
 * Displays platform-wide trust level and per-org parent summary preferences.
 * Trust level is earned across all organizations (platform-wide).
 * Parent summary toggles are specific to each organization.
 *
 * Mobile: Bottom sheet with touch-friendly targets
 * Desktop: Centered modal (650px max-width)
 */
export function CoachSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: organizations } = authClient.useListOrganizations();

  // Platform-wide trust level
  const platformTrustLevel = useQuery(
    api.models.coachTrustLevels.getCoachPlatformTrustLevel,
    {}
  );

  // All org preferences
  const allOrgPreferences = useQuery(
    api.models.coachTrustLevels.getCoachAllOrgPreferences,
    {}
  );

  // Mutations for updating org preferences
  const setParentSummariesEnabled = useMutation(
    api.models.coachTrustLevels.setParentSummariesEnabled
  );
  const setSkipSensitiveInsights = useMutation(
    api.models.coachTrustLevels.setSkipSensitiveInsights
  );

  // State for expanded org settings
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [savingOrgs, setSavingOrgs] = useState<Set<string>>(new Set());

  const toggleOrgExpanded = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const handleToggleParentSummaries = async (
    orgId: string,
    enabled: boolean
  ) => {
    setSavingOrgs((prev) => new Set(prev).add(orgId));
    try {
      await setParentSummariesEnabled({ organizationId: orgId, enabled });
      toast.success(
        enabled
          ? "Parent summaries enabled"
          : "Parent summaries disabled for this club"
      );
    } catch (error) {
      console.error("Failed to update parent summaries setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSavingOrgs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
    }
  };

  const handleToggleSkipSensitive = async (orgId: string, skip: boolean) => {
    setSavingOrgs((prev) => new Set(prev).add(orgId));
    try {
      await setSkipSensitiveInsights({ organizationId: orgId, skip });
      toast.success(
        skip
          ? "Sensitive insights will be excluded from parent summaries"
          : "Sensitive insights will be included in parent summaries"
      );
    } catch (error) {
      console.error("Failed to update sensitive insights setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSavingOrgs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
    }
  };

  // Get org preferences for a specific org
  const getOrgPrefs = (orgId: string) => {
    const prefs = allOrgPreferences?.find((p) => p.organizationId === orgId);
    return {
      parentSummariesEnabled: prefs?.parentSummariesEnabled ?? true,
      skipSensitiveInsights: prefs?.skipSensitiveInsights ?? false,
    };
  };

  // Get current trust level info
  const currentLevel = platformTrustLevel?.currentLevel ?? 0;
  const trustLevelInfo = TRUST_LEVELS[currentLevel];
  const TrustIcon = trustLevelInfo.icon;

  // Calculate active orgs count
  const activeOrgsCount =
    organizations?.filter((org) => getOrgPrefs(org.id).parentSummariesEnabled)
      .length ?? 0;

  // Loading state
  if (!platformTrustLevel) {
    return (
      <ResponsiveDialog
        contentClassName="sm:max-w-[650px]"
        description="Loading your AI coach assistant settings..."
        onOpenChange={onOpenChange}
        open={open}
        title="🧠 AI Coach Assistant"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      contentClassName="sm:max-w-[650px]"
      description="Manage your AI assistant settings and trust level"
      onOpenChange={onOpenChange}
      open={open}
      title="🧠 AI Coach Assistant"
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto">
        {/* Trust Level Hero Section */}
        <div
          className={cn(
            "rounded-lg border-2 p-4 sm:p-6",
            trustLevelInfo.bgColor,
            trustLevelInfo.borderColor
          )}
        >
          {/* Header with Badge */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  `${trustLevelInfo.color.replace("bg-", "bg-")}/20`
                )}
              >
                <TrustIcon
                  className={cn(
                    "h-6 w-6",
                    trustLevelInfo.color.replace("bg-", "text-")
                  )}
                />
              </div>
              <div>
                <h3 className="font-bold text-xl sm:text-2xl">
                  Level {currentLevel}: {trustLevelInfo.label}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {trustLevelInfo.description}
                </p>
              </div>
            </div>
            <Badge
              className={cn(
                "flex-shrink-0",
                trustLevelInfo.color,
                "text-white"
              )}
              variant="secondary"
            >
              Level {currentLevel}
            </Badge>
          </div>

          {/* Progress Bar (if not max level) */}
          {currentLevel < 3 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Progress to Level {currentLevel + 1}
                </span>
                <span className="text-muted-foreground">
                  {platformTrustLevel.progressToNextLevel.currentCount} /{" "}
                  {platformTrustLevel.progressToNextLevel.threshold}
                </span>
              </div>
              <Progress
                className="h-2.5"
                value={platformTrustLevel.progressToNextLevel.percentage}
              />
              {platformTrustLevel.progressToNextLevel
                .blockedBySuppressionRate && (
                <p className="text-muted-foreground text-xs">
                  ⚠️ Advancement blocked: suppression rate too high
                </p>
              )}
            </div>
          )}

          {/* Inline Stats */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm sm:gap-6">
            <div>
              <span className="font-semibold text-2xl">
                {platformTrustLevel.totalApprovals}
              </span>
              <span className="ml-2 text-muted-foreground">Approvals</span>
            </div>
            <div>
              <span className="font-semibold text-2xl">
                {platformTrustLevel.totalSuppressed}
              </span>
              <span className="ml-2 text-muted-foreground">Suppressed</span>
            </div>
            <div>
              <span className="font-semibold text-2xl">
                {platformTrustLevel.consecutiveApprovals}
              </span>
              <span className="ml-2 text-muted-foreground">Streak</span>
            </div>
          </div>

          {/* Actionable Milestone Hint */}
          {trustLevelInfo.milestone && (
            <div
              className={cn(
                "mt-4 flex items-start gap-2 rounded-md p-3",
                "bg-blue-50 dark:bg-blue-950"
              )}
            >
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
              <p className="text-blue-900 text-sm dark:text-blue-100">
                <strong>Next milestone:</strong> {trustLevelInfo.milestone}
              </p>
            </div>
          )}

          {/* Max Level Achievement */}
          {currentLevel === 3 && (
            <div className="mt-4 rounded-md border border-purple-200 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-950">
              <p className="text-purple-900 text-sm dark:text-purple-100">
                🎉 <strong>Maximum level reached!</strong> You have full
                automation capabilities.
              </p>
            </div>
          )}

          {/* Info Alert */}
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your trust level is earned across all clubs. As you consistently
              approve parent summaries, your automation level increases.
            </AlertDescription>
          </Alert>
        </div>

        {/* Per-Org Preferences Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                Club Settings
              </CardTitle>
              <Badge variant="secondary">
                {activeOrgsCount} / {organizations?.length ?? 0} active
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Configure parent summary generation for each club
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations && organizations.length > 0 ? (
              organizations.map((org) => {
                const prefs = getOrgPrefs(org.id);
                const isExpanded = expandedOrgs.has(org.id);
                const isSaving = savingOrgs.has(org.id);

                return (
                  <Collapsible
                    key={org.id}
                    onOpenChange={() => toggleOrgExpanded(org.id)}
                    open={isExpanded}
                  >
                    <div
                      className={cn(
                        "rounded-lg border-2 transition-colors",
                        prefs.parentSummariesEnabled
                          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
                          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50"
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            {/* Status Icon */}
                            {prefs.parentSummariesEnabled ? (
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-600">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-400">
                                <X className="h-5 w-5 text-white" />
                              </div>
                            )}

                            {/* Org Info */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-sm sm:text-base">
                                {org.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {prefs.parentSummariesEnabled
                                  ? prefs.skipSensitiveInsights
                                    ? "Active • Skipping sensitive insights"
                                    : "Active • All insights enabled"
                                  : "Not generating summaries"}
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Loading + Chevron */}
                          <div className="flex items-center gap-2">
                            {isSaving && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="space-y-4 border-t p-4">
                          {/* Parent Summaries Toggle */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-0.5">
                              <Label
                                className="font-medium text-sm"
                                htmlFor={`summaries-${org.id}`}
                              >
                                Enable Parent Summaries
                              </Label>
                              <p className="text-muted-foreground text-xs">
                                Generate AI summaries from your voice notes to
                                share with parents
                              </p>
                            </div>
                            <Switch
                              checked={prefs.parentSummariesEnabled}
                              disabled={isSaving}
                              id={`summaries-${org.id}`}
                              onCheckedChange={(checked) =>
                                handleToggleParentSummaries(org.id, checked)
                              }
                            />
                          </div>

                          {/* Skip Sensitive Toggle - only show if summaries enabled */}
                          {prefs.parentSummariesEnabled && (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 space-y-0.5">
                                <Label
                                  className="font-medium text-sm"
                                  htmlFor={`sensitive-${org.id}`}
                                >
                                  Skip Sensitive Insights
                                </Label>
                                <p className="text-muted-foreground text-xs">
                                  Exclude injury and behavior insights from
                                  parent summaries
                                </p>
                              </div>
                              <Switch
                                checked={prefs.skipSensitiveInsights}
                                disabled={isSaving}
                                id={`sensitive-${org.id}`}
                                onCheckedChange={(checked) =>
                                  handleToggleSkipSensitive(org.id, checked)
                                }
                              />
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                You are not a member of any clubs yet.
              </p>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                These settings apply to voice notes you record in each club.
                Disabling parent summaries still captures insights for your own
                review.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button onClick={() => onOpenChange(false)}>
          <Check className="mr-2 h-4 w-4" />
          Done
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
