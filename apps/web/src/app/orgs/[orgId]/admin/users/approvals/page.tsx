"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Baby,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  Star,
  Trophy,
  UserCircle,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { getRoleColor } from "@/components/functional-role-indicator";
import { OrgThemedButton } from "@/components/org-themed-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useOrgTheme } from "@/hooks/use-org-theme";

// Types for smart match results
interface SmartMatch {
  _id: string;
  name: string;
  ageGroup: string;
  sport: string;
  matchScore: number;
  matchReasons: string[];
  confidence: "high" | "medium" | "low" | "none";
  existingParentEmail: string | null;
}

// Confidence badge colors
function getConfidenceBadge(confidence: SmartMatch["confidence"]) {
  switch (confidence) {
    case "high":
      return (
        <Badge className="border-green-300 bg-green-100 text-green-700">
          <Star className="mr-1 h-3 w-3" /> High Match
        </Badge>
      );
    case "medium":
      return (
        <Badge className="border-yellow-300 bg-yellow-100 text-yellow-700">
          Medium Match
        </Badge>
      );
    case "low":
      return (
        <Badge className="border-gray-300 bg-gray-100 text-gray-700">
          Low Match
        </Badge>
      );
    default:
      return null;
  }
}

export default function JoinRequestApprovalsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { theme } = useOrgTheme();

  const pendingRequests = useQuery(
    api.models.orgJoinRequests.getPendingRequestsForOrg,
    { organizationId: orgId }
  );
  const approveRequest = useMutation(
    api.models.orgJoinRequests.approveJoinRequest
  );
  const rejectRequest = useMutation(
    api.models.orgJoinRequests.rejectJoinRequest
  );

  // Get teams for coach assignment
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Pending functional role requests from existing members
  const pendingRoleRequests = useQuery(
    api.models.members.getPendingFunctionalRoleRequests,
    { organizationId: orgId }
  );
  const approveFunctionalRole = useMutation(
    api.models.members.approveFunctionalRoleRequest
  );
  const rejectFunctionalRole = useMutation(
    api.models.members.rejectFunctionalRoleRequest
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    _id: string;
    userName: string;
    userEmail: string;
    requestedFunctionalRoles?: string[];
    requestedRole: string;
    // Parent/Coach additional fields for smart matching
    phone?: string;
    address?: string;
    children?: string; // JSON string of [{name, age, team?}]
    coachSport?: string;
    coachGender?: string;
    coachTeams?: string;
    coachAgeGroups?: string;
    message?: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  // Role configuration state for approval
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [expandedMatches, setExpandedMatches] = useState(false);

  // Functional role request state
  const [roleRejectDialogOpen, setRoleRejectDialogOpen] = useState(false);
  const [selectedRoleRequest, setSelectedRoleRequest] = useState<{
    memberId: string;
    userName: string | null;
    userEmail: string | null;
    requestedRole: "coach" | "parent" | "admin";
  } | null>(null);
  const [roleRejectionReason, setRoleRejectionReason] = useState("");

  // Extract surname from userName for better matching
  const extractSurname = (fullName: string | undefined): string | undefined => {
    if (!fullName) return;
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  };

  // Fetch smart matches for the selected parent request
  // Now passes all available data for better matching
  const smartMatches = useQuery(
    api.models.players.getSmartMatchesForParent,
    selectedRequest &&
      (selectedRequest.requestedFunctionalRoles?.includes("parent") ||
        selectedRequest.requestedRole === "parent")
      ? {
          organizationId: orgId,
          email: selectedRequest.userEmail,
          surname: extractSurname(selectedRequest.userName),
          phone: selectedRequest.phone,
          address: selectedRequest.address,
          children: selectedRequest.children,
        }
      : "skip"
  );

  const isLoading = pendingRequests === undefined;

  const filteredRequests = pendingRequests?.filter((request) => {
    if (!searchTerm) return true;
    const searchable = [request.userName, request.userEmail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setLoading(selectedRequest._id);
    try {
      await approveRequest({
        requestId: selectedRequest._id as any,
        coachTeams: selectedTeams.length > 0 ? selectedTeams : undefined,
        linkedPlayerIds:
          selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
      });
      toast.success("Join request approved");
      setApproveDialogOpen(false);
      resetApprovalState();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setLoading(null);
    }
  };

  const handleQuickApprove = async (requestId: string) => {
    setLoading(requestId);
    try {
      await approveRequest({ requestId: requestId as any });
      toast.success("Join request approved");
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!(selectedRequest && rejectionReason.trim())) return;

    setLoading(selectedRequest._id);
    try {
      await rejectRequest({
        requestId: selectedRequest._id as any,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Join request rejected");
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setLoading(null);
    }
  };

  const openRejectDialog = (request: {
    _id: string;
    userName: string;
    userEmail: string;
  }) => {
    setSelectedRequest(request as any);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const openApproveDialog = (request: any) => {
    setSelectedRequest(request);
    setSelectedTeams([]);
    setSelectedPlayerIds([]);
    setExpandedMatches(false);
    setApproveDialogOpen(true);
  };

  const resetApprovalState = () => {
    setSelectedRequest(null);
    setSelectedTeams([]);
    setSelectedPlayerIds([]);
    setExpandedMatches(false);
  };

  const toggleTeam = (teamName: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamName)
        ? prev.filter((t) => t !== teamName)
        : [...prev, teamName]
    );
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((p) => p !== playerId)
        : [...prev, playerId]
    );
  };

  // Check if request needs configuration
  const needsConfiguration = (request: any) => {
    const roles = request.requestedFunctionalRoles || [];
    return (
      roles.includes("coach") ||
      roles.includes("parent") ||
      request.requestedRole === "coach" ||
      request.requestedRole === "parent"
    );
  };

  const isCoachRequest = (request: any) => {
    const roles = request.requestedFunctionalRoles || [];
    return roles.includes("coach") || request.requestedRole === "coach";
  };

  const isParentRequest = (request: any) => {
    const roles = request.requestedFunctionalRoles || [];
    return roles.includes("parent") || request.requestedRole === "parent";
  };

  // Handlers for functional role requests (existing members)
  const handleApproveFunctionalRole = async (
    memberId: string,
    role: "coach" | "parent" | "admin"
  ) => {
    setLoading(`role-${memberId}-${role}`);
    try {
      await approveFunctionalRole({
        organizationId: orgId,
        memberId,
        role,
      });
      toast.success(
        `${role.charAt(0).toUpperCase() + role.slice(1)} role approved`
      );
    } catch (error) {
      console.error("Error approving role request:", error);
      toast.error("Failed to approve role request");
    } finally {
      setLoading(null);
    }
  };

  const handleRejectFunctionalRole = async () => {
    if (!selectedRoleRequest) return;

    setLoading(
      `role-${selectedRoleRequest.memberId}-${selectedRoleRequest.requestedRole}`
    );
    try {
      await rejectFunctionalRole({
        organizationId: orgId,
        memberId: selectedRoleRequest.memberId,
        role: selectedRoleRequest.requestedRole,
      });
      toast.success("Role request rejected");
      setRoleRejectDialogOpen(false);
      setSelectedRoleRequest(null);
      setRoleRejectionReason("");
    } catch (error) {
      console.error("Error rejecting role request:", error);
      toast.error("Failed to reject role request");
    } finally {
      setLoading(null);
    }
  };

  const openRoleRejectDialog = (request: {
    memberId: string;
    userName: string | null;
    userEmail: string | null;
    requestedRole: "coach" | "parent" | "admin";
  }) => {
    setSelectedRoleRequest(request);
    setRoleRejectionReason("");
    setRoleRejectDialogOpen(true);
  };

  const RequestCard = ({ request }: { request: any }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)",
            }}
          >
            <UserCircle className="h-6 w-6" style={{ color: theme.primary }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-lg">{request.userName}</h3>
              {/* Show functional roles (coach, parent, admin) if available */}
              {request.requestedFunctionalRoles?.length > 0 ? (
                request.requestedFunctionalRoles.map((role: string) => (
                  <Badge
                    className={`border capitalize ${getRoleColor(role)}`}
                    key={role}
                    variant="outline"
                  >
                    {role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                    {role === "coach" && <Users className="mr-1 h-3 w-3" />}
                    {role === "parent" && (
                      <UserCircle className="mr-1 h-3 w-3" />
                    )}
                    {role}
                  </Badge>
                ))
              ) : (
                /* Fall back to legacy requestedRole for backwards compatibility */
                <Badge
                  className={`border capitalize ${getRoleColor(request.requestedRole)}`}
                  variant="outline"
                >
                  {request.requestedRole}
                </Badge>
              )}
            </div>

            <div className="mt-2 space-y-1 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="truncate">{request.userEmail}</span>
              </div>
              {request.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{request.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Requested {new Date(request.requestedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Parent info display */}
            {(request.requestedFunctionalRoles?.includes("parent") ||
              request.requestedRole === "parent") && (
              <div className="mt-3 space-y-2">
                {request.address && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-sm dark:border-blue-800 dark:bg-blue-950/30">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span className="text-blue-800 dark:text-blue-200">
                      {request.address}
                    </span>
                  </div>
                )}
                {request.children &&
                  (() => {
                    try {
                      const childrenData = JSON.parse(
                        request.children
                      ) as Array<{
                        name: string;
                        age?: number;
                        team?: string;
                      }>;
                      if (childrenData.length > 0) {
                        return (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950/30">
                            <p className="mb-1 flex items-center gap-1 font-medium text-blue-800 text-xs dark:text-blue-200">
                              <Baby className="h-3 w-3" />
                              Children ({childrenData.length})
                            </p>
                            <div className="space-y-1">
                              {childrenData.map((child, idx) => (
                                <div
                                  className="text-blue-700 text-xs dark:text-blue-300"
                                  key={idx}
                                >
                                  <span className="font-medium">
                                    {child.name}
                                  </span>
                                  {child.age && <span> • Age {child.age}</span>}
                                  {child.team && <span> • {child.team}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    } catch {
                      return null;
                    }
                  })()}
              </div>
            )}

            {/* Coach info display */}
            {(request.requestedFunctionalRoles?.includes("coach") ||
              request.requestedRole === "coach") &&
              (request.coachSport ||
                request.coachTeams ||
                request.coachAgeGroups) && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950/30">
                  <p className="mb-1 flex items-center gap-1 font-medium text-green-800 text-xs dark:text-green-200">
                    <Trophy className="h-3 w-3" />
                    Coach Details
                  </p>
                  <div className="space-y-1 text-green-700 text-xs dark:text-green-300">
                    {request.coachSport && (
                      <div>
                        <span className="font-medium">Sport:</span>{" "}
                        {request.coachSport}
                        {request.coachGender && ` (${request.coachGender})`}
                      </div>
                    )}
                    {request.coachTeams && (
                      <div>
                        <span className="font-medium">Teams:</span>{" "}
                        {request.coachTeams}
                      </div>
                    )}
                    {request.coachAgeGroups && (
                      <div>
                        <span className="font-medium">Age Groups:</span>{" "}
                        {request.coachAgeGroups}
                      </div>
                    )}
                  </div>
                </div>
              )}

            {request.message && (
              <div className="mt-3 rounded-lg border bg-muted/50 p-3">
                <p className="mb-1 font-medium text-xs">Message</p>
                <p className="text-muted-foreground text-sm">
                  {request.message}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            disabled={loading === request._id}
            onClick={() =>
              openRejectDialog({
                _id: request._id,
                userName: request.userName,
                userEmail: request.userEmail,
              })
            }
            size="sm"
            variant="outline"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          {needsConfiguration(request) ? (
            <OrgThemedButton
              disabled={loading === request._id}
              onClick={() => openApproveDialog(request)}
              size="sm"
              variant="primary"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Configure & Approve
            </OrgThemedButton>
          ) : (
            <OrgThemedButton
              disabled={loading === request._id}
              onClick={() => handleQuickApprove(request._id)}
              size="sm"
              variant="primary"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {loading === request._id
                ? "Approving..."
                : "Approve & Add to Org"}
            </OrgThemedButton>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );

  // Get high confidence matches
  const highConfidenceMatches =
    smartMatches?.filter((m) => m.confidence === "high") || [];
  const otherMatches =
    smartMatches?.filter((m) => m.confidence !== "high") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Pending Approvals</h1>
        <p className="mt-2 text-muted-foreground">
          Review and approve membership requests and role requests
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search requests by name or email..."
          value={searchTerm}
        />
      </div>

      {/* Membership Requests Section */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-xl">
          <UserPlus className="h-5 w-5" />
          Membership Requests
          {pendingRequests && pendingRequests.length > 0 && (
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          )}
        </h2>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRequests && filteredRequests.length > 0 ? (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                description={
                  searchTerm
                    ? "No requests match your search criteria."
                    : "There are no pending membership requests at the moment."
                }
                icon={CheckCircle}
                title="No Membership Requests"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Requests Section - Existing members requesting additional roles */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-xl">
          <Shield className="h-5 w-5" />
          Role Requests
          {pendingRoleRequests && pendingRoleRequests.length > 0 && (
            <Badge variant="secondary">{pendingRoleRequests.length}</Badge>
          )}
        </h2>
        {pendingRoleRequests === undefined ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingRoleRequests.length > 0 ? (
          <div className="grid gap-4">
            {pendingRoleRequests.map((request) => (
              <Card
                className="overflow-hidden"
                key={`${request.memberId}-${request.requestedRole}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)",
                      }}
                    >
                      {request.userImage ? (
                        <img
                          alt={request.userName || "User"}
                          className="h-12 w-12 rounded-full object-cover"
                          src={request.userImage}
                        />
                      ) : (
                        <UserCircle
                          className="h-6 w-6"
                          style={{ color: theme.primary }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {request.userName || "Unknown User"}
                        </h3>
                        <Badge className="border-amber-300 bg-amber-100 text-amber-700">
                          Existing Member
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-1 text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{request.userEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Requested{" "}
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="mb-2 text-muted-foreground text-sm">
                          Requesting the{" "}
                          <span className="font-medium">
                            {request.requestedRole}
                          </span>{" "}
                          role
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-muted-foreground text-xs">
                            Current roles:
                          </span>
                          {request.currentRoles.length > 0 ? (
                            request.currentRoles.map((role) => (
                              <Badge
                                className={`border capitalize ${getRoleColor(role)}`}
                                key={role}
                                variant="outline"
                              >
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              No functional roles
                            </span>
                          )}
                        </div>
                      </div>

                      {request.message && (
                        <div className="mt-3 rounded-lg border bg-muted/50 p-3">
                          <p className="mb-1 font-medium text-xs">Message</p>
                          <p className="text-muted-foreground text-sm">
                            {request.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      disabled={
                        loading ===
                        `role-${request.memberId}-${request.requestedRole}`
                      }
                      onClick={() =>
                        openRoleRejectDialog({
                          memberId: request.memberId,
                          userName: request.userName,
                          userEmail: request.userEmail,
                          requestedRole: request.requestedRole,
                        })
                      }
                      size="sm"
                      variant="outline"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <OrgThemedButton
                      disabled={
                        loading ===
                        `role-${request.memberId}-${request.requestedRole}`
                      }
                      onClick={() =>
                        handleApproveFunctionalRole(
                          request.memberId,
                          request.requestedRole
                        )
                      }
                      size="sm"
                      variant="primary"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {loading ===
                      `role-${request.memberId}-${request.requestedRole}`
                        ? "Approving..."
                        : `Grant ${request.requestedRole.charAt(0).toUpperCase() + request.requestedRole.slice(1)} Role`}
                    </OrgThemedButton>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                description="There are no pending role requests from existing members."
                icon={CheckCircle}
                title="No Role Requests"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Reject Membership Request
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedRequest?.userName}
              's request. This will be recorded for audit purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              rows={4}
              value={rejectionReason}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={loading !== null}
              onClick={() => setRejectDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!rejectionReason.trim() || loading !== null}
              onClick={handleReject}
              variant="destructive"
            >
              {loading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Configuration Dialog */}
      <Dialog
        onOpenChange={(open) => {
          setApproveDialogOpen(open);
          if (!open) resetApprovalState();
        }}
        open={approveDialogOpen}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Configure & Approve Request
            </DialogTitle>
            <DialogDescription>
              Configure role-specific settings for {selectedRequest?.userName}{" "}
              before approving their request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Requested Roles */}
            <div>
              <Label className="font-medium text-sm">Requested Roles</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedRequest?.requestedFunctionalRoles?.map(
                  (role: string) => (
                    <Badge
                      className={`border capitalize ${getRoleColor(role)}`}
                      key={role}
                      variant="outline"
                    >
                      {role}
                    </Badge>
                  )
                ) || (
                  <Badge
                    className={`border capitalize ${getRoleColor(selectedRequest?.requestedRole || "")}`}
                    variant="outline"
                  >
                    {selectedRequest?.requestedRole}
                  </Badge>
                )}
              </div>
            </div>

            {/* Coach Team Assignment */}
            {selectedRequest && isCoachRequest(selectedRequest) && (
              <div className="space-y-3">
                <Label className="font-medium text-sm">
                  Assign Teams (Coach)
                </Label>
                <p className="text-muted-foreground text-sm">
                  Select which teams this coach will be assigned to.
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {teams && teams.length > 0 ? (
                    teams.map((team) => (
                      <div
                        className="flex items-center gap-3"
                        key={team._id}
                        onClick={() => toggleTeam(team.name)}
                      >
                        <Checkbox
                          checked={selectedTeams.includes(team.name)}
                          onCheckedChange={() => toggleTeam(team.name)}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{team.name}</span>
                        </div>
                        {selectedTeams.includes(team.name) && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-muted-foreground text-sm">
                      No teams available. Teams can be assigned later.
                    </p>
                  )}
                </div>
                {selectedTeams.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {selectedTeams.length} team(s) selected
                  </p>
                )}
              </div>
            )}

            {/* Parent Player Linking */}
            {selectedRequest && isParentRequest(selectedRequest) && (
              <div className="space-y-3">
                <Label className="font-medium text-sm">
                  Link Children (Parent)
                </Label>
                <p className="text-muted-foreground text-sm">
                  Select which players are this parent's children. Smart
                  matching found potential matches based on email and other
                  data.
                </p>

                {/* High Confidence Matches */}
                {highConfidenceMatches.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-green-700 text-sm">
                      High Confidence Matches
                    </p>
                    <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
                      {highConfidenceMatches.map((match) => (
                        <div
                          className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-green-100"
                          key={match._id}
                          onClick={() => togglePlayer(match._id)}
                        >
                          <Checkbox
                            checked={selectedPlayerIds.includes(match._id)}
                            onCheckedChange={() => togglePlayer(match._id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{match.name}</span>
                              {getConfidenceBadge(match.confidence)}
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {match.ageGroup} • {match.sport}
                            </p>
                            <p className="text-green-700 text-xs">
                              {match.matchReasons.join(" • ")}
                            </p>
                          </div>
                          {selectedPlayerIds.includes(match._id) && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Matches (collapsed by default) */}
                {otherMatches.length > 0 && (
                  <div className="space-y-2">
                    <button
                      className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
                      onClick={() => setExpandedMatches(!expandedMatches)}
                      type="button"
                    >
                      {expandedMatches ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {otherMatches.length} other potential matches
                    </button>
                    {expandedMatches && (
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                        {otherMatches.map((match) => (
                          <div
                            className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-muted"
                            key={match._id}
                            onClick={() => togglePlayer(match._id)}
                          >
                            <Checkbox
                              checked={selectedPlayerIds.includes(match._id)}
                              onCheckedChange={() => togglePlayer(match._id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {match.name}
                                </span>
                                {getConfidenceBadge(match.confidence)}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {match.ageGroup} • {match.sport}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {match.matchReasons.join(" • ")}
                              </p>
                            </div>
                            {selectedPlayerIds.includes(match._id) && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {smartMatches?.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-muted-foreground text-sm">
                      No potential matches found. Players can be linked manually
                      later.
                    </p>
                  </div>
                )}

                {selectedPlayerIds.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {selectedPlayerIds.length} player(s) will be linked
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={loading !== null}
              onClick={() => {
                setApproveDialogOpen(false);
                resetApprovalState();
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <OrgThemedButton
              disabled={loading !== null}
              onClick={handleApprove}
              variant="primary"
            >
              {loading ? "Approving..." : "Approve & Add to Org"}
            </OrgThemedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Rejection Dialog */}
      <Dialog
        onOpenChange={setRoleRejectDialogOpen}
        open={roleRejectDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Reject Role Request
            </DialogTitle>
            <DialogDescription>
              Rejecting {selectedRoleRequest?.userName || "this user"}'s request
              for the {selectedRoleRequest?.requestedRole} role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              onChange={(e) => setRoleRejectionReason(e.target.value)}
              placeholder="Optional: Enter a reason for rejection..."
              rows={3}
              value={roleRejectionReason}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={loading !== null}
              onClick={() => setRoleRejectDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={loading !== null}
              onClick={handleRejectFunctionalRole}
              variant="destructive"
            >
              {loading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
