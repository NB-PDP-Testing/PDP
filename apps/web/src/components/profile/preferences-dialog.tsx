"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { BarChart3, Check, Info, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/interactions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDefaultPreference } from "@/hooks/use-default-preference";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { authClient } from "@/lib/auth-client";

type FunctionalRole = "admin" | "coach" | "parent" | "player";

/**
 * Preferences Dialog
 *
 * Modal dialog for user preferences and default settings.
 * Includes login preferences, usage patterns, and display settings.
 *
 * Desktop: Centered modal (650px max-width)
 * Mobile: Bottom sheet with scrollable content
 */
export function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { preferences, setDefault, clearDefault, isLoading } =
    useDefaultPreference();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: user } = authClient.useSession();
  const { useOrgUsageTracking } = useUXFeatureFlags();
  const usageInsights = useQuery(
    api.models.userPreferences.getUsageInsights,
    user?.user?.id ? { userId: user.user.id } : "skip"
  );

  // Local state for form
  const [preferenceMode, setPreferenceMode] = useState<"smart" | "manual">(
    "smart"
  );
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<FunctionalRole>("coach");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form from preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.preferredDefaultOrg && preferences.preferredDefaultRole) {
        setPreferenceMode("manual");
        setSelectedOrg(preferences.preferredDefaultOrg);
        setSelectedRole(preferences.preferredDefaultRole);
      } else {
        setPreferenceMode("smart");
      }
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (preferenceMode === "manual") {
        if (!selectedOrg) {
          toast.error("Please select an organization");
          setIsSaving(false);
          return;
        }

        await setDefault(selectedOrg, selectedRole);
        toast.success(
          `Preferences saved! You'll now land on ${getOrgName(selectedOrg)} - ${getRoleLabel(selectedRole)} on login.`
        );
      } else {
        // Smart mode - clear explicit preference
        await clearDefault();
        toast.success(
          "Preferences saved! You'll use smart role-based defaults on login."
        );
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getOrgName = (orgId: string): string =>
    organizations?.find((org) => org.id === orgId)?.name || "Unknown";

  const getRoleLabel = (role: FunctionalRole): string => {
    const labels: Record<FunctionalRole, string> = {
      admin: "Admin",
      coach: "Coach",
      parent: "Parent",
      player: "Player",
    };
    return labels[role];
  };

  if (isLoading) {
    return null;
  }

  return (
    <ResponsiveDialog
      contentClassName="sm:max-w-[650px]"
      description="Customize your login and display settings"
      onOpenChange={onOpenChange}
      open={open}
      title="Preferences"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-1">
        {/* Login Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Login Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preference Mode Selection */}
            <RadioGroup
              onValueChange={(value) =>
                setPreferenceMode(value as "smart" | "manual")
              }
              value={preferenceMode}
            >
              {/* Smart Default Option */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem className="mt-1" id="smart" value="smart" />
                <div className="flex-1">
                  <Label
                    className="cursor-pointer font-medium text-base"
                    htmlFor="smart"
                  >
                    Smart default (based on my role)
                  </Label>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {user?.user?.isPlatformStaff ? (
                      <>
                        As platform staff, you'll land on the{" "}
                        <strong>organization listing page</strong>.
                      </>
                    ) : (
                      <>
                        We'll redirect you based on role priority:{" "}
                        <strong>Admin → Coach → Parent → Player</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Manual Preference Option */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem className="mt-1" id="manual" value="manual" />
                <div className="flex-1">
                  <Label
                    className="cursor-pointer font-medium text-base"
                    htmlFor="manual"
                  >
                    My preferred page
                  </Label>
                  <p className="mt-1 mb-4 text-muted-foreground text-sm">
                    Choose a specific organization and role to land on every
                    time
                  </p>

                  {/* Org and Role Selectors - only show when manual mode selected */}
                  {preferenceMode === "manual" && (
                    <div className="space-y-4 rounded-lg border p-4">
                      {/* Organization Selector */}
                      <div>
                        <Label className="mb-2 block" htmlFor="org-select">
                          Default Organization
                        </Label>
                        <Select
                          onValueChange={setSelectedOrg}
                          value={selectedOrg}
                        >
                          <SelectTrigger id="org-select">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations?.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Role Selector */}
                      <div>
                        <Label className="mb-2 block" htmlFor="role-select">
                          Default Role
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setSelectedRole(value as FunctionalRole)
                          }
                          value={selectedRole}
                        >
                          <SelectTrigger id="role-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="player">Player</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {preferenceMode === "smart" ? (
                  <>
                    Smart defaults will automatically take you to the right
                    place based on your role in your first organization
                    (alphabetically).
                  </>
                ) : (
                  <>
                    You can change this anytime. Your preference will apply
                    across all devices.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Usage Insights Card - Phase 2B (feature flagged) */}
        {useOrgUsageTracking && usageInsights && usageInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Your Usage Patterns
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                We track which org/role combinations you use most to help
                suggest better defaults
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usageInsights.slice(0, 5).map((insight, index) => {
                  const org = organizations?.find(
                    (o) => o.id === insight.orgId
                  );
                  const isTopUsed = index === 0;

                  return (
                    <div
                      className="flex items-center justify-between rounded-lg border p-3"
                      key={`${insight.orgId}-${insight.role}`}
                    >
                      <div className="flex items-center gap-3">
                        {isTopUsed && (
                          <TrendingUp className="h-4 w-4 flex-shrink-0 text-green-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {org?.name || "Unknown Org"} -{" "}
                            {getRoleLabel(insight.role)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {insight.accessCount} visits •{" "}
                            {Math.round(insight.totalMinutesSpent)} min total
                          </p>
                        </div>
                      </div>
                      {isTopUsed &&
                        preferences?.preferredDefaultOrg !== insight.orgId && (
                          <Button
                            onClick={() => {
                              setPreferenceMode("manual");
                              setSelectedOrg(insight.orgId);
                              setSelectedRole(insight.role);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Set as default
                          </Button>
                        )}
                    </div>
                  );
                })}
              </div>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  These patterns update automatically as you use the app. Your
                  most-used combination appears at the top.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Display Preferences Card - Placeholder for Phase 2B */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Display Preferences
              <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                Coming Soon
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">UI Density</Label>
                <Select disabled value="comfortable">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer with action buttons */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button onClick={() => onOpenChange(false)} variant="outline">
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
