"use client";

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

export default function MarketingPreviewPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Preview Banner */}
      <div className="fixed top-0 right-0 left-0 z-50 bg-[#F39C12] px-4 py-2 text-center font-semibold text-sm text-white shadow-lg">
        🎨 MARKETING PREVIEW - Updated Landing Page (Not Live Yet)
      </div>

      {/* Add spacing for banner */}
      <div className="h-10" />

      <FloatingHeader />
      <HeroSection />
      <div id="problem">
        <ProblemSection />
      </div>
      <div id="solution">
        <SolutionSection />
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
      <div id="insights">
        <InsightsSection />
      </div>
      <div id="blog">
        <BlogSection />
      </div>
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
