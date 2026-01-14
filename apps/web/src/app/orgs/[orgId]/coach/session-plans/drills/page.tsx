"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DrillLibraryPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const drills = useQuery(api.models.sessionPlans.getDrillLibrary, {
    organizationId: orgId,
  });

  if (drills === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          className="mb-2 inline-block text-muted-foreground text-sm hover:text-foreground"
          href={`/orgs/${orgId}/coach/session-plans`}
        >
          ← Back to Session Plans
        </Link>
        <h1 className="font-bold text-3xl">Drill Library</h1>
        <p className="text-muted-foreground">
          Browse drills with effectiveness data from coach feedback
        </p>
      </div>

      {drills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <h3 className="mb-2 font-semibold text-lg">No drills yet</h3>
            <p className="text-center text-muted-foreground">
              Drill effectiveness data will appear here as coaches provide
              feedback on session plans
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drills.map((drill) => (
            <Card key={drill._id}>
              <CardHeader>
                <CardTitle>{drill.name}</CardTitle>
                <CardDescription>{drill.activityType}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span
                      className={`font-semibold ${
                        drill.successRate >= 80
                          ? "text-green-600"
                          : drill.successRate >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {drill.successRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Times Used</span>
                    <span className="font-medium">{drill.totalUses}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Positive</span>
                    <span className="text-green-600">
                      {drill.positiveCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Negative</span>
                    <span className="text-red-600">{drill.negativeCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
