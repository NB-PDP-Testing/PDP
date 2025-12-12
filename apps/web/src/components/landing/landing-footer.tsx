"use client";

import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Feature", href: "#features" },
    { label: "Sport Coverage", href: "#sports" },
    { label: "Pricing", href: "/pricing" },
    { label: "Demo", href: "/demo" },
  ],
  resources: [
    { label: "Research", href: "#blog" },
    { label: "Blog", href: "/blog" },
    { label: "Case Studies", href: "/case-studies" },
    { label: "Support", href: "/support" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Partners", href: "/partners" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR", href: "/gdpr" },
  ],
} as const;

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-gray-200 border-t bg-white py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="relative h-10 w-10">
                <Image
                  alt="PlayerARC Logo"
                  className="object-contain"
                  fill
                  sizes="120px"
                  src="/logos-landing/PDP-Logo-NavyOrbit_GreenHuman.png"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#1E3A5F]">PlayerARC</span>
                
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Keeping young athletes engaged, healthy, and in love with their sport.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    aria-label={social.label}
                    className="text-gray-400 transition-colors hover:text-[#27AE60]"
                    href={social.href}
                    key={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="mb-4 font-semibold text-[#1E3A5F]">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-gray-600 text-sm transition-colors hover:text-[#27AE60]"
                    href={link.href as Route}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="mb-4 font-semibold text-[#1E3A5F]">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-gray-600 text-sm transition-colors hover:text-[#27AE60]"
                    href={link.href as Route}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="mb-4 font-semibold text-[#1E3A5F]">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-gray-600 text-sm transition-colors hover:text-[#27AE60]"
                    href={link.href as Route}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="mb-4 font-semibold text-[#1E3A5F]">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    className="text-gray-600 text-sm transition-colors hover:text-[#27AE60]"
                    href={link.href as Route}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-gray-200 border-t pt-8 text-center text-gray-600 text-sm">
          <p>
            © {new Date().getFullYear()} PlayerARC. As many as
            possible, for as long as possible.
          </p>
        </div>
      </div>
    </footer>
  );
}
