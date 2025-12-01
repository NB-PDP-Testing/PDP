"use client";

import {
  Brain,
  Calendar,
  LineChart,
  Shield,
  Target,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Unified Collaboration",
    description:
      "Bring coaches, parents, and players together in one seamless platform for aligned communication and shared goals.",
  },
  {
    icon: Target,
    title: "Development Tracking",
    description:
      "Track progress, skills, and achievements over time with personalized 'passports' that follow each athlete's journey.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Get personalized drill recommendations, training tips, and development insights tailored to each player's needs.",
  },
  {
    icon: Calendar,
    title: "Multi-Sport Management",
    description:
      "Manage schedules across multiple sports in one place, preventing over-commitment and maintaining balance.",
  },
  {
    icon: LineChart,
    title: "Progress Visualization",
    description:
      "Visual dashboards show development trends, helping identify strengths and areas for growth over time.",
  },
  {
    icon: Shield,
    title: "Wellbeing First",
    description:
      "Built-in safeguards monitor training load, rest periods, and mental health to prevent burnout before it happens.",
  },
] as const;

export function SolutionSection() {
  return (
    <section className="bg-gradient-to-b from-white to-[#F7FAF7] py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header with Passport Image */}
        <div className="mb-16">
          <div className="mb-8 flex flex-col items-center gap-8 md:flex-row md:justify-center">
            <div className="relative h-48 w-64 flex-shrink-0 sm:h-64 sm:w-80">
              <Image
                alt="Player Development Passport"
                className="object-contain drop-shadow-2xl"
                fill
                src="/passports/PDP-Passport-BrownGold_CameraANDBox.png"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
                Our Solution: A Digital Passport for Every Player
              </h2>
              <p className="mx-auto max-w-3xl text-gray-600 text-lg md:mx-0">
                Track, nurture, and celebrate every child&apos;s sporting
                journey. Keep players engaged, healthy, and performing at their
                best with comprehensive development tracking that follows them
                throughout their entire sporting career.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg"
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

        {/* CTA */}
        <div className="text-center">
          <Button
            asChild
            className="bg-[#1E3A5F] px-8 py-6 font-semibold text-lg text-white hover:bg-[#1E3A5F]/90"
            size="lg"
          >
            <Link href="/demo">Learn More About PDP</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
