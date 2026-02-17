"use client";

import {
  type MappingSuggestion,
  suggestMappings,
} from "@pdp/backend/convex/lib/import/mapper";
import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { parseCSV } from "@pdp/backend/convex/lib/import/parser";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ColumnMapping, TemplateFormData } from "./template-form";
import { getDefaultFormData } from "./template-form";

type SampleUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMappingsDetected: (data: TemplateFormData) => void;
};

function getConfidenceBadge(confidence: number) {
  if (confidence >= 95) {
    return (
      <Badge className="bg-green-100 text-green-700" variant="outline">
        High ({confidence}%)
      </Badge>
    );
  }
  if (confidence >= 70) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700" variant="outline">
        Medium ({confidence}%)
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700" variant="outline">
      Low ({confidence}%)
    </Badge>
  );
}

export function SampleUploadDialog({
  open,
  onOpenChange,
  onMappingsDetected,
}: SampleUploadDialogProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [pasteContent, setPasteContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = useCallback((content: string) => {
    try {
      const result = parseCSV(content);
      if (result.headers.length === 0) {
        setError("No columns detected. Please check your CSV format.");
        return;
      }
      setParseResult(result);
      setError(null);

      // Run auto-mapping
      const mappingSuggestions = suggestMappings(result.headers, result.rows);
      setSuggestions(mappingSuggestions);

      // Find unmapped columns
      const mappedColumns = new Set(
        mappingSuggestions.map((s) => s.sourceColumn)
      );
      setUnmappedColumns(result.headers.filter((h) => !mappedColumns.has(h)));
    } catch {
      setError("Failed to parse the CSV content. Please check the format.");
    }
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSV(text);
      };
      reader.readAsText(file);
    },
    [processCSV]
  );

  const handlePaste = useCallback(() => {
    if (!pasteContent.trim()) {
      return;
    }
    processCSV(pasteContent);
  }, [pasteContent, processCSV]);

  const handleConfirm = useCallback(() => {
    // Build column mappings from suggestions
    const columnMappings: ColumnMapping[] = suggestions.map((s) => ({
      sourcePattern: s.sourceColumn,
      targetField: s.targetField,
      required: false,
    }));

    // Add unmapped columns with empty target
    for (const col of unmappedColumns) {
      columnMappings.push({
        sourcePattern: col,
        targetField: "",
        required: false,
      });
    }

    const formData: TemplateFormData = {
      ...getDefaultFormData(),
      columnMappings,
    };

    onMappingsDetected(formData);
    onOpenChange(false);

    // Reset state
    setParseResult(null);
    setSuggestions([]);
    setUnmappedColumns([]);
    setPasteContent("");
    setError(null);
  }, [suggestions, unmappedColumns, onMappingsDetected, onOpenChange]);

  const reset = () => {
    setParseResult(null);
    setSuggestions([]);
    setUnmappedColumns([]);
    setPasteContent("");
    setError(null);
  };

  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset();
        }
        onOpenChange(isOpen);
      }}
      open={open}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Template from Sample</DialogTitle>
          <DialogDescription>
            Upload or paste a sample CSV file. The system will auto-detect
            columns and suggest field mappings for your template.
          </DialogDescription>
        </DialogHeader>

        {parseResult ? (
          <MappingPreview
            parseResult={parseResult}
            suggestions={suggestions}
            unmappedColumns={unmappedColumns}
          />
        ) : (
          <UploadSection
            error={error}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onPaste={handlePaste}
            pasteContent={pasteContent}
            setPasteContent={setPasteContent}
          />
        )}

        <DialogFooter>
          {parseResult ? (
            <>
              <Button onClick={reset} variant="outline">
                Upload Different File
              </Button>
              <Button onClick={handleConfirm}>Use These Mappings</Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Upload Section
// ============================================================

function UploadSection({
  error,
  fileInputRef,
  onFileUpload,
  pasteContent,
  setPasteContent,
  onPaste,
}: {
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pasteContent: string;
  setPasteContent: (value: string) => void;
  onPaste: () => void;
}) {
  return (
    <Tabs className="w-full" defaultValue="file">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="file">
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </TabsTrigger>
        <TabsTrigger value="paste">
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Paste Data
        </TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="file">
        <button
          className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-sm">Click to upload a CSV file</p>
          <p className="text-muted-foreground text-xs">
            Upload a sample of the data you want to import
          </p>
          <input
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={onFileUpload}
            ref={fileInputRef}
            type="file"
          />
        </button>
      </TabsContent>

      <TabsContent className="space-y-4" value="paste">
        <Textarea
          className="min-h-[150px] font-mono text-xs"
          onChange={(e) => setPasteContent(e.target.value)}
          placeholder="Paste your CSV data here (with headers)..."
          value={pasteContent}
        />
        <Button
          className="w-full"
          disabled={!pasteContent.trim()}
          onClick={onPaste}
        >
          Parse Data
        </Button>
      </TabsContent>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </Tabs>
  );
}

// ============================================================
// Mapping Preview
// ============================================================

function MappingPreview({
  parseResult,
  suggestions,
  unmappedColumns,
}: {
  parseResult: ParseResult;
  suggestions: MappingSuggestion[];
  unmappedColumns: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">
            {parseResult.headers.length} columns detected,{" "}
            {parseResult.totalRows} rows
          </p>
          <p className="text-muted-foreground text-xs">
            {suggestions.length} auto-mapped, {unmappedColumns.length} unmapped
          </p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-sm">Detected Mappings</p>
          <div className="space-y-1">
            {suggestions.map((s) => (
              <div
                className="flex items-center justify-between rounded border p-2"
                key={s.sourceColumn}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{s.sourceColumn}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className="font-medium text-sm">{s.targetField}</span>
                </div>
                {getConfidenceBadge(s.confidence)}
              </div>
            ))}
          </div>
        </div>
      )}

      {unmappedColumns.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-sm">Unmapped Columns</p>
          <div className="space-y-1">
            {unmappedColumns.map((col) => (
              <div
                className="flex items-center gap-2 rounded border border-dashed p-2"
                key={col}
              >
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">{col}</span>
                <span className="text-muted-foreground text-xs">
                  — assign manually in form
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
