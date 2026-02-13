"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  History,
  Loader2,
  Play,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WIZARD_STEPS } from "@/components/import/import-wizard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";

// Available sports (will be dynamic when sport config is ready)
const AVAILABLE_SPORTS = [
  { code: "gaa_football", name: "GAA Football" },
  { code: "hurling", name: "Hurling" },
  { code: "soccer", name: "Soccer" },
  { code: "rugby", name: "Rugby" },
  { code: "basketball", name: "Basketball" },
] as const;

// Sports that share templates (e.g., Foireann covers all GAA codes)
const GAA_SPORTS = new Set(["gaa_football", "hurling"]);

type ImportTemplate = {
  _id: Id<"importTemplates">;
  _creationTime: number;
  name: string;
  description?: string;
  sportCode?: string;
  sourceType: "csv" | "excel" | "paste";
  scope: "platform" | "organization";
  columnMappings: Array<{
    sourcePattern: string;
    targetField: string;
    required: boolean;
    transform?: string;
    aliases?: string[];
  }>;
  isActive: boolean;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}

function getSportName(sportCode?: string) {
  return (
    AVAILABLE_SPORTS.find((s) => s.code === sportCode)?.name ?? "Any Sport"
  );
}

function buildWizardUrl(
  orgId: string,
  templateId: Id<"importTemplates"> | null,
  sport: string
) {
  const params = new URLSearchParams();
  if (templateId) {
    params.set("templateId", templateId);
  }
  if (sport !== "all") {
    params.set("sport", sport);
  }
  const qs = params.toString();
  return `/orgs/${orgId}/import/wizard${qs ? `?${qs}` : ""}`;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: ImportTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const sportLabel = getSportName(template.sportCode);

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">{template.name}</h3>
            {template.description && (
              <p className="mt-1 text-muted-foreground text-sm">
                {template.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{sportLabel}</Badge>
              <Badge variant="secondary">
                {template.sourceType.toUpperCase()}
              </Badge>
              <Badge variant="secondary">
                {template.columnMappings.length} fields
              </Badge>
              {template.scope === "organization" && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Custom
                </Badge>
              )}
            </div>
          </div>
          {isSelected && (
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentSessionRow({
  session,
}: {
  session: {
    _id: string;
    status: string;
    sourceInfo: { fileName?: string };
    startedAt: number;
    stats: { totalRows: number; playersCreated: number };
  };
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {session.sourceInfo.fileName ?? "Pasted data"}
          </span>
          {getStatusBadge(session.status)}
        </div>
        <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(session.startedAt)}
          </span>
          <span>
            {session.stats.totalRows} rows
            {session.stats.playersCreated > 0 &&
              ` · ${session.stats.playersCreated} created`}
          </span>
        </div>
      </div>
    </div>
  );
}

function ResumeDraftCard({
  draft,
  orgId,
  onDiscard,
}: {
  draft: {
    _id: Id<"importSessionDrafts">;
    step: number;
    sourceFileName?: string;
    lastSavedAt: number;
    expiresAt: number;
    parsedRowCount?: number;
    templateId?: Id<"importTemplates">;
  };
  orgId: string;
  onDiscard: () => void;
}) {
  const stepName =
    WIZARD_STEPS.find((s) => s.id === draft.step)?.name ?? `Step ${draft.step}`;
  const expiresIn = Math.max(
    0,
    Math.ceil((draft.expiresAt - Date.now()) / 86_400_000)
  );

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Resume Import
        </CardTitle>
        <CardDescription>
          You have an unfinished import. Pick up where you left off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {draft.sourceFileName && (
              <span>
                <span className="text-muted-foreground">File:</span>{" "}
                <span className="font-medium">{draft.sourceFileName}</span>
              </span>
            )}
            <span>
              <span className="text-muted-foreground">Progress:</span>{" "}
              <span className="font-medium">{stepName}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Saved:</span>{" "}
              <span className="font-medium">
                {formatRelativeTime(draft.lastSavedAt)}
              </span>
            </span>
            {draft.parsedRowCount != null && (
              <span>
                <span className="text-muted-foreground">Rows:</span>{" "}
                <span className="font-medium">{draft.parsedRowCount}</span>
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              Expires in {expiresIn} day{expiresIn !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex-1"
              href={`/orgs/${orgId}/import/wizard?resume=true` as Route}
            >
              <Button className="w-full" size="lg">
                <Play className="mr-2 h-4 w-4" />
                Resume Import
              </Button>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard saved import?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your saved import progress. You
                    will need to start a new import from scratch.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDiscard}>
                    Discard
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<Id<"importTemplates"> | null>(null);

  // Check if the user has admin/owner role
  useEffect(() => {
    const checkAccess = async () => {
      try {
        await authClient.organization.setActive({ organizationId: orgId });
        const { data: member } =
          await authClient.organization.getActiveMember();

        if (!member) {
          setHasAccess(false);
          return;
        }

        const functionalRoles = (member as any).functionalRoles || [];
        const hasAdminFunctionalRole = functionalRoles.includes("admin");
        const hasBetterAuthAdminRole =
          member.role === "admin" || member.role === "owner";

        setHasAccess(hasAdminFunctionalRole || hasBetterAuthAdminRole);
      } catch {
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [orgId]);

  // Redirect if no access
  useEffect(() => {
    if (hasAccess === false) {
      router.replace("/orgs");
    }
  }, [hasAccess, router]);

  // Fetch platform templates
  const platformTemplates = useQuery(
    api.models.importTemplates.listTemplates,
    hasAccess ? { scope: "platform" } : "skip"
  );

  // Fetch org-specific templates
  const orgTemplates = useQuery(
    api.models.importTemplates.listTemplates,
    hasAccess ? { scope: "organization", organizationId: orgId } : "skip"
  );

  // Fetch recent import sessions for this org (last 5)
  const recentSessions = useQuery(
    api.models.importSessions.listSessionsByOrg,
    hasAccess ? { organizationId: orgId } : "skip"
  );

  // Check for existing draft
  const existingDraft = useQuery(
    api.models.importSessionDrafts.loadDraft,
    hasAccess ? { organizationId: orgId } : "skip"
  );

  const deleteDraftMutation = useMutation(
    api.models.importSessionDrafts.deleteDraft
  );

  const handleDiscardDraft = async () => {
    if (existingDraft) {
      try {
        await deleteDraftMutation({ draftId: existingDraft._id });
      } catch {
        // Non-blocking
      }
    }
  };

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Access denied - redirect is happening via useEffect
  if (hasAccess === false) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-2xl">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the import wizard.
          </p>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isLoading =
    platformTemplates === undefined ||
    orgTemplates === undefined ||
    recentSessions === undefined ||
    existingDraft === undefined;

  // Combine and filter templates by sport
  const allTemplates: ImportTemplate[] = [
    ...(platformTemplates ?? []),
    ...(orgTemplates ?? []),
  ] as ImportTemplate[];

  const filteredTemplates =
    selectedSport === "all"
      ? allTemplates
      : allTemplates.filter((t) => {
          if (!t.sportCode) {
            return true;
          }
          if (t.sportCode === selectedSport) {
            return true;
          }
          if (GAA_SPORTS.has(selectedSport) && GAA_SPORTS.has(t.sportCode)) {
            return true;
          }
          return false;
        });

  const recentSessionsList = (recentSessions ?? []).slice(0, 5);

  const selectedTemplate = selectedTemplateId
    ? allTemplates.find((t) => t._id === selectedTemplateId)
    : null;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading import options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/orgs/${orgId}/admin` as Route}>
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
            Import Players
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Import players from CSV files or spreadsheets
          </p>
        </div>
      </div>

      {/* Resume Draft Card */}
      {existingDraft && (
        <ResumeDraftCard
          draft={existingDraft}
          onDiscard={handleDiscardDraft}
          orgId={orgId}
        />
      )}

      {/* Sport Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Sport</CardTitle>
          <CardDescription>
            Choose a sport to filter available templates, or select
            &ldquo;All&rdquo; to see all templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            onValueChange={(value) => {
              setSelectedSport(value);
              setSelectedTemplateId(null);
            }}
            value={selectedSport}
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Select a sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {AVAILABLE_SPORTS.map((sport) => (
                <SelectItem key={sport.code} value={sport.code}>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Template Selection */}
      <div>
        <h2 className="mb-3 font-semibold text-lg">Choose a Template</h2>
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No templates available
                {selectedSport !== "all"
                  ? ` for ${getSportName(selectedSport)}`
                  : ""}
                .
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Use &ldquo;All Sports&rdquo; or contact your platform admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTemplates.map((template) => (
              <TemplateCard
                isSelected={selectedTemplateId === template._id}
                key={template._id}
                onSelect={() => setSelectedTemplateId(template._id)}
                template={template}
              />
            ))}
          </div>
        )}
      </div>

      {/* Start Import Button */}
      <Card>
        <CardContent className="p-4">
          {selectedTemplateId ? (
            <Link
              href={
                buildWizardUrl(
                  orgId,
                  selectedTemplateId,
                  selectedSport
                ) as Route
              }
            >
              <Button className="w-full" size="lg">
                <Upload className="mr-2 h-5 w-5" />
                {`Start Import with "${selectedTemplate?.name}"`}
              </Button>
            </Link>
          ) : (
            <Button className="w-full" disabled size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Select a template to begin
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recent Imports */}
      {recentSessionsList.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-lg">Recent Imports</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentSessionsList.map((session) => (
                  <RecentSessionRow key={session._id} session={session} />
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="mt-3 flex justify-center">
            <Link href={`/orgs/${orgId}/import/history` as Route}>
              <Button size="sm" variant="outline">
                <History className="mr-2 h-4 w-4" />
                View Import History
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Legacy Importers */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-sm">Legacy Importers</p>
              <p className="text-muted-foreground text-xs">
                Use the original GAA or basic importer
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/orgs/${orgId}/admin/gaa-import` as Route}>
                <Button size="sm" variant="outline">
                  GAA Import
                </Button>
              </Link>
              <Link href={`/orgs/${orgId}/admin/player-import` as Route}>
                <Button size="sm" variant="outline">
                  Basic Import
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
