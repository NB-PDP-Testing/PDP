"use client";

import { AlertCircle, Heart, Target, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const crisisStats = [
  {
    icon: TrendingDown,
    value: "70%",
    title: "Drop Out by Age 13",
    description: "Of youth athletes quit organized sports by age 13",
    source: "American Academy of Pediatrics, 2024",
    color: "border-red-200",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    icon: AlertCircle,
    value: "35%",
    title: "Burnout Factor",
    description: "Cite burnout as primary reason for quitting",
    source: "Youth Sport Dropout Research, 2024",
    color: "border-orange-200",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    icon: Target,
    value: "50%",
    title: "Pressure Point",
    description: "Feel excessive pressure from parents or coaches",
    source: "Youth Sports Research, 2024",
    color: "border-yellow-200",
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    icon: Heart,
    value: "85%",
    title: "Love the Game",
    description: "Still love their sport but can't sustain participation",
    source: "Youth Sports Research, 2024",
    color: "border-green-200",
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
  },
] as const;

export function ProblemSection() {
  return (
    <section className="bg-gradient-to-b from-white to-[#F7FAF7] py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Main Heading */}
        <div className="mb-12 text-center">
          <h2 className="mb-6 font-bold text-4xl text-[#1E3A5F] sm:text-5xl md:text-6xl">
            We&apos;re Losing Our Young Athletes
          </h2>
          <p className="mx-auto max-w-4xl text-gray-600 text-lg leading-relaxed">
            The current youth sports system is failing our children. Despite
            growing investment and infrastructure, we&apos;re seeing
            unprecedented dropout rates and rising burnout among young athletes.
            Research reveals a concerning trend in youth sports participation.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {crisisStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                className={`border-2 ${stat.color} bg-white transition-shadow hover:shadow-lg`}
                key={index}
              >
                <CardContent className="flex flex-col gap-4 p-6">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${stat.iconBg}`}
                  >
                    <Icon className={`h-8 w-8 ${stat.iconColor}`} />
                  </div>
                  <div className="font-bold text-5xl text-[#1E3A5F]">
                    {stat.value}
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold text-[#1E3A5F] text-lg">
                      {stat.title}
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {stat.description}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs italic">{stat.source}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary Box */}
        <Card className="mx-auto mb-12 max-w-4xl border-2 border-gray-200 bg-white">
          <CardContent className="p-8 text-center">
            <p className="mx-auto max-w-3xl text-gray-700 text-lg leading-relaxed">
              The dropout crisis is costing children the{" "}
              <span className="font-semibold text-[#27AE60]">
                mental health benefits
              </span>
              ,{" "}
              <span className="font-semibold text-[#27AE60]">
                social connections
              </span>
              , and{" "}
              <span className="font-semibold text-[#27AE60]">
                lifelong love of movement
              </span>{" "}
              that sports provide. It&apos;s time for a new approach.
            </p>
          </CardContent>
        </Card>

        {/* Hidden Costs Section */}
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h3 className="mb-4 font-bold text-3xl text-[#1E3A5F] sm:text-4xl">
              The Hidden Costs of Current Approaches
            </h3>
            <p className="mx-auto max-w-3xl text-gray-600 text-lg">
              Beyond the visible dropout rates, fragmented systems create
              significant hidden costs that impact players, families, and clubs.
            </p>
          </div>

          {/* Key Points in Cards */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            <Card className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <h4 className="mb-3 font-semibold text-[#1E3A5F] text-lg">
                  Lost Development Data
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Years of development history, injury records, and progress
                  tracking are lost when players move clubs or transition
                  between sports.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <h4 className="mb-3 font-semibold text-[#1E3A5F] text-lg">
                  Wasted Resources
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Clubs invest time and money in player development, only to
                  lose that investment when players leave. Duplicate assessments
                  waste valuable coaching time.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <h4 className="mb-3 font-semibold text-[#1E3A5F] text-lg">
                  Missed Opportunities
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Without comprehensive tracking, warning signs of burnout,
                  injury risk, or disengagement go unnoticed until it&apos;s too
                  late.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Costs Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <h4 className="mb-3 font-semibold text-[#1E3A5F] text-lg">
                  Fragmented Communication
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Parents, coaches, and administrators struggle to stay aligned.
                  Important information gets lost in emails, texts, and verbal
                  conversations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <h4 className="mb-3 font-semibold text-[#1E3A5F] text-lg">
                  Reduced Long-term Engagement
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Players who feel unsupported or disconnected are more likely
                  to quit. The lack of continuity makes it harder to maintain
                  engagement.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <h4 className="mb-3 font-semibold text-[#1E3A5F] text-lg">
                  Lost Potential
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Without proper tracking and support, talented players may
                  never reach their potential. Development gaps go unnoticed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
