"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Dumbbell,
  Loader2,
  MoreVertical,
  Pencil,
  Save,
  Star,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";

// Get gradient based on intensity
function getIntensityGradient(intensity?: "low" | "medium" | "high"): string {
  switch (intensity) {
    case "low":
      return "from-[#43e97b] to-[#38f9d7]"; // Green
    case "medium":
      return "from-[#f093fb] to-[#f5576c]"; // Pink/Red
    case "high":
      return "from-[#ff6b6b] to-[#feca57]"; // Red/Orange
    default:
      return "from-[#667eea] to-[#764ba2]"; // Purple (default)
  }
}

// Get intensity badge color
function getIntensityColor(intensity?: "low" | "medium" | "high"): string {
  switch (intensity) {
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Get visibility badge
function getVisibilityBadge(visibility?: "private" | "club" | "platform") {
  switch (visibility) {
    case "club":
      return (
        <Badge className="border border-blue-200 bg-blue-100 text-blue-800">
          SHARED
        </Badge>
      );
    case "platform":
      return (
        <Badge className="border border-purple-200 bg-purple-100 text-purple-800">
          PLATFORM
        </Badge>
      );
    default:
      return (
        <Badge className="border border-gray-200 bg-gray-100 text-gray-800">
          PRIVATE
        </Badge>
      );
  }
}

export default function SessionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const planId = params.planId as Id<"sessionPlans">;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const plan = useQuery(api.models.sessionPlans.getPlanById, { planId });
  const presence = useQuery(api.models.sessionPlans.getSessionPlanPresence, {
    planId,
  });

  const updateTitle = useMutation(api.models.sessionPlans.updateTitle);
  const updateContent = useMutation(api.models.sessionPlans.updateContent);
  const updatePresence = useMutation(
    api.models.sessionPlans.updateSessionPlanPresence
  );
  const deletePlan = useMutation(api.models.sessionPlans.deletePlan);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for auto-save debounce and presence updates
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isOwner = plan && userId && plan.coachId === userId;
  const intensity = plan?.extractedTags?.intensity;
  const gradientClass = getIntensityGradient(intensity);

  // Initialize edited content when plan loads or edit mode changes
  useEffect(() => {
    if (plan?.rawContent && isEditing && !editedContent) {
      setEditedContent(plan.rawContent);
    }
  }, [plan?.rawContent, isEditing, editedContent]);

  // Update presence on mount and interval
  useEffect(() => {
    if (!(userId && orgId && planId)) {
      return;
    }

    // Update presence immediately
    updatePresence({ userId, organizationId: orgId, planId }).catch((error) =>
      console.error("Failed to update presence:", error)
    );

    // Update presence every 30s
    presenceIntervalRef.current = setInterval(() => {
      updatePresence({ userId, organizationId: orgId, planId }).catch((error) =>
        console.error("Failed to update presence:", error)
      );
    }, 30 * 1000);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [userId, orgId, planId, updatePresence]);

  // Detect when other coaches are editing and show notification
  const previousOtherViewersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!(presence && userId)) {
      return;
    }

    const currentOtherViewers = new Set(
      presence.filter((p) => p.userId !== userId).map((p) => p.userId)
    );

    // Check for new viewers (coaches who just started viewing)
    const newViewers = Array.from(currentOtherViewers).filter(
      (id) => !previousOtherViewersRef.current.has(id)
    );

    // Only show notification if user is actively editing (not just viewing)
    if (newViewers.length > 0 && isEditing) {
      const newViewerNames = presence
        .filter((p) => newViewers.includes(p.userId))
        .map((p) => p.userName)
        .join(", ");

      toast.info(`${newViewerNames} is now viewing this plan`, {
        description:
          "Changes are auto-saved. Last write wins if editing simultaneously.",
        duration: 5000,
      });
    }

    previousOtherViewersRef.current = currentOtherViewers;
  }, [presence, userId, isEditing]);

  // Auto-save with 300ms debounce
  const debouncedSave = useCallback(
    (content: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("saving");

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await updateContent({ planId, rawContent: content });
          setSaveStatus("saved");
          setHasUnsavedChanges(false);

          // Reset to idle after 2s
          setTimeout(() => {
            setSaveStatus("idle");
          }, 2000);
        } catch (error) {
          console.error("Failed to save content:", error);
          toast.error("Failed to save changes");
          setSaveStatus("idle");
        }
      }, 300);
    },
    [planId, updateContent]
  );

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      setEditedContent(newContent);
      setHasUnsavedChanges(true);
      debouncedSave(newContent);
    },
    [debouncedSave]
  );

  // Warn before navigation if unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

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

  // Open rename dialog
  const openRenameDialog = () => {
    setNewTitle(plan?.title || "");
    setRenameDialogOpen(true);
  };

  const handleDelete = async () => {
    if (hasUnsavedChanges) {
      toast.error("Please save or discard changes before deleting");
      return;
    }

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

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing && hasUnsavedChanges) {
      // biome-ignore lint/suspicious/noAlert: Quick confirmation for discarding changes
      if (!confirm("You have unsaved changes. Discard them?")) {
        return;
      }
      setHasUnsavedChanges(false);
    }

    setIsEditing(!isEditing);
    if (!isEditing && plan?.rawContent) {
      setEditedContent(plan.rawContent);
    }
  };

  if (!plan) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isNew =
    plan._creationTime && Date.now() - plan._creationTime < 7 * 24 * 60 * 1000;
  const isTrending =
    (plan.timesUsed ?? 0) > 5 &&
    plan._creationTime &&
    Date.now() - plan._creationTime < 30 * 24 * 60 * 60 * 1000;

  // Filter out current user from presence list
  const otherViewers = (presence || []).filter((p) => p.userId !== userId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Gradient Header */}
      <div
        className={`relative overflow-hidden bg-gradient-to-r ${gradientClass} px-6 py-8 text-white shadow-lg`}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-black/10" />
        <div className="-translate-y-32 absolute top-0 right-0 h-64 w-64 translate-x-32 rounded-full bg-white/10 blur-3xl" />
        <div className="-translate-x-24 absolute bottom-0 left-0 h-48 w-48 translate-y-24 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button
                className="mt-1 shrink-0 border-white/30 bg-white/20 text-white hover:bg-white/30"
                onClick={() =>
                  router.push(`/orgs/${orgId}/coach/session-plans`)
                }
                size="icon"
                variant="outline"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {getVisibilityBadge(plan.visibility)}
                  {plan.pinnedByAdmin && (
                    <Badge className="border-amber-300/50 bg-amber-200/80 text-amber-900">
                      <Star className="mr-1 h-3 w-3 fill-current" />
                      FEATURED
                    </Badge>
                  )}
                  {isNew && (
                    <Badge className="border-emerald-300/50 bg-emerald-200/80 text-emerald-900">
                      NEW
                    </Badge>
                  )}
                  {isTrending && (
                    <Badge className="border-indigo-300/50 bg-indigo-200/80 text-indigo-900">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      TRENDING
                    </Badge>
                  )}
                </div>
                <h1 className="font-bold text-2xl drop-shadow-sm sm:text-3xl">
                  {plan.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/90 sm:gap-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {plan.teamName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {plan.duration} min
                  </span>
                  {plan.focusArea && (
                    <span className="flex items-center gap-1.5">
                      <Dumbbell className="h-4 w-4" />
                      {plan.focusArea}
                    </span>
                  )}
                </div>

                {/* Presence Indicators */}
                {otherViewers.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="-space-x-2 flex">
                      <TooltipProvider>
                        {otherViewers.slice(0, 3).map((viewer) => (
                          <Tooltip key={viewer.userId}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 border-2 border-white">
                                <AvatarImage src={viewer.userAvatar} />
                                <AvatarFallback className="bg-white/20 text-white text-xs">
                                  {viewer.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{viewer.userName} is viewing this plan</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                    {otherViewers.length > 3 && (
                      <span className="text-sm text-white/80">
                        +{otherViewers.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Saving indicator */}
              {saveStatus === "saving" && (
                <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                  <Check className="h-3 w-3" />
                  <span>Saved</span>
                </div>
              )}

              {/* Edit/Save button (owner only) */}
              {isOwner && (
                <Button
                  className="border-white/30 bg-white/20 text-white hover:bg-white/30"
                  onClick={toggleEditMode}
                  size="sm"
                  variant="outline"
                >
                  {isEditing ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Done Editing
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </>
                  )}
                </Button>
              )}

              {/* 3-dot menu for owner actions */}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="border-white/30 bg-white/20 text-white hover:bg-white/30"
                      size="icon"
                      variant="outline"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openRenameDialog}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
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

          {/* Quick Stats Row */}
          <div className="mt-4 flex flex-wrap gap-4">
            {plan.extractedTags?.intensity && (
              <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <span className="font-medium capitalize">
                  {plan.extractedTags.intensity} Intensity
                </span>
              </div>
            )}
            {plan.playerCount && (
              <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <Users className="h-4 w-4" />
                <span>{plan.playerCount} players</span>
              </div>
            )}
            {(plan.likeCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <ThumbsUp className="h-4 w-4" />
                <span>{plan.likeCount} likes</span>
              </div>
            )}
            {(plan.timesUsed ?? 0) > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Used {plan.timesUsed} times</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl p-6">
        {/* Rejection Notice */}
        {plan.moderatedBy && (
          <Card className="mb-6 border-red-200 bg-red-50">
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
                  Your plan has been set back to private and is no longer
                  visible to other coaches. You can still view and use it
                  yourself. If you believe this was a mistake, please contact
                  your club administrator.
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
                This usually takes a few seconds. Your plan will appear here
                when ready.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Tags/Skills Section */}
            {(plan.extractedTags?.skills?.length ?? 0) > 0 ||
            (plan.extractedTags?.categories?.length ?? 0) > 0 ||
            (plan.extractedTags?.equipment?.length ?? 0) > 0 ? (
              <Card className="border-0 bg-gradient-to-br from-slate-50 to-gray-50/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tags & Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.extractedTags?.skills &&
                    plan.extractedTags.skills.length > 0 && (
                      <div>
                        <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Skills Focus
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.extractedTags.skills.map((skill) => (
                            <Badge
                              className={`border ${getIntensityColor(intensity)}`}
                              key={skill}
                              variant="outline"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {plan.extractedTags?.categories &&
                    plan.extractedTags.categories.length > 0 && (
                      <div>
                        <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Categories
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.extractedTags.categories.map((cat) => (
                            <Badge
                              className="border-slate-200 bg-slate-100 text-slate-700"
                              key={cat}
                              variant="outline"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {plan.extractedTags?.equipment &&
                    plan.extractedTags.equipment.length > 0 && (
                      <div>
                        <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Equipment Needed
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.extractedTags.equipment.map((eq) => (
                            <Badge
                              className="border-amber-200 bg-amber-50 text-amber-800"
                              key={eq}
                              variant="outline"
                            >
                              {eq}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            ) : null}

            {/* Content - Raw editor, only shown in edit mode */}
            {isEditing && (
              <Card className="overflow-hidden border-0 shadow-md">
                <CardHeader
                  className={`bg-gradient-to-r ${gradientClass} text-white`}
                >
                  <CardTitle className="text-lg">Session Plan</CardTitle>
                  <CardDescription className="text-white/80">
                    Edit your training session structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Textarea
                    className="min-h-[400px] font-mono text-sm leading-relaxed"
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Enter session plan content..."
                    value={editedContent}
                  />
                </CardContent>
              </Card>
            )}

            {/* Sections */}
            {plan.sections && plan.sections.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Session Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.sections.map((section, index) => {
                    const sectionColors = [
                      "border-l-green-500 bg-green-50/50",
                      "border-l-blue-500 bg-blue-50/50",
                      "border-l-purple-500 bg-purple-50/50",
                      "border-l-orange-500 bg-orange-50/50",
                      "border-l-pink-500 bg-pink-50/50",
                    ];
                    const colorClass =
                      sectionColors[index % sectionColors.length];

                    return (
                      <div
                        className={`rounded-lg border-l-4 p-4 ${colorClass}`}
                        key={section.id}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold text-lg">
                            {section.title}
                          </h3>
                          <Badge variant="outline">
                            {section.duration} min
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {section.activities.map((activity) => (
                            <div
                              className="rounded-md bg-white p-3 shadow-sm"
                              key={activity.id}
                            >
                              <div className="mb-1 font-medium">
                                {activity.name}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {activity.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
