"use client";

import type { ParseResult } from "@pdp/backend/convex/lib/import/parser";
import { parseCSV } from "@pdp/backend/convex/lib/import/parser";
import {
  AlertCircle,
  ClipboardPaste,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type UploadStepProps = {
  onDataParsed: (data: ParseResult, fileName?: string) => void;
  goBack?: () => void;
};

// ============================================================
// Preview Table (extracted to reduce complexity)
// ============================================================

function PreviewTable({ data }: { data: ParseResult }) {
  const previewHeaders = data.headers.slice(0, 8);
  const previewRows = data.rows.slice(0, 3);
  const hasMoreColumns = data.headers.length > 8;

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-xs">#</TableHead>
              {previewHeaders.map((header) => (
                <TableHead className="text-xs" key={header}>
                  {header}
                </TableHead>
              ))}
              {hasMoreColumns && (
                <TableHead className="text-muted-foreground text-xs">
                  +{data.headers.length - 8} more
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, idx) => {
              const rowKey = previewHeaders
                .map((h) => row[h] ?? "")
                .join("-")
                .slice(0, 50);
              return (
                <TableRow key={rowKey || `preview-${String(idx)}`}>
                  <TableCell className="text-muted-foreground text-xs">
                    {idx + 1}
                  </TableCell>
                  {previewHeaders.map((header) => (
                    <TableCell
                      className="max-w-[150px] truncate text-xs"
                      key={header}
                    >
                      {row[header] ?? ""}
                    </TableCell>
                  ))}
                  {hasMoreColumns && (
                    <TableCell className="text-xs">...</TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {data.totalRows > 3 && (
        <p className="mt-2 text-muted-foreground text-xs">
          Showing first 3 of {data.totalRows} rows
        </p>
      )}
    </>
  );
}

// ============================================================
// Drop Zone (extracted to reduce complexity)
// ============================================================

function DropZone({
  onFileSelected,
}: {
  onFileSelected: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <button
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) {
              onFileSelected(file);
            }
          }}
          type="button"
        >
          <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 font-medium">Drag and drop a CSV file here</p>
          <p className="mb-4 text-muted-foreground text-sm">
            or click to browse
          </p>
          <input
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onFileSelected(file);
              }
            }}
            ref={fileInputRef}
            type="file"
          />
          <span className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-accent">
            <Upload className="mr-2 h-4 w-4" />
            Browse Files
          </span>
        </button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Upload Step
// ============================================================

export default function UploadStep({ onDataParsed, goBack }: UploadStepProps) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pasteContent, setPasteContent] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processCSV = useCallback((text: string, name?: string) => {
    setError(null);
    try {
      const result = parseCSV(text);
      if (result.rows.length === 0) {
        setError("No data rows found in the file.");
        return;
      }
      if (result.headers.length === 0) {
        setError("No headers detected in the file.");
        return;
      }
      setPreview(result);
      setFileName(name ?? null);
    } catch {
      setError("Failed to parse the file. Please check the format.");
    }
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a CSV file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processCSV(text, file.name);
      };
      reader.onerror = () => {
        setError("Failed to read the file.");
      };
      reader.readAsText(file);
    },
    [processCSV]
  );

  const handleReset = useCallback(() => {
    setPreview(null);
    setError(null);
    setFileName(null);
    setPasteContent("");
  }, []);

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            setMode("file");
            handleReset();
          }}
          variant={mode === "file" ? "default" : "outline"}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
        <Button
          onClick={() => {
            setMode("paste");
            handleReset();
          }}
          variant={mode === "paste" ? "default" : "outline"}
        >
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Paste Data
        </Button>
      </div>

      {/* File Upload */}
      {mode === "file" && !preview && (
        <DropZone onFileSelected={handleFileSelect} />
      )}

      {/* Paste Area */}
      {mode === "paste" && !preview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Paste Data</CardTitle>
            <CardDescription>
              Copy data from Excel or a spreadsheet and paste it below.
              Tab-separated or comma-separated data is supported.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              className="min-h-[200px] font-mono text-sm"
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste your spreadsheet data here..."
              value={pasteContent}
            />
            <Button
              disabled={!pasteContent.trim()}
              onClick={() => processCSV(pasteContent)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Parse Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Data Preview</CardTitle>
                <CardDescription>
                  {fileName && <span className="font-medium">{fileName}</span>}
                  {fileName && " — "}
                  {preview.totalRows} rows, {preview.headers.length} columns
                </CardDescription>
              </div>
              <Button onClick={handleReset} size="sm" variant="outline">
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PreviewTable data={preview} />
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <div>
          {goBack && (
            <Button onClick={goBack} variant="outline">
              Back
            </Button>
          )}
        </div>
        <Button
          disabled={!preview}
          onClick={() => {
            if (preview) {
              onDataParsed(preview, fileName ?? undefined);
            }
          }}
        >
          Continue to Column Mapping
        </Button>
      </div>
    </div>
  );
}
