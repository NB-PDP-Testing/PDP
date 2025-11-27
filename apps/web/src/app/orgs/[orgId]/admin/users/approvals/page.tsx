"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Mail,
  Phone,
  RotateCcw,
  Search,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function UserApprovalsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const pendingUsers = useQuery(api.models.users.getPendingUsers);
  const rejectedUsers = useQuery(api.models.users.getRejectedUsers);
  const approveUser = useMutation(api.models.users.approveUser);
  const rejectUser = useMutation(api.models.users.rejectUser);
  const unrejectUser = useMutation(api.models.users.unrejectUser);

  const [searchTerm, setSearchTerm] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    _id: string;
    name: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const isLoading = pendingUsers === undefined || rejectedUsers === undefined;

  const filteredPendingUsers = pendingUsers?.filter((user: any) => {
    if (!searchTerm) return true;
    const searchable = [user.firstName, user.lastName, user.name, user.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  const filteredRejectedUsers = rejectedUsers?.filter((user: any) => {
    if (!searchTerm) return true;
    const searchable = [user.firstName, user.lastName, user.name, user.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  const handleApprove = async (userId: string) => {
    setLoading(userId);
    try {
      await approveUser({ userId });
    } catch (error) {
      console.error("Error approving user:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!(selectedUser && rejectionReason.trim())) return;

    setLoading(selectedUser._id);
    try {
      await rejectUser({
        userId: selectedUser._id,
        rejectionReason: rejectionReason.trim(),
      });
      setRejectDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting user:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleUnreject = async (userId: string) => {
    setLoading(userId);
    try {
      await unrejectUser({ userId });
    } catch (error) {
      console.error("Error unrejecting user:", error);
    } finally {
      setLoading(null);
    }
  };

  const openRejectDialog = (user: { _id: string; name: string }) => {
    setSelectedUser(user);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const getInitials = (user: any) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.name) {
      return user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return "??";
  };

  const UserCard = ({
    user,
    type,
  }: {
    user: any;
    type: "pending" | "rejected";
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-lg">
                {user.firstName || user.name} {user.lastName || ""}
              </h3>
              <Badge variant={type === "pending" ? "secondary" : "destructive"}>
                {type === "pending" ? "Pending" : "Rejected"}
              </Badge>
            </div>

            <div className="mt-2 space-y-1 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Registered {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {type === "rejected" && user.rejectionReason && (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="mb-1 font-medium text-destructive text-xs">
                  Rejection Reason
                </p>
                <p className="text-destructive/80 text-sm">
                  {user.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {type === "pending" ? (
            <>
              <Button
                disabled={loading === user._id}
                onClick={() =>
                  openRejectDialog({
                    _id: user._id,
                    name: `${user.firstName || user.name} ${user.lastName || ""}`,
                  })
                }
                size="sm"
                variant="outline"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                disabled={loading === user._id}
                onClick={() => handleApprove(user._id)}
                size="sm"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {loading === user._id ? "Approving..." : "Approve"}
              </Button>
            </>
          ) : (
            <Button
              disabled={loading === user._id}
              onClick={() => handleUnreject(user._id)}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {loading === user._id ? "Moving..." : "Review Again"}
            </Button>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">User Approvals</h1>
        <p className="mt-2 text-muted-foreground">
          Review and approve new user registrations
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users by name or email..."
          value={searchTerm}
        />
      </div>

      {/* Tabs */}
      <Tabs className="space-y-4" defaultValue="pending">
        <TabsList>
          <TabsTrigger className="gap-2" value="pending">
            <UserCircle className="h-4 w-4" />
            Pending
            {pendingUsers && pendingUsers.length > 0 && (
              <Badge className="ml-1" variant="secondary">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="rejected">
            <XCircle className="h-4 w-4" />
            Rejected
            {rejectedUsers && rejectedUsers.length > 0 && (
              <Badge className="ml-1" variant="destructive">
                {rejectedUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="pending">
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
          ) : filteredPendingUsers && filteredPendingUsers.length > 0 ? (
            <div className="grid gap-4">
              {filteredPendingUsers.map((user: any) => (
                <UserCard key={user._id} type="pending" user={user} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  description="There are no pending user requests at the moment."
                  icon={CheckCircle}
                  title="All Caught Up!"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent className="space-y-4" value="rejected">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
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
          ) : filteredRejectedUsers && filteredRejectedUsers.length > 0 ? (
            <div className="grid gap-4">
              {filteredRejectedUsers.map((user: any) => (
                <UserCard key={user._id} type="rejected" user={user} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  description="All user requests have been processed appropriately."
                  icon={Users}
                  title="No Rejected Users"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Reject User
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedUser?.name}. This
              will be recorded for audit purposes.
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
