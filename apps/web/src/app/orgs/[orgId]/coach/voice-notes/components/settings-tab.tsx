"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bell, Brain, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";
import { TrustLevelSlider } from "@/components/coach/trust-level-slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Trust level thresholds (from backend/convex/lib/trustLevelCalculator.ts)
const TRUST_LEVEL_THRESHOLDS = {
  level1: 10,
  level2: 50,
  level3: 200,
};

type SettingsTabProps = {
  orgId: BetterAuthId<"organization">;
};

export function SettingsTab({ orgId }: SettingsTabProps) {
  // Trust level data
  const trustLevel = useQuery(api.models.coachTrustLevels.getCoachTrustLevel, {
    organizationId: orgId,
  });
  const setPreferredLevel = useMutation(
    api.models.coachTrustLevels.setCoachPreferredLevel
  );
  const setParentSummariesEnabled = useMutation(
    api.models.coachTrustLevels.setParentSummariesEnabled
  );
  const setSkipSensitiveInsights = useMutation(
    api.models.coachTrustLevels.setSkipSensitiveInsights
  );

  const handleTrustPreferenceUpdate = async (preferredLevel: number) => {
    const levelNames = ["Manual", "Learning", "Trusted", "Expert"];
    try {
      await setPreferredLevel({
        preferredLevel,
      });
      toast.success(`Trust level updated to ${levelNames[preferredLevel]}`);
    } catch (error) {
      toast.error("Failed to update trust preferences");
      console.error("Error updating trust preferences:", error);
    }
  };

  const handleParentSummariesToggle = async (enabled: boolean) => {
    try {
      await setParentSummariesEnabled({
        organizationId: orgId,
        enabled,
      });
      toast.success(
        enabled
          ? "Parent summaries enabled"
          : "Parent summaries disabled - insights will still be captured"
      );
    } catch (error) {
      toast.error("Failed to update setting");
      console.error("Error updating parent summaries setting:", error);
    }
  };

  const handleSkipSensitiveToggle = async (skip: boolean) => {
    try {
      await setSkipSensitiveInsights({
        organizationId: orgId,
        skip,
      });
      toast.success(
        skip
          ? "Sensitive insights will be excluded from parent summaries"
          : "Sensitive insights will be included in parent summaries (requires manual review)"
      );
    } catch (error) {
      toast.error("Failed to update setting");
      console.error("Error updating skip sensitive setting:", error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* AI Preferences */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Brain className="h-5 w-5" />
            AI Preferences
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Configure how AI analyzes your voice notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">
                Auto-detect player names
              </Label>
              <p className="text-muted-foreground text-xs">
                AI will automatically identify player names in your notes
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">
                Extract injury mentions
              </Label>
              <p className="text-muted-foreground text-xs">
                Flag potential injuries for medical follow-up
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">
                Skill progress tracking
              </Label>
              <p className="text-muted-foreground text-xs">
                Track skill improvements mentioned in notes
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
        </CardContent>
      </Card>

      {/* Parent Communication Settings */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageSquare className="h-5 w-5" />
            Parent Communication
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Control how insights are shared with parents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">
                Generate parent summaries
              </Label>
              <p className="text-muted-foreground text-xs">
                Create parent-friendly summaries from insights. When disabled,
                insights are still captured for your records.
              </p>
            </div>
            <Switch
              checked={trustLevel?.parentSummariesEnabled ?? true}
              onCheckedChange={handleParentSummariesToggle}
            />
          </div>

          {/* Sub-toggle: Skip sensitive insights - only visible when parent summaries enabled */}
          {(trustLevel?.parentSummariesEnabled ?? true) && (
            <div className="ml-4 flex items-center justify-between border-gray-200 border-l-2 pl-4">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">
                  Skip sensitive insights
                </Label>
                <p className="text-muted-foreground text-xs">
                  Exclude injury and behavioral insights from parent summaries.
                  They&apos;ll still be captured for your records but won&apos;t
                  generate messages to parents.
                </p>
              </div>
              <Switch
                checked={trustLevel?.skipSensitiveInsights ?? false}
                onCheckedChange={handleSkipSensitiveToggle}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Level Settings */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="h-5 w-5" />
            Trust Level
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Control how much automation you want for parent summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Trust Level Slider */}
          {trustLevel &&
            (() => {
              const nextLevel = (trustLevel.currentLevel ?? 0) + 1;
              const threshold =
                nextLevel === 1
                  ? TRUST_LEVEL_THRESHOLDS.level1
                  : nextLevel === 2
                    ? TRUST_LEVEL_THRESHOLDS.level2
                    : nextLevel === 3
                      ? TRUST_LEVEL_THRESHOLDS.level3
                      : 0;
              const currentCount = trustLevel.totalApprovals ?? 0;
              const percentage =
                threshold > 0
                  ? Math.min(100, (currentCount / threshold) * 100)
                  : 100;

              return (
                <TrustLevelSlider
                  currentLevel={trustLevel.currentLevel}
                  earnedLevel={trustLevel.currentLevel}
                  onLevelChange={handleTrustPreferenceUpdate}
                  preferredLevel={trustLevel.preferredLevel ?? null}
                  progressToNext={{ percentage, threshold, currentCount }}
                />
              );
            })()}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Choose when to be notified about voice note activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">
                Pending review alerts
              </Label>
              <p className="text-muted-foreground text-xs">
                Get notified when summaries need your review
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">
                Transcription complete
              </Label>
              <p className="text-muted-foreground text-xs">
                Notify when voice notes finish processing
              </p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
