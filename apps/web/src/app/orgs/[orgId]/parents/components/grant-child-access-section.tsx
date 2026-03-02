"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Shield,
  ShieldOff,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

type AccessLevel = "view_only" | "view_interact";

type GranularToggles = {
  includeCoachFeedback: boolean;
  includeVoiceNotes: boolean;
  includeDevelopmentGoals: boolean;
  includeAssessments: boolean;
  includeWellnessAccess: boolean;
};

const DEFAULT_TOGGLES: GranularToggles = {
  includeCoachFeedback: true,
  includeVoiceNotes: true,
  includeDevelopmentGoals: true,
  includeAssessments: true,
  includeWellnessAccess: true,
};

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

type GrantChildAccessSectionProps = {
  childPlayerId: Id<"orgPlayerEnrollments">;
  childName: string;
  dateOfBirth?: string;
  organizationId: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI component with complex conditional rendering for access grant/revoke flow (age checks, access levels, granular toggles, preview, revoke dialog)
export function GrantChildAccessSection({
  childPlayerId,
  childName,
  dateOfBirth,
  organizationId,
}: GrantChildAccessSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [accessEnabled, setAccessEnabled] = useState(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("view_only");
  const [toggles, setToggles] = useState<GranularToggles>(DEFAULT_TOGGLES);
  const [isSaving, setIsSaving] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [childEmail, setChildEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const authorization = useQuery(
    api.models.parentChildAuthorizations.getChildAuthorization,
    { childPlayerId }
  );

  const grantChildAccess = useMutation(
    api.models.parentChildAuthorizations.grantChildAccess
  );
  const revokeChildAccess = useMutation(
    api.models.parentChildAuthorizations.revokeChildAccess
  );
  const resendChildAccountInvite = useMutation(
    api.models.parentChildAuthorizations.resendChildAccountInvite
  );

  // Initialise local state from server once loaded
  if (!initialized && authorization !== undefined) {
    if (
      authorization &&
      authorization.accessLevel !== "none" &&
      !authorization.revokedAt
    ) {
      setAccessEnabled(true);
      setAccessLevel(
        authorization.accessLevel === "view_interact"
          ? "view_interact"
          : "view_only"
      );
      setToggles({
        includeCoachFeedback: authorization.includeCoachFeedback,
        includeVoiceNotes: authorization.includeVoiceNotes,
        includeDevelopmentGoals: authorization.includeDevelopmentGoals,
        includeAssessments: authorization.includeAssessments,
        includeWellnessAccess: authorization.includeWellnessAccess,
      });
    }
    setInitialized(true);
  }

  const isGranted =
    authorization !== undefined &&
    authorization !== null &&
    authorization.accessLevel !== "none" &&
    !authorization.revokedAt;

  const childAge = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const isUnder13 = childAge !== null && childAge < 13;
  const isUnder18 = childAge === null || childAge < 18;

  // Don't show this section for 18+ players (they graduate to full accounts)
  if (!isUnder18) {
    return null;
  }

  function getPreviewItems(): string[] {
    const items: string[] = [];
    if (toggles.includeAssessments) {
      items.push("Sport passport ratings and assessments");
    }
    if (toggles.includeDevelopmentGoals) {
      items.push(
        accessLevel === "view_interact"
          ? "Development goals (view + add their own)"
          : "Development goals (view only)"
      );
    }
    if (toggles.includeCoachFeedback) {
      items.push(
        accessLevel === "view_interact"
          ? "Coach feedback (view + respond)"
          : "Coach feedback (view only)"
      );
    }
    if (toggles.includeWellnessAccess) {
      items.push("Wellness check-ins");
    }
    return items;
  }

  async function handleSave() {
    if (!accessEnabled) {
      return;
    }
    setIsSaving(true);
    try {
      const result = await grantChildAccess({
        childPlayerId,
        organizationId,
        accessLevel,
        toggles,
        childEmail: childEmail.trim() || undefined,
      });
      if (result.isNewGrant && childEmail.trim()) {
        toast.success(
          `Access granted for ${childName}. Invite email sent to ${childEmail}.`
        );
      } else {
        toast.success(`Access settings updated for ${childName}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResend() {
    if (!childEmail.trim()) {
      toast.error("Please enter the child's email address");
      return;
    }
    setIsResending(true);
    try {
      await resendChildAccountInvite({
        childPlayerId,
        childEmail: childEmail.trim(),
      });
      toast.success(`Invite re-sent to ${childEmail}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }

  async function handleRevoke() {
    setIsRevoking(true);
    try {
      await revokeChildAccess({ childPlayerId });
      setAccessEnabled(false);
      setInitialized(false);
      setShowRevokeDialog(false);
      toast.success(`Access revoked for ${childName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke";
      toast.error(message);
    } finally {
      setIsRevoking(false);
    }
  }

  if (authorization === undefined) {
    return null;
  }

  return (
    <div className="border-t pt-4">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          <span className="font-medium text-sm">Player Account Access</span>
          {isGranted ? (
            <Badge className="bg-green-100 text-green-700 text-xs">
              Active
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 text-xs">
              Not granted
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Under-13 block */}
          {isUnder13 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-amber-800 text-sm">
                PlayerARC requires players to be at least 13 to have their own
                account.
              </p>
            </div>
          ) : (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <Label className="font-medium text-sm" htmlFor="access-enabled">
                  Allow {childName} to access their player account
                </Label>
                <Switch
                  checked={accessEnabled}
                  id="access-enabled"
                  onCheckedChange={(checked) => {
                    setAccessEnabled(checked);
                    if (checked && !accessLevel) {
                      setAccessLevel("view_only");
                    }
                  }}
                />
              </div>

              {/* Child email input – shown when enabling access for the first time */}
              {accessEnabled && !isGranted && (
                <div className="space-y-1">
                  <Label className="text-sm" htmlFor="child-email">
                    {childName}&apos;s email address{" "}
                    <span className="text-gray-400">
                      (optional – to send account invite)
                    </span>
                  </Label>
                  <Input
                    id="child-email"
                    onChange={(e) => setChildEmail(e.target.value)}
                    placeholder="player@example.com"
                    type="email"
                    value={childEmail}
                  />
                </div>
              )}

              {accessEnabled && (
                <>
                  {/* Access level selector */}
                  <div className="space-y-2">
                    <Label className="text-sm">Access level</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          accessLevel === "view_only"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setAccessLevel("view_only")}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-indigo-600" />
                          <span className="font-medium text-sm">View Only</span>
                        </div>
                        <p className="mt-1 text-gray-500 text-xs">
                          Recommended for ages 13–15
                        </p>
                      </button>

                      <button
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          accessLevel === "view_interact"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setAccessLevel("view_interact")}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-indigo-600" />
                          <span className="font-medium text-sm">
                            View + Interact
                          </span>
                        </div>
                        <p className="mt-1 text-gray-500 text-xs">
                          Recommended for ages 16–17
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Granular content toggles */}
                  <Card className="border-gray-100 bg-gray-50">
                    <CardHeader className="pt-3 pb-2">
                      <CardTitle className="text-sm">
                        Content to include
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3">
                      {(
                        [
                          {
                            key: "includeAssessments" as const,
                            label: "Assessments",
                          },
                          {
                            key: "includeDevelopmentGoals" as const,
                            label: "Development goals",
                          },
                          {
                            key: "includeCoachFeedback" as const,
                            label: "Coach feedback",
                          },
                          {
                            key: "includeVoiceNotes" as const,
                            label: "Voice notes",
                          },
                          {
                            key: "includeWellnessAccess" as const,
                            label: "Wellness check-ins",
                          },
                        ] as { key: keyof GranularToggles; label: string }[]
                      ).map(({ key, label }) => (
                        <div
                          className="flex items-center justify-between"
                          key={key}
                        >
                          <Label className="text-sm" htmlFor={key}>
                            {label}
                          </Label>
                          <Switch
                            checked={toggles[key]}
                            id={key}
                            onCheckedChange={(checked) =>
                              setToggles((prev) => ({
                                ...prev,
                                [key]: checked,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Preview */}
                  {getPreviewItems().length > 0 && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                      <p className="mb-2 font-medium text-indigo-900 text-sm">
                        What {childName} will see
                      </p>
                      <ul className="space-y-1">
                        {getPreviewItems().map((item) => (
                          <li
                            className="flex items-center gap-2 text-indigo-800 text-xs"
                            key={item}
                          >
                            <CheckCircle className="h-3 w-3 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-indigo-700 text-xs">
                        Medical info, emergency contacts, and parent–coach
                        private notes are never shown.
                      </p>
                    </div>
                  )}

                  {/* Save button */}
                  <Button
                    className="w-full"
                    disabled={isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isGranted ? "Update Access Settings" : "Grant Access"}
                  </Button>

                  {/* Resend invite – only shown after access has been granted */}
                  {isGranted && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-gray-600 text-xs">
                        Re-send the account setup email to a new address:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          onChange={(e) => setChildEmail(e.target.value)}
                          placeholder="player@example.com"
                          type="email"
                          value={childEmail}
                        />
                        <Button
                          disabled={isResending}
                          onClick={handleResend}
                          size="sm"
                          variant="outline"
                        >
                          {isResending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : null}
                          Re-send
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Revoke section */}
              {isGranted && (
                <div className="border-t pt-3">
                  <Button
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={isRevoking}
                    onClick={() => setShowRevokeDialog(true)}
                    variant="outline"
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Revoke access
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog onOpenChange={setShowRevokeDialog} open={showRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke access for {childName}?</DialogTitle>
            <DialogDescription>
              Revoking access will log {childName} out of the platform and they
              will no longer be able to see their player data. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isRevoking}
              onClick={() => setShowRevokeDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isRevoking}
              onClick={handleRevoke}
              variant="destructive"
            >
              {isRevoking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
