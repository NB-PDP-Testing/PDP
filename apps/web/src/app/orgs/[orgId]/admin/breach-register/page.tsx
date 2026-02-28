"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Plus, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useSession } from "@/lib/auth-client";

// ============================================================
// TYPES
// ============================================================

type Severity = "low" | "medium" | "high" | "critical";
type BreachStatus =
  | "detected"
  | "under_assessment"
  | "dpc_notified"
  | "individuals_notified"
  | "closed";

interface BreachRecord {
  _id: Id<"breachRegister">;
  detectedAt: number;
  description: string;
  severity: Severity;
  status: BreachStatus;
  dpcNotifiedAt?: number;
  individualsNotifiedAt?: number;
  resolutionNotes?: string;
  closedAt?: number;
  estimatedAffectedCount?: number;
  affectedDataCategories: string[];
}

// ============================================================
// HELPERS & CONFIG
// ============================================================

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; badgeClass: string; description: string }
> = {
  low: {
    label: "Low",
    badgeClass: "bg-gray-100 text-gray-700",
    description: "No personal data at risk",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-yellow-100 text-yellow-800",
    description: "Personal data exposed but low risk to individuals",
  },
  high: {
    label: "High",
    badgeClass: "bg-orange-100 text-orange-800",
    description: "Sensitive data exposed, moderate risk",
  },
  critical: {
    label: "Critical",
    badgeClass: "bg-red-100 text-red-800",
    description: "Special category health data or large-scale exposure",
  },
};

const STATUS_LABELS: Record<BreachStatus, string> = {
  detected: "Detected",
  under_assessment: "Under Assessment",
  dpc_notified: "DPC Notified",
  individuals_notified: "Individuals Notified",
  closed: "Closed",
};

const DATA_CATEGORIES = [
  "wellness data",
  "player profiles",
  "injury records",
  "coach feedback",
  "communications",
  "other",
];

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// LOG NEW BREACH DIALOG
// ============================================================

function LogBreachDialog({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const logBreach = useMutation(api.models.breachRegister.logBreach);

  const [form, setForm] = useState({
    detectedAt: new Date().toISOString().slice(0, 16), // datetime-local format
    description: "",
    affectedDataCategories: [] as string[],
    estimatedAffectedCount: "",
    severity: "" as Severity | "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      affectedDataCategories: prev.affectedDataCategories.includes(cat)
        ? prev.affectedDataCategories.filter((c) => c !== cat)
        : [...prev.affectedDataCategories, cat],
    }));
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      toast.error("Not authenticated");
      return;
    }
    if (!(form.description.trim() && form.severity && form.detectedAt)) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await logBreach({
        organizationId: orgId,
        detectedAt: new Date(form.detectedAt).getTime(),
        description: form.description.trim(),
        affectedDataCategories: form.affectedDataCategories,
        estimatedAffectedCount: form.estimatedAffectedCount
          ? Number.parseInt(form.estimatedAffectedCount, 10)
          : undefined,
        severity: form.severity as Severity,
      });
      toast.success("Breach incident logged.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log breach");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Log New Incident</DialogTitle>
        <DialogDescription>
          Record a data breach or security incident. All incidents must be
          logged regardless of severity.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="detected-at">Date/time detected *</Label>
          <Input
            id="detected-at"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, detectedAt: e.target.value }))
            }
            type="datetime-local"
            value={form.detectedAt}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe what happened, what data was involved, and how it was discovered"
            rows={4}
            value={form.description}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Affected data categories</Label>
          <div className="flex flex-wrap gap-2">
            {DATA_CATEGORIES.map((cat) => (
              <button
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  form.affectedDataCategories.includes(cat)
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
                key={cat}
                onClick={() => toggleCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="affected-count">
            Estimated number of individuals affected
          </Label>
          <Input
            id="affected-count"
            min={0}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                estimatedAffectedCount: e.target.value,
              }))
            }
            placeholder="Optional"
            type="number"
            value={form.estimatedAffectedCount}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="severity">Severity *</Label>
          <Select
            onValueChange={(val) =>
              setForm((prev) => ({ ...prev, severity: val as Severity }))
            }
            value={form.severity}
          >
            <SelectTrigger id="severity">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(SEVERITY_CONFIG) as [
                  Severity,
                  (typeof SEVERITY_CONFIG)[Severity],
                ][]
              ).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="font-medium">{config.label}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    — {config.description}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit} type="button">
          {isSubmitting ? "Logging…" : "Log incident"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// UPDATE BREACH DIALOG
// ============================================================

function UpdateBreachDialog({
  breach,
  onClose,
}: {
  breach: BreachRecord;
  onClose: () => void;
}) {
  const updateStatus = useMutation(
    api.models.breachRegister.updateBreachStatus
  );

  const [form, setForm] = useState({
    status: breach.status,
    dpcNotifiedAt: breach.dpcNotifiedAt
      ? new Date(breach.dpcNotifiedAt).toISOString().slice(0, 16)
      : "",
    individualsNotifiedAt: breach.individualsNotifiedAt
      ? new Date(breach.individualsNotifiedAt).toISOString().slice(0, 16)
      : "",
    resolutionNotes: breach.resolutionNotes ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (form.status === "closed" && !form.resolutionNotes.trim()) {
      toast.error("Resolution notes are required to close an incident");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateStatus({
        breachId: breach._id,
        status: form.status,
        dpcNotifiedAt: form.dpcNotifiedAt
          ? new Date(form.dpcNotifiedAt).getTime()
          : undefined,
        individualsNotifiedAt: form.individualsNotifiedAt
          ? new Date(form.individualsNotifiedAt).getTime()
          : undefined,
        resolutionNotes: form.resolutionNotes || undefined,
        closedAt:
          form.status === "closed"
            ? (breach.closedAt ?? Date.now())
            : undefined,
      });
      toast.success("Breach record updated.");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update breach"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Update Incident</DialogTitle>
        <DialogDescription className="line-clamp-2 text-sm">
          {breach.description}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="update-status">Status *</Label>
          <Select
            onValueChange={(val) =>
              setForm((prev) => ({ ...prev, status: val as BreachStatus }))
            }
            value={form.status}
          >
            <SelectTrigger id="update-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_LABELS) as [BreachStatus, string][]).map(
                ([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dpc-notified">DPC notification date/time</Label>
          <Input
            id="dpc-notified"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dpcNotifiedAt: e.target.value }))
            }
            type="datetime-local"
            value={form.dpcNotifiedAt}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="individuals-notified">
            Individual notification date/time
          </Label>
          <Input
            id="individuals-notified"
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                individualsNotifiedAt: e.target.value,
              }))
            }
            type="datetime-local"
            value={form.individualsNotifiedAt}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resolution-notes">
            Resolution notes
            {form.status === "closed" && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </Label>
          <Textarea
            id="resolution-notes"
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                resolutionNotes: e.target.value,
              }))
            }
            placeholder="Describe how the incident was resolved and what measures were taken"
            rows={3}
            value={form.resolutionNotes}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit} type="button">
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function BreachRegisterPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const breaches = useQuery(api.models.breachRegister.listBreaches, {
    organizationId: orgId,
  });

  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<BreachRecord | null>(
    null
  );

  // 72-hour warning: breaches in 'detected' or 'under_assessment' past 72h
  const overdueBreaches = (breaches ?? []).filter(
    (b) =>
      (b.status === "detected" || b.status === "under_assessment") &&
      b.detectedAt < Date.now() - SEVENTY_TWO_HOURS_MS
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Data Breach Register
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            GDPR Articles 33/34 require notification to the Data Protection
            Commission within 72 hours of becoming aware of a breach. This
            register is your Article 33(5) record of all incidents.
          </p>
        </div>
        <Button onClick={() => setShowLogDialog(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Log new incident
        </Button>
      </div>

      {/* 72-hour warning banner */}
      {overdueBreaches.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium text-sm">
            {overdueBreaches.length} incident
            {overdueBreaches.length === 1 ? "" : "s"} may require DPC
            notification — the 72-hour window has passed. Review and update
            status immediately.
          </p>
        </div>
      )}

      {/* Breach table */}
      {breaches === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : breaches.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No incidents logged. Use the button above to log a new incident.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  Date Detected
                </th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Severity</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">
                  DPC Notified
                </th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {breaches.map((breach) => {
                const severityConfig =
                  SEVERITY_CONFIG[breach.severity as Severity];
                const isOverdue =
                  (breach.status === "detected" ||
                    breach.status === "under_assessment") &&
                  breach.detectedAt < Date.now() - SEVENTY_TWO_HOURS_MS;

                return (
                  <tr
                    className={isOverdue ? "bg-red-50" : undefined}
                    key={breach._id}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {formatDate(breach.detectedAt)}
                      {isOverdue && (
                        <span className="ml-2 text-red-600 text-xs">
                          ⚠️ Overdue
                        </span>
                      )}
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      <p className="truncate">
                        {breach.description.slice(0, 80)}
                        {breach.description.length > 80 ? "…" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={severityConfig.badgeClass}
                        variant="outline"
                      >
                        {severityConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_LABELS[breach.status as BreachStatus]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {breach.dpcNotifiedAt
                        ? formatDate(breach.dpcNotifiedAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {breach.status !== "closed" && (
                        <Button
                          onClick={() =>
                            setSelectedBreach(breach as BreachRecord)
                          }
                          size="sm"
                          variant="outline"
                        >
                          Update
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Log new breach dialog */}
      <Dialog
        onOpenChange={(open) => !open && setShowLogDialog(false)}
        open={showLogDialog}
      >
        <LogBreachDialog
          onClose={() => setShowLogDialog(false)}
          orgId={orgId}
        />
      </Dialog>

      {/* Update breach dialog */}
      <Dialog
        onOpenChange={(open) => !open && setSelectedBreach(null)}
        open={selectedBreach !== null}
      >
        {selectedBreach && (
          <UpdateBreachDialog
            breach={selectedBreach}
            onClose={() => setSelectedBreach(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
