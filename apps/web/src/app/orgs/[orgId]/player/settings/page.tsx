"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Download, Loader2, Lock, Shield, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

function shouldShowCycleSection(
  playerIdentity: {
    gender?: string;
    dateOfBirth?: string;
  } | null
): boolean {
  if (!playerIdentity) {
    return false;
  }
  if (playerIdentity.gender !== "female") {
    return false;
  }
  if (!playerIdentity.dateOfBirth) {
    return false;
  }
  const dob = new Date(playerIdentity.dateOfBirth);
  const ageDiff = Date.now() - dob.getTime();
  const ageDate = new Date(ageDiff);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  return age >= 18;
}

function getRateLimitHoursRemaining(playerId: string): number {
  const lastExport = localStorage.getItem(`gdpr_export_${playerId}`);
  if (!lastExport) {
    return 0;
  }
  const hoursSince =
    (Date.now() - Number.parseInt(lastExport, 10)) / (1000 * 60 * 60);
  return hoursSince < 24 ? Math.ceil(24 - hoursSince) : 0;
}

function triggerJsonDownload(
  data: unknown,
  firstName?: string,
  lastName?: string
): void {
  const name = `${firstName ?? "player"}-${lastName ?? "data"}`;
  const dateStr = new Date().toISOString().split("T")[0];
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `playerarc-data-${name}-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function triggerCsvDownload(
  data: Record<string, unknown>,
  firstName?: string,
  lastName?: string
): void {
  const name = `${firstName ?? "player"}-${lastName ?? "data"}`;
  const dateStr = new Date().toISOString().split("T")[0];

  // Build one CSV per domain, separated by blank lines and domain headers
  const domainKeys = [
    "profile",
    "emergencyContacts",
    "passportRatings",
    "wellnessHistory",
    "injuries",
    "coachFeedback",
    "sharingRecords",
    "consentRecords",
    "wellnessCoachAccess",
  ];

  const sections: string[] = [];
  for (const key of domainKeys) {
    const raw = (data as Record<string, unknown>)[key];
    if (!raw) {
      continue;
    }
    const rows = Array.isArray(raw)
      ? (raw as Record<string, unknown>[])
      : [raw as Record<string, unknown>];
    if (rows.length === 0) {
      continue;
    }
    sections.push(`# ${key}`);
    sections.push(toCsv(rows));
    sections.push("");
  }

  const csv = sections.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `playerarc-data-${name}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ExportablePlayer =
  | {
      _id: Id<"playerIdentities">;
      firstName?: string;
      lastName?: string;
    }
  | null
  | undefined;

function useGdprExport(playerIdentity: ExportablePlayer, orgId: string) {
  const [triggered, setTriggered] = useState<"json" | "csv" | false>(false);

  const data = useQuery(
    api.models.playerDataExport.assemblePlayerDataExport,
    triggered && playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, organizationId: orgId }
      : "skip"
  );

  useEffect(() => {
    if (!triggered || data === undefined) {
      return;
    }
    if (triggered === "csv") {
      triggerCsvDownload(
        data as Record<string, unknown>,
        playerIdentity?.firstName,
        playerIdentity?.lastName
      );
    } else {
      triggerJsonDownload(
        data,
        playerIdentity?.firstName,
        playerIdentity?.lastName
      );
    }
    localStorage.setItem(
      `gdpr_export_${playerIdentity?._id ?? ""}`,
      Date.now().toString()
    );
    setTriggered(false);
    toast.success("Data export downloaded successfully");
  }, [triggered, data, playerIdentity]);

  const downloadJson = () => {
    if (!playerIdentity?._id) {
      toast.error("Player identity not found");
      return;
    }
    const hoursRemaining = getRateLimitHoursRemaining(playerIdentity._id);
    if (hoursRemaining > 0) {
      toast.info(
        `You already downloaded your data today. You can request another export in ${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"}.`
      );
      return;
    }
    toast.info("Preparing your data export...");
    setTriggered("json");
  };

  const downloadCsv = () => {
    if (!playerIdentity?._id) {
      toast.error("Player identity not found");
      return;
    }
    const hoursRemaining = getRateLimitHoursRemaining(playerIdentity._id);
    if (hoursRemaining > 0) {
      toast.info(
        `You already downloaded your data today. You can request another export in ${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"}.`
      );
      return;
    }
    toast.info("Preparing your data export...");
    setTriggered("csv");
  };

  return { downloadJson, downloadCsv, isLoading: triggered !== false };
}

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

  // Wellness coach access list
  const coachAccessList = useQuery(
    api.models.playerHealthChecks.getWellnessCoachAccessList,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Cycle tracking consent
  const cycleConsent = useQuery(
    api.models.playerHealthChecks.getCycleTrackingConsent,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  // Mutations
  const respondAccess = useMutation(
    api.models.playerHealthChecks.respondWellnessAccess
  );
  const revokeAccess = useMutation(
    api.models.playerHealthChecks.revokeWellnessAccess
  );
  const withdrawConsent = useMutation(
    api.models.playerHealthChecks.withdrawCycleTrackingConsent
  );

  // Revoke coach access confirmation dialog state
  const [revokeTarget, setRevokeTarget] = useState<{
    id: Id<"wellnessCoachAccess">;
    coachName: string;
  } | null>(null);

  // Revoke cycle consent confirmation dialog
  const [showRevokeConsentDialog, setShowRevokeConsentDialog] = useState(false);

  // GDPR data export — managed by custom hook
  const {
    downloadJson,
    downloadCsv,
    isLoading: exportLoading,
  } = useGdprExport(playerIdentity, orgId);

  // Export format confirmation dialog
  const [showExportDialog, setShowExportDialog] = useState(false);

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

  const handleWithdrawConsent = async () => {
    if (!playerIdentity?._id) {
      return;
    }
    try {
      await withdrawConsent({ playerIdentityId: playerIdentity._id });
      toast.success("Consent withdrawn and cycle phase data deleted");
    } catch {
      toast.error("Failed to withdraw consent");
    } finally {
      setShowRevokeConsentDialog(false);
    }
  };

  // Determine if cycle tracking section should show
  const showCycleSection = shouldShowCycleSection(playerIdentity ?? null);

  const hasCycleConsent =
    cycleConsent !== undefined &&
    cycleConsent !== null &&
    !cycleConsent.withdrawnAt;

  const isLoading = sessionLoading || playerIdentity === undefined;

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

      {/* Privacy & Data Card — GDPR Article 20 Data Export */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setShowExportDialog(false);
          }
        }}
        open={showExportDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download Your Data</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a format to download a copy of all personal data held about
              you (GDPR Article 20). Your profile, wellness history, injuries,
              coach feedback, and passport ratings will be included.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={() => {
                setShowExportDialog(false);
                downloadCsv();
              }}
              variant="outline"
            >
              <Download className="mr-2 h-3 w-3" />
              Download CSV
            </Button>
            <AlertDialogAction
              onClick={() => {
                downloadJson();
              }}
            >
              <Download className="mr-2 h-3 w-3" />
              Download JSON
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all personal data held about you (GDPR Article
            20).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-sm">Download My Data</p>
              <p className="text-muted-foreground text-xs">
                Exports your profile, wellness history, injuries, coach
                feedback, and passport ratings as JSON or CSV.
              </p>
            </div>
            <Button
              disabled={exportLoading}
              onClick={() => setShowExportDialog(true)}
              size="sm"
              variant="outline"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-3 w-3" />
                  Download
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Card — cycle phase section for female players >= 18 only */}
      {showCycleSection && (
        <>
          <AlertDialog
            onOpenChange={(open) => {
              if (!open) {
                setShowRevokeConsentDialog(false);
              }
            }}
            open={showRevokeConsentDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Withdraw Cycle Phase Consent
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Withdrawing consent will permanently delete all your menstrual
                  cycle phase data. This cannot be undone. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleWithdrawConsent}
                >
                  Withdraw & Delete Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
              </CardTitle>
              <CardDescription>
                Manage your sensitive health data preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    Menstrual Cycle Phase Tracking
                  </p>
                  <p className="text-muted-foreground text-xs">
                    GDPR Article 9 Special Category data. Only visible to you
                    and org medical/admin staff. Never shared with coaches.
                  </p>
                </div>
                <Switch
                  aria-label="Toggle menstrual cycle tracking"
                  checked={hasCycleConsent}
                  onCheckedChange={(checked) => {
                    if (!checked && hasCycleConsent) {
                      setShowRevokeConsentDialog(true);
                    }
                    // Toggling ON is handled via the GDPR modal in the check-in page
                  }}
                />
              </div>
              {!hasCycleConsent && (
                <p className="mt-2 text-muted-foreground text-xs">
                  Enable cycle phase tracking from the Daily Wellness check-in
                  page to give consent.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
