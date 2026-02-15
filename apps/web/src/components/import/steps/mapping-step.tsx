"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type {
  FieldDefinition,
  MappingSuggestion,
} from "@pdp/backend/convex/lib/import/mapper";
import {
  DEFAULT_TARGET_FIELDS,
  suggestMappingsSimple,
} from "@pdp/backend/convex/lib/import/mapper";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { useAction } from "convex/react";
import { AlertTriangle, Check, Lock, Sparkles, Unlock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MappingStepProps = {
  parsedData: ParseResult;
  initialMappings?: MappingSuggestion[];
  onMappingsConfirmed: (
    mappings: Record<string, string>,
    suggestions: MappingSuggestion[]
  ) => void;
  goBack: () => void;
};

const SKIP_VALUE = "_skip";

function getConfidenceBadge(confidence: number) {
  if (confidence >= 95) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <Check className="mr-1 h-3 w-3" />
        {confidence}%
      </Badge>
    );
  }
  if (confidence >= 70) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
        {confidence}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <X className="mr-1 h-3 w-3" />
      Unmapped
    </Badge>
  );
}

function MappingRow({
  column,
  sampleValues,
  suggestion,
  targetFields,
  usedTargets,
  locked,
  onTargetChange,
  onToggleLock,
}: {
  column: string;
  sampleValues: string[];
  suggestion: MappingSuggestion | undefined;
  targetFields: FieldDefinition[];
  usedTargets: Set<string>;
  locked: boolean;
  onTargetChange: (target: string) => void;
  onToggleLock: () => void;
}) {
  const currentTarget = suggestion?.targetField ?? SKIP_VALUE;
  const confidence = suggestion?.confidence ?? 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Source Column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{column}</span>
          {getConfidenceBadge(confidence)}
        </div>
        <p className="mt-1 truncate text-muted-foreground text-xs">
          {sampleValues.slice(0, 3).join(", ")}
        </p>
      </div>

      {/* Arrow / Mapping */}
      <div className="flex items-center gap-2">
        <Select
          disabled={locked}
          onValueChange={onTargetChange}
          value={currentTarget}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SKIP_VALUE}>Don&apos;t Import</SelectItem>
            {targetFields.map((field) => {
              const isUsed =
                usedTargets.has(field.name) && field.name !== currentTarget;
              return (
                <SelectItem
                  disabled={isUsed}
                  key={field.name}
                  value={field.name}
                >
                  {field.label}
                  {field.required ? " *" : ""}
                  {isUsed ? " (used)" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          onClick={onToggleLock}
          size="icon"
          title={locked ? "Unlock to change" : "Lock mapping"}
          variant="ghost"
        >
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Unlock className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function MappingStep({
  parsedData,
  initialMappings,
  onMappingsConfirmed,
  goBack,
}: MappingStepProps) {
  const targetFields = DEFAULT_TARGET_FIELDS;

  // Run auto-mapping on mount
  const autoSuggestions = useMemo(() => {
    if (initialMappings && initialMappings.length > 0) {
      return initialMappings;
    }
    return suggestMappingsSimple(parsedData.headers);
  }, [parsedData.headers, initialMappings]);

  // Mutable mapping state: column -> suggestion
  const [mappings, setMappings] = useState<Map<string, MappingSuggestion>>(
    () => {
      const map = new Map<string, MappingSuggestion>();
      for (const suggestion of autoSuggestions) {
        map.set(suggestion.sourceColumn, suggestion);
      }
      return map;
    }
  );

  // Lock state: auto-mapped columns with >=95% confidence start locked
  const [lockedColumns, setLockedColumns] = useState<Set<string>>(() => {
    const locked = new Set<string>();
    for (const suggestion of autoSuggestions) {
      if (suggestion.confidence >= 95) {
        locked.add(suggestion.sourceColumn);
      }
    }
    return locked;
  });

  // AI suggestions state
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const suggestAllMappings = useAction(
    api.actions.aiMapping.suggestAllMappings
  );

  // Update mappings if autoSuggestions change
  useEffect(() => {
    const map = new Map<string, MappingSuggestion>();
    for (const suggestion of autoSuggestions) {
      map.set(suggestion.sourceColumn, suggestion);
    }
    setMappings(map);
  }, [autoSuggestions]);

  // Compute used targets for dropdown disabling
  const usedTargets = useMemo(() => {
    const used = new Set<string>();
    for (const suggestion of mappings.values()) {
      if (suggestion.targetField !== SKIP_VALUE) {
        used.add(suggestion.targetField);
      }
    }
    return used;
  }, [mappings]);

  // Get sample values for a column
  const getSampleValues = (column: string): string[] =>
    parsedData.rows
      .slice(0, 5)
      .map((row) => row[column] ?? "")
      .filter(Boolean);

  // Check required fields
  const missingRequired = targetFields
    .filter((f) => f.required)
    .filter((f) => !usedTargets.has(f.name));

  const mappedCount = Array.from(mappings.values()).filter(
    (m) => m.targetField !== SKIP_VALUE
  ).length;

  const handleTargetChange = (column: string, target: string) => {
    setMappings((prev) => {
      const next = new Map(prev);
      if (target === SKIP_VALUE) {
        next.delete(column);
      } else {
        next.set(column, {
          sourceColumn: column,
          targetField: target,
          confidence: 100,
          strategy: "exact",
        });
      }
      return next;
    });
  };

  const handleToggleLock = (column: string) => {
    setLockedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  const processAIMappings = (result: {
    mappings: Record<
      string,
      { targetField: string | null; confidence: number; cached: boolean }
    >;
  }) => {
    const aiMappings = new Map<string, MappingSuggestion>();
    const highConfidence = new Set<string>();

    for (const [columnName, aiResult] of Object.entries(result.mappings)) {
      if (aiResult.targetField) {
        aiMappings.set(columnName, {
          sourceColumn: columnName,
          targetField: aiResult.targetField,
          confidence: aiResult.confidence,
          strategy: aiResult.cached ? "ai-cached" : "ai",
        });
      }

      if (aiResult.confidence >= 80) {
        highConfidence.add(columnName);
      }
    }

    return { aiMappings, highConfidence };
  };

  const handleGetAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      const columns = parsedData.headers.map((header) => ({
        name: header,
        sampleValues: getSampleValues(header),
      }));

      const result = await suggestAllMappings({ columns });
      const { aiMappings, highConfidence } = processAIMappings(result);

      setMappings(aiMappings);
      setLockedColumns(highConfidence);

      toast.success(
        `AI suggested ${aiMappings.size} mappings (${result.cacheHitRate.toFixed(0)}% from cache)`
      );
    } catch (error) {
      console.error("AI mapping failed:", error);
      toast.error("Failed to get AI suggestions. Please map columns manually.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleConfirm = () => {
    const confirmed: Record<string, string> = {};
    const suggestions: MappingSuggestion[] = [];
    for (const [column, suggestion] of mappings.entries()) {
      if (suggestion.targetField !== SKIP_VALUE) {
        confirmed[column] = suggestion.targetField;
        suggestions.push(suggestion);
      }
    }
    onMappingsConfirmed(confirmed, suggestions);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Column Mapping</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                disabled={isLoadingAI || parsedData.headers.length === 0}
                onClick={handleGetAISuggestions}
                size="sm"
                variant="outline"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isLoadingAI ? "AI is analyzing..." : "Get AI Suggestions"}
              </Button>
              <Badge variant="outline">
                {mappedCount} of {parsedData.headers.length} mapped
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Review how source columns map to player fields. Auto-mapped columns
            with high confidence are locked by default.
          </p>
        </CardContent>
      </Card>

      {/* Required fields warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div>
            <p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
              Required fields not mapped
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {missingRequired.map((f) => f.label).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Mapping Rows */}
      <div className="space-y-2">
        {parsedData.headers.map((column) => (
          <MappingRow
            column={column}
            key={column}
            locked={lockedColumns.has(column)}
            onTargetChange={(target) => handleTargetChange(column, target)}
            onToggleLock={() => handleToggleLock(column)}
            sampleValues={getSampleValues(column)}
            suggestion={mappings.get(column)}
            targetFields={targetFields}
            usedTargets={usedTargets}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button onClick={goBack} variant="outline">
          Back
        </Button>
        <Button onClick={handleConfirm}>Continue to Player Selection</Button>
      </div>
    </div>
  );
}
