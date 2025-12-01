"use client";

import {
  BarChart3,
  Clock,
  FileText,
  Heart,
  Mic,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "Player Passports",
    description:
      "Comprehensive digital passports that follow players throughout their sporting journey, accessible to all authorized stakeholders.",
  },
  {
    icon: Users,
    title: "Coach Tools",
    description:
      "Powerful tools for coaches to track development, provide feedback, and collaborate with parents and administrators.",
  },
  {
    icon: Heart,
    title: "Parent Portal",
    description:
      "Dedicated portal for parents to stay informed, communicate with coaches, and support their child's development.",
  },
  {
    icon: BarChart3,
    title: "Well-being Tracking",
    description:
      "Integrated monitoring tools to track and support player well-being with early intervention capabilities.",
  },
  {
    icon: Mic,
    title: "Voice Notes",
    description:
      "Capture reflections, feedback, and insights through voice recordings for richer context and communication.",
  },
  {
    icon: Shield,
    title: "Analytics & Reports",
    description:
      "Comprehensive analytics and reporting tools to track progress, identify trends, and make data-driven decisions.",
  },
  {
    icon: Smartphone,
    title: "Mobile Access",
    description:
      "Full functionality on mobile devices, ensuring coaches and parents can access information anytime, anywhere.",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description:
      "Real-time synchronization ensures all stakeholders have access to the latest information instantly.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="bg-gradient-to-b from-white to-[#F7FAF7] py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
            Everything You Need to Nurture Talent
          </h2>
          <p className="mx-auto max-w-3xl text-gray-600 text-lg">
            Comprehensive tools designed for coaches, parents, and
            administrators to track, celebrate, and support every player&apos;s
            journey.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                className="border-2 border-gray-200 bg-white transition-all hover:border-[#27AE60] hover:shadow-lg"
                key={index}
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#27AE60]/10">
                    <Icon className="h-6 w-6 text-[#27AE60]" />
                  </div>
                  <CardTitle className="text-[#1E3A5F] text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
