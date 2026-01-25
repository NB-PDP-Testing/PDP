"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  MessageSquare,
  Shield,
  Sparkles,
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

/**
 * Trust Level Labels and Descriptions
 */
const TRUST_LEVELS = [
  {
    level: 0,
    label: "New",
    description: "Manual review required for all parent summaries",
    color: "bg-gray-500",
    icon: Shield,
  },
  {
    level: 1,
    label: "Learning",
    description: "Quick review with AI suggestions",
    color: "bg-blue-500",
    icon: Sparkles,
  },
  {
    level: 2,
    label: "Trusted",
    description: "Auto-approve normal summaries, review sensitive",
    color: "bg-green-500",
    icon: Award,
  },
  {
    level: 3,
    label: "Expert",
    description: "Full automation (opt-in required)",
    color: "bg-purple-500",
    icon: Award,
  },
];

/**
 * Coach Settings Dialog
 *
 * Displays platform-wide trust level and per-org parent summary preferences.
 * Trust level is earned across all organizations (platform-wide).
 * Parent summary toggles are specific to each organization.
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
  const trustLevelInfo =
    TRUST_LEVELS.find((t) => t.level === currentLevel) || TRUST_LEVELS[0];
  const TrustIcon = trustLevelInfo.icon;

  // Loading state
  if (!platformTrustLevel) {
    return (
      <ResponsiveDialog
        contentClassName="sm:max-w-[650px]"
        description="Loading your coach settings..."
        onOpenChange={onOpenChange}
        open={open}
        title="Coach Settings"
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
      title="Coach Settings"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-1">
        {/* Trust Level Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrustIcon className="h-5 w-5" />
                  Trust Level
                </CardTitle>
                <CardDescription>
                  Your trust level determines automation for parent summaries
                </CardDescription>
              </div>
              <Badge
                className={`${trustLevelInfo.color} text-white`}
                variant="secondary"
              >
                Level {currentLevel}: {trustLevelInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Level Info */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm">{trustLevelInfo.description}</p>
            </div>

            {/* Progress to Next Level */}
            {currentLevel < 3 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progress to Level {currentLevel + 1}
                  </span>
                  <span className="font-medium">
                    {platformTrustLevel.progressToNextLevel.currentCount} /{" "}
                    {platformTrustLevel.progressToNextLevel.threshold} approvals
                  </span>
                </div>
                <Progress
                  className="h-2"
                  value={platformTrustLevel.progressToNextLevel.percentage}
                />
                {platformTrustLevel.progressToNextLevel
                  .blockedBySuppressionRate && (
                  <p className="text-muted-foreground text-xs">
                    Advancement blocked: suppression rate too high
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-2xl">
                  {platformTrustLevel.totalApprovals}
                </p>
                <p className="text-muted-foreground text-xs">Total Approvals</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-2xl">
                  {platformTrustLevel.totalSuppressed}
                </p>
                <p className="text-muted-foreground text-xs">Suppressed</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-2xl">
                  {platformTrustLevel.consecutiveApprovals}
                </p>
                <p className="text-muted-foreground text-xs">Streak</p>
              </div>
            </div>

            {/* Trust Level Explanation */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your trust level is earned across all clubs. As you consistently
                approve parent summaries, your automation level increases.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Per-Org Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Parent Summary Preferences
            </CardTitle>
            <CardDescription>
              Configure how AI generates parent summaries for each club
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
                    <div className="rounded-lg border">
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-muted-foreground text-xs">
                                {prefs.parentSummariesEnabled
                                  ? "Parent summaries enabled"
                                  : "Parent summaries disabled"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSaving && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-4 border-t p-4">
                          {/* Parent Summaries Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor={`summaries-${org.id}`}>
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
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label htmlFor={`sensitive-${org.id}`}>
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
              <p className="py-4 text-center text-muted-foreground text-sm">
                You are not a member of any clubs yet.
              </p>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
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
