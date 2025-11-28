import { UserCheck, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PendingUsersSection({
  pendingUsers,
  isLoading,
  orgId,
}: {
  pendingUsers?: Array<{
    _id: string;
    firstName?: string;
    name?: string;
    lastName?: string;
    email?: string;
  }>;
  isLoading: boolean;
  orgId: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <UserCheck className="mb-3 h-12 w-12 text-green-500" />
        <p className="font-medium">All caught up!</p>
        <p className="text-muted-foreground text-sm">
          No pending approvals at the moment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingUsers
        .slice(0, 5)
        .map(
          (user: {
            _id: string;
            firstName?: string;
            name?: string;
            lastName?: string;
            email?: string;
          }) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={user._id}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {user.firstName || user.name} {user.lastName || ""}
                  </p>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
              </div>
              <span className="rounded-full bg-yellow-500/10 px-2 py-1 font-medium text-xs text-yellow-600">
                Pending
              </span>
            </div>
          )
        )}
      {pendingUsers.length > 5 && (
        <Link href={`/orgs/${orgId}/admin/users/approvals` as Route}>
          <Button className="w-full" size="sm" variant="ghost">
            View all {pendingUsers.length} pending users
          </Button>
        </Link>
      )}
    </div>
  );
}
