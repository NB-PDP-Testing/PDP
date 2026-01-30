"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  HelpCircle,
  RefreshCw,
  Save,
  UserPlus,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OnboardingSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Form state
  const [invitationExpirationDays, setInvitationExpirationDays] = useState(7);
  const [autoReInviteOnExpiration, setAutoReInviteOnExpiration] =
    useState(false);
  const [maxAutoReInvitesPerInvitation, setMaxAutoReInvitesPerInvitation] =
    useState(2);
  const [notifyAdminsOnInvitationRequest, setNotifyAdminsOnInvitationRequest] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Queries and mutations
  const settings = useQuery(api.models.organizations.getOnboardingSettings, {
    organizationId: orgId,
  });
  const updateSettings = useMutation(
    api.models.organizations.updateOnboardingSettings
  );

  // Populate form from query
  useEffect(() => {
    if (settings) {
      setInvitationExpirationDays(settings.invitationExpirationDays);
      setAutoReInviteOnExpiration(settings.autoReInviteOnExpiration);
      setMaxAutoReInvitesPerInvitation(settings.maxAutoReInvitesPerInvitation);
      setNotifyAdminsOnInvitationRequest(
        settings.notifyAdminsOnInvitationRequest
      );
      setHasChanges(false);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed =
        invitationExpirationDays !== settings.invitationExpirationDays ||
        autoReInviteOnExpiration !== settings.autoReInviteOnExpiration ||
        maxAutoReInvitesPerInvitation !==
          settings.maxAutoReInvitesPerInvitation ||
        notifyAdminsOnInvitationRequest !==
          settings.notifyAdminsOnInvitationRequest;
      setHasChanges(changed);
    }
  }, [
    settings,
    invitationExpirationDays,
    autoReInviteOnExpiration,
    maxAutoReInvitesPerInvitation,
    notifyAdminsOnInvitationRequest,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        organizationId: orgId,
        invitationExpirationDays,
        autoReInviteOnExpiration,
        maxAutoReInvitesPerInvitation,
        notifyAdminsOnInvitationRequest,
      });
      toast.success("Onboarding settings saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(
        (error as Error)?.message || "Failed to save onboarding settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setInvitationExpirationDays(settings.invitationExpirationDays);
      setAutoReInviteOnExpiration(settings.autoReInviteOnExpiration);
      setMaxAutoReInvitesPerInvitation(settings.maxAutoReInvitesPerInvitation);
      setNotifyAdminsOnInvitationRequest(
        settings.notifyAdminsOnInvitationRequest
      );
      setHasChanges(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-3xl tracking-tight">
            <UserPlus className="h-8 w-8" />
            Onboarding Settings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Configure how new members are invited and onboarded to your
            organization
          </p>
        </div>

        {/* Invitation Expiration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Invitation Expiration
            </CardTitle>
            <CardDescription>
              How long invitations remain valid before expiring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="expiration-days">Days until expiration</Label>
                <p className="text-muted-foreground text-sm">
                  Invitations will expire after this many days if not accepted
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-20 text-center"
                  id="expiration-days"
                  max={30}
                  min={1}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(value) && value >= 1 && value <= 30) {
                      setInvitationExpirationDays(value);
                    }
                  }}
                  type="number"
                  value={invitationExpirationDays}
                />
                <span className="text-muted-foreground text-sm">days</span>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-blue-800 text-sm dark:text-blue-200">
                Shorter expiration periods are more secure but may inconvenience
                users who don't check email frequently. The default of 7 days
                works well for most organizations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto Re-invite */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Automatic Re-invitation
            </CardTitle>
            <CardDescription>
              Automatically resend expired invitations to users who haven't
              joined
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="cursor-pointer" htmlFor="auto-reinvite">
                  Enable automatic re-invitations
                </Label>
                <p className="text-muted-foreground text-sm">
                  When enabled, expired invitations are automatically resent
                </p>
              </div>
              <Switch
                checked={autoReInviteOnExpiration}
                id="auto-reinvite"
                onCheckedChange={setAutoReInviteOnExpiration}
              />
            </div>

            {autoReInviteOnExpiration && (
              <div className="ml-4 space-y-4 border-muted border-l-2 pl-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="max-reinvites">
                      Maximum re-invitations per user
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Stop auto-resending after this many attempts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-20 text-center"
                      id="max-reinvites"
                      max={10}
                      min={1}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(value) && value >= 1 && value <= 10) {
                          setMaxAutoReInvitesPerInvitation(value);
                        }
                      }}
                      type="number"
                      value={maxAutoReInvitesPerInvitation}
                    />
                    <span className="text-muted-foreground text-sm">times</span>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-amber-800 text-sm dark:text-amber-200">
                      Be mindful of email fatigue. Too many re-invitations may
                      annoy recipients or trigger spam filters.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Admin Notifications
            </CardTitle>
            <CardDescription>
              Control when organization admins are notified about invitation
              activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer" htmlFor="notify-on-request">
                    Notify on invitation requests
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        When users click an expired invitation link, they can
                        request a new invitation. This setting controls whether
                        admins are notified of these requests.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground text-sm">
                  Get notified when users request new invitations
                </p>
              </div>
              <Switch
                checked={notifyAdminsOnInvitationRequest}
                id="notify-on-request"
                onCheckedChange={setNotifyAdminsOnInvitationRequest}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        <Card className="border-muted bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Clock className="mr-1 h-3 w-3" />
                Expires in {invitationExpirationDays} days
              </Badge>
              <Badge variant={autoReInviteOnExpiration ? "default" : "outline"}>
                <RefreshCw className="mr-1 h-3 w-3" />
                {autoReInviteOnExpiration
                  ? `Auto re-invite (max ${maxAutoReInvitesPerInvitation})`
                  : "No auto re-invite"}
              </Badge>
              <Badge
                variant={
                  notifyAdminsOnInvitationRequest ? "default" : "outline"
                }
              >
                <Bell className="mr-1 h-3 w-3" />
                {notifyAdminsOnInvitationRequest
                  ? "Notify on requests"
                  : "Silent requests"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2">
            {hasChanges ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground text-sm">
                  You have unsaved changes
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground text-sm">
                  All changes saved
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleReset} size="sm" variant="ghost">
                Reset
              </Button>
            )}
            <Button disabled={!hasChanges || saving} onClick={handleSave}>
              {saving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
