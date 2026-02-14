"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { DraftData } from "@/components/import/import-wizard";
import ImportWizard from "@/components/import/import-wizard";
import { Button } from "@/components/ui/button";

export default function ImportWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  const templateId =
    (searchParams.get("templateId") as Id<"importTemplates"> | null) ?? null;
  const sportCode = searchParams.get("sport") ?? "";
  const isResume = searchParams.get("resume") === "true";

  // Load draft when resuming
  const draft = useQuery(
    api.models.importSessionDrafts.loadDraft,
    isResume ? { organizationId: orgId } : "skip"
  );

  // Show loading while fetching draft
  if (isResume && draft === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading saved progress...</p>
        </div>
      </div>
    );
  }

  // Build draft data if resuming and draft exists
  const draftData: DraftData | null =
    isResume && draft
      ? {
          _id: draft._id,
          step: draft.step,
          parsedHeaders: draft.parsedHeaders,
          parsedRowCount: draft.parsedRowCount,
          mappings: draft.mappings,
          playerSelections: draft.playerSelections,
          benchmarkSettings: draft.benchmarkSettings,
          templateId: draft.templateId,
          sourceFileName: draft.sourceFileName,
        }
      : null;

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
            {isResume && draftData ? "Resume Import" : "Import Wizard"}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {isResume && draftData
              ? "Re-upload your file to continue where you left off"
              : "Follow the steps to import your player data"}
          </p>
        </div>
      </div>

      <ImportWizard
        draftData={draftData}
        organizationId={orgId}
        sportCode={sportCode}
        templateId={draftData?.templateId ?? templateId}
      />
    </div>
  );
}
