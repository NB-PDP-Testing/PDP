"use client";

import { Lightbulb } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function InsightsTab() {
  return (
    <Empty>
      <EmptyMedia>
        <Lightbulb className="h-12 w-12 text-muted-foreground" />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Shared Insights</EmptyTitle>
        <EmptyDescription>
          Coming in Phase 4. Team-level insights and analysis from voice notes
          and assessments.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
