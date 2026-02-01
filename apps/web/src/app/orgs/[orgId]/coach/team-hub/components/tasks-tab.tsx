"use client";

import { CheckSquare } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function TasksTab() {
  return (
    <Empty>
      <EmptyMedia>
        <CheckSquare className="h-12 w-12 text-muted-foreground" />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Coach Tasks</EmptyTitle>
        <EmptyDescription>
          Coming in Phase 4. Track coaching tasks, player reviews, and
          administrative to-dos.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
