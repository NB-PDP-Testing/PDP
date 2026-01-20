"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic,
  Settings,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TrustLevelIndicator } from "@/components/coach/trust-level-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HistoryTab } from "./components/history-tab";
import { InsightsTab } from "./components/insights-tab";
import { NewNoteTab } from "./components/new-note-tab";
import { ParentsTab } from "./components/parents-tab";
import { SettingsTab } from "./components/settings-tab";

type TabId = "new" | "parents" | "insights" | "history" | "settings";

export function VoiceNotesDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as BetterAuthId<"organization">;

  const [activeTab, setActiveTab] = useState<TabId>("new");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  // Queries for stats and conditional tab logic
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });
  const pendingSummaries = useQuery(
    api.models.coachParentSummaries.getCoachPendingSummaries,
    { organizationId: orgId }
  );
  const trustLevel = useQuery(api.models.coachTrustLevels.getCoachTrustLevel, {
    organizationId: orgId,
  });

  // Calculate counts
  const pendingInsightsCount =
    voiceNotes?.flatMap((note) =>
      note.insights.filter((i) => i.status === "pending")
    ).length ?? 0;
  const pendingSummariesCount = pendingSummaries?.length ?? 0;

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

  // Count stats
  const notesWithInsights =
    voiceNotes?.filter((n) => n.insights.length > 0).length ?? 0;
  const processingCount =
    voiceNotes?.filter(
      (n) =>
        n.transcriptionStatus === "processing" ||
        n.insightsStatus === "processing"
    ).length ?? 0;

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
    }[] = [{ id: "new", label: "New", icon: Mic }];

    // Only show Parents tab if there are pending summaries
    if (pendingSummariesCount > 0) {
      baseTabs.push({
        id: "parents",
        label: "Parents",
        icon: MessageSquare,
        badge: pendingSummariesCount,
      });
    }

    // Only show Insights tab if there are pending insights
    if (pendingInsightsCount > 0) {
      baseTabs.push({
        id: "insights",
        label: "Insights",
        icon: Lightbulb,
        badge: pendingInsightsCount,
      });
    }

    // Always show History (Settings is now in header)
    baseTabs.push({ id: "history", label: "History", icon: History });

    return baseTabs;
  }, [pendingSummariesCount, pendingInsightsCount]);

  // If current tab is no longer available (e.g., approved all summaries), switch to New
  // Settings is a special case - it's always available via header icon, not in tabs array
  useEffect(() => {
    const tabIds = tabs.map((t) => t.id);
    if (activeTab !== "settings" && !tabIds.includes(activeTab)) {
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
              <div className="text-center">
                <div className="font-bold text-green-600 text-lg sm:text-2xl">
                  {notesWithInsights}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm">Insights</div>
              </div>
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
            </div>
            {/* Settings button */}
            <Button
              className={`h-8 w-8 p-0 sm:h-9 sm:w-9 ${activeTab === "settings" ? "bg-gray-100 text-green-600" : ""}`}
              onClick={() => setActiveTab("settings")}
              size="sm"
              title="AI Settings"
              variant="ghost"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Trust Level Indicator */}
        {trustLevel && (
          <TrustLevelIndicator
            progressToNextLevel={trustLevel.progressToNextLevel}
            totalApprovals={trustLevel.totalApprovals}
            totalSuppressed={trustLevel.totalSuppressed}
            trustLevel={trustLevel.currentLevel}
          />
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
                  <Badge
                    className="ml-0.5 h-4 min-w-[16px] px-1 text-xs sm:ml-1 sm:h-5 sm:min-w-[20px] sm:px-1.5"
                    variant={isActive ? "default" : "secondary"}
                  >
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </Badge>
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
        {activeTab === "history" && (
          <HistoryTab
            onError={showErrorMessage}
            onSuccess={showSuccessMessage}
            orgId={orgId}
          />
        )}
        {activeTab === "settings" && <SettingsTab orgId={orgId} />}
      </div>
    </div>
  );
}
