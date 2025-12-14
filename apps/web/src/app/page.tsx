"use client";

import { Authenticated } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BlogSection } from "@/components/landing/blog-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FinalCTASection } from "@/components/landing/final-cta-section";
import { FloatingHeader } from "@/components/landing/floating-header";
import { HeroSection } from "@/components/landing/hero-section";
import { InsightsSection } from "@/components/landing/insights-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { SportsShowcase } from "@/components/landing/sports-showcase";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import Loader from "@/components/loader";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  return (
    <>
      <Authenticated>
        <RedirectToOrgs />
      </Authenticated>
      <LandingPage />
    </>
  );
}

function RedirectToOrgs() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (activeOrganization) {
      router.push(`/orgs/${activeOrganization.id}/coach` as Route);
    } else {
      // Platform staff go to /orgs, regular users go to /orgs/join
      if (user?.isPlatformStaff) {
        router.push("/orgs" as Route);
      } else {
        router.push("/orgs/join" as Route);
      }
    }
  }, [router, activeOrganization, user]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <FloatingHeader />
      <HeroSection />
      <div id="problem">
        <ProblemSection />
      </div>
      <div id="solution">
        <SolutionSection />
      </div>
      <div id="insights">
        <InsightsSection />
      </div>
      <div id="sports">
        <SportsShowcase />
      </div>
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="testimonials">
        <TestimonialsSection />
      </div>
      <div id="blog">
        <BlogSection />
      </div>
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
