"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Info,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type ImportFormat = "complete" | "single-sport";

interface ImportPreview {
  format: ImportFormat;
  sports: Array<{
    sportCode: string;
    categoriesCount: number;
    skillsCount: number;
  }>;
  totalCategories: number;
  totalSkills: number;
}

type SportMappingAction = "create" | "skip" | string; // string = existing sport code to map to

interface SportMapping {
  importCode: string;
  exists: boolean;
  action: SportMappingAction;
  targetCode: string; // The code to use (either importCode or mapped code)
}

interface ImportResult {
  sportsProcessed: number;
  categoriesCreated: number;
  categoriesUpdated: number;
  skillsCreated: number;
  skillsUpdated: number;
  errors: Array<{
    sportCode: string;
    error: string;
  }>;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [missingSports, setMissingSports] = useState<string[]>([]);
  const [sportMappings, setSportMappings] = useState<SportMapping[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);

  const bulkImport = useMutation(
    api.models.referenceData.bulkImportCompleteSkillsData
  );
  const createSport = useMutation(api.models.referenceData.createSport);

  // Query existing sports to check which ones are missing
  const existingSports = useQuery(api.models.referenceData.getAllSportsAdmin);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setJsonData("");
    setPreview(null);
    setValidationError(null);
    setImportResult(null);
    setIsImporting(false);
    setReplaceExisting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const validateAndPreviewData = useCallback(
    (dataStr: string) => {
      try {
        const parsed = JSON.parse(dataStr);
        let previewData: ImportPreview;

        // Detect format and create preview
        if (parsed.sports && Array.isArray(parsed.sports)) {
          // Complete export format
          const sports = parsed.sports.map(
            (sport: {
              sportCode: string;
              categories: Array<{ skills: unknown[] }>;
            }) => ({
              sportCode: sport.sportCode,
              categoriesCount: sport.categories.length,
              skillsCount: sport.categories.reduce(
                (sum: number, cat: { skills: unknown[] }) =>
                  sum + cat.skills.length,
                0
              ),
            })
          );

          previewData = {
            format: "complete",
            sports,
            totalCategories: sports.reduce(
              (
                sum: number,
                s: {
                  sportCode: string;
                  categoriesCount: number;
                  skillsCount: number;
                }
              ) => sum + s.categoriesCount,
              0
            ),
            totalSkills: sports.reduce(
              (
                sum: number,
                s: {
                  sportCode: string;
                  categoriesCount: number;
                  skillsCount: number;
                }
              ) => sum + s.skillsCount,
              0
            ),
          };

          // Create sport mappings
          if (existingSports) {
            const existingCodes = new Set(
              existingSports.map((sport) => sport.code)
            );
            const mappings: SportMapping[] = sports.map(
              (s: {
                sportCode: string;
                categoriesCount: number;
                skillsCount: number;
              }) => {
                const exists = existingCodes.has(s.sportCode);
                return {
                  importCode: s.sportCode,
                  exists,
                  action: exists ? s.sportCode : "create",
                  targetCode: s.sportCode,
                };
              }
            );
            setSportMappings(mappings);

            const missing = mappings
              .filter((m) => !m.exists)
              .map((m) => m.importCode);
            setMissingSports(missing);
          }
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // Single sport format (array of categories)
          const categoriesCount = parsed.length;
          const skillsCount = parsed.reduce(
            (sum: number, cat: { skills: unknown[] }) =>
              sum + (cat.skills?.length || 0),
            0
          );

          previewData = {
            format: "single-sport",
            sports: [
              {
                sportCode: "unknown",
                categoriesCount,
                skillsCount,
              },
            ],
            totalCategories: categoriesCount,
            totalSkills: skillsCount,
          };
        } else {
          throw new Error(
            "Invalid format. Expected complete export format or array of categories."
          );
        }

        setPreview(previewData);
        setValidationError(null);
        return true;
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : "Invalid JSON format"
        );
        setPreview(null);
        return false;
      }
    },
    [existingSports]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setImportResult(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonData(content);
        validateAndPreviewData(content);
      };
      reader.readAsText(file);
    },
    [validateAndPreviewData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/json") {
        handleFileSelect(file);
      } else {
        setValidationError("Please drop a JSON file");
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleMappingChange = useCallback(
    (importCode: string, action: SportMappingAction) => {
      setSportMappings((prev) =>
        prev.map((m) =>
          m.importCode === importCode
            ? {
                ...m,
                action,
                targetCode:
                  action === "create" || action === "skip"
                    ? m.importCode
                    : action,
              }
            : m
        )
      );
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!(preview && jsonData)) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const parsed = JSON.parse(jsonData);

      if (preview.format === "complete") {
        // First, create any sports that need to be created
        for (const mapping of sportMappings) {
          if (mapping.action === "create" && !mapping.exists) {
            await createSport({
              code: mapping.importCode,
              name: mapping.importCode
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
            });
          }
        }

        // Filter and remap sports based on mappings
        const sportsToImport = parsed.sports
          .filter((sport: { sportCode: string }) => {
            const mapping = sportMappings.find(
              (m) => m.importCode === sport.sportCode
            );
            return mapping && mapping.action !== "skip";
          })
          .map((sport: { sportCode: string; categories: unknown[] }) => {
            const mapping = sportMappings.find(
              (m) => m.importCode === sport.sportCode
            );
            return {
              ...sport,
              sportCode: mapping!.targetCode,
            };
          });

        // Clean the data by removing internal database fields
        const cleanedSports = sportsToImport.map(
          (sport: {
            sportCode: string;
            categories: Array<{
              _id?: string;
              _creationTime?: number;
              createdAt?: number;
              isActive?: boolean;
              code: string;
              name: string;
              description?: string;
              sortOrder: number;
              skills: Array<{
                _id?: string;
                _creationTime?: number;
                createdAt?: number;
                isActive?: boolean;
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
              }>;
            }>;
          }) => ({
            sportCode: sport.sportCode,
            categories: sport.categories.map((cat) => ({
              code: cat.code,
              name: cat.name,
              description: cat.description,
              sortOrder: cat.sortOrder,
              skills: cat.skills.map((skill) => ({
                code: skill.code,
                name: skill.name,
                description: skill.description,
                level1Descriptor: skill.level1Descriptor,
                level2Descriptor: skill.level2Descriptor,
                level3Descriptor: skill.level3Descriptor,
                level4Descriptor: skill.level4Descriptor,
                level5Descriptor: skill.level5Descriptor,
                ageGroupRelevance: skill.ageGroupRelevance,
                sortOrder: skill.sortOrder,
              })),
            })),
          })
        );

        const result = await bulkImport({
          sports: cleanedSports,
          replaceExisting,
        });
        setImportResult(result);

        if (result.errors.length === 0) {
          onSuccess?.();
        }
      } else {
        // Single sport format - would need sport code from user
        setValidationError(
          "Single sport format detected. Please use the single sport import dialog."
        );
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Import failed"
      );
    } finally {
      setIsImporting(false);
    }
  }, [
    preview,
    jsonData,
    bulkImport,
    replaceExisting,
    onSuccess,
    sportMappings,
    createSport,
  ]);

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Skills Data</DialogTitle>
          <DialogDescription>
            Import skills from a complete export JSON file. Supports importing
            multiple sports at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          {!selectedFile && (
            <div className="rounded-lg border bg-blue-50 p-4">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowInstructions(!showInstructions)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-blue-900 text-sm">
                    JSON File Format Requirements
                  </h3>
                </div>
                {showInstructions ? (
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                )}
              </button>

              {showInstructions && (
                <div className="mt-4 space-y-4 text-sm">
                  <p className="text-blue-900">
                    Upload a JSON file containing skills data for one or more
                    sports.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Required Fields */}
                    <div className="rounded-lg border border-blue-200 bg-white p-3">
                      <h4 className="mb-2 font-medium text-blue-900">
                        Required Fields
                      </h4>
                      <ul className="space-y-1 text-blue-800 text-xs">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              sports
                            </code>{" "}
                            - Array of sport objects
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              sportCode
                            </code>{" "}
                            - Unique sport identifier
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              categories
                            </code>{" "}
                            - Array of skill categories
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              code
                            </code>
                            ,{" "}
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              name
                            </code>
                            ,{" "}
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              sortOrder
                            </code>{" "}
                            - For categories & skills
                          </div>
                        </li>
                      </ul>
                    </div>

                    {/* Optional Fields */}
                    <div className="rounded-lg border border-blue-200 bg-white p-3">
                      <h4 className="mb-2 font-medium text-blue-900">
                        Optional Fields
                      </h4>
                      <ul className="space-y-1 text-blue-800 text-xs">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              description
                            </code>{" "}
                            - For categories & skills
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              level1Descriptor
                            </code>{" "}
                            to{" "}
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              level5Descriptor
                            </code>{" "}
                            - Proficiency levels
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <div>
                            <code className="rounded bg-blue-100 px-1 py-0.5">
                              ageGroupRelevance
                            </code>{" "}
                            - Age groups array
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Example JSON */}
                  <div>
                    <h4 className="mb-2 font-medium text-blue-900">
                      Example Structure
                    </h4>
                    <div className="max-h-60 overflow-y-auto rounded-md border border-blue-200 bg-slate-50 p-3">
                      <pre className="font-mono text-slate-700 text-xs">{`{
  "sports": [
    {
      "sportCode": "gaa_football",
      "categories": [
        {
          "code": "passing",
          "name": "Passing",
          "description": "Passing skills",
          "sortOrder": 1,
          "skills": [
            {
              "code": "chest_pass",
              "name": "Chest Pass",
              "description": "Basic chest pass",
              "level1Descriptor": "With assistance",
              "level2Descriptor": "Independently",
              "level3Descriptor": "With accuracy",
              "level4Descriptor": "Under pressure",
              "level5Descriptor": "Expertly",
              "ageGroupRelevance": ["u6", "u7", "u8"],
              "sortOrder": 1
            }
          ]
        }
      ]
    }
  ]
}`}</pre>
                    </div>
                  </div>

                  <p className="text-blue-700 text-xs">
                    💡 Tip: Export existing skills data from a sport to see the
                    exact format, then modify for your needs.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* File Upload Area */}
          {!selectedFile && (
            <div
              className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FileUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-gray-600 text-sm">
                Drag and drop your JSON file here, or
              </p>
              <label htmlFor="file-upload">
                <Button
                  className="cursor-pointer"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                <input
                  accept=".json,application/json"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileInputChange}
                  type="file"
                />
              </label>
              <p className="mt-4 text-gray-500 text-xs">
                Supports: skills-complete-YYYY-MM-DD.json format
              </p>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <FileUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-gray-500 text-xs">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  resetState();
                }}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validation Error</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview && !validationError && (
            <div className="space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Import Preview</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm">
                      <strong>Format:</strong>{" "}
                      {preview.format === "complete"
                        ? "Complete Export (All Sports)"
                        : "Single Sport"}
                    </p>
                    <p className="text-sm">
                      <strong>Total Categories:</strong>{" "}
                      {preview.totalCategories}
                    </p>
                    <p className="text-sm">
                      <strong>Total Skills:</strong> {preview.totalSkills}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Sports Breakdown */}
              {preview.format === "complete" && (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Sport</th>
                        <th className="px-4 py-2 text-right">Categories</th>
                        <th className="px-4 py-2 text-right">Skills</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.sports.map((sport) => (
                        <tr key={sport.sportCode}>
                          <td className="px-4 py-2 font-medium">
                            {sport.sportCode}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {sport.categoriesCount}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {sport.skillsCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sport Mapping Configuration */}
              {sportMappings.length > 0 && (
                <div className="space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Sport Configuration</AlertTitle>
                    <AlertDescription>
                      <p className="text-sm">
                        Configure how each sport should be handled during
                        import:
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Sport Code</th>
                          <th className="px-4 py-2 text-center">Status</th>
                          <th className="px-4 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sportMappings.map((mapping) => (
                          <tr key={mapping.importCode}>
                            <td className="px-4 py-2 font-medium font-mono text-xs">
                              {mapping.importCode}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {mapping.exists ? (
                                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 font-medium text-green-800 text-xs">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Exists
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 font-medium text-amber-800 text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  New
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <select
                                className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={(e) =>
                                  handleMappingChange(
                                    mapping.importCode,
                                    e.target.value
                                  )
                                }
                                value={mapping.action}
                              >
                                {mapping.exists ? (
                                  <>
                                    <option value={mapping.importCode}>
                                      Use existing sport
                                    </option>
                                    <option value="skip">Skip import</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="create">
                                      Create as new sport
                                    </option>
                                    <option value="skip">Skip import</option>
                                    {existingSports &&
                                      existingSports.length > 0 && (
                                        <optgroup label="Map to existing sport">
                                          {existingSports.map((sport) => (
                                            <option
                                              key={sport.code}
                                              value={sport.code}
                                            >
                                              Map to: {sport.name} ({sport.code}
                                              )
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                  </>
                                )}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {missingSports.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>{missingSports.length}</strong> new sport
                        {missingSports.length === 1 ? "" : "s"} will be created
                        automatically during import.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Replace Existing Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  checked={replaceExisting}
                  className="rounded border-gray-300"
                  id="replace-existing"
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  type="checkbox"
                />
                <label
                  className="text-gray-700 text-sm"
                  htmlFor="replace-existing"
                >
                  Replace existing categories and skills
                </label>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress className="w-full" value={50} />
              <p className="text-center text-gray-600 text-sm">
                Importing skills data...
              </p>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert
              variant={
                importResult.errors.length > 0 ? "destructive" : "default"
              }
            >
              {importResult.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.errors.length > 0
                  ? "Import Completed with Errors"
                  : "Import Successful"}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Sports Processed: {importResult.sportsProcessed}</p>
                  <p>
                    Categories Created: {importResult.categoriesCreated} /
                    Updated: {importResult.categoriesUpdated}
                  </p>
                  <p>
                    Skills Created: {importResult.skillsCreated} / Updated:{" "}
                    {importResult.skillsUpdated}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <p className="font-medium">Errors:</p>
                      {importResult.errors.map((err, idx) => (
                        <p className="text-xs" key={idx}>
                          {err.sportCode}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isImporting}
            onClick={handleClose}
            variant="outline"
          >
            {importResult ? "Close" : "Cancel"}
          </Button>
          {preview && !importResult && (
            <Button
              disabled={isImporting || !!validationError}
              onClick={handleImport}
            >
              {isImporting ? "Importing..." : "Import Skills"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
