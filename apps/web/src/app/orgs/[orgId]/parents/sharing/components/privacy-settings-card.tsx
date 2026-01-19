"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Eye, EyeOff, Info, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PrivacySettingsCardProps = {
  guardianIdentityId: Id<"guardianIdentities">;
};

/**
 * Privacy settings card for controlling enrollment visibility
 * Allows parents to control whether coaches at other organizations
 * can see that their children are enrolled at multiple clubs
 */
export function PrivacySettingsCard({
  guardianIdentityId,
}: PrivacySettingsCardProps) {
  const [savingChild, setSavingChild] = useState<string | null>(null);

  // Fetch visibility settings for all children
  const visibilitySettings = useQuery(
    api.models.passportSharing.getEnrollmentVisibilityForAllChildren,
    { guardianIdentityId }
  );

  // Update mutation
  const updateVisibility = useMutation(
    api.models.passportSharing.updateEnrollmentVisibility
  );

  const handleToggle = async (
    playerIdentityId: Id<"playerIdentities"> | undefined,
    newValue: boolean,
    playerName?: string
  ) => {
    const key = playerIdentityId || "global";
    setSavingChild(key);

    try {
      await updateVisibility({
        guardianIdentityId,
        playerIdentityId,
        allowEnrollmentVisibility: newValue,
      });

      const childLabel = playerName || "all children";
      toast.success(
        newValue
          ? `Enrollment visibility enabled for ${childLabel}`
          : `Enrollment visibility hidden for ${childLabel}`
      );
    } catch (error) {
      console.error("Failed to update visibility:", error);
      toast.error("Failed to update setting. Please try again.");
    } finally {
      setSavingChild(null);
    }
  };

  // Loading state
  if (visibilitySettings === undefined) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <CardTitle>Privacy Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No children linked
  if (visibilitySettings.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <CardTitle>Privacy Settings</CardTitle>
        </div>
        <CardDescription>
          Control whether coaches at other organizations can see that your
          children are enrolled at multiple clubs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Explanation */}
        <div className="rounded-lg bg-blue-50 p-4 text-blue-800 text-sm">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">What does this control?</p>
              <p className="mt-1 text-blue-700">
                When enabled, coaches at other organizations can see that your
                child plays at multiple clubs and may request access to their
                passport. When disabled, your child's enrollment at other clubs
                remains private.
              </p>
            </div>
          </div>
        </div>

        {/* Per-child toggles */}
        <div className="space-y-4">
          <Label className="font-medium text-sm">Per-Child Settings</Label>
          {visibilitySettings.map((setting) => (
            <div
              className="flex items-center justify-between rounded-lg border p-4"
              key={setting.playerIdentityId}
            >
              <div className="flex items-center gap-3">
                {setting.allowEnrollmentVisibility ? (
                  <Eye className="h-5 w-5 text-green-600" />
                ) : (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">{setting.playerName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {setting.source === "player_specific" ? (
                      <Badge className="text-xs" variant="outline">
                        Custom setting
                      </Badge>
                    ) : setting.source === "global" ? (
                      <Badge className="text-xs" variant="secondary">
                        Using global
                      </Badge>
                    ) : (
                      <Badge className="text-xs" variant="secondary">
                        Default (visible)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      {savingChild === setting.playerIdentityId && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={setting.allowEnrollmentVisibility}
                        disabled={savingChild === setting.playerIdentityId}
                        onCheckedChange={(checked) =>
                          handleToggle(
                            setting.playerIdentityId,
                            checked,
                            setting.playerName
                          )
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {setting.allowEnrollmentVisibility
                      ? "Click to hide enrollment from other orgs"
                      : "Click to allow other orgs to see enrollment"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
