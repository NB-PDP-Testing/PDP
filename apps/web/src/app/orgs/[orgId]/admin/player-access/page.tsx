"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
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

export default function PlayerAccessSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Fetch current policy
  const policy = useQuery(api.models.playerSelfAccess.getOrgPolicy, {
    organizationId: orgId,
  });

  // Get access logs
  const accessLogs = useQuery(api.models.playerSelfAccess.getOrgAccessLogs, {
    organizationId: orgId,
    limit: 20,
  });

  const upsertPolicy = useMutation(api.models.playerSelfAccess.upsertOrgPolicy);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [minimumAge, setMinimumAge] = useState(14);
  const [requireGuardianApproval, setRequireGuardianApproval] = useState(true);
  const [requireCoachRecommendation, setRequireCoachRecommendation] =
    useState(false);
  const [notifyGuardianOnLogin, setNotifyGuardianOnLogin] = useState(true);
  const [trackPlayerViews, setTrackPlayerViews] = useState(true);
  const [visibility, setVisibility] = useState({
    skillRatings: true,
    skillHistory: true,
    publicCoachNotes: true,
    benchmarkComparison: true,
    practiceRecommendations: true,
    developmentGoals: true,
    injuryStatus: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load policy into form
  useEffect(() => {
    if (policy) {
      setIsEnabled(policy.isEnabled);
      setMinimumAge(policy.minimumAge);
      setRequireGuardianApproval(policy.requireGuardianApproval);
      setRequireCoachRecommendation(policy.requireCoachRecommendation ?? false);
      setNotifyGuardianOnLogin(policy.notifyGuardianOnLogin);
      setTrackPlayerViews(policy.trackPlayerViews);
      setVisibility(policy.defaultVisibility);
    }
  }, [policy]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertPolicy({
        organizationId: orgId,
        isEnabled,
        minimumAge,
        requireGuardianApproval,
        requireCoachRecommendation,
        defaultVisibility: visibility,
        notifyGuardianOnLogin,
        trackPlayerViews,
      });

      toast.success("Settings saved", {
        description: "Player access policy has been updated.",
      });
      setHasChanges(false);
    } catch (error) {
      toast.error("Error", {
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  if (policy === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Player Self-Access Settings</h1>
          <p className="text-muted-foreground">
            Configure how players can directly access their development data
          </p>
        </div>
        <Badge
          className={isEnabled ? "bg-green-500" : ""}
          variant={isEnabled ? "default" : "secondary"}
        >
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main Settings */}
        <div className="space-y-6">
          {/* Master Switch */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Enable Player Self-Access
              </CardTitle>
              <CardDescription>
                Allow players to create accounts and view their own development
                data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Player Access</p>
                  <p className="text-muted-foreground text-sm">
                    When enabled, eligible players can log in and view their
                    passport
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => {
                    setIsEnabled(checked);
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Age Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Age Requirements
              </CardTitle>
              <CardDescription>
                Set minimum age for player self-access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minAge">Minimum Age</Label>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    id="minAge"
                    max={18}
                    min={8}
                    onChange={(e) => {
                      setMinimumAge(Number(e.target.value));
                      setHasChanges(true);
                    }}
                    type="number"
                    value={minimumAge}
                  />
                  <span className="text-muted-foreground text-sm">
                    years old
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Players younger than this cannot have direct access, even with
                  guardian approval.
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium text-sm">
                  Recommended Age Guidelines
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                  <li>• U6-U9: Disabled (too young)</li>
                  <li>• U10-U13: Optional, guardian control</li>
                  <li>• U14-U17: Enabled with guardian approval</li>
                  <li>• 18+: Auto-enabled (full autonomy)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Approval Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Approval Requirements
              </CardTitle>
              <CardDescription>
                Control who must approve player access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Guardian Approval Required</Label>
                  <p className="text-muted-foreground text-xs">
                    Parents/guardians must explicitly enable access for their
                    child
                  </p>
                </div>
                <Checkbox
                  checked={requireGuardianApproval}
                  onCheckedChange={(checked) => {
                    setRequireGuardianApproval(checked === true);
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Coach Recommendation Required</Label>
                  <p className="text-muted-foreground text-xs">
                    A coach must recommend the player before access can be
                    granted
                  </p>
                </div>
                <Checkbox
                  checked={requireCoachRecommendation}
                  onCheckedChange={(checked) => {
                    setRequireCoachRecommendation(checked === true);
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audit Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Audit & Notifications</CardTitle>
              <CardDescription>
                Configure tracking and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Track Player Views</Label>
                  <p className="text-muted-foreground text-xs">
                    Log all player access for compliance
                  </p>
                </div>
                <Checkbox
                  checked={trackPlayerViews}
                  onCheckedChange={(checked) => {
                    setTrackPlayerViews(checked === true);
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Guardian Login Notifications</Label>
                  <p className="text-muted-foreground text-xs">
                    Allow guardians to receive notifications when their child
                    logs in
                  </p>
                </div>
                <Checkbox
                  checked={notifyGuardianOnLogin}
                  onCheckedChange={(checked) => {
                    setNotifyGuardianOnLogin(checked === true);
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visibility Settings & Logs */}
        <div className="space-y-6">
          {/* Default Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Default Data Visibility
              </CardTitle>
              <CardDescription>
                What players can see by default (guardians can expand this list)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  key: "skillRatings",
                  label: "Skill Ratings",
                  desc: "Current skill levels",
                },
                {
                  key: "skillHistory",
                  label: "Skill History",
                  desc: "Progress over time",
                },
                {
                  key: "publicCoachNotes",
                  label: "Coach Notes (Public)",
                  desc: "Feedback from coaches",
                },
                {
                  key: "benchmarkComparison",
                  label: "Benchmark Comparison",
                  desc: "How they compare to standards",
                },
                {
                  key: "practiceRecommendations",
                  label: "Practice Recommendations",
                  desc: "Suggested drills and exercises",
                },
                {
                  key: "developmentGoals",
                  label: "Development Goals",
                  desc: "Current goals and milestones",
                },
                {
                  key: "injuryStatus",
                  label: "Injury Status",
                  desc: "Current injury information",
                },
              ].map((item) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={item.key}
                >
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-muted-foreground text-xs">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {visibility[item.key as keyof typeof visibility] ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={visibility[item.key as keyof typeof visibility]}
                      onCheckedChange={() =>
                        toggleVisibility(item.key as keyof typeof visibility)
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Access Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Player Access</CardTitle>
              <CardDescription>
                {trackPlayerViews
                  ? "Latest player login activity"
                  : "Enable tracking to see logs"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackPlayerViews ? (
                accessLogs && accessLogs.length > 0 ? (
                  <div className="max-h-[300px] space-y-2 overflow-y-auto">
                    {accessLogs.map(
                      (log: {
                        _id: string;
                        playerName: string;
                        action: string;
                        timestamp: number;
                      }) => (
                        <div
                          className="flex items-center justify-between rounded border p-2 text-sm"
                          key={log._id}
                        >
                          <div>
                            <p className="font-medium">{log.playerName}</p>
                            <p className="text-muted-foreground text-xs">
                              {log.action.replace(/_/g, " ")}
                            </p>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No access logs yet
                  </p>
                )
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Tracking is disabled</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          className="gap-2"
          disabled={isSaving || !hasChanges}
          onClick={handleSave}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
