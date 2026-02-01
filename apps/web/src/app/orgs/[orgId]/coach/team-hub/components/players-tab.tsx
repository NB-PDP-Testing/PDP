"use client";

import { Users } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function PlayersTab() {
  return (
    <Empty>
      <EmptyMedia>
        <Users className="h-12 w-12 text-muted-foreground" />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Players Tab</EmptyTitle>
        <EmptyDescription>
          Coming in Phase 3. Player grid with health status badges and quick
          access to passports.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
