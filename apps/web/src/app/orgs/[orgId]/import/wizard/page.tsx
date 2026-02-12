"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import ImportWizard from "@/components/import/import-wizard";
import { Button } from "@/components/ui/button";

export default function ImportWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  const templateId =
    (searchParams.get("templateId") as Id<"importTemplates"> | null) ?? null;
  const sportCode = searchParams.get("sport") ?? "";

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/orgs/${orgId}/import` as Route}>
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
            Import Wizard
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Follow the steps to import your player data
          </p>
        </div>
      </div>

      <ImportWizard
        organizationId={orgId}
        sportCode={sportCode}
        templateId={templateId}
      />
    </div>
  );
}
