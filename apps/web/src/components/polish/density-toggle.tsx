"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Columns3, LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Density levels
 */
export type DensityLevel = "compact" | "comfortable" | "spacious";

/**
 * Density configuration for each level
 */
export const DENSITY_CONFIG: Record<
  DensityLevel,
  {
    label: string;
    icon: React.ReactNode;
    description: string;
    spacing: string;
    padding: string;
    fontSize: string;
    rowHeight: string;
    cardPadding: string;
  }
> = {
  compact: {
    label: "Compact",
    icon: <LayoutList className="h-4 w-4" />,
    description: "More items visible, less spacing",
    spacing: "space-y-1",
    padding: "p-2",
    fontSize: "text-sm",
    rowHeight: "h-8",
    cardPadding: "p-3",
  },
  comfortable: {
    label: "Comfortable",
    icon: <Columns3 className="h-4 w-4" />,
    description: "Balanced spacing and readability",
    spacing: "space-y-2",
    padding: "p-3",
    fontSize: "text-sm",
    rowHeight: "h-10",
    cardPadding: "p-4",
  },
  spacious: {
    label: "Spacious",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "More breathing room, easier to read",
    spacing: "space-y-4",
    padding: "p-4",
    fontSize: "text-base",
    rowHeight: "h-12",
    cardPadding: "p-6",
  },
};

/**
 * Storage key for density preference
 */
const DENSITY_STORAGE_KEY = "pdp-ui-density";

/**
 * Density context
 */
interface DensityContextValue {
  density: DensityLevel;
  setDensity: (density: DensityLevel) => void;
  cycleDensity: () => void;
  config: typeof DENSITY_CONFIG[DensityLevel];
}

const DensityContext = createContext<DensityContextValue | null>(null);

/**
 * Hook to access density context
 */
export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error("useDensity must be used within DensityProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if not in provider
 */
export function useDensityOptional(): DensityContextValue | null {
  return useContext(DensityContext);
}

/**
 * Props for DensityProvider
 */
export interface DensityProviderProps {
  /** Initial density (defaults to comfortable or stored preference) */
  defaultDensity?: DensityLevel;
  /** Whether to persist preference in localStorage */
  persist?: boolean;
  /** Children */
  children: React.ReactNode;
}

/**
 * DensityProvider - Provides density context to the app
 */
export function DensityProvider({
  defaultDensity = "comfortable",
  persist = true,
  children,
}: DensityProviderProps) {
  const [density, setDensityState] = useState<DensityLevel>(defaultDensity);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (persist && typeof window !== "undefined") {
      const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
      if (stored && (stored === "compact" || stored === "comfortable" || stored === "spacious")) {
        setDensityState(stored as DensityLevel);
      }
    }
  }, [persist]);

  // Save to localStorage on change
  const setDensity = useCallback(
    (newDensity: DensityLevel) => {
      setDensityState(newDensity);
      if (persist && typeof window !== "undefined") {
        localStorage.setItem(DENSITY_STORAGE_KEY, newDensity);
      }
    },
    [persist]
  );

  // Cycle through densities
  const cycleDensity = useCallback(() => {
    const order: DensityLevel[] = ["compact", "comfortable", "spacious"];
    const currentIndex = order.indexOf(density);
    const nextIndex = (currentIndex + 1) % order.length;
    setDensity(order[nextIndex]);
  }, [density, setDensity]);

  // Set CSS custom properties based on density
  useEffect(() => {
    if (!mounted) return;
    
    const config = DENSITY_CONFIG[density];
    document.documentElement.setAttribute("data-density", density);
    
    // Optional: Set CSS variables for use in styles
    document.documentElement.style.setProperty("--density-spacing", 
      density === "compact" ? "0.25rem" : density === "comfortable" ? "0.5rem" : "1rem"
    );
  }, [density, mounted]);

  const config = DENSITY_CONFIG[density];

  // Avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <DensityContext.Provider value={{ density, setDensity, cycleDensity, config }}>
      {children}
    </DensityContext.Provider>
  );
}

/**
 * Props for DensityToggle
 */
export interface DensityToggleProps {
  /** Show as dropdown or cycle button */
  variant?: "dropdown" | "cycle";
  /** Additional class name */
  className?: string;
  /** Size of the toggle */
  size?: "sm" | "default" | "lg";
}

/**
 * DensityToggle - Button to change density
 */
export function DensityToggle({
  variant = "dropdown",
  className,
  size = "default",
}: DensityToggleProps) {
  const { density, setDensity, cycleDensity, config } = useDensity();

  // Keyboard shortcut: Cmd+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "d" &&
        !e.shiftKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        cycleDensity();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cycleDensity]);

  if (variant === "cycle") {
    return (
      <Button
        variant="ghost"
        size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
        onClick={cycleDensity}
        className={cn("gap-2", className)}
        title={`Density: ${config.label} (⌘D to toggle)`}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
          className={cn("gap-2", className)}
          title="Change density (⌘D)"
        >
          {config.icon}
          <span className="hidden sm:inline">{config.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(DENSITY_CONFIG) as DensityLevel[]).map((level) => {
          const levelConfig = DENSITY_CONFIG[level];
          return (
            <DropdownMenuItem
              key={level}
              onClick={() => setDensity(level)}
              className="flex items-center gap-3"
            >
              {levelConfig.icon}
              <div className="flex-1">
                <div className="font-medium">{levelConfig.label}</div>
                <div className="text-xs text-muted-foreground">
                  {levelConfig.description}
                </div>
              </div>
              {density === level && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Hook to get density-aware class names
 */
export function useDensityClasses() {
  const context = useDensityOptional();
  
  // Default to comfortable if no provider
  const config = context?.config ?? DENSITY_CONFIG.comfortable;

  return {
    spacing: config.spacing,
    padding: config.padding,
    fontSize: config.fontSize,
    rowHeight: config.rowHeight,
    cardPadding: config.cardPadding,
    // Convenience getters
    tableRow: cn(config.rowHeight, config.fontSize),
    card: cn(config.cardPadding, config.spacing),
    list: config.spacing,
  };
}