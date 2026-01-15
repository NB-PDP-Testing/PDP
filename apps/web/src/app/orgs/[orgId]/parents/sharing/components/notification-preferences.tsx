"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
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

type NotificationPreferencesProps = {
  guardianIdentityId: Id<"guardianIdentities">;
  playerIdentityId?: Id<"playerIdentities">;
};

export function NotificationPreferences({
  guardianIdentityId,
  playerIdentityId,
}: NotificationPreferencesProps) {
  // Fetch current preferences
  const preferences = useQuery(
    api.models.passportSharing.getNotificationPreferences,
    {
      guardianIdentityId,
      playerIdentityId,
    }
  );

  // Update mutation
  const updatePreferences = useMutation(
    api.models.passportSharing.updateNotificationPreferences
  );

  // Local state for form
  const [accessFrequency, setAccessFrequency] = useState<
    "realtime" | "daily" | "weekly" | "none"
  >("weekly");
  const [notifyOnCoachRequest, setNotifyOnCoachRequest] = useState(true);
  const [notifyOnShareExpiring, setNotifyOnShareExpiring] = useState(true);
  const [notifyOnGuardianChange, setNotifyOnGuardianChange] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with current preferences
  useEffect(() => {
    if (preferences) {
      setAccessFrequency(preferences.accessNotificationFrequency);
      setNotifyOnCoachRequest(preferences.notifyOnCoachRequest ?? true);
      setNotifyOnShareExpiring(preferences.notifyOnShareExpiring ?? true);
      setNotifyOnGuardianChange(preferences.notifyOnGuardianChange ?? true);
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        guardianIdentityId,
        playerIdentityId,
        accessNotificationFrequency: accessFrequency,
        notifyOnCoachRequest,
        notifyOnShareExpiring,
        notifyOnGuardianChange,
      });
      toast.success("Notification preferences saved");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardDescription>
          Configure how often you want to be notified about sharing activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Access notification frequency */}
        <div className="space-y-2">
          <Label htmlFor="access-frequency">
            Data Access Notification Frequency
          </Label>
          <Select
            onValueChange={(value) =>
              setAccessFrequency(
                value as "realtime" | "daily" | "weekly" | "none"
              )
            }
            value={accessFrequency}
          >
            <SelectTrigger id="access-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">
                Real-time (Immediate notification for each access)
              </SelectItem>
              <SelectItem value="daily">
                Daily (Daily digest of all access)
              </SelectItem>
              <SelectItem value="weekly">
                Weekly (Weekly digest - Recommended)
              </SelectItem>
              <SelectItem value="none">
                None (No access notifications)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            How often you'll be notified when coaches view your child's shared
            data.
          </p>
        </div>

        {/* Other notification toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-coach-request">
                Coach Access Requests
              </Label>
              <p className="text-muted-foreground text-sm">
                Notify when a coach requests access to your child's passport
              </p>
            </div>
            <Switch
              checked={notifyOnCoachRequest}
              id="notify-coach-request"
              onCheckedChange={setNotifyOnCoachRequest}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-expiring">Share Expiring Soon</Label>
              <p className="text-muted-foreground text-sm">
                Notify 14 days before a sharing consent expires
              </p>
            </div>
            <Switch
              checked={notifyOnShareExpiring}
              id="notify-expiring"
              onCheckedChange={setNotifyOnShareExpiring}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-guardian-change">
                Other Guardian Changes
              </Label>
              <p className="text-muted-foreground text-sm">
                Notify when another guardian creates, updates, or revokes
                sharing
              </p>
            </div>
            <Switch
              checked={notifyOnGuardianChange}
              id="notify-guardian-change"
              onCheckedChange={setNotifyOnGuardianChange}
            />
          </div>
        </div>

        {/* Save button */}
        <Button className="w-full" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
