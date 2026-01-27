"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DegradationBanner } from "@/components/coach/degradation-banner";
import { TrustLevelIcon } from "@/components/coach/trust-level-icon";
import { TrustNudgeBanner } from "@/components/coach/trust-nudge-banner";
import { CoachAIHelpDialog } from "@/components/profile/coach-ai-help-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { AutoApprovedTab } from "./components/auto-approved-tab";
import { HistoryTab } from "./components/history-tab";
import { InsightsTab } from "./components/insights-tab";
import { NewNoteTab } from "./components/new-note-tab";
import { ParentsTab } from "./components/parents-tab";
import { TeamInsightsTab } from "./components/team-insights-tab";

const { useSession } = authClient;

type TabId = "new" | "parents" | "insights" | "team" | "auto-sent" | "history";

export function VoiceNotesDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as BetterAuthId<"organization">;
  const { data: session } = useSession();

  // Get coach ID from session (use id as fallback if userId is null)
  const coachId = session?.user?.userId || session?.user?.id;

  const [activeTab, setActiveTab] = useState<TabId>("new");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState<Record<number, boolean>>(
    {}
  );
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Queries for stats and conditional tab logic - scoped to this coach's notes only
  const voiceNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesByCoach,
    coachId ? { orgId, coachId } : "skip"
  );
  const teamInsights = useQuery(
    api.models.voiceNotes.getVoiceNotesForCoachTeams,
    coachId ? { orgId, coachId } : "skip"
  );
  const pendingSummaries = useQuery(
    api.models.coachParentSummaries.getCoachPendingSummaries,
    { organizationId: orgId }
  );
  const trustLevel = useQuery(api.models.coachTrustLevels.getCoachTrustLevel, {
    organizationId: orgId,
  });
  const aiServiceHealth = useQuery(
    api.models.aiServiceHealth.getAIServiceHealth
  );

  // Calculate counts
  const pendingInsightsCount =
    voiceNotes?.flatMap((note) =>
      note.insights.filter((i) => i.status === "pending")
    ).length ?? 0;
  const pendingTeamInsightsCount =
    teamInsights?.flatMap((note: any) =>
      note.insights.filter(
        (i: any) => i.status === "pending" && i.playerIdentityId
      )
    ).length ?? 0;
  const pendingSummariesCount = pendingSummaries?.length ?? 0;

  // Count sensitive summaries (injury or behavior) that need manual review
  const sensitiveSummariesCount =
    pendingSummaries?.filter(
      (s) =>
        s.sensitivityCategory === "injury" ||
        s.sensitivityCategory === "behavior"
    ).length ?? 0;
  const hasSensitiveSummaries = sensitiveSummariesCount > 0;

  // Auto-switch to first tab with pending items (only once on load)
  useEffect(() => {
    if (!hasAutoSwitched) {
      if (pendingSummariesCount > 0) {
        setActiveTab("parents");
        setHasAutoSwitched(true);
      } else if (pendingInsightsCount > 0) {
        setActiveTab("insights");
        setHasAutoSwitched(true);
      }
    }
  }, [pendingSummariesCount, pendingInsightsCount, hasAutoSwitched]);

  // Load nudge dismissed state from localStorage
  useEffect(() => {
    if (trustLevel) {
      const dismissed: Record<number, boolean> = {};
      for (let level = 0; level < 3; level++) {
        const key = `trust-nudge-dismissed-${level}`;
        dismissed[level] = localStorage.getItem(key) === "true";
      }
      setNudgeDismissed(dismissed);
    }
  }, [trustLevel?.currentLevel, trustLevel]);

  // Show help guide on first visit to voice notes page
  useEffect(() => {
    const hasSeenHelpGuide = localStorage.getItem(
      "voice-notes-help-guide-seen"
    );
    if (!hasSeenHelpGuide && coachId) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowHelpDialog(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [coachId]);

  const handleCloseHelpDialog = (open: boolean) => {
    setShowHelpDialog(open);
    if (!open) {
      // Mark as seen when closing
      localStorage.setItem("voice-notes-help-guide-seen", "true");
    }
  };

  const handleNudgeDismiss = () => {
    if (trustLevel) {
      const key = `trust-nudge-dismissed-${trustLevel.currentLevel}`;
      localStorage.setItem(key, "true");
      setNudgeDismissed((prev) => ({
        ...prev,
        [trustLevel.currentLevel]: true,
      }));
    }
  };

  // Count stats
  const processingCount =
    voiceNotes?.filter(
      (n) =>
        n.transcriptionStatus === "processing" ||
        n.insightsStatus === "processing"
    ).length ?? 0;

  // Count pending insights that need attention (unmatched players or uncategorized)
  const TEAM_LEVEL_CATEGORIES = ["team_culture", "todo"];
  const allPendingInsights =
    voiceNotes?.flatMap((note) =>
      note.insights
        .filter((i) => i.status === "pending")
        .map((i) => ({ ...i, noteId: note._id }))
    ) ?? [];

  const needsAttentionCount = allPendingInsights.filter(
    (i) =>
      // Unmatched: has playerName but no playerIdentityId
      (!i.playerIdentityId && i.playerName) ||
      // Uncategorized: no player and not a team-level category
      !(
        i.playerIdentityId ||
        i.playerName ||
        (i.category && TEAM_LEVEL_CATEGORIES.includes(i.category))
      )
  ).length;

  const readyToApplyCount = pendingInsightsCount - needsAttentionCount;

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Build tabs array - only include Parents/Insights when there's content
  const tabs = useMemo(() => {
    const baseTabs: {
      id: TabId;
      label: string;
      icon: typeof Mic;
      badge?: number;
      hasAlert?: boolean;
    }[] = [{ id: "new", label: "New", icon: Mic }];

    // Only show Parents tab if there are pending summaries
    if (pendingSummariesCount > 0) {
      baseTabs.push({
        id: "parents",
        label: "Parents",
        icon: MessageSquare,
        badge: pendingSummariesCount,
        hasAlert: hasSensitiveSummaries,
      });
    }

    // Only show Insights tab if there are pending insights
    if (pendingInsightsCount > 0) {
      baseTabs.push({
        id: "insights",
        label: "Insights",
        icon: Lightbulb,
        badge: pendingInsightsCount,
        hasAlert: needsAttentionCount > 0,
      });
    }

    // Only show Team tab if there are pending team insights
    if (pendingTeamInsightsCount > 0) {
      baseTabs.push({
        id: "team",
        label: "Team",
        icon: Users,
        badge: pendingTeamInsightsCount,
      });
    }

    // Phase 8: Show Auto-Sent tab to ALL coaches (removed trust level gate)
    // Previously required level 2+, but Level 0-1 coaches need to see sent summaries
    baseTabs.push({
      id: "auto-sent",
      label: "Sent to Parents",
      icon: Send,
    });

    // Always show History (Settings is now in header)
    baseTabs.push({ id: "history", label: "History", icon: History });

    return baseTabs;
  }, [
    pendingSummariesCount,
    pendingInsightsCount,
    pendingTeamInsightsCount,
    hasSensitiveSummaries,
    needsAttentionCount,
    trustLevel,
  ]);

  // If current tab is no longer available (e.g., approved all summaries), switch to New
  useEffect(() => {
    const tabIds = tabs.map((t) => t.id);
    if (!tabIds.includes(activeTab)) {
      setActiveTab("new");
    }
  }, [tabs, activeTab]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
              onClick={() => router.push(`/orgs/${orgId}/coach`)}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Mic className="h-6 w-6 text-green-600 sm:h-8 sm:w-8" />
            <div>
              <h1 className="font-bold text-foreground text-xl sm:text-3xl">
                Voice Notes
              </h1>
              <p className="hidden text-gray-600 text-sm sm:block">
                Record and analyze training observations
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-center">
                <div className="font-bold text-blue-600 text-lg sm:text-2xl">
                  {voiceNotes?.length ?? 0}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm">Notes</div>
              </div>
              {readyToApplyCount > 0 && (
                <div className="text-center">
                  <div className="font-bold text-green-600 text-lg sm:text-2xl">
                    {readyToApplyCount}
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm">Ready</div>
                </div>
              )}
              {needsAttentionCount > 0 && (
                <div className="text-center">
                  <div className="font-bold text-amber-600 text-lg sm:text-2xl">
                    {needsAttentionCount}
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm">
                    Attention
                  </div>
                </div>
              )}
              {processingCount > 0 && (
                <div className="text-center">
                  <div className="flex items-center gap-1 font-bold text-lg text-orange-600 sm:text-2xl">
                    <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    {processingCount}
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm">
                    Processing
                  </div>
                </div>
              )}
              {sensitiveSummariesCount > 0 && (
                <div className="text-center">
                  <div className="flex items-center gap-1 font-bold text-lg text-red-600 sm:text-2xl">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                    {sensitiveSummariesCount}
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm">
                    Sensitive
                  </div>
                </div>
              )}
            </div>
            {/* Trust Level Icon */}
            {trustLevel && (
              <TrustLevelIcon
                level={trustLevel.currentLevel}
                totalApprovals={trustLevel.totalApprovals}
              />
            )}
          </div>
        </div>

        {/* Trust Nudge Banner - shows when close to next level */}
        {trustLevel && !nudgeDismissed[trustLevel.currentLevel] && (
          <TrustNudgeBanner
            currentLevel={trustLevel.currentLevel}
            onDismiss={handleNudgeDismiss}
            threshold={trustLevel.progressToNextLevel.threshold}
            totalApprovals={trustLevel.totalApprovals}
          />
        )}

        {/* AI Degradation Banner - shows when AI service is degraded */}
        {aiServiceHealth && aiServiceHealth.status !== "healthy" && (
          <DegradationBanner degradationType="ai_fallback" />
        )}
      </div>

      {/* Tabs - scrollable on mobile, standard on desktop */}
      <div className="mb-4 border-b">
        <nav className="-mb-px scrollbar-hide flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 font-medium text-xs transition-colors sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                  isActive
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && (
                  <span className="flex items-center gap-0.5">
                    {tab.hasAlert && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <Badge
                      className={`ml-0.5 h-4 min-w-[16px] px-1 text-xs sm:ml-1 sm:h-5 sm:min-w-[20px] sm:px-1.5 ${
                        tab.hasAlert && !isActive
                          ? "border-amber-400 bg-amber-100 text-amber-700"
                          : ""
                      }`}
                      variant={isActive ? "default" : "secondary"}
                    >
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </Badge>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 flex items-center justify-between rounded-lg border-2 border-green-500 bg-green-100 px-4 py-3 text-green-800 sm:px-6 sm:py-4">
          <span className="font-semibold text-sm sm:text-base">
            {successMessage}
          </span>
          <button
            className="ml-2 font-bold text-green-600 text-lg hover:text-green-800 sm:text-xl"
            onClick={() => setSuccessMessage(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-start justify-between rounded-lg border-2 border-red-500 bg-red-100 px-4 py-3 text-red-800 sm:px-6 sm:py-4">
          <div className="flex-1 font-semibold text-sm sm:text-base">
            {errorMessage}
          </div>
          <button
            className="ml-2 flex-shrink-0 font-bold text-lg text-red-600 hover:text-red-800 sm:text-xl"
            onClick={() => setErrorMessage(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "new" && (
          <NewNoteTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
        {activeTab === "parents" && (
          <ParentsTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
        {activeTab === "insights" && (
          <InsightsTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
        {activeTab === "team" && (
          <TeamInsightsTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
        {activeTab === "auto-sent" && (
          <AutoApprovedTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
        {activeTab === "history" && (
          <HistoryTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
      </div>

      {/* Help Guide Dialog - Auto-shows on first visit */}
      <CoachAIHelpDialog
        onOpenChange={handleCloseHelpDialog}
        open={showHelpDialog}
      />
    </div>
  );
}
