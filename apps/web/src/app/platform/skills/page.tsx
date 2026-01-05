"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  FileJson,
  FolderOpen,
  Layers,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { BulkImportDialog } from "./bulk-import-dialog";
import { DeleteSportDialog } from "./delete-sport-dialog";
import { EditSportDialog } from "./edit-sport-dialog";

// Types
interface Sport {
  _id: Id<"sports">;
  _creationTime: number;
  code: string;
  name: string;
  governingBody?: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
}

interface SkillCategory {
  _id: Id<"skillCategories">;
  _creationTime: number;
  sportCode: string;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
}

interface SkillDefinition {
  _id: Id<"skillDefinitions">;
  _creationTime: number;
  categoryId: Id<"skillCategories">;
  sportCode: string;
  code: string;
  name: string;
  description?: string;
  level1Descriptor?: string;
  level2Descriptor?: string;
  level3Descriptor?: string;
  level4Descriptor?: string;
  level5Descriptor?: string;
  ageGroupRelevance?: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
}

// Add Sport Dialog
function AddSportDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    code: string;
    name: string;
    governingBody?: string;
    description?: string;
  }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [governingBody, setGoverningBody] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!(code.trim() && name.trim())) {
      toast.error("Code and name are required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        code: code.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        governingBody: governingBody.trim() || undefined,
        description: description.trim() || undefined,
      });
      setCode("");
      setName("");
      setGoverningBody("");
      setDescription("");
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create sport";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Sport</DialogTitle>
          <DialogDescription>
            Create a new sport that organizations can use for player development
            tracking.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sport-code">Code (unique identifier)</Label>
            <Input
              id="sport-code"
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., hurling, basketball"
              value={code}
            />
            <p className="text-muted-foreground text-xs">
              Will be converted to lowercase with underscores
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sport-name">Display Name</Label>
            <Input
              id="sport-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Hurling, Basketball"
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sport-governing-body">
              Governing Body (optional)
            </Label>
            <Input
              id="sport-governing-body"
              onChange={(e) => setGoverningBody(e.target.value)}
              placeholder="e.g., GAA, Basketball Ireland"
              value={governingBody}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sport-description">Description (optional)</Label>
            <Textarea
              id="sport-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the sport"
              value={description}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "Creating..." : "Create Sport"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Category Dialog
function AddCategoryDialog({
  open,
  onOpenChange,
  sportCode,
  existingCategories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportCode: string;
  existingCategories: SkillCategory[];
  onSave: (data: {
    sportCode: string;
    code: string;
    name: string;
    description?: string;
    sortOrder: number;
  }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const nextSortOrder =
    Math.max(0, ...existingCategories.map((c) => c.sortOrder)) + 1;

  const handleSave = async () => {
    if (!(code.trim() && name.trim())) {
      toast.error("Code and name are required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        sportCode,
        code: code.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder: nextSortOrder,
      });
      setCode("");
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create category";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill Category</DialogTitle>
          <DialogDescription>
            Create a new category to group related skills together.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category-code">Code</Label>
            <Input
              id="category-code"
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., ball_mastery, shooting"
              value={code}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Display Name</Label>
            <Input
              id="category-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ball Mastery, Shooting & Finishing"
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-description">Description (optional)</Label>
            <Textarea
              id="category-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this skill category"
              value={description}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "Creating..." : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Skill Dialog
function AddSkillDialog({
  open,
  onOpenChange,
  categoryId,
  existingSkills,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: Id<"skillCategories">;
  existingSkills: SkillDefinition[];
  onSave: (data: {
    categoryId: Id<"skillCategories">;
    code: string;
    name: string;
    description?: string;
    sortOrder: number;
  }) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const categorySkills = existingSkills.filter(
    (s) => s.categoryId === categoryId
  );
  const nextSortOrder =
    Math.max(0, ...categorySkills.map((s) => s.sortOrder)) + 1;

  const handleSave = async () => {
    if (!(code.trim() && name.trim())) {
      toast.error("Code and name are required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        categoryId,
        code: code.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder: nextSortOrder,
      });
      setCode("");
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create skill";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill Definition</DialogTitle>
          <DialogDescription>
            Create a new skill that players can be assessed on.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="skill-code">Code</Label>
            <Input
              id="skill-code"
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., dribbling, first_touch"
              value={code}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skill-name">Display Name</Label>
            <Input
              id="skill-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dribbling, First Touch"
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skill-description">Description (optional)</Label>
            <Textarea
              id="skill-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this skill measures"
              value={description}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "Creating..." : "Create Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Import Skills Dialog
function ImportSkillsDialog({
  open,
  onOpenChange,
  sportCode,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportCode: string;
  onImport: (data: {
    sportCode: string;
    categories: Array<{
      code: string;
      name: string;
      description?: string;
      sortOrder: number;
      skills: Array<{
        code: string;
        name: string;
        description?: string;
        sortOrder: number;
      }>;
    }>;
    replaceExisting?: boolean;
  }) => Promise<void>;
}) {
  const [jsonInput, setJsonInput] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleImport = async () => {
    setParseError(null);

    try {
      const parsed = JSON.parse(jsonInput);

      // Validate structure
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of categories");
      }

      for (const cat of parsed) {
        if (!(cat.code && cat.name)) {
          throw new Error("Each category must have code and name");
        }
        if (!Array.isArray(cat.skills)) {
          throw new Error(`Category "${cat.name}" must have a skills array`);
        }
        for (const skill of cat.skills) {
          if (!(skill.code && skill.name)) {
            throw new Error(`Skills in "${cat.name}" must have code and name`);
          }
        }
      }

      setImporting(true);
      await onImport({
        sportCode,
        categories: parsed.map(
          (
            cat: {
              code: string;
              name: string;
              description?: string;
              sortOrder?: number;
              skills: Array<{
                code: string;
                name: string;
                description?: string;
                sortOrder?: number;
              }>;
            },
            catIdx: number
          ) => ({
            code: cat.code,
            name: cat.name,
            description: cat.description,
            sortOrder: cat.sortOrder ?? catIdx + 1,
            skills: cat.skills.map(
              (
                skill: {
                  code: string;
                  name: string;
                  description?: string;
                  sortOrder?: number;
                },
                skillIdx: number
              ) => ({
                code: skill.code,
                name: skill.name,
                description: skill.description,
                sortOrder: skill.sortOrder ?? skillIdx + 1,
              })
            ),
          })
        ),
        replaceExisting,
      });
      setJsonInput("");
      setReplaceExisting(false);
      onOpenChange(false);
      toast.success("Skills imported successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Invalid JSON format";
      setParseError(message);
    } finally {
      setImporting(false);
    }
  };

  const exampleJson = `[
  {
    "code": "ball_mastery",
    "name": "Ball Mastery",
    "skills": [
      { "code": "dribbling", "name": "Dribbling" },
      { "code": "first_touch", "name": "First Touch" }
    ]
  }
]`;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Skills from JSON</DialogTitle>
          <DialogDescription>
            Paste a JSON structure to bulk import categories and skills. This is
            useful for importing skills from governing body standards.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="json-input">JSON Data</Label>
            <Textarea
              className="min-h-[200px] font-mono text-sm"
              id="json-input"
              onChange={(e) => {
                setJsonInput(e.target.value);
                setParseError(null);
              }}
              placeholder={exampleJson}
              value={jsonInput}
            />
            {parseError && (
              <p className="text-destructive text-sm">{parseError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              checked={replaceExisting}
              className="h-4 w-4"
              id="replace-existing"
              onChange={(e) => setReplaceExisting(e.target.checked)}
              type="checkbox"
            />
            <Label className="font-normal" htmlFor="replace-existing">
              Update existing categories and skills (otherwise skip duplicates)
            </Label>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="mb-2 font-medium text-sm">Expected Format:</p>
            <pre className="overflow-x-auto text-muted-foreground text-xs">
              {exampleJson}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={importing}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={importing || !jsonInput.trim()}
            onClick={handleImport}
          >
            {importing ? "Importing..." : "Import Skills"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Benchmark Type
interface Benchmark {
  _id: Id<"skillBenchmarks">;
  _creationTime: number;
  sportCode: string;
  skillCode: string;
  ageGroup: string;
  gender: "male" | "female" | "all";
  level: "recreational" | "competitive" | "development" | "elite";
  expectedRating: number;
  minAcceptable: number;
  developingThreshold: number;
  excellentThreshold: number;
  percentile25?: number;
  percentile50?: number;
  percentile75?: number;
  percentile90?: number;
  source: string;
  sourceDocument?: string;
  sourceUrl?: string;
  sourceYear: number;
  validFrom?: string;
  validTo?: string;
  notes?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Import Benchmarks Dialog
function ImportBenchmarksDialog({
  open,
  onOpenChange,
  sportCode,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportCode: string;
  onImport: (data: {
    source: string;
    sourceYear: number;
    sourceDocument?: string;
    benchmarks: Array<{
      sportCode: string;
      skillCode: string;
      ageGroup: string;
      gender: "male" | "female" | "all";
      level: "recreational" | "competitive" | "development" | "elite";
      expectedRating: number;
      minAcceptable: number;
      developingThreshold: number;
      excellentThreshold: number;
      notes?: string;
    }>;
  }) => Promise<{ created: number; skipped: number; errors: string[] }>;
}) {
  const [jsonInput, setJsonInput] = useState("");
  const [source, setSource] = useState("");
  const [sourceYear, setSourceYear] = useState(new Date().getFullYear());
  const [sourceDocument, setSourceDocument] = useState("");
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleImport = async () => {
    setParseError(null);

    if (!source.trim()) {
      setParseError("Source is required (e.g., FAI, GAA)");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);

      // Validate structure
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of benchmarks");
      }

      for (const b of parsed) {
        if (!(b.skillCode && b.ageGroup)) {
          throw new Error("Each benchmark must have skillCode and ageGroup");
        }
        if (b.expectedRating === undefined) {
          throw new Error(
            `Benchmark for ${b.skillCode}/${b.ageGroup} must have expectedRating`
          );
        }
      }

      setImporting(true);
      const result = await onImport({
        source: source.trim(),
        sourceYear,
        sourceDocument: sourceDocument.trim() || undefined,
        benchmarks: parsed.map(
          (b: {
            skillCode: string;
            ageGroup: string;
            gender?: "male" | "female" | "all";
            level?: "recreational" | "competitive" | "development" | "elite";
            expectedRating: number;
            minAcceptable?: number;
            developingThreshold?: number;
            excellentThreshold?: number;
            notes?: string;
          }) => ({
            sportCode,
            skillCode: b.skillCode,
            ageGroup: b.ageGroup,
            gender: b.gender || "all",
            level: b.level || "recreational",
            expectedRating: b.expectedRating,
            minAcceptable: b.minAcceptable ?? b.expectedRating - 1,
            developingThreshold:
              b.developingThreshold ?? b.expectedRating - 0.5,
            excellentThreshold: b.excellentThreshold ?? b.expectedRating + 0.5,
            notes: b.notes,
          })
        ),
      });

      setJsonInput("");
      setSource("");
      setSourceDocument("");
      onOpenChange(false);
      toast.success(
        `Imported ${result.created} benchmarks (${result.skipped} skipped)${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Invalid JSON format";
      setParseError(message);
    } finally {
      setImporting(false);
    }
  };

  const exampleJson = `[
  {
    "skillCode": "dribbling",
    "ageGroup": "u10",
    "expectedRating": 2.5,
    "gender": "all",
    "level": "recreational"
  },
  {
    "skillCode": "dribbling",
    "ageGroup": "u12",
    "expectedRating": 3.0
  }
]`;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Benchmarks from JSON</DialogTitle>
          <DialogDescription>
            Import benchmark data from governing body standards. Thresholds will
            be auto-calculated if not provided.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="benchmark-source">Source (required)</Label>
              <Input
                id="benchmark-source"
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., FAI, GAA, IRFU"
                value={source}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="benchmark-year">Source Year</Label>
              <Input
                id="benchmark-year"
                onChange={(e) => setSourceYear(Number(e.target.value))}
                type="number"
                value={sourceYear}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="benchmark-doc">Source Document (optional)</Label>
            <Input
              id="benchmark-doc"
              onChange={(e) => setSourceDocument(e.target.value)}
              placeholder="e.g., Youth Development Pathway 2024"
              value={sourceDocument}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="benchmark-json">Benchmark Data (JSON)</Label>
            <Textarea
              className="min-h-[200px] font-mono text-sm"
              id="benchmark-json"
              onChange={(e) => {
                setJsonInput(e.target.value);
                setParseError(null);
              }}
              placeholder={exampleJson}
              value={jsonInput}
            />
            {parseError && (
              <p className="text-destructive text-sm">{parseError}</p>
            )}
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="mb-2 font-medium text-sm">Expected Format:</p>
            <pre className="overflow-x-auto text-muted-foreground text-xs">
              {exampleJson}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={importing}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={importing || !jsonInput.trim() || !source.trim()}
            onClick={handleImport}
          >
            {importing ? "Importing..." : "Import Benchmarks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Benchmarks Section Component
function BenchmarksSection({ sports }: { sports: Sport[] }) {
  const [selectedSportCode, setSelectedSportCode] = useState<string | null>(
    null
  );
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Queries
  const benchmarks = useQuery(
    api.models.skillBenchmarks.getBenchmarksForSport,
    selectedSportCode
      ? { sportCode: selectedSportCode, activeOnly: false }
      : "skip"
  );
  const skills = useQuery(
    api.models.referenceData.getAllSkillsAdmin,
    selectedSportCode ? { sportCode: selectedSportCode } : "skip"
  );
  const ageGroups = useQuery(api.models.referenceData.getAgeGroups);

  // Mutations
  const importBenchmarks = useMutation(
    api.models.skillBenchmarks.bulkImportBenchmarks
  );
  const deactivateBenchmark = useMutation(
    api.models.skillBenchmarks.deactivateBenchmark
  );

  // Group benchmarks by skill code
  const benchmarksBySkill = useMemo(() => {
    if (!benchmarks) return new Map<string, Benchmark[]>();
    const map = new Map<string, Benchmark[]>();
    for (const b of benchmarks) {
      const existing = map.get(b.skillCode) ?? [];
      existing.push(b as Benchmark);
      map.set(b.skillCode, existing);
    }
    return map;
  }, [benchmarks]);

  // Create skill lookup
  const skillLookup = useMemo(() => {
    if (!skills) return new Map<string, string>();
    return new Map(skills.map((s) => [s.code, s.name]));
  }, [skills]);

  const handleImport = async (data: {
    source: string;
    sourceYear: number;
    sourceDocument?: string;
    benchmarks: Array<{
      sportCode: string;
      skillCode: string;
      ageGroup: string;
      gender: "male" | "female" | "all";
      level: "recreational" | "competitive" | "development" | "elite";
      expectedRating: number;
      minAcceptable: number;
      developingThreshold: number;
      excellentThreshold: number;
      notes?: string;
    }>;
  }) => await importBenchmarks(data);

  const handleDeactivate = async (benchmarkId: Id<"skillBenchmarks">) => {
    await deactivateBenchmark({ benchmarkId });
    toast.success("Benchmark deactivated");
  };

  const activeSports = sports.filter((s) => s.isActive);

  return (
    <div className="mt-8 rounded-lg bg-white p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-purple-100 p-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
              Skill Benchmarks
            </h2>
            <p className="mt-1 text-muted-foreground">
              Define expected skill ratings by age group and level
            </p>
          </div>
        </div>
      </div>

      {/* Sport Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {activeSports.map((sport) => (
          <Button
            key={sport._id}
            onClick={() =>
              setSelectedSportCode(
                selectedSportCode === sport.code ? null : sport.code
              )
            }
            variant={selectedSportCode === sport.code ? "default" : "outline"}
          >
            {sport.name}
          </Button>
        ))}
      </div>

      {/* Benchmarks Content */}
      {selectedSportCode ? (
        <div>
          {/* Actions */}
          <div className="mb-4 flex gap-2">
            <Button onClick={() => setShowImportDialog(true)} variant="outline">
              <FileJson className="mr-2 h-4 w-4" />
              Import Benchmarks
            </Button>
          </div>

          {/* Benchmarks List */}
          {benchmarks === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : benchmarks.length > 0 ? (
            <div className="space-y-4">
              {Array.from(benchmarksBySkill.entries()).map(
                ([skillCode, skillBenchmarks]) => (
                  <Card key={skillCode}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Award className="h-4 w-4 text-amber-500" />
                        {skillLookup.get(skillCode) ?? skillCode}
                        <Badge variant="secondary">
                          {skillBenchmarks.filter((b) => b.isActive).length}{" "}
                          active
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="pr-4 pb-2">Age Group</th>
                              <th className="pr-4 pb-2">Level</th>
                              <th className="pr-4 pb-2">Gender</th>
                              <th className="pr-4 pb-2">Expected</th>
                              <th className="pr-4 pb-2">Range</th>
                              <th className="pr-4 pb-2">Source</th>
                              <th className="pb-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skillBenchmarks
                              .sort((a, b) => {
                                // Sort by age group code, then level
                                const ageA =
                                  ageGroups?.find(
                                    (ag) => ag.code === a.ageGroup
                                  )?.sortOrder ?? 0;
                                const ageB =
                                  ageGroups?.find(
                                    (ag) => ag.code === b.ageGroup
                                  )?.sortOrder ?? 0;
                                if (ageA !== ageB) return ageA - ageB;
                                return a.level.localeCompare(b.level);
                              })
                              .map((b) => (
                                <tr
                                  className={`border-b last:border-0 ${b.isActive ? "" : "opacity-50"}`}
                                  key={b._id}
                                >
                                  <td className="py-2 pr-4">
                                    {ageGroups?.find(
                                      (ag) => ag.code === b.ageGroup
                                    )?.name ?? b.ageGroup}
                                  </td>
                                  <td className="py-2 pr-4 capitalize">
                                    {b.level}
                                  </td>
                                  <td className="py-2 pr-4 capitalize">
                                    {b.gender}
                                  </td>
                                  <td className="py-2 pr-4 font-medium">
                                    {b.expectedRating.toFixed(1)}
                                  </td>
                                  <td className="py-2 pr-4 text-muted-foreground">
                                    {b.minAcceptable.toFixed(1)} -{" "}
                                    {b.excellentThreshold.toFixed(1)}
                                  </td>
                                  <td className="py-2 pr-4 text-muted-foreground">
                                    {b.source} ({b.sourceYear})
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-2">
                                      {b.isActive ? (
                                        <Badge
                                          className="bg-green-100 text-green-700"
                                          variant="secondary"
                                        >
                                          Active
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary">
                                          Inactive
                                        </Badge>
                                      )}
                                      {b.isActive && (
                                        <Button
                                          className="h-6 w-6 text-orange-500"
                                          onClick={() =>
                                            handleDeactivate(b._id)
                                          }
                                          size="icon"
                                          title="Deactivate"
                                          variant="ghost"
                                        >
                                          <PowerOff className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-purple-100 p-4">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">
                  No Benchmarks Yet
                </h3>
                <p className="mb-4 max-w-sm text-muted-foreground">
                  Import benchmarks from governing body standards to define
                  expected skill ratings by age group.
                </p>
                <Button onClick={() => setShowImportDialog(true)}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Import Benchmarks
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Import Dialog */}
          {showImportDialog && (
            <ImportBenchmarksDialog
              onImport={handleImport}
              onOpenChange={(open) => !open && setShowImportDialog(false)}
              open={true}
              sportCode={selectedSportCode}
            />
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 font-semibold text-lg">Select a Sport</h3>
            <p className="max-w-sm text-muted-foreground">
              Choose a sport above to view and manage its skill benchmarks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Sport Card with expandable skills - NOW FETCHES ITS OWN DATA
function SportCard({
  sport,
  usageStats,
  onToggleActive,
  onAddCategory,
  onAddSkill,
  onToggleCategoryActive,
  onToggleSkillActive,
  onImportSkills,
  onEditSport,
  onDeleteSport,
  onDeleteCategory,
  onDeleteSkill,
}: {
  sport: Sport;
  usageStats?: { orgCount: number; passportCount: number };
  onToggleActive: (sportId: Id<"sports">, currentActive: boolean) => void;
  onAddCategory: (sportCode: string, categories: SkillCategory[]) => void;
  onAddSkill: (
    categoryId: Id<"skillCategories">,
    skills: SkillDefinition[]
  ) => void;
  onToggleCategoryActive: (
    categoryId: Id<"skillCategories">,
    currentActive: boolean
  ) => void;
  onToggleSkillActive: (
    skillId: Id<"skillDefinitions">,
    currentActive: boolean
  ) => void;
  onImportSkills: (sportCode: string) => void;
  onEditSport: (sport: Sport) => void;
  onDeleteSport: (sportId: Id<"sports">) => void;
  onDeleteCategory: (
    categoryId: Id<"skillCategories">,
    categoryName: string
  ) => void;
  onDeleteSkill: (skillId: Id<"skillDefinitions">, skillName: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Each card fetches its own categories and skills
  const categories = useQuery(api.models.referenceData.getAllCategoriesAdmin, {
    sportCode: sport.code,
  });
  const skills = useQuery(api.models.referenceData.getAllSkillsAdmin, {
    sportCode: sport.code,
  });

  const sportCategories = (categories ?? []).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  const sportSkills = skills ?? [];

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const activeCategories = sportCategories.filter((c) => c.isActive).length;
  const activeSkills = sportSkills.filter((s) => s.isActive).length;
  const isLoading = categories === undefined || skills === undefined;

  return (
    <Card
      className={`transition-all ${sport.isActive ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-gray-200 bg-gray-50 opacity-75"}`}
    >
      <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${sport.isActive ? "bg-emerald-100" : "bg-gray-100"}`}
              >
                <Target
                  className={`h-6 w-6 ${sport.isActive ? "text-emerald-600" : "text-gray-400"}`}
                />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {sport.name}
                  {!sport.isActive && (
                    <Badge className="text-xs" variant="secondary">
                      Inactive
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="font-mono text-xs">{sport.code}</span>
                  {sport.governingBody && (
                    <>
                      <span className="text-muted-foreground">|</span>
                      <span>{sport.governingBody}</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="ghost">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  <span>
                    {activeCategories}/{sportCategories.length} categories
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {activeSkills}/{sportSkills.length} skills
                  </span>
                </div>
              </>
            )}
            {/* Org usage stats */}
            {usageStats && (
              <>
                <div className="flex items-center gap-1 text-blue-600">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {usageStats.orgCount} org
                    {usageStats.orgCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-purple-600">
                  <Users className="h-4 w-4" />
                  <span>
                    {usageStats.passportCount} passport
                    {usageStats.passportCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="border-t pt-4">
            {/* Action buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                onClick={() => onEditSport(sport)}
                size="sm"
                variant="outline"
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit Sport
              </Button>
              <Button
                onClick={() => onAddCategory(sport.code, sportCategories)}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Category
              </Button>
              <Button
                onClick={() => onImportSkills(sport.code)}
                size="sm"
                variant="outline"
              >
                <FileJson className="mr-1 h-3 w-3" />
                Import Skills
              </Button>
              <Button
                className={
                  sport.isActive
                    ? "text-orange-600 hover:bg-orange-50"
                    : "text-green-600 hover:bg-green-50"
                }
                onClick={() => onToggleActive(sport._id, sport.isActive)}
                size="sm"
                variant="ghost"
              >
                {sport.isActive ? (
                  <>
                    <PowerOff className="mr-1 h-3 w-3" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="mr-1 h-3 w-3" />
                    Activate
                  </>
                )}
              </Button>
              <Button
                className="text-red-600 hover:bg-red-50"
                onClick={() => onDeleteSport(sport._id)}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </div>

            {/* Categories */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sportCategories.length > 0 ? (
              <div className="space-y-2">
                {sportCategories.map((category) => {
                  const categorySkills = sportSkills
                    .filter((s) => s.categoryId === category._id)
                    .sort((a, b) => a.sortOrder - b.sortOrder);
                  const isOpen = expandedCategories.has(category._id);

                  return (
                    <Collapsible
                      key={category._id}
                      onOpenChange={() => toggleCategory(category._id)}
                      open={isOpen}
                    >
                      <div
                        className={`rounded-md border ${category.isActive ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50"}`}
                      >
                        <div className="flex items-center justify-between p-3">
                          <CollapsibleTrigger asChild>
                            <button className="flex flex-1 items-center gap-2 text-left">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Layers
                                className={`h-4 w-4 ${category.isActive ? "text-blue-500" : "text-gray-400"}`}
                              />
                              <span
                                className={`font-medium ${category.isActive ? "" : "text-gray-500"}`}
                              >
                                {category.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                ({categorySkills.length} skills)
                              </span>
                              {!category.isActive && (
                                <Badge className="text-xs" variant="secondary">
                                  Inactive
                                </Badge>
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() =>
                                onAddSkill(category._id, sportSkills)
                              }
                              size="sm"
                              title="Add skill to this category"
                              variant="ghost"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              className={
                                category.isActive
                                  ? "text-orange-500"
                                  : "text-green-500"
                              }
                              onClick={() =>
                                onToggleCategoryActive(
                                  category._id,
                                  category.isActive
                                )
                              }
                              size="sm"
                              title={
                                category.isActive ? "Deactivate" : "Activate"
                              }
                              variant="ghost"
                            >
                              {category.isActive ? (
                                <PowerOff className="h-3 w-3" />
                              ) : (
                                <Power className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              className="text-red-600"
                              onClick={() =>
                                onDeleteCategory(category._id, category.name)
                              }
                              size="sm"
                              title="Delete category and all skills"
                              variant="ghost"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="border-t bg-gray-50/50 p-3">
                            {categorySkills.length > 0 ? (
                              <div className="space-y-1">
                                {categorySkills.map((skill) => (
                                  <div
                                    className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${skill.isActive ? "bg-white" : "bg-gray-100 text-gray-500"}`}
                                    key={skill._id}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Award
                                        className={`h-3 w-3 ${skill.isActive ? "text-amber-500" : "text-gray-400"}`}
                                      />
                                      <span>{skill.name}</span>
                                      <span className="font-mono text-muted-foreground text-xs">
                                        {skill.code}
                                      </span>
                                      {!skill.isActive && (
                                        <Badge
                                          className="text-xs"
                                          variant="secondary"
                                        >
                                          Inactive
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        className={
                                          skill.isActive
                                            ? "text-orange-500"
                                            : "text-green-500"
                                        }
                                        onClick={() =>
                                          onToggleSkillActive(
                                            skill._id,
                                            skill.isActive
                                          )
                                        }
                                        size="sm"
                                        title={
                                          skill.isActive
                                            ? "Deactivate"
                                            : "Activate"
                                        }
                                        variant="ghost"
                                      >
                                        {skill.isActive ? (
                                          <PowerOff className="h-3 w-3" />
                                        ) : (
                                          <Power className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        className="text-red-600"
                                        onClick={() =>
                                          onDeleteSkill(skill._id, skill.name)
                                        }
                                        size="sm"
                                        title="Delete skill"
                                        variant="ghost"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="py-2 text-center text-muted-foreground text-sm">
                                No skills in this category yet
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center">
                <FolderOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  No skill categories yet
                </p>
                <Button
                  className="mt-2"
                  onClick={() => onAddCategory(sport.code, [])}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add First Category
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Main component
export default function SportsManagement() {
  // Queries
  const sports = useQuery(api.models.referenceData.getAllSportsAdmin);
  const usageStats = useQuery(api.models.referenceData.getSportUsageStats);

  // Create a map for quick lookup of usage stats by sport code
  const usageStatsMap = useMemo(() => {
    if (!usageStats)
      return new Map<string, { orgCount: number; passportCount: number }>();
    return new Map(
      usageStats.map((s) => [
        s.sportCode,
        { orgCount: s.orgCount, passportCount: s.passportCount },
      ])
    );
  }, [usageStats]);

  // Mutations
  const createSport = useMutation(api.models.referenceData.createSport);
  const deactivateSport = useMutation(api.models.referenceData.deactivateSport);
  const reactivateSport = useMutation(api.models.referenceData.reactivateSport);
  const createCategory = useMutation(
    api.models.referenceData.createSkillCategory
  );
  const deactivateCategory = useMutation(
    api.models.referenceData.deactivateSkillCategory
  );
  const createSkill = useMutation(
    api.models.referenceData.createSkillDefinition
  );
  const deactivateSkill = useMutation(
    api.models.referenceData.deactivateSkillDefinition
  );
  const importSkills = useMutation(
    api.models.referenceData.importSkillsForSport
  );
  const deleteCategory = useMutation(
    api.models.referenceData.deleteSkillCategory
  );
  const deleteSkill = useMutation(
    api.models.referenceData.deleteSkillDefinition
  );

  // Dialog states
  const [showAddSport, setShowAddSport] = useState(false);
  const [addCategoryForSport, setAddCategoryForSport] = useState<{
    sportCode: string;
    categories: SkillCategory[];
  } | null>(null);
  const [addSkillForCategory, setAddSkillForCategory] = useState<{
    categoryId: Id<"skillCategories">;
    skills: SkillDefinition[];
  } | null>(null);
  const [importSkillsForSport, setImportSkillsForSport] = useState<
    string | null
  >(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editSport, setEditSport] = useState<Sport | null>(null);
  const [deleteSport, setDeleteSport] = useState<Id<"sports"> | null>(null);

  // Stats
  const stats = useMemo(() => {
    if (!sports) return { total: 0, active: 0 };
    return {
      total: sports.length,
      active: sports.filter((s) => s.isActive).length,
    };
  }, [sports]);

  // Handlers
  const handleCreateSport = async (data: {
    code: string;
    name: string;
    governingBody?: string;
    description?: string;
  }) => {
    await createSport(data);
    toast.success(`Sport "${data.name}" created`);
  };

  const handleToggleSportActive = async (
    sportId: Id<"sports">,
    currentActive: boolean
  ) => {
    if (currentActive) {
      await deactivateSport({ sportId });
      toast.success("Sport deactivated");
    } else {
      await reactivateSport({ sportId });
      toast.success("Sport activated");
    }
  };

  const handleCreateCategory = async (data: {
    sportCode: string;
    code: string;
    name: string;
    description?: string;
    sortOrder: number;
  }) => {
    await createCategory(data);
    toast.success(`Category "${data.name}" created`);
  };

  const handleToggleCategoryActive = async (
    categoryId: Id<"skillCategories">,
    currentActive: boolean
  ) => {
    if (currentActive) {
      await deactivateCategory({ categoryId });
      toast.success("Category deactivated");
    } else {
      toast.error("Reactivate not implemented yet");
    }
  };

  const handleCreateSkill = async (data: {
    categoryId: Id<"skillCategories">;
    code: string;
    name: string;
    description?: string;
    sortOrder: number;
  }) => {
    await createSkill(data);
    toast.success(`Skill "${data.name}" created`);
  };

  const handleToggleSkillActive = async (
    skillId: Id<"skillDefinitions">,
    currentActive: boolean
  ) => {
    if (currentActive) {
      await deactivateSkill({ skillId });
      toast.success("Skill deactivated");
    } else {
      toast.error("Reactivate not implemented yet");
    }
  };

  const handleDeleteCategory = async (
    categoryId: Id<"skillCategories">,
    categoryName: string
  ) => {
    if (
      window.confirm(
        `Are you sure you want to delete the category "${categoryName}" and all its skills? This action cannot be undone.`
      )
    ) {
      try {
        const result = await deleteCategory({ categoryId });
        toast.success(
          `Category deleted. ${result.skillsDeleted} skill(s) also deleted.`
        );
      } catch (error) {
        toast.error(`Failed to delete category: ${error}`);
      }
    }
  };

  const handleDeleteSkill = async (
    skillId: Id<"skillDefinitions">,
    skillName: string
  ) => {
    if (
      window.confirm(
        `Are you sure you want to delete the skill "${skillName}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteSkill({ skillId });
        toast.success("Skill deleted successfully");
      } catch (error) {
        toast.error(`Failed to delete skill: ${error}`);
      }
    }
  };

  const handleImportSkills = async (data: {
    sportCode: string;
    categories: Array<{
      code: string;
      name: string;
      description?: string;
      sortOrder: number;
      skills: Array<{
        code: string;
        name: string;
        description?: string;
        sortOrder: number;
      }>;
    }>;
    replaceExisting?: boolean;
  }) => {
    const result = await importSkills(data);
    toast.success(
      `Imported ${result.categoriesCreated} categories and ${result.skillsCreated} skills`
    );
  };

  if (sports === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-6">
              <Skeleton className="mb-2 h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/platform">
                  <Button size="icon" variant="ghost">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="rounded-full bg-emerald-100 p-2">
                  <Target className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                    Sports & Skills Management
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    Manage sports, skill categories, and skill definitions
                    across the platform
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-full bg-emerald-100 p-2">
                      <Target className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-emerald-700">
                        {stats.active}
                      </p>
                      <p className="text-emerald-600 text-xs">Active Sports</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-full bg-gray-100 p-2">
                      <Sparkles className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-2xl text-gray-700">
                        {stats.total}
                      </p>
                      <p className="text-gray-600 text-xs">Total Sports</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex gap-2">
            <Button onClick={() => setShowBulkImport(true)} variant="outline">
              <FileJson className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowAddSport(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Sport
            </Button>
          </div>

          {/* Sports Grid */}
          {sports.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sports.map((sport) => (
                <SportCard
                  key={sport._id}
                  onAddCategory={(sportCode, categories) => {
                    setAddCategoryForSport({ sportCode, categories });
                  }}
                  onAddSkill={(categoryId, skills) => {
                    setAddSkillForCategory({ categoryId, skills });
                  }}
                  onDeleteCategory={handleDeleteCategory}
                  onDeleteSkill={handleDeleteSkill}
                  onDeleteSport={(sportId) => {
                    setDeleteSport(sportId);
                  }}
                  onEditSport={(sport) => {
                    setEditSport(sport);
                  }}
                  onImportSkills={(sportCode) => {
                    setImportSkillsForSport(sportCode);
                  }}
                  onToggleActive={handleToggleSportActive}
                  onToggleCategoryActive={handleToggleCategoryActive}
                  onToggleSkillActive={handleToggleSkillActive}
                  sport={sport}
                  usageStats={usageStatsMap.get(sport.code)}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-emerald-100 p-4">
                  <Target className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">No Sports Yet</h3>
                <p className="mb-4 max-w-sm text-muted-foreground">
                  Create your first sport to start defining skills that
                  organizations can use for player development tracking.
                </p>
                <Button onClick={() => setShowAddSport(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Sport
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Dialogs */}
          <AddSportDialog
            onOpenChange={setShowAddSport}
            onSave={handleCreateSport}
            open={showAddSport}
          />

          {addCategoryForSport && (
            <AddCategoryDialog
              existingCategories={addCategoryForSport.categories}
              onOpenChange={(open) => !open && setAddCategoryForSport(null)}
              onSave={handleCreateCategory}
              open={true}
              sportCode={addCategoryForSport.sportCode}
            />
          )}

          {addSkillForCategory && (
            <AddSkillDialog
              categoryId={addSkillForCategory.categoryId}
              existingSkills={addSkillForCategory.skills}
              onOpenChange={(open) => !open && setAddSkillForCategory(null)}
              onSave={handleCreateSkill}
              open={true}
            />
          )}

          {importSkillsForSport && (
            <ImportSkillsDialog
              onImport={handleImportSkills}
              onOpenChange={(open) => !open && setImportSkillsForSport(null)}
              open={true}
              sportCode={importSkillsForSport}
            />
          )}

          <BulkImportDialog
            onOpenChange={setShowBulkImport}
            onSuccess={() => {
              toast.success("Skills imported successfully!");
            }}
            open={showBulkImport}
          />

          <EditSportDialog
            initialData={
              editSport
                ? {
                    code: editSport.code,
                    name: editSport.name,
                    description: editSport.description,
                    governingBody: editSport.governingBody,
                  }
                : undefined
            }
            onOpenChange={(open) => {
              if (!open) setEditSport(null);
            }}
            onSuccess={() => {
              toast.success("Sport updated successfully!");
              setEditSport(null);
            }}
            open={editSport !== null}
            sportId={editSport?._id ?? null}
          />

          <DeleteSportDialog
            onOpenChange={(open) => {
              if (!open) setDeleteSport(null);
            }}
            onSuccess={() => {
              toast.success("Sport deleted successfully!");
              setDeleteSport(null);
            }}
            open={deleteSport !== null}
            sportId={deleteSport}
          />

          {/* Benchmarks Section */}
          <BenchmarksSection sports={sports} />
        </div>
      </div>
    </div>
  );
}
