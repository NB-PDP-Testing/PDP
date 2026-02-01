"use client";

import { LayoutDashboard } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function OverviewTab() {
  return (
    <Empty>
      <EmptyMedia>
        <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Overview Dashboard</EmptyTitle>
        <EmptyDescription>
          Coming in Phase 2. Quick stats, roster, attendance, injuries, and
          upcoming events.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
