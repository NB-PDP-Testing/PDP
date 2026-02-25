"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";

// Core dimensions — always active, cannot be individually disabled
const CORE_DIMENSIONS = [
  {
    key: "sleepQuality",
    label: "Sleep Quality",
    description: "How rested you feel on waking",
  },
  {
    key: "energyLevel",
    label: "Energy",
    description: "Your energy level throughout the day",
  },
  {
    key: "mood",
    label: "Mood",
    description: "Your emotional state",
  },
  {
    key: "physicalFeeling",
    label: "Physical Feeling",
    description: "How your body feels overall",
  },
  {
    key: "motivation",
    label: "Motivation",
    description: "How motivated you feel for training",
  },
] as const;

// Optional dimensions — off by default, player can enable
const OPTIONAL_DIMENSIONS = [
  {
    key: "foodIntake",
    label: "Food Intake",
    description: "How well you ate today",
  },
  {
    key: "waterIntake",
    label: "Water Intake",
    description: "How well hydrated you were",
  },
  {
    key: "muscleRecovery",
    label: "Muscle Recovery",
    description: "Muscle soreness and recovery level",
  },
] as const;

export default function PlayerSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const userEmail = session?.user?.email;

  // Player identity
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Wellness settings
  const wellnessSettings = useQuery(
    api.models.playerHealthChecks.getWellnessSettings,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Wellness coach access list
  const coachAccessList = useQuery(
    api.models.playerHealthChecks.getWellnessCoachAccessList,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Mutations
  const updateSettings = useMutation(
    api.models.playerHealthChecks.updateWellnessSettings
  );
  const respondAccess = useMutation(
    api.models.playerHealthChecks.respondWellnessAccess
  );
  const revokeAccess = useMutation(
    api.models.playerHealthChecks.revokeWellnessAccess
  );

  // Revoke confirmation dialog state
  const [revokeTarget, setRevokeTarget] = useState<{
    id: Id<"wellnessCoachAccess">;
    coachName: string;
  } | null>(null);

  const handleToggle = async (dimensionKey: string, enabled: boolean) => {
    if (!(playerIdentity?._id && wellnessSettings)) {
      return;
    }
    const current = wellnessSettings.enabledDimensions;
    const next = enabled
      ? [...current, dimensionKey]
      : current.filter((d) => d !== dimensionKey);
    try {
      await updateSettings({
        playerIdentityId: playerIdentity._id,
        organizationId: orgId,
        enabledDimensions: next,
      });
      const label =
        OPTIONAL_DIMENSIONS.find((d) => d.key === dimensionKey)?.label ??
        dimensionKey;
      toast.success(enabled ? `${label} enabled` : `${label} disabled`);
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  };

  const handleApprove = async (accessId: Id<"wellnessCoachAccess">) => {
    try {
      await respondAccess({ accessId, decision: "approved" });
      toast.success("Access approved");
    } catch {
      toast.error("Failed to approve access");
    }
  };

  const handleDeny = async (accessId: Id<"wellnessCoachAccess">) => {
    try {
      await respondAccess({ accessId, decision: "denied" });
      toast.success("Access denied");
    } catch {
      toast.error("Failed to deny access");
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) {
      return;
    }
    try {
      await revokeAccess({ accessId: revokeTarget.id });
      toast.success("Access revoked");
    } catch {
      toast.error("Failed to revoke access");
    } finally {
      setRevokeTarget(null);
    }
  };

  const isLoading =
    sessionLoading ||
    playerIdentity === undefined ||
    wellnessSettings === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-3xl items-center justify-center p-4 py-12 md:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!playerIdentity) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Player Profile Not Found</CardTitle>
            <CardDescription>
              Your account is not linked to a player profile. Contact your club
              administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const enabledDimensions = wellnessSettings?.enabledDimensions ?? [
    "sleepQuality",
    "energyLevel",
    "mood",
    "physicalFeeling",
    "motivation",
  ];

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      {/* Revoke confirmation dialog */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
          }
        }}
        open={revokeTarget !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Wellness Access</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {revokeTarget?.coachName}&apos;s access to your wellness
              data? They will no longer see your wellness trends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevokeConfirm}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your wellness tracking preferences.
        </p>
      </div>

      {/* Wellness Dimensions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Wellness Dimensions</CardTitle>
          <CardDescription>
            Choose which dimensions to include in your daily check-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Dimensions — always active */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">
              Core tracking — always active
            </h3>
            <div className="space-y-2">
              {CORE_DIMENSIONS.map((dim) => (
                <div
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2"
                  key={dim.key}
                >
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{dim.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {dim.description}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-green-100 text-green-800 hover:bg-green-100">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Dimensions — player can toggle */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">
              Optional — turn on to track more
            </h3>
            <div className="space-y-2">
              {OPTIONAL_DIMENSIONS.map((dim) => {
                const isEnabled = enabledDimensions.includes(dim.key);
                return (
                  <div
                    className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-2"
                    key={dim.key}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{dim.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {dim.description}
                      </p>
                    </div>
                    <Switch
                      aria-label={`Toggle ${dim.label}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle(dim.key, checked)
                      }
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              Your core dimensions are always tracked. Enable optional
              dimensions to add more detail to your check-in.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wellness Access Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Coaches with access to your wellness trends
          </CardTitle>
          <CardDescription>
            Coaches can only see your aggregate wellness score — never
            individual dimensions or cycle phase data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!coachAccessList || coachAccessList.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No coaches have requested access to your wellness data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {coachAccessList.map((access) => (
                <div
                  className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3"
                  key={access._id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{access.coachName}</p>
                  </div>

                  {access.status === "pending" && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        onClick={() => handleDeny(access._id)}
                        size="sm"
                        variant="outline"
                      >
                        Deny
                      </Button>
                      <Button
                        onClick={() => handleApprove(access._id)}
                        size="sm"
                      >
                        Approve
                      </Button>
                    </div>
                  )}

                  {access.status === "approved" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Approved
                      </Badge>
                      <Button
                        onClick={() =>
                          setRevokeTarget({
                            id: access._id,
                            coachName: access.coachName,
                          })
                        }
                        size="sm"
                        variant="outline"
                      >
                        Revoke
                      </Button>
                    </div>
                  )}

                  {access.status === "denied" && (
                    <Badge variant="secondary">Denied</Badge>
                  )}

                  {access.status === "revoked" && (
                    <Badge variant="secondary">Revoked</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
