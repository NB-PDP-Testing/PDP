"use client";

import { BarChart3, Columns, Radar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ViewMode } from "../comparison-view";

type ViewModeSelectorProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

/**
 * View Mode Selector
 *
 * Allows coaches to switch between different comparison views:
 * - Insights: Primary view with agreements, divergences, and recommendations
 * - Split: Side-by-side comparison (tabs on mobile, resizable panels on desktop)
 * - Overlay: Overlaid radar charts for visual comparison
 */
export function ViewModeSelector({
  viewMode,
  onViewModeChange,
}: ViewModeSelectorProps) {
  return (
    <Tabs
      onValueChange={(value) => onViewModeChange(value as ViewMode)}
      value={viewMode}
    >
      <TabsList className="grid w-full grid-cols-3 sm:w-auto">
        <TabsTrigger className="gap-2" value="insights">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Insights</span>
        </TabsTrigger>
        <TabsTrigger className="gap-2" value="split">
          <Columns className="h-4 w-4" />
          <span className="hidden sm:inline">Split</span>
        </TabsTrigger>
        <TabsTrigger className="gap-2" value="overlay">
          <Radar className="h-4 w-4" />
          <span className="hidden sm:inline">Overlay</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
