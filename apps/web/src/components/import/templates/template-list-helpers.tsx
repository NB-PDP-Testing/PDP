import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { Copy, Edit, Trash2 } from "lucide-react";
import type { TemplateFormData } from "@/components/import/templates/template-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";

// ============================================================
// Types
// ============================================================

export type Template = {
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
// Constants
// ============================================================

export const SPORT_OPTIONS = [
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

// ============================================================
// Helpers
// ============================================================

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getSportLabel(sportCode?: string): string {
  if (!sportCode) {
    return "Any Sport";
  }
  const sport = SPORT_OPTIONS.find((s) => s.value === sportCode);
  return sport?.label ?? sportCode;
}

export function formatUsageStats(stats?: {
  usageCount: number;
  lastUsedAt: number | null;
}): string {
  if (!stats?.usageCount) {
    return "Never";
  }
  const lastUsed = stats.lastUsedAt ? formatDate(stats.lastUsedAt) : "\u2014";
  return `${stats.usageCount}x \u2014 ${lastUsed}`;
}

export function templateToFormData(template: Template): TemplateFormData {
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

export function matchesSearch(t: Template, search: string): boolean {
  if (!search) {
    return true;
  }
  const q = search.toLowerCase();
  return (
    t.name.toLowerCase().includes(q) ||
    (t.description?.toLowerCase().includes(q) ?? false)
  );
}

export function filterTemplates(
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
// Table Row Component
// ============================================================

export function TemplateTableRow({
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

// ============================================================
// Mobile Card Component
// ============================================================

export function TemplateMobileCard({
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
