"use client";

import { Calendar } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function PlanningTab() {
  return (
    <Empty>
      <EmptyMedia>
        <Calendar className="h-12 w-12 text-muted-foreground" />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Planning Tab</EmptyTitle>
        <EmptyDescription>
          Coming in Phase 3. Session plans, milestones, and upcoming fixtures.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
