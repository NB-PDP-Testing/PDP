"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Lock } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

  // Get player identity
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Get wellness settings
  const wellnessSettings = useQuery(
    api.models.playerHealthChecks.getWellnessSettings,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  const updateSettings = useMutation(
    api.models.playerHealthChecks.updateWellnessSettings
  );

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
      toast.success(
        enabled
          ? `${getDimensionLabel(dimensionKey)} enabled`
          : `${getDimensionLabel(dimensionKey)} disabled`
      );
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  };

  const getDimensionLabel = (key: string): string => {
    const opt = OPTIONAL_DIMENSIONS.find((d) => d.key === key);
    return opt?.label ?? key;
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
    </div>
  );
}
