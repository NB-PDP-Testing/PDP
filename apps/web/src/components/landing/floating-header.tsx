"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const navSections = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "Sport", href: "#sports" },
  { label: "Feature", href: "#features" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Research", href: "#blog" },
] as const;

export function FloatingHeader() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isDemoPage = pathname === "/demo";
  const isBlogPage = pathname?.startsWith("/blog");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // On demo and blog pages, always show scrolled state (light background)
    if (isDemoPage || isBlogPage) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDemoPage, isBlogPage]);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-gray-200 border-b bg-white/95 shadow-lg backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link className="flex items-center gap-3" href="/">
            <div
              className={`relative transition-all ${isScrolled ? "h-10 w-10" : "h-12 w-12 drop-shadow-lg"}`}
            >
              <Image
                alt="PDP Logo"
                className="object-contain"
                fill
                priority
                sizes="(max-width: 768px) 120px, 150px"
                src={
                  isScrolled
                    ? "/logos-landing/PDP-Logo-NavyOrbit_GreenHuman.png"
                    : "/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
                }
              />
            </div>
            <span
              className={`font-bold transition-colors ${
                isScrolled
                  ? "text-[#1E3A5F] text-base"
                  : "text-lg text-white drop-shadow-md"
              }`}
            >
              <span className="hidden sm:inline">
                {isScrolled ? "PDP" : "Player Development Portal"}
              </span>
              <span className="sm:hidden">PDP</span>
            </span>
          </Link>

          {/* Desktop Navigation - Only show on landing page */}
          {isLandingPage && (
            <nav className="hidden items-center gap-6 md:flex">
              {navSections.map((section) => (
                <button
                  className={`font-medium text-sm transition-colors hover:text-[#27AE60] ${
                    isScrolled ? "text-[#1E3A5F]" : "text-white"
                  }`}
                  key={section.href}
                  onClick={() => handleNavClick(section.href)}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </nav>
          )}

          {/* CTAs and Controls */}
          <div className="flex items-center gap-3">
            <Link
              className={`hidden font-medium text-sm transition-colors hover:text-[#27AE60] sm:block ${
                isScrolled ? "text-[#1E3A5F]" : "text-white"
              }`}
              href="/login"
            >
              Login
            </Link>
            <Button
              asChild
              className="bg-[#F39C12] text-white hover:bg-[#E67E22]"
              size="sm"
            >
              <Link href="/demo">Request Demo</Link>
            </Button>
            <button
              className={`md:hidden ${isScrolled ? "text-[#1E3A5F]" : "text-white"}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-gray-200 border-t bg-white py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {isLandingPage &&
                navSections.map((section) => (
                  <button
                    className="px-4 py-2 text-left font-medium text-[#1E3A5F] text-sm transition-colors hover:bg-gray-50 hover:text-[#27AE60]"
                    key={section.href}
                    onClick={() => handleNavClick(section.href)}
                    type="button"
                  >
                    {section.label}
                  </button>
                ))}
              <Link
                className="px-4 py-2 text-left font-medium text-[#1E3A5F] text-sm transition-colors hover:bg-gray-50 hover:text-[#27AE60]"
                href="/login"
              >
                Login
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
