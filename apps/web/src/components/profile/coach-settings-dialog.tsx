"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  Bell,
  Check,
  ChevronDown,
  Info,
  Loader2,
  MessageSquare,
  Shield,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GesturePreferences } from "@/app/orgs/[orgId]/coach/settings/gesture-preferences";
import { NotificationPreferences } from "@/app/orgs/[orgId]/coach/settings/notification-preferences";
import { ParentCommsSettings } from "@/components/coach/parent-comms-settings";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { CoachAIHelpDialog } from "./coach-ai-help-dialog";

/**
 * Trust Level Labels and Descriptions
 */
const TRUST_LEVELS = [
  {
    level: 0,
    label: "New",
    description: "Manual review required for all AI insights",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: Shield,
    milestone: "Approve 10 insights to reach Level 1",
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
    milestone: "Approve 50 insights to reach Level 2 and unlock automation",
  },
  {
    level: 2,
    label: "Trusted",
    description: "Auto-apply non-sensitive insights, review others",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: Award,
    milestone: "Approve 200 insights to reach Level 3 (Expert)",
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

  // Mutation for platform-wide insight auto-apply preferences
  const setInsightAutoApplyPreferences = useMutation(
    api.models.coachTrustLevels.setInsightAutoApplyPreferences
  );

  // Mutation for setting preferred trust level
  const setPreferredLevel = useMutation(
    api.models.coachTrustLevels.setPreferredTrustLevel
  );

  // Mutation for toggling AI features
  const toggleAIFeature = useMutation(
    api.models.trustGatePermissions.toggleAIFeatureSetting
  );

  // State for expanded org settings
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [savingOrgs, setSavingOrgs] = useState<Set<string>>(new Set());
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [isChangingTrustLevel, setIsChangingTrustLevel] = useState(false);

  // Expanded sections state for collapsible Communication and Interface cards
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [gesturesOpen, setGesturesOpen] = useState(false);

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

  const handleToggleAIFeature = async (
    orgId: string,
    feature: "aiInsightMatchingEnabled" | "autoApplyInsightsEnabled",
    enabled: boolean
  ) => {
    setSavingOrgs((prev) => new Set(prev).add(orgId));
    try {
      await toggleAIFeature({
        organizationId: orgId,
        feature,
        enabled,
      });
      const featureName =
        feature === "aiInsightMatchingEnabled"
          ? "AI Insight Matching"
          : "Auto-Apply Insights";
      toast.success(`${featureName} ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update AI feature setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSavingOrgs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
    }
  };

  const handleToggleAutoApplyPreference = async (
    category: "skills" | "attendance" | "goals" | "performance",
    enabled: boolean
  ) => {
    try {
      // Get current preferences or defaults
      const currentPreferences =
        platformTrustLevel?.insightAutoApplyPreferences || {
          skills: false,
          attendance: false,
          goals: false,
          performance: false,
        };

      // Update with the new value
      const updatedPreferences = {
        ...currentPreferences,
        [category]: enabled,
      };

      // Call mutation
      await setInsightAutoApplyPreferences({
        preferences: updatedPreferences,
      });

      // Show toast notification
      const categoryLabels = {
        skills: "Skill",
        attendance: "Attendance",
        goals: "Goal",
        performance: "Performance",
      };
      const label = categoryLabels[category];
      toast.success(
        enabled ? `${label} auto-apply enabled` : `${label} auto-apply disabled`
      );
    } catch (error) {
      console.error("Failed to update auto-apply preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  const handleChangePreferredLevel = async (level: number) => {
    // Need at least one organization to set preferred level
    if (!organizations || organizations.length === 0) {
      toast.error("You must be a member of at least one organization");
      return;
    }

    setIsChangingTrustLevel(true);
    try {
      // Use the first organization ID (trust level is platform-wide but mutation needs org for override check)
      await setPreferredLevel({
        preferredLevel: level,
        organizationId: organizations[0].id,
      });
      toast.success(`Trust level preference set to Level ${level}`);
    } catch (error: unknown) {
      console.error("Failed to update trust level:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update trust level"
      );
    } finally {
      setIsChangingTrustLevel(false);
    }
  };

  // Get org preferences for a specific org
  const getOrgPrefs = (orgId: string) => {
    const prefs = allOrgPreferences?.find((p) => p.organizationId === orgId);
    // Coach has access to advanced features if they have:
    // 1. AI control rights (explicit permission), OR
    // 2. Trust gate override (admin override), OR
    // 3. Earned level 2+ (auto-apply unlocks at level 2)
    const hasAdvancedAccess =
      (prefs?.aiControlRightsEnabled ?? false) ||
      (prefs?.trustGateOverride ?? false) ||
      currentLevel >= 2;

    return {
      parentSummariesEnabled: prefs?.parentSummariesEnabled ?? true,
      skipSensitiveInsights: prefs?.skipSensitiveInsights ?? false,
      aiInsightMatchingEnabled: prefs?.aiInsightMatchingEnabled ?? true,
      autoApplyInsightsEnabled: prefs?.autoApplyInsightsEnabled ?? true,
      hasAIControlRights: prefs?.aiControlRightsEnabled ?? false,
      hasOverride: prefs?.trustGateOverride ?? false,
      hasAdvancedAccess,
      isBlocked: prefs?.adminBlockedFromAI ?? false,
    };
  };

  // Compute trust gate override status from org preferences
  // Coach has override if ANY org has granted trustGateOverride or aiControlRightsEnabled
  const hasOverride =
    allOrgPreferences?.some(
      (pref) => pref.trustGateOverride || pref.aiControlRightsEnabled
    ) ?? false;

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
      description="Manage your AI assistant settings and trust level. New to the AI Coach Assistant? Check out the help guide below!"
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
              approve AI-generated insights (player updates, parent summaries,
              development goals, etc.), your automation level increases.
            </AlertDescription>
          </Alert>
        </div>

        {/* Set Preferred Trust Level Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Set Preferred Trust Level
              </CardTitle>
              {hasOverride && (
                <Badge
                  className="border-yellow-300 bg-yellow-50 text-yellow-700"
                  variant="outline"
                >
                  Override Enabled
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {hasOverride
                ? "With override enabled, you can set your preferred level to any value (0-3). The system will cap automated actions at your preferred level."
                : "You can dial down from your current earned level at any time. To increase your preferred level, you must earn it through approved actions."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Slider with level indicators */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-medium text-sm">
                  Preferred Level:{" "}
                  {platformTrustLevel?.preferredLevel ?? currentLevel}
                </Label>
                {isChangingTrustLevel && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Slider */}
              <div className="px-2">
                <Slider
                  className="w-full"
                  disabled={isChangingTrustLevel}
                  max={hasOverride ? 3 : currentLevel}
                  min={0}
                  onValueChange={(values) =>
                    handleChangePreferredLevel(values[0])
                  }
                  step={1}
                  value={[platformTrustLevel?.preferredLevel ?? currentLevel]}
                />
              </div>

              {/* Level markers */}
              <div className="flex justify-between px-1 text-xs">
                {TRUST_LEVELS.map((levelInfo) => {
                  const isLocked =
                    !hasOverride && levelInfo.level > currentLevel;
                  const isSelected =
                    levelInfo.level ===
                    (platformTrustLevel?.preferredLevel ?? currentLevel);

                  return (
                    <button
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        isLocked && "cursor-not-allowed opacity-40",
                        !isLocked && "cursor-pointer hover:opacity-75"
                      )}
                      disabled={isLocked || isChangingTrustLevel}
                      key={levelInfo.level}
                      onClick={() => {
                        if (!(isLocked || isChangingTrustLevel)) {
                          handleChangePreferredLevel(levelInfo.level);
                        }
                      }}
                      type="button"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                          isSelected
                            ? cn(
                                levelInfo.color,
                                "border-transparent text-white"
                              )
                            : "border-gray-300 bg-white text-gray-600"
                        )}
                      >
                        {isLocked ? (
                          <span className="text-xs">🔒</span>
                        ) : (
                          <span className="font-bold text-xs">
                            {levelInfo.level}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-medium",
                          isSelected
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {levelInfo.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected level description */}
              {(() => {
                const selectedLevel =
                  platformTrustLevel?.preferredLevel ?? currentLevel;
                const levelInfo = TRUST_LEVELS[selectedLevel];
                const LevelIcon = levelInfo.icon;

                return (
                  <div
                    className={cn(
                      "rounded-lg border-2 p-4",
                      levelInfo.borderColor,
                      levelInfo.bgColor
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                          `${levelInfo.color.replace("bg-", "bg-")}/20`
                        )}
                      >
                        <LevelIcon
                          className={cn(
                            "h-5 w-5",
                            levelInfo.color.replace("bg-", "text-")
                          )}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">
                            Level {selectedLevel}: {levelInfo.label}
                          </h4>
                          {selectedLevel === currentLevel && (
                            <Badge className="text-xs" variant="secondary">
                              Earned
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {levelInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {hasOverride
                  ? "Override rights granted by your organization admin. You can set any level, but your earned level advances naturally through approved actions."
                  : "You can always dial down for more control. To unlock higher levels, continue approving insights and summaries to build your trust score."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

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

                          {/* AI Insight Matching Toggle - only show if has advanced access */}
                          {prefs.hasAdvancedAccess && !prefs.isBlocked && (
                            <>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 space-y-0.5">
                                  <Label
                                    className="font-medium text-sm"
                                    htmlFor={`ai-matching-${org.id}`}
                                  >
                                    AI Insight Matching
                                  </Label>
                                  <p className="text-muted-foreground text-xs">
                                    Automatically match players and classify
                                    insight categories
                                  </p>
                                </div>
                                <Switch
                                  checked={prefs.aiInsightMatchingEnabled}
                                  disabled={isSaving}
                                  id={`ai-matching-${org.id}`}
                                  onCheckedChange={(checked) =>
                                    handleToggleAIFeature(
                                      org.id,
                                      "aiInsightMatchingEnabled",
                                      checked
                                    )
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 space-y-0.5">
                                  <Label
                                    className="font-medium text-sm"
                                    htmlFor={`auto-apply-${org.id}`}
                                  >
                                    Auto-Apply Insights
                                  </Label>
                                  <p className="text-muted-foreground text-xs">
                                    Automatically apply skill ratings and
                                    updates to player profiles
                                  </p>
                                </div>
                                <Switch
                                  checked={prefs.autoApplyInsightsEnabled}
                                  disabled={isSaving}
                                  id={`auto-apply-${org.id}`}
                                  onCheckedChange={(checked) =>
                                    handleToggleAIFeature(
                                      org.id,
                                      "autoApplyInsightsEnabled",
                                      checked
                                    )
                                  }
                                />
                              </div>
                            </>
                          )}

                          {/* AI Control Rights Warning - only show if no advanced access */}
                          {!prefs.hasAdvancedAccess && (
                            <Alert className="border-amber-300 bg-amber-50">
                              <Info className="h-4 w-4 text-amber-700" />
                              <AlertDescription className="text-amber-800 text-xs">
                                {currentLevel >= 2
                                  ? "Contact your organization admin to request AI control rights for advanced automation features."
                                  : "Reach Level 2 or request AI control rights from your admin to access advanced automation features."}
                              </AlertDescription>
                            </Alert>
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

        {/* Insight Auto-Apply Preferences Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Insight Auto-Apply Preferences
              </CardTitle>
              <Badge variant="outline">Platform-wide</Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Choose which types of insights can be automatically applied to
              player profiles across all clubs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skills checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={
                  platformTrustLevel?.insightAutoApplyPreferences?.skills ??
                  false
                }
                id="auto-apply-skills"
                onCheckedChange={(checked) =>
                  handleToggleAutoApplyPreference("skills", checked as boolean)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="auto-apply-skills"
                >
                  Skills
                </Label>
                <p className="text-muted-foreground text-sm">
                  Auto-apply skill rating updates
                </p>
              </div>
            </div>

            {/* Attendance checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={
                  platformTrustLevel?.insightAutoApplyPreferences?.attendance ??
                  false
                }
                id="auto-apply-attendance"
                onCheckedChange={(checked) =>
                  handleToggleAutoApplyPreference(
                    "attendance",
                    checked as boolean
                  )
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="auto-apply-attendance"
                >
                  Attendance
                </Label>
                <p className="text-muted-foreground text-sm">
                  Auto-apply attendance records
                </p>
              </div>
            </div>

            {/* Goals checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={
                  platformTrustLevel?.insightAutoApplyPreferences?.goals ??
                  false
                }
                id="auto-apply-goals"
                onCheckedChange={(checked) =>
                  handleToggleAutoApplyPreference("goals", checked as boolean)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="auto-apply-goals"
                >
                  Goals
                </Label>
                <p className="text-muted-foreground text-sm">
                  Auto-apply development goal updates
                </p>
              </div>
            </div>

            {/* Performance checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={
                  platformTrustLevel?.insightAutoApplyPreferences
                    ?.performance ?? false
                }
                id="auto-apply-performance"
                onCheckedChange={(checked) =>
                  handleToggleAutoApplyPreference(
                    "performance",
                    checked as boolean
                  )
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="auto-apply-performance"
                >
                  Performance
                </Label>
                <p className="text-muted-foreground text-sm">
                  Auto-apply performance notes
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Injury and medical insights always require manual review for
                safety. These preferences apply across all clubs where you
                coach.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Communication Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                Communication
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Configure how you receive notifications and communicate with
              parents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Preferences */}
            <Collapsible
              onOpenChange={setNotificationsOpen}
              open={notificationsOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  className="w-full justify-between"
                  type="button"
                  variant="outline"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Preferences
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      notificationsOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {organizations && organizations.length > 0 && (
                  <NotificationPreferences />
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Parent Communication Tone */}
            <Collapsible onOpenChange={setToneOpen} open={toneOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  className="w-full justify-between"
                  type="button"
                  variant="outline"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Parent Communication Tone
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      toneOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {organizations && organizations.length > 0 && (
                  <ParentCommsSettings organizationId={organizations[0].id} />
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Interface Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Interface
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Customize your interface preferences and mobile gestures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gesture Preferences */}
            <Collapsible onOpenChange={setGesturesOpen} open={gesturesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  className="w-full justify-between"
                  type="button"
                  variant="outline"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Mobile Gestures
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      gesturesOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {organizations && organizations.length > 0 && (
                  <GesturePreferences />
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button className="relative" onClick={() => setHelpDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Help Guide
            <Badge
              className="-right-1 -top-1 absolute h-5 px-1.5 text-[10px]"
              variant="secondary"
            >
              NEW
            </Badge>
          </Button>
          <span className="hidden text-muted-foreground text-xs sm:inline">
            Learn how this all works
          </span>
        </div>
        <Button onClick={() => onOpenChange(false)} variant="outline">
          <Check className="mr-2 h-4 w-4" />
          Done
        </Button>
      </div>

      {/* Help Dialog */}
      <CoachAIHelpDialog
        onOpenChange={setHelpDialogOpen}
        open={helpDialogOpen}
      />
    </ResponsiveDialog>
  );
}
