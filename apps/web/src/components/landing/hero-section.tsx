"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-[#1E3A5F] to-[#0F1F35] px-4 pt-32 pb-20 text-white sm:pt-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="relative h-40 w-40 drop-shadow-2xl sm:h-48 sm:w-48">
            <Image
              alt="PDP Logo"
              className="object-contain"
              fill
              sizes="(max-width: 640px) 160px, 192px"
              src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="font-bold text-4xl tracking-tight sm:text-5xl md:text-6xl">
              Transforming Youth <br /> Sports Development
            </h1>
            <p className="mx-auto max-w-3xl text-base text-gray-200 sm:text-lg md:text-xl">
              A flexible, player-centred multi-sport platform that adapts to
              every player's journey - because everyone deserves a development
              pathway built around them, not just their sport(s).
              <br />
              <br />
              PDP is the digital passport that travels with players throughout
              their sporting journey, connecting coaches, parents, and clubs to
              support their development, prevent burnout, and help players stay
              motivated and in love with their sport(s).
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="mb-24 flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            className="group bg-[#F39C12] px-8 py-6 font-semibold text-lg text-white transition-all hover:bg-[#E67E22] hover:shadow-[#F39C12]/50 hover:shadow-lg"
            size="lg"
          >
            <Link href="/demo">
              Request Demo
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            className="group border-2 border-white bg-transparent px-8 py-6 font-semibold text-lg text-white transition-all hover:border-white/80 hover:bg-white/10"
            size="lg"
            variant="outline"
          >
            <Link href="/login">Learn More</Link>
          </Button>
        </div>
      </div>

      {/* Scroll Indicator - Positioned with proper spacing */}
      <button
        className="-translate-x-1/2 absolute bottom-4 left-1/2 z-20 flex flex-col items-center gap-2 text-white/70 transition-all hover:text-white sm:bottom-6"
        onClick={() => {
          document
            .getElementById("problem")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        type="button"
      >
        <span className="font-medium text-xs uppercase tracking-wider">
          Scroll
        </span>
        <div className="animate-bounce">
          <ArrowDown className="h-6 w-6" />
        </div>
      </button>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#27AE60]/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#F39C12]/10 blur-3xl" />
    </section>
  );
}
