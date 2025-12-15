"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Mail,
  Search,
  UserCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useOrgTheme } from "@/hooks/use-org-theme";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    _id: string;
    userName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const isLoading = pendingRequests === undefined;

  const filteredRequests = pendingRequests?.filter((request) => {
    if (!searchTerm) return true;
    const searchable = [request.userName, request.userEmail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  const handleApprove = async (requestId: string) => {
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

  const openRejectDialog = (request: { _id: string; userName: string }) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
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
              <Badge
                className={`border capitalize ${getRoleColor(request.requestedRole)}`}
                variant="outline"
              >
                {request.requestedRole}
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
                  Requested {new Date(request.requestedAt).toLocaleDateString()}
                </span>
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
            disabled={loading === request._id}
            onClick={() =>
              openRejectDialog({
                _id: request._id,
                userName: request.userName,
              })
            }
            size="sm"
            variant="outline"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <OrgThemedButton
            disabled={loading === request._id}
            onClick={() => handleApprove(request._id)}
            size="sm"
            variant="primary"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {loading === request._id ? "Approving..." : "Approve & Add to Org"}
          </OrgThemedButton>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Membership Requests
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review and approve requests to join your organization
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

      {/* Requests List */}
      <div className="space-y-4">
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
                title="All Caught Up!"
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
    </div>
  );
}
