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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";

type NotificationChannel = "push" | "email" | "digest" | "none";
type PriorityLevel = "critical" | "important" | "normal";

export function NotificationPreferences() {
  const params = useParams();
  const orgId = params.orgId as string;
  const user = useCurrentUser();

  // Query current preferences
  const preferences = useQuery(
    api.models.coachTrustLevels.getNotificationPreferences,
    orgId ? { organizationId: orgId } : "skip"
  );

  const savePreferences = useMutation(
    api.models.coachTrustLevels.setNotificationPreferences
  );

  // Local state
  const [channels, setChannels] = useState<
    Record<PriorityLevel, NotificationChannel[]>
  >({
    critical: ["push", "email"],
    important: ["push", "email"],
    normal: ["push", "email"],
  });

  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("08:00");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences when data arrives
  useEffect(() => {
    if (preferences) {
      setChannels({
        critical: preferences.notificationChannels
          .critical as NotificationChannel[],
        important: preferences.notificationChannels
          .important as NotificationChannel[],
        normal: preferences.notificationChannels
          .normal as NotificationChannel[],
      });
      setDigestEnabled(preferences.digestSchedule.enabled);
      setDigestTime(preferences.digestSchedule.time);
      setQuietHoursEnabled(preferences.quietHours.enabled);
      setQuietStart(preferences.quietHours.start);
      setQuietEnd(preferences.quietHours.end);
    }
  }, [preferences]);

  const toggleChannel = (
    priority: PriorityLevel,
    channel: NotificationChannel
  ) => {
    setChannels((prev) => {
      const currentChannels = prev[priority];
      const isSelected = currentChannels.includes(channel);

      if (isSelected) {
        // Remove channel
        return {
          ...prev,
          [priority]: currentChannels.filter((c) => c !== channel),
        };
      }

      // Add channel
      return {
        ...prev,
        [priority]: [...currentChannels, channel],
      };
    });
  };

  const handleSave = async () => {
    if (!(user && orgId)) {
      return;
    }

    setIsSaving(true);
    try {
      await savePreferences({
        organizationId: orgId,
        notificationChannels: channels,
        digestSchedule: {
          enabled: digestEnabled,
          time: digestTime,
        },
        quietHours: {
          enabled: quietHoursEnabled,
          start: quietStart,
          end: quietEnd,
        },
      });

      toast.success("Notification preferences saved successfully");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const priorityLevels: {
    key: PriorityLevel;
    label: string;
    description: string;
  }[] = [
    {
      key: "critical",
      label: "Critical",
      description: "Injuries, urgent issues",
    },
    {
      key: "important",
      label: "Important",
      description: "Important updates, concerns",
    },
    {
      key: "normal",
      label: "Normal",
      description: "General activity, comments",
    },
  ];

  const channelOptions: { key: NotificationChannel; label: string }[] = [
    { key: "push", label: "Push" },
    { key: "email", label: "Email" },
    { key: "digest", label: "Digest" },
    { key: "none", label: "None" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Customize how you receive notifications for team activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels Matrix */}
          <div>
            <h3 className="mb-4 font-semibold text-sm">
              Notification Channels
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 text-left font-medium text-sm">
                      Priority
                    </th>
                    {channelOptions.map((channel) => (
                      <th
                        className="border p-2 text-center font-medium text-sm"
                        key={channel.key}
                      >
                        {channel.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priorityLevels.map((priority) => (
                    <tr key={priority.key}>
                      <td className="border p-2">
                        <div>
                          <div className="font-medium text-sm">
                            {priority.label}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {priority.description}
                          </div>
                        </div>
                      </td>
                      {channelOptions.map((channel) => {
                        const isChecked = channels[priority.key].includes(
                          channel.key
                        );
                        return (
                          <td
                            className="border p-2 text-center"
                            key={channel.key}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => {
                                toggleChannel(priority.key, channel.key);
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Digest Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="digest-enabled">Daily Digest</Label>
                <p className="text-muted-foreground text-sm">
                  Receive batched notifications once per day
                </p>
              </div>
              <Switch
                checked={digestEnabled}
                id="digest-enabled"
                onCheckedChange={setDigestEnabled}
              />
            </div>
            {digestEnabled && (
              <div className="ml-0 space-y-2">
                <Label htmlFor="digest-time">Delivery Time</Label>
                <Input
                  className="w-full max-w-xs"
                  id="digest-time"
                  onChange={(e) => {
                    setDigestTime(e.target.value);
                  }}
                  type="time"
                  value={digestTime}
                />
              </div>
            )}
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-hours-enabled">Quiet Hours</Label>
                <p className="text-muted-foreground text-sm">
                  Suppress notifications during specified hours
                </p>
              </div>
              <Switch
                checked={quietHoursEnabled}
                id="quiet-hours-enabled"
                onCheckedChange={setQuietHoursEnabled}
              />
            </div>
            {quietHoursEnabled && (
              <div className="ml-0 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    onChange={(e) => {
                      setQuietStart(e.target.value);
                    }}
                    type="time"
                    value={quietStart}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    onChange={(e) => {
                      setQuietEnd(e.target.value);
                    }}
                    type="time"
                    value={quietEnd}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button disabled={isSaving || !user} onClick={handleSave}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationPreferences;
