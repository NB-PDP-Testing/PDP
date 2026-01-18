"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Share2,
  ShieldAlert,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccessAuditLog } from "./access-audit-log";
import { NotificationPreferences } from "./notification-preferences";
import { PendingRequests } from "./pending-requests";
import { QuickShare } from "./quick-share";
import { RevokeConsentModal } from "./revoke-consent-modal";

/**
 * Format sport code to human-readable name
 * Handles both lowercase and uppercase sport codes
 */
function formatSportName(sportCode: string | undefined): string {
  if (!sportCode) {
    return "";
  }

  // Convert to lowercase for lookup
  const normalizedCode = sportCode.toLowerCase();

  const sportNames: Record<string, string> = {
    gaa_gaelic_football: "GAA Gaelic Football",
    gaa_hurling: "GAA Hurling",
    gaa_football: "GAA Gaelic Football",
    gaelic_football: "GAA Gaelic Football",
    hurling: "GAA Hurling",
    soccer: "Soccer",
    football: "Soccer",
    rugby: "Rugby",
    rugby_union: "Rugby Union",
    rugby_league: "Rugby League",
    basketball: "Basketball",
    hockey: "Hockey",
    field_hockey: "Field Hockey",
    ice_hockey: "Ice Hockey",
    tennis: "Tennis",
    cricket: "Cricket",
    athletics: "Athletics",
    track_and_field: "Athletics",
  };

  // Return formatted name or capitalize the raw code
  return (
    sportNames[normalizedCode] ||
    sportCode
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

type ChildSharingCardProps = {
  child: {
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
    };
    enrollment?: {
      sport?: string;
      ageGroup?: string;
    };
  };
  guardianIdentityId?: Id<"guardianIdentities">;
  onEnableSharing?: (
    childId: string,
    sourceRequestId?: Id<"passportShareRequests">
  ) => void;
  // Optional: Pre-fetched data from parent bulk query
  consentsData?: Array<{
    consentId: Id<"passportShareConsents">;
    receivingOrgId: string;
    status: "active" | "expired" | "revoked" | "suspended";
    coachAcceptanceStatus: "pending" | "accepted" | "declined";
    sharedElements: {
      basicProfile: boolean;
      skillRatings: boolean;
      skillHistory: boolean;
      developmentGoals: boolean;
      coachNotes: boolean;
      benchmarkData: boolean;
      attendanceRecords: boolean;
      injuryHistory: boolean;
      medicalSummary: boolean;
      contactInfo: boolean;
    };
    consentedAt: number;
    expiresAt: number;
    revokedAt?: number;
    acceptedAt?: number;
    declinedAt?: number;
  }>;
  pendingRequestsData?: Array<{
    requestId: Id<"passportShareRequests">;
    requestedBy: string;
    requestedByName: string;
    requestingOrgId: string;
    requestingOrgName: string;
    requestingOrgLogo?: string;
    requestingOrgSport?: string;
    requestedByRole: string;
    requestedByEmail?: string;
    reason?: string;
    requestedAt: number;
    expiresAt: number;
    daysUntilExpiry: number;
    isExpiringSoon: boolean;
    status: "pending" | "approved" | "declined" | "expired";
  }>;
};

export function ChildSharingCard({
  child,
  guardianIdentityId,
  onEnableSharing,
  consentsData,
  pendingRequestsData,
}: ChildSharingCardProps) {
  // Modal state for revocation
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedConsentId, setSelectedConsentId] =
    useState<Id<"passportShareConsents"> | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState("");

  // Modal state for audit log
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  // Modal state for preferences
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Modal state for pending requests
  const [pendingRequestsOpen, setPendingRequestsOpen] = useState(false);

  // Fetch consents for this player (only if not provided)
  const consentsQuery = useQuery(
    api.lib.consentGateway.getConsentsForPlayer,
    consentsData
      ? "skip"
      : {
          playerIdentityId: child.player._id,
        }
  );

  // Fetch pending requests for this player (only if not provided)
  const pendingRequestsQuery = useQuery(
    api.models.passportSharing.getPendingRequestsForPlayer,
    pendingRequestsData
      ? "skip"
      : {
          playerIdentityId: child.player._id,
        }
  );

  // Fetch sport passports for this player to get accurate sport information
  // Note: enrollment.sport is DEPRECATED - sportPassports is the source of truth
  const sportPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    {
      playerIdentityId: child.player._id,
    }
  );

  // Use provided data or fallback to query results
  const consents = consentsData ?? consentsQuery;
  const pendingRequests = pendingRequestsData ?? pendingRequestsQuery;

  // Get primary sport from sport passports (first active passport)
  const primarySportCode = useMemo(() => {
    if (!sportPassports || sportPassports.length === 0) {
      return child.enrollment?.sport; // Fallback to deprecated field
    }
    // Find first active passport, or just use first passport
    const activeSport = sportPassports.find((p) => p.status === "active");
    return activeSport?.sportCode || sportPassports[0]?.sportCode;
  }, [sportPassports, child.enrollment?.sport]);

  // Get active consents (for revocation UI)
  const activeConsents = useMemo(() => {
    if (!consents) {
      return [];
    }
    const now = Date.now();
    return consents.filter(
      (c) =>
        c.status === "active" &&
        c.coachAcceptanceStatus === "accepted" &&
        c.expiresAt > now
    );
  }, [consents]);

  // Calculate sharing metrics
  const sharingMetrics = useMemo(() => {
    if (!consents) {
      return {
        activeShares: 0,
        pendingRequests: 0,
        lastActivity: null as Date | null,
      };
    }

    // Count active shares (accepted and not expired)
    const activeSharesCount = activeConsents.length;

    // Count pending requests
    const pendingRequestsCount = pendingRequests?.length || 0;

    // Find last activity (most recent consent/acceptance/decline date)
    let lastActivityTimestamp: number | null = null;

    for (const consent of consents) {
      // Check various activity timestamps
      const timestamps = [
        consent.consentedAt,
        consent.acceptedAt,
        consent.declinedAt,
        consent.revokedAt,
      ].filter((t): t is number => t !== undefined && t !== null);

      for (const timestamp of timestamps) {
        if (!lastActivityTimestamp || timestamp > lastActivityTimestamp) {
          lastActivityTimestamp = timestamp;
        }
      }
    }

    return {
      activeShares: activeSharesCount,
      pendingRequests: pendingRequestsCount,
      lastActivity: lastActivityTimestamp
        ? new Date(lastActivityTimestamp)
        : null,
    };
  }, [consents, pendingRequests, activeConsents]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="mb-1.5 font-semibold text-base">
          {child.player.firstName} {child.player.lastName}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge className="font-normal" variant="outline">
            {formatSportName(primarySportCode) || "Unknown"}
          </Badge>
          <span className="text-muted-foreground">•</span>
          <span>{child.enrollment?.ageGroup || "No age group"}</span>
          {sportPassports && sportPassports.length > 1 && (
            <>
              <span className="text-muted-foreground">•</span>
              <Badge className="text-xs" variant="secondary">
                {sportPassports.length} sports
              </Badge>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QuickShare component (shows only if feature flag enabled and parent has previous consent) */}
        <QuickShare
          childName={`${child.player.firstName} ${child.player.lastName}`}
          onSuccess={() => {
            // Refresh data by triggering re-render
            // Convex will automatically refetch consents
          }}
          playerIdentityId={child.player._id}
        />

        {/* Sharing status - Enhanced visual design */}
        <div className="grid grid-cols-3 gap-3">
          {/* Active Shares */}
          <div
            className={`rounded-lg border-2 p-3 text-center transition-colors ${
              sharingMetrics.activeShares > 0
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div
              className={`mb-1 flex items-center justify-center ${
                sharingMetrics.activeShares > 0
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <Share2 className="h-5 w-5" />
            </div>
            <p
              className={`font-bold text-2xl ${
                sharingMetrics.activeShares > 0
                  ? "text-green-700"
                  : "text-gray-500"
              }`}
            >
              {sharingMetrics.activeShares}
            </p>
            <p className="text-muted-foreground text-xs">Active</p>
          </div>

          {/* Pending Requests */}
          <div
            className={`rounded-lg border-2 p-3 text-center transition-colors ${
              sharingMetrics.pendingRequests > 0
                ? "border-yellow-200 bg-yellow-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div
              className={`mb-1 flex items-center justify-center ${
                sharingMetrics.pendingRequests > 0
                  ? "text-yellow-600"
                  : "text-gray-400"
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>
            <p
              className={`font-bold text-2xl ${
                sharingMetrics.pendingRequests > 0
                  ? "text-yellow-700"
                  : "text-gray-500"
              }`}
            >
              {sharingMetrics.pendingRequests}
            </p>
            <p className="text-muted-foreground text-xs">Pending</p>
          </div>

          {/* Last Activity */}
          <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-center">
            <div className="mb-1 flex items-center justify-center text-gray-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <p className="font-bold text-gray-700 text-xs">
              {sharingMetrics.lastActivity
                ? sharingMetrics.lastActivity.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "None"}
            </p>
            <p className="text-muted-foreground text-xs">Activity</p>
          </div>
        </div>

        {/* Empty state message when no activity */}
        {sharingMetrics.activeShares === 0 &&
          sharingMetrics.pendingRequests === 0 && (
            <div className="rounded-lg border border-gray-300 border-dashed bg-gray-50 p-4 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="font-medium text-gray-700 text-sm">
                No sharing activity yet
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Enable sharing to allow coaches at other organizations to access{" "}
                {child.player.firstName}'s passport
              </p>
            </div>
          )}

        {/* Active shares with detailed information */}
        {activeConsents.length > 0 && (
          <div className="space-y-3">
            <p className="font-medium text-sm">
              Active Shares ({activeConsents.length}):
            </p>
            {activeConsents.map((consent) => {
              // Calculate expiry warning
              const now = Date.now();
              const millisecondsUntilExpiry = consent.expiresAt - now;
              const daysUntilExpiry = Math.ceil(
                millisecondsUntilExpiry / (1000 * 60 * 60 * 24)
              );
              const isExpiringSoon = daysUntilExpiry <= 14;

              return (
                <div
                  className="space-y-3 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm"
                  key={consent.consentId}
                >
                  {/* Organization Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-green-200 bg-white">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {consent.receivingOrgId.slice(0, 20)}...
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Organization
                        </p>
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
                        {new Date(consent.consentedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Expires</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm">
                          {new Date(consent.expiresAt).toLocaleDateString()}
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

                  {/* Shared Elements */}
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
                          <span>Notes</span>
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
                          <span>Contact</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setSelectedConsentId(consent.consentId);
                        setSelectedOrgName(consent.receivingOrgId);
                        setRevokeModalOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Revoke Access
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Child-specific actions */}
        {(sharingMetrics.pendingRequests > 0 || activeConsents.length > 0) && (
          <div className="flex flex-col gap-2">
            {sharingMetrics.pendingRequests > 0 && (
              <Button
                className="w-full"
                onClick={() => setPendingRequestsOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                View Pending Requests
                <Badge className="ml-2" variant="default">
                  {sharingMetrics.pendingRequests}
                </Badge>
              </Button>
            )}
            {activeConsents.length > 0 && (
              <Button
                className="w-full"
                onClick={() => setAuditLogOpen(true)}
                size="sm"
                type="button"
                variant="ghost"
              >
                View Access Log
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Revoke Consent Modal */}
      {selectedConsentId && (
        <RevokeConsentModal
          childName={`${child.player.firstName} ${child.player.lastName}`}
          consentId={selectedConsentId}
          onOpenChange={setRevokeModalOpen}
          onSuccess={() => {
            // Convex will automatically refetch consents
          }}
          open={revokeModalOpen}
          organizationName={selectedOrgName}
        />
      )}

      {/* Access Audit Log Dialog */}
      <Dialog onOpenChange={setAuditLogOpen} open={auditLogOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Access Log - {child.player.firstName} {child.player.lastName}
            </DialogTitle>
          </DialogHeader>
          <AccessAuditLog
            childName={`${child.player.firstName} ${child.player.lastName}`}
            playerIdentityId={child.player._id}
          />
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Dialog */}
      {guardianIdentityId && (
        <Dialog onOpenChange={setPreferencesOpen} open={preferencesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Notification Preferences</DialogTitle>
            </DialogHeader>
            <NotificationPreferences
              guardianIdentityId={guardianIdentityId}
              playerIdentityId={child.player._id}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Pending Requests Dialog */}
      <Dialog onOpenChange={setPendingRequestsOpen} open={pendingRequestsOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pending Requests - {child.player.firstName}{" "}
              {child.player.lastName}
            </DialogTitle>
          </DialogHeader>
          <PendingRequests
            childName={`${child.player.firstName} ${child.player.lastName}`}
            onApprove={(requestId) => {
              // Close the pending requests dialog
              setPendingRequestsOpen(false);
              // Open the enable sharing wizard with the request ID
              onEnableSharing?.(child.player._id, requestId);
            }}
            playerIdentityId={child.player._id}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
