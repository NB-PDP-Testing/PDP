"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Activity,
  ChevronDown,
  Loader2,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useChildAccess } from "@/hooks/use-child-access";
import { authClient } from "@/lib/auth-client";
import { WellnessTrendCharts } from "../health-check/wellness-trend-charts";

// ============================================================
// Channel Source Badge
// ============================================================

type HealthCheckSource =
  | "app"
  | "whatsapp_flows"
  | "whatsapp_conversational"
  | "sms"
  | null
  | undefined;

function SourceBadge({ source }: { source: HealthCheckSource }) {
  if (!source || source === "app") {
    return null;
  }
  if (source === "whatsapp_flows") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs"
        title="Via WhatsApp"
      >
        <MessageSquare className="h-3 w-3" />
        Via WhatsApp
      </span>
    );
  }
  if (source === "whatsapp_conversational") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs"
        title="Via WhatsApp chat"
      >
        <MessageSquare className="h-3 w-3" />
        Via WhatsApp chat
      </span>
    );
  }
  // sms
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 text-xs"
      title="Via SMS"
    >
      <Smartphone className="h-3 w-3" />
      Via SMS
    </span>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function WellnessHistoryPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const userEmail = session?.user?.email;

  const { isChildAccount, toggles } = useChildAccess(orgId);

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  const wellnessSettings = useQuery(
    api.models.playerHealthChecks.getWellnessSettings,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  const wellnessHistory = useQuery(
    api.models.playerHealthChecks.getWellnessHistory,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, days: 30 }
      : "skip"
  );

  const latestInsight = useQuery(
    api.models.playerHealthChecks.getLatestWellnessInsight,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  const checkInCount = useQuery(
    api.models.playerHealthChecks.getWellnessCheckInCount,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );

  const [insightOpen, setInsightOpen] = useState(true);

  const enabledDimensions = wellnessSettings?.enabledDimensions ?? [
    "sleepQuality",
    "energyLevel",
    "mood",
    "physicalFeeling",
    "motivation",
  ];

  const isLoading =
    sessionLoading ||
    playerIdentity === undefined ||
    wellnessSettings === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-3xl items-center justify-center p-4 py-12 md:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!playerIdentity) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Player Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your account is not linked to a player profile. Contact your club
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isChildAccount && !toggles?.includeWellnessAccess) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Wellness Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your parent or guardian hasn&apos;t enabled wellness access for
              your account yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Activity className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Wellness History</h1>
            <p className="text-sm opacity-90">
              Your trends and check-in history from the last 30 days.
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Activity className="text-blue-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {checkInCount ?? 0}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Check-ins (30d)
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{
                  width: `${Math.min(((checkInCount ?? 0) / 30) * 100, 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <MessageSquare className="text-green-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {latestInsight ? "Yes" : "—"}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              AI Insight
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-600"
                style={{ width: latestInsight ? "100%" : "0%" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Smartphone className="text-purple-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {wellnessHistory?.length ?? 0}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              History Entries
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div
                className="h-1 rounded-full bg-purple-600"
                style={{
                  width: `${Math.min(((wellnessHistory?.length ?? 0) / 30) * 100, 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <ChevronDown className="text-orange-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {checkInCount !== undefined && checkInCount >= 7 ? "On" : "Off"}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Insights Active
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-orange-100">
              <div
                className="h-1 rounded-full bg-orange-600"
                style={{
                  width:
                    checkInCount !== undefined && checkInCount >= 7
                      ? "100%"
                      : `${Math.min(((checkInCount ?? 0) / 7) * 100, 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Wellness Insight (US-P4-010) */}
      {(checkInCount !== undefined || latestInsight) && (
        <Collapsible onOpenChange={setInsightOpen} open={insightOpen}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-900 text-sm transition-colors hover:bg-blue-100"
              type="button"
            >
              <span className="font-medium">💡 Latest Insight</span>
              <ChevronDown
                className="h-4 w-4 shrink-0 transition-transform"
                style={{ transform: insightOpen ? "rotate(180deg)" : "none" }}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-b-lg border border-blue-200 border-t-0 bg-blue-50 px-4 pb-3">
              {checkInCount !== undefined && checkInCount < 7 ? (
                <p className="pt-2 text-blue-900 text-sm">
                  Check in for {7 - checkInCount} more day
                  {7 - checkInCount !== 1 ? "s" : ""} to unlock personalised
                  insights.
                </p>
              ) : latestInsight ? (
                <div className="pt-2">
                  <p className="text-emerald-900 text-sm">
                    {latestInsight.insight}
                  </p>
                  <p className="mt-1 text-emerald-700 text-xs">
                    Generated by AI · Based on your last{" "}
                    {latestInsight.basedOnDays} check-ins
                  </p>
                </div>
              ) : (
                <p className="pt-2 text-blue-900 text-sm">
                  No insight available yet.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Trend Charts */}
      <WellnessTrendCharts
        enabledDimensions={enabledDimensions}
        playerIdentityId={playerIdentity._id}
      />

      {/* Recent Check-Ins with channel source badges */}
      {wellnessHistory && wellnessHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-base">Recent Check-Ins</h2>
          <div className="space-y-1">
            {wellnessHistory.map((record) => {
              const scores: number[] = [];
              for (const dim of record.enabledDimensions) {
                const val = record[dim as keyof typeof record];
                if (typeof val === "number") {
                  scores.push(val);
                }
              }
              const avg =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : null;
              return (
                <div
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  key={record._id}
                >
                  <span className="text-muted-foreground">
                    {new Date(record.checkDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {avg !== null && (
                      <span className="font-medium">
                        {(Math.round(avg * 10) / 10).toFixed(1)}/5
                      </span>
                    )}
                    <SourceBadge source={record.source} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {wellnessHistory?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No check-ins in the last 30 days. Start by submitting your daily
              wellness check-in.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
