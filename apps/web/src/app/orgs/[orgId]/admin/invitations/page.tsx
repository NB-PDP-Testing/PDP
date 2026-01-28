"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  Clock,
  Mail,
  MailQuestion,
  RefreshCw,
  Timer,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";

type InvitationStatus = "active" | "expiring_soon" | "expired";

// Format relative time for display
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  if (diff > 0) {
    // Future
    if (days > 0) {
      return `in ${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  // Past
  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
}

// Invitation Card Component (inline for now)
function InvitationCard({
  invitation,
  isSelected,
  onSelect,
  statusType,
}: {
  invitation: {
    _id: string;
    email: string;
    role?: string;
    expiresAt: number;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
  statusType: InvitationStatus;
}) {
  const expiresAt = invitation.expiresAt;
  const now = Date.now();
  const isExpired = expiresAt < now;

  return (
    <Card className={isSelected ? "border-primary" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(invitation._id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <span className="truncate font-medium">{invitation.email}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="outline">{invitation.role || "member"}</Badge>
            <span className="flex items-center gap-1">
              <Timer className="size-3" />
              {isExpired ? "Expired" : "Expires"}{" "}
              {formatRelativeTime(expiresAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {statusType === "expired" ? (
            <Button size="sm" variant="outline">
              <RefreshCw className="mr-1 size-4" />
              Resend
            </Button>
          ) : statusType === "expiring_soon" ? (
            <Button size="sm" variant="outline">
              <RefreshCw className="mr-1 size-4" />
              Extend
            </Button>
          ) : (
            <Button size="sm" variant="ghost">
              <X className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Request Card Component (inline for now)
function RequestCard({
  request,
  isSelected,
  onSelect,
}: {
  request: {
    _id: string;
    userEmail: string;
    requestedAt: number;
    requestNumber: number;
    originalInvitation?: {
      email: string;
      role?: string;
    } | null;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className={isSelected ? "border-primary" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(request._id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MailQuestion className="size-4 text-muted-foreground" />
            <span className="truncate font-medium">{request.userEmail}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="secondary">Request #{request.requestNumber}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(request.requestedAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Approve
          </Button>
          <Button size="sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvitationManagementPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  // Session can be used for role checking in future
  useSession();

  const [activeTab, setActiveTab] = useState<string>("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
                  onSelect={toggleSelection}
                  request={request}
                />
              )
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
