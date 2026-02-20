"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";

type SwipeAction = "apply" | "dismiss" | "disabled";

export function GesturePreferences() {
  const params = useParams();
  const orgId = params.orgId as string;
  const user = useCurrentUser();

  // Query current preferences
  const preferences = useQuery(
    api.models.trustGatePermissions.getCoachOrgPreferences,
    user?._id && orgId ? { coachId: user._id, organizationId: orgId } : "skip"
  );

  const updatePreference = useMutation(
    api.models.trustGatePermissions.updateCoachOrgPreference
  );

  // Local state
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [swipeRightAction, setSwipeRightAction] =
    useState<SwipeAction>("apply");
  const [swipeLeftAction, setSwipeLeftAction] =
    useState<SwipeAction>("dismiss");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from preferences
  useEffect(() => {
    if (preferences) {
      setGesturesEnabled(preferences.gesturesEnabled ?? true);
      setSwipeRightAction(preferences.swipeRightAction ?? "apply");
      setSwipeLeftAction(preferences.swipeLeftAction ?? "dismiss");
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!orgId) {
      return;
    }

    setIsSaving(true);
    try {
      await updatePreference({
        organizationId: orgId,
        gesturesEnabled,
        swipeRightAction,
        swipeLeftAction,
      });
      toast.success("Gesture preferences saved successfully");
    } catch (error) {
      toast.error("Failed to save gesture preferences");
      console.error("Error saving gesture preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (preferences === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile Gestures</CardTitle>
          <CardDescription>
            Customize swipe gestures for insight cards (mobile only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Gestures</CardTitle>
        <CardDescription>
          Customize swipe gestures for insight cards (mobile only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Gestures Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="gestures-enabled">Enable Swipe Gestures</Label>
            <div className="text-muted-foreground text-sm">
              Allow swiping insight cards left or right to take quick actions
            </div>
          </div>
          <Switch
            checked={gesturesEnabled}
            id="gestures-enabled"
            onCheckedChange={setGesturesEnabled}
          />
        </div>

        {/* Swipe Right Action */}
        <div className="space-y-2">
          <Label htmlFor="swipe-right">Swipe Right Action</Label>
          <Select
            disabled={!gesturesEnabled}
            onValueChange={(value) => {
              setSwipeRightAction(value as SwipeAction);
            }}
            value={swipeRightAction}
          >
            <SelectTrigger id="swipe-right">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apply">Apply Insight</SelectItem>
              <SelectItem value="dismiss">Dismiss Insight</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Action to perform when swiping an insight card to the right
          </p>
        </div>

        {/* Swipe Left Action */}
        <div className="space-y-2">
          <Label htmlFor="swipe-left">Swipe Left Action</Label>
          <Select
            disabled={!gesturesEnabled}
            onValueChange={(value) => {
              setSwipeLeftAction(value as SwipeAction);
            }}
            value={swipeLeftAction}
          >
            <SelectTrigger id="swipe-left">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apply">Apply Insight</SelectItem>
              <SelectItem value="dismiss">Dismiss Insight</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Action to perform when swiping an insight card to the left
          </p>
        </div>

        {/* Save Button */}
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
