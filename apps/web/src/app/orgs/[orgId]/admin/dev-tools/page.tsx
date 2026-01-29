"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { AlertCircle, FileUp, RefreshCw, Trash2, Upload } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Regex patterns for formatting keys - moved to top level for performance
const CAMEL_CASE_SPLIT_REGEX = /([A-Z])/g;
const FIRST_CHAR_REGEX = /^./;

type ImportDetail = {
  sportCode: string;
  categoriesCreated: number;
  categoriesUpdated: number;
  skillsCreated: number;
  skillsUpdated: number;
};

type DevToolsResult = {
  deleted?: Record<string, number>;
  imported?: {
    sportsProcessed: number;
    categoriesCreated: number;
    categoriesUpdated: number;
    skillsCreated: number;
    skillsUpdated: number;
  };
  migrated?: {
    teamsUpdated: number;
    updates: unknown[];
  };
  details?: ImportDetail[];
  success?: boolean;
  message?: string;
};

export default function DevToolsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<DevToolsResult | null>(null);
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
  const addCoachRoleToNeil = useMutation(
    api.models.fixNeilsRoles.addCoachRoleToNeil
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
      // biome-ignore lint/suspicious/noAlert: Dev tools intentionally uses confirm for dangerous operations
      !window.confirm(
        "This will convert sport NAMES to sport CODES for all teams in this organization. Continue?"
      )
    ) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      const migrateResult = await migrateSportNamesToCodes({
        organizationId: orgId,
      });
      setResult({
        migrated: {
          teamsUpdated: migrateResult.teamsUpdated,
          updates: migrateResult.updates,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllData = async () => {
    if (
      // biome-ignore lint/suspicious/noAlert: Dev tools intentionally uses confirm for dangerous operations
      !window.confirm(
        "⚠️ DANGER: This will delete ALL data from the database. Are you absolutely sure?"
      )
    ) {
      return;
    }

    if (
      // biome-ignore lint/suspicious/noAlert: Dev tools intentionally uses confirm for dangerous operations
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
      const clearAllResult = await clearAllDevData({
        confirmDelete: true,
        selections: clearAllSelections,
      });
      setResult(clearAllResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
      // biome-ignore lint/suspicious/noAlert: Dev tools intentionally uses confirm for dangerous operations
      !window.confirm(
        "⚠️ WARNING: This will delete all data for this organization. Are you sure?"
      )
    ) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      const clearOrgResult = await clearOrgData({
        organizationId: orgId,
        confirmDelete: true,
        selections: clearOrgSelections,
      });
      setResult(clearOrgResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
    }
  };

  const handleImportSkills = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setResult(null);

    try {
      // Read the JSON file
      const text = await file.text();
      const skillsData = JSON.parse(text);

      // Import the skills data
      const importResult = await importCompleteSkillsData({
        skillsData,
        replaceExisting: false,
        ensureSportsExist: true,
      });

      setResult({
        imported: {
          sportsProcessed: importResult.sportsProcessed,
          categoriesCreated: importResult.totalCategoriesCreated,
          categoriesUpdated: importResult.totalCategoriesUpdated,
          skillsCreated: importResult.totalSkillsCreated,
          skillsUpdated: importResult.totalSkillsUpdated,
        },
        details: importResult.details as ImportDetail[],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Development Tools</h1>
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
                <h2 className="mb-2 font-semibold text-red-900 text-xl">
                  Clear All Dev Data
                </h2>
                <p className="mb-4 text-red-800 text-sm">
                  ⚠️ DANGER: This deletes ALL data from the database including
                  all organizations, players, teams, etc. Use only in
                  development!
                </p>
                <div className="text-red-700 text-sm">
                  <p className="mb-2 font-medium">Select what to delete:</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.playerIdentities}
                        id="clearAll-playerIdentities"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            playerIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-playerIdentities"
                      >
                        Player identities
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.guardianIdentities}
                        id="clearAll-guardianIdentities"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            guardianIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-guardianIdentities"
                      >
                        Guardian identities
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.guardianPlayerLinks}
                        id="clearAll-guardianPlayerLinks"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            guardianPlayerLinks: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-guardianPlayerLinks"
                      >
                        Guardian-player links
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.orgPlayerEnrollments}
                        id="clearAll-orgPlayerEnrollments"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            orgPlayerEnrollments: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-orgPlayerEnrollments"
                      >
                        Org player enrollments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.teamPlayerIdentities}
                        id="clearAll-teamPlayerIdentities"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            teamPlayerIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-teamPlayerIdentities"
                      >
                        Team-player assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.sportPassports}
                        id="clearAll-sportPassports"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            sportPassports: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-sportPassports"
                      >
                        Sport passports
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.coachAssignments}
                        id="clearAll-coachAssignments"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            coachAssignments: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-coachAssignments"
                      >
                        Coach assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.skillAssessments}
                        id="clearAll-skillAssessments"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            skillAssessments: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-skillAssessments"
                      >
                        Skill assessments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.teams}
                        id="clearAll-teams"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            teams: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-teams"
                      >
                        Teams
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.membersRoles}
                        id="clearAll-membersRoles"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            membersRoles: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-membersRoles"
                      >
                        Functional roles (coach/parent/admin) from members
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.sports}
                        id="clearAll-sports"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            sports: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-sports"
                      >
                        Sports reference data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearAllSelections.referenceData}
                        id="clearAll-referenceData"
                        onCheckedChange={(checked) =>
                          setClearAllSelections({
                            ...clearAllSelections,
                            referenceData: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearAll-referenceData"
                      >
                        Other reference data
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              className="gap-2"
              disabled={isClearing}
              onClick={handleClearAllData}
              variant="destructive"
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
                <h2 className="mb-2 font-semibold text-blue-900 text-xl">
                  Import Sports Benchmark Data
                </h2>
                <p className="mb-4 text-blue-800 text-sm">
                  Import skill categories and definitions from a JSON export
                  file. This will automatically create sports if they don't
                  exist.
                </p>
                <div className="text-blue-700 text-sm">
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
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={isClearing}
                onClick={() => {
                  document.getElementById("skills-file-input")?.click();
                }}
                variant="default"
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
                accept=".json"
                className="hidden"
                disabled={isClearing}
                id="skills-file-input"
                onChange={handleImportSkills}
                type="file"
              />
              <span className="text-blue-600 text-sm">
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
                <h2 className="mb-2 font-semibold text-green-900 text-xl">
                  Migrate Sport Names to Codes
                </h2>
                <p className="mb-4 text-green-800 text-sm">
                  Converts team sport values from NAMES (e.g., "GAA Football")
                  to CODES (e.g., "gaa_football") for this organization's teams.
                </p>
                <div className="text-green-700 text-sm">
                  <p className="mb-1 font-medium">This will update:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>"GAA Football" → "gaa_football"</li>
                    <li>"Hurling" → "hurling"</li>
                    <li>"Camogie" → "camogie"</li>
                    <li>"Ladies Football" → "ladies_football"</li>
                    <li>And other sports as needed</li>
                  </ul>
                  <p className="mt-2 text-xs italic">
                    This fixes the issue where assess page can't find skills
                    because sport codes don't match.
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={isClearing}
              onClick={handleMigrateSports}
              variant="default"
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
                <h2 className="mb-2 font-semibold text-orange-900 text-xl">
                  Clear This Organization's Data
                </h2>
                <p className="mb-4 text-orange-800 text-sm">
                  Deletes all data for this organization only. Platform
                  identities are only deleted if orphaned (not used by other
                  orgs).
                </p>
                <div className="text-orange-700 text-sm">
                  <p className="mb-2 font-medium">Select what to delete:</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearOrgSelections.orgPlayerEnrollments}
                        id="clearOrg-orgPlayerEnrollments"
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            orgPlayerEnrollments: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearOrg-orgPlayerEnrollments"
                      >
                        Org player enrollments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearOrgSelections.teamPlayerIdentities}
                        id="clearOrg-teamPlayerIdentities"
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            teamPlayerIdentities: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearOrg-teamPlayerIdentities"
                      >
                        Team-player assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearOrgSelections.sportPassports}
                        id="clearOrg-sportPassports"
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            sportPassports: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearOrg-sportPassports"
                      >
                        Sport passports
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearOrgSelections.coachAssignments}
                        id="clearOrg-coachAssignments"
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            coachAssignments: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearOrg-coachAssignments"
                      >
                        Coach assignments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearOrgSelections.skillAssessments}
                        id="clearOrg-skillAssessments"
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            skillAssessments: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearOrg-skillAssessments"
                      >
                        Skill assessments
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={clearOrgSelections.teams}
                        id="clearOrg-teams"
                        onCheckedChange={(checked) =>
                          setClearOrgSelections({
                            ...clearOrgSelections,
                            teams: checked === true,
                          })
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="clearOrg-teams"
                      >
                        Teams
                      </Label>
                    </div>
                  </div>
                  <p className="mt-3 text-xs italic">
                    Note: Player and guardian identities are only deleted if
                    orphaned (not used by other orgs).
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="gap-2 bg-orange-600 hover:bg-orange-700"
              disabled={isClearing || !orgId}
              onClick={handleClearOrgData}
              variant="destructive"
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
              <h3 className="mb-4 font-semibold text-green-900 text-lg">
                {result.deleted ? "✅ Cleanup Complete" : "✅ Import Complete"}
              </h3>
              <div className="space-y-2 text-sm">
                {result.deleted &&
                  Object.entries(result.deleted).map(([key, value]) => (
                    <div
                      className="flex justify-between rounded bg-white px-3 py-2"
                      key={key}
                    >
                      <span className="font-medium text-gray-700">
                        {key
                          .replace(CAMEL_CASE_SPLIT_REGEX, " $1")
                          .replace(FIRST_CHAR_REGEX, (str) =>
                            str.toUpperCase()
                          )}
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
                      <div className="mb-2 font-semibold text-base text-green-800">
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
                        <div className="mb-2 font-semibold text-gray-700 text-sm">
                          Details by Sport:
                        </div>
                        <div className="space-y-2">
                          {result.details.map((detail: ImportDetail) => (
                            <div
                              className="rounded border border-gray-200 bg-gray-50 p-2"
                              key={detail.sportCode}
                            >
                              <div className="mb-1 font-medium text-gray-800">
                                {detail.sportCode}
                              </div>
                              <div className="ml-2 space-y-1 text-gray-600 text-xs">
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
              <h3 className="mb-2 font-semibold text-lg text-red-900">
                ❌ Error
              </h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </Card>
        )}

        {/* Testing Guide */}
        <Card>
          <div className="p-6">
            <h3 className="mb-4 font-semibold text-lg">Testing Guide</h3>
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
                  <li>Verify counts show proper cleanup of org-scoped data</li>
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
                  <li>Verify shared players still exist (not orphaned)</li>
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

        {/* Fix User Roles */}
        <Card className="border-green-200 bg-green-50">
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <RefreshCw className="mt-1 h-5 w-5 text-green-600" />
              <div>
                <h2 className="mb-2 font-semibold text-green-900 text-xl">
                  Fix User Roles
                </h2>
                <p className="mb-4 text-green-800 text-sm">
                  Add missing functional roles to neil.barlow@gmail.com (coach +
                  admin)
                </p>
              </div>
            </div>
            <Button
              disabled={isClearing}
              onClick={async () => {
                setIsClearing(true);
                setError(null);
                setResult(null);
                try {
                  const res = await addCoachRoleToNeil({
                    organizationId: orgId,
                  });
                  setResult(res);
                  if (res.success) {
                    // biome-ignore lint/suspicious/noAlert: Dev tools intentionally uses alert for feedback
                    alert(
                      `Success! ${res.message}\n\nPlease refresh the page to see the Coach link in the header.`
                    );
                  }
                } catch (err: unknown) {
                  const errorMessage =
                    err instanceof Error ? err.message : "An error occurred";
                  setError(errorMessage);
                  // biome-ignore lint/suspicious/noAlert: Dev tools intentionally uses alert for feedback
                  alert(`Error: ${errorMessage}`);
                } finally {
                  setIsClearing(false);
                }
              }}
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isClearing ? "Fixing..." : "Fix Neil's Roles"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
