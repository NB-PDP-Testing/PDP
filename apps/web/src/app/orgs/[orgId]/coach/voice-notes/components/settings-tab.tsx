"use client";

import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { Bell, Brain, Shield, Sparkles } from "lucide-react";
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

export function SettingsTab({ orgId: _orgId }: SettingsTabProps) {
  // Placeholder settings - these will be connected to backend in Phase 2
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

      {/* Trust Level - Coming in Phase 2 */}
      <Card className="border-dashed opacity-75">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="h-5 w-5" />
            Trust Level
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs">
              Coming Soon
            </span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Control how much automation you want for parent summaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <p className="font-medium text-sm">Trust Curve System</p>
            <p className="mt-1 text-muted-foreground text-xs">
              As you approve more summaries, you'll unlock higher automation
              levels. Start with manual review, progress to auto-approval for
              routine updates.
            </p>
          </div>
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
