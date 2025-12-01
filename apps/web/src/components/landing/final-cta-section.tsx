"use client";

import { ArrowRight, Clock, Shield, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const trustIndicators = [
  {
    icon: Shield,
    text: "Secure & Private",
  },
  {
    icon: Clock,
    text: "24/7 Access",
  },
  {
    icon: Users,
    text: "Trusted by Clubs",
  },
] as const;

export function FinalCTASection() {
  return (
    <section className="bg-gradient-to-br from-[#1E3A5F] via-[#1E3A5F] to-[#0F1F35] py-20 text-white">
      <div className="mx-auto max-w-4xl px-4 text-center">
        {/* Header */}
        <h2 className="mb-4 font-bold text-4xl sm:text-5xl">
          Ready to Transform Your Youth Sports Program?
        </h2>
        <p className="mb-12 text-gray-200 text-xl">
          Join forward-thinking clubs and organizations using PDP to keep young
          athletes engaged, healthy, and performing at their best.
        </p>

        {/* CTAs */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            className="group bg-[#F39C12] px-8 py-6 font-semibold text-lg text-white transition-all hover:bg-[#E67E22] hover:shadow-[#F39C12]/50 hover:shadow-lg"
            size="lg"
          >
            <Link href="/demo">
              Request a Demo
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            className="group border-2 border-white bg-transparent px-8 py-6 font-semibold text-lg text-white transition-all hover:border-white/80 hover:bg-white/10"
            size="lg"
            variant="outline"
          >
            <Link href="/contact">
              Contact Us
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-6">
          {trustIndicators.map((indicator, index) => {
            const Icon = indicator.icon;
            return (
              <Card
                className="border-white/20 bg-white/5 text-white backdrop-blur-sm"
                key={index}
              >
                <CardContent className="flex items-center gap-2 p-4">
                  <Icon className="h-5 w-5 text-[#27AE60]" />
                  <span className="font-medium text-sm">{indicator.text}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
