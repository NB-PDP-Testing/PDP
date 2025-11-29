"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface PDPLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: 40,
  md: 80,
  lg: 120,
  xl: 160,
};

export function PDPLogo({ size = "md", className = "" }: PDPLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR to avoid hydration issues
    return (
      <div
        className={className}
        style={{ width: sizeMap[size], height: sizeMap[size] }}
      />
    );
  }

  const logoSrc =
    resolvedTheme === "dark" ? "/logos/logo-dark.png" : "/logos/logo-light.png";

  return (
    <Image
      alt="PDP Logo"
      className={`transition-transform hover:scale-105 ${className}`}
      height={sizeMap[size]}
      priority
      src={logoSrc}
      width={sizeMap[size]}
    />
  );
}
