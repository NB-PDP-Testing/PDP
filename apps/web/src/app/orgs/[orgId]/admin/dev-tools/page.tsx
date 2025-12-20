"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@pdp/backend/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2, RefreshCw, Upload, FileUp } from "lucide-react";

export default function DevToolsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection state for Clear All Dev Data
  const [clearAllSelections, setClearAllSelections] = useState({
    playerIdentities: true,
    guardianIdentities: true,
    guardianPlayerLinks: true,
    orgPlayerEnrollments: true,
    teamPlayerIdentities: true,
    sportPassports: true,
    coachAssignments: true,
    skillAssessments: true,
    teams: true,
    membersRoles: true,
    sports: true,
    referenceData: true,
  });

  // Selection state for Clear Org Data
  const [clearOrgSelections, setClearOrgSelections] = useState({
    orgPlayerEnrollments: true,
    teamPlayerIdentities: true,
    sportPassports: true,
    coachAssignments: true,
    skillAssessments: true,
    teams: true,
  });

  const clearAllDevData = useMutation(api.scripts.clearDevData.clearAllDevData);
  const clearOrgData = useMutation(api.scripts.clearDevData.clearOrgData);
  const importCompleteSkillsData = useMutation(
    api.models.referenceData.importCompleteSkillsData
  );
  const migrateSportNamesToCodes = useMutation(
    api.models.teams.migrateSportNamesToCodes
  );

  const handleMigrateSports = async () => {
    if (!orgId) {
      setError("Organization ID is not available");
      return;
    }

    if (
      !window.confirm(
        `This will convert sport NAMES to sport CODES for all teams in this organization. Continue?`
      )
    ) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      const result = await migrateSportNamesToCodes({
        organizationId: orgId,
      });
      setResult({
        migrated: {
          teamsUpdated: result.teamsUpdated,
          updates: result.updates,
        },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllData = async () => {
    if (
      !window.confirm(
        "⚠️ DANGER: This will delete ALL data from the database. Are you absolutely sure?"
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "This action cannot be undone. Type 'DELETE ALL DATA' to confirm."
      )
    ) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      const result = await clearAllDevData({
        confirmDelete: true,
        selections: clearAllSelections,
      });
      setResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearOrgData = async () => {
    if (!orgId) {
      setError("Organization ID is not available");
      return;
    }

    if (
      !window.confirm(
        `⚠️ WARNING: This will delete all data for this organization. Are you sure?`
      )
    ) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      const result = await clearOrgData({
        organizationId: orgId,
        confirmDelete: true,
        selections: clearOrgSelections,
      });
      setResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleImportSkills = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      // Read the JSON file
      const text = await file.text();
      const skillsData = JSON.parse(text);

      // Import the skills data
      const result = await importCompleteSkillsData({
        skillsData,
        replaceExisting: false,
        ensureSportsExist: true,
      });

      setResult({
        imported: {
          sportsProcessed: result.sportsProcessed,
          categoriesCreated: result.totalCategoriesCreated,
          categoriesUpdated: result.totalCategoriesUpdated,
          skillsCreated: result.totalSkillsCreated,
          skillsUpdated: result.totalSkillsUpdated,
        },
        details: result.details,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Development Tools</h1>
        <p className="text-muted-foreground">
          Tools for testing data cleanup and import scenarios
        </p>
      </div>

      <div className="space-y-6">
        {/* Clear All Dev Data */}
        <Card className="border-red-200 bg-red-50">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 text-red-600" />
              <div>
                <h2 className="mb-2 text-xl font-semibold text-red-900">
                  Clear All Dev Data
                </h2>
                <p className="mb-4 text-sm text-red-800">
                  ⚠️ DANGER: This deletes ALL data from the database including
                  all organizations, players, teams, etc. Use only in
                  development!
                </p>
                <div className="text-sm text-red-700">
                  <p className="mb-2 font-medium">Select what to delete:</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-playerIdentities"
                        checked={clearAllSelections.playerIdentities}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            playerIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-playerIdentities"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Player identities
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-guardianIdentities"
                        checked={clearAllSelections.guardianIdentities}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            guardianIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-guardianIdentities"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Guardian identities
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-guardianPlayerLinks"
                        checked={clearAllSelections.guardianPlayerLinks}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            guardianPlayerLinks: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-guardianPlayerLinks"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Guardian-player links
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-orgPlayerEnrollments"
                        checked={clearAllSelections.orgPlayerEnrollments}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            orgPlayerEnrollments: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-orgPlayerEnrollments"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Org player enrollments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-teamPlayerIdentities"
                        checked={clearAllSelections.teamPlayerIdentities}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            teamPlayerIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-teamPlayerIdentities"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Team-player assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-sportPassports"
                        checked={clearAllSelections.sportPassports}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            sportPassports: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-sportPassports"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Sport passports
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-coachAssignments"
                        checked={clearAllSelections.coachAssignments}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            coachAssignments: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-coachAssignments"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Coach assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-skillAssessments"
                        checked={clearAllSelections.skillAssessments}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            skillAssessments: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-skillAssessments"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Skill assessments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-teams"
                        checked={clearAllSelections.teams}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            teams: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-teams"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Teams
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-membersRoles"
                        checked={clearAllSelections.membersRoles}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            membersRoles: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-membersRoles"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Functional roles (coach/parent/admin) from members
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-sports"
                        checked={clearAllSelections.sports}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            sports: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-sports"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Sports reference data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearAll-referenceData"
                        checked={clearAllSelections.referenceData}
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            referenceData: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearAll-referenceData"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Other reference data
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleClearAllData}
              disabled={isClearing}
              className="gap-2"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Clear All Dev Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Import Sports Benchmark Data */}
        <Card className="border-blue-200 bg-blue-50">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <Upload className="mt-1 h-5 w-5 text-blue-600" />
              <div>
                <h2 className="mb-2 text-xl font-semibold text-blue-900">
                  Import Sports Benchmark Data
                </h2>
                <p className="mb-4 text-sm text-blue-800">
                  Import skill categories and definitions from a JSON export file.
                  This will automatically create sports if they don't exist.
                </p>
                <div className="text-sm text-blue-700">
                  <p className="mb-1 font-medium">
                    Upload skills-complete-*.json file to import:
                  </p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>All skill categories (grouped by sport)</li>
                    <li>All skill definitions with level descriptors</li>
                    <li>Automatically creates sports if missing</li>
                    <li>Skips existing data (no duplicates)</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={isClearing}
                onClick={() => {
                  document.getElementById("skills-file-input")?.click();
                }}
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" />
                    Choose File to Import
                  </>
                )}
              </Button>
              <input
                id="skills-file-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSkills}
                disabled={isClearing}
              />
              <span className="text-sm text-blue-600">
                {isClearing ? "Processing..." : "Select a JSON file"}
              </span>
            </div>
          </div>
        </Card>

        {/* Migrate Sport Names to Codes */}
        <Card className="border-green-200 bg-green-50">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <RefreshCw className="mt-1 h-5 w-5 text-green-600" />
              <div>
                <h2 className="mb-2 text-xl font-semibold text-green-900">
                  Migrate Sport Names to Codes
                </h2>
                <p className="mb-4 text-sm text-green-800">
                  Converts team sport values from NAMES (e.g., "GAA Football") to
                  CODES (e.g., "gaa_football") for this organization's teams.
                </p>
                <div className="text-sm text-green-700">
                  <p className="mb-1 font-medium">This will update:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>"GAA Football" → "gaa_football"</li>
                    <li>"Hurling" → "hurling"</li>
                    <li>"Camogie" → "camogie"</li>
                    <li>"Ladies Football" → "ladies_football"</li>
                    <li>And other sports as needed</li>
                  </ul>
                  <p className="mt-2 text-xs italic">
                    This fixes the issue where assess page can't find skills because
                    sport codes don't match.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="default"
              onClick={handleMigrateSports}
              disabled={isClearing}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Migrate Sports
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Clear Org Data */}
        <Card className="border-orange-200 bg-orange-50">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 text-orange-600" />
              <div>
                <h2 className="mb-2 text-xl font-semibold text-orange-900">
                  Clear This Organization's Data
                </h2>
                <p className="mb-4 text-sm text-orange-800">
                  Deletes all data for this organization only. Platform
                  identities are only deleted if orphaned (not used by other
                  orgs).
                </p>
                <div className="text-sm text-orange-700">
                  <p className="mb-2 font-medium">Select what to delete:</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearOrg-orgPlayerEnrollments"
                        checked={clearOrgSelections.orgPlayerEnrollments}
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            orgPlayerEnrollments: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearOrg-orgPlayerEnrollments"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Org player enrollments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearOrg-teamPlayerIdentities"
                        checked={clearOrgSelections.teamPlayerIdentities}
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            teamPlayerIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearOrg-teamPlayerIdentities"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Team-player assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearOrg-sportPassports"
                        checked={clearOrgSelections.sportPassports}
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            sportPassports: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearOrg-sportPassports"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Sport passports
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearOrg-coachAssignments"
                        checked={clearOrgSelections.coachAssignments}
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            coachAssignments: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearOrg-coachAssignments"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Coach assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearOrg-skillAssessments"
                        checked={clearOrgSelections.skillAssessments}
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            skillAssessments: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearOrg-skillAssessments"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Skill assessments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clearOrg-teams"
                        checked={clearOrgSelections.teams}
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            teams: checked === true,
                          })
                        }
                      />
                      <Label
                        htmlFor="clearOrg-teams"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Teams
                      </Label>
                    </div>
                  </div>
                  <p className="mt-3 text-xs italic">
                    Note: Player and guardian identities are only deleted if orphaned
                    (not used by other orgs).
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleClearOrgData}
              disabled={isClearing || !orgId}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Clear Org Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <Card className="border-green-200 bg-green-50">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-green-900">
                {result.deleted ? "✅ Cleanup Complete" : "✅ Import Complete"}
              </h3>
              <div className="space-y-2 text-sm">
                {result.deleted &&
                  Object.entries(result.deleted).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between rounded bg-white px-3 py-2"
                    >
                      <span className="font-medium text-gray-700">
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                        :
                      </span>
                      <span className="font-bold text-green-700">
                        {value as number}
                      </span>
                    </div>
                  ))}
                {result.imported && (
                  <>
                    <div className="mb-2 rounded bg-white px-3 py-2">
                      <div className="mb-2 text-base font-semibold text-green-800">
                        Import Summary
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Sports Processed:
                          </span>
                          <span className="font-bold text-green-700">
                            {result.imported.sportsProcessed}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Categories Created:
                          </span>
                          <span className="font-bold text-green-700">
                            {result.imported.categoriesCreated}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">
                            Skills Created:
                          </span>
                          <span className="font-bold text-green-700">
                            {result.imported.skillsCreated}
                          </span>
                        </div>
                        {result.imported.categoriesUpdated > 0 && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">
                              Categories Updated:
                            </span>
                            <span className="font-bold text-blue-700">
                              {result.imported.categoriesUpdated}
                            </span>
                          </div>
                        )}
                        {result.imported.skillsUpdated > 0 && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-700">
                              Skills Updated:
                            </span>
                            <span className="font-bold text-blue-700">
                              {result.imported.skillsUpdated}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {result.details && result.details.length > 0 && (
                      <div className="rounded bg-white px-3 py-2">
                        <div className="mb-2 text-sm font-semibold text-gray-700">
                          Details by Sport:
                        </div>
                        <div className="space-y-2">
                          {result.details.map((detail: any) => (
                            <div
                              key={detail.sportCode}
                              className="rounded border border-gray-200 bg-gray-50 p-2"
                            >
                              <div className="mb-1 font-medium text-gray-800">
                                {detail.sportCode}
                              </div>
                              <div className="ml-2 space-y-1 text-xs text-gray-600">
                                <div>
                                  Categories: {detail.categoriesCreated} created
                                  {detail.categoriesUpdated > 0 &&
                                    `, ${detail.categoriesUpdated} updated`}
                                </div>
                                <div>
                                  Skills: {detail.skillsCreated} created
                                  {detail.skillsUpdated > 0 &&
                                    `, ${detail.skillsUpdated} updated`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-300 bg-red-100">
            <div className="p-6">
              <h3 className="mb-2 text-lg font-semibold text-red-900">
                ❌ Error
              </h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </Card>
        )}

        {/* Testing Guide */}
        <Card>
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Testing Guide</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="mb-2 font-medium">
                  1. Test Fresh Import (with Benchmark Data)
                </h4>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>Clear all dev data using the button above</li>
                  <li>
                    Import sports benchmark data using the import button (use
                    file: packages/backend/data-exports/skills-complete-*.json)
                  </li>
                  <li>Go to GAA Import wizard</li>
                  <li>Import a CSV file</li>
                  <li>
                    Verify all players, guardians, enrollments created correctly
                  </li>
                  <li>Check team assignments are correct</li>
                </ol>
              </div>

              <div>
                <h4 className="mb-2 font-medium">2. Test Duplicate Import</h4>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>Import the same CSV again</li>
                  <li>Verify duplicate detection shows all matches</li>
                  <li>Test search filtering by name, DOB, team</li>
                  <li>Test select all / individual selection</li>
                  <li>Test bulk actions (Replace All, Keep All, Skip All)</li>
                  <li>Complete import and verify data integrity</li>
                </ol>
              </div>

              <div>
                <h4 className="mb-2 font-medium">3. Test Org Deletion</h4>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>
                    Use "Clear This Organization's Data" button above OR use
                    official deletion workflow
                  </li>
                  <li>Check browser console for detailed deletion logs</li>
                  <li>
                    Verify counts show proper cleanup of org-scoped data
                  </li>
                  <li>
                    Verify orphaned player/guardian identities are deleted
                  </li>
                  <li>
                    If testing with multiple orgs: verify shared identities are
                    preserved
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="mb-2 font-medium">
                  4. Test Platform Identity Sharing
                </h4>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>Create a second organization</li>
                  <li>Import players to both orgs (with some overlap)</li>
                  <li>Delete first org using the cleanup button</li>
                  <li>
                    Verify shared players still exist (not orphaned)
                  </li>
                  <li>Verify only org-specific data was deleted</li>
                  <li>Delete second org</li>
                  <li>
                    Verify NOW the shared identities are deleted (orphaned)
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
