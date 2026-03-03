"use client";

import {
  BarChart3,
  Calendar,
  Eye,
  Goal,
  Info,
  Lightbulb,
  MessageSquare,
  Mic,
  PieChart,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { AttentionRing } from "./attention-ring";
import { BirthQuarterOverlay } from "./birth-quarter-overlay";
import { CoverageHeatmap } from "./coverage-heatmap";
import { InlineQualityFeedback } from "./inline-quality-feedback";
import { PostInsightNudge } from "./post-insight-nudge";
import { ProfessionalGrowthStack } from "./professional-growth-stack";
import { SuggestedPlayerPrompt } from "./suggested-player-prompt";
import { WeeklyDigest } from "./weekly-digest";

// Sparkles icon used in section nav
const SparklesIcon = () => (
  <svg
    fill="none"
    height="14"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="14"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Sparkles</title>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

// ── Mock Data ──────────────────────────────────────────────

const MOCK_PLAYERS = [
  {
    name: "Aoife Kelly",
    insights: 12,
    quality: 88,
    lastNote: 2,
    quarter: "Q1",
    status: "active" as const,
  },
  {
    name: "Ciara Walsh",
    insights: 10,
    quality: 82,
    lastNote: 3,
    quarter: "Q1",
    status: "active" as const,
  },
  {
    name: "Maeve Ryan",
    insights: 8,
    quality: 75,
    lastNote: 5,
    quarter: "Q2",
    status: "active" as const,
  },
  {
    name: "Saoirse Byrne",
    insights: 7,
    quality: 71,
    lastNote: 6,
    quarter: "Q2",
    status: "active" as const,
  },
  {
    name: "Caoimhe Daly",
    insights: 7,
    quality: 68,
    lastNote: 7,
    quarter: "Q1",
    status: "active" as const,
  },
  {
    name: "Niamh O'Sullivan",
    insights: 6,
    quality: 73,
    lastNote: 4,
    quarter: "Q3",
    status: "active" as const,
  },
  {
    name: "Orla Fitzgerald",
    insights: 6,
    quality: 65,
    lastNote: 8,
    quarter: "Q2",
    status: "active" as const,
  },
  {
    name: "Sinead Murphy",
    insights: 5,
    quality: 62,
    lastNote: 9,
    quarter: "Q3",
    status: "active" as const,
  },
  {
    name: "Grainne Connolly",
    insights: 5,
    quality: 59,
    lastNote: 10,
    quarter: "Q1",
    status: "active" as const,
  },
  {
    name: "Deirdre Brennan",
    insights: 4,
    quality: 55,
    lastNote: 11,
    quarter: "Q4",
    status: "active" as const,
  },
  {
    name: "Roisin McGowan",
    insights: 4,
    quality: 52,
    lastNote: 12,
    quarter: "Q3",
    status: "active" as const,
  },
  {
    name: "Aisling Nolan",
    insights: 3,
    quality: 48,
    lastNote: 13,
    quarter: "Q2",
    status: "active" as const,
  },
  {
    name: "Clodagh Healy",
    insights: 3,
    quality: 45,
    lastNote: 14,
    quarter: "Q4",
    status: "active" as const,
  },
  {
    name: "Eimear Power",
    insights: 2,
    quality: 38,
    lastNote: 16,
    quarter: "Q3",
    status: "quiet" as const,
  },
  {
    name: "Ava Lawlor",
    insights: 2,
    quality: 35,
    lastNote: 14,
    quarter: "Q4",
    status: "quiet" as const,
  },
  {
    name: "Finn Brady",
    insights: 1,
    quality: 22,
    lastNote: 18,
    quarter: "Q4",
    status: "quiet" as const,
  },
  {
    name: "Roisin Kelly",
    insights: 0,
    quality: 0,
    lastNote: 28,
    quarter: "Q4",
    status: "none" as const,
  },
  {
    name: "Emma Murphy",
    insights: 0,
    quality: 0,
    lastNote: 22,
    quarter: "Q3",
    status: "none" as const,
  },
];

const COVERAGE_PERCENT = Math.round(
  (MOCK_PLAYERS.filter((p) => p.status === "active").length /
    MOCK_PLAYERS.length) *
    100
);

const MOCK_METRICS = {
  coverageRate: COVERAGE_PERCENT,
  playersAssessed: MOCK_PLAYERS.filter((p) => p.status === "active").length,
  totalPlayers: MOCK_PLAYERS.length,
  giniCoefficient: 0.34,
  attentionBalance: 66,
  avgQuality: 58,
  qualityTrend: "+8",
  coverageTrend: "+12",
};

// ── Main Dashboard ─────────────────────────────────────────

export function CoverageDashboard() {
  const { theme } = useOrgTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <TooltipProvider>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-2.5"
              style={{ backgroundColor: `${theme.primary}15` }}
            >
              <Target className="h-6 w-6" style={{ color: theme.primary }} />
            </div>
            <div>
              <h1 className="font-bold text-2xl text-gray-900 md:text-3xl">
                Coaching Coverage & Calibration
              </h1>
              <p className="text-gray-500 text-sm">
                U12 Girls GAA — Feature Mockup & Design Review
              </p>
            </div>
          </div>

          {/* Feature Mockup Notice */}
          <Card className="mt-4 border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 pt-4">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900 text-sm">
                  Design Mockup — Not Connected to Live Data
                </p>
                <p className="mt-1 text-amber-700 text-xs">
                  This page demonstrates the Coaching Coverage & Calibration
                  feature design. All data shown is simulated. Navigate each
                  section to review the UX before implementation begins.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "dashboard", label: "Coverage Card", icon: PieChart },
            { id: "heatmap", label: "Heatmap", icon: BarChart3 },
            { id: "rae", label: "Birth Quarter", icon: Calendar },
            { id: "nudge", label: "Post-Insight Nudge", icon: Lightbulb },
            { id: "suggested", label: "Suggested Player", icon: User },
            { id: "quality", label: "Inline Quality", icon: SparklesIcon },
            { id: "digest", label: "Weekly Digest", icon: MessageSquare },
            { id: "growth", label: "Growth Stack", icon: TrendingUp },
          ].map((section) => (
            <Button
              className="gap-1.5"
              key={section.id}
              onClick={() =>
                setActiveSection(
                  activeSection === section.id ? null : section.id
                )
              }
              size="sm"
              style={
                activeSection === section.id
                  ? {
                      backgroundColor: theme.primary,
                      color: theme.primaryContrast,
                    }
                  : undefined
              }
              variant={activeSection === section.id ? "default" : "outline"}
            >
              <section.icon className="h-3.5 w-3.5" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* ── Section 1: Coverage Dashboard Card ── */}
        {(!activeSection || activeSection === "dashboard") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="Ambient dashboard card shown on coach home page. Non-intrusive, informational. Never red — amber/gold for gaps."
              number={1}
              title="Coaching Coverage Dashboard Card"
            />

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Main Coverage Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Your Coaching Coverage
                      </CardTitle>
                      <CardDescription>
                        U12 Girls GAA — This Month
                      </CardDescription>
                    </div>
                    <Badge
                      className="border-amber-300 bg-amber-50 text-amber-700"
                      variant="outline"
                    >
                      {MOCK_METRICS.coverageRate}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {MOCK_METRICS.playersAssessed} of{" "}
                        {MOCK_METRICS.totalPlayers} players assessed
                      </span>
                      <span
                        className="font-medium"
                        style={{ color: theme.primary }}
                      >
                        {MOCK_METRICS.coverageTrend}% vs last month
                      </span>
                    </div>
                    <Progress
                      className="h-3"
                      value={MOCK_METRICS.coverageRate}
                    />
                  </div>

                  {/* Players needing attention */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <p className="mb-2 font-medium text-amber-800 text-sm">
                      3 players you might want to check in on:
                    </p>
                    <div className="space-y-2">
                      {MOCK_PLAYERS.filter(
                        (p) => p.status === "none" || p.status === "quiet"
                      )
                        .slice(0, 3)
                        .map((player) => (
                          <div
                            className="flex items-center justify-between text-sm"
                            key={player.name}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 font-medium text-amber-700 text-xs">
                                {player.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <span className="text-gray-700">
                                {player.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs">
                                {player.lastNote} days
                              </span>
                              <Button
                                className="h-7 gap-1 text-xs"
                                size="sm"
                                style={{ color: theme.primary }}
                                variant="ghost"
                              >
                                <Mic className="h-3 w-3" />
                                Quick note
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-gray-500">
                      Coverage trend: improving vs last month
                    </span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50/50 pt-3">
                  <div className="flex w-full gap-2">
                    <Button
                      className="flex-1 gap-1"
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Button>
                    <Button
                      className="flex-1 gap-1"
                      size="sm"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.primaryContrast,
                      }}
                    >
                      <Goal className="h-3.5 w-3.5" />
                      Set My Goals
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* Attention Ring */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Attention Balance
                      </CardTitle>
                      <CardDescription>
                        How evenly your coaching attention is distributed
                      </CardDescription>
                    </div>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Based on the Gini coefficient — a statistical measure
                          of distribution equality. Higher score = more balanced
                          attention across all players.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                <CardContent>
                  <AttentionRing
                    avgQuality={MOCK_METRICS.avgQuality}
                    color={theme.primary}
                    gini={MOCK_METRICS.giniCoefficient}
                    qualityTrend={MOCK_METRICS.qualityTrend}
                    score={MOCK_METRICS.attentionBalance}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Stat Summary Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Coverage Rate",
                  value: `${MOCK_METRICS.coverageRate}%`,
                  sub: "Players assessed this month",
                  icon: Users,
                  color: theme.primary,
                },
                {
                  label: "Attention Balance",
                  value: `${MOCK_METRICS.attentionBalance}/100`,
                  sub: "Gini: 0.34 (moderate)",
                  icon: Target,
                  color: theme.secondary,
                },
                {
                  label: "Avg Quality Score",
                  value: `${MOCK_METRICS.avgQuality}/100`,
                  sub: `${MOCK_METRICS.qualityTrend} pts vs last month`,
                  icon: BarChart3,
                  color: theme.tertiary || "#f59e0b",
                },
                {
                  label: "Days Since Gap",
                  value: "3",
                  sub: "Since last full coverage",
                  icon: Calendar,
                  color: "#6366f1",
                },
              ].map((stat) => (
                <Card className="!gap-0 !py-0" key={stat.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-2"
                        style={{ backgroundColor: `${stat.color}15` }}
                      >
                        <stat.icon
                          className="h-4 w-4"
                          style={{ color: stat.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-gray-500 text-xs">
                          {stat.label}
                        </p>
                        <p className="font-bold text-lg">{stat.value}</p>
                        <p className="truncate text-gray-400 text-xs">
                          {stat.sub}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 2: Coverage Heatmap ── */}
        {(!activeSection || activeSection === "heatmap") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="Per-player detail view with quality bars, recency, and status indicators. Quality column shows QWAS (Quality-Weighted Attention Score)."
              number={2}
              title="Coverage Heatmap"
            />
            <CoverageHeatmap color={theme.primary} players={MOCK_PLAYERS} />
          </section>
        )}

        {/* ── Section 3: Birth Quarter (RAE) Overlay ── */}
        {(!activeSection || activeSection === "rae") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="Shows attention distribution correlated with player birth quarter. Research: Q1 players receive 5x more selection than Q4. Toggle overlay on the heatmap."
              number={3}
              title="Birth Quarter (RAE) Overlay"
            />
            <BirthQuarterOverlay color={theme.primary} players={MOCK_PLAYERS} />
          </section>
        )}

        {/* ── Section 4: Post-Insight Nudge ── */}
        {(!activeSection || activeSection === "nudge") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="Shown ONLY after a coach submits a voice note — the natural task boundary with 53-73% engagement. Never during focused work."
              number={4}
              title="Post-Insight Nudge (Task Boundary)"
            />
            <PostInsightNudge
              color={theme.primary}
              metrics={MOCK_METRICS}
              players={MOCK_PLAYERS}
            />
          </section>
        )}

        {/* ── Section 5: Suggested Player Prompt ── */}
        {(!activeSection || activeSection === "suggested") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description={
                'Subtle suggestion when coach opens "New Insight." Follows BJ Fogg\'s Tiny Habits: Prompt at moment of action, extremely easy, minimal motivation required. KNVB rated cueing at 5.8/9 viability.'
              }
              number={5}
              title="Suggested Player Prompt"
            />
            <SuggestedPlayerPrompt color={theme.primary} />
          </section>
        )}

        {/* ── Section 6: Inline Quality Feedback (V3.5) ── */}
        {(!activeSection || activeSection === "quality") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="V3.5 reintegration from V2. Real-time quality coaching while coaches write insights. Shows dimension-specific suggestions when quality < 70. Highest-ROI feature — $3.20/mo for 100 coaches."
              number={6}
              title="Inline Quality Feedback (V3.5)"
            />
            <InlineQualityFeedback color={theme.primary} />
          </section>
        )}

        {/* ── Section 7: Weekly Digest ── */}
        {(!activeSection || activeSection === "digest") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="Max 1 push notification per week. At coach-configured day/time. Passive level (Apple HIG) — notification center only, never time-sensitive. V3.5: Now with WhatsApp delivery option."
              number={7}
              title="Weekly Digest Notification"
            />
            <WeeklyDigest color={theme.primary} />
          </section>
        )}

        {/* ── Section 8: Professional Growth Stack ── */}
        {(!activeSection || activeSection === "growth") && (
          <section className="space-y-4">
            <SectionHeader
              color={theme.primary}
              description="Replaces gamification. Self-directed goals, ambient feedback, natural rewards, reflective practice. SDT research: extrinsic rewards crowd out intrinsic coaching motivation."
              number={8}
              title="Professional Growth Stack"
            />
            <ProfessionalGrowthStack color={theme.primary} />
          </section>
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Section Header Component ───────────────────────────────

function SectionHeader({
  number,
  title,
  description,
  color,
}: {
  number: number;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-sm"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {number}
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 text-xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-gray-500 text-sm">{description}</p>
      </div>
    </div>
  );
}
