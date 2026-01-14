"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  Copy,
  Loader2,
  MoreVertical,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const markAsUsed = useMutation(api.models.sessionPlans.markAsUsed);
  const deletePlan = useMutation(api.models.sessionPlans.deletePlan);

  const isOwner = plan && userId && plan.coachId === userId;

  const handleDuplicate = async () => {
    try {
      const newPlanId = await duplicatePlan({ planId });
      toast.success("Plan duplicated successfully!");
      router.push(`/orgs/${orgId}/coach/session-plans/${newPlanId}`);
    } catch (error) {
      console.error("Failed to duplicate plan:", error);
      toast.error("Failed to duplicate plan");
    }
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
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link
              className="mb-2 inline-block text-muted-foreground text-sm hover:text-foreground"
              href={`/orgs/${orgId}/coach/session-plans`}
            >
              ← Back to Session Plans
            </Link>
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

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!plan.usedInSession && (
                  <DropdownMenuItem onClick={handleMarkAsUsed}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Used
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
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
    </div>
  );
}
