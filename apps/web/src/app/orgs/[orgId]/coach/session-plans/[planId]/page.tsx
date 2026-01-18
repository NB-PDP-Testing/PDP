"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Copy,
  Loader2,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function SessionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const planId = params.planId as Id<"sessionPlans">;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const plan = useQuery(api.models.sessionPlans.getPlanById, { planId });

  const duplicatePlan = useMutation(api.models.sessionPlans.duplicatePlan);
  const updateVisibility = useMutation(
    api.models.sessionPlans.updateVisibility
  );
  const updateTitle = useMutation(api.models.sessionPlans.updateTitle);
  const markAsUsed = useMutation(api.models.sessionPlans.markAsUsed);
  const deletePlan = useMutation(api.models.sessionPlans.deletePlan);

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = plan && userId && plan.coachId === userId;

  // Rename handler
  const handleRename = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTitle({ planId, title: newTitle.trim() });
      toast.success("Plan renamed successfully!");
      setRenameDialogOpen(false);
      setNewTitle("");
    } catch (error) {
      console.error("Failed to rename plan:", error);
      toast.error("Failed to rename plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Duplicate with new name handler
  const handleDuplicate = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title for the copy");
      return;
    }

    setIsSubmitting(true);
    try {
      const newPlanId = await duplicatePlan({
        planId,
        newTitle: newTitle.trim(),
      });
      toast.success("Plan duplicated successfully!");
      setDuplicateDialogOpen(false);
      setNewTitle("");
      router.push(`/orgs/${orgId}/coach/session-plans/${newPlanId}`);
    } catch (error) {
      console.error("Failed to duplicate plan:", error);
      toast.error("Failed to duplicate plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open rename dialog
  const openRenameDialog = () => {
    setNewTitle(plan?.title || "");
    setRenameDialogOpen(true);
  };

  // Open duplicate dialog
  const openDuplicateDialog = () => {
    setNewTitle(`${plan?.title || "Untitled"} (Copy)`);
    setDuplicateDialogOpen(true);
  };

  const handleShareToClub = async () => {
    try {
      await updateVisibility({ planId, visibility: "club" });
      toast.success("Plan shared to club library!");
    } catch (error) {
      console.error("Failed to share plan:", error);
      toast.error("Failed to share plan");
    }
  };

  const handleMarkAsUsed = async () => {
    try {
      await markAsUsed({ planId });
      toast.success("Plan marked as used!");
    } catch (error) {
      console.error("Failed to mark as used:", error);
      toast.error("Failed to mark as used");
    }
  };

  const handleDelete = async () => {
    // biome-ignore lint/suspicious/noAlert: TODO: Replace with proper dialog component
    if (!confirm("Are you sure you want to delete this plan?")) {
      return;
    }

    try {
      await deletePlan({ planId });
      toast.success("Plan deleted");
      router.push(`/orgs/${orgId}/coach/session-plans`);
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete plan");
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              className="mt-1 shrink-0"
              onClick={() => router.push(`/orgs/${orgId}/coach/session-plans`)}
              size="icon"
              variant="ghost"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-3xl">{plan.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground text-sm sm:gap-4">
                <span>{plan.teamName}</span>
                <span className="hidden sm:inline">•</span>
                <span>{plan.duration} minutes</span>
                {plan.focusArea && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span>{plan.focusArea}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openRenameDialog}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openDuplicateDialog}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                {!plan.usedInSession && (
                  <DropdownMenuItem onClick={handleMarkAsUsed}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Used
                  </DropdownMenuItem>
                )}
                {plan.visibility === "private" && (
                  <DropdownMenuItem onClick={handleShareToClub}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share to Club Library
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Rejection Notice */}
      {plan.moderatedBy && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">
                Rejected from Club Library
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
            <div className="rounded-md bg-white p-3 text-sm">
              <p className="text-muted-foreground">
                Your plan has been set back to private and is no longer visible
                to other coaches. You can still view and use it yourself. If you
                believe this was a mistake, please contact your club
                administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {plan.status === "draft" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" />
            <h3 className="mb-2 font-semibold text-lg">
              Generating your session plan...
            </h3>
            <p className="text-center text-muted-foreground">
              This usually takes a few seconds. Your plan will appear here when
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
              {plan.visibility === "club" && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Visibility
                  </span>
                  <span className="font-medium text-blue-600 text-sm">
                    Club Library
                  </span>
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

      {/* Rename Dialog */}
      <Dialog onOpenChange={setRenameDialogOpen} open={renameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Session Plan</DialogTitle>
            <DialogDescription>
              Enter a new name for this session plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-title">Title</Label>
              <Input
                id="rename-title"
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitting) {
                    handleRename();
                  }
                }}
                placeholder="Enter plan title..."
                value={newTitle}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => setRenameDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !newTitle.trim()}
              onClick={handleRename}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog onOpenChange={setDuplicateDialogOpen} open={duplicateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Session Plan</DialogTitle>
            <DialogDescription>
              Create a copy of this session plan with a new name. This is useful
              for adapting plans for different teams, age groups, or variations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-title">New Plan Title</Label>
              <Input
                id="duplicate-title"
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitting) {
                    handleDuplicate();
                  }
                }}
                placeholder="Enter title for the copy..."
                value={newTitle}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => setDuplicateDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !newTitle.trim()}
              onClick={handleDuplicate}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Create Copy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
