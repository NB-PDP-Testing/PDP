"use client";

import { FileText, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateScenario = "no-plans" | "no-results" | "no-favorites";

type EmptyStateProps = {
  scenario: EmptyStateScenario;
  orgId: string;
};

export function EmptyState({ scenario, orgId }: EmptyStateProps) {
  if (scenario === "no-plans") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">No session plans yet</h3>
          <p className="mb-4 max-w-md text-center text-muted-foreground">
            Create your first AI-powered session plan to get started. Generate
            personalized training sessions tailored to your team's needs.
          </p>
          <Link href={`/orgs/${orgId}/coach/session-plans/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Session Plan
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (scenario === "no-results") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Search className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">
            No plans match your filters
          </h3>
          <p className="mb-4 max-w-md text-center text-muted-foreground">
            Try adjusting your search criteria or filters to find session plans.
            You can clear all filters to see all available plans.
          </p>
        </CardContent>
      </Card>
    );
  }

  // scenario === "no-favorites"
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-12">
        <Star className="mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 font-semibold text-lg">No favorites yet</h3>
        <p className="mb-4 max-w-md text-center text-muted-foreground">
          Mark plans as favorites to quickly access them later. Click the heart
          icon on any plan to add it to your favorites.
        </p>
      </CardContent>
    </Card>
  );
}
