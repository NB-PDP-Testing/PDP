"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { cn } from "@/lib/utils";

/**
 * Theme toggle component with light/dark/system options.
 *
 * When ux_theme_enhanced flag is enabled:
 * - Shows checkmark next to current theme selection
 * - Includes proper ARIA attributes for accessibility
 * - Shows icons in dropdown for visual clarity
 *
 * Industry best practices implemented:
 * - Apple HIG: Clear visual feedback for current state
 * - Material Design: Consistent icon usage
 * - WCAG 2.2: Proper aria-label and role attributes
 */
export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { useEnhancedThemeToggle } = useUXFeatureFlags();

  // Enhanced version with checkmarks and ARIA
  if (useEnhancedThemeToggle) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-haspopup="menu"
            aria-label={`Theme: ${resolvedTheme === "dark" ? "Dark" : "Light"} mode. Click to change.`}
            size="icon"
            variant="outline"
          >
            <Sun
              aria-hidden="true"
              className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0"
            />
            <Moon
              aria-hidden="true"
              className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label="Theme options" role="menu">
          <DropdownMenuItem
            aria-checked={theme === "light"}
            className="flex items-center gap-2"
            onClick={() => setTheme("light")}
            role="menuitemradio"
          >
            <Sun aria-hidden="true" className="h-4 w-4" />
            <span className="flex-1">Light</span>
            <Check
              aria-hidden="true"
              className={cn("h-4 w-4", theme !== "light" && "invisible")}
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-checked={theme === "dark"}
            className="flex items-center gap-2"
            onClick={() => setTheme("dark")}
            role="menuitemradio"
          >
            <Moon aria-hidden="true" className="h-4 w-4" />
            <span className="flex-1">Dark</span>
            <Check
              aria-hidden="true"
              className={cn("h-4 w-4", theme !== "dark" && "invisible")}
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-checked={theme === "system"}
            className="flex items-center gap-2"
            onClick={() => setTheme("system")}
            role="menuitemradio"
          >
            <Monitor aria-hidden="true" className="h-4 w-4" />
            <span className="flex-1">System</span>
            <Check
              aria-hidden="true"
              className={cn("h-4 w-4", theme !== "system" && "invisible")}
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Original version (default - no feature flag)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline">
          <Sun className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
