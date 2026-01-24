"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useConvex, useQuery } from "convex/react";
import {
  Brain,
  Clock,
  Download,
  FileText,
  MessageCircle,
  Save,
  Share,
  Share2,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateSessionPlan } from "@/lib/ai-service";
import {
  trackPlanCached,
  trackPlanGenerated,
  trackPlanRegenerated,
} from "@/lib/analytics-tracker";
import { authClient } from "@/lib/auth-client";
import {
  downloadPDF,
  generateSessionPlanPDF,
  shareViaNative,
  shareViaWhatsApp,
} from "@/lib/pdf-generator";
import { sessionPlanConfig } from "@/lib/session-plan-config";
import { cn } from "@/lib/utils";

type SessionPlanContextType = {
  openSessionPlanModal: () => void;
  isModalOpen: boolean;
};

const SessionPlanContext = createContext<SessionPlanContextType | null>(null);

export function useSessionPlanContext() {
  const context = useContext(SessionPlanContext);
  if (!context) {
    throw new Error(
      "useSessionPlanContext must be used within SessionPlanProvider"
    );
  }
  return context;
}

export function SessionPlanProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params.orgId as string;
  const convex = useConvex();

  // Get current user
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Modal state
  const [showSessionPlan, setShowSessionPlan] = useState(false);
  const [sessionPlan, setSessionPlan] = useState("");
  const [loadingSessionPlan, setLoadingSessionPlan] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<Id<"sessionPlans"> | null>(
    null
  );
  const [planSaved, setPlanSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Caching state for blue alert badge
  const [showCachedBadge, setShowCachedBadge] = useState(false);
  const [cachedBadgeDismissed, setCachedBadgeDismissed] = useState(false);
  const [cachedPlanAge, setCachedPlanAge] = useState<string | null>(null);
  const [isRegenerated, setIsRegenerated] = useState(false);

  // Fetch coach's teams
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignmentsWithTeams,
    userId ? { userId, organizationId: orgId } : "skip"
  );

  // Get the first team from coach assignments
  const firstTeam = coachAssignments?.teams?.[0];

  // Fetch players for the first team
  const teamPlayers = useQuery(
    api.models.teamPlayerIdentities.getPlayersForTeam,
    firstTeam ? { teamId: firstTeam.teamId } : "skip"
  );

  // Handle session plan generation
  const handleGenerateSessionPlan = useCallback(
    async (bypassCache = false) => {
      if (!(firstTeam && teamPlayers)) {
        toast.error("No team data available", {
          description:
            "Please make sure you have at least one team with players.",
        });
        return;
      }

      setLoadingSessionPlan(true);
      setShowSessionPlan(true);
      setPlanSaved(false);

      try {
        // Check for cached plan first (unless bypassing cache)
        if (bypassCache) {
          console.log("[SessionPlan] Bypassing cache, regenerating plan");

          // Delete all old cached plans for this team before creating new one (Issue #234)
          try {
            const deletedCount = await convex.mutation(
              api.models.sessionPlans.deleteTeamCachedPlans,
              { teamId: firstTeam.teamId }
            );
            console.log(
              `[SessionPlan] Deleted ${deletedCount} old cached plans`
            );
          } catch (deleteError) {
            console.error(
              "[SessionPlan] Error deleting old cached plans:",
              deleteError
            );
            // Continue with generation even if delete fails
          }

          // Keep badge visible but reset dismissed state
          setCachedBadgeDismissed(false);
          setCurrentPlanId(null);
        } else {
          const cacheDuration = sessionPlanConfig.cacheDurationHours;
          console.log("[SessionPlan] Checking for cached plan", {
            teamId: firstTeam.teamId,
            cacheDuration,
          });

          const cachedPlan = await convex.query(
            api.models.sessionPlans.getRecentPlanForTeam,
            {
              teamId: firstTeam.teamId,
              maxAgeHours: cacheDuration,
            }
          );

          console.log("[SessionPlan] Cache query result:", cachedPlan);

          if (cachedPlan) {
            // Calculate age of cached plan
            const ageMs = Math.max(0, Date.now() - cachedPlan.generatedAt);
            const ageMinutes = Math.floor(ageMs / (1000 * 60));
            const ageHours = Math.floor(ageMinutes / 60);
            let ageStr = "just now";
            if (ageHours > 0) {
              ageStr = `${ageHours} hour${ageHours > 1 ? "s" : ""} ago`;
            } else if (ageMinutes > 0) {
              ageStr = `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} ago`;
            }

            setSessionPlan(cachedPlan.sessionPlan || "");
            setCurrentPlanId(cachedPlan._id);
            setShowCachedBadge(true);
            setCachedPlanAge(ageStr);
            setIsRegenerated(cachedPlan.isRegenerated); // Use stored flag
            // Only show as "Saved" if it was explicitly saved to library
            setPlanSaved(cachedPlan.savedToLibrary);
            setLoadingSessionPlan(false);

            // Track cache hit for analytics
            trackPlanCached({
              teamId: firstTeam.teamId,
              teamName: firstTeam.teamName,
              playerCount: teamPlayers.length,
              ageGroup: firstTeam.ageGroup || "U12",
              cacheAge: ageMs,
            });

            return;
          }
        }

        // No cached plan found (or bypassing cache), generate new one
        setCurrentPlanId(null);

        const teamDataForAI = {
          teamName: firstTeam.teamName,
          playerCount: teamPlayers.length,
          ageGroup: firstTeam.ageGroup || teamPlayers[0]?.ageGroup || "U12",
          avgSkillLevel: 0,
          strengths: [] as { skill: string; avg: number }[],
          weaknesses: [] as { skill: string; avg: number }[],
          attendanceIssues: 0,
          overdueReviews: 0,
        };

        // Generate plan with AI
        const plan = await generateSessionPlan(teamDataForAI, undefined);

        setSessionPlan(plan);

        // Show badge immediately after generation with "just now" (Issue #234)
        setShowCachedBadge(true);
        setCachedPlanAge("just now");
        setIsRegenerated(bypassCache); // Track if this was a regeneration

        // Track generation for analytics
        const analyticsProps = {
          teamId: firstTeam.teamId,
          teamName: firstTeam.teamName,
          playerCount: teamPlayers.length,
          ageGroup: firstTeam.ageGroup || "U12",
          creationMethod: "ai_generated" as const,
        };

        if (bypassCache) {
          trackPlanRegenerated(analyticsProps);
        } else {
          trackPlanGenerated(analyticsProps);
        }

        // Auto-save the plan to database for caching (Issue #234)
        // This ensures the plan can be retrieved later with blue badge
        try {
          const teamDataForDB = {
            organizationId: orgId,
            playerCount: teamPlayers.length,
            ageGroup: firstTeam.ageGroup || teamPlayers[0]?.ageGroup || "U12",
            avgSkillLevel: 0,
            strengths: [] as string[],
            weaknesses: [] as string[],
            attendanceIssues: 0,
            overdueReviews: 0,
          };

          const planId = await convex.mutation(
            api.models.sessionPlans.savePlan,
            {
              teamId: firstTeam.teamId,
              teamName: firstTeam.teamName,
              sessionPlan: plan,
              focus: undefined,
              teamData: teamDataForDB,
              usedRealAI: true,
              creationMethod: "quick_action",
              savedToLibrary: false, // Cache only, not shown in library until explicitly saved
              isRegenerated: bypassCache, // Track if this was a regeneration
            }
          );

          console.log("[SessionPlan] Auto-cached plan with ID:", planId);
          setCurrentPlanId(planId);
          setPlanSaved(false); // Not saved to library yet, just cached
        } catch (saveError) {
          console.error(
            "[SessionPlan] Error auto-saving session plan:",
            saveError
          );
          // Don't fail the whole operation if save fails
          setPlanSaved(false);
        }

        toast.success(
          bypassCache ? "Session plan regenerated!" : "Session plan generated!"
        );
      } catch (error) {
        console.error("Error generating session plan:", error);
        setSessionPlan("Error generating session plan. Please try again.");
        toast.error("Failed to generate session plan");
      } finally {
        setLoadingSessionPlan(false);
      }
    },
    [firstTeam, teamPlayers, convex, orgId]
  );

  // Handle saving session plan to library (marks existing cached plan as saved)
  const handleSaveToLibrary = useCallback(async () => {
    if (!sessionPlan) {
      return;
    }

    try {
      if (currentPlanId) {
        // Plan is already cached - just mark it as saved to library
        await convex.mutation(api.models.sessionPlans.markSavedToLibrary, {
          planId: currentPlanId,
        });
        console.log(
          "[SessionPlan] Marked plan as saved to library:",
          currentPlanId
        );
      } else if (firstTeam && teamPlayers) {
        // Edge case: No cached plan exists, create a new one with savedToLibrary=true
        const teamDataForDB = {
          organizationId: orgId,
          playerCount: teamPlayers.length,
          ageGroup: firstTeam.ageGroup || teamPlayers[0]?.ageGroup || "U12",
          avgSkillLevel: 0,
          strengths: [] as string[],
          weaknesses: [] as string[],
          attendanceIssues: 0,
          overdueReviews: 0,
        };

        const planId = await convex.mutation(api.models.sessionPlans.savePlan, {
          teamId: firstTeam.teamId,
          teamName: firstTeam.teamName,
          sessionPlan,
          focus: undefined,
          teamData: teamDataForDB,
          usedRealAI: true,
          creationMethod: "quick_action",
          savedToLibrary: true, // Explicitly saving to library
        });
        setCurrentPlanId(planId);
        console.log("[SessionPlan] Created new plan saved to library:", planId);
      }

      setPlanSaved(true);
      toast.success("Session plan saved to your library!");
    } catch (error) {
      console.error("Error saving session plan:", error);
      toast.error("Failed to save session plan. Please try again.");
    }
  }, [currentPlanId, firstTeam, teamPlayers, sessionPlan, convex, orgId]);

  // Open modal function for context
  const openSessionPlanModal = useCallback(() => {
    handleGenerateSessionPlan();
  }, [handleGenerateSessionPlan]);

  const contextValue = useMemo(
    () => ({
      openSessionPlanModal,
      isModalOpen: showSessionPlan,
    }),
    [openSessionPlanModal, showSessionPlan]
  );

  return (
    <SessionPlanContext.Provider value={contextValue}>
      {children}

      {/* Share Plan Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-2 md:p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Share className="text-blue-600" size={20} />
                  Share Practice Plan
                </CardTitle>
                <Button
                  onClick={() => setShowShareModal(false)}
                  size="icon"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="h-12 w-full bg-blue-600 font-semibold text-base transition-colors hover:bg-blue-700"
                onClick={async () => {
                  try {
                    const pdfBlob = await generateSessionPlanPDF({
                      teamName: firstTeam?.teamName || "Team",
                      sessionPlan,
                      sport: "GAA Football",
                      ageGroup: firstTeam?.ageGroup || "U12",
                      playerCount: teamPlayers?.length || 0,
                      generatedBy: "ai",
                    });
                    await downloadPDF(
                      pdfBlob,
                      `${firstTeam?.teamName || "Team"}_Session_Plan.pdf`
                    );
                    toast.success("PDF Downloaded!", {
                      description: "Session plan saved to your device",
                    });
                    setShowShareModal(false);
                  } catch (error) {
                    console.error("Error downloading PDF:", error);
                    toast.error("Failed to download PDF");
                  }
                }}
              >
                <Download size={20} />
                Download as PDF
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="w-full bg-green-600 font-medium transition-colors hover:bg-green-700"
                  onClick={async () => {
                    try {
                      const pdfBlob = await generateSessionPlanPDF({
                        teamName: firstTeam?.teamName || "Team",
                        sessionPlan,
                        sport: "GAA Football",
                        ageGroup: firstTeam?.ageGroup || "U12",
                        playerCount: teamPlayers?.length || 0,
                        generatedBy: "ai",
                      });
                      await shareViaWhatsApp(
                        pdfBlob,
                        firstTeam?.teamName || "Team"
                      );
                      toast.success("Opening WhatsApp...", {
                        description: "Select a chat to share the plan",
                      });
                      setShowShareModal(false);
                    } catch (error) {
                      console.error("Error sharing via WhatsApp:", error);
                      toast.error("Failed to open WhatsApp");
                    }
                  }}
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </Button>

                <Button
                  className="w-full bg-gray-700 font-medium transition-colors hover:bg-gray-800"
                  onClick={async () => {
                    try {
                      const pdfBlob = await generateSessionPlanPDF({
                        teamName: firstTeam?.teamName || "Team",
                        sessionPlan,
                        sport: "GAA Football",
                        ageGroup: firstTeam?.ageGroup || "U12",
                        playerCount: teamPlayers?.length || 0,
                        generatedBy: "ai",
                      });
                      await shareViaNative(
                        pdfBlob,
                        firstTeam?.teamName || "Team"
                      );
                      toast.success("Share sheet opened!");
                      setShowShareModal(false);
                    } catch (error) {
                      console.error("Error using native share:", error);
                      toast.error("Native sharing not supported", {
                        description: "Please download the PDF instead.",
                      });
                    }
                  }}
                >
                  <Share2 size={18} />
                  Share...
                </Button>
              </div>

              <p className="text-center text-muted-foreground text-xs">
                💡 Share with your team via WhatsApp or messaging apps
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Plan Modal */}
      {showSessionPlan && (
        <div
          aria-describedby="session-plan-description"
          aria-labelledby="session-plan-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
        >
          <div
            className={cn(
              "flex flex-col overflow-hidden bg-background shadow-2xl",
              "sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:rounded-lg",
              "max-sm:h-full max-sm:w-full max-sm:rounded-none"
            )}
          >
            <div className="flex h-full flex-col overflow-hidden">
              <CardHeader
                className={cn(
                  "sticky top-0 z-10 flex-shrink-0 border-b bg-background",
                  "max-sm:px-3 max-sm:py-2",
                  "sm:px-6 sm:py-4"
                )}
              >
                <div className="flex items-start gap-2">
                  <Button
                    aria-label="Close session plan"
                    className={cn(
                      "h-8 w-8 flex-shrink-0",
                      "max-sm:order-first",
                      "sm:order-last sm:h-9 sm:w-9"
                    )}
                    onClick={() => setShowSessionPlan(false)}
                    size="icon"
                    variant="ghost"
                  >
                    <X size={18} />
                  </Button>

                  <div className="min-w-0 flex-1">
                    <CardTitle
                      className="flex items-center gap-2 text-base leading-tight sm:text-lg md:text-xl"
                      id="session-plan-title"
                    >
                      <FileText
                        className="flex-shrink-0 text-green-600"
                        size={20}
                      />
                      <span className="line-clamp-1">
                        AI Training Session Plan
                      </span>
                    </CardTitle>
                    <p
                      className="mt-1 text-muted-foreground text-xs leading-snug sm:text-sm"
                      id="session-plan-description"
                    >
                      {firstTeam
                        ? `Generated for ${firstTeam.teamName}`
                        : "Personalized for your team's needs"}
                    </p>
                  </div>
                </div>

                {/* Cached Plan Alert Badge */}
                {showCachedBadge && cachedPlanAge && !cachedBadgeDismissed && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50/80 px-2.5 py-1.5 text-xs">
                    <Clock className="flex-shrink-0 text-blue-600" size={14} />
                    <div className="flex-1 text-blue-700">
                      <div className="font-semibold text-[13px] leading-tight">
                        You {isRegenerated ? "regenerated" : "generated"} this{" "}
                        {cachedPlanAge}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight opacity-85">
                        Tap Regenerate to create a fresh plan
                      </div>
                    </div>
                    <button
                      aria-label="Dismiss"
                      className="flex-shrink-0 rounded-sm p-1 text-blue-600 transition-colors hover:bg-blue-100/50"
                      onClick={() => setCachedBadgeDismissed(true)}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </CardHeader>

              <CardContent
                className={cn(
                  "flex-1 overflow-y-auto",
                  "max-sm:px-3 max-sm:py-2",
                  "sm:px-6 sm:py-4"
                )}
              >
                {loadingSessionPlan ? (
                  <div className="py-8 text-center md:py-12">
                    <Brain
                      className="mx-auto mb-4 animate-pulse text-green-600"
                      size={40}
                    />
                    <p className="text-muted-foreground text-sm md:text-base">
                      AI is generating your personalized training session
                      plan...
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs opacity-75 md:text-sm">
                      This may take a few moments
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed md:text-base">
                      {sessionPlan}
                    </div>
                  </div>
                )}
              </CardContent>

              {!loadingSessionPlan && (
                <div
                  className={cn(
                    "sticky bottom-0 z-10 flex-shrink-0 border-t bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.08)]",
                    "max-sm:px-3 max-sm:py-3 max-sm:pb-safe",
                    "sm:px-6 sm:py-4"
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-blue-600 font-medium text-sm shadow-sm transition-colors hover:bg-blue-700 sm:flex-1 md:text-base"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Share2 className="flex-shrink-0" size={18} />
                      <span>Share Plan</span>
                    </Button>
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-green-600 font-medium text-sm shadow-sm transition-colors hover:bg-green-700 sm:flex-1 md:text-base"
                      onClick={() => handleGenerateSessionPlan(true)}
                    >
                      <Brain className="flex-shrink-0" size={18} />
                      <span>Regenerate Plan</span>
                    </Button>
                    <Button
                      className="flex h-10 w-full items-center justify-center gap-2 bg-purple-600 font-medium text-sm shadow-sm transition-colors hover:bg-purple-700 disabled:opacity-50 sm:flex-1 md:text-base"
                      disabled={planSaved}
                      onClick={handleSaveToLibrary}
                    >
                      <Save className="flex-shrink-0" size={18} />
                      <span>{planSaved ? "Saved!" : "Save to Library"}</span>
                    </Button>
                    <Button
                      className="h-10 w-full bg-gray-600 font-medium text-sm shadow-sm transition-colors hover:bg-gray-700 sm:flex-1 md:text-base"
                      onClick={() => setShowSessionPlan(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SessionPlanContext.Provider>
  );
}
