"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Loader2, Pin, PinOff, Shield, X } from "lucide-react";
import Link from "next/link";
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

export default function AdminSessionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const planId = params.planId as Id<"sessionPlans">;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name || "Unknown Admin";

  const plan = useQuery(api.models.sessionPlans.getPlanById, { planId });

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const removeFromClubLibrary = useMutation(
    api.models.sessionPlans.removeFromClubLibrary
  );
  const pinPlan = useMutation(api.models.sessionPlans.pinPlan);
  const unpinPlan = useMutation(api.models.sessionPlans.unpinPlan);

  const handleRejectClick = () => {
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!userId) {
      return;
    }

    try {
      await removeFromClubLibrary({
        planId,
        moderatorId: userId,
        moderatorName: userName,
        reason: rejectionReason || "No reason provided",
      });

      toast.success("Plan removed from club library");
      router.push(`/orgs/${orgId}/admin/session-plans`);
    } catch (error) {
      console.error("Failed to reject plan:", error);
      toast.error("Failed to remove plan");
    }
  };

  const handlePinToggle = async () => {
    try {
      if (plan?.pinnedByAdmin) {
        await unpinPlan({ planId });
        toast.success("Plan unpinned");
      } else {
        await pinPlan({ planId });
        toast.success("Plan pinned as featured");
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update plan");
    }
  };

  if (!plan) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link
              className="mb-2 inline-block text-muted-foreground text-sm hover:text-foreground"
              href={`/orgs/${orgId}/admin/session-plans`}
            >
              ← Back to Session Plans Moderation
            </Link>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <Badge variant="secondary">Admin View</Badge>
            </div>
            <h1 className="font-bold text-3xl">{plan.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-muted-foreground text-sm">
              <span>{plan.teamName}</span>
              <span>•</span>
              <span>{plan.duration} minutes</span>
              {plan.focusArea && (
                <>
                  <span>•</span>
                  <span>{plan.focusArea}</span>
                </>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          {plan.visibility === "club" && (
            <div className="flex gap-2">
              <Button
                onClick={handlePinToggle}
                size="sm"
                title={
                  plan.pinnedByAdmin ? "Unpin from featured" : "Pin as featured"
                }
                variant="outline"
              >
                {plan.pinnedByAdmin ? (
                  <>
                    <PinOff className="mr-1.5 h-4 w-4" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-1.5 h-4 w-4" />
                    Pin as Featured
                  </>
                )}
              </Button>
              <Button
                onClick={handleRejectClick}
                size="sm"
                variant="destructive"
              >
                <X className="mr-1.5 h-4 w-4" />
                Reject Plan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Moderation Status */}
      {plan.moderatedBy && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">
                Previously Rejected from Club Library
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 font-medium text-red-900 text-sm">
                Reason for Rejection:
              </div>
              <div className="text-red-700">
                {plan.moderationNote || "No reason provided"}
              </div>
            </div>
            <div className="flex items-center justify-between text-red-600 text-sm">
              <span>Rejected by {plan.moderatedBy}</span>
              {plan.moderatedAt && (
                <span>{new Date(plan.moderatedAt).toLocaleDateString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pin Status */}
      {plan.pinnedByAdmin && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Pin className="h-5 w-5 fill-amber-600 text-amber-600" />
              <CardTitle className="text-amber-900">Featured Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 text-sm">
              This plan is featured in the club library and will be highlighted
              for all coaches.
            </p>
          </CardContent>
        </Card>
      )}

      {plan.status === "draft" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" />
            <h3 className="mb-2 font-semibold text-lg">
              Generating session plan...
            </h3>
            <p className="text-center text-muted-foreground">
              This usually takes a few seconds. The plan will appear here when
              ready.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Coach</span>
                <span className="font-medium text-sm">{plan.coachName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Players</span>
                <span className="font-medium text-sm">{plan.playerCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                <span className="font-medium text-sm">
                  {plan.usedInSession ? "Used" : "Ready"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Visibility
                </span>
                <span className="font-medium text-sm">
                  {plan.visibility === "club" ? (
                    <Badge
                      className="bg-blue-100 text-blue-800"
                      variant="secondary"
                    >
                      Club Library
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Private</Badge>
                  )}
                </span>
              </div>
              {plan.ageGroup && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Age Group
                  </span>
                  <span className="font-medium text-sm">{plan.ageGroup}</span>
                </div>
              )}
              {plan.sport && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Sport</span>
                  <span className="font-medium text-sm">{plan.sport}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Session Plan</CardTitle>
              <CardDescription>
                AI-generated training session structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans">
                  {plan.rawContent}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {plan.sections && plan.sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Session Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.sections.map((section) => (
                  <div
                    className="border-primary border-l-4 pl-4"
                    key={section.id}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">{section.title}</h3>
                      <span className="text-muted-foreground text-sm">
                        {section.duration} min
                      </span>
                    </div>
                    <div className="space-y-2">
                      {section.activities.map((activity) => (
                        <div className="text-sm" key={activity.id}>
                          <div className="font-medium">{activity.name}</div>
                          <div className="text-muted-foreground">
                            {activity.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
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
            <div>
              <div className="font-medium">{plan.title}</div>
              <div className="text-muted-foreground text-sm">
                By {plan.coachName}
              </div>
            </div>

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
