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
import { useAction, useMutation } from "convex/react";
import {
  AlertTriangle,
  Check,
  Info,
  Lock,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Unlock,
  X,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function getConfidenceBadge(confidence: number, reasoning?: string) {
  const badge = (() => {
    if (confidence >= 80) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <Check className="mr-1 h-3 w-3" />
          HIGH {confidence}%
        </Badge>
      );
    }
    if (confidence >= 50) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          MEDIUM {confidence}%
        </Badge>
      );
    }
    if (confidence > 0) {
      return <Badge variant="destructive">LOW {confidence}%</Badge>;
    }
    return (
      <Badge variant="secondary">
        <X className="mr-1 h-3 w-3" />
        Manual
      </Badge>
    );
  })();

  if (reasoning && confidence > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help items-center gap-1">
              {badge}
              <Info className="h-3 w-3 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{reasoning}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

function MappingRow({
  column,
  sampleValues,
  suggestion,
  targetFields,
  usedTargets,
  locked,
  aiSuggestion,
  onTargetChange,
  onToggleLock,
  onAcceptAI,
  onRejectAI,
}: {
  column: string;
  sampleValues: string[];
  suggestion: MappingSuggestion | undefined;
  targetFields: FieldDefinition[];
  usedTargets: Set<string>;
  locked: boolean;
  aiSuggestion?: { targetField: string; confidence: number; reasoning: string };
  onTargetChange: (target: string) => void;
  onToggleLock: () => void;
  onAcceptAI?: () => void;
  onRejectAI?: () => void;
}) {
  const currentTarget = suggestion?.targetField ?? SKIP_VALUE;
  const confidence = suggestion?.confidence ?? 0;
  const reasoning =
    suggestion && "reasoning" in suggestion
      ? (suggestion as { reasoning?: string }).reasoning
      : undefined;
  const isAISuggestion = aiSuggestion && !locked;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Source Column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{column}</span>
          {getConfidenceBadge(confidence, reasoning)}
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

        {/* AI Accept/Reject buttons */}
        {isAISuggestion && onAcceptAI && onRejectAI && (
          <>
            <Button
              className="text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={onAcceptAI}
              size="icon"
              title="Accept AI suggestion"
              variant="ghost"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onRejectAI}
              size="icon"
              title="Reject AI suggestion"
              variant="ghost"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </>
        )}

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
  const [aiSuggestions, setAISuggestions] = useState<
    Map<
      string,
      {
        targetField: string;
        confidence: number;
        reasoning: string;
      }
    >
  >(new Map());
  const suggestAllMappings = useAction(
    api.actions.aiMapping.suggestAllMappings
  );
  const recordMappingHistory = useMutation(
    api.models.importMappingHistory.recordMappingHistory
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

  const handleGetAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      const columns = parsedData.headers.map((header) => ({
        name: header,
        sampleValues: getSampleValues(header),
      }));

      const result = await suggestAllMappings({ columns });

      // Store AI suggestions separately (with reasoning)
      const aiSuggMap = new Map<
        string,
        { targetField: string; confidence: number; reasoning: string }
      >();

      for (const [columnName, aiResult] of Object.entries(result.mappings)) {
        const typedResult = aiResult as {
          targetField: string | null;
          confidence: number;
          reasoning?: string;
          cached: boolean;
        };
        if (typedResult.targetField) {
          aiSuggMap.set(columnName, {
            targetField: typedResult.targetField,
            confidence: typedResult.confidence,
            reasoning:
              typedResult.reasoning ||
              `AI suggested mapping with ${typedResult.confidence}% confidence`,
          });
        }
      }

      setAISuggestions(aiSuggMap);

      toast.success(
        `AI analyzed ${columns.length} columns (${result.cacheHitRate.toFixed(0)}% from cache). Review suggestions below.`
      );
    } catch (error) {
      console.error("AI mapping failed:", error);
      toast.error("Failed to get AI suggestions. Please map columns manually.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAcceptAI = (column: string) => {
    const aiSugg = aiSuggestions.get(column);
    if (!aiSugg) {
      return;
    }

    // Accept the AI suggestion
    setMappings((prev) => {
      const next = new Map(prev);
      const mapping: MappingSuggestion & { reasoning?: string } = {
        sourceColumn: column,
        targetField: aiSugg.targetField,
        confidence: aiSugg.confidence,
        strategy: "ai",
        reasoning: aiSugg.reasoning,
      };
      next.set(column, mapping);
      return next;
    });

    // Lock high-confidence mappings
    if (aiSugg.confidence >= 80) {
      setLockedColumns((prev) => new Set(prev).add(column));
    }

    // Remove from AI suggestions (accepted)
    setAISuggestions((prev) => {
      const next = new Map(prev);
      next.delete(column);
      return next;
    });

    toast.success(`Accepted AI suggestion for "${column}"`);
  };

  const handleRejectAI = (column: string) => {
    // Remove from AI suggestions (rejected)
    setAISuggestions((prev) => {
      const next = new Map(prev);
      next.delete(column);
      return next;
    });

    // Reset to unmapped
    setMappings((prev) => {
      const next = new Map(prev);
      next.delete(column);
      return next;
    });

    toast.info(
      `Rejected AI suggestion for "${column}". Map manually if needed.`
    );
  };

  const handleAcceptAllHighConfidence = () => {
    let accepted = 0;

    aiSuggestions.forEach((aiSugg, column) => {
      if (aiSugg.confidence >= 80) {
        handleAcceptAI(column);
        accepted += 1;
      }
    });

    if (accepted > 0) {
      toast.success(`Accepted ${accepted} high-confidence AI suggestions`);
    } else {
      toast.info("No high-confidence suggestions to accept");
    }
  };

  const handleConfirm = async () => {
    const confirmed: Record<string, string> = {};
    const suggestions: MappingSuggestion[] = [];

    for (const [column, suggestion] of mappings.entries()) {
      if (suggestion.targetField !== SKIP_VALUE) {
        confirmed[column] = suggestion.targetField;
        suggestions.push(suggestion);

        // Track mapping history for AI suggestions
        const isAI =
          ("strategy" in suggestion &&
            (suggestion as { strategy?: string }).strategy === "ai") ||
          ("reasoning" in suggestion &&
            (suggestion as { reasoning?: string }).reasoning);
        if (isAI) {
          try {
            await recordMappingHistory({
              sourceColumn: column,
              targetField: suggestion.targetField,
              wasCorrect: true, // User accepted it by confirming
              aiSuggested: true,
              aiConfidence: suggestion.confidence,
            });
          } catch (error) {
            console.error("Failed to record mapping history:", error);
          }
        }
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
              {aiSuggestions.size > 0 && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleAcceptAllHighConfidence}
                  size="sm"
                  variant="default"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Accept All High Confidence
                </Button>
              )}
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
            aiSuggestion={aiSuggestions.get(column)}
            column={column}
            key={column}
            locked={lockedColumns.has(column)}
            onAcceptAI={() => handleAcceptAI(column)}
            onRejectAI={() => handleRejectAI(column)}
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
