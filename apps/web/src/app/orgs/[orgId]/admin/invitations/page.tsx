"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, RefreshCw, UserX } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  InvitationCard,
  RequestCard,
} from "@/components/admin/invitation-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";

export default function InvitationManagementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  // Session can be used for role checking in future
  useSession();

  // Check for tab from URL query params (e.g., ?tab=declined)
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || "active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync tab with URL params
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  // Mutations for invitation actions
  const resendInvitationMutation = useMutation(
    api.models.invitations.resendInvitation
  );
  const cancelInvitationMutation = useMutation(
    api.models.invitations.cancelInvitation
  );
  const approveRequestMutation = useMutation(
    api.models.invitations.approveInvitationRequest
  );
  const denyRequestMutation = useMutation(
    api.models.invitations.denyInvitationRequest
  );
  const resendChildLinkMutation = useMutation(
    api.models.guardianPlayerLinks.resendChildLink
  );

  // Fetch stats
  const stats = useQuery(api.models.invitations.getInvitationStats, {
    organizationId: orgId,
  });

  // Fetch invitations based on active tab
  const activeInvitations = useQuery(
    api.models.invitations.getInvitationsByStatus,
    activeTab === "active"
      ? { organizationId: orgId, status: "active" as const }
      : "skip"
  );
  const expiringSoonInvitations = useQuery(
    api.models.invitations.getInvitationsByStatus,
    activeTab === "expiring_soon"
      ? { organizationId: orgId, status: "expiring_soon" as const }
      : "skip"
  );
  const expiredInvitations = useQuery(
    api.models.invitations.getInvitationsByStatus,
    activeTab === "expired"
      ? { organizationId: orgId, status: "expired" as const }
      : "skip"
  );
  const pendingRequests = useQuery(
    api.models.invitations.getPendingInvitationRequests,
    activeTab === "requests" ? { organizationId: orgId } : "skip"
  );
  const declinedLinks = useQuery(
    api.models.guardianPlayerLinks.getDeclinedChildLinks,
    activeTab === "declined" ? { organizationId: orgId } : "skip"
  );

  // Get current tab's data
  const getCurrentData = () => {
    switch (activeTab) {
      case "active":
        return activeInvitations;
      case "expiring_soon":
        return expiringSoonInvitations;
      case "expired":
        return expiredInvitations;
      case "requests":
        return pendingRequests;
      case "declined":
        return declinedLinks;
      default:
        return [];
    }
  };

  const currentData = getCurrentData();
  const isLoading = currentData === undefined;

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // selectAll can be used for "Select All" button in future UI update
  // const selectAll = () => {
  //   if (Array.isArray(currentData)) {
  //     setSelectedIds(
  //       new Set(currentData.map((item: { _id: string }) => item._id))
  //     );
  //   }
  // };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Clear selection when changing tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    clearSelection();
  };

  // Invitation action handlers
  const handleResend = async (invitationId: string) => {
    try {
      const result = await resendInvitationMutation({ invitationId });
      if (result.success) {
        toast.success("Invitation resent successfully");
      } else {
        toast.error(result.message || "Failed to resend invitation");
      }
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const handleCancel = async (invitationId: string) => {
    try {
      await cancelInvitationMutation({ invitationId });
      toast.success("Invitation cancelled");
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  // Request action handlers
  const handleApprove = async (requestId: string) => {
    try {
      const result = await approveRequestMutation({
        requestId: requestId as Id<"invitationRequests">,
      });
      if (result.success) {
        toast.success("Request approved. New invitation sent.");
      } else {
        toast.error(result.message || "Failed to approve request");
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      await denyRequestMutation({
        requestId: requestId as Id<"invitationRequests">,
      });
      toast.success("Request denied");
    } catch (error) {
      console.error("Failed to deny request:", error);
      toast.error("Failed to deny request");
    }
  };

  // Declined child link handler
  const handleResendChildLink = async (linkId: string) => {
    try {
      await resendChildLinkMutation({
        linkId: linkId as Id<"guardianPlayerLinks">,
      });
      toast.success("Child link resent. Guardian will see it on next login.");
    } catch (error) {
      console.error("Failed to resend child link:", error);
      toast.error("Failed to resend child link");
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Invitation Management</h1>
        <p className="text-muted-foreground">
          Manage pending invitations and handle re-invite requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats?.active ?? "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 font-medium text-amber-600 text-sm">
              <AlertCircle className="size-4" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-amber-600">
              {stats?.expiringSoon ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-red-600 text-sm">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">
              {stats?.expired ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats?.requests ?? "-"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs onValueChange={handleTabChange} value={activeTab}>
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">
              Active ({stats?.active ?? 0})
            </TabsTrigger>
            <TabsTrigger value="expiring_soon">
              Expiring Soon ({stats?.expiringSoon ?? 0})
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expired ({stats?.expired ?? 0})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({stats?.requests ?? 0})
            </TabsTrigger>
            <TabsTrigger className="text-red-600" value="declined">
              <UserX className="mr-1 size-4" />
              Declined ({declinedLinks?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {selectedIds.size} selected
              </span>
              {activeTab === "expired" && (
                <Button size="sm" variant="outline">
                  <RefreshCw className="mr-1 size-4" />
                  Resend Selected
                </Button>
              )}
              <Button onClick={clearSelection} size="sm" variant="ghost">
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <TabsContent className="space-y-3" value="active">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !Array.isArray(activeInvitations) ||
            activeInvitations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No active invitations</EmptyTitle>
                <EmptyDescription>
                  All invitations have been accepted or expired.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            activeInvitations.map(
              (invitation: {
                _id: string;
                email: string;
                role?: string;
                expiresAt: number;
              }) => (
                <InvitationCard
                  invitation={invitation}
                  isSelected={selectedIds.has(invitation._id)}
                  key={invitation._id}
                  onCancel={handleCancel}
                  onSelect={toggleSelection}
                  statusType="active"
                />
              )
            )
          )}
        </TabsContent>

        <TabsContent className="space-y-3" value="expiring_soon">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !Array.isArray(expiringSoonInvitations) ||
            expiringSoonInvitations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No invitations expiring soon</EmptyTitle>
                <EmptyDescription>
                  No invitations are expiring within the next 48 hours.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            expiringSoonInvitations.map(
              (invitation: {
                _id: string;
                email: string;
                role?: string;
                expiresAt: number;
              }) => (
                <InvitationCard
                  invitation={invitation}
                  isSelected={selectedIds.has(invitation._id)}
                  key={invitation._id}
                  onCancel={handleCancel}
                  onResend={handleResend}
                  onSelect={toggleSelection}
                  statusType="expiring_soon"
                />
              )
            )
          )}
        </TabsContent>

        <TabsContent className="space-y-3" value="expired">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !Array.isArray(expiredInvitations) ||
            expiredInvitations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No expired invitations</EmptyTitle>
                <EmptyDescription>
                  All invitations are still valid.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            expiredInvitations.map(
              (invitation: {
                _id: string;
                email: string;
                role?: string;
                expiresAt: number;
              }) => (
                <InvitationCard
                  invitation={invitation}
                  isSelected={selectedIds.has(invitation._id)}
                  key={invitation._id}
                  onResend={handleResend}
                  onSelect={toggleSelection}
                  statusType="expired"
                />
              )
            )
          )}
        </TabsContent>

        <TabsContent className="space-y-3" value="requests">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !Array.isArray(pendingRequests) ||
            pendingRequests.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No pending requests</EmptyTitle>
                <EmptyDescription>
                  No users have requested new invitations.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            pendingRequests.map(
              (request: {
                _id: string;
                userEmail: string;
                requestedAt: number;
                requestNumber: number;
                originalInvitation?: { email: string; role?: string } | null;
              }) => (
                <RequestCard
                  isSelected={selectedIds.has(request._id)}
                  key={request._id}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  onSelect={toggleSelection}
                  request={request}
                />
              )
            )
          )}
        </TabsContent>

        <TabsContent className="space-y-3" value="declined">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !Array.isArray(declinedLinks) || declinedLinks.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No declined child links</EmptyTitle>
                <EmptyDescription>
                  No parents have declined child links.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            declinedLinks.map(
              (link: {
                linkId: string;
                playerName: string;
                guardianName: string;
                guardianEmail: string;
                declinedAt: number | null;
              }) => (
                <DeclinedLinkCard
                  key={link.linkId}
                  link={link}
                  onResend={handleResendChildLink}
                />
              )
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Declined Link Card component
function DeclinedLinkCard({
  link,
  onResend,
}: {
  link: {
    linkId: string;
    playerName: string;
    guardianName: string;
    guardianEmail: string;
    declinedAt: number | null;
  };
  onResend: (linkId: string) => void;
}) {
  // Format relative time
  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) {
      return "Unknown";
    }
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  return (
    <Card className="border-red-200">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UserX className="size-4 text-red-500" />
            <span className="font-medium">{link.guardianName}</span>
            <span className="text-muted-foreground">
              ({link.guardianEmail})
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
            <span>
              Declined link to <strong>{link.playerName}</strong>
            </span>
            <span>•</span>
            <span>{formatRelativeTime(link.declinedAt)}</span>
          </div>
        </div>
        <Button
          onClick={() => onResend(link.linkId)}
          size="sm"
          variant="outline"
        >
          <RefreshCw className="mr-1 size-4" />
          Resend
        </Button>
      </CardContent>
    </Card>
  );
}
