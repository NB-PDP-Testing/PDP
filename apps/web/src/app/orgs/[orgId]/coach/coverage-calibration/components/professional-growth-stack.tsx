"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Goal,
  Heart,
  Lock,
  Pencil,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ProfessionalGrowthStack({ color }: { color: string }) {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

  const layers = [
    {
      number: 1,
      title: "Visibility",
      subtitle: "Ambient Feedback",
      icon: Eye,
      color,
      description:
        "Coverage dashboard, attention distribution ring, personal trend lines. Always available, pull not push.",
      detail: (
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="mb-2 font-medium text-gray-700 text-sm">
              What the coach sees:
            </p>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" style={{ color }} />
                Coverage dashboard card on home page
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" style={{ color }} />
                Attention balance ring (Gini-based)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" style={{ color }} />
                Per-player quality heatmap
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" style={{ color }} />
                Personal trend lines (your own history only)
              </li>
            </ul>
          </div>
          <p className="text-amber-700 text-xs">
            Never compared to other coaches. Your data, your journey.
          </p>
        </div>
      ),
    },
    {
      number: 2,
      title: "Agency",
      subtitle: "Self-Directed Goals",
      icon: Goal,
      color: "#6366f1",
      description:
        "Coach-set goals with suggested ranges. Private progress tracking. Revision without penalty.",
      detail: (
        <div className="space-y-3">
          <Card className="border-indigo-100">
            <CardContent className="p-4">
              <p className="mb-3 font-medium text-gray-800 text-sm">
                My Coaching Goals
              </p>
              <div className="space-y-3">
                {[
                  {
                    goal: "Assess each player at least once per month",
                    progress: 83,
                  },
                  {
                    goal: "Provide written feedback to all players by mid-season",
                    progress: 65,
                  },
                  {
                    goal: "Focus extra attention on Q4 players",
                    progress: 40,
                  },
                ].map((g) => (
                  <div className="space-y-1" key={g.goal}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{g.goal}</span>
                      <span className="font-medium text-gray-800">
                        {g.progress}%
                      </span>
                    </div>
                    <Progress className="h-1.5" value={g.progress} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1 text-gray-400 text-xs">
                <Lock className="h-3 w-3" />
                These goals are private to you. Only you can see your progress.
              </div>
            </CardContent>
          </Card>
          <p className="text-gray-500 text-xs">
            <span className="font-medium">Research:</span> Specific goals
            outperform &quot;do your best&quot; by 20-25%. Self-set goals
            produce equal or greater commitment than assigned goals (Locke &
            Latham, 2002).
          </p>
        </div>
      ),
    },
    {
      number: 3,
      title: "Impact",
      subtitle: "Natural Rewards",
      icon: Sparkles,
      color: "#f59e0b",
      description:
        'Player improvement attribution. "Players you assessed regularly showed X% improvement."',
      detail: (
        <div className="space-y-3">
          <Card className="border-amber-100 bg-amber-50/30">
            <CardContent className="p-4">
              <p className="mb-2 font-medium text-gray-800 text-sm">
                Player Development Insights
              </p>
              <p className="text-gray-600 text-sm">
                Players you assessed regularly this season showed:
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    23% more self-assessment engagement
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span className="text-gray-700">
                    Higher parent satisfaction ratings
                  </span>
                </div>
              </div>
              <p className="mt-3 text-gray-500 text-xs italic">
                &quot;When coaches assess broadly, players feel seen.&quot; —
                Research finding
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      number: 4,
      title: "Growth",
      subtitle: "Reflective Practice",
      icon: BookOpen,
      color: "#10b981",
      description:
        "Optional weekly reflection prompt. Contextual micro-prompts at task boundaries.",
      detail: (
        <div className="space-y-3">
          <Card className="border-green-100">
            <CardContent className="p-4">
              <p className="mb-1 font-medium text-gray-800 text-sm">
                Weekly Coaching Reflection
              </p>
              <Badge
                className="mb-3 border-green-200 bg-green-50 text-green-700"
                variant="outline"
              >
                Optional
              </Badge>
              <p className="mb-2 text-gray-600 text-sm">
                This week you worked most closely with:
              </p>
              <div className="mb-3 flex flex-wrap gap-1">
                {["Sarah M.", "James O.", "Conor D."].map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
              <p className="mb-2 text-gray-600 text-sm">
                Players you haven&apos;t connected with recently:
              </p>
              <div className="mb-3 flex flex-wrap gap-1">
                {["Ava L.", "Finn B.", "Roisin K."].map((name) => (
                  <Badge
                    className="border-amber-200 bg-amber-50 text-amber-700"
                    key={name}
                    variant="outline"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <Button
                  className="w-full justify-start gap-2"
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="h-3 w-3" />
                  Note any observations about these players
                </Button>
                <Button
                  className="w-full justify-start gap-2"
                  size="sm"
                  variant="outline"
                >
                  <Goal className="h-3 w-3" />
                  Add them to next week&apos;s focus
                </Button>
                <Button
                  className="w-full justify-start gap-2 text-gray-400"
                  size="sm"
                  variant="ghost"
                >
                  Dismiss (they&apos;re fine for now)
                </Button>
              </div>
              <p className="mt-2 text-gray-400 text-xs">
                The third option validates the coach&apos;s judgment and
                prevents nagging.
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      number: 5,
      title: "Connection",
      subtitle: "Social Without Competition",
      icon: Users,
      color: "#8b5cf6",
      description:
        'Descriptive norms ("Most coaches in your sport..."). Shared tips. Community benchmarks, not individual ranking.',
      detail: (
        <div className="space-y-3">
          <Card className="border-purple-100 bg-purple-50/30">
            <CardContent className="space-y-3 p-4">
              <div className="rounded-lg bg-white p-3">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium text-purple-700">
                    Most coaches in GAA
                  </span>{" "}
                  assess each player at least once per month.
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium text-purple-700">
                    Coaching tip
                  </span>{" "}
                  (from the community): &quot;I keep a quick mental checklist of
                  who I haven&apos;t spoken to during water breaks.&quot;
                </p>
              </div>
              <p className="text-gray-400 text-xs">
                Anonymous, opt-in. Descriptive norms, never prescriptive. No
                individual rankings or leaderboards.
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* What we removed */}
      <Card className="border-red-100 bg-red-50/30">
        <CardContent className="py-4">
          <p className="mb-2 font-medium text-red-800 text-sm">
            Removed from Plan (based on research)
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Streak tracking",
              "Achievement badges",
              "Leaderboards",
              "Points/XP system",
              "Social sharing",
            ].map((item) => (
              <Badge
                className="border-red-200 bg-red-50 text-red-600 line-through"
                key={item}
                variant="outline"
              >
                {item}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-red-700 text-xs">
            SDT research (128 studies): extrinsic rewards crowd out intrinsic
            motivation. Gamification effects decay to baseline by 8-12 weeks.
          </p>
        </CardContent>
      </Card>

      {/* Growth Stack Layers */}
      {layers.map((layer) => (
        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          key={layer.number}
          onClick={() =>
            setExpandedLayer(
              expandedLayer === layer.number ? null : layer.number
            )
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${layer.color}15` }}
              >
                <layer.icon
                  className="h-5 w-5"
                  style={{ color: layer.color }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">
                    Layer {layer.number}: {layer.title}
                  </p>
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor: `${layer.color}15`,
                      color: layer.color,
                      borderColor: `${layer.color}30`,
                    }}
                    variant="outline"
                  >
                    {layer.subtitle}
                  </Badge>
                </div>
                <p className="mt-0.5 text-gray-500 text-xs">
                  {layer.description}
                </p>
              </div>
              {expandedLayer === layer.number ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
            {expandedLayer === layer.number && (
              <div className="mt-4 border-t pt-4">{layer.detail}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
