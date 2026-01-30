"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OrgFeatureFlagsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  // Fetch feature flag status for this org
  const orgStatus = useQuery(
    api.models.trustGatePermissions.getOrgFeatureFlagStatus,
    { organizationId: orgId }
  );

  // Fetch pending override requests
  const pendingRequests = useQuery(
    api.models.trustGatePermissions.getCoachOverrideRequests,
    { organizationId: orgId, status: "pending" }
  );

  // Fetch all coaches with their access status
  const allCoaches = useQuery(
    api.models.trustGatePermissions.getAllCoachesWithAccessStatus,
    orgStatus?.allowAdminDelegation ? { organizationId: orgId } : "skip"
  );

  // Mutations
  const setAdminBlanketOverride = useMutation(
    api.models.trustGatePermissions.setAdminBlanketOverride
  );
  const setAdminBlanketBlock = useMutation(
    api.models.trustGatePermissions.setAdminBlanketBlock
  );
  const blockIndividualCoach = useMutation(
    api.models.trustGatePermissions.blockIndividualCoach
  );
  const unblockIndividualCoach = useMutation(
    api.models.trustGatePermissions.unblockIndividualCoach
  );
  const revokeCoachOverride = useMutation(
    api.models.trustGatePermissions.revokeCoachOverride
  );
  const reviewCoachOverrideRequest = useMutation(
    api.models.trustGatePermissions.reviewCoachOverrideRequest
  );

  // UI state
  const [isTogglingBlanket, setIsTogglingBlanket] = useState(false);
  const [isTogglingBlanketBlock, setIsTogglingBlanketBlock] = useState(false);
  const [blockingCoachId, setBlockingCoachId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [unblockingCoachId, setUnblockingCoachId] = useState<string | null>(
    null
  );
  const [revokingCoachId, setRevokingCoachId] = useState<string | null>(null);
  const [reviewingRequestId, setReviewingRequestId] =
    useState<Id<"coachOverrideRequests"> | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "deny" | null>(
    null
  );
  const [reviewNotes, setReviewNotes] = useState("");

  // Loading state
  if (orgStatus === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl">Voice Notes Features</h1>
          <p className="text-muted-foreground">
            Manage trust gate settings and coach access
          </p>
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Handlers
  const handleToggleBlanketOverride = async () => {
    if (!orgStatus.allowAdminDelegation) {
      toast.error("Admin delegation not enabled for this organization");
      return;
    }

    setIsTogglingBlanket(true);
    try {
      const newValue = !orgStatus.adminOverrideTrustGates;
      await setAdminBlanketOverride({
        organizationId: orgId,
        override: newValue,
      });
      toast.success(
        newValue
          ? "Blanket override enabled - all coaches now have access"
          : "Blanket override disabled - gates restored"
      );
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsTogglingBlanket(false);
    }
  };

  const handleToggleBlanketBlock = async () => {
    if (!orgStatus.allowAdminDelegation) {
      toast.error("Admin delegation not enabled for this organization");
      return;
    }

    setIsTogglingBlanketBlock(true);
    try {
      const newValue = !(orgStatus as any).adminBlanketBlock;
      await setAdminBlanketBlock({
        organizationId: orgId,
        blocked: newValue,
      });
      toast.success(
        newValue
          ? "Blanket block enabled - all coaches now blocked"
          : "Blanket block disabled - access restored"
      );
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsTogglingBlanketBlock(false);
    }
  };

  const handleBlockCoach = async () => {
    if (!blockingCoachId) {
      return;
    }

    try {
      await blockIndividualCoach({
        organizationId: orgId,
        coachId: blockingCoachId,
        reason: blockReason || undefined,
      });
      toast.success("Coach access blocked");
      setBlockingCoachId(null);
      setBlockReason("");
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleUnblockCoach = async () => {
    if (!unblockingCoachId) {
      return;
    }

    try {
      await unblockIndividualCoach({
        organizationId: orgId,
        coachId: unblockingCoachId,
      });
      toast.success("Coach access unblocked");
      setUnblockingCoachId(null);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleRevokeOverride = async (coachId: string) => {
    try {
      await revokeCoachOverride({
        coachId,
        organizationId: orgId,
      });
      toast.success("Coach override revoked");
      setRevokingCoachId(null);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const handleReviewRequest = async () => {
    if (!reviewingRequestId || reviewAction === null) {
      return;
    }

    try {
      await reviewCoachOverrideRequest({
        requestId: reviewingRequestId,
        approved: reviewAction === "approve",
        reviewNotes: reviewNotes || undefined,
      });
      toast.success(
        reviewAction === "approve"
          ? "Override request approved"
          : "Override request denied"
      );
      setReviewingRequestId(null);
      setReviewAction(null);
      setReviewNotes("");
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Voice Notes Features</h1>
        <p className="text-muted-foreground">
          Manage trust gate settings and coach access for your organization
        </p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Trust Gates</p>
              <p className="text-muted-foreground text-sm">
                Controls access to sent summaries feature
              </p>
            </div>
            <Badge
              variant={
                orgStatus.voiceNotesTrustGatesEnabled ? "default" : "secondary"
              }
            >
              {orgStatus.voiceNotesTrustGatesEnabled ? "ON" : "OFF"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Admin Control</p>
              <p className="text-muted-foreground text-sm">
                Can you manage these settings?
              </p>
            </div>
            <Badge
              variant={orgStatus.allowAdminDelegation ? "default" : "secondary"}
            >
              {orgStatus.allowAdminDelegation ? "ENABLED" : "DISABLED"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Coach Overrides</p>
              <p className="text-muted-foreground text-sm">
                Can coaches request access?
              </p>
            </div>
            <Badge
              variant={orgStatus.allowCoachOverrides ? "default" : "secondary"}
            >
              {orgStatus.allowCoachOverrides ? "ENABLED" : "DISABLED"}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted p-3">
            <p className="text-muted-foreground text-sm">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              Contact platform staff to change these settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Admin Blanket Override Card (only if delegation enabled) */}
      {orgStatus.allowAdminDelegation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Bulk Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Blanket Override (Grant All) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">Grant All Coaches Access</p>
                  <p className="text-muted-foreground text-sm">
                    When enabled, all coaches can access features regardless of
                    trust level
                  </p>
                </div>
                <Switch
                  checked={orgStatus.adminOverrideTrustGates ?? false}
                  disabled={isTogglingBlanket}
                  onCheckedChange={handleToggleBlanketOverride}
                />
              </div>

              {orgStatus.adminOverrideTrustGates !== undefined && (
                <div className="rounded-md border bg-muted p-3 text-sm">
                  <p className="font-medium">
                    Current setting:{" "}
                    {orgStatus.adminOverrideTrustGates
                      ? "All coaches have access"
                      : "Normal trust level rules apply"}
                  </p>
                  {orgStatus.adminOverrideSetBy &&
                    orgStatus.adminOverrideSetAt && (
                      <p className="text-muted-foreground text-xs">
                        Set by {orgStatus.adminOverrideSetBy} •{" "}
                        {formatDistanceToNow(orgStatus.adminOverrideSetAt, {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Blanket Block (Block All) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">Block All Coaches</p>
                  <p className="text-muted-foreground text-sm">
                    When enabled, ALL coaches lose access (even Level 2+)
                  </p>
                </div>
                <Switch
                  checked={(orgStatus as any).adminBlanketBlock ?? false}
                  disabled={isTogglingBlanketBlock}
                  onCheckedChange={handleToggleBlanketBlock}
                />
              </div>

              {(orgStatus as any).adminBlanketBlock && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
                  <p className="font-medium text-red-900 dark:text-red-100">
                    ⚠️ All coaches are currently blocked from parent
                    communication
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-md border bg-blue-50 p-3 dark:bg-blue-950">
              <p className="text-sm">
                <AlertCircle className="mr-2 inline h-4 w-4" />
                Bulk controls affect ALL coaches. Use individual controls below
                for specific coaches.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Total Coaches</p>
              <p className="font-bold text-2xl">{orgStatus.totalCoaches}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                Coaches with Access
              </p>
              <p className="font-bold text-2xl">
                {orgStatus.coachesWithAccess}
              </p>
              <p className="text-muted-foreground text-xs">
                {orgStatus.totalCoaches > 0
                  ? `${Math.round((orgStatus.coachesWithAccess / orgStatus.totalCoaches) * 100)}%`
                  : "0%"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                Individual Overrides
              </p>
              <p className="font-bold text-2xl">
                {orgStatus.activeOverrides.length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Pending Requests</p>
              <p className="font-bold text-2xl">
                {pendingRequests?.length ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Coaches Access Management (only if delegation enabled) */}
      {orgStatus.allowAdminDelegation && allCoaches && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Coach Access Control</CardTitle>
            <p className="text-muted-foreground text-sm">
              Manage access for individual coaches
            </p>
          </CardHeader>
          <CardContent>
            {allCoaches.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No coaches found in this organization
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach Name</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Trust Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCoaches.map((coach) => (
                    <TableRow key={coach.coachId}>
                      <TableCell className="font-medium">
                        {coach.coachName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {coach.teamCount === 0 ? (
                          <span className="text-muted-foreground">
                            (No teams assigned)
                          </span>
                        ) : coach.teamCount <= 2 ? (
                          coach.teamNames.join(", ")
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {coach.teamNames.slice(0, 2).join(", ")} +
                                  {coach.teamCount - 2} more
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="space-y-1">
                                  {coach.teamNames.map((name) => (
                                    <li key={name}>• {name}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell>Level {coach.trustLevel}</TableCell>
                      <TableCell>
                        {coach.adminBlocked && (
                          <Badge variant="destructive">🚫 Blocked</Badge>
                        )}
                        {!(coach.adminBlocked || coach.parentAccessEnabled) && (
                          <Badge variant="secondary">👤 Self-Off</Badge>
                        )}
                        {!coach.adminBlocked &&
                          coach.parentAccessEnabled &&
                          coach.hasAccess && (
                            <Badge variant="default">✓ Active</Badge>
                          )}
                        {!coach.adminBlocked &&
                          coach.parentAccessEnabled &&
                          !coach.hasAccess && (
                            <Badge variant="outline">No Access</Badge>
                          )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {coach.accessReason}
                      </TableCell>
                      <TableCell>
                        {coach.adminBlocked ? (
                          <Button
                            onClick={() => setUnblockingCoachId(coach.coachId)}
                            size="sm"
                            variant="outline"
                          >
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            disabled={!coach.parentAccessEnabled}
                            onClick={() => setBlockingCoachId(coach.coachId)}
                            size="sm"
                            variant="destructive"
                          >
                            Block
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Overrides Table (only if coach overrides enabled) */}
      {orgStatus.allowCoachOverrides &&
        orgStatus.activeOverrides.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Override Details</CardTitle>
              <p className="text-muted-foreground text-sm">
                Coaches with approved override requests
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach Name</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead>Granted At</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgStatus.activeOverrides.map((override) => (
                    <TableRow key={override.coachId}>
                      <TableCell className="font-medium">
                        {override.coachName}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {override.overrideReason || "No reason provided"}
                      </TableCell>
                      <TableCell>{override.grantedBy || "Unknown"}</TableCell>
                      <TableCell>
                        {override.grantedAt
                          ? formatDistanceToNow(override.grantedAt, {
                              addSuffix: true,
                            })
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        {override.expiresAt
                          ? formatDistanceToNow(override.expiresAt, {
                              addSuffix: true,
                            })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => setRevokingCoachId(override.coachId)}
                          size="sm"
                          variant="outline"
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Pending Override Requests Section (only if coach overrides enabled) */}
      {orgStatus.allowCoachOverrides && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Override Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No pending requests
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach Name</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell className="font-medium">
                        {request.coachName}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {request.reason}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(request.requestedAt, {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          onClick={() => {
                            setReviewingRequestId(request._id);
                            setReviewAction("approve");
                          }}
                          size="sm"
                          variant="default"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            setReviewingRequestId(request._id);
                            setReviewAction("deny");
                          }}
                          size="sm"
                          variant="destructive"
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Deny
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setRevokingCoachId(null)}
        open={revokingCoachId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Coach Override?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the override and restore trust level requirements
              for this coach. They will lose access to sent summaries unless
              they meet the trust level threshold.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                revokingCoachId && handleRevokeOverride(revokingCoachId)
              }
            >
              Revoke Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Request Dialog */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setReviewingRequestId(null);
            setReviewAction(null);
            setReviewNotes("");
          }
        }}
        open={reviewingRequestId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewAction === "approve"
                ? "Approve Override Request"
                : "Deny Override Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewAction === "approve"
                ? "This coach will be granted access to sent summaries regardless of trust level."
                : "This request will be marked as denied. You can provide a reason below."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="review-notes">
              Notes (optional)
            </label>
            <Textarea
              id="review-notes"
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                reviewAction === "approve"
                  ? "Reason for approval..."
                  : "Reason for denial..."
              }
              value={reviewNotes}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReviewRequest}>
              {reviewAction === "approve" ? "Approve" : "Deny"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Coach Dialog */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setBlockingCoachId(null);
            setBlockReason("");
          }
        }}
        open={blockingCoachId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block Coach Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately hide the "Sent to Parents" tab for this
              coach, even if they have sufficient trust level.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="block-reason">
              Reason (optional)
            </label>
            <Textarea
              id="block-reason"
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Why are you blocking this coach?"
              value={blockReason}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBlockCoach}
            >
              Block Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Coach Dialog */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setUnblockingCoachId(null);
          }
        }}
        open={unblockingCoachId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock Coach Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore access for this coach based on their trust level
              and other settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockCoach}>
              Unblock Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
