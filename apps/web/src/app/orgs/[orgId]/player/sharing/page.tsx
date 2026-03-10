"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

function ToggleRow({
  icon,
  label,
  description,
  checked,
  saving,
  onCheckedChange,
  htmlFor,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onCheckedChange: (v: boolean) => void;
  htmlFor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <div className="flex flex-1 items-center gap-2">
        {icon}
        <div>
          <Label className="text-sm" htmlFor={htmlFor}>
            {label}
          </Label>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          checked={checked}
          id={htmlFor}
          onCheckedChange={onCheckedChange}
        />
      )}
    </div>
  );
}

function formatSportName(sportCode: string): string {
  const names: Record<string, string> = {
    gaa_football: "GAA Gaelic Football",
    hurling: "GAA Hurling",
    rugby: "Rugby",
    soccer: "Soccer",
    basketball: "Basketball",
    hockey: "Hockey",
    athletics: "Athletics",
  };
  return (
    names[sportCode] ||
    sportCode.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

export default function PlayerSharingPage() {
  const [savingField, setSavingField] = useState<string | null>(null);

  const privacySettings = useQuery(
    api.models.passportSharing.getMyPlayerPrivacySettings
  );
  const sharingData = useQuery(
    api.models.passportSharing.getMyPassportSharingData
  );

  const updatePrivacy = useMutation(
    api.models.passportSharing.updateMyPlayerPrivacySettings
  );
  const revokeConsent = useMutation(
    api.models.passportSharing.revokeMyPassportSharing
  );
  const respondToRequest = useMutation(
    api.models.passportSharing.respondToAccessRequestAsPlayer
  );

  const handlePrivacyToggle = async (
    field:
      | "allowGlobalPassportDiscovery"
      | "allowCrossOrgSharing"
      | "allowEnrollmentVisibility",
    value: boolean,
    successMsg: string
  ) => {
    setSavingField(field);
    try {
      await updatePrivacy({ [field]: value });
      toast.success(value ? `${successMsg} enabled` : `${successMsg} disabled`);
    } catch {
      toast.error("Failed to update setting. Please try again.");
    } finally {
      setSavingField(null);
    }
  };

  const handleRevoke = async (consentId: Id<"passportShareConsents">) => {
    setSavingField(`revoke-${consentId}`);
    try {
      await revokeConsent({ consentId });
      toast.success("Access revoked successfully");
    } catch {
      toast.error("Failed to revoke access");
    } finally {
      setSavingField(null);
    }
  };

  const handleRespond = async (
    requestId: Id<"passportShareRequests">,
    response: "approved" | "declined"
  ) => {
    try {
      await respondToRequest({ requestId, response });
      toast.success(
        response === "approved" ? "Request approved" : "Request declined"
      );
    } catch {
      toast.error("Failed to respond to request");
    }
  };

  if (privacySettings === undefined || sharingData === undefined) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const now = Date.now();
  const activeConsents =
    sharingData.consents.filter(
      (c) =>
        c.status === "active" &&
        c.coachAcceptanceStatus === "accepted" &&
        c.expiresAt > now
    ) ?? [];

  const pendingConsents =
    sharingData.consents.filter(
      (c) => c.status === "active" && c.coachAcceptanceStatus === "pending"
    ) ?? [];

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <OrgThemedGradient
        className="rounded-lg p-4 shadow-md md:p-6"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Shield className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Passport Sharing</h1>
            <p className="text-sm opacity-90">
              Control who can view your sports passport data
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle className="text-green-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {activeConsents.length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Active Shares
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-600"
                style={{ width: activeConsents.length > 0 ? "100%" : "0%" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Clock className="text-orange-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {sharingData.pendingRequests?.length ?? 0}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Pending Requests
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-orange-100">
              <div
                className="h-1 rounded-full bg-orange-600"
                style={{
                  width:
                    (sharingData.pendingRequests?.length ?? 0) > 0
                      ? "100%"
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-blue-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {pendingConsents.length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Awaiting Acceptance
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-100">
              <div
                className="h-1 rounded-full bg-blue-600"
                style={{ width: pendingConsents.length > 0 ? "100%" : "0%" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Search className="text-purple-600" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {privacySettings?.allowGlobalPassportDiscovery ? "On" : "Off"}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Discovery
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div
                className="h-1 rounded-full bg-purple-600"
                style={{
                  width: privacySettings?.allowGlobalPassportDiscovery
                    ? "100%"
                    : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="space-y-1">
            <p className="font-medium text-blue-900 text-sm">
              What is passport sharing?
            </p>
            <p className="text-blue-700 text-sm">
              Enable sharing to allow coaches from other clubs to view your
              development passport. You control access and can revoke it
              anytime.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy settings */}
      {privacySettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-blue-600" />
              Privacy Settings
            </CardTitle>
            <CardDescription>
              Control how your passport and enrollment information is shared
              across organisations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg bg-muted/30">
              <ToggleRow
                checked={privacySettings.allowGlobalPassportDiscovery}
                description="Allow coaches at any organisation to discover and request access to your passport"
                htmlFor="global-discovery"
                icon={
                  <Search
                    className={`h-4 w-4 shrink-0 ${privacySettings.allowGlobalPassportDiscovery ? "text-blue-600" : "text-gray-400"}`}
                  />
                }
                label="Global Passport Discovery"
                onCheckedChange={(v) =>
                  handlePrivacyToggle(
                    "allowGlobalPassportDiscovery",
                    v,
                    "Global passport discovery"
                  )
                }
                saving={savingField === "allowGlobalPassportDiscovery"}
              />
              <ToggleRow
                checked={privacySettings.allowCrossOrgSharing}
                description="Allow other clubs to see that you are enrolled across multiple organisations"
                htmlFor="cross-org-sharing"
                icon={
                  <Users
                    className={`h-4 w-4 shrink-0 ${privacySettings.allowCrossOrgSharing ? "text-blue-600" : "text-gray-400"}`}
                  />
                }
                label="Cross-Organisation Sharing"
                onCheckedChange={(v) =>
                  handlePrivacyToggle(
                    "allowCrossOrgSharing",
                    v,
                    "Cross-organisation sharing"
                  )
                }
                saving={savingField === "allowCrossOrgSharing"}
              />
              <ToggleRow
                checked={privacySettings.allowEnrollmentVisibility}
                description="Allow other clubs to see which organisations you are enrolled with"
                htmlFor="enrollment-visibility"
                icon={
                  privacySettings.allowEnrollmentVisibility ? (
                    <Eye className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 shrink-0 text-gray-400" />
                  )
                }
                label="Enrollment Visibility"
                onCheckedChange={(v) =>
                  handlePrivacyToggle(
                    "allowEnrollmentVisibility",
                    v,
                    "Enrollment visibility"
                  )
                }
                saving={savingField === "allowEnrollmentVisibility"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending requests */}
      {sharingData.pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Requests
              <Badge className="ml-1" variant="secondary">
                {sharingData.pendingRequests.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Coaches requesting access to your passport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharingData.pendingRequests.map((req) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={req.requestId}
              >
                <div>
                  <p className="font-medium text-sm">{req.requestingOrgName}</p>
                  <p className="text-muted-foreground text-xs">
                    Requested by {req.requestedByName}
                    {req.reason ? ` · ${req.reason}` : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Expires{" "}
                    {new Date(req.expiresAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRespond(req.requestId, "approved")}
                    size="sm"
                    variant="default"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleRespond(req.requestId, "declined")}
                    size="sm"
                    variant="outline"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active shares — rich detail view */}
      {activeConsents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Active Shares ({activeConsents.length})
            </CardTitle>
            <CardDescription>
              Organisations currently with access to your passport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeConsents.map((consent) => {
              const msUntilExpiry = consent.expiresAt - now;
              const daysUntilExpiry = Math.ceil(
                msUntilExpiry / (1000 * 60 * 60 * 24)
              );
              const isExpiringSoon = daysUntilExpiry <= 14;
              const isRevoking = savingField === `revoke-${consent.consentId}`;

              return (
                <div
                  className="space-y-3 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm"
                  key={consent.consentId}
                >
                  {/* Org header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-green-200 bg-white">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {consent.receivingOrgName}
                        </p>
                        {consent.visibleSportCodes &&
                          consent.visibleSportCodes.length > 0 && (
                            <p className="text-muted-foreground text-xs">
                              {consent.visibleSportCodes
                                .map(formatSportName)
                                .join(", ")}
                            </p>
                          )}
                      </div>
                    </div>
                    <Badge className="bg-green-600" variant="default">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 rounded-md bg-white p-3">
                    <div>
                      <p className="text-muted-foreground text-xs">Shared On</p>
                      <p className="font-medium text-sm">
                        {new Date(consent.consentedAt).toLocaleDateString(
                          "en-GB"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Expires</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm">
                          {new Date(consent.expiresAt).toLocaleDateString(
                            "en-GB"
                          )}
                        </p>
                        {isExpiringSoon && (
                          <Badge
                            className="px-1.5 py-0 text-xs"
                            variant="destructive"
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {daysUntilExpiry}d
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shared elements */}
                  <div className="rounded-md border border-green-200 bg-white p-3">
                    <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Shared Information
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {consent.sharedElements.basicProfile && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Profile</span>
                        </div>
                      )}
                      {consent.sharedElements.skillRatings && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Skills</span>
                        </div>
                      )}
                      {consent.sharedElements.developmentGoals && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Goals</span>
                        </div>
                      )}
                      {consent.sharedElements.coachNotes && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Coach Notes</span>
                        </div>
                      )}
                      {consent.sharedElements.attendanceRecords && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Attendance</span>
                        </div>
                      )}
                      {consent.sharedElements.injuryHistory && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Injuries</span>
                        </div>
                      )}
                      {consent.sharedElements.medicalSummary && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                          <span className="font-medium">Medical</span>
                        </div>
                      )}
                      {consent.sharedElements.contactInfo && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          <span>Contact Info</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Revoke */}
                  <Button
                    className="w-full"
                    disabled={isRevoking}
                    onClick={() => handleRevoke(consent.consentId)}
                    size="sm"
                    variant="destructive"
                  >
                    {isRevoking && (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    )}
                    Revoke Access
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Awaiting coach acceptance */}
      {pendingConsents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Awaiting Coach Acceptance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingConsents.map((consent) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={consent.consentId}
              >
                <div>
                  <p className="font-medium text-sm">
                    {consent.receivingOrgName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Waiting for coach to accept
                  </p>
                </div>
                <Button
                  disabled={savingField === `revoke-${consent.consentId}`}
                  onClick={() => handleRevoke(consent.consentId)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {activeConsents.length === 0 &&
        pendingConsents.length === 0 &&
        sharingData.pendingRequests.length === 0 && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No Active Shares</CardTitle>
              <CardDescription>
                Enable Global Passport Discovery above to allow coaches from
                other clubs to find and request access to your passport.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
    </div>
  );
}
