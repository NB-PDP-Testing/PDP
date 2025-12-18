"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Heart,
  Loader2,
  Plus,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Severity = "minor" | "moderate" | "severe" | "long_term";
type InjuryStatus = "active" | "recovering" | "cleared" | "healed";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bgColor: string }
> = {
  minor: { label: "Minor", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  moderate: {
    label: "Moderate",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  severe: { label: "Severe", color: "text-red-700", bgColor: "bg-red-100" },
  long_term: {
    label: "Long Term",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
};

const STATUS_CONFIG: Record<
  InjuryStatus,
  { label: string; color: string; bgColor: string }
> = {
  active: { label: "Active", color: "text-red-700", bgColor: "bg-red-100" },
  recovering: {
    label: "Recovering",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  cleared: {
    label: "Cleared",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  healed: { label: "Healed", color: "text-green-700", bgColor: "bg-green-100" },
};

const BODY_PARTS = [
  "Head",
  "Neck",
  "Shoulder",
  "Upper Arm",
  "Elbow",
  "Forearm",
  "Wrist",
  "Hand",
  "Chest",
  "Upper Back",
  "Lower Back",
  "Hip",
  "Thigh",
  "Knee",
  "Shin",
  "Calf",
  "Ankle",
  "Foot",
  "Other",
];

const INJURY_TYPES = [
  "Strain",
  "Sprain",
  "Bruise",
  "Cut",
  "Fracture",
  "Concussion",
  "Dislocation",
  "Tendinitis",
  "Other",
];

export default function InjuryTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Form state
  const [newInjury, setNewInjury] = useState({
    injuryType: "",
    bodyPart: "",
    side: "" as "left" | "right" | "both" | "",
    dateOccurred: new Date().toISOString().split("T")[0],
    severity: "minor" as Severity,
    description: "",
    treatment: "",
    expectedReturn: "",
    occurredDuring: "training" as
      | "training"
      | "match"
      | "other_sport"
      | "non_sport"
      | "unknown",
  });

  // Queries
  const players = useQuery(api.models.orgPlayerEnrollments.getPlayersForOrg, {
    organizationId: orgId,
  });

  const injuries = useQuery(
    api.models.playerInjuries.getInjuriesForPlayer,
    selectedPlayerId
      ? { playerIdentityId: selectedPlayerId as Id<"playerIdentities"> }
      : "skip"
  );

  const activeInjuriesForOrg = useQuery(
    api.models.playerInjuries.getAllActiveInjuriesForOrg,
    { organizationId: orgId }
  );

  // Mutations
  const reportInjury = useMutation(api.models.playerInjuries.reportInjury);
  const updateStatus = useMutation(
    api.models.playerInjuries.updateInjuryStatus
  );

  // Filter injuries by status
  const filteredInjuries = useMemo(() => {
    if (!injuries) return [];
    if (statusFilter === "all") return injuries;
    return injuries.filter((i: any) => i.status === statusFilter);
  }, [injuries, statusFilter]);

  // Handle add injury
  const handleAddInjury = useCallback(async () => {
    if (
      !(
        selectedPlayerId &&
        newInjury.injuryType &&
        newInjury.bodyPart &&
        newInjury.description
      )
    ) {
      toast.error("Missing required fields");
      return;
    }

    try {
      await reportInjury({
        playerIdentityId: selectedPlayerId as Id<"playerIdentities">,
        injuryType: newInjury.injuryType,
        bodyPart: newInjury.bodyPart,
        side: newInjury.side || undefined,
        dateOccurred: newInjury.dateOccurred,
        severity: newInjury.severity,
        description: newInjury.description,
        treatment: newInjury.treatment || undefined,
        expectedReturn: newInjury.expectedReturn || undefined,
        occurredDuring: newInjury.occurredDuring,
        occurredAtOrgId: orgId,
        isVisibleToAllOrgs: true,
        reportedByRole: "coach",
      });

      toast.success("Injury reported successfully");
      setShowAddDialog(false);
      setNewInjury({
        injuryType: "",
        bodyPart: "",
        side: "",
        dateOccurred: new Date().toISOString().split("T")[0],
        severity: "minor",
        description: "",
        treatment: "",
        expectedReturn: "",
        occurredDuring: "training",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to report injury"
      );
    }
  }, [selectedPlayerId, newInjury, reportInjury, orgId]);

  // Handle status update
  const handleUpdateStatus = useCallback(
    async (injuryId: Id<"playerInjuries">, newStatus: InjuryStatus) => {
      try {
        await updateStatus({
          injuryId,
          status: newStatus,
          actualReturn:
            newStatus === "cleared" || newStatus === "healed"
              ? new Date().toISOString().split("T")[0]
              : undefined,
        });
        toast.success("Status updated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update status"
        );
      }
    },
    [updateStatus]
  );

  // Loading state
  const isLoading = players === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} size="sm" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="font-bold text-2xl">Injury Tracking</h1>
            <p className="text-muted-foreground text-sm">
              Track and manage player injuries across your organization
            </p>
          </div>
        </div>
      </div>

      {/* Active Injuries Overview */}
      {activeInjuriesForOrg && activeInjuriesForOrg.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Active Injuries ({activeInjuriesForOrg.length})
            </CardTitle>
            <CardDescription>
              Players currently dealing with injuries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeInjuriesForOrg.map((injury: any) => (
                <div
                  className="flex items-center gap-3 rounded-lg border border-red-200 bg-white p-3"
                  key={injury._id}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Heart className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {injury.player?.firstName} {injury.player?.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {injury.bodyPart} - {injury.injuryType}
                    </p>
                  </div>
                  <Badge
                    className={`${SEVERITY_CONFIG[injury.severity as Severity].bgColor} ${SEVERITY_CONFIG[injury.severity as Severity].color}`}
                  >
                    {SEVERITY_CONFIG[injury.severity as Severity].label}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Player
          </CardTitle>
          <CardDescription>
            Choose a player to view or add injury records
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select
            onValueChange={(value) => setSelectedPlayerId(value)}
            value={selectedPlayerId ?? ""}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {players?.map(({ enrollment, player }: any) => (
                <SelectItem
                  key={enrollment.playerIdentityId}
                  value={enrollment.playerIdentityId}
                >
                  {player.firstName} {player.lastName}
                  {enrollment.ageGroup && (
                    <span className="ml-2 text-muted-foreground">
                      ({enrollment.ageGroup.toUpperCase()})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPlayerId && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Report Injury
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Player Injuries */}
      {selectedPlayerId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Injury History</CardTitle>
              <CardDescription>
                All recorded injuries for this player
              </CardDescription>
            </div>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="recovering">Recovering</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="healed">Healed</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {injuries === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInjuries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="font-medium">No Injuries Found</h3>
                <p className="text-muted-foreground text-sm">
                  {statusFilter === "all"
                    ? "This player has no recorded injuries"
                    : `No ${statusFilter} injuries found`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInjuries.map((injury: any) => (
                  <div className="rounded-lg border p-4" key={injury._id}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {injury.bodyPart}
                            {injury.side && ` (${injury.side})`} -{" "}
                            {injury.injuryType}
                          </h4>
                          <Badge
                            className={`${SEVERITY_CONFIG[injury.severity as Severity].bgColor} ${SEVERITY_CONFIG[injury.severity as Severity].color}`}
                          >
                            {SEVERITY_CONFIG[injury.severity as Severity].label}
                          </Badge>
                          <Badge
                            className={`${STATUS_CONFIG[injury.status as InjuryStatus].bgColor} ${STATUS_CONFIG[injury.status as InjuryStatus].color}`}
                          >
                            {STATUS_CONFIG[injury.status as InjuryStatus].label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {injury.description}
                        </p>
                        <div className="flex items-center gap-4 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Occurred: {injury.dateOccurred}
                          </span>
                          {injury.expectedReturn && (
                            <span>
                              Expected return: {injury.expectedReturn}
                            </span>
                          )}
                          {injury.treatment && (
                            <span>Treatment: {injury.treatment}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {injury.status === "active" && (
                          <Button
                            onClick={() =>
                              handleUpdateStatus(injury._id, "recovering")
                            }
                            size="sm"
                            variant="outline"
                          >
                            <ChevronRight className="mr-1 h-3 w-3" />
                            Recovering
                          </Button>
                        )}
                        {injury.status === "recovering" && (
                          <Button
                            onClick={() =>
                              handleUpdateStatus(injury._id, "cleared")
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Clear
                          </Button>
                        )}
                        {injury.status === "cleared" && (
                          <Button
                            onClick={() =>
                              handleUpdateStatus(injury._id, "healed")
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Healed
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Injury Dialog */}
      <Dialog onOpenChange={setShowAddDialog} open={showAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Report New Injury</DialogTitle>
            <DialogDescription>
              Record details about the player's injury
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Injury Type *</Label>
                <Select
                  onValueChange={(value) =>
                    setNewInjury((prev) => ({ ...prev, injuryType: value }))
                  }
                  value={newInjury.injuryType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INJURY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Body Part *</Label>
                <Select
                  onValueChange={(value) =>
                    setNewInjury((prev) => ({ ...prev, bodyPart: value }))
                  }
                  value={newInjury.bodyPart}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select body part" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_PARTS.map((part) => (
                      <SelectItem key={part} value={part}>
                        {part}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Side (if applicable)</Label>
                <Select
                  onValueChange={(value) =>
                    setNewInjury((prev) => ({
                      ...prev,
                      side: value as "left" | "right" | "both" | "",
                    }))
                  }
                  value={newInjury.side}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select
                  onValueChange={(value) =>
                    setNewInjury((prev) => ({
                      ...prev,
                      severity: value as Severity,
                    }))
                  }
                  value={newInjury.severity}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="long_term">Long Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Occurred *</Label>
                <Input
                  onChange={(e) =>
                    setNewInjury((prev) => ({
                      ...prev,
                      dateOccurred: e.target.value,
                    }))
                  }
                  type="date"
                  value={newInjury.dateOccurred}
                />
              </div>

              <div className="space-y-2">
                <Label>Occurred During</Label>
                <Select
                  onValueChange={(value) =>
                    setNewInjury((prev) => ({
                      ...prev,
                      occurredDuring: value as any,
                    }))
                  }
                  value={newInjury.occurredDuring}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="other_sport">Other Sport</SelectItem>
                    <SelectItem value="non_sport">Non-Sport</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                onChange={(e) =>
                  setNewInjury((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe what happened and current symptoms..."
                value={newInjury.description}
              />
            </div>

            <div className="space-y-2">
              <Label>Treatment/Management</Label>
              <Textarea
                onChange={(e) =>
                  setNewInjury((prev) => ({
                    ...prev,
                    treatment: e.target.value,
                  }))
                }
                placeholder="Any treatment or management being applied..."
                value={newInjury.treatment}
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Return Date</Label>
              <Input
                onChange={(e) =>
                  setNewInjury((prev) => ({
                    ...prev,
                    expectedReturn: e.target.value,
                  }))
                }
                type="date"
                value={newInjury.expectedReturn}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAddDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleAddInjury}>Report Injury</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
