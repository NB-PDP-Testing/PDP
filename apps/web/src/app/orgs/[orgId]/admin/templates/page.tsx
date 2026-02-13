"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { FileSpreadsheet, FileUp, Plus, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CloneDialog } from "@/components/import/templates/clone-dialog";
import { DeleteDialog } from "@/components/import/templates/delete-dialog";
import { SampleUploadDialog } from "@/components/import/templates/sample-upload-dialog";
import {
  getDefaultFormData,
  TemplateForm,
  type TemplateFormData,
} from "@/components/import/templates/template-form";
import {
  filterTemplates,
  SPORT_OPTIONS,
  type Template,
  TemplateMobileCard,
  TemplateTableRow,
  templateToFormData,
} from "@/components/import/templates/template-list-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";

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

  // Sample upload dialog
  const [sampleUploadOpen, setSampleUploadOpen] = useState(false);

  // Pre-filled form data from sample upload
  const [prefilledData, setPrefilledData] = useState<TemplateFormData | null>(
    null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = user?._id ?? "";

  // Mutations
  const createTemplate = useMutation(api.models.importTemplates.createTemplate);
  const updateTemplate = useMutation(api.models.importTemplates.updateTemplate);

  // Fetch platform templates (read-only for org admins)
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
    return filterTemplates(allTemplates as Template[], search, sportFilter);
  }, [allTemplates, search, sportFilter]);

  const isLoading = !allTemplates;

  // Org admins can only modify organization-scoped templates
  const canModify = (template: Template) => template.scope === "organization";

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
        scope: "organization",
        organizationId: orgId,
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
            onClick={() => setSampleUploadOpen(true)}
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
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-[1176px] sm:rounded-lg">
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
            isPlatformStaff={false}
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

      {/* Sample Upload Dialog */}
      <SampleUploadDialog
        onMappingsDetected={(data) => {
          setPrefilledData(data);
          setCreatingTemplate(true);
        }}
        onOpenChange={setSampleUploadOpen}
        open={sampleUploadOpen}
      />

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
