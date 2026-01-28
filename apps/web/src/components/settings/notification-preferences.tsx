"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bell, Loader2, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Notification Preferences component for settings page.
 * Implements US-014, US-015, US-016, US-017 acceptance criteria.
 */
export function NotificationPreferences() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Query preferences and mutations
  const preferences = useQuery(
    api.models.notificationPreferences.getNotificationPreferences,
    { organizationId: orgId }
  );
  const defaultPreferences = useQuery(
    api.models.notificationPreferences.getDefaultNotificationPreferences,
    {}
  );
  const updatePreferences = useMutation(
    api.models.notificationPreferences.updateNotificationPreferences
  );
  const updatePushSubscription = useMutation(
    api.models.notificationPreferences.updatePushSubscription
  );

  // Local state for optimistic updates
  const [localPrefs, setLocalPrefs] = useState<{
    emailEnabled: boolean;
    emailTeamUpdates: boolean;
    emailPlayerUpdates: boolean;
    emailAnnouncements: boolean;
    emailAssessments: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    inAppSound: boolean;
    inAppBadge: boolean;
  } | null>(null);

  const [pushStatus, setPushStatus] = useState<
    "enabled" | "disabled" | "blocked" | "loading"
  >("loading");
  const [saving, setSaving] = useState(false);

  // Initialize local state from preferences or defaults
  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        emailEnabled: preferences.emailEnabled,
        emailTeamUpdates: preferences.emailTeamUpdates,
        emailPlayerUpdates: preferences.emailPlayerUpdates,
        emailAnnouncements: preferences.emailAnnouncements,
        emailAssessments: preferences.emailAssessments,
        pushEnabled: preferences.pushEnabled,
        inAppEnabled: preferences.inAppEnabled,
        inAppSound: preferences.inAppSound,
        inAppBadge: preferences.inAppBadge,
      });
      setPushStatus(preferences.pushEnabled ? "enabled" : "disabled");
    } else if (defaultPreferences && !localPrefs) {
      setLocalPrefs({
        emailEnabled: defaultPreferences.emailEnabled,
        emailTeamUpdates: defaultPreferences.emailTeamUpdates,
        emailPlayerUpdates: defaultPreferences.emailPlayerUpdates,
        emailAnnouncements: defaultPreferences.emailAnnouncements,
        emailAssessments: defaultPreferences.emailAssessments,
        pushEnabled: defaultPreferences.pushEnabled,
        inAppEnabled: defaultPreferences.inAppEnabled,
        inAppSound: defaultPreferences.inAppSound,
        inAppBadge: defaultPreferences.inAppBadge,
      });
      setPushStatus("disabled");
    }
  }, [preferences, defaultPreferences, localPrefs]);

  // Check initial push notification permission status
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "denied"
    ) {
      setPushStatus("blocked");
    }
  }, []);

  // Save preferences to backend
  const savePreferences = async (
    newPrefs: Partial<typeof localPrefs>
  ): Promise<void> => {
    if (!localPrefs) {
      return;
    }

    const updatedPrefs = { ...localPrefs, ...newPrefs };
    setLocalPrefs(updatedPrefs);
    setSaving(true);

    try {
      await updatePreferences({
        organizationId: orgId,
        preferences: {
          emailEnabled: updatedPrefs.emailEnabled,
          emailTeamUpdates: updatedPrefs.emailTeamUpdates,
          emailPlayerUpdates: updatedPrefs.emailPlayerUpdates,
          emailAnnouncements: updatedPrefs.emailAnnouncements,
          emailAssessments: updatedPrefs.emailAssessments,
          pushEnabled: updatedPrefs.pushEnabled,
          pushSubscription: undefined,
          inAppEnabled: updatedPrefs.inAppEnabled,
          inAppSound: updatedPrefs.inAppSound,
          inAppBadge: updatedPrefs.inAppBadge,
        },
      });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences");
      // Revert on error
      if (preferences) {
        setLocalPrefs({
          emailEnabled: preferences.emailEnabled,
          emailTeamUpdates: preferences.emailTeamUpdates,
          emailPlayerUpdates: preferences.emailPlayerUpdates,
          emailAnnouncements: preferences.emailAnnouncements,
          emailAssessments: preferences.emailAssessments,
          pushEnabled: preferences.pushEnabled,
          inAppEnabled: preferences.inAppEnabled,
          inAppSound: preferences.inAppSound,
          inAppBadge: preferences.inAppBadge,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle push notification toggle
  const handlePushToggle = async (enabled: boolean): Promise<void> => {
    if (enabled) {
      // Request permission
      if (!("Notification" in window)) {
        toast.error("Push notifications are not supported in this browser");
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setPushStatus("enabled");
          await updatePushSubscription({
            organizationId: orgId,
            pushEnabled: true,
            pushSubscription: undefined, // Could add actual subscription here
          });
          savePreferences({ pushEnabled: true });
          toast.success("Push notifications enabled");
        } else if (permission === "denied") {
          setPushStatus("blocked");
          toast.error(
            "Push notifications blocked. Please enable them in your browser settings."
          );
        }
      } catch (error) {
        console.error("Error requesting push permission:", error);
        toast.error("Failed to enable push notifications");
      }
    } else {
      setPushStatus("disabled");
      await updatePushSubscription({
        organizationId: orgId,
        pushEnabled: false,
        pushSubscription: undefined,
      });
      savePreferences({ pushEnabled: false });
      toast.success("Push notifications disabled");
    }
  };

  if (!localPrefs) {
    return (
      <Card data-testid="notification-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Loading notification settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="notification-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Control how you receive updates and alerts from the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Email Notifications Section */}
        <div className="space-y-4" data-testid="email-notifications">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Email Notifications</h3>
          </div>

          {/* Master Email Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label className="font-medium" htmlFor="email-master">
                Enable Email Notifications
              </Label>
              <p className="text-muted-foreground text-sm">
                Master toggle for all email notifications
              </p>
            </div>
            <Switch
              aria-checked={localPrefs.emailEnabled}
              checked={localPrefs.emailEnabled}
              data-testid="email-notification-toggle"
              id="email-master"
              onCheckedChange={(checked) =>
                savePreferences({ emailEnabled: checked })
              }
              role="switch"
            />
          </div>

          {/* Individual Email Toggles */}
          <div
            className={`space-y-3 pl-4 ${localPrefs.emailEnabled ? "" : "opacity-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-team">Team Updates</Label>
                <p className="text-muted-foreground text-xs">
                  Schedule changes, roster updates
                </p>
              </div>
              <Switch
                aria-checked={localPrefs.emailTeamUpdates}
                checked={localPrefs.emailTeamUpdates}
                disabled={!localPrefs.emailEnabled}
                id="email-team"
                onCheckedChange={(checked) =>
                  savePreferences({ emailTeamUpdates: checked })
                }
                role="switch"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-player">Player Updates</Label>
                <p className="text-muted-foreground text-xs">
                  Progress reports, assessment results
                </p>
              </div>
              <Switch
                aria-checked={localPrefs.emailPlayerUpdates}
                checked={localPrefs.emailPlayerUpdates}
                disabled={!localPrefs.emailEnabled}
                id="email-player"
                onCheckedChange={(checked) =>
                  savePreferences({ emailPlayerUpdates: checked })
                }
                role="switch"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-announcements">Announcements</Label>
                <p className="text-muted-foreground text-xs">
                  Organization-wide announcements
                </p>
              </div>
              <Switch
                aria-checked={localPrefs.emailAnnouncements}
                checked={localPrefs.emailAnnouncements}
                disabled={!localPrefs.emailEnabled}
                id="email-announcements"
                onCheckedChange={(checked) =>
                  savePreferences({ emailAnnouncements: checked })
                }
                role="switch"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-assessments">Assessment Reminders</Label>
                <p className="text-muted-foreground text-xs">
                  Upcoming and overdue assessments
                </p>
              </div>
              <Switch
                aria-checked={localPrefs.emailAssessments}
                checked={localPrefs.emailAssessments}
                disabled={!localPrefs.emailEnabled}
                id="email-assessments"
                onCheckedChange={(checked) =>
                  savePreferences({ emailAssessments: checked })
                }
                role="switch"
              />
            </div>
          </div>
        </div>

        {/* Push Notifications Section */}
        <div className="space-y-4" data-testid="push-notifications">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Push Notifications</h3>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label className="font-medium" htmlFor="push-master">
                Enable Push Notifications
              </Label>
              <p className="text-muted-foreground text-sm">
                {pushStatus === "blocked"
                  ? "Blocked in browser settings"
                  : pushStatus === "enabled"
                    ? "Enabled"
                    : "Receive browser notifications"}
              </p>
            </div>
            <Switch
              aria-checked={pushStatus === "enabled"}
              checked={pushStatus === "enabled"}
              data-testid="push-notification-toggle"
              disabled={pushStatus === "blocked" || pushStatus === "loading"}
              id="push-master"
              onCheckedChange={handlePushToggle}
              role="switch"
            />
          </div>

          {pushStatus === "blocked" && (
            <p className="text-amber-600 text-sm">
              Push notifications are blocked. To enable them, update your
              browser permissions for this site.
            </p>
          )}
        </div>

        {/* In-App Notifications Section */}
        <div className="space-y-4" data-testid="in-app-notifications">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">In-App Notifications</h3>
          </div>

          {/* Master In-App Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label className="font-medium" htmlFor="inapp-master">
                Enable In-App Notifications
              </Label>
              <p className="text-muted-foreground text-sm">
                Show notifications within the application
              </p>
            </div>
            <Switch
              aria-checked={localPrefs.inAppEnabled}
              checked={localPrefs.inAppEnabled}
              data-testid="in-app-notification-toggle"
              id="inapp-master"
              onCheckedChange={(checked) =>
                savePreferences({ inAppEnabled: checked })
              }
              role="switch"
            />
          </div>

          {/* In-App Options */}
          <div
            className={`space-y-3 pl-4 ${localPrefs.inAppEnabled ? "" : "opacity-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inapp-sound">Sound Alerts</Label>
                <p className="text-muted-foreground text-xs">
                  Play sound when notifications arrive
                </p>
              </div>
              <Switch
                aria-checked={localPrefs.inAppSound}
                checked={localPrefs.inAppSound}
                disabled={!localPrefs.inAppEnabled}
                id="inapp-sound"
                onCheckedChange={(checked) =>
                  savePreferences({ inAppSound: checked })
                }
                role="switch"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inapp-badge">Badge Count</Label>
                <p className="text-muted-foreground text-xs">
                  Show unread notification count
                </p>
              </div>
              <Switch
                aria-checked={localPrefs.inAppBadge}
                checked={localPrefs.inAppBadge}
                disabled={!localPrefs.inAppEnabled}
                id="inapp-badge"
                onCheckedChange={(checked) =>
                  savePreferences({ inAppBadge: checked })
                }
                role="switch"
              />
            </div>
          </div>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving changes...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
