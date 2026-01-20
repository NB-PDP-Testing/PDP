"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bell, Brain, Shield } from "lucide-react";
import { toast } from "sonner";
import { TrustPreferenceSettings } from "@/components/coach/trust-preference-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

  const handleTrustPreferenceUpdate = async (preferredLevel: number) => {
    try {
      await setPreferredLevel({
        organizationId: orgId,
        preferredLevel,
      });
      toast.success("Trust preferences updated");
    } catch (error) {
      toast.error("Failed to update trust preferences");
      console.error("Error updating trust preferences:", error);
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
          {/* Trust Preference Settings */}
          {trustLevel && (
            <TrustPreferenceSettings
              currentLevel={trustLevel.currentLevel}
              onUpdate={handleTrustPreferenceUpdate}
              preferredLevel={trustLevel.preferredLevel ?? null}
            />
          )}
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
