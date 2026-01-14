"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pin,
  PinOff,
  Shield,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

type SessionPlan = {
  _id: Id<"sessionPlans">;
  title?: string;
  coachName: string;
  teamName: string;
  duration?: number;
  ageGroup?: string;
  sport?: string;
  visibility?: "private" | "club" | "platform";
  pinnedByAdmin?: boolean;
  moderatedBy?: string;
  moderatedAt?: number;
  moderationNote?: string;
  createdAt: number;
  timesUsed?: number;
  successRate?: number;
  status: string;
};

export default function AdminSessionPlansPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name || "Admin";

  // State for rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SessionPlan | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch all plans for admin review
  const plans = useQuery(
    api.models.sessionPlans.listForAdmin,
    userId ? { organizationId: orgId } : "skip"
  );

  // Mutations
  const removeFromClubLibrary = useMutation(
    api.models.sessionPlans.removeFromClubLibrary
  );
  const pinPlan = useMutation(api.models.sessionPlans.pinPlan);
  const unpinPlan = useMutation(api.models.sessionPlans.unpinPlan);

  const handleRejectClick = (plan: SessionPlan) => {
    setSelectedPlan(plan);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!(selectedPlan && userId)) {
      return;
    }

    try {
      await removeFromClubLibrary({
        planId: selectedPlan._id,
        moderatorId: userId,
        moderatorName: userName,
        reason: rejectionReason || "No reason provided",
      });

      toast.success("Plan removed from club library");
      setRejectDialogOpen(false);
      setSelectedPlan(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject plan:", error);
      toast.error("Failed to remove plan");
    }
  };

  const handlePinToggle = async (plan: SessionPlan) => {
    try {
      if (plan.pinnedByAdmin) {
        await unpinPlan({ planId: plan._id });
        toast.success("Plan unpinned");
      } else {
        await pinPlan({ planId: plan._id });
        toast.success("Plan pinned as featured");
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update plan");
    }
  };

  const handleViewPlan = (planId: Id<"sessionPlans">) => {
    router.push(`/orgs/${orgId}/admin/session-plans/${planId}`);
  };

  if (plans === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Separate plans by visibility
  const sharedPlans = plans.filter((p) => p.visibility === "club");
  const rejectedPlans = plans.filter(
    (p) => p.visibility === "private" && p.moderatedBy
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="font-bold text-3xl">Session Plans Moderation</h1>
        </div>
        <p className="text-muted-foreground">
          Review and moderate session plans shared with the organization. Reject
          inappropriate plans or feature high-quality content.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-bold text-3xl">{sharedPlans.length}</div>
              <div className="text-muted-foreground text-sm">Shared Plans</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-bold text-3xl">
                {sharedPlans.filter((p) => p.pinnedByAdmin).length}
              </div>
              <div className="text-muted-foreground text-sm">
                Featured Plans
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-bold text-3xl">{rejectedPlans.length}</div>
              <div className="text-muted-foreground text-sm">
                Rejected Plans
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shared Plans Section */}
      <div className="mb-8">
        <h2 className="mb-4 font-semibold text-xl">
          Shared Plans ({sharedPlans.length})
        </h2>
        {sharedPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <Shield className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">
                No shared plans to review
              </h3>
              <p className="text-center text-muted-foreground">
                When coaches share their session plans with the organization,
                they will appear here for review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedPlans.map((plan) => (
              <Card
                className="relative transition-shadow hover:shadow-lg"
                key={plan._id}
              >
                <CardHeader>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className="bg-blue-100 text-blue-800"
                        variant="secondary"
                      >
                        SHARED
                      </Badge>
                      {plan.pinnedByAdmin && (
                        <Badge
                          className="bg-amber-100 text-amber-800"
                          variant="secondary"
                        >
                          <Pin className="mr-1 h-3 w-3 fill-current" />
                          FEATURED
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="line-clamp-2 text-lg">
                    {plan.title || "Untitled Session Plan"}
                  </CardTitle>
                  <CardDescription>
                    By {plan.coachName} • {plan.teamName}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Metadata */}
                  <div className="mb-3 flex flex-wrap gap-2 text-sm">
                    {plan.ageGroup && (
                      <Badge variant="outline">{plan.ageGroup}</Badge>
                    )}
                    {plan.sport && (
                      <Badge variant="outline">{plan.sport}</Badge>
                    )}
                    {plan.duration && (
                      <Badge variant="outline">{plan.duration} min</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  {(plan.timesUsed !== undefined ||
                    plan.successRate !== undefined) && (
                    <div className="mb-3 text-muted-foreground text-sm">
                      {plan.timesUsed !== undefined && plan.timesUsed > 0 && (
                        <span>{plan.timesUsed} uses</span>
                      )}
                      {plan.timesUsed !== undefined &&
                        plan.timesUsed > 0 &&
                        plan.successRate !== undefined &&
                        plan.successRate > 0 && <span> • </span>}
                      {plan.successRate !== undefined &&
                        plan.successRate > 0 && (
                          <span>{plan.successRate}% success rate</span>
                        )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleViewPlan(plan._id)}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      onClick={() =>
                        plan.pinnedByAdmin
                          ? handlePinToggle(plan)
                          : handlePinToggle(plan)
                      }
                      size="sm"
                      title={
                        plan.pinnedByAdmin
                          ? "Unpin from featured"
                          : "Pin as featured"
                      }
                      variant="outline"
                    >
                      {plan.pinnedByAdmin ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => handleRejectClick(plan)}
                      size="sm"
                      variant="destructive"
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rejected Plans Section */}
      {rejectedPlans.length > 0 && (
        <div>
          <h2 className="mb-4 font-semibold text-xl">
            Recently Rejected Plans ({rejectedPlans.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rejectedPlans.map((plan) => (
              <Card className="border-red-200" key={plan._id}>
                <CardHeader>
                  <div className="mb-2">
                    <Badge
                      className="bg-red-100 text-red-800"
                      variant="secondary"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      REJECTED
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-lg">
                    {plan.title || "Untitled Session Plan"}
                  </CardTitle>
                  <CardDescription>
                    By {plan.coachName} • {plan.teamName}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Moderation Info */}
                  <div className="mb-3 rounded-md bg-red-50 p-3 text-sm">
                    <div className="mb-1 font-medium text-red-900">
                      Rejected by {plan.moderatedBy}
                    </div>
                    <div className="text-red-700">
                      {plan.moderationNote || "No reason provided"}
                    </div>
                    {plan.moderatedAt && (
                      <div className="mt-1 text-red-600 text-xs">
                        {new Date(plan.moderatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleViewPlan(plan._id)}
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Session Plan</DialogTitle>
            <DialogDescription>
              This plan will be removed from the club library and set back to
              private. The coach will be able to see the rejection reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPlan && (
              <div>
                <div className="font-medium">
                  {selectedPlan.title || "Untitled Session Plan"}
                </div>
                <div className="text-muted-foreground text-sm">
                  By {selectedPlan.coachName}
                </div>
              </div>
            )}

            <div>
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="rejection-reason"
              >
                Reason for Rejection
              </label>
              <Textarea
                id="rejection-reason"
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this plan..."
                rows={4}
                value={rejectionReason}
              />
              <p className="mt-1 text-muted-foreground text-xs">
                This message will be visible to the coach who created the plan.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setRejectDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleRejectConfirm} variant="destructive">
              Reject Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
