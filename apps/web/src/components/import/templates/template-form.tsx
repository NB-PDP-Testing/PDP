"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  DEFAULT_TARGET_FIELDS,
  type FieldDefinition,
} from "@pdp/backend/convex/lib/import/mapper";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ============================================================
// Types
// ============================================================

export type ColumnMapping = {
  sourcePattern: string;
  targetField: string;
  required: boolean;
  transform?: string;
  aliases?: string[];
};

export type AgeGroupMapping = {
  sourceValue: string;
  targetAgeGroup: string;
};

export type SkillInitialization = {
  strategy:
    | "blank"
    | "middle"
    | "age-appropriate"
    | "ngb-benchmarks"
    | "custom";
  customBenchmarkTemplateId?: Id<"benchmarkTemplates">;
  applyToPassportStatus?: string[];
};

export type TemplateDefaults = {
  createTeams: boolean;
  createPassports: boolean;
  season?: string;
};

export type TemplateFormData = {
  name: string;
  description: string;
  sportCode: string;
  sourceType: "csv" | "excel" | "paste";
  scope: "platform" | "organization";
  columnMappings: ColumnMapping[];
  ageGroupMappings: AgeGroupMapping[];
  skillInitialization: SkillInitialization;
  defaults: TemplateDefaults;
};

// ============================================================
// Constants
// ============================================================

const SPORT_OPTIONS = [
  { value: "", label: "Any Sport" },
  { value: "gaa_football", label: "GAA Football" },
  { value: "hurling", label: "Hurling" },
  { value: "camogie", label: "Camogie" },
  { value: "ladies_football", label: "Ladies Football" },
  { value: "soccer", label: "Soccer" },
  { value: "rugby", label: "Rugby" },
  { value: "basketball", label: "Basketball" },
  { value: "athletics", label: "Athletics" },
];

const TRANSFORM_OPTIONS = [
  { value: "", label: "None" },
  { value: "parseDate", label: "Parse Date" },
  { value: "normalizeGender", label: "Normalize Gender" },
  { value: "toUpperCase", label: "To Uppercase" },
  { value: "toLowerCase", label: "To Lowercase" },
  { value: "trim", label: "Trim Whitespace" },
];

const SKILL_STRATEGIES = [
  { value: "blank", label: "Blank", description: "No initial skill ratings" },
  {
    value: "middle",
    label: "Middle (3/5)",
    description: "All skills start at 3 out of 5",
  },
  {
    value: "age-appropriate",
    label: "Age Appropriate",
    description: "Ratings based on age group norms",
  },
  {
    value: "ngb-benchmarks",
    label: "NGB Benchmarks",
    description: "National governing body benchmarks",
  },
  {
    value: "custom",
    label: "Custom Template",
    description: "Use a custom benchmark template",
  },
];

function emptyMapping(): ColumnMapping {
  return { sourcePattern: "", targetField: "", required: false };
}

function emptyAgeGroupMapping(): AgeGroupMapping {
  return { sourceValue: "", targetAgeGroup: "" };
}

export function getDefaultFormData(): TemplateFormData {
  return {
    name: "",
    description: "",
    sportCode: "",
    sourceType: "csv",
    scope: "organization",
    columnMappings: [emptyMapping()],
    ageGroupMappings: [],
    skillInitialization: { strategy: "blank" },
    defaults: { createTeams: false, createPassports: true },
  };
}

// ============================================================
// Component
// ============================================================

type TemplateFormProps = {
  initialData?: TemplateFormData;
  isPlatformStaff?: boolean;
  onSubmit: (data: TemplateFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export function TemplateForm({
  initialData,
  isPlatformStaff = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save Template",
}: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormData>(
    initialData ?? getDefaultFormData()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(
    <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // ============================================================
  // Column Mappings
  // ============================================================

  const addColumnMapping = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      columnMappings: [...prev.columnMappings, emptyMapping()],
    }));
  }, []);

  const removeColumnMapping = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      columnMappings: prev.columnMappings.filter((_, i) => i !== index),
    }));
  }, []);

  const updateColumnMapping = useCallback(
    (index: number, field: keyof ColumnMapping, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        columnMappings: prev.columnMappings.map((m, i) =>
          i === index ? { ...m, [field]: value } : m
        ),
      }));
    },
    []
  );

  // ============================================================
  // Age Group Mappings
  // ============================================================

  const addAgeGroupMapping = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      ageGroupMappings: [...prev.ageGroupMappings, emptyAgeGroupMapping()],
    }));
  }, []);

  const removeAgeGroupMapping = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      ageGroupMappings: prev.ageGroupMappings.filter((_, i) => i !== index),
    }));
  }, []);

  const updateAgeGroupMapping = useCallback(
    (index: number, field: keyof AgeGroupMapping, value: string) => {
      setFormData((prev) => ({
        ...prev,
        ageGroupMappings: prev.ageGroupMappings.map((m, i) =>
          i === index ? { ...m, [field]: value } : m
        ),
      }));
    },
    []
  );

  // ============================================================
  // Validation & Submit
  // ============================================================

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    const validMappings = formData.columnMappings.filter(
      (m) => m.sourcePattern.trim() && m.targetField
    );
    if (validMappings.length === 0) {
      newErrors.columnMappings = "At least one column mapping is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    // Clean up data before submit
    const cleaned: TemplateFormData = {
      ...formData,
      columnMappings: formData.columnMappings.filter(
        (m) => m.sourcePattern.trim() && m.targetField
      ),
      ageGroupMappings: formData.ageGroupMappings.filter(
        (m) => m.sourceValue.trim() && m.targetAgeGroup.trim()
      ),
    };

    onSubmit(cleaned);
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const usedTargetFields = new Set(
    formData.columnMappings.map((m) => m.targetField).filter(Boolean)
  );

  return (
    <div className="space-y-6">
      <Accordion
        className="w-full"
        defaultValue={["basic-info", "column-mappings"]}
        type="multiple"
      >
        {/* Section 1: Basic Info */}
        <AccordionItem value="basic-info">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              Basic Information
              {errors.name && (
                <Badge className="text-xs" variant="destructive">
                  Error
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="template-name"
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. GAA Foireann Export"
                  value={formData.name}
                />
                {errors.name && (
                  <p className="text-destructive text-xs">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Brief description of this template..."
                  rows={2}
                  value={formData.description}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Select
                    onValueChange={(v) => updateField("sportCode", v)}
                    value={formData.sportCode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_OPTIONS.map((sport) => (
                        <SelectItem
                          key={sport.value || "any"}
                          value={sport.value || "any"}
                        >
                          {sport.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <RadioGroup
                    className="flex gap-4"
                    onValueChange={(v) =>
                      updateField(
                        "sourceType",
                        v as TemplateFormData["sourceType"]
                      )
                    }
                    value={formData.sourceType}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="source-csv" value="csv" />
                      <Label className="cursor-pointer" htmlFor="source-csv">
                        CSV
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="source-excel" value="excel" />
                      <Label className="cursor-pointer" htmlFor="source-excel">
                        Excel
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="source-paste" value="paste" />
                      <Label className="cursor-pointer" htmlFor="source-paste">
                        Paste
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {isPlatformStaff && (
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <RadioGroup
                    className="flex gap-4"
                    onValueChange={(v) =>
                      updateField("scope", v as TemplateFormData["scope"])
                    }
                    value={formData.scope}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="scope-platform" value="platform" />
                      <Label
                        className="cursor-pointer"
                        htmlFor="scope-platform"
                      >
                        Platform
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="scope-org" value="organization" />
                      <Label className="cursor-pointer" htmlFor="scope-org">
                        Organization
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Column Mappings */}
        <AccordionItem value="column-mappings">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              Column Mappings
              <Badge className="text-xs" variant="secondary">
                {formData.columnMappings.filter((m) => m.targetField).length}
              </Badge>
              {errors.columnMappings && (
                <Badge className="text-xs" variant="destructive">
                  Error
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {errors.columnMappings && (
                <p className="text-destructive text-xs">
                  {errors.columnMappings}
                </p>
              )}
              {formData.columnMappings.map((mapping, index) => (
                <ColumnMappingRow
                  availableTargetFields={DEFAULT_TARGET_FIELDS}
                  key={`col-${mapping.sourcePattern}-${mapping.targetField}-${index}`}
                  mapping={mapping}
                  onRemove={() => removeColumnMapping(index)}
                  onUpdate={(field, value) =>
                    updateColumnMapping(index, field, value)
                  }
                  usedTargetFields={usedTargetFields}
                />
              ))}
              <Button
                className="w-full"
                onClick={addColumnMapping}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Column Mapping
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Age Group Mappings */}
        <AccordionItem value="age-group-mappings">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              Age Group Mappings
              <Badge className="text-xs" variant="secondary">
                {formData.ageGroupMappings.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <p className="text-muted-foreground text-xs">
                Map source age group values (e.g. &quot;JUVENILE&quot;) to
                target age groups (e.g. &quot;u12&quot;). Optional.
              </p>
              {formData.ageGroupMappings.map((mapping, index) => (
                <div
                  className="flex items-center gap-2"
                  key={`age-${mapping.sourceValue}-${mapping.targetAgeGroup}-${index}`}
                >
                  <Input
                    className="flex-1"
                    onChange={(e) =>
                      updateAgeGroupMapping(
                        index,
                        "sourceValue",
                        e.target.value
                      )
                    }
                    placeholder="Source value (e.g. JUVENILE)"
                    value={mapping.sourceValue}
                  />
                  <ChevronDown className="h-4 w-4 rotate-[-90deg] text-muted-foreground" />
                  <Input
                    className="flex-1"
                    onChange={(e) =>
                      updateAgeGroupMapping(
                        index,
                        "targetAgeGroup",
                        e.target.value
                      )
                    }
                    placeholder="Target (e.g. u12)"
                    value={mapping.targetAgeGroup}
                  />
                  <Button
                    onClick={() => removeAgeGroupMapping(index)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                className="w-full"
                onClick={addAgeGroupMapping}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Age Group Mapping
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Skill Initialization */}
        <AccordionItem value="skill-initialization">
          <AccordionTrigger>Skill Initialization</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              <RadioGroup
                onValueChange={(v) =>
                  updateField("skillInitialization", {
                    ...formData.skillInitialization,
                    strategy: v as SkillInitialization["strategy"],
                  })
                }
                value={formData.skillInitialization.strategy}
              >
                {SKILL_STRATEGIES.map((strategy) => (
                  <div
                    className="flex items-start gap-3 rounded-lg border p-3"
                    key={strategy.value}
                  >
                    <RadioGroupItem
                      className="mt-0.5"
                      id={`skill-${strategy.value}`}
                      value={strategy.value}
                    />
                    <div>
                      <Label
                        className="cursor-pointer font-medium"
                        htmlFor={`skill-${strategy.value}`}
                      >
                        {strategy.label}
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Defaults */}
        <AccordionItem value="defaults">
          <AccordionTrigger>Default Behaviors</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="create-teams">Auto-create Teams</Label>
                  <p className="text-muted-foreground text-xs">
                    Automatically create teams from imported data
                  </p>
                </div>
                <Switch
                  checked={formData.defaults.createTeams}
                  id="create-teams"
                  onCheckedChange={(checked) =>
                    updateField("defaults", {
                      ...formData.defaults,
                      createTeams: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="create-passports">
                    Auto-create Player Passports
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Create player passports for imported players
                  </p>
                </div>
                <Switch
                  checked={formData.defaults.createPassports}
                  id="create-passports"
                  onCheckedChange={(checked) =>
                    updateField("defaults", {
                      ...formData.defaults,
                      createPassports: checked,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-season">Default Season</Label>
                <Input
                  id="default-season"
                  onChange={(e) =>
                    updateField("defaults", {
                      ...formData.defaults,
                      season: e.target.value || undefined,
                    })
                  }
                  placeholder="e.g. 2026"
                  value={formData.defaults.season ?? ""}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button disabled={isSubmitting} onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Column Mapping Row Sub-component
// ============================================================

function ColumnMappingRow({
  mapping,
  availableTargetFields,
  usedTargetFields,
  onUpdate,
  onRemove,
}: {
  mapping: ColumnMapping;
  availableTargetFields: FieldDefinition[];
  usedTargetFields: Set<string>;
  onUpdate: (field: keyof ColumnMapping, value: unknown) => void;
  onRemove: () => void;
}) {
  const [showAliases, setShowAliases] = useState(false);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {/* Row 1: Source + Target + controls — stacks on mobile */}
      <div className="flex items-center gap-2">
        <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_180px]">
          <Input
            onChange={(e) => onUpdate("sourcePattern", e.target.value)}
            placeholder="Source column (e.g. Forename)"
            value={mapping.sourcePattern}
          />
          <Select
            onValueChange={(v) => onUpdate("targetField", v)}
            value={mapping.targetField}
          >
            <SelectTrigger>
              <SelectValue placeholder="Target field" />
            </SelectTrigger>
            <SelectContent>
              {availableTargetFields.map((field) => {
                const isUsed =
                  usedTargetFields.has(field.name) &&
                  field.name !== mapping.targetField;
                return (
                  <SelectItem
                    disabled={isUsed}
                    key={field.name}
                    value={field.name}
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={mapping.required}
            onCheckedChange={(checked) => onUpdate("required", checked)}
          />
          <span className="text-muted-foreground text-xs">Req</span>
        </div>
        <Button
          className="shrink-0"
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 2: Transform + Aliases toggle */}
      <div className="flex items-center gap-2 sm:pl-6">
        <Select
          onValueChange={(v) => onUpdate("transform", v || undefined)}
          value={mapping.transform ?? ""}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Transform" />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORM_OPTIONS.map((t) => (
              <SelectItem key={t.value || "none"} value={t.value || "none"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="text-xs"
          onClick={() => setShowAliases(!showAliases)}
          size="sm"
          variant="ghost"
        >
          {showAliases ? "Hide" : "Show"} Aliases
        </Button>
      </div>

      {showAliases && (
        <div className="sm:pl-6">
          <Input
            onChange={(e) =>
              onUpdate(
                "aliases",
                e.target.value
                  ? e.target.value.split(",").map((a) => a.trim())
                  : undefined
              )
            }
            placeholder="Comma-separated aliases (e.g. first name, fname)"
            value={mapping.aliases?.join(", ") ?? ""}
          />
        </div>
      )}
    </div>
  );
}
