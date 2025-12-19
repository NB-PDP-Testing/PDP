"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@pdp/backend/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, RefreshCw } from "lucide-react";

export default function DevToolsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const clearAllDevData = useMutation(api.scripts.clearDevData.clearAllDevData);
  const clearOrgData = useMutation(api.scripts.clearDevData.clearOrgData);

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
      const result = await clearAllDevData({ confirmDelete: true });
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
      });
      setResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
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
                  <p className="mb-1 font-medium">This will delete:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>All player identities and guardian identities</li>
                    <li>All guardian-player links</li>
                    <li>All org player enrollments</li>
                    <li>All team-player assignments</li>
                    <li>All sport passports</li>
                    <li>All teams (Convex teams table)</li>
                    <li>All sports reference data</li>
                    <li>All other reference data</li>
                  </ul>
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
                  <p className="mb-1 font-medium">This will delete:</p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>All org player enrollments for this org</li>
                    <li>All team-player assignments for this org's teams</li>
                    <li>All sport passports for this org</li>
                    <li>All teams for this org</li>
                    <li>
                      Player identities ONLY if not enrolled in any other org
                    </li>
                    <li>
                      Guardian identities ONLY if no linked players remain
                    </li>
                  </ul>
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
                ✅ Cleanup Complete
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(result.deleted).map(([key, value]) => (
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
                    <span className="font-bold text-green-700">{value as number}</span>
                  </div>
                ))}
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
                <h4 className="mb-2 font-medium">1. Test Fresh Import</h4>
                <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                  <li>Clear all dev data using the button above</li>
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
