"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Copy,
  Edit,
  FileSpreadsheet,
  FileUp,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CloneDialog } from "@/components/import/templates/clone-dialog";
import { DeleteDialog } from "@/components/import/templates/delete-dialog";
import {
  getDefaultFormData,
  TemplateForm,
  type TemplateFormData,
} from "@/components/import/templates/template-form";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";

// ============================================================
// Types
// ============================================================

type Template = {
  _id: Id<"importTemplates">;
  _creationTime: number;
  name: string;
  description?: string;
  sportCode?: string;
  sourceType: "csv" | "excel" | "paste";
  scope: "platform" | "organization";
  organizationId?: string;
  columnMappings: Array<{
    sourcePattern: string;
    targetField: string;
    required: boolean;
    transform?: string;
    aliases?: string[];
  }>;
  ageGroupMappings?: Array<{
    sourceValue: string;
    targetAgeGroup: string;
  }>;
  skillInitialization: {
    strategy: string;
    customBenchmarkTemplateId?: Id<"benchmarkTemplates">;
    applyToPassportStatus?: string[];
  };
  defaults: {
    createTeams: boolean;
    createPassports: boolean;
    season?: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

// ============================================================
// Constants & Helpers
// ============================================================

const SPORT_OPTIONS = [
  { value: "all", label: "All Sports" },
  { value: "gaa_football", label: "GAA Football" },
  { value: "hurling", label: "Hurling" },
  { value: "camogie", label: "Camogie" },
  { value: "ladies_football", label: "Ladies Football" },
  { value: "soccer", label: "Soccer" },
  { value: "rugby", label: "Rugby" },
  { value: "basketball", label: "Basketball" },
  { value: "athletics", label: "Athletics" },
];

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSportLabel(sportCode?: string): string {
  if (!sportCode) {
    return "Any Sport";
  }
  const sport = SPORT_OPTIONS.find((s) => s.value === sportCode);
  return sport?.label ?? sportCode;
}

function formatUsageStats(stats?: {
  usageCount: number;
  lastUsedAt: number | null;
}): string {
  if (!stats?.usageCount) {
    return "Never";
  }
  const lastUsed = stats.lastUsedAt ? formatDate(stats.lastUsedAt) : "—";
  return `${stats.usageCount}x — ${lastUsed}`;
}

function templateToFormData(template: Template): TemplateFormData {
  return {
    name: template.name,
    description: template.description ?? "",
    sportCode: template.sportCode ?? "",
    sourceType: template.sourceType,
    scope: template.scope,
    columnMappings: template.columnMappings,
    ageGroupMappings: template.ageGroupMappings ?? [],
    skillInitialization:
      template.skillInitialization as TemplateFormData["skillInitialization"],
    defaults: template.defaults,
  };
}

// ============================================================
// Table Row Component
// ============================================================

function TemplateTableRow({
  template,
  stats,
  canEdit,
  canDelete,
  onEdit,
  onClone,
  onDelete,
}: {
  template: Template;
  stats?: { usageCount: number; lastUsedAt: number | null };
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{template.name}</p>
          {template.description && (
            <p className="text-muted-foreground text-xs">
              {template.description}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{getSportLabel(template.sportCode)}</Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={template.scope === "platform" ? "default" : "secondary"}
        >
          {template.scope === "platform" ? "Platform" : "Organization"}
        </Badge>
      </TableCell>
      <TableCell className="capitalize">{template.sourceType}</TableCell>
      <TableCell className="text-center">
        {template.columnMappings.length}
      </TableCell>
      <TableCell>{formatUsageStats(stats)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {canEdit ? (
            <Button onClick={onEdit} size="icon" title="Edit" variant="ghost">
              <Edit className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            onClick={onClone}
            size="icon"
            title={canEdit ? "Clone" : "Clone to My Org"}
            variant="ghost"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {canDelete ? (
            <Button
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              size="icon"
              title="Delete"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function matchesSearch(t: Template, search: string): boolean {
  if (!search) {
    return true;
  }
  const q = search.toLowerCase();
  return (
    t.name.toLowerCase().includes(q) ||
    (t.description?.toLowerCase().includes(q) ?? false)
  );
}

function filterTemplates(
  templates: Template[],
  search: string,
  sportFilter: string
): Template[] {
  return templates.filter((t) => {
    if (!matchesSearch(t, search)) {
      return false;
    }
    if (sportFilter !== "all" && t.sportCode !== sportFilter) {
      return false;
    }
    return true;
  });
}

// ============================================================
// Mobile Card Component
// ============================================================

function TemplateMobileCard({
  template,
  stats,
  canModify,
  onEdit,
  onClone,
  onDelete,
}: {
  template: Template;
  stats?: { usageCount: number; lastUsedAt: number | null };
  canModify: boolean;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={template.scope === "platform" ? "default" : "secondary"}
          >
            {template.scope === "platform" ? "Platform" : "Org"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{getSportLabel(template.sportCode)}</Badge>
          <Badge className="capitalize" variant="outline">
            {template.sourceType}
          </Badge>
          <Badge variant="outline">
            {template.columnMappings.length} mappings
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {formatUsageStats(stats)}
        </p>
        <div className="flex gap-2">
          {canModify && (
            <Button
              className="flex-1"
              onClick={onEdit}
              size="sm"
              variant="outline"
            >
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={onClone}
            size="sm"
            variant="outline"
          >
            <Copy className="mr-1 h-3 w-3" />
            {canModify ? "Clone" : "Clone to Org"}
          </Button>
          {canModify && (
            <Button
              className="text-destructive"
              onClick={onDelete}
              size="sm"
              variant="outline"
            >
              <Trash2 className="mr-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function TemplateManagementPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const user = useCurrentUser();

  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  // Dialog state
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [cloningTemplate, setCloningTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(
    null
  );

  // Pre-filled form data from sample upload
  const [prefilledData, setPrefilledData] = useState<TemplateFormData | null>(
    null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPlatformStaff = user?.isPlatformStaff === true;
  const userId = user?._id ?? "";

  // Mutations
  const createTemplate = useMutation(api.models.importTemplates.createTemplate);
  const updateTemplate = useMutation(api.models.importTemplates.updateTemplate);

  // Fetch platform templates
  const platformTemplates = useQuery(api.models.importTemplates.listTemplates, {
    scope: "platform",
  });

  // Fetch org-specific templates
  const orgTemplates = useQuery(api.models.importTemplates.listTemplates, {
    scope: "organization",
    organizationId: orgId,
  });

  // Combine all templates
  const allTemplates = useMemo(() => {
    if (!(platformTemplates && orgTemplates)) {
      return;
    }
    return [...platformTemplates, ...orgTemplates];
  }, [platformTemplates, orgTemplates]);

  // Fetch usage stats for all templates
  const templateIds = useMemo(
    () => allTemplates?.map((t) => t._id) ?? [],
    [allTemplates]
  );
  const usageStats = useQuery(
    api.models.importSessions.getTemplateUsageStats,
    templateIds.length > 0 ? { templateIds } : "skip"
  );

  // Build usage stats map for O(1) lookup
  const usageMap = useMemo(() => {
    const map = new Map<
      string,
      { usageCount: number; lastUsedAt: number | null }
    >();
    if (usageStats) {
      for (const stat of usageStats) {
        map.set(stat.templateId, {
          usageCount: stat.usageCount,
          lastUsedAt: stat.lastUsedAt,
        });
      }
    }
    return map;
  }, [usageStats]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!allTemplates) {
      return;
    }
    return filterTemplates(allTemplates, search, sportFilter);
  }, [allTemplates, search, sportFilter]);

  const isLoading = !allTemplates;

  const canModify = (template: Template) =>
    isPlatformStaff || template.scope === "organization";

  // ============================================================
  // Create / Edit handlers
  // ============================================================

  const handleCreate = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      await createTemplate({
        name: data.name,
        description: data.description || undefined,
        sportCode: data.sportCode || undefined,
        sourceType: data.sourceType,
        scope: data.scope,
        organizationId: data.scope === "organization" ? orgId : undefined,
        columnMappings: data.columnMappings,
        ageGroupMappings:
          data.ageGroupMappings.length > 0 ? data.ageGroupMappings : undefined,
        skillInitialization: data.skillInitialization,
        defaults: data.defaults,
        createdBy: userId,
      });
      toast.success("Template created successfully");
      setCreatingTemplate(false);
      setPrefilledData(null);
    } catch {
      toast.error("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (data: TemplateFormData) => {
    if (!editingTemplate) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateTemplate({
        templateId: editingTemplate._id,
        name: data.name,
        description: data.description || undefined,
        sportCode: data.sportCode || undefined,
        sourceType: data.sourceType,
        columnMappings: data.columnMappings,
        ageGroupMappings:
          data.ageGroupMappings.length > 0 ? data.ageGroupMappings : undefined,
        skillInitialization: data.skillInitialization,
        defaults: data.defaults,
      });
      toast.success("Template updated successfully");
      setEditingTemplate(null);
    } catch {
      toast.error("Failed to update template");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine form dialog state
  const showFormDialog = creatingTemplate || editingTemplate !== null;
  const formInitialData = editingTemplate
    ? templateToFormData(editingTemplate)
    : (prefilledData ?? getDefaultFormData());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Import Templates
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage import configurations for player data imports
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreatingTemplate(true)}
            size="sm"
            variant="outline"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Upload Sample
          </Button>
          <Button onClick={() => setCreatingTemplate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            value={search}
          />
        </div>
        <Select onValueChange={setSportFilter} value={sportFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by sport" />
          </SelectTrigger>
          <SelectContent>
            {SPORT_OPTIONS.map((sport) => (
              <SelectItem key={sport.value} value={sport.value}>
                {sport.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* Empty state */}
      {filteredTemplates && filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
            <CardTitle className="mb-2">No templates found</CardTitle>
            <CardDescription>
              {search || sportFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first template to get started"}
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Desktop table view */}
      {filteredTemplates && filteredTemplates.length > 0 && (
        <>
          <div className="hidden md:block">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-center">Mappings</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TemplateTableRow
                      canDelete={canModify(template)}
                      canEdit={canModify(template)}
                      key={template._id}
                      onClone={() => setCloningTemplate(template)}
                      onDelete={() => setDeletingTemplate(template)}
                      onEdit={() => setEditingTemplate(template)}
                      stats={usageMap.get(template._id)}
                      template={template}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredTemplates.map((template) => (
              <TemplateMobileCard
                canModify={canModify(template)}
                key={template._id}
                onClone={() => setCloningTemplate(template)}
                onDelete={() => setDeletingTemplate(template)}
                onEdit={() => setEditingTemplate(template)}
                stats={usageMap.get(template._id)}
                template={template}
              />
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCreatingTemplate(false);
            setEditingTemplate(null);
            setPrefilledData(null);
          }
        }}
        open={showFormDialog}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the template configuration below."
                : "Configure a new import template with column mappings and defaults."}
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            initialData={formInitialData}
            isPlatformStaff={isPlatformStaff}
            isSubmitting={isSubmitting}
            onCancel={() => {
              setCreatingTemplate(false);
              setEditingTemplate(null);
              setPrefilledData(null);
            }}
            onSubmit={editingTemplate ? handleEdit : handleCreate}
            submitLabel={
              editingTemplate ? "Update Template" : "Create Template"
            }
          />
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      {cloningTemplate && (
        <CloneDialog
          createdBy={userId}
          isPlatformTemplate={cloningTemplate.scope === "platform"}
          onOpenChange={(open) => {
            if (!open) {
              setCloningTemplate(null);
            }
          }}
          open
          organizationId={orgId}
          templateId={cloningTemplate._id}
          templateName={cloningTemplate.name}
        />
      )}

      {/* Delete Dialog */}
      {deletingTemplate && (
        <DeleteDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeletingTemplate(null);
            }
          }}
          open
          templateId={deletingTemplate._id}
          templateName={deletingTemplate.name}
        />
      )}
    </div>
  );
}
