"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Activity, AlertTriangle, Loader2, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

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

const severityColors: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-800",
  moderate: "bg-orange-100 text-orange-800",
  severe: "bg-red-100 text-red-800",
  long_term: "bg-purple-100 text-purple-800",
};

const statusColors: Record<string, string> = {
  active: "bg-red-100 text-red-800",
  recovering: "bg-orange-100 text-orange-800",
  cleared: "bg-blue-100 text-blue-800",
  healed: "bg-green-100 text-green-800",
};

type NewInjuryForm = {
  bodyPart: string;
  injuryType: string;
  severity: "minor" | "moderate" | "severe";
  dateOccurred: string;
  occurredDuring: "training" | "match" | "other";
  notes: string;
};

export default function PlayerInjuriesPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email;

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  const injuries = useQuery(
    api.models.playerInjuries.getInjuriesForPlayer,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          includeHealed: true,
        }
      : "skip"
  );

  const reportInjury = useMutation(api.models.playerInjuries.reportInjury);

  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewInjuryForm>({
    bodyPart: "",
    injuryType: "",
    severity: "minor",
    dateOccurred: new Date().toISOString().split("T")[0],
    occurredDuring: "training",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!(playerIdentity?._id && form.bodyPart && form.injuryType)) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await reportInjury({
        playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
        bodyPart: form.bodyPart,
        injuryType: form.injuryType,
        severity: form.severity,
        dateOccurred: form.dateOccurred,
        description: form.notes || `${form.injuryType} to ${form.bodyPart}`,
        occurredDuring:
          form.occurredDuring === "other" ? "other_sport" : form.occurredDuring,
        occurredAtOrgId: orgId,
        reportedByRole: "player",
        isVisibleToAllOrgs: false,
        restrictedToOrgIds: [orgId],
      });
      toast.success("Injury reported successfully");
      setShowDialog(false);
      setForm({
        bodyPart: "",
        injuryType: "",
        severity: "minor",
        dateOccurred: new Date().toISOString().split("T")[0],
        occurredDuring: "training",
        notes: "",
      });
    } catch {
      toast.error("Failed to report injury");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session || playerIdentity === undefined || injuries === undefined) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeInjuries =
    injuries?.filter(
      (i) => i.status === "active" || i.status === "recovering"
    ) ?? [];

  const pastInjuries =
    injuries?.filter((i) => i.status === "cleared" || i.status === "healed") ??
    [];

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">My Injuries</h1>
          <p className="text-muted-foreground text-sm">
            Track and manage your injury history
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Report Injury
        </Button>
      </div>

      {/* Active injuries */}
      {activeInjuries.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Active Injuries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeInjuries.map((injury) => (
              <div className="rounded-lg border p-3" key={injury._id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {injury.bodyPart} — {injury.injuryType}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(injury.dateOccurred).toLocaleDateString(
                        "en-GB"
                      )}
                      {injury.occurredDuring &&
                        ` · ${injury.occurredDuring.replace("_", " ")}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`rounded px-2 py-0.5 font-medium text-xs capitalize ${severityColors[injury.severity] ?? ""}`}
                    >
                      {injury.severity.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-medium text-xs capitalize ${statusColors[injury.status] ?? ""}`}
                    >
                      {injury.status}
                    </span>
                    {injury.reportedByRole === "player" ? (
                      <Badge className="text-xs" variant="outline">
                        You reported this
                      </Badge>
                    ) : (
                      <Badge className="text-xs" variant="secondary">
                        Reported by coach
                      </Badge>
                    )}
                  </div>
                </div>
                {injury.expectedReturn && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Expected return:{" "}
                    {new Date(injury.expectedReturn).toLocaleDateString(
                      "en-GB"
                    )}
                  </p>
                )}
                {injury.description && (
                  <p className="mt-1 text-sm">{injury.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past injuries */}
      {pastInjuries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Injury History</CardTitle>
            <CardDescription>
              Previous cleared and healed injuries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastInjuries.map((injury) => (
              <div
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
                key={injury._id}
              >
                <div>
                  <p className="font-medium text-sm capitalize">
                    {injury.bodyPart} — {injury.injuryType}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(injury.dateOccurred).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`rounded px-2 py-0.5 font-medium text-xs capitalize ${statusColors[injury.status] ?? ""}`}
                  >
                    {injury.status}
                  </span>
                  {injury.reportedByRole === "player" ? (
                    <Badge className="text-xs" variant="outline">
                      You reported this
                    </Badge>
                  ) : (
                    <Badge className="text-xs" variant="secondary">
                      Reported by coach
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {injuries?.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Injuries on Record</CardTitle>
            <CardDescription>
              Stay healthy! No injuries on record.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Report Injury Dialog */}
      <Dialog onOpenChange={setShowDialog} open={showDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report New Injury</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="body-part">
                Body Part <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(v) => setForm({ ...form, bodyPart: v })}
                value={form.bodyPart}
              >
                <SelectTrigger id="body-part">
                  <SelectValue placeholder="Select body part..." />
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

            <div className="space-y-1.5">
              <Label htmlFor="injury-type">
                Injury Type <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(v) => setForm({ ...form, injuryType: v })}
                value={form.injuryType}
              >
                <SelectTrigger id="injury-type">
                  <SelectValue placeholder="Select injury type..." />
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

            <div className="space-y-1.5">
              <Label>
                Severity <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-3">
                {(["minor", "moderate", "severe"] as const).map((s) => (
                  <label
                    className="flex cursor-pointer items-center gap-1.5"
                    key={s}
                  >
                    <input
                      checked={form.severity === s}
                      className="accent-primary"
                      name="severity"
                      onChange={() => setForm({ ...form, severity: s })}
                      type="radio"
                      value={s}
                    />
                    <span className="text-sm capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date-occurred">
                Date Occurred <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date-occurred"
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setForm({ ...form, dateOccurred: e.target.value })
                }
                type="date"
                value={form.dateOccurred}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Occurred During</Label>
              <div className="flex gap-3">
                {(["training", "match", "other"] as const).map((o) => (
                  <label
                    className="flex cursor-pointer items-center gap-1.5"
                    key={o}
                  >
                    <input
                      checked={form.occurredDuring === o}
                      className="accent-primary"
                      name="occurred-during"
                      onChange={() => setForm({ ...form, occurredDuring: o })}
                      type="radio"
                      value={o}
                    />
                    <span className="text-sm capitalize">{o}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                className="resize-none"
                id="notes"
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional details about the injury..."
                rows={3}
                value={form.notes}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDialog(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Report Injury"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
