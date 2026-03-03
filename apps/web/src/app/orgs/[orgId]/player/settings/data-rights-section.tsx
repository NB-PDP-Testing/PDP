"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Info,
  Loader2,
  Shield,
  XCircle,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DataRightsSectionProps {
  orgId: string;
  orgName: string;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDaysRemaining(deadline: number) {
  return Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Pending
      </Badge>
    );
  }
  if (status === "in_review") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        In Review
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Completed
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Rejected
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function CategoryOutcomeItem({
  decision,
}: {
  decision: {
    category: string;
    decision: "approved" | "rejected";
    grounds?: string;
    erasedAt?: number;
  };
}) {
  const labelMap: Record<string, string> = {
    WELLNESS_DATA: "Wellness check-ins",
    ASSESSMENT_HISTORY: "Assessment history",
    INJURY_RECORDS: "Injury records",
    COACH_FEEDBACK: "Coach feedback",
    PROFILE_DATA: "Player profile",
    COMMUNICATION_DATA: "WhatsApp & SMS communications",
    AUDIT_LOGS: "Activity logs",
    CHILD_AUTH_LOGS: "Safeguarding records",
  };

  const label = labelMap[decision.category] ?? decision.category;

  if (decision.decision === "approved") {
    return (
      <div className="flex items-start gap-2 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <span>
          <span className="font-medium">{label}</span> — deleted
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <span>
        <span className="font-medium">{label}</span> — retained
        {decision.grounds ? (
          <span className="text-muted-foreground"> ({decision.grounds})</span>
        ) : null}
      </span>
    </div>
  );
}

function ErasureRequestStatus({
  request,
}: {
  request: {
    status: string;
    submittedAt: number;
    deadline: number;
    adminResponseNote?: string;
    categoryDecisions?: Array<{
      category: string;
      decision: "approved" | "rejected";
      grounds?: string;
      erasedAt?: number;
    }>;
  };
}) {
  const daysRemaining = getDaysRemaining(request.deadline);
  const isOverdue = daysRemaining < 0;
  const isUrgent =
    daysRemaining >= 0 &&
    daysRemaining <= 7 &&
    (request.status === "pending" || request.status === "in_review");

  return (
    <div className="space-y-3">
      {isUrgent && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Response due by {formatDate(request.deadline)} — the admin has been
            notified.
          </span>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium text-sm">Deletion Request</p>
            <p className="text-muted-foreground text-xs">
              Submitted {formatDate(request.submittedAt)} · Response due{" "}
              {formatDate(request.deadline)}
              {isOverdue ? " (overdue)" : ""}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {(request.status === "completed" || request.status === "rejected") &&
          request.adminResponseNote && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="mb-1 font-medium text-muted-foreground text-xs">
                Admin response
              </p>
              <p>{request.adminResponseNote}</p>
            </div>
          )}

        {request.status === "completed" &&
          request.categoryDecisions &&
          request.categoryDecisions.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground text-xs">
                Outcome by data category
              </p>
              {request.categoryDecisions.map((d) => (
                <CategoryOutcomeItem decision={d} key={d.category} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function ErasureRequestForm({
  orgId,
  onSuccess,
}: {
  orgId: string;
  onSuccess: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [grounds, setGrounds] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRequest = useMutation(
    api.models.erasureRequests.submitErasureRequest
  );

  const handleSubmit = async () => {
    if (!confirmed) {
      return;
    }
    try {
      setIsSubmitting(true);
      await submitRequest({
        organizationId: orgId,
        playerGrounds: grounds.trim() || undefined,
      });
      toast.success(
        "Deletion request submitted. The organisation admin has 30 days to respond. You'll see the outcome here when it's processed."
      );
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-sm"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span>Request account deletion</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 border-t px-4 pt-3 pb-4">
          <p className="text-muted-foreground text-sm">
            This submits a formal deletion request to the organisation admin.
            They have 30 days to respond. Some data (injury records, audit logs)
            may be retained for legal reasons — the admin will explain what can
            and cannot be deleted.
          </p>

          <div className="space-y-2">
            <Label htmlFor="erasure-grounds">
              Reason for request (optional)
            </Label>
            <Textarea
              id="erasure-grounds"
              maxLength={500}
              onChange={(e) => setGrounds(e.target.value)}
              placeholder="You can explain your reason here, but it is not required."
              rows={3}
              value={grounds}
            />
            <p className="text-right text-muted-foreground text-xs">
              {grounds.length}/500
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              checked={confirmed}
              id="erasure-confirm"
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label className="text-sm leading-snug" htmlFor="erasure-confirm">
              I understand this request will be reviewed by the org admin and
              some data may be retained for legal reasons.
            </Label>
          </div>

          <Button
            className="w-full"
            disabled={!confirmed || isSubmitting}
            onClick={handleSubmit}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit deletion request"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function DataRightsSection({ orgId, orgName }: DataRightsSectionProps) {
  const erasureRequest = useQuery(
    api.models.erasureRequests.getMyErasureRequestStatus,
    { organizationId: orgId }
  );

  // After successful submission, the query will update automatically
  const hasActiveRequest =
    erasureRequest !== undefined &&
    erasureRequest !== null &&
    (erasureRequest.status === "pending" ||
      erasureRequest.status === "in_review" ||
      erasureRequest.status === "completed" ||
      erasureRequest.status === "rejected");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Your Data Rights
        </CardTitle>
        <CardDescription>
          Under GDPR, you have the right to access, correct, and request
          deletion of your personal data held by {orgName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Right 1 — Access */}
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-sm">Access — Download your data</p>
            <p className="text-muted-foreground text-xs">
              You can download a copy of all personal data held about you using
              the &apos;Your Data&apos; section above.
            </p>
          </div>
        </div>

        {/* Right 2 — Rectification */}
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-sm">
              Rectification — Correct inaccurate data
            </p>
            <p className="text-muted-foreground text-xs">
              Contact {orgName} to correct any inaccurate personal data held
              about you.
            </p>
          </div>
        </div>

        {/* Right 3 — Erasure */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            {hasActiveRequest &&
            (erasureRequest?.status === "completed" ||
              erasureRequest?.status === "rejected") ? (
              erasureRequest?.status === "completed" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              )
            ) : (
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Erasure — Request deletion of your account and data
              </p>
              <p className="text-muted-foreground text-xs">
                You have the right to request that {orgName} deletes your
                personal data. Some data may be retained for legal reasons.
              </p>
            </div>
          </div>

          {hasActiveRequest && erasureRequest ? (
            <ErasureRequestStatus request={erasureRequest} />
          ) : (
            <ErasureRequestForm
              onSuccess={() => {
                // Query updates automatically via Convex reactivity
              }}
              orgId={orgId}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
